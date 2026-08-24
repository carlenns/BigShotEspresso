# Phase 1.5 Completed Tasks

This file records implementation evidence for Foundation Stabilization. It does not authorize or describe intelligence-engine implementation.

## 1. Database Migration Validation

**Status:** Complete in the embedded PostgreSQL integration environment; production deployment remains intentionally unexecuted.

### Changed

- Made the `scale_time` → `flow_time` migration repeatable and conflict-aware.
- Preserved ambiguous legacy multi-select strings as single array values instead of destructively guessing delimiters.
- Made the rollback migration repeatable.
- Added the Hopper, Hopper Range Baseline, Airtable evidence, import fingerprint, and analytical indexes to the migration.
- Added an embedded PostgreSQL-compatible migration test harness.

### Verified

- Forward migration applies successfully.
- Reapplying the forward migration is a no-op.
- Flow Time values survive migration.
- Legacy multi-select text survives forward and rollback migration exactly.
- Hopper, baseline, evidence tables, and Phase 1.5 indexes exist.
- Rollback succeeds and can be reapplied safely.
- Conflicting non-null `scale_time` and `flow_time` values abort with an explicit error.

### Unresolved

- The migration has not been run against the production or Replit PostgreSQL database.
- A final production rehearsal must run against an anonymized backup before deployment.

### Assumptions

- Ambiguous legacy scalar text must be preserved rather than split without authoritative selector metadata.
- The embedded PostgreSQL-compatible environment is suitable for automated SQL behavior checks, but it does not replace a deployment rehearsal on the production PostgreSQL version.

## 2. Airtable Synchronization Completion

**Status:** Implementation complete against approved CSV/documented fields; live Airtable verification blocked by unavailable credentials.

### Changed

- Added a centralized Airtable field mapper covering the approved typed Shot inventory and historical Flow Time aliases.
- Removed status/fault-based inference for `Include in Analysis`.
- Preserved ordered Airtable multi-select arrays without comma splitting.
- Rejected multi-link values where the local relationship is singular.
- Reported unresolved Bag, Hopper, and Hopper Range Baseline links.
- Added append-only hashed Airtable source evidence.
- Made active-Hopper deactivation and replacement transactional per synced record.

### Verified

- Fixture tests cover current field names, historical Flow Time naming, multi-select ordering, relationship cardinality, and the absence of eligibility inference.
- TypeScript compilation succeeds after rebuilding the database library.
- Airtable mapping tests pass in the local test suite.

### Unresolved

- No live Airtable metadata or record fetch was possible because `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` are not available.
- A live dry run must compare inserted/updated/skipped counts and evidence snapshots to the Airtable base before deployment.

### Assumptions

- Airtable metadata is authoritative for determining whether the `Include in Analysis` checkbox exists; an omitted checkbox value is false only when metadata confirms the field exists.
- Singular application relationships must reject multiple Airtable links until architecture documentation explicitly permits many-to-many behavior.

## 3. CSV Import Verification

**Status:** Complete for authoritative fixtures and the embedded database.

### Changed

- Centralized CSV parsing, booleans, numbers, percentages, ordered multi-select values, and row fingerprints.
- Made Shot imports transactional and duplicate-safe.
- Made unresolved Bag, Hopper, and baseline links fail validation before insertion.
- Made Hopper and baseline imports transactional.
- Preserved raw source rows for Shots, Hoppers, and baselines.
- Removed the Airtable-only restriction from operational Shot listing and selector discovery.
- Corrected import/audit summaries to flatten multi-select values.

### Verified

- Current Shot export: 93 columns and 164 rows.
- Historical Shot export: 87 columns and 132 rows.
- Historical `Scale Time` values map to canonical `flowTime`.
- Hopper export: 8 columns and 12 rows.
- Hopper Range Baseline export: 7 columns and 5 rows.
- Hopper percentages, including negative source evidence, remain numerically unchanged.
- Hopper and baseline fixtures insert into the migrated embedded database.
- Strict relationship mode reports unresolved links and imports nothing.
- Current Shot row fingerprints are unique across all 164 records.

### Unresolved

- The complete Shot import transaction still requires a deployment rehearsal against the real PostgreSQL schema and production-sized snapshot.

### Assumptions

- Airtable CSV multi-select exports use commas as the list delimiter. The original cell remains preserved in `rawRow` for auditability.
- Percentage fields are stored as exported percentage points (`100.00%` → `100`), matching existing source semantics rather than silently normalizing to `1`.

## 4. OpenAPI and Runtime Contract Alignment

**Status:** Complete and locally verified.

### Changed

- Made `shotDate`, Hopper `name`, and baseline `hopperRange` required in both OpenAPI and generated runtime validators.
- Added separate Hopper create and update contracts.
- Documented Hopper and Hopper Range Baseline CSV import endpoints.
- Added Hopper-specific OpenAPI tags.
- Added `grinderId` and `machineId` to the Shot response and write contracts.
- Kept `scaleTime` only as a deprecated compatibility input.
- Applied generated validators to all Hopper write and import routes.
- Removed internal Airtable IDs, raw evidence, and import fingerprints from public API responses.
- Removed imported/read-only Hopper calculations from ordinary create/update payloads.

### Verified

- OpenAPI generation completes successfully.
- Generated Zod validation rejects missing required fields.
- `CreateShotBody` supplies the documented `includeInAnalysis: true` default.
- Hopper routes use generated request validators.
- Generated clients and validators compile.
- API response-shape tests confirm internal evidence fields are not returned.

### Unresolved

- Response validation is verified through generated schema compilation and response-shaping tests, not a live HTTP server connected to PostgreSQL.

### Assumptions

- Imported Hopper mass, percentage, shots-left estimate, observed average, and observation count remain source-derived/read-only.

## 5. Multi-Select Migration Hardening

**Status:** Complete for current authoritative CSV and Airtable evidence.

### Changed

- PostgreSQL arrays remain the canonical database representation.
- Legacy scalar text is migrated as one exact array value rather than destructively guessing delimiters.
- Airtable arrays preserve source order exactly.
- Current CSV multi-select cells are parsed in exported order.
- Import and audit summaries flatten arrays into individual selector values.
- Selector discovery includes Airtable, CSV-imported, and locally created records.
- Removed hardcoded Shot Status and Fault Status fallback vocabularies from logging forms.
- Preserved first-selection order for downstream highlight behavior.

### Verified

- Forward and rollback migration preserve ambiguous legacy scalar text exactly.
- Every populated multi-select cell in the current 164-row Shot export re-joins to its original source value.
- Airtable fixture arrays retain exact order.
- Scalar Airtable values containing commas remain one value rather than being guessed as several.
- API contracts model multi-selects as ordered string arrays.

### Unresolved

- A live Airtable metadata comparison is still required to confirm every current option value and ordering behavior.

### Assumptions

- Commas are the list delimiter in Airtable CSV exports. The original source cell remains available in raw evidence if Airtable later introduces a value containing a comma.

## 6. Locally Created Shot Eligibility

**Status:** Complete and locally verified.

### Changed

- Removed Airtable record identity from analytical eligibility.
- Added a database default of `include_in_analysis = true` for newly created local shots.
- Backfilled existing local shots with null eligibility to `true`.
- Added `Include in Analysis` controls to Quick Log and Full Log.
- Preserved an explicit user choice of `false`.
- Added backward compatibility for the historical Quick Log `shotTime` preference key.
- Kept source identity independent from analytical eligibility.

### Verified

- Generated create validation defaults new local shots to included.
- Database migration tests confirm the local default.
- Integration tests prove equivalent local and Airtable shots are selected by the same eligibility rule.
- Excluded and unknown shots remain outside analytical aggregates.

### Unresolved

- The local-shot backfill must be reviewed during the production migration rehearsal before deployment.

### Assumptions

- Existing local records with null eligibility were unintentionally excluded by Phase 1 and should participate by default.

## 7. Include in Analysis Verification

**Status:** Complete and locally verified.

### Changed

- Reduced the shared eligible-shot condition to `includeInAnalysis = true`.
- Applied the condition to Bean rollups, Bag rollups and detail, Insights, reference shots, similar shots, dashboard summaries, dashboard intelligence, recent analytical shots, best-rated shots, timing pools, and grind comparisons.
- Kept operational Shot lists, audits, imports, synchronization, and record retrieval unfiltered.
- Removed all analytical dependencies on Airtable identity.

### Verified

- Route-inventory tests check every analytical route for the shared condition.
- The same tests reject any analytical `airtableRecordId IS NOT NULL` requirement.
- Database integration tests verify true, false, and null eligibility behavior.
- Excluded shots remain stored but do not change analytical counts or averages.

### Unresolved

- Bean and Bag response naming still uses existing `shotCount` fields. A future contract revision may make raw and analytical count labels more explicit.

### Assumptions

- Null eligibility means unknown/not eligible and is excluded until explicitly resolved.

## 8. Active-Bag Isolation Verification

**Status:** Complete and locally verified.

### Changed

- Active Bags no longer need Airtable identity.
- The latest comparison shot is selected only from eligible shots belonging to the active Bag.
- The reference pool contains only eligible manual Reference Shots from that same Bag.
- Same-bean, global-reference, rating-based, and top-rated fallbacks remain unavailable to Current Shot vs Reference.
- Broader timing-window evidence remains separately named and does not enter the comparison pool.

### Verified

- Database integration fixtures include two Bags, excluded references, local shots, Airtable shots, and newer cross-Bag references.
- The latest eligible active-Bag shot is selected correctly.
- Only the eligible active-Bag manual reference enters the reference pool.
- Static route assertions ensure the comparison pool is assigned directly from active-Bag references without fallback logic.

### Unresolved

- No browser-level screenshot test was added for the insufficient-reference presentation; the existing component state continues to compile and build.

### Assumptions

- Separately labelled timing windows may use broader evidence, but Current Shot vs Reference may not.

## 9. Integration Test Foundation

**Status:** Complete locally; CI execution remains to be enabled in the deployment environment.

### Changed

- Added an embedded PostgreSQL-compatible test dependency.
- Added migration, rollback, conflict, CSV import, Hopper import, baseline import, Airtable mapping, API contract, eligibility, analytical inventory, and active-Bag isolation tests.
- Added a root `test:phase1.5` command.
- Kept tests independent from production credentials and production data.

### Verified

- 16 integration/contract tests pass.
- Workspace typecheck passes for libraries, API server, Coffee Log UI, mockup sandbox, and scripts.
- OpenAPI generation passes.
- Production API and frontend builds pass.
- `git diff --check` passes.

### Unresolved

- The project does not currently include a checked-in CI workflow that invokes `test:phase1.5`.
- Live Airtable and production PostgreSQL rehearsals require deployment credentials and an anonymized database snapshot.

### Assumptions

- Embedded PostgreSQL-compatible tests provide repeatable development coverage but do not replace final validation on the deployed PostgreSQL version.

# Phase 1.5 Completion Gate

**Overall status:** Locally complete; external deployment verification pending.

| Gate | Status |
|---|---|
| Repeatable forward and rollback migrations | Passed locally |
| Current and historical Shot CSV imports | Passed |
| Hopper and baseline imports | Passed |
| Airtable mapping and evidence preservation | Passed with fixtures; live sync pending |
| OpenAPI/runtime contract agreement | Passed |
| Lossless current-evidence multi-select handling | Passed |
| Local-shot analytical participation | Passed |
| Include in Analysis enforcement | Passed |
| Active-Bag Current Shot vs Reference isolation | Passed |
| Integration tests | 16 passed |
| Workspace typecheck | Passed |
| Production build | Passed with existing warnings |
| Production PostgreSQL rehearsal | Pending |
| Live Airtable dry run | Pending |

## Remaining Blockers

1. `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` are unavailable, so a live Airtable metadata and synchronization comparison could not be performed.
2. No anonymized production/Replit PostgreSQL snapshot or deployment `DATABASE_URL` is available for final forward/rollback rehearsal.
3. The deployment CI environment has not yet been configured to run `pnpm test:phase1.5`.

## Files Changed Summary

- Database: Shot and Hopper schemas, sync-evidence schema, forward/rollback migration, schema exports.
- API server: Airtable, Shot, Dashboard, Bean, Bag, Insights and Hopper routes; eligibility, CSV, Airtable mapping, response-shaping and Hopper import helpers.
- API contract: OpenAPI specification, generated React client, generated Zod validators and generated model types.
- UI: Dashboard Flow Time/reference presentation, Quick Log, Full Shot Form and Shot List.
- Tests: migration, Airtable mapping, CSV/Hopper/baseline import, API contract, eligibility and active-Bag analytics.
- Tooling: embedded PostgreSQL-compatible test dependency and root Phase 1.5 test command.
- Documentation: Phase 1 documentation set and this completion record.

## Test, Build and Typecheck Summary

- Phase 1.5 tests: **16 passed, 0 failed**.
- OpenAPI generation: **passed**.
- Workspace typecheck: **passed**.
- API production build: **passed**.
- Coffee Log production build: **passed**.
- Mockup production build: **passed**.
- Existing frontend warnings remain for unresolved component source maps and a JavaScript chunk larger than 500 kB.

## Phase 2 Recommendation

**Not ready to begin Phase 2 yet.**

The local code and test foundation is stable, but the two source-of-truth deployment checks remain mandatory:

1. Run a live Airtable dry synchronization and reconcile every table/field count and evidence snapshot.
2. Apply, verify, roll back, and reapply the migration against an anonymized production/Replit PostgreSQL snapshot.

After both checks pass, Phase 2 should begin with DCI. No intelligence engine was implemented during Phase 1.5.

# Bag Lifecycle Flow UI — 2026-08-24

## Completed

- Added a launch-safe Bag Lifecycle Flow guide to the Bags page.
- Made the current bag workflow explicit: close/reconcile old bag, record maintenance or purge waste, create/select bean, create new active bag, fill/reset hopper phase, then dial in before stable logging.
- Kept this as workflow guidance only. No lifecycle-event table, hopper formula, intelligence engine, prediction, or automatic recommendation logic was introduced.

## Verified

- Workspace typecheck passed.
- Phase 1.5/API test suite passed: 27 passed, 0 failed.
- Render production build passed.

## Assumptions

- The existing closeout dialog remains the launch-safe closeout mechanism until a dedicated lifecycle-event model is approved.
- Maintenance, purge, cleanout, and hopper phase transitions should be visibly guided now but modeled as first-class events later.

## Unresolved

- Dedicated lifecycle-event schema/API/UI remains future work.
- Hopper phase transition behavior still needs final implementation authority before the app mutates or creates hopper phase state from the UI.

# Equipment Defaults Selector UI — 2026-08-24

## Completed

- Replaced free-typed Equipment Defaults fields in Settings with dropdowns backed by saved equipment and accessories.
- Added direct “Add” links beside each default so users can jump to Equipment or Accessories setup when a needed item does not exist yet.
- Preserved existing typed legacy values as selectable options until the user replaces them with saved records.
- Kept the change scoped to Settings UI and launch-safe defaults only.

## Verified

- Workspace typecheck passed.
- Phase 1.5/API test suite passed: 28 passed, 0 failed.
- Render production build passed.

## Assumptions

- Machines and grinders currently have default flags but no active flag, so all saved machines and grinders are shown for now.
- Accessories already have active state, so only active accessories are shown in accessory default selectors.

## Unresolved

- Add links route to the Equipment or Accessories page; they do not yet open a preselected “new equipment” modal.
- Per-user active equipment defaults should be revisited after users/OAuth are implemented.

# Grinder Adjustment Metadata — 2026-08-24

## Completed

- Added grinder-level adjustment metadata so BSE can distinguish stepless, stepped, indexed, or unknown grinders.
- Added grinder setting precision so stepless grinders can be displayed with appropriate decimals without pretending the reading is perfectly exact.
- Added marker increment so grinders with visual marks between whole numbers can record their approximate spacing, such as 0.33.
- Updated the Equipment UI and grinder suggestion flow to collect and display this metadata.
- Preserved Settings grinder defaults as current-use preferences rather than equipment capability records.

## Verified

- Workspace typecheck passed.
- Phase 1.5/API test suite passed: 29 passed, 0 failed.
- Render production build passed.

## Assumptions

- Grinder adjustment type belongs on the grinder record.
- Current/default grind setting and grind time remain in Settings and bag/shot workflows.
- Eureka Mignon Magnifico is treated as stepless with two-decimal display and approximately 0.33 marker spacing, pending user review.

## Unresolved

- Settings does not yet automatically inherit precision/step behavior from the selected grinder.
- Existing production database will need the new additive migration applied during deployment.

# Equipment Default Source Corrections — 2026-08-24

## Completed

- Corrected the Settings defaults summary layout so labels do not wrap awkwardly or hide useful values.
- Added machine-level stock basket support so a machine's included basket can be used as a default without requiring a separate basket accessory record.
- Updated Settings so Default Basket can be selected from machine stock baskets or active basket accessories.
- Updated Settings accessory labels so puck-screen specifications, such as thickness, can appear in default selections.

## Verified

- Workspace typecheck passed.
- Phase 1.5/API test suite passed: 30 passed, 0 failed.
- Render production build passed.

## Assumptions

- Stock basket belongs to the machine record when it is the basket supplied with the machine.
- Puck screen remains an accessory because it is removable workflow equipment.

## Unresolved

- A future add-flow can route directly to a preselected accessory type, such as Add Puck Screen, instead of only routing to the Accessories page.

# Runtime Equipment Schema Guard — 2026-08-24

## Completed

- Added a startup schema guard for additive equipment columns so live Postgres can catch up when Render deploys equipment-field changes.
- Covered grinder adjustment metadata columns and machine stock basket.
- The guard uses `ADD COLUMN IF NOT EXISTS` only and does not overwrite existing data.

## Verified

- Workspace typecheck passed.
- Phase 1.5/API test suite passed: 31 passed, 0 failed.
- Render production build passed.

## Assumptions

- This is a launch-stabilization guard for additive columns, not a replacement for a full migration runner.

## Unresolved

- A formal production migration runner remains the better long-term solution before public release.
