import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coffee, Plus, Star, Target, AlertTriangle,
  CheckCircle2, Info, TrendingUp, TrendingDown,
  Minus, Thermometer, Gauge, Timer, Scale,
  Clock, Package, Wrench, Droplets, ArrowRight,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface RangeVal {
  min: number;
  max: number;
  operationalMin: number;
  operationalMax: number;
  count: number;
  outliersRemoved: number;
  confidence: "Low" | "Medium" | "High";
}

interface WatchlistItem {
  type: "success" | "warning" | "info";
  message: string;
  suggestedChecks?: string[];
}

interface ShotComparison {
  latestShot: {
    id: number; shotDate: string;
    pourDelay: number | null; pourTime: number | null; flowTime: number | null;
    yield: number | null; dose: number | null; ratio: number | null;
  } | null;
  bagReference: {
    source: string; refCount: number; confidence: "Low" | "Medium" | "High";
    avgPourDelay: number | null; avgPourTime: number | null; avgFlowTime: number | null;
    avgYield: number | null; avgRatio: number | null;
  } | null;
}

interface Intelligence {
  activeBag: {
    id: number;
    beanId: number | null; beanName: string | null; beanOrigin: string | null;
    beanRoaster: string | null; beanRoastLevel: string | null; beanProcess: string | null;
    bagNumber: string | null; bagName: string | null;
    purchaseDate: string | null; roastDate: string | null; openedDate: string | null;
    openDays: number | null; roastAge: number | null; shotCount: number;
    defaultDose: number | null; defaultYield: number | null; defaultTemp: number | null;
    currentGrindSetting: number | null; startGrindSetting: number | null;
    currentGrindTime: number | null; startGrindTime: number | null;
    dialInNotes: string | null;
    grinder: string | null; machine: string | null;
    basket: string | null; usePuckScreen: boolean; puckScreen: string | null;
  } | null;
  bagIntelligence: {
    totalShots: number; referenceShots: number; dailyDriverCount: number;
    avgRating: number | null; avgPrefRating: number | null;
    bestRating: number | null; last3Avg: number | null;
    referenceRate: number | null;
    signatureShotCount: number | null;
    dialInSpeed: number | null;
    bagPhase: "Opening / Dial-In" | "Established Performance" | "Mature Bag" | "End of Bag";
    bagConfidence: "Low" | "Medium" | "High";
    bestYieldRange: RangeVal | null; bestPourDelayRange: RangeVal | null;
    bestShot: {
      id: number; rating: number | null; preferenceRating: number | null;
      isReference: boolean | null; signatureShot: boolean | null;
      dose: number | null; targetDose: number | null; initialGrindWeight: number | null;
      overGrindRemoved: number | null; topUpGrind: number | null;
      yield: number | null; ratio: number | null;
      grindSetting: number | null; grindTime: number | null;
      pourDelay: number | null; pourTime: number | null; flowTime: number | null;
      shotDate: string;
    } | null;
  } | null;
  bagProgress: {
    startingWeight: number | null; consumed: number; remaining: number | null;
    avgDose: number | null; estimatedShotsRemaining: number | null; completionPct: number | null;
  } | null;
  timingWindows: {
    dataSource: "current_bag" | "same_bean" | "all_reference"; shotCount: number;
    yieldRange: RangeVal | null; pourTimeRange: RangeVal | null;
    flowTimeRange: RangeVal | null; pourDelayRange: RangeVal | null;
  } | null;
  grindDrift: {
    startSetting: number | null; startTime: number | null;
    currentSetting: number | null; currentTime: number | null;
    drift: number | null; direction: "coarser" | "finer" | "stable" | null;
    previousBagAvg: number | null; shotCount: number;
    changesCount: number; lastChangeDate: string | null;
    daysSinceLastChange: number | null;
    largestMove: number | null; largestMoveDir: "finer" | "coarser" | null;
  } | null;
  bagComparison: {
    bagId: number | null; bagNumber: string | null; beanName: string | null;
    shotCount: number; avgGrind: number | null; firstGrind: number | null;
    lastGrind: number | null; totalAdjustment: number | null;
    openDays: number | null; refCount: number; bestRating: number | null;
    isActive: boolean;
  }[];
  watchlist: WatchlistItem[];
  todaysBrief: {
    beanName: string;
    openDays: number | null;
    bagPhase: "Opening / Dial-In" | "Established Performance" | "Mature Bag" | "End of Bag";
    bagConfidence: "Low" | "Medium" | "High";
    bestYieldWindow: { min: number; max: number } | null;
    bestPourDelayWindow: { min: number; max: number } | null;
    grindTrend: string;
    topWatchlistItem: { type: "success" | "warning" | "info"; message: string } | null;
  } | null;
  shotComparison: ShotComparison | null;
}

function fetchIntelligence(): Promise<Intelligence> {
  return fetch("/api/dashboard/intelligence").then((r) => r.json());
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: intel, isLoading } = useQuery({
    queryKey: ["dashboard-intelligence"],
    queryFn: fetchIntelligence,
    refetchOnWindowFocus: true,
  });

  const bag = intel?.activeBag;
  const bi = intel?.bagIntelligence;
  const gd = intel?.grindDrift;
  const bp = intel?.bagProgress;
  const tw = intel?.timingWindows;

  const hasBagProgress = bp && (bp.startingWeight || bp.consumed > 0);
  const hasBagComparison = intel?.bagComparison && intel.bagComparison.length > 1;
  const hasTimingWindows = tw && (tw.yieldRange || tw.pourTimeRange || tw.flowTimeRange || tw.pourDelayRange);
  const hasPerfWindow = bi && (bi.bestYieldRange || bi.bestPourDelayRange);

  const twScopeLabel =
    tw?.dataSource === "all_reference" ? "Based on all reference shots across all bags"
    : tw?.dataSource === "same_bean" ? "Based on all reference shots · same bean"
    : "Based on reference shots · this bag";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {bag ? `${bag.beanName ?? "Active bag"} · Bag #${bag.bagNumber ?? bag.id}` : "Your espresso control centre"}
          </p>
        </div>
        <Button asChild className="gap-2 shadow-sm">
          <Link href="/shots/new"><Plus className="h-4 w-4" /> Log Shot</Link>
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — CURRENT BAG
          ═══════════════════════════════════════════════════════════════════════ */}
      <DashboardSection title="Current Bag" scope="Active bag only" />

      {/* 1. Current Baseline ──────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Current Baseline</SectionLabel>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !bag ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Coffee className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No active bag set.</p>
              <p className="text-sm mt-1">Go to Bags and mark one as active to see your setup here.</p>
              <Button variant="outline" className="mt-4" asChild><Link href="/bags">Go to Bags</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20">
            <CardContent className="px-4 py-3 space-y-2">
              {/* Line 1: identity */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-semibold truncate">{bag.beanName ?? "Unknown Bean"}</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0">
                    Bag #{bag.bagNumber ?? bag.id}
                  </Badge>
                  {bag.openDays != null && (
                    <span className={cn("text-xs shrink-0", bag.openDays >= 28 ? "text-destructive font-medium" : bag.openDays >= 21 ? "text-amber-600" : "text-muted-foreground")}>
                      Open {bag.openDays}d
                    </span>
                  )}
                  {bag.roastAge != null && (
                    <span className="text-xs text-muted-foreground shrink-0">Roast age {bag.roastAge}d</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2 shrink-0">
                  <Link href={`/bags/${bag.id}`}>View bag →</Link>
                </Button>
              </div>

              {/* Line 2: recipe */}
              <div className="flex items-center gap-3 flex-wrap text-sm">
                {bag.defaultDose != null && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Coffee className="h-3 w-3" /><span className="font-medium text-foreground">{bag.defaultDose}g</span> dose
                  </span>
                )}
                {bag.defaultYield != null && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Droplets className="h-3 w-3" /><span className="font-medium text-foreground">{bag.defaultYield}g</span> yield
                  </span>
                )}
                {bag.defaultTemp != null && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Thermometer className="h-3 w-3" /><span className="font-medium text-foreground">{bag.defaultTemp}°C</span>
                  </span>
                )}
                {bag.currentGrindSetting != null && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Gauge className="h-3 w-3" /><span className="font-bold text-primary">{bag.currentGrindSetting}</span> grind
                  </span>
                )}
                {bag.currentGrindTime != null && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Timer className="h-3 w-3" /><span className="font-medium text-foreground">{bag.currentGrindTime}s</span> grind time
                  </span>
                )}
              </div>

              {/* Line 3: equipment */}
              {(bag.machine || bag.grinder || bag.basket || bag.usePuckScreen) && (
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground border-t pt-2">
                  {bag.machine && <span className="flex items-center gap-1"><Coffee className="h-3 w-3" />{bag.machine}</span>}
                  {bag.grinder && <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{bag.grinder}</span>}
                  {bag.basket && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{bag.basket}</span>}
                  {bag.usePuckScreen && (
                    <span className="flex items-center gap-1 text-primary/70">
                      <Scale className="h-3 w-3" />Puck screen{bag.puckScreen ? ` (${bag.puckScreen})` : ""}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* 2. Bag Progress (no bag phase — moved to Today's Brief) ─────────────── */}
      {hasBagProgress && (
        <section>
          <SectionLabel>Bag Progress</SectionLabel>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {bp!.startingWeight != null && (
                  <IntelStat label="Starting weight" value={`${bp!.startingWeight}g`} icon={Package} />
                )}
                <IntelStat label="Consumed" value={`${bp!.consumed}g`} />
                {bp!.remaining != null && (
                  <IntelStat label="Remaining" value={`${bp!.remaining.toFixed(1)}g`} accent />
                )}
                {bp!.estimatedShotsRemaining != null && (
                  <IntelStat
                    label="Shots left (est.)"
                    value={String(bp!.estimatedShotsRemaining)}
                    dim={bp!.estimatedShotsRemaining <= 5}
                  />
                )}
              </div>

              {bp!.completionPct != null && (
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                    <span>Bag used</span>
                    <span className="font-medium tabular-nums">{bp!.completionPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", bp!.completionPct >= 85 ? "bg-destructive" : bp!.completionPct >= 65 ? "bg-amber-500" : "bg-primary")}
                      style={{ width: `${Math.min(100, bp!.completionPct)}%` }}
                    />
                  </div>
                </div>
              )}

              {bp!.avgDose && (
                <p className="text-xs text-muted-foreground">
                  Avg dose {bp!.avgDose}g · {bp!.consumed > 0 ? `${Math.round(bp!.consumed / bp!.avgDose)} shots` : "no shots"} worth consumed
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* 3. Today's Coffee Brief (with bag phase inline) ────────────────────── */}
      {intel?.todaysBrief && (
        <section>
          <SectionLabel>Today's Coffee Brief</SectionLabel>
          <TodaysBriefCard brief={intel.todaysBrief} />
        </section>
      )}

      {/* 4. Current Bag Performance Window ──────────────────────────────────── */}
      {hasPerfWindow && (
        <section>
          <SectionLabel scope={`Based on ${bag?.beanName ?? "this bag"} only`}>
            Current Bag Performance Window
          </SectionLabel>
          {isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="flex gap-3 flex-col sm:flex-row">
              {bi!.bestYieldRange && (
                <BagWindowStat label="Best yield (rated 8+)" range={bi!.bestYieldRange} unit="g" />
              )}
              {bi!.bestPourDelayRange && (
                <BagWindowStat label="Best first pour delay (rated 8+)" range={bi!.bestPourDelayRange} unit="s" />
              )}
            </div>
          )}
        </section>
      )}

      {/* 5. Current Shot vs Reference ────────────────────────────────────────── */}
      {bag && (
        <section>
          <SectionLabel>Current Shot vs Reference</SectionLabel>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : intel?.shotComparison ? (
            <ShotComparisonCard data={intel.shotComparison} beanName={bag.beanName} />
          ) : (bi?.totalShots ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No shots logged yet for this bag.
              </CardContent>
            </Card>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </section>
      )}

      {/* 6. Current Bag Intelligence ─────────────────────────────────────────── */}
      {bi && (
        <section>
          <SectionLabel scope={`Based on ${bag?.beanName ?? "this bag"} only`}>
            Current Bag Intelligence
          </SectionLabel>
          {isLoading ? <Skeleton className="h-52 w-full" /> : (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <IntelStat label="Shots" value={String(bi.totalShots)} />
                  <IntelStat label="Reference shots" value={String(bi.referenceShots)} accent={bi.referenceShots > 0} />
                  <IntelStat label="Daily drivers" value={String(bi.dailyDriverCount)} accent={bi.dailyDriverCount > 0} />
                  <IntelStat
                    label="Avg rating"
                    value={bi.avgRating != null ? bi.avgRating.toFixed(2) : "—"}
                    accent={bi.avgRating != null && bi.avgRating >= 8}
                    icon={bi.avgRating != null ? Star : undefined}
                  />
                  <IntelStat
                    label="Last 3 avg"
                    value={bi.last3Avg != null ? bi.last3Avg.toFixed(1) : "—"}
                    dim={bi.last3Avg != null && bi.last3Avg < 7.5}
                  />
                  {bi.bestRating != null && (
                    <IntelStat label="Best rating" value={bi.bestRating.toFixed(2)} icon={Star} />
                  )}
                  {bi.avgPrefRating != null && (
                    <IntelStat label="Avg pref rating" value={bi.avgPrefRating.toFixed(2)} />
                  )}
                  <IntelStat
                    label="Reference rate"
                    value={bi.referenceRate != null ? `${bi.referenceRate}%` : "—"}
                    accent={bi.referenceRate != null && bi.referenceRate >= 20}
                  />
                  <IntelStat
                    label="Signature shots"
                    value={bi.signatureShotCount != null ? String(bi.signatureShotCount) : "—"}
                    accent={bi.signatureShotCount != null && bi.signatureShotCount > 0}
                  />
                </div>

                {bi.bestShot && (
                  <BestShotRecipeCard shot={bi.bestShot} />
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* 7. Next Shot Watchlist ──────────────────────────────────────────────── */}
      {intel?.watchlist && intel.watchlist.length > 0 && (
        <section>
          <SectionLabel>Next Shot Watchlist</SectionLabel>
          <Card>
            <CardContent className="p-4 space-y-2">
              {intel.watchlist.map((item, i) => (
                <WatchlistCard key={i} item={item} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* 8. Grind Journey (standalone) ──────────────────────────────────────── */}
      {bag && (
        <section>
          <SectionLabel>Grind Journey</SectionLabel>
          {isLoading ? <Skeleton className="h-36 w-full" /> : (
            <Card>
              <CardContent className="p-5 space-y-4">
                {!gd ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Log shots with grind settings to see your grind journey.</p>
                ) : (
                  <>
                    {/* Start → Current arc */}
                    <div className="flex items-center justify-center gap-6 py-2">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Start</p>
                        <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                          {gd.startSetting != null ? gd.startSetting : "—"}
                        </p>
                        {gd.startTime != null && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{gd.startTime}s</p>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Current</p>
                        <p className="text-2xl font-bold tabular-nums text-primary">
                          {gd.currentSetting != null ? gd.currentSetting : "—"}
                        </p>
                        {gd.currentTime != null && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{gd.currentTime}s</p>
                        )}
                      </div>
                    </div>

                    {/* Direction — primary focal point */}
                    <div className="flex justify-center">
                      <DirectionBadge direction={gd.direction} />
                    </div>

                    {/* Net change + days open */}
                    <div className="flex items-center justify-center gap-8">
                      {gd.drift != null && (
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Net change</p>
                          <p className={cn("text-lg font-bold tabular-nums",
                            gd.direction === "coarser" ? "text-amber-600" :
                            gd.direction === "finer" ? "text-blue-600" : "text-muted-foreground")}>
                            {gd.drift > 0 ? "+" : ""}{gd.drift.toFixed(3)}
                          </p>
                        </div>
                      )}
                      {bag?.openDays != null && (
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Days open</p>
                          <p className={cn("text-lg font-bold tabular-nums",
                            bag.openDays >= 28 ? "text-destructive" :
                            bag.openDays >= 21 ? "text-amber-600" : "text-foreground")}>
                            {bag.openDays}d
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      Based on {gd.shotCount} shot{gd.shotCount !== 1 ? "s" : ""} with grind data
                    </p>

                    {/* Grind change context */}
                    <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground text-center">
                      {gd.changesCount === 0 ? (
                        <p>No grind changes recorded yet.</p>
                      ) : (
                        <>
                          <p>
                            Grind changes: <span className="font-medium text-foreground">{gd.changesCount}</span>
                            {gd.lastChangeDate && (
                              <> · Last: <span className="font-medium text-foreground">{format(new Date(gd.lastChangeDate), "d MMM")}</span></>
                            )}
                            {gd.daysSinceLastChange != null && (
                              <> ({gd.daysSinceLastChange === 0 ? "today" : `${gd.daysSinceLastChange}d ago`})</>
                            )}
                          </p>
                          {gd.largestMove != null && gd.largestMoveDir && (
                            <p>
                              Largest move:{" "}
                              <span className={cn("font-medium", gd.largestMoveDir === "finer" ? "text-blue-600" : "text-amber-600")}>
                                {gd.largestMoveDir === "finer" ? "↘" : "↗"} {gd.largestMove.toFixed(3)} {gd.largestMoveDir}
                              </span>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — BAG HISTORY
          ═══════════════════════════════════════════════════════════════════════ */}
      {hasBagComparison && (
        <>
          <DashboardSection title="Bag History" scope="All historical bags" />

          <section>
            <SectionLabel>Bag Comparison</SectionLabel>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-medium">Bag</th>
                      <th className="px-3 py-3 text-right font-medium">Bean</th>
                      <th className="px-3 py-3 text-right font-medium">Shots</th>
                      <th className="px-3 py-3 text-right font-medium">Start ⚙</th>
                      <th className="px-3 py-3 text-right font-medium">Last ⚙</th>
                      <th className="px-3 py-3 text-right font-medium">Direction</th>
                      <th className="px-3 py-3 text-right font-medium">Best ★</th>
                      <th className="px-3 py-3 text-right font-medium">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intel!.bagComparison.map((b, i) => (
                      <tr key={i} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", b.isActive && "bg-primary/5")}>
                        <td className="px-4 py-3 font-medium">
                          Bag #{b.bagNumber ?? b.bagId}
                          {b.isActive && <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Active</Badge>}
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground max-w-[120px] truncate">{b.beanName ?? "—"}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{b.shotCount}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{b.firstGrind != null ? Number(b.firstGrind).toFixed(3) : "—"}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{b.lastGrind != null ? Number(b.lastGrind).toFixed(3) : "—"}</td>
                        <td className="px-3 py-3 text-right">
                          {(() => {
                            const adj = b.totalAdjustment;
                            if (adj == null) return <span className="text-muted-foreground">—</span>;
                            const isCoarser = adj > 0.05;
                            const isFiner = adj < -0.05;
                            return (
                              <span className={cn("font-medium tabular-nums",
                                isCoarser ? "text-amber-600" : isFiner ? "text-blue-600" : "text-muted-foreground")}>
                                {isCoarser ? "↗ Coarser" : isFiner ? "↘ Finer" : "→ Stable"}
                                {Math.abs(adj) > 0.001 && (
                                  <span className="ml-1 text-xs opacity-75">
                                    {adj > 0 ? "+" : ""}{adj.toFixed(2)}
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-amber-600 font-medium">
                          {b.bestRating != null ? Number(b.bestRating).toFixed(2) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{b.refCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — GLOBAL REFERENCE INTELLIGENCE
          ═══════════════════════════════════════════════════════════════════════ */}
      {hasTimingWindows && (
        <>
          <DashboardSection title="Global Reference Intelligence" scope={twScopeLabel} />

          <section>
            <SectionLabel>
              Reference Shot Performance Windows
              <span className="ml-2 text-[10px] font-normal normal-case text-muted-foreground">
                {tw!.shotCount} shot{tw!.shotCount !== 1 ? "s" : ""}
              </span>
            </SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tw!.yieldRange && <WindowStat icon={Droplets} label="Yield" range={tw!.yieldRange} unit="g" showDualWindow />}
              {tw!.pourTimeRange && <WindowStat icon={Clock} label="Pour time" range={tw!.pourTimeRange} unit="s" />}
              {tw!.flowTimeRange && <WindowStat icon={Timer} label="Flow time" range={tw!.flowTimeRange} unit="s" />}
              {tw!.pourDelayRange && <WindowStat icon={Target} label="First pour delay" range={tw!.pourDelayRange} unit="s" />}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DashboardSection({ title, scope }: { title: string; scope: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <h2 className="text-sm font-bold tracking-tight text-foreground whitespace-nowrap">{title}</h2>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{scope}</span>
    </div>
  );
}

function SectionLabel({ children, scope, className }: { children: React.ReactNode; scope?: string; className?: string }) {
  return (
    <h3 className={cn("text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2 flex-wrap", className)}>
      {children}
      {scope && (
        <span className="font-normal normal-case tracking-normal text-[10px] bg-muted/60 px-2 py-0.5 rounded-full">
          {scope}
        </span>
      )}
    </h3>
  );
}

function IntelStat({ label, value, accent, dim, icon: Icon, highlight }: { label: string; value: string; accent?: boolean; dim?: boolean; icon?: React.ElementType; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg px-3 py-2.5", highlight ? "bg-primary/10" : "bg-muted/40")}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={cn("font-bold tabular-nums flex items-center gap-1", accent && "text-primary", dim && "text-destructive")}>
        {Icon && <Icon className="h-3.5 w-3.5 fill-current" />}
        {value}
      </p>
    </div>
  );
}

function ConfidencePill({ range }: { range: RangeVal }) {
  const colours = {
    High: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    Low: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", colours[range.confidence])}>
        {range.confidence} confidence
      </span>
      <span className="text-[10px] text-muted-foreground">
        {range.count} shot{range.count !== 1 ? "s" : ""}
        {range.outliersRemoved > 0 ? `, ${range.outliersRemoved} outlier${range.outliersRemoved !== 1 ? "s" : ""} removed` : ""}
      </span>
    </div>
  );
}

// Compact window stat for "Current Bag Performance Window" (card 4)
function BagWindowStat({ label, range, unit }: { label: string; range: RangeVal; unit: string }) {
  const showDual = range.operationalMin !== range.min || range.operationalMax !== range.max;
  const fmtRange = (lo: number, hi: number) =>
    lo === hi ? `${lo}${unit}` : `${lo}–${hi}${unit}`;
  return (
    <Card className="flex-1">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        {showDual ? (
          <div className="space-y-1.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Success Range</p>
              <p className="font-semibold tabular-nums text-sm">
                {fmtRange(range.operationalMin, range.operationalMax)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sweet Spot</p>
              <p className="font-semibold tabular-nums text-primary text-sm">
                {fmtRange(range.min, range.max)}
              </p>
            </div>
          </div>
        ) : (
          <p className="font-semibold tabular-nums">{fmtRange(range.min, range.max)}</p>
        )}
        <ConfidencePill range={range} />
      </CardContent>
    </Card>
  );
}

// Global reference window stat (card in §3) — uses "Success Range" and "Sweet Spot"
function WindowStat({ icon: Icon, label, range, unit, showDualWindow }: { icon: React.ElementType; label: string; range: RangeVal; unit: string; showDualWindow?: boolean }) {
  const showOp = showDualWindow && (range.operationalMin !== range.min || range.operationalMax !== range.max);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <p className="text-xs">{label}</p>
        </div>
        {showOp ? (
          <div className="space-y-1.5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Success Range</p>
              <p className="font-bold tabular-nums text-base">
                {range.operationalMin === range.operationalMax
                  ? `${range.operationalMin}${unit}`
                  : `${range.operationalMin}${unit} – ${range.operationalMax}${unit}`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sweet Spot</p>
              <p className="font-semibold tabular-nums text-sm text-primary">
                {range.min === range.max
                  ? `${range.min}${unit}`
                  : `${range.min}${unit} – ${range.max}${unit}`}
              </p>
            </div>
          </div>
        ) : (
          <p className="font-bold tabular-nums text-base">
            {range.min === range.max
              ? `${range.min}${unit}`
              : `${range.min}${unit} – ${range.max}${unit}`}
          </p>
        )}
        <ConfidencePill range={range} />
      </CardContent>
    </Card>
  );
}

function DirectionBadge({ direction }: { direction: "coarser" | "finer" | "stable" | null }) {
  if (direction === "coarser") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-sm font-medium">
      <TrendingUp className="h-3.5 w-3.5" />Coarser
    </span>
  );
  if (direction === "finer") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-sm font-medium">
      <TrendingDown className="h-3.5 w-3.5" />Finer
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
      <Minus className="h-3.5 w-3.5" />Stable
    </span>
  );
}

function TodaysBriefCard({ brief }: { brief: NonNullable<Intelligence["todaysBrief"]> }) {
  const topItem = brief.topWatchlistItem;
  const topItemConfig = topItem ? {
    success: { icon: CheckCircle2, class: "text-green-600 dark:text-green-400" },
    warning: { icon: AlertTriangle, class: "text-amber-600 dark:text-amber-400" },
    info: { icon: Info, class: "text-muted-foreground" },
  }[topItem.type] : null;

  const phaseColour =
    brief.bagConfidence === "High" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
    : brief.bagConfidence === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
    : "bg-muted text-muted-foreground";

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-4 space-y-3">
        {/* Bean + days + bag phase */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{brief.beanName}</span>
          {brief.openDays != null && (
            <Badge variant="outline" className="text-xs font-normal">
              {brief.openDays}d open
            </Badge>
          )}
          {brief.bagPhase && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", phaseColour)}>
              {brief.bagPhase} · {brief.bagConfidence} Confidence
            </span>
          )}
        </div>

        {/* Pill stats */}
        <div className="flex flex-wrap gap-2">
          {brief.bestYieldWindow && (
            <div className="inline-flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5 text-xs">
              <Droplets className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Yield</span>
              <span className="font-semibold tabular-nums">
                {brief.bestYieldWindow.min === brief.bestYieldWindow.max
                  ? `${brief.bestYieldWindow.min}g`
                  : `${brief.bestYieldWindow.min}–${brief.bestYieldWindow.max}g`}
              </span>
            </div>
          )}
          {brief.bestPourDelayWindow && (
            <div className="inline-flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5 text-xs">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Delay</span>
              <span className="font-semibold tabular-nums">
                {brief.bestPourDelayWindow.min === brief.bestPourDelayWindow.max
                  ? `${brief.bestPourDelayWindow.min}s`
                  : `${brief.bestPourDelayWindow.min}–${brief.bestPourDelayWindow.max}s`}
              </span>
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5 text-xs">
            <Gauge className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{brief.grindTrend}</span>
          </div>
        </div>

        {/* Top watchlist item */}
        {topItem && topItemConfig && (
          <div className="flex items-start gap-2 border-t pt-2">
            {React.createElement(topItemConfig.icon, {
              className: cn("h-3.5 w-3.5 mt-0.5 shrink-0", topItemConfig.class),
            })}
            <p className="text-xs text-muted-foreground leading-relaxed">{topItem.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const config = {
    success: { icon: CheckCircle2, class: "text-green-600 dark:text-green-400", bg: "bg-green-50/50 dark:bg-green-950/20 border-green-200/50" },
    warning: { icon: AlertTriangle, class: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50" },
    info: { icon: Info, class: "text-muted-foreground", bg: "bg-muted/30 border-border/50" },
  }[item.type];
  const Icon = config.icon;
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", config.bg)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.class)} />
        <p className="text-sm">{item.message}</p>
      </div>
      {item.type === "warning" && item.suggestedChecks && item.suggestedChecks.length > 0 && (
        <ul className="mt-1.5 ml-6 space-y-0.5">
          {item.suggestedChecks.map((check, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
              {check}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Shot Comparison Card ──────────────────────────────────────────────────────

type MetricRow = {
  label: string;
  latestVal: number | null;
  refVal: number | null;
  unit: string;
  decimals: number;
};

function deltaStatus(pct: number | null): "on-target" | "close" | "off" | "none" {
  if (pct == null) return "none";
  const abs = Math.abs(pct);
  if (abs <= 10) return "on-target";
  if (abs <= 20) return "close";
  return "off";
}

function deltaStatusLabel(status: ReturnType<typeof deltaStatus>): string {
  return status === "on-target" ? "Within 10%"
    : status === "close" ? "Within 20%"
    : status === "off" ? "Outside 20%"
    : "No comparison";
}

function DeltaStatusMarker({ status }: { status: ReturnType<typeof deltaStatus> }) {
  return (
    <span
      role="img"
      aria-label={deltaStatusLabel(status)}
      title={deltaStatusLabel(status)}
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full shrink-0 border border-current/40",
        status === "on-target" && "bg-green-500 text-green-700 dark:text-green-300",
        status === "close" && "bg-amber-500 text-amber-700 dark:text-amber-300",
        status === "off" && "bg-destructive text-destructive",
        status === "none" && "bg-muted-foreground/30 text-muted-foreground/40",
      )}
      style={
        status === "close"
          ? {
              backgroundImage: "repeating-linear-gradient(135deg, transparent 0 2px, rgba(0,0,0,.38) 2px 4px)",
            }
          : status === "off"
            ? {
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent 0 2px, rgba(255,255,255,.55) 2px 4px), repeating-linear-gradient(135deg, transparent 0 2px, rgba(0,0,0,.35) 2px 4px)",
              }
            : undefined
      }
    />
  );
}

function BestShotRecipeCard({
  shot,
}: {
  shot: NonNullable<NonNullable<Intelligence["bagIntelligence"]>["bestShot"]>;
}) {
  const targetDose = shot.targetDose ?? 18;
  const doseDiffersFromTarget = shot.dose != null && Math.abs(shot.dose - targetDose) >= 0.05;
  const hasDoseCorrection =
    doseDiffersFromTarget ||
    (shot.initialGrindWeight != null && Math.abs(shot.initialGrindWeight - targetDose) >= 0.05) ||
    (shot.overGrindRemoved != null && Math.abs(shot.overGrindRemoved) >= 0.05) ||
    (shot.topUpGrind != null && Math.abs(shot.topUpGrind) >= 0.05);

  const fmt = (value: number | null, unit = "", digits = 1) =>
    value == null ? null : `${Number(value).toFixed(digits).replace(/\.0$/, "")}${unit}`;
  const ratio = shot.ratio == null ? null : Number(shot.ratio).toFixed(2);

  return (
    <div className="rounded-lg border px-3 py-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs text-muted-foreground">Best shot · Repeat this shot</p>
            {shot.signatureShot && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Signature
              </span>
            )}
            {shot.isReference && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Reference
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{format(new Date(shot.shotDate), "d MMM yyyy")}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 text-amber-600 font-bold text-lg">
            <Star className="h-4 w-4 fill-current" />
            {shot.rating != null ? Number(shot.rating).toFixed(2) : "—"}
          </div>
          {shot.preferenceRating != null && (
            <p className="text-[10px] text-muted-foreground">pref {Number(shot.preferenceRating).toFixed(2)}</p>
          )}
        </div>
      </div>

      <div className="grid gap-1 text-sm tabular-nums">
        <p className="font-medium">
          {shot.grindSetting != null && <><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Grind Setting</span> {shot.grindSetting}</>}
          {shot.grindSetting != null && shot.grindTime != null && " · "}
          {shot.grindTime != null && <><span className="text-[10px] uppercase tracking-wide text-muted-foreground">Grind Time</span> {fmt(shot.grindTime, "s")}</>}
        </p>
        <p className="text-muted-foreground">
          {shot.pourDelay != null && <><span className="text-[10px] uppercase tracking-wide">Delay</span> {fmt(shot.pourDelay, "s")}</>}
          {shot.pourDelay != null && shot.pourTime != null && " · "}
          {shot.pourTime != null && <><span className="text-[10px] uppercase tracking-wide">Pour</span> {fmt(shot.pourTime, "s")}</>}
          {(shot.pourDelay != null || shot.pourTime != null) && shot.flowTime != null && " · "}
          {shot.flowTime != null && <><span className="text-[10px] uppercase tracking-wide">Flow</span> {fmt(shot.flowTime, "s")}</>}
        </p>
        <p className="text-muted-foreground">
          {shot.yield != null && <><span className="text-[10px] uppercase tracking-wide">Yield</span> {fmt(shot.yield, "g")}</>}
          {shot.yield != null && ratio && " · "}
          {ratio && <><span className="text-[10px] uppercase tracking-wide">Ratio</span> {ratio}</>}
        </p>
      </div>

      {hasDoseCorrection && (
        <p className="rounded-md bg-background/70 px-2 py-1.5 text-xs text-muted-foreground tabular-nums">
          <span className="uppercase tracking-wide">Dose Detail:</span>
          {shot.initialGrindWeight != null && <> <span className="uppercase tracking-wide">Initial</span> {fmt(shot.initialGrindWeight, "g")}</>}
          {shot.dose != null && <> → <span className="uppercase tracking-wide">Basket</span> {fmt(shot.dose, "g")}</>}
          {shot.overGrindRemoved != null && Math.abs(shot.overGrindRemoved) >= 0.05 && <> · <span className="uppercase tracking-wide">Removed</span> {fmt(shot.overGrindRemoved, "g")}</>}
          {shot.topUpGrind != null && Math.abs(shot.topUpGrind) >= 0.05 && <> · <span className="uppercase tracking-wide">Top-Up Added</span> {fmt(shot.topUpGrind, "g")}</>}
        </p>
      )}
    </div>
  );
}

function ShotComparisonCard({ data, beanName }: { data: ShotComparison; beanName: string | null }) {
  const s = data.latestShot;
  const r = data.bagReference;

  const metrics: MetricRow[] = [
    { label: "First Pour Delay", latestVal: s?.pourDelay ?? null, refVal: r?.avgPourDelay ?? null, unit: "s", decimals: 1 },
    { label: "Pour Time",        latestVal: s?.pourTime ?? null,  refVal: r?.avgPourTime ?? null,  unit: "s", decimals: 1 },
    { label: "Flow Time",        latestVal: s?.flowTime ?? null, refVal: r?.avgFlowTime ?? null, unit: "s", decimals: 1 },
    { label: "Yield",            latestVal: s?.yield ?? null,     refVal: r?.avgYield ?? null,     unit: "g", decimals: 1 },
    { label: "Ratio",            latestVal: s?.ratio ?? null,     refVal: r?.avgRatio ?? null,     unit: "×", decimals: 2 },
  ];

  const hasAnyLatest = metrics.some((m) => m.latestVal != null);
  const hasAnyRef    = metrics.some((m) => m.refVal != null);

  const deltaCls = (status: ReturnType<typeof deltaStatus>) =>
    status === "on-target" ? "text-green-600 dark:text-green-400" :
    status === "close"     ? "text-amber-600 dark:text-amber-400" :
    status === "off"       ? "text-destructive" : "text-muted-foreground";

  if (!s && !r) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No shots logged for this bag yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">

        {/* Source + confidence */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            {r ? (
              <>Reference source: <span className="font-medium text-foreground">{r.source}</span>
              <span className="text-muted-foreground"> · {r.refCount} shot{r.refCount !== 1 ? "s" : ""}</span></>
            ) : (
              "No reference data — log reference shots to enable comparison."
            )}
          </p>
          {r && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
              r.confidence === "High" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              : r.confidence === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
            )}>
              {r.confidence} confidence
            </span>
          )}
        </div>

        {/* Low confidence notice */}
        {r && r.confidence === "Low" && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Limited reference data — {r.refCount} shot{r.refCount !== 1 ? "s" : ""}. Mark more Dialed In shots as reference to improve accuracy.
          </div>
        )}

        {/* Latest shot context */}
        {s && (
          <p className="text-xs text-muted-foreground">
            Latest shot: {format(new Date(s.shotDate), "d MMM yyyy")}
            {s.dose != null && <> · {s.dose}g dose</>}
            {beanName && <> · {beanName}</>}
          </p>
        )}

        {/* Metric comparison table */}
        {(hasAnyLatest || hasAnyRef) ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[280px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left pb-2 font-medium pl-1 w-[40%]">Metric</th>
                  <th className="text-right pb-2 font-medium pr-3">Latest</th>
                  <th className="text-right pb-2 font-medium pr-3">Reference</th>
                  <th className="text-right pb-2 font-medium pr-2">Δ</th>
                  <th className="w-5 pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {metrics.map((m) => {
                  const delta = m.latestVal != null && m.refVal != null
                    ? m.latestVal - m.refVal : null;
                  const pct = delta != null && m.refVal != null && m.refVal !== 0
                    ? (delta / m.refVal) * 100 : null;
                  const status = deltaStatus(pct);
                  const fmt = (v: number) => `${v.toFixed(m.decimals)}${m.unit}`;

                  return (
                    <tr key={m.label} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2 pl-1 text-muted-foreground text-xs">{m.label}</td>
                      <td className="py-2 pr-3 text-right font-semibold tabular-nums text-xs">
                        {m.latestVal != null ? fmt(m.latestVal) : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-xs text-muted-foreground">
                        {m.refVal != null ? fmt(m.refVal) : "—"}
                      </td>
                      <td className={cn("py-2 pr-2 text-right tabular-nums text-xs font-medium", deltaCls(status))}>
                        {delta != null
                          ? `${delta >= 0 ? "+" : ""}${delta.toFixed(m.decimals)}${m.unit}`
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="py-2 text-center">
                        <DeltaStatusMarker status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No timing data recorded on the latest shot.
          </p>
        )}

        {/* Legend */}
        {hasAnyLatest && hasAnyRef && (
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground pt-1 border-t">
            <span className="flex items-center gap-1"><DeltaStatusMarker status="on-target" /> Within 10%</span>
            <span className="flex items-center gap-1"><DeltaStatusMarker status="close" /> Within 20%</span>
            <span className="flex items-center gap-1"><DeltaStatusMarker status="off" /> Outside 20%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
