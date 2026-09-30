# ADR-0010: Prisma Postgres as the Operational Database (supersedes the Neon part of ADR-0006)

- Date: 2026-09-28
- Status: **Accepted** (cutover completed 2026-09-28)
- Decision owner: Carl Enns
- Approval: Direction stated by Carl (2026-09-27/28: move data hosting from Neon to Prisma Postgres before going live); cutover executed and verified 2026-09-28

## Context

Neon has been the operational Postgres since the owner-alpha RC (ADR-0006). Carl's cost
analysis favours Prisma Postgres, and he intends to consolidate BSE, the IATSE app and
Clickonomics there. The move is **hosting only**: the app keeps Drizzle ORM and node-postgres.
Prisma Postgres is standard Postgres reachable over TCP, and Prisma documents Drizzle + `pg`
as a supported client.

Prisma Postgres pricing (checked 2026-09-28 on prisma.io/pricing; re-check before cutover):

| Plan | Price | Included operations | Extra | Storage | Backups | Connections (pooled / direct) |
|---|---|---|---|---|---|---|
| Free | $0 | 200k / month | — | 500 MB | none | 10 / 10 |
| Starter | $10 / month | 1M | $8 per extra million | 10 GB | daily, 7 days | 100 / 10 |

- An operation is any single query (read or write, simple or complex), and cached reads count.
  Every SQL statement the app, psql, Grafana or a script sends counts.
- The pricing page lists operation duration and response size as unlimited. Pooled
  connections time out queries at 10 minutes; direct connections have no timeout. This
  replaces the 10 s / 5 MB limits noted in earlier planning.

## Decision

1. Move the operational database from Neon to Prisma Postgres. PostgreSQL remains the
   operational authority (ADR-0001); only the host changes.
2. The app connects with the **pooled** URL (`pooled.db.prisma.io`) and `DATABASE_POOL_MAX=5`.
   Migrations, `pg_dump`/`pg_restore` and admin tools use the **direct** URL (`db.prisma.io`).
3. Data moves with `scripts/prisma-postgres-migration.mjs` (`pg_dump` of Neon → `pg_restore`
   into an empty Prisma database, then a row-count + content-digest + sequence check).
   Neon was kept, read-only in practice, as the rollback target until Carl retired it (done 2026-09-29, see the addendum below).
4. **Plan: Free** (Carl, 2026-09-28). Free has no provider backups, so the owner runs
   `node scripts/prisma-postgres-migration.mjs backup` weekly and before risky changes.
   Revisit Starter ($10, daily backups kept 7 days) once real subscribers log shots or usage nears 200k operations a month.
5. Operation efficiency is enforced by the query-budget tests (Phase 2A S6) and checked in the
   Prisma console after the first week.

## Evidence

- Cutover record below: `check`, `copy --confirm-empty-target` and `verify` all clean (12/12 tables,
  279 shots at cutover), post-switch smoke test on `bigshotespresso.onrender.com`.
- Measured load of about 40 statements per logged shot (`query-budget.route.test.ts`), against the
  Free plan's 200k operations a month.
- Prisma pricing as checked 2026-09-28 (table in Context).
- Carl's cost analysis and his intent to consolidate BSE, the IATSE app and Clickonomics on
  Prisma Postgres (recorded in Context).
- Restore-from-backup rehearsed on real Prisma Postgres 2026-09-29 (`docs/completed-tasks.md`).

## Alternatives considered

- **Stay on Neon** (ADR-0006): rejected on Carl's cost analysis and the consolidation goal above.
  Neon was kept only as a short-term rollback target, then deleted (see the addendum).
- **Prisma Postgres Starter plan ($10 a month, daily backups kept 7 days)**: deferred, not
  rejected. Free was chosen; revisit once real subscribers log shots or usage nears 200k
  operations a month (Decision item 4).
- **Other Postgres hosts** (including those weighed in ADR-0006: Supabase, Railway, Render
  Postgres): Carl evaluated multiple hosts and chose Prisma Postgres (stated 2026-09-30). The
  per-host comparison itself is not recorded here.

## Consequences

- Measured load: about 40 statements per logged shot including page loads
  (`query-budget.route.test.ts`). At 10 shots a day that is about 12k operations a month, far
  under the Free allowance. Grafana or ad-hoc SQL add to this and should use a read-only role.
- `render.yaml` said the Render region was Oregon, but the live service (checked via the Render
  API, 2026-09-28) actually runs in **Ohio**; `render.yaml` has been corrected to `region: ohio`.
  Prisma has no Ohio/us-east-2 region, so `us-east-1` (N. Virginia) — the region already used —
  remains the closest available option regardless; this does not change the decision.
- Rollback is a single Render environment change back to the Neon `DATABASE_URL`. Any shots
  logged on Prisma after cutover would need to be copied back first (the same script, with
  source and target swapped, into an emptied Neon branch).
- ADR-0006's Neon decision is superseded now that the cutover is completed and recorded.

## Cutover record — 2026-09-28

- Target: Prisma project `BSE` (`db_jrpn92jbuyw48gkdgvr5zpbl`, us-east-1, Postgres 17.2).
- `check`: only the expected "target Postgres 17 is older than source 18" warning.
- `copy --confirm-empty-target`: `"verified": true`, all 12 tables matched exactly (279 shots),
  no mismatches, no sequence issues.
- Render `DATABASE_URL` switched to the Prisma **pooled** string; `DATABASE_POOL_MAX=5` added.
  Deploy `dep-dat8s7nlk1mc73eo3di0` went live 2026-09-28 15:57 UTC.
- Post-switch smoke (`bigshotespresso.onrender.com`): `/api/healthz` ok, Dashboard rendered the
  active bag/defaults/shots correctly, a test shot was logged and deleted cleanly.
- `verify` after the switch: 11 of 12 tables matched exactly; `settings` showed equal row counts
  (42/42) but the digest differed. Row-by-row comparison found every key/value identical between
  Neon and Prisma — the only difference was `updated_at`, bulk-touched on Prisma at boot by the
  idempotent runtime schema guard. Not data loss.
- First backup taken: `~/BSE-backups/bse-2026-09-28.dump` (12 tables, 183,808 bytes).
- Neon (`small-tree-07649498`) is untouched and stays as the rollback target for two weeks per
  the runbook.

See [prisma-postgres-migration-runbook.md](../implementation/prisma-postgres-migration-runbook.md).

## Addendum — Neon retired, 2026-09-29

Carl retired Neon on 2026-09-29, earlier than the two-week rollback window above, because Neon
will not be used again. Consequences: Prisma Postgres is the only live database and there is no
Neon rollback target. Recovery is restore-from-backup (`prisma-postgres-migration.mjs backup`,
weekly and before risky changes), so the Free plan's lack of provider backups is now the main
risk; the Starter-plan revisit in Decision item 4 stands. The "Rollback" consequence above is
historical. The Neon project (`small-tree-07649498`, about 35 MB, one `production` branch) was
**deleted** the same day at Carl's instruction, after confirming Render pointed only at Prisma;
the Neon console refused to delete the default branch alone, so the whole project was removed.
It cannot be recovered.

## Related Project Notes

- Owner-Alpha RC report and the Phase 2A operation-efficiency work (query-budget tests).

## Related documentation

- [Prisma Postgres Migration Runbook](../implementation/prisma-postgres-migration-runbook.md)
- [ADR-0001: Postgres System of Record](ADR-0001-postgres-system-of-record-and-airtable-transition.md)
- [ADR-0006: Neon Postgres Rehearsal and Release Database](ADR-0006-neon-postgres-rehearsal-and-release-database.md)
- [Pre-Phase-2 Readiness Gates](../implementation/pre-phase-2-readiness-gates.md), Gate 7

## Related code changes

- `scripts/prisma-postgres-migration.mjs` (check, copy, verify, backup)
- `render.yaml` (region corrected to `ohio`)
- `artifacts/api-server/src/query-budget.route.test.ts`

## Supersedes / Superseded by

- Supersedes: the Neon-as-operational-database part of [ADR-0006](ADR-0006-neon-postgres-rehearsal-and-release-database.md). Partially amends [ADR-0007](ADR-0007-render-first-hosting-and-domain.md) and [ADR-0008](ADR-0008-owner-only-first-release-access.md), which name Neon as the database.
- Superseded by: none
