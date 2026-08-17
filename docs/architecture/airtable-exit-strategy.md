# Airtable Exit Strategy

> **Status:** Proposed architecture strategy  
> **Date:** 2026-08-17  
> **Authority:** Subordinate to the Project Constitution and accepted ADRs  
> **Purpose:** Move BigShotEspresso from Airtable-backed discovery toward a Postgres-first production product without losing research evidence.

## Executive summary

Airtable remains valuable during discovery because it exposes mistakes, missing fields, confusing workflows, selector drift, and research gaps quickly.

For launch and scale, BigShotEspresso should not depend on live Airtable reads or writes for normal user-facing behavior. PostgreSQL should become the application system of record, with Airtable retained only as a transitional research/admin/import source until equivalent app/admin tools exist.

Target architecture:

```text
Airtable / CSV exports
  → controlled import/sync
PostgreSQL
  → API
Coffee Log app
```

Launch architecture:

```text
PostgreSQL
  → API
Coffee Log app

Optional:
Airtable / CSV exports
  → admin-only import/sync/evidence workflows
```

## Why exit Airtable for production runtime

Airtable has been useful as a research workbench, but it creates risks if used as the live app database:

- API limits can block verification and production workflows.
- Cost and plan constraints may scale unpredictably.
- Formula, selector, and linked-record behavior is not controlled by the app repository.
- User-facing performance analytics need database-level query discipline.
- Production migrations, tests, backups, and deployment controls are stronger with PostgreSQL.
- Future hosting should remain portable across Replit, Neon, Supabase, Railway, Render, Fly, or another PostgreSQL-capable platform.

## Current role of Airtable

Airtable currently serves as:

- Source evidence for field names, relationships, selectors, formulas, and workflows.
- Research/admin interface for seeing errors, bugs, missing fields, and unclear concepts.
- Import/sync source for Coffee Log records.
- Historical evidence store for Project Notes and exported CSVs.
- Discovery surface for future intelligence engines.

Airtable is not merely an external database. It is the current research lens into the domain.

## Target role of PostgreSQL

PostgreSQL should serve as:

- Production system of record.
- Runtime query source for all normal app screens.
- Relationship and constraint authority.
- Migration target.
- Analytics foundation.
- Audit and provenance store.
- Intelligence-engine input store after approval.

The application should depend primarily on:

```text
DATABASE_URL
```

## Transitional role of Airtable sync/import

Airtable access should become:

- Explicit.
- Admin-only.
- Observable.
- Re-runnable.
- Verifiable.
- Non-blocking for normal app usage.

Airtable sync/import should not silently redefine local records or app behavior. It should preserve evidence and report mismatches.

## Offline CSV verification path

When Airtable API access is unavailable because of rate limits, plan limits, credential gaps, or service issues, table CSV exports are an approved verification fallback.

CSV exports can be used to verify:

- Current field inventory.
- Table row counts.
- Selector values present in exported records.
- Relationship labels and unresolved links.
- Current source values for import fixtures.
- Hopper and baseline records.
- Project Notes and architecture evidence.

CSV exports cannot fully verify:

- Airtable field types.
- Formula definitions.
- Hidden fields.
- View filters.
- Field IDs.
- Linked-record cardinality rules where labels are ambiguous.
- Automation or interface behavior.

For complete verification, CSV review must eventually be paired with live Airtable metadata or another authoritative Airtable schema export.

## CSV export package for complete-base review

If live Airtable API verification is blocked, export every relevant table as CSV and place them outside committed source until reviewed for privacy/secrets.

Recommended export set:

- Shots
- Bags
- Beans
- Hopper
- Hopper Range Baselines
- Project Notes
- Shot Fault Rules
- Rating System
- Taste Selectors
- Grinders
- Machines
- Accessories
- Any launch economics or product-planning tables used as source evidence
- Any tables referenced by linked-record fields in the documented architecture

Recommended naming:

```text
YYYY-MM-DD_airtable-export/
  Shots.csv
  Bags.csv
  Beans.csv
  Hopper.csv
  Hopper-Range-Baselines.csv
  Project-Notes.csv
  ...
```

Recommended manifest:

```text
export_date
source_base_name
source_table_name
csv_file_name
row_count
column_count
sha256
notes
privacy_review_status
```

## Replacement requirements

Before Airtable can stop being required for normal development or launch, BigShotEspresso needs replacements for the visibility Airtable currently provides.

### Data inspection

The app/admin surface should show:

- Records by table.
- Missing required values.
- Raw import evidence.
- Relationship resolution status.
- Include in Analysis status.
- Reference Shot status.
- Hopper assignment status.
- Import/sync errors.
- Last import/sync evidence.

### Field governance

The app/admin surface should support:

- Approved selector inventories.
- Unknown selector detection.
- Field completeness reports.
- Typed-field coverage reports.
- Read-only vs editable field treatment.
- Raw-only evidence visibility.

### Workflow debugging

The app/admin surface should show:

- Shot entry validation issues.
- Dose correction evidence.
- Hopper state continuity.
- Active Bag state.
- Current Shot vs Reference eligibility.
- Excluded-shot reasons.
- Import row rejection or warning reasons.

### Research continuity

The system should preserve:

- Historical Airtable exports.
- Project Notes.
- Architecture decisions.
- Engine assumptions and unresolved formulas.
- Pre-launch data snapshots.

## Exit phases

### Phase A: Current stabilized foundation

Status: mostly complete.

- PostgreSQL schema exists.
- CSV imports are tested.
- CI is active.
- Airtable credentials are app-specific.
- Current repository baseline is certified.
- Live Airtable verification is blocked by account/API limits.

### Phase B: Offline evidence completion

Use complete-base CSV exports while Airtable API is unavailable.

Tasks:

- Export all relevant Airtable tables to CSV.
- Build an evidence manifest.
- Compare CSV fields against documented field inventory.
- Identify raw-only fields and unmapped tables.
- Update documentation without changing application logic.

### Phase C: Postgres authority hardening

Tasks:

- Rehearse migrations on production-equivalent PostgreSQL.
- Confirm import idempotency and evidence preservation.
- Add admin inspection views for import/sync status.
- Add field coverage and unresolved relationship reports.
- Ensure normal app screens do not require live Airtable.

### Phase D: Airtable parity

Tasks:

- Replace essential Airtable views with app/admin screens.
- Replace essential formulas with approved database/API calculations.
- Replace selector-management needs with governed app/admin workflows.
- Preserve historical exports and Project Notes as evidence.

### Phase E: Launch posture

Tasks:

- PostgreSQL is production system of record.
- Airtable is optional backoffice/research mirror or retired.
- Sync/import is admin-only and non-blocking.
- Backup/restore and migration runbooks exist.
- Deployment/runtime secrets are verified.

## Retirement checklist

Airtable is no longer required for production when:

- [ ] Every launch-required table has a PostgreSQL model or accepted exclusion.
- [ ] Every launch-required field is typed, calculated, or explicitly raw-only/deferred.
- [ ] Every launch-required selector has an approved source of truth.
- [ ] Every launch-required relationship is represented in PostgreSQL.
- [ ] Every launch-required Airtable formula is implemented, imported read-only, or explicitly retired.
- [ ] Every launch-required view has an app/admin equivalent.
- [ ] Import/sync can run without changing normal app behavior unpredictably.
- [ ] Admin/debug visibility exists for missing fields, invalid records, and relationship errors.
- [ ] Production-equivalent migration rehearsal passes.
- [ ] Backups and restore procedure are documented.
- [ ] Airtable API limits no longer block normal user-facing behavior.

## Current blockers

- Live Airtable metadata verification is blocked by free-account/API limits.
- Production-equivalent PostgreSQL rehearsal is pending.
- Stale `replit.md` cleanup is in progress.
- ADRs are proposed but not yet accepted.
- Evidence manifest/checksum policy is not yet implemented.

## Non-goals

This strategy does not authorize:

- Implementing DCI, OSI, HMI, BLI, MSI, or GSP.
- Removing Airtable immediately.
- Deleting historical Airtable evidence.
- Inventing missing formulas, selectors, thresholds, or relationships.
- Launching without production PostgreSQL rehearsal.

## Related documentation

- [ADR-0001: Postgres System of Record and Airtable Transition](../ADR/ADR-0001-postgres-system-of-record-and-airtable-transition.md)
- [ADR-0002: Migration Authority](../ADR/ADR-0002-migration-authority.md)
- [ADR-0005: CSV Fixtures and Evidence Policy](../ADR/ADR-0005-csv-fixtures-and-evidence-policy.md)
- [Repository Certification Audit](../REPOSITORY_CERTIFICATION_AUDIT.md)
- [CSV Data Dictionary](../csv-data-dictionary.md)
- [Table Relationships](../table-relationships.md)
