import React from "react";
import { Link } from "wouter";
import { useListReferenceShots } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Target, Star } from "lucide-react";

export default function ReferenceShots() {
  const { data: shots, isLoading } = useListReferenceShots();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" /> Reference Shots
          </h1>
          <p className="text-muted-foreground mt-1">Your dialed-in, perfect extractions to aim for.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : shots?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
            No reference shots found. Mark a shot as reference when you hit the perfect extraction.
          </div>
        ) : (
          shots?.map((shot) => (
            <Link key={shot.id} href={`/shots/${shot.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full border-primary/20 bg-gradient-to-br from-background to-primary/5 shadow-sm">
                <CardContent className="p-6 flex flex-col h-full justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold font-serif text-lg leading-tight">{shot.bean || "Unknown Bean"}</h3>
                      {shot.rating && (
                        <span className="flex items-center text-sm font-bold text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-md shrink-0">
                          <Star className="h-3.5 w-3.5 mr-1 fill-current" /> {shot.rating}
                        </span>
                      )}
                    </div>
                    {shot.bag && <p className="text-sm text-muted-foreground">{shot.bag}</p>}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 border-y border-primary/10 py-3 my-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">In</div>
                      <div className="font-mono font-medium">{shot.dose != null ? `${shot.dose}g` : "—"}</div>
                    </div>
                    <div className="text-center border-x border-primary/10">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Out</div>
                      <div className="font-mono font-medium">{shot.yield != null ? `${shot.yield}g` : "—"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Time</div>
                      <div className="font-mono font-medium">{shot.pourTime != null ? `${shot.pourTime}s` : "—"}</div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex justify-between items-center mt-auto">
                    <span>{format(new Date(shot.shotDate), "MMM d, yyyy")}</span>
                    <span className="text-primary font-medium">{shot.ratio ?? "—"}</span>
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
