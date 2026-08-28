import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { errorMessageFrom } from "@/lib/http";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import {
  GRINDER_SUGGESTIONS,
  MACHINE_SUGGESTIONS,
  matchingSuggestions,
} from "@/lib/equipment-suggestions";

interface Grinder {
  id: number;
  name: string;
  shortLabel: string | null;
  sourceUrl: string | null;
  brand: string | null;
  model: string | null;
  type: string | null;
  burrSize: string | null;
  burrType: string | null;
  adjustmentType: string | null;
  grindSettingPrecision: number | null;
  grindStepIncrement: number | null;
  isDefault: boolean;
  notes: string | null;
}
interface Machine { id: number; name: string; shortLabel: string | null; sourceUrl: string | null; brand: string | null; model: string | null; brewMethod: string | null; stockBasket: string | null; isDefault: boolean; notes: string | null; }

const GRINDER_TYPES = ["Espresso", "Decaf", "Pour-over", "Hand", "Multi-use"];
const BURR_TYPES = ["Flat", "Conical", "Hybrid"];
const GRINDER_ADJUSTMENT_TYPES = ["Stepless", "Stepped", "Indexed", "Unknown"];
const BREW_METHODS = ["Espresso", "Pour-over", "AeroPress", "French Press", "Moka Pot", "Lever", "Other"];

function fetchGrinders(): Promise<Grinder[]> { return fetch("/api/equipment/grinders").then((r) => r.json()); }
function fetchMachines(): Promise<Machine[]> { return fetch("/api/equipment/machines").then((r) => r.json()); }

export default function Equipment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: grinders = [], isLoading: gLoading } = useQuery({ queryKey: ["grinders"], queryFn: fetchGrinders });
  const { data: machines = [], isLoading: mLoading } = useQuery({ queryKey: ["machines"], queryFn: fetchMachines });

  const [gOpen, setGOpen] = useState(false);
  const [mOpen, setMOpen] = useState(false);
  const [editingG, setEditingG] = useState<Grinder | null>(null);
  const [editingM, setEditingM] = useState<Machine | null>(null);
  const [gForm, setGForm] = useState<Record<string, string>>({});
  const [mForm, setMForm] = useState<Record<string, string>>({});

  const openNewG = () => { setEditingG(null); setGForm({ name: "", shortLabel: "", sourceUrl: "", brand: "", model: "", type: "", burrSize: "", burrType: "", adjustmentType: "", grindSettingPrecision: "2", grindStepIncrement: "", isDefault: "false", notes: "" }); setGOpen(true); };
  const openEditG = (g: Grinder) => { setEditingG(g); setGForm({ name: g.name, shortLabel: g.shortLabel ?? "", sourceUrl: g.sourceUrl ?? "", brand: g.brand ?? "", model: g.model ?? "", type: g.type ?? "", burrSize: g.burrSize ?? "", burrType: g.burrType ?? "", adjustmentType: g.adjustmentType ?? "", grindSettingPrecision: g.grindSettingPrecision != null ? String(g.grindSettingPrecision) : "", grindStepIncrement: g.grindStepIncrement != null ? String(g.grindStepIncrement) : "", isDefault: String(g.isDefault), notes: g.notes ?? "" }); setGOpen(true); };

  const openNewM = () => { setEditingM(null); setMForm({ name: "", shortLabel: "", sourceUrl: "", brand: "", model: "", brewMethod: "", stockBasket: "", isDefault: "false", notes: "" }); setMOpen(true); };
  const openEditM = (m: Machine) => { setEditingM(m); setMForm({ name: m.name, shortLabel: m.shortLabel ?? "", sourceUrl: m.sourceUrl ?? "", brand: m.brand ?? "", model: m.model ?? "", brewMethod: m.brewMethod ?? "", stockBasket: m.stockBasket ?? "", isDefault: String(m.isDefault), notes: m.notes ?? "" }); setMOpen(true); };

  const saveG = useMutation({
    mutationFn: async () => {
      const url = editingG ? `/api/equipment/grinders/${editingG.id}` : "/api/equipment/grinders";
      const body = { ...gForm, isDefault: gForm.isDefault === "true" };
      const r = await fetch(url, { method: editingG ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await errorMessageFrom(r));
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grinders"] }); setGOpen(false); toast({ title: editingG ? "Grinder updated" : "Grinder added" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const deleteG = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/equipment/grinders/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await errorMessageFrom(response));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grinders"] }); toast({ title: "Grinder removed" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const saveM = useMutation({
    mutationFn: async () => {
      const url = editingM ? `/api/equipment/machines/${editingM.id}` : "/api/equipment/machines";
      const body = { ...mForm, isDefault: mForm.isDefault === "true" };
      const r = await fetch(url, { method: editingM ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await errorMessageFrom(r));
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["machines"] }); setMOpen(false); toast({ title: editingM ? "Machine updated" : "Machine added" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const deleteM = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/equipment/machines/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await errorMessageFrom(response));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["machines"] }); toast({ title: "Machine removed" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const setG = (k: string, v: string) => setGForm((f) => ({ ...f, [k]: v }));
  const setM = (k: string, v: string) => setMForm((f) => ({ ...f, [k]: v }));
  const grinderSuggestions = matchingSuggestions(GRINDER_SUGGESTIONS, `${gForm.name ?? ""} ${gForm.sourceUrl ?? ""} ${gForm.brand ?? ""} ${gForm.model ?? ""} ${gForm.notes ?? ""}`);
  const machineSuggestions = matchingSuggestions(MACHINE_SUGGESTIONS, `${mForm.name ?? ""} ${mForm.sourceUrl ?? ""} ${mForm.brand ?? ""} ${mForm.model ?? ""} ${mForm.notes ?? ""}`);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wrench className="h-7 w-7 text-primary" /> Equipment
        </h1>
        <p className="text-muted-foreground mt-1">Manage grinders and machines used in shot logging.</p>
      </div>

      {/* Grinders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Grinders</h2>
            <p className="text-sm text-muted-foreground">Espresso, decaf, pour-over, and hand grinders.</p>
          </div>
          <Button onClick={openNewG} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Grinder</Button>
        </div>
        {gLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : grinders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg"><p>No grinders added yet.</p></div>
        ) : (
          <div className="space-y-2">
            {grinders.map((g) => (
              <Card key={g.id} className={g.isDefault ? "border-primary/50 bg-primary/5" : ""}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{g.name}</span>
                      {g.shortLabel && <Badge variant="secondary" className="text-xs">{g.shortLabel}</Badge>}
                      {g.type && <Badge variant="outline" className="text-xs">{g.type}</Badge>}
                      {g.isDefault && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {[
                        g.brand,
                        g.model,
                        g.burrSize,
                        g.burrType ? `${g.burrType} burrs` : null,
                        g.adjustmentType,
                        g.grindSettingPrecision != null ? `${g.grindSettingPrecision} Decimal Places` : null,
                        g.grindStepIncrement != null ? `${g.grindStepIncrement} Setting Markers` : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {g.notes && <p className="text-xs text-muted-foreground mt-1">{g.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditG(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete grinder?</AlertDialogTitle>
                          <AlertDialogDescription>"{g.name}" will be removed. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteG.mutate(g.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Machines */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Machines & Brewers</h2>
            <p className="text-sm text-muted-foreground">Espresso machines, pour-over setups, and other brewers.</p>
          </div>
          <Button onClick={openNewM} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Machine</Button>
        </div>
        {mLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : machines.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg"><p>No machines added yet.</p></div>
        ) : (
          <div className="space-y-2">
            {machines.map((m) => (
              <Card key={m.id} className={m.isDefault ? "border-primary/50 bg-primary/5" : ""}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{m.name}</span>
                      {m.shortLabel && <Badge variant="secondary" className="text-xs">{m.shortLabel}</Badge>}
                      {m.brewMethod && <Badge variant="outline" className="text-xs">{m.brewMethod}</Badge>}
                      {m.isDefault && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{[m.brand, m.model, m.stockBasket ? `Stock Basket: ${m.stockBasket}` : null].filter(Boolean).join(" · ")}</p>
                    {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditM(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete machine?</AlertDialogTitle>
                          <AlertDialogDescription>"{m.name}" will be removed. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteM.mutate(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Grinder Dialog */}
      <Dialog open={gOpen} onOpenChange={setGOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingG ? "Edit Grinder" : "Add Grinder"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input value={gForm.name} onChange={(e) => setG("name", e.target.value)} placeholder="e.g. Eureka Magnifico" /></div>
            <div className="col-span-2 space-y-1.5">
              <Label>Short Label</Label>
              <Input value={gForm.shortLabel} onChange={(e) => setG("shortLabel", e.target.value)} placeholder="e.g. EMM or Magnifico" />
              <p className="text-xs text-muted-foreground">Personal compact label for dashboards. Full name remains the system/library identity.</p>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Product Link Or ASIN</Label>
              <Input value={gForm.sourceUrl} onChange={(e) => setG("sourceUrl", e.target.value)} placeholder="Paste product link or ASIN to look for suggestions…" />
              <p className="text-xs text-muted-foreground">Used as setup evidence and suggestion matching. Future shared-library updates will require AI/admin review before becoming verified defaults.</p>
            </div>
            {grinderSuggestions.length > 0 && (
              <div className="col-span-2 rounded-lg border bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary">Suggested Equipment Details</p>
                <p className="text-xs text-muted-foreground">Review before saving — models and revisions can differ. Suggested values are personal setup help until admin-verified.</p>
                {grinderSuggestions.map((suggestion) => (
                  <div key={suggestion.label} className="flex items-center justify-between gap-3 rounded-md bg-background/80 border p-2">
                    <div>
                      <p className="text-sm font-medium">{suggestion.label}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.confidence}</p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.values.burrSize} {suggestion.values.burrType.toLowerCase()} burrs · {suggestion.values.type} · {suggestion.values.adjustmentType}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setGForm((current) => ({
                        ...current,
                        ...suggestion.values,
                        sourceUrl: suggestion.values.sourceUrl || current.sourceUrl,
                      }))}
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5"><Label>Brand</Label><Input value={gForm.brand} onChange={(e) => setG("brand", e.target.value)} placeholder="Eureka" /></div>
            <div className="space-y-1.5"><Label>Model</Label><Input value={gForm.model} onChange={(e) => setG("model", e.target.value)} placeholder="Magnifico" /></div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={gForm.type || "__none__"} onValueChange={(v) => setG("type", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {GRINDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Burr Type</Label>
              <Select value={gForm.burrType || "__none__"} onValueChange={(v) => setG("burrType", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {BURR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Burr Size</Label><Input value={gForm.burrSize} onChange={(e) => setG("burrSize", e.target.value)} placeholder="e.g. 65mm" /></div>
            <div className="space-y-1.5">
              <Label>Adjustment Type</Label>
              <Select value={gForm.adjustmentType || "__none__"} onValueChange={(v) => setG("adjustmentType", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {GRINDER_ADJUSTMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Stepless grinders can be recorded to two decimals, but exact repeatability may be visual/approximate.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Setting Precision</Label>
              <Input type="number" min="0" max="3" step="1" value={gForm.grindSettingPrecision} onChange={(e) => setG("grindSettingPrecision", e.target.value)} placeholder="2" />
              <p className="text-xs text-muted-foreground">How many decimals to display for this grinder.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Marker Increment</Label>
              <Input type="number" min="0" step="0.01" value={gForm.grindStepIncrement} onChange={(e) => setG("grindStepIncrement", e.target.value)} placeholder="0.33" />
              <p className="text-xs text-muted-foreground">Approximate spacing between visible grinder marks, e.g. 0.33.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="font-normal">Set as Default</Label>
              <Switch checked={gForm.isDefault === "true"} onCheckedChange={(v) => setG("isDefault", String(v))} />
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input value={gForm.notes} onChange={(e) => setG("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGOpen(false)}>Cancel</Button>
            <Button onClick={() => saveG.mutate()} disabled={!gForm.name?.trim() || saveG.isPending}>{saveG.isPending ? "Saving…" : editingG ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machine Dialog */}
      <Dialog open={mOpen} onOpenChange={setMOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingM ? "Edit Machine" : "Add Machine"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input value={mForm.name} onChange={(e) => setM("name", e.target.value)} placeholder="e.g. Profitec Go" /></div>
            <div className="col-span-2 space-y-1.5">
              <Label>Short Label</Label>
              <Input value={mForm.shortLabel} onChange={(e) => setM("shortLabel", e.target.value)} placeholder="e.g. PG" />
              <p className="text-xs text-muted-foreground">Personal compact label for dashboards. Full name remains the system/library identity.</p>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Product Link Or Model Evidence</Label>
              <Input value={mForm.sourceUrl} onChange={(e) => setM("sourceUrl", e.target.value)} placeholder="Paste product page, manual link, or model evidence…" />
              <p className="text-xs text-muted-foreground">Used as setup evidence and suggestion matching. Future shared-library updates will require AI/admin review before becoming verified defaults.</p>
            </div>
            {machineSuggestions.length > 0 && (
              <div className="col-span-2 rounded-lg border bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary">Suggested Equipment Details</p>
                <p className="text-xs text-muted-foreground">Review before saving — machine revisions and modifications can differ. Suggested values are personal setup help until admin-verified.</p>
                {machineSuggestions.map((suggestion) => (
                  <div key={suggestion.label} className="flex items-center justify-between gap-3 rounded-md bg-background/80 border p-2">
                    <div>
                      <p className="text-sm font-medium">{suggestion.label}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.confidence}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.values.brewMethod}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setMForm((current) => ({
                        ...current,
                        ...suggestion.values,
                        sourceUrl: suggestion.values.sourceUrl || current.sourceUrl,
                      }))}
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5"><Label>Brand</Label><Input value={mForm.brand} onChange={(e) => setM("brand", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Model</Label><Input value={mForm.model} onChange={(e) => setM("model", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Brew Method</Label>
              <Select value={mForm.brewMethod || "__none__"} onValueChange={(v) => setM("brewMethod", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {BREW_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="font-normal">Set as Default</Label>
              <Switch checked={mForm.isDefault === "true"} onCheckedChange={(v) => setM("isDefault", String(v))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Stock Basket</Label>
              <Input value={mForm.stockBasket} onChange={(e) => setM("stockBasket", e.target.value)} placeholder="e.g. Profitec Go Stock Basket" />
              <p className="text-xs text-muted-foreground">Use this when the basket is the machine's included/default basket, not a separate accessory.</p>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input value={mForm.notes} onChange={(e) => setM("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMOpen(false)}>Cancel</Button>
            <Button onClick={() => saveM.mutate()} disabled={!mForm.name?.trim() || saveM.isPending}>{saveM.isPending ? "Saving…" : editingM ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
