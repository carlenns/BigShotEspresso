import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Archive, Plus, Star, Package, Pencil, ChevronRight, ClipboardCheck, RefreshCw, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListHoppers, getListHoppersQueryKey } from "@workspace/api-client-react";

const HOPPER_PHASE_OPTIONS = ["Phase 1", "Phase 2", "Phase 3", "End of Bag", "Single Bag Phase", "Custom"] as const;

interface Bean { id: number; name: string; }
interface Bag {
  id: number; beanId: number | null; beanName: string | null; bagNumber: string | null;
  bagName: string | null; purchaseDate: string | null; roastDate: string | null;
  roastDateUsed: string | null; estimatedRoastWindow: string | null; actualRoastDate: string | null;
  estimatedRoastDate: string | null; freshnessDatingMethod: string | null;
  roastDateConfidence: string | null; roastDateNotes: string | null;
  openedDate: string | null; bagWeight: number | null; remainingEstimate: number | null;
  cost: number | null; isActive: boolean;
  startGrindSetting: number | null; currentGrindSetting: number | null;
  startGrindTime: number | null; currentGrindTime: number | null;
  defaultDose: number | null; defaultYield: number | null; defaultTemp: number | null;
  dialInNotes: string | null; notes: string | null;
  shotCount: number; referenceCount: number; dailyDriverCount: number; avgRating: number | null;
  avgPrefRating: number | null; weightedScore: number | null;
  ratingWeights: { technicalWeight: number; preferenceWeight: number };
  grindRange: { min: number | null; max: number | null } | null;
  closedOutDate: string | null; daysSinceClosedOut: number | null;
}

function fetchBags(): Promise<Bag[]> { return fetch("/api/bags").then((r) => r.json()); }
function fetchBeans(): Promise<Bean[]> { return fetch("/api/beans").then((r) => r.json()); }

const ROAST_DATE_CONFIDENCE = ["Exact", "Estimated High", "Estimated Medium", "Estimated Low", "Unknown"];

// How a Roast Date was derived — distinct from Roast Date Confidence (how
// sure you are). "Best-Before Minus One Year" covers roasters (e.g. De
// Luca's) that print a Best-Before date rather than a roast date; see the
// helper copy near its selector below for the concrete example.
const FRESHNESS_DATING_METHOD_OPTIONS = [
  "Exact Roast Date",
  "Best-Before Minus One Year",
  "Roaster / Staff Confirmed",
  "Printed Bag Code",
  "Unknown",
  "Other",
];

function todayDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Suggests the next Bag Number as one higher than the highest existing
// *purely* numeric bagNumber (e.g. "7" -> "8"). Ignores non-numeric or mixed
// values ("7-Trial", "Sample") rather than guessing at their meaning.
// Returns "" when no numeric bag numbers exist so the caller can fall back
// gracefully instead of suggesting a made-up starting number.
function suggestNextBagNumber(bags: Bag[]): string {
  const numeric = bags
    .map((b) => b.bagNumber?.trim())
    .filter((n): n is string => !!n && /^\d+$/.test(n))
    .map(Number);
  return numeric.length > 0 ? String(Math.max(...numeric) + 1) : "";
}

export default function Bags() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: bags = [], isLoading } = useQuery({ queryKey: ["bags"], queryFn: fetchBags });
  const { data: beans = [] } = useQuery({ queryKey: ["beans"], queryFn: fetchBeans });
  const { data: hoppers = [] } = useListHoppers();
  const activeHopperPhaseByBagId = new Map(
    hoppers.filter((h) => h.isActive && h.bagId != null).map((h) => [h.bagId as number, h.phase ?? null]),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bag | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [closeoutBag, setCloseoutBag] = useState<Bag | null>(null);
  const [closeoutForm, setCloseoutForm] = useState({ closedOutDate: todayDate(), leftoverMeasured: "measured", remainingEstimate: "", reconciliationNotes: "" });
  const [startPhaseBag, setStartPhaseBag] = useState<Bag | null>(null);
  const [startPhaseForm, setStartPhaseForm] = useState({ phase: "Phase 1", customLabel: "", startingBeans: "", notes: "" });
  const [startingBeansPrefilled, setStartingBeansPrefilled] = useState(false);
  const [changeBagOpen, setChangeBagOpen] = useState(false);

  const blankForm = () => ({ beanId: "", bagNumber: "", bagName: "", purchaseDate: "", roastDate: "", roastDateUsed: "", estimatedRoastWindow: "", actualRoastDate: "", estimatedRoastDate: "", freshnessDatingMethod: "", roastDateConfidence: "", roastDateNotes: "", openedDate: "", closedOutDate: "", bagWeight: "", remainingEstimate: "", cost: "", isActive: "false", startGrindSetting: "", currentGrindSetting: "", startGrindTime: "", currentGrindTime: "", defaultDose: "", defaultYield: "", defaultTemp: "", dialInNotes: "", notes: "" });

  const openNew = () => { setEditing(null); setForm(blankForm()); setOpen(true); };
  const openEdit = (b: Bag) => {
    setEditing(b);
    setForm({ beanId: String(b.beanId ?? ""), bagNumber: b.bagNumber ?? "", bagName: b.bagName ?? "", purchaseDate: b.purchaseDate ?? "", roastDate: b.roastDate ?? "", roastDateUsed: b.roastDateUsed ?? "", estimatedRoastWindow: b.estimatedRoastWindow ?? "", actualRoastDate: b.actualRoastDate ?? "", estimatedRoastDate: b.estimatedRoastDate ?? "", freshnessDatingMethod: b.freshnessDatingMethod ?? "", roastDateConfidence: b.roastDateConfidence ?? "", roastDateNotes: b.roastDateNotes ?? "", openedDate: b.openedDate ?? "", closedOutDate: b.closedOutDate?.slice(0, 10) ?? "", bagWeight: String(b.bagWeight ?? ""), remainingEstimate: String(b.remainingEstimate ?? ""), cost: String(b.cost ?? ""), isActive: String(b.isActive), startGrindSetting: String(b.startGrindSetting ?? ""), currentGrindSetting: String(b.currentGrindSetting ?? ""), startGrindTime: String(b.startGrindTime ?? ""), currentGrindTime: String(b.currentGrindTime ?? ""), defaultDose: String(b.defaultDose ?? ""), defaultYield: String(b.defaultYield ?? ""), defaultTemp: String(b.defaultTemp ?? ""), dialInNotes: b.dialInNotes ?? "", notes: b.notes ?? "" });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/bags/${editing.id}` : "/api/bags";
      const method = editing ? "PATCH" : "POST";
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v === "" || v === "null" || v === "undefined") continue;
        if (k === "isActive") body[k] = v === "true";
        else if (k === "beanId" || k === "defaultTemp") body[k] = parseInt(v, 10);
        else if (["startGrindSetting", "currentGrindSetting", "startGrindTime", "currentGrindTime", "defaultDose", "defaultYield", "bagWeight", "remainingEstimate", "cost"].includes(k)) body[k] = parseFloat(v);
        else body[k] = v;
      }
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bags"] }); setOpen(false); toast({ title: editing ? "Bag updated" : "Bag added" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const closeBagMutation = useMutation({
    mutationFn: async () => {
      if (!closeoutBag) throw new Error("No bag selected");
      const measured = closeoutForm.leftoverMeasured === "measured";
      const existingNotes = closeoutBag.notes?.trim();
      const closeoutNotes = [
        existingNotes,
        [
          `Closeout ${closeoutForm.closedOutDate || todayDate()}.`,
          measured
            ? (closeoutForm.remainingEstimate ? `Remaining beans/chute mass: ${closeoutForm.remainingEstimate}g (measured).` : "Remaining beans/chute mass not recorded.")
            : "Remaining beans/chute mass intentionally not measured at closeout.",
          closeoutForm.reconciliationNotes.trim() || null,
        ].filter(Boolean).join(" "),
      ].filter(Boolean).join("\n\n");

      const body: Record<string, unknown> = {
        isActive: false,
        closedOutDate: closeoutForm.closedOutDate || todayDate(),
        notes: closeoutNotes,
      };
      // Explicit measured-vs-unmeasured distinction: an intentional skip
      // clears any stale prior estimate instead of leaving old data behind
      // that would misleadingly look like a fresh measurement.
      if (!measured) body.remainingEstimate = null;
      else if (closeoutForm.remainingEstimate !== "") body.remainingEstimate = Number(closeoutForm.remainingEstimate);

      const r = await fetch(`/api/bags/${closeoutBag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["intelligence"] });
      qc.invalidateQueries({ queryKey: ["dashboard-intelligence"] });
      setCloseoutBag(null);
      toast({ title: "Bag closed out", description: "Closeout evidence was saved. Next: start a new bag and hopper phase when ready." });
    },
    onError: (e) => toast({ title: "Closeout failed", description: String(e), variant: "destructive" }),
  });

  const startPhaseMutation = useMutation({
    mutationFn: async () => {
      if (!startPhaseBag) throw new Error("No bag selected");
      const phase = startPhaseForm.phase;
      const customLabel = startPhaseForm.customLabel.trim();
      const notes = startPhaseForm.notes.trim();
      if (phase === "Custom" && !customLabel && !notes) {
        throw new Error("Custom phase needs a custom label or notes explaining it.");
      }
      const combinedNotes = [customLabel ? `Custom: ${customLabel}.` : null, notes || null].filter(Boolean).join(" ");
      const name = `Bag #${startPhaseBag.bagNumber ?? startPhaseBag.id} — ${phase} — ${todayDate()}`;
      const body: Record<string, unknown> = {
        name,
        bagId: startPhaseBag.id,
        isActive: true,
        phase,
      };
      if (startPhaseForm.startingBeans !== "") body.startingBeans = Number(startPhaseForm.startingBeans);
      if (combinedNotes) body.notes = combinedNotes;

      const r = await fetch("/api/hoppers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListHoppersQueryKey() });
      qc.invalidateQueries({ queryKey: ["dashboard-intelligence"] });
      setStartPhaseBag(null);
      toast({ title: "Hopper phase started", description: "The new phase is now active for this bag." });
    },
    onError: (e) => toast({ title: "Could not start phase", description: String(e), variant: "destructive" }),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openStartPhase = (bag: Bag) => {
    setStartPhaseBag(bag);
    // Only safe/obvious prefill: this bag has never had a hopper phase before,
    // so the full recorded bag weight is a reasonable starting point. Once a
    // bag already has phase history, BSE doesn't track exact depletion
    // between phases, so guessing a number would be misleading — leave blank.
    const isFirstPhaseForBag = !hoppers.some((h) => h.bagId === bag.id);
    const prefill = isFirstPhaseForBag && bag.bagWeight != null;
    setStartingBeansPrefilled(prefill);
    setStartPhaseForm({
      phase: "Phase 1",
      customLabel: "",
      startingBeans: prefill ? String(bag.bagWeight) : "",
      notes: "",
    });
  };

  const openCloseout = (bag: Bag) => {
    setCloseoutBag(bag);
    setCloseoutForm({
      closedOutDate: bag.closedOutDate?.slice(0, 10) ?? todayDate(),
      leftoverMeasured: "measured",
      remainingEstimate: bag.remainingEstimate != null ? String(bag.remainingEstimate) : "",
      reconciliationNotes: "",
    });
  };

  const activeBags = bags.filter((b) => b.isActive);
  const inactiveBags = bags.filter((b) => !b.isActive);

  // Preserve a historical Freshness Dating Method value that predates this
  // curated list (e.g. imported free text) by keeping it selectable rather
  // than letting the Select silently show it as unmatched.
  const freshnessDatingMethodOptions = form.freshnessDatingMethod && !FRESHNESS_DATING_METHOD_OPTIONS.includes(form.freshnessDatingMethod)
    ? [...FRESHNESS_DATING_METHOD_OPTIONS, form.freshnessDatingMethod]
    : FRESHNESS_DATING_METHOD_OPTIONS;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" /> Bags
          </h1>
          <p className="text-muted-foreground mt-1">Each bag linked to a bean with its own grind defaults and shot history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setChangeBagOpen(true)} className="gap-2">
            <ArrowRightLeft className="h-4 w-4" /> {activeBags.length > 0 ? "Change Bag" : "Start New Bag"}
          </Button>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Bag</Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold">Bag Lifecycle Flow</h2>
                <p className="text-sm text-muted-foreground">
                  Use this flow when switching coffees: preserve old-bag evidence, then start the new bag cleanly.
                  The "Change Bag" button above runs this whole flow in one guided dialog; each active bag's own
                  Close and Start Phase buttons below do just one step at a time, if that's all you need.
                </p>
              </div>
              <ol className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Close / Reconcile Old Bag",
                  "Record Maintenance Or Purge Waste",
                  "Create Or Select Bean",
                  "Create New Active Bag",
                  "Fill / Reset Hopper Phase",
                  "Dial In Before Stable Logging",
                ].map((step, index) => (
                  <li key={step} className="rounded-md border bg-background/75 px-3 py-2">
                    <span className="text-xs font-medium text-primary">Step {index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground">
                Launch-safe note: closeout and starting a new hopper phase are both available today on an active bag.
                Dedicated lifecycle events for hopper top-ups and cleanout are still planned next, so
                those actions are not yet mixed into drink-shot analysis. Maintenance (backflush, Cafiza clean,
                grinder cleanout) is planned as its own calm workflow with non-blocking reminders, separate from
                shot logging and from Shot Classification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : bags.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bags yet.</p>
          <p className="text-sm mt-1">Add a bag to link shots to a specific bean purchase.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeBags.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Active</h2>
              <div className="space-y-2">{activeBags.map((b) => <BagRow key={b.id} bag={b} onEdit={openEdit} onCloseout={openCloseout} onStartPhase={openStartPhase} hopperPhase={activeHopperPhaseByBagId.get(b.id) ?? null} />)}</div>
            </section>
          )}
          {inactiveBags.length > 0 && (
            <section className="opacity-80">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Previous Bags</h2>
              <div className="space-y-2">{inactiveBags.map((b) => <BagRow key={b.id} bag={b} onEdit={openEdit} onCloseout={openCloseout} />)}</div>
            </section>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Bag" : "Add Bag"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Bean</Label>
              <Select value={form.beanId || "__none__"} onValueChange={(v) => set("beanId", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select bean…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not linked —</SelectItem>
                  {beans.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Bag Number</Label><Input value={form.bagNumber} onChange={(e) => set("bagNumber", e.target.value)} placeholder="e.g. 4" /></div>
            <div className="space-y-1.5"><Label>Bag Name / Label</Label><Input value={form.bagName} onChange={(e) => set("bagName", e.target.value)} placeholder="e.g. Summer 2026" /></div>
            <div className="space-y-1.5"><Label>Purchase Date</Label><Input value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} placeholder="2026-05-20" /></div>
            <div className="space-y-1.5"><Label>Roast Date</Label><Input value={form.roastDate} onChange={(e) => set("roastDate", e.target.value)} placeholder="2026-05-15" /></div>
            <div className="space-y-1.5"><Label>Roast Date Used</Label><Input value={form.roastDateUsed} onChange={(e) => set("roastDateUsed", e.target.value)} placeholder="Actual or estimated date used by app" /></div>
            <div className="space-y-1.5">
              <Label>Roast Date Confidence</Label>
              <Select value={form.roastDateConfidence || "__none__"} onValueChange={(v) => set("roastDateConfidence", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {ROAST_DATE_CONFIDENCE.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Actual Roast Date</Label><Input value={form.actualRoastDate} onChange={(e) => set("actualRoastDate", e.target.value)} placeholder="2026-08-15" /></div>
            <div className="space-y-1.5"><Label>Estimated Roast Date</Label><Input value={form.estimatedRoastDate} onChange={(e) => set("estimatedRoastDate", e.target.value)} placeholder="2026-08-10" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Estimated Roast Window</Label><Input value={form.estimatedRoastWindow} onChange={(e) => set("estimatedRoastWindow", e.target.value)} placeholder="2026-08-03 to 2026-08-17" /></div>
            <div className="col-span-2 space-y-1.5">
              <Label>Freshness Dating Method</Label>
              <Select value={form.freshnessDatingMethod || "__none__"} onValueChange={(v) => set("freshnessDatingMethod", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {freshnessDatingMethodOptions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">
              Roast Date can be exact or your best estimate. Freshness Dating Method records how you derived it — e.g. some roasters like De Luca's print a Best-Before date rather than a roast date; De Luca's own Best-Before month/year appears to be about one year after the roast/packing month, so pick "Best-Before Minus One Year" and set Roast Date Confidence to Estimated High for the month (lower if you need the exact day and it isn't confirmed). If Dating Method is "Other", describe it in Roast Date Notes below.
            </p>
            <div className="col-span-2 space-y-1.5"><Label>Roast Date Notes</Label><Input value={form.roastDateNotes} onChange={(e) => set("roastDateNotes", e.target.value)} placeholder="Evidence for actual/estimated roast date…" /></div>
            <div className="space-y-1.5"><Label>Opened Date</Label><Input type="date" value={form.openedDate} onChange={(e) => set("openedDate", e.target.value)} placeholder="2026-05-22" /></div>
            <div className="space-y-1.5"><Label>Closed Out Date</Label><Input type="date" value={form.closedOutDate} onChange={(e) => set("closedOutDate", e.target.value)} placeholder="2026-08-17" /></div>
            <div className="space-y-1.5"><Label>Bag Weight (g)</Label><Input type="number" value={form.bagWeight} onChange={(e) => set("bagWeight", e.target.value)} placeholder="250" /></div>
            <div className="space-y-1.5"><Label>Remaining Est. (g)</Label><Input type="number" value={form.remainingEstimate} onChange={(e) => set("remainingEstimate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Cost ($)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="25.00" /></div>
            <div className="col-span-2"><hr className="border-border" /></div>
            <div className="space-y-1.5"><Label>Start Grind Setting</Label><Input type="number" step="0.01" value={form.startGrindSetting} onChange={(e) => set("startGrindSetting", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Current Grind Setting</Label><Input type="number" step="0.01" value={form.currentGrindSetting} onChange={(e) => set("currentGrindSetting", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Start Grind Time (s)</Label><Input type="number" step="0.1" value={form.startGrindTime} onChange={(e) => set("startGrindTime", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Current Grind Time (s)</Label><Input type="number" step="0.1" value={form.currentGrindTime} onChange={(e) => set("currentGrindTime", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Default Dose (g)</Label><Input type="number" step="0.1" value={form.defaultDose} onChange={(e) => set("defaultDose", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Default Yield (g)</Label><Input type="number" step="0.1" value={form.defaultYield} onChange={(e) => set("defaultYield", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Default Temp (°C)</Label><Input type="number" value={form.defaultTemp} onChange={(e) => set("defaultTemp", e.target.value)} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="font-normal">Active Bag</Label>
              <Switch
                checked={form.isActive === "true"}
                onCheckedChange={(v) => {
                  setForm((current) => ({
                    ...current,
                    isActive: String(v),
                    closedOutDate: v ? "" : current.closedOutDate || todayDate(),
                  }));
                }}
              />
            </div>
            {form.isActive === "true" && activeBags.filter((b) => b.id !== editing?.id).length > 0 && (
              <div className="col-span-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  {activeBags.filter((b) => b.id !== editing?.id).length === 1
                    ? "Another bag is also marked active."
                    : `${activeBags.filter((b) => b.id !== editing?.id).length} other bags are also marked active.`}{" "}
                  This is allowed but usually means one should be closed out — the "Change Bag" button on this
                  page handles closing the old bag for you.
                </span>
              </div>
            )}
            <div className="col-span-2 space-y-1.5"><Label>Dial-in Notes</Label><Input value={form.dialInNotes} onChange={(e) => set("dialInNotes", e.target.value)} placeholder="Key observations during dial-in…" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : editing ? "Save" : "Add Bag"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closeoutBag} onOpenChange={(isOpen) => !isOpen && setCloseoutBag(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Close Out Bag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{closeoutBag?.beanName ?? "Unknown Bean"}</p>
              <p className="text-muted-foreground">Bag #{closeoutBag?.bagNumber ?? closeoutBag?.id}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Close Out Bag records that you have stopped using this bag: it marks the bag inactive and saves your
              leftover and cleanout notes as evidence. It never edits past shots and does not start the next bag.
            </p>
            <div className="space-y-1.5">
              <Label>Closed Out Date</Label>
              <Input
                type="date"
                value={closeoutForm.closedOutDate}
                onChange={(e) => setCloseoutForm((current) => ({ ...current, closedOutDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Leftover Beans / Chute Mass</Label>
              <Select
                value={closeoutForm.leftoverMeasured}
                onValueChange={(v) => setCloseoutForm((current) => ({ ...current, leftoverMeasured: v, remainingEstimate: v === "unmeasured" ? "" : current.remainingEstimate }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="measured">I measured it</SelectItem>
                  <SelectItem value="unmeasured">Not measured — intentionally skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {closeoutForm.leftoverMeasured === "measured" && (
              <div className="space-y-1.5">
                <Label>Remaining Beans / Chute Mass (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={closeoutForm.remainingEstimate}
                  onChange={(e) => setCloseoutForm((current) => ({ ...current, remainingEstimate: e.target.value }))}
                  placeholder="e.g. 121"
                />
                <p className="text-xs text-muted-foreground">This is reconciliation evidence. It does not rewrite past shot consumption.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Closeout / Cleanout Notes</Label>
              <Input
                value={closeoutForm.reconciliationNotes}
                onChange={(e) => setCloseoutForm((current) => ({ ...current, reconciliationNotes: e.target.value }))}
                placeholder="e.g. weighed old beans, purged grinder, backflushed"
              />
              <p className="text-xs text-muted-foreground">
                Also a good place for grinder purge, hopper emptying, or machine cleaning you did between bags.
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 space-y-1">
              <p>Closing this bag marks it inactive as of the closed-out date above.</p>
              <p>Your remaining-beans estimate is saved as reconciliation evidence only — it does not rewrite or recalculate past shot consumption.</p>
              <p>Closeout notes are saved to this bag's record for later reference.</p>
              <p>Maintenance, purge waste, and hopper cleanout are not yet tracked as their own lifecycle events — for now, note them here or in the bag's Notes field. A dedicated maintenance workflow (with calm, non-blocking reminders such as backflush or Cafiza clean) is planned separately from shot logging. The bag's active hopper phase (if any) is not automatically closed by this action.</p>
              <p className="font-medium">Next: create or select your new bag, then use Start Hopper Phase once you're ready to begin tracking it.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseoutBag(null)}>Cancel</Button>
            <Button onClick={() => closeBagMutation.mutate()} disabled={closeBagMutation.isPending}>
              {closeBagMutation.isPending ? "Closing…" : "Close Bag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!startPhaseBag} onOpenChange={(isOpen) => !isOpen && setStartPhaseBag(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start Hopper Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{startPhaseBag?.beanName ?? "Unknown Bean"}</p>
              <p className="text-muted-foreground">Bag #{startPhaseBag?.bagNumber ?? startPhaseBag?.id}</p>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              A hopper phase is a measured operating window you choose to track from this point forward — not a
              count of every bean physically left in the hopper or bag. Starting a new phase means recording the
              beans you're <em>adding now</em> — you don't have to empty the hopper first. Unmeasured carryover
              from the previous phase can be intentionally left out of this baseline and just stays in the hopper.
              The Dashboard's Bag Progress still tracks whole-bag consumed and remaining separately from this phase baseline.
            </div>

            {activeBags.length > 1 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Another bag is also marked active ({activeBags.length} active bags total). This is allowed but usually means one of them should be closed out.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Phase</Label>
              <Select value={startPhaseForm.phase} onValueChange={(v) => setStartPhaseForm((f) => ({ ...f, phase: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOPPER_PHASE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {startPhaseForm.phase === "Single Bag Phase" && (
                <p className="text-xs text-muted-foreground">
                  Treats the whole bag as one tracked phase — use it when you won't split this bag into separate hopper loads.
                </p>
              )}
              {startPhaseForm.phase === "End of Bag" && (
                <p className="text-xs text-muted-foreground">
                  The final leftover phase after earlier measured phases are used up — not a fixed amount of its own.
                </p>
              )}
            </div>

            {startPhaseForm.phase === "Custom" && (
              <div className="space-y-1.5">
                <Label>Custom Phase Label</Label>
                <Input
                  value={startPhaseForm.customLabel}
                  onChange={(e) => setStartPhaseForm((f) => ({ ...f, customLabel: e.target.value }))}
                  placeholder="e.g. Guest drink hopper"
                />
                <p className="text-xs text-muted-foreground">Required unless you explain this phase in Notes below.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Starting Beans / Phase Baseline (g)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={startPhaseForm.startingBeans}
                onChange={(e) => {
                  setStartingBeansPrefilled(false);
                  setStartPhaseForm((f) => ({ ...f, startingBeans: e.target.value }));
                }}
                placeholder="e.g. 250"
              />
              <p className="text-xs text-muted-foreground">
                {startingBeansPrefilled
                  ? "Pre-filled from this bag's recorded weight, since this is its first hopper phase. Adjust if you're loading less."
                  : "Enter the measured beans you're adding now — not the total in the hopper. Any unmeasured carryover from the previous phase isn't counted here. BSE doesn't track exact bean depletion between phases, so this isn't auto-filled."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">optional</span></Label>
              <Input
                value={startPhaseForm.notes}
                onChange={(e) => setStartPhaseForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. resumed dosing after cleaning"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              This creates a new active Hopper record named "Bag #{startPhaseBag?.bagNumber ?? startPhaseBag?.id} —{" "}
              {startPhaseForm.phase} — {todayDate()}" and deactivates any previous active hopper for this bag. It does not modify past phases.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartPhaseBag(null)}>Cancel</Button>
            <Button onClick={() => startPhaseMutation.mutate()} disabled={startPhaseMutation.isPending}>
              {startPhaseMutation.isPending ? "Starting…" : "Start Phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangeBagDialog
        open={changeBagOpen}
        onOpenChange={setChangeBagOpen}
        activeBags={activeBags}
        allBags={bags}
        beans={beans}
        qc={qc}
        toast={toast}
      />
    </div>
  );
}

function BagRow({ bag, onEdit, onCloseout, onStartPhase, hopperPhase }: { bag: Bag; onEdit: (b: Bag) => void; onCloseout: (b: Bag) => void; onStartPhase?: (b: Bag) => void; hopperPhase?: string | null }) {
  return (
    <Card className={cn("transition-colors hover:border-primary/40", bag.isActive && "border-primary/50 bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-lg">{bag.beanName ?? "Unknown Bean"}</span>
              {bag.bagName && <span className="text-muted-foreground text-sm">{bag.bagName}</span>}
              <Badge variant="outline" className="text-xs">#{bag.bagNumber ?? bag.id}</Badge>
              {bag.isActive && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Active</Badge>}
              {bag.isActive && hopperPhase && <Badge variant="secondary" className="text-xs">Hopper: {hopperPhase}</Badge>}
              {bag.isActive && !hopperPhase && onStartPhase && (
                <button
                  type="button"
                  onClick={() => onStartPhase(bag)}
                  className="text-xs text-amber-700 dark:text-amber-400 underline decoration-dotted underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300"
                >
                  No active hopper phase — start one
                </button>
              )}
              {!bag.isActive && bag.daysSinceClosedOut != null && (
                <Badge variant="outline" className="text-xs">Closed {bag.daysSinceClosedOut}d ago</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {bag.roastDate && <span>Roasted: {bag.roastDate}</span>}
              {bag.roastDateConfidence && <span>Roast confidence: {bag.roastDateConfidence}</span>}
              {bag.estimatedRoastWindow && <span>Estimated roast: {bag.estimatedRoastWindow}</span>}
              {bag.openedDate && <span>Opened: {bag.openedDate}</span>}
              {!bag.isActive && bag.closedOutDate && <span>Closed: {bag.closedOutDate.slice(0, 10)}</span>}
              {!bag.isActive && bag.remainingEstimate != null && <span>Reconciled remaining: {bag.remainingEstimate}g</span>}
              {bag.currentGrindSetting != null && <span>Grind: <strong className="text-foreground">{bag.currentGrindSetting}</strong></span>}
              {bag.defaultDose != null && <span>Dose: <strong className="text-foreground">{bag.defaultDose}g</strong></span>}
              {bag.defaultYield != null && <span>Yield: <strong className="text-foreground">{bag.defaultYield}g</strong></span>}
              {bag.bagWeight != null && <span>{bag.bagWeight}g bag</span>}
              {bag.cost != null && <span>Cost: <strong className="text-foreground">${Number(bag.cost).toFixed(2)}</strong></span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="text-right text-sm">
              <p className="text-muted-foreground">
                {bag.shotCount} shots · {bag.referenceCount} refs · {bag.dailyDriverCount} daily drivers
              </p>
              {bag.weightedScore != null ? (
                <div className="text-right">
                  <p className="flex items-center gap-1 text-amber-600 font-medium justify-end">
                    <Star className="h-3.5 w-3.5 fill-current" />{Number(bag.weightedScore).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Weighted · Tech {bag.ratingWeights.technicalWeight}% / Pref {bag.ratingWeights.preferenceWeight}%
                  </p>
                </div>
              ) : bag.avgRating != null && (
                <p className="flex items-center gap-1 text-amber-600 font-medium justify-end">
                  <Star className="h-3.5 w-3.5 fill-current" />{Number(bag.avgRating).toFixed(1)}
                </p>
              )}
            </div>
            {bag.isActive && onStartPhase && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onStartPhase(bag)}>
                <RefreshCw className="h-3.5 w-3.5" /> Start Phase
              </Button>
            )}
            {bag.isActive && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onCloseout(bag)}>
                <Archive className="h-3.5 w-3.5" /> Close
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(bag)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/bags/${bag.id}`}><ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
        {bag.dialInNotes && <p className="mt-2 text-sm text-muted-foreground border-t pt-2 truncate">{bag.dialInNotes}</p>}
      </CardContent>
    </Card>
  );
}

// ── Change Bag guided flow ──────────────────────────────────────────────────
// Walks through: (1) optionally close the current active bag, (2) create or
// select the new bean, (3) create the new active bag, (4) optionally start
// its first hopper phase. Reuses only the existing PATCH /api/bags/:id,
// POST /api/beans, POST /api/bags, and POST /api/hoppers endpoints — no
// schema or API changes. Submission order is deliberately NOT the same as
// the on-screen reading order: the new bag is created before the old one is
// closed, so a failure partway through never leaves the user with zero
// active bags — worst case is two active bags temporarily, which the
// existing "Close" action already recovers from safely.
function ChangeBagDialog({
  open,
  onOpenChange,
  activeBags,
  allBags,
  beans,
  qc,
  toast,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeBags: Bag[];
  allBags: Bag[];
  beans: Bean[];
  qc: QueryClient;
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void;
}) {
  const blank = () => ({
    closeOld: activeBags.length > 0,
    bagToCloseId: activeBags[0] ? String(activeBags[0].id) : "",
    leftoverMeasured: "measured",
    remainingEstimate: "",
    closeoutNotes: "",
    beanMode: beans.length > 0 ? "existing" : "new",
    existingBeanId: beans[0] ? String(beans[0].id) : "",
    newBeanName: "",
    newBeanRoaster: "",
    newBeanOrigin: "",
    bagNumber: suggestNextBagNumber(allBags),
    bagName: "",
    bagWeight: "",
    purchaseDate: "",
    roastDate: "",
    roastDateConfidence: "",
    startPhase: true,
    phase: "Phase 1",
    customLabel: "",
    startingBeans: "",
    phaseNotes: "",
  });
  const [form, setForm] = useState(blank());

  // Re-seed defaults each time the dialog opens, since activeBags/beans may
  // have changed since the last time it was open.
  const wasOpen = React.useRef(false);
  if (open && !wasOpen.current) setForm(blank());
  wasOpen.current = open;

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Reflects the suggestion Bag Number was *seeded* with (not the live form
  // value, which the user may since have edited) — used only to pick the
  // right helper copy below.
  const suggestedBagNumber = suggestNextBagNumber(allBags);

  const changeBagMutation = useMutation({
    mutationFn: async () => {
      // 1. Resolve the bean (existing or newly created).
      let beanId: number;
      if (form.beanMode === "existing") {
        if (!form.existingBeanId) throw new Error("Select a bean for the new bag.");
        beanId = Number(form.existingBeanId);
      } else {
        if (!form.newBeanName.trim()) throw new Error("Enter a name for the new bean.");
        const beanRes = await fetch("/api/beans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.newBeanName.trim(),
            roaster: form.newBeanRoaster.trim() || undefined,
            origin: form.newBeanOrigin.trim() || undefined,
          }),
        });
        if (!beanRes.ok) throw new Error(`Could not create the new bean: ${await beanRes.text()}`);
        beanId = (await beanRes.json()).id;
      }

      // 2. Create the new bag, active, before touching the old one — if this
      // fails, nothing else has changed yet.
      const bagBody: Record<string, unknown> = { beanId, isActive: true };
      if (form.bagNumber.trim()) bagBody.bagNumber = form.bagNumber.trim();
      if (form.bagName.trim()) bagBody.bagName = form.bagName.trim();
      if (form.bagWeight !== "") bagBody.bagWeight = Number(form.bagWeight);
      if (form.purchaseDate) bagBody.purchaseDate = form.purchaseDate;
      if (form.roastDate) bagBody.roastDate = form.roastDate;
      if (form.roastDateConfidence) bagBody.roastDateConfidence = form.roastDateConfidence;
      bagBody.openedDate = todayDate();
      const bagRes = await fetch("/api/bags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bagBody),
      });
      if (!bagRes.ok) throw new Error(`Could not create the new bag: ${await bagRes.text()}`);
      const newBag = await bagRes.json();

      // 3. Optionally close the old bag now that the new one exists.
      if (form.closeOld && form.bagToCloseId) {
        const measured = form.leftoverMeasured === "measured";
        const oldBag = activeBags.find((b) => b.id === Number(form.bagToCloseId));
        const existingNotes = oldBag?.notes?.trim();
        const closeoutNotes = [
          existingNotes,
          [
            `Closeout ${todayDate()} (via Change Bag).`,
            measured
              ? (form.remainingEstimate ? `Remaining beans/chute mass: ${form.remainingEstimate}g (measured).` : "Remaining beans/chute mass not recorded.")
              : "Remaining beans/chute mass intentionally not measured at closeout.",
            form.closeoutNotes.trim() || null,
          ].filter(Boolean).join(" "),
        ].filter(Boolean).join("\n\n");
        const closeBody: Record<string, unknown> = {
          isActive: false,
          closedOutDate: todayDate(),
          notes: closeoutNotes,
        };
        if (!measured) closeBody.remainingEstimate = null;
        else if (form.remainingEstimate !== "") closeBody.remainingEstimate = Number(form.remainingEstimate);
        const closeRes = await fetch(`/api/bags/${form.bagToCloseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(closeBody),
        });
        if (!closeRes.ok) {
          throw new Error(`New bag "${newBag.bagName ?? newBag.bagNumber ?? newBag.id}" was created and is active, but the old bag could not be closed: ${await closeRes.text()}. Close it manually from the Bags list.`);
        }
      }

      // 4. Optionally start the first hopper phase for the new bag.
      if (form.startPhase) {
        const phase = form.phase;
        const customLabel = form.customLabel.trim();
        const phaseNotes = form.phaseNotes.trim();
        if (phase === "Custom" && !customLabel && !phaseNotes) {
          throw new Error(`New bag "${newBag.bagName ?? newBag.bagNumber ?? newBag.id}" was created and is active, but Custom phase needs a custom label or notes. Start the hopper phase separately from the Bags list.`);
        }
        const combinedNotes = [customLabel ? `Custom: ${customLabel}.` : null, phaseNotes || null].filter(Boolean).join(" ");
        const hopperName = `Bag #${newBag.bagNumber ?? newBag.id} — ${phase} — ${todayDate()}`;
        const hopperBody: Record<string, unknown> = { name: hopperName, bagId: newBag.id, isActive: true, phase };
        if (form.startingBeans !== "") hopperBody.startingBeans = Number(form.startingBeans);
        if (combinedNotes) hopperBody.notes = combinedNotes;
        const hopperRes = await fetch("/api/hoppers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hopperBody),
        });
        if (!hopperRes.ok) {
          throw new Error(`New bag "${newBag.bagName ?? newBag.bagNumber ?? newBag.id}" was created and is active, but the hopper phase could not be started: ${await hopperRes.text()}. Start it separately from the Bags list.`);
        }
      }

      return newBag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["beans"] });
      qc.invalidateQueries({ queryKey: getListHoppersQueryKey() });
      qc.invalidateQueries({ queryKey: ["intelligence"] });
      qc.invalidateQueries({ queryKey: ["dashboard-intelligence"] });
      onOpenChange(false);
      toast({ title: "New bag is active", description: "The change is complete. You're ready to log shots on the new bag." });
    },
    onError: (e) => {
      // The mutation can partially succeed (e.g. the new bag was created but
      // a later step failed) — refresh the same queries onSuccess does so
      // the UI reflects whatever actually happened, matching what the error
      // message below already tells the user.
      qc.invalidateQueries({ queryKey: ["bags"] });
      qc.invalidateQueries({ queryKey: ["beans"] });
      qc.invalidateQueries({ queryKey: getListHoppersQueryKey() });
      qc.invalidateQueries({ queryKey: ["intelligence"] });
      qc.invalidateQueries({ queryKey: ["dashboard-intelligence"] });
      toast({ title: "Change Bag did not fully complete", description: String(e), variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activeBags.length > 0 ? "Change Bag" : "Start New Bag"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <p className="text-xs text-muted-foreground">
            {activeBags.length > 0
              ? "Change Bag walks the whole switch in one pass: optionally close and reconcile the old bag, pick or create the new bean, create the new active bag, and optionally start its first hopper phase. Each step is optional except creating the new bag."
              : "Start New Bag creates your first active bag: pick or create the bean, add minimal bag details, and optionally start its first hopper phase."}
          </p>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            {activeBags.length === 0 ? (
              <p className="text-muted-foreground">No bag is currently active. This creates your first one.</p>
            ) : (
              <>
                <p className="font-medium">Current active bag{activeBags.length > 1 ? "s" : ""}</p>
                <ul className="text-muted-foreground mt-1 space-y-0.5">
                  {activeBags.map((b) => (
                    <li key={b.id}>{b.beanName ?? "Unknown Bean"} — Bag #{b.bagNumber ?? b.id}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {activeBags.length > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="font-normal">Close out the old bag now</Label>
                <Switch checked={form.closeOld} onCheckedChange={(v) => set("closeOld", v)} />
              </div>
              {form.closeOld && (
                <div className="space-y-3">
                  {activeBags.length > 1 && (
                    <div className="space-y-1.5">
                      <Label>Bag to close</Label>
                      <Select value={form.bagToCloseId} onValueChange={(v) => set("bagToCloseId", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {activeBags.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>{b.beanName ?? "Unknown Bean"} — Bag #{b.bagNumber ?? b.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Leftover Beans / Chute Mass</Label>
                    <Select
                      value={form.leftoverMeasured}
                      onValueChange={(v) => set("leftoverMeasured", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="measured">I measured it</SelectItem>
                        <SelectItem value="unmeasured">Not measured — intentionally skipped</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      You are not expected to know the exact leftover amount. Skipping it is fine.
                    </p>
                  </div>
                  {form.leftoverMeasured === "measured" && (
                    <div className="space-y-1.5">
                      <Label>Remaining Beans / Chute Mass (g)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.remainingEstimate}
                        onChange={(e) => set("remainingEstimate", e.target.value)}
                        placeholder="e.g. 121"
                      />
                      <p className="text-xs text-muted-foreground">Reconciliation evidence only — this does not rewrite past shot consumption.</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Closeout / Cleanout Notes</Label>
                    <Input
                      value={form.closeoutNotes}
                      onChange={(e) => set("closeoutNotes", e.target.value)}
                      placeholder="e.g. purged grinder, backflushed — evidence only"
                    />
                    <p className="text-xs text-muted-foreground">
                      Purge, cleanout, and maintenance notes are text evidence only for now — a dedicated maintenance workflow with calm, non-blocking reminders is planned separately.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 rounded-lg border p-3">
            <Label>New Bag's Bean</Label>
            <Select value={form.beanMode} onValueChange={(v) => set("beanMode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="existing" disabled={beans.length === 0}>Use an existing bean</SelectItem>
                <SelectItem value="new">Create a new bean</SelectItem>
              </SelectContent>
            </Select>
            {form.beanMode === "existing" ? (
              <Select value={form.existingBeanId} onValueChange={(v) => set("existingBeanId", v)}>
                <SelectTrigger><SelectValue placeholder="Select bean…" /></SelectTrigger>
                <SelectContent>
                  {beans.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input value={form.newBeanName} onChange={(e) => set("newBeanName", e.target.value)} placeholder="Bean name *" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={form.newBeanRoaster} onChange={(e) => set("newBeanRoaster", e.target.value)} placeholder="Roaster (optional)" />
                  <Input value={form.newBeanOrigin} onChange={(e) => set("newBeanOrigin", e.target.value)} placeholder="Origin (optional)" />
                </div>
                <p className="text-xs text-muted-foreground">More bean detail can be added later from the Beans page.</p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <Label>New Bag Details</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.bagNumber} onChange={(e) => set("bagNumber", e.target.value)} placeholder="Bag number" />
              <Input value={form.bagName} onChange={(e) => set("bagName", e.target.value)} placeholder="Bag name/label" />
              <Input type="number" step="0.1" min="0" value={form.bagWeight} onChange={(e) => set("bagWeight", e.target.value)} placeholder="Bag weight (g)" />
              <div className="space-y-1">
                <Label className="text-xs font-normal text-muted-foreground">Roast Date <span className="text-muted-foreground/70">(or estimated)</span></Label>
                <Input type="date" value={form.roastDate} onChange={(e) => set("roastDate", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-normal text-muted-foreground">Roast Date Confidence <span className="text-muted-foreground/70">(optional)</span></Label>
                <Select value={form.roastDateConfidence || "__none__"} onValueChange={(v) => set("roastDateConfidence", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— not set —</SelectItem>
                    {ROAST_DATE_CONFIDENCE.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {suggestedBagNumber
                ? `Bag Number suggested as ${suggestedBagNumber} (one after your highest numbered bag) — edit if needed.`
                : "No previous numeric bag numbers found, so nothing was suggested — enter one to help identify this bag."}
            </p>
            <p className="text-xs text-muted-foreground">
              Roast Date is when the beans were roasted (exact or your best estimate) — not Purchase Date (when bought, not collected here). Opened Date is set automatically to today when this bag is created.
            </p>
            <p className="text-xs text-muted-foreground">This bag will be created and set active immediately. Add Freshness Dating Method (how you derived the Roast Date, e.g. Best-Before Minus One Year) and more detail anytime from Edit.</p>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="font-normal">Start the first hopper phase now</Label>
              <Switch checked={form.startPhase} onCheckedChange={(v) => set("startPhase", v)} />
            </div>
            {form.startPhase ? (
              <div className="space-y-3">
                <Select value={form.phase} onValueChange={(v) => set("phase", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOPPER_PHASE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.phase === "Custom" && (
                  <Input value={form.customLabel} onChange={(e) => set("customLabel", e.target.value)} placeholder="Custom phase label" />
                )}
                {form.phase === "Single Bag Phase" && (
                  <p className="text-xs text-muted-foreground">
                    Treats the whole bag as one tracked phase — use it when you won't split this bag into separate hopper loads.
                  </p>
                )}
                {form.phase === "End of Bag" && (
                  <p className="text-xs text-muted-foreground">
                    The final leftover phase after earlier measured phases are used up — not a fixed amount of its own.
                  </p>
                )}
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.startingBeans}
                  onChange={(e) => set("startingBeans", e.target.value)}
                  placeholder={form.bagWeight ? `Starting beans (g) — e.g. ${form.bagWeight}` : "Starting beans (g)"}
                />
                <Input value={form.phaseNotes} onChange={(e) => set("phaseNotes", e.target.value)} placeholder="Notes (optional)" />
                <p className="text-xs text-muted-foreground">
                  A hopper phase is a measured operating window, not a count of every bean physically left in the bag.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                You can start a hopper phase later from the Bags list — it is never required to finish changing bags.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => changeBagMutation.mutate()} disabled={changeBagMutation.isPending}>
            {changeBagMutation.isPending ? "Changing…" : activeBags.length > 0 ? "Change Bag" : "Start New Bag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
