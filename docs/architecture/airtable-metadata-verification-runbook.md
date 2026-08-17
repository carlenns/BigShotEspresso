# Airtable Metadata Verification Runbook

> **Status:** Draft runbook  
> **Created:** 2026-08-17  
> **Purpose:** Use the next Airtable API reset efficiently by collecting architecture metadata instead of rereading data already available in CSV exports  
> **Boundary:** This runbook does not authorize bulk sync, production migration, schema changes, or intelligence-engine implementation.

## Why This Exists

The offline CSV exports provide visible table values, but they do not expose Airtable’s underlying architecture.

When Airtable API calls become available again, the project should use them to capture the things CSV cannot tell us:

- Field types.
- Field IDs.
- Hidden fields.
- Formula definitions.
- Lookup and rollup source fields.
- Linked-record cardinality.
- Select and multi-select option configuration.
- View filters.
- Relationship authority.

The goal is to stay far below the 1,000-call free-account reset limit.

## Call-Budget Principle

Use API calls in this order:

1. Metadata.
2. Relationship proof.
3. Selector proof.
4. Small record spot checks.
5. Bulk record reads only if a specific mismatch requires them.

Do not use live calls to duplicate the complete CSV export unless the CSV is found to be incomplete or filtered.

## Expected Local Evidence Outputs

Create local/private evidence files when the run is performed.

Recommended local-only location:

```text
local-evidence/airtable/2026-08-20/
```

Recommended files:

```text
base-schema.raw.json
base-schema.sanitized.json
metadata-summary.md
field-type-inventory.csv
relationship-inventory.csv
select-options-inventory.csv
formula-rollup-inventory.md
view-scope-notes.md
spot-check-results.md
call-count-log.md
```

Repository rule:

- Do not commit raw Airtable IDs, formulas, or private schema snapshots to a public repository without explicit approval.
- Commit only sanitized summaries unless a private-repository policy has been approved.

## Stop Rules

Stop the live verification run if any of the following occurs:

- Airtable returns rate-limit errors.
- Credentials appear invalid or point to the wrong base.
- The base schema does not match the Coffee Log export package.
- A bulk sync endpoint starts modifying local data unexpectedly.
- A metadata response includes sensitive information that needs a privacy decision before saving.
- The call count reaches 250 before Priority 1 and Priority 2 are complete.

## Priority 1 — Base and Table Metadata

Goal: identify the base, tables, fields, field types, and table IDs.

Capture:

| Item | Needed evidence |
| --- | --- |
| Base ID | Confirmed from environment/config, not committed as public evidence unless approved |
| Table names | Full list of tables in the Coffee Log base |
| Table IDs | Store private/raw; summarize sanitized |
| Field names | Full list per table |
| Field IDs | Store private/raw; summarize sanitized |
| Field types | Required for migration planning |
| Field descriptions | Capture if available |

Tables to verify first:

1. `Shots`
2. `Bags`
3. `Beans`
4. `Hopper`
5. `Hopper Range Baselines`
6. `Grinder Jam Events`
7. `Shot Fault Rules`
8. `10-Point Rating System` / `Rating Systems`
9. `Project Notes`

Optional/product table:

- `BSE Launch Economics`

Output:

- `metadata-summary.md`
- `field-type-inventory.csv`

## Priority 2 — Field Semantics

Goal: separate editable fields from Airtable-generated fields.

For every field in the core tables, classify:

| Classification | Meaning |
| --- | --- |
| Editable input | User/admin enters or edits it directly |
| Linked record | Airtable relationship field |
| Lookup | Derived from linked record |
| Rollup | Aggregate from linked records |
| Formula | Airtable-calculated field |
| Button/interface helper | UI/workflow support |
| Imported evidence only | Source value to preserve, not app-owned |
| Unknown | Requires manual Airtable UI inspection |

Core tables:

- Shots
- Bags
- Beans
- Hopper
- Hopper Range Baselines

Output:

- `field-type-inventory.csv`
- `formula-rollup-inventory.md`

## Priority 3 — Known Shot Gaps

Goal: resolve the 9 known Shot fields not safely covered by current offline mapping.

Verify:

| Shot field | Metadata needed |
| --- | --- |
| `Bag` | Field type, linked table, cardinality, primary relationship authority |
| `Rating ( Valid Only )` | Formula/rollup source and whether it should be imported read-only |
| `Hopper Range Link` | Linked table/source and cardinality |
| `Hopper Range Match` | Formula/helper source |
| `Hopper Link` | Linked table/source and cardinality |
| `Yield Window` | Formula/lookup/rollup source |
| `Ratio Window` | Formula/lookup/rollup source |
| `Initial Output vs Target Dose (g)` | Formula source; confirm target-dose dependency |
| `Initial Output vs Hopper Baseline (g)` | Formula source; confirm baseline dependency |

Output:

- `formula-rollup-inventory.md`
- `relationship-inventory.csv`

## Priority 4 — Relationships

Goal: confirm relationship authority before Postgres migration.

Verify:

| Relationship | Evidence needed |
| --- | --- |
| Bean → Bags | Airtable linked field name, source table, cardinality |
| Bag → Shots | Airtable linked field name, source table, cardinality |
| Hopper → Shots | Airtable linked field name, source table, cardinality |
| Hopper Range Baseline → Shots | Airtable linked field name, source table, cardinality |
| Hopper → Grinder Jam Events | Airtable linked field name, source table, cardinality |
| Shot → Grinder Jam Events | Airtable linked field name, source table, cardinality |

Special focus:

- Confirm whether Shot `Bag` is the authoritative Bag link.
- Confirm whether Shot `Bag Label` is a lookup/formula/display helper.
- Confirm whether Hopper assignment comes from `Hopper Link`, `Hopper Range Link`, both, or another hidden field.

Output:

- `relationship-inventory.csv`

## Priority 5 — Select and Multi-Select Options

Goal: preserve Airtable vocabulary exactly.

Capture configured options for:

| Table | Field |
| --- | --- |
| Shots | `Fault Status` |
| Shots | `Shot Classification` |
| Shots | `Bean Achievement` |
| Shots | `Expression Style` |
| Shots | `Intelligence Lesson Type` |
| Shots | `Dose Correction Type` |
| Shots | `Shot Status` |
| Shots | `Drink Type` |
| Shots | `Hopper Phase` |
| Shots | `Hopper Range` |
| Bags | `Status` |
| Beans | `Certification` |
| Grinder Jam Events | `Motor Response` |
| Grinder Jam Events | `Recovery Method` |
| Grinder Jam Events | `Evidence Confidence` |

For each field capture:

- Type: single select, multi-select, text, formula, lookup, or unknown.
- Configured option labels.
- Option order if exposed.
- Colors if useful for UI parity.
- Whether current CSV values include values not in configured metadata.

Output:

- `select-options-inventory.csv`

## Priority 6 — View Scope and Hidden Fields

Goal: know whether CSV exports are complete or view-filtered.

Verify:

| View/export | Question |
| --- | --- |
| `Shots Entering` | Is it filtered by date/month/status? |
| `Bags View` | Does it include inactive/archived Bags? |
| `Beans View` | Does it include inactive Beans? |
| `Hopper View` | Does it include inactive Hopper states? |
| `Hopper Range Baselines` | Does it include all baseline rows? |

Also identify hidden fields for:

- Shots
- Bags
- Beans
- Hopper
- Hopper Range Baselines

Output:

- `view-scope-notes.md`

## Priority 7 — Minimal Live Record Spot Checks

Goal: verify the CSV-to-Postgres import mapping against live Airtable without bulk reads.

Spot-check at least:

| Sample | Reason |
| --- | --- |
| Current active Bag | Active-bag authority |
| One inactive Bag | Lifecycle/state handling |
| One current manual Shot | Manual-entry audit after API block |
| One Reference Shot | Reference authority |
| One excluded Shot | `Include in Analysis` enforcement |
| One multi-select-heavy Shot | Ordered array preservation |
| One Hopper record | State field verification |
| One Hopper Range Baseline | Baseline authority |
| One Grinder Jam Event | HMI event evidence |

Compare:

- Live Airtable value.
- CSV value.
- Current Postgres mapped field.
- Raw evidence storage.
- Any mismatch.

Output:

- `spot-check-results.md`

## Priority 8 — Sync Dry-Run Readiness

Goal: decide whether a live sync dry-run is safe.

Before running sync:

- Confirm credentials point to the Coffee Log base.
- Confirm all expected tables are present.
- Confirm no unexpected destructive endpoint will run.
- Confirm local database is disposable or backed up.
- Confirm sync preserves raw evidence.
- Confirm sync reports inserted/updated/skipped/errors.

Do not run a live bulk sync during metadata capture unless explicitly approved.

Output:

- sync readiness decision in `metadata-summary.md`

## Completion Criteria

The metadata verification run is complete when:

- Table and field metadata are captured.
- Known Shot gaps are classified.
- Relationship inventory is captured.
- Select/multi-select options are captured.
- Hidden/view-scope limitations are documented.
- Spot checks reconcile live Airtable, CSV, and current mapping.
- Remaining unknowns are listed.
- Call count is recorded.

## After The Run

After metadata verification:

1. Update [CSV-to-Postgres Coverage Report](csv-to-postgres-coverage-report.md).
2. Update [Postgres Migration Target Model](postgres-migration-target-model.md).
3. Update [Repository Certification Audit](../REPOSITORY_CERTIFICATION_AUDIT.md).
4. Decide whether the next phase is:
   - schema/reference-table stabilization,
   - sync/import hardening,
   - or DCI implementation readiness planning.
