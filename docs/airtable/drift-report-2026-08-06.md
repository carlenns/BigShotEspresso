# Airtable Drift Report — 2026-08-06

## Scope and authority

This report compares the public BigShotEspresso repository with the live **Coffee Log** Airtable schema retrieved on 2026-08-06. Airtable remains authoritative for schema and formulas. The adjacent JSON snapshot contains metadata only; it contains no record values or credentials.

This is a documentation and compatibility refresh. It is **not** Phase 2 certification and does not certify deployment readiness.

## Live inventory

| Table | Fields | Formulas | Rollups | Lookups | Record links |
|---|---:|---:|---:|---:|---:|
| Beans | 46 | 9 | 25 | 0 | 1 |
| Bags | 72 | 15 | 25 | 0 | 2 |
| Shots | 116 | 53 | 0 | 17 | 3 |
| Hopper | 8 | 2 | 1 | 0 | 1 |
| Hopper Range Baselines | 8 | 0 | 1 | 0 | 1 |
| Shot Fault Rules | 3 | 0 | 0 | 0 | 0 |
| Project Notes | 11 | 0 | 0 | 0 | 0 |
| 10-Point Rating System | 3 | 0 | 0 | 0 | 0 |
| **Total** | **267** | **79** | **52** | **17** | **7** |

## Repository drift

The repository's earlier CSV documentation described a 93-column Shots export. The live Shots table now has 116 fields. Exact live field-name comparison against the sync source found the following names not referenced directly in code:

| Table | Live fields | Names not directly referenced | Interpretation |
|---|---:|---:|---|
| Beans | 46 | 34 | Mostly formulas, rollups, and calculated read-only evidence |
| Bags | 72 | 55 | Mostly formulas and rollups; several source-field aliases required correction |
| Shots | 116 | 22 | Mostly calculated or linked evidence retained in `rawRow` |
| Hopper | 8 | 0 | All live names referenced |
| Hopper Range Baselines | 8 | 1 | `Tracking Start Date` remains preserved as source evidence only |
| Shot Fault Rules | 3 | 1 | Supporting-table content is not a first-class operational model |
| Project Notes | 11 | 9 | Not represented as a first-class application table |
| 10-Point Rating System | 3 | 3 | Not represented as a first-class application table |

An unreferenced name is not automatically a sync defect. Formula, lookup, rollup, and other calculated fields are intentionally read-only. Shot sync preserves the complete Airtable field object in `rawRow`, so evidence outside the typed operational model is retained without being treated as application-owned data.

## Compatibility corrections in this refresh

- Bags now use the live `Active` checkbox when present, with the older `Status` interpretation retained as a fallback.
- Bags now map `Bag Purchased Date` to `purchaseDate`.
- Bag roast-date lookup now prefers `Roast Date Used`, followed by `Actual Roast Date`, `Estimated Roast Date`, and the legacy `Roast Date` alias.
- Bag notes now prefer the live `Bag Notes` field.
- Shot `baselineOutputDelta` now reads the live `Initial Output vs Hopper Baseline (g)` name while retaining the former `Baseline Output Delta (g)` alias.

## Explicit exclusions

- `Tracking Start Date` has no approved PostgreSQL destination column. It remains source evidence and does not justify an unreviewed migration.
- Project Notes, Shot Fault Rules, and the 10-Point Rating System are supporting Airtable tables, not yet approved as first-class application tables.
- Calculated Airtable fields are not written back by the application.
- No live record synchronization was run as part of this refresh because a deployment database and production sync credentials were not supplied to this repository task.

## Remaining certification blockers

- Run a dry live synchronization against an approved non-production or production-equivalent database.
- Reconcile record counts, linked-record cardinality, null handling, and rejected-row evidence.
- Rehearse migrations against an anonymized production-equivalent PostgreSQL snapshot.
- Establish CI or an approved equivalent release gate.
- Review and accept the migration-authority ADR and repository baseline.

## Regeneration procedure

1. Retrieve current Airtable metadata through an authorized Airtable connection.
2. Export schema only; exclude records and credentials.
3. Compare table IDs, field IDs, names, types, formulas, and relationship options with the prior snapshot.
4. Review source-field changes against sync aliases and the PostgreSQL model.
5. Add tests for every mapping change.
6. Replace the dated snapshot and update this report only after review.
