# Browser Lifecycle Walkthrough — 2026-10-02

> **Status:** Completed (desktop only). Phase 2B, workstream W3. Documentation only; no code was changed to produce it.
> **Method:** Claude drove Chrome through the real built app (production mode, real CSP) on a **fresh in-memory database**
> (the test PGlite database), so it behaved like a brand-new tester. Production was never written to. Nothing here was verified
> on a phone.

## Flow results

| Step | Result |
| --- | --- |
| Empty Dashboard (first run) | Works; guidance wording needs a fix (R3) |
| Add Bean | Works ("Bean added"; card shows 0 bags, 0 shots). The Create Bean button stays grey until a name is entered, with no hint why |
| Start New Bag (existing bean, number, weight, first hopper phase) | Works; bag becomes active, "You're ready to log shots on the new bag" |
| Log Shot (new bag auto-selected, defaults pre-filled, status Good / Fault Good) | Works; shows "Shot is included in analysis" live |
| Shot Detail | Works; all values and the auto "New Bag Dial-In" classification are correct |
| Edit Shot (rating, sensory notes) | Works once a valid rating is entered; see B2 for an invalid-rating problem |
| Dashboard with data | Works: consumed/remaining weight, brief, performance window, shot vs reference |
| Start Hopper Phase | Dialog and help text good; **fails with a 500 in one common case (B1)** |
| Change Bag (close old bag, leftover beans, new bag, first phase) | Works end to end: old bag moves to Previous Bags with "Reconciled remaining", new bag active, rating preserved |
| Dashboard right after a bag change (0 shots) | Clean zero state |
| Shot Log, Reference Shots, Equipment, Data Health | Load with sensible empty or populated states |

## Bugs found

| # | Severity | Finding | Suggested fix |
| --- | --- | --- | --- |
| B1 | **FIXED 2026-10-02** · Medium, affected production | Starting a hopper phase whose name already exists (same bag, same phase, same day; e.g. choosing Phase 1 again, the default) returns **HTTP 500 "Internal server error"** and the toast says "Could not start phase". The server has a friendly 409 message ready, but `isUniqueViolation` in `routes/hopper.ts` checks `err.code === "23505"` while `drizzle-orm` 0.45.2 wraps database errors in `DrizzleQueryError` and puts the Postgres code on `err.cause`, so the check never matches. No test covers the duplicate-name path. Only this one place uses the check | Also check `err.cause?.code`; add a route test for the duplicate name returning 409 |
| B2 | **FIXED 2026-10-02** · Low to medium | In the Edit Shot rating box, typing 8.5 produced **78.5**. Cause: focusing an empty number box pre-fills its suggested value (7 for Rating) and typing then inserted next to it; the caret can sit at either end depending on the click. The "Update did nothing, no error" part was most likely the browser's own built-in "must be at most 10" tooltip, which the automation could not see, so it was not treated as a separate bug. The server never stored the bad value | Fixed in `NumberStepper` (`ShotForm.tsx`): the first edit after seeding keeps only what the user inserted, wherever the caret was; cleared on +/- and blur. Verified by typing 8, ".", 5 in Chrome: 8.50 |

## Beta-readiness findings

| # | Finding |
| --- | --- |
| R1 | **Owner defaults for new users.** Correction (2026-10-02): the grind setting 2.33 and grind time 8.1 s were **not** seeded in the database; they were hard-coded fallbacks in the Log Shot form (and Settings placeholders). **Fixed 2026-10-02:** both now start empty ("Your setting", "Seconds"); dose 18 g, yield 36 g and 94 °C stay as ordinary starting points. **Still open:** the database does seed Current System Phase 3 and the research phase labels (Initial Setup, Scientific Process, Timed Dose Optimization, Active Experimentation Era) via migration 0015; see R2 |
| R2 | Log Shot shows research jargon by default (Workflow Context, System Phase, Phase Name, Experiment, Hopper Phase, "Phase 3 tracks how consistently your Initial Grinder Output lands near 18 g"). Consider hiding or simplifying for testers |
| R3 | The empty Dashboard says "Go to Bags and mark one as active", but a new user has no beans yet; the order is Beans, then Bags |
| R4 | The Bags help text says "Tap Change Bag above", but the button reads "Start New Bag" until a first bag exists |
| R5 | "Bag dialled in — avg 8.50 across 1 rated shot" is stated after a single shot (labelled Low confidence). **Spelling fixed 2026-10-02** ("dialed in", Carl's preference); the single-shot logic is unchanged and still open |
| R6 | Data Health ("for owner diagnostics") and its Airtable credential names appear in the navigation for everyone; hide it from non-owners |
| R7 | Settings still says decaf and pour-over grinder defaults are "deferred (not a launch need)", while Carl's 2026-10-01 decision is to keep them as base default fields; update the wording |

## Not covered

Phone layout and the swipeable bottom navigation; the Close button on its own (Change Bag covers closing); ending or editing a
hopper phase; Reference Shot flagging; the taste-selector, accessory and CSV flows; Settings changes. Screenshots failed during the
first attempt (an extension conflict) and worked after opening a fresh tab.

## Fix record (2026-10-02, Carl approved "fix b1 and b2")

- **B1:** `isUniqueViolation` in `routes/hopper.ts` now walks the `cause` chain. New test "B1: starting a hopper phase with a name that
  already exists returns a clear 409, not a 500" (failed with 500 before the fix, passes after). Confirmed in the browser: the toast now says
  "A hopper phase with this name already exists for today..." instead of "Internal server error". Wording nit left unchanged: "try again in a
  moment" does not help in the same-day case.
- **B2:** `NumberStepper` fix above, with a source-level test in `phase-2a-ui.test.ts` (the project has no browser component tests).
  The first attempt (select the seeded text on a timer) lost a race with fast typing and a second attempt assumed the caret was at the end;
  the final version handles any caret position and was checked in Chrome.
- Checks: typecheck clean; API tests 147/147 (145 plus the two new ones); `build:render` passes.

## Second fix record (2026-10-02, "fix this")

- **Grinder defaults:** `ShotForm.tsx` and `Settings.tsx` no longer hard-code 2.33 / 8.1; the empty case has placeholders and was checked in Chrome on a fresh database.
- **Wording:** "Bag dialled in" is now "Bag dialed in" (the only "dialled" in the app). Server messages rewritten as sentences ("name is required"
  to "A name is required.", "Invalid id" to "That ID isn't valid.", "bagId must be an integer." to "Bag ID must be a whole number.", and so on); the
  hopper duplicate message now reads "Pick a different phase, or edit the existing one." The 15 generic "Error" toast titles now read "Something went
  wrong", and "Could not start phase" is "Couldn't start the phase". All messages were already spelled correctly; the fixes are grammar and clarity.
- **Tests:** three pins in `api-contract.test.ts` updated to the new toast title; two new tests in `phase-2a-ui.test.ts`. API tests 149/149, typecheck clean, build passes.
- **Not done:** R2 (jargon on Log Shot), R3, R4, R6 (Data Health), R7, the System Phase seed, and the single-shot "dialed in" logic. R2 and R6 await Carl's decisions.

## Next

Decide R1 (System Phase seed), R2 to R7 (needs Carl; each is a separate slice), then update `pre-outside-users-checklist.md` W2.

## Linked-control audit (2026-10-02, after Carl's For Others / Not Rated request)

**Change made:** unticking Not Rated now also unticks For Others (For Others always means Not Rated); unticking For Others leaves Not Rated alone;
Did Not Finish is independent of both. Help text updated. Checked in Chrome through every combination. An older test that pinned "you can still rate a
For Others shot" was updated, with a note that it was superseded by this decision.

**Checked and behaving correctly:** Reference / Signature / Sour (Signature implies Reference one way only, Sour excludes both, unticking Reference clears
Signature; the server enforces the same); the purge-waste checkbox (unticking drops the amount on save); the Change Bag switches (each gates its steps);
one active bag at a time (enforced on create and update); one active hopper phase per bag; one default per equipment or accessory type; rating weights
that do not add to 100 (the server scales them proportionally).

**Could behave unexpectedly (not changed, need Carl's decision):**

| # | Finding | Today's data |
| --- | --- | --- |
| L1 | **FIXED 2026-10-02 (Carl: "enforce For Others").** The server now stores any shot written with For Others ticked as Not Rated with its ratings cleared, on both create and update (`normalizeShotInput`); unticking For Others leaves Not Rated alone, other shots are untouched. The CSV/Airtable import paths are separate and unchanged. Before: only the form enforced it, and API writes could save For Others as rated | 12 shots are For Others, 10 of them are not marked Not Rated (likely tasted, from the Airtable era). Left untouched |
| L2 | **FIXED 2026-10-02.** Typing a rating while Not Rated is ticked used to be discarded on save. The rating boxes are now switched off while Not Rated is ticked, with a note ("Ratings are off while Not Rated is ticked…"); a disabled box no longer pre-fills a suggested value (a first version did, caught in the browser check) | 0 Not Rated shots hold a rating |
| L3 | **CORRECTION: this was wrong as first written.** The Reference counts on bag and bean cards already count only eligible shots (their queries filter to shots that count for analysis), so they always agreed with the Reference Shots list. A test now pins that. What remains true: later changing Shot Status or Fault Status does not clear a Reference/Signature/Sour flag, so an excluded shot keeps its flag but is simply not counted anywhere | 68 Reference shots, all eligible: no conflict today |
| L4 | Quick Log (parked) and the Settings toggle group (carry forward, remember last bag, and so on) were not audited for dependencies | not checked |

**Decisions (Carl, 2026-10-02):** the jargon on Log Shot (R2) stays in the screens; it will be explained by the AI onboarding files (the project named BSE), not by simplifying the form. Data Health (R6): the link is removed from the navigation for now (the page and its URL still work). A user-facing "My data" check is still only an idea. L1 (server enforcement of For Others implies Not Rated) was then approved ("enforce For Others, don't worry about the ten"): the 10 existing rated For Others shots are left as they are, and the rule applies only when such a shot is written again (for example edited in the form), which would then make it Not Rated and clear its ratings.
