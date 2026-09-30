# Runbook: Neon → Prisma Postgres

Date: 2026-09-28 · Decision: [ADR-0010](../ADR/ADR-0010-prisma-postgres-operational-database.md) (Proposed)
Status: **Prepared and rehearsed locally; cutover not done.** Nothing in this runbook has
touched Neon, Prisma or Render yet.

Hosting move only: the app keeps Drizzle + node-postgres. The one app change is an optional
`DATABASE_POOL_MAX` setting (`lib/db/src/index.ts`).

## What was rehearsed (cloud session, 2026-09-28)

On two local PostgreSQL 16 databases standing in for Neon and Prisma:

1. Applied migrations 0000–0015 to the "Neon" database and seeded it through the real app
   (equipment, bean, active bag, hopper phase, 30 shots with non-ASCII notes, standard taste
   selectors, settings).
2. `check` printed versions, tables and per-table fingerprints.
3. `copy` without the flag stopped. `copy --confirm-empty-target` dumped, restored and verified:
   12 tables, every row count and content digest identical, no sequence problems.
4. A second `copy` refused ("target is not empty").
5. The built app, pointed at the "Prisma" copy, served the Dashboard with the right default
   machine/grinder and 30 shots. A new shot got id 31, so sequences carried over correctly.
6. `verify` then reported the drift (`shots` mismatch), and the source still had 30 shots, so
   the source was never written.
7. A pooled Prisma URL as the target was rejected.

**Not rehearsed:** a real Neon → real Prisma copy. The cloud session cannot open Postgres
connections, so that run happens from Carl's Mac (step 3 below).

## Target database (chosen 2026-09-28)

Carl chose the existing Prisma project **`BSE`** (the one he sees in the console and has
linked to the GitHub repo):

| | |
|---|---|
| Workspace | `BSE` |
| Project / database | `BSE` (`proj_la4nrwgx7ii4tyj4ekrbhpfa` / `db_jrpn92jbuyw48gkdgvr5zpbl`) |
| Region | `us-east-1` (N. Virginia). Round-trip latency from Render Oregon is about the same as today's Neon in us-east-2 |
| Postgres | 17.2, empty (0 tables, re-checked 2026-09-28) |

Connection strings are **not** written here. Get them in the Prisma console under project
`BSE` → Connect. Use the direct string for the copy and the pooled string for Render.

- The cloud session also created a second empty project, `bse-coffee-log` (us-west-1). It is
  unused; delete it in the console, or ask Claude to.
- Neon (`BigShotEspresso`, `small-tree-07649498`, aws-us-east-2) runs **Postgres 18**, and
  Prisma runs 17.2, so `check` will show a version warning. A read-only look at Neon on
  2026-09-28 found only plain tables: 12 tables, no generated columns, no named NOT NULL
  constraints, only the `plpgsql` extension, one schema. The restore should therefore work.
  It runs in a single transaction, so a failure leaves the target empty.
- Use `pg_dump` 18 on the Mac (`brew install libpq` gives the current version). `pg_dump` must
  be at least as new as Neon's server.
- Moving to us-west-1 also shortens the database round trip for the Oregon app, compared with
  Neon in us-east-2.

## Before you start

- Finish the Phase 2A post-deploy smoke test first, so any bug found is not confused with
  the database move.
- Pick a quiet time: **no shot logging** from step 4 until step 8.
- On the Mac: `brew install libpq` (gives `pg_dump` / `pg_restore`). `check` warns if they are
  older than the Neon server.
- Plan: **Free** (Carl, 2026-09-28). There are no provider backups, so use the weekly backup
  below. Starter ($10, daily backups kept 7 days) is the upgrade path.

## Steps

1. **Database:** already created (see "Target database" above). Copy its two connection
   strings from the Prisma console: **direct** (`db.prisma.io`) and **pooled**
   (`pooled.db.prisma.io`).
2. **Local `.env`** in the repo root (never commit it):

   ```
   SOURCE_DATABASE_URL=<Neon connection string, the non-pooled one>
   TARGET_DATABASE_URL=<Prisma DIRECT connection string>
   ```

3. **Check** (read-only on both):

   ```sh
   node scripts/prisma-postgres-migration.mjs check
   ```

   Expect Neon's tables with row counts, an empty Prisma target, and `"warnings": []`.
   Stop if a warning says the target Postgres is older than the source.
4. **Freeze**: stop logging shots. Optional extra safety: create a Neon branch named
   `pre-prisma-2026-xx-xx` in the Neon console.
5. **Copy**:

   ```sh
   node scripts/prisma-postgres-migration.mjs copy --confirm-empty-target
   ```

   It must end with `"verified": true`, no `mismatches` and no `sequenceIssues`. If it fails,
   nothing has changed for the app. Fix the cause, recreate an empty Prisma database, and retry.
6. **Point Render at Prisma**: in the Render dashboard → service `bigshotespresso-coffee-log`
   → Environment:
   - `DATABASE_URL` = Prisma **pooled** connection string
   - add `DATABASE_POOL_MAX` = `5`

   Save; Render redeploys. On boot the runtime schema guard runs; it is idempotent.
7. **Smoke** on `bigshotespresso.onrender.com`:
   - `/api/healthz` → ok
   - Dashboard shows the active bag, defaults and recent shots
   - log a test shot, check it in Shot Log, delete it
8. **Record**: run `verify` once more before logging real shots. It should still match,
   apart from any test shot you did not delete. Then un-freeze. Add a `completed-tasks.md`
   entry, set ADR-0010 to Accepted, and mark ADR-0006's Neon decision superseded.
9. ~~Keep Neon for two weeks as the rollback target~~ — superseded: Carl retired Neon on 2026-09-29 (see Rollback below).

## Rollback

**Neon was retired on 2026-09-29** (Carl's decision, day 1 of the planned two weeks) and the
project `small-tree-07649498` was **deleted** the same day. There is no
Neon rollback target any more, and Prisma Postgres is the only live database. Recovery now means
restoring from a backup dump:

- **Bad deploy, data fine:** redeploy the previous Render build; `DATABASE_URL` does not change.
- **Bad data or lost database:** create a new empty Prisma database, `pg_restore` the newest
  `~/BSE-backups/bse-*.dump` into it (command under "Backups on the Free plan"), run `verify`,
  then point Render's `DATABASE_URL` (pooled) at it. Anything logged after the last backup is lost.
- Take a backup before any risky change, and weekly otherwise. The Free plan has no provider backups.

Historical, superseded 2026-09-29 (Neon-based rollback, valid only during the cutover window):

- **Before step 6:** nothing to undo. The app still uses Neon.
- **After step 6, no new shots:** set Render `DATABASE_URL` back to the Neon string and remove
  `DATABASE_POOL_MAX`.
- **After new shots were logged on Prisma:** create an empty Neon branch, copy Prisma → Neon
  (same script, SOURCE/TARGET swapped), verify, then switch Render back.

## Backups on the Free plan

**Schedule and copies (2026-09-30):** a launchd job (`com.bigshotespresso.prisma-backup`) runs the
backup every Sunday at 9:00 AM, and only while the Mac is awake. `~/BSE-backups` is mirrored by
Google Drive for Desktop to Drive under `My Mac` > `BSE-backups`, so a lost Mac does not lose the
dumps. Carl confirmed the sync propagates deletions, so **never delete, prune or overwrite files
in that folder**; dumps are about 184 KB each, so there is no need to. After the first scheduled
Sunday run (2026-10-04), confirm the new dump appears in both places.

Free has no backups. From the repo on the Mac, weekly and before any risky change:

```sh
node scripts/prisma-postgres-migration.mjs backup
```

This writes `~/BSE-backups/bse-YYYY-MM-DD.dump` using `TARGET_DATABASE_URL` (the direct Prisma
string from `.env`). It only reads, costs about a dozen operations, and reports how many tables
are in the dump. Keep a few weeks of files and copy the folder somewhere off the Mac
(iCloud Drive, for example).

**Restore test** (do once): create a new empty Prisma database, then

```sh
pg_restore --no-owner --no-acl --exit-on-error --dbname "<new database DIRECT url>" ~/BSE-backups/<file>.dump
```

Rehearsed locally on 2026-09-28: the backup contained 12 tables and restored cleanly into an
empty database with all 31 shots.

**Restore test on real Prisma, 2026-09-29 (passed):** `~/BSE-backups/bse-2026-09-29.dump`
(184,415 bytes, 12 tables) was restored with the command above into a new empty Prisma Postgres
database (`bse-restore-test-2026-09-29`, us-east-1). `pg_restore --exit-on-error` exited 0 in
about 7 seconds. `verify` against production (production read-only) returned `verified: true`:
all 12 tables matched, 280 shots, no mismatches, no sequence issues. The restore-test database is
the default database of its own project, so it could not be deleted through the API; Carl deleted
it in the Prisma console on 2026-09-30.

## Keeping operations low

- **App:** query budgets are pinned in `query-budget.route.test.ts`:
  - Dashboard 8 statements
  - shot create 3, shot edit 2
  - settings save 1
  - about 40 for a whole log-a-shot visit

  React Query caches reference data for 30 s.
- **Remaining app candidates:**
  - merge the four small Dashboard reads (settings / grinders / machines / accessories)
  - drop the Log Shot client-side `PATCH /bags/:id` grind carry-forward; the server already
    does this for the active bag
  - fold `POST /shots`'s bag lookup into the insert
- **Dev and tests:** never point local dev or scripts at production. Tests run on in-memory
  PGlite and cost nothing.
- **Analysis (Grafana or psql):**
  - use a read-only role
  - turn auto-refresh off
  - reuse one base query per dashboard
  - put several stats in one query
  - use a short default time range and take snapshots for R&D records
  - Postgres views for shared metrics (best shot, Quick Look score, windows, Ref Shot %) are a
    later step
- **Monitor:** check operations in the Prisma console after the first week. Starting on Free;
  move to Starter if usage nears 200k operations a month or when subscribers start logging.
