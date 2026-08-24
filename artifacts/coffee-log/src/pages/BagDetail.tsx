import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Save, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { displaySelectorValue } from "@/lib/selector-options";

interface Shot {
  id: number; shotDate: string; dose: number | null; yield: number | null;
  pourTime: number | null; pourDelay: number | null; grindSetting: number | null;
  rating: number | null; preferenceRating: number | null; isReference: boolean;
  status: string | null; faultStatus: string | null; notes: string | null;
}

interface BagDetailResponse {
  bag: {
    id: number; beanId: number | null; beanName: string | null; beanOrigin: string | null;
    beanRoaster: string | null; beanRoastLevel: string | null; beanProcess: string | null;
    bagNumber: string | null; openedDate: string | null; isActive: boolean;
    startGrindSetting: number | null; currentGrindSetting: number | null;
    startGrindTime: number | null; currentGrindTime: number | null;
    defaultDose: number | null; defaultYield: number | null; defaultTemp: number | null;
    dialInNotes: string | null; notes: string | null;
  };
  analysis: {
    totalShots: number; referenceShots: number; ratedShots: number; avgRating: number | null;
    dailyDriverShots: number; dailyDriverRate: number | null;
    avgDose: number | null; avgYield: number | null; avgPourTime: number | null;
    grindRange: { min: number; max: number } | null;
    statusBreakdown: Record<string, number>;
    earliestDate: string | null; latestDate: string | null;
  };
  referenceShots: Shot[];
  bestRated: Shot[];
  shots: Shot[];
}

function fetchBagDetail(id: string): Promise<BagDetailResponse> {
  return fetch(`/api/bags/${id}`).then((r) => r.json());
}

export default function BagDetail() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["bag-detail", params.id],
    queryFn: () => fetchBagDetail(params.id!),
    enabled: !!params.id,
  });

  const [editingDefaults, setEditingDefaults] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, string>>({});

  const startEditDefaults = () => {
    if (!data) return;
    const b = data.bag;
    setDefaults({
      currentGrindSetting: String(b.currentGrindSetting ?? ""),
      currentGrindTime: String(b.currentGrindTime ?? ""),
      defaultDose: String(b.defaultDose ?? ""),
      defaultYield: String(b.defaultYield ?? ""),
      defaultTemp: String(b.defaultTemp ?? ""),
      dialInNotes: b.dialInNotes ?? "",
    });
    setEditingDefaults(true);
  };

  const saveDefaultsMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(defaults)) {
        if (v === "") continue;
        if (k === "dialInNotes") body[k] = v;
        else if (k === "defaultTemp") body[k] = parseInt(v, 10);
        else body[k] = parseFloat(v);
      }
      const r = await fetch(`/api/bags/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bag-detail", params.id] }); qc.invalidateQueries({ queryKey: ["bags"] }); setEditingDefaults(false); toast({ title: "Defaults updated" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const set = (k: string, v: string) => setDefaults((d) => ({ ...d, [k]: v }));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!data || "error" in data) {
    return <div className="text-center py-16 text-muted-foreground">Bag not found.</div>;
  }

  const { bag, analysis, referenceShots, bestRated, shots } = data;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/bags"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{bag.beanName ?? "Unknown Bean"}</h1>
            <Badge variant="outline">Bag #{bag.bagNumber ?? bag.id}</Badge>
            {bag.isActive && <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-muted-foreground">
            {bag.beanOrigin && <span>{bag.beanOrigin}</span>}
            {bag.beanRoaster && <span>· {bag.beanRoaster}</span>}
            {bag.beanRoastLevel && <Badge variant="secondary" className="text-xs">{bag.beanRoastLevel}</Badge>}
            {bag.beanProcess && <Badge variant="secondary" className="text-xs">{bag.beanProcess}</Badge>}
            {bag.openedDate && <span>Opened {bag.openedDate}</span>}
          </div>
        </div>
      </div>

      {/* Analysis cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Shots" value={analysis.totalShots} />
        <StatCard label="Reference Shots" value={analysis.referenceShots} />
        <StatCard
          label="Daily Drivers"
          value={analysis.dailyDriverRate != null ? `${analysis.dailyDriverShots} (${analysis.dailyDriverRate}%)` : analysis.dailyDriverShots}
          highlight={analysis.dailyDriverShots > 0}
        />
        <StatCard label="Avg Rating" value={analysis.avgRating != null ? Number(analysis.avgRating).toFixed(1) : "—"} highlight={analysis.avgRating != null && analysis.avgRating >= 7} />
        <StatCard label="Rated Shots" value={analysis.ratedShots} />
        <StatCard label="Avg Dose" value={analysis.avgDose != null ? `${analysis.avgDose}g` : "—"} />
        <StatCard label="Avg Yield" value={analysis.avgYield != null ? `${analysis.avgYield}g` : "—"} />
        <StatCard label="Avg Pour Time" value={analysis.avgPourTime != null ? `${analysis.avgPourTime}s` : "—"} />
        <StatCard
          label="Grind Range"
          value={analysis.grindRange ? `${analysis.grindRange.min}–${analysis.grindRange.max}` : "—"}
        />
      </div>

      {/* Date range + status breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Date Range</CardTitle></CardHeader>
          <CardContent>
            {analysis.earliestDate && analysis.latestDate ? (
              <p className="text-sm">
                {format(new Date(analysis.earliestDate), "MMM d, yyyy")} — {format(new Date(analysis.latestDate), "MMM d, yyyy")}
              </p>
            ) : <p className="text-sm text-muted-foreground">No shots yet</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analysis.statusBreakdown).sort(([,a],[,b]) => b - a).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">{status}</Badge>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              ))}
              {Object.keys(analysis.statusBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground">No status data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bag Defaults */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bag Defaults</CardTitle>
              <CardDescription>Auto-filled when this bag is selected for a new shot.</CardDescription>
            </div>
            {!editingDefaults ? (
              <Button variant="outline" size="sm" onClick={startEditDefaults}>Edit Defaults</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingDefaults(false)}>Cancel</Button>
                <Button size="sm" className="gap-1" onClick={() => saveDefaultsMutation.mutate()} disabled={saveDefaultsMutation.isPending}>
                  <Save className="h-3.5 w-3.5" />{saveDefaultsMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingDefaults ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { key: "currentGrindSetting", label: "Current Grind Setting", step: "0.01" },
                { key: "currentGrindTime", label: "Grind Time (sec)", step: "0.1" },
                { key: "defaultDose", label: "Dose (g)", step: "0.1" },
                { key: "defaultYield", label: "Yield (g)", step: "0.1" },
                { key: "defaultTemp", label: "Temp (°C)", step: "1" },
              ].map(({ key, label, step }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm">{label}</Label>
                  <Input type="number" step={step} value={defaults[key]} onChange={(e) => set(key, e.target.value)} />
                </div>
              ))}
              <div className="col-span-2 sm:col-span-3 space-y-1.5">
                <Label className="text-sm">Dial-in Notes</Label>
                <Input value={defaults.dialInNotes} onChange={(e) => set("dialInNotes", e.target.value)} placeholder="Key observations…" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {[
                ["Grind Setting", bag.currentGrindSetting],
                ["Grind Time", bag.currentGrindTime != null ? `${bag.currentGrindTime}s` : null],
                ["Dose", bag.defaultDose != null ? `${bag.defaultDose}g` : null],
                ["Yield", bag.defaultYield != null ? `${bag.defaultYield}g` : null],
                ["Temperature", bag.defaultTemp != null ? `${bag.defaultTemp}°C` : null],
              ].map(([label, val]) => (
                <div key={label as string} className="flex gap-1.5">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-medium">{val ?? <span className="text-muted-foreground italic">not set</span>}</span>
                </div>
              ))}
              {bag.dialInNotes && (
                <div className="col-span-2 sm:col-span-3 flex gap-1.5">
                  <span className="text-muted-foreground shrink-0">Dial-in notes:</span>
                  <span className="font-medium">{bag.dialInNotes}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Shots */}
      {referenceShots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-primary" /> Reference Shots
            </CardTitle>
            <CardDescription>Dialed-in benchmarks for this bag.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referenceShots.map((s) => <ShotRow key={s.id} shot={s} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Rated */}
      {bestRated.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Best Rated Shots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bestRated.map((s) => <ShotRow key={s.id} shot={s} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Shots */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Shot History</CardTitle>
          <CardDescription>{shots.length} most recent shots for this bag.</CardDescription>
        </CardHeader>
        <CardContent>
          {shots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shots linked to this bag yet.</p>
          ) : (
            <div className="space-y-2">
              {shots.map((s) => <ShotRow key={s.id} shot={s} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={cn("text-2xl font-bold", highlight && "text-amber-600")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ShotRow({ shot }: { shot: Shot }) {
  return (
    <Link href={`/shots/${shot.id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              {shot.shotDate ? format(new Date(shot.shotDate), "MMM d, yyyy h:mma") : "—"}
            </span>
            {shot.status && <Badge variant="outline" className="text-xs">{displaySelectorValue(shot.status)}</Badge>}
            {shot.isReference && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">REF</Badge>}
          </div>
          <span className="font-mono text-sm text-muted-foreground">
            {shot.dose != null ? `${shot.dose}g` : "—"} → {shot.yield != null ? `${shot.yield}g` : "—"} · {shot.pourTime != null ? `${shot.pourTime}s` : "—"} · grind {shot.grindSetting ?? "—"}
          </span>
        </div>
        {shot.rating != null && (
          <span className="flex items-center gap-1 text-amber-600 font-medium text-sm shrink-0">
            <Star className="h-3.5 w-3.5 fill-current" />{shot.rating}
          </span>
        )}
      </div>
    </Link>
  );
}
