import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database, CheckCircle2, XCircle, RefreshCw, Loader2,
  AlertTriangle, Trash2, Info, Package, Coffee, Layers,
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

export default function SyncAudit() {
  const queryClient = useQueryClient();

  const { data: status, isLoading: loadingStatus, refetch: refetchStatus } = useQuery<AirtableStatus>({
    queryKey: ["airtable-status"],
    queryFn: () => fetch("/api/airtable/status").then((r) => r.json()),
    refetchOnWindowFocus: false,
  });

  const { data: counts, isLoading: loadingCounts, refetch: refetchCounts } = useQuery<DbCounts>({
    queryKey: ["airtable-counts"],
    queryFn: () => fetch("/api/airtable/counts").then((r) => r.json()),
    refetchOnWindowFocus: false,
  });

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ syncedAt: string; stats: Record<string, SyncStats> } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [clearPhase, setClearPhase] = useState<"idle" | "confirm" | "clearing" | "done">("idle");
  const [clearResult, setClearResult] = useState<{ clearedAt: string; deleted: Record<string, number> } | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  const credsMissing = status && (!status.hasToken || !status.hasBaseId);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch("/api/airtable/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setSyncError(data.error);
      } else {
        setSyncResult(data);
        refetchStatus();
        refetchCounts();
        queryClient.invalidateQueries({ queryKey: ["dashboard-intelligence"] });
        queryClient.invalidateQueries({ queryKey: ["shots"] });
        queryClient.invalidateQueries({ queryKey: ["beans"] });
        queryClient.invalidateQueries({ queryKey: ["bags"] });
      }
    } catch (e) {
      setSyncError(String(e));
    } finally {
      setSyncing(false);
    }
  };

  const handleClear = async () => {
    setClearPhase("clearing");
    setClearResult(null);
    setClearError(null);
    try {
      const res = await fetch("/api/airtable/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (data.error) {
        setClearError(data.error);
        setClearPhase("idle");
      } else {
        setClearResult(data);
        setClearPhase("done");
        refetchStatus();
        refetchCounts();
        queryClient.invalidateQueries();
      }
    } catch (e) {
      setClearError(String(e));
      setClearPhase("idle");
    }
  };

  const totalSyncedFromAirtable = (counts?.beans.fromAirtable ?? 0) + (counts?.bags.fromAirtable ?? 0) + (counts?.shots.fromAirtable ?? 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-7 w-7 text-primary" />
          Sync Audit
        </h1>
        <p className="text-muted-foreground mt-1">
          Airtable is the prototype source of truth. Sync populates Postgres; the app reads from Postgres.
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
          {credsMissing && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Set <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">COFFEELOG_AIRTABLE_API_KEY</code>{" "}
                and <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">COFFEELOG_AIRTABLE_BASE_ID</code>{" "}
                before syncing. Legacy <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">AIRTABLE_API_KEY</code>{" "}
                and <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">AIRTABLE_BASE_ID</code> are temporary fallbacks.
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
            <p className="text-sm text-muted-foreground">No Airtable data synced yet. Run a sync to populate the app with your live Airtable data.</p>
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

      {/* Sync action */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Sync from Airtable</h2>
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Pulls all records from Airtable (Beans → Bags → Shots). Updates existing records by Airtable ID, inserts new ones. Safe to run multiple times.
            </p>
            <Button onClick={handleSync} disabled={syncing || !!credsMissing} className="gap-2">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Syncing…" : "Sync from Airtable"}
            </Button>

            {syncError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50/50 border border-red-200/60 p-3">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600 font-mono break-all">{syncError}</p>
              </div>
            )}

            {syncResult && (
              <div className="rounded-lg border bg-green-50/30 dark:bg-green-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-sm">Sync complete — {format(new Date(syncResult.syncedAt), "d MMM yyyy, HH:mm")}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Object.entries(syncResult.stats).map(([table, stat]) => (
                    <SyncStatCard key={table} table={table} stat={stat} />
                  ))}
                </div>
                {Object.values(syncResult.stats).some((s) => s.errors.length > 0) && (
                  <SyncErrors result={syncResult.stats} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Clear & Replace */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Clear Coffee Data</h2>
        <Card className={cn(clearPhase === "confirm" && "border-destructive/50")}>
          <CardContent className="p-5 space-y-4">

            {clearPhase === "idle" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Permanently removes all Beans, Bags, Shots, Equipment, Accessories, and Taste Selectors from the database.
                  Schema, settings, and app structure are preserved. Use before a fresh Airtable sync to start clean.
                </p>
                {status?.lastClear && (
                  <p className="text-xs text-muted-foreground">
                    Last cleared: {format(new Date(status.lastClear), "d MMM yyyy, HH:mm")}
                    {status.lastClearResult && ` (${Object.values(status.lastClearResult).reduce((a, b) => a + b, 0)} records deleted)`}
                  </p>
                )}
                <Button variant="destructive" onClick={() => setClearPhase("confirm")} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear All Coffee Data…
                </Button>
              </>
            )}

            {clearPhase === "confirm" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">This will replace all existing coffee data in BigShotEspresso with live Airtable data.</p>
                    <p className="text-sm text-muted-foreground">App structure, tables, and settings will remain intact. All beans, bags, shots, equipment, accessories, and taste selectors will be deleted from Postgres.</p>
                    {counts && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Currently in DB: {counts.beans.total} beans · {counts.bags.total} bags · {counts.shots.total} shots · {counts.grinders.total + counts.machines.total} equipment · {counts.accessories.total} accessories · {counts.tasteSelectors.total} taste selectors
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="destructive" onClick={handleClear} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Yes, delete all coffee data
                  </Button>
                  <Button variant="outline" onClick={() => setClearPhase("idle")}>Cancel</Button>
                </div>
              </div>
            )}

            {clearPhase === "clearing" && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Clearing all coffee data…</span>
              </div>
            )}

            {clearPhase === "done" && clearResult && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-sm">All coffee data cleared — {format(new Date(clearResult.clearedAt), "d MMM yyyy, HH:mm")}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {Object.entries(clearResult.deleted).map(([table, count]) => (
                      <div key={table} className="rounded bg-background border px-2.5 py-2">
                        <p className="text-muted-foreground capitalize">{table}</p>
                        <p className="font-bold">{count} deleted</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Now run a sync to pull your live Airtable data into the app.</p>
                <div className="flex gap-3">
                  <Button onClick={handleSync} disabled={syncing || !!credsMissing} className="gap-2">
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {syncing ? "Syncing…" : "Sync from Airtable now"}
                  </Button>
                  <Button variant="outline" onClick={() => setClearPhase("idle")}>Done</Button>
                </div>
                {syncError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50/50 border border-red-200/60 p-3">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600 font-mono break-all">{syncError}</p>
                  </div>
                )}
                {syncResult && (
                  <div className="rounded-lg border bg-green-50/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-sm">Sync complete — {format(new Date(syncResult.syncedAt), "d MMM yyyy, HH:mm")}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {Object.entries(syncResult.stats).map(([table, stat]) => (
                        <SyncStatCard key={table} table={table} stat={stat} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {clearError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50/50 border border-red-200/60 p-3">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600 break-all">{clearError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Last clear summary */}
      {status?.lastClearResult && status.lastClear && clearPhase === "idle" && (
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
