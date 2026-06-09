import React, { useState } from "react";
import { Link } from "wouter";
import { useListShots } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Filter, Search, Plus, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShotList() {
  const [search, setSearch] = useState("");
  const { data: rawData, isLoading } = useListShots({ search, limit: "50" });
  const shots = (rawData as unknown as { shots: typeof rawData; total: number } | undefined)?.shots;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Shot Log</h1>
          <p className="text-muted-foreground mt-1">Review and filter your past extractions.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/shots/new">
              <Plus className="mr-2 h-4 w-4" /> Log Shot
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by bean, bag, or notes..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : shots?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No shots found matching your criteria.
          </div>
        ) : (
          shots?.map((shot: NonNullable<typeof shots>[number]) => (
            <Link key={shot.id} href={`/shots/${shot.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{shot.bean || "Unknown Bean"}</span>
                      {shot.status && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-secondary text-secondary-foreground rounded-sm">
                          {shot.status}
                        </span>
                      )}
                      {shot.isReference && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-primary/20 text-primary rounded-sm">
                          Reference
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-mono text-muted-foreground">
                      {shot.dose}g in → {shot.yield}g out • {shot.pourTime}s @ {shot.temperature}°C
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 min-w-[120px]">
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(shot.shotDate), "MMM d, yyyy")}
                    </div>
                    {shot.rating != null && (
                      <div className="flex items-center text-sm font-medium text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded">
                        <Star className="h-3.5 w-3.5 mr-1 fill-current" /> {shot.rating}/10
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
