# Architecture Documentation

This directory is the canonical architecture index. Existing architecture documents remain at the `docs/` root for backward-compatible links and historical continuity.

## Current architecture set

| Document | Purpose |
|---|---|
| [CSV Data Dictionary](../csv-data-dictionary.md) | Field-level source inventory and intelligence dependencies |
| [Field Type Map](../field-type-map.md) | Storage, access, editability, and UI treatment |
| [Table Relationships](../table-relationships.md) | Confirmed relationships and Hopper state workflow |
| [Intelligence Engine Map](../intelligence-engine-map.md) | Engine boundaries, inputs, outputs, and dependencies |
| [Replit Audit Report](../replit-audit-report.md) | Historical pre-Phase-1 implementation audit |
| [Airtable Exit Strategy](airtable-exit-strategy.md) | Transition plan from Airtable-backed discovery to Postgres-first production |
| [Offline Airtable Export Audit](offline-airtable-export-audit.md) | CSV export inventory, checksums, row counts, and offline verification limits |
| [Offline-First Airtable Reset Plan](offline-first-airtable-reset-plan.md) | Offline work plan and 1,000-call Airtable reset strategy |
| [CSV-to-Postgres Coverage Report](csv-to-postgres-coverage-report.md) | Offline field coverage review and metadata questions before migration |

## Architecture source-of-truth rules

- CSV exports outrank older architecture descriptions for current field evidence.
- Airtable metadata/formulas are required when exports omit type or calculation detail.
- Approved ADRs govern deliberate architectural changes.
- Code does not silently redefine architecture.

## Known architecture gaps

- No numbered ADRs have yet been adopted.
- Hopper event/state transition rules are not fully recovered from Airtable.
- Project Notes, Fault Rules, and Rating System are not fully modeled in the application.
- Live Airtable and production PostgreSQL certification remain pending.
- Airtable exit depends on admin/debug screens that do not yet exist.
