# Query Efficiency — Phase 2A S6 (2026-09-28)

Preparation for a possible move to a per-operation-billed Postgres host (Prisma Postgres is
the candidate; every SQL statement is one billed operation). **No database or host change
was made.** Neon remains the operational database.

## How it is measured

`@workspace/db` now has a test-only `pglite-test` export condition
(`lib/db/src/testing/pglite.ts`): in-memory PGlite, all forward migrations applied, and a
Drizzle-logger statement counter. `artifacts/api-server/src/query-budget.route.test.ts`
boots the real Express app against it, seeds a bag with shots, and pins a statement budget
per request. BEGIN/COMMIT are not counted.

## Server: statements per request

| Request | Before | After | Change |
|---|---:|---:|---|
| `GET /dashboard/intelligence` | 9 | 8 | Active-bag shots read once; eligible subset via `isEligibleShotRow` (in-memory twin of `eligibleShotConditions`) |
| `PATCH /shots/:id` (same bag) | 3 | 2 | Existing shot read joins the bag's `opened_date`; reused for Days Since Open when the bag is unchanged |
| `PUT /settings` (N keys) | N | 1 | One multi-row upsert (`ON CONFLICT … excluded.value`). The Settings page saves every key at once (~40 → 1) |
| `POST /shots` | 3 | 3 | Unchanged (bag lookup, insert, carry-forward update) |
| `GET /bags` | 4 | 4 | Unchanged |
| `GET /shots` | 2 | 2 | Unchanged (rows + count) |

The dashboard's same-bean / all-reference / grind-drift reads only run conditionally and are
unchanged.

## Client: fewer requests per visit

React Query previously ran with library defaults (`staleTime: 0`, refetch on every mount
**and every window focus**), so every page mount or tab switch re-requested settings, bags,
equipment, accessories, and the dashboard.

- Reference data: `staleTime` 30 s, no refetch on window focus (`lib/query-client.ts`).
- Dashboard intelligence (`["dashboard-intelligence"]`, `["intelligence"]`): still
  always-fresh on mount (`LIVE_QUERY_OPTIONS`), and invalidated after **any** successful
  mutation, so a shot, bag, hopper, equipment, or settings change can never leave them stale.
- Equipment page now uses the same `["equipment", "grinders" | "machines"]` keys as Log Shot
  and Settings (previously `["grinders"]` / `["machines"]`), so an edit there invalidates the
  copies other pages use.

Client-side savings depend on usage and are not measured here. Check the provider's
operation counter after the first real week, as planned.

## Not done here (candidates for the migration phase)

- Merging the four small dashboard reads (settings, grinders, machines, accessories).
- Folding `POST /shots`'s bag lookup into the insert.
- Postgres views for shared metrics (best shot, Quick Look score, windows, Ref Shot %).
- A read-only Grafana role and dashboard-refresh settings (owner analysis only).
