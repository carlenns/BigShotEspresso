import React from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star, Pencil, Trash2, Sprout } from "lucide-react";

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
  createdAt: string;
  bagCount: number;
  shotCount: number;
  avgRating: number | null;
  referenceCount: number;
}

function fetchBeans(): Promise<Bean[]> {
  return fetch("/api/beans").then((r) => r.json());
}

export default function Beans() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: beans = [], isLoading } = useQuery({ queryKey: ["beans"], queryFn: fetchBeans });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/beans/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beans"] });
      toast({ title: "Bean deleted" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const active = beans.filter((b) => b.isActive);
  const inactive = beans.filter((b) => !b.isActive);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sprout className="h-7 w-7 text-primary" /> Bean Catalog
          </h1>
          <p className="text-muted-foreground mt-1">Master list of all beans. Track origin, process, certification, and performance.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/beans/new"><Plus className="h-4 w-4" /> Add Bean</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : beans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Sprout className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No beans yet.</p>
          <p className="text-sm mt-1">Add your first bean to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Active</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((b) => <BeanCard key={b.id} bean={b} onDelete={(id) => deleteMutation.mutate(id)} />)}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Inactive</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                {inactive.map((b) => <BeanCard key={b.id} bean={b} onDelete={(id) => deleteMutation.mutate(id)} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function BeanCard({ bean: b, onDelete }: { bean: Bean; onDelete: (id: number) => void }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg leading-snug">{b.name}</CardTitle>
            {b.coffeeName && b.coffeeName !== b.name && (
              <p className="text-sm text-muted-foreground mt-1">{b.coffeeName}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <Link href={`/beans/${b.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(b.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {b.roastLevel && <Badge variant="outline" className="text-xs">{b.roastLevel}</Badge>}
          {b.process && <Badge variant="outline" className="text-xs">{b.process}</Badge>}
          {b.certification && <Badge variant="outline" className="text-xs">{b.certification}</Badge>}
          {b.region ? <Badge variant="secondary" className="text-xs">{b.region}</Badge> : b.origin ? <Badge variant="secondary" className="text-xs">{b.origin}</Badge> : null}
          {!b.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
        <div className="text-sm text-muted-foreground space-y-0.5">
          {b.roaster && <p>Roaster: <span className="text-foreground">{b.roaster}</span></p>}
          {b.origin && <p>Country: <span className="text-foreground">{b.origin}</span></p>}
          {b.variety && <p>Variety: <span className="text-foreground">{b.variety}</span></p>}
          {b.altitude && <p>Altitude: <span className="text-foreground">{b.altitude}</span></p>}
          {b.roasterNotes && <p className="italic text-xs line-clamp-2">"{b.roasterNotes}"</p>}
          {b.notes && <p className="text-xs line-clamp-2">{b.notes}</p>}
        </div>
        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <span className="text-muted-foreground">{b.bagCount} bag{b.bagCount !== 1 ? "s" : ""} · {b.shotCount} shots</span>
          {b.avgRating != null && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Star className="h-3.5 w-3.5 fill-current" />{Number(b.avgRating).toFixed(1)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
