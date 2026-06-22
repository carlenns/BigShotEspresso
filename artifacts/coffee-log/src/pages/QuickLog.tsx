import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useCreateShot, getListShotsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Zap, ArrowRight, Coffee, CheckCircle2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Field catalogue ──────────────────────────────────────────────────────────

export type QuickFieldId = "dose" | "pourDelay" | "yield" | "shotTime" | "rating" | "grindSetting" | "notes";

export const QUICK_LOG_FIELDS: {
  id: QuickFieldId;
  label: string;
  unit: string;
  dbKey: string;
  type: "number" | "integer" | "rating" | "text";
  defaultOn: boolean;
}[] = [
  { id: "dose",         label: "Dose",              unit: "g",   dbKey: "dose",         type: "number",  defaultOn: true  },
  { id: "pourDelay",    label: "First Pour Delay",  unit: "s",   dbKey: "pourDelay",    type: "integer", defaultOn: true  },
  { id: "yield",        label: "Yield",             unit: "g",   dbKey: "yield",        type: "number",  defaultOn: true  },
  { id: "shotTime",     label: "Shot Time",         unit: "s",   dbKey: "scaleTime",    type: "integer", defaultOn: true  },
  { id: "rating",       label: "Rating",            unit: "/10", dbKey: "rating",       type: "rating",  defaultOn: true  },
  { id: "grindSetting", label: "Grind Setting",     unit: "",    dbKey: "grindSetting", type: "number",  defaultOn: false },
  { id: "notes",        label: "Notes",             unit: "",    dbKey: "notes",        type: "text",    defaultOn: false },
];

export function getEnabledFieldIds(settings: Record<string, string>): QuickFieldId[] {
  return QUICK_LOG_FIELDS
    .filter((f) => {
      const val = settings[`quickLog_${f.id}`];
      return val === undefined ? f.defaultOn : val === "true";
    })
    .map((f) => f.id);
}

// ── Data fetchers ────────────────────────────────────────────────────────────

function fetchSettings(): Promise<Record<string, string>> {
  return fetch("/api/settings").then((r) => r.json());
}

interface ActiveBagInfo {
  id: number;
  beanName: string | null;
  bagName: string | null;
  bagNumber: string | null;
  defaultDose: number | null;
  defaultYield: number | null;
  currentGrindSetting: number | null;
}

function fetchActiveBag(): Promise<{ activeBag: ActiveBagInfo | null }> {
  return fetch("/api/dashboard/intelligence").then((r) => r.json());
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function QuickLog() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createShot = useCreateShot();

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: intelData } = useQuery({ queryKey: ["intelligence"], queryFn: fetchActiveBag });

  const activeBag = intelData?.activeBag ?? null;
  const enabledIds = settings ? getEnabledFieldIds(settings) : QUICK_LOG_FIELDS.filter((f) => f.defaultOn).map((f) => f.id);

  const [values, setValues] = useState<Record<string, string | number>>({});
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    if (!activeBag) return;
    setValues((prev) => ({
      dose:         prev.dose         ?? activeBag.defaultDose         ?? 18,
      yield:        prev.yield        ?? activeBag.defaultYield        ?? 36,
      grindSetting: prev.grindSetting ?? activeBag.currentGrindSetting ?? "",
      rating:       prev.rating       ?? 7,
    }));
  }, [activeBag?.id]);

  const setVal = (dbKey: string, val: string | number) =>
    setValues((prev) => ({ ...prev, [dbKey]: val }));

  const handleSave = () => {
    const body: Record<string, unknown> = {
      shotDate: new Date().toISOString().slice(0, 16),
      status: "Good",
      bagId: activeBag?.id ?? undefined,
    };

    for (const field of QUICK_LOG_FIELDS) {
      if (!enabledIds.includes(field.id)) continue;
      const val = values[field.dbKey];
      if (val === "" || val === undefined || val === null) continue;
      if (field.type === "text") {
        body[field.dbKey] = String(val);
      } else {
        const n = Number(val);
        if (!isNaN(n)) body[field.dbKey] = n;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createShot.mutate({ data: body as any }, {
      onSuccess: (data) => {
        setSavedId(data.id);
        queryClient.invalidateQueries({ queryKey: getListShotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["intelligence"] });
      },
      onError: () => {
        toast({ title: "Save failed", description: "Could not save shot.", variant: "destructive" });
      },
    });
  };

  const handleLogAnother = () => {
    setSavedId(null);
    setValues({
      dose:         activeBag?.defaultDose         ?? 18,
      yield:        activeBag?.defaultYield        ?? 36,
      grindSetting: activeBag?.currentGrindSetting ?? "",
      rating:       7,
    });
  };

  // ── Saved confirmation ───────────────────────────────────────────────────

  if (savedId !== null) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto">
        <PageHeader activeBag={activeBag} />
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/60 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-xl">Shot logged</p>
              <p className="text-muted-foreground text-sm mt-1">Added to your shot log.</p>
            </div>
            <div className="flex gap-3 mt-1 w-full">
              <Button variant="outline" className="flex-1" onClick={handleLogAnother}>
                Log another
              </Button>
              <Button className="flex-1" asChild>
                <Link href={`/shots/${savedId}`}>
                  View shot <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  const enabledFields = QUICK_LOG_FIELDS.filter((f) => enabledIds.includes(f.id));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto">
      <PageHeader activeBag={activeBag} />

      {enabledFields.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground text-sm">No fields are enabled for Quick Log.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-1.5" />
                Configure in Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 space-y-6">
            {enabledFields.map((field) => (
              <QuickField
                key={field.id}
                field={field}
                value={values[field.dbKey] ?? ""}
                onChange={(v) => setVal(field.dbKey, v)}
              />
            ))}

            <Button
              className="w-full h-12 text-base gap-2 mt-2"
              onClick={handleSave}
              disabled={createShot.isPending}
            >
              <Coffee className="h-4 w-4" />
              {createShot.isPending ? "Saving…" : "Save Shot"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" asChild>
          <Link href="/shots/new">
            <Coffee className="h-3 w-3 mr-1" />
            Full log form
          </Link>
        </Button>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" asChild>
          <Link href="/settings">
            <Settings className="h-3 w-3 mr-1" />
            Configure fields
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ activeBag }: { activeBag: ActiveBagInfo | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          Quick Log
        </h1>
        {activeBag ? (
          <p className="text-muted-foreground text-sm mt-1">
            {activeBag.beanName ?? "Unknown bean"}
            {activeBag.bagNumber ? ` · Bag #${activeBag.bagNumber}` : ""}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm mt-1">No active bag</p>
        )}
      </div>
      <Button variant="ghost" size="sm" className="text-muted-foreground shrink-0 mt-1" asChild>
        <Link href="/shots/new">
          Full log <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

function QuickField({
  field,
  value,
  onChange,
}: {
  field: (typeof QUICK_LOG_FIELDS)[number];
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  if (field.type === "rating") {
    const num = value === "" ? 7 : Number(value);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">{field.label}</Label>
          <span className="text-2xl font-bold tabular-nums text-primary">{num.toFixed(1)}</span>
        </div>
        <Slider
          min={0}
          max={10}
          step={0.5}
          value={[num]}
          onValueChange={([v]) => onChange(v)}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>0 — undrinkable</span>
          <span>10 — perfect</span>
        </div>
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <div className="space-y-2">
        <Label className="text-base font-medium">{field.label}</Label>
        <Textarea
          placeholder="Any notes…"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="resize-none"
          rows={2}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{field.label}</Label>
        {field.unit && (
          <span className="text-xs text-muted-foreground font-medium">{field.unit}</span>
        )}
      </div>
      <Input
        type="number"
        inputMode="decimal"
        value={value === "" ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="text-2xl font-bold h-14 tabular-nums text-center"
        step={field.type === "integer" ? 1 : 0.1}
        min={0}
      />
    </div>
  );
}
