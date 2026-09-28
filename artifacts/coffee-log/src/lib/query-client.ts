import { MutationCache, QueryClient } from "@tanstack/react-query";

// Phase 2A S6 — fewer database operations per visit.
//
// React Query's defaults (staleTime 0, refetch on every mount and window
// focus) re-fetched settings, bags, equipment and the dashboard every time a
// page mounted or the tab regained focus. On a per-operation-billed Postgres
// host each of those is billed. Reference data now stays fresh for 30 s and is
// not refetched on focus; every write already invalidates its own keys.
//
// The dashboard intelligence views are the exception: they are recalculated
// from many tables, so they stay always-fresh on mount (`LIVE_QUERY_OPTIONS`)
// and are also invalidated after ANY successful mutation, so a shot, bag,
// hopper, equipment or settings change can never leave them stale.
export const REFERENCE_STALE_TIME_MS = 30_000;

export const LIVE_QUERY_KEYS = [["dashboard-intelligence"], ["intelligence"]] as const;

export const LIVE_QUERY_OPTIONS = { staleTime: 0, refetchOnWindowFocus: true } as const;

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: REFERENCE_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
    mutationCache: new MutationCache({
      onSuccess: () => {
        for (const queryKey of LIVE_QUERY_KEYS) void client.invalidateQueries({ queryKey: [...queryKey] });
      },
    }),
  });
  return client;
}
