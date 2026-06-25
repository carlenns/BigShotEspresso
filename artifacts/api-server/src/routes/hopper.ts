import { Router, type IRouter } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db, hoppersTable, hopperRangeBaselinesTable } from "@workspace/db";
import {
  CreateHopperBody,
  CreateHopperRangeBaselineBody,
  ImportHopperRangeBaselinesCsvBody,
  ImportHoppersCsvBody,
  UpdateHopperBody,
  UpdateHopperParams,
} from "@workspace/api-zod";
import { parseCsvRecords } from "../lib/csv";
import { parseBaselineCsvData, parseHopperCsvData } from "../lib/hopper-csv";
import {
  toHopperApi,
  toHopperRangeBaselineApi,
} from "../lib/api-shapes";

const router: IRouter = Router();

export function parseHopperCsv(text: string): string[][] {
  return parseCsvRecords(text);
}

router.get("/hoppers", async (_req, res): Promise<void> => {
  const rows = await db.select().from(hoppersTable).orderBy(hoppersTable.id);
  res.json(rows.map(toHopperApi));
});

router.post("/hoppers", async (req, res): Promise<void> => {
  const parsed = CreateHopperBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;
  const [row] = await db.transaction(async (tx) => {
    const bagId = body.bagId != null ? Number(body.bagId) : undefined;
    if (body.isActive && bagId != null) {
      await tx.update(hoppersTable).set({ isActive: false }).where(eq(hoppersTable.bagId, bagId));
    }
    return tx.insert(hoppersTable).values({
      name: String(body.name),
      bagId,
      startingBeans: body.startingBeans != null ? Number(body.startingBeans) : undefined,
      isActive: Boolean(body.isActive),
      phase: body.phase as string | undefined,
      notes: body.notes as string | undefined,
    }).returning();
  });
  res.status(201).json(toHopperApi(row!));
});

router.post("/hoppers/import-csv", async (req, res): Promise<void> => {
  const body = ImportHoppersCsvBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const parsed = parseHopperCsvData(body.data.csvText);
  if (parsed.errors.length > 0) {
    res.status(400).json({ error: "CSV validation failed; no rows were imported.", errors: parsed.errors });
    return;
  }
  await db.transaction(async (tx) => {
    for (const values of parsed.rows) {
      await tx.insert(hoppersTable).values(values)
        .onConflictDoUpdate({ target: hoppersTable.name, set: values });
    }
  });
  res.json({ imported: parsed.rows.length, skipped: 0, errors: [], totalColumns: parsed.headers.length });
});

router.patch("/hoppers/:id", async (req, res): Promise<void> => {
  const params = UpdateHopperParams.safeParse(req.params);
  const parsed = UpdateHopperBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = params.data.id;
  const body = parsed.data;
  const bagId = body.bagId != null ? Number(body.bagId) : undefined;
  const [row] = await db.transaction(async (tx) => {
    if (body.isActive && bagId != null) {
      await tx.update(hoppersTable).set({ isActive: false })
        .where(and(eq(hoppersTable.bagId, bagId), ne(hoppersTable.id, id)));
    }
    return tx.update(hoppersTable).set({
      name: body.name as string | undefined,
      bagId,
      startingBeans: body.startingBeans != null ? Number(body.startingBeans) : undefined,
      isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
      phase: body.phase as string | undefined,
      notes: body.notes as string | undefined,
    }).where(eq(hoppersTable.id, id)).returning();
  });
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toHopperApi(row));
});

router.get("/hopper-range-baselines", async (_req, res): Promise<void> => {
  const rows = await db.select().from(hopperRangeBaselinesTable)
    .orderBy(hopperRangeBaselinesTable.hopperRange);
  res.json(rows.map(toHopperRangeBaselineApi));
});

router.post("/hopper-range-baselines", async (req, res): Promise<void> => {
  const parsed = CreateHopperRangeBaselineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;
  const [row] = await db.insert(hopperRangeBaselinesTable).values({
    hopperRange: String(body.hopperRange),
    baselineOutputAdjustedDate: body.baselineOutputAdjustedDate as string | undefined,
    baselineOutputStatus: body.baselineOutputStatus as string | undefined,
    baselineOutput: body.baselineOutput != null ? Number(body.baselineOutput) : undefined,
  }).returning();
  res.status(201).json(toHopperRangeBaselineApi(row!));
});

router.post("/hopper-range-baselines/import-csv", async (req, res): Promise<void> => {
  const body = ImportHopperRangeBaselinesCsvBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const parsed = parseBaselineCsvData(body.data.csvText);
  if (parsed.errors.length > 0) {
    res.status(400).json({ error: "CSV validation failed; no rows were imported.", errors: parsed.errors });
    return;
  }
  await db.transaction(async (tx) => {
    for (const values of parsed.rows) {
      await tx.insert(hopperRangeBaselinesTable).values(values)
        .onConflictDoUpdate({ target: hopperRangeBaselinesTable.hopperRange, set: values });
    }
  });
  res.json({ imported: parsed.rows.length, skipped: 0, errors: [], totalColumns: parsed.headers.length });
});

export default router;
