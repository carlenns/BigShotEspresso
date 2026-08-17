# Offline-First Airtable Reset Plan

> **Status:** Active planning document  
> **Created:** 2026-08-17  
> **Scope:** Work that can proceed without live Airtable API access, plus the call-budget plan for the next Airtable API reset  
> **Boundary:** Documentation and data-foundation planning only. This plan does not authorize application logic changes or intelligence-engine implementation.

## Purpose

Coffee Log is currently blocked from live Airtable verification by Airtable API/account limits. Rather than waiting idle, the project can continue using the exported CSV evidence package documented in [Offline Airtable Export Audit](offline-airtable-export-audit.md).

The goal is to reduce the next live Airtable session to a small, deliberate verification pass. Airtable API calls should be used to recover metadata and hidden architecture details that CSV exports cannot provide, not to rediscover visible table values already present offline.

## Current Offline Evidence

The available offline export package contains 10 CSV files from the Coffee Log Airtable base:

| Export | Records | Columns | Offline use |
| --- | ---: | ---: | --- |
| `Shots-Shots Entering.csv` | 235 | 93 | Primary shot evidence, field inventory, current visible source values |
| `Bags-Bags View.csv` | 6 | 59 | Bag labels, active state, bag-level rollups, target windows |
| `Beans-Beans View.csv` | 6 | 30 | Bean descriptors and bean-level rollups |
| `Hopper-Hopper View.csv` | 17 | 9 | Hopper state records and visible mass/percentage values |
| `Hopper Range Baselines-Hopper Range Baselines.csv` | 5 | 7 | Hopper baseline records and visible baseline outputs |
| `Grinder Jam Events-Grid view.csv` | 5 | 14 | Hopper/grinder exception evidence |
| `Shot Fault Rules-Shot Fault Rules.csv` | 12 | 3 | Visible fault rule labels and notes |
| `Project Notes-Project Notes View.csv` | 20 | 11 | Dated research and architecture notes |
| `10-Point Rating System-Rating Systems.csv` | 39 | 3 | Rating system reference |
| `BSE Launch Economics-Grid view.csv` | 100 | 17 | Product/economics planning reference |

## Work That Can Proceed Without Airtable API

### 1. CSV-to-Postgres readiness review

Can proceed now.

- Compare exported CSV columns against current Postgres schema fields.
- Identify fields already represented as typed database columns.
- Identify fields that remain raw/import evidence only.
- Identify fields that are visible rollups/formulas and should remain imported read-only until formulas are verified.
- Identify naming mismatches that should be corrected before production migration.

### 2. Import fixture strategy

Can proceed now.

- Decide whether the corrected 235-shot export should replace or supplement the committed 164-shot CI fixture.
- Preserve a smaller fixture for fast CI if needed.
- Add checksums and record counts for every fixture used by tests.
- Ensure fixtures contain no private tokens, personal credentials, or unnecessary sensitive metadata.

### 3. Postgres target model planning

Can proceed now.

- Confirm canonical Postgres entities:
  - Beans
  - Bags
  - Shots
  - Hoppers
  - Hopper Range Baselines
  - Grinder Jam Events
  - Shot Fault Rules
  - Rating System reference rows
  - Project Notes / research evidence
- Decide which Airtable rollups become:
  - stored imported evidence,
  - local deterministic calculations,
  - future analytics outputs,
  - or dashboard-only display values.

### 4. Bag Label modeling

Can proceed now.

Current understanding:

- `Bag Label` is canonical on the Bags table.
- `Bag Label` also appears on Shots as a convenience/display field for easier entry and selection.
- The production model should treat `shots.bag_id` as the authoritative relationship.
- A copied `shots.bag_label` may be retained as import evidence or historical display context, but should not become the authoritative relationship.

Open item for Airtable metadata:

- Verify whether the Shot `Bag Label` field is a lookup, formula, linked-record display value, or manually-entered helper.

### 5. API-call checklist preparation

Can proceed now.

- Build the exact metadata fields to request when Airtable resets.
- Prioritize table/field metadata over record reads.
- Avoid live record queries for values already present in the CSV export.

## Work That Must Wait For Airtable Metadata

CSV exports do not expose enough information to verify:

- Airtable field IDs.
- Hidden fields.
- Field types.
- Formula definitions.
- Lookup/rollup source fields.
- Linked-record cardinality.
- Select and multi-select option configuration.
- View filters.
- Interface-only logic.
- Automations.
- Whether a visible CSV field is editable, formula-derived, lookup-derived, or rollup-derived.

These must be recovered later through live Airtable metadata or a separate Airtable schema export.

## 1,000-Call Airtable Reset Strategy

When Airtable API access resets, calls should be spent in this order.

### Priority 1 — Metadata, not records

Goal: recover table and field architecture with the fewest calls.

- List bases only if the base ID is not already confirmed.
- Fetch base schema/metadata for Coffee Log.
- Record table IDs, field IDs, field names, field types, field descriptions if available, select options, linked table references, lookup sources, rollup sources, and formulas.
- Save a sanitized private/local schema snapshot.
- Do not commit raw Airtable IDs, formulas, or sensitive schema details to a public repository unless explicitly approved.

### Priority 2 — View and hidden-field verification

Goal: explain what the CSV exports cannot show.

- Identify hidden fields on key views.
- Identify whether exported CSVs are complete table views or filtered views.
- Verify the `Shots Entering` view scope.
- Verify whether the corrected 235-shot CSV matches the full intended analytical shot population.

### Priority 3 — Relationship verification

Goal: confirm the production Postgres relationship model.

- Verify Shot-to-Bag relationship.
- Verify Bag-to-Bean relationship.
- Verify Hopper-to-Bag relationship.
- Verify Shot-to-Hopper relationship.
- Verify Shot-to-Hopper Range Baseline relationship.
- Verify Grinder Jam Event-to-Hopper relationship.
- Verify Reference Shot linkage/authority.

### Priority 4 — Select and multi-select preservation

Goal: prevent vocabulary drift.

- Fetch authoritative choices for:
  - `Fault Status`
  - `Shot Classification`
  - `Bean Achievement`
  - `Expression Style`
  - `Intelligence Lesson Type`
  - `Dose Correction Type`
  - `Hopper Phase`
  - `Hopper Range`
  - `Shot Status`
- Confirm whether option order matters.
- Confirm whether blank, single-select, and multi-select states are represented differently.

### Priority 5 — Minimal live record spot checks

Goal: verify import correctness without burning calls.

- Read a small fixed sample of records from each core table.
- Include at least:
  - one current active Bag,
  - one non-active Bag,
  - one Reference Shot,
  - one excluded shot where `Include in Analysis` is false,
  - one shot with multiple multi-select values,
  - one Hopper top-up/fill-related record if present,
  - one Hopper Range Baseline.
- Compare live API fields to CSV-imported values and Postgres mappings.

## Suggested Call Budget

This is a planning estimate, not a guarantee, because exact Airtable metadata endpoints and pagination behavior must be verified when live access is available.

| Budget area | Target use |
| --- | ---: |
| Base/table/field metadata | 50-150 calls |
| View/filter/hidden-field checks | 50-150 calls |
| Relationship verification samples | 50-100 calls |
| Select/multi-select option verification | 25-75 calls |
| Live record spot checks | 50-150 calls |
| Safety reserve | 475-775 calls |

The plan should stay well under 1,000 calls if it avoids bulk record reads.

## Do Not Spend Airtable Calls On

- Re-reading all 235 Shots unless a specific mismatch is discovered.
- Re-reading every Bag, Bean, Hopper, and Baseline record when CSV values already exist.
- Trial-and-error sync debugging before metadata is captured.
- Interface exploration that can be inspected manually in Airtable.
- Intelligence-engine calculations.

## Phase 2 Boundary

This offline-first plan does not start Phase 2.

Before DCI, OSI, HMI, BLI, MSI, or GSP implementation begins, the project still needs either:

1. live Airtable metadata verification, or
2. an explicit documented waiver accepting CSV-only limits for a narrow implementation scope.

## Immediate Next Offline Tasks

1. Produce a CSV-to-Postgres field coverage report.
2. Decide fixture strategy for the 235-shot export versus the existing 164-shot CI fixture.
3. Draft the live Airtable metadata checklist to run when API access resets.
4. Prepare a sanitized schema snapshot policy for private/local metadata evidence.
5. Continue Postgres migration planning for Airtable exit without implementing intelligence engines.
