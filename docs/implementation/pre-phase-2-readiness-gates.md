# Pre-Phase-2 Readiness Gates

> **Status:** Draft gate checklist  
> **Created:** 2026-08-17  
> **Purpose:** Identify what must be true before Coffee Log moves from data foundation into application/intelligence implementation  
> **Boundary:** Documentation only. This does not authorize Phase 2 or intelligence-engine implementation.

## Current Position

The project is in an offline-first stabilization window.

Airtable API access is currently constrained by account/API limits, but current CSV exports are available and documented. This allows migration planning, fixture policy, and target-model work to continue without live Airtable calls.

## Gate Summary

| Gate | Status | Can complete offline? | Notes |
| --- | --- | --- | --- |
| Repository documentation governance | Mostly complete | Yes | Constitution, ADR drafts, indexes, certification docs exist |
| Offline Airtable CSV evidence | Complete for visible exports | Yes | Corrected full Shots export has 235 records and 93 fields |
| CSV-to-Postgres coverage review | Complete draft | Yes | Known 9 Shot field gaps documented |
| Postgres target model | Complete draft | Yes | Requires approval before implementation |
| Airtable metadata verification | Blocked | No | Requires API reset or paid access |
| Fixture strategy decision | Needs approval | Mostly | Requires decision before changing fixtures/tests |
| Production-equivalent Postgres rehearsal | Not started | No, unless local/remote Postgres available | Needed before deployment certification |
| Live Airtable sync dry run | Blocked | No | Requires API calls and safe DB target |
| Phase 2 scope decision | Not ready | Partly | Depends on whether metadata blockers are waived |

## Gate 1 — Documentation Governance

Status: mostly complete.

Evidence:

- `docs/PROJECT_CONSTITUTION.md`
- `docs/START_HERE.md`
- `docs/ROADMAP.md`
- `docs/ADR/`
- `docs/architecture/`
- `docs/implementation/`
- `docs/testing/`
- `docs/REPOSITORY_CERTIFICATION_AUDIT.md`

Remaining decision:

- ADR drafts need explicit acceptance, revision, or rejection.

## Gate 2 — Offline CSV Evidence

Status: complete for visible exports.

Evidence:

- [Offline Airtable Export Audit](../architecture/offline-airtable-export-audit.md)

Current confirmed package:

- 10 CSV files.
- Corrected Shots export: 235 records, 93 columns.
- Table-level row counts and checksums recorded.

Limit:

- CSV cannot expose hidden fields, field types, formulas, view filters, or Airtable linked-record configuration.

## Gate 3 — CSV-to-Postgres Coverage

Status: complete draft.

Evidence:

- [CSV-to-Postgres Coverage Report](../architecture/csv-to-postgres-coverage-report.md)

Known Shot mapping review list:

- `Bag`
- `Rating ( Valid Only )`
- `Hopper Range Link`
- `Hopper Range Match`
- `Hopper Link`
- `Yield Window`
- `Ratio Window`
- `Initial Output vs Target Dose (g)`
- `Initial Output vs Hopper Baseline (g)`

Decision needed:

- Whether these fields are handled as typed storage, imported read-only evidence, relationships, or raw-only evidence.

## Gate 4 — Postgres Target Model

Status: complete draft.

Evidence:

- [Postgres Migration Target Model](../architecture/postgres-migration-target-model.md)

Main proposed model:

- Shots, Bags, Beans, Hoppers, and Hopper Range Baselines are production-critical.
- Grinder Jam Events and Shot Fault Rules are high-priority next reference/event models.
- Rating System is a medium-priority reference/documentation table.
- Project Notes are documentation/evidence first, runtime table optional.
- Launch Economics is product-planning evidence only.

Decision needed:

- Approve or revise the proposed table roles before schema work.

## Gate 5 — Airtable Metadata Verification

Status: blocked until API access resets.

Evidence/runbook:

- [Airtable Metadata Verification Runbook](../architecture/airtable-metadata-verification-runbook.md)

Required evidence:

- Field types.
- Field IDs.
- Formula definitions.
- Lookup/rollup sources.
- Linked-record cardinality.
- Selector and multi-select options.
- Hidden fields.
- View scope and filters.

Decision needed:

- Whether to wait for metadata before implementation, or explicitly waive metadata for a narrow offline-only implementation scope.

Recommended position:

- Do not waive metadata for relationship-heavy work.
- Relationship and formula questions should wait for reset-day verification.

## Gate 6 — Fixture Strategy

Status: needs decision before test fixture changes.

Evidence:

- [CSV Fixture Strategy](../testing/csv-fixture-strategy.md)

Known issue:

- Current committed Shot fixture has 164 records.
- Current corrected full Shot export has 235 records.
- Current committed Hopper fixture has 12 records and 8 columns.
- Current full Hopper export has 17 records and 9 columns.

Decision options:

1. Keep current fixtures unchanged.
2. Replace fixtures with full corrected exports.
3. Add full-export fixtures alongside smaller fixtures.
4. Create sanitized representative fixtures.

Recommended position:

- Add a fixture manifest before changing fixture files.
- Do not automatically commit full exports until privacy and repository-size policy is approved.

## Gate 7 — Production-Equivalent Postgres Rehearsal

Status: not started.

Why it matters:

- Local embedded tests are useful, but they do not prove production Postgres migration behavior.
- The future production path is likely Replit plus Postgres, Neon, Supabase, Railway, Render, Fly, or another PostgreSQL-backed deployment.

Required before deployment certification:

- Forward migration on a production-equivalent Postgres instance.
- Rollback rehearsal.
- Re-run migration safety.
- Data import rehearsal.
- Query/index sanity check.
- Backup/restore practice or documented alternative.

Can proceed now?

- Only if a safe local or remote Postgres target is available.

Decision needed:

- Choose initial production-equivalent Postgres target for rehearsal.

## Gate 8 — Live Airtable Sync Dry Run

Status: blocked until API access resets.

Required before full certification:

- Confirm environment variables point to Coffee Log.
- Confirm table names and field names.
- Run a read-only connection test.
- Run metadata capture first.
- Run dry sync into disposable Postgres/local database.
- Compare counts and mappings against CSV evidence.

Do not run:

- Bulk sync against a valuable database without backup/disposable target.
- Live sync before metadata verification.

## Gate 9 — Phase 2 Scope Decision

Status: not ready.

Phase 2 should not begin until one of these is true:

1. Airtable metadata verification is completed and target model decisions are approved.
2. The user explicitly approves a narrow implementation scope that avoids unresolved metadata areas.

Safe Phase 2 candidates after gates:

- UI/application completion around already typed, already verified fields.
- Admin/debug visibility for import evidence and unresolved relationships.
- Postgres-first data review screens.

Unsafe Phase 2 candidates before gates:

- Relationship-heavy Hopper state architecture.
- Local replacement of Airtable formulas.
- Any intelligence engine.
- Automatic selector vocabulary generation.
- Cross-bag reference analytics.

## Next Big Decision Point

The next big decision is fixture/evidence strategy plus metadata timing:

1. Should the repository keep small committed fixtures only, or add full corrected export fixtures?
2. Should implementation wait for Airtable metadata reset, or proceed with a narrow no-metadata scope?
3. Which Postgres target should be used for the first production-equivalent rehearsal?

Until those are decided, the safest remaining work is documentation, evidence indexing, and non-code planning.
