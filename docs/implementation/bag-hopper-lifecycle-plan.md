# Bag and Hopper Lifecycle Plan

Last updated: 2026-08-24

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
- Single Bag Phase.

Unresolved phase-label decision:

- Earlier docs include `Grinder Cleanout`.
- Later product direction also mentioned `Custom`.
- Before shipping a final selector, decide whether `Custom` replaces `Grinder Cleanout`, or whether `Grinder Cleanout` belongs in lifecycle event type instead of Hopper phase.

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

Purpose:

- label a period of operation with a user-defined name and goal,
- preserve evidence context when workflow or equipment changes,
- support later filtering and comparison,
- avoid mixing initial setup records with controlled baseline or optimization records.

Examples:

- `System Phase 1 — Initial Setup Phase`,
- `System Phase 2 — Scientific Process / Baseline Phase`,
- `System Phase 3 — Timed Dose Optimization`,
- `Bluetooth Brew Curve Scale Test`,
- `Flow Control Taste Exploration`,
- `Preinfusion Baseline Test`,
- `New Grinder Baseline`,
- `Single Dose Workflow Trial`.

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

## Implementation order

## Phase A — Documentation and UI copy

Status: this document.

Scope:

- document bag/hopper lifecycle semantics,
- define launch workflow,
- identify unresolved decisions,
- prevent further confusion between shots and lifecycle events.

## Phase B — Close Bag polish

Scope:

- keep existing Close Bag dialog,
- clarify wording,
- make measured vs unmeasured leftover explicit,
- make clear this is reconciliation evidence,
- keep historical shots unchanged.

No schema change required unless closeout reason or closeout waste must be structured.

## Phase C — Start New Bag guided flow

Scope:

- guide user through Bean creation/selection,
- Bag creation,
- roast-date method and confidence,
- defaults,
- active bag switch,
- optional hopper phase start.

This can mostly use existing Beans/Bags APIs.

Risk:

- active bag is not DB-enforced globally.
- The UI/API should avoid accidentally leaving multiple active bags.

## Phase D — Active Hopper Phase setup

Scope:

- add frontend workflow for starting a hopper phase,
- create a new Hopper state row,
- deactivate prior active Hopper row for that bag,
- record starting beans/phase baseline,
- keep percentage formulas imported/read-only until approved.

Uses existing Hopper API.

Open issue:

- decide final phase selector list.

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
- The app has no dedicated Hopper frontend yet.
- Current imported Hopper formula snapshots may be stale compared with live Postgres shot records.

## Decisions needed before implementation

1. Should `Custom` be an approved Hopper phase label?
2. Should `Grinder Cleanout` move from phase label to lifecycle event type?
3. Should same-phase hopper top-ups create lifecycle events, not new Hopper rows?
4. Should one active Bag be enforced globally in the database?
5. Should standalone grinder purge/setup waste require the new lifecycle-event table before launch?

Recommended answers:

1. Yes, allow `Custom`, but treat it as lower-confidence workflow evidence.
2. Yes, `Grinder Cleanout` should be a lifecycle event type.
3. Yes, same-phase top-ups should be lifecycle events.
4. Yes, eventually enforce one active Bag globally for single-user launch; later multi-user support will need owner/user scoping.
5. Yes, if launch includes real bag/hopper inventory tracking.

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
