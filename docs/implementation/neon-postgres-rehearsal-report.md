# Neon Postgres Rehearsal Report

> **Status:** Completed with bootstrap and API runtime follow-up verified
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

API runtime follow-up:

The built API now starts locally against the disposable Neon database. Read-only smoke checks passed for health, Shots, Hopper, and Hopper Range Baseline routes.

Full CSV import follow-up:

The current local Airtable CSV export package imported successfully into the disposable Neon database through the existing API CSV import endpoints after seeding Beans and Bags from the matching CSV exports.

Shot workflow follow-up:

The built API successfully created, read, patched, and deleted a disposable test Shot against Neon. The smoke test verified locally-created shots default `include_in_analysis` to `true`, canonical `flowTime` is returned, and legacy `scaleTime` patch input still updates `flowTime`.

Backup/restore follow-up:

PostgreSQL client tools were installed locally through Homebrew `libpq`. A disposable Neon backup/restore rehearsal passed using a temporary custom-format dump outside the repository. The temporary dump was removed after verification.

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
| API runtime contract against Neon | Passed | Built API started against Neon and returned successful read-only route responses |
| Full local CSV import into Neon | Passed | 235 Shots, 17 Hoppers, and 5 Hopper Range Baselines imported from current local exports |
| Shot create/edit/delete against Neon | Passed | Disposable test Shot created, read, patched, verified, and deleted |
| Backup/restore execution | Passed | Custom-format dump restored into disposable Neon and counts/API smoke matched |
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

Final counts after bootstrap rehearsal:

| Table | Count |
| --- | ---: |
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

Full export import into Neon was run after migration, fixture, bootstrap, and API runtime rehearsal completed.

## Full CSV Import Rehearsal Evidence

Added reusable full-export rehearsal script:

```text
scripts/neon-full-csv-import-rehearsal.mjs
```

The script:

- reads `DATABASE_URL` from local `.env`,
- requires `--reset-disposable`,
- refuses unknown public tables,
- resets only known Coffee Log tables,
- applies the empty-database bootstrap and Phase 1 compatibility migration,
- seeds Beans and Bags from local CSV exports so Shot relationships are not guessed,
- starts the built API locally with a temporary rehearsal admin token,
- imports Hopper, Hopper Range Baseline, and Shot CSV exports through the existing protected API import endpoints,
- reports counts without printing secrets.

Rehearsal command:

```text
node scripts/neon-full-csv-import-rehearsal.mjs --reset-disposable
```

Verified result:

| Check | Result |
| --- | --- |
| Beans seeded from CSV | 6 |
| Bags seeded from CSV | 6 |
| Hopper import | 17 imported, 0 skipped, 0 errors |
| Hopper export columns | 9 |
| Hopper Range Baseline import | 5 imported, 0 skipped, 0 errors |
| Hopper Range Baseline export columns | 7 |
| Shot import | 235 imported, 0 skipped, 0 errors |
| Shot export columns | 93 |
| Analytical shots after import | 190 |
| Reference shots after import | 61 |

Limits:

- Beans and Bags were seeded only to support relationship resolution for the full Shot import rehearsal.
- Airtable hidden fields, formulas, and metadata were not verified.
- Airtable live sync was not run.

## Resolved Finding: Empty-Database Bootstrap Gap

Original finding:

The Phase 1 durable SQL migration under `lib/db/migrations/0001_phase1_data_foundation.sql` is an upgrade migration. It expects legacy tables and columns to exist, including:

- `shots`
- `bags`
- `shots.scale_time`

Resolution:

The repository now includes `0000_bootstrap_current_schema.sql`, which creates the current app schema from an empty database. Phase 1 remains as the legacy-upgrade migration and has been verified as compatible after bootstrap.

## API Runtime Check Status

API runtime contract against Neon passed for a read-only smoke test.

Build verification:

- API production build passed.
- Frontend production build passed.
- Database package typecheck passed.
- API package typecheck passed.
- Frontend package typecheck passed.
- macOS arm64 `esbuild` package loaded successfully after dependency policy adjustment.

Runtime verification:

- Built API started with `NODE_ENV=production` against the disposable Neon `DATABASE_URL`.
- `GET /api/healthz` returned `200`.
- `GET /api/shots` returned `200` and the expected `{ shots, total }` response shape.
- `GET /api/hoppers` returned `200`.
- `GET /api/hopper-range-baselines` returned `200`.

Additional write-path smoke test:

| Check | Result |
| --- | --- |
| `POST /api/shots` | `201` |
| Created Shot read-back | `200` |
| Locally-created `includeInAnalysis` default | `true` |
| Created `flowTime` | `29` |
| `PATCH /api/shots/:id` using legacy `scaleTime` alias | updated `flowTime` to `31` |
| Patched Shot read-back | `flowTime: 31` |
| `DELETE /api/shots/:id` cleanup | `204` |
| `GET /api/shots` response shape | `{ shots, total }` |

Limits:

- This write-path smoke test used one disposable test Shot and removed it afterward.
- It did not exercise the full UI form manually.

## Backup and Restore Status

Backup/restore execution passed against the disposable Neon target.

Local tools installed:

- `pg_dump`: PostgreSQL 18.6
- `psql`: PostgreSQL 18.6
- `pg_restore`: PostgreSQL 18.6

Added reusable backup/restore rehearsal script:

```text
scripts/neon-backup-restore-rehearsal.mjs
```

The script:

- reads `DATABASE_URL` from local `.env`,
- requires `--reset-disposable`,
- refuses unknown public tables,
- creates a temporary custom-format dump outside the repository,
- resets only known Coffee Log tables,
- restores the dump into the disposable database,
- compares key table counts before and after restore,
- smoke-tests the built API after restore,
- removes the temporary dump.

Rehearsal command:

```text
node scripts/neon-backup-restore-rehearsal.mjs --reset-disposable
```

Verified result:

| Check | Result |
| --- | --- |
| Backup created | Passed |
| Temporary dump size | 161,847 bytes |
| Dump stored in repository | No |
| Dump removed after rehearsal | Yes |
| Counts match after restore | Yes |
| API health after restore | `200` |
| Shot list after restore | `200` |
| Hopper list after restore | `200` |

Restored counts:

| Table/count | Before | After |
| --- | ---: | ---: |
| Beans | 6 | 6 |
| Bags | 6 | 6 |
| Hoppers | 17 | 17 |
| Hopper Range Baselines | 5 | 5 |
| Shots | 235 | 235 |
| Analysis shots | 190 | 190 |
| Reference shots | 61 | 61 |

## SSL Warning

The local Postgres client emitted a warning about future `pg` handling of `sslmode=require`.

Current connection worked, but before production release the project should decide whether to:

- keep the Neon-provided `sslmode=require` connection string, or
- use a connection string form recommended by current `pg`/Neon documentation.

Do not change this casually without verifying Neon and Render behavior.

## Remaining Blockers

Critical before deployment certification:

No remaining Neon data-foundation rehearsal blockers are known.

Still deferred:

- Airtable metadata verification.
- Airtable live sync dry run.
- Public user authentication/authorization.
- Intelligence engines.

## Recommendation

Do not begin Phase 2 intelligence work yet.

Next best technical step:

1. Prepare Render deployment smoke testing.
2. Complete owner-only deployed smoke test.
3. Complete manual UI shot-entry smoke test.

Only after those pass should the project proceed toward Render deployment smoke testing.
