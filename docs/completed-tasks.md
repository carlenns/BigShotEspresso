# Phase 1.5 Completed Tasks

This file records implementation evidence for Foundation Stabilization. It does not authorize or describe intelligence-engine implementation.

## Log Shot Bag selector default fix — 2026-08-27

### Completed

- Log Shot (`/shots/new`) now defaults the Bag selector to the single active bag when exactly one bag is active.
- When more than one bag is active, the form does not guess: the Bag field stays unselected and a visible amber cue ("Multiple bags are active — pick the one you pulled this shot from.") appears by the Bag label.
- When no bag is active, "No bag" stays selected as before.
- Editing an existing shot never overrides the shot's saved `bagId` (the new effect is create-only, guarded by `isEditing`).
- A manual bag choice — including a deliberate "No bag" — is never re-overridden: the auto-select effect runs once via a `didAutoSelectBag` ref after the bags list loads.
- Added regression assertions to `artifacts/api-server/src/api-contract.test.ts` under the "active-bag-first entry" test.

### Verified

- `CI=true pnpm run typecheck`
- `CI=true pnpm --filter @workspace/api-server test`
- `CI=true pnpm run build:render`

### Assumptions

- Active bag = `bag.isActive === true` from `/api/bags` (same predicate already used for `activeBags`/`visibleBags` in the form).
- No schema or API contract change; the effect mirrors the existing default-machine / default-grinder effects.

### Unresolved

- Database-level one-active-bag enforcement remains future work; this fix only handles the multi-active-bag case in the UI.

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

# Server-Side Include In Analysis Enforcement — 2026-08-25

## Completed

- **Confirmed the gap**: both `POST /shots` and `PATCH /shots/:id` in `artifacts/api-server/src/routes/shots.ts` previously passed whatever `includeInAnalysis` value the client sent straight through to the database, unmodified — a direct API write (or a buggy/malicious client) could force a shot to be included or excluded regardless of its actual Status/Fault Status.
- Added `computeIncludeInAnalysis(status, faultStatus)` in a new file, `artifacts/api-server/src/lib/shot-analysis-eligibility.ts`, mirroring the client's already-approved rule in `artifacts/coffee-log/src/lib/selector-options.ts`'s `describeAnalysisEligibility` exactly: Status must be `Good` or `Dialed In`, and Fault Status must be exactly `["Good"]` (length 1, that one value). No new rule was invented — this is the existing UI rule, reused.
- **Create**: `POST /shots` now unconditionally overwrites `data.includeInAnalysis` with `computeIncludeInAnalysis(data.status, data.faultStatus)` after validation, before the insert. There is no code path where a client-supplied value can win.
- **Update**: `PATCH /shots/:id` now fetches the existing shot first, then computes an "effective" Status/Fault Status — the new value if this request is actually changing it, otherwise the shot's existing value — and always recomputes `includeInAnalysis` from that merged view. This closes the gap for every update (not just ones that touch Status/Fault) while naturally satisfying "preserve existing eligibility when Status/Fault aren't part of the update," since an unchanged field's "effective" value is just its existing value, so the recomputed result matches what was already there.
- No manual-override mechanism was added — `docs/csv-data-dictionary.md` documents `Include in Analysis` as `Formula/Checkbox | R | read-only`, with no approved override, so per the task's own instruction the override case doesn't apply and neither route has one.
- Excluded shots are still returned/stored exactly as before — neither handler filters or hides them; only the computed boolean itself changed from "trusted" to "derived."
- Did not touch the UI rule (`describeAnalysisEligibility`) — the client already computes and sends the correct value in the normal flow, so this change is invisible to normal UI usage and only matters for direct API writes.

## Why `computeIncludeInAnalysis` lives in its own file

Initially added it to the existing `shot-eligibility.ts`, which already exports drizzle query-condition builders (`eligibleShotConditions`, `ratingEligibleShotConditions`) and therefore imports the live `@workspace/db` client. A first attempt to unit-test the new function via `await import("./lib/shot-eligibility")` failed in the test suite with `DATABASE_URL must be set` — importing anything from that module, even a function that doesn't touch the database, pulls in `@workspace/db`'s eager client initialization as a side effect. Moved `computeIncludeInAnalysis` to a new, deliberately dependency-free file (`shot-analysis-eligibility.ts`, zero imports) so it can be genuinely unit-tested without a live database connection, and updated `shots.ts`'s import accordingly. `shot-eligibility.ts` itself is back to byte-identical with its pre-task content.

## Tests added

All three in `artifacts/api-server/src/api-contract.test.ts`:
1. `computeIncludeInAnalysis enforces the single approved eligibility rule with no override path` — a real unit test (not source-scan) calling the function directly: confirms eligible Status/Fault combinations return `true`, every category of ineligible combination (bad status, bad/extra fault, empty fault, null/undefined status) returns `false`, and — since the function signature has no override parameter — this is a structural guarantee that neither create nor update can force a result contrary to Status/Fault, in either direction.
2. `Shot create/update recompute includeInAnalysis server-side and never trust client input` — source-scan confirming: the new import exists; POST's handler contains the unconditional `computeIncludeInAnalysis(data.status, data.faultStatus)` assignment with no gating `if`; PATCH's handler fetches the existing row, computes both effective fields, and assigns unconditionally with no gating `if`; and neither handler contains any code that would filter/hide a shot based on `includeInAnalysis`.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide).
- `CI=true pnpm --filter @workspace/api-server test` — 59/59 passed (57 pre-existing as of this session + 2 new; the new unit test runs in ~30ms after the dependency-free-file fix, versus failing outright with a DB-connection error before it).
- `CI=true pnpm run build:render` — build succeeded.
- No live smoke test performed for this change specifically — it's server-only route logic, fully covered by the new unit test (exercising the actual function) plus the source-scan confirming the route wiring, which is a stronger verification combination than a manual click-through would add for this kind of backend validation logic.

## Assumptions

- Fetching the existing shot row before every PATCH (one extra indexed `SELECT` by primary key) is an acceptable, minimal cost for the correctness guarantee it buys — recomputing eligibility correctly for a partial update that doesn't include Status/Fault Status is not possible without knowing the shot's current values.
- "Sour Shot" and other flags (`sourShot`, `isReference`, `signatureShot`, etc.) are correctly out of scope for this rule, per the task's own framing ("Sour shots may still be included if Status/Fault criteria are satisfied") — `computeIncludeInAnalysis` only ever looks at `status`/`faultStatus`, matching the client rule exactly.

## Unresolved

- None specific to this task.
- `artifacts/coffee-log/src/pages/Bags.tsx` and `docs/implementation/launch-readiness-audit.md` show as modified in git status from other concurrent work during this session — not touched or reviewed as part of this task.

# Bag / Hopper Lifecycle UI QA: Action-Path Clarity Fixes — 2026-08-25

## Completed

- Verified the two fixes recommended in the prior "Bag / Hopper Lifecycle Workflow Review" session (`routes/hopper.ts` DELETE endpoint + PATCH null-handling; `Bags.tsx`'s `ChangeBagDialog` `onError` cache invalidation) landed correctly in `c0c66cf` — confirmed by fresh code read and by the now-passing "Hopper API supports delete and clears bagId/startingBeans/phase/notes on explicit null" and "ChangeBagDialog refreshes cached queries on partial failure" tests.
- Independently identified the exact same "Change Bag vs. per-row Close/Start Phase — nothing explains which to use" confusion later confirmed by `docs/implementation/launch-readiness-audit.md`'s High-Priority Fix #5, which recommended the same fix while this review was already in progress. Added one sentence to the existing "Bag Lifecycle Flow" card's intro copy in `Bags.tsx`: *"The 'Change Bag' button above runs this whole flow in one guided dialog; each active bag's own Close and Start Phase buttons below do just one step at a time, if that's all you need."* No new component, no schema/API change — text only.
- Found a real, previously-unflagged duplicate-path risk: the "Add Bag" / "Edit Bag" dialog's own "Active Bag" switch could silently create a second active bag with **zero warning**, unlike Start Hopper Phase and Change Bag, which both already warn about multiple active bags. Fixed by adding the same amber `AlertTriangle` warning block (already established pattern in this file) to the Add/Edit dialog, shown when the switch is on and at least one *other* bag (excluding the one being edited, via `editing?.id`) is already active — text explicitly points the user at "Change Bag" instead.
- Confirmed (again, live) that `HOPPER_PHASE_OPTIONS` remains exactly `Phase 1`, `Phase 2`, `Phase 3`, `End of Bag`, `Single Bag Phase`, `Custom` in both places the selector appears (standalone Start Hopper Phase dialog and the embedded selector in Change Bag), and that `Grinder Cleanout` never appears as a phase option anywhere — confirmed unchanged since the last review, no drift.
- Confirmed measured-vs-intentionally-unmeasured closeout language is explicit (not just an optional blank field) in all three places it appears: standalone Close Out Bag dialog, the embedded closeout step in Change Bag, and the copy explaining what "skipping it" means in each.
- Noted, but explicitly did **not** implement (out of this task's Bags.tsx-centric scope): `docs/implementation/launch-readiness-audit.md` also flags that `hopperMass`/`hopperPercent` always show blank on the Dashboard's Active Hopper Status panel for phases started through the app's own dialogs (since those are imported/computed-elsewhere values, never written by `POST /api/hoppers`), which "reads as broken, not as not yet tracked." This is a `Dashboard.tsx` fix, not a `Bags.tsx` one — flagged here for whoever picks up Dashboard.tsx next, not implemented in this pass.
- Added one new contract test in `api-contract.test.ts` covering both fixes: the new guide-card sentence, and the new warning block's condition/copy/reference to "Change Bag."
- Did not implement Hopper Intelligence, invent any hopper formula, add a lifecycle-event table, or touch Quick Log.

## Verified

- `CI=true pnpm run typecheck` — passed (all 4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 59 passed, 0 failed, including the new test. One transient failure was observed on a first run (`computeIncludeInAnalysis enforces the single approved eligibility rule with no override path`, `DATABASE_URL must be set`) — confirmed unrelated to this task (it's a different, concurrent agent's in-progress work in `shots.ts`/`shot-eligibility.ts`/the new `shot-analysis-eligibility.ts`, not `Bags.tsx`) and confirmed passing on a clean re-run with `DATABASE_URL` sourced.
- `CI=true pnpm run build:render` — passed.
- Live smoke test against the real dev DB using Chrome automation: confirmed the new guide-card sentence renders correctly; toggled "Active Bag" on in the Add Bag dialog with Bag #7 already active and confirmed the new amber warning appears with the expected copy; cancelled via Escape and confirmed via the API that no bag was created and exactly one bag (#7) remained active — no test data left behind.

## Assumptions

- Treated the Dashboard.tsx `hopperMass`/`hopperPercent` blank-looks-broken finding as out of scope for a "Bags.tsx action paths" task rather than silently expanding scope to fix it — flagged instead for a deliberate follow-up.
- The new Add/Edit Bag warning intentionally does not block saving (matches the existing Start Hopper Phase pattern, which also only warns, never blocks) — multiple active bags remains a legitimate, supported workflow (e.g. decaf/regular split), just one the user should make deliberately, not by accident.

## Unresolved lifecycle issues

- Everything already on record from the prior review remains unchanged: no lifecycle-event table, hopper refill/top-up still requires it, structured maintenance checklist still deferred, two pre-existing orphaned Hopper rows (`bag_id=null`, `is_active=true`) still present and still harmless.
- New: the Dashboard.tsx `hopperMass`/`hopperPercent` blank-field clarity fix (noted above) is recommended but not implemented.
- The server-side `includeInAnalysis` enforcement gap this review's predecessor flagged appears to be actively being closed by a different, concurrent session (`shot-analysis-eligibility.ts`, in progress as of this task) — not verified end-to-end here since it's outside this task's file scope.

## Recommended commit command

Everything in this session's scope (my two Bags.tsx copy/UI fixes + their test) is small, low-risk, and fully verified. If Carl/Codex wants to commit just this task's changes on top of the current tree:

    git add artifacts/coffee-log/src/pages/Bags.tsx artifacts/api-server/src/api-contract.test.ts docs/completed-tasks.md
    git commit -m "fix(bags): clarify Change Bag vs per-row actions, warn before a second active bag"

Not run automatically, per task boundaries (no commit, no push) — provided as the exact command if/when authorized. Note the working tree also contains unrelated, concurrent, in-progress changes (`shots.ts`, `shot-eligibility.ts`, the new `shot-analysis-eligibility.ts`, `launch-readiness-audit.md`) that are not part of this command and should be reviewed/committed separately by whoever owns that work.

# Quick Log Hard-Block / Shelving Cleanup — 2026-08-25

## Completed

- **Confirmed exactly what `docs/implementation/launch-readiness-audit.md`'s High-Priority Fix #6 already documented**: `/shots/quick` was still a fully live route in `App.tsx` (`<Route path="/shots/quick" component={QuickLog} />`), even though nothing in `Shell.tsx`'s navigation (desktop sidebar, mobile bottom nav, or the mobile "Setup & System" dropdown) linked to it — confirmed by reading all six nav arrays in `Shell.tsx`. Being unlinked is not the same as being blocked: a stray bookmark, old shared link, or guessed URL still landed a user on the shelved Quick Log form.
- Replaced the route's rendered component with a redirect: `<Route path="/shots/quick"><Redirect to="/shots/new" /></Route>`, using wouter's built-in `Redirect` component (already a dependency, no new package). Chose the pure-redirect option over an interstitial "this mode has been retired" message — the task's own instructions explicitly prefer redirect when it's the smallest and least confusing fix, and since nothing in the UI ever links here, the only visitors are stale bookmarks/links, for whom landing directly on the primary Log Shot form is the least surprising outcome.
- Removed the now-unused `import QuickLog from "@/pages/QuickLog";` from `App.tsx` (dead import once nothing renders it) — this is import hygiene, not deletion of `QuickLog.tsx` itself, which remains on disk, untouched, exactly as the "prefer routing/copy cleanup over destructive removal" project rule and the task's own boundary require. As a side effect, the unimported page is now tree-shaken out of the production bundle (2177 vs 2178 modules, ~23KB smaller gzipped JS) without deleting any source file.
- No nav entries needed removal or relabeling — confirmed none existed pointing at Quick Log before this change (already true from an earlier session's work), so task #5 was a no-op check, not a change.
- Did not touch `ShotForm.tsx`, `QuickLog.tsx`'s internal contents, schemas, migrations, OpenAPI, or any API route — this was routing-only.

## Tests added/updated

Added a new test to `artifacts/api-server/src/api-contract.test.ts`: `"/shots/quick is hard-blocked (redirects), not just unlinked from navigation"` — confirms `App.tsx` contains the `/shots/quick` → `Redirect to="/shots/new"` route, confirms `QuickLog` is neither rendered (`component={QuickLog}`) nor imported anywhere in `App.tsx` (so nothing could silently re-wire it back onto a live route without this test catching the import/render reappearing), and confirms `QuickLog.tsx` still exists on disk (not deleted). Left the existing `"Primary logging UI uses the full shot form and keeps Quick Log shelved"` test's nav-level check (`doesNotMatch(shellSource, /href="\/shots\/quick"/)`) unchanged — it's still correct and complementary, just insufficient on its own, which is exactly the gap the new test closes.

## Verified

- `CI=true pnpm run typecheck` — passed (workspace-wide).
- `CI=true pnpm --filter @workspace/api-server test` — 60/60 passed (59 pre-existing as of this session + 1 new).
- `CI=true pnpm run build:render` — build succeeded; production JS bundle for `artifacts/coffee-log` shrank slightly (778.69kB → 755.61kB pre-gzip) since `QuickLog.tsx` is no longer reachable from any import graph root.

## Assumptions

- A silent redirect (no toast/banner) is sufficient since the route has no UI entry point — anyone who reaches it is following a stale link, not making an in-app navigation choice that needs explaining in the moment.
- Removing the unused `import QuickLog from "@/pages/QuickLog"` line counts as "routing cleanup," not "deleting meaningful code" — the file, its logic, and its history are untouched; only the one now-dead import statement in a different file was removed.

## Unresolved

- None specific to this task.
- `docs/implementation/launch-readiness-audit.md` also lists a related, separate item ("Dashboard hopper blank-stat labeling," High-Priority Fix #7) bundled alongside the Quick Log fix in its own draft task prompt for a different agent — intentionally not started here, since this task's scope was Quick Log only.

# Dashboard Hopper Blank-State Clarity — 2026-08-25

## Completed

- Fixed `docs/implementation/launch-readiness-audit.md` High-Priority Fix #7: the Dashboard's Active Hopper Status panel silently hid `hopperMass`/`hopperPercent`/`shotsLeftEstimate` whenever they were `null`, with zero explanation. Since those three fields are imported/computed-elsewhere values that `POST /api/hoppers` and `PATCH /api/hoppers/:id` never write (confirmed by re-reading `artifacts/api-server/src/routes/hopper.ts` fresh — the create/update bodies only ever set `name`/`bagId`/`startingBeans`/`isActive`/`phase`/`notes`), every hopper phase started through the app's own "Start Hopper Phase"/"Change Bag" dialogs showed a populated "Starting beans" box next to what looked like missing data, not "not yet tracked" data.
- Confirmed the API never exposes a distinguishing "imported vs. app-created" signal to the frontend at all: `toHopperApi()` in `artifacts/api-server/src/lib/api-shapes.ts` explicitly strips `airtableRecordId` (and `rawRow`) before the hopper JSON reaches the client. So rather than inventing a signal that isn't there, used the same data-driven condition the audit doc itself recommended: show the explanatory box specifically when `hopper.startingBeans != null` and the given imported field is `null`, per field.
- Edited `artifacts/coffee-log/src/pages/Dashboard.tsx`'s Active Hopper Status panel (~line 322-376): for each of `hopperMass`, `hopperPercent`, and `shotsLeftEstimate`, when the value is present it renders exactly as before (`g`/`%`/count, with existing `accent`/`dim` styling untouched); when it's `null` but `hopper.startingBeans != null`, it now renders an `IntelStat` with `value="Not tracked yet"` and `note="Imported value — not set for phases started in the app"` (reusing the existing `IntelStat` component's already-present but previously-unused `note` prop — no new sub-component). When `startingBeans` is also `null` (a hopper with essentially no data at all), the box is omitted entirely, same as before — that case isn't the "looks broken" scenario this task targets.
- Did not touch `hopperMass`/`hopperPercent` for genuinely imported hoppers (e.g. hopper #15, #17 in the live dev DB) — those still show their real numeric values unchanged, confirmed live.
- Did not invent, calculate, or backfill any hopper mass/percentage/shots-left formula anywhere — this is a pure display/copy fix; the underlying `null` values are untouched in the database and API response.
- Did not touch `Bags.tsx`, hopper schema, hopper API routes/contracts, Quick Log, or any Bag lifecycle logic.

## Files inspected

`docs/implementation/launch-readiness-audit.md` (High-Priority Fix #7, and its own "Part 2: Dashboard hopper blank-stat labeling" draft task prompt near the end of the file — confirms this task's brief was written directly from that doc), `docs/implementation/bag-hopper-lifecycle-plan.md`, `docs/completed-tasks.md` (this file, tail), `artifacts/coffee-log/src/pages/Dashboard.tsx` (full, fresh read), `artifacts/api-server/src/routes/hopper.ts` (fresh — confirmed POST/PATCH bodies never accept `hopperMass`/`hopperPercent`/`shotsLeftEstimate`), `lib/db/src/schema/hopper.ts` (fresh — confirmed `airtableRecordId` is the only import-vs-app-created signal in the schema), `artifacts/api-server/src/lib/api-shapes.ts` (`toHopperApi` — confirmed `airtableRecordId` is stripped before the API response, so it's not available to the frontend at all), `artifacts/api-server/src/api-contract.test.ts` (fresh, for test-insertion context and existing Dashboard-testing pattern).

## Dashboard behavior before/after

- **Before**: a hopper phase started in-app (e.g. live hopper #18, "MH Bag 7 2026-08-20 — Phase 1", `startingBeans: 300`, `hopperMass`/`hopperPercent`/`shotsLeftEstimate` all `null`) rendered a stat grid with only a single "Starting beans: 300g" box and three empty gaps where the other stats would be — visually indistinguishable from a bug.
- **After**: the same hopper now renders all four boxes: "Starting beans: 300g", and three "Not tracked yet" boxes (Hopper mass / Hopper % / Shots left (est.)) each with the note "Imported value — not set for phases started in the app". Live-verified via Chrome against the real dev DB with hopper #18 / active bag #7 (screenshot confirmed, no test data created — this was a pure read against existing production data, nothing was created, changed, or cleaned up).
- Imported hoppers with real values (e.g. #15, #17) are unaffected — their numeric `g`/`%`/count values still render exactly as before.

## Tests added/updated

Added `"Dashboard explains blank hopper mass/percent/shots-left instead of hiding them silently"` to `artifacts/api-server/src/api-contract.test.ts`, immediately after the existing `"Dashboard summarizes puck screen display by useful thickness only"` test, following the same source-scan pattern (reads `Dashboard.tsx` fresh via `readFile`). It asserts each of the three `IntelStat` fallback calls (`label="Hopper mass" value="Not tracked yet"`, etc.) is present, asserts the explanatory note text is present, and asserts no hopper mass/percentage formula was introduced (`doesNotMatch` guards against a computed assignment pattern like `hopperMass = ... hopperPercent *` or `hopperPercent = ... startingBeans`).

## Verified

- `CI=true pnpm run typecheck` — passed (all 4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 60/60 passed.
- `CI=true pnpm run build:render` — passed.
- Live smoke test against the real dev DB using Chrome automation: confirmed hopper #18 (active, linked to active bag #7, `startingBeans` set, all three imported fields `null`) now shows the "Not tracked yet" / note copy in all three boxes instead of blank gaps. Pure read-only verification — no data created, modified, or needing cleanup.

## Assumptions

- Used `hopper.startingBeans != null` (rather than the unavailable `airtableRecordId`) as the per-field signal for "this looks like an app-created phase with real data next to a blank," exactly as `launch-readiness-audit.md`'s own "Part 2" draft task prompt specified ("shown specifically when startingBeans is present but hopperMass/hopperPercent are null").
- Extended the same treatment to `shotsLeftEstimate`, not just `hopperMass`/`hopperPercent` — the task's own Tasks list named `shotsLeftEstimate` explicitly as in-scope, and it's the identical bug class (import-only field, never written by any app write path, silently hidden when null).
- Reused the existing `IntelStat` component's already-present `note` prop rather than adding new UI, on the assumption that a small win here is a smaller, more reviewable diff than introducing a new banner/paragraph pattern.

## Unresolved hopper issues

- Everything already on record from prior reviews remains unchanged: no lifecycle-event table, hopper refill/top-up still requires it, structured maintenance checklist still deferred, the two pre-existing orphaned Hopper rows (`bag_id=null`, `is_active=true`) still present and still harmless.
- No hopper mass/percentage formula exists or was implemented — per this project's standing rule, that remains explicitly out of scope until a formula is approved.
- This closes `launch-readiness-audit.md` High-Priority Fix #7. The audit's own top-5 ranked list still separately tracks a related Quick Log item (Fix #6), already resolved in a separate prior task, and the in-progress `computeIncludeInAnalysis` work, which remains untouched here as instructed.

## Recommended commit command

This task's changes are small, display-only, and fully verified. If Carl/Codex wants to commit just this task's changes on top of the current tree:

    git add artifacts/coffee-log/src/pages/Dashboard.tsx artifacts/api-server/src/api-contract.test.ts docs/completed-tasks.md
    git commit -m "fix(dashboard): explain blank hopper mass/percent/shots-left for in-app phases"

Not run automatically, per task boundaries (no commit, no push). Note the working tree also contains other unrelated, concurrent, in-progress changes at the time of this task (`ShotForm.tsx`, `docs/ADR/README.md`, `docs/implementation/launch-readiness-audit.md`, a new `docs/ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md`) that are not part of this command and should be reviewed/committed separately by whoever owns that work.

# Log Shot Flag/Status Behavior Fix — 2026-08-25

## Completed

- Audited `ShotForm.tsx`'s Reference/Signature/Sour Shot checkbox handlers against the 8 approved Coffee Log flag rules. Found that 7 of 8 were already implemented by prior work (Signature implies Reference; Reference/Signature suggest Status "Dialed In" only if blank; Sour clears Reference/Signature; Sour suggests Status "Good" and Fault Status "Good" only if blank; existing values are never overwritten; sour-shot analysis eligibility and server-side `includeInAnalysis` recompute were already correct/untouched).
- Fixed the one real gap: Reference Shot's and Signature Shot's `onCheckedChange` handlers did not suggest Fault Status = "Good" — only Sour Shot's handler did. Added `setFaultStatusIfBlank("Good");` to both handlers, immediately after their existing `setStatusIfBlank("Dialed In");` call, using the same pre-existing "only if blank" helper already used elsewhere.
- Signature Shot's handler sets `isReference` via `form.setValue(...)` rather than by triggering Reference Shot's own checkbox, so React Hook Form's programmatic `setValue` does not invoke Reference's `onCheckedChange` — Signature's handler therefore needed its own `setFaultStatusIfBlank("Good")` call rather than inheriting it from Reference's handler.

## Files inspected

- `artifacts/coffee-log/src/pages/ShotForm.tsx`
- `artifacts/coffee-log/src/lib/selector-options.ts` (from prior-session context; `describeAnalysisEligibility` unchanged)
- `artifacts/api-server/src/lib/shot-analysis-eligibility.ts` (from prior-session context; unchanged, already authoritative server-side)
- `artifacts/api-server/src/api-contract.test.ts`
- `docs/completed-tasks.md`

## Tests added/updated

Updated the existing `"Log Shot flag selection suggests Status/Fault Status only when blank, never overwrites"` test in `artifacts/api-server/src/api-contract.test.ts`:

- Removed a stale comment claiming Reference/Signature "do not touch Fault Status" (that was the bug this task fixes).
- Added two block-scoped literal substring assertions (not just generic `.includes()` checks, which would have passed trivially since Sour Shot's handler already contained `setFaultStatusIfBlank("Good")`) confirming the exact `if (ref) { ... }` and `if (sig) { ... }` bodies in `ShotForm.tsx` each call both `setStatusIfBlank("Dialed In")` and `setFaultStatusIfBlank("Good")`.

## Verified

- `CI=true pnpm run typecheck` — passed (4/4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 61/61 passed, 0 failed. `static-serving`-style production-fallback test (`"production app serves frontend fallback without swallowing API routes"`) passed cleanly; no 127.0.0.1 bind failure occurred this run.
- `CI=true pnpm run build:render` — build succeeded (pre-existing sourcemap warnings on `tooltip.tsx`/`label.tsx`/`select.tsx`/`dropdown-menu.tsx` and a >500kB chunk-size warning are unrelated to this change and present on the unmodified build).

## Assumptions

- Requirement 6 ("Sour shots may remain included in analysis if Status/Fault Status qualify") required no code change: the server's `computeIncludeInAnalysis` and the client's `describeAnalysisEligibility` both key only off `status`/`faultStatus`, never `sourShot`, so a sour shot with qualifying Status/Fault Status is already eligible.
- Requirement 8 ("do not change Include in Analysis directly in the client") was treated as a boundary against adding *new* client-side logic that sets `includeInAnalysis` as part of this task, not as an instruction to remove the pre-existing `includeInAnalysis: describeAnalysisEligibility(...).included` line in `ShotForm.tsx`'s submit payload (line ~565). That line predates this task, is covered by its own separate existing test (`"Shot entry separates serving context from automated analysis eligibility"`), and is harmless/redundant now that the server unconditionally recomputes and overrides `includeInAnalysis` on both create and update. Removing it was out of this task's stated scope ("Likely files to change" did not list it) and was not attempted.
- Did not change the Flags helper copy text ("Reference = benchmark shot. Signature = rare, extraordinary (implies Reference). Sour = valid if Status/Fault are Good.") since it is not incorrect — it doesn't mention the Fault Status suggestion, but no rule requires the UI copy to enumerate every suggestion side-effect.

## Unresolved issues

- None new. (An earlier draft of this entry flagged the "Mobile-Friendly Number Controls For Log Shot" documentation as possibly missing; re-checked and confirmed it is present in this file, plus several follow-on stepper-refinement entries — no action needed.)
- `git status --porcelain -b` at the time of this task showed a clean tree relative to this task's own edits (only `ShotForm.tsx`, `api-contract.test.ts`, and this doc modified); the branch is 8 commits ahead of `origin/main` from prior sessions' work, not reviewed here.

## Recommended commit command

    git add artifacts/coffee-log/src/pages/ShotForm.tsx artifacts/api-server/src/api-contract.test.ts docs/completed-tasks.md
    git commit -m "fix(log-shot): Reference/Signature Shot also suggest Fault Status = Good when blank"

Not run automatically, per task boundaries (no commit, no push).

# Owner-Alpha Usability Review — Shot Detail "null" Text Bug — 2026-08-25

## Completed

- Reviewed `ShotForm.tsx`, `ShotDetail.tsx`, `Dashboard.tsx`, `Shell.tsx`, and `selector-options.ts` against the priority list: Log Shot mobile usability, Shot Detail clarity, Dashboard clarity, colorblind-friendly status indicators, and hidden/unclearly-displayed recorded data.
- Found and fixed the highest-value issue: `ShotDetail.tsx`'s Extraction Details grid rendered `Basket Dose`, `Yield`, and `Pour Time` with **no null guard at all** (`` `${shot.dose}g` `` etc.), unlike the four sibling fields in the same grid (`Flow Time`, `First Pour Delay` already used `!= null ? ... : "-"`; `Temp`/`Ratio` used a truthy check). Confirmed via a live query against the real dev DB that this is not a hypothetical edge case: 47/247 shots have `dose IS NULL`, 32 have `yield IS NULL`, 39 have `pour_time IS NULL` — these are real "Grinder Setup"/workflow-event-only shots (e.g. shot #240: a grinder cleanout logged via the "Record grind change / purge waste" checkbox, `status: "Grinder Setup"`, `dose`/`yield`/`pourTime`/`rating` all genuinely null). Before this fix, visiting such a shot's detail page literally showed **"nullg" / "nullg" / "nulls"** — live-verified via Chrome on `/shots/240` before the fix, screenshot confirmed.
- Fixed all five fields in the same grid row for consistency in one pass: `dose`/`yield`/`pourTime` gained the missing `!= null` guard (new bug, now fixed); `temperature`/`ratio` were normalized from a truthy check to `!= null` (defensive/preventive only — a `0` value was not observed in the live data, but is the same falsy-zero bug class already fixed for `rating` in an earlier session).
- Re-verified live on `/shots/240` after the fix and rebuild: all fields now correctly show `-` instead of "null"/"undefined" text. Pure read-only verification against existing production data — no shot data created, modified, or needing cleanup.

## Files inspected

`artifacts/coffee-log/src/pages/ShotForm.tsx` (including its currently-uncommitted Reference/Signature fault-status diff, left untouched — not part of this task), `artifacts/coffee-log/src/pages/ShotDetail.tsx`, `artifacts/coffee-log/src/pages/Dashboard.tsx`, `artifacts/coffee-log/src/components/layout/Shell.tsx`, `artifacts/coffee-log/src/lib/selector-options.ts`, `lib/db/src/schema/shots.ts` (confirmed `dose`/`yield`/`pour_time` are nullable columns), `docs/completed-tasks.md`, `docs/implementation/launch-readiness-audit.md`.

## Files changed

- `artifacts/coffee-log/src/pages/ShotDetail.tsx` — five `DetailItem` value expressions in the Extraction Details grid.
- `artifacts/api-server/src/api-contract.test.ts` — new regression test.
- `docs/completed-tasks.md` — this entry.

## Tests added/updated

Added `"Shot Detail never renders the literal word null for unrecorded extraction fields"` to `artifacts/api-server/src/api-contract.test.ts`, immediately after the existing `"Shot Detail displays zero ratings instead of treating them as blank"` test (same source-scan pattern): asserts the corrected `!= null` guard is present for `dose`/`yield`/`pourTime`, and asserts the old unguarded template-literal patterns are absent.

## Verified

- `CI=true pnpm run typecheck` — passed (4/4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 62/62 passed (61 pre-existing at the start of this task + 1 new).
- `CI=true pnpm run build:render` — passed.
- Live Chrome verification against the real dev DB, before and after the fix, on shot #240 (a real shot with all three fields null) — confirmed the visual defect before the fix and its resolution after.

## Findings not acted on (colorblind indicators / mobile usability)

- **Colorblind status indicators**: `Shell.tsx`'s mobile bottom nav and `Dashboard.tsx`'s `DeltaStatusMarker` already have non-color cues (underline+bold, and pattern-fill overlays respectively) from earlier sessions. However, several `Dashboard.tsx` text spans still convey severity by color alone with no icon or pattern — e.g. `bag.openDays >= 28 ? "text-destructive" : "text-amber-600"` on the "Open Nd" label, and the similar `daysSinceLastChange`/grind-drift coloring. The underlying number is always visible (so no data is hidden), but the at-a-glance severity cue is color-only. Judged lower-value than the "null" text bug (a real display defect vs. an accessibility polish item) and left as a candidate for a future task rather than expanded into this one.
- **Log Shot mobile usability**: no new defect found this pass. `NumberStepper`, bag-selector pills, and card layout all already use mobile-safe patterns from prior sessions (established in this file's history). Did not find a concrete, verifiable mobile-usability bug to act on.

## Assumptions

- Treated `temperature`/`ratio`'s truthy-vs-`!= null` normalization as in-scope for the same tiny fix (same file, same grid, same one-line change per field) even though no live `0` value was observed, since it's the identical bug class already fixed once for `rating` and costs nothing extra to close off.
- Left the currently-uncommitted `ShotForm.tsx` / `api-contract.test.ts` diff (Reference/Signature Shot fault-status suggestion, documented in the "Log Shot Flag/Status Behavior Fix" entry immediately above this one) completely untouched — it predates this task and is unrelated to Shot Detail.

## Unresolved issues

- The colorblind-severity-by-text-color-only pattern noted above (Dashboard bag-age/grind-drift coloring) is unresolved — flagged for a future task if wanted, not implemented here since it's polish, not a defect, and this task's boundary is one tiny fix per review.
- No mobile-usability defect was found or fixed this pass.

## Recommended commit command

    git add artifacts/coffee-log/src/pages/ShotDetail.tsx artifacts/api-server/src/api-contract.test.ts docs/completed-tasks.md
    git commit -m "fix(shots): show '-' instead of literal null text for unrecorded dose/yield/pour time"

Not run automatically, per task boundaries (no commit, no push). Note the working tree also contains an unrelated, uncommitted, already-documented change from a separate task (`ShotForm.tsx`'s Reference/Signature fault-status fix) that is not part of this command.

# Compact Active Hopper Status UI — 2026-08-26

## Completed

- Fixed `Dashboard.tsx` so "Active Hopper Status" no longer renders as a large standalone panel when a hopper only has phase-level context (`phase` + `startingBeans`, no `hopperMass`/`hopperPercent`/`shotsLeftEstimate`).
- Split `activeHoppers` into `detailedHoppers` (has at least one of `hopperMass`/`hopperPercent`/`shotsLeftEstimate` populated — real, phase-level calculations) and `compactHoppers` (has none of the three).
- `compactHoppers` are now rendered as a small contextual line ("Line 4") inside the existing "Current Baseline" card, immediately after the equipment line, formatted exactly as the owner's preferred direction specified: `Hopper Phase: {phase} · Started With {startingBeans}g · Phase Tracking Active` (parts are omitted individually if `phase` or `startingBeans` is itself null, rather than showing a blank clause). Uses the existing `Package` icon (already used for the "Starting beans" stat) rather than color, per the color-blind-friendly requirement.
- The standalone "Active Hopper Status" section now only renders — and only maps over — `detailedHoppers`, i.e. only when at least one active hopper has a real calculated field. The two previous dashed-border placeholder cards ("No active bag set — hopper status is shown per active bag" and "No active hopper linked to this bag / Hopper tracking hasn't been set up for this bag yet") were removed entirely, since those were exactly the kind of "big empty card" the task said not to show. No hopper-related big card or section appears at all now for a bag with no active hopper, or with only phase-only hoppers.
- The full-card display for hoppers that do have real calculated fields (including the existing "Not tracked yet" fallback treatment for a partially-populated imported hopper) is byte-for-byte unchanged — only which hoppers reach that branch changed.
- No hopper formula was invented; no phase-remaining/phase-consumed/phase-shots-left calculation was added — `compactHoppers` only ever displays fields the hopper record already has (`phase`, `startingBeans`) plus a static "Phase Tracking Active" label.
- No schema, API, migration, OpenAPI, HMI, or intelligence-engine change. No other Dashboard section touched.

## Files inspected

- `artifacts/coffee-log/src/pages/Dashboard.tsx`
- `artifacts/api-server/src/api-contract.test.ts`
- `docs/table-relationships.md` (confirmed `Hopper Phase` approved values include `Single Bag Phase`, matching the owner's example format exactly — no invented label)
- `docs/completed-tasks.md`

## Tests added/updated

Added `"Active Hopper Status is compact for phase-only hoppers, not a large standalone panel"` to `artifacts/api-server/src/api-contract.test.ts`, immediately after the existing `"Dashboard explains blank hopper mass/percent/shots-left instead of hiding them silently"` test, following the same source-scan pattern (fresh `readFile` of `Dashboard.tsx`). Asserts: the `detailedHoppers`/`compactHoppers` filter definitions exist with the correct predicates; the compact line's three literal template clauses and its "Line 4" marker comment are present; the full section is gated on `detailedHoppers.length > 0` and maps only over `detailedHoppers`; the two removed placeholder-card strings no longer appear anywhere in the file; no `phaseRemaining =` / `phaseConsumed =` assignment was introduced.

## Verified

- `CI=true pnpm run typecheck` — passed (4/4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 63/63 passed, 0 failed. No `static-serving`/127.0.0.1 bind issue occurred this run.
- `CI=true pnpm run build:render` — build succeeded (pre-existing, unrelated sourcemap/chunk-size warnings only, same as prior sessions' builds).
- Live smoke test against the real dev DB (already running on port 3000) via Chrome automation, `get_page_text` at a 390×844 mobile viewport: confirmed the real active hopper (`#18`, linked to active Bag #7, `phase: "Phase 1"`, `startingBeans: 300`, all three calculated fields `null`) renders the line `Hopper Phase: Phase 1 · Started With 300g · Phase Tracking Active` directly inside the Current Baseline card, and that no "Active Hopper Status" heading/section appears anywhere on the page for this bag. Did not exercise the `detailedHoppers` full-card path live — the dev DB's only two hoppers with real `hopperMass`/`hopperPercent` values (`#15`, `#17`) are pre-existing orphaned rows with `bagId: null` (documented in earlier sessions as harmless leftovers), so they never attach to any bag's dashboard; that path is unchanged code already covered by the pre-existing "Not tracked yet" fallback test plus this task's new source-scan assertions. Pure read-only verification — no data created, modified, or needing cleanup.

## Assumptions

- Interpreted "real phase-level calculations are present" as: at least one of `hopperMass`, `hopperPercent`, `shotsLeftEstimate` is non-null on that specific hopper record — these are exactly the three fields the existing code already treats as calculated/imported-only (never written by `POST`/`PATCH /api/hoppers`), per the immediately-prior "Dashboard Hopper Blank-State Clarity" task.
- Followed the owner's exact preferred line format and wording (`Hopper Phase: … · Started With …g · Phase Tracking Active`) literally, including for `Single Bag Phase`, rather than paraphrasing.
- Did not add a compact line for the "no active hopper at all" case — there is no phase/startingBeans data to show compactly, and the task's own framing ("do not show a big empty card unless real phase-level calculations are present") reads as license to show nothing at all in that case, not just a smaller nothing-card.
- Left multiple-active-hoppers-per-bag handling generic (each compact hopper gets its own line, each detailed hopper its own card) even though a bag normally has at most one active hopper in practice — matches the pre-existing code's assumption that `activeHoppers` can contain more than one row.

## Unresolved issues

- None new from this task. Carried forward, unchanged: the two orphaned `bagId=null` active Hopper rows (`#15`, `#17`) noted above remain in the dev DB and are still harmless/invisible to any Dashboard view, exactly as documented in earlier sessions.

## Recommended commit command

    git add artifacts/coffee-log/src/pages/Dashboard.tsx artifacts/api-server/src/api-contract.test.ts docs/completed-tasks.md
    git commit -m "fix(dashboard): compact Active Hopper Status into a Current Baseline line for phase-only hoppers"

Not run automatically, per task boundaries (no commit, no push). Note the working tree also contains other unrelated, uncommitted, already-documented changes from separate tasks (`ShotForm.tsx`'s Reference/Signature fault-status fix, `ShotDetail.tsx`'s null-text fix) that are not part of this command.

# Planning Reconciliation: Brew Method, Hopper Capacity, System Phase/Experiments — 2026-08-25

## Completed

Recorded seven owner decisions from a product/architecture discussion across the appropriate existing docs, making targeted edits rather than new duplicate sections, per task boundary:

1. **Brew Method vs Drink Type**: added a new §4.1.1 to `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md` defining the distinction (how extracted vs. what was served) and the future shot-level-field intent (machine may suggest a default, is not itself the evidence). Added a corresponding bullet to `bag-hopper-lifecycle-plan.md`'s Future Development Notes and a field-list mention in `BSE_PRODUCT_LANDING_PAGE_CONTENT.md`'s Product Pillar 1. Added a clarifying note to `release-candidate-checklist.md`'s Gate 0.5 so Brew Method isn't accidentally read as covered by the already-shelved Drink Type machine/profile-default decision — and corrected a now-stale claim in that same gate ("Shots do not yet expose a machine/grinder selector"), which was true when written but no longer is as of this session's equipment-selector work.
2. **Hopper phases**: `Single Bag Phase`'s definition was already present verbatim in `table-relationships.md`; added the missing `End of Bag` definition next to it. Phase label list was already correct and unchanged.
3. **Hopper capacity**: added the "guidance, not a hard limit — actual Phase Starting Beans always wins, app may warn on overfill but must allow it" rule to `table-relationships.md` (the authoritative home, since it already introduced these two fields), with a concrete 340g/300g example. Added a one-line cross-reference (not a duplicate) from `equipment-capability-library-model.md`'s existing field list.
4. **System Phase and Experiments**: restructured `bag-hopper-lifecycle-plan.md`'s "System Phase / Experiment Phase model" section, which previously flattened both concepts into one example list. Split into System Phase examples (broad era, e.g. `System Phase 4 — Active Experimentation Era`) and Experiment examples (specific test nested inside a phase, e.g. `Experiment: Hopper Overfill / Timed Dose Stability`), and added the rule that experiment-specific fields/metrics should only apply while that experiment is active. Fixed the same flattening in `BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`'s "Learning phases" section with a cross-reference back to the fuller model rather than repeating it.
5. **Future telemetry**: added a telemetry-file-upload-as-Bluetooth-alternative note (with provenance-attachment requirement) to `docs/ROADMAP.md`'s Future section, `BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`'s Future scope section, and `BSE_PRODUCT_LANDING_PAGE_CONTENT.md`'s Future development language section.
6. **Advanced subscription**: added a new "Advanced tier (future, not launch pricing)" subsection to `BSE_PRODUCT_LANDING_PAGE_CONTENT.md` and a matching, cost-framing-consistent subsection to `BSE_SUBSCRIBER_FEASIBILITY.md` (modeled on that doc's existing community/media staged-cost-gating section), recording the Founder-cohort-included-access decision and the "don't promise every future line forever" caveat. Added to the landing page's "Not launch scope" list.
7. **MCP/API natural-language logging**: added to `BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`'s Future scope section (cross-referencing ADR-0009 for the auth/permissions dependency) and to the landing page's "Not launch scope" list.

## Files changed

- `docs/ROADMAP.md`
- `docs/table-relationships.md`
- `docs/architecture/equipment-capability-library-model.md`
- `docs/implementation/bag-hopper-lifecycle-plan.md`
- `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`
- `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md`
- `docs/product/BSE_SUBSCRIBER_FEASIBILITY.md`
- `docs/implementation/release-candidate-checklist.md`
- `docs/completed-tasks.md` (this entry)

No application code, schema, API, migration, generated-client, or test files touched.

## Verified

- `git diff` reviewed for every changed file to confirm each edit is targeted and additive, not a rewrite of surrounding content.
- Confirmed via `git status` before starting that none of these 8 doc files were concurrently dirty from other in-flight work (two other doc/code files were dirty from separate, unrelated tasks and were left untouched).
- No build run — documentation-only change, no code touched.

## Assumptions

- Where a point was already fully documented elsewhere (e.g. `Single Bag Phase`'s definition, the approved phase-label list, the existing Hopper Capacity/Preferred Fill field proposal), left it as-is or added only a cross-reference, per the task's explicit "do not duplicate" instruction, rather than re-stating it.
- Treated the Gate 0.5 "Shots do not yet expose a machine/grinder selector" correction as in-scope for this task, since it sits in the exact same sentence being edited for the Brew Method clarification and leaving a known-stale claim uncorrected right next to a new edit would be a worse outcome than fixing it.

## Unresolved

- None of these are implementation decisions — all seven remain documentation/future-scope only, per this task's explicit boundary. No schema fields, formulas, or UI were added.

# Log Shot UI Usability Review — 2026-08-26

## Completed

Reviewed `ShotForm.tsx` against all 6 known-issue areas in this task's brief. Result: 5 of 6 areas were already correctly implemented by prior sessions (live-verified, not just read); 1 area (#1, Default Drink Type) had a real but non-code root cause and was fixed; 1 area (#6, selector single/multi consistency) surfaced a genuine, documented, moderate-value mismatch that is not tiny and is written up below as an Agent 1 prompt rather than implemented here.

1. **Drink Type default (fixed — data, not code)**: `ShotForm.tsx`'s `useEffect` that applies `settings.defaultDrinkType` to new shots was already correct (confirmed by reading it and by the pre-existing test `"Shot entry separates serving context from automated analysis eligibility"`, which already source-scans for `defaultDrinkType` wiring in `Settings.tsx`/`selector-options.ts`). The actual problem: `GET /api/settings` on the live dev DB had no `defaultDrinkType` key at all — it had never been saved. Live-verified the bug end-to-end: `/shots/new` showed `Drink Type: — not set —`. **Fix**: set `Default Drink Type = Americano` via the Settings UI (the exact mechanism a real user would use — matches this task's own stated desired setup) and saved. Re-verified `/shots/new` now shows `Drink Type: Americano` pre-filled. Also confirmed `Default Brew Method = Espresso` was already correctly set (a separate, already-working per-app-instance setting, distinct from the per-`Machine` equipment `brewMethod` column) — no action needed there. Per the task's explicit instruction, did not add any shot-level Brew Method field — it does not exist on `shots`, and none was added.
2. **Default fields / stepper starting value (confirmed correct, no fix needed)**: Live-tested `NumberStepper`'s `+` button on an empty field with a placeholder (Grind Setting: empty, placeholder `2.33` → clicked `+` → became `2.34`, not `0.01`; Top-Up Grind Added: empty, placeholder `0.1` → clicked `+` → became `0.2`, not `0.1`). Confirms `adjust()`'s `base = currentNumeric() ?? suggestedNumeric() ?? 0` fallback chain already works correctly across the shared component.
3. **Top-Up Grind / Top-Up Time Adj (confirmed correct, no fix needed)**: `Top-Up Grind Added`'s existing caption already reads "Extra grams added, e.g. 0.5 — not the final basket dose," matching this task's own example wording verbatim. `Top-Up Time Adj` already defaults from the `grindMinTime` setting (`settings?.grindMinTime ? Number(settings.grindMinTime) : 0.2`), i.e. the grinder-minimum-pulse setting, exactly as this task describes. No formula invented, none added.
4. **Grind Waste (confirmed correct, no fix needed)**: Live-verified the `Grind Waste (g)` field is rendered only when "Record grind change / purge waste" is checked, with caption "A workflow event, not part of the brewed basket dose or extraction yield" and the checkbox's own caption "Counts against bag/hopper remaining, but not basket dose."
5. **Flags (confirmed correct, no fix needed)**: Live-verified all three rules on `/shots/new`: checking Signature Shot auto-checked Reference Shot and the eligibility banner switched to "Shot is included in analysis — Dialed In with Fault Status Good is included in analysis" (confirms both `setStatusIfBlank`/`setFaultStatusIfBlank` fired); checking Sour Shot afterward cleared both Reference and Signature while the banner stayed "included" (confirms Sour does not clobber an already-Good Status/Fault, i.e. a sour shot can remain analytically valid). This is the fix from commit `f837714` (a prior session), reconfirmed live rather than re-implemented.
6. **Single-select vs multi-select consistency (real finding — not fixed, see Agent 1 prompt below)**: Cross-checked all 4 array-typed selector fields (`expressionStyle`, `beanAchievement`, `shotClassification`, `faultStatus`) against `docs/csv-data-dictionary.md`'s per-field type column and live production data. `faultStatus`/`beanAchievement`/`shotClassification` are each explicitly documented as "Multi Select historically; curated as single-choice ... in app" — i.e. the app's current single-dropdown UI (`ScalarSelect`, `(field.value ?? [])[0]`) for all three is the *intended, approved* simplification, confirmed correct as-is (live data has heavy real multi-value usage for `shotClassification` at 101/157 populated shots and `beanAchievement` at 24/85, but the app deliberately curates these down to one choice for new logging — not a bug). `expressionStyle` is the one outlier: the data dictionary lists it as plain **"Multi Select"** (no single-choice curation qualifier) with UI type **"chips"** in `field-type-map.md`'s control policy ("Multi-selects use ordered chip selectors"), yet `ShotForm.tsx` renders it through the exact same single-value `ScalarSelect` as the other three. Live data currently has zero shots with more than one `expression_style` value (124 populated, 0 multi), so this is a documented design-consistency gap, not an active data-loss risk today — written up as a follow-up rather than fixed here since it requires a new multi-select chip UI, not a copy/label tweak.

## Files inspected

`artifacts/coffee-log/src/pages/ShotForm.tsx`, `artifacts/coffee-log/src/lib/selector-options.ts`, `artifacts/coffee-log/src/pages/Settings.tsx`, `lib/db/src/schema/equipment.ts` (confirmed `brewMethod` is a real per-`Machine` column, unrelated to the Settings `brewMethod` key), `docs/csv-data-dictionary.md`, `docs/field-type-map.md`, `artifacts/api-server/src/api-contract.test.ts`, `docs/completed-tasks.md`. Live dev DB queried directly (read-only except the one intentional Settings save) for `settings` keys and for multi-value counts on the four array-typed shot selector columns.

## Files changed

- None (no source files edited). `docs/completed-tasks.md` — this entry.
- One live data/configuration change: `settings.defaultDrinkType` set to `"Americano"` via the Settings UI (matches this task's explicitly stated desired setup; trivially reversible from the same page).

## Verified

- `CI=true pnpm run typecheck` — passed (4/4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 63/63 passed.
- `CI=true pnpm run build:render` — passed.
- Live Chrome verification against the real dev DB for items 1, 2, 4, and 5 (screenshots confirmed each before/after state described above). No shot records were created or altered; the one persisted change was the intentional Settings save in item 1.

## Assumptions

- Treated "Confirm Default Drink Type from Settings applies to new Log Shot records" as asking to verify (and fix if broken) the actual end-to-end behavior, not just the code path — the code was already correct, so the fix was configuring the missing setting value rather than touching `ShotForm.tsx`.
- Treated setting `defaultDrinkType = "Americano"` as in-scope even though it's a data change, not a UI code change, because it's the literal, explicitly-stated desired configuration in this task's own brief, and Settings changes are exactly what a real user would make through the same UI being reviewed.
- Did not touch `expressionStyle`, `beanAchievement`, or `shotClassification` code, since converting any of them to a true multi-select chip UI is a real interaction-pattern change, not a tiny/safe fix, per this task's own boundary ("If a finding is not tiny/safe, report it instead of fixing").
- This session found `Dashboard.tsx`, parts of `docs/completed-tasks.md`, and several other docs concurrently modified and uncommitted by a separate, unrelated in-flight task (a Dashboard hopper detail/compact split, and Brew Method documentation clarifications) at the time this task ran. Left all of it completely untouched — confirmed via `git status`/`git diff --stat` before starting and did not base any of this task's own findings on assuming that work was finished.

## Unresolved issues

- `expressionStyle` is documented as a true multi-select ("chips") field but is currently implemented identically to the three intentionally-curated single-select fields. See the Agent 1 prompt below.
- No other unresolved issues from this task's own scope.

## Recommended next step

The one substantive follow-up (`expressionStyle` chip multi-select) is not tiny — see the Agent 1 prompt below. Everything else in this task's brief is confirmed already correct or fixed via a Settings value, no code follow-up needed.

## Agent 1 follow-up prompt

```markdown
# Agent 1 — Convert Expression Style to a true multi-select chip control

## Context

`docs/csv-data-dictionary.md` documents `Expression Style` as a plain "Multi Select"
field (no single-choice curation, unlike Fault Status / Bean Achievement / Shot
Classification, which are each explicitly documented as "curated as single-choice
... in app"). `docs/field-type-map.md`'s control policy states "Multi-selects use
ordered chip selectors." Despite this, `artifacts/coffee-log/src/pages/ShotForm.tsx`
currently renders Expression Style through the same single-value `ScalarSelect`
dropdown as the three intentionally-curated fields:

    <FormField control={form.control} name="expressionStyle" render={({ field }) => (
      <FormItem>
        <FormLabel>Expression Style</FormLabel>
        <ScalarSelect
          options={expressionStyleOptions}
          value={(field.value ?? [])[0]}
          onChange={(value) => field.onChange(value ? [value] : [])}
        />
        <FormMessage />
      </FormItem>
    )} />

and its options are computed with an artificial single-value truncation:

    const expressionStyleOptions = curatedOptions("expressionStyle", form.watch("expressionStyle")?.slice(0, 1) ?? []);

Live dev-DB data currently has zero shots with more than one `expression_style`
value (124 populated, 0 multi), so this is a design-consistency gap, not an
active data-loss bug — do this as a clean improvement, not an emergency fix.

## Task

Convert Expression Style (only — leave Fault Status, Bean Achievement, and Shot
Classification exactly as they are; their single-select behavior is intentional
and documented) to a real multi-select chip control:

1. Add a small reusable chip multi-select component (or a local one scoped to
   `ShotForm.tsx` if you judge that's cleaner) that operates directly on a
   `string[]` field value / `onChange`, toggling membership on click — same
   visual language as the existing Taste Selectors chip toggle already in this
   file (`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors`,
   `bg-primary text-primary-foreground border-primary` when selected). Taste
   Selectors uses local `useState`, not a form field — you'll need the same
   visual pattern but driven by `field.value`/`field.onChange` instead.
2. Swap Expression Style's `FormField` render to use the new component instead
   of `ScalarSelect`.
3. Remove the `.slice(0, 1)` truncation on the `expressionStyleOptions` line so
   all currently-selected values (not just the first) keep any historical/CSV
   values available as options via `curatedOptions`'s existing
   not-in-curated-list fallback.
4. Do not touch `beanAchievement`, `shotClassification`, or `faultStatus` — all
   three are intentionally single-select per `docs/csv-data-dictionary.md`.
5. Do not add new Expression Style vocabulary — use the existing
   `CURATED_SELECTOR_OPTIONS.expressionStyle` list unchanged.
6. Check `ShotDetail.tsx`'s existing `ChipList` rendering for `expressionStyle`
   still displays correctly for a shot with 2+ values (it already renders from
   the full array, so this is a read-only display check, not expected to need
   a code change).

## Boundaries

- No schema/API/OpenAPI/migration changes — `expressionStyle` is already
  `string[]` end-to-end; this is a pure client UI change.
- No changes to Fault Status, Bean Achievement, Shot Classification, or Taste
  Zone.
- No new selector vocabulary.

## Verification

    CI=true pnpm run typecheck
    CI=true pnpm --filter @workspace/api-server test
    CI=true pnpm run build:render

Add/update a source-scan regression test in `api-contract.test.ts` (follow the
existing pattern in that file) confirming Expression Style no longer uses
`ScalarSelect`/single-value truncation, and that Fault Status / Bean Achievement
/ Shot Classification still do.

Browser-check `/shots/new`: select 2+ Expression Style chips, save a real test
shot, confirm both values persist and display correctly on `/shots/:id`, then
delete the test shot via the API to leave the dev DB clean.

## Handoff

End with HANDOFF SUMMARY FOR CODEX (files inspected/changed, verification
results, before/after behavior, assumptions, unresolved issues). Do not commit,
do not push.
```

# Auth/Accounts/Data-Ownership Implementation Plan — 2026-08-26

## Completed

- Turned ADR-0009's accepted direction into a phased implementation sequence: `docs/implementation/auth-data-ownership-implementation-plan.md`. Recommends an auth mechanism (magic-link, deferring password storage and OAuth) since ADR-0009 deliberately left that open; a 9-phase sequence (users/session model → per-table `user_id` migrations → the `settings` compound-constraint migration as its own phase → a shared route-scoping helper built once before any route is touched → per-route update order → frontend login/session UI → owner backfill → mandatory cross-user isolation tests → deployment rollout); a concrete table-by-table ownership list (`NOT NULL` vs. nullable-for-future-shared-library) restated from direct schema inspection rather than re-derived from scratch; the four highest-risk items consolidated; and a recommendation to stage Tier 2 (outside testers, minimal auth surface) before building Tier 3's (paid public launch) full self-serve/billing surface.
- Added the new doc to `docs/implementation/README.md`'s index.
- Left `airtable_sync_evidence`'s scoping as an explicit open question (recommended it stay unscoped/owner-only) rather than deciding it without product input.

## Files changed

- `docs/implementation/auth-data-ownership-implementation-plan.md` (new)
- `docs/implementation/README.md` (index entry added)
- `docs/completed-tasks.md` (this entry)

No application code, schema, API, migration, or test files touched — documentation/planning only, per task boundary.

## Verified

- `git diff`/`git status` reviewed to confirm only the three doc files above changed.
- No build run — documentation-only.

## Assumptions

- The auth-mechanism recommendation (magic-link) is a recommendation for sequencing purposes, not a re-opening of ADR-0009's ownership-model decision, which this plan builds on rather than revisits.
- Table ownership assignments (`NOT NULL` vs. nullable) restate ADR-0009's own conclusions rather than re-deciding them independently, since the ADR already did that analysis directly against the live schema.

## Unresolved

- Everything in this plan is sequencing/design only — no phase has been implemented, and this plan itself is not yet approved.
- `airtable_sync_evidence` scoping remains an open question, as it was in ADR-0009.
- The auth-mechanism recommendation (magic-link) has not been confirmed by Carl/Codex — flagged as needing confirmation before Phase 1 starts.

# Mobile UX Review After Recent Owner-Alpha Changes — 2026-08-26

## Completed

Review-only task: live-verified all 5 review areas at mobile viewport width (606px, below the `md:` 768px breakpoint — confirmed mobile layout was active by the bottom nav rendering) against the real dev DB via Chrome. **Result: zero new bugs found.** Every item was already correctly implemented by prior sessions' work (the "Log Shot UI Usability Review" and "Dashboard Hopper Blank-State Clarity" tasks, commits `721556a`, `f837714`, `a85b972`, and earlier). This task's value was confirming those fixes hold up together, live, at actual mobile width, rather than finding anything new.

1. **Log Shot mobile flow — confirmed correct.** `/shots/new` at 606px: Setup card, bag-selector pills, and all Extraction fields render cleanly with no overflow or cramped touch targets. Field order matches the requested workflow exactly: Grind Setting → Grind Time → Initial Grinder Output → Top-Up Grind Added → Top-Up Time Adj → Temp → Target/Basket Dose (all "grind settings/output/corrections"), then Extraction Timing (Pour Delay → Pour Time → Flow Time), then Output (Yield) — screenshotted and confirmed. `NumberStepper` fields render as a compact 2-column grid with reasonably sized +/- targets, not overwhelming. Drink Type correctly pre-fills "Americano" (the `defaultDrinkType` Settings value set during the prior "Log Shot UI Usability Review" task is still persisted and still applies).
2. **Shot Detail — confirmed correct.** Live-checked shot #240 (a real "Grinder Setup"/workflow-event shot with `dose`/`yield`/`pourTime` all null): every previously-null field now shows `-`, not literal "null"/"undefined" text (confirms commit `721556a` holds). "Grinder / Workflow Event" (Purge/Setup Waste: 32.2g) renders in a visually distinct amber-bordered box, separate from the main Extraction Details grid. "Serving Context" (Drink Type: Americano, Not Rated: Yes) renders in its own bordered box with an explanatory caption distinguishing it from "Include in Analysis." All chip lists (Fault Status: "Grind Waste Intentional" / "DO NOT COUNT towards waste metrics") wrap cleanly at mobile width with no overflow.
3. **Dashboard — confirmed correct.** Active bag (#7) has one hopper (#18) that is phase-only (no `hopperMass`/`hopperPercent`/`shotsLeftEstimate`) — confirmed it renders as a single compact line ("Hopper Phase: Phase 1 · Started With 300g · Phase Tracking Active") inside the Current Baseline card, not as a separate large "Active Hopper Status" panel (confirms commit `a85b972`'s `detailedHoppers`/`compactHoppers` split works correctly end-to-end against live data). Current Bag card is 4 compact lines (identity, recipe, equipment, hopper), not overloaded. Reviewed every color-conveying UI element on the page (bag-age text, completion-% bar, `DirectionBadge`, Bag Comparison table's Direction column, `DeltaStatusMarker`, confidence pills, watchlist cards): every one that conveys a distinct state pairs color with an icon and/or explicit text label (e.g. `DirectionBadge` = icon + "Coarser"/"Finer"/"Stable" text; `DeltaStatusMarker` already uses pattern-fill overlays from an earlier session). A few decorative accents (bag-age "Open Nd" text color, Grind Journey's "Net Change" number color) are color-only, but the underlying number/label is always shown as plain text immediately alongside — no critical meaning is lost to a colorblind user, only a secondary at-a-glance hint. Consistent with this exact same conclusion reached and documented in an earlier session's review — reconfirmed, not re-litigated.
4. **Mobile navigation — confirmed correct.** Settings is reachable two ways: (a) the mobile top-bar hamburger → "Setup & System" dropdown, always visible with no scrolling required, screenshotted with Settings as the last item; (b) the bottom nav, confirmed horizontally scrollable by swiping — Settings is the last item, reachable, and the existing right-edge fade mask (from an earlier session) plus a visible horizontal scrollbar both signal there's more to scroll to. No navigation item is unreachable or hidden with no cue.
5. **Quick Log — confirmed correct.** Navigated directly to `/shots/quick`; the tab URL updated to `/shots/new` and rendered the full Log Shot form (confirms commit `86f7086`'s hard redirect still works).

## Files inspected

`artifacts/coffee-log/src/pages/ShotForm.tsx`, `artifacts/coffee-log/src/pages/ShotDetail.tsx`, `artifacts/coffee-log/src/pages/Dashboard.tsx`, `artifacts/coffee-log/src/components/layout/Shell.tsx` (re-confirmed from recent memory, not re-read line-by-line since untouched since an earlier session), `docs/completed-tasks.md`. Live dev DB / running app inspected via Chrome only — read-only, no data created or altered.

## Files changed

None. This was a pure review task; no code or data changes were made or needed.

## Verified

- Review-only per task instructions — no code changed, so `typecheck`/`test`/`build:render` were not required and not run for this task specifically (the tree was already green from the immediately preceding session's verification run on the same commit).
- Live browser verification at mobile viewport width (606px, `md:hidden` bottom nav confirmed active) for all 5 review areas, screenshotted at each step, against the real dev DB.
- Confirmed `git status` was clean at the start of this task (11 commits ahead of `origin/main`, matching the end of the prior session) before beginning, and found only unrelated, separate in-flight work (`docs/implementation/README.md`, a new `auth-data-ownership-implementation-plan.md`) appear mid-task — left entirely untouched.

## Assumptions

- Treated the 606px screenshot width this environment renders as a valid mobile-width proxy, since it is below the app's own `md:` (768px) breakpoint and the mobile-only bottom nav was confirmed rendering — this matches the same approach and caveat documented in earlier sessions (`resize_window` does not actually change `window.innerWidth` in this environment).
- Did not attempt to re-verify Log Shot's "field order" requirement via automated test, since no existing regression test enforces visual/DOM order and adding one was judged out of scope for a review-only task with zero findings.

## Unresolved issues

None found in this task's scope. Everything reviewed was already correct.

## Recommended next step

No code follow-up needed from this task. No Agent 1 prompt required — nothing to fix.

# Shot-Level Brew Method — 2026-08-26

## Completed

- Added `brewMethod` as a real, durable shot-level field — separate from `drinkType` — capturing *how* the beverage was extracted (Espresso, Pour-over, AeroPress, French Press, Moka Pot) as distinct from `drinkType`'s *what was served* (Americano, Latte, etc.).
- **Schema**: `lib/db/src/schema/shots.ts` — added `brewMethod: text("brew_method")` (nullable), next to `drinkType`.
- **Migration**: new `lib/db/migrations/0010_shot_brew_method.sql`/`.down.sql` — additive `ADD COLUMN IF NOT EXISTS`, plus a backfill (`UPDATE shots SET brew_method = 'Espresso' WHERE brew_method IS NULL`) that only ever fills a blank value, never overwrites one that's already set.
- **Live-DB application mechanism**: this repo doesn't run migration files against the deployed/dev database directly — `ensureRuntimeSchema()` (`artifacts/api-server/src/lib/runtime-schema.ts`), which runs on every server boot, is what actually applies additive schema changes. Added the identical additive-`ALTER`-plus-guarded-`UPDATE` SQL there too (`SHOTS_SCHEMA_SQL`), kept in sync with the migration file's logic, so the backfill actually reaches the deployed data on the next real boot.
- **Backfill safety check**: queried the live dev DB (Neon) before deciding to backfill — 248 total shots, 242 linked to the single registered Machine (`brewMethod: "Espresso"`), the remaining 6 have no machine but are clearly espresso-domain rows (dose/yield/ratio populated). No evidence anywhere in the historical dataset of any other brew method, so backfilling every pre-existing null to `Espresso` is data-safe and launch-safe.
- **API/OpenAPI**: added `brewMethod: { type: ["string", "null"] }` to both the `Shot` (read) and `ShotWriteFields` (shared create/update) schemas in `lib/api-spec/openapi.yaml`, then ran `pnpm --filter @workspace/api-spec codegen` (orval) to regenerate `lib/api-zod/src/generated/*` and `lib/api-client-react/src/generated/*` — confirmed `brewMethod?: string | null` landed in the generated `Shot`/`ShotInput`/`ShotUpdate`/`ShotWriteFields` types and only the expected generated files changed. `artifacts/api-server/src/lib/api-shapes.ts`'s `toShotApi` needed no change — it spreads all columns through except three explicitly-omitted internal ones.
- **Curated options**: added `brewMethod: ["Espresso", "Pour-over", "AeroPress", "French Press", "Moka Pot"]` to `CURATED_SELECTOR_OPTIONS` in `artifacts/coffee-log/src/lib/selector-options.ts` — an exact copy of Settings' existing `Default Brew Method` option list (no invented values). Also changed `Settings.tsx`'s "Default Brew Method" field to source its options from this shared list (`CURATED_SELECTOR_OPTIONS.brewMethod`) instead of its own separately-hardcoded array, so the two can never drift apart.
- **Log Shot (`ShotForm.tsx`)**:
  - Added `brewMethod` to the form schema, default values, `NULLABLE_ON_EDIT_FIELDS` (clearable to null on edit, like `drinkType`), and the `existingShot` reset block.
  - Added a `Brew Method` scalar-select field in the Setup card, alongside Machine and Grinder (grid widened to 3 columns on `sm:` and up, unchanged 2-column stacking on mobile).
  - Added a dedicated default-fill `useEffect`, separate from the pre-existing Drink Type default-fill effect: prefers the currently-selected (or default) Machine's own `brewMethod` when one is clearly available, otherwise falls back to the Settings-level `brewMethod`; only fills when the field is blank (never overwrites a user-entered or already-defaulted value), matching the same "suggest only if blank" convention already used for Status/Fault Status/Drink Type elsewhere in this form. Waits for the machines list to finish loading (`isLoadingMachines`) before falling back to Settings, closing a race where the Settings-level default could otherwise win before the selected Machine's own value was known.
  - Verified structurally (and by test, see below) that the Drink Type default-fill effect and the Brew Method default-fill effect never reference each other's field — changing one can never change the other.
- **Shot Detail (`ShotDetail.tsx`)**: shows `Brew Method` in Extraction Details, next to Machine/Grinder (conditionally rendered, matching the existing pattern for optional equipment fields).
- **Documentation**: added a `Brew Method` row to `docs/csv-data-dictionary.md`, directly after `Drink Type`, describing the field, its curated options, its Machine-then-Settings default preference, its independence from Drink Type, and the backfill.

## Boundaries respected

- No pour-over workflow implemented — Brew Method is just a labeled selector value, no downstream pour-over-specific logic.
- No machine/profile-level defaults beyond the already-easy, already-safe selected-Machine preference explicitly permitted by the task.
- No auth/accounts, no intelligence engine, Quick Log untouched (its own `/api/shots/selector-options` GET route and `SelectorOptions`-typed fetch helper were deliberately left alone — Brew Method isn't wired into Quick Log at all).
- No new selector values invented — the curated list is a literal copy of Settings' pre-existing `Default Brew Method` options.
- Historical evidence preserved — the backfill only ever fills a blank, and both the migration and the runtime guard assert this with a `WHERE brew_method IS NULL` guard, verified by a real (PGlite) migration test, not just a source-scan.

## Tests added/updated

- `artifacts/api-server/src/migration.integration.test.ts`: new test `"Shot brew_method migration backfills only null rows, is repeatable, and rolls back cleanly"` — a genuine PGlite (real-Postgres-compatible) execution of the actual `0010_shot_brew_method.sql`/`.down.sql` files. Proves: the column is added; a pre-existing null row is backfilled to `Espresso`; a row with an explicit non-Espresso value (`Pour-over`) is untouched by both the initial run and a repeated run (idempotency); the down migration drops the column and is itself repeatable.
- `artifacts/api-server/src/api-contract.test.ts`: new test `"Shot-level Brew Method is durable evidence, independent of Drink Type"` — source-scans the schema file, both migration files, `runtime-schema.ts`, the relevant `openapi.yaml` blocks, the regenerated `api-zod` types, `selector-options.ts`, `Settings.tsx`, `ShotForm.tsx`, and `ShotDetail.tsx`. Specifically asserts: Settings sources its options from the shared curated list rather than its own array; the Brew Method default-fill effect waits for machines to load, prefers the selected Machine, falls back to Settings, and only fills when blank; and — by slicing out each effect's own body — that the Drink Type effect's text never mentions `brewMethod` and the Brew Method effect's text never mentions `drinkType`, directly proving requirement 6 (changing one never changes the other) at the source level.

## Verified

- `CI=true pnpm run typecheck` — passed (all workspace projects, including `lib/db`, `lib/api-zod`, `lib/api-client-react` after codegen).
- `CI=true pnpm --filter @workspace/api-server test` — 65/65 passed, 0 failed, including both new tests above. No `static-serving`/127.0.0.1 bind issue occurred.
- `CI=true pnpm run build:render` — build succeeded (pre-existing, unrelated sourcemap/chunk-size warnings only).
- `pnpm --filter @workspace/api-spec codegen` (orval) — succeeded; `git status` confirmed only the expected generated files changed (`lib/api-zod/src/generated/{api.ts,types/shot*.ts}`, `lib/api-client-react/src/generated/api.schemas.ts`).
- Did **not** boot the api-server against the live/shared dev DB (a remote Neon Postgres instance, read from `.env`'s `DATABASE_URL`) to apply the migration for a live smoke test. `ensureRuntimeSchema()` runs automatically on every real server boot and would apply this migration's `ALTER TABLE`/backfill `UPDATE` for real, permanently, to shared data — that's the intended, expected mechanism, but triggering it myself as part of a "do not commit/push," verification-only task felt like an unrequested, hard-to-reverse mutation of shared state rather than pure verification. Confirmed instead via a genuine PGlite execution of the exact same SQL (see Tests above), which exercises real Postgres semantics without touching the shared database. The migration will apply automatically the next time the api-server is actually booted for real use.

## Assumptions

- Interpreted "Settings `brewMethod`" (requirement 2) as the existing generic-settings-store key literally named `"brewMethod"` (labeled "Default Brew Method" in the UI) — confirmed this key already existed and is distinct from the per-`Machine` equipment `brewMethod` column (requirement 3's subject), matching an explicit finding already on record in this doc from an earlier session.
- Interpreted "clearly available from selected machine context" (requirement 3) as: a Machine is currently selected (or about to be, via the pre-existing default-Machine effect) AND that Machine's own `brewMethod` field is non-null — anything less direct (e.g. inferring from Machine name/brand) was treated as out of scope.
- Placed the Brew Method form field in Setup (next to Machine/Grinder) rather than in the Serving Context box (next to Drink Type) — the task explicitly allowed either ("near Drink Type or Setup"), and Setup groups it with the equipment context it's actually derived from (Machine's own `brewMethod`), which also visually reinforces its independence from Drink Type in the separate Serving Context box below.
- Did not add a "custom Brew Method" user-extension mechanism (unlike Drink Type's `customDrinkTypes` settings key) — not requested, and the task explicitly said not to invent values beyond the existing curated list.
- Did not touch the `/api/shots/selector-options` GET route (used only by Quick Log) — Brew Method isn't exposed there, consistent with the "do not touch Quick Log" boundary.

## Unresolved issues

- The live/shared dev DB has not yet had this migration applied (see Verified above) — it will apply automatically on the next real api-server boot via `ensureRuntimeSchema()`. Until then, any live smoke test against that DB will show shots without a `brewMethod` value.
- Working tree also contains other unrelated, concurrent, uncommitted changes not part of this task: `docs/implementation/README.md`, `docs/implementation/auth-data-ownership-implementation-plan.md` (new file). Not reviewed or touched.

## Recommended commit command

    git add lib/db/src/schema/shots.ts lib/db/migrations/0010_shot_brew_method.sql lib/db/migrations/0010_shot_brew_method.down.sql artifacts/api-server/src/lib/runtime-schema.ts artifacts/api-server/src/migration.integration.test.ts artifacts/api-server/src/api-contract.test.ts lib/api-spec/openapi.yaml lib/api-zod/src/generated/api.ts lib/api-zod/src/generated/types/shot.ts lib/api-zod/src/generated/types/shotInput.ts lib/api-zod/src/generated/types/shotUpdate.ts lib/api-zod/src/generated/types/shotWriteFields.ts lib/api-client-react/src/generated/api.schemas.ts artifacts/coffee-log/src/lib/selector-options.ts artifacts/coffee-log/src/pages/Settings.tsx artifacts/coffee-log/src/pages/ShotForm.tsx artifacts/coffee-log/src/pages/ShotDetail.tsx docs/csv-data-dictionary.md docs/completed-tasks.md
    git commit -m "feat(shots): add shot-level Brew Method, independent of Drink Type"

Not run automatically, per task boundaries (no commit, no push). Note the working tree also contains other unrelated, uncommitted, already-documented changes from separate concurrent tasks (`docs/implementation/README.md`, `docs/implementation/auth-data-ownership-implementation-plan.md`) that are not part of this command.

# Change Bag Bag Number + Date Clarity — 2026-08-26

## Completed

- **Bag Number auto-suggest**: `ChangeBagDialog` (in `artifacts/coffee-log/src/pages/Bags.tsx`) now receives the full bags list (`allBags`, a new prop wired from the parent `Bags` component's existing `bags` query — no new fetch). A new `suggestNextBagNumber(bags)` helper finds the highest *purely numeric* existing `bagNumber` (e.g. `"7"`) and suggests one more (`"8"`); mixed/non-numeric values (`"7-Trial"`) are ignored rather than guessed at. The suggestion seeds `form.bagNumber`'s initial value once, inside `blank()`, which only runs on the dialog's open transition — it is never re-applied by a live effect, so a manual edit can never be clobbered.
- **Graceful fallback**: when no purely-numeric bag numbers exist anywhere, the field is left blank and the helper copy explains why nothing was suggested, instead of guessing a starting number.
- **Roast Date clarity**: the previously bare, unlabeled date input in the compact "New Bag Details" box (inside Change Bag only — the separate full bag-edit form already had a proper `Roast Date` label) now has an explicit `Roast Date (or estimated)` label, plus helper copy distinguishing it from Purchase Date (when bought, not collected in this compact flow) and Opened Date (set automatically to today).
- **Roast Date Confidence surfaced**: this field already existed on the Bag schema and already had a working `<Select>` pattern (the `ROAST_DATE_CONFIDENCE` list) in the full bag-edit form elsewhere in the same file. Replicated that same small, existing dropdown into the compact Change Bag flow — no new schema, no new options invented.
- Deliberately did **not** surface `freshnessDatingMethod`, `estimatedRoastWindow`, or the free-text `roastDateNotes` in this compact flow — those are more detail than a quick-create dialog warrants and remain available via the existing full Edit form (`This bag will be created... Add more detail anytime from Edit.` copy already covers this).

## Files inspected

- `artifacts/coffee-log/src/pages/Bags.tsx` (both the full bag-edit form and `ChangeBagDialog`)
- `artifacts/api-server/src/api-contract.test.ts`

## Exact behavior before/after

- **Before**: opening Change Bag showed an empty `Bag Number` field with only a `"Bag number"` placeholder — no suggestion, no explanation. The roast-date input had no `<Label>`, just a `"Roast date"` placeholder, easily confused with Purchase/Opened Date. `Roast Date Confidence` had no way to be set from this flow at all.
- **After**: opening Change Bag with an active Bag #7 pre-fills `Bag Number` with `8` (verified live: `Bag Number suggested as 8 (one after your highest numbered bag) — edit if needed.`), still fully editable and never re-overwritten. The date input is now labeled `Roast Date (or estimated)`, with a helper line distinguishing Purchase/Roast/Opened Date. A new, optional `Roast Date Confidence` dropdown (`Exact` / `Estimated High` / `Estimated Medium` / `Estimated Low` / `Unknown`) is available directly in the compact flow.

## Tests added/updated

Added `"Change Bag suggests the next Bag Number and clearly labels Roast Date"` to `artifacts/api-server/src/api-contract.test.ts`, source-scanning `Bags.tsx`. Asserts: `suggestNextBagNumber`'s numeric-only regex and fallback-to-`""` logic; that it seeds `blank()`'s `bagNumber` (not a live effect that could overwrite a manual edit); that `allBags` reaches the dialog via both the prop wiring and the type signature; both helper-copy variants (suggested vs. no-numeric-bag-numbers-found); the new Roast Date `<Label>` text exactly; the Purchase/Roast/Opened Date distinguishing copy exactly; that `roastDateConfidence` is wired into both form state and the submit body and reuses the existing `ROAST_DATE_CONFIDENCE` list; and that `freshnessDatingMethod`/`estimatedRoastWindow` were deliberately not added to `ChangeBagDialog`.

## Verified

- `CI=true pnpm run typecheck` — passed (4/4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 67/67 passed, 0 failed, including the new test above. No `static-serving`/127.0.0.1 bind issue.
- `CI=true pnpm run build:render` — build succeeded (pre-existing, unrelated sourcemap/chunk-size warnings only).
- Live smoke test against the real dev DB (already running, serving this exact build — confirmed the served bundle hash matched what `build:render` had just produced) via Chrome automation: opened Change Bag with active Bag #7 and confirmed, by screenshot, the exact rendered output described above — `Bag Number` pre-filled `8`, both helper paragraphs present verbatim, `Roast Date (or estimated)` label present, `Roast Date Confidence` dropdown present and defaulting to `— not set —`. Pure read-only verification — dialog was closed via Escape without submitting, no data created or modified.

## Assumptions

- "Existing numeric bag numbers" (requirement 1) means the `bagNumber` string must be *purely* digits after trimming — a mixed value like `"7-Trial"` is excluded from the max calculation rather than partially parsed, since guessing at partial-numeric intent risked suggesting a wrong number.
- Interpreted "surface them in this flow only if tiny and safe" (requirement 4) as: reuse an already-existing, already-working small UI pattern (`ROAST_DATE_CONFIDENCE` select) with zero schema/API change — and drew the line there, treating the remaining, more free-text roast-date fields as out of scope for a compact quick-create dialog.
- Left the separate, already-fully-labeled full bag-edit form (`blankForm`/main "Bag Number", "Purchase Date", "Roast Date", etc. fields around line 300-330) untouched — it was never the source of the reported confusion; only `ChangeBagDialog`'s compact box was.

## Unresolved issues

- None new. The already-documented gap (no lifecycle-event table, hopper top-up/maintenance still text-evidence-only) remains unchanged and out of this task's scope.

## Recommended commit command

    git add artifacts/coffee-log/src/pages/Bags.tsx artifacts/api-server/src/api-contract.test.ts docs/completed-tasks.md
    git commit -m "fix(bags): suggest next Bag Number and clarify Roast Date in Change Bag flow"

Not run automatically, per task boundaries (no commit, no push). Note the working tree also contains other unrelated, uncommitted changes from a separate, earlier task in this session (the shot-level Brew Method work: schema/migration/OpenAPI/generated-client/ShotForm/ShotDetail/selector-options/Settings files) that are not part of this command.

# Expression Style Selector Consistency — 2026-08-26

## Decision

**Option B: made Expression Style a true multi-select chip control.** Two prior sessions' reviews independently reached the same conclusion and this task's own product guidance confirmed it: `docs/csv-data-dictionary.md` documents Expression Style as plain `Multi Select` / `chips` with **no** single-choice curation note — unlike Fault Status, Bean Achievement, and Shot Classification, each explicitly documented as `Multi Select historically; curated as single-choice ... in app`. The task's given examples (Balanced, Sweet, Clean, Chocolatey, Fruity, Heavy / Syrupy) can naturally co-occur on one shot, matching the "if multiple can reasonably apply, multi-select is probably correct" guidance. Docs were already correct; the UI was the thing out of sync, so the code was changed to match the docs rather than the other way around.

## Completed

- Added a new `ChipMultiSelect` component to `ShotForm.tsx` (placed right after `ScalarSelect`): a small, self-contained multi-select chip toggle operating directly on a `string[]` field value, using the exact same visual language as the existing Taste Selectors chip toggle already in the same file (`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors`, `bg-primary text-primary-foreground border-primary` when selected). Selection order is preserved (append on select, filter on deselect) so the first tap stays the "primary highlight," matching the data dictionary's own description of the field.
- Swapped Expression Style's `FormField` render from `ScalarSelect` (single-value dropdown, `(field.value ?? [])[0]` / `onChange={(value) => field.onChange(value ? [value] : [])}`) to `ChipMultiSelect`, passed the full array directly (`value={field.value ?? []}`, `onChange={field.onChange}`). Added a short inline label hint ("select all that apply — first tap is the primary highlight") so the new interaction model is self-explanatory.
- Removed the `.slice(0, 1)` truncation on `expressionStyleOptions` (`curatedOptions("expressionStyle", form.watch("expressionStyle")?.slice(0, 1) ?? [])` → `curatedOptions("expressionStyle", form.watch("expressionStyle") ?? [])`) so all currently-selected values — not just the first — are considered when deciding whether a historical/CSV value needs to be appended to the curated option list.
- Did not touch Fault Status, Bean Achievement, or Shot Classification — confirmed all three remain single-select `ScalarSelect` dropdowns, matching their own "curated as single-choice" documentation.
- Confirmed `ShotDetail.tsx`'s existing `ChipList` component already renders the full `expressionStyle` array (`{(shot.expressionStyle?.length ?? 0) > 0 && <DetailItem label="Expression Style" value={<ChipList values={shot.expressionStyle} />} />}`) — no display-side change was needed, live-verified below.
- No schema, migration, OpenAPI, or generated-client changes — `expressionStyle` was already `string[]` end-to-end (`z.array(z.string()).optional()` in the form schema, `expressionStyle: jsonb(...)`-equivalent array column in `shots`), so this was a pure client-side interaction-pattern fix.

## Files inspected

`docs/field-type-map.md`, `docs/csv-data-dictionary.md`, `artifacts/coffee-log/src/lib/selector-options.ts`, `artifacts/coffee-log/src/pages/ShotForm.tsx`, `artifacts/coffee-log/src/pages/ShotDetail.tsx`, `artifacts/api-server/src/api-contract.test.ts`, `docs/completed-tasks.md`.

## Files changed

- `artifacts/coffee-log/src/pages/ShotForm.tsx`
- `artifacts/api-server/src/api-contract.test.ts`
- `docs/completed-tasks.md` (this entry)

No `selector-options.ts` or `docs/csv-data-dictionary.md` changes were needed — both were already correct; only `ShotForm.tsx` was out of sync with them.

## Tests added/updated

Added `"Expression Style is a true multi-select chip control, unlike the intentionally single-select fields"` to `artifacts/api-server/src/api-contract.test.ts` (source-scan pattern, reads both `ShotForm.tsx` and `docs/csv-data-dictionary.md`): asserts the data dictionary's documented type distinction (Expression Style plain "Multi Select"/"chips" vs. the other three's "curated as single-choice"); asserts `ChipMultiSelect` exists and Expression Style's `FormField` renders through it with the full-array `value`/`onChange` wiring; asserts the `.slice(0, 1)` truncation is gone; asserts Bean Achievement and Shot Classification still render through `ScalarSelect` (guards against this fix accidentally spreading to fields that must stay single-select).

## Verified

- `CI=true pnpm run typecheck` — passed (4/4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 66/66 passed on first run after this change; re-ran the full suite a second time after a separate, concurrent, unrelated task landed more test additions in the same file mid-session — 67/67 passed together.
- `CI=true pnpm run build:render` — passed.
- Live end-to-end verification against the real dev DB via Chrome: opened `/shots/new`, expanded Advanced tags, selected two Expression Style chips ("Chocolatey" then "Fruity" — both visibly highlighted simultaneously, unlike before where selecting a second value would have deselected the first), saved a real test shot (id 254), confirmed via `GET /api/shots/254` that `expressionStyle: ["Chocolatey", "Fruity"]` persisted in that exact order, confirmed `/shots/254` displays both as chips via the existing `ChipList`, confirmed `/shots/254/edit` reloads both chips pre-selected, then deleted the test shot via `DELETE /api/shots/254` (204, confirmed 404 on re-fetch) — no test data left behind.

## Assumptions

- Treated this as a pure UI/interaction-pattern fix, not a data-model change, since `expressionStyle` was already an array end-to-end; no schema/migration/OpenAPI work was needed or attempted, consistent with the task's "do not change DB schema unless absolutely necessary" boundary.
- Kept the curated `expressionStyle` vocabulary in `selector-options.ts` completely unchanged — no new selector values were invented.
- The short inline label hint is copy-only guidance for the new interaction model, not a new selector rule or intelligence behavior.

## Unresolved issues

None found specific to this task. Everything requested was resolved: the docs were already correct, the one out-of-sync UI was fixed, and the fix was verified live end-to-end with real persisted multi-value data.

## Recommended commit command

    git add artifacts/coffee-log/src/pages/ShotForm.tsx artifacts/api-server/src/api-contract.test.ts docs/completed-tasks.md
    git commit -m "fix(shots): make Expression Style a true multi-select chip control"

Not run automatically, per task boundaries (no commit, no push). Note the working tree also contains other unrelated, uncommitted changes from a separate, concurrent task in this session (`Bags.tsx`'s Change Bag Bag-Number-suggestion / Roast Date labeling work, and its own `api-contract.test.ts` additions in the same file) that are not part of this command and should be reviewed/committed separately by whoever owns that work.

# Maintenance Workflow Planning Doc — 2026-08-26

## Completed

- Added a full "Maintenance Workflow Model" section to `docs/implementation/bag-hopper-lifecycle-plan.md` (placed after the System Phase / Experiment Phase model, mirroring its structure): why maintenance is not Shot Classification/Fault Status (even after lifecycle events exist); where rules can attach (machine/grinder/accessory/user-default); the six reminder-basis options (every shot, every X shots/bags/kg, every X days, manual only — explicitly including manual-only as a legitimate non-interval case, not a gap); the nine-item minimum maintenance event-type vocabulary; Carl's own concrete workflow recorded as real evidence (Profitec Go / Eureka Mignon Magnifico, 1kg backflush, 2kg full clean, bag-change-triggered grinder vacuum, event-triggered chute purge, manual/water-hardness-guided descale); the future dashboard reminder model (event-resets-counter, never blocks logging, calm not naggy); and the AI-onboarding implication (cross-referenced, not duplicated, into the onboarding doc).
- Extended the existing "Between-Bag Cleanout and Maintenance" workflow (workflow 2) with one clarifying paragraph pointing to the new full model, rather than rewriting that already-accurate section.
- Added a manufacturer-suggested-maintenance-interval field to both the machine and grinder capability field lists in `docs/architecture/equipment-capability-library-model.md`, explicitly framed as a starting suggestion, not the actual reminder rule.
- Added a maintenance-routine question (what they clean, on what basis) to the workflow-interview question list in `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`, with the "part of the scientific process, not a separate chore" framing requested, and the confound-avoidance rationale (a stale puck screen or overdue backflush can look like a grind/dose problem if maintenance state isn't tracked).
- Added one line to `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md`'s "Not launch scope" list distinguishing the maintenance *workflow* (launch scope) from the dashboard *reminder* UI (future scope).
- Did not touch `docs/table-relationships.md` or `docs/implementation/release-candidate-checklist.md` — checked both first; neither had an existing maintenance mention worth extending (`table-relationships.md`'s one existing line already correctly states maintenance stays in state history excluded from analytics, and needed no change), and forcing an addition into either would have been unnecessary duplication rather than a real gap.
- Did not create a maintenance table, migration, schema, or reminder formula — all explicitly out of this task's scope and left as open implementation-task work.

## Files changed

- `docs/implementation/bag-hopper-lifecycle-plan.md`
- `docs/architecture/equipment-capability-library-model.md`
- `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`
- `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md`
- `docs/completed-tasks.md` (this entry)

No application code, schema, API, migration, or test files touched.

## Verified

- `git diff` reviewed for every changed file to confirm each edit is targeted and additive.
- Confirmed via `git status` before starting that none of these files were concurrently dirty from the other in-flight tasks in this session (`Bags.tsx`, `ShotForm.tsx`, and their shared `api-contract.test.ts`/`docs/completed-tasks.md` entries belong to separate, unrelated work).
- No build run — documentation-only change, no code touched.

## Assumptions

- "Manual only" is a legitimate, permanent reminder-basis option (not a placeholder for "not yet supported") — Carl's own descale example is explicitly manual/guidance-based, not just unimplemented.
- The nine maintenance event types listed are a minimum, extensible vocabulary, not a closed enum — consistent with how `Shot Classification`/`Bean Achievement` already tolerate custom/historical values elsewhere in this project.

## Unresolved

- No exact reminder formula (how "X grams processed" is computed from shot/bag/hopper records, how multiple simultaneous rules interact, how "due" is calculated) — deliberately left open, per task boundary.
- No maintenance table/schema exists yet — this remains planning only.
- Whether maintenance rules eventually live in the same lifecycle-event model already proposed for bag/hopper events, or as a separate model entirely, is not decided — the new section notes maintenance should get its own event type(s) *within* that model if/when it's built, but the model itself remains unimplemented either way.

# Release Readiness Reconciliation After Recent Work — 2026-08-26

## Completed

- Reconciled `docs/implementation/launch-readiness-audit.md` against four newly-landed commits (`bc796fa`, `c7dc9b9`, `3f84987`, `482246a`). Found three High-Priority Fixes (#5 Bags action-path clarity, #6 Quick Log hard-block, #7 Dashboard hopper blank-stat labeling) were already resolved by earlier same-day commits but never had their status markers updated in the audit — added `RESOLVED` markers with the exact commit references for each, rather than leaving them silently stale.
- Updated Critical Blocker #2 (no live smoke test) with new evidence: two further sessions successfully used live Chrome browser automation (previously blocked by a tooling fault) — one screenshot-verified the Change Bag dialog's rendered UI, the other did a full interactive create → verify → edit → delete round trip for Expression Style. Noted the Chrome-extension fault is no longer blocking, while keeping the "no single continuous full-lifecycle pass yet" finding accurate and unchanged.
- Rewrote the "Top 5 remaining launch blockers" list, which had gone stale (two of its five items were already resolved). New list surfaces a genuinely new finding from this reconciliation: **15 commits are currently sitting unpushed to `origin/main`** — not a code defect, but a real release-readiness risk worth its own line.
- Confirmed High-Priority Fix #8 (Grinder Setting precision still hardcoded) is genuinely still open — verified directly against current `ShotForm.tsx` source (`step={0.01}` still hardcoded, no `grindSettingPrecision` reference) rather than assumed.

## Files changed

- `docs/implementation/launch-readiness-audit.md`
- `docs/completed-tasks.md` (this entry)

No application code touched. `Bags.tsx` shows as separately dirty from unrelated concurrent work at the time of this task — not reviewed or touched here.

## Verified

- `git status --short` / `git diff --stat` run before and after to confirm scope.
- Each "resolved" claim traced to a specific commit and its actual diff content before marking it, not assumed from a commit message alone (e.g. read `be8afe7`'s actual `Bags.tsx` diff to confirm the explanatory copy it added genuinely addresses Fix #5, not just that its commit message mentioned "bag actions").
- No build run — documentation-only change, no code touched.

## Assumptions

- Treated the three status-marker corrections and the Top-5-list refresh as "tiny doc corrections obviously needed" per this task's boundary, since each was a factual staleness (a resolved item shown as open), not a new editorial judgment call.

## Unresolved

- The 15-unpushed-commits finding is newly surfaced, not resolved — flagged for a push/tag decision, not actioned here (out of scope: no commit, no push, per boundary).
- Everything already on record as open (auth/accounts, full continuous smoke test, Render deployment smoke test, Grinder Setting precision, billing, security-hardening-checklist review) remains open and unchanged by this reconciliation.

# Roast Date Dating Method UX — 2026-08-26

## Completed

- Converted `Freshness Dating Method` in the full Edit Bag form (`artifacts/coffee-log/src/pages/Bags.tsx`) from a free-text `<Input>` into a curated `<Select>`, using a new `FRESHNESS_DATING_METHOD_OPTIONS` list — exactly the task's suggested options, no values invented: `Exact Roast Date`, `Best-Before Minus One Year`, `Roaster / Staff Confirmed`, `Printed Bag Code`, `Unknown`, `Other`.
- Added historical-value preservation: a `freshnessDatingMethodOptions` derived list appends the current form value to the curated set if it doesn't already match, so an existing free-text value is never silently hidden by the Select. This was not theoretical — the real, active De Luca's bag (#7) already has `freshnessDatingMethod = "Best-before/date-code evidence plus staff and roaster workflow"`, confirmed live on the dev DB before implementing, and verified live afterward to still display correctly in the dropdown.
- Added one helper paragraph in the full Edit Bag form (no new dialog/section) tying Roast Date (exact-or-estimated), Freshness Dating Method (how derived), and Roast Date Confidence (how sure) together, with the concrete, owner-verified De Luca's example: Best-Before month/year is ~1 year after roast/packing month, so Dating Method `Best-Before Minus One Year` + Confidence `Estimated High` for the month (lower for the exact day unless confirmed). Also notes that an `Other` Dating Method should be described in the existing `Roast Date Notes` field, rather than adding a new free-text field.
- In the compact Change Bag flow (already has Roast Date + Roast Date Confidence from the prior task), made a one-line copy change only — the closing helper line now says "...Add Freshness Dating Method (how you derived the Roast Date, e.g. Best-Before Minus One Year) and more detail anytime from Edit." No new field/select was added there, keeping the flow's existing footprint unchanged, per the "do not make the compact Change Bag flow too heavy" boundary.
- Extended the `Freshness Dating Method` and `Roast Date Confidence` rows in `docs/csv-data-dictionary.md`'s Bags table with the curated option lists, the historical-value-preservation note, and the De Luca's example — documenting the owner-known dating method as requested.
- No schema, API, or OpenAPI change: `freshnessDatingMethod`/`roastDateConfidence`/`estimatedRoastDate`/`actualRoastDate`/`estimatedRoastWindow`/`roastDateNotes` were all already plain nullable `text` columns with no enum constraint anywhere (schema, drizzle-zod, or route body parsing) — confirmed by reading `lib/db/src/schema/bags.ts` and `artifacts/api-server/src/routes/bags.ts` before writing any code. No new formula: this is a manual selection + explanatory copy only, never a computed "roast date = best-before minus 365 days" assignment.

## Files inspected

- `artifacts/coffee-log/src/pages/Bags.tsx`
- `lib/db/src/schema/bags.ts`
- `artifacts/api-server/src/routes/bags.ts`
- `artifacts/api-server/src/api-contract.test.ts`
- `docs/csv-data-dictionary.md`
- `docs/table-relationships.md`
- `docs/completed-tasks.md`
- Live dev DB (`GET /api/bags`, read-only) — confirmed Bag #7's real, pre-existing `freshnessDatingMethod`/`roastDateConfidence`/`estimatedRoastWindow`/`estimatedRoastDate` values before designing the preservation logic.

## Tests added/updated

- Added `"Freshness Dating Method is a curated selector that preserves historical free text"` to `artifacts/api-server/src/api-contract.test.ts`, source-scanning `Bags.tsx`. Asserts: the exact curated options list; the field is now a `<Select>` (not `<Input>`) reusing the `roastDateConfidence`-select pattern; the historical-value-preservation derivation exists verbatim; the full explanatory paragraph and De Luca's example text are present verbatim; and no computed roast-date-from-best-before formula was introduced.
- Extended the existing `"Change Bag suggests the next Bag Number and clearly labels Roast Date"` test with one more assertion confirming the Change Bag helper-copy tweak (prose only, no `freshnessDatingMethod` identifier) — the test's pre-existing `doesNotMatch(changeBagDialogSource, /freshnessDatingMethod/)` guard (proving the compact flow doesn't reference the field's identifier/logic) still holds, since the new copy is human-readable text ("Freshness Dating Method"), not the camelCase field name.

## Verified

- `CI=true pnpm run typecheck` — passed (4/4 workspace projects).
- `CI=true pnpm --filter @workspace/api-server test` — 68/68 passed, 0 failed, including both the new and extended tests above. No `static-serving`/127.0.0.1 bind issue.
- `CI=true pnpm run build:render` — build succeeded (pre-existing, unrelated sourcemap/chunk-size warnings only).
- Live smoke test against the real dev DB (already running, confirmed serving this exact build by bundle hash) via Chrome automation: opened Edit Bag on the real Bag #7 and confirmed, by screenshot, that `Freshness Dating Method` renders as a Select correctly showing the bag's actual historical value (`Best-before/date-code evidence plus staff and roaster workflow`) rather than blank, and that the full helper paragraph renders exactly as coded beneath it. Closed via Escape without saving — no data modified.

## Assumptions

- "Dating Method" in the task's Desired UX bullets refers to the existing `freshnessDatingMethod` field (the task's own "Likely existing fields to reuse" list confirms this); kept the existing UI label `Freshness Dating Method` rather than renaming it to bare "Dating Method", for continuity with the CSV data dictionary and to avoid an unrequested rename.
- Interpreted "Do not make the compact Change Bag flow too heavy" as license to make only a one-line copy change there (pointing to Edit) rather than adding a third Select to that flow — Roast Date Confidence was already added there in the prior task, and a second curated dropdown felt like the line into "too heavy."
- `Other` as a Dating Method value doesn't get its own new free-text field — reused the existing `Roast Date Notes` field, per the "no schema unless absolutely necessary" boundary, and documented this in the helper copy so it isn't a dead end for the user.
- The historical-value-preservation pattern (append-if-not-curated) mirrors the established `curatedScalarOptions`-style approach used elsewhere in this codebase (`selector-options.ts`, for Shot fields) but was written inline in `Bags.tsx` rather than importing that shot-domain module, to avoid cross-domain coupling for one small derived list.

## Unresolved issues

- None new. `Roast Date Used` (a `roast_date_used` column the CSV dictionary marks "Formula/Date, R, read-only" but the app already treats as freely editable text) was left untouched — it wasn't part of this task's Desired UX and changing its edit/read-only treatment would be a separate, unrequested behavior change.
- No resolution/normalization logic exists (or was added) that actually reads `freshnessDatingMethod`/`roastDateConfidence` to pick which of `roastDate`/`actualRoastDate`/`estimatedRoastDate` is authoritative for downstream freshness calculations (`Days off Roast at Open`, etc.) — this task was scoped to input UX only, per "do not invent new formulas."

## Recommended commit command

    git add artifacts/coffee-log/src/pages/Bags.tsx artifacts/api-server/src/api-contract.test.ts docs/csv-data-dictionary.md docs/completed-tasks.md
    git commit -m "feat(bags): curate Freshness Dating Method options and explain Roast Date confidence"

Not run automatically, per task boundaries (no commit, no push). Note the working tree also contains other unrelated, uncommitted changes from a separate, concurrent task (`docs/implementation/launch-readiness-audit.md`) that are not part of this command.

# Full Owner-Alpha Browser Smoke Test — 2026-08-26

## Completed

Review-only single-pass smoke test against the local dev app (production build, real dev DB) across all 7 requested areas. **6 of 7 areas fully pass with zero findings.** One real, reproducible bug found in Log Shot (area 2): the Bag selector always defaults to "No bag" on a new shot, even when exactly one bag is active. No source code was changed — per this task's own boundary ("prefer reporting bugs clearly"), the fix was reported with a copyable Agent 1 prompt rather than implemented here, since it's a real behavior gap (not a copy/label tweak) with a genuine design question (what should happen with 2+ active bags) attached to it.

Full pass/fail detail is in the handoff block below (not duplicated here to avoid drift between the two).

## Files inspected

`artifacts/coffee-log/src/pages/ShotForm.tsx` (specifically: `defaultValues`, the bag-selector `useEffect`s, and the existing `machineId`/`grinderId` default-selection pattern used as the fix template). No other source files were read for this task — it was a live-app smoke test, not a code review; findings were reasoned about from live UI behavior first, then traced to `ShotForm.tsx` only for the one confirmed bug.

## Files changed

None. Pure review/smoke-test task — no source edits.

## Smoke test target

Local dev app: `CI=true pnpm run build:render`, then production build served via `NODE_ENV=production node dist/index.mjs` on port 3000, against the real dev Postgres DB (same DB used throughout this multi-agent session). Not the deployed Render app (local was available and is the documented preferred target when available).

## Data created and cleaned up

- Created shot #254 while testing Expression Style multi-select on `/shots/new` (bag: none selected, Expression Style: Chocolatey + Fruity, notes: "TEST - Agent 2 Expression Style verification - delete me") — this was from the *previous* session's task, already deleted before this task began.
- Created shot #255 during this task specifically to exercise Area 3 (Edit Shot): bag De Luca's #7, Expression Style Balanced + Sweet, Sour Shot flag, Brew Method Espresso → cleared to null via edit, notes "TEST - Agent 2 owner-alpha smoke test - safe to delete". Confirmed via `GET /api/shots/255` at each step (multi-value Expression Style persisted, Brew Method null persisted), then deleted via `DELETE /api/shots/255` (204, confirmed 404 on re-fetch).
- Opened the Change Bag dialog (area 5) and closed it via Escape without submitting — confirmed via `GET /api/bags` afterward that bag count stayed at 7 (no bag 8 was created).
- Final check: `GET /api/shots?limit=1000` confirms zero shots with "TEST" in their notes remain. No other data was created, modified, or left behind.

## Verification performed

Review-only per task instructions — browser smoke test only, no code changed, so `typecheck`/`test`/`build:render` were not required. (`build:render` was run once to produce the local server build used for the smoke test itself, not as code-change verification — it succeeded.)

## Assumptions

- Treated "Bag defaults to active bag" (area 2) as describing expected behavior to verify, not existing behavior to merely confirm — it does not currently happen, so this was logged as a bug rather than a pass.
- Used exactly-one-active-bag as the safe default-selection condition in the reported fix, to avoid silently guessing between multiple active bags (the project has previously and explicitly supported multiple simultaneous active bags, e.g. a decaf/regular split).
- Treated `Grind Output Measurement`'s "Not yet used elsewhere in the app — reserved for future single-dose workflow support" caption in Settings as an intentionally-labeled placeholder, not a "dead field" — it's self-documented as not-yet-functional rather than silently doing nothing, so it doesn't count as a smoke-test failure for area 6.2.
- A `mcp__claude-in-chrome__form_input` tool call repeatedly failed with an identical malformed-JSON error across several retries for unrelated reasons (tooling glitch, not an app bug); worked around it using direct JS execution via `javascript_tool` to set the native `<select>` value and dispatch a `change` event, which is what let Area 3.4 (Brew Method clearing) get tested at all.

## Unresolved issues

- The one confirmed bug (Log Shot's Bag selector not defaulting to the active bag) is unresolved — reported with a full repro and a copyable Agent 1 prompt in the handoff block below.
- Found several other agents' work concurrently in-progress and uncommitted in the working tree during this task (`Bags.tsx`, `api-contract.test.ts`, `docs/csv-data-dictionary.md`, `docs/implementation/launch-readiness-audit.md`) — none of it inspected or touched, noted here only so it isn't mistaken for something this task produced.

## Recommended next step

Hand the Bag-default bug to Agent 1 using the copyable prompt in the handoff block. No other follow-up needed — everything else in this smoke test's 7 areas passed.

## Recommended commit command

No commit — this task made no file changes.
