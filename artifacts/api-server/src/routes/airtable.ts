import { Router, type IRouter } from "express";
import { eq, isNotNull, sql } from "drizzle-orm";
import {
  db, beansTable, bagsTable, shotsTable, settingsTable,
  grindersTable, machinesTable, accessoriesTable,
  tasteSelectorsTable, shotTasteSelectorsTable,
} from "@workspace/db";

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

// ── GET /api/airtable/status ───────────────────────────────────────────────
router.get("/airtable/status", async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable);
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;
  res.json({
    hasToken: !!process.env.AIRTABLE_API_KEY,
    hasBaseId: !!process.env.AIRTABLE_BASE_ID,
    lastSync: s.airtableLastSync ?? null,
    lastSyncResult: s.airtableLastSyncResult ? JSON.parse(s.airtableLastSyncResult) : null,
    lastClear: s.airtableLastClear ?? null,
    lastClearResult: s.airtableLastClearResult ? JSON.parse(s.airtableLastClearResult) : null,
  });
});

// ── GET /api/airtable/counts ───────────────────────────────────────────────
router.get("/airtable/counts", async (_req, res): Promise<void> => {
  const [beans] = await db.select({ total: sql<number>`count(*)::int`, fromAirtable: sql<number>`count(*) filter (where ${beansTable.airtableRecordId} is not null)::int` }).from(beansTable);
  const [bags] = await db.select({ total: sql<number>`count(*)::int`, fromAirtable: sql<number>`count(*) filter (where ${bagsTable.airtableRecordId} is not null)::int` }).from(bagsTable);
  const [shots] = await db.select({ total: sql<number>`count(*)::int`, fromAirtable: sql<number>`count(*) filter (where ${shotsTable.airtableRecordId} is not null)::int` }).from(shotsTable);
  const [grinders] = await db.select({ total: sql<number>`count(*)::int` }).from(grindersTable);
  const [machines] = await db.select({ total: sql<number>`count(*)::int` }).from(machinesTable);
  const [accessories] = await db.select({ total: sql<number>`count(*)::int` }).from(accessoriesTable);
  const [tasteSelectors] = await db.select({ total: sql<number>`count(*)::int` }).from(tasteSelectorsTable);
  res.json({ beans, bags, shots, grinders, machines, accessories, tasteSelectors });
});

// ── POST /api/airtable/test ────────────────────────────────────────────────
router.post("/airtable/test", async (_req, res): Promise<void> => {
  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  const tokenDiag = token ? {
    length: token.length,
    prefix: token.slice(0, 4),
    hasLeadingSpace: token[0] === " ",
    hasTrailingSpace: token[token.length - 1] === " ",
  } : null;

  if (!token || !baseId) {
    res.json({
      connected: false,
      error: "Missing environment variables. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in your Replit Secrets.",
      hasToken: !!token,
      hasBaseId: !!baseId,
    });
    return;
  }

  const cleanToken = token.trim();

  try {
    const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${cleanToken}` },
    });

    if (!metaRes.ok) {
      const body = await metaRes.text();
      res.json({ connected: false, error: `Airtable API error (${metaRes.status}): ${body.slice(0, 300)}`, tokenDiag });
      return;
    }

    const meta = await metaRes.json() as { tables: { id: string; name: string }[] };
    const tables = meta.tables.map((t) => t.name);
    const wantedTables = ["Shots", "Beans", "Bags", "Equipment", "Accessories", "Taste Selectors"];
    const found: string[] = [];
    const missing: string[] = [];
    for (const t of wantedTables) {
      (tables.some((n) => normalize(n) === normalize(t)) ? found : missing).push(t);
    }

    res.json({ connected: true, baseId, tableCount: tables.length, allTables: tables, found, missing });
  } catch (e) {
    res.json({ connected: false, error: String(e) });
  }
});

// ── POST /api/airtable/clear ───────────────────────────────────────────────
router.post("/airtable/clear", async (req, res): Promise<void> => {
  const body = req.body as { confirm?: boolean };
  if (!body.confirm) {
    res.status(400).json({ error: "Send { confirm: true } to confirm deletion of all coffee data." });
    return;
  }

  const deleted: Record<string, number> = {};

  // Delete in FK-safe order
  const stj = await db.delete(shotTasteSelectorsTable);
  deleted.shotTasteSelectors = (stj as any).rowCount ?? 0;

  const sh = await db.delete(shotsTable);
  deleted.shots = (sh as any).rowCount ?? 0;

  const bg = await db.delete(bagsTable);
  deleted.bags = (bg as any).rowCount ?? 0;

  const bn = await db.delete(beansTable);
  deleted.beans = (bn as any).rowCount ?? 0;

  const gr = await db.delete(grindersTable);
  deleted.grinders = (gr as any).rowCount ?? 0;

  const mc = await db.delete(machinesTable);
  deleted.machines = (mc as any).rowCount ?? 0;

  const ac = await db.delete(accessoriesTable);
  deleted.accessories = (ac as any).rowCount ?? 0;

  const ts = await db.delete(tasteSelectorsTable);
  deleted.tasteSelectors = (ts as any).rowCount ?? 0;

  const clearedAt = new Date().toISOString();
  await saveSetting("airtableLastClear", clearedAt);
  await saveSetting("airtableLastClearResult", JSON.stringify(deleted));

  res.json({ clearedAt, deleted });
});

// ── POST /api/airtable/sync ────────────────────────────────────────────────
router.post("/airtable/sync", async (_req, res): Promise<void> => {
  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token || !baseId) {
    res.status(400).json({ error: "AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in Replit Secrets." });
    return;
  }

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
  // Actual Airtable field: "Beans" (primary field, plain string with roaster — bean name)
  const beansTableName = resolveTable("Beans", "Bean");
  if (beansTableName) {
    stats.beans = initStat();
    try {
      const records = await fetchAllRecords(baseId, beansTableName, token);
      for (const r of records) {
        const f = r.fields;
        // Primary field is "Beans" (e.g. "De Luca's — (Brazil)")
        const name = str(findField(f, ["Beans", "Name", "Bean", "Bean Name", "Coffee"]));
        if (!name) { stats.beans.skipped++; continue; }
        try {
          const existing = await db.select({ id: beansTable.id }).from(beansTable).where(eq(beansTable.airtableRecordId, r.id));
          const vals = {
            name,
            origin: str(findField(f, ["Country", "Origin", "Country of Origin"])),
            roaster: str(findField(f, ["Roaster", "Roaster Name"])),
            roastLevel: str(findField(f, ["Roast Level ( ChatGPT )", "Roast Level", "Roast"])),
            notes: str(findField(f, ["Notes", "User Notes"])),
            isActive: true,
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

  // Build airtableId → localId maps
  const beanIdMap = new Map<string, number>();
  const localBeans = await db.select({ id: beansTable.id, atId: beansTable.airtableRecordId }).from(beansTable).where(isNotNull(beansTable.airtableRecordId));
  for (const b of localBeans) if (b.atId) beanIdMap.set(b.atId, b.id);

  // ── 2. Sync Bags ─────────────────────────────────────────────────────────
  // Actual Airtable fields: "Bag Label", "Bag ID", "Beans" (linked), "Roast Date",
  // "Opened Date", "Bag Size (g)", "Bag Cost", "Target Dose (g)", "Initial Grinder Setting",
  // "Average Grinder Setting", "Initial Grind Time (sec)", "Status"
  const bagsTableName = resolveTable("Bags", "Bag");
  if (bagsTableName) {
    stats.bags = initStat();
    try {
      const records = await fetchAllRecords(baseId, bagsTableName, token);
      for (const r of records) {
        const f = r.fields;
        try {
          const beanAtId = linkedId(findField(f, ["Beans", "Bean", "Coffee"]));
          const beanId = beanAtId ? (beanIdMap.get(beanAtId) ?? null) : null;
          const existing = await db.select({ id: bagsTable.id }).from(bagsTable).where(eq(bagsTable.airtableRecordId, r.id));
          const bagIdNum = num(findField(f, ["Bag ID"]));
          const status = str(findField(f, ["Status"]));
          const vals = {
            beanId,
            bagNumber: bagIdNum != null ? String(bagIdNum) : str(findField(f, ["Bag Number", "Bag #"])),
            bagName: str(findField(f, ["Bag Label", "Bag Name", "Label", "Name"])),
            roastDate: str(findField(f, ["Roast Date"])),
            openedDate: str(findField(f, ["Opened Date", "Open Date"])),
            bagWeight: num(findField(f, ["Bag Size (g)", "Bag Weight", "Starting Weight"])),
            cost: num(findField(f, ["Bag Cost", "Cost", "Price"])),
            isActive: status ? status.toLowerCase() === "active" : false,
            startGrindSetting: num(findField(f, ["Initial Grinder Setting", "Start Grind Setting"])),
            currentGrindSetting: num(findField(f, ["Average Grinder Setting", "Current Grind Setting"])),
            startGrindTime: num(findField(f, ["Initial Grind Time (sec)", "Start Grind Time"])),
            defaultDose: num(findField(f, ["Target Dose (g)", "Default Dose"])),
            dialInNotes: str(findField(f, ["Notes", "Dial In Notes"])),
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
  // Actual Airtable fields confirmed from live data inspection
  const shotsTableName = resolveTable("Shots", "Shot Log", "Shot");
  if (shotsTableName) {
    stats.shots = initStat();
    try {
      const records = await fetchAllRecords(baseId, shotsTableName, token);
      for (const r of records) {
        const f = r.fields;
        const shotDate = str(findField(f, ["Date", "Shot Date", "Timestamp", "Created", "Date/Time"]));
        if (!shotDate) { stats.shots.skipped++; continue; }
        try {
          const bagAtId = linkedId(findField(f, ["Bag", "Bags", "Current Bag"]));
          const bagId = bagAtId ? (bagIdMap.get(bagAtId) ?? null) : null;
          const existing = await db.select({ id: shotsTable.id }).from(shotsTable).where(eq(shotsTable.airtableRecordId, r.id));

          // Shot Classification is an array in Airtable — join to string
          const classRaw = findField(f, ["Shot Classification", "Classification"]);
          const shotClassification = Array.isArray(classRaw) ? classRaw.join(", ") : str(classRaw);

          // Fault Status is an array in Airtable
          const faultRaw = findField(f, ["Fault Status", "Fault"]);
          const faultStatus = Array.isArray(faultRaw) ? faultRaw.join(", ") : str(faultRaw);

          // Bag Label is an array of strings in Airtable
          const bagLabelRaw = findField(f, ["Bag Label"]);
          const bagLabel = Array.isArray(bagLabelRaw) ? bagLabelRaw[0] as string : str(bagLabelRaw);

          // Include in Analysis: Airtable stores as 0/1 number
          const includeRaw = findField(f, ["Include in Analysis", "Include In Analysis"]);
          const includeInAnalysis = includeRaw != null ? Number(includeRaw) === 1 : undefined;

          const vals = {
            shotDate,
            bagId,
            bag: bagLabel,
            grindSetting: num(findField(f, ["Grinder Setting", "Grind Setting"])),
            grindTime: num(findField(f, ["Grind Time"])),
            initialGrindWeight: num(findField(f, ["Initial Output (g)", "Initial Output"])),
            totalOutput: num(findField(f, ["Total Output (g)", "Total Output"])),
            dose: num(findField(f, ["Dose (g)", "Dose", "Target Dose (g)"])),
            yield: num(findField(f, ["Yield (g)", "Yield"])),
            temperature: num(findField(f, ["Temp", "Temperature"])) as number | undefined,
            pourDelay: num(findField(f, ["Pour Delay", "Pour Delay (s)"])) as number | undefined,
            pourTime: num(findField(f, ["Pour Time (sec)", "Pour Time"])) as number | undefined,
            scaleTime: num(findField(f, ["Scale Time", "Total Time"])) as number | undefined,
            rating: num(findField(f, ["Rating", "Rating ( Valid Only )"])),
            preferenceRating: num(findField(f, ["Preference Rating"])),
            isReference: bool(findField(f, ["Reference Shot"])) ?? false,
            status: str(findField(f, ["Shot Status", "Status"])),
            shotClassification,
            faultStatus,
            expressionStyle: str(findField(f, ["Expression Style"])),
            notes: str(findField(f, ["Notes"])),
            hopperPhase: str(findField(f, ["Hopper Phase"])),
            drinkType: str(findField(f, ["Effective Drink Type", "Drink Type"])),
            includeInAnalysis,
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

  const syncTime = new Date().toISOString();
  await saveSetting("airtableLastSync", syncTime);
  await saveSetting("airtableLastSyncResult", JSON.stringify(stats));

  res.json({ syncedAt: syncTime, stats, tablesFound: Object.values(tableMap) });
});

export default router;
