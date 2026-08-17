# Postgres Migration Target Model

> **Status:** Planning draft  
> **Created:** 2026-08-17  
> **Evidence source:** Offline Airtable CSV exports in `/Users/carlenns/Documents/Airtable Tables/Coffee Log/`  
> **Boundary:** Documentation only. This document does not implement schema, migration, API, UI, or intelligence-engine changes.

## Purpose

This document defines the target Postgres model for moving Coffee Log away from Airtable as a production runtime dependency.

The goal is not to copy Airtable blindly. The goal is to preserve Airtable evidence while giving the application a clean, scalable Postgres foundation.

## Authority Rules

1. CSV exports confirm visible field names and current exported values.
2. CSV exports do not confirm Airtable field types, formulas, hidden fields, linked-record cardinality, view filters, automations, or interface-only behavior.
3. Existing architecture documentation governs field meaning where it is already approved.
4. Existing code shows current implementation state, but does not outrank the approved architecture.
5. No selector, formula, relationship, or intelligence behavior should be invented.

## Target Modeling Principle

Each Airtable export should be classified as one of five target roles:

| Role | Meaning |
| --- | --- |
| Production table | First-class app data used by normal runtime behavior |
| Reference table | Stable lookup/rule/explanation data used by validation or display |
| Imported evidence table | Preserved Airtable/source evidence, not necessarily editable runtime data |
| Documentation evidence | Preserved in docs or fixtures, not needed as an app table yet |
| Future analytics table | Not required for current runtime, but likely needed by later intelligence engines |

## Proposed Target Tables

| Airtable export | Proposed Postgres role | Priority | Rationale |
| --- | --- | --- | --- |
| `Shots-Shots Entering.csv` | Production table plus raw import evidence | Critical | Core operational record and intelligence input |
| `Bags-Bags View.csv` | Production table plus imported rollup evidence | Critical | Active bag, bag lifecycle, target windows, reference grouping |
| `Beans-Beans View.csv` | Production table plus imported rollup evidence | Critical | Bean identity, roaster/origin data, bean-level analytics grouping |
| `Hopper-Hopper View.csv` | Production table / state table | Critical | Hopper is a state-tracking system supporting HMI, not just a log |
| `Hopper Range Baselines-Hopper Range Baselines.csv` | Production/reference hybrid | Critical | Baseline authority for hopper range comparisons |
| `Grinder Jam Events-Grid view.csv` | Future analytics / event table | High | HMI exception evidence and mechanical troubleshooting |
| `Shot Fault Rules-Shot Fault Rules.csv` | Reference table | High | Fault explanation/rule evidence; prevents local rule drift |
| `10-Point Rating System-Rating Systems.csv` | Reference/documentation table | Medium | Rating interpretation and user-facing explanation support |
| `Project Notes-Project Notes View.csv` | Imported evidence / documentation evidence | Medium | Dated research authority and implementation rationale |
| `BSE Launch Economics-Grid view.csv` | Documentation/product evidence | Low | Product planning data, not Coffee Log runtime data |

## Core Production Model

### Beans

Target role: production table.

Confirmed CSV fields:

- `Beans`
- `Roaster`
- `Name`
- `Region`
- `Country`
- `Certification`
- `Process`
- `Active`
- `Notes`
- `Bag`
- bean-level rollups and analytics windows

Recommended target treatment:

| Field group | Target treatment |
| --- | --- |
| Identity fields | Typed editable production columns |
| Origin/process/descriptive fields | Typed editable production columns |
| `Active` | Typed production column |
| `Bag` relationship/rollup | Relationship evidence until metadata confirms source |
| Bean-level rollups | Imported read-only evidence first; later recalculated locally after formulas are approved |

Open metadata questions:

- Is `Beans` the primary display field?
- Is `Name` separate from `Beans`, or a helper/formula/lookup?
- Is `Bag` a linked-record field or rollup/display field?
- Which bean rollups already apply `Include in Analysis`?

### Bags

Target role: production table plus imported rollup evidence.

Confirmed CSV fields include:

- `Bag ID`
- `Bag Label`
- `Beans`
- `Active`
- `Go To Coffee`
- roast/purchase/open/end date fields
- freshness fields
- size/cost fields
- shot/reference/analysis rollups
- target windows
- bag intelligence dossier fields

Recommended target treatment:

| Field group | Target treatment |
| --- | --- |
| `Bag ID`, `Bag Label` | Typed production identity/display fields |
| `Beans` | Relationship to Beans after metadata confirms cardinality |
| `Active`, `Go To Coffee`, `Status` | Typed production state fields |
| Roast/purchase/open/end dates | Typed production lifecycle fields |
| Bag size/cost/cost per gram | Typed production/economics fields; formula status requires metadata |
| Target windows | Imported read-only evidence until window formulas/authority are verified |
| Rollups such as shot count, average rating, reference shot percent | Imported read-only evidence first; later local calculations |
| Bag intelligence dossier fields | Future intelligence/documentation evidence, not Phase 2 runtime behavior |

Open metadata questions:

- Which Bag fields are editable versus formula/rollup/lookup?
- Which target-window fields are manually maintained versus calculated?
- Is `Bag Label` the canonical human-readable label used by Shot entry?
- What exact formula or rollup drives `Reference Shots (filtered)` and `Analysis Shot Count`?

### Shots

Target role: production table plus raw import evidence.

Confirmed CSV facts:

- 235 exported records.
- 93 exported columns.
- Current mapping logic recognizes about 84 of 93 exported fields by current or historical aliases.
- `Flow Time (sec)` is the current field name; `Scale Time` is a historical alias.

Recommended target treatment:

| Field group | Target treatment |
| --- | --- |
| Date, Bag, Bag Label | Typed relationship/display fields; relationship authority requires metadata |
| Grinder setting/time/output/dose/correction fields | Typed production columns |
| Pour, flow, yield, ratio fields | Typed production columns |
| Rating/preference/finished fields | Typed production columns |
| Reference/Signature/Boundary fields | Typed production columns, with manual reference authority preserved |
| Status/classification/fault/achievement/expression fields | Typed fields; multi-select values stored as ordered arrays |
| `Include in Analysis` | Typed eligibility gate for all analytics |
| Notes/fault notes | Typed text fields |
| Hopper phase/fullness/range fields | Typed imported/relationship-support fields |
| Diagnostic/model fields | Imported read-only evidence until local calculations are approved |
| Raw row | Immutable imported evidence |

Shot fields requiring metadata/modeling review:

| Field | Target decision needed |
| --- | --- |
| `Bag` | Confirm linked-record authority versus display/helper value |
| `Rating ( Valid Only )` | Decide imported read-only storage versus local recalculation |
| `Hopper Range Link` | Confirm linked-record source and cardinality |
| `Hopper Range Match` | Confirm formula/helper purpose |
| `Hopper Link` | Confirm linked-record source and cardinality |
| `Yield Window` | Decide typed read-only storage after source formula is verified |
| `Ratio Window` | Decide typed read-only storage after source formula is verified |
| `Initial Output vs Target Dose (g)` | Confirm mapping to dose-error/dose-variance field |
| `Initial Output vs Hopper Baseline (g)` | Confirm mapping to baseline-output-delta field |

### Hoppers

Target role: production state table.

Confirmed CSV fields:

- `Name`
- `Starting Beans (g)`
- `Shots`
- `Active`
- `Hopper Mass (g)`
- `Hopper %`
- `Shots Left (estimated)`
- `Notes`
- `Grinder Jam Events`

Recommended target treatment:

| Field group | Target treatment |
| --- | --- |
| `Name` | Typed identity/display field |
| `Starting Beans (g)` | Typed state/evidence field |
| `Active` | Typed active-state field |
| `Hopper Mass (g)`, `Hopper %`, `Shots Left (estimated)` | Imported read-only state/calculation evidence until formulas are verified |
| `Shots` | Relationship evidence requiring metadata |
| `Grinder Jam Events` | Relationship evidence requiring metadata |
| `Notes` | Typed text evidence |

Open metadata questions:

- Is one active Hopper allowed globally or per Bag?
- How are Shots assigned to Hopper records?
- Are Hopper percentage and shots-left fields formulas, rollups, or manually maintained?
- What event types drive fill, top-up, phase transition, cleanout, waste, and reconciliation?

### Hopper Range Baselines

Target role: production/reference hybrid.

Confirmed CSV fields:

- `Hopper Range`
- `Baseline Output Adjusted Date`
- `Baseline Output Status`
- `Baseline Output (g)`
- `Avg Initial Output (g)`
- `Count`
- `Shots`

Recommended target treatment:

| Field group | Target treatment |
| --- | --- |
| `Hopper Range` | Typed reference key |
| Baseline output/date/status | Typed baseline authority fields |
| Average initial output/count | Imported read-only evidence until formula is verified |
| `Shots` | Relationship evidence requiring metadata |

Open metadata questions:

- Is `Baseline Output (g)` manually maintained?
- Is `Avg Initial Output (g)` a rollup from linked Shots?
- Does `Count` count all shots or only included/eligible shots?
- How does Airtable assign a Shot to a Hopper Range Baseline?

## Additional Tables

### Grinder Jam Events

Target role: high-priority future event table.

Why it matters:

- Provides mechanical exception evidence for Hopper Mechanics Intelligence.
- Links grinder behavior, hopper state, recovery method, cleanout, purge/loss, recurrence, and related shot.

Recommended target treatment:

- Preserve as a first-class event table before HMI implementation.
- Link to Hopper when metadata confirms relationship.
- Link to Shot when metadata confirms relationship.
- Store raw import evidence.

Open metadata questions:

- Is `Related Shot` a linked-record field?
- Is `Hopper Cycle` a linked Hopper field?
- Are `Motor Response`, `Recovery Method`, `Evidence Confidence`, and `Recurrence Cluster` selectors?

### Shot Fault Rules

Target role: reference table.

Why it matters:

- Preserves the visible rule language used to explain shot faults.
- Prevents local code from inventing fault classifications.

Recommended target treatment:

- Store `Criteria`, `Fault Status`, and `Notes` as a reference/evidence table.
- Do not use these as automatic classification rules until formulas/workflow are approved.

Open metadata questions:

- Is `Fault Status` a single-select or multi-select source?
- Are criteria used by Airtable formulas, manual review, or documentation only?

### Rating System

Target role: reference/documentation table.

Why it matters:

- Preserves rating-language context for user-facing explanations.
- Helps future onboarding and ChatGPT-assisted interpretation.

Recommended target treatment:

- Preserve `Section`, `Item`, and `Description`.
- Treat as read-only reference content unless a later admin workflow is approved.

### Project Notes

Target role: imported evidence and documentation evidence.

Why it matters:

- Dated Project Notes govern refinements, field renames, and research rationale.

Recommended target treatment:

- Preserve as documentation evidence at minimum.
- Consider a Postgres `project_notes` or `research_notes` evidence table later if the app needs searchable provenance.
- Do not treat Project Notes as runtime calculation logic without an ADR.

### Launch Economics

Target role: documentation/product evidence only.

Why it matters:

- Supports product planning and launch economics.
- Does not belong in Coffee Log operational runtime schema.

Recommended target treatment:

- Keep in product documentation or private planning evidence.
- Do not build into core Coffee Log migrations.

## Relationship Target Model

Confirmed/inferred relationship targets:

| Relationship | Target authority | Current confidence |
| --- | --- | --- |
| Bean → Bags | Airtable `Beans` / Bags `Beans` relationship | Needs metadata |
| Bag → Shots | Shot `Bag` / Bag label relationship | Needs metadata |
| Hopper → Shots | Hopper `Shots` and Shot `Hopper Link` | Needs metadata |
| Hopper Range Baseline → Shots | Baseline `Shots` and Shot range fields | Needs metadata |
| Hopper → Grinder Jam Events | Hopper `Grinder Jam Events` / Jam `Hopper Cycle` | Needs metadata |
| Shot → Grinder Jam Events | Jam `Related Shot` | Needs metadata |

Target production rule:

- Use numeric/internal Postgres foreign keys for relationships.
- Preserve Airtable record IDs privately/local-evidence where available.
- Preserve CSV labels as import evidence.
- Do not infer relationship authority from text labels when Airtable linked records are available.

## Imported Evidence Strategy

Every imported/synchronized row should preserve:

- Source table/export name.
- Source row values.
- Import timestamp.
- Import fingerprint/checksum.
- Source Airtable record ID when available.
- Relationship-resolution status.
- Field mapping warnings.

This preserves Airtable as research evidence while allowing Postgres to become production authority.

## Rollup and Formula Strategy

Target rule:

- Airtable rollups and formulas should first be stored as imported read-only evidence.
- Local deterministic recalculation should happen only after formula authority is verified.
- Analytical fields must respect `Include in Analysis` unless explicitly documented as operational/admin counts.

Examples:

| Field type | Initial Postgres treatment | Later treatment |
| --- | --- | --- |
| Shot-entered values | Typed production columns | Normal app edits |
| Airtable formulas | Imported read-only evidence | Recalculate locally after approval |
| Airtable rollups | Imported read-only evidence | Recalculate from Postgres after approval |
| Multi-selects | Ordered arrays | Option governance from Airtable metadata or approved values |
| Linked records | Foreign keys plus raw source evidence | Full relational authority |

## Migration Readiness by Table

| Table | Ready for Postgres-first runtime? | Reason |
| --- | --- | --- |
| Shots | Partially ready | Strong typed coverage; 9 fields and relationship metadata remain |
| Bags | Partially ready | Core entity exists; many rollups/formulas need classification |
| Beans | Partially ready | Core entity exists; rollups and relationship metadata need classification |
| Hoppers | Partially ready | Table exists; state-continuity and relationship rules need verification |
| Hopper Range Baselines | Partially ready | Table exists; formula/rollup authority needs verification |
| Grinder Jam Events | Not ready | Export exists; target model not implemented/approved |
| Shot Fault Rules | Not ready | Export exists; reference-table treatment not implemented/approved |
| Rating System | Not ready | Export exists; reference/documentation treatment not implemented/approved |
| Project Notes | Documentation-ready | Preserved as docs evidence; runtime table optional |
| Launch Economics | Documentation-ready | Product evidence only |

## Before Implementation

Before schema/application changes are made from this model:

1. Approve this target model or revise it.
2. Resolve the 9 Shot field mapping gaps where possible.
3. Decide whether Grinder Jam Events, Shot Fault Rules, and Rating System are in the next schema phase.
4. Use Airtable API reset to capture metadata, not bulk data.
5. Produce an implementation checklist with migration, rollback, import, sync, API, UI, and test impacts.

## Phase Boundary

This document does not start intelligence implementation.

DCI, OSI, Hopper Workflow, HMI, BLI, MSI, and GSP remain blocked until the data foundation is approved for the relevant engine scope.
