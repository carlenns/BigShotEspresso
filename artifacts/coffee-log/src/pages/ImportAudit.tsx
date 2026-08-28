import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database, CheckCircle2, XCircle,
  Info, Package, Coffee, Layers, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AirtableStatus {
  hasToken: boolean;
  hasBaseId: boolean;
  lastSync: string | null;
  lastSyncResult: Record<string, { inserted: number; updated: number; skipped: number; errors: string[] }> | null;
  lastClear: string | null;
  lastClearResult: Record<string, number> | null;
}

interface DbCounts {
  beans: { total: number; fromAirtable: number };
  bags: { total: number; fromAirtable: number };
  shots: { total: number; fromAirtable: number };
  grinders: { total: number };
  machines: { total: number };
  accessories: { total: number };
  tasteSelectors: { total: number };
}

interface SyncStats {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ── Page ─────────────────────────────────────────────────────────────────────

// Read-only owner diagnostics. Closes RC Gate 9: a way to inspect record
// counts, import provenance, and the last sync/clear events without touching
// the database directly. No write actions live here — the historical
// sync/clear tooling was removed when this page was routed (Airtable is a
// dormant prototype source, not a live one).
export default function DataHealth() {
  const { data: status, isLoading: loadingStatus } = useQuery<AirtableStatus>({
    queryKey: ["airtable-status"],
    queryFn: () => fetch("/api/airtable/status").then((r) => r.json()),
    refetchOnWindowFocus: false,
  });

  const { data: counts, isLoading: loadingCounts } = useQuery<DbCounts>({
    queryKey: ["airtable-counts"],
    queryFn: () => fetch("/api/airtable/counts").then((r) => r.json()),
    refetchOnWindowFocus: false,
  });

  const credsMissing = status && (!status.hasToken || !status.hasBaseId);

  const totalSyncedFromAirtable = (counts?.beans.fromAirtable ?? 0) + (counts?.bags.fromAirtable ?? 0) + (counts?.shots.fromAirtable ?? 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-7 w-7 text-primary" />
          Data Health
        </h1>
        <p className="text-muted-foreground mt-1">
          Read-only view of what's in the database — record counts, import provenance, and the last
          sync/clear events. For owner diagnostics.
        </p>
      </div>

      {/* Credentials status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Airtable Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <CredBadge label="COFFEELOG_AIRTABLE_API_KEY" present={status?.hasToken ?? false} />
            <CredBadge label="COFFEELOG_AIRTABLE_BASE_ID" present={status?.hasBaseId ?? false} />
          </div>
          {!loadingStatus && credsMissing && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 border p-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                No Airtable credentials are configured in this environment. Airtable is a dormant
                prototype source; the live data below came from CSV imports and in-app entry. The
                counts and history on this page always reflect the Postgres database.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live DB counts */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Database Contents</h2>
        {loadingCounts ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : counts ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CountCard icon={Coffee} label="Beans" total={counts.beans.total} fromAirtable={counts.beans.fromAirtable} />
            <CountCard icon={Package} label="Bags" total={counts.bags.total} fromAirtable={counts.bags.fromAirtable} />
            <CountCard icon={Layers} label="Shots" total={counts.shots.total} fromAirtable={counts.shots.fromAirtable} />
            <CountCard icon={Database} label="Other records" total={(counts.grinders.total + counts.machines.total + counts.accessories.total + counts.tasteSelectors.total)} />
          </div>
        ) : null}

        {counts && totalSyncedFromAirtable === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">No records carry an Airtable origin — the current data came from CSV import and in-app entry.</p>
          </div>
        )}
      </section>

      {/* Last sync summary */}
      {status?.lastSync && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Last Sync</h2>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Completed</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(status.lastSync), "d MMM yyyy, HH:mm")}
                </span>
              </div>
              {status.lastSyncResult && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Object.entries(status.lastSyncResult).map(([table, stat]) => (
                    <SyncStatCard key={table} table={table} stat={stat} />
                  ))}
                </div>
              )}
              {status.lastSyncResult && Object.values(status.lastSyncResult).some((s) => s.errors.length > 0) && (
                <SyncErrors result={status.lastSyncResult} />
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Last clear summary */}
      {status?.lastClearResult && status.lastClear && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Last Clear Event</h2>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cleared {format(new Date(status.lastClear), "d MMM yyyy, HH:mm")}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(status.lastClearResult).map(([table, count]) => (
                  <div key={table} className="rounded bg-muted/40 px-2.5 py-2">
                    <p className="text-muted-foreground capitalize">{table}</p>
                    <p className="font-bold">{count} deleted</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CredBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border font-mono",
      present ? "bg-green-50 dark:bg-green-950/30 border-green-200/60 text-green-700 dark:text-green-400"
               : "bg-muted border-border text-muted-foreground")}>
      {present ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
      {label}
    </div>
  );
}

function CountCard({ icon: Icon, label, total, fromAirtable }: { icon: React.ElementType; label: string; total: number; fromAirtable?: number }) {
  const allFromAirtable = fromAirtable !== undefined && total > 0 && fromAirtable === total;
  const noneFromAirtable = fromAirtable !== undefined && total > 0 && fromAirtable === 0;
  return (
    <Card className={cn(allFromAirtable && "border-green-300/50", noneFromAirtable && total > 0 && "border-amber-300/50")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums">{total}</p>
        {fromAirtable !== undefined && (
          <p className={cn("text-xs mt-0.5", allFromAirtable ? "text-green-600" : noneFromAirtable ? "text-amber-600" : "text-muted-foreground")}>
            {fromAirtable} from Airtable{noneFromAirtable && total > 0 ? " — may be CSV data" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SyncStatCard({ table, stat }: { table: string; stat: SyncStats }) {
  const total = stat.inserted + stat.updated + stat.skipped;
  return (
    <div className="rounded-lg bg-background border p-3">
      <p className="text-xs font-semibold capitalize mb-1.5">{table}</p>
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p><span className="text-green-600 font-medium">{stat.inserted}</span> inserted</p>
        <p><span className="text-blue-600 font-medium">{stat.updated}</span> updated</p>
        {stat.skipped > 0 && <p>{stat.skipped} skipped</p>}
        {stat.errors.length > 0 && <p className="text-red-500 font-medium">{stat.errors.length} error{stat.errors.length > 1 ? "s" : ""}</p>}
        <p className="text-muted-foreground pt-0.5 border-t mt-1">{total} total</p>
      </div>
    </div>
  );
}

function SyncErrors({ result }: { result: Record<string, SyncStats> }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show sync errors</summary>
      <div className="mt-2 space-y-1 font-mono">
        {Object.entries(result).flatMap(([table, stat]) =>
          stat.errors.map((e, i) => (
            <p key={`${table}-${i}`} className="text-red-500 break-all">[{table}] {e}</p>
          ))
        )}
      </div>
    </details>
  );
}
