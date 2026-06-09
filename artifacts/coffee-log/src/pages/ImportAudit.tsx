import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Database, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditSummary {
  totalRows: number;
  totalColumns: number;
  earliestDate: string | null;
  latestDate: string | null;
  uniqueBags: string[];
  uniqueStatuses: string[];
  uniqueFaultStatuses: string[];
  referenceShots: number;
  nonReferenceShots: number;
}

interface AuditShot {
  id: number;
  shotDate: string;
  bean: string | null;
  bag: string | null;
  status: string | null;
  faultStatus: string | null;
  rating: number | null;
  isReference: boolean;
  dose: number | null;
  yield: number | null;
  pourTime: number | null;
  notes: string | null;
  rawRow: Record<string, string> | null;
}

function fetchAudit(): Promise<{ summary: AuditSummary; shots: AuditShot[] }> {
  return fetch("/api/shots/audit").then((r) => r.json());
}

const EXPECTED_ROWS = 132;
const EXPECTED_COLS = 87;

export default function ImportAudit() {
  const { data, isLoading } = useQuery({ queryKey: ["audit"], queryFn: fetchAudit });
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const summary = data?.summary;
  const shots = data?.shots ?? [];

  const filtered = shots.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.bean?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q) ||
      s.faultStatus?.toLowerCase().includes(q) ||
      s.notes?.toLowerCase().includes(q) ||
      s.shotDate?.toLowerCase().includes(q)
    );
  });

  const rowsOk = summary ? summary.totalRows === EXPECTED_ROWS : null;
  const colsOk = summary ? summary.totalColumns === EXPECTED_COLS : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-7 w-7 text-primary" />
          CSV Import Audit
        </h1>
        <p className="text-muted-foreground mt-1">
          Inspect every row imported from the CSV exactly as parsed.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : summary ? (
        <>
          {/* Validation Banner */}
          <div className={cn(
            "rounded-lg border p-4 flex items-start gap-3",
            rowsOk && colsOk ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
          )}>
            {rowsOk && colsOk ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            )}
            <div className="text-sm space-y-1">
              <p className="font-semibold">
                {rowsOk && colsOk
                  ? "Import validated — all expected rows and columns present."
                  : "Import mismatch detected."}
              </p>
              {!rowsOk && (
                <p className="text-red-700">
                  Rows: imported <strong>{summary.totalRows}</strong>, expected <strong>{EXPECTED_ROWS}</strong>
                </p>
              )}
              {!colsOk && (
                <p className="text-red-700">
                  Columns: found <strong>{summary.totalColumns}</strong>, expected <strong>{EXPECTED_COLS}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Total Rows" value={summary.totalRows} expected={EXPECTED_ROWS} />
            <SummaryCard label="Total Columns" value={summary.totalColumns} expected={EXPECTED_COLS} />
            <SummaryCard
              label="Earliest Date"
              value={summary.earliestDate ? format(new Date(summary.earliestDate), "MMM d, yyyy") : "—"}
            />
            <SummaryCard
              label="Latest Date"
              value={summary.latestDate ? format(new Date(summary.latestDate), "MMM d, yyyy") : "—"}
            />
            <SummaryCard label="Reference Shots" value={summary.referenceShots} />
            <SummaryCard label="Non-Reference" value={summary.nonReferenceShots} />
            <SummaryCard label="Unique Bags" value={summary.uniqueBags.length} detail={summary.uniqueBags.join(", ")} />
            <SummaryCard label="Unique Statuses" value={summary.uniqueStatuses.length} detail={summary.uniqueStatuses.join(", ")} />
          </div>

          {/* Status breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary.uniqueStatuses.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
              {summary.uniqueFaultStatuses.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Fault statuses:</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.uniqueFaultStatuses.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs border-red-300 text-red-700">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Row Viewer */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Imported Rows</CardTitle>
              <CardDescription>
                {filtered.length} of {shots.length} rows — expand a row to see all 87 columns
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filter by bean, status, notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Bean</TableHead>
                    <TableHead>Bag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dose</TableHead>
                    <TableHead>Yield</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Fault</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((shot) => (
                    <React.Fragment key={shot.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === shot.id ? null : shot.id)}
                      >
                        <TableCell className="text-muted-foreground">
                          {expandedId === shot.id
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {shot.shotDate ? format(new Date(shot.shotDate), "MMM d, yyyy h:mma") : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{shot.bean ?? "—"}</TableCell>
                        <TableCell className="text-sm">{shot.bag ?? "—"}</TableCell>
                        <TableCell>
                          {shot.status ? (
                            <Badge variant="outline" className="text-xs">{shot.status}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{shot.dose != null ? `${shot.dose}g` : "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{shot.yield != null ? `${shot.yield}g` : "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{shot.pourTime != null ? `${shot.pourTime}s` : "—"}</TableCell>
                        <TableCell className="text-sm">
                          {shot.rating != null ? (
                            <span className="text-amber-600 font-medium">{shot.rating}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {shot.isReference ? (
                            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">REF</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-red-600">{shot.faultStatus ?? ""}</TableCell>
                      </TableRow>
                      {expandedId === shot.id && shot.rawRow && (
                        <TableRow>
                          <TableCell colSpan={11} className="bg-muted/30 p-4">
                            <RawRowViewer rawRow={shot.rawRow} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No rows match your filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  expected,
  detail,
}: {
  label: string;
  value: string | number;
  expected?: number;
  detail?: string;
}) {
  const isNum = typeof value === "number" && expected !== undefined;
  const ok = isNum ? value === expected : true;
  return (
    <Card className={cn("", isNum && !ok && "border-red-300")}>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={cn("text-2xl font-bold", isNum && !ok ? "text-red-600" : "")}>
          {value}
        </p>
        {isNum && expected !== undefined && (
          <p className="text-xs text-muted-foreground">expected {expected}</p>
        )}
        {detail && <p className="text-xs text-muted-foreground mt-1 truncate" title={detail}>{detail}</p>}
      </CardContent>
    </Card>
  );
}

function RawRowViewer({ rawRow }: { rawRow: Record<string, string> }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const entries = Object.entries(rawRow).filter(([, v]) => showEmpty || v.trim() !== "");
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">
          All {Object.keys(rawRow).length} columns — {Object.values(rawRow).filter(v => v.trim()).length} non-empty
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6"
          onClick={() => setShowEmpty((v) => !v)}
        >
          {showEmpty ? "Hide empty" : "Show empty"}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-96 overflow-y-auto pr-1">
        {entries.map(([col, val]) => (
          <div key={col} className="flex flex-col gap-0.5 bg-background rounded px-2 py-1.5 border text-xs">
            <span className="text-muted-foreground truncate" title={col}>{col}</span>
            <span className="font-mono font-medium break-words">{val || <span className="text-muted-foreground italic">empty</span>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
