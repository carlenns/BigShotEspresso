import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star, Package, Pencil, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bean { id: number; name: string; }
interface Bag {
  id: number; beanId: number | null; beanName: string | null; bagNumber: string | null;
  openedDate: string | null; isActive: boolean;
  startGrindSetting: number | null; currentGrindSetting: number | null;
  startGrindTime: number | null; currentGrindTime: number | null;
  defaultDose: number | null; defaultYield: number | null; defaultTemp: number | null;
  dialInNotes: string | null; notes: string | null;
  shotCount: number; referenceCount: number; avgRating: number | null;
  grindRange: { min: number | null; max: number | null } | null;
}

function fetchBags(): Promise<Bag[]> { return fetch("/api/bags").then((r) => r.json()); }
function fetchBeans(): Promise<Bean[]> { return fetch("/api/beans").then((r) => r.json()); }

export default function Bags() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: bags = [], isLoading } = useQuery({ queryKey: ["bags"], queryFn: fetchBags });
  const { data: beans = [] } = useQuery({ queryKey: ["beans"], queryFn: fetchBeans });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bag | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const openNew = () => {
    setEditing(null);
    setForm({ beanId: "", bagNumber: "", openedDate: "", isActive: "false", startGrindSetting: "", currentGrindSetting: "", startGrindTime: "", currentGrindTime: "", defaultDose: "", defaultYield: "", defaultTemp: "", dialInNotes: "", notes: "" });
    setOpen(true);
  };
  const openEdit = (b: Bag) => {
    setEditing(b);
    setForm({ beanId: String(b.beanId ?? ""), bagNumber: b.bagNumber ?? "", openedDate: b.openedDate ?? "", isActive: String(b.isActive), startGrindSetting: String(b.startGrindSetting ?? ""), currentGrindSetting: String(b.currentGrindSetting ?? ""), startGrindTime: String(b.startGrindTime ?? ""), currentGrindTime: String(b.currentGrindTime ?? ""), defaultDose: String(b.defaultDose ?? ""), defaultYield: String(b.defaultYield ?? ""), defaultTemp: String(b.defaultTemp ?? ""), dialInNotes: b.dialInNotes ?? "", notes: b.notes ?? "" });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/bags/${editing.id}` : "/api/bags";
      const method = editing ? "PATCH" : "POST";
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v === "" || v === "null") continue;
        if (k === "isActive") body[k] = v === "true";
        else if (["beanId", "defaultTemp"].includes(k)) body[k] = parseInt(v, 10);
        else if (["startGrindSetting", "currentGrindSetting", "startGrindTime", "currentGrindTime", "defaultDose", "defaultYield"].includes(k)) body[k] = parseFloat(v);
        else body[k] = v;
      }
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bags"] }); setOpen(false); toast({ title: editing ? "Bag updated" : "Bag added" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" /> Bags
          </h1>
          <p className="text-muted-foreground mt-1">Each bag linked to a bean with its own grind defaults and shot history.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Bag</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : bags.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bags yet.</p>
          <p className="text-sm mt-1">Add a bag to link shots to a specific bean purchase.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bags.map((bag) => (
            <Card key={bag.id} className={cn("transition-colors hover:border-primary/40", bag.isActive && "border-primary/50 bg-primary/5")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-lg">{bag.beanName ?? "Unknown Bean"}</span>
                      <Badge variant="outline" className="text-xs">Bag #{bag.bagNumber ?? bag.id}</Badge>
                      {bag.isActive && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Active</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      {bag.openedDate && <span>Opened: {bag.openedDate}</span>}
                      {bag.currentGrindSetting != null && <span>Grind: <strong className="text-foreground">{bag.currentGrindSetting}</strong></span>}
                      {bag.defaultDose != null && <span>Dose: <strong className="text-foreground">{bag.defaultDose}g</strong></span>}
                      {bag.defaultYield != null && <span>Yield: <strong className="text-foreground">{bag.defaultYield}g</strong></span>}
                      {bag.defaultTemp != null && <span>Temp: <strong className="text-foreground">{bag.defaultTemp}°C</strong></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">{bag.shotCount} shots · {bag.referenceCount} refs</p>
                      {bag.avgRating != null && (
                        <p className="flex items-center gap-1 text-amber-600 font-medium justify-end">
                          <Star className="h-3.5 w-3.5 fill-current" />{Number(bag.avgRating).toFixed(1)} avg
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(bag)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <Link href={`/bags/${bag.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                {bag.dialInNotes && (
                  <p className="mt-2 text-sm text-muted-foreground border-t pt-2 truncate">{bag.dialInNotes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-1.5">
              <Label>Bag Number</Label>
              <Input value={form.bagNumber} onChange={(e) => set("bagNumber", e.target.value)} placeholder="e.g. 4" />
            </div>
            <div className="space-y-1.5">
              <Label>Opened Date</Label>
              <Input value={form.openedDate} onChange={(e) => set("openedDate", e.target.value)} placeholder="2026-05-30" />
            </div>
            <div className="space-y-1.5">
              <Label>Start Grind Setting</Label>
              <Input type="number" step="0.01" value={form.startGrindSetting} onChange={(e) => set("startGrindSetting", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Grind Setting</Label>
              <Input type="number" step="0.01" value={form.currentGrindSetting} onChange={(e) => set("currentGrindSetting", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Grind Time (sec)</Label>
              <Input type="number" step="0.1" value={form.startGrindTime} onChange={(e) => set("startGrindTime", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Grind Time (sec)</Label>
              <Input type="number" step="0.1" value={form.currentGrindTime} onChange={(e) => set("currentGrindTime", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Default Dose (g)</Label>
              <Input type="number" step="0.1" value={form.defaultDose} onChange={(e) => set("defaultDose", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Default Yield (g)</Label>
              <Input type="number" step="0.1" value={form.defaultYield} onChange={(e) => set("defaultYield", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Default Temp (°C)</Label>
              <Input type="number" value={form.defaultTemp} onChange={(e) => set("defaultTemp", e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="font-normal">Active Bag</Label>
              <Switch checked={form.isActive === "true"} onCheckedChange={(v) => set("isActive", String(v))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Dial-in Notes</Label>
              <Input value={form.dialInNotes} onChange={(e) => set("dialInNotes", e.target.value)} placeholder="Key observations during dial-in…" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="General notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save" : "Add Bag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
