import React, { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ChevronDown, ChevronUp, Save } from "lucide-react";
import {
  useCreateShot,
  useGetShot,
  useUpdateShot,
  getListShotsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetShotQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { DateTimeInput } from "@/components/ui/date-time-input";
import { cn } from "@/lib/utils";
import { TASTE_ZONE_OPTIONS, curatedOptions, curatedScalarOptions, describeAnalysisEligibility, drinkTypeOptionsFromSettings } from "@/lib/selector-options";
import { calculateDoseCorrection } from "@/lib/dose-correction";

interface Bag {
  id: number; beanName: string | null; bagNumber: string | null; bagName: string | null; isActive: boolean;
  currentGrindSetting: number | null; currentGrindTime: number | null;
  defaultDose: number | null; defaultYield: number | null; defaultTemp: number | null;
  dialInNotes: string | null;
}

interface TasteSelector { id: number; name: string; category: string; }

const NO_TASTE_SELECTORS: TasteSelector[] = [];

function fetchBags(): Promise<Bag[]> { return fetch("/api/bags").then((r) => r.json()); }
function fetchTasteSelectors(): Promise<TasteSelector[]> { return fetch("/api/taste-selectors").then((r) => r.json()); }
function fetchShotTasteSelectors(id: number): Promise<TasteSelector[]> {
  return fetch(`/api/shots/${id}/taste-selectors`).then((r) => r.json());
}
function fetchSettings(): Promise<Record<string, string>> { return fetch("/api/settings").then((r) => r.json()); }
function fetchActiveBagIntelligence(): Promise<ActiveBagIntelligence> {
  return fetch("/api/dashboard/intelligence").then((r) => r.json());
}

interface LatestShotDefaults {
  pourDelay: number | null;
  pourTime: number | null;
  flowTime: number | null;
  yield: number | null;
  dose: number | null;
}

interface ActiveBagIntelligence {
  shotComparison?: {
    latestShot?: LatestShotDefaults | null;
  } | null;
}

function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateTimeLocal(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return nowDateTimeLocal();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().optional(),
);

const optionalRating = (max: number) => z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().min(0).max(max).optional(),
);

const formSchema = z.object({
  shotDate: z.string(),
  bagId: optionalNumber,
  bean: z.string().optional(),
  bag: z.string().optional(),
  grindSetting: optionalNumber,
  grindTime: optionalNumber,
  initialGrindWeight: optionalNumber,
  topUpGrind: optionalNumber,
  timeAdj: optionalNumber,
  grindWaste: optionalNumber,
  dose: optionalNumber,
  yield: optionalNumber,
  pourDelay: optionalNumber,
  pourTime: optionalNumber,
  flowTime: optionalNumber,
  temperature: optionalNumber,
  rating: optionalRating(10),
  preferenceRating: optionalRating(11),
  rated: z.boolean().optional(),
  isForOthers: z.boolean().default(false),
  drinkType: z.string().optional(),
  finishedShot: z.boolean().optional(),
  // Shot Evaluation
  status: z.string().optional(),
  faultStatus: z.array(z.string()).optional(),
  isReference: z.boolean().default(false),
  signatureShot: z.boolean().default(false),
  sourShot: z.boolean().default(false),
  expressionStyle: z.array(z.string()).optional(),
  beanAchievement: z.array(z.string()).optional(),
  shotClassification: z.array(z.string()).optional(),
  tasteZone: z.string().optional(),
  includeInAnalysis: z.boolean().default(true),
  notes: z.string().optional(),
  sensoryNotes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type ShotMutationResult = { id?: number };

function ScalarSelect({
  options,
  value,
  onChange,
  placeholder = "— not set —",
}: {
  options: string[];
  value?: string | null;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || undefined)}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        return (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        );
      })}
    </select>
  );
}

type SeedableNumberField = {
  value?: unknown;
  onChange: (value: unknown) => void;
};

function seedSuggestedNumber(
  field: SeedableNumberField,
  suggestedValue: number | string | null | undefined,
  target?: HTMLInputElement,
) {
  if (field.value !== undefined && field.value !== null && field.value !== "") return;
  if (suggestedValue === undefined || suggestedValue === null || suggestedValue === "") return;

  const value = typeof suggestedValue === "number" ? suggestedValue : Number(suggestedValue);
  if (!Number.isFinite(value)) return;

  if (target && target.value === "") target.value = String(value);
  field.onChange(value);
}

export default function ShotForm() {
  const [, params] = useRoute("/shots/:id/edit");
  const editingId = params?.id ? Number(params.id) : null;
  const isEditing = Number.isFinite(editingId);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createShot = useCreateShot();
  const updateShot = useUpdateShot();
  const [selectedTastes, setSelectedTastes] = useState<number[]>([]);
  const [showPreviousBags, setShowPreviousBags] = useState(false);
  const [showAdvancedEvaluation, setShowAdvancedEvaluation] = useState(false);
  const [recordGrindWaste, setRecordGrindWaste] = useState(false);

  const { data: bags = [] } = useQuery({ queryKey: ["bags"], queryFn: fetchBags });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: activeBagIntelligence } = useQuery({ queryKey: ["intelligence"], queryFn: fetchActiveBagIntelligence });
  const { data: tasteSelectors = [] } = useQuery({ queryKey: ["taste-selectors"], queryFn: fetchTasteSelectors });
  const { data: existingTasteSelectors = NO_TASTE_SELECTORS } = useQuery({
    queryKey: ["shot-taste-selectors", editingId],
    queryFn: () => fetchShotTasteSelectors(editingId!),
    enabled: isEditing && !!editingId,
  });
  const { data: existingShot } = useGetShot(editingId ?? 0, {
    query: {
      enabled: isEditing && !!editingId,
      queryKey: editingId ? getGetShotQueryKey(editingId) : ["shot", "disabled"],
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shotDate: nowDateTimeLocal(),
      dose: 18,
      yield: 36,
      temperature: 94,
      rating: 7,
      rated: true,
      isForOthers: false,
      drinkType: undefined,
      finishedShot: undefined,
      isReference: false,
      signatureShot: false,
      sourShot: false,
      faultStatus: [],
      expressionStyle: [],
      beanAchievement: [],
      shotClassification: [],
      tasteZone: undefined,
      includeInAnalysis: true,
    },
  });

  const statusOptions = curatedScalarOptions("status", form.watch("status"));
  const faultStatusOptions = curatedOptions("faultStatus", form.watch("faultStatus")?.slice(0, 1) ?? []);
  const expressionStyleOptions = curatedOptions("expressionStyle", form.watch("expressionStyle")?.slice(0, 1) ?? []);
  const beanAchievementOptions = curatedOptions("beanAchievement", form.watch("beanAchievement")?.slice(0, 1) ?? []);
  const shotClassificationOptions = curatedOptions("shotClassification", form.watch("shotClassification")?.slice(0, 1) ?? []);
  const drinkTypeOptions = drinkTypeOptionsFromSettings(settings, form.watch("drinkType"));
  const tasteZoneOptions = form.watch("tasteZone") && !TASTE_ZONE_OPTIONS.includes(form.watch("tasteZone")!)
    ? [...TASTE_ZONE_OPTIONS, form.watch("tasteZone")!]
    : TASTE_ZONE_OPTIONS;
  const analysisEligibility = describeAnalysisEligibility(form.watch("status"), form.watch("faultStatus") ?? []);

  const selectedBagId = form.watch("bagId");

  useEffect(() => {
    if (!existingShot || !isEditing) return;
    const savedStatus = existingShot.status ?? "";
    const savedTasteZone = existingShot.tasteZone ?? "";
    const hasAdvancedEvaluation =
      (existingShot.expressionStyle?.length ?? 0) > 0 ||
      (existingShot.beanAchievement?.length ?? 0) > 0 ||
      (existingShot.shotClassification?.length ?? 0) > 0;
    form.reset({
      shotDate: existingShot.shotDate ? toDateTimeLocal(existingShot.shotDate) : nowDateTimeLocal(),
      bagId: existingShot.bagId ?? undefined,
      bean: existingShot.bean ?? undefined,
      bag: existingShot.bag ?? undefined,
      grindSetting: existingShot.grindSetting ?? undefined,
      grindTime: existingShot.grindTime ?? undefined,
      initialGrindWeight: existingShot.initialGrindWeight ?? undefined,
      topUpGrind: existingShot.topUpGrind ?? undefined,
      timeAdj: existingShot.timeAdj ?? undefined,
      grindWaste: existingShot.grindWaste ?? undefined,
      dose: existingShot.dose ?? undefined,
      yield: existingShot.yield ?? undefined,
      pourDelay: existingShot.pourDelay ?? undefined,
      pourTime: existingShot.pourTime ?? undefined,
      flowTime: existingShot.flowTime ?? undefined,
      temperature: existingShot.temperature ?? undefined,
      rating: existingShot.rating ?? undefined,
      preferenceRating: existingShot.preferenceRating ?? undefined,
      rated: existingShot.rated ?? true,
      isForOthers: existingShot.isForOthers ?? false,
      drinkType: existingShot.drinkType ?? undefined,
      finishedShot: existingShot.finishedShot ?? undefined,
      status: savedStatus,
      faultStatus: existingShot.faultStatus ?? [],
      isReference: existingShot.isReference ?? false,
      signatureShot: existingShot.signatureShot ?? false,
      sourShot: existingShot.sourShot ?? false,
      expressionStyle: existingShot.expressionStyle ?? [],
      beanAchievement: existingShot.beanAchievement ?? [],
      shotClassification: existingShot.shotClassification ?? [],
      tasteZone: savedTasteZone,
      includeInAnalysis: existingShot.includeInAnalysis ?? true,
      notes: existingShot.notes ?? undefined,
      sensoryNotes: existingShot.sensoryNotes ?? undefined,
    });
    form.setValue("status", savedStatus);
    form.setValue("tasteZone", savedTasteZone);
    setRecordGrindWaste(
      existingShot.grindWaste != null ||
      existingShot.grindAdjusted === "Grind change / purge waste" ||
      (existingShot.faultStatus ?? []).includes("Grind Waste Intentional"),
    );
    setShowAdvancedEvaluation(hasAdvancedEvaluation);
  }, [existingShot, isEditing, form]);

  useEffect(() => {
    if (isEditing || !settings?.defaultDrinkType) return;
    if (!form.getValues("drinkType")) form.setValue("drinkType", settings.defaultDrinkType);
  }, [settings?.defaultDrinkType, isEditing, form]);

  useEffect(() => {
    if (!isEditing) return;
    setSelectedTastes(existingTasteSelectors.map((selector) => selector.id));
  }, [existingTasteSelectors, isEditing]);

  // Auto-fill from bag selection
  useEffect(() => {
    if (isEditing) return;
    if (!selectedBagId) return;
    const bag = bags.find((b) => b.id === Number(selectedBagId));
    if (!bag) return;
    if (bag.beanName) form.setValue("bean", bag.beanName);
    if (bag.bagNumber) form.setValue("bag", bag.bagNumber);
    if (bag.currentGrindSetting != null) form.setValue("grindSetting", bag.currentGrindSetting);
    if (bag.currentGrindTime != null) form.setValue("grindTime", bag.currentGrindTime);
    if (bag.defaultDose != null) form.setValue("dose", bag.defaultDose);
    if (bag.defaultYield != null) form.setValue("yield", bag.defaultYield);
    if (bag.defaultTemp != null) form.setValue("temperature", bag.defaultTemp);
  }, [selectedBagId, bags]);

  const toggleTaste = (id: number) => setSelectedTastes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  const onSubmit = async (values: FormValues) => {
    const handlers = {
      onSuccess: async (data: ShotMutationResult) => {
        if (data.id && (isEditing || selectedTastes.length > 0)) {
          await fetch(`/api/shots/${data.id}/taste-selectors`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selectedTastes }),
          });
        }
        toast({ title: isEditing ? "Shot updated" : "Shot logged" });
        queryClient.invalidateQueries({ queryKey: getListShotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        if (data.id) queryClient.invalidateQueries({ queryKey: getGetShotQueryKey(data.id) });
        setLocation(`/shots/${data.id}`);
      },
      onError: () => toast({ title: isEditing ? "Failed to update shot" : "Failed to log shot", variant: "destructive" }),
    };

    const payload: Record<string, unknown> = {
      ...values,
      ...calculateDoseCorrection(
        values.initialGrindWeight,
        values.dose,
        values.timeAdj,
        settings?.grindMinTime ? Number(settings.grindMinTime) : 0.2,
        values.topUpGrind,
      ),
      includeInAnalysis: describeAnalysisEligibility(values.status, values.faultStatus ?? []).included,
    };
    if (values.rated === false) {
      payload.rating = null;
      payload.preferenceRating = null;
    }
    if (recordGrindWaste) payload.grindAdjusted = "Grind change / purge waste";
    else {
      delete payload.grindWaste;
      delete payload.grindAdjusted;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (isEditing && editingId) updateShot.mutate({ id: editingId, data: payload as any }, handlers);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else createShot.mutate({ data: payload as any }, handlers);
  };

  const ratingVal = form.watch("rating") ?? 7;
  const activeBagId = form.watch("bagId");
  const correctionPreview = calculateDoseCorrection(
    form.watch("initialGrindWeight"),
    form.watch("dose"),
    form.watch("timeAdj"),
    settings?.grindMinTime ? Number(settings.grindMinTime) : 0.2,
    form.watch("topUpGrind"),
  );
  const activeBags = bags.filter((b) => b.isActive);
  const previousBags = bags.filter((b) => !b.isActive);
  const visibleBags = showPreviousBags ? bags : activeBags;
  const selectedBag = selectedBagId ? bags.find((b) => b.id === Number(selectedBagId)) : undefined;
  const defaultDose = selectedBag?.defaultDose ?? (settings?.defaultDose ? Number(settings.defaultDose) : 18);
  const latestShotDefaults = activeBagIntelligence?.shotComparison?.latestShot ?? null;
  const defaultYield = latestShotDefaults?.yield ?? selectedBag?.defaultYield ?? (settings?.defaultTargetYield ? Number(settings.defaultTargetYield) : 36);
  const defaultTemp = selectedBag?.defaultTemp ?? (settings?.defaultBrewTemp ? Number(settings.defaultBrewTemp) : 94);
  const defaultTopUpTime = settings?.grindMinTime ? Number(settings.grindMinTime) : 0.2;
  const defaultGrindSetting = selectedBag?.currentGrindSetting ?? (settings?.defaultGrindSetting ? Number(settings.defaultGrindSetting) : 2.33);
  const defaultGrindTime = selectedBag?.currentGrindTime ?? (settings?.defaultGrindTime ? Number(settings.defaultGrindTime) : 8.1);
  const saving = createShot.isPending || updateShot.isPending;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/shots"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-serif">{isEditing ? "Edit Shot" : "Detailed Log"}</h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Update the full saved shot record."
              : "Complete shot record — best for review, tasting notes, and advanced details."}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Setup — Date & Bag */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="shotDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <DateTimeInput
                      value={field.value?.toString().slice(0, 16) ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Bag selector */}
              <div className="space-y-2">
                <Label>Bag <span className="text-muted-foreground font-normal">(auto-fills grind defaults)</span></Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => form.setValue("bagId", undefined)}
                    className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors", !activeBagId ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/40")}
                  >
                    No bag
                  </button>
                  {visibleBags.map((bag) => (
                    <button
                      type="button"
                      key={bag.id}
                      onClick={() => form.setValue("bagId", bag.id)}
                      className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors", activeBagId === bag.id ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/40")}
                    >
                      {bag.beanName ?? "Bag"} #{bag.bagNumber ?? bag.id}
                      {bag.isActive && <span className="text-[10px] opacity-70">●</span>}
                    </button>
                  ))}
                </div>
                {previousBags.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs"
                    onClick={() => setShowPreviousBags((v) => !v)}
                  >
                    {showPreviousBags ? "Hide previous bags" : `Show previous bags (${previousBags.length})`}
                  </Button>
                )}
                {activeBagId && (() => {
                  const b = bags.find((b) => b.id === activeBagId);
                  return b?.dialInNotes ? <p className="text-xs text-muted-foreground italic">Dial-in note: {b.dialInNotes}</p> : null;
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Extraction */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Extraction</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="grindSetting" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grind Setting</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder={defaultGrindSetting.toString()} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, defaultGrindSetting, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, defaultGrindSetting, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="grindTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grind Time (s)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder={defaultGrindTime.toString()} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, defaultGrindTime, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, defaultGrindTime, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="initialGrindWeight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Grinder Output (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder={defaultDose.toString()} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, defaultDose, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, defaultDose, event.currentTarget)} /></FormControl>
                  <p className="text-xs text-muted-foreground">Grinder output before basket correction — not the final basket dose.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="topUpGrind" render={({ field }) => (
                <FormItem>
                  <FormLabel>Top-Up Grind Added (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="0.1" {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, 0.1, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, 0.1, event.currentTarget)} /></FormControl>
                  <p className="text-xs text-muted-foreground">Enter only the extra grams added, e.g. 0.5 — not the final basket dose.</p>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="timeAdj" render={({ field }) => (
                <FormItem>
                  <FormLabel>Top-Up Time Adj (s)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder={String(defaultTopUpTime)} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, defaultTopUpTime, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, defaultTopUpTime, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="temperature" render={({ field }) => (
                <FormItem>
                  <FormLabel>Temp (°C)</FormLabel>
                  <FormControl><Input type="number" step="1" placeholder={defaultTemp.toString()} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, defaultTemp, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, defaultTemp, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target / Basket Dose (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder={defaultDose.toString()} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, defaultDose, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, defaultDose, event.currentTarget)} /></FormControl>
                  <p className="text-xs text-muted-foreground">The final dose that ends up in the basket, after any top-up or trim.</p>
                  <FormMessage />
                </FormItem>
              )} />
              {correctionPreview.doseCorrectionType && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm sm:col-span-3">
                  <p className="font-medium">Dose correction: {correctionPreview.doseCorrectionType}</p>
                  {correctionPreview.overGrindRemoved != null && (
                    <p className="text-muted-foreground">Remove {correctionPreview.overGrindRemoved}g to reach target dose.</p>
                  )}
                  {correctionPreview.topUpGrind != null && (
                    <p className="text-muted-foreground">
                      Top up {correctionPreview.topUpGrind}g to reach target dose
                      {correctionPreview.timeAdj != null ? ` using ${correctionPreview.timeAdj}s.` : "."}
                    </p>
                  )}
                  {correctionPreview.doseCorrectionType === "Under → Top-Up" && correctionPreview.topUpGrind == null && (
                    <p className="text-muted-foreground">
                      Enter Top-Up Grind grams if used
                      {correctionPreview.timeAdj != null ? `; time defaults to ${correctionPreview.timeAdj}s if blank.` : "."}
                    </p>
                  )}
                  {correctionPreview.doseCorrectionType === "None" && (
                    <p className="text-muted-foreground">Initial output matches target dose.</p>
                  )}
                </div>
              )}
              <FormField control={form.control} name="pourDelay" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pour Delay (s)</FormLabel>
                  <FormControl><Input type="number" step="1" placeholder={latestShotDefaults?.pourDelay?.toString() ?? ""} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, latestShotDefaults?.pourDelay, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, latestShotDefaults?.pourDelay, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pourTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pour Time (s)</FormLabel>
                  <FormControl><Input type="number" step="1" placeholder={latestShotDefaults?.pourTime?.toString() ?? ""} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, latestShotDefaults?.pourTime, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, latestShotDefaults?.pourTime, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="flowTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Flow Time (s)</FormLabel>
                  <FormControl><Input type="number" step="1" placeholder={latestShotDefaults?.flowTime?.toString() ?? ""} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, latestShotDefaults?.flowTime, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, latestShotDefaults?.flowTime, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="yield" render={({ field }) => (
                <FormItem>
                  <FormLabel>Yield (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder={defaultYield.toString()} {...field} value={field.value ?? ""} onPointerDown={(event) => seedSuggestedNumber(field, defaultYield, event.currentTarget)} onFocus={(event) => seedSuggestedNumber(field, defaultYield, event.currentTarget)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Evaluation — ratings + taste */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Evaluation</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <FormField control={form.control} name="rating" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Rating <span className="text-muted-foreground text-xs font-normal">(0.05 increments)</span></span>
                    <span className="font-bold text-primary tabular-nums text-lg">{field.value?.toFixed(2) ?? "—"}</span>
                  </FormLabel>
                  <div className="flex gap-3 items-center">
                    <FormControl>
                      <Slider
                        min={0} max={10} step={0.05}
                        value={[field.value ?? 7]}
                        onValueChange={(v) => field.onChange(Math.round(v[0] * 100) / 100)}
                        className="flex-1"
                      />
                    </FormControl>
                    <Input
                      type="number" min={0} max={10} step={0.05}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right tabular-nums"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="preferenceRating" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Preference Rating <span className="text-muted-foreground text-xs font-normal">optional</span></span>
                    {field.value != null && <span className="font-bold tabular-nums">{field.value.toFixed(2)}</span>}
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Personal preference can reach 11 for a rare once-in-a-blue-moon shot. Technical rating stays capped at 10.
                  </p>
                  <div className="flex gap-3 items-center">
                    <FormControl>
                      <Slider
                        min={0} max={11} step={0.05}
                        value={[field.value ?? 0]}
                        onValueChange={(v) => field.onChange(Math.round(v[0] * 100) / 100)}
                        className="flex-1"
                      />
                    </FormControl>
                    <Input
                      type="number" min={0} max={11} step={0.05}
                      value={field.value ?? ""}
                      onChange={(e) => { const v = e.target.value === "" ? undefined : parseFloat(e.target.value); field.onChange(v); }}
                      className="w-20 text-right tabular-nums"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {tasteSelectors.length > 0 && (
                <div className="space-y-2">
                  <Label>Taste Selectors <span className="text-muted-foreground text-xs font-normal">optional — tag this shot</span></Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tasteSelectors.map((ts) => (
                      <button
                        key={ts.id}
                        type="button"
                        onClick={() => toggleTaste(ts.id)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          selectedTastes.includes(ts.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:border-primary/40 text-muted-foreground"
                        )}
                      >
                        {ts.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <FormField control={form.control} name="tasteZone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Taste Zone</FormLabel>
                  <FormControl>
                    <ScalarSelect
                      options={tasteZoneOptions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sensoryNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sensory Notes <span className="text-muted-foreground text-xs font-normal">optional</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bright acidity, chocolate body, clean finish…" className="min-h-[60px]" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Shot Evaluation */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Shot Evaluation</CardTitle></CardHeader>
            <CardContent className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                {/* Shot Status */}
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shot Status</FormLabel>
                    <FormControl>
                      <ScalarSelect
                        options={statusOptions}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Fault Status */}
                <FormField control={form.control} name="faultStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fault Status</FormLabel>
                    <FormControl>
                      <ScalarSelect
                        options={faultStatusOptions}
                        value={(field.value ?? [])[0]}
                        onChange={(value) => field.onChange(value ? [value] : [])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 md:col-span-2">
                  <Checkbox
                    checked={recordGrindWaste}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setRecordGrindWaste(isChecked);
                      if (isChecked && (form.getValues("faultStatus") ?? []).length === 0) {
                        form.setValue("faultStatus", ["Good"]);
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label>Record grind change / purge waste</Label>
                    <p className="text-xs text-muted-foreground">
                      Use for beans purged while changing grind. Counts against bag/hopper remaining, but not basket dose.
                    </p>
                  </div>
                </div>

                {recordGrindWaste && (
                  <FormField control={form.control} name="grindWaste" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grind Waste (g)</FormLabel>
                      <FormControl><Input type="number" step="0.1" min="0" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <Label>Flags</Label>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {/* Reference Shot */}
                  <FormField control={form.control} name="isReference" render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            const ref = checked === true;
                            field.onChange(ref);
                            if (!ref) form.setValue("signatureShot", false);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Reference Shot</FormLabel>
                    </FormItem>
                  )} />
                  {/* Signature Shot — requires Reference Shot */}
                  <FormField control={form.control} name="signatureShot" render={({ field }) => {
                    const isRef = form.watch("isReference");
                    return (
                      <FormItem className="flex items-center gap-2.5 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            disabled={!isRef}
                            onCheckedChange={(checked) => {
                              const sig = checked === true;
                              field.onChange(sig);
                              if (sig) form.setValue("isReference", true);
                            }}
                          />
                        </FormControl>
                        <FormLabel className={cn("font-normal", isRef ? "cursor-pointer" : "cursor-not-allowed opacity-40")}>
                          Signature Shot
                        </FormLabel>
                      </FormItem>
                    );
                  }} />
                  {/* Sour Shot */}
                  <FormField control={form.control} name="sourShot" render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Sour Shot</FormLabel>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-4">
                <div>
                  <Label>Serving Context</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use this to separate your espresso science from guest drinks, milk drinks, or coffees you did not rate.
                    For Others suggests Not Rated but never changes Drink Type — you can still rate it if you tasted it.
                  </p>
                </div>

                <FormField control={form.control} name="drinkType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drink Type</FormLabel>
                    <FormControl>
                      <ScalarSelect
                        options={drinkTypeOptions}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField control={form.control} name="isForOthers" render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            const forOthers = checked === true;
                            field.onChange(forOthers);
                            if (forOthers) form.setValue("rated", false);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">For Others</FormLabel>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="rated" render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === false}
                          onCheckedChange={(checked) => field.onChange(checked === true ? false : true)}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Not Rated</FormLabel>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="finishedShot" render={({ field }) => (
                    <FormItem className="flex items-center gap-2.5 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === false}
                          onCheckedChange={(checked) => field.onChange(checked === true ? false : undefined)}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Did Not Finish</FormLabel>
                    </FormItem>
                  )} />
                </div>

                {form.watch("rated") === false && (
                  <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    Not Rated clears technical and preference ratings when saved. The shot remains in the log as workflow
                    evidence and is unaffected by Include in Analysis below.
                  </p>
                )}
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

              <div className="rounded-lg border p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedEvaluation((value) => !value)}
                  className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Advanced tags</span>
                  {showAdvancedEvaluation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showAdvancedEvaluation && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <FormField control={form.control} name="expressionStyle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expression Style</FormLabel>
                        <ScalarSelect
                          options={expressionStyleOptions}
                          value={(field.value ?? [])[0]}
                          onChange={(value) => field.onChange(value ? [value] : [])}
                        />
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="beanAchievement" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bean Achievement</FormLabel>
                        <ScalarSelect
                          options={beanAchievementOptions}
                          value={(field.value ?? [])[0]}
                          onChange={(value) => field.onChange(value ? [value] : [])}
                        />
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="shotClassification" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shot Classification</FormLabel>
                        <ScalarSelect
                          options={shotClassificationOptions}
                          value={(field.value ?? [])[0]}
                          onChange={(value) => field.onChange(value ? [value] : [])}
                        />
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>

              {/* Notes */}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Anything worth noting about this shot…" className="min-h-[80px]" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" asChild>
              <Link href={isEditing && editingId ? `/shots/${editingId}` : "/shots"}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : isEditing ? "Update Shot" : "Save Shot"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
