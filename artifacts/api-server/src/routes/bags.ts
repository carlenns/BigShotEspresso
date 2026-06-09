import { Router, type IRouter } from "express";
import { eq, sql, desc, isNotNull, and } from "drizzle-orm";
import { db, bagsTable, beansTable, shotsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /bags — all bags with joined bean name and shot stats
router.get("/bags", async (_req, res): Promise<void> => {
  const bags = await db
    .select({
      id: bagsTable.id,
      beanId: bagsTable.beanId,
      beanName: beansTable.name,
      bagNumber: bagsTable.bagNumber,
      openedDate: bagsTable.openedDate,
      isActive: bagsTable.isActive,
      startGrindSetting: bagsTable.startGrindSetting,
      currentGrindSetting: bagsTable.currentGrindSetting,
      startGrindTime: bagsTable.startGrindTime,
      currentGrindTime: bagsTable.currentGrindTime,
      defaultDose: bagsTable.defaultDose,
      defaultYield: bagsTable.defaultYield,
      defaultTemp: bagsTable.defaultTemp,
      dialInNotes: bagsTable.dialInNotes,
      notes: bagsTable.notes,
      createdAt: bagsTable.createdAt,
    })
    .from(bagsTable)
    .leftJoin(beansTable, eq(bagsTable.beanId, beansTable.id))
    .orderBy(bagsTable.bagNumber);

  const stats = await db
    .select({
      bagId: shotsTable.bagId,
      shotCount: sql<number>`count(*)::int`,
      referenceCount: sql<number>`count(*) filter (where ${shotsTable.isReference} = true)::int`,
      avgRating: sql<number | null>`round(avg(${shotsTable.rating})::numeric, 2)`,
      minGrind: sql<number | null>`min(${shotsTable.grindSetting})`,
      maxGrind: sql<number | null>`max(${shotsTable.grindSetting})`,
    })
    .from(shotsTable)
    .where(isNotNull(shotsTable.bagId))
    .groupBy(shotsTable.bagId);

  const statsMap = new Map(stats.map((s) => [s.bagId, s]));

  res.json(
    bags.map((b) => ({
      ...b,
      shotCount: statsMap.get(b.id)?.shotCount ?? 0,
      referenceCount: statsMap.get(b.id)?.referenceCount ?? 0,
      avgRating: statsMap.get(b.id)?.avgRating ?? null,
      grindRange: statsMap.get(b.id)
        ? { min: statsMap.get(b.id)!.minGrind, max: statsMap.get(b.id)!.maxGrind }
        : null,
    }))
  );
});

// GET /bags/:id — single bag with analysis
router.get("/bags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bag] = await db
    .select({
      id: bagsTable.id,
      beanId: bagsTable.beanId,
      beanName: beansTable.name,
      beanOrigin: beansTable.origin,
      beanRoaster: beansTable.roaster,
      beanRoastLevel: beansTable.roastLevel,
      beanProcess: beansTable.process,
      bagNumber: bagsTable.bagNumber,
      openedDate: bagsTable.openedDate,
      isActive: bagsTable.isActive,
      startGrindSetting: bagsTable.startGrindSetting,
      currentGrindSetting: bagsTable.currentGrindSetting,
      startGrindTime: bagsTable.startGrindTime,
      currentGrindTime: bagsTable.currentGrindTime,
      defaultDose: bagsTable.defaultDose,
      defaultYield: bagsTable.defaultYield,
      defaultTemp: bagsTable.defaultTemp,
      dialInNotes: bagsTable.dialInNotes,
      notes: bagsTable.notes,
    })
    .from(bagsTable)
    .leftJoin(beansTable, eq(bagsTable.beanId, beansTable.id))
    .where(eq(bagsTable.id, id));

  if (!bag) { res.status(404).json({ error: "Bag not found" }); return; }

  // Shots for this bag
  const shots = await db
    .select()
    .from(shotsTable)
    .where(eq(shotsTable.bagId, id))
    .orderBy(desc(sql`${shotsTable.shotDate}`));

  const ratedShots = shots.filter((s) => s.rating != null);
  const avgRating = ratedShots.length
    ? ratedShots.reduce((acc, s) => acc + Number(s.rating), 0) / ratedShots.length
    : null;

  const grindSettings = shots.map((s) => s.grindSetting).filter((v): v is number => v != null);
  const statusBreakdown = shots.reduce<Record<string, number>>((acc, s) => {
    const k = s.status ?? "Unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const analysis = {
    totalShots: shots.length,
    referenceShots: shots.filter((s) => s.isReference).length,
    ratedShots: ratedShots.length,
    avgRating: avgRating != null ? Math.round(avgRating * 100) / 100 : null,
    avgDose: ratedShots.length
      ? Math.round((ratedShots.reduce((a, s) => a + Number(s.dose ?? 0), 0) / ratedShots.length) * 10) / 10
      : null,
    avgYield: ratedShots.length
      ? Math.round((ratedShots.reduce((a, s) => a + Number(s.yield ?? 0), 0) / ratedShots.length) * 10) / 10
      : null,
    avgPourTime: ratedShots.length
      ? Math.round((ratedShots.reduce((a, s) => a + Number(s.pourTime ?? 0), 0) / ratedShots.length) * 10) / 10
      : null,
    grindRange: grindSettings.length
      ? { min: Math.min(...grindSettings), max: Math.max(...grindSettings) }
      : null,
    statusBreakdown,
    earliestDate: shots.length ? shots[shots.length - 1]?.shotDate : null,
    latestDate: shots.length ? shots[0]?.shotDate : null,
  };

  const referenceShots = shots.filter((s) => s.isReference).slice(0, 20);
  const bestRated = [...shots]
    .filter((s) => s.rating != null)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 10);

  res.json({ bag, analysis, referenceShots, bestRated, shots: shots.slice(0, 50) });
});

// POST /bags
router.post("/bags", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const row = await db.insert(bagsTable).values({
    beanId: body.beanId != null ? Number(body.beanId) : undefined,
    bagNumber: body.bagNumber as string | undefined,
    openedDate: body.openedDate as string | undefined,
    isActive: Boolean(body.isActive),
    startGrindSetting: body.startGrindSetting != null ? Number(body.startGrindSetting) : undefined,
    currentGrindSetting: body.currentGrindSetting != null ? Number(body.currentGrindSetting) : undefined,
    startGrindTime: body.startGrindTime != null ? Number(body.startGrindTime) : undefined,
    currentGrindTime: body.currentGrindTime != null ? Number(body.currentGrindTime) : undefined,
    defaultDose: body.defaultDose != null ? Number(body.defaultDose) : undefined,
    defaultYield: body.defaultYield != null ? Number(body.defaultYield) : undefined,
    defaultTemp: body.defaultTemp != null ? Number(body.defaultTemp) : undefined,
    dialInNotes: body.dialInNotes as string | undefined,
    notes: body.notes as string | undefined,
  }).returning();
  res.status(201).json(row[0]);
});

// PATCH /bags/:id
router.patch("/bags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Record<string, unknown>;
  const row = await db.update(bagsTable).set({
    beanId: body.beanId != null ? Number(body.beanId) : undefined,
    bagNumber: body.bagNumber as string | undefined,
    openedDate: body.openedDate as string | undefined,
    isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
    startGrindSetting: body.startGrindSetting != null ? Number(body.startGrindSetting) : undefined,
    currentGrindSetting: body.currentGrindSetting != null ? Number(body.currentGrindSetting) : undefined,
    startGrindTime: body.startGrindTime != null ? Number(body.startGrindTime) : undefined,
    currentGrindTime: body.currentGrindTime != null ? Number(body.currentGrindTime) : undefined,
    defaultDose: body.defaultDose != null ? Number(body.defaultDose) : undefined,
    defaultYield: body.defaultYield != null ? Number(body.defaultYield) : undefined,
    defaultTemp: body.defaultTemp != null ? Number(body.defaultTemp) : undefined,
    dialInNotes: body.dialInNotes as string | undefined,
    notes: body.notes as string | undefined,
  }).where(eq(bagsTable.id, id)).returning();
  if (!row[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row[0]);
});

// DELETE /bags/:id
router.delete("/bags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bagsTable).where(eq(bagsTable.id, id));
  res.status(204).end();
});

export default router;
