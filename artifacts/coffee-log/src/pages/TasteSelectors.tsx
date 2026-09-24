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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { errorMessageFrom } from "@/lib/http";
import { Plus, Pencil, Trash2, Tag, RefreshCw, Archive, ArchiveRestore, Check, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TasteSelector {
  id: number; name: string; category: string; isDefault: boolean; sortOrder: number;
  origin: "standard" | "custom"; archivedAt: string | null;
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

// The management page includes archived selectors; the shot-form picker
// (queryKey ["taste-selectors"]) does not. Invalidating ["taste-selectors"]
// refreshes both.
function fetchSelectors(): Promise<TasteSelector[]> { return fetch("/api/taste-selectors?includeArchived=true").then((r) => r.json()); }

export default function TasteSelectors() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: selectors = [], isLoading } = useQuery({ queryKey: ["taste-selectors", "manage"], queryFn: fetchSelectors });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TasteSelector | null>(null);
  const [form, setForm] = useState({ name: "", category: "custom" });
  const [editMode, setEditMode] = useState(false);

  const active = selectors.filter((s) => !s.archivedAt);
  const archived = selectors.filter((s) => s.archivedAt);
  const grouped = CATEGORIES.reduce<Record<string, TasteSelector[]>>((acc, c) => {
    acc[c.value] = active.filter((s) => s.category === c.value);
    return acc;
  }, {});

  const openNew = (category = "custom") => { setEditing(null); setForm({ name: "", category }); setOpen(true); };
  const openEdit = (s: TasteSelector) => { setEditing(s); setForm({ name: s.name, category: s.category }); setOpen(true); };

  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/taste-selectors/seed", { method: "POST" });
      if (!response.ok) throw new Error(await errorMessageFrom(response));
      return response.json() as Promise<{ seeded: number }>;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["taste-selectors"] });
      toast({ title: d.seeded > 0 ? `Loaded ${d.seeded} standard selectors` : "All standard selectors are already loaded" });
    },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, restore }: { id: number; restore: boolean }) => {
      const response = await fetch(`/api/taste-selectors/${id}/${restore ? "restore" : "archive"}`, { method: "POST" });
      if (!response.ok) throw new Error(await errorMessageFrom(response));
    },
    onSuccess: (_d, { restore }) => { qc.invalidateQueries({ queryKey: ["taste-selectors"] }); toast({ title: restore ? "Restored" : "Archived" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const promoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/taste-selectors/${id}/promote`, { method: "POST" });
      if (!response.ok) throw new Error(await errorMessageFrom(response));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taste-selectors"] }); toast({ title: "Promoted to standard" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/taste-selectors/${editing.id}` : "/api/taste-selectors";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) throw new Error(await errorMessageFrom(r));
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taste-selectors"] }); setOpen(false); toast({ title: editing ? "Updated" : "Added" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/taste-selectors/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await errorMessageFrom(response));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["taste-selectors"] }); toast({ title: "Removed" }); },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-7 w-7 text-primary" /> Taste Selectors
          </h1>
          <p className="text-muted-foreground mt-1">
            Your tasting vocabulary — the quick-pick tags you apply on the shot form when recording how a shot tasted,
            grouped into the categories below. Standard ones are marked <span className="font-medium">(std)</span>; add your own anytime.
          </p>
          {editMode && (
            <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
              Archive hides a selector from the shot form but keeps it on shots you already tagged. Standard selectors keep
              their name and category so they stay comparable for future community profiling — archive one you don't use and
              add a custom version instead. Custom selectors stay personal and can be renamed, recategorized, or deleted — or
              promoted to standard with the check-badge button once you're happy with the name and category.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectors.length > 0 && (
            <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode((v) => !v)} className="gap-2">
              {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editMode ? "Done" : "Edit"}
            </Button>
          )}
          {selectors.length > 0 && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} className="gap-2" disabled={seedMutation.isPending}>
              <RefreshCw className={cn("h-4 w-4", seedMutation.isPending && "animate-spin")} />
              Load Standard Selectors
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
          <p className="text-sm mt-1">Load the 25 standard selectors to get started — you can archive ones you don't use or add your own afterwards.</p>
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
                    {s.origin === "standard" && <span className="text-[10px] opacity-60">(std)</span>}
                    {editMode && s.origin === "custom" && (
                      <button onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {editMode && (
                      <button onClick={() => archiveMutation.mutate({ id: s.id, restore: false })} aria-label={`Archive ${s.name}`} className="opacity-60 hover:opacity-100 transition-opacity" disabled={archiveMutation.isPending}>
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {editMode && s.origin === "custom" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button aria-label={`Make ${s.name} standard`} className="opacity-60 hover:opacity-100 transition-opacity">
                            <BadgeCheck className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Make "{s.name}" a standard selector?</AlertDialogTitle>
                            <AlertDialogDescription>
                              It joins the standard vocabulary used for future community profiling, filed under {CAT_LABEL[s.category] ?? s.category}.
                              Its name and category will then be locked and it can only be archived, not deleted — check both before promoting.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => promoteMutation.mutate(s.id)}>Make Standard</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {editMode && s.origin === "custom" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button aria-label={`Delete ${s.name}`} className="opacity-60 hover:opacity-100 hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete selector?</AlertDialogTitle>
                            <AlertDialogDescription>"{s.name}" will be removed, including from every shot already tagged with it. Archive it instead to keep those tags. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {archived.length > 0 && (
            <section>
              <h2 className="font-semibold text-base mb-1">Archived</h2>
              <p className="text-xs text-muted-foreground mb-3">Hidden from the shot form; still shown on shots already tagged with them.</p>
              <div className="flex flex-wrap gap-2">
                {archived.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm font-medium text-muted-foreground">
                    <span>{s.name}</span>
                    <span className="text-[10px] opacity-60">{CAT_LABEL[s.category] ?? s.category}</span>
                    <button onClick={() => archiveMutation.mutate({ id: s.id, restore: true })} aria-label={`Restore ${s.name}`} className="opacity-60 hover:opacity-100 transition-opacity" disabled={archiveMutation.isPending}>
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{active.length} selectors across {CATEGORIES.filter((c) => grouped[c.value]?.length > 0).length} categories</p>
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
