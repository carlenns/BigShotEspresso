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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import {
  GRINDER_SUGGESTIONS,
  MACHINE_SUGGESTIONS,
  matchingSuggestions,
} from "@/lib/equipment-suggestions";

interface Grinder { id: number; name: string; brand: string | null; model: string | null; type: string | null; burrSize: string | null; burrType: string | null; isDefault: boolean; notes: string | null; }
interface Machine { id: number; name: string; brand: string | null; model: string | null; brewMethod: string | null; isDefault: boolean; notes: string | null; }

const GRINDER_TYPES = ["Espresso", "Decaf", "Pour-over", "Hand", "Multi-use"];
const BURR_TYPES = ["Flat", "Conical", "Hybrid"];
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

  const openNewG = () => { setEditingG(null); setGForm({ name: "", brand: "", model: "", type: "", burrSize: "", burrType: "", isDefault: "false", notes: "" }); setGOpen(true); };
  const openEditG = (g: Grinder) => { setEditingG(g); setGForm({ name: g.name, brand: g.brand ?? "", model: g.model ?? "", type: g.type ?? "", burrSize: g.burrSize ?? "", burrType: g.burrType ?? "", isDefault: String(g.isDefault), notes: g.notes ?? "" }); setGOpen(true); };

  const openNewM = () => { setEditingM(null); setMForm({ name: "", brand: "", model: "", brewMethod: "", isDefault: "false", notes: "" }); setMOpen(true); };
  const openEditM = (m: Machine) => { setEditingM(m); setMForm({ name: m.name, brand: m.brand ?? "", model: m.model ?? "", brewMethod: m.brewMethod ?? "", isDefault: String(m.isDefault), notes: m.notes ?? "" }); setMOpen(true); };

  const saveG = useMutation({
    mutationFn: async () => {
      const url = editingG ? `/api/equipment/grinders/${editingG.id}` : "/api/equipment/grinders";
      const body = { ...gForm, isDefault: gForm.isDefault === "true" };
      const r = await fetch(url, { method: editingG ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grinders"] }); setGOpen(false); toast({ title: editingG ? "Grinder updated" : "Grinder added" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteG = useMutation({
    mutationFn: (id: number) => fetch(`/api/equipment/grinders/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grinders"] }); toast({ title: "Grinder removed" }); },
  });

  const saveM = useMutation({
    mutationFn: async () => {
      const url = editingM ? `/api/equipment/machines/${editingM.id}` : "/api/equipment/machines";
      const body = { ...mForm, isDefault: mForm.isDefault === "true" };
      const r = await fetch(url, { method: editingM ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["machines"] }); setMOpen(false); toast({ title: editingM ? "Machine updated" : "Machine added" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => fetch(`/api/equipment/machines/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["machines"] }); toast({ title: "Machine removed" }); },
  });

  const setG = (k: string, v: string) => setGForm((f) => ({ ...f, [k]: v }));
  const setM = (k: string, v: string) => setMForm((f) => ({ ...f, [k]: v }));
  const grinderSuggestions = matchingSuggestions(GRINDER_SUGGESTIONS, `${gForm.name ?? ""} ${gForm.brand ?? ""} ${gForm.model ?? ""}`);
  const machineSuggestions = matchingSuggestions(MACHINE_SUGGESTIONS, `${mForm.name ?? ""} ${mForm.brand ?? ""} ${mForm.model ?? ""}`);

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
                      {g.type && <Badge variant="outline" className="text-xs">{g.type}</Badge>}
                      {g.isDefault && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {[g.brand, g.model, g.burrSize, g.burrType ? `${g.burrType} burrs` : null].filter(Boolean).join(" · ")}
                    </p>
                    {g.notes && <p className="text-xs text-muted-foreground mt-1">{g.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditG(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteG.mutate(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
                      {m.brewMethod && <Badge variant="outline" className="text-xs">{m.brewMethod}</Badge>}
                      {m.isDefault && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{[m.brand, m.model].filter(Boolean).join(" · ")}</p>
                    {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditM(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteM.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Grinder Dialog */}
      <Dialog open={gOpen} onOpenChange={setGOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingG ? "Edit Grinder" : "Add Grinder"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input value={gForm.name} onChange={(e) => setG("name", e.target.value)} placeholder="e.g. Eureka Magnifico" /></div>
            {grinderSuggestions.length > 0 && (
              <div className="col-span-2 rounded-lg border bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary">Suggested Equipment Details</p>
                <p className="text-xs text-muted-foreground">Review before saving — models and revisions can differ.</p>
                {grinderSuggestions.map((suggestion) => (
                  <div key={suggestion.label} className="flex items-center justify-between gap-3 rounded-md bg-background/80 border p-2">
                    <div>
                      <p className="text-sm font-medium">{suggestion.label}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.confidence}</p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.values.burrSize} {suggestion.values.burrType.toLowerCase()} burrs · {suggestion.values.type}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setGForm((current) => ({ ...current, ...suggestion.values }))}
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingM ? "Edit Machine" : "Add Machine"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input value={mForm.name} onChange={(e) => setM("name", e.target.value)} placeholder="e.g. Profitec Go" /></div>
            {machineSuggestions.length > 0 && (
              <div className="col-span-2 rounded-lg border bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary">Suggested Equipment Details</p>
                <p className="text-xs text-muted-foreground">Review before saving — machine revisions and modifications can differ.</p>
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
                      onClick={() => setMForm((current) => ({ ...current, ...suggestion.values }))}
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
