import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateShot, getListShotsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Zap, ArrowRight, Coffee, CheckCircle2, Settings, Minus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChipSelector } from "@/components/ui/chip-selector";
import { DateTimeInput } from "@/components/ui/date-time-input";
import { curatedOptions, curatedScalarOptions, describeAnalysisEligibility, type SelectorOptions } from "@/lib/selector-options";
import { calculateDoseCorrection } from "@/lib/dose-correction";

// ── Field type definitions ────────────────────────────────────────────────────

export type FieldInputType = "number" | "rating" | "text" | "toggle" | "select" | "temperature";

export interface QuickFieldDef {
  id: string;
  label: string;
  unit: string;
  dbKey: string;
  type: FieldInputType;
  step?: number;
  min?: number;
  max?: number;
  options?: string[];
  defaultOn: boolean;
}

// ── Field groups — canonical structure ───────────────────────────────────────

export const FIELD_GROUPS: { id: string; label: string; description: string; fields: QuickFieldDef[] }[] = [
  {
    id: "essential",
    label: "Essential",
    description: "Core shot data · enabled by default",
    fields: [
      { id: "dose",     label: "Target Dose", unit: "g", dbKey: "dose",      type: "number",  step: 0.1,  min: 0,  defaultOn: true  },
      { id: "rating",   label: "Rating",    unit: "",    dbKey: "rating",    type: "rating",              defaultOn: true  },
    ],
  },
  {
    id: "timing",
    label: "Timing",
    description: "Detailed extraction timing",
    fields: [
      { id: "pourDelay", label: "First Pour Delay", unit: "s", dbKey: "pourDelay", type: "number", step: 1,   min: 0, defaultOn: false },
      { id: "pourTime",  label: "Pour Time",        unit: "s", dbKey: "pourTime",  type: "number", step: 1,   min: 0, defaultOn: false },
      { id: "flowTime", label: "Flow Time", unit: "s",   dbKey: "flowTime", type: "number",  step: 1,    min: 0,  defaultOn: true  },
      { id: "yield",    label: "Yield",     unit: "g",   dbKey: "yield",     type: "number",  step: 0.1,  min: 0,  defaultOn: true  },
    ],
  },
  {
    id: "brewSetup",
    label: "Brew Setup",
    description: "Equipment and grind configuration",
    fields: [
      { id: "temperature",       label: "Temperature",            unit: "°C", dbKey: "temperature",       type: "temperature", min: 88, max: 98, defaultOn: false },
      { id: "grindSetting",      label: "Grind Setting",          unit: "",   dbKey: "grindSetting",      type: "number",  step: 0.01, min: 0, defaultOn: false },
      { id: "grindTime",         label: "Grinder Time",           unit: "s",  dbKey: "grindTime",         type: "number",  step: 0.1,  min: 0, defaultOn: false },
      { id: "grindOutputWeight", label: "Initial Grinder Output", unit: "g",  dbKey: "initialGrindWeight", type: "number", step: 0.1, min: 0, defaultOn: true },
      { id: "topUpGrind",        label: "Top-Up Grind",           unit: "g",  dbKey: "topUpGrind",        type: "number",  step: 0.1,  min: 0, defaultOn: true },
      { id: "timeAdj",           label: "Top-Up Time Adj",        unit: "s",  dbKey: "timeAdj",           type: "number",  step: 0.1,  min: 0, defaultOn: false },
      { id: "grindChanged",      label: "Grind Changed This Shot",unit: "",   dbKey: "grindAdjusted",     type: "toggle",              defaultOn: false },
    ],
  },
];

// Flat list — used by getEnabledFieldIds and save logic
export const QUICK_LOG_FIELDS: QuickFieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

export function getEnabledFieldIds(settings: Record<string, string>): string[] {
  return QUICK_LOG_FIELDS
    .filter((f) => {
      const val = settings[`quickLog_${f.id}`] ??
        (f.id === "flowTime" ? settings.quickLog_shotTime : undefined);
      return val === undefined ? f.defaultOn : val === "true";
    })
    .map((f) => f.id);
}

// ── Selector options — fetched as historical evidence, curated for entry UI ──

export async function fetchSelectorOptions(): Promise<SelectorOptions> {
  return fetch("/api/shots/selector-options").then((r) => r.json());
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
  defaultTemp: number | null;
  currentGrindSetting: number | null;
}

function fetchActiveBag(): Promise<{ activeBag: ActiveBagInfo | null }> {
  return fetch("/api/dashboard/intelligence").then((r) => r.json());
}

// ── Types ────────────────────────────────────────────────────────────────────

type FieldValues = Record<string, string | number | boolean>;

interface EvalValues {
  status: string;
  faultStatus: string[];
  isReference: boolean;
  signatureShot: boolean;
  sourShot: boolean;
  expressionStyle: string[];
  beanAchievement: string[];
  shotClassification: string[];
  includeInAnalysis: boolean;
  notes: string;
}

function nowDateTimeLocal(): string {
  const d = new Date();
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function QuickLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createShot = useCreateShot();

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: intelData } = useQuery({ queryKey: ["intelligence"], queryFn: fetchActiveBag });

  const activeBag = intelData?.activeBag ?? null;
  const enabledIds = settings ? getEnabledFieldIds(settings) : QUICK_LOG_FIELDS.filter((f) => f.defaultOn).map((f) => f.id);

  // Grind Changed auto-shows when grindSetting is enabled
  const fieldsToRender = QUICK_LOG_FIELDS.filter((f) => {
    if (enabledIds.includes(f.id)) return true;
    if (f.id === "grindChanged" && enabledIds.includes("grindSetting")) return true;
    return false;
  });

  const ratingMode = settings?.ratingInputMode ?? "";
  const isEasyRating = !ratingMode.startsWith("Precision");

  const [values, setValues] = useState<FieldValues>({});
  const [savedId, setSavedId] = useState<number | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showAdvancedEvaluation, setShowAdvancedEvaluation] = useState(false);
  const [shotDate, setShotDate] = useState(nowDateTimeLocal);
  const [evalValues, setEvalValues] = useState<EvalValues>({
    status: "",
    faultStatus: [],
    isReference: false,
    signatureShot: false,
    sourShot: false,
    expressionStyle: [],
    beanAchievement: [],
    shotClassification: [],
    includeInAnalysis: true,
    notes: "",
  });
  const statusOptions = curatedScalarOptions("status", evalValues.status);
  const faultStatusOptions = curatedOptions("faultStatus", evalValues.faultStatus);
  const expressionStyleOptions = curatedOptions("expressionStyle", evalValues.expressionStyle);
  const beanAchievementOptions = curatedOptions("beanAchievement", evalValues.beanAchievement);
  const shotClassificationOptions = curatedOptions("shotClassification", evalValues.shotClassification);
  const analysisEligibility = describeAnalysisEligibility(evalValues.status, evalValues.faultStatus);

  // Pre-fill from active bag + settings
  useEffect(() => {
    if (!activeBag && !settings) return;
    const defaultTemp =
      activeBag?.defaultTemp ??
      (settings?.defaultBrewTemp ? Number(settings.defaultBrewTemp) : 94);
    const defaultDose = activeBag?.defaultDose ?? (settings?.defaultDose ? Number(settings.defaultDose) : 18);
    const defaultYield = activeBag?.defaultYield ?? (settings?.defaultTargetYield ? Number(settings.defaultTargetYield) : 36);

    setValues((prev) => ({
      dose:         prev.dose         !== undefined ? prev.dose         : defaultDose,
      yield:        prev.yield        !== undefined ? prev.yield        : defaultYield,
      temperature:  prev.temperature  !== undefined ? prev.temperature  : defaultTemp,
      grindSetting: prev.grindSetting !== undefined ? prev.grindSetting : (activeBag?.currentGrindSetting ?? ""),
      rating:       prev.rating       !== undefined ? prev.rating       : (isEasyRating ? 7 : 7.00),
    }));
  }, [activeBag?.id, !!settings]);

  const setVal = (dbKey: string, val: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [dbKey]: val }));

  const setEval = <K extends keyof EvalValues>(key: K, val: EvalValues[K]) =>
    setEvalValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const body: Record<string, unknown> = {
      shotDate: shotDate || nowDateTimeLocal(),
      bagId: activeBag?.id ?? undefined,
    };

    // Quick fields
    for (const field of QUICK_LOG_FIELDS) {
      const include = enabledIds.includes(field.id) || (field.id === "grindChanged" && enabledIds.includes("grindSetting"));
      if (!include) continue;

      const val = values[field.dbKey];

      if (field.type === "toggle") {
        if (field.id === "grindChanged") {
          if (val === true) body[field.dbKey] = "Yes";
        }
      } else if (field.type === "text") {
        if (val !== "" && val !== undefined) body[field.dbKey] = String(val);
      } else if (field.type === "select") {
        if (val && val !== "__none__") body[field.dbKey] = String(val);
      } else if (field.type === "temperature") {
        const n = Number(val);
        if (!isNaN(n) && n > 0) body[field.dbKey] = Math.round(n);
      } else {
        const n = Number(val);
        if (!isNaN(n) && val !== "" && val !== undefined) body[field.dbKey] = n;
      }
    }

    Object.assign(
      body,
      calculateDoseCorrection(
        typeof body.initialGrindWeight === "number" ? body.initialGrindWeight : undefined,
        typeof body.dose === "number" ? body.dose : undefined,
        typeof body.timeAdj === "number" ? body.timeAdj : undefined,
        settings?.grindMinTime ? Number(settings.grindMinTime) : 0.2,
        typeof body.topUpGrind === "number" ? body.topUpGrind : undefined,
      ),
    );

    // Shot Evaluation fields (always applied)
    if (evalValues.status) body.status = evalValues.status;
    if (evalValues.faultStatus.length) body.faultStatus = evalValues.faultStatus;
    if (evalValues.faultStatus.includes("Grind Waste Intentional")) {
      const grindWaste = Number(values.grindWaste);
      if (!Number.isNaN(grindWaste) && values.grindWaste !== "" && values.grindWaste !== undefined) body.grindWaste = grindWaste;
    }
    body.isReference = evalValues.isReference;
    body.signatureShot = evalValues.signatureShot;
    body.sourShot = evalValues.sourShot;
    if (evalValues.expressionStyle.length) body.expressionStyle = evalValues.expressionStyle;
    if (evalValues.beanAchievement.length) body.beanAchievement = evalValues.beanAchievement;
    if (evalValues.shotClassification.length) body.shotClassification = evalValues.shotClassification;
    body.includeInAnalysis = analysisEligibility.included;
    if (evalValues.notes) body.notes = evalValues.notes;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createShot.mutate({ data: body as any }, {
      onSuccess: (data) => {
        setSavedId(data.id);
        queryClient.invalidateQueries({ queryKey: getListShotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["intelligence"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-intelligence"] });
      },
      onError: () => {
        toast({ title: "Save failed", description: "Could not save shot.", variant: "destructive" });
      },
    });
  };

  const handleLogAnother = () => {
    setSavedId(null);
    setShotDate(nowDateTimeLocal());
    setEvalValues({ status: "", faultStatus: [], isReference: false, signatureShot: false, sourShot: false, expressionStyle: [], beanAchievement: [], shotClassification: [], includeInAnalysis: true, notes: "" });
    setValues({
      dose:         activeBag?.defaultDose         ?? 18,
      yield:        activeBag?.defaultYield        ?? 36,
      grindSetting: activeBag?.currentGrindSetting ?? "",
      temperature:  activeBag?.defaultTemp         ?? (settings?.defaultBrewTemp ? Number(settings.defaultBrewTemp) : 94),
      rating:       isEasyRating ? 7 : 7.00,
    });
  };

  // ── Saved confirmation ─────────────────────────────────────────────────────

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

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-sm mx-auto">
      <PageHeader activeBag={activeBag} />

      {/* Date & Time — always visible */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Date & Time</Label>
            <DateTimeInput value={shotDate} onChange={setShotDate} />
          </div>
        </CardContent>
      </Card>

      {/* Quick fields */}
      {fieldsToRender.length === 0 ? (
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
            {fieldsToRender.map((field) => (
              <QuickField
                key={field.id}
                field={field}
                value={values[field.dbKey] ?? ""}
                onChange={(v) => setVal(field.dbKey, v)}
                isEasyRating={isEasyRating}
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

      {/* Shot Evaluation — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowEvaluation((v) => !v)}
          className="flex items-center justify-between w-full px-1 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Shot Evaluation</span>
          {showEvaluation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showEvaluation && (
          <Card className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CardContent className="p-5 space-y-5">

              {/* Shot Status */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Shot Status</Label>
                <Select
                  value={evalValues.status || "__none__"}
                  onValueChange={(v) => setEval("status", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— not set —</SelectItem>
                    {statusOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Fault Status */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Fault Status</Label>
                <ChipSelector options={faultStatusOptions} value={evalValues.faultStatus} onChange={(v) => setEval("faultStatus", v)} />
              </div>

              {evalValues.faultStatus.includes("Grind Waste Intentional") && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Grind Waste (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(values.grindWaste as number | string | undefined) ?? ""}
                    onChange={(event) => setVal("grindWaste", event.target.value)}
                    placeholder="32.2"
                    className="h-11 text-lg tabular-nums"
                  />
                </div>
              )}

              {/* Checkboxes */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Flags</Label>
                <div className="space-y-2.5">
                  {/* Reference Shot */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="eval-isReference"
                      checked={evalValues.isReference}
                      onCheckedChange={(checked) => {
                        const ref = checked === true;
                        setEvalValues((v) => ({ ...v, isReference: ref, signatureShot: ref ? v.signatureShot : false }));
                      }}
                    />
                    <label htmlFor="eval-isReference" className="text-sm leading-none cursor-pointer select-none">
                      Reference Shot
                    </label>
                  </div>
                  {/* Signature Shot — requires Reference Shot */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="eval-signatureShot"
                      checked={evalValues.signatureShot}
                      disabled={!evalValues.isReference}
                      onCheckedChange={(checked) => {
                        const sig = checked === true;
                        setEvalValues((v) => ({ ...v, signatureShot: sig, isReference: sig ? true : v.isReference }));
                      }}
                    />
                    <label htmlFor="eval-signatureShot" className={cn("text-sm leading-none select-none", evalValues.isReference ? "cursor-pointer" : "cursor-not-allowed opacity-40")}>
                      Signature Shot
                    </label>
                  </div>
                  {/* Sour Shot */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="eval-sourShot"
                      checked={evalValues.sourShot}
                      onCheckedChange={(checked) => setEval("sourShot", checked === true)}
                    />
                    <label htmlFor="eval-sourShot" className="text-sm leading-none cursor-pointer select-none">
                      Sour Shot
                    </label>
                  </div>
                </div>
              </div>

              <div className={cn(
                "rounded-lg border p-3 text-sm",
                analysisEligibility.included
                  ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
              )}>
                <p className="font-medium">
                  Shot is {analysisEligibility.included ? "included" : "excluded"} in analysis
                </p>
                <p className="mt-1 text-xs opacity-80">{analysisEligibility.reason}</p>
              </div>

              {/* Expression Style — multi-select */}
              <div className="rounded-lg border p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedEvaluation((v) => !v)}
                  className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Advanced tags</span>
                  {showAdvancedEvaluation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showAdvancedEvaluation && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">Expression Style</Label>
                      <ChipSelector
                        options={expressionStyleOptions}
                        value={evalValues.expressionStyle}
                        onChange={(v) => setEval("expressionStyle", v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">Bean Achievement</Label>
                      <ChipSelector
                        options={beanAchievementOptions}
                        value={evalValues.beanAchievement}
                        onChange={(v) => setEval("beanAchievement", v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium">Shot Classification</Label>
                      <ChipSelector
                        options={shotClassificationOptions}
                        value={evalValues.shotClassification}
                        onChange={(v) => setEval("shotClassification", v)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Notes</Label>
                <Textarea
                  placeholder="Any notes…"
                  value={evalValues.notes}
                  onChange={(e) => setEval("notes", e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

            </CardContent>
          </Card>
        )}
      </div>

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

// ── Sub-components ────────────────────────────────────────────────────────────

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
  isEasyRating,
}: {
  field: QuickFieldDef;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
  isEasyRating: boolean;
}) {
  if (field.type === "rating") {
    return isEasyRating
      ? <EasyRatingField value={value} onChange={onChange} />
      : <PrecisionRatingField value={value} onChange={onChange} />;
  }

  if (field.type === "temperature") {
    return <TemperatureField field={field} value={value} onChange={onChange} />;
  }

  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{field.label}</Label>
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-2">
        <Label className="text-base font-medium">{field.label}</Label>
        <Select
          value={value === "" || value === undefined ? "__none__" : String(value)}
          onValueChange={(v) => onChange(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— not set —</SelectItem>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

  // Default: number field
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
        step={field.step ?? 1}
        min={field.min}
        max={field.max}
      />
    </div>
  );
}

// ── Rating variants ───────────────────────────────────────────────────────────

function EasyRatingField({
  value,
  onChange,
}: {
  value: string | number | boolean;
  onChange: (v: number) => void;
}) {
  const current = value === "" || value === undefined ? 0 : Number(value);
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Rating</Label>
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={cn(
              "h-11 rounded-lg text-sm font-semibold transition-colors border select-none",
              r === current
                ? "bg-primary text-primary-foreground border-primary"
                : r < current
                  ? "bg-primary/15 text-primary border-primary/20"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {current > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {current <= 4 ? "Needs work" : current <= 6 ? "Acceptable" : current <= 8 ? "Good shot" : "Outstanding"}
        </p>
      )}
    </div>
  );
}

function PrecisionRatingField({
  value,
  onChange,
}: {
  value: string | number | boolean;
  onChange: (v: number) => void;
}) {
  const num = value === "" || value === undefined ? 7 : Number(value);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Rating</Label>
        <span className="text-2xl font-bold tabular-nums text-primary">{num.toFixed(2)}</span>
      </div>
      <Slider
        min={0}
        max={10}
        step={0.25}
        value={[num]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>0 — undrinkable</span>
        <span>5</span>
        <span>10 — perfect</span>
      </div>
    </div>
  );
}

// ── Temperature stepper ───────────────────────────────────────────────────────

function TemperatureField({
  field,
  value,
  onChange,
}: {
  field: QuickFieldDef;
  value: string | number | boolean;
  onChange: (v: number) => void;
}) {
  const temp = value === "" || value === undefined ? 94 : Number(value);
  const min = field.min ?? 88;
  const max = field.max ?? 98;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{field.label}</Label>
        <span className="text-xs text-muted-foreground font-medium">{field.unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-14 w-14 shrink-0"
          onClick={() => onChange(Math.max(min, temp - 1))}
          disabled={temp <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          value={temp}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className="text-2xl font-bold h-14 tabular-nums text-center"
          min={min}
          max={max}
          step={1}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-14 w-14 shrink-0"
          onClick={() => onChange(Math.min(max, temp + 1))}
          disabled={temp >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">Range: {min}–{max}°C</p>
    </div>
  );
}
