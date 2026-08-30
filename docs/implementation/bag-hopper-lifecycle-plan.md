# Bag and Hopper Lifecycle Plan

Last updated: 2026-08-25

## Scope of this revision

This revision adds three sections requested for launch-scope planning that were missing from the 2026-08-24 version: a per-workflow field/data requirements breakdown, UI flow recommendations by user type, and a dedicated analytics-protection walkthrough. It also adds a Future Development Notes section. Nothing in the prior workflow definitions, phase-label recommendations, data model direction, implementation order, known risks, decisions needed, launch success criteria, or non-goals is changed by this revision.

## Purpose

BigShotEspresso needs a guided lifecycle workflow for real coffee operation:

1. close out the current bag,
2. reconcile remaining beans and grinder/chute waste,
3. start a new bean/bag record,
4. fill or reset the hopper phase,
5. record dial-in/setup waste without pretending it was a drinkable shot,
6. then log the first drink shot.

This plan is data-foundation and workflow design only. It does not implement DCI, OSI, HMI, BLI, MSI, GSP, prediction, or recommendation logic.

## Current finding

The foundation is partly present:

- `bags` already stores bag identity, roast-date evidence, open/close dates, bag weight, remaining estimate, active state, grind defaults, target dose/yield/temp, dial-in notes, and notes.
- `hoppers` already exists as a first-class state table with `bag_id`, `starting_beans`, `is_active`, `phase`, `hopper_mass`, `hopper_percent`, `shots_left_estimate`, notes, and imported evidence.
- `hopper_range_baselines` already exists for imported baseline evidence.
- Hopper rows enforce only one active hopper per bag.
- Bags currently do not enforce only one active bag globally.
- The Bags page already has a basic Close Bag dialog that marks the bag inactive and records closeout date / remaining mass.

The missing piece is not “more shot fields.” The missing piece is a guided lifecycle workflow and a clean event model so setup, purge, waste, phase changes, and drinkable shots do not get mixed together.

## Domain boundaries

### Bag

A Bag is a purchased/opened quantity of a Bean. It owns the active default settings used for shot logging:

- target/basket dose,
- default yield,
- default temperature,
- start/current grind setting,
- start/current grind time,
- roast-date evidence,
- open and closeout state.

### Hopper

The Hopper subsystem is a state-tracking workflow, not a passive logging table.

Hopper phases are measured operating windows. A phase baseline is the amount of beans the user intentionally decides to track from that point forward.

Important rule: unmeasured leftover beans may be intentionally ignored when starting a new phase. The app must preserve that as a deliberate workflow choice, not a math error.

### User dosing workflow

Users may operate very differently. The lifecycle system must record the user's actual routine instead of assuming one universal espresso workflow.

Common workflow types:

- Hopper dosing — beans live in the grinder hopper and shots draw from the active hopper state.
- Hopper dosing with dose cup — beans live in the hopper, but output is weighed in a dose cup before basket prep.
- Single dosing — each shot starts from a weighed bean dose.
- Frozen single doses — beans are pre-weighed and stored as future doses.
- Decaf / regular split — user may have separate grinders, hoppers, bags, and defaults.
- Mixed workflow — user may switch methods depending on bean, guest shot, decaf, or experiment.

Launch rule:

The app should support the common hopper and dose-cup workflow cleanly first, while leaving enough structure for single dosing and advanced routines later.

Data rule:

Workflow method should be recorded as configuration/evidence. It should not be inferred from missing fields.

### Shot

A Shot should represent a real extraction attempt unless explicitly recorded as maintenance/setup.

For a normal drink shot:

- `Initial Grinder Output` records what the grinder produced.
- `Top-Up Grind` records the extra grams added when under target.
- `Over Grind Removed` records grams removed when over target.
- `Dose` remains the actual target/basket dose.
- `Grind Waste` records beans removed from bag/hopper inventory but not included in the basket dose.

### Lifecycle event

A lifecycle event is a bag/hopper action that may consume or reconcile coffee without producing a drinkable shot.

Examples:

- bag closeout,
- hopper refill,
- hopper phase transition,
- grinder purge,
- chute cleanout,
- backflush,
- Cafiza cleaning,
- dial-in waste before the first drinkable shot,
- reconciliation to measured remaining beans.

The app currently lacks a dedicated lifecycle-event table. Until that exists, lifecycle events can be approximated with notes and existing bag/hopper fields, but they should not be treated as analytical coffee shots.

## Required launch workflows

## 1. Close Current Bag

Goal: close the active bag cleanly without losing history or rewriting prior consumption.

User inputs:

- closeout date/time,
- measured leftover beans/chute mass, if available,
- whether leftover mass was measured or intentionally ignored,
- closeout notes,
- optional grind/chute cleanout waste,
- optional reason, such as finished, stale, switching beans, testing, or discarded.

System effects:

- set current bag inactive,
- set `closedOutDate`,
- store measured `remainingEstimate` if provided,
- preserve notes as closeout evidence,
- do not delete or rewrite prior shots,
- do not invent missing hopper formulas,
- prepare the user to start a new bag.

Launch-safe implementation:

- use existing `PATCH /api/bags/:id`,
- keep the current basic Close Bag dialog,
- improve copy so the user understands closeout mass is reconciliation evidence, not a correction to prior shots.

Future improved implementation:

- create a dedicated lifecycle event for the closeout,
- optionally deactivate active hopper state,
- record closeout waste separately from drink-shot waste.

## 2. Between-Bag Cleanout and Maintenance

Goal: record the real maintenance work that commonly happens after closing one bag and before starting the next bag.

This is the natural time to clean the grinder path, purge old beans, empty or reconcile the hopper, backflush the machine, run Cafiza, clean accessories, and prepare the setup for the next bean.

User inputs:

- cleanout date/time,
- remaining old beans/chute mass,
- grind waste / purge waste,
- whether the hopper was emptied,
- whether the grinder was cleaned,
- whether the machine was backflushed,
- whether Cafiza or another cleaner was used,
- accessories cleaned or changed, such as basket, puck screen, tamper, or portafilter,
- notes.

System effects:

- records maintenance as lifecycle evidence,
- keeps maintenance visible in history,
- prevents cleanout/purge/backflush records from pretending to be drinkable shots,
- reduces bag/hopper remaining when old beans or purge waste are measured,
- marks the boundary between the old bag and the new bag.

Important rule:

Between-bag cleanout is neither the old bag's final extraction nor the new bag's first shot. It is a lifecycle transition event.

Launch-safe implementation:

- for now, closeout notes can preserve the evidence.
- do not force this into Shot Classification or Fault Status long term.
- when lifecycle events are implemented, create a dedicated maintenance/cleanout event type.

Future implementation:

- add guided checklist options for grinder purge, hopper emptied, backflush, Cafiza, accessory clean/change, and reconciliation.
- allow the user to skip maintenance if they did not do it.
- later correlate maintenance events with improved dose consistency or extraction stability, but do not implement intelligence logic in the lifecycle phase.

**Decided (2026-08-26): maintenance gets its own workflow model, not just a between-bag moment.** The between-bag timing above is when maintenance most *commonly* happens, but maintenance is a broader, ongoing workflow with its own rules, event types, and reminder logic — it should not be treated only as a bag-closeout side effect, and it must not be folded into `Shot Classification` or `Fault Status` even after lifecycle events exist. See the full "Maintenance Workflow Model" section below.

## 3. Start New Bag

Goal: create or select the Bean, create the Bag, and make it the active logging context.

Starting a new bag normally begins an active dial-in process. The first usable grinder setting and grind time are not guaranteed, even when the same bean or roaster has been used before.

User inputs:

- bean name,
- roaster,
- origin / region if known,
- process if known,
- roast level if known,
- purchase date,
- roast date or estimated roast date,
- roast-date confidence,
- roast-date evidence notes,
- bag weight,
- cost,
- opened date,
- target dose,
- default temperature,
- default yield if known,
- starting grind setting if known,
- starting grind time if known,
- dial-in notes.

System effects:

- create Bean if needed,
- create Bag linked to Bean,
- mark new Bag active,
- deactivate the previous active Bag if required,
- carry target dose and defaults into new shot logging,
- keep prior Bag history visible.

Launch-safe implementation:

- enhance the Bags page into a guided “Start New Bag” flow using existing Beans and Bags APIs.
- do not require users to complete every field.
- allow fast beginner path: enough to log a shot.
- allow power-user path: full bean, roast, equipment, and workflow details.

Important rule:

Historical use of the same bean or similar prior bags can be extremely useful as a starting point, but a new bag should not blindly inherit old dial-in settings as truth. Roast age, storage, humidity, room conditions, bean lot variation, grinder state, and puck-prep consistency can all change the appropriate grinder setting and grind time. Prior settings should be presented as evidence-backed starting hints only.

## 4. New Bag Dial-In Process

Goal: help the user find the appropriate grinder setting and grind time for the new bag before treating the bag as stable.

This is a workflow state, not an intelligence engine. The app records evidence and guides the user through the process without inventing formulas or recommendations.

User inputs during dial-in:

- starting grinder setting,
- starting grind time,
- Initial Grinder Output,
- top-up grind if under target,
- over-grind removed if over target,
- grind waste from purges or grind changes,
- Pour Delay,
- Pour Time,
- Flow Time,
- yield,
- shot status,
- fault status,
- tasting notes if the shot is drinkable.

Dial-in states:

- Setup / Purge — grinder or chute clearing, not a drink shot.
- Dial-In Attempt — extraction produced, but bag is not yet stable.
- First Drinkable Shot — coffee is drinkable and can be rated.
- Dialed In — the bag has a usable grinder setting/time and can produce repeatable coffee.
- Reference Candidate — a good enough shot to consider marking as Reference.

System behavior:

- New bags should start in a dial-in state unless the user explicitly marks them as already dialed in.
- Dial-in shots remain visible in history.
- Dial-in/setup waste should reduce bag/hopper remaining.
- Non-drinkable setup waste should not be treated as analytical shot data.
- Once the user records a good or dialed-in drink shot, the current grind setting and grind time should become the active bag defaults for the next shot.
- The app should make it easy to record a grind change on the same shot without confusing the grind event with the extraction metrics.

Launch-safe implementation:

- add guided copy to the Start New Bag flow explaining that dial-in is expected.
- allow the first few shots to be logged as dial-in attempts.
- continue using Shot Status / Fault Status to determine analytical eligibility.
- keep setup-only purge/waste as a known gap until lifecycle events exist.

Future implementation:

- add an explicit Bag lifecycle state such as `Opening / Dial-In`, `Dialed In`, `Stable`, `Declining`, and `Closed`.
- add a standalone lifecycle-event table for purge/setup/waste entries.
- later intelligence can analyze dial-in speed, but Phase 1 lifecycle work should only record evidence.

## 5. Fill Hopper / Start Hopper Phase

Goal: begin a measured hopper operating window for the active bag.

User inputs:

- bag,
- phase label,
- starting beans / phase baseline,
- notes,
- whether this is a full bag phase or partial hopper phase.

Approved phase labels to preserve:

- Phase 1,
- Phase 2,
- Phase 3,
- End of Bag,
- Single Bag Phase,
- Custom.

Resolved phase-label decision:

- Earlier docs include `Grinder Cleanout`.
- Later product direction also mentioned `Custom`.
- `Custom` is approved as the flexible user-facing Hopper phase fallback.
- `Grinder Cleanout` belongs in lifecycle event type instead of Hopper phase.

Recommended direction:

- Hopper phase labels should describe tracked bean inventory windows.
- `Grinder Cleanout` should be an event type, not a hopper phase.
- `Custom` can exist for unusual workflows but should be treated as lower-confidence evidence.

System effects:

- create a new Hopper state row for the bag,
- deactivate any previous active Hopper row for that bag,
- store starting beans as the measured phase baseline,
- assign future shots to the active hopper state when possible.

Launch-safe implementation:

- use existing `POST /api/hoppers`,
- create a new row for each measured phase start,
- do not mutate old phase baselines in place,
- do not calculate hopper percentage locally until the formula is approved.

## 6. Hopper Refill / Top-Up

Goal: record beans added to the hopper without confusing a top-up with a new bag or drink shot.

User inputs:

- beans added,
- same phase or new phase,
- optional phase label,
- notes.

Open decision:

Should a hopper top-up continue the same active Hopper row, or should every measurable top-up create a new Hopper state row?

Recommended launch rule:

- If the user is starting a new measured operating window, create a new Hopper row.
- If the user is simply adding beans during the same operating window, record a lifecycle event and keep the Hopper row active.

This requires a lifecycle-event model before it can be represented cleanly.

## 7. Dial-In / Setup Waste

Goal: record real coffee consumed by setup without polluting normal shot analytics.

Examples:

- grinder purge,
- chute cleanout,
- grind setting change waste,
- new bag dial-in waste before first drinkable shot.

Rules:

- If a drink shot also includes a grind event, record that event on the shot.
- If no drink shot was produced, record a standalone lifecycle event.
- Grind waste must reduce bag/hopper remaining.
- Grind waste must not increase basket dose.
- Setup/purge events should not be included in analysis.

Launch-safe implementation:

- current shot-attached `Grind Waste` is acceptable for “drink shot plus event.”
- standalone setup waste needs a future lifecycle-event table/API.
- do not keep using fake/empty shot records as the long-term workflow.

## 8. First Drink Shot

Goal: let the user log the first real coffee after setup and later return to add tasting details.

Rules:

- defaults come from the active Bag,
- target dose comes from Bag default unless intentionally changed,
- current grind setting/time should carry forward after a logged change,
- Initial Grinder Output stays separate from final dose,
- Top-Up Grind is grams added, not final dose,
- Over Grind Removed is grams removed, not final dose,
- Reference and Signature remain blank unless explicitly selected,
- Signature implies Reference,
- Reference does not imply Signature.

## Field and Data Requirements by Workflow

This section maps each required launch workflow to the fields/tables already available, what is missing, what should stay deferred, and what remains unresolved. Field names are taken verbatim from `docs/csv-data-dictionary.md` and `docs/field-type-map.md` where possible; anything not confirmed there is marked unresolved rather than invented.

### Open New Bean / Open New Bag / Start New Bag (workflow 3)

- Existing fields/tables likely used: `beans` (name, roaster, origin, process, roast level); `bags` (`Beans` link, `Bag Purchased Date`, `Actual Roast Date`, `Estimated Roast Date`, `Freshness Dating Method`, `Roast Date Confidence`, `Roast Date Notes`, `Opened Date`, `Bag Size (g)`, `Bag Cost`, `Target Dose (g)`, `Active`).
- Missing fields: none required for the basic create flow — the existing Beans/Bags API and schema already cover the listed user inputs from workflow 3 above.
- Future/deferred: `workflow_method` (hopper dosing / dose cup / single dosing / frozen single dose / decaf split / mixed) is not yet a stored field anywhere; per the "New model recommended" section below it belongs on a future lifecycle-event or bag-level record, not invented here.
- Unresolved: whether one active Bag should be DB-enforced globally is listed as open decision 4 in "Decisions needed before implementation"; until enforced, the UI/API must avoid silently leaving multiple active bags (see "Known risks").

### New Bag Dial-In (workflow 4)

- Existing fields/tables likely used: `shots` (`Initial Grinder Output`, `Dose`/Target-Basket Dose, `Top-Up Grind`, `Over Grind Removed`, `Grind Waste`, `Pour Delay`, `Pour Time`, `Flow Time`, yield, `Shot Status`, `Fault Status`, tasting notes); `bags` (current grind setting/time defaults that carry forward after a logged change).
- Missing fields: no explicit Bag-level lifecycle state (e.g. `Opening / Dial-In`, `Dialed In`, `Stable`, `Declining`, `Closed`) exists yet — this is already named as future work in workflow 4's "Future implementation" note.
- Future/deferred: dial-in speed/quality analysis belongs to BLI, not this phase.
- Unresolved: none beyond what workflow 4 already states.

### Log Normal Shot (workflow 8, First Drink Shot)

- Existing fields/tables likely used: same Shots fields as dial-in, plus `Reference Shot`, `Signature Shot`, `Rating`, `Preference Rating`, `Include in Analysis`.
- Missing fields: none — this is the already-supported `Log Shot` full-form path (Quick Log is shelved per Gate 0.5 of `release-candidate-checklist.md`).
- Future/deferred: none new.
- Unresolved: none.

### Log Grind Change / Purge Waste (workflow 7, Dial-In / Setup Waste)

- Existing fields/tables likely used: shot-attached `Grind Waste` when a drink shot also includes a grind event.
- Missing fields: no standalone lifecycle-event table/API exists yet for setup waste with no accompanying drink shot — this is the same gap flagged in workflow 7 and in "New model recommended before full lifecycle launch."
- Future/deferred: standalone purge/setup waste as a first-class lifecycle event (`Grinder Purge`, `Chute Cleanout`, `Grind Change Waste` event types from the proposed model).
- Unresolved: whether standalone purge/setup waste must ship before launch — this is open decision 5 in "Decisions needed before implementation," already answered "yes, if launch includes real bag/hopper inventory tracking," but not yet implemented.

### Hopper Refill / Phase Transition (workflows 5–6, Fill Hopper / Start Phase and Hopper Top-Up)

- Existing fields/tables likely used: `hoppers` (`bag_id`, `starting_beans`, `is_active`, `phase`, `hopper_mass`, `hopper_percent`, `shots_left_estimate`, notes), `hopper_range_baselines`.
- Missing fields: no lifecycle-event record to distinguish "same-phase top-up" from "new phase start" — same-phase hopper top-ups are now documented as lifecycle events, not new Hopper rows, but that event model is not yet built.
- Future/deferred: local calculation of `Hopper %`/hopper percentage formula stays imported/read-only until approved (per workflow 5's launch-safe implementation note); `Preferred Hopper Phase Fill Amount` / grinder-level `Hopper Capacity` fields proposed in `docs/table-relationships.md` and `docs/architecture/equipment-capability-library-model.md` remain future equipment-model work.
- **Resolved (2026-08-25, verified directly against the live schema):** the two docs are not actually in conflict — they describe different things. `docs/table-relationships.md`'s "No Bag relationship is inferred from Hopper names" note is about *Airtable/CSV import-time inference* for historically-imported Hopper records that predate a Bag link in the source export; it is not a statement about the live Postgres schema. `lib/db/src/schema/hopper.ts` confirms `hoppers.bag_id` is a real, live foreign key (`integer("bag_id").references(() => bagsTable.id)`), enforced by a partial unique index (`one_active_hopper_per_bag`), and it is already the authoritative link used by shipped UI: `Bags.tsx`'s "Hopper: {phase}" badge, the Start Hopper Phase and Change Bag flows, and `Dashboard.tsx`'s Active Hopper Status panel all filter live hoppers by `bagId` today. One caveat found during this same verification pass: a small number of historically-imported Hopper rows have `bag_id = null` and `is_active = true` (orphaned from import, not created by any current write path) — these are invisible to all current UI (which only looks up hoppers by a specific `bagId`) and harmless, but are a minor data-hygiene item, not a schema-authority question. The final documented Hopper phase label list is Phase 1, Phase 2, Phase 3, End of Bag, Single Bag Phase, and Custom; `Grinder Cleanout` is a lifecycle/workflow event.

### Close Out Bag (workflow 1, Close Current Bag)

- Existing fields/tables likely used: `bags` (`End Date`/closeout date, `Active`, `Notes`/`Bag Notes`); existing `PATCH /api/bags/:id`; existing Close Bag dialog.
- Missing fields: no dedicated Bags CSV/schema fields for leftover-beans mass or chute/grinder cleanout beyond free-text `Notes`/`Bag Notes` — confirmed absent from the full Bags field list in `docs/csv-data-dictionary.md`. The plan's own "System effects" list names `closedOutDate` and `remainingEstimate` as the intended effect fields, but these are plan-proposed app-level names, not yet confirmed present in the CSV dictionary as first-class Bag fields.
- Future/deferred: a dedicated lifecycle event for closeout (per workflow 1's "Future improved implementation"), and optional automatic deactivation of the active Hopper state on bag close.
- Unresolved: whether closeout reason/waste must be structured data or can remain notes for launch (workflow 1 already answers this as notes-for-now).

### Maintenance Between Bags (workflow 2, Between-Bag Cleanout and Maintenance)

- Existing fields/tables likely used: none dedicated — currently approximated via Bag/closeout `Notes`. `Shot Classification` historically includes "maintenance" and "hopper refill" as example values, but this plan already treats that as a stopgap, not the target design.
- Missing fields: no maintenance/cleanout checklist fields (hopper emptied, grinder cleaned, backflushed, Cafiza used, accessories cleaned/changed) exist as structured data anywhere.
- Future/deferred: guided checklist options and a dedicated `Between-Bag Cleanout` / `System Maintenance` lifecycle event type, per the proposed model's candidate event types. Do not invent a maintenance schema now, per project boundaries.
- Unresolved: exact structured field list for maintenance checklist items — intentionally left undecided pending the lifecycle-event model (Phase E in "Implementation order").

## UI Flow Recommendations

Keep all paths launch-safe: no new schema is implied by the UI recommendations below, and any workflow lacking a backing field/table (see previous section) should present as guided copy/notes rather than a fake structured control.

- **Beginner path**: Start New Bag with only the required minimum (bean name, bag size, opened date, target dose) and clear inline copy that dial-in is expected; default to the guided Bags-page flow already shipped ("Bag Lifecycle Flow UI — 2026-08-24") for close → maintenance → new bag → hopper fill sequencing; avoid surfacing hopper phase-label or workflow-method choices until the user needs them.
- **Power-user path**: expose full bean/roast/roast-date-confidence fields, explicit hopper phase selection (Phase 1/2/3/End of Bag/Single Bag Phase/Custom), and workflow-method notes up front; allow direct entry into any of the 8 launch workflows without being routed through the beginner sequence.
- **Hopper dosing path**: Fill Hopper / Start Phase (workflow 5) → Hopper Top-Up (workflow 6) as the primary loop between shots; hopper phase and starting-beans baseline stay visible as the active context while logging shots, consistent with the "measured operating window, not total physical inventory" rule.
- **Single-dosing path**: per this plan's existing "Launch rule," this is explicitly not the first-class launch flow — the app should support hopper and dose-cup workflows cleanly first. For launch, single-dosing users can log shots without engaging hopper-phase UI at all (skip workflows 5–6 entirely) and record workflow method as a note; a first-class single-dose, single-dose freezing, and vacuum-packed-dose UI is future work.
- **Pour-over / decaf / guest workflow path**: these should be supported initially as drink type, serving context, equipment context, and notes rather than first-class lifecycle branches. Dedicated grinder/profile defaults and special workflow screens remain deferred until account/user scoping and equipment selectors exist.
- **Mobile-first considerations**: reuse the existing guided-copy pattern already on the Bags page rather than introducing new mobile-specific controls; keep each workflow's required-field count minimal on small screens; defer optional/power-user fields behind expandable sections rather than always-visible forms. This recommendation is UI-flow guidance only — it does not touch `ShotForm.tsx` or the separate mobile number-control stepper work.

## Analytics Protection

Each workflow must avoid polluting `Include in Analysis`, `Rating`/`Preference Rating`, `Reference Shot`/`Signature Shot`, bag averages (`Avg Rating`, `Average Preference Rating`), and hopper/bag remaining calculations. The rules below are drawn from already-established project rules (`docs/START_HERE.md`, `docs/intelligence-engine-map.md` shared rules, `docs/csv-data-dictionary.md`), not invented here.

- **Dial-in / setup waste and standalone purge/cleanout** (workflows 2, 4, 7): must never be recorded as an analytical Shot. `Include in Analysis` is the authoritative gate for every analytical query; non-drinkable setup rows should not receive it. The proposed lifecycle-event model defaults `include_in_analysis` to `false`.
- **Bag closeout and maintenance** (workflows 1–2): closeout/maintenance notes and any future lifecycle events are evidence records, not shots — they must not appear in `Shot Count`, `Reference Shots`, `Analysis Shot Count`, or rating rollups on the Bags table.
- **Hopper refill / phase transition** (workflows 5–6): a fill/top-up/phase-change event changes hopper state (`hopper_mass`, `hopper_percent`, phase baseline) but is not itself a shot and must not be scored, rated, or counted toward bag/hopper shot totals.
- **Normal shots and dial-in attempts** (workflows 4, 8): `Reference Shot` and `Signature Shot` remain manual-only flags, never inferred from `Rating`/`Preference Rating` (`Signature Shot` implies `Reference Shot`; the reverse is not automatic, per `docs/START_HERE.md`). `Rated`/`Include in Analysis` stay independent selectors — a dial-in attempt can be logged and kept in history without being `Rated` or counted `Include in Analysis` if it isn't a fair evaluation of the bag.
- **Bag/hopper remaining calculations**: per this plan's "Explicit non-goals," no new remaining-inventory formula is implemented here. Any future dashboard inventory correction (Phase F) must account for basket dose, over-grind removed, top-up grind, grind waste, standalone lifecycle waste, beans added, and measured reconciliation together — but that formula remains unapproved and unresolved, consistent with `docs/table-relationships.md`'s note that "exact Hopper percentage, retention, purge, reconciliation, and automatic phase-transition formulas remain source-owned and unresolved."

## Future Development Notes

These are documented for context only and are explicitly out of scope for this lifecycle-planning phase:

- **System Phases**: see the "System Phase / Experiment Phase model" section above for the full proposal (structured phase relationship from Shots/lifecycle events to a System Phase record); not implemented.
- **Brew curves**: named in `docs/ROADMAP.md` as a future research-and-development feature not required for first release; would eventually attach to Shots or a System Phase, not to Bag/Hopper state directly.
- **Bluetooth scale**: same ROADMAP note as brew curves — future R&D, not launch-blocking; would primarily affect shot-entry data capture, not bag/hopper lifecycle modeling.
- **Equipment-aware advice**: depends on a machine/grinder selector existing in `Log Shot` (currently absent — `machineId`/`grinderId` exist on `shots` in the DB but are not exposed in the form, per `docs/completed-tasks.md`) and on the shared equipment library described in `docs/architecture/equipment-capability-library-model.md`; not implemented.
- **AI-guided onboarding interview**: no design exists yet; would likely feed the beginner-path Start New Bag flow described above, but is not scoped for launch.
- **User-specific workflow methods**: `workflow_method` (hopper / dose cup / single dose / frozen single dose / vacuum-packed doses / decaf split / pour-over / guest drinks / mixed) is recorded as a concept in this plan's domain boundaries but has no storage field yet; future work, not launch-blocking.
- **Shot-level Brew Method**: Brew Method (how the beverage was extracted — Espresso, Pour-over, etc.) is distinct from Drink Type (what was served — Americano, Affogato, etc.); see `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md` for the full distinction. A user's normal workflow can combine both, e.g. Brew Method Espresso with Drink Type Americano. The shot is the durable evidence record, so Brew Method should eventually be captured at the shot level, not only inferred from the selected machine — a machine may suggest a default Brew Method, but the machine alone is not the shot evidence. No storage field exists yet; future work, not launch-blocking.
- **Community/equipment library implications**: per `docs/architecture/equipment-capability-library-model.md`, shared verified equipment library work is explicit future scope "after account/auth, ownership, moderation, admin review, and privacy controls exist." For launch, equipment stays personal/user-owned only.

## Recommended data model direction

## Existing model to keep

Keep:

- `beans`,
- `bags`,
- `hoppers`,
- `hopper_range_baselines`,
- `shots`.

These are real domain objects and should remain first-class.

## New model recommended before full lifecycle launch

Add a dedicated lifecycle-event model before attempting complete bag/hopper workflows.

Proposed conceptual fields:

- `id`,
- `event_type`,
- `occurred_at`,
- `bag_id`,
- `hopper_id`,
- `shot_id` optional,
- `beans_added_g`,
- `waste_g`,
- `measured_remaining_g`,
- `phase`,
- `system_phase_id`,
- `system_phase_name`,
- `workflow_method`,
- `notes`,
- `include_in_analysis` false by default,
- `created_at`.

Candidate event types:

- Bag Opened,
- Bag Closed Out,
- Between-Bag Cleanout,
- System Maintenance,
- New Bag Setup,
- Hopper Fill,
- Hopper Top-Up,
- Hopper Phase Transition,
- Single Bag Phase Start,
- Grinder Purge,
- Chute Cleanout,
- Grind Change Waste,
- Workflow Method Change,
- System Phase Started,
- System Phase Ended,
- Reconciliation.

Do not invent formulas in this model. It should store evidence and workflow state only.

## System Phase / Experiment Phase model

System phases should eventually become first-class context for shots and lifecycle events.

**Decided (2026-08-25): System Phase and Experiment are two different, nested concepts, not one flat list.** A System Phase is a broad operating era — it can last a long time and cover many kinds of shots. An Experiment is a specific, deliberate test that happens *inside* a System Phase. A phase does not need an active experiment; an experiment always belongs to exactly one phase. Earlier drafts of this section flattened both into a single example list — that was a documentation gap, not a decision to treat them as equivalent, and is corrected below.

Purpose:

- label a period of operation with a user-defined name and goal,
- preserve evidence context when workflow or equipment changes,
- support later filtering and comparison,
- avoid mixing initial setup records with controlled baseline or optimization records,
- let a focused experiment inside a stable phase be analyzed on its own without losing the phase's broader context.

System Phase examples (broad era):

- `System Phase 1 — Initial Setup Phase`,
- `System Phase 2 — Scientific Process / Baseline Phase`,
- `System Phase 3 — Timed Dose Optimization`,
- `System Phase 4 — Active Experimentation Era`.

**Owner clarification recorded 2026-08-29:** System Phase 2 used Bags 3, 4 and 5. Its purpose was scientific-process/baseline observation, not active natural-18.0 g optimization. Grind time was set near the beginning of a Bag and generally left unchanged. The owner sometimes intentionally over-ground and removed excess because the grinder's minimum additional 0.2-second grind was reported to produce approximately 0.5–0.7 g, so correcting a 0.1–0.2 g under-dose could create additional waste. System Phase 3 uses Bags 6 and 7 and is the first phase explicitly chasing improved natural 18.0 g Initial Grinder Output. Reported Phase 3 improvements require data verification before they become research conclusions.

Experiment examples (a specific test, nested inside a System Phase — e.g. all of these could sit inside `System Phase 4 — Active Experimentation Era`):

- `Experiment: Hopper Overfill / Timed Dose Stability`,
- `Bluetooth Brew Curve Scale Test`,
- `Flow Control Taste Exploration`,
- `Preinfusion Baseline Test`,
- `New Grinder Baseline`,
- `Single Dose Workflow Trial`.

Rule: experiment-specific fields and metrics (e.g. whatever `Hopper Overfill / Timed Dose Stability` needs to track) should only appear/apply while that experiment is the active one — they should not leak into every shot logged during the wider System Phase, and should not persist as visible fields once the experiment ends.

Conceptual fields:

- `id`,
- `name`,
- `phase_number` optional,
- `purpose`,
- `started_at`,
- `ended_at`,
- `active`,
- `equipment_context`,
- `workflow_method`,
- `controlled_variables`,
- `changed_variable`,
- `advanced_machine_variables_held`,
- `notes`.

Expected analysis use:

- exclude System Phase 1 when it was only setup/noisy learning,
- analyze only a focused optimization phase,
- compare before/after equipment changes,
- compare natural-dose hit rate before/after grind-time optimization,
- compare phases where flow control, preinfusion, pressure profiling, brew curves, or temperature changes were deliberately tested,
- clearly label evidence as cross-phase when comparisons span different equipment or workflow contexts.

Implementation note:

This should not be implemented as free-text shot notes only. Free-text notes are useful evidence, but future analytics need a structured phase relationship from Shots and lifecycle events to a System Phase.

**Shot-level foundation landed (2026-08-27):** three additive nullable shot columns — `system_phase` (integer era number), `system_phase_name` (text), `experiment_name` (text) — plus compact Log Shot / Edit Shot fields (a "Workflow Context" card) and a conditional Shot Detail "Workflow Context" section shown only when a value is present. This is a deliberate minimal foundation, **not** the full structured model above: no `system_phases` table, no lifecycle-event relationship, no started/ended dates, no analytics. It is more structured than free-text notes (dedicated typed, filterable columns) and does not preclude migrating `system_phase` to a foreign key into a future `system_phases` record. **No historical backfill** — no `System Phase` field exists in any Airtable base or CSV export (verified 2026-08-27; independently re-verified the same day), so shots logged before this stay blank rather than being inferred from `hopper_phase` (`Phase 3` there is the 3rd hopper refill within a bag, not a system era) or shot order. The primary metric for `System Phase 3` is `Initial Output (g)` / `initial_grind_weight` — how consistently the *natural* timed grinder output lands at 18.0g — never `Dose`, which is routinely corrected to 18g and so cannot judge natural grinder-output success.

## Maintenance Workflow Model

Maintenance is its own workflow, not a subset of Shot Classification or Fault Status, and not implementable as a maintenance table yet — this section is the plan for that model, not the model itself.

### Why not Shot Classification / Fault Status

`Shot Classification` historically listed values like "Maintenance / Cleaning" and "Grind Change / Purge" as if maintenance were a kind of shot record. It is not. A maintenance event usually has no extraction at all, and even when it's logged alongside a shot (e.g. a grind-change purge before a drink shot), the maintenance fact and the drink-shot fact are two different pieces of evidence that happen to be close in time. Folding maintenance into a shot-record selector:

- forces every maintenance action to pretend to be a shot, even when no coffee was extracted,
- pollutes `Shot Classification`'s real purpose (describing the shot itself),
- gives maintenance no place to carry its own structured fields (event type, interval basis, due-date logic) that a single selector value can't hold,
- makes it impossible to build the dashboard reminder model described below, since there's nowhere to attach "last did this" state per rule.

This decision holds even once lifecycle events (the model already proposed above under "New model recommended before full lifecycle launch") exist — maintenance should get its own event type(s) within that model, not a `Shot Classification` value repurposed to mean something else.

### Where maintenance rules can attach

A maintenance rule (e.g. "backflush every 1kg") is not one universal thing — it can be scoped to:

- a specific **machine** (e.g. the Profitec Go's own backflush interval),
- a specific **grinder** (e.g. burr-clean interval, which varies by grinder),
- a specific **accessory** (e.g. a puck screen's own clean/replace interval),
- the **user/default profile** (a fallback rule when no more specific machine/grinder/accessory rule is set).

Manufacturer/library-suggested defaults (once a shared equipment library exists — see `docs/architecture/equipment-capability-library-model.md`) are a *starting suggestion* only. The rule that actually drives a reminder is whatever the user has confirmed for their own workflow, which may differ significantly from the manufacturer's suggestion (see Carl's own workflow below, which is user-derived, not a manufacturer schedule).

### How a reminder basis can be defined

A maintenance rule needs a way to say "how often." At minimum, launch-scope thinking should support all of:

- every shot (e.g. a blind-disk backflush after every shot, for users who do this),
- every X shots,
- every X bags,
- every X grams/kg of beans processed,
- every X days/weeks (pure time-based),
- manual only (no reminder — the user decides when, with no due-date tracking at all).

No exact reminder formula is decided here — how "X grams processed" gets computed from shot/bag/hopper records, how multiple simultaneous rules interact, and how "due" is calculated are all deliberately left open for a future implementation task, per this task's own boundary.

### Maintenance event types (minimum launch-relevant set)

- water/rinse backflush,
- Cafiza/detergent backflush,
- portafilter/basket clean,
- shower screen clean,
- grinder chute purge,
- grinder vacuum,
- burr clean,
- descale,
- full machine clean.

This list is a minimum starting vocabulary, not a closed enum — it should remain easy to extend, the same way `Shot Classification`/`Bean Achievement` already tolerate historical/custom values elsewhere in this project.

### Concrete example: Carl's current owner workflow

Recorded here as real evidence for the model above, not as a universal default for other users:

- Machine: Profitec Go. Grinder: Eureka Mignon Magnifico.
- Water/rinse backflush: after each 1kg bag.
- Full clean (Cafiza/detergent backflush, portafilter clean, basket clean, machine/shower-screen cleaning): every 2kg of beans.
- Grinder vacuum: only on bag change (not on a shot- or gram-based interval).
- Grinder chute purge / grind waste: on grind-setting changes or bag changes (event-triggered, not interval-triggered).
- Descale: manual, based on water hardness and machine guidance — explicitly *not* a blind fixed-interval reminder. This is a deliberate exception to the interval-basis list above: some maintenance genuinely should stay manual-only, and the model must not force every event type onto a schedule.

This example demonstrates why the model needs multiple simultaneous, independently-scoped rules (per-bag, per-kg, per-event-trigger, and manual-only) rather than one global interval — a single "clean every N units" setting could not represent Carl's actual routine.

### Future dashboard reminder model

Not implemented now; described here so future work has a target shape:

- Show upcoming/due maintenance derived from recorded maintenance events (when a rule's basis was last satisfied) and the user's own confirmed rules (not manufacturer defaults, unless the user hasn't overridden them) — e.g. "Water Backflush Due After This Bag" or "Cafiza Clean In 0.5kg."
- A recorded maintenance event of the matching type should reset that rule's due-date/counter — this is the core mechanic that makes the reminder actually track real behavior instead of a static calendar.
- Must never block shot logging — a due/overdue reminder is informational, shown on the Dashboard or similar, not a gate in `Log Shot`.
- Should read as helpful, not naggy — a single calm indicator per due/upcoming item, not a blocking modal or repeated interruption. Exact presentation is a future UI decision, not specified here.

### AI onboarding implications

`docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`'s onboarding flow should ask about the user's actual maintenance routine (what they clean, how often, by what basis) the same way it already asks about bean feed method, dose verification, and other workflow questions — and should frame consistent cleaning as part of the scientific espresso process (a confound to control for, not a chore separate from logging). See that document for the actual onboarding-flow wording; not repeated here.

## Phase A — Documentation and UI copy

Status: this document.

Scope:

- document bag/hopper lifecycle semantics,
- define launch workflow,
- identify unresolved decisions,
- prevent further confusion between shots and lifecycle events.

## Phase B — Close Bag polish

Status: **Shipped** ("Bag Lifecycle Work Package: Closeout Flow Polish and Closed-Out Summary", `docs/completed-tasks.md`). The Close Out Bag dialog now has an explicit "I measured it" / "Not measured — intentionally skipped" choice (not just an optional field), closeout/cleanout notes, and copy clarifying this is reconciliation evidence, not a correction to prior shots.

Scope:

- keep existing Close Bag dialog,
- clarify wording,
- make measured vs unmeasured leftover explicit,
- make clear this is reconciliation evidence,
- keep historical shots unchanged.

No schema change required unless closeout reason or closeout waste must be structured.

## Phase C — Start New Bag guided flow

Status: **Shipped** ("Bag Lifecycle: Guided 'Change Bag' Workflow", `docs/completed-tasks.md`). A guided `ChangeBagDialog` in `Bags.tsx` walks through: identify current active bag(s) → optionally close the old one (same measured/unmeasured choice as Phase B) → create/select the bean → minimal new-bag details → optionally start the first hopper phase. Reuses only existing `POST /api/beans`, `POST /api/bags`, `PATCH /api/bags/:id`, `POST /api/hoppers` — no schema/API changes. Live-verified 2026-08-25 (see this same review's findings below) including the partial-failure path.

Scope:

- guide user through Bean creation/selection,
- Bag creation,
- roast-date method and confidence,
- defaults,
- active bag switch,
- optional hopper phase start.

This can mostly use existing Beans/Bags APIs.

Risk:

- active bag is not DB-enforced globally — **as shipped, this is a soft warning, not a hard block**: the flow allows multiple active bags (with an explicit amber warning shown), matching the "active-bag enforcement... after the safest migration path is scoped" decision below, not the DB-level enforcement the decision defers.
- The UI/API should avoid accidentally leaving multiple active bags — **the guided flow's submission order (bean → new bag → close old → hopper) is deliberately chosen so the worst case of a partial failure is two temporarily-active bags, never zero**; live-verified 2026-08-25.

## Phase D — Active Hopper Phase setup

Status: **Shipped** ("Bag Lifecycle Slice: Start Hopper Phase" and "Bag/Hopper Lifecycle Work Package: Start Hopper Phase UX, Status Cues, Closeout Copy", `docs/completed-tasks.md`). A "Start Hopper Phase" dialog (standalone, and embedded in the Change Bag flow) creates a new Hopper row via the existing `POST /api/hoppers`, which already deactivates the prior active hopper for that bag transactionally. The phase selector is restricted to exactly the six approved labels below — live-verified 2026-08-25, `Grinder Cleanout` confirmed absent.

Scope:

- add frontend workflow for starting a hopper phase,
- create a new Hopper state row,
- deactivate prior active Hopper row for that bag,
- record starting beans/phase baseline,
- keep percentage formulas imported/read-only until approved.

Uses existing Hopper API.

Open issue:

- decide final phase selector list — **resolved**: `Phase 1`, `Phase 2`, `Phase 3`, `End of Bag`, `Single Bag Phase`, `Custom`, shipped as the exact (and only) options in both Start Hopper Phase dialogs.

## Phase E — Lifecycle Event model

Scope:

- add lifecycle event table,
- add API routes,
- add UI for standalone purge/waste/reconciliation,
- stop representing maintenance-only actions as fake shots.

This is the key architectural step before robust hopper workflow.

Risk:

- medium/high, because it affects inventory accounting and dashboard consumption.

## Phase F — Dashboard inventory correction

Scope:

- dashboard bag/hopper remaining should account for:
  - drink shot basket dose,
  - over-grind removed,
  - top-up grind,
  - grind waste,
  - standalone lifecycle waste,
  - beans added,
  - measured reconciliation.

Do not implement until lifecycle events and hopper assignment rules are approved.

## Known risks

- Existing historical “setup” rows may be stored as Shots even when no drinkable extraction happened.
- Hopper percentage formula is not yet approved for local calculation.
- Top-up versus phase-transition semantics are not fully resolved.
- Active Bag is workflow-critical but not globally constrained in the database.
- ~~The app has no dedicated Hopper frontend yet.~~ **Resolved 2026-08-25**: Start Hopper Phase (Phase D) shipped and is live-verified. Remaining, still-open: no way to *edit or remove* a Hopper record once created — `routes/hopper.ts` has `GET`/`POST`/`PATCH` but no `DELETE`, and `PATCH` cannot clear `bagId`, `startingBeans`, `phase`, or `notes` back to null (an `undefined`-vs-`null` gap, the same class of bug already fixed for `bags.remainingEstimate` and several `shots` fields, but not yet applied here) — found during this review's live testing, not yet fixed.
- Current imported Hopper formula snapshots may be stale compared with live Postgres shot records.
- **New, found 2026-08-25**: `Bags.tsx`'s `ChangeBagDialog` mutation's `onError` handler does not invalidate any queries (only `onSuccess` does). On a partial failure (e.g. the new bag and bean are created successfully but the Custom-phase hopper step fails validation), the error message correctly tells the user what happened and what to do next, but the newly-created bag does not appear in the Bags list until the page is manually reloaded — confirmed by live-reproducing the exact scenario. Low severity (no data is lost or corrupted, and the error text is accurate), but confusing: the UI looks like nothing happened when something did.

## Decisions recorded before implementation

1. `Custom` is an approved Hopper phase label.
2. `Grinder Cleanout` should move from Hopper phase label to lifecycle/workflow event type.
3. Same-phase hopper top-ups should create lifecycle events, not new Hopper rows.
4. One active Bag should eventually be enforced in the database, after the safest migration path is scoped. Later multi-user support will need owner/user scoping.
5. Standalone grinder purge/setup waste should require the lifecycle-event table if launch includes real bag/hopper inventory tracking.

Recorded rationale:

1. `Custom` allows unusual user workflows but should be treated as lower-confidence workflow evidence.
2. Hopper phase labels should describe measured bean operating windows; cleanout describes an action/event.
3. A top-up within the same phase modifies/reconciles the measured operating window; it should not create a new phase row.
4. Active-bag enforcement protects dashboard correctness, but migration must avoid corrupting existing imported/history data.
5. Standalone purge/setup waste affects inventory but is not a drink shot, so it needs a lifecycle event rather than a fake shot record.

## Launch success criteria

This lifecycle work is ready when the owner can:

- close out the old active bag,
- record measured leftover beans/chute mass,
- start a new bean/bag,
- record roast-date evidence and confidence,
- start a hopper phase with 300g or another chosen baseline,
- record dial-in waste without creating a fake analytical shot,
- log the first drink shot,
- later edit tasting details,
- see bag/hopper remaining reflect all recorded consumption and waste,
- preserve all historical shots and source evidence.

## Explicit non-goals

Do not implement in this lifecycle phase:

- DCI,
- OSI,
- HMI,
- BLI,
- MSI,
- GSP,
- predictive recommendations,
- community features,
- payment flows,
- Bluetooth scale integration,
- brew curves,
- machine telemetry.
