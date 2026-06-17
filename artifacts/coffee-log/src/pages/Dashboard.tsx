import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coffee, Plus, Star, Target, AlertTriangle,
  CheckCircle2, Info, TrendingUp, TrendingDown,
  Minus, Thermometer, Gauge, Timer, Scale,
  Clock, Package, Wrench, Droplets,
} from "lucide-react";
import { format } from "date-fns";
import {
  useGetRecentShots,
  useGetBestRatedShots,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface RangeVal { min: number; max: number }

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
    totalShots: number; referenceShots: number;
    avgRating: number | null; avgPrefRating: number | null;
    bestRating: number | null; last3Avg: number | null;
    bestYieldRange: RangeVal | null; bestPourDelayRange: RangeVal | null;
    bestShot: { id: number; rating: number | null; dose: number | null; yield: number | null; grindSetting: number | null; pourTime: number | null; shotDate: string } | null;
  } | null;
  bagProgress: {
    startingWeight: number | null; consumed: number; remaining: number | null;
    avgDose: number | null; estimatedShotsRemaining: number | null; completionPct: number | null;
  } | null;
  timingWindows: {
    dataSource: "current_bag" | "same_bean" | "all_reference"; shotCount: number;
    yieldRange: RangeVal | null; pourTimeRange: RangeVal | null;
    scaleTimeRange: RangeVal | null; pourDelayRange: RangeVal | null;
  } | null;
  grindDrift: {
    startSetting: number | null; startTime: number | null;
    currentSetting: number | null; currentTime: number | null;
    earlyAvg: number | null; recentAvg: number | null;
    drift: number | null; direction: "coarser" | "finer" | "stable" | null;
    previousBagAvg: number | null; shotCount: number;
  } | null;
  bagComparison: {
    bagId: number | null; bagNumber: string | null; beanName: string | null;
    shotCount: number; avgGrind: number | null; firstGrind: number | null;
    lastGrind: number | null; totalAdjustment: number | null;
    openDays: number | null; refCount: number; bestRating: number | null;
    isActive: boolean;
  }[];
  watchlist: { type: "success" | "warning" | "info"; message: string }[];
  totalShots: number;
  referenceShots: number;
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
  const { data: recentShots, isLoading: isLoadingRecent } = useGetRecentShots({ limit: "5" });
  const { data: bestShots, isLoading: isLoadingBest } = useGetBestRatedShots({ limit: "5" });

  const bag = intel?.activeBag;
  const bi = intel?.bagIntelligence;
  const gd = intel?.grindDrift;
  const bp = intel?.bagProgress;
  const tw = intel?.timingWindows;

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

      {/* ── Section 1: Current Baseline ──────────────────────────────────────── */}
      <section>
        <SectionLabel>Current Baseline</SectionLabel>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
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
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-5">
              {/* Identity row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold">{bag.beanName ?? "Unknown Bean"}</span>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                      Bag #{bag.bagNumber ?? bag.id}
                    </Badge>
                    {bag.bagName && <span className="text-sm text-muted-foreground">{bag.bagName}</span>}
                  </div>
                  {bag.beanOrigin && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {bag.beanOrigin}
                      {bag.beanProcess && ` · ${bag.beanProcess}`}
                      {bag.beanRoastLevel && ` · ${bag.beanRoastLevel}`}
                    </p>
                  )}
                  {bag.beanRoaster && (
                    <p className="text-xs text-muted-foreground">{bag.beanRoaster}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs">
                    {bag.openDays != null && (
                      <span className={cn("font-medium", bag.openDays >= 28 ? "text-destructive" : bag.openDays >= 21 ? "text-amber-600" : "text-muted-foreground")}>
                        Open {bag.openDays} day{bag.openDays !== 1 ? "s" : ""}
                        {bag.openedDate ? ` (since ${format(new Date(bag.openedDate), "d MMM")})` : ""}
                      </span>
                    )}
                    {bag.roastAge != null && (
                      <span className="text-muted-foreground">Roast age {bag.roastAge}d</span>
                    )}
                    {bag.roastDate && (
                      <span className="text-muted-foreground">Roasted {format(new Date(bag.roastDate), "d MMM yyyy")}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href={`/bags/${bag.id}`}>View bag →</Link>
                </Button>
              </div>

              {/* Recipe grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <RecipeStat icon={Coffee} label="Dose" value={bag.defaultDose != null ? `${bag.defaultDose}g` : "—"} />
                <RecipeStat icon={Droplets} label="Yield" value={bag.defaultYield != null ? `${bag.defaultYield}g` : "—"} />
                <RecipeStat icon={Thermometer} label="Temp" value={bag.defaultTemp != null ? `${bag.defaultTemp}°C` : "—"} />
                <RecipeStat icon={Gauge} label="Grind" value={bag.currentGrindSetting != null ? String(bag.currentGrindSetting) : "—"} highlight />
                <RecipeStat icon={Timer} label="Grind Time" value={bag.currentGrindTime != null ? `${bag.currentGrindTime}s` : "—"} />
                <RecipeStat icon={Target} label="Shots" value={String(bag.shotCount)} />
              </div>

              {/* Equipment row */}
              {(bag.grinder || bag.machine || bag.basket) && (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                  {bag.machine && <span className="flex items-center gap-1"><Coffee className="h-3 w-3" />{bag.machine}</span>}
                  {bag.grinder && <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{bag.grinder}</span>}
                  {bag.basket && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{bag.basket}</span>}
                  {bag.usePuckScreen && (
                    <span className="flex items-center gap-1 text-primary/80">
                      <Scale className="h-3 w-3" />Puck screen{bag.puckScreen ? ` (${bag.puckScreen})` : ""}
                    </span>
                  )}
                </div>
              )}

              {bag.dialInNotes && (
                <p className="mt-3 text-xs text-muted-foreground border-t pt-3 italic">
                  Dial-in: {bag.dialInNotes}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Bag Progress ─────────────────────────────────────────────────────── */}
      {bp && (bp.startingWeight || bp.consumed > 0) && (
        <section>
          <SectionLabel>Bag Progress</SectionLabel>
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {bp.startingWeight != null && (
                  <IntelStat label="Starting weight" value={`${bp.startingWeight}g`} icon={Package} />
                )}
                <IntelStat label="Consumed" value={`${bp.consumed}g`} />
                {bp.remaining != null && (
                  <IntelStat label="Remaining" value={`${bp.remaining.toFixed(1)}g`} accent />
                )}
                {bp.estimatedShotsRemaining != null && (
                  <IntelStat
                    label="Shots left (est.)"
                    value={String(bp.estimatedShotsRemaining)}
                    dim={bp.estimatedShotsRemaining <= 5}
                  />
                )}
              </div>
              {bp.completionPct != null && (
                <div>
                  <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                    <span>Bag used</span>
                    <span className="font-medium tabular-nums">{bp.completionPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", bp.completionPct >= 85 ? "bg-destructive" : bp.completionPct >= 65 ? "bg-amber-500" : "bg-primary")}
                      style={{ width: `${Math.min(100, bp.completionPct)}%` }}
                    />
                  </div>
                </div>
              )}
              {bp.avgDose && (
                <p className="text-xs text-muted-foreground mt-2">
                  Avg dose {bp.avgDose}g · {bp.consumed > 0 ? `${Math.round(bp.consumed / bp.avgDose)} shots` : "no shots"} worth consumed
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Sections: Bag Intelligence + Grind Drift ─────────────────────────── */}
      {(bi || gd) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Bag Intelligence */}
          <section className="flex flex-col gap-3">
            <SectionLabel>Current Bag Intelligence</SectionLabel>
            {isLoading ? <Skeleton className="h-52 w-full" /> : bi ? (
              <Card className="flex-1">
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <IntelStat label="Shots" value={String(bi.totalShots)} />
                    <IntelStat label="Reference shots" value={String(bi.referenceShots)} accent={bi.referenceShots > 0} />
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
                  </div>

                  {bi.bestYieldRange && (
                    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Best yield range (rated 8+)</p>
                      <p className="font-semibold tabular-nums">
                        {bi.bestYieldRange.min === bi.bestYieldRange.max
                          ? `${bi.bestYieldRange.min}g`
                          : `${bi.bestYieldRange.min}g – ${bi.bestYieldRange.max}g`}
                      </p>
                    </div>
                  )}

                  {bi.bestPourDelayRange && (
                    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Best first pour delay (rated 8+)</p>
                      <p className="font-semibold tabular-nums">
                        {bi.bestPourDelayRange.min === bi.bestPourDelayRange.max
                          ? `${bi.bestPourDelayRange.min}s`
                          : `${bi.bestPourDelayRange.min}s – ${bi.bestPourDelayRange.max}s`}
                      </p>
                    </div>
                  )}

                  {bi.bestShot && (
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Best shot</p>
                        <p className="text-sm font-medium tabular-nums">
                          {bi.bestShot.dose}g → {bi.bestShot.yield}g
                          {bi.bestShot.grindSetting != null && ` · ⚙${bi.bestShot.grindSetting}`}
                          {bi.bestShot.pourTime != null && ` · ${bi.bestShot.pourTime}s`}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(new Date(bi.bestShot.shotDate), "d MMM yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600 font-bold text-lg shrink-0">
                        <Star className="h-4 w-4 fill-current" />
                        {Number(bi.bestShot.rating).toFixed(2)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </section>

          {/* Grind Drift */}
          <section className="flex flex-col gap-3">
            <SectionLabel>Grind Drift Intelligence</SectionLabel>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <Card className="flex-1">
                <CardContent className="p-5 space-y-4">
                  {!gd ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Log shots with grind settings to see drift analysis.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <DriftIndicator direction={gd.direction} />
                        <div>
                          <p className="font-semibold capitalize">{gd.direction ?? "Stable"}</p>
                          <p className="text-xs text-muted-foreground">
                            {gd.drift != null && Math.abs(gd.drift) > 0.001
                              ? `${gd.drift > 0 ? "+" : ""}${gd.drift.toFixed(3)} from early shots`
                              : "No significant drift detected"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {gd.startSetting != null && <IntelStat label="Start setting" value={String(gd.startSetting)} />}
                        {gd.currentSetting != null && <IntelStat label="Current setting" value={String(gd.currentSetting)} highlight />}
                        {gd.startTime != null && <IntelStat label="Start grind time" value={`${gd.startTime}s`} />}
                        {gd.currentTime != null && <IntelStat label="Current grind time" value={`${gd.currentTime}s`} />}
                        {gd.earlyAvg != null && <IntelStat label="Early avg" value={String(gd.earlyAvg)} />}
                        {gd.recentAvg != null && <IntelStat label="Recent avg" value={String(gd.recentAvg)} />}
                      </div>

                      {gd.previousBagAvg != null && (
                        <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                          <p className="text-xs text-muted-foreground mb-0.5">Previous bags avg grind</p>
                          <p className="font-semibold tabular-nums">{gd.previousBagAvg.toFixed(3)}</p>
                          {gd.currentSetting != null && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {gd.currentSetting > gd.previousBagAvg
                                ? `This bag runs ${(gd.currentSetting - gd.previousBagAvg).toFixed(3)} coarser`
                                : gd.currentSetting < gd.previousBagAvg
                                ? `This bag runs ${(gd.previousBagAvg - gd.currentSetting).toFixed(3)} finer`
                                : "Same as previous bags"}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">Based on {gd.shotCount} shot{gd.shotCount !== 1 ? "s" : ""} with grind data</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}

      {/* ── Bag Comparison ─────────────────────────────────────────────────── */}
      {intel?.bagComparison && intel.bagComparison.length > 1 && (
        <section>
          <SectionLabel>Bag Comparison (Grind Drift)</SectionLabel>
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
                    <th className="px-3 py-3 text-right font-medium">Drift</th>
                    <th className="px-3 py-3 text-right font-medium">Best ★</th>
                    <th className="px-3 py-3 text-right font-medium">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {intel.bagComparison.map((b, i) => (
                    <tr key={i} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", b.isActive && "bg-primary/5")}>
                      <td className="px-4 py-3 font-medium">
                        Bag #{b.bagNumber ?? b.bagId}
                        {b.isActive && <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Active</Badge>}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground max-w-[120px] truncate">{b.beanName ?? "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{b.shotCount}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{b.firstGrind != null ? Number(b.firstGrind).toFixed(3) : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{b.lastGrind != null ? Number(b.lastGrind).toFixed(3) : "—"}</td>
                      <td className={cn("px-3 py-3 text-right tabular-nums font-medium",
                        b.totalAdjustment == null ? "text-muted-foreground" :
                        b.totalAdjustment > 0.05 ? "text-amber-600" :
                        b.totalAdjustment < -0.05 ? "text-blue-600" : "text-muted-foreground")}>
                        {b.totalAdjustment != null ? `${b.totalAdjustment > 0 ? "+" : ""}${b.totalAdjustment.toFixed(3)}` : "—"}
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
      )}

      {/* ── Timing Windows ─────────────────────────────────────────────────── */}
      {tw && (tw.yieldRange || tw.pourTimeRange || tw.scaleTimeRange || tw.pourDelayRange) && (
        <section>
          <SectionLabel>
            Best Performing Windows
            <span className="ml-2 text-[10px] font-normal normal-case text-muted-foreground">
              from {tw.shotCount} shot{tw.shotCount !== 1 ? "s" : ""}
              {tw.dataSource === "same_bean" ? " (same bean)" : tw.dataSource === "all_reference" ? " (all reference shots)" : " (this bag)"}
            </span>
          </SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tw.yieldRange && <WindowStat icon={Droplets} label="Yield" range={tw.yieldRange} unit="g" />}
            {tw.pourTimeRange && <WindowStat icon={Clock} label="Pour time" range={tw.pourTimeRange} unit="s" />}
            {tw.scaleTimeRange && <WindowStat icon={Timer} label="Scale time" range={tw.scaleTimeRange} unit="s" />}
            {tw.pourDelayRange && <WindowStat icon={Target} label="First pour delay" range={tw.pourDelayRange} unit="s" />}
          </div>
        </section>
      )}

      {/* ── Watchlist ──────────────────────────────────────────────────────── */}
      {intel?.watchlist && intel.watchlist.length > 0 && (
        <section>
          <SectionLabel>Next Shot Watchlist</SectionLabel>
          <Card>
            <CardContent className="p-4 space-y-2">
              {intel.watchlist.map((item, i) => (
                <WatchlistItem key={i} type={item.type} message={item.message} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Global counters ────────────────────────────────────────────────── */}
      {intel && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Coffee className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{intel.totalShots}</p>
                <p className="text-xs text-muted-foreground">Total shots</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{intel.referenceShots}</p>
                <p className="text-xs text-muted-foreground">Reference shots</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Recent + Best Rated ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel className="mb-0">Recent Shots</SectionLabel>
            <Button variant="ghost" size="sm" asChild><Link href="/shots">View all</Link></Button>
          </div>
          {isLoadingRecent
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            : !recentShots?.length
            ? <p className="text-sm text-muted-foreground italic">No shots logged yet.</p>
            : (recentShots as any[]).map((shot) => <ShotRow key={shot.id} shot={shot} />)
          }
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel className="mb-0">
              <Star className="h-3.5 w-3.5 inline-block text-amber-500 fill-amber-500 mr-1" />
              Best Rated
            </SectionLabel>
          </div>
          {isLoadingBest
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            : !bestShots?.length
            ? <p className="text-sm text-muted-foreground italic">No rated shots yet.</p>
            : (bestShots as any[]).map((shot) => <ShotRow key={shot.id} shot={shot} />)
          }
        </section>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1", className)}>
      {children}
    </h2>
  );
}

function RecipeStat({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg px-3 py-2.5 text-center", highlight ? "bg-primary/10 border border-primary/20" : "bg-background/60 border")}>
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", highlight ? "text-primary" : "text-muted-foreground")} />
      <p className={cn("text-base font-bold tabular-nums leading-tight", highlight && "text-primary")}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
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

function WindowStat({ icon: Icon, label, range, unit }: { icon: React.ElementType; label: string; range: RangeVal; unit: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <p className="text-xs">{label}</p>
        </div>
        <p className="font-bold tabular-nums text-base">
          {range.min === range.max
            ? `${range.min}${unit}`
            : `${range.min}${unit} – ${range.max}${unit}`}
        </p>
      </CardContent>
    </Card>
  );
}

function DriftIndicator({ direction }: { direction: "coarser" | "finer" | "stable" | null }) {
  if (direction === "coarser") return (
    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
      <TrendingUp className="h-5 w-5 text-amber-600" />
    </div>
  );
  if (direction === "finer") return (
    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
      <TrendingDown className="h-5 w-5 text-blue-600" />
    </div>
  );
  return (
    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
      <Minus className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function WatchlistItem({ type, message }: { type: "success" | "warning" | "info"; message: string }) {
  const config = {
    success: { icon: CheckCircle2, class: "text-green-600 dark:text-green-400", bg: "bg-green-50/50 dark:bg-green-950/20 border-green-200/50" },
    warning: { icon: AlertTriangle, class: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50" },
    info: { icon: Info, class: "text-muted-foreground", bg: "bg-muted/30 border-border/50" },
  }[type];
  const Icon = config.icon;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5", config.bg)}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.class)} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ShotRow({ shot }: { shot: any }) {
  return (
    <Link href={`/shots/${shot.id}`}>
      <Card className="hover:bg-accent/40 transition-colors cursor-pointer">
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{shot.bean || "Unknown"}</span>
              {shot.rating != null && (
                <span className="flex items-center gap-0.5 text-xs text-amber-600 font-semibold shrink-0">
                  <Star className="h-3 w-3 fill-current" />{Number(shot.rating).toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {shot.dose != null ? `${shot.dose}g` : "—"} → {shot.yield != null ? `${shot.yield}g` : "—"}
              {shot.pourTime != null ? ` · ${shot.pourTime}s` : ""}
              {shot.grindSetting != null ? ` · ⚙${shot.grindSetting}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0 space-y-1">
            <p className="text-xs text-muted-foreground">{format(new Date(shot.shotDate), "d MMM")}</p>
            {shot.status && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{shot.status}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
