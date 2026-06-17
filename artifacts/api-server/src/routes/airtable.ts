import { Router, type IRouter } from "express";
import { eq, isNotNull, sql } from "drizzle-orm";
import { db, beansTable, bagsTable, shotsTable, settingsTable } from "@workspace/db";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-()/]+/g, "");
}

function findField(fields: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(fields);
  for (const c of candidates) {
    const nc = normalize(c);
    const found = entries.find(([k]) => normalize(k) === nc);
    if (found && found[1] !== undefined && found[1] !== null && found[1] !== "") return found[1];
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.join(", ") || undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function bool(v: unknown): boolean | undefined {
  if (v == null) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase().trim();
  if (["true", "yes", "1", "reference", "confirmed reference"].includes(s)) return true;
  if (["false", "no", "0"].includes(s)) return false;
  return undefined;
}

// First string in a linked-record array
function linkedId(v: unknown): string | undefined {
  if (Array.isArray(v) && v.length > 0) return String(v[0]);
  return undefined;
}

async function fetchAllRecords(baseId: string, tableId: string, token: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable fetch failed (${res.status}): ${err.slice(0, 300)}`);
    }
    const data = await res.json() as { records: AirtableRecord[]; offset?: string };
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);
  return records;
}

async function saveSetting(key: string, value: string) {
  await db.insert(settingsTable).values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

// ── POST /api/airtable/test ────────────────────────────────────────────────
router.post("/airtable/test", async (_req, res): Promise<void> => {
  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token || !baseId) {
    res.status(200).json({
      connected: false,
      error: "Missing environment variables. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in your Replit Secrets.",
      hasToken: !!token,
      hasBaseId: !!baseId,
    });
    return;
  }

  try {
    const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!metaRes.ok) {
      const body = await metaRes.text();
      res.json({ connected: false, error: `Airtable API error (${metaRes.status}): ${body.slice(0, 300)}` });
      return;
    }

    const meta = await metaRes.json() as { tables: { id: string; name: string }[] };
    const tables = meta.tables.map((t) => t.name);

    const wantedTables = ["Shots", "Beans", "Bags", "Equipment", "Accessories", "Taste Selectors"];
    const found: string[] = [];
    const missing: string[] = [];
    for (const t of wantedTables) {
      const exists = tables.some((n) => normalize(n) === normalize(t));
      (exists ? found : missing).push(t);
    }

    res.json({
      connected: true,
      baseId,
      tableCount: tables.length,
      allTables: tables,
      found,
      missing,
    });
  } catch (e) {
    res.json({ connected: false, error: String(e) });
  }
});

// ── POST /api/airtable/sync ────────────────────────────────────────────────
router.post("/airtable/sync", async (_req, res): Promise<void> => {
  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token || !baseId) {
    res.status(400).json({ error: "AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in Replit Secrets." });
    return;
  }

  // Discover table names
  const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    res.status(502).json({ error: `Cannot reach Airtable (${metaRes.status})` });
    return;
  }
  const meta = await metaRes.json() as { tables: { id: string; name: string }[] };
  const tableMap = Object.fromEntries(meta.tables.map((t) => [normalize(t.name), t.name]));

  const resolveTable = (...names: string[]): string | null => {
    for (const n of names) {
      if (tableMap[normalize(n)]) return tableMap[normalize(n)];
    }
    return null;
  };

  const stats: Record<string, { inserted: number; updated: number; skipped: number; errors: string[] }> = {};
  const initStat = () => ({ inserted: 0, updated: 0, skipped: 0, errors: [] as string[] });

  // ── 1. Sync Beans ────────────────────────────────────────────────────────
  const beansTable_ = resolveTable("Beans", "Bean");
  if (beansTable_) {
    stats.beans = initStat();
    try {
      const records = await fetchAllRecords(baseId, beansTable_, token);
      for (const r of records) {
        const f = r.fields;
        const name = str(findField(f, ["Name", "Bean", "Bean Name", "Coffee"]));
        if (!name) { stats.beans.skipped++; continue; }
        try {
          const existing = await db.select({ id: beansTable.id })
            .from(beansTable).where(eq(beansTable.airtableRecordId, r.id));
          const vals = {
            name,
            origin: str(findField(f, ["Origin", "Country", "Country of Origin"])),
            region: str(findField(f, ["Region"])),
            roaster: str(findField(f, ["Roaster", "Roaster Name"])),
            roastLevel: str(findField(f, ["Roast Level", "Roast", "Roast Style"])),
            process: str(findField(f, ["Process", "Processing", "Processing Method"])),
            variety: str(findField(f, ["Variety", "Cultivar", "Varietals"])),
            altitude: str(findField(f, ["Altitude", "Elevation"])),
            roasterNotes: str(findField(f, ["Roaster Notes", "Tasting Notes", "Flavor Notes", "Roaster Tasting Notes"])),
            notes: str(findField(f, ["Notes", "User Notes", "My Notes"])),
            isActive: bool(findField(f, ["Active", "Is Active", "Status"])) ?? true,
            airtableRecordId: r.id,
          };
          if (existing.length) {
            await db.update(beansTable).set(vals).where(eq(beansTable.airtableRecordId, r.id));
            stats.beans.updated++;
          } else {
            await db.insert(beansTable).values(vals);
            stats.beans.inserted++;
          }
        } catch (e) { stats.beans.errors.push(`${r.id}: ${String(e).slice(0, 100)}`); }
      }
    } catch (e) { stats.beans = { ...initStat(), errors: [String(e)] }; }
  }

  // Build airtableId → localId maps for linking
  const beanIdMap = new Map<string, number>();
  const localBeans = await db.select({ id: beansTable.id, atId: beansTable.airtableRecordId }).from(beansTable).where(isNotNull(beansTable.airtableRecordId));
  for (const b of localBeans) if (b.atId) beanIdMap.set(b.atId, b.id);

  // ── 2. Sync Bags ─────────────────────────────────────────────────────────
  const bagsTable_ = resolveTable("Bags", "Bag");
  if (bagsTable_) {
    stats.bags = initStat();
    try {
      const records = await fetchAllRecords(baseId, bagsTable_, token);
      for (const r of records) {
        const f = r.fields;
        try {
          const beanAtId = linkedId(findField(f, ["Bean", "Beans", "Coffee"]));
          const beanId = beanAtId ? (beanIdMap.get(beanAtId) ?? null) : null;
          const existing = await db.select({ id: bagsTable.id })
            .from(bagsTable).where(eq(bagsTable.airtableRecordId, r.id));
          const vals = {
            beanId,
            bagNumber: str(findField(f, ["Bag Number", "Bag #", "Number", "Bag No"])),
            bagName: str(findField(f, ["Bag Name", "Label", "Name"])),
            purchaseDate: str(findField(f, ["Purchase Date", "Bought", "Order Date"])),
            roastDate: str(findField(f, ["Roast Date", "Roasted", "Roast On"])),
            openedDate: str(findField(f, ["Opened Date", "Open Date", "Bag Opened", "Date Opened"])),
            bagWeight: num(findField(f, ["Bag Weight", "Starting Weight", "Total Weight", "Weight (g)"])),
            remainingEstimate: num(findField(f, ["Remaining", "Remaining Estimate", "Remaining Weight"])),
            cost: num(findField(f, ["Cost", "Price", "Amount"])),
            isActive: bool(findField(f, ["Active", "Is Active", "Current Bag"])) ?? false,
            startGrindSetting: num(findField(f, ["Start Grind Setting", "Starting Grind Setting", "Initial Grind"])),
            currentGrindSetting: num(findField(f, ["Current Grind Setting", "Grind Setting", "Current Grind"])),
            startGrindTime: num(findField(f, ["Start Grind Time", "Starting Grind Time", "Initial Grind Time"])),
            currentGrindTime: num(findField(f, ["Current Grind Time", "Grind Time", "Current Grind Time"])),
            defaultDose: num(findField(f, ["Default Dose", "Target Dose", "Dose"])),
            defaultYield: num(findField(f, ["Default Yield", "Target Yield", "Yield"])),
            defaultTemp: num(findField(f, ["Default Temp", "Temperature", "Brew Temp"])) as number | undefined,
            dialInNotes: str(findField(f, ["Dial In Notes", "Dial-in Notes", "Notes"])),
            airtableRecordId: r.id,
          };
          if (existing.length) {
            await db.update(bagsTable).set(vals).where(eq(bagsTable.airtableRecordId, r.id));
            stats.bags.updated++;
          } else {
            await db.insert(bagsTable).values(vals);
            stats.bags.inserted++;
          }
        } catch (e) { stats.bags.errors.push(`${r.id}: ${String(e).slice(0, 100)}`); }
      }
    } catch (e) { stats.bags = { ...initStat(), errors: [String(e)] }; }
  }

  // Build bag ID map
  const bagIdMap = new Map<string, number>();
  const localBags = await db.select({ id: bagsTable.id, atId: bagsTable.airtableRecordId }).from(bagsTable).where(isNotNull(bagsTable.airtableRecordId));
  for (const b of localBags) if (b.atId) bagIdMap.set(b.atId, b.id);

  // ── 3. Sync Shots ────────────────────────────────────────────────────────
  const shotsTable_ = resolveTable("Shots", "Shot Log", "Shot");
  if (shotsTable_) {
    stats.shots = initStat();
    try {
      const records = await fetchAllRecords(baseId, shotsTable_, token);
      for (const r of records) {
        const f = r.fields;
        const shotDate = str(findField(f, ["Shot Date", "Date", "Timestamp", "Created", "Date/Time"]));
        if (!shotDate) { stats.shots.skipped++; continue; }
        try {
          const bagAtId = linkedId(findField(f, ["Bag", "Bags", "Current Bag"]));
          const bagId = bagAtId ? (bagIdMap.get(bagAtId) ?? null) : null;
          const existing = await db.select({ id: shotsTable.id })
            .from(shotsTable).where(eq(shotsTable.airtableRecordId, r.id));
          const vals = {
            shotDate,
            bagId,
            bean: str(findField(f, ["Bean", "Bean Name", "Coffee", "Beans"])),
            bag: str(findField(f, ["Bag", "Bag Number", "Bag Label"])),
            grindSetting: num(findField(f, ["Grind Setting", "Grind", "Grind Size", "Setting"])),
            grindTime: num(findField(f, ["Grind Time", "Grind Duration", "Grind Seconds"])),
            initialGrindWeight: num(findField(f, ["Initial Output", "Initial Grind Weight", "Initial Weight"])),
            totalOutput: num(findField(f, ["Total Output", "Total Grind Weight"])),
            dose: num(findField(f, ["Dose", "Actual Dose", "Basket Dose", "Dose (g)"])),
            yield: num(findField(f, ["Yield", "Output", "Shot Yield", "Yield (g)"])),
            temperature: num(findField(f, ["Temperature", "Temp", "Brew Temp", "Brew Temperature"])) as number | undefined,
            pourDelay: num(findField(f, ["Pour Delay", "First Pour Delay", "Pre-infusion", "Pour Delay (s)"])) as number | undefined,
            pourTime: num(findField(f, ["Pour Time", "Pump Time", "Extraction Time", "Time (s)"])) as number | undefined,
            scaleTime: num(findField(f, ["Scale Time", "Total Time", "Overall Time"])) as number | undefined,
            rating: num(findField(f, ["Rating", "Score", "Shot Rating"])),
            preferenceRating: num(findField(f, ["Preference Rating", "Preference", "My Rating", "Pref Rating"])),
            isReference: bool(findField(f, ["Reference Shot", "Is Reference", "Reference", "Ref Shot"])) ?? false,
            signatureShot: bool(findField(f, ["Signature Shot", "Signature", "Is Signature"])),
            status: str(findField(f, ["Status", "Shot Status", "Result"])),
            shotClassification: str(findField(f, ["Shot Classification", "Classification", "Type"])),
            faultStatus: str(findField(f, ["Fault Status", "Fault", "Fault Type"])),
            expressionStyle: str(findField(f, ["Expression Style", "Expression", "Style"])),
            notes: str(findField(f, ["Notes", "Tasting Notes", "Observations"])),
            faultNotes: str(findField(f, ["Fault Notes", "Fault Description"])),
            sensoryNotes: str(findField(f, ["Sensory Notes", "Sensory", "Flavour Notes", "Flavor Notes"])),
            hopperPhase: str(findField(f, ["Hopper Phase", "Hopper"])),
            grindAdjusted: str(findField(f, ["Grind Adjusted", "Grind Change", "Adjustment"])),
            drinkType: str(findField(f, ["Drink Type", "Type", "Coffee Style"])),
            includeInAnalysis: bool(findField(f, ["Include In Analysis", "Include", "Analyse"])),
            airtableRecordId: r.id,
          };
          if (existing.length) {
            await db.update(shotsTable).set(vals).where(eq(shotsTable.airtableRecordId, r.id));
            stats.shots.updated++;
          } else {
            await db.insert(shotsTable).values(vals);
            stats.shots.inserted++;
          }
        } catch (e) { stats.shots.errors.push(`${r.id}: ${String(e).slice(0, 100)}`); }
      }
    } catch (e) { stats.shots = { ...initStat(), errors: [String(e)] }; }
  }

  // Save sync timestamp
  const syncTime = new Date().toISOString();
  await saveSetting("airtableLastSync", syncTime);

  res.json({
    syncedAt: syncTime,
    stats,
    tablesFound: Object.values(tableMap),
  });
});

// ── GET /api/airtable/status ───────────────────────────────────────────────
router.get("/airtable/status", async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "airtableLastSync"));
  const lastSync = rows[0]?.value ?? null;
  res.json({
    hasToken: !!process.env.AIRTABLE_API_KEY,
    hasBaseId: !!process.env.AIRTABLE_BASE_ID,
    lastSync,
  });
});

export default router;
