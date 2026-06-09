import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Coffee, TrendingUp, Clock, Target, Plus, Star, Award } from "lucide-react";
import { format } from "date-fns";
import {
  useGetDashboardSummary,
  useGetRecentShots,
  useGetBestRatedShots,
  useGetInsights
} from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentShots, isLoading: isLoadingRecent } = useGetRecentShots({ limit: "5" });
  const { data: bestShots, isLoading: isLoadingBest } = useGetBestRatedShots({ limit: "5" });
  const { data: insights, isLoading: isLoadingInsights } = useGetInsights();

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your recent espresso extractions.</p>
        </div>
        <Button asChild>
          <Link href="/shots/new">
            <Plus className="mr-2 h-4 w-4" /> Log Shot
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Shots"
          value={summary?.totalShots}
          icon={Coffee}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Reference Shots"
          value={summary?.referenceShots}
          icon={Target}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Avg Dose"
          value={summary?.avgDose != null ? `${Number(summary.avgDose).toFixed(1)}g` : null}
          icon={TrendingUp}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Avg Pour Time"
          value={summary?.avgPourTime != null ? `${Number(summary.avgPourTime).toFixed(1)}s` : null}
          icon={Clock}
          isLoading={isLoadingSummary}
        />
      </div>

      {insights && insights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight) => (
              <Card key={insight.id} className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider">{insight.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{insight.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Shots</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/shots">View all</Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {isLoadingRecent ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : recentShots?.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No recent shots logged.</p>
            ) : (
              recentShots?.map((shot) => (
                <ShotListItem key={shot.id} shot={shot} />
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Best Rated
            </h2>
          </div>
          <div className="grid gap-3">
            {isLoadingBest ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : bestShots?.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No rated shots yet.</p>
            ) : (
              bestShots?.map((shot) => (
                <ShotListItem key={shot.id} shot={shot} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading }: { title: string, value: string | number | undefined | null, icon: any, isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value ?? "—"}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ShotListItem({ shot }: { shot: any }) {
  return (
    <Link href={`/shots/${shot.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer border border-border/50 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-medium text-sm flex items-center gap-2">
              {shot.bean || "Unknown Bean"}
              {shot.rating && (
                <span className="flex items-center text-xs text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded-md">
                  <Star className="h-3 w-3 mr-1 fill-current" /> {shot.rating}/10
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {shot.dose}g in → {shot.yield}g out • {shot.pourTime}s
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right space-y-1">
            <div>{format(new Date(shot.shotDate), "MMM d")}</div>
            <div className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] inline-block">
              {shot.status || "Unspecified"}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
