import React, { useState } from "react";
import { Link } from "wouter";
import { useListShots } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Search, Plus, Star, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Shot Highlight helpers ────────────────────────────────────────────────────

// Airtable multi-selects are stored as quoted CSV (e.g. "Caramel Forward, Balanced").
// We display only the first value as the primary highlight.
function firstCsvValue(val: string | null | undefined): string | null {
  if (!val) return null;
  const unquoted = val.replace(/^"|"$/g, "").trim();
  return unquoted.split(",")[0]?.trim() || null;
}

interface ShotHighlightSource {
  expressionStyle?: string | null;
  isReference: boolean;
  signatureShot?: boolean | null;
  sourShot?: boolean | null;
  beanAchievement?: string | null;
  shotClassification?: string | null;
}

function getShotHighlights(shot: ShotHighlightSource): string[] {
  const highlights: string[] = [];

  // Reference / Signature shown as top badge — excluded from highlights

  // 1. First Expression Style
  const expr = firstCsvValue(shot.expressionStyle);
  if (expr) highlights.push(expr);

  // 2. Sour Shot
  if (shot.sourShot) highlights.push("Sour");

  // 3. First Bean Achievement
  const ach = firstCsvValue(shot.beanAchievement);
  if (ach) highlights.push(ach);

  // 4. First Shot Classification
  const cls = firstCsvValue(shot.shotClassification);
  if (cls) highlights.push(cls);

  return highlights.slice(0, 3);
}

function highlightChipClass(label: string): string {
  if (label === "Reference") return "bg-primary/15 text-primary border-primary/20";
  if (label === "Signature") return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900";
  if (label === "Sour") return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900";
  return "bg-secondary/60 text-secondary-foreground border-border";
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ShotList() {
  const [search, setSearch] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: rawData, isLoading } = useListShots({ search, limit: "50" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shots = (rawData as any)?.shots as any[] | undefined;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Shot Log</h1>
          <p className="text-muted-foreground mt-1">Review and filter your past extractions.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
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

      {/* Shot Highlights onboarding */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          onClick={() => setShowOnboarding((v) => !v)}
        >
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>About Shot Highlights</span>
        </button>
        {showOnboarding && (
          <button type="button" onClick={() => setShowOnboarding(false)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
        )}
      </div>
      {showOnboarding && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Shot Highlights</p>
            <p>Shot Highlights help you quickly remember what made a shot memorable — without opening the full record.</p>
            <p>When selecting multiple Expression Styles or Achievements in a shot, place the most important one first. BSE uses the first selected value as the primary Shot Highlight.</p>
            <p className="text-xs">Examples: <span className="font-medium">Caramel Forward · Balanced</span> &nbsp;·&nbsp; <span className="font-medium">Balanced · Sour · Guest Worthy</span></p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : shots?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No shots found matching your criteria.
          </div>
        ) : (
          shots?.map((shot) => {
            const highlights = getShotHighlights(shot);
            return (
              <Link key={shot.id} href={`/shots/${shot.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Reference / Signature top badge — Signature hides Reference */}
                      {(shot.signatureShot || shot.isReference) && (
                        <div className="mb-1.5">
                          {shot.signatureShot ? (
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900">
                              Signature
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-primary/15 text-primary border-primary/20">
                              Reference
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bean + status badge */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{shot.bean || "Unknown Bean"}</span>
                        {shot.status && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-secondary text-secondary-foreground rounded-sm shrink-0">
                            {shot.status}
                          </span>
                        )}
                      </div>

                      {/* Extraction stats */}
                      <div className="text-sm font-mono text-muted-foreground mb-2">
                        {shot.dose != null ? `${shot.dose}g` : "—"}
                        {" → "}
                        {shot.yield != null ? `${shot.yield}g` : "—"}
                        {shot.pourTime != null ? ` • ${shot.pourTime}s` : ""}
                        {shot.temperature != null ? ` @ ${shot.temperature}°C` : ""}
                      </div>

                      {/* Shot Highlights */}
                      {highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {highlights.map((h, i) => (
                            <span
                              key={`${h}-${i}`}
                              className={cn(
                                "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                                highlightChipClass(h)
                              )}
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date + rating */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
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
            );
          })
        )}
      </div>
    </div>
  );
}
