import { Router, type IRouter } from "express";
import { sql, desc, isNotNull } from "drizzle-orm";
import { db, shotsTable } from "@workspace/db";
import { GetRecentShotsQueryParams, GetBestRatedShotsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /dashboard/summary
router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [aggs] = await db.select({
    totalShots: sql<number>`count(*)::int`,
    referenceShots: sql<number>`count(*) filter (where ${shotsTable.isReference} = true)::int`,
    avgDose: sql<number | null>`round(avg(${shotsTable.dose})::numeric, 2)`,
    avgYield: sql<number | null>`round(avg(${shotsTable.yield})::numeric, 2)`,
    avgPourTime: sql<number | null>`round(avg(${shotsTable.pourTime})::numeric, 1)`,
    avgPourDelay: sql<number | null>`round(avg(${shotsTable.pourDelay})::numeric, 1)`,
  }).from(shotsTable);

  const topBeans = await db.select({
    bean: shotsTable.bean,
    count: sql<number>`count(*)::int`,
  })
    .from(shotsTable)
    .where(isNotNull(shotsTable.bean))
    .groupBy(shotsTable.bean)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const statusBreakdown = await db.select({
    status: shotsTable.status,
    count: sql<number>`count(*)::int`,
  })
    .from(shotsTable)
    .where(isNotNull(shotsTable.status))
    .groupBy(shotsTable.status)
    .orderBy(desc(sql`count(*)`));

  res.json({
    totalShots: aggs?.totalShots ?? 0,
    referenceShots: aggs?.referenceShots ?? 0,
    avgDose: aggs?.avgDose ?? null,
    avgYield: aggs?.avgYield ?? null,
    avgPourTime: aggs?.avgPourTime ?? null,
    avgPourDelay: aggs?.avgPourDelay ?? null,
    topBeans: topBeans.map(b => ({ bean: b.bean ?? "", count: b.count })),
    statusBreakdown: statusBreakdown.map(s => ({ status: s.status ?? "", count: s.count })),
  });
});

// GET /dashboard/recent
router.get("/dashboard/recent", async (req, res): Promise<void> => {
  const params = GetRecentShotsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable)
    .orderBy(desc(sql`${shotsTable.shotDate}`))
    .limit(limit);
  res.json(shots);
});

// GET /dashboard/best-rated
router.get("/dashboard/best-rated", async (req, res): Promise<void> => {
  const params = GetBestRatedShotsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable)
    .where(isNotNull(shotsTable.rating))
    .orderBy(desc(shotsTable.rating))
    .limit(limit);
  res.json(shots);
});

export default router;
