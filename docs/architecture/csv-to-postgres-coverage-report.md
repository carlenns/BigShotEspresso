# CSV-to-Postgres Coverage Report

> **Status:** Offline evidence review  
> **Created:** 2026-08-17  
> **Evidence source:** `/Users/carlenns/Documents/Airtable Tables/Coffee Log/`  
> **Boundary:** This report uses exported CSV headers and current repository code. It does not claim live Airtable metadata verification.

## Summary

The current offline CSV package is strong enough to continue data-foundation planning without using Airtable API calls.

The highest-value table, `Shots-Shots Entering.csv`, contains 235 records and 93 exported fields. Current Shot import/mapping logic recognizes 84 of those 93 fields by current or historical source names. The remaining 9 exported Shot fields are not safely mapped by the current code path and need metadata/modeling review before production migration.

Hopper and Hopper Range Baseline CSV exports have dedicated import parsing support. Beans and Bags are represented in the database and live Airtable sync code, but their CSV exports are not yet a fully documented offline import path.

## Offline Source Coverage

| Source table/export | Offline records | Offline columns | Current foundation status |
| --- | ---: | ---: | --- |
| Shots | 235 | 93 | Strong typed coverage; 9 exported fields require review |
| Bags | 6 | 59 | Database and sync support exist; CSV import path needs explicit decision |
| Beans | 6 | 30 | Database and sync support exist; CSV import path needs explicit decision |
| Hopper | 17 | 9 | Dedicated CSV parser and first-class Postgres table exist |
| Hopper Range Baselines | 5 | 7 | Dedicated CSV parser and first-class Postgres table exist |
| Grinder Jam Events | 5 | 14 | Export exists; first-class Postgres model not yet confirmed |
| Shot Fault Rules | 12 | 3 | Export exists; first-class Postgres model not yet confirmed |
| Project Notes | 20 | 11 | Export exists; repository documentation uses notes as architecture evidence |
| Rating System | 39 | 3 | Export exists; first-class Postgres/reference model not yet confirmed |
| Launch Economics | 100 | 17 | Product planning evidence; not part of Coffee Log operational schema |

## Shot Field Coverage

### Recognized by current mapping logic

84 of the 93 exported Shot fields are recognized by current mapping logic through exact, normalized, current, or historical aliases.

This includes the Phase 1-critical groups:

- `Flow Time (sec)` with historical `Scale Time` compatibility.
- `Include in Analysis`.
- Dose and output fields.
- Rating and preference fields.
- Reference/Signature/Boundary fields.
- Shot status, classification, fault status, achievement, expression, and intelligence lesson multi-selects.
- Hopper phase/fullness/percentage/range fields.
- DCI/OSI/HMI-ready imported diagnostic fields such as flow diagnostic, drift status, shot quality, hopper behavior, top-up recommendation, and chart helper output.

### Exported Shot fields requiring review

The following 9 exported Shot fields are visible in the corrected CSV but are not safely covered by the current mapping comparison:

| CSV field | Likely nature | Current concern | Needed verification |
| --- | --- | --- | --- |
| `Bag` | Relationship/display field | Current parser appears to rely on Bag lookup and/or `Bag Label`, not this field as authoritative | Verify whether this is the linked Bag field, a display label, or an entry helper |
| `Rating ( Valid Only )` | Formula/read-only analytical field | Not mapped as a typed field | Verify formula and decide whether imported read-only storage is needed |
| `Hopper Range Link` | Relationship/lookup helper | Relationship may be resolved from `Hopper Range`; link field itself not mapped | Verify linked-record source and cardinality |
| `Hopper Range Match` | Formula or helper | Not mapped as a typed field | Verify whether needed for HMI audit or only Airtable UI support |
| `Hopper Link` | Relationship helper | Shot-to-Hopper relationship is typed, but this visible field needs metadata verification | Verify linked-record source and cardinality |
| `Yield Window` | Bag/reference formula or lookup | Not currently mapped in Shot import | Verify source formula/window authority |
| `Ratio Window` | Bag/reference formula or lookup | Not currently mapped in Shot import | Verify source formula/window authority |
| `Initial Output vs Target Dose (g)` | Formula/read-only dose comparison | Current schema has `actualDoseError`, but mapping uses historical/alternate names | Confirm canonical CSV/source name before mapping |
| `Initial Output vs Hopper Baseline (g)` | Formula/read-only baseline comparison | Current schema has `baselineOutputDelta`, but mapping uses historical/alternate names | Confirm canonical CSV/source name before mapping |

## Bag Label Decision

Current offline understanding:

- Bags table has `Bag Label`.
- Shots export includes both `Bag` and `Bag Label`-style behavior in the app history.
- User confirmed `Bag Label` is a field in Bags and also appears in Shots to make current-bag selection easier.

Recommended production model:

- `bags.bag_label` or equivalent remains the canonical human-readable label.
- `shots.bag_id` is the authoritative relationship.
- A shot-level `bag_label` may remain as imported evidence or display snapshot.
- Do not infer relationships from label text when an Airtable linked record or explicit ID is available.

Blocked until metadata:

- Determine whether Shot `Bag`, `Bag Label`, and Hopper link fields are linked records, lookups, formulas, or manually-entered helper values.

## Tables Needing Offline Import Decisions

### Bags

The Bags export contains many rollups, formulas, and bag-level target windows. Before moving to production Postgres, each field should be classified as:

- editable bag input,
- linked Bean relationship,
- imported Airtable formula/rollup evidence,
- local deterministic calculation,
- dashboard-only summary,
- or deprecated/raw-only evidence.

Current risk: using CSV alone may blur editable fields and Airtable-generated fields.

### Beans

The Beans export includes descriptive bean fields and bean-level rollups. Before production migration, decide which rollups are stored evidence versus recalculated from Shots/Bags in Postgres.

Current risk: bean-level analytics could double-count or conflict with recalculated Postgres analytics if imported rollups are treated as canonical.

### Grinder Jam Events

The export exists and is important to Hopper Mechanics Intelligence, but a first-class Postgres model is not yet confirmed in the current schema review.

Current risk: HMI exception evidence may remain detached from Hopper state tracking unless modeled intentionally.

### Shot Fault Rules

The export exists and can support deterministic classification explanation, but a first-class Postgres/reference model is not yet confirmed.

Current risk: local code may invent or drift from Airtable rule text if the rule table is not preserved.

### Rating System

The export exists and should likely become a small reference/evidence table or durable documentation fixture.

Current risk: rating descriptions may be lost if only numeric ratings are migrated.

### Project Notes

Project Notes remain important dated architecture evidence. They should be preserved, but not necessarily treated as application runtime records.

Current risk: dated refinements can be separated from implementation decisions unless linked from governance docs.

## Recommended Offline Work Before Airtable Reset

1. Update the implementation checklist to include the 9 Shot field-name gaps above.
2. Decide whether `Initial Output vs Target Dose (g)` maps to the existing `actualDoseError` storage field.
3. Decide whether `Initial Output vs Hopper Baseline (g)` maps to the existing `baselineOutputDelta` storage field.
4. Decide whether `Yield Window` and `Ratio Window` should become typed imported read-only Shot fields.
5. Decide whether `Rating ( Valid Only )` should be stored as imported evidence or recalculated locally.
6. Decide whether Grinder Jam Events, Shot Fault Rules, Rating System, and Project Notes need first-class Postgres tables before Phase 2.
7. Prepare a live metadata checklist that verifies all relationship helper fields before code changes.

## Live Airtable Metadata Questions

When API calls are available, answer these first:

1. What is the field type and source for Shot `Bag`?
2. What is the field type and source for Shot `Hopper Link`?
3. What is the field type and source for Shot `Hopper Range Link`?
4. What formula or lookup produces `Hopper Range Match`?
5. What formula produces `Rating ( Valid Only )`?
6. What formulas or lookups produce `Yield Window` and `Ratio Window`?
7. Are `Initial Output vs Target Dose (g)` and `Initial Output vs Hopper Baseline (g)` current replacements for previously documented dose-error/baseline-delta names?
8. Which fields are hidden from the exported views?
9. Which visible fields are editable versus read-only in Airtable?

## Conclusion

The project can continue offline data-foundation planning immediately. The next live Airtable session should focus on metadata and relationship authority, not bulk data extraction.

The main known gap is not missing record data; it is missing Airtable field semantics.
