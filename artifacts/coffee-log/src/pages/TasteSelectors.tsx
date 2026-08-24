import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TasteSelector {
  id: number; name: string; category: string; isDefault: boolean; sortOrder: number;
}

const CATEGORIES = [
  { value: "balance", label: "Balance & Structure" },
  { value: "texture", label: "Texture & Body" },
  { value: "flavor", label: "Flavour Notes" },
  { value: "finish", label: "Finish & Aftertaste" },
  { value: "character", label: "Character & Impression" },
  { value: "custom", label: "Custom" },
];

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const CAT_COLORS: Record<string, string> = {
  balance: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  texture: "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200",
  flavor: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
  finish: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
  character: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200",
  custom: "bg-muted border text-muted-foreground",
};

function fetchSelectors(): Promise<TasteSelector[]> { return fetch("/api/taste-selectors").then((r) => r.json()); }

export default function TasteSelectors() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: selectors = [], isLoading } = useQuery({ queryKey: ["taste-selectors"], queryFn: fetchSelectors });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TasteSelector | null>(null);
  const [form, setForm] = useState({ name: "", category: "custom" });

  const grouped = CATEGORIES.reduce<Record<string, TasteSelector[]>>((acc, c) => {
    acc[c.value] = selectors.filter((s) => s.category === c.value);
    return acc;
  }, {});

  const openNew = (category = "custom") => { setEditing(null); setForm({ name: "", category }); setOpen(true); };
  const openEdit = (s: TasteSelector) => { setEditing(s); setForm({ name: s.name, category: s.category }); setOpen(true); };

  const seedMutation = useMutation({
    mutationFn: () => fetch("/api/taste-selectors/seed", { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["taste-selectors"] }); toast({ title: `Seeded ${d.seeded} standard selectors` }); },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/taste-selectors/${editing.id}` : "/api/taste-selectors";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taste-selectors"] }); setOpen(false); toast({ title: editing ? "Updated" : "Added" }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/taste-selectors/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taste-selectors"] }); toast({ title: "Removed" }); },
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-7 w-7 text-primary" /> Taste Selectors
          </h1>
          <p className="text-muted-foreground mt-1">Tag shots with flavour notes and characteristics. Filter and compare by tag.</p>
        </div>
        <div className="flex gap-2">
          {selectors.length === 0 && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} className="gap-2" disabled={seedMutation.isPending}>
              <RefreshCw className={cn("h-4 w-4", seedMutation.isPending && "animate-spin")} />
              Seed Defaults
            </Button>
          )}
          <Button onClick={() => openNew()} className="gap-2"><Plus className="h-4 w-4" /> Add Selector</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : selectors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No taste selectors yet.</p>
          <p className="text-sm mt-1">Seed the 25 standard selectors or add your own.</p>
          <Button className="mt-4 gap-2" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <RefreshCw className={cn("h-4 w-4", seedMutation.isPending && "animate-spin")} />
            Load Standard Selectors
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.filter((c) => grouped[c.value]?.length > 0).map(({ value, label }) => (
            <section key={value}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base">{label}</h2>
                <Button variant="ghost" size="sm" onClick={() => openNew(value)} className="gap-1 h-7 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {grouped[value].map((s) => (
                  <div key={s.id} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium", CAT_COLORS[value] || CAT_COLORS.custom)}>
                    <span>{s.name}</span>
                    {s.isDefault && <span className="text-[10px] opacity-60">(std)</span>}
                    <button onClick={() => openEdit(s)} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
                      <Pencil className="h-3 w-3" />
                    </button>
                    {!s.isDefault && (
                      <button onClick={() => deleteMutation.mutate(s.id)} className="opacity-50 hover:opacity-100 hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{selectors.length} selectors across {CATEGORIES.filter((c) => grouped[c.value]?.length > 0).length} categories</p>
            <Button variant="outline" size="sm" onClick={() => openNew()} className="gap-1.5"><Plus className="h-4 w-4" /> Add Custom</Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Selector" : "Add Taste Selector"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Cherry Finish" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
