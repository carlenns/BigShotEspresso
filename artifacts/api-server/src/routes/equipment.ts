import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, grindersTable, machinesTable } from "@workspace/db";

const router: IRouter = Router();

// ---- GRINDERS ----

router.get("/equipment/grinders", async (_req, res): Promise<void> => {
  const rows = await db.select().from(grindersTable).orderBy(grindersTable.name);
  res.json(rows);
});

router.post("/equipment/grinders", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body.name) { res.status(400).json({ error: "name is required" }); return; }
  // If isDefault, clear other defaults first
  if (body.isDefault) await db.update(grindersTable).set({ isDefault: false });
  const row = await db.insert(grindersTable).values({
    name: body.name as string,
    shortLabel: body.shortLabel as string | undefined,
    brand: body.brand as string | undefined,
    model: body.model as string | undefined,
    type: body.type as string | undefined,
    burrSize: body.burrSize as string | undefined,
    burrType: body.burrType as string | undefined,
    adjustmentType: body.adjustmentType as string | undefined,
    grindSettingPrecision: body.grindSettingPrecision != null && body.grindSettingPrecision !== "" ? Number(body.grindSettingPrecision) : undefined,
    grindStepIncrement: body.grindStepIncrement != null && body.grindStepIncrement !== "" ? Number(body.grindStepIncrement) : undefined,
    isDefault: Boolean(body.isDefault),
    notes: body.notes as string | undefined,
  }).returning();
  res.status(201).json(row[0]);
});

router.patch("/equipment/grinders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  if (body.isDefault) await db.update(grindersTable).set({ isDefault: false });
  const row = await db.update(grindersTable).set({
    name: body.name as string | undefined,
    shortLabel: body.shortLabel as string | undefined,
    brand: body.brand as string | undefined,
    model: body.model as string | undefined,
    type: body.type as string | undefined,
    burrSize: body.burrSize as string | undefined,
    burrType: body.burrType as string | undefined,
    adjustmentType: body.adjustmentType as string | undefined,
    grindSettingPrecision: body.grindSettingPrecision != null && body.grindSettingPrecision !== "" ? Number(body.grindSettingPrecision) : undefined,
    grindStepIncrement: body.grindStepIncrement != null && body.grindStepIncrement !== "" ? Number(body.grindStepIncrement) : undefined,
    isDefault: body.isDefault != null ? Boolean(body.isDefault) : undefined,
    notes: body.notes as string | undefined,
  }).where(eq(grindersTable.id, id)).returning();
  if (!row[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row[0]);
});

router.delete("/equipment/grinders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(grindersTable).where(eq(grindersTable.id, id));
  res.status(204).end();
});

// ---- MACHINES ----

router.get("/equipment/machines", async (_req, res): Promise<void> => {
  const rows = await db.select().from(machinesTable).orderBy(machinesTable.name);
  res.json(rows);
});

router.post("/equipment/machines", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!body.name) { res.status(400).json({ error: "name is required" }); return; }
  if (body.isDefault) await db.update(machinesTable).set({ isDefault: false });
  const row = await db.insert(machinesTable).values({
    name: body.name as string,
    shortLabel: body.shortLabel as string | undefined,
    brand: body.brand as string | undefined,
    model: body.model as string | undefined,
    brewMethod: body.brewMethod as string | undefined,
    stockBasket: body.stockBasket as string | undefined,
    isDefault: Boolean(body.isDefault),
    notes: body.notes as string | undefined,
  }).returning();
  res.status(201).json(row[0]);
});

router.patch("/equipment/machines/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  if (body.isDefault) await db.update(machinesTable).set({ isDefault: false });
  const row = await db.update(machinesTable).set({
    name: body.name as string | undefined,
    shortLabel: body.shortLabel as string | undefined,
    brand: body.brand as string | undefined,
    model: body.model as string | undefined,
    brewMethod: body.brewMethod as string | undefined,
    stockBasket: body.stockBasket as string | undefined,
    isDefault: body.isDefault != null ? Boolean(body.isDefault) : undefined,
    notes: body.notes as string | undefined,
  }).where(eq(machinesTable.id, id)).returning();
  if (!row[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row[0]);
});

router.delete("/equipment/machines/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(machinesTable).where(eq(machinesTable.id, id));
  res.status(204).end();
});

export default router;
