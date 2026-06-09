import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, beansTable, bagsTable, shotsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /beans
router.get("/beans", async (_req, res): Promise<void> => {
  const beans = await db.select().from(beansTable).orderBy(beansTable.name);

  const stats = await db
    .select({
      beanId: bagsTable.beanId,
      bagCount: sql<number>`count(distinct ${bagsTable.id})::int`,
      shotCount: sql<number>`count(${shotsTable.id})::int`,
      avgRating: sql<number | null>`round(avg(${shotsTable.rating})::numeric, 2)`,
      referenceCount: sql<number>`count(${shotsTable.id}) filter (where ${shotsTable.isReference} = true)::int`,
    })
    .from(bagsTable)
    .leftJoin(shotsTable, eq(shotsTable.bagId, bagsTable.id))
    .groupBy(bagsTable.beanId);

  const statsMap = new Map(stats.map((s) => [s.beanId, s]));

  res.json(
    beans.map((b) => ({
      ...b,
      bagCount: statsMap.get(b.id)?.bagCount ?? 0,
      shotCount: statsMap.get(b.id)?.shotCount ?? 0,
      avgRating: statsMap.get(b.id)?.avgRating ?? null,
      referenceCount: statsMap.get(b.id)?.referenceCount ?? 0,
    }))
  );
});

// GET /beans/:id
router.get("/beans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const bean = await db.select().from(beansTable).where(eq(beansTable.id, id));
  if (!bean[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(bean[0]);
});

// POST /beans
router.post("/beans", async (req, res): Promise<void> => {
  const { name, origin, roaster, roastLevel, process, variety, altitude, notes } = req.body as Record<string, string>;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const row = await db.insert(beansTable).values({ name, origin, roaster, roastLevel, process, variety, altitude, notes }).returning();
  res.status(201).json(row[0]);
});

// PATCH /beans/:id
router.patch("/beans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, origin, roaster, roastLevel, process, variety, altitude, notes } = req.body as Record<string, string>;
  const row = await db.update(beansTable).set({ name, origin, roaster, roastLevel, process, variety, altitude, notes }).where(eq(beansTable.id, id)).returning();
  if (!row[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row[0]);
});

// DELETE /beans/:id
router.delete("/beans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(beansTable).where(eq(beansTable.id, id));
  res.status(204).end();
});

export default router;
