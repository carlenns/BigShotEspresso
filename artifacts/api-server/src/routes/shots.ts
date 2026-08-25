import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, sql, isNotNull } from "drizzle-orm";
import {
  db, shotsTable, bagsTable, beansTable, hoppersTable, hopperRangeBaselinesTable,
  type InsertShot,
} from "@workspace/db";
import {
  ListShotsQueryParams,
  CreateShotBody,
  ImportShotsCsvBody,
  GetShotParams,
  UpdateShotParams,
  UpdateShotBody,
  DeleteShotParams,
  GetSimilarShotsParams,
  ListReferenceShotsQueryParams,
} from "@workspace/api-zod";
import { eligibleShotConditions } from "../lib/shot-eligibility";
import {
  csvRowFingerprint,
  flattenUnique,
  parseCsvBoolean,
  parseCsvInteger,
  parseCsvMultiSelect,
  parseCsvNumber,
  parseCsvRecords,
  parseCsvString,
} from "../lib/csv";
import { toShotApi } from "../lib/api-shapes";

const router: IRouter = Router();

function calculatedRatio(dose: number | null | undefined, output: number | null | undefined): string | null {
  if (dose == null || output == null || Number(dose) <= 0 || Number(output) <= 0) return null;
  return (Math.round((Number(output) / Number(dose)) * 100) / 100).toFixed(2);
}

function normalizeShotInput<T extends Partial<InsertShot>>(data: T): T {
  const normalized: T = { ...data };

  if (normalized.signatureShot === true) normalized.isReference = true;
  if (normalized.isReference === false) normalized.signatureShot = false;

  if (normalized.ratio == null || normalized.ratio === "") {
    const ratio = calculatedRatio(normalized.dose, normalized.yield);
    if (ratio != null) normalized.ratio = ratio;
  }

  return normalized;
}

function validateRatings(data: Partial<InsertShot>): string | null {
  if (data.rating != null && Number(data.rating) > 10) {
    return "Technical rating cannot exceed 10.";
  }
  if (data.preferenceRating != null && Number(data.preferenceRating) > 11) {
    return "Preference rating cannot exceed 11.";
  }
  return null;
}

// Carry forward grind setting/time only within the same active Bag.
// Do not apply this to Beans or future Bags. Historical bean guidance must remain
// advisory until explicitly accepted by the user during new-bag setup.
async function carryForwardActiveBagGrindDefaults(
  bagId: number | null | undefined,
  data: Partial<InsertShot>,
): Promise<void> {
  if (bagId == null) return;
  const updates: { currentGrindSetting?: number; currentGrindTime?: number } = {};
  if (data.grindSetting != null) updates.currentGrindSetting = Number(data.grindSetting);
  if (data.grindTime != null) updates.currentGrindTime = Number(data.grindTime);
  if (Object.keys(updates).length === 0) return;

  await db.update(bagsTable)
    .set(updates)
    .where(and(eq(bagsTable.id, bagId), eq(bagsTable.isActive, true)));
}

// --- GET /shots/reference (must be before /:id) ---
router.get("/shots/reference", async (req, res): Promise<void> => {
  const params = ListReferenceShotsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const p = params.data;
  const conditions = [eq(shotsTable.isReference, true), ...eligibleShotConditions];
  if (p.bean) conditions.push(ilike(shotsTable.bean, `%${p.bean}%`));
  if (p.bag) conditions.push(ilike(shotsTable.bag, `%${p.bag}%`));
  if (p.ratingMin) conditions.push(gte(shotsTable.rating, Number(p.ratingMin)));
  if (p.yieldMin) conditions.push(gte(shotsTable.yield, Number(p.yieldMin)));
  if (p.yieldMax) conditions.push(lte(shotsTable.yield, Number(p.yieldMax)));
  if (p.pourTimeMin) conditions.push(gte(shotsTable.pourTime, Number(p.pourTimeMin)));
  if (p.pourTimeMax) conditions.push(lte(shotsTable.pourTime, Number(p.pourTimeMax)));
  if (p.pourDelayMin) conditions.push(gte(shotsTable.pourDelay, Number(p.pourDelayMin)));
  if (p.pourDelayMax) conditions.push(lte(shotsTable.pourDelay, Number(p.pourDelayMax)));

  const shots = await db.select().from(shotsTable).where(and(...conditions)).orderBy(sql`${shotsTable.shotDate} DESC`);
  res.json(shots.map(toShotApi));
});

// --- GET /shots/audit ---
router.get("/shots/audit", async (req, res): Promise<void> => {
  const shots = await db
    .select()
    .from(shotsTable)
    .orderBy(sql`${shotsTable.shotDate} ASC`);

  const totalColumns = shots[0]?.rawRow ? Object.keys(shots[0].rawRow).length : 0;
  const uniqueBags = [...new Set(shots.map((s) => s.bag).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(shots.map((s) => s.status).filter(Boolean))].sort();
  const uniqueFaultStatuses = flattenUnique(shots.map((s) => s.faultStatus));
  const refShots = shots.filter((s) => s.isReference);
  const nonRefShots = shots.filter((s) => !s.isReference);

  const summary = {
    totalRows: shots.length,
    totalColumns,
    earliestDate: shots[0]?.shotDate ?? null,
    latestDate: shots[shots.length - 1]?.shotDate ?? null,
    uniqueBags,
    uniqueStatuses,
    uniqueFaultStatuses,
    referenceShots: refShots.length,
    nonReferenceShots: nonRefShots.length,
  };

  res.json({ summary, shots });
});

// --- GET /shots/selector-options ---
router.get("/shots/selector-options", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "max-age=300");

  const rows = await db
    .select({
      expressionStyle: shotsTable.expressionStyle,
      beanAchievement: shotsTable.beanAchievement,
      shotClassification: shotsTable.shotClassification,
      status: shotsTable.status,
      faultStatus: shotsTable.faultStatus,
      drinkType: shotsTable.drinkType,
    })
    .from(shotsTable);

  function collectOptions(values: (string[] | null | undefined)[]): string[] {
    const set = new Set<string>();
    for (const value of values) for (const part of value ?? []) set.add(part);
    return [...set].sort();
  }
  function collectScalarOptions(values: (string | null | undefined)[]): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  }

  res.json({
    expressionStyle: collectOptions(rows.map((r) => r.expressionStyle)),
    beanAchievement: collectOptions(rows.map((r) => r.beanAchievement)),
    shotClassification: collectOptions(rows.map((r) => r.shotClassification)),
    status: collectScalarOptions(rows.map((r) => r.status)),
    faultStatus: collectOptions(rows.map((r) => r.faultStatus)),
    drinkType: collectScalarOptions(rows.map((r) => r.drinkType)),
  });
});

// --- POST /shots/import-csv ---
router.post("/shots/import-csv", async (req, res): Promise<void> => {
  const parsed = ImportShotsCsvBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { csvText } = parsed.data;

  // Build bag lookup from DB so the parser never infers bean names inline
  const allBags = await db
    .select({ id: bagsTable.id, bagNumber: bagsTable.bagNumber, beanName: beansTable.name })
    .from(bagsTable)
    .leftJoin(beansTable, eq(bagsTable.beanId, beansTable.id));
  const bagLookup = new Map<string, { bagId: number; beanName: string | null }>();
  for (const b of allBags) {
    if (b.bagNumber) bagLookup.set(b.bagNumber, { bagId: b.id, beanName: b.beanName ?? null });
  }
  const hopperLookup = new Map<string, number>();
  for (const hopper of await db.select({ id: hoppersTable.id, name: hoppersTable.name }).from(hoppersTable)) {
    hopperLookup.set(hopper.name.replace(/"/g, "").trim(), hopper.id);
  }
  const baselineLookup = new Map<string, number>();
  for (const baseline of await db.select({ id: hopperRangeBaselinesTable.id, range: hopperRangeBaselinesTable.hopperRange }).from(hopperRangeBaselinesTable)) {
    baselineLookup.set(baseline.range.trim(), baseline.id);
  }

  const result = parseCsvAndImport(csvText, bagLookup, hopperLookup, baselineLookup, true);
  const rows = result.rows;
  const headers = result.headers;
  const errors = result.errors;

  if (errors.length > 0) {
    res.status(400).json({
      error: "CSV validation failed; no rows were imported.",
      errors,
    });
    return;
  }

  let imported = 0;
  let skipped = 0;
  const insertErrors: string[] = [];

  try {
    await db.transaction(async (tx) => {
      for (const row of rows) {
        const inserted = await tx.insert(shotsTable).values(row)
          .onConflictDoNothing({ target: shotsTable.importFingerprint })
          .returning({ id: shotsTable.id });
        if (inserted.length > 0) imported++;
        else skipped++;
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({
      error: "CSV import transaction rolled back.",
      errors: [message],
      imported: 0,
      skipped: rows.length,
    });
    return;
  }

  const expectedRows = rows.length;
  const warning = imported !== expectedRows
    ? `Warning: imported ${imported} of ${expectedRows} parsed rows. Review row-level errors.`
    : null;

  // Build summary
  const allShots = await db.select().from(shotsTable).orderBy(sql`${shotsTable.shotDate} ASC`);
  const summary = {
    totalRows: imported,
    totalColumns: headers.length,
    earliestDate: allShots[0]?.shotDate ?? null,
    latestDate: allShots[allShots.length - 1]?.shotDate ?? null,
    uniqueBags: [...new Set(allShots.map((s) => s.bag).filter(Boolean))].sort(),
    uniqueStatuses: [...new Set(allShots.map((s) => s.status).filter(Boolean))].sort(),
    uniqueFaultStatuses: flattenUnique(allShots.map((s) => s.faultStatus)),
    referenceShots: allShots.filter((s) => s.isReference).length,
    nonReferenceShots: allShots.filter((s) => !s.isReference).length,
  };

  res.json({ imported, skipped, errors: insertErrors, warning, summary });
});

// --- GET /shots ---
router.get("/shots", async (req, res): Promise<void> => {
  const params = ListShotsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const p = params.data;
  const conditions = [];
  if (p.bean) conditions.push(ilike(shotsTable.bean, `%${p.bean}%`));
  if (p.bag) conditions.push(ilike(shotsTable.bag, `%${p.bag}%`));
  if (p.status) conditions.push(eq(shotsTable.status, p.status));
  if (p.faultStatus) conditions.push(sql`${shotsTable.faultStatus} @> ARRAY[${p.faultStatus}]::text[]`);
  if (p.isReference !== undefined && p.isReference !== "") conditions.push(eq(shotsTable.isReference, p.isReference === "true"));
  if (p.ratingMin) conditions.push(gte(shotsTable.rating, Number(p.ratingMin)));
  if (p.ratingMax) conditions.push(lte(shotsTable.rating, Number(p.ratingMax)));
  if (p.pourDelayMin) conditions.push(gte(shotsTable.pourDelay, Number(p.pourDelayMin)));
  if (p.pourDelayMax) conditions.push(lte(shotsTable.pourDelay, Number(p.pourDelayMax)));
  if (p.pourTimeMin) conditions.push(gte(shotsTable.pourTime, Number(p.pourTimeMin)));
  if (p.pourTimeMax) conditions.push(lte(shotsTable.pourTime, Number(p.pourTimeMax)));
  if (p.doseMin) conditions.push(gte(shotsTable.dose, Number(p.doseMin)));
  if (p.doseMax) conditions.push(lte(shotsTable.dose, Number(p.doseMax)));
  if (p.yieldMin) conditions.push(gte(shotsTable.yield, Number(p.yieldMin)));
  if (p.yieldMax) conditions.push(lte(shotsTable.yield, Number(p.yieldMax)));
  if (p.dateFrom) conditions.push(gte(shotsTable.shotDate, p.dateFrom));
  if (p.dateTo) conditions.push(lte(shotsTable.shotDate, p.dateTo));
  if (p.search) {
    conditions.push(
      or(
        ilike(shotsTable.notes, `%${p.search}%`),
        ilike(shotsTable.sensoryNotes, `%${p.search}%`),
        ilike(shotsTable.bean, `%${p.search}%`),
        ilike(shotsTable.bag, `%${p.search}%`)
      )!
    );
  }

  const limit = p.limit ? Number(p.limit) : 200;
  const offset = p.offset ? Number(p.offset) : 0;

  const shots = await db.select().from(shotsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${shotsTable.shotDate} DESC`)
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(shotsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ shots: shots.map(toShotApi), total: Number(total[0]?.count ?? 0) });
});

// --- POST /shots ---
router.post("/shots", async (req, res): Promise<void> => {
  const normalizedBody = {
    ...req.body,
    flowTime: req.body.flowTime ?? req.body.scaleTime,
  };
  delete normalizedBody.scaleTime;
  const parsed = CreateShotBody.safeParse(normalizedBody);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!parsed.data.shotDate) {
    res.status(400).json({ error: "shotDate is required" });
    return;
  }
  const { scaleTime: _scaleTime, ...parsedData } = parsed.data;
  const data = normalizeShotInput({ ...parsedData, shotDate: parsed.data.shotDate });
  const ratingError = validateRatings(data);
  if (ratingError) {
    res.status(400).json({ error: ratingError });
    return;
  }
  const shot = await db.insert(shotsTable).values(data).returning();
  await carryForwardActiveBagGrindDefaults(shot[0]?.bagId, data);
  res.status(201).json(toShotApi(shot[0]!));
});

// --- GET /shots/:id ---
router.get("/shots/:id", async (req, res): Promise<void> => {
  const params = GetShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const shot = await db.select().from(shotsTable).where(eq(shotsTable.id, Number(params.data.id)));
  if (!shot[0]) { res.status(404).json({ error: "Shot not found" }); return; }
  res.json(toShotApi(shot[0]));
});

// --- GET /shots/:id/similar ---
router.get("/shots/:id/similar", async (req, res): Promise<void> => {
  const params = GetSimilarShotsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const base = await db.select().from(shotsTable).where(eq(shotsTable.id, Number(params.data.id)));
  if (!base[0]) { res.status(404).json({ error: "Shot not found" }); return; }

  const conditions = [sql`${shotsTable.id} != ${Number(params.data.id)}`, ...eligibleShotConditions];
  if (base[0].bean) conditions.push(eq(shotsTable.bean, base[0].bean));
  if (base[0].grindSetting != null) {
    conditions.push(gte(shotsTable.grindSetting, base[0].grindSetting - 0.15));
    conditions.push(lte(shotsTable.grindSetting, base[0].grindSetting + 0.15));
  }
  if (base[0].dose != null) {
    conditions.push(gte(shotsTable.dose, base[0].dose - 0.5));
    conditions.push(lte(shotsTable.dose, base[0].dose + 0.5));
  }
  if (base[0].pourDelay != null) {
    conditions.push(gte(shotsTable.pourDelay, base[0].pourDelay - 3));
    conditions.push(lte(shotsTable.pourDelay, base[0].pourDelay + 3));
  }

  const similar = await db.select().from(shotsTable)
    .where(and(...conditions))
    .orderBy(sql`${shotsTable.shotDate} DESC`)
    .limit(10);

  res.json(similar.map(toShotApi));
});

// --- PATCH /shots/:id ---
router.patch("/shots/:id", async (req, res): Promise<void> => {
  const params = UpdateShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const normalizedBody = {
    ...req.body,
    flowTime: req.body.flowTime ?? req.body.scaleTime,
  };
  delete normalizedBody.scaleTime;
  const body = UpdateShotBody.safeParse(normalizedBody);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const { scaleTime: _scaleTime, ...parsedData } = body.data;
  const data = normalizeShotInput(parsedData);
  const ratingError = validateRatings(data);
  if (ratingError) {
    res.status(400).json({ error: ratingError });
    return;
  }
  const shot = await db.update(shotsTable).set(data).where(eq(shotsTable.id, Number(params.data.id))).returning();
  if (!shot[0]) { res.status(404).json({ error: "Shot not found" }); return; }
  await carryForwardActiveBagGrindDefaults(shot[0].bagId, data);
  res.json(toShotApi(shot[0]));
});

// --- DELETE /shots/:id ---
router.delete("/shots/:id", async (req, res): Promise<void> => {
  const params = DeleteShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(shotsTable).where(eq(shotsTable.id, Number(params.data.id)));
  res.status(204).end();
});

// ---- CSV parsing helper ----
type ShotRow = InsertShot;

export function parseCsvAndImport(
  csvText: string,
  bagLookup: Map<string, { bagId: number; beanName: string | null }> = new Map(),
  hopperLookup: Map<string, number> = new Map(),
  baselineLookup: Map<string, number> = new Map(),
  strictRelationships = false,
): { rows: ShotRow[]; headers: string[]; errors: string[] } {
  const rows: ShotRow[] = [];
  const errors: string[] = [];

  const records = parseCsvRecords(csvText);
  if (records.length < 2) return { rows, headers: [], errors: ["No data rows found"] };

  // Strip BOM from first header if present
  const rawHeaders = records[0].map((h, i) => i === 0 ? h.replace(/^\uFEFF/, "").trim() : h.trim());

  // Build column index map from actual headers
  const colIdx = (name: string) => rawHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const idxDate          = colIdx("Date");
  const idxBag           = colIdx("Bag");
  const idxShotsLeft     = colIdx("Shots Left (est)");
  const idxGrindSetting  = colIdx("Grinder Setting");
  const idxGrindAdjusted = colIdx("Grind Adjusted");
  const idxGrindTime     = colIdx("Grind Time");
  const idxInitialOutput = colIdx("Initial Output (g)");
  const idxTotalOutput   = colIdx("Total Output (g)");
  const idxDose          = colIdx("Dose (g)");
  const idxTimeAdj       = colIdx("Time Adj (sec)");
  const idxTopUpGrind    = colIdx("Top-Up Grind (g)");
  const idxOverGrind     = colIdx("Over Grind Removed (g)");
  const idxBeanDelta     = colIdx("Bean Delta");
  const idxGrindWaste    = colIdx("Grind Waste (g)");
  const idxBeansAdded    = colIdx("Beans Added (g)");
  const idxDoseCorrType  = colIdx("Dose Correction Type");
  const idxCorrAmount    = colIdx("Correction Amount (g)");
  const idxOutputDelta   = colIdx("Output Delta (g)");
  const idxTemp          = colIdx("Temp");
  const idxPourDelay     = colIdx("Pour Delay");
  const idxPourTime      = colIdx("Pour Time (sec)");
  const idxFlowTime      = rawHeaders.findIndex((h) => ["flow time (sec)", "flow time", "scale time"].includes(h.toLowerCase()));
  const idxYield         = colIdx("Yield (g)");
  const idxRatio         = colIdx("Ratio");
  const idxFinished      = colIdx("Finished Shot");
  const idxRating        = colIdx("Rating");
  const idxPrefRating    = colIdx("Preference Rating");
  const idxRatingDiff    = colIdx("Rating Difference");
  const idxAvgRating     = colIdx("Average Rating and Preference Rating weighted to Preference");
  const idxRated         = colIdx("Rated");
  const idxForOthers     = colIdx("For Others");
  const idxReference     = colIdx("Reference Shot");
  const idxSignature     = colIdx("Signature Shot");
  const idxDrinkType     = colIdx("Drink Type");
  const idxShotStatus    = colIdx("Shot Status");
  const idxShotClass     = colIdx("Shot Classification");
  const idxFaultStatus   = colIdx("Fault Status");
  const idxRefType       = colIdx("Reference Shot Type");
  const idxExpStyle      = colIdx("Expression Style");
  const idxDailyDriver   = colIdx("Daily Driver Count");
  const idxInclude       = colIdx("Include in Analysis");
  const idxNotes         = colIdx("Notes");
  const idxFaultNotes    = colIdx("Fault Notes");
  const idxBagOpenedDate = colIdx("Bag Opened Date");
  const idxHopperPhase   = colIdx("Hopper Phase");

  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    if (!r || r.length < 2) continue;

    const dateStr = r[idxDate]?.trim();
    if (!dateStr) continue;

    // Parse date
    let shotDate = dateStr;
    try {
      const d = new Date(dateStr.replace(/(\d+)(am|pm)/i, "$1 $2"));
      if (!isNaN(d.getTime())) shotDate = d.toISOString();
    } catch { /* keep raw string */ }

    const num = parseCsvNumber;
    const int = parseCsvInteger;
    const bool = (value: string | undefined): boolean => parseCsvBoolean(value) ?? false;
    const boolOrNull = parseCsvBoolean;
    const str = parseCsvString;
    const multi = parseCsvMultiSelect;
    const value = (...names: string[]): string | undefined => {
      for (const name of names) {
        const index = colIdx(name);
        if (index >= 0) return r[index];
      }
      return undefined;
    };

    // Resolve bag/bean via the bags table — no hardcoded inference
    const bagNum = str(r[idxBag]);
    const bagRecord = bagNum ? bagLookup.get(bagNum) : undefined;
    const beanName = bagRecord?.beanName ?? null;
    const bagIdVal = bagRecord?.bagId ?? null;
    const hopperName = str(value("Hopper Link"))?.replace(/"/g, "").trim() ?? null;
    const hopperRange = str(value("Hopper Range Link", "Hopper Range"));
    const relationshipErrors: string[] = [];
    if (strictRelationships && bagNum && !bagRecord) {
      relationshipErrors.push(`Bag "${bagNum}" was not found`);
    }
    if (strictRelationships && hopperName && !hopperLookup.has(hopperName)) {
      relationshipErrors.push(`Hopper "${hopperName}" was not found`);
    }
    if (strictRelationships && hopperRange && !baselineLookup.has(hopperRange)) {
      relationshipErrors.push(`Hopper Range Baseline "${hopperRange}" was not found`);
    }
    if (relationshipErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${relationshipErrors.join("; ")}`);
      continue;
    }

    // Store every source column verbatim, regardless of export version.
    const rawRow: Record<string, string> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      rawRow[rawHeaders[c]] = r[c] ?? "";
    }

    const row: ShotRow = {
      shotDate,
      bagId: bagIdVal,
      hopperId: hopperName ? (hopperLookup.get(hopperName) ?? null) : null,
      hopperRangeBaselineId: hopperRange ? (baselineLookup.get(hopperRange) ?? null) : null,
      bag: bagNum,
      bagLabel: str(value("Bag Label")),
      daysSinceOpen: int(value("Days Since Open")),
      bean: beanName,
      grindSetting: num(r[idxGrindSetting]),
      grindTime: num(r[idxGrindTime]),
      initialGrindWeight: num(r[idxInitialOutput]),
      totalOutput: num(r[idxTotalOutput]),
      dose: num(r[idxDose]),
      timeAdj: num(r[idxTimeAdj]),
      topUpGrind: num(r[idxTopUpGrind]),
      overGrindRemoved: num(r[idxOverGrind]),
      beanDelta: num(r[idxBeanDelta]),
      grindWaste: num(r[idxGrindWaste]),
      beansAdded: num(r[idxBeansAdded]),
      doseCorrectionType: str(r[idxDoseCorrType]),
      doseCorrection: num(r[idxCorrAmount]),
      outputDelta: num(r[idxOutputDelta]),
      yield: num(r[idxYield]),
      ratio: str(r[idxRatio]),
      temperature: int(r[idxTemp]),
      pourDelay: int(r[idxPourDelay]),
      pourTime: int(r[idxPourTime]),
      flowTime: int(r[idxFlowTime]),
      rating: num(r[idxRating]),
      preferenceRating: num(r[idxPrefRating]),
      ratingDifference: num(r[idxRatingDiff]),
      avgWeightedRating: num(r[idxAvgRating]),
      rated: boolOrNull(r[idxRated]),
      isForOthers: boolOrNull(r[idxForOthers]),
      isReference: bool(r[idxReference]),
      signatureShot: boolOrNull(r[idxSignature]),
      sourShot: boolOrNull(value("Sour")),
      boundaryShot: boolOrNull(value("Boundary Shot")),
      drinkType: str(r[idxDrinkType]),
      status: str(r[idxShotStatus]),
      shotClassification: multi(r[idxShotClass]),
      faultStatus: multi(r[idxFaultStatus]),
      referenceType: str(r[idxRefType]),
      beanAchievement: multi(value("Bean Achievement", "Reference Shot Type")),
      expressionStyle: multi(r[idxExpStyle]),
      dailyDriverCount: int(r[idxDailyDriver]),
      includeInAnalysis: boolOrNull(r[idxInclude]),
      importantToIntelligence: boolOrNull(value("Important to Intelligence")),
      intelligenceLessonType: multi(value("Intelligence Lesson Type")),
      notes: str(r[idxNotes]),
      faultNotes: str(r[idxFaultNotes]),
      bagOpenedDate: str(r[idxBagOpenedDate]),
      hopperPhase: str(r[idxHopperPhase]),
      hopperFullness: num(value("Hopper Fullness")),
      hopperPercent: num(value("Hopper %")),
      hopperRange: str(value("Hopper Range")),
      tasteZone: str(value("Taste Zone")),
      zone: str(value("Zone")),
      zoneScore: int(value("Zone Score")),
      tasteScore: int(value("Taste Score")),
      agreementPercent: num(value("Agreement %")),
      flowScore: num(value("Flow Score")),
      modelFlag: str(value("Model Flag")),
      timeGap: int(value("Time Gap (sec)")),
      scaleZone: str(value("Scale Zone")),
      flowDiagnostic: str(value("Flow Diagnostic")),
      pourDelayWindow: str(value("Pour Delay Window")),
      flowTimeWindow: str(value("Flow Time Window", "Scale Time Window")),
      flowTimeOffset: num(value("Flow Time Offset (Scale)", "Scale Offset")),
      driftDelta: num(value("Drift Delta (sec)")),
      shotDriftStatus: str(value("Shot Drift Status")),
      shotQualityScore: num(value("Shot Quality Score")),
      shotTier: str(value("Shot Tier")),
      perfectRangeFlag: str(value("Perfect Range Flag")),
      driftWarning: str(value("Drift Warning")),
      hopperZone: str(value("Hopper Zone")),
      hopperDriftLink: str(value("Hopper Drift Link")),
      hopperImpactScore: num(value("Hopper Impact Score")),
      hopperCorrectionRule: str(value("Hopper Correction Rule")),
      actionSuggestion: str(value("Action Suggestion")),
      scaleCalibrationReminder: str(value("Scale Calibration Reminder")),
      bagCalibrationReminder: str(value("Bag Calibration Reminder")),
      calculation: str(value("Calculation")),
      baselineUnaidedOutput: num(value("Baseline Unaided Output (g)")),
      baselineOutputDelta: num(value("Baseline Output Delta (g)")),
      actualDoseError: num(value("Actual Dose Error (g)")),
      hopperThresholdFlag: str(value("Hopper Threshold Flag")),
      hopperBehaviour: str(value("Hopper Behaviour")),
      hopperSeverity: str(value("Hopper Severity")),
      topUpGap: num(value("Top-Up Gap (g)")),
      topUpRecommendation: str(value("Top-Up Recommendation")),
      importFingerprint: csvRowFingerprint(rawHeaders, r),
      grindAdjusted: str(r[idxGrindAdjusted]),
      shotsLeftEst: num(r[idxShotsLeft]),
      finishedShot: boolOrNull(r[idxFinished]),
      sensoryNotes: null,
      rawRow,
    };

    rows.push(row);
  }

  return { rows, headers: rawHeaders, errors };
}

export default router;
