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
import { cn } from "@/lib/utils";
import { ChipSelector } from "@/components/ui/chip-selector";
import { TASTE_ZONE_OPTIONS, curatedOptions, curatedScalarOptions, describeAnalysisEligibility } from "@/lib/selector-options";

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

const formSchema = z.object({
  shotDate: z.string(),
  bagId: z.coerce.number().optional(),
  bean: z.string().optional(),
  bag: z.string().optional(),
  grindSetting: z.coerce.number().optional(),
  grindTime: z.coerce.number().optional(),
  dose: z.coerce.number().optional(),
  yield: z.coerce.number().optional(),
  pourDelay: z.coerce.number().optional(),
  pourTime: z.coerce.number().optional(),
  flowTime: z.coerce.number().optional(),
  temperature: z.coerce.number().optional(),
  rating: z.number().min(0).max(10).optional(),
  preferenceRating: z.number().min(0).max(11).optional(),
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

function ScalarChipSelector({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string | null;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
          !value
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
        )}
      >
        — not set —
      </button>
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(selected ? undefined : option)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
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

  const { data: bags = [] } = useQuery({ queryKey: ["bags"], queryFn: fetchBags });
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
  const expressionStyleOptions = curatedOptions("expressionStyle", form.watch("expressionStyle") ?? []);
  const beanAchievementOptions = curatedOptions("beanAchievement", form.watch("beanAchievement") ?? []);
  const shotClassificationOptions = curatedOptions("shotClassification", form.watch("shotClassification") ?? []);
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
      dose: existingShot.dose ?? undefined,
      yield: existingShot.yield ?? undefined,
      pourDelay: existingShot.pourDelay ?? undefined,
      pourTime: existingShot.pourTime ?? undefined,
      flowTime: existingShot.flowTime ?? undefined,
      temperature: existingShot.temperature ?? undefined,
      rating: existingShot.rating ?? undefined,
      preferenceRating: existingShot.preferenceRating ?? undefined,
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
    setShowAdvancedEvaluation(hasAdvancedEvaluation);
  }, [existingShot, isEditing, form]);

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

    const payload = { ...values, includeInAnalysis: describeAnalysisEligibility(values.status, values.faultStatus ?? []).included };

    if (isEditing && editingId) updateShot.mutate({ id: editingId, data: payload }, handlers);
    else createShot.mutate({ data: payload }, handlers);
  };

  const ratingVal = form.watch("rating") ?? 7;
  const activeBagId = form.watch("bagId");
  const activeBags = bags.filter((b) => b.isActive);
  const previousBags = bags.filter((b) => !b.isActive);
  const visibleBags = showPreviousBags ? bags : activeBags;
  const saving = createShot.isPending || updateShot.isPending;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/shots"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-serif">{isEditing ? "Edit Shot" : "Log New Shot"}</h1>
          <p className="text-sm text-muted-foreground">{isEditing ? "Update saved shot details" : "BigShotEspresso"}</p>
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
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value?.toString().slice(0, 16) ?? ""}
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
                  <FormControl><Input type="number" step="0.01" placeholder="2.33" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="grindTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grind Time (s)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="8.1" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="temperature" render={({ field }) => (
                <FormItem>
                  <FormLabel>Temp (°C)</FormLabel>
                  <FormControl><Input type="number" step="1" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dose (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="yield" render={({ field }) => (
                <FormItem>
                  <FormLabel>Yield (g)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pourTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pour Time (s)</FormLabel>
                  <FormControl><Input type="number" step="1" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pourDelay" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pour Delay (s)</FormLabel>
                  <FormControl><Input type="number" step="0.1" placeholder="7.0" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="flowTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Flow Time (s)</FormLabel>
                  <FormControl><Input type="number" step="1" {...field} value={field.value ?? ""} /></FormControl>
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
                    <span>Rating <span className="text-muted-foreground text-xs font-normal">(supports decimals, e.g. 8.78)</span></span>
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
                      type="number" min={0} max={10} step={0.01}
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
                      type="number" min={0} max={11} step={0.01}
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
                    <ScalarChipSelector
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
                      <ScalarChipSelector
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
                      <ScalarChipSelector
                        options={faultStatusOptions}
                        value={(field.value ?? [])[0]}
                        onChange={(value) => field.onChange(value ? [value] : [])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
                        <ChipSelector
                          options={expressionStyleOptions}
                          value={field.value ?? []}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="beanAchievement" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bean Achievement</FormLabel>
                        <ChipSelector
                          options={beanAchievementOptions}
                          value={field.value ?? []}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="shotClassification" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shot Classification</FormLabel>
                        <ChipSelector
                          options={shotClassificationOptions}
                          value={field.value ?? []}
                          onChange={field.onChange}
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
