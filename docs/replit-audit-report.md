# Coffee-Log Replit Audit Report

> The audit findings below describe the pre-Phase-1 baseline. The final “Phase 1 implementation decisions” section records the approved corrections now represented in source code.

## Executive finding

The current application implements a useful Beans → Bags → Shots prototype and an active-bag dashboard, but it does not yet represent the full Airtable intelligence system. The current Shots CSV contains 93 fields; the application Shot schema has 55 typed columns, several of which are application-only identifiers/helpers. Most Hopper, model, flow, quality, and intelligence fields are missing as typed data and survive only in CSV `rawRow` during CSV import. Airtable sync imports an even smaller subset.

No application code was changed during this documentation phase.

## Source comparison

| Layer | Current state | Audit result |
|---|---|---|
| CSV | 8 current source tables, 202 fields; plus older attached Shots export | Authoritative evidence is substantially richer than app schema. |
| Database | Beans, Bags, Shots, equipment/accessories/settings, local taste selectors | Missing Hopper, baselines, Project Notes, Fault Rules, Rating System, and many source fields. |
| Airtable sync | Beans/Bags/Shots plus optional equipment-style tables | Shot sync maps only core fields and does not preserve raw Airtable field payload. |
| CSV import | Maps a subset and stores complete row in `rawRow` | Hardcoded expected row count 132 is obsolete versus current 164-row export. |
| OpenAPI | Narrow Shot contract | Omits many stored/source fields and misdeclares list response shape. |
| UI | Dashboard, logging, bags/beans, references, equipment | Forms and analytics are not schema-complete. |

## Findings

| Severity | Area | Evidence | Required correction | Phase |
|---|---|---|---|---|
| Critical | Data model | Hopper, Hopper Range Baselines, Project Notes, Fault Rules, Rating System absent | Add approved first-class models after documentation review. | Data foundation |
| Critical | Shot fields | Major CSV intelligence fields are untyped/missing | Add approved typed columns/relationships; preserve raw provenance. | Data foundation |
| Critical | Airtable sync | Sync reads `Scale Time`/`Total Time`, not current `Flow Time`; maps only a subset | Map current names and historical aliases; sync all approved fields. | Sync |
| High | CSV import | Expected row count is hardcoded to 132; current export has 164 rows | Validate dynamically and report source/version rather than fixed legacy count. | Import |
| Critical | API contract | `/shots` returns `{shots,total}` while OpenAPI declares an array | Correct OpenAPI first and regenerate clients. | API |
| High | Multi-selects | Stored as comma-separated text; Fault Status UI is single-select | Use arrays at API boundary and chips in UI; preserve order. | Contract/UI |
| High | Selector authority | Local Taste Selector seed invents a separate vocabulary | Keep it distinct or remove it from authoritative shot classification workflows. | UI/data |
| High | Analytics gate | Several analytical queries omit Include in Analysis | Apply gate consistently; see dedicated audit. | Analytics |
| High | Current vs Reference | Latest shot is active-bag scoped, fallback references cross bags | Enforce active-bag-only mode or explicitly approved labelled fallback. | Dashboard |
| High | OSI readiness | No no-weigh simulation or operational-success model | Build only after DCI/HMI data foundation and thresholds are approved. | Intelligence |
| High | HMI readiness | Hopper state is not represented; baseline fields unavailable to queries | Implement state ledger and baseline relationships. | Intelligence |
| Medium | GSP/MSI | Existing insights use simple hardcoded rating/time correlations | Replace with scoped, evidence-backed engines and confidence. | Intelligence |
| Medium | Form coverage | Shot Classification, Boundary, For Others, Rated, Fault Notes, intelligence fields missing | Make Full Log match approved field map; keep Quick Log minimal. | UI |
| Medium | Read-only enforcement | Many formula fields are absent rather than explicitly read-only | Expose useful outputs without making them editable. | UI |
| Medium | Flow naming | Database/API use `scaleTime`; UI uses “Shot Time” | Migrate/alias to canonical Flow Time with historical provenance. | Data/API/UI |

## Include in Analysis audit

### Noncompliant analytical queries

| Query | Missing gate | Consuming component/output |
|---|---|---|
| `GET /beans` rollups (`beans.ts`) | Bean shot count, average rating, and reference count include all child records | Beans page summary cards/list. |
| `GET /bags` rollups (`bags.ts`) | Shot count, references, average rating, grind range include all linked shots | Bags page. |
| `GET /bags/:id` (`bags.ts`) | All bag analysis, reference list, best-rated list, status breakdown, averages, and grind range use all shots | Bag Detail page. |
| All six `GET /insights` analyses (`insights.ts`) | High-rated windows, pour-time comparison, grind reliability, references, and fault rate do not gate eligibility | Insights API; currently not prominent in the inspected dashboard but remains analytical. |
| `GET /shots/reference` (`shots.ts`) | Reference list does not require Include in Analysis | Reference Shots page. |
| `GET /shots/:id/similar` (`shots.ts`) | Similar candidates do not require Include in Analysis | Shot Detail similar-shot finder when consumed. |
| `GET /shots` (`shots.ts`) | General list has no eligibility filter parameter/default | Shot Log is correctly a raw operational log, but any analytical reuse is unsafe. |

### Compliant analytical queries

- Dashboard active-bag intelligence.
- Dashboard same-bean and global reference fallback pools.
- Dashboard grind comparison and previous-bag average.
- Dashboard summary, recent, and best-rated endpoints.

### Intentionally unfiltered, not analytics defects

Administrative/Audit operations should see all records:

- Airtable counts and sync upsert lookups.
- CSV import summary and raw audit endpoint.
- Selector-option discovery.
- Individual record retrieval and mutation.
- Shot Log when presented as an operational history rather than a performance calculation.

## Current Shot vs Reference audit

### Latest shot

`dashboard.ts` builds `activeBagShots` with all three conditions:

- `bagId = activeBag.id`
- Airtable-backed record
- `includeInAnalysis = true`

`latestAnalysisShot = activeBagShots[0]`, so the current/latest shot is correctly active-bag isolated.

### Reference pool

Priority is:

1. Active-bag Reference Shots.
2. If active-bag timing evidence is sparse, eligible shots from all Bags belonging to the same Bean, filtered to rating ≥ 8 for timing windows.
3. If still sparse, all eligible Reference Shots globally.
4. A final active-bag top-rated fallback can be used by comparison construction.

### Cross-bag finding

Cross-bag comparisons currently occur when the active bag lacks sufficient reference evidence. The response labels the source as “Same bean reference shots” or “Global reference shots,” but this does not satisfy strict active-bag isolation.

Required decision after review: either prohibit fallback for Current Shot vs Reference, or retain it only as a separately named comparison that cannot be mistaken for the active bag’s reference.

## UI control audit

### Correct

- Reference, Signature, and Sour are checkboxes.
- Signature implies Reference in Quick Log and Full Log.
- Expression Style and Bean Achievement use chips.
- Status uses a dropdown.
- Notes remain free text.

### Incorrect or incomplete

- Fault Status uses a dropdown despite multi-value CSV evidence.
- Shot Classification is not exposed in current logging forms.
- Full Log omits multiple editable source fields and operational correction fields.
- Quick Log’s “Shot Time” writes to historical `scaleTime`; canonical terminology is Flow Time.
- Local Taste Selectors are a separate many-to-many feature with seeded values not sourced from the authoritative CSV fields.
- Formula/lookup/rollup outputs are mostly absent rather than explicitly read-only.

## OSI readiness audit

### Available typed data

Grind Time, Initial Output, Total Output, actual Dose, correction fields, Yield, ratio, timing, ratings, references, and Include in Analysis exist in the database schema or CSV importer.

### Missing or unsafe

- Target dose is held on Bags but not consistently available in contracts/analysis.
- No typed Dose Variance or no-weigh simulation outputs.
- Hopper state and baseline inputs are missing.
- Airtable sync does not import most correction fields.
- Historical success-window policy is not implemented.
- Existing dashboard windows use rating ≥ 8 in places; that is not an approved substitute for OSI success criteria.

### Conclusion

The app can support exploratory DCI calculations after data cleanup, but cannot yet answer “How operationally successful is timed dosing when basket dose is not weighed?” reliably.

## HMI and Hopper workflow readiness audit

### Source-system capability

CSV evidence supports fill/top-up/reconciliation events, Hopper states, phase transitions, shot assignments, fullness/range, baseline outputs, output deviations, correction behavior, and severity.

### Application gap

- No Hopper or Hopper Range Baseline tables.
- No typed Hopper links/ranges/fullness in Shot schema.
- No ledger calculation or active-state continuity.
- No baseline comparison queries.
- No UI for fill/top-up/transition/reconciliation events.

### Conclusion

The current app cannot reproduce Airtable HMI. Flat `hopperPhase` text alone is insufficient because HMI depends on state continuity and baseline-linked observations.

## Dashboard intelligence audit

The dashboard is meaningfully active-bag-first and correctly gates most data. It includes bag performance, timing windows, grind drift, current-shot comparison, and a watchlist. However:

- It does not consume typed Flow Diagnostic, Flow Score, Hopper, DCI, OSI, or MSI outputs.
- Recommendations include hardcoded conditions such as rating and age thresholds not established as engine policy.
- Current-vs-reference fallback can cross bags.
- “Best” windows are sometimes based on rating thresholds rather than manual Reference Shots.
- No operational no-weigh or hopper-state guidance is available.

## Verification status

- All current Markdown and CSV sources were read before this audit.
- Existing database, routes, OpenAPI, generated-client usage, and product pages were inspected.
- Static typecheck could not be run from the ordinary shell because `pnpm` was not on PATH in that environment.
- No application code or generated files were modified.

## Review gate

Implementation must not begin until the user reviews and approves:

1. Field types and editability.
2. Unresolved Airtable formulas/relationships.
3. Strict active-bag reference policy.
4. OSI success-window definitions.
5. Hopper state-transition and percentage rules.

## Phase 1 implementation decisions

- `flowTime`/`flow_time` is canonical. `scaleTime` remains a deprecated API input alias only; current and historical CSV/Airtable labels are accepted.
- Performance analytics share an `Include in Analysis = true` eligibility condition. Raw logs, imports, synchronization, record retrieval, and audit views remain unfiltered.
- Authoritative multi-select fields use ordered PostgreSQL text arrays and ordered string arrays in OpenAPI.
- The Shot list contract is `{ shots, total }`; generated clients no longer require a response-shape cast.
- Current Shot vs Reference uses only eligible manual Reference Shots from the active Bag. Same-bean, global, and rating-based fallbacks were removed from that component.
- Hopper and Hopper Range Baseline are first-class models. Imported percentage, mass, observed-average, and count fields remain source-derived/read-only; no unresolved ledger or HMI formula was introduced.
- A reversible SQL migration artifact records the Flow Time rename, typed-field expansion, multi-select conversion, and Hopper model creation.
