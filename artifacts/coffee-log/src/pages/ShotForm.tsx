import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, ChevronDown } from "lucide-react";
import { useCreateShot, getListShotsQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Bag {
  id: number; beanName: string | null; bagNumber: string | null; bagName: string | null; isActive: boolean;
  currentGrindSetting: number | null; currentGrindTime: number | null;
  defaultDose: number | null; defaultYield: number | null; defaultTemp: number | null;
  dialInNotes: string | null;
}

interface TasteSelector { id: number; name: string; category: string; }

function fetchBags(): Promise<Bag[]> { return fetch("/api/bags").then((r) => r.json()); }
function fetchTasteSelectors(): Promise<TasteSelector[]> { return fetch("/api/taste-selectors").then((r) => r.json()); }

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
  temperature: z.coerce.number().optional(),
  rating: z.number().min(0).max(10).optional(),
  preferenceRating: z.number().min(0).max(10).optional(),
  status: z.string().optional(),
  isReference: z.boolean().default(false),
  notes: z.string().optional(),
  sensoryNotes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_OPTIONS = ["Dialed In", "Good", "Experimental", "Recovery/Transitional", "Hopper Refill", "Fault", "Maintenance - Grinder", "Maintenance - Machine"];

export default function ShotForm() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createShot = useCreateShot();
  const [selectedTastes, setSelectedTastes] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: bags = [] } = useQuery({ queryKey: ["bags"], queryFn: fetchBags });
  const { data: tasteSelectors = [] } = useQuery({ queryKey: ["taste-selectors"], queryFn: fetchTasteSelectors });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shotDate: new Date().toISOString().slice(0, 16),
      dose: 18,
      yield: 36,
      temperature: 94,
      rating: 7,
      isReference: false,
      status: "Dialed In",
    },
  });

  const selectedBagId = form.watch("bagId");

  // Auto-fill from bag selection
  useEffect(() => {
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
    createShot.mutate({ data: values }, {
      onSuccess: async (data) => {
        // Link taste selectors
        if (selectedTastes.length > 0 && data.id) {
          await fetch(`/api/shots/${data.id}/taste-selectors`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selectedTastes }),
          });
        }
        toast({ title: "Shot logged" });
        queryClient.invalidateQueries({ queryKey: getListShotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation(`/shots/${data.id}`);
      },
      onError: () => toast({ title: "Failed to log shot", variant: "destructive" }),
    });
  };

  const ratingVal = form.watch("rating") ?? 7;
  const prefRatingVal = form.watch("preferenceRating");

  const activeBag = bags.find((b) => b.isActive);
  const activeBagId = form.watch("bagId");

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/shots"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-serif">Log New Shot</h1>
          <p className="text-sm text-muted-foreground">BigShotEspresso</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Date & Bag */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Setup</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="shotDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} value={field.value?.toString().slice(0, 16) ?? ""} /></FormControl>
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
                  {bags.map((bag) => (
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
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Shot Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Evaluation */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Evaluation</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {/* Rating — slider + numeric input */}
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

              {/* Preference rating */}
              <FormField control={form.control} name="preferenceRating" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>Preference Rating <span className="text-muted-foreground text-xs font-normal">optional</span></span>
                    {field.value != null && <span className="font-bold tabular-nums">{field.value.toFixed(2)}</span>}
                  </FormLabel>
                  <div className="flex gap-3 items-center">
                    <FormControl>
                      <Slider
                        min={0} max={10} step={0.05}
                        value={[field.value ?? 0]}
                        onValueChange={(v) => field.onChange(Math.round(v[0] * 100) / 100)}
                        className="flex-1"
                      />
                    </FormControl>
                    <Input
                      type="number" min={0} max={10} step={0.01}
                      value={field.value ?? ""}
                      onChange={(e) => { const v = e.target.value === "" ? undefined : parseFloat(e.target.value); field.onChange(v); }}
                      className="w-20 text-right tabular-nums"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Taste Selectors */}
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

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes & Observations</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bright acidity, chocolate body, clean finish…" className="min-h-[80px]" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="isReference" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Mark as Reference Shot</FormLabel>
                    <p className="text-sm text-muted-foreground">Mechanically sound and representative — use as a dial-in benchmark</p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" asChild>
              <Link href="/shots">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createShot.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {createShot.isPending ? "Saving…" : "Save Shot"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
