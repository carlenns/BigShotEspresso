# Neon Postgres Rehearsal Report

> **Status:** Completed with follow-up blockers  
> **Date:** 2026-08-17  
> **Target:** Disposable Neon Postgres database  
> **Scope:** Phase 1/1.5 data-foundation rehearsal only  
> **Boundary:** No Airtable live sync. No intelligence engines. No production deployment.

## Executive Summary

The disposable Neon database connection succeeded and the Phase 1 migration rehearsal passed against a known legacy baseline.

Verified:

- Neon connection works.
- Disposable database started empty.
- Phase 1 forward migration applied.
- Forward migration can be re-run safely in the tested legacy scenario.
- Rollback can be run twice.
- Rollback-forward cycle succeeds.
- `scale_time` migrates to canonical `flow_time`.
- Multi-select legacy text columns convert to arrays.
- locally-created shots default `include_in_analysis` to `true`.
- Hopper fixture rows insert into Neon.
- Hopper Range Baseline fixture rows insert into Neon.

Important finding:

The current SQL migration is an upgrade migration, not a complete empty-database bootstrap migration. It expects legacy tables such as `shots` and `bags` to already exist. A clean production release still needs an authoritative bootstrap path from empty Postgres to the full current app schema.

## Target and Safety

Target summary:

- Provider: Neon Postgres
- Database name observed: `neondb`
- User observed: `neondb_owner`
- Public tables before rehearsal: `0`

Secret handling:

- `DATABASE_URL` was read from local `.env`.
- The connection string was not printed.
- No credential values were added to source, docs, logs, or generated output.

## Rehearsal Tooling

Added reusable local rehearsal script:

```text
scripts/neon-rehearsal.mjs
```

The script:

- reads `.env`,
- refuses to run if the target database already contains public tables,
- creates the known legacy baseline used by migration integration tests,
- runs forward migration twice,
- verifies migrated values,
- runs rollback twice,
- runs forward migration again,
- imports committed Hopper and Hopper Range Baseline fixtures,
- reports counts without printing secrets.

## Verification Results

| Phase | Result | Evidence |
| --- | --- | --- |
| Connectivity smoke test | Passed | Connected to Neon; public table count was `0` |
| Baseline schema inspection | Passed | Disposable target had no public tables |
| Legacy baseline creation | Passed | Created minimal `bags` and `shots` baseline used by migration test |
| Forward migration | Passed | Migration completed |
| Repeat forward migration | Passed | Re-running migration completed |
| Rollback | Passed | Rollback completed |
| Repeat rollback | Passed | Re-running rollback completed |
| Rollback-forward cycle | Passed | Forward migration succeeded after rollback |
| Include in Analysis default | Passed | Local inserted shot returned `include_in_analysis: true` |
| Hopper fixture import | Passed | 12 Hopper fixture rows parsed and inserted |
| Hopper Range Baseline fixture import | Passed | 5 baseline fixture rows parsed and inserted |
| Full local CSV count check | Passed | Offline export counts listed below |
| API runtime contract against Neon | Not completed | Blocked by incomplete empty-database bootstrap path |
| Backup/restore execution | Not completed | Local `pg_dump`, `psql`, and `pg_restore` were not installed |
| Airtable live sync | Not run | Deferred due Airtable API limits and metadata verification requirement |

## Migration Evidence

Observed migrated sample:

```json
{
  "flow_time": 27,
  "fault_status": ["Fault,Grinder Issue"],
  "shot_classification": ["Balanced,Caramel Rich"],
  "bean_achievement": ["Guest Worthy,Daily Driver"],
  "expression_style": ["Balanced Comfort"]
}
```

Observed rollback sample:

```json
{
  "scale_time": 27,
  "fault_status": "Fault,Grinder Issue",
  "shot_classification": "Balanced,Caramel Rich",
  "bean_achievement": "Guest Worthy,Daily Driver",
  "expression_style": "Balanced Comfort"
}
```

Final migrated tables after rehearsal:

- `airtable_sync_evidence`
- `bags`
- `hopper_range_baselines`
- `hoppers`
- `shots`

Final verified Shot columns:

- `bag_label`
- `flow_time`
- `hopper_id`
- `hopper_range_baseline_id`
- `import_fingerprint`
- `include_in_analysis`

Required index check:

- Expected Phase 1 indexes found: `4`

Final counts after fixture rehearsal:

| Table | Count |
| --- | ---: |
| `bags` | 1 |
| `shots` | 2 |
| `hoppers` | 12 |
| `hopper_range_baselines` | 5 |

## Offline CSV Export Counts

Local full-export count check from:

```text
/Users/carlenns/Documents/Airtable Tables/Coffee Log/
```

| Export | Rows | Columns |
| --- | ---: | ---: |
| `10-Point Rating System-Rating Systems.csv` | 39 | 3 |
| `BSE Launch Economics-Grid view.csv` | 100 | 17 |
| `Bags-Bags View.csv` | 6 | 59 |
| `Beans-Beans View.csv` | 6 | 30 |
| `Grinder Jam Events-Grid view.csv` | 5 | 14 |
| `Hopper Range Baselines-Hopper Range Baselines.csv` | 5 | 7 |
| `Hopper-Hopper View.csv` | 17 | 9 |
| `Project Notes-Project Notes View.csv` | 20 | 11 |
| `Shot Fault Rules-Shot Fault Rules.csv` | 12 | 3 |
| `Shots-Shots Entering.csv` | 235 | 93 |

Full export import into Neon was not run in this pass because the current Neon database was intentionally used for the migration/fixture rehearsal first. Full export import should run only after the bootstrap-schema decision below is resolved.

## Important Finding: Empty-Database Bootstrap Gap

The current durable SQL migration under:

```text
lib/db/migrations/0001_phase1_data_foundation.sql
```

is an upgrade migration. It expects legacy tables and columns to exist, including:

- `shots`
- `bags`
- `shots.scale_time`

That is correct for testing the Phase 1 data-foundation migration from a legacy app database.

However, a brand-new Neon database starts empty. Therefore, the project still needs one of these before release certification:

1. an authoritative bootstrap SQL migration that creates the full current schema from empty Postgres, then applies Phase 1 changes, or
2. an explicitly approved development-only schema push for disposable staging, followed by reviewed SQL migrations before production, or
3. a rebuilt migration chain where migration `0001` creates the complete current schema for new deployments.

Because ADR-0002 says reviewed SQL migrations are the durable schema authority, option 3 is likely the cleanest production path.

## API Runtime Check Status

API runtime contract against Neon was not completed.

Reasons:

- The current rehearsed Neon schema is the minimal migrated legacy baseline, not the full app schema.
- Full app routes expect additional tables such as `beans`, `accessories`, `grinders`, `machines`, `settings`, and `taste_selectors`.
- Local execution of some TypeScript runtime tests has a known macOS optional-binary limitation in this workspace, while GitHub Actions Linux CI remains green.

Next required step:

- create or approve the full empty-database bootstrap path, then rerun API smoke checks against a clean disposable Neon target.

## Backup and Restore Status

Backup/restore execution was not completed.

Local tools checked:

- `pg_dump`: not found
- `psql`: not found
- `pg_restore`: not found

Required follow-up:

- install PostgreSQL client tools locally, or
- use Neon dashboard/branching export and restore workflow, then
- run restore rehearsal against a disposable target.

## SSL Warning

The local Postgres client emitted a warning about future `pg` handling of `sslmode=require`.

Current connection worked, but before production release the project should decide whether to:

- keep the Neon-provided `sslmode=require` connection string, or
- use a connection string form recommended by current `pg`/Neon documentation.

Do not change this casually without verifying Neon and Render behavior.

## Remaining Blockers

Critical before deployment certification:

1. Empty-database bootstrap migration path is unresolved.
2. API runtime checks against Neon are not complete.
3. Backup/restore rehearsal is not complete.
4. Full local CSV import into Neon is not complete.

Still deferred:

- Airtable metadata verification.
- Airtable live sync dry run.
- Public user authentication/authorization.
- Intelligence engines.

## Recommendation

Do not begin Phase 2 intelligence work yet.

Next best technical step:

1. Create a reviewed empty-database bootstrap migration path.
2. Rerun Neon rehearsal from an empty disposable database.
3. Import current full CSV exports into the fully bootstrapped Neon schema.
4. Run API/runtime smoke tests against Neon.
5. Run backup/restore rehearsal.

Only after those pass should the project proceed toward Render deployment smoke testing.
