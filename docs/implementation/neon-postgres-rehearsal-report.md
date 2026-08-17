# Neon Postgres Rehearsal Report

> **Status:** Completed with bootstrap follow-up verified
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

Bootstrap follow-up:

The empty-database bootstrap path has now been added and rehearsed against the disposable Neon database. The current schema can be created from empty Postgres, the bootstrap can be re-run safely in the tested scenario, and the Phase 1 legacy-upgrade migration remains compatible when run afterward.

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

Added reusable bootstrap rehearsal script:

```text
scripts/neon-bootstrap-rehearsal.mjs
```

The script:

- reads `.env`,
- refuses unknown public tables,
- refuses non-empty known Coffee Log databases unless `--reset-disposable` is supplied,
- resets only known Coffee Log tables when explicitly requested,
- applies the empty-database bootstrap migration,
- re-runs the bootstrap migration,
- runs the Phase 1 migration afterward to verify compatibility,
- verifies required app tables, indexes, and core Shot columns.

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
| Empty-database bootstrap | Passed | Bootstrap migration created current app schema from empty disposable Neon |
| Bootstrap repeat safety | Passed | Re-running bootstrap completed |
| Phase 1 compatibility after bootstrap | Passed | Phase 1 migration completed after bootstrap |
| Non-empty database safety refusal | Passed | Bootstrap script stopped without `--reset-disposable` |
| API runtime contract against Neon | Not completed | Pending after bootstrap verification |
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

## Empty-Database Bootstrap Evidence

Added bootstrap migration:

```text
lib/db/migrations/0000_bootstrap_current_schema.sql
```

Added bootstrap rollback:

```text
lib/db/migrations/0000_bootstrap_current_schema.down.sql
```

Bootstrap rehearsal command:

```text
node scripts/neon-bootstrap-rehearsal.mjs --reset-disposable
```

Verified result:

| Check | Result |
| --- | --- |
| Disposable reset of known Coffee Log tables | Passed |
| Bootstrap migration from empty database | Passed |
| Bootstrap repeat | Passed |
| Phase 1 migration after bootstrap | Passed |
| Non-empty database safety refusal | Passed |
| Required table count | 12 |
| Missing required tables | 0 |
| Missing required indexes | 0 |
| Local shot `include_in_analysis` default | `true` |

Verified required tables:

- `accessories`
- `airtable_sync_evidence`
- `bags`
- `beans`
- `grinders`
- `hopper_range_baselines`
- `hoppers`
- `machines`
- `settings`
- `shot_taste_selectors`
- `shots`
- `taste_selectors`

Verified required indexes:

- `airtable_sync_evidence_record_hash_unique`
- `one_active_hopper_per_bag`
- `shots_analysis_bag_date_idx`
- `shots_analysis_reference_bag_idx`
- `shots_import_fingerprint_unique`

Verified core Shot columns:

- `bean_achievement`
- `expression_style`
- `fault_status`
- `flow_time`
- `include_in_analysis`
- `intelligence_lesson_type`
- `raw_row`
- `shot_classification`
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

## Resolved Finding: Empty-Database Bootstrap Gap

Original finding:

The Phase 1 durable SQL migration under `lib/db/migrations/0001_phase1_data_foundation.sql` is an upgrade migration. It expects legacy tables and columns to exist, including:

- `shots`
- `bags`
- `shots.scale_time`

Resolution:

The repository now includes `0000_bootstrap_current_schema.sql`, which creates the current app schema from an empty database. Phase 1 remains as the legacy-upgrade migration and has been verified as compatible after bootstrap.

## API Runtime Check Status

API runtime contract against Neon was not completed.

Reasons:

- API runtime checks were deferred until after bootstrap verification.
- Local execution of some TypeScript runtime tests has a known macOS optional-binary limitation in this workspace, while GitHub Actions Linux CI remains green.

Next required step:

- run API smoke checks against the fully bootstrapped disposable Neon target.

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

1. API runtime checks against Neon are not complete.
2. Backup/restore rehearsal is not complete.
3. Full local CSV import into Neon is not complete.

Still deferred:

- Airtable metadata verification.
- Airtable live sync dry run.
- Public user authentication/authorization.
- Intelligence engines.

## Recommendation

Do not begin Phase 2 intelligence work yet.

Next best technical step:

1. Run API/runtime smoke tests against the fully bootstrapped Neon schema.
2. Import current full CSV exports into Neon.
3. Run backup/restore rehearsal.

Only after those pass should the project proceed toward Render deployment smoke testing.
