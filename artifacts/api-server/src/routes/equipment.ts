import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, grindersTable, machinesTable, shotsTable } from "@workspace/db";

const router: IRouter = Router();

// Postgres foreign-key violation (23503): a delete blocked because a shot still
// references this equipment. Safety net behind the explicit pre-checks below.
function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23503";
}

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
    sourceUrl: body.sourceUrl as string | undefined,
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
    sourceUrl: body.sourceUrl as string | undefined,
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
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select({ id: grindersTable.id }).from(grindersTable).where(eq(grindersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const [{ shotCount }] = await db
    .select({ shotCount: sql<number>`count(*)::int` })
    .from(shotsTable)
    .where(eq(shotsTable.grinderId, id));
  if (shotCount > 0) {
    res.status(409).json({
      error: `${shotCount} shot${shotCount === 1 ? "" : "s"} use${shotCount === 1 ? "s" : ""} this grinder — reassign or delete ${shotCount === 1 ? "it" : "them"} first.`,
    });
    return;
  }
  try {
    await db.delete(grindersTable).where(eq(grindersTable.id, id));
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ error: "This grinder is still referenced by shots — remove those first." });
      return;
    }
    throw err;
  }
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
    sourceUrl: body.sourceUrl as string | undefined,
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
    sourceUrl: body.sourceUrl as string | undefined,
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
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select({ id: machinesTable.id }).from(machinesTable).where(eq(machinesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const [{ shotCount }] = await db
    .select({ shotCount: sql<number>`count(*)::int` })
    .from(shotsTable)
    .where(eq(shotsTable.machineId, id));
  if (shotCount > 0) {
    res.status(409).json({
      error: `${shotCount} shot${shotCount === 1 ? "" : "s"} use${shotCount === 1 ? "s" : ""} this machine — reassign or delete ${shotCount === 1 ? "it" : "them"} first.`,
    });
    return;
  }
  try {
    await db.delete(machinesTable).where(eq(machinesTable.id, id));
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ error: "This machine is still referenced by shots — remove those first." });
      return;
    }
    throw err;
  }
  res.status(204).end();
});

export default router;
