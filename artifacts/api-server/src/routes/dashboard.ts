import { Router, type IRouter } from "express";
import { sql, desc, isNotNull, eq, ne, and, lt } from "drizzle-orm";
import { db, shotsTable, bagsTable, beansTable, settingsTable } from "@workspace/db";
import { GetRecentShotsQueryParams, GetBestRatedShotsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// ── GET /dashboard/intelligence ─────────────────────────────────────────────
router.get("/dashboard/intelligence", async (_req, res): Promise<void> => {
  // ── Settings (for baseline extras: grinder, machine, basket) ─────────────
  const settingRows = await db.select().from(settingsTable);
  const settings: Record<string, string> = {};
  for (const r of settingRows) settings[r.key] = r.value;

  // ── Active bag ────────────────────────────────────────────────────────────
  const [activeBagRow] = await db
    .select({
      id: bagsTable.id,
      beanId: bagsTable.beanId,
      beanName: beansTable.name,
      beanOrigin: beansTable.origin,
      beanRoaster: beansTable.roaster,
      beanRoastLevel: beansTable.roastLevel,
      beanProcess: beansTable.process,
      bagNumber: bagsTable.bagNumber,
      bagName: bagsTable.bagName,
      purchaseDate: bagsTable.purchaseDate,
      roastDate: bagsTable.roastDate,
      openedDate: bagsTable.openedDate,
      bagWeight: bagsTable.bagWeight,
      remainingEstimate: bagsTable.remainingEstimate,
      defaultDose: bagsTable.defaultDose,
      defaultYield: bagsTable.defaultYield,
      defaultTemp: bagsTable.defaultTemp,
      currentGrindSetting: bagsTable.currentGrindSetting,
      startGrindSetting: bagsTable.startGrindSetting,
      currentGrindTime: bagsTable.currentGrindTime,
      startGrindTime: bagsTable.startGrindTime,
      dialInNotes: bagsTable.dialInNotes,
    })
    .from(bagsTable)
    .leftJoin(beansTable, eq(bagsTable.beanId, beansTable.id))
    .where(and(eq(bagsTable.isActive, true), isNotNull(bagsTable.airtableRecordId)))
    .limit(1);

  // ── Global totals ─────────────────────────────────────────────────────────
  const [globals] = await db.select({
    totalShots: sql<number>`count(*)::int`,
    referenceShots: sql<number>`count(*) filter (where ${shotsTable.isReference} = true)::int`,
  }).from(shotsTable).where(isNotNull(shotsTable.airtableRecordId));

  if (!activeBagRow) {
    res.json({
      activeBag: null, bagIntelligence: null, bagProgress: null,
      grindDrift: null, timingWindows: null,
      watchlist: [{ type: "info", message: "No active bag set. Go to Bags and mark one active." }],
      totalShots: globals?.totalShots ?? 0,
      referenceShots: globals?.referenceShots ?? 0,
    });
    return;
  }

  // ── Open days + roast age ─────────────────────────────────────────────────
  const now = Date.now();
  const openDays = activeBagRow.openedDate
    ? Math.floor((now - new Date(activeBagRow.openedDate).getTime()) / 86_400_000)
    : null;
  const roastAge = activeBagRow.roastDate
    ? Math.floor((now - new Date(activeBagRow.roastDate).getTime()) / 86_400_000)
    : null;

  // ── Shots for active bag ──────────────────────────────────────────────────
  const activeBagShots = await db.select().from(shotsTable)
    .where(and(eq(shotsTable.bagId, activeBagRow.id), isNotNull(shotsTable.airtableRecordId)))
    .orderBy(desc(sql`${shotsTable.shotDate}`));

  const ratedShots = activeBagShots.filter((s) => s.rating != null);
  const topRated = ratedShots.filter((s) => Number(s.rating) >= 8.0);

  const avgRating = ratedShots.length
    ? Math.round((ratedShots.reduce((a, s) => a + Number(s.rating), 0) / ratedShots.length) * 100) / 100
    : null;
  const avgPrefRating = ratedShots.filter((s) => s.preferenceRating != null).length
    ? Math.round((ratedShots.filter((s) => s.preferenceRating != null).reduce((a, s) => a + Number(s.preferenceRating), 0) / ratedShots.filter((s) => s.preferenceRating != null).length) * 100) / 100
    : null;
  const bestRating = ratedShots.length ? Math.max(...ratedShots.map((s) => Number(s.rating))) : null;

  const refCount = activeBagShots.filter((s) => s.isReference).length;
  const last3 = ratedShots.slice(0, 3);
  const last3Avg = last3.length
    ? Math.round((last3.reduce((a, s) => a + Number(s.rating), 0) / last3.length) * 100) / 100
    : null;

  const topRatedSorted = [...ratedShots].sort((a, b) => Number(b.rating) - Number(a.rating));
  const bestShot = topRatedSorted[0] ?? null;

  // ── Bag Progress ──────────────────────────────────────────────────────────
  const dosesConsumed = activeBagShots.reduce((acc, s) => {
    const d = Number(s.dose ?? 0);
    return acc + (d > 0 ? d : 0);
  }, 0);
  const avgDose = ratedShots.length
    ? Math.round((ratedShots.reduce((a, s) => a + Number(s.dose ?? 0), 0) / ratedShots.length) * 10) / 10
    : activeBagRow.defaultDose ?? null;

  let remaining: number | null = null;
  let completionPct: number | null = null;
  let estimatedShotsRemaining: number | null = null;

  if (activeBagRow.remainingEstimate != null) {
    remaining = Number(activeBagRow.remainingEstimate);
  } else if (activeBagRow.bagWeight != null && dosesConsumed > 0) {
    remaining = Math.max(0, Number(activeBagRow.bagWeight) - dosesConsumed);
  }
  if (activeBagRow.bagWeight != null && activeBagRow.bagWeight > 0) {
    completionPct = Math.min(100, Math.round((dosesConsumed / Number(activeBagRow.bagWeight)) * 1000) / 10);
  }
  if (remaining != null && avgDose && avgDose > 0) {
    estimatedShotsRemaining = Math.floor(remaining / avgDose);
  }

  // ── Timing windows ─────────────────────────────────────────────────────────
  // Use best-rated shots from: current bag → same bean → all reference
  let timingSource: "current_bag" | "same_bean" | "all_reference" = "current_bag";
  let timingPool = topRated; // rated 8+ from current bag

  if (timingPool.length < 3 && activeBagRow.beanId) {
    // Fall back to same bean
    const sameBeanBags = await db.select({ id: bagsTable.id })
      .from(bagsTable).where(eq(bagsTable.beanId, activeBagRow.beanId));
    const sameBeanIds = sameBeanBags.map((b) => b.id);
    if (sameBeanIds.length > 1) {
      const sameBeanShots = await db.select().from(shotsTable)
        .where(and(isNotNull(shotsTable.bagId), isNotNull(shotsTable.airtableRecordId), sql`${shotsTable.bagId} = ANY(${sameBeanIds})`))
        .orderBy(desc(sql`${shotsTable.shotDate}`));
      timingPool = sameBeanShots.filter((s) => s.rating != null && Number(s.rating) >= 8);
      timingSource = "same_bean";
    }
  }
  if (timingPool.length < 3) {
    // Fall back to all reference shots
    const allRef = await db.select().from(shotsTable).where(and(eq(shotsTable.isReference, true), isNotNull(shotsTable.airtableRecordId)));
    timingPool = allRef;
    timingSource = "all_reference";
  }

  const range = (vals: number[]) => vals.length >= 2
    ? { min: Math.round(Math.min(...vals) * 10) / 10, max: Math.round(Math.max(...vals) * 10) / 10 }
    : vals.length === 1 ? { min: vals[0], max: vals[0] } : null;

  const timingWindows = {
    dataSource: timingSource,
    shotCount: timingPool.length,
    yieldRange: range(timingPool.map((s) => Number(s.yield)).filter((v) => v > 0)),
    pourTimeRange: range(timingPool.map((s) => Number(s.pourTime)).filter((v) => v > 0)),
    scaleTimeRange: range(timingPool.map((s) => Number(s.scaleTime)).filter((v) => v > 0)),
    pourDelayRange: range(timingPool.map((s) => Number(s.pourDelay)).filter((v) => v > 0)),
  };

  // ── Best yield + pour delay ranges (bag intel) ───────────────────────────
  const topYields = topRated.map((s) => Number(s.yield)).filter((v) => v > 0);
  const bestYieldRange = range(topYields);
  const topDelays = topRated.map((s) => Number(s.pourDelay)).filter((v) => v > 0);
  const bestPourDelayRange = range(topDelays);

  // ── Grind Drift ───────────────────────────────────────────────────────────
  const grindShots = activeBagShots.filter((s) => s.grindSetting != null);
  const half = Math.max(1, Math.ceil(grindShots.length / 2));
  const early = grindShots.slice(-Math.min(5, half)).reverse();
  const recentG = grindShots.slice(0, Math.min(5, half));
  const earlyAvg = early.length ? Math.round((early.reduce((a, s) => a + Number(s.grindSetting), 0) / early.length) * 1000) / 1000 : null;
  const recentAvg = recentG.length ? Math.round((recentG.reduce((a, s) => a + Number(s.grindSetting), 0) / recentG.length) * 1000) / 1000 : null;
  const drift = earlyAvg != null && recentAvg != null ? Math.round((recentAvg - earlyAvg) * 1000) / 1000 : null;
  const driftDir = drift == null ? null : drift > 0.02 ? "coarser" : drift < -0.02 ? "finer" : "stable";

  const [prevGrind] = await db.select({ avg: sql<number | null>`round(avg(${shotsTable.grindSetting})::numeric, 3)` })
    .from(shotsTable).where(and(isNotNull(shotsTable.grindSetting), isNotNull(shotsTable.airtableRecordId), sql`${shotsTable.bagId} != ${activeBagRow.id}`));

  // ── Bag comparison (grind drift per bag) ──────────────────────────────────
  const allBagsGrind = await db.select({
    bagId: shotsTable.bagId,
    bagNumber: bagsTable.bagNumber,
    beanName: beansTable.name,
    shotCount: sql<number>`count(*)::int`,
    firstGrind: sql<number | null>`min(${shotsTable.grindSetting})`,
    lastGrind: sql<number | null>`max(${shotsTable.grindSetting})`,
    avgGrind: sql<number | null>`round(avg(${shotsTable.grindSetting})::numeric, 3)`,
    openedDate: bagsTable.openedDate,
    refCount: sql<number>`count(*) filter (where ${shotsTable.isReference} = true)::int`,
    bestRating: sql<number | null>`max(${shotsTable.rating})`,
  })
    .from(shotsTable)
    .leftJoin(bagsTable, eq(shotsTable.bagId, bagsTable.id))
    .leftJoin(beansTable, eq(bagsTable.beanId, beansTable.id))
    .where(and(isNotNull(shotsTable.grindSetting), isNotNull(shotsTable.airtableRecordId)))
    .groupBy(shotsTable.bagId, bagsTable.bagNumber, beansTable.name, bagsTable.openedDate)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  // ── Watchlist ─────────────────────────────────────────────────────────────
  type W = { type: "success" | "warning" | "info"; message: string };
  const watchlist: W[] = [];

  if (openDays != null && openDays >= 28) {
    watchlist.push({ type: "warning", message: `Bag is ${openDays} days old — flavour may be fading. Finish soon or note the change.` });
  } else if (openDays != null && openDays >= 21) {
    watchlist.push({ type: "info", message: `${openDays} days in — watch for grind drift as beans age.` });
  }
  if (driftDir === "coarser" && drift != null) {
    watchlist.push({ type: "warning", message: `Grind drifting coarser (+${drift.toFixed(3)}) — check burr cleanliness or bean age.` });
  } else if (driftDir === "finer" && drift != null) {
    watchlist.push({ type: "info", message: `Grind trending finer (${drift.toFixed(3)}) since start of this bag.` });
  }
  if (refCount === 0 && activeBagShots.length >= 5) {
    watchlist.push({ type: "warning", message: "No reference shot yet for this bag. Mark your best pull as a reference." });
  } else if (refCount > 0) {
    watchlist.push({ type: "success", message: `${refCount} reference shot${refCount > 1 ? "s" : ""} logged for this bag.` });
  }
  if (last3Avg != null && last3Avg < 7.5 && last3.length === 3) {
    watchlist.push({ type: "warning", message: `Last 3 shots averaged ${last3Avg.toFixed(1)} — consider a grind adjustment.` });
  } else if (avgRating != null && avgRating >= 8.5) {
    watchlist.push({ type: "success", message: `Bag dialled in — avg ${avgRating.toFixed(2)} across ${ratedShots.length} rated shots.` });
  }
  if (activeBagShots.length < 5) {
    watchlist.push({ type: "info", message: `${activeBagShots.length} shot${activeBagShots.length !== 1 ? "s" : ""} logged — still dialling in.` });
  }
  if (estimatedShotsRemaining != null && estimatedShotsRemaining <= 5) {
    watchlist.push({ type: "warning", message: `Approx. ${estimatedShotsRemaining} shot${estimatedShotsRemaining !== 1 ? "s" : ""} remaining — time to order the next bag.` });
  }
  if (watchlist.length === 0) watchlist.push({ type: "info", message: "No alerts for this bag. Keep logging." });

  res.json({
    activeBag: {
      ...activeBagRow,
      openDays,
      roastAge,
      shotCount: activeBagShots.length,
      grinder: settings.defaultGrinder || settings.defaultRegularGrinder || null,
      machine: settings.defaultMachine || null,
      basket: settings.defaultBasket || null,
      usePuckScreen: settings.usePuckScreen === "true",
      puckScreen: settings.defaultPuckScreen || null,
    },
    bagIntelligence: {
      totalShots: activeBagShots.length,
      referenceShots: refCount,
      avgRating,
      avgPrefRating,
      bestRating,
      last3Avg,
      bestYieldRange,
      bestPourDelayRange,
      bestShot: bestShot ? {
        id: bestShot.id, rating: bestShot.rating, dose: bestShot.dose, yield: bestShot.yield,
        grindSetting: bestShot.grindSetting, pourTime: bestShot.pourTime, shotDate: bestShot.shotDate,
      } : null,
    },
    bagProgress: activeBagRow.bagWeight || dosesConsumed > 0 ? {
      startingWeight: activeBagRow.bagWeight,
      consumed: Math.round(dosesConsumed * 10) / 10,
      remaining,
      avgDose,
      estimatedShotsRemaining,
      completionPct,
    } : null,
    timingWindows,
    grindDrift: grindShots.length > 0 ? {
      startSetting: activeBagRow.startGrindSetting,
      startTime: activeBagRow.startGrindTime,
      currentSetting: activeBagRow.currentGrindSetting,
      currentTime: activeBagRow.currentGrindTime,
      earlyAvg, recentAvg, drift, direction: driftDir,
      previousBagAvg: prevGrind?.avg != null ? Number(prevGrind.avg) : null,
      shotCount: grindShots.length,
    } : null,
    bagComparison: allBagsGrind.map((b) => ({
      ...b,
      isActive: b.bagId === activeBagRow.id,
      openDays: b.openedDate ? Math.floor((now - new Date(b.openedDate).getTime()) / 86_400_000) : null,
      totalAdjustment: b.firstGrind != null && b.lastGrind != null
        ? Math.round((Number(b.lastGrind) - Number(b.firstGrind)) * 1000) / 1000
        : null,
    })),
    watchlist,
    totalShots: globals?.totalShots ?? 0,
    referenceShots: globals?.referenceShots ?? 0,
  });
});

// ── GET /dashboard/summary ─────────────────────────────────────────────────
router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [aggs] = await db.select({
    totalShots: sql<number>`count(*)::int`,
    referenceShots: sql<number>`count(*) filter (where ${shotsTable.isReference} = true)::int`,
    avgDose: sql<number | null>`round(avg(${shotsTable.dose})::numeric, 2)`,
    avgYield: sql<number | null>`round(avg(${shotsTable.yield})::numeric, 2)`,
    avgPourTime: sql<number | null>`round(avg(${shotsTable.pourTime})::numeric, 1)`,
  }).from(shotsTable).where(isNotNull(shotsTable.airtableRecordId));
  res.json({ totalShots: aggs?.totalShots ?? 0, referenceShots: aggs?.referenceShots ?? 0, avgDose: aggs?.avgDose ?? null, avgYield: aggs?.avgYield ?? null, avgPourTime: aggs?.avgPourTime ?? null });
});

router.get("/dashboard/recent", async (req, res): Promise<void> => {
  const params = GetRecentShotsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable).where(isNotNull(shotsTable.airtableRecordId)).orderBy(desc(sql`${shotsTable.shotDate}`)).limit(limit);
  res.json(shots);
});

router.get("/dashboard/best-rated", async (req, res): Promise<void> => {
  const params = GetBestRatedShotsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable).where(and(isNotNull(shotsTable.rating), isNotNull(shotsTable.airtableRecordId))).orderBy(desc(shotsTable.rating)).limit(limit);
  res.json(shots);
});

export default router;
