import { Router, type IRouter } from "express";
import { and, eq, sql, isNotNull } from "drizzle-orm";
import { db, beansTable, bagsTable, shotsTable } from "@workspace/db";
import { eligibleShotConditions } from "../lib/shot-eligibility";

const router: IRouter = Router();

router.get("/beans", async (_req, res): Promise<void> => {
  const beans = await db.select().from(beansTable).where(isNotNull(beansTable.airtableRecordId)).orderBy(beansTable.name);
  const stats = await db
    .select({
      beanId: bagsTable.beanId,
      bagCount: sql<number>`count(distinct ${bagsTable.id})::int`,
      shotCount: sql<number>`count(${shotsTable.id})::int`,
      avgRating: sql<number | null>`round(avg(${shotsTable.rating})::numeric, 2)`,
      referenceCount: sql<number>`count(${shotsTable.id}) filter (where ${shotsTable.isReference} = true)::int`,
    })
    .from(bagsTable)
    .leftJoin(shotsTable, and(eq(shotsTable.bagId, bagsTable.id), ...eligibleShotConditions))
    .groupBy(bagsTable.beanId);
  const statsMap = new Map(stats.map((s) => [s.beanId, s]));
  res.json(beans.map((b) => ({
    ...b,
    bagCount: statsMap.get(b.id)?.bagCount ?? 0,
    shotCount: statsMap.get(b.id)?.shotCount ?? 0,
    avgRating: statsMap.get(b.id)?.avgRating ?? null,
    referenceCount: statsMap.get(b.id)?.referenceCount ?? 0,
  })));
});

router.get("/beans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [bean] = await db.select().from(beansTable).where(eq(beansTable.id, id));
  if (!bean) { res.status(404).json({ error: "Not found" }); return; }
  res.json(bean);
});

router.post("/beans", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (!String(body.name ?? "").trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [row] = await db.insert(beansTable).values({
    name: String(body.name),
    origin: body.origin as string | undefined,
    region: body.region as string | undefined,
    roaster: body.roaster as string | undefined,
    roastLevel: body.roastLevel as string | undefined,
    process: body.process as string | undefined,
    variety: body.variety as string | undefined,
    altitude: body.altitude as string | undefined,
    roasterNotes: body.roasterNotes as string | undefined,
    notes: body.notes as string | undefined,
    isActive: body.isActive != null ? Boolean(body.isActive) : true,
  }).returning();
  res.status(201).json(row);
});

router.patch("/beans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  const [row] = await db.update(beansTable).set({
    name: body.name as string | undefined,
    origin: body.origin as string | undefined,
    region: body.region as string | undefined,
    roaster: body.roaster as string | undefined,
    roastLevel: body.roastLevel as string | undefined,
    process: body.process as string | undefined,
    variety: body.variety as string | undefined,
    altitude: body.altitude as string | undefined,
    roasterNotes: body.roasterNotes as string | undefined,
    notes: body.notes as string | undefined,
    isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
  }).where(eq(beansTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/beans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(beansTable).where(eq(beansTable.id, id));
  res.status(204).end();
});

export default router;
