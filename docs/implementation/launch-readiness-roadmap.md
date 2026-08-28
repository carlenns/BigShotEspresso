# Launch Readiness Roadmap

Status: **Sequencing layer. Planning only — authorizes nothing.**
Created: 2026-08-27
Base commit: `4b1c6b6`

## Purpose and scope

Open items and "flagged for Carl" decisions are currently spread across
`launch-readiness-audit.md` (Parts 1 + 2 + the pre-fill review), the two decision docs
(`equipment-default-source-of-truth-decision.md` / `-consolidation-plan.md`,
`taste-selector-vocabulary-model.md`), the "Deferred / Unresolved" tails of
`completed-tasks.md` entries, and ADR-0009. Carl is deciding them one at a time with no
single board.

This doc is **one dependency-ordered view** of that work. It is a *sequencing layer* over
the two existing docs, not a replacement:

- **`release-candidate-checklist.md`** answers *"are we ready to release?"* — it is
  organised by verification Gates (0.5–12) with acceptance criteria and rehearsal steps.
- **`launch-readiness-audit.md`** is the *findings* record — what was inspected, what is
  broken, what was fixed.
- **This roadmap** answers *"in what order do we do the remaining work, and what does each
  item need before it can start?"*

Not merged into the checklist: the checklist's structure (gate → criteria → evidence) does
not carry dependency edges or a "needs Carl's approval / needs a product decision"
dimension, which is the whole point here. Each roadmap item cross-references its checklist
Gate and/or audit section so the three stay in sync.

## Category legend

| | Meaning |
|---|---|
| **A** | Safe to implement now — no schema, no behaviour/error-contract change needing sign-off, no product decision. |
| **B** | Needs Carl's approval — a schema/migration, or a deliberate behaviour or error-contract change. |
| **C** | Needs a product decision first — the answer changes what gets built. |
| **D** | Blocked on ADR-0009 (accounts / auth / per-user data ownership). |

Size: **S** ≈ hours / one small PR · **M** ≈ a day / a few PRs · **L** ≈ multi-day program.

---

## The board

### Already closed (reference only)

| Item | Source | Landed |
|---|---|---|
| Sour ⇒ not Reference/Signature, server-side | audit Part 1 / Part 2 §? | `3230e02` |
| Hopper-phase allow-list, server-side (interactive paths) | audit Part 1 | `3230e02` |
| Log Shot number defaults are WYSIWYG (shown default = saved default) | pre-fill review "Decision (2026-08-27)" | `bd7265a` |
| Dead Settings fields removed | audit Critical Blocker #4 | earlier |
| Quick Log hard-block; Bags action-path copy; Dashboard hopper blank-stat labels | audit HPF #5/#6/#7 | earlier |
| Catalog deletes are confirm-gated in the UI | audit "Owner-Alpha Smoke Review" | `a0fc7ba` |

### Open — data integrity / standing rules

| # | Item | Source | Blocking? | Cat | Size | Depends on |
|---|---|---|---|---|---|---|
| DI-1 | Blocked deletes (bean/bag/grinder/machine in use) return opaque **HTTP 500**, not a graceful **409** with a reason/count | audit Part 2 §3 | Tier-2 correctness; owner-alpha polish | **B** (error-contract) | S | — (Agent 1 in progress this cycle) |
| DI-2 | Rating bounds are route-only (`validateRatings`), not in the zod contract, and there is **no lower bound** (negative ratings accepted server-side) | audit Part 2 §1 | Tier-2 correctness | **A** | S | — (Agent 1 in progress this cycle) |
| DI-3 | Accessories have **no FK anywhere** — deleting a "used" accessory succeeds and leaves a dangling Settings string | audit Part 2 §3 | Polish now; real once Option A lands | **B** | S | EQ-4 (Option A Phase 4) makes this load-bearing |
| DI-4 | Imported corpus is **not rule-consistent** with app-created shots — CSV/Airtable import deliberately skips include-in-analysis recompute, signature⇒reference, sour exclusivity, rating bounds | audit Part 2 §4 | Only if whole-corpus analytics consistency is required | **C** → then A/M | M | all enforcement rules final (DI-2 landing) |
| DI-5 | `shot_taste_selectors.taste_selector_id` is `ON DELETE CASCADE` — deleting a selector silently strips the tag from every historical shot | audit Part 2 §3 | "preserve historical data" violation | **B** | — | folded into TS-1 (taste-selector archive slice) |
| DI-6 | Dashboard `activeBag.usePuckScreen` reads a Settings key removed in Blocker #4 → always false, the Puck Screen line never renders | audit Part 2 "Bonus finding" | Cosmetic | **A** | S | fold into EQ-2 (Option A Phase 1) |

### Open — equipment defaults (Option A, from `equipment-default-consolidation-plan.md`)

Whole track gated on **Carl approving the decision doc** (a **C** gate).

| # | Phase | Cat | Size | Depends on |
|---|---|---|---|---|
| EQ-0 | Backfill equipment `isDefault` from the existing Settings `default*` label strings (best-effort match, unmatched reported) | **A** (data script, additive, reversible) | S | Option A approved |
| EQ-1 | `routes/dashboard.ts` L507-508 reads `isDefault` for machine + grinder; Settings drops the machine/grinder/decaf/pour-over/scale/tamper rows; fold in DI-6 | **B** (behaviour change) | M | EQ-0 |
| EQ-2 | Decaf / pour-over grinder default model — launch need or drop? | **C** | S (decision) / L (if "yes" → per-role feature) | Option A approved |
| EQ-3 | Fix `routes/accessories.ts` POST `isDefault` to clear per-`type` (PATCH already does) | **A** (self-contained bug fix) | S | — |
| EQ-4 | `routes/dashboard.ts` L509/L511 read accessory `isDefault` for basket/puck-screen; Settings drops those rows; resolves DI-3 | **B** | M | EQ-3, backfill |
| EQ-5 | Delete the orphaned `default*` Settings rows | **A** (optional cleanup) | S | EQ-4 |

### Open — taste-selector vocabulary (from `taste-selector-vocabulary-model.md`)

Gated on **Carl approving the decision doc + choosing the archive column** (a **C** gate).

| # | Item | Cat | Size | Depends on |
|---|---|---|---|---|
| TS-1 | Archive slice: additive migration (`archived_at timestamptz` + `origin text`), archive/restore API, gated hard-delete, Taste Selectors page archive/restore UI, tag-picker excludes archived. Resolves DI-5. Account-independent (decision D1 + D4 only). | **B** (schema/migration) | M | decision approved |
| TS-2 | Canon versioning — stable `canonical_key` (current `id` is a local `serial`) + `canon_version` | **C** → then B | M | global-upload design |
| TS-3 | Account-scoped custom selectors (decision D3), personal→canon promotion | **D** | L | ADR-0009 |

### Open — deferred equipment capability items

| # | Item | Source | Blocking? | Cat | Size | Depends on |
|---|---|---|---|---|---|---|
| GRD-1 | Equipment-aware grind-setting precision/step in Log Shot — the stepper is fixed `step={0.01}` regardless of the selected grinder's `grindSettingPrecision` / `grindStepIncrement` | audit HPF #8 (ranked blocker #3); `completed-tasks.md` "Equipment defaults / Log Shot equipment consistency — V0" | Owner-alpha annoyance | **B** (behaviour change; needs display-rounding + grinder-resolution rules) | M | — |
| GRD-2 | Per-grinder timed-dosing fields (new schema) | `completed-tasks.md` deferred list | No | **C** → B | L | single-dose workflow design |

### Open — verification / deployment (checklist Gates 8, 11, 12)

| # | Item | Source | Blocking? | Cat | Size |
|---|---|---|---|---|---|
| SMK-1 | One continuous real-browser lifecycle pass: bean → bag → dial-in → log shot → edit shot → Shot Detail → close bag → Change Bag → Start Hopper Phase → Dashboard. Individual pieces verified; the whole chain never has been. | audit Critical Blocker #2; Gate 8 | **YES** — gates the release decision | **A** (verification task, no code) | M |
| SMK-2 | Render deployment smoke test — never touched | audit Critical Blocker #3; Gate 11 | **YES** — gates the release decision | **A/B** (deploy task; needs Render env) | M |

### Open — accounts / auth (ADR-0009, `auth-data-ownership-implementation-plan.md`)

| # | Item | Cat | Size | Notes |
|---|---|---|---|---|
| AUTH-0 | Confirm the auth mechanism (plan recommends email + magic-link over passwords) | **C** | S | not itself an implementation authorization |
| AUTH-1..9 | `users` table + session model → per-table `user_id` migrations → `settings` compound-unique migration → route-scoping helper → per-route scoping → login UI → owner bootstrap → Tier-2 invite → Tier-3 signup/billing | **D** | L | ADR-0009 is still **Proposed**. Tier 2 (outside testers) needs at least minimal isolation; Tier 3 (public) needs the whole program + billing + ToS/privacy. |

### Open — Serving Context / Drink Type (from the 2026-08-28 Serving Context work)

Phase 1 (collapse the Log Shot Drink Type picker for the daily flow, copy only, no
analysis change) landed on branch `serving-context-ux`. The rest is deferred:

| # | Item | Cat | Size | Notes |
|---|---|---|---|---|
| SC-1 | **`Analysis Drink Type`** setting — optional, user-controlled, off by default; when on, personal espresso-process analysis considers only shots whose Drink Type matches (e.g. Americano), so "for fun" drinks stay full records but don't distort dial-in numbers | **C** → then **B** | M | changes analysis semantics (a 2nd eligibility axis beside `Include in Analysis`); must define treatment of blank/legacy Drink Type; see onboarding doc §4.1.2 |
| SC-2 | Personal free-text Drink Type values vs BSE standard categories — personal values always valid locally; community/global rollups map onto the standard set, never force a rename | **C** | S (decision) | folds into any community-dataset design |
| SC-3 | Drink-type "for fun" achievements / leaderboards — Best Affogato, Best Milk Drink, Guest Favorite, Most Reliable Party Drink, Best Dessert Coffee; drink-type-specific leaderboards; ranks preference not technical score; opt-in, consent-gated; **not a launch blocker** | **D** (community) | L | onboarding doc §4.2.1; depends on SC-1 keeping fun ratings out of core analysis |

### Open — polish (none blocking)

| # | Item | Source | Cat | Size |
|---|---|---|---|---|
| PL-1 | Nav dual active-highlight: on `/shots/new` both "Log" and "Shots" tabs read active, in the bottom nav (ignores `exact`) and the desktop sidebar (`/shots/` prefix match) | `completed-tasks.md` "Owner-alpha smoke review" | **A** | S |
| PL-2 | List pages render blank with no message on a query error (`ReferenceShots.tsx` `shots?.map` with no `isError` branch; same pattern on other list pages) | `completed-tasks.md` "Owner-alpha smoke review" | **A** | S |
| PL-3 | "Amount loaded" wording differs across three places ("Starting weight" / "measured baseline" / "Starting Beans / Phase Baseline") | `completed-tasks.md` "Dashboard & Bags whole-bag vs hopper phase" | **A** | S |
| PL-4 | "Grinder Output Measurement" setting has no behaviour behind it — add a "coming soon" note | audit Medium-priority polish #10 | **A** | S |
| PL-5 | Domain-honesty copy in the Bags/Hopper dialogs is dense for a first-time user — a first-run pass once the workflow is stable | audit Medium-priority polish #11 | **A** | S |
| PL-6 | "Reference Shots" bottom-nav tab reuses the "Log Shot" Coffee icon | `completed-tasks.md` "Owner-alpha smoke review" | **A** (borderline redesign) | S |
| PL-7 | 10-item scrollable mobile bottom nav — candidate for a "top 4 + More" restructure if feedback asks | audit Medium-priority polish #12 | **A** | M |
| PL-8 | ShotForm bag-switch: a field already holding a value is not re-seeded to the new bag's default (blank-only wins) — documented limitation, revisit if it bites | `completed-tasks.md` "Log Shot WYSIWYG defaults" | **A** | S |

---

## Dependency-ordered sequence

### Track 1 — Owner-alpha release candidate (the critical path)

1. **SMK-1 + SMK-2** — the two never-done smoke tests. Highest priority: they gate the
   release decision (Gate 12) and may surface bugs that reorder everything below. Do these
   before declaring anything.
2. **DI-1 + DI-2** — land Agent 1's in-flight delete-409 + rating-bounds work.
3. **PL-1, PL-2, PL-4, PL-8** — cheap polish, good to clear while the smoke tests run.
4. Re-run SMK-1 after any fix from steps 2–3.
5. **Gate 12 release-candidate decision** — owner-alpha only, per ADR-0008. Known items
   still open (GRD-1, the whole B/C queue) are "explicitly accepted" here, not fixed first.

### Track 2 — Equipment default consolidation (parallel, gated on a decision)

Sequence once Carl approves Option A: **EQ-0 → EQ-1 (+DI-6) → EQ-3 → EQ-4 (+DI-3) → EQ-5**.
**EQ-2** (decaf/pour-over) is a separate C decision that can run anytime; if "drop", EQ-1's
removal of those Settings rows stands.

### Track 3 — Taste-selector archive (parallel, gated on a decision)

Once Carl approves the decision doc and picks the archive column: **TS-1** as a single M
slice (migration → API → UI → picker filter). Resolves DI-5. **TS-2 / TS-3** are later.

### Track 4 — Deferred equipment capability

**GRD-1** whenever there's an appetite; needs its own small design pass (rounding/display
rules) first — that design is the **C** part, the wiring is **B**. **GRD-2** waits for the
single-dose workflow.

### Track 5 — Import corpus consistency

**DI-4**: get the C decision (does the imported historical corpus get a one-off
rule-backfill?). If yes, it's a single script best run after DI-2 lands so all the rules it
enforces are final.

### Track 6 — Accounts / auth (the long parallel program)

**AUTH-0** (confirm mechanism) can happen now. **AUTH-1..9** is the Tier-2/Tier-3 gate and
is a multi-week program on its own plan; nothing in Tracks 1–5 depends on it, and it
unblocks TS-3 and everything public-launch.

---

## Recommended next 3–4 slices

1. **SMK-1 + SMK-2 — run the two smoke tests (A, M).** One continuous real-browser
   lifecycle pass plus a Render deployment smoke test. These are the actual gate on calling
   anything a release candidate, and neither has ever been done end-to-end. Do this first
   because it can surface bugs that reorder the rest.
2. **Land DI-1 + DI-2 (A/B, S).** Finish and commit Agent 1's in-flight delete-409 +
   rating-lower-bound work. Small, already underway, closes two audit Part 2 findings.
3. **EQ-0 + EQ-3 + DI-6 (A, S).** The no-approval-needed pieces of the equipment track:
   backfill `isDefault` from the Settings label strings, fix the accessory POST per-type
   bug, and fix the dead `usePuckScreen` read. De-risks the EQ-1 decision and is safe to do
   regardless of what Carl decides about Option A.
4. **Decision-gathering pass with Carl (unblocks the B/C queue).** One session to settle:
   (a) approve/adjust equipment-default Option A and the decaf/pour-over model (EQ-*, EQ-2);
   (b) approve the taste-selector archive slice and pick `archived_at` vs `is_active`
   (TS-1); (c) import-corpus rule-backfill yes/no (DI-4); (d) confirm the magic-link auth
   mechanism (AUTH-0). Each is a small answer that releases a queued track.

## Item count by category

| Category | Open items |
|---|---|
| **A** — safe now | DI-2, DI-6, EQ-0, EQ-3, EQ-5, SMK-1, PL-1..PL-8 (11) → **16** |
| **B** — needs Carl's approval | DI-1, DI-3, EQ-1, EQ-4, TS-1, GRD-1, (SMK-2 partly) → **6–7** |
| **C** — needs a product decision | DI-4, EQ-2, TS-2, GRD-2, AUTH-0 → **5** |
| **D** — blocked on ADR-0009 | TS-3, AUTH-1..9 → **2 lines (a program)** |

(EQ-5 and SMK-2 straddle a boundary — counted where they mostly sit.)
