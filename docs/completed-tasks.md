# Phase 1.5 Completed Tasks

This file records implementation evidence for Foundation Stabilization. It does not authorize or describe intelligence-engine implementation.

## Bag/Hopper Lifecycle Plan Reconciliation — 2026-08-25

### Completed

- Reconciled the existing bag/hopper lifecycle plan with current product decisions.
- Documented `Custom` as an approved Hopper phase label.
- Moved `Grinder Cleanout` out of Hopper phase labeling and into lifecycle/workflow event semantics.
- Recorded that same-phase Hopper top-ups should become lifecycle events, not new Hopper rows.
- Added future workflow-method notes for vacuum-packed doses, pour-over, decaf, and guest-drink workflows without implementing them.

### Verified

- Documentation-only change.
- Confirmed the existing lifecycle plan remained the source document rather than creating a duplicate plan.

### Assumptions

- These are documentation decisions only; no schema, API, UI, or hopper formula behavior is implemented by this entry.

### Unresolved

- Lifecycle-event table/API/UI remains future work.
- Direct Hopper-to-Bag relationship consistency still needs schema verification before Hopper UI implementation.
- One-active-Bag database enforcement still requires a safe migration plan.

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

# Quick Log Shelving Decision — 2026-08-25

## Completed

- Removed Quick Log from everyday desktop and mobile navigation.
- Changed the mobile header action to open the primary full `Log Shot` workflow.
- Hid Quick Log field-preference settings from the Settings page.
- Preserved the existing Quick Log route and code as a parked prototype for possible future reinstatement.
- Documented Quick Log as deferred launch scope in the release checklist and product landing-page content.

## Verified

- Workspace typecheck passed.
- API/Phase 1.5 test suite passed: 37 passed, 0 failed.
- Render production build passed.

## Assumptions

- The full shot form is now the preferred mobile and desktop logging workflow.
- A second reduced-entry flow should not be promoted unless users ask for it after launch testing.

## Unresolved

- If Quick Log returns later, it needs a fresh design pass rather than continuing to accumulate fields.

# User-Extensible Drink Types (Affogato) — 2026-08-25

## Completed

- Added `Affogato` to the curated Drink Type list.
- Added user-extensible custom Drink Types: users can add their own from Defaults & Settings via a lightweight inline "Add Drink Type" control on the Default Drink Type field.
- Custom drink types are stored as a JSON array under a `customDrinkTypes` key in the existing generic `/api/settings` key/value store — no new storage mechanism or schema change was needed.
- The Default Drink Type selector and the shot-entry Drink Type dropdown both show curated options plus any user-added custom types.
- Existing/historical `drinkType` values already saved on a shot remain selectable even if they are not in the curated or custom lists (same "preserve saved value" pattern already used for Status, Fault Status, etc.).
- Quick Log was left untouched — it stays shelved and out of primary navigation/Settings, per its 2026-08-25 shelving decision above.

## Verified

- Workspace typecheck passed.
- API/Phase 1.5 test suite passed: 39 passed, 0 failed.
- Render production build passed.

## Assumptions

- A generic settings key/value pair is sufficient for per-user custom drink types at this stage; no dedicated table was needed.
- Users typing a new drink type want it added to their personal option pool immediately, without a separate confirmation step beyond the existing Settings "Save Changes" action.

## Unresolved

- Drink type defaults are not yet machine/equipment-profile aware. The `machines` table has no drink-type field, and adding one was intentionally deferred to avoid an unnecessary schema change for this scoped task. Recommended next step: once equipment profiles need multiple simultaneous defaults (e.g. regular espresso vs. decaf vs. pour-over), add an optional `default_drink_type` text column to `machines` (or a small join table if a machine needs more than one) and surface it in the Equipment Defaults section of Settings.

# Log Shot Serving Context Polish; Machine/Profile Drink Defaults Officially Shelved — 2026-08-25

## Completed

- Fixed a `Drink Type` / `Not Rated` coupling bug in `ShotForm.tsx`: picking a `Drink Type` other than the user's `Default Drink Type` no longer force-sets `Not Rated`. `Drink Type` and `Not Rated` are now fully independent, matching the product decision that they must remain separate.
- Clarified `Log Shot` Serving Context copy: the section description now states that `For Others` suggests `Not Rated` but never changes `Drink Type`, and the `Not Rated` hint now states it does not affect `Include in Analysis`.
- Grouped `Shot Detail`'s serving-context fields (`Drink Type`, `For Others`, `Not Rated`, `Did Not Finish`) into one labeled "Serving Context" block, shown only when at least one of those fields is meaningful, with a one-line reminder that `Not Rated` is independent of `Include in Analysis`. Renamed the previous ambiguous labels (`Rated: No`, `Finished Drink: No`) to the same `Not Rated` / `Did Not Finish` language already used in `Log Shot`.
- Documented that machine/profile-level drink type defaults are officially shelved: updated `docs/csv-data-dictionary.md` (Drink Type, Rated, Finished Shot rows) and `docs/implementation/release-candidate-checklist.md` (Gate 0.5) to state there is one user-level `Default Drink Type` plus user-extensible custom drink types, and that machine/profile-level defaults are deferred until shots can explicitly select a machine/grinder/setup profile and until users/OAuth exist.
- Confirmed no changes were needed to `Settings.tsx` or `selector-options.ts` — the single `Default Drink Type` and `customDrinkTypes` behavior already matched the target design.
- Quick Log was left untouched and remains shelved.

## Verified

- Workspace typecheck passed.
- API/Phase 1.5 test suite passed: 42 passed, 0 failed.
- Render production build passed.

## Assumptions

- Renaming `Shot Detail`'s `Rated`/`Finished Drink` labels to `Not Rated`/`Did Not Finish` (to match `Log Shot`'s own checkbox language) counts as display polish, not a behavior change, since the underlying `shot.rated` / `shot.finishedShot` fields and their conditions were not altered.
- Grouping the four serving-context fields into one visual block on `Shot Detail` is within "smallest safe change" because it only reorganizes existing conditional `DetailItem`s already in the JSX; no new data is read or written.

## Unresolved

- Machine/profile-level drink type defaults remain deferred, per the recommendation already on record above: add an optional `default_drink_type` column to `machines` (or a small join table) only once shots can explicitly select a machine/grinder/setup profile and once equipment/profile selection is actually surfaced in `Log Shot`. Do not implement until users/OAuth and that selector exist.
- `Log Shot` still has no machine or grinder selector at all (`machineId`/`grinderId` exist on `shots` in the DB but are not exposed in the form). This is the actual blocker for any future machine/profile-aware default and should be scoped as its own task before machine/profile drink defaults are revisited.

# Log Shot Numeric Stepper Fix, Dose Correction Clarity, Shot Detail Regrouping — 2026-08-25

## Completed

- Fixed the real numeric-stepper bug: for `Grind Setting` and `Grind Time`, the browser up/down control's placeholder showed a hardcoded fallback (`2.33` / `8.1`) that was never passed into the actual seeding logic when no bag was selected — so clicking the stepper started the increment from 0, not from the displayed number. Confirmed the exact failure mode with an isolated React repro in a real browser (state went to `0.01` instead of `2.34`) before fixing it, and confirmed the fix afterward (state correctly went to `2.34`). Root cause: `ShotForm.tsx` computed `dose`/`yield`/`temperature` defaults through a `bag → settings → hardcoded constant` fallback chain used for both the placeholder and the seed value, but `grindSetting`/`grindTime` only had that chain in the placeholder string, not in the seed call. Added `defaultGrindSetting`/`defaultGrindTime` consts using the same fallback chain (now also reading the existing `settings.defaultGrindSetting`/`settings.defaultGrindTime` Settings keys, which `ShotForm` was not previously reading at all) and used them for both placeholder and seeding.
- Removed `Grind Waste`'s misleading static placeholder (`32.2`), which had no seeding logic and no real computed default — it visually suggested a number the stepper could never reach, matching the same class of bug. There is no bag/settings-derived default for grind waste, so the field now correctly shows no placeholder and starts from 0, matching its true empty state. Did not invent a fabricated default.
- Added matching placeholders to `Target / Basket Dose`, `Yield`, and `Temp`, which already seeded correctly on stepper click but showed no visual default at all (inconsistent with `Grind Setting`/`Grind Time`/`Initial Grinder Output`/`Top-Up Grind Added`/`Top-Up Time Adj`, which all show one). Purely additive; no behavior change since seeding already worked for these three.
- Confirmed all requested numeric increments already matched the target step sizes (Pour Delay/Pour Time/Flow Time: 1; Rating/Preference Rating: 0.05; Dose/Yield/Initial Grinder Output/Top-Up Grind/Grind Waste: 0.1; Grind Time/Top-Up Time Adj: 0.1) — no `step` attributes needed to change.
- Left `Grind Setting`'s precision (`step="0.01"`) unchanged. `grinders` already has per-grinder `grindSettingPrecision`/`grindStepIncrement` columns, but `Log Shot` has no grinder selector, so there is no way to know which grinder's precision applies at shot-entry time. Documented as a limitation rather than guessed at.
- Clarified dose-correction labels/help text on `Log Shot` without changing any formula: added one-line captions to `Initial Grinder Output` ("before basket correction — not the final basket dose") and `Target / Basket Dose` ("final dose that ends up in the basket, after any top-up or trim"). `Top-Up Grind Added`'s and `Grind Waste`'s existing help text already matched the target wording and were left unchanged.
- Restructured `Shot Detail`'s single "Recorded Grind / Waste Event" box into two separate, independently-conditional sections: `Dose Correction` (Correction Type, Top-Up Grind Added, Top-Up Time Adj, Over-Grind Removed — shown only when a real correction or its inputs are recorded) and `Grinder / Workflow Event` (Event Type, Purge/Setup Waste — shown only when recorded). `doseCorrectionType`/`doseCorrection` were computed and stored on shots already but were never previously displayed anywhere in `Shot Detail`. Added an "Extraction Details" subheading above the existing extraction grid for consistency with the other four labeled groupings (`Extraction Details`, `Dose Correction`, `Grinder / Workflow Event`, `Serving Context`) without moving any fields out of that grid.
- Updated `docs/csv-data-dictionary.md` (Initial Output, Dose, Time Adj, Top-Up Grind, Over Grind Removed, Grind Waste, Dose Correction Type rows) to state the same label meanings and the existing grind-minimum-time/0.2s top-up fallback behavior, without inventing new formulas.

## Verified

- Workspace typecheck passed.
- API/Phase 1.5 test suite passed: 42 passed, 0 failed (no test changes were needed — this was a source/UI/docs fix, not new behavior requiring new coverage).
- Render production build passed.
- The stepper bug and its fix were each independently reproduced and confirmed live in a real Chrome tab using an isolated React repro of the exact `seedSuggestedNumber` pattern (not just read through statically), before and after the code change.

## Assumptions

- `2.33` and `8.1` (the pre-existing hardcoded placeholder fallbacks for `Grind Setting`/`Grind Time`) are acceptable last-resort constants to keep as the final fallback in the new `bag → settings → constant` chain, since they were already the values shown to users before this fix and are not new invented numbers.
- Adding placeholders to `Target / Basket Dose`/`Yield`/`Temp` (fields that already seeded correctly but showed nothing) is in scope as part of "the input should actually hold that value" — a visible default is part of a user actually seeing/trusting the value the stepper will use.
- The "Extraction Details" subheading is cosmetic-only (a `<p>` label wrapping the existing grid in one extra `<div>`); no `DetailItem`s were added, removed, or moved between sections other than the deliberate Dose Correction / Grinder Workflow Event split.

## Unresolved

- `Grind Setting` precision/step still cannot be equipment-aware (fixed at `0.01`) because `Log Shot` has no grinder selector to know which grinder's `grindSettingPrecision`/`grindStepIncrement` applies. This is the same underlying gap already on record above (no machine/grinder selector in `Log Shot`) and should be resolved together with it, not patched separately.
- `Grind Waste` still has no real computed default (no `settings.defaultGrindWaste` or equivalent exists) — its field is now honestly empty rather than misleadingly pre-filled-looking, but there is no "smart" default to offer here yet.

# Mobile-Friendly Number Controls For Log Shot — 2026-08-25

## Completed

- Added a reusable `NumberStepper` component to `ShotForm.tsx` (`−  value  +`) built on the existing, previously-unused `InputGroup`/`InputGroupAddon`/`InputGroupButton`/`InputGroupInput` primitives in `components/ui/input-group.tsx`, so no new UI primitives were introduced. Native number-input spin buttons are hidden via `appearance:textfield` (and the WebKit inner/outer spin-button selectors) so there is exactly one set of increment controls on any platform, not a redundant native+custom pair on desktop.
- Applied it to all 13 requested `Log Shot` fields: Grind Setting, Grind Time, Initial Grinder Output, Top-Up Grind Added, Top-Up Time Adj, Target/Basket Dose, Pour Delay, Pour Time, Flow Time, Yield, Temp, Rating, and Preference Rating — using the exact increments specified (0.01 / 0.1 / 1 / 0.05 as applicable) and respecting existing min/max (Rating 0–10, Preference Rating 0–11). `Grind Waste` was intentionally left as a plain input — it was not in the requested field list.
- The +/- buttons compute their own base value (`current field value → suggested/default value → 0`) directly in JS rather than relying on any native browser stepper behavior, so they are not subject to the earlier native-spinner seeding race condition at all — a strictly more robust mechanism than the desktop-only fix from the previous session. Confirmed the resulting layout visually (a static render of the exact class/DOM structure against the real production CSS) before finishing: renders as a clean `−  18  +` row with no visual bulk.
- For Rating/Preference Rating specifically, kept the existing Slider (still useful for touch drag) alongside the new stepper, replacing only the small plain number input that sat beside it.
- Found and fixed a latent type-safety gap this change would otherwise have exposed: `NumberStepper` preserves raw typed strings while the user is typing (matching the pre-existing behavior of the plain inputs it replaces, which avoids the input fighting a user typing a trailing "." or "0"), but Rating/Preference Rating's own display code called `.toFixed()` directly on `field.value` and fed it straight into the Slider's `value` prop, both of which assumed a number. Added a small `asNumber()` helper and used it at all four call sites so display/Slider math is safe regardless of whether the field currently holds a string or a number.
- Preserved all existing validation and submit behavior: `NumberStepper`'s typing path stores the same raw value shape RHF/zod already expected before this change, and `onSubmit` still runs through the existing `zodResolver`/`z.coerce.number()` path unchanged.
- Did not touch Quick Log, schemas, APIs, migrations, or add any machine/grinder selector or equipment-aware precision.

## Verified

- Workspace typecheck passed.
- API/Phase 1.5 test suite passed: 42 passed, 0 failed (no test changes needed — this is a UI control swap with no behavior/contract change).
- Render production build passed.
- Visually confirmed the composed stepper's rendering (icons, spacing, hidden native spinner) using the actual built CSS in a real Chrome tab, since this session introduced genuinely new UI rather than only fixing existing logic.

## Assumptions

- Reusing the existing (previously unused anywhere in the app) `InputGroup*` primitives satisfies "create or reuse a small number-control component" better than writing bespoke markup, since it stays consistent with the app's established shadcn component system.
- Hiding the native number-input spinner is in scope of "keep it clean and not visually bulky" — showing both native and custom controls side by side on desktop would be redundant and cluttered.
- Rounding increments to the step's own decimal precision (e.g. 0.01 steps round to 2 decimals) prevents floating-point drift (e.g. `18 + 0.1 + 0.1 = 18.2`, not `18.199999999999996`) without inventing a new precision rule — it mirrors the step values already specified.

## Unresolved

- None new. The existing `Grind Setting` equipment-precision limitation and the missing `Log Shot` machine/grinder selector (both logged above) are unchanged by this session.

# Bag Lifecycle + Hopper Workflow Planning — 2026-08-25

## Completed

- Extended `docs/implementation/bag-hopper-lifecycle-plan.md` (previously last updated 2026-08-24) with the launch-scope planning structure requested for bag lifecycle, hopper refill/phase switching, bag closeout, and maintenance workflow, without re-deciding or contradicting anything already recorded there.
- Added `## Field and Data Requirements by Workflow`: for each launch workflow (open new bean/bag, dial-in, log normal shot, log grind change/purge waste, hopper refill/phase transition, close out bag, maintenance between bags), listed existing fields/tables likely used (verbatim from `docs/csv-data-dictionary.md`/`docs/field-type-map.md`), missing fields, fields that should stay future/deferred, and unresolved dependencies.
- Added `## UI Flow Recommendations` covering a beginner path, power-user path, hopper dosing path, single-dosing path, and mobile-first considerations, all launch-safe (no new schema implied).
- Added `## Analytics Protection` explaining how each workflow avoids polluting `Include in Analysis`, ratings, `Reference Shot`/`Signature Shot`, bag averages, and hopper/bag remaining calculations.
- Added `## Future Development Notes` documenting (without implementing) System Phases, brew curves, Bluetooth scale, equipment-aware advice, AI-guided onboarding interview, user-specific workflow methods, and community/equipment library implications.
- Surfaced one new documentation-consistency issue during this pass (recorded as unresolved below) rather than resolving it by inventing an answer.
- Did not touch any application code, schema, API, migration, or test files. Did not touch `ShotForm.tsx` or the separate mobile number-control task (confirmed already complete and unrelated, per the "Mobile-Friendly Number Controls For Log Shot — 2026-08-25" entry above). Did not implement DCI, OSI, HMI, BLI, MSI, or GSP. `docs/implementation/README.md` already links `bag-hopper-lifecycle-plan.md`, so no change was needed there.

## Verified

- Docs-only change; no build, typecheck, or test run applies.
- Confirmed `docs/implementation/bag-hopper-lifecycle-plan.md` contains the new sections and an updated `Last updated: 2026-08-25` date.
- Confirmed `docs/implementation/README.md`'s existing "Bag and Hopper Lifecycle Plan" link (pointing at the same file) already covers this update; no edit needed there.

## Assumptions

- Extending the existing plan file in place is correct rather than creating a second competing document, since the existing file already covers domain boundaries, the 8 launch workflows, hopper phase-label recommendations, the System Phase model, the proposed lifecycle-event data model, implementation order, and non-goals.
- Field names and unresolved-status claims in the new sections were taken only from the previously reviewed source docs (`docs/table-relationships.md`, `docs/field-type-map.md`, `docs/csv-data-dictionary.md`, `docs/intelligence-engine-map.md`, `docs/architecture/equipment-capability-library-model.md`, `docs/implementation/release-candidate-checklist.md`) and the existing plan file itself — no formulas, schema, or field behavior were invented.

## Unresolved

- New: `docs/implementation/bag-hopper-lifecycle-plan.md`'s "Current finding" section states `hoppers` already has a `bag_id` column, but `docs/table-relationships.md` states "No Bag relationship is inferred from Hopper names when the source export does not provide one" and its confirmed-relationship table has no `Bag → Hopper` row. This should be verified against the live schema before any UI work assumes a direct Hopper→Bag link is authoritative.
- Carried forward from the existing plan (not resolved by this pass): whether `Custom` replaces `Grinder Cleanout` as a Hopper phase label (plan already recommends yes, not yet implemented); whether same-phase hopper top-ups should create lifecycle events instead of new Hopper rows (recommended yes, not yet implemented); the lifecycle-event table itself does not exist yet (Phase E of the plan's implementation order); the Hopper percentage formula remains source-owned and unapproved for local calculation; whether one active Bag should be enforced globally in the database (recommended yes, not yet implemented).

# Mobile Stepper UI Refinement For Log Shot — 2026-08-25

## Completed

- Toned down the `NumberStepper` control added in the previous session: the −/+ buttons are now `text-muted-foreground/60 opacity-70` by default and reach full opacity/color on `hover`, `focus-visible`, and `group-focus-within` (tapping/typing into the input itself now also reveals full-strength controls, not just hovering a button directly). Touch target size (button padding/height) was left unchanged — only color/opacity changed — so tap targets did not shrink.
- Per explicit user decision (asked directly rather than assumed, since the brief left it as an optional judgment call): reverted `Temp` and `Target / Basket Dose` from the stepper back to plain `<Input type="number">` fields (placeholder + seed-on-focus/pointerdown, same pattern used before steppers existed). The other 11 fields (Grind Setting, Grind Time, Initial Grinder Output, Top-Up Grind Added, Top-Up Time Adj, Pour Delay, Pour Time, Flow Time, Yield, Rating, Preference Rating) keep the stepper with all increment/min/max values unchanged from the previous session.
- No behavior change to the stepper's value logic (`adjust()`, `asNumber()`, seeding) — this was purely a visual/CSS + field-selection change.
- Did not touch Quick Log, schemas, APIs, migrations, dose-correction formulas, or Reference/Signature/Sour flag behavior.

## Verified

- Workspace typecheck passed.
- API/Phase 1.5 test suite passed: 42 passed, 0 failed (no test changes needed — visual-only change plus a revert to a previously-existing input pattern).
- Render production build passed.
- Visually confirmed both states (default vs. simulated focus-within) using the actual production CSS in a real Chrome tab: default state renders as a visibly muted `−  18  +`, focus state renders at full opacity with the existing focus ring, and the reverted Temp/Dose fields render as ordinary plain inputs.

## Assumptions

- Whether to keep or drop the stepper on Temp/Dose was asked directly to the user rather than guessed, since the brief explicitly framed it as an "only if it noticeably improves clarity" judgment call — user chose to revert both to plain inputs.
- `opacity-70`/`hover:opacity-100`/`group-focus-within:opacity-100` is a reasonable middle ground between "close to a regular clean input" and "still obvious enough for touch users" — no numeric contrast/accessibility audit was run.

## Unresolved

- None new. Same outstanding items as the previous session (equipment-aware `Grind Setting` precision, missing `Log Shot` machine/grinder selector).

# Log Shot Equipment Selectors + Active Hopper Status — 2026-08-25

## Completed

- Added optional Machine and Grinder selectors to the Log Shot setup card, wired to the existing `shots.machineId` and `shots.grinderId` fields.
- New shots now default to saved default equipment when available, while existing shots retain their previously saved equipment selection on edit.
- Kept machine/profile-level Drink Type defaults deferred. The new equipment selectors expose already-existing shot relationships only; they do not add machine-level drink-default behavior.
- Added a read-only Active Hopper Status panel to the dashboard using existing Hopper records linked to the active bag.
- Added a compact active Hopper phase badge to active rows on the Bags page.

## Verified

- Workspace typecheck passed.
- API test suite passed: 42 passed, 0 failed.
- Render production build passed.

## Assumptions

- Exposing existing Machine and Grinder relationships in Log Shot is launch-safe and does not contradict the previous deferral of machine/profile-level Drink Type defaults.
- The dashboard hopper status is display-only and uses existing Hopper fields; no hopper formulas, phase-transition behavior, or HMI logic were introduced.

## Unresolved

- Equipment-aware Grind Setting precision remains future work now that a Grinder selector exists.
- Machine/profile-level Drink Type defaults remain deferred until they are scoped separately.
- Clearing already-set optional shot fields to null may still need a PATCH/serialization fix; this was reported by the implementation agent and was not changed here.
