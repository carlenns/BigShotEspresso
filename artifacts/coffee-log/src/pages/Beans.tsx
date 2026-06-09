import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star, Pencil, Trash2, Sprout } from "lucide-react";

interface Bean {
  id: number;
  name: string;
  origin: string | null;
  roaster: string | null;
  roastLevel: string | null;
  process: string | null;
  variety: string | null;
  altitude: string | null;
  notes: string | null;
  createdAt: string;
  bagCount: number;
  shotCount: number;
  avgRating: number | null;
  referenceCount: number;
}

type BeanForm = { name: string; origin: string; roaster: string; roastLevel: string; process: string; variety: string; altitude: string; notes: string; };
const BLANK: BeanForm = {
  name: "", origin: "", roaster: "", roastLevel: "", process: "", variety: "", altitude: "", notes: "",
};

const ROAST_LEVELS = ["Light", "Light-Medium", "Medium", "Medium-Dark", "Dark"];
const PROCESSES = ["Washed", "Natural", "Honey", "Anaerobic", "Wet-Hulled", "Other"];

function fetchBeans(): Promise<Bean[]> {
  return fetch("/api/beans").then((r) => r.json());
}

export default function Beans() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: beans = [], isLoading } = useQuery({ queryKey: ["beans"], queryFn: fetchBeans });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bean | null>(null);
  const [form, setForm] = useState<BeanForm>({ ...BLANK });

  const openNew = () => { setEditing(null); setForm({ ...BLANK }); setOpen(true); };
  const openEdit = (b: Bean) => { setEditing(b); setForm({ name: b.name, origin: b.origin ?? "", roaster: b.roaster ?? "", roastLevel: b.roastLevel ?? "", process: b.process ?? "", variety: b.variety ?? "", altitude: b.altitude ?? "", notes: b.notes ?? "" }); setOpen(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/beans/${editing.id}` : "/api/beans";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["beans"] }); setOpen(false); toast({ title: editing ? "Bean updated" : "Bean added" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/beans/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["beans"] }); toast({ title: "Bean deleted" }); },
  });

  const set = (k: keyof BeanForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sprout className="h-7 w-7 text-primary" /> Bean Catalog
          </h1>
          <p className="text-muted-foreground mt-1">Master list of all beans you've pulled shots with.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Bean</Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : beans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Sprout className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No beans yet.</p>
          <p className="text-sm mt-1">Add your first bean to start tracking.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {beans.map((b) => (
            <Card key={b.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-snug">{b.name}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {b.roastLevel && <Badge variant="outline" className="text-xs">{b.roastLevel}</Badge>}
                  {b.process && <Badge variant="outline" className="text-xs">{b.process}</Badge>}
                  {b.origin && <Badge variant="secondary" className="text-xs">{b.origin}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {b.roaster && <p>Roaster: <span className="text-foreground">{b.roaster}</span></p>}
                  {b.variety && <p>Variety: <span className="text-foreground">{b.variety}</span></p>}
                  {b.altitude && <p>Altitude: <span className="text-foreground">{b.altitude}</span></p>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground">{b.bagCount} bag{b.bagCount !== 1 ? "s" : ""} · {b.shotCount} shots · {b.referenceCount} refs</span>
                  {b.avgRating != null && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Star className="h-3.5 w-3.5 fill-current" />{Number(b.avgRating).toFixed(1)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Bean" : "Add Bean"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. MH Costa Rica" />
            </div>
            <div className="space-y-1.5">
              <Label>Origin / Country</Label>
              <Input value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="e.g. Costa Rica" />
            </div>
            <div className="space-y-1.5">
              <Label>Roaster</Label>
              <Input value={form.roaster} onChange={(e) => set("roaster", e.target.value)} placeholder="e.g. Market House" />
            </div>
            <div className="space-y-1.5">
              <Label>Roast Level</Label>
              <Select value={form.roastLevel || "__none__"} onValueChange={(v) => set("roastLevel", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {ROAST_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Process</Label>
              <Select value={form.process || "__none__"} onValueChange={(v) => set("process", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— not set —</SelectItem>
                  {PROCESSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Variety</Label>
              <Input value={form.variety} onChange={(e) => set("variety", e.target.value)} placeholder="e.g. Geisha" />
            </div>
            <div className="space-y-1.5">
              <Label>Altitude</Label>
              <Input value={form.altitude} onChange={(e) => set("altitude", e.target.value)} placeholder="e.g. 1800m" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Tasting notes, sourcing info…" className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save Changes" : "Add Bean"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
