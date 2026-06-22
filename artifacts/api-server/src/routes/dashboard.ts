import { Router, type IRouter } from "express";
import { sql, desc, isNotNull, eq, ne, and, lt } from "drizzle-orm";
import { db, shotsTable, bagsTable, beansTable, settingsTable } from "@workspace/db";
import { GetRecentShotsQueryParams, GetBestRatedShotsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// ── Robust range helper ───────────────────────────────────────────────────────
function robustRange(vals: number[]): {
  min: number; max: number; count: number; outliersRemoved: number;
  confidence: "Low" | "Medium" | "High";
  operationalMin: number; operationalMax: number;
} | null {
  if (vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const n = sorted.length;

  // Interpolated quartiles
  const q1Idx = (n - 1) * 0.25;
  const q3Idx = (n - 1) * 0.75;
  const q1 = sorted[Math.floor(q1Idx)]! + (q1Idx % 1) * ((sorted[Math.ceil(q1Idx)] ?? sorted[Math.floor(q1Idx)]!) - sorted[Math.floor(q1Idx)]!);
  const q3 = sorted[Math.floor(q3Idx)]! + (q3Idx % 1) * ((sorted[Math.ceil(q3Idx)] ?? sorted[Math.floor(q3Idx)]!) - sorted[Math.floor(q3Idx)]!);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  const filtered = sorted.filter((v) => v >= lower && v <= upper);
  if (filtered.length === 0) return null;

  const count = filtered.length;
  const outliersRemoved = n - count;
  const confidence: "Low" | "Medium" | "High" = count >= 10 ? "High" : count >= 4 ? "Medium" : "Low";

  // Operational window = full IQR-filtered range
  const operationalMin = Math.round(filtered[0]! * 10) / 10;
  const operationalMax = Math.round(filtered[filtered.length - 1]! * 10) / 10;

  // Peak cluster = p25–p75 of the filtered set
  const fn = filtered.length;
  const p25Idx = (fn - 1) * 0.25;
  const p75Idx = (fn - 1) * 0.75;
  const p25 = filtered[Math.floor(p25Idx)]! + (p25Idx % 1) * ((filtered[Math.ceil(p25Idx)] ?? filtered[Math.floor(p25Idx)]!) - filtered[Math.floor(p25Idx)]!);
  const p75 = filtered[Math.floor(p75Idx)]! + (p75Idx % 1) * ((filtered[Math.ceil(p75Idx)] ?? filtered[Math.floor(p75Idx)]!) - filtered[Math.floor(p75Idx)]!);

  return {
    operationalMin,
    operationalMax,
    min: Math.round(p25 * 10) / 10,
    max: Math.round(p75 * 10) / 10,
    count,
    outliersRemoved,
    confidence,
  };
}

// ── GET /dashboard/intelligence ─────────────────────────────────────────────
router.get("/dashboard/intelligence", async (req, res): Promise<void> => {
  // Disable HTTP caching — this endpoint aggregates live shot data and must
  // always return a fresh response to prevent 304 hits serving stale fields.
  res.setHeader("Cache-Control", "no-store");

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

  if (!activeBagRow) {
    res.json({
      activeBag: null, bagIntelligence: null, bagProgress: null,
      grindDrift: null, timingWindows: null, todaysBrief: null,
      watchlist: [{ type: "info", message: "No active bag — go to Bags and mark one active to get started.", suggestedChecks: [] }],
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

  // ── Shots for active bag (analysis-eligible only) ─────────────────────────
  const activeBagShots = await db.select().from(shotsTable)
    .where(and(
      eq(shotsTable.bagId, activeBagRow.id),
      isNotNull(shotsTable.airtableRecordId),
      eq(shotsTable.includeInAnalysis, true),
    ))
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

  // ── New bag intelligence fields ───────────────────────────────────────────
  const totalBagShots = activeBagShots.length;
  const referenceRate = totalBagShots > 0
    ? Math.round((refCount / totalBagShots) * 1000) / 10
    : null;

  // Signature Shot is a manual checkbox field on each shot record.
  // Never infer from preference rating, rating, or reference status.
  // If no shot has the field populated (all null), return null → UI shows "—".
  const anyHasSignatureField = activeBagShots.some((s) => s.signatureShot !== null);
  const signatureShotCount = anyHasSignatureField
    ? activeBagShots.filter((s) => s.signatureShot === true).length
    : null;
  // Diagnostic (safe — no secrets, no PII)
  req.log.info({
    bagId: activeBagRow.id,
    totalShots: activeBagShots.length,
    signatureShotsTrue: activeBagShots.filter((s) => s.signatureShot === true).length,
    signatureShotsNull: activeBagShots.filter((s) => s.signatureShot === null).length,
    anyHasSignatureField,
  }, "signature-shot diagnostic");

  // dialInSpeed: shots before first reference shot (chronological order)
  const sortedByDate = [...activeBagShots].sort((a, b) =>
    new Date(a.shotDate).getTime() - new Date(b.shotDate).getTime()
  );
  const firstRefIdx = sortedByDate.findIndex((s) => s.isReference);
  const dialInSpeed = firstRefIdx >= 0 ? firstRefIdx : null;

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

  // ── Bag phase + confidence ────────────────────────────────────────────────
  // Phase logic based on days open, reference shots, bag consumption.
  const isEndOfBag = (estimatedShotsRemaining != null && estimatedShotsRemaining <= 5) ||
    (completionPct != null && completionPct >= 90);
  const bagPhase: "Opening / Dial-In" | "Established Performance" | "Mature Bag" | "End of Bag" =
    isEndOfBag ? "End of Bag"
    : (openDays != null && openDays >= 21) ? "Mature Bag"
    : (refCount > 0 && activeBagShots.length >= 5) ? "Established Performance"
    : "Opening / Dial-In";
  const bagConfidence: "Low" | "Medium" | "High" =
    activeBagShots.length >= 15 ? "High"
    : activeBagShots.length >= 5 ? "Medium"
    : "Low";

  // ── Timing windows ─────────────────────────────────────────────────────────
  let timingSource: "current_bag" | "same_bean" | "all_reference" = "current_bag";
  let timingPool = topRated;

  if (timingPool.length < 3 && activeBagRow.beanId) {
    const sameBeanBags = await db.select({ id: bagsTable.id })
      .from(bagsTable).where(eq(bagsTable.beanId, activeBagRow.beanId));
    const sameBeanIds = sameBeanBags.map((b) => b.id);
    if (sameBeanIds.length > 1) {
      const sameBeanShots = await db.select().from(shotsTable)
        .where(and(isNotNull(shotsTable.bagId), isNotNull(shotsTable.airtableRecordId), eq(shotsTable.includeInAnalysis, true), sql`${shotsTable.bagId} = ANY(${sameBeanIds})`))
        .orderBy(desc(sql`${shotsTable.shotDate}`));
      timingPool = sameBeanShots.filter((s) => s.rating != null && Number(s.rating) >= 8);
      timingSource = "same_bean";
    }
  }
  if (timingPool.length < 3) {
    const allRef = await db.select().from(shotsTable).where(and(eq(shotsTable.isReference, true), isNotNull(shotsTable.airtableRecordId), eq(shotsTable.includeInAnalysis, true)));
    timingPool = allRef;
    timingSource = "all_reference";
  }

  const timingWindows = {
    dataSource: timingSource,
    shotCount: timingPool.length,
    yieldRange: robustRange(timingPool.map((s) => Number(s.yield)).filter((v) => v > 0)),
    pourTimeRange: robustRange(timingPool.map((s) => Number(s.pourTime)).filter((v) => v > 0)),
    scaleTimeRange: robustRange(timingPool.map((s) => Number(s.scaleTime)).filter((v) => v > 0)),
    pourDelayRange: robustRange(timingPool.map((s) => Number(s.pourDelay)).filter((v) => v > 0)),
  };

  // ── Best yield + pour delay ranges (bag intel) ───────────────────────────
  const topYields = topRated.map((s) => Number(s.yield)).filter((v) => v > 0);
  const bestYieldRange = robustRange(topYields);
  const topDelays = topRated.map((s) => Number(s.pourDelay)).filter((v) => v > 0);
  const bestPourDelayRange = robustRange(topDelays);

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
    .from(shotsTable).where(and(isNotNull(shotsTable.grindSetting), isNotNull(shotsTable.airtableRecordId), eq(shotsTable.includeInAnalysis, true), sql`${shotsTable.bagId} != ${activeBagRow.id}`));

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
    .where(and(isNotNull(shotsTable.grindSetting), isNotNull(shotsTable.airtableRecordId), eq(shotsTable.includeInAnalysis, true)))
    .groupBy(shotsTable.bagId, bagsTable.bagNumber, beansTable.name, bagsTable.openedDate)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  // ── Watchlist (recommendation-style) ──────────────────────────────────────
  type W = { type: "success" | "warning" | "info"; message: string; suggestedChecks?: string[] };
  const watchlist: W[] = [];

  if (openDays != null && openDays >= 28) {
    watchlist.push({
      type: "warning",
      message: `Bag is ${openDays} days old — finish it soon or adjust expectations.`,
      suggestedChecks: ["Taste for staleness or flatness", "Grind finer to compensate for aging", "Order your next bag now"],
    });
  } else if (openDays != null && openDays >= 21) {
    watchlist.push({
      type: "info",
      message: `${openDays} days in — watch for grind drift as the beans age.`,
    });
  }
  if (driftDir === "coarser" && drift != null) {
    watchlist.push({
      type: "warning",
      message: `Grind drifting coarser (+${drift.toFixed(3)}) — check your setup before the next pull.`,
      suggestedChecks: ["Clean burrs and check for coffee oil buildup", "Confirm bean age (stale beans often pull coarser)", "Dial back 0.02–0.05 and taste"],
    });
  } else if (driftDir === "finer" && drift != null) {
    watchlist.push({
      type: "info",
      message: `Grind has trended finer (${drift.toFixed(3)}) — beans may be settling in.`,
    });
  }
  if (refCount === 0 && activeBagShots.length >= 5) {
    watchlist.push({
      type: "warning",
      message: "No reference shot yet — mark your best pull as a reference to anchor future comparisons.",
      suggestedChecks: ["Open your best shot and tap 'Set as reference'", "Aim for a rating ≥ 8 before marking"],
    });
  } else if (refCount > 0) {
    watchlist.push({
      type: "success",
      message: `${refCount} reference shot${refCount > 1 ? "s" : ""} locked in — you have a solid benchmark for this bag.`,
    });
  }
  if (last3Avg != null && last3Avg < 7.5 && last3.length === 3) {
    watchlist.push({
      type: "warning",
      message: `Recent performance declining (last 3 avg ${last3Avg.toFixed(1)}) — check grind and bean age.`,
      suggestedChecks: ["Adjust grind by 0.05 in the direction of your drift", "Check brew temp and pre-infusion time", "Compare dose/yield to your reference shot"],
    });
  } else if (avgRating != null && avgRating >= 8.5) {
    watchlist.push({
      type: "success",
      message: `Bag dialled in — avg ${avgRating.toFixed(2)} across ${ratedShots.length} rated shot${ratedShots.length !== 1 ? "s" : ""}.`,
    });
  }
  if (activeBagShots.length < 5) {
    watchlist.push({
      type: "info",
      message: `${activeBagShots.length} shot${activeBagShots.length !== 1 ? "s" : ""} logged — keep pulling to build a reliable picture.`,
    });
  }
  if (estimatedShotsRemaining != null && estimatedShotsRemaining <= 5) {
    watchlist.push({
      type: "warning",
      message: `Approx. ${estimatedShotsRemaining} shot${estimatedShotsRemaining !== 1 ? "s" : ""} remaining — order your next bag soon.`,
      suggestedChecks: ["Browse your bean supplier now", "Note your best grind setting for continuity"],
    });
  }
  if (watchlist.length === 0) watchlist.push({ type: "info", message: "Everything looks good. Keep logging." });

  // ── Today's Brief ─────────────────────────────────────────────────────────
  const grindTrend = driftDir == null
    ? "No grind data yet"
    : driftDir === "stable"
    ? "Grind stable"
    : driftDir === "coarser"
    ? `Trending coarser (+${drift != null ? drift.toFixed(3) : "?"})`
    : `Trending finer (${drift != null ? drift.toFixed(3) : "?"})`;

  const topWatchlistItem = watchlist.find((w) => w.type === "warning") ?? watchlist[0] ?? null;

  const todaysBrief = {
    beanName: activeBagRow.beanName ?? "Unknown Bean",
    openDays,
    bagPhase,
    bagConfidence,
    bestYieldWindow: timingWindows.yieldRange ? { min: timingWindows.yieldRange.min, max: timingWindows.yieldRange.max } : null,
    bestPourDelayWindow: timingWindows.pourDelayRange ? { min: timingWindows.pourDelayRange.min, max: timingWindows.pourDelayRange.max } : null,
    grindTrend,
    topWatchlistItem: topWatchlistItem ? { type: topWatchlistItem.type, message: topWatchlistItem.message } : null,
  };

  // ── Shot comparison ─────────────────────────────────────────────────────────
  // Reuse already-fetched data — no new DB queries required.
  const latestAnalysisShot = activeBagShots[0] ?? null;
  const bagRefShots = activeBagShots.filter((s) => s.isReference);

  const compRefPool = bagRefShots.length >= 1 ? bagRefShots
    : (timingSource !== "current_bag" && timingPool.length > 0) ? timingPool
    : topRated;
  const compSource = bagRefShots.length >= 1 ? "Active bag reference shots"
    : timingSource === "same_bean" ? "Same bean reference shots"
    : timingSource === "all_reference" ? "Global reference shots"
    : "Active bag top-rated";

  const nAvg1 = (vals: number[]) => vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
  const nAvg2 = (vals: number[]) => vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null;

  const shotComparison = {
    latestShot: latestAnalysisShot ? {
      id: latestAnalysisShot.id,
      shotDate: latestAnalysisShot.shotDate,
      pourDelay: latestAnalysisShot.pourDelay != null ? Number(latestAnalysisShot.pourDelay) : null,
      pourTime: latestAnalysisShot.pourTime != null ? Number(latestAnalysisShot.pourTime) : null,
      scaleTime: latestAnalysisShot.scaleTime != null ? Number(latestAnalysisShot.scaleTime) : null,
      yield: latestAnalysisShot.yield != null ? Number(latestAnalysisShot.yield) : null,
      dose: latestAnalysisShot.dose != null ? Number(latestAnalysisShot.dose) : null,
      ratio: latestAnalysisShot.yield != null && latestAnalysisShot.dose != null && Number(latestAnalysisShot.dose) > 0
        ? Math.round(Number(latestAnalysisShot.yield) / Number(latestAnalysisShot.dose) * 100) / 100
        : null,
    } : null,
    bagReference: compRefPool.length > 0 ? {
      source: compSource,
      refCount: compRefPool.length,
      confidence: (compRefPool.length >= 10 ? "High" : compRefPool.length >= 3 ? "Medium" : "Low") as "Low" | "Medium" | "High",
      avgPourDelay: nAvg1(compRefPool.map((s) => Number(s.pourDelay)).filter((v) => !isNaN(v) && v > 0)),
      avgPourTime: nAvg1(compRefPool.map((s) => Number(s.pourTime)).filter((v) => !isNaN(v) && v > 0)),
      avgScaleTime: nAvg1(compRefPool.map((s) => Number(s.scaleTime)).filter((v) => !isNaN(v) && v > 0)),
      avgYield: nAvg1(compRefPool.map((s) => Number(s.yield)).filter((v) => !isNaN(v) && v > 0)),
      avgRatio: nAvg2(
        compRefPool
          .filter((s) => Number(s.yield) > 0 && Number(s.dose) > 0)
          .map((s) => Number(s.yield) / Number(s.dose))
      ),
    } : null,
  };

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
      referenceRate,
      signatureShotCount,
      dialInSpeed,
      bagPhase,
      bagConfidence,
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
    todaysBrief,
    shotComparison,
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
  }).from(shotsTable).where(and(isNotNull(shotsTable.airtableRecordId), eq(shotsTable.includeInAnalysis, true)));
  res.json({ totalShots: aggs?.totalShots ?? 0, referenceShots: aggs?.referenceShots ?? 0, avgDose: aggs?.avgDose ?? null, avgYield: aggs?.avgYield ?? null, avgPourTime: aggs?.avgPourTime ?? null });
});

router.get("/dashboard/recent", async (req, res): Promise<void> => {
  const params = GetRecentShotsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable).where(and(isNotNull(shotsTable.airtableRecordId), eq(shotsTable.includeInAnalysis, true))).orderBy(desc(sql`${shotsTable.shotDate}`)).limit(limit);
  res.json(shots);
});

router.get("/dashboard/best-rated", async (req, res): Promise<void> => {
  const params = GetBestRatedShotsQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const limit = params.data.limit ? Number(params.data.limit) : 10;
  const shots = await db.select().from(shotsTable).where(and(isNotNull(shotsTable.rating), isNotNull(shotsTable.airtableRecordId), eq(shotsTable.includeInAnalysis, true))).orderBy(desc(shotsTable.rating)).limit(limit);
  res.json(shots);
});

export default router;
