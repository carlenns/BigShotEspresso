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

**Design step taken 2026-08-25:** [ADR-0009: User Accounts, Authentication, and Data Ownership](../ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md) drafts the recommended shape of the fix — row-level `user_id` ownership on every user-owned table, a shared query-scoping helper rather than per-route manual filtering, and an explicit lighter-weight path for Tier 2 (outside testers) that doesn't require the full Tier 3 (paid launch) authentication/billing surface. This is a design draft only, proposed and pending approval — it does not reduce the size of this blocker, it makes the remaining work estimable.

### 2. No live/manual smoke test has ever been performed, anywhere, in this project's history — **PARTIALLY RESOLVED 2026-08-25**

This was a pattern repeated in essentially every implementation session's own handoff across this project's history: "no live browser smoke test performed... no running Postgres-backed instance available," over and over. That pattern broke for the first time in "Two Bugs From Live Lifecycle Review" (`docs/completed-tasks.md`, 2026-08-25): a session actually ran against the real dev DB — created/patched/deleted a throwaway Hopper via the live API and confirmed null-clearing and delete behavior for real, and reproduced the Change-Bag partial-failure data sequence directly against live `GET /api/bags`. It found and fixed two real bugs this way (see "Resolved since this audit was first written," below) that static verification alone had not caught.

The fully interactive browser click-through (open the app, click through Change Bag with a bad Custom-phase entry, watch the list update live) was attempted but blocked by a Chrome-extension tooling fault in that environment, not an app bug — worked around with an equivalent data-layer reproduction, documented as such rather than silently skipped.

**Update 2026-08-26:** the Chrome-extension tooling fault above is no longer blocking — two further sessions successfully used live Chrome browser automation. One opened Change Bag with a real active bag and screenshot-confirmed the exact rendered UI (Bag Number suggestion, Roast Date labeling). The other did a full interactive round trip through `/shots/new`: selected two Expression Style chips live in the browser, saved a real shot, confirmed the persisted multi-value array via the API, confirmed the edit view reloaded both chips pre-selected, then deleted the test shot — the most complete single-workflow live verification this project has had.

**Still open:** no one has yet clicked through the *complete* lifecycle in one continuous real-browser pass — create bean → bag → dial-in → log shot → edit shot → Shot Detail → close bag → Change Bag → Start Hopper Phase → Dashboard. What exists now is real interactive verification of several individual pieces (hopper API, Change Bag partial-failure, Change Bag UI rendering, Expression Style end-to-end), not one continuous session covering all of them in order. `docs/START_HERE.md`'s *"Manual UI shot-entry smoke test passes"* gate remains open.

### 3. Render deployment has never been smoke-tested

`docs/START_HERE.md`'s current gate also lists *"Render deployment smoke test passes"* as still blocking. Nothing in this audit changes that status; it is repeated here because it is a precondition for literally any outside user, owner or otherwise.

### 4. Settings contains multiple controls that visibly do nothing — **RESOLVED 2026-08-25**

Verified directly by grepping every consumer of these Settings keys across `artifacts/coffee-log/src`: **`ratingSystem`, `unitSystem`, `timeFormat`, `ratingInputMode`, `grindTimerMode`, `hopperTracking`, `defaultHopperFullness`, `grindTimeIncrement`, `grindScaleMin`, `grindScaleMax`** are all present in `Settings.tsx`'s `SECTIONS` array, savable, and displayed — but are never read by `ShotForm.tsx`, `ShotDetail.tsx`, `Bags.tsx`, or any other page. (The one nearby field that *is* real: `grindMinTime` is read three times in `ShotForm.tsx`.) A first user who sets "Unit System: Imperial" or "Rating System: 0–100" will see zero change anywhere — dose still shows grams, rating still caps at 10. This is exactly the kind of first-impression trust break the project's own trust-and-safety principles ("the app does not silently invent thresholds or conclusions," "unknowns remain unknown") argue against, applied to Settings itself: it currently implies more control than it delivers.

**Resolution:** 13 fields removed (the 10 above plus `temperatureUnit`, `defaultBrewRatio`, and a global `usePuckScreen` key found via the same verification method during implementation). `grindTimerMode` was kept, per this audit's own suggested treatment, with a visible "not yet used elsewhere in the app" caption rather than removal, since it plausibly ties to the already-deferred single-dose workflow. See `docs/completed-tasks.md`, "Launch Readiness Audit Slice 2: Removed Non-Functional Settings Fields — 2026-08-25," for full detail. Typecheck clean, 55/55 tests, build clean. No live-browser confirmation performed yet — same standing gap as Critical Blocker #2.

## Resolved since this audit was first written (reconciled 2026-08-25, later same day)

- **Critical Blocker #4 (dead Settings fields):** resolved — see above.
- **Critical Blocker #2 (no live smoke test):** partially resolved — see above.
- **Hopper API could not be edited or deleted** (previously listed as a known risk under Phase D of `bag-hopper-lifecycle-plan.md`): resolved. `DELETE /hoppers/:id` added; `PATCH /hoppers/:id` fixed to actually clear `bagId`/`startingBeans`/`phase`/`notes` to `null` instead of silently ignoring the request (same undefined-vs-null bug class fixed earlier for `bags.remainingEstimate`). Live-verified against the real dev DB, not just typechecked.
- **ChangeBagDialog silently looked broken on partial failure:** found and fixed in the same session. Its `onError` handler now refreshes the same queries `onSuccess` does, so a new bag created before a later step failed actually appears in the list instead of requiring a manual reload.
- **Hopper→Bag documentation disagreement** (previously an open item in `bag-hopper-lifecycle-plan.md`'s workflow-5 section): resolved by direct schema verification. `hoppers.bag_id` is confirmed real, live, and authoritative; the two docs were describing different things (Airtable import-time inference vs. the live Postgres schema), not actually disagreeing. One minor, low-priority data-hygiene item surfaced during that check: a small number of historically-imported Hopper rows have `bag_id = null` and `is_active = true`; invisible to all current UI and harmless, not created by any live write path.
- **Zero technical ratings displayed as blank in Shot Detail** (`shot.rating || "-"` treated `0` as falsy): fixed, unrelated to this audit's original findings but good general correctness work from the same session.

## In progress, not yet complete (found uncommitted in the working tree during this reconciliation)

**Server-side `Include in Analysis` enforcement.** `artifacts/api-server/src/lib/shot-eligibility.ts` and `artifacts/api-server/src/routes/shots.ts` currently have uncommitted changes adding a `computeIncludeInAnalysis(status, faultStatus)` function and wiring it into both `POST /shots` and `PATCH /shots/:id` so the server always recomputes eligibility from Status/Fault Status rather than trusting a client-supplied `includeInAnalysis` value. This directly matters to this task's own watch-list item ("Include in Analysis must remain Status Good/Dialed In + Fault Status Good") — previously a client could in principle send `includeInAnalysis: true` regardless of the actual Status/Fault values, and the server would store it as-is. No tests or doc entry exist for this yet, and it wasn't reviewed or touched as part of this reconciliation (out of scope — do not implement, per this task's own boundary). Flagged here so it isn't lost, and recommended as the first of the next three slices below.

## Launch tiers — three different bars, not one

This task specifically asked these to be kept separate, since conflating them is the single easiest way to misjudge readiness.

### Tier 1 — Owner-only alpha (current de facto state)

What's left before the owner can call this a stable release candidate, per `release-candidate-checklist.md`'s own gates:

- Render deployment smoke test (Critical Blocker #3) — not started.
- Full browser UI lifecycle walkthrough (remainder of Critical Blocker #2) — not started; the hopper-API and partial-failure pieces are done.
- Finish the in-progress server-side `Include in Analysis` enforcement (above) — close, not committed.
- Everything else in this tier is essentially done: Settings no longer misleads, the core bag/bean/shot/hopper CRUD paths are live-verified at the API layer, migrations have rollback evidence.

### Tier 2 — Outside testers (a handful of trusted people, still not paying, still not self-serve)

Everything in Tier 1, plus a gap Tier 1 doesn't surface because there's only ever been one user: **there is zero data isolation between users.** Every table in this schema assumes a single global user — two testers using the same deployed instance would see and edit each other's beans, bags, shots, and Settings with no separation at all. This does not require full OAuth/billing to fix for a *small, trusted* tester group — even simple per-tester database scoping or separate deployed instances would do — but it does require *something*, and today there is nothing. This is a smaller, cheaper version of Critical Blocker #1, worth solving on its own before Tier 3.

Also worth doing before outside testers see the app, even though none of these are hard blockers: Quick Log hard-block (High-Priority Fix #6), Bags page action-path clarity (#5), Dashboard hopper blank-stat labeling (#7) — an owner has context a stranger doesn't, and these are exactly the kind of thing that reads as "broken" to someone with no history with the product.

### Tier 3 — Paid public launch (the landing page's actual plan: $10/mo, $80/yr Founder tier, first 500)

Everything in Tiers 1–2, plus:

- Real accounts, authentication, and per-user data ownership (Critical Blocker #1) — confirmed, still by far the largest gap. Nothing in the recent commits touched this at all; it remains completely unstarted.
- Billing/subscription enforcement for the tiered pricing the landing page already commits to.
- `docs/implementation/release-security-hardening-checklist.md`'s gates, specifically the ones scoped to public (not owner-only) access — not reviewed in this pass, flagged as needing its own check before Tier 3, not assumed complete.
- Terms of service / privacy policy — implied by taking payment and storing personal taste/equipment data, not yet mentioned as existing anywhere in this project's docs.

**Confirmed, per this task's item 6:** auth/accounts/data ownership remains the largest single blocker for paid public launch. Nothing in this reconciliation changes that — it's the one item in this whole audit that hasn't moved at all.

## Top 5 remaining launch blockers (ranked, updated 2026-08-26)

1. Auth/accounts/per-user data ownership (Critical Blocker #1) — blocks Tier 3 entirely, and a lighter version of it blocks Tier 2. ADR-0009 and `docs/implementation/auth-data-ownership-implementation-plan.md` now exist (full design), but zero implementation has started, correctly, per boundary.
2. Full *continuous* browser UI lifecycle smoke test + Render deployment smoke test — several individual pieces now have real interactive-browser verification (see Critical Blocker #2's 2026-08-26 update), but no one has yet clicked through the whole lifecycle in one pass, and Render itself has never been touched.
3. Grinder Setting precision still hardcoded (High-Priority Fix #8) — the one remaining unresolved High-Priority Fix; everything else in that section (#5, #6, #7) resolved as of this reconciliation pass.
4. 15 commits sitting unpushed to `origin/main` as of this reconciliation — not a code defect, but a real release-readiness risk: this much verified work exists only locally. Recommend a deliberate push-and-tag decision soon, independent of any further feature work.
5. Billing enforcement + security-hardening-checklist review for public access — the two concrete Tier-3 items beyond auth itself that haven't been assessed yet.

## High-priority fixes

### 5. Bags page has two overlapping, unexplained paths to the same outcome — **RESOLVED 2026-08-25**

Verified in the current `Bags.tsx`: an active bag row shows a "Start Phase" button and a "Close" button individually, while the page header also has a "Change Bag" button that does *both* (create the new bag, optionally close the old one, optionally start its hopper phase) in one guided dialog. Nothing in the UI explains when to use which. A first user closing a bag one way and then finding a second, larger button that seems to do the same thing is a real point of confusion, not a hypothetical one.

**Resolution:** commit `be8afe7` added explanatory copy to the Bag Lifecycle Flow card ("The 'Change Bag' button above runs this whole flow in one guided dialog; each active bag's own Close and Start Phase buttons below do just one step at a time") and a matching note in the multi-active-bag warning. This status marker was itself stale until this reconciliation pass caught it — the fix landed same-day but the audit wasn't updated at the time.

### 6. Quick Log is unlinked but not actually blocked — **RESOLVED 2026-08-25**

`App.tsx` still registers `<Route path="/shots/quick" component={QuickLog} />`. Nothing in navigation links to it (confirmed — no `QuickLog`/`/shots/quick` reference anywhere in `Shell.tsx`), but the route itself is fully live. A stray bookmark, an old shared link, or a guessed URL lands a user in a form the project has explicitly, repeatedly declared shelved and not maintained for launch (`docs/implementation/release-candidate-checklist.md` Gate 0.5). Unlinking is not the same as blocking.

**Resolution:** commit `86f7086 fix(routing): hard-block /shots/quick, redirect to /shots/new`. Same stale-marker note as #5 applies.

### 7. Dashboard's Active Hopper Status panel will show as partially blank for the exact workflow it was built to support — **RESOLVED 2026-08-25**

`hopperMass`/`hopperPercent` are imported/computed-elsewhere values (per this project's own repeated, standing rule: "do not calculate hopper percentage locally until the formula is approved"), never written by the live app's `POST /api/hoppers` path. A user who starts a hopper phase through the new, polished "Start Hopper Phase" or "Change Bag" dialogs will see "Starting beans" populated correctly next to a blank "Hopper mass"/"Hopper %" — which reads as broken, not as "not yet tracked." A one-line "not tracked yet for phases started in-app" label would resolve the confusion without inventing any formula.

**Resolution:** commit `beb0282 fix(dashboard): explain untracked hopper phase stats` (later compacted further in `a85b972`). Same stale-marker note as #5 applies.

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

## Suggested next 5 implementation slices (original list, 2026-08-25 — status updated at reconciliation, later same day)

Ordered by leverage — each closes a disproportionately large risk relative to its size.

1. **Actually run the deferred smoke test.** — **Partially done.** Deploy to Render (or a disposable equivalent) and manually click through the full lifecycle once: create bean → bag → dial-in → log shot → edit shot (clear a field) → view Shot Detail → close bag → Change Bag → Start Hopper Phase → Dashboard. A live-data pass has since happened for the Hopper API and the Change-Bag partial-failure path (see "Resolved since this audit was first written," above); the full interactive browser click-through and the Render deployment smoke test have not.
2. **Settings cleanup pass.** — **Done.** Removed 13 confirmed-dead fields, labeled one (`grindTimerMode`) rather than removing it. See `docs/completed-tasks.md`, "Launch Readiness Audit Slice 2."
3. **Bags page action-path clarity.** — Still open. Either add a one-line explanation of when to use "Change Bag" vs. the per-row Close/Start Phase buttons, or fold the per-row buttons into the guided flow once it's proven out. Closes High-Priority Fix #5.
4. **Hard-block `/shots/quick`.** — Still open. Redirect it to `/shots/new` or show a short "this mode has been retired" notice, instead of leaving the full old form silently reachable. Closes High-Priority Fix #6.
5. **Auth/accounts scoping ADR.** — Still open, still unstarted. Before any implementation, produce (or formally update ADR-0008 into) a real plan for what "public early-access launch" requires: account creation, session handling, per-user data ownership on every table currently assumed single-user, and how the Founder-tier billing described in the landing page doc actually gets enforced. This is the real precondition for the business plan in `BSE_PRODUCT_LANDING_PAGE_CONTENT.md` and deserves its own dedicated planning pass — documentation before implementation, per the Constitution — not a quick code slice bolted onto something else.

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

### Superseded — the prompt originally here (Settings cleanup) shipped

See "Resolved since this audit was first written," above, and the reconciliation handoff below for the current next-3-slices recommendation and copyable prompts.

## Reconciliation Handoff — 2026-08-25 (later same day)

This addendum records the second pass over this document, after `c0c66cf` and `d01c447` landed. The original "Handoff" section above is left as the historical record of this document's first authoring pass, per this project's "never silently discard historical evidence" rule — it is not overwritten.

### Files inspected (this pass)

`git log`/`git status`/`git show --stat` for the three expected commits (`55c4a04`, `c0c66cf`, `d01c447`); full diffs of `hopper.ts`, `Bags.tsx`, `bag-hopper-lifecycle-plan.md`, `ShotDetail.tsx`, and the relevant `docs/completed-tasks.md` entries within those commits; the currently-uncommitted `shot-eligibility.ts`/`routes/shots.ts` diff (in-progress, not touched). Did not re-read the full text of `docs/ROADMAP.md`, `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md`, or `docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md` this pass — already read in full during this document's original authoring earlier the same day, content unchanged since.

### Files changed (this pass)

- `docs/implementation/launch-readiness-audit.md` (this reconciliation)

No application code, schema, API, or migration files touched. No build run — documentation-only.

### Launch state summary

Tier 1 (owner-only alpha) is close: Settings no longer misleads, the hopper API is now live-verified and can be edited/deleted, a real partial-failure bug got caught and fixed by an actual live-data test — the first one in this project's history. What's left for Tier 1 is finishing the in-progress `Include in Analysis` server enforcement, and the still-outstanding full browser click-through plus Render deployment smoke test. Tier 2 (outside testers) additionally needs at least minimal per-tester data isolation, which doesn't exist in any form yet. Tier 3 (paid public launch) is unchanged and unstarted on its one defining blocker: real auth/accounts/data ownership.

### Resolved items

See "Resolved since this audit was first written" above — five items, spanning Settings cleanup, partial live-smoke-test coverage, Hopper API edit/delete, ChangeBagDialog cache refresh, the Hopper→Bag doc-consistency question, and a small zero-rating display bug.

### Unresolved blockers

See "Top 5 remaining launch blockers" above.

### Recommended next implementation order

Three slices, ordered by leverage:

1. **Finish server-side `Include in Analysis` enforcement** (Agent 1) — already coded, uncommitted, close to done; finishing it closes a real data-integrity gap rather than leaving it half-shipped.
2. **Bags page action-path clarity** (Agent 1) — still open from the original audit, small, and this same session's live testing just demonstrated the Bags/hopper flows are exactly where bugs are currently being found.
3. **Quick Log hard-block + Dashboard hopper blank-stat labeling** (Agent 2) — two small, independent, first-impression-relevant fixes, naturally bundled since both are quick UI-copy/routing changes rather than logic changes.

### Copyable Agent 1 prompt

```markdown
# BigShotEspresso — Finish Include-in-Analysis Enforcement + Bags Action-Path Clarity

You are Agent 1: Implementation Agent.

## Part 1: Finish the in-progress Include-in-Analysis enforcement

Uncommitted changes already exist in artifacts/api-server/src/lib/shot-eligibility.ts
(a new computeIncludeInAnalysis(status, faultStatus) function) and
artifacts/api-server/src/routes/shots.ts (wiring it into POST /shots and
PATCH /shots/:id so includeInAnalysis is always server-recomputed, never
trusted from the client). Read this code first — do not rewrite it, finish it:

1. Confirm the logic is correct: included only when status is "Good" or
   "Dialed In" AND faultStatus is exactly ["Good"] (single value). This
   matches the project's standing rule (Include in Analysis = Status
   Good/Dialed In + Fault Status Good) — verify against
   docs/csv-data-dictionary.md and docs/intelligence-engine-map.md's shared
   rules before assuming it's right.
2. Add regression tests to api-contract.test.ts, following the existing
   source-inspection pattern (see "Shot route enforces rating, ratio, and
   signature/reference invariants" for the style) — assert the function
   exists, is called in both POST and PATCH, and that PATCH correctly
   merges with existing status/faultStatus when only one of them is part
   of a given update (the existing code already handles this — write a
   test that pins it, don't just trust the comment).
3. Live-verify against the real dev DB if one is available in your
   environment: create a shot with Status "Good"/Fault "Good", confirm
   includeInAnalysis is true; then try to override it to false in the
   same POST body and confirm the server ignores that and stores true
   anyway (proving the server doesn't trust the client value). If no live
   DB is available, say so explicitly rather than silently skipping this
   step, matching how prior sessions in this project have handled the
   same limitation.
4. Add a dated docs/completed-tasks.md entry.

## Part 2: Bags page action-path clarity

Closes High-Priority Fix #5 from docs/implementation/launch-readiness-audit.md.
An active bag row in Bags.tsx shows "Start Phase" and "Close" buttons
individually, while the page header's "Change Bag" button does both (plus
bean creation) in one guided dialog. Nothing explains when to use which.

Add a short, one-line explanatory note near the per-row buttons or in the
page's existing "Bag Lifecycle Flow" card (already present in Bags.tsx)
clarifying that "Change Bag" is the all-in-one guided path, and the
per-row buttons are for doing just one step on their own. Do not remove
either path — both are legitimate for different situations (e.g. closing
a bag without starting a new one yet).

## What NOT to touch
- No schema/API/OpenAPI changes beyond what's already uncommitted in Part 1.
- Do not touch ShotForm.tsx, Settings.tsx, Quick Log, or DCI/OSI/HMI/BLI/MSI/GSP.
- Do not implement auth/accounts.
- Do not remove the per-row Close/Start Phase buttons — clarify, don't consolidate.

## Verification
CI=true pnpm run typecheck; CI=true pnpm --filter @workspace/api-server test;
CI=true pnpm run build:render.

## Documentation
Update docs/implementation/launch-readiness-audit.md: mark the in-progress
eligibility item and High-Priority Fix #5 resolved once done.

## Handoff
End with HANDOFF SUMMARY FOR CODEX. Do not commit. Do not push.
```

### Copyable Agent 2 prompt

```markdown
# BigShotEspresso — Quick Log Hard-Block + Dashboard Hopper Blank-Stat Labeling

You are Agent 2: Implementation Agent. Two small, independent fixes from
docs/implementation/launch-readiness-audit.md.

## Part 1: Hard-block /shots/quick (closes High-Priority Fix #6)

App.tsx still registers <Route path="/shots/quick" component={QuickLog} />
live, even though nothing links to it anymore. Redirect it to /shots/new
(simplest), or render a short "This mode has been retired — use Log Shot
instead" notice with a link to /shots/new. Do not delete QuickLog.tsx or
its route registration — per docs/implementation/release-candidate-checklist.md
Gate 0.5, it should remain parked in the repo, just not reachable as a
working form.

## Part 2: Dashboard hopper blank-stat labeling (closes High-Priority Fix #7)

Dashboard.tsx's Active Hopper Status panel shows "Starting beans" populated
correctly for a phase started in-app, but "Hopper mass"/"Hopper %" render
blank next to it, since those are imported/computed-elsewhere values never
written by POST /api/hoppers. Add a one-line note (e.g. "Not tracked yet
for phases started in the app") shown specifically when startingBeans is
present but hopperMass/hopperPercent are null, so it reads as "not tracked
yet" rather than "broken." Do not invent or locally compute a hopper
mass/percentage formula — this is a display-only labeling fix.

## What NOT to touch
- No schema/API/OpenAPI changes.
- Do not implement a hopper-percentage or mass-remaining formula of any kind.
- Do not touch Bags.tsx, Settings.tsx, or the shot-eligibility work in progress.
- Do not touch Quick Log's internal form code — only its route reachability.

## Verification
CI=true pnpm run typecheck; CI=true pnpm --filter @workspace/api-server test;
CI=true pnpm run build:render. Add contract tests for both fixes following
the existing source-inspection pattern in api-contract.test.ts.

## Documentation
Update docs/implementation/launch-readiness-audit.md: mark High-Priority
Fixes #6 and #7 resolved once done. Add a dated docs/completed-tasks.md entry.

## Handoff
End with HANDOFF SUMMARY FOR CODEX. Do not commit. Do not push.
```
