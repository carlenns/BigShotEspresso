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
      res.json({ connected: false, error: `Airtable API error (${metaRes.status}): ${body.slice(0, 300)}` });
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
  // Primary field: "Beans" (e.g. "De Luca's — (Brazil)"). Reconstruct if missing.
  const beansTableName = resolveTable("Beans", "Bean");
  if (beansTableName) {
    stats.beans = initStat();
    try {
      const records = await fetchAllRecords(baseId, beansTableName, token);
      for (const r of records) {
        const f = r.fields;
        const roaster  = str(findField(f, ["Roaster", "Roaster Name"]));
        const country  = str(findField(f, ["Country", "Origin", "Country of Origin"]));
        const region   = str(findField(f, ["Region"]));
        const process  = str(findField(f, ["Process", "Processing"]));
        const primary  = str(findField(f, ["Beans", "Name", "Bean Name", "Bean", "Coffee Name", "Coffee"]));

        // Reconstruct display name in priority order
        let name: string;
        if (primary) {
          name = primary;
        } else if (roaster && country) {
          name = `${roaster} — ${country}`;
        } else if (country && process) {
          name = `${country}, ${process}`;
        } else if (country || region) {
          name = (country ?? region)!;
        } else if (roaster) {
          name = roaster;
        } else {
          stats.beans.skipped++;
          continue;
        }

        try {
          const existing = await db.select({ id: beansTable.id }).from(beansTable).where(eq(beansTable.airtableRecordId, r.id));
          const vals = {
            name,
            origin: country,
            region,
            roaster,
            roastLevel: str(findField(f, ["Roast Level ( ChatGPT )", "Roast Level", "Roast"])),
            process,
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

  // Build enriched bean maps: airtableId → localId + display name
  const beanIdMap   = new Map<string, number>(); // atId → localId
  const beanNameMap = new Map<string, string>(); // atId → display name
  {
    const rows = await db
      .select({ id: beansTable.id, atId: beansTable.airtableRecordId, name: beansTable.name })
      .from(beansTable).where(isNotNull(beansTable.airtableRecordId));
    for (const b of rows) {
      if (b.atId) { beanIdMap.set(b.atId, b.id); beanNameMap.set(b.atId, b.name); }
    }
  }

  // ── 2. Sync Bags ─────────────────────────────────────────────────────────
  // Key fields: "Bag Label" (primary), "Bag ID", "Beans" (linked), "Status",
  // "Roast Date", "Opened Date", "Bag Size (g)", "Bag Cost", "Target Dose (g)",
  // "Initial Grinder Setting", "Average Grinder Setting", "Initial Grind Time (sec)"
  const bagsTableName = resolveTable("Bags", "Bag");
  if (bagsTableName) {
    stats.bags = initStat();
    try {
      const records = await fetchAllRecords(baseId, bagsTableName, token);
      for (const r of records) {
        const f = r.fields;
        try {
          const beanAtId = linkedId(findField(f, ["Beans", "Bean", "Coffee"]));
          const beanId   = beanAtId ? (beanIdMap.get(beanAtId)  ?? null) : null;
          const beanName = beanAtId ? (beanNameMap.get(beanAtId) ?? null) : null;

          const bagIdNum = num(findField(f, ["Bag ID", "Bag Number", "Bag #"]));
          const status   = str(findField(f, ["Status"]));

          // Reconstruct bag display name
          // Strip literal double-quotes that Airtable sometimes wraps around bean names in labels
          const primaryLabel = str(findField(f, ["Bag Label", "Bag Name", "Label", "Name"]))?.replace(/"/g, "");
          let bagName: string | undefined;
          if (primaryLabel) {
            bagName = primaryLabel;
          } else if (bagIdNum != null && beanName) {
            bagName = `Bag ${bagIdNum} — ${beanName}`;
          } else if (bagIdNum != null) {
            bagName = `Bag ${bagIdNum}`;
          }

          const existing = await db.select({ id: bagsTable.id }).from(bagsTable).where(eq(bagsTable.airtableRecordId, r.id));
          const vals = {
            beanId,
            bagNumber: bagIdNum != null ? String(bagIdNum) : undefined,
            bagName,
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

  // Build enriched bag maps: airtableId → localId + bean name + display label
  const bagIdMap       = new Map<string, number>(); // bagAtId → localId
  const bagBeanNameMap = new Map<string, string>(); // bagAtId → bean display name
  const bagLabelMap    = new Map<string, string>(); // bagAtId → bag display label
  {
    // Need bean name via beanId reverse lookup
    const beanLocalIdToName = new Map<number, string>();
    for (const [atId, localId] of beanIdMap) beanLocalIdToName.set(localId, beanNameMap.get(atId) ?? "");

    const rows = await db
      .select({ id: bagsTable.id, atId: bagsTable.airtableRecordId, bagName: bagsTable.bagName, beanId: bagsTable.beanId })
      .from(bagsTable).where(isNotNull(bagsTable.airtableRecordId));
    for (const b of rows) {
      if (b.atId) {
        bagIdMap.set(b.atId, b.id);
        if (b.bagName) bagLabelMap.set(b.atId, b.bagName);
        if (b.beanId) bagBeanNameMap.set(b.atId, beanLocalIdToName.get(b.beanId) ?? "");
      }
    }
  }

  // ── 3. Sync Shots ────────────────────────────────────────────────────────
  // Key fields: "Date", "Bag" (linked), "Bean Helper" (linked → direct bean atId),
  // "Bag Label" (lookup string array — use bagLabelMap instead for clean label),
  // "Dose (g)", "Yield (g)", "Grinder Setting", "Pour Time (sec)", etc.
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
          const bagAtId  = linkedId(findField(f, ["Bag", "Bags", "Current Bag"]));
          const bagId    = bagAtId ? (bagIdMap.get(bagAtId) ?? null) : null;

          // Bean display: prefer direct "Bean Helper" link, then Bag→Bean path
          const beanAtIdDirect = linkedId(findField(f, ["Bean Helper", "Bean", "Beans"]));
          const beanDisplayName =
            (beanAtIdDirect ? beanNameMap.get(beanAtIdDirect) : undefined) ??
            (bagAtId ? bagBeanNameMap.get(bagAtId) : undefined) ??
            undefined;

          // Bag display: use our clean synced bag label (avoids escaped quotes from Airtable lookups)
          const bagDisplayLabel = bagAtId ? bagLabelMap.get(bagAtId) : undefined;

          // Shot Classification is an array — join to string
          const classRaw = findField(f, ["Shot Classification", "Classification"]);
          const shotClassification = Array.isArray(classRaw) ? classRaw.join(", ") : str(classRaw);

          // Fault Status is an array — join to string
          const faultRaw = findField(f, ["Fault Status", "Fault"]);
          const faultStatus = Array.isArray(faultRaw) ? faultRaw.join(", ") : str(faultRaw);

          // Status — pre-computed so it can be used in the includeInAnalysis fallback
          const statusStr = str(findField(f, ["Shot Status", "Status"])) ?? "";

          // Include in Analysis: 0/1 checkbox in Airtable.
          // Fallback when field is absent: status ∈ {Good, Dialed In} AND fault status = Good.
          const includeRaw = findField(f, ["Include in Analysis", "Include In Analysis"]);
          const includeInAnalysis = includeRaw != null
            ? Number(includeRaw) === 1
            : (["good", "dialed in"].includes(statusStr.toLowerCase()) &&
               (faultStatus ?? "").toLowerCase() === "good");

          const existing = await db.select({ id: shotsTable.id }).from(shotsTable).where(eq(shotsTable.airtableRecordId, r.id));
          const vals = {
            shotDate,
            bagId,
            bean: beanDisplayName,
            bag: bagDisplayLabel,
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
            signatureShot: bool(findField(f, ["Signature Shot"])) ?? false,
            status: statusStr || undefined,
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
