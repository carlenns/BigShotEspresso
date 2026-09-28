# ADR-0010: Prisma Postgres as the Operational Database (supersedes the Neon part of ADR-0006)

- Date: 2026-09-28
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Direction stated by Carl (2026-09-27/28: move data hosting from Neon to Prisma Postgres before going live); cutover itself pending Carl's go

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
   Neon is kept, read-only in practice, as the rollback target until Carl retires it.
4. **Plan: Free** (Carl, 2026-09-28). Free has no provider backups, so the owner runs
   `node scripts/prisma-postgres-migration.mjs backup` weekly and before risky changes.
   Revisit Starter ($10, daily backups kept 7 days) once real subscribers log shots or usage nears 200k operations a month.
5. Operation efficiency is enforced by the query-budget tests (Phase 2A S6) and checked in the
   Prisma console after the first week.

## Consequences

- Measured load: about 40 statements per logged shot including page loads
  (`query-budget.route.test.ts`). At 10 shots a day that is about 12k operations a month, far
  under the Free allowance. Grafana or ad-hoc SQL add to this and should use a read-only role.
- Render's region is Oregon (`render.yaml`). Pick the Prisma region closest to it (a US West
  region if offered) to keep latency down.
- Rollback is a single Render environment change back to the Neon `DATABASE_URL`. Any shots
  logged on Prisma after cutover would need to be copied back first (the same script, with
  source and target swapped, into an emptied Neon branch).
- ADR-0006's Neon decision is superseded once the cutover is completed and recorded.

See [prisma-postgres-migration-runbook.md](../implementation/prisma-postgres-migration-runbook.md).
