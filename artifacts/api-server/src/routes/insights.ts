import { Router, type IRouter } from "express";
import { and, eq, gte, ilike, isNotNull, sql } from "drizzle-orm";
import { db, shotsTable } from "@workspace/db";
import { GetInsightsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /insights
router.get("/insights", async (req, res): Promise<void> => {
  const params = GetInsightsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { bean, bag } = params.data;
  const baseConditions = [];
  if (bean) baseConditions.push(ilike(shotsTable.bean, `%${bean}%`));
  if (bag) baseConditions.push(ilike(shotsTable.bag, `%${bag}%`));
  const baseWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

  const insights: { id: string; text: string; category: string; confidence: string | null }[] = [];

  // Insight 1: Best pour delay range among high-rated shots
  const highRated = await db.select({
    avgPourDelay: sql<number | null>`round(avg(${shotsTable.pourDelay})::numeric, 1)`,
    minPourDelay: sql<number | null>`min(${shotsTable.pourDelay})`,
    maxPourDelay: sql<number | null>`max(${shotsTable.pourDelay})`,
    count: sql<number>`count(*)::int`,
  })
    .from(shotsTable)
    .where(and(baseWhere, gte(shotsTable.rating, 8.5), isNotNull(shotsTable.pourDelay)));

  if (highRated[0]?.count > 3 && highRated[0]?.minPourDelay != null && highRated[0]?.maxPourDelay != null) {
    insights.push({
      id: "best-pour-delay",
      text: `Your best shots (rating 8.5+) tend to have a first pour delay of ${highRated[0].minPourDelay}–${highRated[0].maxPourDelay} seconds (avg ${highRated[0].avgPourDelay}s). This appears to be your sweet spot.`,
      category: "Pour Delay",
      confidence: "High",
    });
  }

  // Insight 2: Best yield range among high-rated shots
  const highRatedYield = await db.select({
    avgYield: sql<number | null>`round(avg(${shotsTable.yield})::numeric, 1)`,
    minYield: sql<number | null>`min(${shotsTable.yield})`,
    maxYield: sql<number | null>`max(${shotsTable.yield})`,
    count: sql<number>`count(*)::int`,
  })
    .from(shotsTable)
    .where(and(baseWhere, gte(shotsTable.rating, 8.5), isNotNull(shotsTable.yield)));

  if (highRatedYield[0]?.count > 3 && highRatedYield[0]?.minYield != null) {
    insights.push({
      id: "best-yield",
      text: `High-rated shots cluster around a yield of ${highRatedYield[0].minYield}–${highRatedYield[0].maxYield}g (avg ${highRatedYield[0].avgYield}g). Staying in this range tends to produce the most consistent results.`,
      category: "Yield",
      confidence: "High",
    });
  }

  // Insight 3: Short pour time correlation with lower ratings
  const shortPourAvg = await db.select({
    avgRating: sql<number | null>`round(avg(${shotsTable.rating})::numeric, 2)`,
    count: sql<number>`count(*)::int`,
  })
    .from(shotsTable)
    .where(and(baseWhere, sql`${shotsTable.pourTime} < 30`, isNotNull(shotsTable.rating)));

  const longPourAvg = await db.select({
    avgRating: sql<number | null>`round(avg(${shotsTable.rating})::numeric, 2)`,
    count: sql<number>`count(*)::int`,
  })
    .from(shotsTable)
    .where(and(baseWhere, sql`${shotsTable.pourTime} >= 33`, isNotNull(shotsTable.rating)));

  if (shortPourAvg[0]?.count > 2 && longPourAvg[0]?.count > 2 && shortPourAvg[0]?.avgRating != null && longPourAvg[0]?.avgRating != null) {
    const diff = longPourAvg[0].avgRating - shortPourAvg[0].avgRating;
    if (diff > 0.5) {
      insights.push({
        id: "pour-time-rating",
        text: `Shots with pour times over 33s average a rating of ${longPourAvg[0].avgRating}, compared to ${shortPourAvg[0].avgRating} for shots under 30s. Longer extractions tend to score better.`,
        category: "Pour Time",
        confidence: "Medium",
      });
    }
  }

  // Insight 4: Grind setting stability
  const grindSettings = await db.select({
    grindSetting: shotsTable.grindSetting,
    avgRating: sql<number | null>`round(avg(${shotsTable.rating})::numeric, 2)`,
    count: sql<number>`count(*)::int`,
  })
    .from(shotsTable)
    .where(and(baseWhere, isNotNull(shotsTable.grindSetting), isNotNull(shotsTable.rating)))
    .groupBy(shotsTable.grindSetting)
    .orderBy(sql`avg(${shotsTable.rating}) desc`)
    .limit(3);

  if (grindSettings.length > 0 && grindSettings[0]?.grindSetting != null && grindSettings[0]?.count > 1) {
    insights.push({
      id: "best-grind-setting",
      text: `Grind setting ${grindSettings[0].grindSetting} has your highest average rating of ${grindSettings[0].avgRating} across ${grindSettings[0].count} shots. This setting appears to be the most reliable.`,
      category: "Grind Setting",
      confidence: grindSettings[0].count > 3 ? "High" : "Medium",
    });
  }

  // Insight 5: Reference shots concentration
  const refCount = await db.select({
    count: sql<number>`count(*)::int`,
    avgRating: sql<number | null>`round(avg(${shotsTable.rating})::numeric, 2)`,
  })
    .from(shotsTable)
    .where(and(baseWhere, eq(shotsTable.isReference, true), isNotNull(shotsTable.rating)));

  if (refCount[0]?.count > 0) {
    insights.push({
      id: "reference-shots",
      text: `You have ${refCount[0].count} reference shot${refCount[0].count !== 1 ? "s" : ""} with an average rating of ${refCount[0].avgRating ?? "N/A"}. Reference shots are your baseline for dialing in new bags.`,
      category: "Reference",
      confidence: null,
    });
  }

  // Insight 6: Fault rate
  const faultCount = await db.select({
    total: sql<number>`count(*)::int`,
    faults: sql<number>`count(*) filter (where ${shotsTable.faultStatus} is not null and ${shotsTable.faultStatus} != '' and ${shotsTable.faultStatus} not in ('Good'))::int`,
  })
    .from(shotsTable)
    .where(baseWhere);

  if (faultCount[0]?.total > 5) {
    const faultRate = Math.round((faultCount[0].faults / faultCount[0].total) * 100);
    if (faultRate > 5) {
      insights.push({
        id: "fault-rate",
        text: `${faultRate}% of your logged shots have fault indicators. Reviewing fault patterns may help identify equipment or workflow issues.`,
        category: "Faults",
        confidence: "Medium",
      });
    }
  }

  res.json(insights);
});

export default router;
