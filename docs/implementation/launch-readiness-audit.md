# Launch Readiness Audit

Last updated: 2026-08-25

## Purpose

A practical audit of what must be fixed before BigShotEspresso is shown to outside users. This is documentation only — no code, schema, or application logic was changed to produce it. It does not implement DCI, OSI, HMI, BLI, MSI, GSP, OAuth, or payments; where those are blockers, they are documented as blockers, not scoped as implementation work here.

## Framing: "outside users" is not one bar

Two different thresholds appear across the project's own docs, and they should not be conflated:

1. **Owner-only release candidate** — the standing scope of `docs/implementation/release-candidate-checklist.md` and ADR-0008. This is close, mechanically: most gates are "mostly ready" or "passed," and the main remaining work is rehearsal/verification, not new features.
2. **Public paid early-access launch** — the standing product intent in `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md`, which already answers its own "open content questions" with a concrete plan: public pricing at $10/month, a $80/year Founder tier limited to the first 500 users, then $110/month after. This is a real commercial plan, not a hypothetical.

These two are far apart. The codebase is close to (1) and has essentially nothing built for (2) — no accounts, no auth, no per-user data ownership, no billing. Every other finding in this audit is smaller than that gap. This audit treats (1) as achievable soon and (2) as the real "first outside users" milestone, and flags the size of the gap between them explicitly rather than letting it hide inside smaller polish items.

## Critical blockers

These must be resolved (or explicitly, knowingly accepted as scope-limiting) before any user outside the owner sees the app.

### 1. No authentication, authorization, or per-user data ownership exists

Confirmed by direct inspection, not assumption: there is no login flow, no session/user table referenced anywhere in `artifacts/coffee-log/src` routing, and `Shell.tsx` has no account/profile/sign-out UI at all. `Settings.tsx` itself already says so out loud (line 576): *"User-specific active equipment will become stricter after accounts/OAuth are added."* ADR-0008 formally scopes the current release as owner-only for exactly this reason.

This is the single largest gap between the landing page's stated plan (public pricing, a 500-seat Founder tier, "early access for founders") and the current app. Every other item in this audit is secondary to it. This is documented here as a blocker, per this task's boundary — it is not scoped for implementation in this pass.

### 2. No live/manual smoke test has ever been performed, anywhere, in this project's history

This is not a one-off gap — it is a pattern repeated in essentially every implementation session's own handoff across this project's history: "no live browser smoke test performed... no running Postgres-backed instance available," over and over, for the hopper-phase workflow, the bag closeout flow, the flag-behavior fix, the mobile nav fix, the Change Bag flow, and more. `docs/START_HERE.md`'s own "Current gate" section lists *"Manual UI shot-entry smoke test passes"* as still outstanding. Every individual piece has been verified by typecheck/tests/build and code inspection, which is real signal, but the whole has never been clicked through end-to-end by a human in a browser against real data.

### 3. Render deployment has never been smoke-tested

`docs/START_HERE.md`'s current gate also lists *"Render deployment smoke test passes"* as still blocking. Nothing in this audit changes that status; it is repeated here because it is a precondition for literally any outside user, owner or otherwise.

### 4. Settings contains multiple controls that visibly do nothing — **RESOLVED 2026-08-25**

Verified directly by grepping every consumer of these Settings keys across `artifacts/coffee-log/src`: **`ratingSystem`, `unitSystem`, `timeFormat`, `ratingInputMode`, `grindTimerMode`, `hopperTracking`, `defaultHopperFullness`, `grindTimeIncrement`, `grindScaleMin`, `grindScaleMax`** are all present in `Settings.tsx`'s `SECTIONS` array, savable, and displayed — but are never read by `ShotForm.tsx`, `ShotDetail.tsx`, `Bags.tsx`, or any other page. (The one nearby field that *is* real: `grindMinTime` is read three times in `ShotForm.tsx`.) A first user who sets "Unit System: Imperial" or "Rating System: 0–100" will see zero change anywhere — dose still shows grams, rating still caps at 10. This is exactly the kind of first-impression trust break the project's own trust-and-safety principles ("the app does not silently invent thresholds or conclusions," "unknowns remain unknown") argue against, applied to Settings itself: it currently implies more control than it delivers.

**Resolution:** 13 fields removed (the 10 above plus `temperatureUnit`, `defaultBrewRatio`, and a global `usePuckScreen` key found via the same verification method during implementation). `grindTimerMode` was kept, per this audit's own suggested treatment, with a visible "not yet used elsewhere in the app" caption rather than removal, since it plausibly ties to the already-deferred single-dose workflow. See `docs/completed-tasks.md`, "Launch Readiness Audit Slice 2: Removed Non-Functional Settings Fields — 2026-08-25," for full detail. Typecheck clean, 55/55 tests, build clean. No live-browser confirmation performed yet — same standing gap as Critical Blocker #2.

## High-priority fixes

### 5. Bags page has two overlapping, unexplained paths to the same outcome

Verified in the current `Bags.tsx`: an active bag row shows a "Start Phase" button and a "Close" button individually, while the page header also has a "Change Bag" button that does *both* (create the new bag, optionally close the old one, optionally start its hopper phase) in one guided dialog. Nothing in the UI explains when to use which. A first user closing a bag one way and then finding a second, larger button that seems to do the same thing is a real point of confusion, not a hypothetical one.

### 6. Quick Log is unlinked but not actually blocked

`App.tsx` still registers `<Route path="/shots/quick" component={QuickLog} />`. Nothing in navigation links to it (confirmed — no `QuickLog`/`/shots/quick` reference anywhere in `Shell.tsx`), but the route itself is fully live. A stray bookmark, an old shared link, or a guessed URL lands a user in a form the project has explicitly, repeatedly declared shelved and not maintained for launch (`docs/implementation/release-candidate-checklist.md` Gate 0.5). Unlinking is not the same as blocking.

### 7. Dashboard's Active Hopper Status panel will show as partially blank for the exact workflow it was built to support

`hopperMass`/`hopperPercent` are imported/computed-elsewhere values (per this project's own repeated, standing rule: "do not calculate hopper percentage locally until the formula is approved"), never written by the live app's `POST /api/hoppers` path. A user who starts a hopper phase through the new, polished "Start Hopper Phase" or "Change Bag" dialogs will see "Starting beans" populated correctly next to a blank "Hopper mass"/"Hopper %" — which reads as broken, not as "not yet tracked." A one-line "not tracked yet for phases started in-app" label would resolve the confusion without inventing any formula.

### 8. Grinder Setting precision is still hardcoded, independent of which grinder is selected

Already self-flagged in an earlier session and still true: `Log Shot`'s Grind Setting stepper uses a fixed `step={0.01}` regardless of the per-grinder `grindSettingPrecision`/`grindStepIncrement` values that already exist on grinder records (`Equipment.tsx`). The Machine/Grinder selectors added this session don't yet feed that precision back into the stepper. Not misleading, but a missed-precision annoyance for any user whose grinder steps in coarser increments than 0.01.

## Medium-priority polish

### 9. Settings has duplicate-purpose keys bridged only by fallback logic

`defaultGrinder`/`defaultRegularGrinder` and `defaultBasket`/`defaultBasketSize` each represent one real concept but are stored as two separate settings keys, reconciled at read-time with `??` fallbacks (`values.defaultGrinder ?? values.defaultRegularGrinder`, etc.). Functions correctly today; a future edit to one without the other risks silent drift. Worth consolidating to one canonical key per concept when convenient, not urgent.

### 10. "Grinder Output Measurement" (By Time / By Weight / Manual-Single Dose) is a real-looking setting with no behavior behind it yet

Consistent with single-dosing being explicitly deferred across multiple docs in this project — this setting is presumably a placeholder for that future workflow. It should say so (e.g. a "coming soon" note) rather than sitting indistinguishable from the settings that do work.

### 11. Domain-honesty copy is dense for a first-time user

The Bags/Hopper dialogs correctly, deliberately hedge everything ("reconciliation evidence only," "not yet tracked as a lifecycle event," "measured operating window, not total physical inventory") — this is good scientific honesty and should not be diluted for accuracy's sake. But stacked together, it can read as "this feature isn't finished" to someone with no context for *why* the hedging exists. Worth a first-time-user pass once the workflow itself is stable, not before.

### 12. Mobile bottom nav carries 10 items in one scrollable strip

The recent edge-fade fix (`Shell.tsx`, `mask-image`) correctly solved the "Settings was undiscoverable" bug and added a non-color active-tab cue — both verified present in the current file. Ten items is still a lot to swipe through for common actions on a phone. Not broken, just dense; a candidate for a later "top 4 + More" mobile restructuring if user feedback asks for it, not before.

## Deferred post-launch ideas (already correctly out of scope — noted for completeness, not proposed as new work)

- DCI, OSI, HMI, BLI, MSI, GSP — explicitly "Not authorized" per `docs/ROADMAP.md`.
- Community features, leaderboards, achievement badges, opt-in research contribution — explicitly future-only per the landing page doc.
- Bluetooth scale integration, brew-curve capture, machine telemetry — explicitly deferred to post-revenue R&D per `docs/ROADMAP.md`.
- Curated/verified shared equipment library — explicitly deferred until account/auth/ownership/moderation exist.
- A dedicated lifecycle-event table (maintenance, purge, cleanout as first-class records instead of notes) — repeatedly deferred throughout this project's implementation history; still the correct call.
- Live "beans consumed"/dashboard inventory correction — explicitly deferred pending the lifecycle-event model, a shot→hopper linkage in `Log Shot`, and an approved hopper-percentage formula; already discussed and correctly held open in this project's own recent history.
- Machine/profile-level Drink Type defaults — explicitly deferred pending stronger machine/grinder context in `Log Shot`.

## Suggested next 5 implementation slices

Ordered by leverage — each closes a disproportionately large risk relative to its size.

1. **Actually run the deferred smoke test.** Deploy to Render (or a disposable equivalent) and manually click through the full lifecycle once: create bean → bag → dial-in → log shot → edit shot (clear a field) → view Shot Detail → close bag → Change Bag → Start Hopper Phase → Dashboard. This isn't a code slice, but it's the highest-leverage single action available — it either confirms months of typecheck/test-verified work actually works end to end, or it surfaces the one thing static verification can't catch.
2. **Settings cleanup pass.** Remove or clearly label (as not-yet-functional) the confirmed-dead fields: `ratingSystem`, `unitSystem`, `timeFormat`, `ratingInputMode`, `grindTimerMode`, `hopperTracking`, `defaultHopperFullness`, `grindTimeIncrement`, `grindScaleMin`, `grindScaleMax`. Small, safe, high first-impression value — directly closes Critical Blocker #4.
3. **Bags page action-path clarity.** Either add a one-line explanation of when to use "Change Bag" vs. the per-row Close/Start Phase buttons, or fold the per-row buttons into the guided flow once it's proven out. Closes High-Priority Fix #5.
4. **Hard-block `/shots/quick`.** Redirect it to `/shots/new` or show a short "this mode has been retired" notice, instead of leaving the full old form silently reachable. Closes High-Priority Fix #6.
5. **Auth/accounts scoping ADR.** Before any implementation, produce (or formally update ADR-0008 into) a real plan for what "public early-access launch" requires: account creation, session handling, per-user data ownership on every table currently assumed single-user, and how the Founder-tier billing described in the landing page doc actually gets enforced. This is the real precondition for the business plan in `BSE_PRODUCT_LANDING_PAGE_CONTENT.md` and deserves its own dedicated planning pass — documentation before implementation, per the Constitution — not a quick code slice bolted onto something else.

## Handoff

### Files inspected

`docs/START_HERE.md`, `docs/PROJECT_CONSTITUTION.md`, `docs/ROADMAP.md`, `docs/implementation/release-candidate-checklist.md`, `docs/completed-tasks.md` (full accumulated history from this project's implementation sessions), `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md`, `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`, `artifacts/coffee-log/src/pages/ShotForm.tsx`, `artifacts/coffee-log/src/pages/ShotDetail.tsx`, `artifacts/coffee-log/src/pages/Bags.tsx`, `artifacts/coffee-log/src/pages/Settings.tsx`, `artifacts/coffee-log/src/components/layout/Shell.tsx`, `artifacts/coffee-log/src/App.tsx` (route registration), plus targeted greps across `artifacts/coffee-log/src` to verify which Settings keys are actually consumed anywhere in the app (used to substantiate Critical Blocker #4 rather than guess at it) and to confirm the `/shots/quick` route's live status.

### Files changed

- `docs/implementation/launch-readiness-audit.md` (created)
- `docs/implementation/README.md` (added one index line, if not already present)

No application code, schema, API, or migration files were touched. No build was run — documentation-only change, no code touched, no broken links discovered requiring verification beyond the direct file reads performed above.

### Biggest launch risks

1. The gap between "owner-only release candidate" (close) and "public paid early-access launch" (essentially unstarted — no auth/accounts/billing) is the dominant risk. Every other finding here is smaller.
2. No one has ever manually smoke-tested this app end-to-end in a browser against real data — a purely-static-verification blind spot that's been repeatedly self-flagged but never closed.
3. Settings currently overpromises — several controls save and display convincingly but do nothing, which is a fast way to lose a first user's trust in the rest of the app's honesty.

### Recommended next implementation order

Slices 2, 3, and 4 above are small, safe, and can happen in any order or in parallel. Slice 1 (the smoke test) should happen before declaring any release candidate, regardless of what else ships. Slice 5 (the auth/accounts ADR) is the real gate on the landing page's actual business plan and should start now given how much lead time it needs, even though it's the largest.

### Copyable Agent 1 prompt for the highest-priority *implementable* fix

(Slice 1, the smoke test, isn't a code task; Slice 5, the ADR, is a planning task, not an Agent 1 implementation task. This is the highest-priority fix that fits an ordinary Agent 1 code slice.)

```markdown
# BigShotEspresso — Fix: Remove or Label Non-Functional Settings Fields

You are Agent 1: Implementation Agent. This is a small, scoped fix closing
Critical Blocker #4 from docs/implementation/launch-readiness-audit.md.

## What was found
Grepping every consumer of these Settings.tsx keys across artifacts/coffee-log/src
confirms none of them are read anywhere outside Settings.tsx itself:
ratingSystem, unitSystem, timeFormat, ratingInputMode, grindTimerMode,
hopperTracking, defaultHopperFullness, grindTimeIncrement, grindScaleMin,
grindScaleMax. (grindMinTime is the one nearby field that IS real — it's
read three times in ShotForm.tsx — do not touch it.)

## Exact task
For each of the ten dead fields above, choose one of two treatments and
apply it consistently:
(a) Remove it entirely from Settings.tsx's SECTIONS array (simplest, if
    there's no near-term plan to wire it up), or
(b) Keep it visible but add a small "Not yet used elsewhere in the app"
    caption, matching the pattern already used elsewhere in this codebase
    for known-future fields (e.g. how "Grinder Output Measurement" reads
    once slice covers it too — coordinate if both land in the same pass).

Prefer (a) removal unless you find evidence one of these ties to a
near-term planned feature (e.g. grindTimerMode may be intended for the
already-deferred single-dose workflow — if so, use (b) for that one
specifically and say why in your handoff).

## What NOT to touch
- Do not touch grindMinTime — it's real and consumed by ShotForm.tsx.
- Do not implement Unit System, Rating System, or Time Format conversion
  logic — that's a much larger feature (unit conversion throughout the
  app) and explicitly out of scope for this fix. This task only removes
  or labels the currently-misleading controls, it does not make them work.
- No schema/API/migration changes — these are all Settings key/value pairs
  in the existing generic settings store, not typed columns.
- Do not touch Quick Log, DCI/OSI/HMI/BLI/MSI/GSP, or auth/accounts.

## Verification
CI=true pnpm run typecheck; CI=true pnpm --filter @workspace/api-server test;
CI=true pnpm run build:render. Add or update a contract test asserting the
removed/labeled fields match what you actually did, following the existing
source-inspection test pattern in api-contract.test.ts.

## Documentation
Add a dated docs/completed-tasks.md entry. Update the "Critical blockers"
section of docs/implementation/launch-readiness-audit.md to mark item #4
resolved (or partially resolved, listing what's left) once done.

## Handoff
End with HANDOFF SUMMARY FOR CODEX. Do not commit. Do not push.
```
