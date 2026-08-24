import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCESSORY_SUGGESTIONS, matchingSuggestions } from "@/lib/equipment-suggestions";

const TYPES = [
  { value: "basket", label: "Basket" },
  { value: "tamper", label: "Tamper" },
  { value: "puck_screen", label: "Puck Screen" },
  { value: "wdt_tool", label: "WDT Tool" },
  { value: "dosing_funnel", label: "Dosing Funnel" },
  { value: "dosing_cup", label: "Dosing Cup" },
  { value: "blind_shaker", label: "Blind Shaker" },
  { value: "scale", label: "Scale" },
  { value: "distributor", label: "Distributor / Leveler" },
  { value: "portafilter", label: "Portafilter" },
  { value: "other", label: "Other" },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

interface Accessory {
  id: number; type: string; shortLabel: string | null; brand: string | null; model: string | null;
  size: string | null; notes: string | null; isActive: boolean; isDefault: boolean;
  specs: Record<string, string> | null;
}

function fetchAccessories(): Promise<Accessory[]> { return fetch("/api/accessories").then((r) => r.json()); }

const BLANK = { type: "", shortLabel: "", brand: "", model: "", size: "", notes: "", isActive: "true", isDefault: "false", diameter: "", thickness: "", ratedDose: "", ridgeless: "false", springLoaded: "false", springPressure: "", needleCount: "", needleThickness: "" };

export default function Accessories() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: accessories = [], isLoading } = useQuery({ queryKey: ["accessories"], queryFn: fetchAccessories });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Accessory | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...BLANK });

  const grouped = useMemo(() => {
    const map: Record<string, Accessory[]> = {};
    for (const a of accessories) {
      (map[a.type] ??= []).push(a);
    }
    return map;
  }, [accessories]);

  const openNew = (type?: string) => {
    setEditing(null);
    setForm({ ...BLANK, type: type ?? "" });
    setOpen(true);
  };

  const openEdit = (a: Accessory) => {
    setEditing(a);
    const specs = a.specs ?? {};
    setForm({
      type: a.type, shortLabel: a.shortLabel ?? "", brand: a.brand ?? "", model: a.model ?? "", size: a.size ?? "",
      notes: a.notes ?? "", isActive: String(a.isActive), isDefault: String(a.isDefault),
      diameter: String(specs.diameter ?? ""), thickness: String(specs.thickness ?? ""),
      ratedDose: String(specs.ratedDose ?? ""), ridgeless: String(specs.ridgeless ?? "false"),
      springLoaded: String(specs.springLoaded ?? "false"), springPressure: String(specs.springPressure ?? ""),
      needleCount: String(specs.needleCount ?? ""), needleThickness: String(specs.needleThickness ?? ""),
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/accessories/${editing.id}` : "/api/accessories";
      const method = editing ? "PATCH" : "POST";
      const specs: Record<string, unknown> = {};
      if (form.type === "basket") { if (form.diameter) specs.diameter = form.diameter; if (form.ratedDose) specs.ratedDose = form.ratedDose; specs.ridgeless = form.ridgeless === "true"; }
      if (form.type === "tamper") { if (form.diameter) specs.diameter = form.diameter; specs.springLoaded = form.springLoaded === "true"; if (form.springPressure) specs.springPressure = form.springPressure; }
      if (form.type === "puck_screen") { if (form.diameter) specs.diameter = form.diameter; if (form.thickness) specs.thickness = form.thickness; }
      if (form.type === "wdt_tool") { if (form.needleCount) specs.needleCount = form.needleCount; if (form.needleThickness) specs.needleThickness = form.needleThickness; }
      const body = { type: form.type, shortLabel: form.shortLabel || undefined, brand: form.brand || undefined, model: form.model || undefined, size: form.size || undefined, notes: form.notes || undefined, isActive: form.isActive === "true", isDefault: form.isDefault === "true", specs: Object.keys(specs).length ? specs : undefined };
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accessories"] }); setOpen(false); toast({ title: editing ? "Updated" : "Added" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/accessories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accessories"] }); toast({ title: "Removed" }); },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const accessorySuggestions = matchingSuggestions(
    ACCESSORY_SUGGESTIONS,
    `${TYPE_LABEL[form.type] ?? form.type ?? ""} ${form.brand ?? ""} ${form.model ?? ""} ${form.notes ?? ""}`,
  );

  const typeSpecificFields = () => {
    if (form.type === "basket") return (
      <div className="col-span-2 grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border">
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Diameter</Label><Input value={form.diameter} onChange={(e) => set("diameter", e.target.value)} placeholder="58mm" /></div>
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Rated Dose</Label><Input value={form.ratedDose} onChange={(e) => set("ratedDose", e.target.value)} placeholder="18g" /></div>
        <div className="flex items-center justify-between rounded-lg border bg-background p-3">
          <Label className="text-sm font-normal">Ridgeless</Label>
          <Switch checked={form.ridgeless === "true"} onCheckedChange={(v) => set("ridgeless", String(v))} />
        </div>
      </div>
    );
    if (form.type === "tamper") return (
      <div className="col-span-2 grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border">
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Diameter</Label><Input value={form.diameter} onChange={(e) => set("diameter", e.target.value)} placeholder="58.35mm" /></div>
        <div className="flex items-center justify-between rounded-lg border bg-background p-3">
          <Label className="text-sm font-normal">Spring-loaded</Label>
          <Switch checked={form.springLoaded === "true"} onCheckedChange={(v) => set("springLoaded", String(v))} />
        </div>
        {form.springLoaded === "true" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Spring Pressure</Label>
            <Select value={form.springPressure || "__none__"} onValueChange={(v) => set("springPressure", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select spring…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— not set —</SelectItem>
                {["15 lb", "25 lb", "30 lb"].map((spring) => (
                  <SelectItem key={spring} value={spring}>{spring}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
    if (form.type === "puck_screen") return (
      <div className="col-span-2 grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border">
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Diameter</Label><Input value={form.diameter} onChange={(e) => set("diameter", e.target.value)} placeholder="53.3mm" /></div>
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Thickness</Label><Input value={form.thickness} onChange={(e) => set("thickness", e.target.value)} placeholder="0.3mm" /></div>
      </div>
    );
    if (form.type === "wdt_tool") return (
      <div className="col-span-2 grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border">
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Needle Count</Label><Input type="number" value={form.needleCount} onChange={(e) => set("needleCount", e.target.value)} placeholder="8" /></div>
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Needle Thickness</Label><Input value={form.needleThickness} onChange={(e) => set("needleThickness", e.target.value)} placeholder="0.4mm" /></div>
      </div>
    );
    return null;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" /> Accessories
          </h1>
          <p className="text-muted-foreground mt-1">Baskets, tampers, puck screens, WDT tools, and more.</p>
        </div>
        <Button onClick={() => openNew()} className="gap-2"><Plus className="h-4 w-4" /> Add Accessory</Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">{TYPES.slice(0, 3).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : accessories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No accessories yet.</p>
          <p className="text-sm mt-1">Track your baskets, tampers, puck screens, and other tools.</p>
          <Button className="mt-4 gap-2" onClick={() => openNew()}><Plus className="h-4 w-4" /> Add First Accessory</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {TYPES.filter((t) => grouped[t.value]?.length).map(({ value, label }) => (
            <section key={value}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">{label}</h2>
                <Button variant="ghost" size="sm" onClick={() => openNew(value)} className="gap-1 h-7 text-xs"><Plus className="h-3.5 w-3.5" /> Add</Button>
              </div>
              <div className="space-y-2">
                {grouped[value].map((a) => (
                  <Card key={a.id} className={cn(!a.isActive && "opacity-60", a.isDefault && "border-primary/50 bg-primary/5")}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{a.brand ?? "—"} {a.model ?? ""}</span>
                          {a.shortLabel && <Badge variant="secondary" className="text-xs">{a.shortLabel}</Badge>}
                          {a.size && <Badge variant="outline" className="text-xs">{a.size}</Badge>}
                          {a.isDefault && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>}
                          {!a.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        {a.specs && Object.keys(a.specs).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {Object.entries(a.specs as Record<string, unknown>)
                              .filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== false && v !== "false")
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </p>
                        )}
                        {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
          <Button variant="outline" onClick={() => openNew()} className="gap-2 w-full"><Plus className="h-4 w-4" /> Add Another Accessory</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Accessory" : "Add Accessory"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.type || "__none__"} onValueChange={(v) => set("type", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Brand</Label><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Normcore" /></div>
            <div className="space-y-1.5"><Label>Model</Label><Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. V4" /></div>
            <div className="col-span-2 space-y-1.5">
              <Label>Short Label</Label>
              <Input value={form.shortLabel} onChange={(e) => set("shortLabel", e.target.value)} placeholder="e.g. NC, VST Comp, MH Scale" />
              <p className="text-xs text-muted-foreground">Personal compact label for dashboards. Full name remains the system/library identity.</p>
            </div>
            {accessorySuggestions.length > 0 && (
              <div className="col-span-2 rounded-lg border bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary">Suggested Accessory Details</p>
                <p className="text-xs text-muted-foreground">Review before saving — accessories can vary by size and version.</p>
                {accessorySuggestions.map((suggestion) => (
                  <div key={suggestion.label} className="flex items-center justify-between gap-3 rounded-md bg-background/80 border p-2">
                    <div>
                      <p className="text-sm font-medium">{suggestion.label}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.confidence}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.values.notes}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setForm((current) => ({ ...current, ...suggestion.values }))}
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5"><Label>Size</Label><Input value={form.size} onChange={(e) => set("size", e.target.value)} placeholder="e.g. 58mm" /></div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="font-normal text-sm">Set as Default</Label>
              <Switch checked={form.isDefault === "true"} onCheckedChange={(v) => set("isDefault", String(v))} />
            </div>
            {typeSpecificFields()}
            <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional details…" /></div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="font-normal text-sm">Active</Label>
              <Switch checked={form.isActive === "true"} onCheckedChange={(v) => set("isActive", String(v))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.type || saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
