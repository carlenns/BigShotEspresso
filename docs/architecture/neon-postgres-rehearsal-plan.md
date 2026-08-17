# Neon Postgres Rehearsal Plan

> **Status:** Draft implementation rehearsal plan  
> **Created:** 2026-08-17  
> **Target provider:** Neon Postgres  
> **Boundary:** Planning only. This document does not create a Neon project, run migrations, change schemas, change APIs, or modify application code.

## Purpose

Coffee Log is moving toward PostgreSQL as the operational application database, with Airtable becoming a research/admin/import source rather than the production runtime dependency.

This plan defines how to rehearse the current data foundation against a production-equivalent Postgres target using Neon.

## Why Neon

Neon is the selected first production-equivalent Postgres rehearsal target because:

- It is real Postgres, not an embedded test database.
- It is portable through a standard `DATABASE_URL`.
- It can be used by Replit later without making Replit the database authority.
- It supports disposable development/test databases or branches.
- It gives Coffee Log a cleaner path away from Airtable runtime dependence.

## Rehearsal Principles

1. Use a disposable Neon database or branch.
2. Do not use production data until migration behavior is proven.
3. Do not point the app at a valuable database until rollback and import behavior are verified.
4. Do not run live Airtable sync until Airtable metadata verification is complete.
5. Preserve raw import evidence and row counts.
6. Record every command, result, warning, blocker, and assumption.

## Required Inputs

Before the rehearsal starts, collect:

| Input | Source | Required now? |
| --- | --- | --- |
| Neon connection string | Neon dashboard | Yes, when executing rehearsal |
| Current migration SQL | `lib/db/migrations/0001_phase1_data_foundation.sql` | Yes |
| Rollback SQL | `lib/db/migrations/0001_phase1_data_foundation.down.sql` | Yes |
| Committed CSV fixtures | `artifacts/api-server/test-fixtures/csv/` | Yes |
| Fixture manifest | `artifacts/api-server/test-fixtures/csv/MANIFEST.md` | Yes |
| Full local CSV exports | `/Users/carlenns/Documents/Airtable Tables/Coffee Log/` | Optional/private |
| Airtable credentials | environment variables | No, blocked until metadata/sync rehearsal |

## Neon Setup Requirements

Create a disposable Neon target.

Recommended naming:

```text
Project: bigshotespresso
Branch/database: coffee-log-rehearsal-YYYYMMDD
Role/user: coffee_log_rehearsal
```

Environment variable name:

```text
DATABASE_URL
```

Security rules:

- Do not commit the Neon connection string.
- Do not paste the full connection string into logs, docs, or screenshots.
- If connection details are accidentally exposed, rotate the password before continuing.
- Store secrets only in an approved local environment, Replit secrets, or deployment secret store.

## Rehearsal Phases

### Phase 1 — Connectivity Smoke Test

Goal: confirm the Neon target is reachable and disposable.

Verify:

- Connection succeeds.
- Postgres version can be read.
- Current database name/branch is the expected rehearsal target.
- Required extensions are not assumed unless explicitly present.

Stop if:

- Connection points to an unexpected database.
- Connection string appears in output.
- Database already contains valuable data.

Evidence to record:

- Timestamp.
- Redacted target name.
- Success/failure.
- Any connection warnings.

### Phase 2 — Baseline Schema Inspection

Goal: confirm starting state.

Verify:

- Empty database, or known disposable existing objects.
- No existing Coffee Log tables unless this is an intentional repeat rehearsal.

Expected result for clean rehearsal:

- No Coffee Log application tables before migrations.

Stop if:

- Existing tables look like production or valuable data.

### Phase 3 — Forward Migration

Goal: apply current migration SQL successfully.

Migration under rehearsal:

```text
lib/db/migrations/0001_phase1_data_foundation.sql
```

Verify:

- Migration completes without error.
- Required tables exist:
  - `hoppers`
  - `hopper_range_baselines`
  - `airtable_sync_evidence`
  - `shots`
  - `bags`
  - `beans`
- Required new Shot columns exist, including:
  - `flow_time`
  - `include_in_analysis`
  - `hopper_id`
  - `hopper_range_baseline_id`
  - `bag_label`
  - multi-select array columns
  - raw/import evidence fields
- Required indexes exist:
  - `one_active_hopper_per_bag`
  - `shots_import_fingerprint_unique`
  - `shots_analysis_bag_date_idx`
  - `shots_analysis_reference_bag_idx`
- Required foreign keys exist.

Stop if:

- `scale_time`/`flow_time` migration fails.
- Multi-select array conversion fails.
- Foreign key creation fails.
- Index creation fails.

### Phase 4 — Repeat Migration Safety

Goal: verify migration is idempotent enough for safe re-run behavior where intended.

Verify:

- Re-running the forward migration does not corrupt data.
- `IF NOT EXISTS` paths behave as expected.
- Flow Time rename logic does not fail after first application.

Stop if:

- Repeat migration throws unexpected errors.
- Duplicate tables/indexes are created.
- Existing data is changed unexpectedly.

### Phase 5 — Rollback Rehearsal

Goal: verify rollback SQL executes and returns the database to the expected previous shape.

Rollback under rehearsal:

```text
lib/db/migrations/0001_phase1_data_foundation.down.sql
```

Verify:

- Added indexes are removed.
- Added columns are removed.
- Hopper, Hopper Range Baseline, and Airtable evidence tables are removed.
- `flow_time` can be renamed back to `scale_time` when appropriate.
- Rollback does not drop unrelated tables.

Stop if:

- Rollback fails.
- Rollback removes unrelated data.
- Rollback leaves incompatible partial state.

### Phase 6 — Forward Migration After Rollback

Goal: verify a clean rollback-forward cycle.

Verify:

- Forward migration succeeds after rollback.
- Resulting schema matches Phase 3.
- No drift or duplicate objects remain.

### Phase 7 — Fixture Import Rehearsal

Goal: verify committed fixtures can populate the migrated Neon database.

Use committed fixtures only first:

- `Shots-Shots Entering-7.csv`
- `Hopper-Grid view.csv`
- `Hopper Range Baselines-Hopper Range Baselines.csv`

Verify:

- Hopper fixture imports expected 12 rows.
- Hopper Range Baseline fixture imports expected 5 rows.
- Shot fixture parses expected 164 rows.
- Relationship resolution behavior matches test expectations.
- Multi-select values round-trip without ordering loss.
- `flow_time` receives `Flow Time (sec)` values.
- `include_in_analysis` values are preserved.
- Import fingerprints prevent duplicate inserts.

Do not use full local exports until fixture import is clean.

### Phase 8 — Full Export Rehearsal

Goal: verify current full offline exports against Neon, without committing them.

Use local/private exports:

```text
/Users/carlenns/Documents/Airtable Tables/Coffee Log/
```

Expected key counts:

- Shots: 235 rows.
- Hopper: 17 rows.
- Hopper Range Baselines: 5 rows.

Verify:

- Full exports parse.
- Row counts match offline audit.
- Newer Hopper 9-column shape is understood or documented as a blocker.
- Known 9 Shot field gaps remain raw/evidence or are documented.
- No import silently drops source fields.

Stop if:

- Full export contains fields not preserved in raw evidence.
- Parser rejects current full export unexpectedly.
- Relationship resolution cannot be reconciled without Airtable metadata.

### Phase 9 — API Runtime Contract Check

Goal: verify the app can use Neon through normal runtime contracts.

Verify:

- API starts with Neon `DATABASE_URL`.
- Health route works.
- Shot list route returns expected shape.
- Hopper and baseline routes return expected shape.
- `/shots` response matches OpenAPI expectation.
- Generated client types remain compatible.

Do not run this against production data.

### Phase 10 — Airtable Sync Rehearsal Later

Goal: verify Airtable sync only after metadata verification.

Prerequisite:

- [Airtable Metadata Verification Runbook](airtable-metadata-verification-runbook.md) completed.

When allowed:

- Use app-specific credentials:
  - `COFFEELOG_AIRTABLE_API_KEY`
  - `COFFEELOG_AIRTABLE_BASE_ID`
- Confirm target base is Coffee Log.
- Run connection test.
- Run metadata capture.
- Run dry sync into disposable Neon branch/database.
- Compare sync results to CSV evidence and fixture results.

Do not:

- Run live Airtable sync before metadata capture.
- Run sync into a valuable database.
- Use legacy/shared Airtable credentials if app-specific values are available.

## Evidence To Produce

Create a rehearsal report after execution:

```text
docs/implementation/neon-postgres-rehearsal-report.md
```

The report should include:

- Neon target name, redacted.
- Rehearsal date/time.
- Migration forward result.
- Repeat migration result.
- Rollback result.
- Rollback-forward result.
- Fixture import result.
- Full export rehearsal result, if run.
- API contract result, if run.
- Airtable sync result, if later run.
- Errors/warnings.
- Remaining blockers.
- Recommendation for deployment readiness.

## Success Criteria

The rehearsal passes only if:

- Forward migration succeeds.
- Repeat migration is safe.
- Rollback succeeds.
- Rollback-forward cycle succeeds.
- Committed fixture import succeeds.
- No secrets are printed or committed.
- No valuable database is modified.
- Any full-export mismatch is documented.
- Any Airtable sync is deferred until metadata verification.

## Current Expected Blockers

Known blockers before full production certification:

- Airtable metadata verification is still blocked by API/account limits.
- Live Airtable sync dry run is still blocked.
- Full export import may reveal Hopper shape drift: committed Hopper fixture has 8 columns, current full Hopper export has 9 columns.
- Known 9 Shot field gaps still require metadata/modeling decisions.

## Recommended Execution Order

When ready to execute:

1. Create disposable Neon target.
2. Run connectivity smoke test.
3. Run forward migration.
4. Run repeat migration safety check.
5. Run rollback.
6. Run forward migration again.
7. Run committed fixture import.
8. Optionally run full local export import rehearsal.
9. Run API runtime contract check.
10. Stop and write the rehearsal report.

Do not proceed to Phase 2 intelligence implementation from this rehearsal alone.
