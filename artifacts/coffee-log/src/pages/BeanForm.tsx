import React, { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessageFrom } from "@/lib/http";
import { useToast } from "@/hooks/use-toast";

interface Bean {
  id: number;
  name: string;
  coffeeName: string | null;
  origin: string | null;
  region: string | null;
  roaster: string | null;
  roastLevel: string | null;
  process: string | null;
  certification: string | null;
  variety: string | null;
  altitude: string | null;
  roasterNotes: string | null;
  notes: string | null;
  isActive: boolean;
}

type BeanFormState = {
  name: string;
  coffeeName: string;
  roaster: string;
  origin: string;
  region: string;
  certification: string;
  process: string;
  roastLevel: string;
  variety: string;
  altitude: string;
  roasterNotes: string;
  notes: string;
  isActive: string;
};

const BLANK: BeanFormState = {
  name: "",
  coffeeName: "",
  roaster: "",
  origin: "",
  region: "",
  certification: "",
  process: "",
  roastLevel: "",
  variety: "",
  altitude: "",
  roasterNotes: "",
  notes: "",
  isActive: "true",
};

const ROAST_LEVELS = ["Light", "Light-Medium", "Medium", "Medium-Dark", "Dark"];
const PROCESSES = ["Washed", "Natural", "Honey", "Anaerobic", "Wet-Hulled", "Other"];

function fetchBean(id: number): Promise<Bean> {
  return fetch(`/api/beans/${id}`).then(async (r) => {
    if (!r.ok) throw new Error(await errorMessageFrom(r));
    return r.json();
  });
}

export default function BeanForm() {
  const [, params] = useRoute("/beans/:id/edit");
  const editingId = params?.id ? Number(params.id) : null;
  const isEditing = Number.isFinite(editingId);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<BeanFormState>({ ...BLANK });

  const { data: bean, isLoading } = useQuery({
    queryKey: ["bean", editingId],
    queryFn: () => fetchBean(editingId!),
    enabled: isEditing && !!editingId,
  });

  useEffect(() => {
    if (!bean) return;
    setForm({
      name: bean.name,
      coffeeName: bean.coffeeName ?? "",
      roaster: bean.roaster ?? "",
      origin: bean.origin ?? "",
      region: bean.region ?? "",
      certification: bean.certification ?? "",
      process: bean.process ?? "",
      roastLevel: bean.roastLevel ?? "",
      variety: bean.variety ?? "",
      altitude: bean.altitude ?? "",
      roasterNotes: bean.roasterNotes ?? "",
      notes: bean.notes ?? "",
      isActive: String(bean.isActive),
    });
  }, [bean]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEditing ? `/api/beans/${editingId}` : "/api/beans";
      const method = isEditing ? "PATCH" : "POST";
      const body = Object.fromEntries(
        Object.entries({ ...form, isActive: form.isActive === "true" })
          .filter(([, value]) => value !== "")
      );
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await errorMessageFrom(r));
      return r.json() as Promise<Bean>;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["beans"] });
      queryClient.invalidateQueries({ queryKey: ["bean", saved.id] });
      toast({ title: isEditing ? "Bean updated" : "Bean added" });
      setLocation("/beans");
    },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  const set = (key: keyof BeanFormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  if (isEditing && isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/beans"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sprout className="h-7 w-7 text-primary" /> {isEditing ? "Edit Bean" : "Add Bean"}
          </h1>
          <p className="text-muted-foreground mt-1">Bean fields follow the Coffee Log Beans CSV model.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bean Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Beans / Display Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. De Luca's — Authentic Espresso" />
          </div>
          <div className="space-y-1.5">
            <Label>Roaster</Label>
            <Input value={form.roaster} onChange={(e) => set("roaster", e.target.value)} placeholder="e.g. De Luca's" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.coffeeName} onChange={(e) => set("coffeeName", e.target.value)} placeholder="Coffee/product name if separate" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="e.g. Brazil" />
          </div>
          <div className="space-y-1.5">
            <Label>Region</Label>
            <Input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Tarrazú" />
          </div>
          <div className="space-y-1.5">
            <Label>Certification</Label>
            <Input value={form.certification} onChange={(e) => set("certification", e.target.value)} placeholder="e.g. Organic, Fairtrade" />
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
            <Label>Roast Level</Label>
            <Select value={form.roastLevel || "__none__"} onValueChange={(v) => set("roastLevel", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— not set —</SelectItem>
                {ROAST_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Roaster Notes</Label>
            <Textarea value={form.roasterNotes} onChange={(e) => set("roasterNotes", e.target.value)} placeholder="Optional roaster/source notes…" className="min-h-[72px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Variety</Label>
            <Input value={form.variety} onChange={(e) => set("variety", e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Altitude</Label>
            <Input value={form.altitude} onChange={(e) => set("altitude", e.target.value)} placeholder="Optional" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Tasting notes, source evidence, label details…" className="min-h-[96px]" />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
            <Label className="font-normal">Active</Label>
            <Switch checked={form.isActive === "true"} onCheckedChange={(v) => set("isActive", String(v))} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link href="/beans">Cancel</Link></Button>
        <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving…" : isEditing ? "Save Bean" : "Create Bean"}
        </Button>
      </div>
    </div>
  );
}
