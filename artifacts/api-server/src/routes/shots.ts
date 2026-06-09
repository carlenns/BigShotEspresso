import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { db, shotsTable } from "@workspace/db";
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
  const conditions = [eq(shotsTable.isReference, true)];
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

// --- POST /shots/import-csv ---
router.post("/shots/import-csv", async (req, res): Promise<void> => {
  const parsed = ImportShotsCsvBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { csvText } = parsed.data;
  const result = parseCsvAndImport(csvText);
  const rows = result.rows;
  const errors = result.errors;

  let imported = 0;
  let skipped = 0;
  const insertErrors: string[] = [...errors];

  for (const row of rows) {
    try {
      if (!row.shotDate) { skipped++; continue; }
      // Skip non-shot rows (hopper refill, maintenance, etc.) by checking status
      const skipStatuses = ["Hopper Refill", "Maintenance - Grinder", "Reconciliation to Zero Out Hopper"];
      if (row.status && skipStatuses.includes(row.status)) { skipped++; continue; }

      await db.insert(shotsTable).values(row);
      imported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      insertErrors.push(`Row ${imported + skipped + 1}: ${msg}`);
      skipped++;
    }
  }

  res.json({ imported, skipped, errors: insertErrors });
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

  res.json(shots);
});

// --- POST /shots ---
router.post("/shots", async (req, res): Promise<void> => {
  const parsed = CreateShotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [shot] = await db.insert(shotsTable).values(parsed.data).returning();
  res.status(201).json(shot);
});

// --- GET /shots/:id ---
router.get("/shots/:id", async (req, res): Promise<void> => {
  const params = GetShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [shot] = await db.select().from(shotsTable).where(eq(shotsTable.id, params.data.id));
  if (!shot) { res.status(404).json({ error: "Shot not found" }); return; }
  res.json(shot);
});

// --- PATCH /shots/:id ---
router.patch("/shots/:id", async (req, res): Promise<void> => {
  const params = UpdateShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateShotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [shot] = await db.update(shotsTable).set(parsed.data).where(eq(shotsTable.id, params.data.id)).returning();
  if (!shot) { res.status(404).json({ error: "Shot not found" }); return; }
  res.json(shot);
});

// --- DELETE /shots/:id ---
router.delete("/shots/:id", async (req, res): Promise<void> => {
  const params = DeleteShotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [shot] = await db.delete(shotsTable).where(eq(shotsTable.id, params.data.id)).returning();
  if (!shot) { res.status(404).json({ error: "Shot not found" }); return; }
  res.sendStatus(204);
});

// --- GET /shots/:id/similar ---
router.get("/shots/:id/similar", async (req, res): Promise<void> => {
  const params = GetSimilarShotsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [base] = await db.select().from(shotsTable).where(eq(shotsTable.id, params.data.id));
  if (!base) { res.status(404).json({ error: "Shot not found" }); return; }

  const conditions = [sql`${shotsTable.id} != ${params.data.id}`];
  if (base.bean) conditions.push(ilike(shotsTable.bean, `%${base.bean}%`));
  if (base.dose != null) {
    conditions.push(gte(shotsTable.dose, base.dose - 0.5));
    conditions.push(lte(shotsTable.dose, base.dose + 0.5));
  }
  if (base.yield != null) {
    conditions.push(gte(shotsTable.yield, base.yield - 2.0));
    conditions.push(lte(shotsTable.yield, base.yield + 2.0));
  }
  if (base.pourDelay != null) {
    conditions.push(gte(shotsTable.pourDelay, base.pourDelay - 3));
    conditions.push(lte(shotsTable.pourDelay, base.pourDelay + 3));
  }

  const similar = await db.select().from(shotsTable)
    .where(and(...conditions))
    .orderBy(sql`${shotsTable.shotDate} DESC`)
    .limit(10);

  res.json(similar);
});

// ---- CSV parsing helper ----
type ShotRow = {
  shotDate: string;
  bag?: string | null;
  bean?: string | null;
  grindSetting?: number | null;
  grindTime?: number | null;
  initialGrindWeight?: number | null;
  dose?: number | null;
  yield?: number | null;
  ratio?: string | null;
  temperature?: number | null;
  pourDelay?: number | null;
  pourTime?: number | null;
  scaleTime?: number | null;
  rating?: number | null;
  preferenceRating?: number | null;
  status?: string | null;
  faultStatus?: string | null;
  isReference: boolean;
  isForOthers?: boolean | null;
  notes?: string | null;
  sensoryNotes?: string | null;
  grindAdjusted?: string | null;
  doseCorrection?: number | null;
  doseCorrectionType?: string | null;
  shotsLeftEst?: number | null;
};

function parseCsvAndImport(csvText: string): { rows: ShotRow[]; errors: string[] } {
  const rows: ShotRow[] = [];
  const errors: string[] = [];

  // Parse CSV with quoted fields support
  const records = parseCSV(csvText);
  if (records.length < 2) return { rows, errors: ["No data rows found"] };

  const header = records[0];
  const colIdx = (name: string) => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());

  const idxDate = 0;
  const idxBag = 1;
  const idxShotsLeft = 2;
  const idxGrindSetting = 3;
  const idxGrindAdjusted = 4;
  const idxGrindTime = 5;
  const idxInitialOutput = 6;
  const idxDose = 8;
  const idxDoseCorrType = 15;
  const idxCorrectionAmount = 16;
  const idxTemp = 18;
  const idxPourDelay = 19;
  const idxPourTime = 20;
  const idxScaleTime = 21;
  const idxYield = 22;
  const idxRatio = 23;
  const idxRating = 25;
  const idxPrefRating = 26;
  const idxForOthers = 30;
  const idxReference = 31;
  const idxShotStatus = 34;
  const idxFaultStatus = 36;
  const idxNotes = 41;

  void colIdx; // suppress unused warning

  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    if (!r || r.length < 5) continue;

    const dateStr = r[idxDate]?.trim();
    if (!dateStr) continue;

    // Parse date - the format is like "2026-04-21 4:40am"
    // Convert to ISO-like string
    let shotDate = dateStr;
    try {
      const d = new Date(dateStr.replace(/(\d+)(am|pm)/i, "$1 $2"));
      if (!isNaN(d.getTime())) {
        shotDate = d.toISOString();
      }
    } catch {
      // keep as-is
    }

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
    const bool = (v: string | undefined): boolean => {
      return v?.trim().toLowerCase() === "checked";
    };
    const str = (v: string | undefined): string | null => {
      const s = v?.trim();
      return s && s !== "" ? s : null;
    };

    const row: ShotRow = {
      shotDate,
      bag: str(r[idxBag]),
      bean: "MH Brazil", // Default bean name from context
      grindSetting: num(r[idxGrindSetting]),
      grindTime: num(r[idxGrindTime]),
      initialGrindWeight: num(r[idxInitialOutput]),
      dose: num(r[idxDose]),
      yield: num(r[idxYield]),
      ratio: str(r[idxRatio]),
      temperature: int(r[idxTemp]),
      pourDelay: int(r[idxPourDelay]),
      pourTime: int(r[idxPourTime]),
      scaleTime: int(r[idxScaleTime]),
      rating: num(r[idxRating]),
      preferenceRating: num(r[idxPrefRating]),
      status: str(r[idxShotStatus]),
      faultStatus: str(r[idxFaultStatus]),
      isReference: bool(r[idxReference]),
      isForOthers: bool(r[idxForOthers]) || null,
      notes: str(r[idxNotes]),
      sensoryNotes: null,
      grindAdjusted: str(r[idxGrindAdjusted]),
      doseCorrection: num(r[idxCorrectionAmount]),
      doseCorrectionType: str(r[idxDoseCorrType]),
      shotsLeftEst: num(r[idxShotsLeft]),
    };

    rows.push(row);
  }

  return { rows, errors };
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
          // Escaped quote
          field += '"';
          i += 2;
        } else {
          // End of quoted field
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

  // Last field/row
  if (field || row.length > 0) {
    row.push(field);
    if (row.some(f => f.trim() !== "")) results.push(row);
  }

  return results;
}

export default router;
