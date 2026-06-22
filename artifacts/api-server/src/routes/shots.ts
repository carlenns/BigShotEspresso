import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, sql, isNotNull } from "drizzle-orm";
import { db, shotsTable, bagsTable, beansTable } from "@workspace/db";
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

const router: IRouter = Router();

// --- GET /shots/reference (must be before /:id) ---
router.get("/shots/reference", async (req, res): Promise<void> => {
  const params = ListReferenceShotsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const p = params.data;
  const conditions = [eq(shotsTable.isReference, true), isNotNull(shotsTable.airtableRecordId)];
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
  res.json(shots);
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
  const uniqueFaultStatuses = [...new Set(shots.map((s) => s.faultStatus).filter(Boolean))].sort();
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
    .from(shotsTable)
    .where(isNotNull(shotsTable.airtableRecordId));

  // Airtable multi-selects are stored as quoted CSV strings, e.g. "Caramel Forward, Balanced"
  // Split, strip quotes, deduplicate, and sort to recover individual option values.
  function parseMultiSelect(val: string | null | undefined): string[] {
    if (!val) return [];
    return val.replace(/^"|"$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  }

  function collectOptions(values: (string | null | undefined)[]): string[] {
    const set = new Set<string>();
    for (const v of values) for (const part of parseMultiSelect(v)) set.add(part);
    return [...set].sort();
  }

  res.json({
    expressionStyle: collectOptions(rows.map((r) => r.expressionStyle)),
    beanAchievement: collectOptions(rows.map((r) => r.beanAchievement)),
    shotClassification: collectOptions(rows.map((r) => r.shotClassification)),
    status: collectOptions(rows.map((r) => r.status)),
    faultStatus: collectOptions(rows.map((r) => r.faultStatus)),
    drinkType: collectOptions(rows.map((r) => r.drinkType)),
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

  const result = parseCsvAndImport(csvText, bagLookup);
  const rows = result.rows;
  const headers = result.headers;
  const errors = result.errors;

  if (errors.length > 0 && rows.length === 0) {
    res.status(400).json({ error: errors[0], errors });
    return;
  }

  let imported = 0;
  let skipped = 0;
  const insertErrors: string[] = [...errors];

  for (const row of rows) {
    try {
      await db.insert(shotsTable).values(row);
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      insertErrors.push(`Row ${imported + skipped + 1}: ${msg}`);
      skipped++;
    }
  }

  // Validate expected count
  const EXPECTED_ROWS = 132;
  const warning = imported !== EXPECTED_ROWS
    ? `Warning: imported ${imported} rows but expected ${EXPECTED_ROWS}. Check for missing/duplicate rows.`
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
    uniqueFaultStatuses: [...new Set(allShots.map((s) => s.faultStatus).filter(Boolean))].sort(),
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
  const conditions = [isNotNull(shotsTable.airtableRecordId)];
  if (p.bean) conditions.push(ilike(shotsTable.bean, `%${p.bean}%`));
  if (p.bag) conditions.push(ilike(shotsTable.bag, `%${p.bag}%`));
  if (p.status) conditions.push(eq(shotsTable.status, p.status));
  if (p.faultStatus) conditions.push(eq(shotsTable.faultStatus, p.faultStatus));
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

  res.json({ shots, total: Number(total[0]?.count ?? 0) });
});

// --- POST /shots ---
router.post("/shots", async (req, res): Promise<void> => {
  const parsed = CreateShotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const shot = await db.insert(shotsTable).values(parsed.data).returning();
  res.status(201).json(shot[0]);
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
  res.json(shot[0]);
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

  const conditions = [sql`${shotsTable.id} != ${Number(params.data.id)}`];
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

  res.json(similar);
});

// --- PATCH /shots/:id ---
router.patch("/shots/:id", async (req, res): Promise<void> => {
  const params = UpdateShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateShotBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const shot = await db.update(shotsTable).set(body.data).where(eq(shotsTable.id, Number(params.data.id))).returning();
  if (!shot[0]) { res.status(404).json({ error: "Shot not found" }); return; }
  res.json(shot[0]);
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
type ShotRow = {
  shotDate: string;
  bagId?: number | null;
  bag?: string | null;
  bean?: string | null;
  grindSetting?: number | null;
  grindTime?: number | null;
  initialGrindWeight?: number | null;
  totalOutput?: number | null;
  dose?: number | null;
  timeAdj?: number | null;
  topUpGrind?: number | null;
  overGrindRemoved?: number | null;
  beanDelta?: number | null;
  grindWaste?: number | null;
  beansAdded?: number | null;
  doseCorrectionType?: string | null;
  doseCorrection?: number | null;
  outputDelta?: number | null;
  yield?: number | null;
  ratio?: string | null;
  temperature?: number | null;
  pourDelay?: number | null;
  pourTime?: number | null;
  scaleTime?: number | null;
  rating?: number | null;
  preferenceRating?: number | null;
  ratingDifference?: number | null;
  avgWeightedRating?: number | null;
  rated?: boolean | null;
  isForOthers?: boolean | null;
  isReference: boolean;
  signatureShot?: boolean | null;
  drinkType?: string | null;
  status?: string | null;
  shotClassification?: string | null;
  faultStatus?: string | null;
  referenceType?: string | null;
  expressionStyle?: string | null;
  dailyDriverCount?: number | null;
  includeInAnalysis?: boolean | null;
  notes?: string | null;
  faultNotes?: string | null;
  bagOpenedDate?: string | null;
  hopperPhase?: string | null;
  grindAdjusted?: string | null;
  shotsLeftEst?: number | null;
  finishedShot?: boolean | null;
  sensoryNotes?: string | null;
  rawRow?: Record<string, string>;
};

function parseCsvAndImport(
  csvText: string,
  bagLookup: Map<string, { bagId: number; beanName: string | null }> = new Map()
): { rows: ShotRow[]; headers: string[]; errors: string[] } {
  const rows: ShotRow[] = [];
  const errors: string[] = [];

  const records = parseCSV(csvText);
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
  const idxScaleTime     = colIdx("Scale Time");
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

    const num = (v: string | undefined): number | null => {
      if (v == null || v.trim() === "") return null;
      const n = parseFloat(v.trim());
      return isNaN(n) ? null : n;
    };
    const int = (v: string | undefined): number | null => {
      if (v == null || v.trim() === "") return null;
      const n = parseInt(v.trim(), 10);
      return isNaN(n) ? null : n;
    };
    const bool = (v: string | undefined): boolean => v?.trim().toLowerCase() === "checked";
    const boolOrNull = (v: string | undefined): boolean | null => {
      if (v == null || v.trim() === "") return null;
      return v.trim().toLowerCase() === "checked";
    };
    const str = (v: string | undefined): string | null => {
      const s = v?.trim();
      return s && s !== "" ? s : null;
    };

    // Resolve bag/bean via the bags table — no hardcoded inference
    const bagNum = str(r[idxBag]);
    const bagRecord = bagNum ? bagLookup.get(bagNum) : undefined;
    const beanName = bagRecord?.beanName ?? null;
    const bagIdVal = bagRecord?.bagId ?? null;

    // Store all 87 columns verbatim
    const rawRow: Record<string, string> = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      rawRow[rawHeaders[c]] = r[c] ?? "";
    }

    const row: ShotRow = {
      shotDate,
      bagId: bagIdVal,
      bag: bagNum,
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
      scaleTime: int(r[idxScaleTime]),
      rating: num(r[idxRating]),
      preferenceRating: num(r[idxPrefRating]),
      ratingDifference: num(r[idxRatingDiff]),
      avgWeightedRating: num(r[idxAvgRating]),
      rated: boolOrNull(r[idxRated]),
      isForOthers: boolOrNull(r[idxForOthers]),
      isReference: bool(r[idxReference]),
      signatureShot: boolOrNull(r[idxSignature]),
      drinkType: str(r[idxDrinkType]),
      status: str(r[idxShotStatus]),
      shotClassification: str(r[idxShotClass]),
      faultStatus: str(r[idxFaultStatus]),
      referenceType: str(r[idxRefType]),
      expressionStyle: str(r[idxExpStyle]),
      dailyDriverCount: int(r[idxDailyDriver]),
      includeInAnalysis: boolOrNull(r[idxInclude]),
      notes: str(r[idxNotes]),
      faultNotes: str(r[idxFaultNotes]),
      bagOpenedDate: str(r[idxBagOpenedDate]),
      hopperPhase: str(r[idxHopperPhase]),
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

/**
 * Parse CSV text into array of string arrays, handling quoted fields with newlines.
 */
function parseCSV(text: string): string[][] {
  const results: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < n && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = "";
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field);
        field = "";
        if (row.some(f => f.trim() !== "")) {
          results.push(row);
        }
        row = [];
        if (ch === '\r' && i + 1 < n && text[i + 1] === '\n') i++;
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some(f => f.trim() !== "")) results.push(row);
  }

  return results;
}

export default router;
