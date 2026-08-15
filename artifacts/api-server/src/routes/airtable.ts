import { Router, type IRouter } from "express";
import { createHash } from "node:crypto";
import { eq, isNotNull, sql } from "drizzle-orm";
import {
  db, beansTable, bagsTable, shotsTable, settingsTable,
  grindersTable, machinesTable, accessoriesTable,
  tasteSelectorsTable, shotTasteSelectorsTable,
  hoppersTable, hopperRangeBaselinesTable, airtableSyncEvidenceTable,
} from "@workspace/db";
import {
  airtableBoolean as bool,
  airtableMulti as multi,
  airtableNumber as num,
  airtableString as str,
  findAirtableField as findField,
  mapAirtableShotFields,
  normalizeAirtableName as normalize,
  singleAirtableLinkedId,
} from "../lib/airtable-mapping";
import { getCoffeeLogAirtableConfig } from "../lib/airtable-config";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

function linkedId(value: unknown, fieldName = "linked field"): string | undefined {
  return singleAirtableLinkedId(value, fieldName);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function preserveAirtableEvidence(sourceTable: string, record: AirtableRecord): Promise<void> {
  const contentHash = createHash("sha256").update(stableJson(record.fields)).digest("hex");
  await db.insert(airtableSyncEvidenceTable).values({
    sourceTable,
    sourceRecordId: record.id,
    sourceCreatedTime: record.createdTime ? new Date(record.createdTime) : null,
    fields: record.fields,
    contentHash,
  }).onConflictDoNothing();
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
  const airtableConfig = getCoffeeLogAirtableConfig();
  res.json({
    hasToken: airtableConfig.hasToken,
    hasBaseId: airtableConfig.hasBaseId,
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
  const [hoppers] = await db.select({ total: sql<number>`count(*)::int`, fromAirtable: sql<number>`count(*) filter (where ${hoppersTable.airtableRecordId} is not null)::int` }).from(hoppersTable);
  const [hopperRangeBaselines] = await db.select({ total: sql<number>`count(*)::int`, fromAirtable: sql<number>`count(*) filter (where ${hopperRangeBaselinesTable.airtableRecordId} is not null)::int` }).from(hopperRangeBaselinesTable);
  res.json({ beans, bags, shots, grinders, machines, accessories, tasteSelectors, hoppers, hopperRangeBaselines });
});

// ── POST /api/airtable/test ────────────────────────────────────────────────
router.post("/airtable/test", async (_req, res): Promise<void> => {
  const { token, baseId, hasToken, hasBaseId } = getCoffeeLogAirtableConfig();

  if (!token || !baseId) {
    res.json({
      connected: false,
      error: "Missing environment variables. Set COFFEELOG_AIRTABLE_API_KEY and COFFEELOG_AIRTABLE_BASE_ID. Legacy AIRTABLE_API_KEY and AIRTABLE_BASE_ID are accepted as temporary fallbacks.",
      hasToken,
      hasBaseId,
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

    const meta = await metaRes.json() as { tables: { id: string; name: string; fields?: { name: string }[] }[] };
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

  const hp = await db.delete(hoppersTable);
  deleted.hoppers = (hp as any).rowCount ?? 0;

  const hb = await db.delete(hopperRangeBaselinesTable);
  deleted.hopperRangeBaselines = (hb as any).rowCount ?? 0;

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
  const { token, baseId } = getCoffeeLogAirtableConfig();

  if (!token || !baseId) {
    res.status(400).json({
      error: "COFFEELOG_AIRTABLE_API_KEY and COFFEELOG_AIRTABLE_BASE_ID must be set. Legacy AIRTABLE_API_KEY and AIRTABLE_BASE_ID are accepted as temporary fallbacks.",
    });
    return;
  }

  const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    res.status(502).json({ error: `Cannot reach Airtable (${metaRes.status})` });
    return;
  }
  const meta = await metaRes.json() as { tables: { id: string; name: string; fields?: { name: string }[] }[] };
  const tableMap = Object.fromEntries(meta.tables.map((t) => [normalize(t.name), t.name]));
  const tableFieldMap = new Map(
    meta.tables.map((table) => [
      normalize(table.name),
      new Set((table.fields ?? []).map((field) => normalize(field.name))),
    ]),
  );

  const resolveTable = (...names: string[]): string | null => {
    for (const n of names) {
      if (tableMap[normalize(n)]) return tableMap[normalize(n)];
    }
    return null;
  };
  const tableHasField = (tableName: string, ...fieldNames: string[]): boolean => {
    const fields = tableFieldMap.get(normalize(tableName));
    return fieldNames.some((fieldName) => fields?.has(normalize(fieldName)));
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
          await preserveAirtableEvidence(beansTableName, r);
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
          await preserveAirtableEvidence(bagsTableName, r);
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

  // ── 3. Sync Hopper states ────────────────────────────────────────────────
  const hopperIdMap = new Map<string, number>();
  const hopperTableName = resolveTable("Hopper", "Hoppers");
  if (hopperTableName) {
    stats.hoppers = initStat();
    try {
      const records = await fetchAllRecords(baseId, hopperTableName, token);
      for (const r of records) {
        const f = r.fields;
        const name = str(findField(f, ["Name", "Hopper", "Label"]));
        if (!name) { stats.hoppers.skipped++; continue; }
        try {
          const bagAtId = linkedId(findField(f, ["Bag", "Bags"]), "Bag");
          const vals = {
            name,
            bagId: bagAtId ? (bagIdMap.get(bagAtId) ?? null) : null,
            startingBeans: num(findField(f, ["Starting Beans (g)", "Starting Beans"])),
            isActive: bool(findField(f, ["Active"])) ?? false,
            hopperMass: num(findField(f, ["Hopper Mass (g)", "Hopper Mass"])),
            hopperPercent: num(findField(f, ["Hopper %"])),
            shotsLeftEstimate: num(findField(f, ["Shots Left (estimated)", "Shots Left (est)"])),
            phase: str(findField(f, ["Hopper Phase", "Phase"])),
            notes: str(findField(f, ["Notes"])),
            airtableRecordId: r.id,
            rawRow: f,
          };
          const result = await db.transaction(async (tx) => {
            const existing = await tx.select({ id: hoppersTable.id }).from(hoppersTable)
              .where(eq(hoppersTable.airtableRecordId, r.id));
            if (vals.isActive && vals.bagId != null) {
              await tx.update(hoppersTable).set({ isActive: false })
                .where(eq(hoppersTable.bagId, vals.bagId));
            }
            if (existing.length) {
              await tx.update(hoppersTable).set(vals).where(eq(hoppersTable.airtableRecordId, r.id));
              return { id: existing[0]!.id, updated: true };
            }
            const [inserted] = await tx.insert(hoppersTable).values(vals).returning({ id: hoppersTable.id });
            return { id: inserted!.id, updated: false };
          });
          hopperIdMap.set(r.id, result.id);
          if (result.updated) stats.hoppers.updated++;
          else stats.hoppers.inserted++;
          await preserveAirtableEvidence(hopperTableName, r);
        } catch (e) { stats.hoppers.errors.push(`${r.id}: ${String(e).slice(0, 100)}`); }
      }
    } catch (e) { stats.hoppers = { ...initStat(), errors: [String(e)] }; }
  }

  // ── 4. Sync Hopper Range Baselines ──────────────────────────────────────
  const hopperRangeBaselineIdMap = new Map<string, number>();
  const baselineTableName = resolveTable("Hopper Range Baselines", "Hopper Range Baseline");
  if (baselineTableName) {
    stats.hopperRangeBaselines = initStat();
    try {
      const records = await fetchAllRecords(baseId, baselineTableName, token);
      for (const r of records) {
        const f = r.fields;
        const hopperRange = str(findField(f, ["Hopper Range", "Range"]));
        if (!hopperRange) { stats.hopperRangeBaselines.skipped++; continue; }
        try {
          const vals = {
            hopperRange,
            baselineOutputAdjustedDate: str(findField(f, ["Baseline Output Adjusted Date"])),
            baselineOutputStatus: str(findField(f, ["Baseline Output Status"])),
            baselineOutput: num(findField(f, ["Baseline Output (g)", "Baseline Output"])),
            avgInitialOutput: num(findField(f, ["Avg Initial Output (g)", "Average Initial Output"])),
            observationCount: num(findField(f, ["Count"])) as number | undefined,
            airtableRecordId: r.id,
            rawRow: f,
          };
          const existing = await db.select({ id: hopperRangeBaselinesTable.id }).from(hopperRangeBaselinesTable)
            .where(eq(hopperRangeBaselinesTable.airtableRecordId, r.id));
          if (existing.length) {
            await db.update(hopperRangeBaselinesTable).set(vals).where(eq(hopperRangeBaselinesTable.airtableRecordId, r.id));
            hopperRangeBaselineIdMap.set(r.id, existing[0]!.id);
            stats.hopperRangeBaselines.updated++;
          } else {
            const [inserted] = await db.insert(hopperRangeBaselinesTable).values(vals).returning({ id: hopperRangeBaselinesTable.id });
            if (inserted) hopperRangeBaselineIdMap.set(r.id, inserted.id);
            stats.hopperRangeBaselines.inserted++;
          }
          await preserveAirtableEvidence(baselineTableName, r);
        } catch (e) { stats.hopperRangeBaselines.errors.push(`${r.id}: ${String(e).slice(0, 100)}`); }
      }
    } catch (e) { stats.hopperRangeBaselines = { ...initStat(), errors: [String(e)] }; }
  }

  // ── 5. Sync Shots ────────────────────────────────────────────────────────
  // Key fields: "Date", "Bag" (linked), "Bean Helper" (linked → direct bean atId),
  // "Bag Label" (lookup string array — use bagLabelMap instead for clean label),
  // "Dose (g)", "Yield (g)", "Grinder Setting", "Pour Time (sec)", etc.
  const shotsTableName = resolveTable("Shots", "Shot Log", "Shot");
  if (shotsTableName) {
    stats.shots = initStat();
    try {
      const records = await fetchAllRecords(baseId, shotsTableName, token);
      const includeInAnalysisFieldPresent = tableHasField(
        shotsTableName,
        "Include in Analysis",
        "Include In Analysis",
      );
      if (!includeInAnalysisFieldPresent) {
        stats.shots.errors.push(
          "Airtable Shots is missing Include in Analysis; eligibility values were left unchanged or null.",
        );
      }
      for (const r of records) {
        const f = r.fields;
        const mappedFields = mapAirtableShotFields(f, {
          includeInAnalysisFieldPresent,
        });
        const shotDate = mappedFields.shotDate;
        if (!shotDate) { stats.shots.skipped++; continue; }
        try {
          const bagAtId  = linkedId(findField(f, ["Bag", "Bags", "Current Bag"]), "Bag");
          const bagId    = bagAtId ? (bagIdMap.get(bagAtId) ?? null) : null;
          if (bagAtId && bagId == null) throw new Error(`Unresolved Bag link ${bagAtId}`);

          const hopperAtId = linkedId(findField(f, ["Hopper Link", "Hopper"]), "Hopper Link");
          const hopperId = hopperAtId ? (hopperIdMap.get(hopperAtId) ?? null) : null;
          if (hopperAtId && hopperId == null) throw new Error(`Unresolved Hopper link ${hopperAtId}`);

          const baselineAtId = linkedId(
            findField(f, ["Hopper Range Link", "Hopper Range Baseline"]),
            "Hopper Range Link",
          );
          const hopperRangeBaselineId = baselineAtId
            ? (hopperRangeBaselineIdMap.get(baselineAtId) ?? null)
            : null;
          if (baselineAtId && hopperRangeBaselineId == null) {
            throw new Error(`Unresolved Hopper Range Baseline link ${baselineAtId}`);
          }

          // Bean display: prefer direct "Bean Helper" link, then Bag→Bean path
          const beanAtIdDirect = linkedId(
            findField(f, ["Bean Helper", "Bean", "Beans"]),
            "Bean Helper",
          );
          const beanDisplayName =
            (beanAtIdDirect ? beanNameMap.get(beanAtIdDirect) : undefined) ??
            (bagAtId ? bagBeanNameMap.get(bagAtId) : undefined) ??
            undefined;

          // Bag display: use our clean synced bag label (avoids escaped quotes from Airtable lookups)
          const bagDisplayLabel = bagAtId ? bagLabelMap.get(bagAtId) : undefined;

          const existing = await db.select({ id: shotsTable.id }).from(shotsTable).where(eq(shotsTable.airtableRecordId, r.id));
          const vals = {
            ...mappedFields,
            shotDate: String(shotDate),
            bagId,
            hopperId,
            hopperRangeBaselineId,
            bean: beanDisplayName,
            bag: bagDisplayLabel,
            airtableRecordId: r.id,
          };
          if (existing.length) {
            await db.update(shotsTable).set(vals).where(eq(shotsTable.airtableRecordId, r.id));
            stats.shots.updated++;
          } else {
            await db.insert(shotsTable).values(vals);
            stats.shots.inserted++;
          }
          await preserveAirtableEvidence(shotsTableName, r);
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
