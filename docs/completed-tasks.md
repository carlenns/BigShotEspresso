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

# Shot Detail Machine/Grinder Display — 2026-08-25

## Completed

- Added Machine and Grinder to the Extraction Details grid on `ShotDetail.tsx`, next to Grind Setting / Grind Time / Initial Grinder Output, using the same `DetailItem` component and conditional-render style already used for other optional fields in that grid.
- Each is shown only when the shot has a `machineId`/`grinderId` and a matching equipment record is found; absent values render nothing (no placeholder noise), matching the requirement.
- Labels use the existing fallback order already established in `ShotForm.tsx`/`Settings.tsx`: `shortLabel` → `name` → `brand`/`model` join → `"Unnamed"`.
- The shot detail API response (`GET /shots/:id`) only returns the raw `machineId`/`grinderId` FKs, no joined equipment name — confirmed via `artifacts/api-server/src/lib/api-shapes.ts` and the `select()` in `artifacts/api-server/src/routes/shots.ts`. Rather than changing that API/schema (out of scope), `ShotDetail.tsx` now also queries the existing `/api/equipment/grinders` and `/api/equipment/machines` endpoints (already used by `ShotForm.tsx`/`Settings.tsx`, no new endpoints) and resolves the label client-side.
- No schema, migration, API, OpenAPI, Quick Log, intelligence, auth, payments, Airtable sync, or predictive-logic changes.
- No machine/profile-level Drink Type defaults or equipment-aware grind precision added — display only.

## Verified

- `CI=true pnpm run typecheck` — passed (all 4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 42 passed, 0 failed (no test changes needed).
- `CI=true pnpm run build:render` — passed.
- Manual smoke test against the live dev DB (read-only, no data mutated): viewed an existing shot with both `machineId`/`grinderId` set (id 241) and confirmed "Profitec Go" / "Eureka Mignon Magnifico" render correctly in the grid; viewed an existing shot with neither set (id 243) and confirmed no Machine/Grinder rows appear at all.

## Assumptions

- Reusing the already-existing `/api/equipment/grinders` and `/api/equipment/machines` endpoints client-side (rather than adding a join to `GET /shots/:id`) is the correct "no API/schema change" interpretation of the brief, since those endpoints already exist and are already used elsewhere in the frontend for the same purpose.
- If an equipment record referenced by `machineId`/`grinderId` no longer exists in the fetched list (e.g. deleted equipment), the row is simply omitted rather than showing a raw ID or an error — treated as equivalent to "absent" for display purposes.

## Unresolved

- None new. Same outstanding items as the previous session (equipment-aware Grind Setting precision, machine/profile-level Drink Type defaults still deferred). The optional-field PATCH-clear-to-null gap noted previously appears to be under active, concurrent fix elsewhere in the working tree as of this session (`ShotForm.tsx` and OpenAPI/generated-client files were mid-edit for it while this task ran) — not verified or touched here.

# Shot Edit Reliability: Cleared Optional Fields Now Persist As Null — 2026-08-25

## Completed

- Root-caused the reported bug precisely: `ShotForm.tsx`'s `onSubmit` built the PATCH payload as `{...values, ...}`, and any optional field the user cleared held `undefined` in `values`. `JSON.stringify` drops keys with `undefined` values entirely, so the PATCH body omitted them, and the server's `db.update(shotsTable).set(data)` (`artifacts/api-server/src/routes/shots.ts`) only touches keys actually present in `data` — the stale Postgres value silently survived the edit.
- Found the API contract itself blocked the correct fix for several fields: `rated`, `isForOthers`, `signatureShot`, `sourShot`, `drinkType`, `tasteZone`, `notes`, `sensoryNotes`, `finishedShot`, `shotClassification`, `beanAchievement`, `expressionStyle` were typed optional-but-not-nullable in `lib/api-spec/openapi.yaml`'s shared `shotWriteProperties` (used by both `ShotInput`/create and `ShotUpdate`), even though the underlying `shots` table columns are all genuinely nullable. Sending an explicit `null` for these would have been rejected with a 400. Widened only these fields to `["<type>", "null"]` (or `oneOf [$ref, {type: "null"}]` for the `StringArray`-typed ones) and regenerated `lib/api-zod`/`lib/api-client-react` via `pnpm --filter @workspace/api-spec run codegen`. `machineId`, `grinderId`, `grindWaste`, `topUpGrind`, `timeAdj`, `overGrindRemoved` were already nullable in the contract — no spec change needed for those. `isReference` was deliberately left non-nullable, matching its `NOT NULL DEFAULT false` column — the client fix excludes it.
- Added `NULLABLE_ON_EDIT_FIELDS` and an `if (isEditing) { ... }` normalization block in `ShotForm.tsx`'s `onSubmit`, converting any still-`undefined` field in that list to an explicit `null` right before the mutate call. This only runs on the edit path — create requests are unaffected (an `undefined` field is still simply omitted on create, unchanged behavior).
- This is safe as a blanket per-submit conversion (not a partial diff) because the edit form already loads and resubmits the *entire* saved shot on every edit (`existingShot` → `form.reset` effect) — there is no "untouched vs. cleared" distinction in this architecture to preserve; `undefined` at submit time always means "this field is empty right now."
- Also fixed the same bug pattern for `grindWaste`/`grindAdjusted`: when the user unchecks "Record grind change / purge waste" on an edit, the existing code `delete`s both keys from the payload rather than sending null — the null-normalization step (edit-only) now converts the resulting missing `grindWaste` key to `null` so an unchecked/cleared grind-waste event actually clears in Postgres. `grindAdjusted` itself was left as-is (still deleted, not nulled) — it wasn't in the task's field list and touching it would have expanded scope; flagged below as a related, still-open gap.
- Added two focused tests to `artifacts/api-server/src/api-contract.test.ts`: one confirms `UpdateShotBody` now accepts `null` for every field in scope while still rejecting `null` for `isReference`; the other confirms `ShotForm.tsx` contains the edit-only null-normalization and that `isReference` is excluded from it.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide, including `lib/api-zod` and `lib/api-client-react` after regeneration).
- `CI=true pnpm --filter @workspace/api-server test` — 44/44 passed, 0 failed (42 pre-existing + 2 new).
- `CI=true pnpm run build:render` — build succeeded.
- Did not run a live manual edit-a-shot-in-the-browser smoke test — no running Postgres-backed app instance was available in this environment. Verified end-to-end via code + contract inspection instead: traced the exact `undefined` → `JSON.stringify` drop → `.set(data)` partial-update chain, confirmed the OpenAPI/zod/DB nullability now line up for every field in scope, and added regression tests asserting both the contract and the client-side normalization exist.

## Assumptions

- Widening `shotWriteProperties` (the shared YAML anchor between `ShotInput` and `ShotUpdate`) rather than duplicating a separate nullable-only block for `ShotUpdate` is safe for "preserve create behavior": allowing an *additional* valid input (`null`) alongside the existing valid one (omitted) doesn't change what a create request currently sends or means, and the client's null-normalization is explicitly gated to `isEditing` so create payloads are byte-for-byte unchanged.
- `overGrindRemoved` needed the same treatment even though it isn't a raw form field — it's produced only by `calculateDoseCorrection`'s return value, which omits it entirely (not `null`) when no correction applies (e.g. the user clears `Initial Grinder Output`). Handled it as a one-off `if (payload.overGrindRemoved === undefined) payload.overGrindRemoved = null;` alongside the main loop rather than folding it into `NULLABLE_ON_EDIT_FIELDS` (it isn't a `FormValues` key).
- `rating`/`preferenceRating` were intentionally left out of `NULLABLE_ON_EDIT_FIELDS` — not in the task's field list, and the existing `if (values.rated === false) { payload.rating = null; payload.preferenceRating = null; }` logic already covers their one real clearing path.

## Unresolved

- `grindAdjusted` has the identical delete-instead-of-null bug as `grindWaste` (same `else { delete payload.grindWaste; delete payload.grindAdjusted; }` block) but was left untouched since it wasn't in the task's explicit field list — worth a follow-up if grind-event history editing turns out to matter.
- No live browser smoke test of an actual edit-and-clear round trip against a running Postgres instance — recommend one before this ships, since this session could only verify via static contract/code inspection.
- The OpenAPI/codegen diff touches several generated files (`lib/api-zod/src/generated/**`, `lib/api-client-react/src/generated/**`) beyond `ShotForm.tsx` itself — worth a quick reviewer skim to confirm the regenerated output only changed nullability for the intended fields (it does, per this session's inspection, but a second look is cheap).

# Shot Edit Reliability: grindAdjusted Now Clears On Edit — 2026-08-25

## Completed

- Closed the one gap deliberately left open by the previous fix: `grindAdjusted` (the "Grind change / purge waste" event-type text field) had the identical bug as `grindWaste` did before — `ShotForm.tsx` explicitly `delete`s `payload.grindAdjusted` when the user unchecks "Record grind change / purge waste" on an edit, which meant a previously-recorded event type stayed stale in Postgres instead of clearing.
- Same two-layer fix as before: (1) `lib/api-spec/openapi.yaml`'s shared `shotWriteProperties.grindAdjusted` was still `{ type: string }` (optional-but-not-nullable) even though the `shots.grind_adjusted` DB column is nullable — widened to `{ type: ["string", "null"] }` and regenerated `lib/api-zod`/`lib/api-client-react` via `pnpm --filter @workspace/api-spec run codegen`. (2) Added `if (payload.grindAdjusted === undefined) payload.grindAdjusted = null;` to `ShotForm.tsx`'s existing edit-only normalization block, right after the `overGrindRemoved` one-off it already mirrors. `grindAdjusted` isn't a `FormValues` key (it's set programmatically from the `recordGrindWaste` checkbox state, not part of the zod form schema), so it couldn't be added to `NULLABLE_ON_EDIT_FIELDS` and needed its own one-off check exactly like `overGrindRemoved`.
- Did not touch the existing `delete payload.grindWaste; delete payload.grindAdjusted;` block itself — both deletes still run first (preserving `grindWaste`'s prior fix and not changing when/why the delete happens), and the edit-only fallback below it now turns the resulting missing `grindAdjusted` key into an explicit `null`, same as it already did for `grindWaste` (which is in `NULLABLE_ON_EDIT_FIELDS`).
- No changes to dose-correction logic, `calculateDoseCorrection`, schema, migrations, or create behavior.
- Extended (not duplicated) the two existing regression tests in `artifacts/api-server/src/api-contract.test.ts`: the contract test now also asserts `UpdateShotBody` accepts `grindAdjusted: null`; the source-inspection test now also asserts the new `payload.grindAdjusted` fallback exists and that the delete-both-keys line is still present (i.e. `grindWaste`'s clearing behavior wasn't disturbed).

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide, including regenerated `lib/api-zod`/`lib/api-client-react`).
- `CI=true pnpm --filter @workspace/api-server test` — 44/44 passed, 0 failed (both regression tests extended in place, no new test count change).
- `CI=true pnpm run build:render` — build succeeded.
- Not run: live browser edit-and-clear smoke test — same environment limitation as the previous session (no running Postgres-backed instance available). Verified via the same code/contract-trace method as before plus the extended regression tests.

## Assumptions

- `grindAdjusted`'s only legitimate values today are `null` (no event) or the literal string `"Grind change / purge waste"` (set by the checkbox) — no other value is ever written by the client, so widening its nullability doesn't open up any new selector/value surface.
- Leaving the delete-both-keys line untouched (rather than removing the `delete payload.grindAdjusted;` and relying solely on the new fallback) was the smaller, safer diff — the fallback already produces the identical end result (`null`) whether the key was deleted or never set, so there was no behavioral reason to also change that line.

## Unresolved

- Same as before: no live Postgres-backed browser smoke test performed in this session; recommended before shipping.
- No other known instances of this bug pattern remain in `ShotForm.tsx`'s submit path as of this session's inspection.

# Bag Lifecycle Slice: Start Hopper Phase — 2026-08-25

## Chosen hopper name format

`Bag #{bagNumber} — {phase} — {YYYY-MM-DD}`, e.g. `Bag #12 — Phase 2 — 2026-08-25` — exactly the format suggested in the task brief. `{bagNumber}` falls back to the bag's numeric `id` if `bagNumber` is unset (matching the existing display convention already used elsewhere on this page, e.g. `#{bag.bagNumber ?? bag.id}`). `{phase}` is always one of the six approved labels (never free text, see below).

## Completed

- Added a "Start Hopper Phase" action, visible only on active bags in `artifacts/coffee-log/src/pages/Bags.tsx`, next to the existing "Close" action. Opens a dialog (same `Dialog`/`DialogContent max-w-md max-h-[90vh] overflow-y-auto` pattern already used by the Closeout dialog on this page).
- Dialog fields: Phase (`Select`, restricted to `HOPPER_PHASE_OPTIONS = ["Phase 1", "Phase 2", "Phase 3", "End of Bag", "Single Bag Phase", "Custom"]` — `Grinder Cleanout` is explicitly not offered, per `docs/implementation/bag-hopper-lifecycle-plan.md`'s resolved decision that it's a lifecycle/workflow event type, not a Hopper phase), Starting Beans / Phase Baseline (g, optional numeric), Notes (optional). A "Custom Phase Label" field appears only when Phase = Custom.
- Validation: if Phase = Custom, either the Custom Phase Label or Notes must be non-empty (checked in the mutation before the request is sent, mirroring this file's existing pattern of validating inside `mutationFn` and throwing to trigger `onError`). The `phase` value sent to the API is always one of the six approved literal labels — it is never overwritten with free text, keeping phase evidence structured. A typed custom label is instead folded into `notes` as `"Custom: {label}."` so the elaboration is preserved without polluting the approved-label field.
- On submit: `POST /api/hoppers` (existing endpoint, no API/schema changes) with `{ name, bagId, isActive: true, phase, startingBeans?, notes? }`. Relies entirely on the existing, already-transactional "deactivate any other active hopper for this bag" behavior in that route — no new logic was added server-side. `hopperMass`, `hopperPercent`, and `shotsLeftEstimate` are never set from the client (they're `readOnly` in the API contract, computed elsewhere) — no hopper formula was implemented or invented.
- Non-blocking warning: if more than one bag is currently active (`activeBags.length > 1`), the dialog shows an amber informational banner. It does not disable the Start Phase button and no hard one-active-bag database rule was added, per the explicit requirement.
- Explanatory copy in the dialog states hopper phases are "a measured operating window ... not a count of every bean physically left in the hopper or bag" and that "unmeasured leftover beans can be intentionally left out of this baseline," per the required UI copy.
- Updated one existing sentence in the page's "Bag Lifecycle Flow" card (`Launch-safe note: ...`) to reflect that starting a hopper phase is now available today, not just closeout — small copy-only change, kept the "Dedicated lifecycle events..." phrase the existing regression test asserts on.
- Added one new regression test to `artifacts/api-server/src/api-contract.test.ts` asserting: the approved-only phase list (and absence of "Grinder Cleanout"), the Custom-requires-label-or-notes check, reuse of the existing `POST /api/hoppers` endpoint with `isActive: true`, the exact documented name format, the non-blocking (not `disabled`-gated) multi-active-bag warning, and the required explanatory copy.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide).
- `CI=true pnpm --filter @workspace/api-server test` — 45/45 passed, 0 failed (44 pre-existing + 1 new; the two prior "Shot Edit Reliability" tests are unaffected since this task touched neither the API contract nor `ShotForm.tsx`).
- `CI=true pnpm run build:render` — build succeeded.
- Not run: a live Postgres-backed browser smoke test of actually starting a phase, seeing the Dashboard/Bags-badge hopper status update, and confirming a same-day duplicate phase name is handled gracefully — no running app instance was available in this environment, same limitation as the previous two sessions. Verified via source/contract inspection and the new regression test instead.

## Assumptions

- The `hoppers.name` column has a database-level `UNIQUE` constraint (confirmed by reading `lib/db/src/schema/hopper.ts`). If a user starts the same phase for the same bag twice on the same day, the second `POST /api/hoppers` will fail with a Postgres unique-violation, surfaced via this page's existing generic `onError: (e) => toast({ ..., description: String(e) })` pattern (same as `saveMutation`/`closeBagMutation` already do for their own errors) — not a new failure mode, just an un-prettified one. Not specially handled, since inventing retry/dedup logic wasn't requested and would have expanded scope.
- A typed Custom label is stored in `notes` (prefixed `"Custom: {label}."`) rather than replacing the `phase` value, so that `phase` always remains one of the six approved literal strings — interpreted "Use only approved Hopper phase labels" as a hard constraint on the `phase` column specifically, not on where elaborating text can live.
- "Another bag is already active" was read as "more than one row in `bags` currently has `isActive = true`" (the documented, currently-unenforced invariant), not anything about hoppers.

## Unresolved

- No live smoke test performed (see above) — recommend one before shipping, specifically confirming the Dashboard "Active Hopper Status" panel and the Bags-page phase badge (both built in an earlier session) correctly pick up the newly-created hopper row without any further changes needed (they should, since both already key off `useListHoppers()` filtered by `isActive && bagId`).
- Same-day duplicate-phase-name collisions are not specially handled (see Assumptions) — low risk, but worth deciding whether a friendlier error message is warranted later.
- Hopper top-up and lifecycle-event workflows remain explicitly out of scope, per the task boundary and the standing plan document.

# Bag/Hopper Lifecycle Work Package: Start Hopper Phase UX, Status Cues, Closeout Copy — 2026-08-25

## Completed

### 1. Start Hopper Phase UX
- **Mobile**: `BagRow`'s action row now wraps (`flex flex-wrap items-center gap-3`) instead of forcing everything into one unbreakable row, and the outer bean-info/actions split stacks vertically below `sm` (`flex flex-col sm:flex-row`). Shortened the trigger button label from "Start Hopper Phase" to "Start Phase" so it doesn't crowd the row next to "Close" and the edit/chevron icon buttons — the dialog title itself still reads "Start Hopper Phase" in full. The dialog's own layout (`max-w-md max-h-[90vh] overflow-y-auto`, single-column stacked fields, `DialogFooter`'s existing `flex-col-reverse sm:flex-row` stacking) was already mobile-safe from the prior session and needed no change.
- **Prefill**: Starting Beans / Phase Baseline is now prefilled from `bag.bagWeight` only when this is genuinely the bag's *first* hopper phase (`!hoppers.some(h => h.bagId === bag.id)`) and `bagWeight` is known. This is the only case where "safe and obvious" holds — once a bag already has phase history, BSE has no tracked figure for how much was actually depleted between phases, so guessing would misrepresent evidence. Editing the field (or opening the dialog when the prefill condition doesn't hold) clears/skips the prefill and shows different helper text explaining why nothing was filled in.
- Preserved the approved-phase-only list and the exact `Bag #{bagNumber} — {phase} — {YYYY-MM-DD}` name format unchanged from the previous session.

### 2. Active bag / hopper status cues (Bags page)
- Active-bag visibility (the `Active` badge + `border-primary/50 bg-primary/5` card styling) already existed from an earlier session and was left as-is — it already reads as "obvious."
- New: when an active bag has **no** active hopper phase, `BagRow` now shows an inline, non-blocking cue — `"No active hopper phase — start one"` as a small dotted-underline text button in the badge row — that opens the same Start Hopper Phase dialog `onStartPhase` already wires up. It's plain inline text, not a disabled/blocking control, and sits right where the `Hopper: {phase}` badge would otherwise appear.

### 3. Bag closeout copy
- Expanded the single-sentence amber note in the Close Out Bag dialog into four short lines explicitly covering: (a) the closed-out date marks the bag inactive, (b) the remaining-beans estimate is reconciliation evidence only and does not rewrite past shot consumption, (c) closeout notes are saved to the bag record, and (d) maintenance/purge-waste/hopper-cleanout are not yet their own lifecycle events, and that closing a bag does **not** automatically close its active hopper phase. No new fields were added — same three existing inputs (`closedOutDate`, `remainingEstimate`, `reconciliationNotes`) feed all four points.

### 4. Documentation
- No wording gap found in `docs/implementation/bag-hopper-lifecycle-plan.md` that this package's changes contradict or require updating — the prefill behavior is a literal copy of `bagWeight` (no formula/calculation), consistent with the plan's "do not calculate hopper percentage locally until the formula is approved" rule. Left that file untouched.
- Added one new regression test to `artifacts/api-server/src/api-contract.test.ts` covering the prefill condition, the non-blocking status cue, the four closeout-copy points, and the mobile wrap classes.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide).
- `CI=true pnpm --filter @workspace/api-server test` — 46/46 passed, 0 failed (45 pre-existing + 1 new).
- `CI=true pnpm run build:render` — build succeeded.
- Not run: a live Postgres-backed browser smoke test (same environment limitation as every prior session in this thread — no running app instance available). Verified via source inspection and the new regression test instead. Recommend confirming the mobile wrap/stacking and the prefill behavior visually before shipping.

## Assumptions

- "Safe and obvious" prefill was interpreted narrowly (first-phase-for-this-bag only) rather than broadly (e.g., prefilling from a prior phase's baseline minus some estimate), since any broader interpretation would require inventing a depletion estimate the app doesn't track — explicitly disallowed by the task boundary ("do not implement hopper formulas").
- The "no active hopper phase" cue text intentionally does not use amber/warning styling as strong as the multi-active-bags warning in the dialog — it's a gentle nudge (informational), not a warning about a problem, per the requirement that it stay "informational, not blocking."
- Shortening the BagRow button label to "Start Phase" (from "Start Hopper Phase") is a mobile-readability tradeoff; the full phrase remains in the dialog title and the inline status-cue text, so the feature's full name is still discoverable.

## Unresolved

- No live smoke test performed (see above).
- `docs/implementation/bag-hopper-lifecycle-plan.md` was reviewed but not changed — flagging in case a reviewer disagrees that the prefill behavior needs no documentation update.
- Everything previously unresolved (same-day duplicate hopper-name collisions, no hard one-active-bag rule, top-up/lifecycle-event workflows) remains unresolved and out of scope, unchanged by this package.

# Log Shot Mobile-First Usability Package — 2026-08-25

## Completed

- Reorganized `ShotForm.tsx`'s Extraction card into three labeled sub-groups within the same card — "Grind & Dose," "Extraction Timing," "Output" — rather than three separate top-level Cards, to avoid trading stepper density for card-chrome density. Field order within each group is unchanged from before (Pour Delay → Pour Time → Flow Time → Yield was already the existing order; no reorder was actually needed there, only relabeling into named groups).
- Reduced stepper density: kept `NumberStepper` only on Grind Setting and Grind Time (the two fields a user genuinely nudges from a remembered baseline while dialing in a grinder). Reverted Initial Grinder Output, Top-Up Grind Added, Top-Up Time Adj, Pour Delay, Pour Time, Flow Time, and Yield to plain `<Input type="number">`, using the exact seed-on-focus/pointerdown pattern already established for Temp and Target/Basket Dose in the prior "Mobile Stepper UI Refinement" session — these are values typically read once off a scale or timer, not nudged incrementally.
- Added a persistent explanatory caption at the top of "Grind & Dose" describing how Initial Grinder Output, Top-Up Grind Added, and Target/Basket Dose relate (no new formula — this describes the existing `calculateDoseCorrection` behavior in plain language). Tightened the existing over-grind-removed correction-preview line to say it's "calculated from Initial Grinder Output over Target Dose." Added a caption on the Grind Waste input itself (previously the only one of the four dose/waste fields without its own caption), reusing the exact wording already established in `ShotDetail.tsx`'s "Grinder / Workflow Event" section ("not part of the brewed basket dose or extraction yield") rather than inventing new phrasing.
- Renamed the "Evaluation" card to "Taste Later" and made it collapsible (reusing the same conditional-render pattern already shipped for "Advanced tags"), collapsed by default for a new shot with a one-line hint ("Optional — save your extraction data now and come back to rate it after tasting"). On edit, it auto-expands whenever the shot already has any taste-later evidence (`rating`, `preferenceRating`, `tasteZone`, `sensoryNotes`, or existing taste-selector tags) — the taste-selector check is a separate effect from the main `existingShot` reset effect, since `existingTasteSelectors` loads via its own query not in that effect's dependency array, and adding it there would have re-run `form.reset(...)` whenever the selectors query resolved.
- New shots no longer silently default to a hidden `7/10` rating while "Taste Later" is collapsed. The slider still opens at 7 as a neutral starting point when a user chooses to rate, but untouched new shots remain unrated until the user records a rating.
- Moved the general `notes` field out of "Shot Evaluation" into its own standalone "Notes" card at the end, matching the requested section list. Shot Status, Fault Status, grind-waste checkbox/field, Flags, Serving Context, the analysis-eligibility banner, and "Advanced tags" all stay in "Shot Evaluation," unchanged in position — none of these were reclassified into "Taste Later," since they're assessable at/near pour time, not solely dependent on drinking.
- Did not change `Include in Analysis`, Reference/Signature/Sour logic, the dose-correction formula, any selector value list, or `NULLABLE_ON_EDIT_FIELDS`. Did not touch schemas, APIs, OpenAPI, generated clients, or Quick Log. Did not add any new form field — every field that existed before this change still exists and still submits/clears exactly as before; only its input control, grouping, label, and caption changed.
- Reviewed `docs/implementation/release-candidate-checklist.md`'s Gate 0.5 claim that Log Shot "is now mobile-friendly" and `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md` for anything this package would make inaccurate — found nothing that needed correcting (this change makes the existing mobile-friendly claim more true, not less), so neither file was edited.

## Verified

- Workspace typecheck passed (all 4 projects).
- API/Phase 1.5 test suite passed: 46 passed, 0 failed (no test changes needed — this is a UI control/grouping change with no contract change, consistent with how the two prior mobile-stepper sessions verified).
- Render production build passed.
- Live smoke test against the real dev DB using Chrome automation (not assumed): created a new shot, confirmed Grind Setting/Grind Time render as steppers and the other 7 fields render as plain inputs with working seed-on-focus placeholders; confirmed "Taste Later" starts collapsed on a new shot; expanded it, set a Rating and a distinctive Sensory Note, collapsed it again *before* submitting, and confirmed via the saved Shot Detail page that both values were still submitted correctly — this directly verifies React Hook Form retains field values across the section's mount/unmount cycle (the specific risk flagged as needing real verification, not assumption, in the preceding planning review). Also confirmed that re-opening that same shot for edit auto-expanded "Taste Later" since it now had rating/sensory-note data. Deleted the test shot afterward.

## Assumptions

- The Grind Setting/Grind Time-keep-stepper split was implemented as recommended in the preceding planning review, not re-confirmed with Carl directly first (the planning review flagged this as needing his direct confirmation, matching how Temp/Dose were handled last time) — this should be treated as provisional pending that confirmation, not a finalized product decision.
- "Extraction Timing" and "Output" are sub-labeled groups within the existing "Extraction" Card, not separate top-level Cards — the task's section-name list could be read either way; fewer full Cards was chosen to avoid adding card-chrome weight while removing stepper weight.
- Serving Context (Drink Type, For Others, Not Rated, Did Not Finish) stayed in "Shot Evaluation" rather than being reclassified into "Taste Later" — flagged as a straddling case in planning, resolved conservatively (no field moved) rather than guessed.

## Unresolved

- Whether Grind Time should also revert to plain input (only Grind Setting definitely keeps it) is still an open judgment call needing Carl's direct input, not resolved here.
- The hidden default-rating issue flagged during review has been corrected in this commit: new shots start with blank `rating`/`rated` values unless the user explicitly records taste data.
- No changes were made to `release-candidate-checklist.md` or the onboarding doc; if a reviewer finds a specific sentence that now reads as inaccurate, it was not caught by this review.

# Bag Lifecycle Work Package: Closeout Flow Polish and Closed-Out Summary — 2026-08-25

## Completed

- **Measured vs. unmeasured leftover, made explicit** (per `docs/implementation/bag-hopper-lifecycle-plan.md` §1's "whether leftover mass was measured or intentionally ignored" input, and Phase B's "make measured vs unmeasured leftover explicit"): added a `leftoverMeasured` select ("I measured it" / "Not measured — intentionally skipped") to the Close Out Bag dialog. Selecting "Not measured" hides the numeric field and composes closeout notes saying so explicitly, instead of the previous ambiguous "not recorded" inferred from a blank field.
- Choosing "Not measured" now sends `remainingEstimate: null` to `PATCH /api/bags/:id` — an explicit clear, not just an omitted field — so a stale prior estimate can't linger and look like a fresh measurement.
- **Backend fix required to make the above actually work**: found that `artifacts/api-server/src/routes/bags.ts`'s `parseBagBody` treated `null` and `undefined` identically for `remainingEstimate` (`body.remainingEstimate != null ? Number(...) : undefined`), which silently drops an explicit clear the same way the shots-edit bug did in an earlier session. Fixed narrowly for this one field: `body.remainingEstimate === null ? null : body.remainingEstimate != null ? Number(...) : undefined`. This is a data-handling bug fix in an existing route, not a schema or API-contract change — `/api/bags` is not OpenAPI-governed (hand-written body parsing, unlike `/shots` and `/hoppers`), and `bags.remaining_estimate` was already a nullable column.
- Relabeled "Closeout Notes" to "Closeout / Cleanout Notes" with updated placeholder/helper text explicitly inviting grinder purge, hopper emptying, and machine cleaning evidence — per §2's "for now, closeout notes can preserve the evidence" guidance for between-bag maintenance, without adding a new field.
- Added forward-guidance copy: a closing line in the dialog's amber note ("Next: create or select your new bag, then use Start Hopper Phase once you're ready to begin tracking it.") and an updated success toast description, guiding the user toward the next bag/hopper phase after closing — satisfies "guide user toward starting a new bag/hopper phase afterward" without auto-navigating or inventing a new flow.
- The existing hopper-phase-not-auto-closed reminder (added last session) was preserved unchanged.
- **Closed-out summary**: previous (inactive) bags already showed closed-out date (inline text) and days-since-closed (badge) from an earlier session. Added the one missing piece — `Reconciled remaining: {g}` — to the same details row, only for `!bag.isActive`, completing the three-part "closed out summary" (date, days since, remaining/reconciliation estimate) the task asked for. Did not restructure or duplicate the existing date/badge displays, to avoid disturbing already-tested behavior. Active bags are unaffected (all three pieces are gated on `!bag.isActive`).

## Field/schema check (per task requirement 3)

No schema or API changes were needed for the frontend feature itself — `closedOutDate`, `remainingEstimate`, `reconciliationNotes`→`notes`, and `daysSinceClosedOut` (server-computed in `GET /bags`) all already existed and were already wired into `Bag`/`BagRow`. The only backend change was the `parseBagBody` null-handling bug fix described above, required for the new "explicit clear" behavior to actually persist — not a new field.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide).
- `CI=true pnpm --filter @workspace/api-server test` — 47/47 passed, 0 failed (46 pre-existing + 1 new).
- `CI=true pnpm run build:render` — build succeeded.
- Not run: a live Postgres-backed browser smoke test (closing a bag with "unmeasured" selected, confirming `remainingEstimate` actually reads back as `null`, and confirming the reconciled-remaining text appears in Previous Bags) — no running app instance was available in this environment, same limitation as every prior session in this thread.

## Assumptions

- "Make measured vs unmeasured leftover explicit" was implemented as a client-only UI distinction (a `Select`, not a new DB column) that controls which composed sentence goes into the existing `notes` text and whether `remainingEstimate` is sent as a number or explicit `null` — consistent with the plan's "No schema change required unless closeout reason or closeout waste must be structured."
- Fixing `parseBagBody`'s null-handling for `remainingEstimate` was judged in-scope as a required bug fix (not a schema/API change) since the new "unmeasured → explicit clear" feature would otherwise silently no-op — same reasoning as the two `ShotForm.tsx`/OpenAPI fixes from earlier sessions, scoped narrowly to only the one field actually used here.
- Completing the closed-out summary by adding only the missing `remainingEstimate` piece (rather than consolidating all three into a new visual block) was chosen to avoid touching already-tested display code unnecessarily.

## Unresolved

- No live smoke test performed (see above).
- `artifacts/coffee-log/src/pages/ShotForm.tsx` shows as modified in git status during this session — unrelated, concurrent work from elsewhere, not touched or reviewed as part of this package.
- Everything else previously unresolved (no lifecycle-event table, no hard one-active-bag rule, hopper top-up out of scope, same-day duplicate hopper-name collisions) remains unchanged.

## Recommended next step

Live smoke test of the closeout flow (both measured and unmeasured paths, confirming the Postgres value actually clears), then Phase C ("Start New Bag guided flow") per the lifecycle plan's implementation order, if Carl/Codex wants to continue down that path next.

# Shot Flags, Selector Cleanup, and Detail Display Polish — 2026-08-25

## Completed

- **Flag behavior (`ShotForm.tsx`)**: replaced `setAnalyzedShotDefaults`, which unconditionally overwrote Shot Status and Fault Status on every Reference/Signature/Sour selection, with two blank-only helpers — `setStatusIfBlank` and `setFaultStatusIfBlank` — that check `form.getValues(...)` first and do nothing if the user already entered a value. Selecting Reference or Signature now suggests Status "Dialed In" only when blank (Fault Status is left untouched, per the task's explicit and intentionally asymmetric rule); selecting Sour suggests Status "Good" and Fault Status "Good," each only when blank. Signature-implies-Reference, Sour-clears-Reference/Signature, and Reference/Signature-clears-Sour were already implemented from an earlier session and are unchanged — only the force-overwrite behavior was fixed.
- Added a short Flags helper line ("Reference = repeatable benchmark shot. Signature = rare, extraordinary shot — also counts as Reference. Sour = marked sour, but can still be analytically valid if Status and Fault Status are good.") directly above the three flag checkboxes.
- **Selector cleanup (`selector-options.ts`)**: audited the curated `shotClassification` and `beanAchievement` lists against `docs/csv-data-dictionary.md` ("Shot Classification... Not the authority for reference/signature/daily-driver status") and the onboarding doc ("Daily Driver must be recorded through Bean Achievement, not Shot Classification"). Found the curated lists were already compliant — `shotClassification` contains none of Sour/Reference Shot/Signature Shot/Daily Driver, and `beanAchievement` already includes Daily Driver — so no edit was needed there. Verified this with a new contract test rather than leaving it unverified.
- **Shot Detail (`ShotDetail.tsx`)**: added a missing Sour Shot badge next to the existing Signature Shot / Reference Shot badges (Sour previously had no display anywhere in Shot Detail). Made Shot Classification, Bean Achievement, Expression Style, and Taste Zone conditionally render — matching the conditional-hide pattern already used elsewhere in the same Extraction Details grid (Grind Setting, Grind Time, Initial Grinder Output, Machine, Grinder) — instead of always showing a "-" placeholder row when unset. Expression Style was extended to the same treatment even though not explicitly named in the task's field list, for internal consistency with its two ChipList siblings (Shot Classification, Bean Achievement) that share the identical rendering mechanism — a deliberate small scope extension, not silently done. Confirmed the Grinder/Workflow Event box (grind waste + grind-adjusted event) was already visually separated from the main Extraction Details grid in its own amber-bordered block from prior work — no change needed there.
- Added three new source-scan tests to `api-contract.test.ts`: one verifying the blank-only Status/Fault Status guards and the Flags helper text exist in `ShotForm.tsx`; one verifying `shotClassification` excludes the four flag-duplicate values and `beanAchievement` includes Daily Driver in `selector-options.ts`; one verifying the Sour Shot badge and the four conditional-hide fields exist in `ShotDetail.tsx`, plus re-confirming the grind/workflow-event separation.
- Did not implement DCI/OSI/HMI/BLI/MSI/GSP. Did not touch Quick Log. No schema/API/OpenAPI/migration changes. No historical data deleted — `curatedOptions`/`curatedScalarOptions` already merge in any saved value not present in the curated list, so an old record with a legacy Sour/Reference/Daily-Driver-style Shot Classification value (if one ever existed) still displays and remains editable; nothing was deleted from storage.
- No update was made to `docs/field-type-map.md` or `docs/csv-data-dictionary.md` — both already correctly document these rules (confirmed by reading them before implementing), so nothing needed clarifying.

## Verified

- Confirmed clean working tree fully in sync with `origin/main` (0 ahead/behind) before starting.
- Workspace typecheck passed (all 4 projects).
- API/Phase 1.5 test suite passed: 50 passed, 0 failed, including the 3 new tests added this session.
- `CI=true pnpm run build:render` passed.
- Live smoke test against the real dev DB using Chrome automation (not assumed): (1) set Shot Status to "Needs Work," checked Reference Shot, confirmed Status stayed "Needs Work" — not overwritten; (2) with Status still "Needs Work" and Fault Status blank, checked Sour Shot, confirmed Reference cleared, Status stayed "Needs Work" (correctly not forced to "Good" since it was non-blank), and Fault Status filled to "Good" (correctly forced since it was blank); (3) on a fresh blank shot, checked Sour Shot alone and confirmed both Status and Fault Status auto-filled to "Good," proving a Sour shot can become analytically valid; (4) on a fresh blank shot, checked Signature Shot and confirmed Reference auto-checked, Status filled to "Dialed In," and Fault Status stayed unset (confirms the asymmetric rule); (5) saved a Signature+Reference shot and confirmed both badges render on Shot Detail, and confirmed the four now-conditional fields (all blank on this shot) render no rows at all. Test shot deleted afterward, server stopped.

## Assumptions

- The Reference/Signature-vs-Sour asymmetry (Reference/Signature suggest Status only; Sour suggests both Status and Fault Status) was implemented literally as specified in the task's itemized rules, not assumed to be symmetric — flagging this explicitly since it's easy to read as an oversight rather than a deliberate distinction.
- Extending the conditional-hide treatment to Expression Style (not explicitly named in the task's list) was a judgment call for internal consistency within the same grid, not a silent scope expansion — noted above and here.
- The existing Reference-implies-Signature-clearing, Sour-clears-Reference/Signature, and Reference/Signature-clears-Sour logic from a prior session was verified correct against the task's spec and left unchanged rather than rewritten.

## Unresolved

- None new. The flag/selector/display behavior specified in this task is now implemented and verified; broader items (lifecycle-event model, lack of a dedicated Hopper frontend beyond Start Hopper Phase, hard one-active-bag enforcement) remain out of scope and unchanged, as recorded in earlier sessions above.

## Recommended next step

None required by this task specifically. If continuing shot-evaluation polish, the next natural candidate would be auditing whether `Boundary Shot` (present in `beanAchievement` and referenced in the DB schema/OpenAPI as a separate `boundaryShot` field) has the same kind of flag-vs-selector duplication this task just resolved for Reference/Signature/Sour — not investigated here, flagged only as a possible parallel worth checking, not a confirmed issue.

## Commit recommendation

Not recommended to commit automatically. Verification is clean and the changes are additive/behavioral-fix-only (no schema/API/history changes), but per the task boundaries, commit only on explicit instruction from Carl/Codex.

# Bag Lifecycle: Guided "Change Bag" Workflow — 2026-08-25

## Completed

- Added a `ChangeBagDialog` guided flow to `artifacts/coffee-log/src/pages/Bags.tsx`, triggered by a new "Change Bag" (or "Start New Bag" when no bag is currently active) button in the page header, next to "Add Bag" — visible regardless of whether a bag is currently active, and its label adapts to context.
- The dialog walks through, in this on-screen order: (1) identify the current active bag(s), read-only summary; (2) optionally close the old bag, with the same measured/unmeasured leftover choice and closeout/cleanout notes copy already built for the standalone Close Out dialog; (3) create or select the bean for the new bag; (4) enter minimal new-bag details (number, name, weight, roast date); (5) optionally start the first hopper phase, with the same approved-phase-only selector, Custom-requires-label-or-notes rule, and "measured operating window" copy already built for the standalone Start Hopper Phase dialog.
- **Submission order deliberately differs from the on-screen reading order for safety**: the mutation resolves/creates the bean, then creates the new bag (active), then — only if that succeeded — optionally closes the old bag, then — only if that succeeded — optionally starts the hopper phase. This means a failure at any step never leaves the user with zero active bags; worst case if the "close old bag" step fails after the new bag was already created is two active bags temporarily, which the existing "Close" action on the Bags list already recovers from. This ordering rationale is documented in a code comment directly above the mutation.
- Reused only existing endpoints: `POST /api/beans`, `POST /api/bags`, `PATCH /api/bags/:id`, `POST /api/hoppers`. No new backend routes, no schema changes, no OpenAPI/generated-client changes. `beans.ts`/`bags.ts`/`hopper.ts` were read but not modified.
- Starting the hopper phase is a `Switch` the user can turn off (default on) — never a forced step; explicit copy states "You can start a hopper phase later from the Bags list — it is never required to finish changing bags."
- No hopper-percentage or other formula is calculated locally anywhere in the new flow — `startingBeans` is passed straight through as the entered value (or omitted), with only a text placeholder hint (not a computed default) referencing the just-entered bag weight.
- Dialog is `max-w-lg max-h-[90vh] overflow-y-auto`, matching every other dialog in this file — scrollable on short/mobile viewports.
- Copy explicitly states the user is "not expected to know the exact leftover amount" and that "skipping it is fine," and that purge/cleanout/maintenance notes are "text evidence only for now."
- Added one new source-scan regression test to `artifacts/api-server/src/api-contract.test.ts` covering: the trigger button's adaptive label, reuse of exactly the four existing endpoints (string-matched), approved-phase-only enforcement (no `Grinder Cleanout`), the hopper-phase-optional Switch and its "never required" copy, absence of any local `hopperPercent`/`hopperMass` calculation, presence of the measured/unmeasured and evidence-only copy, the scrollable dialog class, and — via `String.indexOf` ordering checks — that the mutation's fetch calls appear in bean → new-bag → close-old order in source.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide).
- `CI=true pnpm --filter @workspace/api-server test` — 51/51 passed, 0 failed (50 pre-existing + 1 new).
- `CI=true pnpm run build:render` — build succeeded.
- Not run: a live Postgres-backed browser smoke test of the full guided flow end-to-end (bean creation, bag creation, old-bag closeout, hopper phase start, and the partial-failure recovery path) — no running app instance was available in this environment, same limitation as every prior session in this thread. This is the single largest, most multi-step piece of UI built in this thread so far, so a live smoke test is the highest-value next step before shipping.

## Assumptions

- The new-bag fields collected in the guided flow (bag number, bag name, weight, roast date) are intentionally a minimal subset of the full ~25-field Add Bag dialog — the guided flow is meant to get a new active bag started quickly with correct linkage (bean → bag → hopper), not to replace the full Edit Bag form for filling in every historical/roast-dating field. The user can open Edit afterward for the rest.
- The bean-creation sub-step in this flow (name, roaster, origin only) is intentionally a trimmed subset of `BeanForm.tsx`'s full field set, for the same reason.
- Reordering the actual submission sequence (bean → new bag → close old → hopper) away from the required behavior list's stated reading order (identify → close → bean → new bag → hopper) was judged acceptable and necessary for safety, since the task only specified the workflow the *user walks through conceptually*, not a literal required execution order, and the boundary against inventing a new atomic backend endpoint (task explicitly prefers reusing existing endpoints) means the four calls cannot be a single transaction — so the ordering of the four independent calls is the only available lever for minimizing partial-failure damage.
- No update to `docs/implementation/bag-hopper-lifecycle-plan.md` was made — this flow is a UI orchestration of already-documented steps/endpoints and doesn't introduce new lifecycle semantics beyond what's already written there.

## Unresolved

- No live smoke test performed (see above) — this is the top-priority follow-up given the flow's size and multi-endpoint sequencing.
- Partial-failure recovery is manual: if the "close old bag" or "start hopper phase" step fails after the new bag was created, the error message tells the user exactly what to do next (close/start it manually from the Bags list), but nothing automatically retries or rolls back. Judged acceptable for a launch-safe first version given the boundary against adding new backend orchestration.
- `artifacts/coffee-log/src/pages/ShotForm.tsx` shows as modified in git status during this session — unrelated, concurrent work from elsewhere (shot-evaluation flag-selection polish, per its own completed-tasks.md entry above), not touched or reviewed as part of this package.
- Everything previously unresolved (no lifecycle-event table, no hard one-active-bag rule, hopper top-up out of scope, same-day duplicate hopper-name collisions) remains unchanged.

## Recommended next step

Live smoke test of the full guided flow (both the happy path and at least one induced failure, e.g. a duplicate hopper name, to confirm the partial-failure messaging reads correctly), then decide whether to continue with Phase C ("Start New Bag guided flow" — largely now covered by this task) or move to a different area of the lifecycle plan.

## Commit recommendation

Not recommended to commit automatically. Verification is clean and every change reuses existing, already-tested endpoints with no schema/API changes, but this is also the largest single UI addition in this thread — a live smoke test before commit is strongly recommended given the multi-step, multi-endpoint nature of the flow. Commit only on explicit instruction from Carl/Codex.

# Log Shot Stepper Density: Restored Steppers On All Extraction Fields — 2026-08-25

## Completed

- Closed the stepper-split gap outstanding since commit `3db2398`. That commit reduced `NumberStepper` usage on `ShotForm.tsx`'s Extraction card to Grind Setting and Grind Time only, reverting Initial Grinder Output, Top-Up Grind Added, Top-Up Time Adj, Pour Delay, Pour Time, Flow Time, and Yield to plain `<Input type="number">`. Carl confirmed directly, repeatedly, across multiple reconciliation rounds, that the opposite was wanted: the mobile +/- stepper control should remain on all Extraction fields, not just Grind Setting/Grind Time.
- Restored `NumberStepper` on all 7 of those fields, using each field's existing placeholder/suggested-value expression unchanged (e.g. `defaultDose`, `latestShotDefaults?.pourDelay`, `defaultYield`) — this is a pure control-type swap, not a change to any default/seed logic.
- Left Target/Basket Dose and Temp as plain inputs, unchanged — those were correctly reverted in an earlier, separate session and were never part of this dispute.
- Left the Rating/Preference Rating steppers, the card/section restructuring (Setup / Extraction sub-groups / collapsible "Taste Later"), and the flag-behavior fix (`setStatusIfBlank`/`setFaultStatusIfBlank`) untouched — all approved and unrelated to this fix.
- No existing test asserted the old 2-field-only split, so no test needed updating.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide).
- `CI=true pnpm --filter @workspace/api-server test` — 51/51 passed, 0 failed.
- `CI=true pnpm run build:render` — build succeeded.
- Not run: live browser smoke test — no running Postgres-backed instance available in this environment, same limitation as every prior session in this thread.

## Assumptions

- None beyond the direct instruction this fix implements.

## Unresolved

- No live-browser smoke test performed for this specific change.
- This working tree also contains concurrent, unrelated changes (`Bags.tsx` and its test additions) from the separately-assigned Guided New Bag / Close Old Bag workflow task, which were present during this session's verification runs but were not reviewed or touched here — that work is for its own handoff/reconciliation pass.

# Mobile Navigation Discoverability, Log Shot Naming, and Density Fix — 2026-08-25

## Completed

- **Bottom mobile nav (`Shell.tsx`)**: the nav already scrolled correctly and already included Settings (from an earlier session) — verified this directly rather than assuming it. The actual bug was discoverability: the row hard-clips at the viewport edge with zero visual signal that more items exist off-screen, so a user who doesn't intuitively try swiping never discovers Bags/Equipment/Accessories/Taste/Settings past "Beans." Fixed with a right-edge `mask-image`/`-webkit-mask-image` fade (no JS, no scroll-position tracking) so the last visible icon visibly fades toward the edge instead of clipping cleanly.
- Fixed the mobile nav's active-tab indicator relying on color alone (`text-primary` vs `text-muted-foreground` was the only signal). Added a non-color cue pair: a small underline bar above the active icon (shape) and `font-semibold` vs `font-medium` on the label (weight) — both explicitly listed as acceptable cues in the task brief. Left the desktop sidebar's active state untouched since its filled-background treatment is already a shape/region cue, not text-color-only.
- **Log Shot naming (`ShotForm.tsx`)**: found and fixed the one real inconsistency — every nav entry point (Shell primary nav, mobile bottom nav, mobile top-bar button, Dashboard's "+ Log Shot" button) says "Log Shot," but the page's own H1 said "Detailed Log" for the create flow. Changed the H1 to "Log Shot" (edit flow still says "Edit Shot," unambiguous). Confirmed via grep this was the *only* stray "Detailed Log"/"Quick Log" reference outside the already-shelved, already-unlinked `QuickLog.tsx` page itself — left `QuickLog.tsx`'s internal copy untouched since it's parked/unreachable and the task boundary is "do not implement Quick Log," not "edit its dead copy."
- **Mobile form density (`ShotForm.tsx`)**: reviewed for remaining density beyond the two prior stepper/section sessions. Did not find a case for further structural changes — Shot Status/Fault Status/Flags/Serving Context are all legitimately "record now" content per the existing Record-now/Taste-later split and collapsing them further would contradict that established reasoning, not extend it. Found and fixed one concrete, measured issue instead: the Flags helper paragraph (added last session) wrapped to 4 lines at a real 350px mobile content width (measured directly via `getBoundingClientRect` at that width, not guessed). Tightened the wording to preserve all three meanings (Reference/Signature/Sour) in 2 lines, verified by the same measurement technique before committing the change.
- **Shot Detail (`ShotDetail.tsx`)**: reviewed for overflow risk (no fixed widths or `whitespace-nowrap` found anywhere in the file) and color-only flag display. No changes made — the header already stacks `flex-col sm:flex-row` so it can't be squeezed by the title/buttons on phone, grids are fluid `minmax(0,1fr)` so they can't cause page-level horizontal overflow, and the Reference/Signature/Sour badges already carry their meaning in visible text labels ("Signature Shot," "Reference Shot," "Sour Shot"), not color alone — confirmed this was already true from last session's work, not newly fixed.
- Added/updated three contract tests in `api-contract.test.ts`: a new test for the nav's fade mask and non-color active cue; updated the existing "Primary logging UI..." test, which had `assert.match(formSource, /Detailed Log/)` as a literal requirement — the exact inconsistency this task fixes — to instead require "Log Shot" and explicitly forbid "Detailed Log" in `ShotForm.tsx`; updated the three Flags-helper-text assertions from last session to match the tightened wording.
- Added one line to `docs/implementation/release-candidate-checklist.md`'s Gate 2.5 verification list, dated, describing exactly what was reviewed and fixed for the mobile nav specifically (not claiming the whole gate/broader dashboard color review is done).
- Did not implement Quick Log, any intelligence engine, or any schema/API/OpenAPI change.

## Verified

- Confirmed clean working tree fully in sync with `origin/main` before starting (0 ahead/behind, prior commit `0c3fcc5`).
- Workspace typecheck passed (all 4 projects).
- API/Phase 1.5 test suite passed: 52 passed, 0 failed.
- `CI=true pnpm run build:render` passed.
- `resize_window` did not actually change the tab's viewport in this environment (`window.innerWidth` stayed at desktop width after every call, despite the tool reporting success) — documented here rather than silently assumed to work. An embedded same-origin iframe was also tried as a workaround and failed to load. Worked around this by directly constraining the actual nav element's own width via inline style (390px) and forcing its `md:hidden` sibling elements' `display` via an injected stylesheet — this exercises the real CSS overflow/mask/scroll mechanics (verified `scrollWidth: 808` vs `clientWidth: 390`, confirmed `nav.scrollTo` reaches Settings, screenshotted the visible fade on "Beans" and the underline+bold cue on the active tab) without needing a true viewport resize. This does not test `sm:`/`md:`-prefixed layout classes elsewhere in the app (e.g. `ShotDetail.tsx`'s `sm:grid-cols-4`), which is why that page's mobile-safety conclusion above rests on code-level review (no fixed widths/nowrap) rather than a pixel-verified screenshot at true mobile width.

## Assumptions

- Extending the desktop sidebar to also carry a non-color active cue was considered and skipped — its background-fill treatment already reads as a shape/region cue, not a color-only one, so it wasn't broken and adding one would be unrequested scope beyond the task's explicit "Bottom mobile navigation" framing.
- The Flags helper text rewrite trades a small amount of specificity for line count, verified acceptable (all three flag meanings still present) rather than assumed acceptable.

## Unresolved

- **Found, not caused, not fixed here**: the working tree's `ShotForm.tsx` currently has `NumberStepper` restored on Initial Grinder Output, Top-Up Grind Added, Top-Up Time Adj, Pour Delay, Pour Time, Flow Time, and Yield — reverting the plain-input density fix that was deliberately implemented, measured, and committed in `3db2398 feat(shots): streamline mobile log shot flow`. This reversion is not something this session made; it was already present in the file before this task's own edits (H1 rename, Flags text) were applied on top of it. Flagging this clearly rather than silently reverting it myself, since I don't know why it happened or whether it was an intentional decision made elsewhere in this multi-agent session — Codex/Carl should confirm which state is actually wanted before this ships.
- `resize_window`'s non-functionality in this environment should probably be reported/investigated separately — it silently claims success while doing nothing, which could mislead a future session that trusts it without verifying `window.innerWidth` afterward the way this session did.

## Recommended next step

Resolve the `NumberStepper` reversion finding above with Carl/Codex before shipping — confirm whether the 7 fields should go back to plain input (restoring the `3db2398` state) or whether keeping steppers there was an intentional, informed decision this session doesn't have context for.

## Commit recommendation

Not recommended to commit automatically, and specifically not recommended to commit `ShotForm.tsx` as-is without resolving the stepper-reversion question above first — committing now would either re-ship the density fix's reversal unreviewed, or (if intentional) commit it without anyone having recorded why. The other three files in this session's scope (`Shell.tsx`, `api-contract.test.ts`, `release-candidate-checklist.md`) have no such open question. Per task boundaries, commit only on explicit instruction from Carl/Codex regardless.

## Resolution (Carl, 2026-08-25, same day)

The `NumberStepper` restoration flagged above as unresolved is intentional and confirmed directly by Carl, not an accident. It's the fix documented in this same file under "Log Shot Stepper Density: Restored Steppers On All Extraction Fields — 2026-08-25" (immediately above this entry): `3db2398`'s reduction to Grind Setting/Grind Time only was the wrong direction — Carl explicitly wants steppers on all Extraction fields, confirmed across multiple reconciliation rounds before this fix was applied. Good catch and correct handling by not silently reverting it — this is the state that should ship.

# Removed grinderInitialOutputForCharts (Deprecated Airtable Chart Field) — 2026-08-25

## Completed

- Removed `grinder_initial_output_for_charts` from the `shots` table entirely, at Carl's direct request. Carl created this field originally in Airtable purely to narrow a chart's y-axis (grinder output typically falls in a ~2g range, so a full-scale chart had large blank areas) — it was a personal display-formula helper derived from `Initial Output (g)` / `initialGrindWeight`, never an independent input, and Carl confirmed it served "only crappy Airtable charts and limited integrations" with no ongoing purpose in the Postgres-backed app.
- Added migration `0009_remove_grinder_initial_output_for_charts` (up: `DROP COLUMN IF EXISTS`; down: `ADD COLUMN IF NOT EXISTS`, matching this project's established migration/rollback pattern). Rollback restores the column shape only — original values are not recoverable once dropped, since none exist yet in the live Postgres data (this field was never wired to the live app's write paths) and any historical Airtable/CSV evidence for it remains recoverable from source exports if ever needed again.
- Removed all live references: `lib/db/src/schema/shots.ts` (column definition), `artifacts/api-server/src/lib/airtable-mapping.ts` (Airtable API sync mapping), `artifacts/api-server/src/routes/shots.ts` (CSV import row mapping), `lib/api-spec/openapi.yaml` (Shot response schema), and the matching assertion in `artifacts/api-server/src/airtable-mapping.test.ts`. Regenerated `lib/api-zod`/`lib/api-client-react` via `pnpm --filter @workspace/api-spec run codegen` rather than hand-editing generated files.
- Left `docs/architecture/offline-airtable-export-audit.md` untouched — it's a historical snapshot of a past Airtable export's field inventory, not a live schema reference, and should keep recording what was actually exported at the time.
- Updated the field's row in `docs/csv-data-dictionary.md` to note it was removed (with date and migration name) and explain why, rather than deleting the row outright — preserves the historical record per the project's "never silently discard historical evidence" rule while making clear it's gone from the live schema.
- `Initial Output (g)` / `initialGrindWeight` ("Initial Grinder Output") is unaffected and remains the canonical, live, editable field — confirmed via `airtable-mapping.ts` that it's mapped from Airtable's `"Initial Output (g)"` column, separate from the removed chart-formula field.

## Verified

- `CI=true pnpm run typecheck` — passed (all workspace projects, including regenerated `lib/api-zod`/`lib/api-client-react`).
- `CI=true pnpm --filter @workspace/api-server test` — 52/52 passed, 0 failed (updated one existing assertion, added no new tests — this is a pure removal).
- `CI=true pnpm run build:render` — build succeeded.
- Confirmed via `grep` across the whole repo that no live `.ts`/`.tsx`/`.yaml`/`.sql` file references the field except the new migration (0009, the removal itself) and the historical migrations that originally added it (`0000`, `0001`), which are correctly left untouched.
- Not run: an actual migration-apply rehearsal against a real/embedded Postgres instance specifically exercising `0009` end-to-end (the existing test suite's Phase-1-migration tests cover `0000`/`0001` specifically, not a generic all-migrations runner). The migration's SQL is a direct pattern match of the already-proven `0008_equipment_source_urls` shape (`ALTER TABLE ... DROP/ADD COLUMN IF [NOT] EXISTS`), just against `shots` instead of the equipment tables.

## Assumptions

- No production data exists in this column yet to worry about losing, since it was never populated by any live write path (only ever set during CSV/Airtable import) and the app has not yet had a real deployment cycle with Airtable sync enabled per `docs/implementation/release-candidate-checklist.md`.
- Leaving the CSV data dictionary row in place (marked removed) rather than deleting it is the correct interpretation of "never silently discard historical evidence" for a doc that inventories source-of-truth fields, distinct from the offline-export-audit doc which is left fully untouched as a point-in-time snapshot.

## Unresolved

- The migration has not been rehearsed against a real Neon/Postgres instance specifically for this change — recommend including it in the next full deployment/migration rehearsal pass, consistent with every other migration in this project's standing "production rehearsal remains pending" status.

# Launch Readiness Audit Slice 2: Removed Non-Functional Settings Fields — 2026-08-25

## Completed

- Closed Critical Blocker #4 from `docs/implementation/launch-readiness-audit.md`: removed 13 Settings fields confirmed (by repo-wide grep, not assumption) to be saved and displayed but never read anywhere else in the app. Original audit list of 10 (`ratingSystem`, `unitSystem`, `timeFormat`, `ratingInputMode`, `grindTimerMode`, `hopperTracking`, `defaultHopperFullness`, `grindTimeIncrement`, `grindScaleMin`, `grindScaleMax`) was expanded during implementation to 13 after finding three more of the same class via the same verification method: `temperatureUnit`, `defaultBrewRatio`, and a *global* `usePuckScreen` key (the real, wired `usePuckScreen` lives per-bag on `Dashboard.tsx`, a different, unrelated field sharing the name).
- Kept one field the audit specifically flagged as a candidate for labeling rather than removal: `grindTimerMode` ("Grind Output Measurement" — By Time / By Weight / Manual / Single Dose). It plausibly ties to the already-documented, already-deferred single-dose workflow, so it now carries a visible caption — "Not yet used elsewhere in the app — reserved for future single-dose workflow support" — instead of silently implying it does something. Added an optional `note?: string` to the shared `FieldDef` type and rendered it in `FieldControl` under both the select and text/number branches (toggle branch left alone — nothing currently uses a note there).
- Found and correctly did **not** touch a naming-collision risk: the global Settings key `grindStepIncrement` (removed, dead) shares its name with the real, wired per-grinder `grindStepIncrement` column surfaced in `Equipment.tsx`/`equipment-suggestions.ts` — these are unrelated concepts (a global fallback vs. a specific grinder's own field). Verified via targeted grep of `ShotForm.tsx`/`Equipment.tsx` before removing anything, not assumed from the name alone.
- Verified `defaultTargetYield`, `defaultBasketSize`, `defaultDose`, `defaultBrewTemp`, `ratingTechnicalWeight`/`ratingPreferenceWeight` are all genuinely read elsewhere (`ShotForm.tsx` defaults chain, `Settings.tsx`'s own summary card and equipment-defaults fallback logic) before leaving them untouched — did not remove anything without confirming it first.
- No schema/API/OpenAPI changes — these are all keys in the existing generic key/value settings store, not typed columns.
- Added one regression test (`api-contract.test.ts`) asserting the 13 removed keys are gone, `grindMinTime` (real) remains, and `grindTimerMode` remains with its note.

## Verified

- `CI=true pnpm run typecheck` — passed (all workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 55/55 passed, 0 failed (54 pre-existing/concurrent + 1 new).
- `CI=true pnpm run build:render` — build succeeded.
- Not run: live browser confirmation that the Settings page still renders and saves correctly with the reduced field set — no running Postgres-backed instance available in this environment, same limitation as every prior session in this thread.

## Assumptions

- "Prefer removal unless near-term evidence" (per the audit's own guidance) was applied field-by-field: `grindTimerMode` was the only one with a credible, already-documented near-term tie-in (single dosing); the other 12 had no such evidence and were removed outright rather than labeled.
- Removing a Settings key entirely (rather than leaving it saved-but-hidden) is safe because the settings store is a generic key/value map — an old saved value for a removed key simply becomes inert and unread, not a dangling reference anywhere in code.

## Unresolved

- No live-browser smoke test performed for this specific change (same standing gap as the rest of this project's history).
- This closes Critical Blocker #4 exactly as scoped; it does not implement Unit System, Rating System, or Time Format conversion logic — those remain real potential future features, just not misleadingly present as controls today.

# Two Bugs From Live Lifecycle Review: ChangeBagDialog Cache Refresh + Hopper API Delete/Null-Clear — 2026-08-25

## Completed

### Fix 1 — ChangeBagDialog's onError now refreshes the UI, matching onSuccess
`artifacts/coffee-log/src/pages/Bags.tsx`'s `changeBagMutation` `onError` handler previously only showed a toast. Since the mutation can partially succeed (new bag created, then a later step like the hopper-phase POST fails validation), the real new-bag row existed in Postgres but stayed invisible in the Bags list until a manual reload — the error message correctly told the user what happened, but the UI didn't reflect it. Added the same five `qc.invalidateQueries` calls already present in `onSuccess` (`["bags"]`, `["beans"]`, `getListHoppersQueryKey()`, `["intelligence"]`, `["dashboard-intelligence"]`) to `onError` too. No change to submission ordering or error messages, per the task boundary.

### Fix 2 — Hopper API delete + null-clearing
- Added `DELETE /hoppers/:id` to `artifacts/api-server/src/routes/hopper.ts`, mirroring `bags.ts`'s `DELETE /bags/:id` shape (parse id, delete, return) but explicitly 404ing when the row doesn't exist (bags.ts's own delete does not 404 — this one does, per this task's own spec).
- Fixed the PATCH handler's null-vs-undefined collapsing bug for `bagId`, `startingBeans`, `phase`, and `notes` — previously `body.bagId != null ? Number(body.bagId) : undefined` (and the equivalent for the other three) treated an explicit `null` the same as an omitted field, so `PATCH { bagId: null }` silently did nothing. Same fix shape as `bags.ts`'s `parseBagBody` fix from an earlier session: `body.x === null ? null : body.x != null ? Number(body.x) : undefined` (string fields use the equivalent two-way ternary without `Number(...)`).
- **Checked the API contract before assuming it already allowed this, per the task's explicit instruction**: `bagId` and `startingBeans` were already `.nullish()` in the generated `UpdateHopperBody` zod schema, but `phase` and `notes` were only `.optional()` — the same contract gap found and fixed for shots/bags in earlier sessions. Widened `HopperUpdate`'s `phase`/`notes` in `lib/api-spec/openapi.yaml` to `type: ["string", "null"]` and regenerated `lib/api-zod`/`lib/api-client-react` via `pnpm --filter @workspace/api-spec run codegen`. Unlike shots/bags, `HopperInput` (create) and `HopperUpdate` are two separate, non-shared YAML blocks in this spec — so only `HopperUpdate` was touched; `HopperInput`/create behavior is untouched by construction, not just by care.
- Did not add `DELETE /hoppers/:id` to the OpenAPI spec — `bags.ts`'s `DELETE /bags/:id`, which this was explicitly asked to mirror, isn't in the spec either (the whole `/bags` route family is hand-written, not OpenAPI-governed), so keeping the hopper delete un-specced matches the pattern being mirrored rather than inventing a new documented endpoint.
- Added two regression tests to `artifacts/api-server/src/api-contract.test.ts`: one scoping a regex to `changeBagMutation`'s `onError` block specifically (so a match inside `onSuccess` can't produce a false pass) confirming all five invalidations are present; one confirming the DELETE route, the four null-vs-undefined fixes in the PATCH handler, and the two widened contract fields all exist in source.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide, including regenerated `lib/api-zod`/`lib/api-client-react`).
- `CI=true pnpm --filter @workspace/api-server test` — 55/55 passed (53 pre-existing as of this session start + 2 new; one additional pre-existing test changed concurrently by other in-flight work during this session, unrelated to this task, still passing).
- `CI=true pnpm run build:render` — build succeeded.
- **Live-smoke-tested against the real dev DB** (local server, `NODE_ENV=development`/`production` as needed, pointed at the repo's own `DATABASE_URL`, per the task's instruction):
  - Fix 2: created a throwaway Hopper via `POST /api/hoppers`; `PATCH` with `{"startingBeans":null,"phase":null,"notes":null}` confirmed all three actually cleared to `null` in the response; linked it to a throwaway bag then `PATCH {"bagId":null}` confirmed `bagId` also cleared; `DELETE` returned 204 and the row was gone from `GET /api/hoppers`; a second `DELETE` on the same id correctly returned 404. All test rows cleaned up afterward.
  - Fix 1: reproduced the exact partial-failure data sequence the dialog performs (create bean → create new active bag) directly via the API and confirmed the new bag is real and active in `GET /api/bags` — exactly the query `onError`'s new `invalidateQueries(["bags"])` call now refreshes. Could not complete the fully interactive click-through (typed "Custom" phase with no label, clicked Change Bag, watched the list update live) — the Chrome extension's `computer`/`javascript_tool` actions failed consistently (4 attempts across 2 tools: `Cannot access a chrome-extension:// URL of different extension`) while read-only tools (`read_page`, `navigate`) kept working, indicating an extension-level fault rather than an app bug. Per the browser-automation guidance not to keep retrying a failing tool, stopped and used the data-layer reproduction above instead, combined with the source-verified `onError` code change (identical five calls to the already-working `onSuccess` path) as the remaining link in the chain.
  - Also found and cleaned up unrelated pre-existing test debris in the dev DB (a `Bag #SMOKETEST` bag and its linked hopper, left over from an earlier session's smoke testing, not created by this task) — removable for the first time now that Fix 2's DELETE endpoint exists.

## Assumptions

- `onError` should invalidate the exact same five query keys as `onSuccess`, not a subset — since either could be the case depending on how much succeeded before the failure, and invalidating a query that's already correct is a harmless no-op refetch.
- The interactive browser click-through gap is a tooling failure in this session's environment, not a reason to doubt the fix — the regression test pins the exact code shape, and the live data-layer reproduction confirms the scenario the fix addresses is real.

## Unresolved

- The fully interactive "type Custom with no label, submit, watch the list update live" click-through was not completed due to the Chrome extension fault described above. Recommend a follow-up live click-through once that tooling issue is resolved, though risk is low given the mechanical nature of the fix and the two independent forms of evidence already gathered.
- Other concurrent, unrelated work continues to land in this working tree from elsewhere this session (`docs/implementation/README.md`, `docs/implementation/bag-hopper-lifecycle-plan.md`, new `docs/implementation/launch-readiness-audit.md`) — not reviewed or touched as part of this task.

# Shot Detail Zero Rating Display Fix — 2026-08-25

## Completed

- Fixed `ShotDetail.tsx` so a valid technical rating of `0` displays as `0` instead of being treated as blank. The previous `shot.rating || "-"` check collapsed zero because JavaScript treats `0` as falsy.
- Confirmed Preference Rating already used the correct nullish check and did not need a behavior change.
- Added a regression test in `api-contract.test.ts` to guard against reintroducing the truthiness check.

## Verified

- `CI=true pnpm run typecheck` — passed.
- `CI=true pnpm --filter @workspace/api-server test` — 56/56 passed, 0 failed.
- `CI=true pnpm run build:render` — build succeeded.

## Assumptions

- A rating of `0` is valid display data when stored, even if unusual in normal espresso use.
- Blank rating remains represented only by `null`/`undefined`, not by numeric zero.

## Unresolved

- None.
