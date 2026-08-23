import React from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useGetShot, useGetSimilarShots, useDeleteShot, getListShotsQueryKey, getGetDashboardSummaryQueryKey, getGetShotQueryKey, getGetSimilarShotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, Trash2, Star, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ShotDetail() {
  const [, params] = useRoute("/shots/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shot, isLoading, isError } = useGetShot(id, { query: { enabled: !!id, queryKey: getGetShotQueryKey(id) }});
  const { data: similarShots } = useGetSimilarShots(id, { query: { enabled: !!id, queryKey: getGetSimilarShotsQueryKey(id) }});
  const deleteShot = useDeleteShot();

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (isError || !shot) {
    return <div className="text-center text-red-500 py-12">Failed to load shot data.</div>;
  }

  const handleDelete = () => {
    deleteShot.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Shot deleted" });
        queryClient.invalidateQueries({ queryKey: getListShotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setLocation("/shots");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/shots"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-serif">{shot.bean || "Unnamed Bean"}</h1>
            <p className="text-muted-foreground text-sm">{format(new Date(shot.shotDate), "PPP 'at' p")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href={`/shots/${id}/edit`}><Pencil className="h-4 w-4" /> Edit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="shrink-0"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this shot?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Extraction Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <DetailItem label="Dose" value={`${shot.dose}g`} />
            <DetailItem label="Yield" value={`${shot.yield}g`} />
            <DetailItem label="Time" value={`${shot.pourTime}s`} />
            <DetailItem label="Temp" value={shot.temperature ? `${shot.temperature}°C` : "-"} />
            <DetailItem label="Ratio" value={shot.ratio || "-"} />
            <DetailItem label="Flow Time" value={shot.flowTime != null ? `${shot.flowTime}s` : "-"} />
            <DetailItem label="First Pour Delay" value={shot.pourDelay != null ? `${shot.pourDelay}s` : "-"} />
            <DetailItem label="Status" value={shot.status || "-"} />
            {shot.grindWaste != null && <DetailItem label="Grind Waste" value={`${shot.grindWaste}g`} />}
            <DetailItem label="Include in Analysis" value={shot.includeInAnalysis ? "Yes" : "No"} />
            <DetailItem label="Fault Status" value={<ChipList values={shot.faultStatus} />} />
            <DetailItem label="Shot Classification" value={<ChipList values={shot.shotClassification} />} />
            <DetailItem label="Bean Achievement" value={<ChipList values={shot.beanAchievement} />} />
            <DetailItem label="Expression Style" value={<ChipList values={shot.expressionStyle} />} />
            <DetailItem label="Taste Zone" value={shot.tasteZone || shot.zone || "-"} />
            <div className="col-span-2 sm:col-span-4 mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-muted/30 p-3 rounded-md">{shot.notes || "No notes recorded."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-6xl font-bold font-serif text-primary mb-2">
              {shot.rating || "-"}
            </div>
            <p className="text-sm text-muted-foreground flex items-center">
              <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" /> Technical rating out of 10
            </p>
            <div className="mt-5 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Preference Rating</p>
              <p className="text-2xl font-semibold font-serif">
                {shot.preferenceRating != null ? shot.preferenceRating : "—"}
                {shot.preferenceRating != null && Number(shot.preferenceRating) > 10 && (
                  <span className="ml-1 text-primary">/11</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground max-w-52">
                Personal score. 11 is reserved for rare, over-the-top benchmark shots.
              </p>
            </div>
            {shot.signatureShot && (
              <div className="mt-6 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
                Signature Shot
              </div>
            )}
            {shot.isReference && (
              <div className="mt-3 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                Reference Shot
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {similarShots && similarShots.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-semibold border-b pb-2">Similar Shots</h2>
          <div className="grid gap-3">
            {similarShots.map(similar => (
              <Link key={similar.id} href={`/shots/${similar.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{similar.bean}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {similar.dose}g in → {similar.yield}g out • {similar.pourTime}s
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(similar.shotDate), "MMM d, yyyy")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="font-mono text-lg">{value}</p>
    </div>
  );
}

function ChipList({ values }: { values?: string[] | null }) {
  if (!values || values.length === 0) return <>-</>;
  return (
    <span className="flex flex-wrap gap-1">
      {values.map((value) => (
        <span key={value} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-sans text-primary">
          {value}
        </span>
      ))}
    </span>
  );
}
