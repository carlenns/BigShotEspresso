import { Router, type IRouter } from "express";
import { eq, sql, desc, isNotNull } from "drizzle-orm";
import { db, bagsTable, beansTable, shotsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/bags", async (_req, res): Promise<void> => {
  const bags = await db
    .select({
      id: bagsTable.id,
      beanId: bagsTable.beanId,
      beanName: beansTable.name,
      bagNumber: bagsTable.bagNumber,
      bagName: bagsTable.bagName,
      purchaseDate: bagsTable.purchaseDate,
      roastDate: bagsTable.roastDate,
      openedDate: bagsTable.openedDate,
      bagWeight: bagsTable.bagWeight,
      remainingEstimate: bagsTable.remainingEstimate,
      cost: bagsTable.cost,
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
    .where(isNotNull(bagsTable.airtableRecordId))
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
  res.json(bags.map((b) => ({
    ...b,
    shotCount: statsMap.get(b.id)?.shotCount ?? 0,
    referenceCount: statsMap.get(b.id)?.referenceCount ?? 0,
    avgRating: statsMap.get(b.id)?.avgRating ?? null,
    grindRange: statsMap.get(b.id) ? { min: statsMap.get(b.id)!.minGrind, max: statsMap.get(b.id)!.maxGrind } : null,
  })));
});

router.get("/bags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bag] = await db
    .select({
      id: bagsTable.id, beanId: bagsTable.beanId, beanName: beansTable.name,
      beanOrigin: beansTable.origin, beanRoaster: beansTable.roaster,
      beanRoastLevel: beansTable.roastLevel, beanProcess: beansTable.process,
      bagNumber: bagsTable.bagNumber, bagName: bagsTable.bagName,
      purchaseDate: bagsTable.purchaseDate, roastDate: bagsTable.roastDate,
      openedDate: bagsTable.openedDate, bagWeight: bagsTable.bagWeight,
      remainingEstimate: bagsTable.remainingEstimate, cost: bagsTable.cost,
      isActive: bagsTable.isActive,
      startGrindSetting: bagsTable.startGrindSetting, currentGrindSetting: bagsTable.currentGrindSetting,
      startGrindTime: bagsTable.startGrindTime, currentGrindTime: bagsTable.currentGrindTime,
      defaultDose: bagsTable.defaultDose, defaultYield: bagsTable.defaultYield,
      defaultTemp: bagsTable.defaultTemp, dialInNotes: bagsTable.dialInNotes, notes: bagsTable.notes,
    })
    .from(bagsTable)
    .leftJoin(beansTable, eq(bagsTable.beanId, beansTable.id))
    .where(eq(bagsTable.id, id));

  if (!bag) { res.status(404).json({ error: "Bag not found" }); return; }

  const shots = await db.select().from(shotsTable)
    .where(eq(shotsTable.bagId, id))
    .orderBy(desc(sql`${shotsTable.shotDate}`));

  const ratedShots = shots.filter((s) => s.rating != null);
  const avgRating = ratedShots.length ? ratedShots.reduce((a, s) => a + Number(s.rating), 0) / ratedShots.length : null;
  const grindSettings = shots.map((s) => s.grindSetting).filter((v): v is number => v != null);
  const statusBreakdown = shots.reduce<Record<string, number>>((acc, s) => { const k = s.status ?? "Unknown"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});

  const analysis = {
    totalShots: shots.length,
    referenceShots: shots.filter((s) => s.isReference).length,
    ratedShots: ratedShots.length,
    avgRating: avgRating != null ? Math.round(avgRating * 100) / 100 : null,
    avgDose: ratedShots.length ? Math.round((ratedShots.reduce((a, s) => a + Number(s.dose ?? 0), 0) / ratedShots.length) * 10) / 10 : null,
    avgYield: ratedShots.length ? Math.round((ratedShots.reduce((a, s) => a + Number(s.yield ?? 0), 0) / ratedShots.length) * 10) / 10 : null,
    avgPourTime: ratedShots.length ? Math.round((ratedShots.reduce((a, s) => a + Number(s.pourTime ?? 0), 0) / ratedShots.length) * 10) / 10 : null,
    grindRange: grindSettings.length ? { min: Math.min(...grindSettings), max: Math.max(...grindSettings) } : null,
    statusBreakdown,
    earliestDate: shots.length ? shots[shots.length - 1]?.shotDate : null,
    latestDate: shots.length ? shots[0]?.shotDate : null,
  };

  res.json({
    bag, analysis,
    referenceShots: shots.filter((s) => s.isReference).slice(0, 20),
    bestRated: [...shots].filter((s) => s.rating != null).sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 10),
    shots: shots.slice(0, 50),
  });
});

const parseBagBody = (body: Record<string, unknown>) => ({
  beanId: body.beanId != null ? Number(body.beanId) : undefined,
  bagNumber: body.bagNumber as string | undefined,
  bagName: body.bagName as string | undefined,
  purchaseDate: body.purchaseDate as string | undefined,
  roastDate: body.roastDate as string | undefined,
  openedDate: body.openedDate as string | undefined,
  bagWeight: body.bagWeight != null ? Number(body.bagWeight) : undefined,
  remainingEstimate: body.remainingEstimate != null ? Number(body.remainingEstimate) : undefined,
  cost: body.cost != null ? Number(body.cost) : undefined,
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
});

router.post("/bags", async (req, res): Promise<void> => {
  const [row] = await db.insert(bagsTable).values({ ...parseBagBody(req.body), isActive: Boolean(req.body.isActive) }).returning();
  res.status(201).json(row);
});

router.patch("/bags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.update(bagsTable).set(parseBagBody(req.body)).where(eq(bagsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/bags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bagsTable).where(eq(bagsTable.id, id));
  res.status(204).end();
});

export default router;
