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
  count: number;
  outliersRemoved: number;
  confidence: "Low" | "Medium" | "High";
}

interface WatchlistItem {
  type: "success" | "warning" | "info";
  message: string;
  suggestedChecks?: string[];
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
    totalShots: number; referenceShots: number;
    avgRating: number | null; avgPrefRating: number | null;
    bestRating: number | null; last3Avg: number | null;
    referenceRate: number | null;
    signatureShotCount: number | null;
    dialInSpeed: number | null;
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
  watchlist: WatchlistItem[];
  todaysBrief: {
    beanName: string;
    openDays: number | null;
    bestYieldWindow: { min: number; max: number } | null;
    bestPourDelayWindow: { min: number; max: number } | null;
    grindTrend: string;
    topWatchlistItem: { type: "success" | "warning" | "info"; message: string } | null;
  } | null;
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

      {/* ── Sections: Bag Intelligence + Grind Journey ────────────────────────── */}
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
                    <IntelStat
                      label="Reference rate"
                      value={bi.referenceRate != null ? `${bi.referenceRate}%` : "—"}
                      accent={bi.referenceRate != null && bi.referenceRate >= 20}
                    />
                    <IntelStat
                      label="Signature shots (pref ≥ 9)"
                      value={bi.signatureShotCount != null ? String(bi.signatureShotCount) : "—"}
                      accent={bi.signatureShotCount != null && bi.signatureShotCount > 0}
                    />
                  </div>

                  {bi.bestYieldRange && (
                    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Best yield range (rated 8+)</p>
                      <p className="font-semibold tabular-nums">
                        {bi.bestYieldRange.min === bi.bestYieldRange.max
                          ? `${bi.bestYieldRange.min}g`
                          : `${bi.bestYieldRange.min}g – ${bi.bestYieldRange.max}g`}
                      </p>
                      <ConfidencePill range={bi.bestYieldRange} />
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
                      <ConfidencePill range={bi.bestPourDelayRange} />
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

          {/* Grind Journey */}
          <section className="flex flex-col gap-3">
            <SectionLabel>Grind Journey</SectionLabel>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <Card className="flex-1">
                <CardContent className="p-5 space-y-4">
                  {!gd ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Log shots with grind settings to see your grind journey.</p>
                  ) : (
                    <>
                      {/* Start → Current arc */}
                      <div className="flex items-center justify-center gap-3 py-2">
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

                      {/* Net change + direction + days open */}
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        {gd.drift != null && (
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Net change</p>
                            <p className={cn("text-base font-bold tabular-nums",
                              gd.direction === "coarser" ? "text-amber-600" :
                              gd.direction === "finer" ? "text-blue-600" : "text-muted-foreground")}>
                              {gd.drift > 0 ? "+" : ""}{gd.drift.toFixed(3)}
                            </p>
                          </div>
                        )}
                        <DirectionBadge direction={gd.direction} />
                        {bag?.openDays != null && (
                          <div className="text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Days open</p>
                            <p className={cn("text-base font-bold tabular-nums",
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

      {/* ── Today's Coffee Brief ───────────────────────────────────────────── */}
      {intel?.todaysBrief && (
        <section>
          <SectionLabel>Today's Coffee Brief</SectionLabel>
          <TodaysBriefCard brief={intel.todaysBrief} />
        </section>
      )}

      {/* ── Watchlist ──────────────────────────────────────────────────────── */}
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

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-4 space-y-3">
        {/* Bean + days */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{brief.beanName}</span>
          {brief.openDays != null && (
            <Badge variant="outline" className="text-xs font-normal">
              {brief.openDays}d open
            </Badge>
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
