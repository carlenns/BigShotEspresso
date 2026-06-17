import { Router, type IRouter } from "express";
import { sql, desc, isNotNull, eq, ne, and } from "drizzle-orm";
import { db, shotsTable, bagsTable, beansTable } from "@workspace/db";
import { GetRecentShotsQueryParams, GetBestRatedShotsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /dashboard/intelligence ─────────────────────────────────────────────
// The main dashboard data source per DASHBOARD_INTELLIGENCE.md:
// 1. Current Baseline   — active bag recipe
// 2. Bag Intelligence   — open days, refs, avg rating, best yield/pour-delay range
// 3. Grind Drift        — compare this bag vs its own history and previous bags
// 4. Next Shot Watchlist— concise actionable guidance
router.get("/dashboard/intelligence", async (_req, res): Promise<void> => {
  // ── Active bag ────────────────────────────────────────────────────────────
  const [activeBagRow] = await db
    .select({
      id: bagsTable.id,
      beanName: beansTable.name,
      beanOrigin: beansTable.origin,
      bagNumber: bagsTable.bagNumber,
      bagName: bagsTable.bagName,
      openedDate: bagsTable.openedDate,
      defaultDose: bagsTable.defaultDose,
      defaultYield: bagsTable.defaultYield,
      defaultTemp: bagsTable.defaultTemp,
      currentGrindSetting: bagsTable.currentGrindSetting,
      startGrindSetting: bagsTable.startGrindSetting,
      currentGrindTime: bagsTable.currentGrindTime,
      dialInNotes: bagsTable.dialInNotes,
    })
    .from(bagsTable)
    .leftJoin(beansTable, eq(bagsTable.beanId, beansTable.id))
    .where(eq(bagsTable.isActive, true))
    .limit(1);

  // ── Global totals ─────────────────────────────────────────────────────────
  const [globals] = await db.select({
    totalShots: sql<number>`count(*)::int`,
    referenceShots: sql<number>`count(*) filter (where ${shotsTable.isReference} = true)::int`,
  }).from(shotsTable);

  if (!activeBagRow) {
    res.json({
      activeBag: null,
      bagIntelligence: null,
      grindDrift: null,
      watchlist: [{ type: "info", message: "No active bag set. Add a bag and mark it active to see your current setup here." }],
      totalShots: globals?.totalShots ?? 0,
      referenceShots: globals?.referenceShots ?? 0,
    });
    return;
  }

  // ── Shots for active bag ──────────────────────────────────────────────────
  const activeBagShots = await db.select().from(shotsTable)
    .where(eq(shotsTable.bagId, activeBagRow.id))
    .orderBy(desc(sql`${shotsTable.shotDate}`));

  const ratedShots = activeBagShots.filter((s) => s.rating != null);
  const topRated = ratedShots.filter((s) => Number(s.rating) >= 8.0);

  const avgRating = ratedShots.length
    ? Math.round((ratedShots.reduce((a, s) => a + Number(s.rating), 0) / ratedShots.length) * 100) / 100
    : null;

  // Best yield range from top-rated shots
  const topYields = topRated.map((s) => Number(s.yield)).filter((v) => v > 0);
  const bestYieldRange = topYields.length >= 2
    ? { min: Math.round(Math.min(...topYields) * 10) / 10, max: Math.round(Math.max(...topYields) * 10) / 10 }
    : topYields.length === 1
    ? { min: topYields[0], max: topYields[0] }
    : null;

  // Best pour delay range from top-rated shots
  const topDelays = topRated.map((s) => Number(s.pourDelay)).filter((v) => v > 0);
  const bestPourDelayRange = topDelays.length >= 2
    ? { min: Math.round(Math.min(...topDelays) * 10) / 10, max: Math.round(Math.max(...topDelays) * 10) / 10 }
    : topDelays.length === 1
    ? { min: topDelays[0], max: topDelays[0] }
    : null;

  // Top-rated individual shot
  const topRatedShot = ratedShots[0] ?? null;
  const topRatedShotSorted = [...ratedShots].sort((a, b) => Number(b.rating) - Number(a.rating));
  const bestShot = topRatedShotSorted[0] ?? null;

  // Open days
  const openDays = activeBagRow.openedDate
    ? Math.floor((Date.now() - new Date(activeBagRow.openedDate).getTime()) / 86_400_000)
    : null;

  // ── Grind drift ────────────────────────────────────────────────────────────
  const grindShots = activeBagShots.filter((s) => s.grindSetting != null);
  const early = grindShots.slice(-Math.min(5, Math.ceil(grindShots.length / 2))).reverse();
  const recent = grindShots.slice(0, Math.min(5, Math.ceil(grindShots.length / 2)));

  const earlyAvg = early.length
    ? early.reduce((a, s) => a + Number(s.grindSetting), 0) / early.length
    : null;
  const recentAvg = recent.length
    ? recent.reduce((a, s) => a + Number(s.grindSetting), 0) / recent.length
    : null;

  const drift = earlyAvg != null && recentAvg != null
    ? Math.round((recentAvg - earlyAvg) * 1000) / 1000
    : null;

  const driftDirection = drift == null ? null : drift > 0.02 ? "coarser" : drift < -0.02 ? "finer" : "stable";

  // Previous bag avg grind for comparison
  const [prevBagGrind] = await db.select({
    avgGrind: sql<number | null>`round(avg(${shotsTable.grindSetting})::numeric, 3)`,
  })
    .from(shotsTable)
    .where(and(isNotNull(shotsTable.grindSetting), ne(shotsTable.bagId ?? -1, activeBagRow.id)));

  // ── Next Shot Watchlist ────────────────────────────────────────────────────
  type WatchlistItem = { type: "success" | "warning" | "info"; message: string };
  const watchlist: WatchlistItem[] = [];

  const refCount = activeBagShots.filter((s) => s.isReference).length;
  const last3 = ratedShots.slice(0, 3);
  const last3Avg = last3.length
    ? last3.reduce((a, s) => a + Number(s.rating), 0) / last3.length
    : null;

  // Bag age warning
  if (openDays != null && openDays >= 28) {
    watchlist.push({ type: "warning", message: `Bag is ${openDays} days old — oxidation may affect flavour. Consider finishing soon.` });
  } else if (openDays != null && openDays >= 21) {
    watchlist.push({ type: "info", message: `${openDays} days into this bag — watch for grind drift as beans age.` });
  }

  // Grind drift alert
  if (driftDirection === "coarser" && drift != null) {
    watchlist.push({ type: "warning", message: `Grind drifting coarser (+${drift.toFixed(3)}) — burrs may need cleaning or beans are aging.` });
  } else if (driftDirection === "finer" && drift != null) {
    watchlist.push({ type: "info", message: `Grind drifting finer (${drift.toFixed(3)}) since start of bag.` });
  }

  // Reference shot nudge
  if (refCount === 0 && activeBagShots.length >= 5) {
    watchlist.push({ type: "warning", message: `No reference shot logged yet for this bag. Mark your best pull as a reference.` });
  } else if (refCount > 0) {
    watchlist.push({ type: "success", message: `${refCount} reference shot${refCount > 1 ? "s" : ""} logged for this bag.` });
  }

  // Rating trend
  if (last3Avg != null && last3Avg < 7.5 && last3.length === 3) {
    watchlist.push({ type: "warning", message: `Last 3 shots averaged ${last3Avg.toFixed(1)} — try a small grind adjustment.` });
  } else if (avgRating != null && avgRating >= 8.5) {
    watchlist.push({ type: "success", message: `Bag dialled in — avg rating ${avgRating.toFixed(2)} across ${ratedShots.length} rated shots.` });
  }

  // Low shot count
  if (activeBagShots.length < 5) {
    watchlist.push({ type: "info", message: `${activeBagShots.length} shot${activeBagShots.length !== 1 ? "s" : ""} logged so far — still dialling in.` });
  }

  if (watchlist.length === 0) {
    watchlist.push({ type: "info", message: "No alerts for this bag. Keep logging." });
  }

  res.json({
    activeBag: {
      ...activeBagRow,
      openDays,
      shotCount: activeBagShots.length,
    },
    bagIntelligence: {
      totalShots: activeBagShots.length,
      referenceShots: refCount,
      avgRating,
      bestYieldRange,
      bestPourDelayRange,
      bestShot: bestShot ? { id: bestShot.id, rating: bestShot.rating, dose: bestShot.dose, yield: bestShot.yield, grindSetting: bestShot.grindSetting, pourTime: bestShot.pourTime, shotDate: bestShot.shotDate } : null,
      last3Avg,
    },
    grindDrift: grindShots.length > 0 ? {
      startSetting: activeBagRow.startGrindSetting,
      currentSetting: activeBagRow.currentGrindSetting,
      earlyAvg: earlyAvg != null ? Math.round(earlyAvg * 1000) / 1000 : null,
      recentAvg: recentAvg != null ? Math.round(recentAvg * 1000) / 1000 : null,
      drift,
      direction: driftDirection,
      previousBagAvg: prevBagGrind?.avgGrind != null ? Number(prevBagGrind.avgGrind) : null,
      shotCount: grindShots.length,
    } : null,
    watchlist,
    totalShots: globals?.totalShots ?? 0,
    referenceShots: globals?.referenceShots ?? 0,
  });
});

// ── GET /dashboard/summary (kept for backward compat) ──────────────────────
router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [aggs] = await db.select({
    totalShots: sql<number>`count(*)::int`,
    referenceShots: sql<number>`count(*) filter (where ${shotsTable.isReference} = true)::int`,
    avgDose: sql<number | null>`round(avg(${shotsTable.dose})::numeric, 2)`,
    avgYield: sql<number | null>`round(avg(${shotsTable.yield})::numeric, 2)`,
    avgPourTime: sql<number | null>`round(avg(${shotsTable.pourTime})::numeric, 1)`,
    avgPourDelay: sql<number | null>`round(avg(${shotsTable.pourDelay})::numeric, 1)`,
  }).from(shotsTable);

  res.json({
    totalShots: aggs?.totalShots ?? 0,
    referenceShots: aggs?.referenceShots ?? 0,
    avgDose: aggs?.avgDose ?? null,
    avgYield: aggs?.avgYield ?? null,
    avgPourTime: aggs?.avgPourTime ?? null,
    avgPourDelay: aggs?.avgPourDelay ?? null,
  });
});

// ── GET /dashboard/recent ──────────────────────────────────────────────────
router.get("/dashboard/recent", async (req, res): Promise<void> => {
  const params = GetRecentShotsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable).orderBy(desc(sql`${shotsTable.shotDate}`)).limit(limit);
  res.json(shots);
});

// ── GET /dashboard/best-rated ──────────────────────────────────────────────
router.get("/dashboard/best-rated", async (req, res): Promise<void> => {
  const params = GetBestRatedShotsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable).where(isNotNull(shotsTable.rating)).orderBy(desc(shotsTable.rating)).limit(limit);
  res.json(shots);
});

export default router;
