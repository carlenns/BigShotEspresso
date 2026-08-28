# Owner-Alpha RC — readiness + decision queue (2026-08-28)

Planning layer. Base: `main` @ `e0ff6cf` (PRs #2–#10 merged).
Cross-refs `release-candidate-checklist.md`, `launch-readiness-roadmap.md`,
`where-next-assessment-2026-08-28.md`, ADR-0008.

The first release is **owner-only** (ADR-0008). Intelligence engines are out of scope.

---

## 1. RC gate status

| Gate | State | Owner |
|---|---|---|
| 1 Repo / CI | ✅ CI green through `e0ff6cf` | — |
| 2 Security baseline | ✅ mostly ready; `ADMIN_API_TOKEN`-gated admin routes; no secrets in source | — |
| 2.5 Color-blind / color-only | ✅ passed — real ~390px viewport pass + color-only audit landed in PR #8 | — |
| 3 Neon rehearsal | ✅ passed | — |
| 4 CSV import verification | ✅ mostly ready | — |
| 5 Airtable | ⏸ blocked — **not a blocker**; first release is CSV-only | — |
| 6 Runtime API contract | ✅ read-only + mutating (SMK-1) smoke passed | — |
| 7 Dashboard correctness | ✅ passed — behavioural active-Bag/reference tests landed in PR #8 | — |
| 8 Shot entry / edit | ✅ SMK-1 mutating lifecycle recorded 2026-08-28 | — |
| 9 Admin / debug visibility | ✅ Option A shipped — `/data-health` read-only diagnostics landed in PR #10 | — |
| 10 Backup / recovery | ✅ documented + disposable-Neon rehearsal | — |
| 11 Deployment prep | ✅ SMK-2 Render URL/API smoke recorded; optional dashboard SHA/build-log confirm remains | — |
| 12 Release decision | ✅ declared — see `owner-alpha-rc-report-2026-08-28.md` | Carl |

Everything required for the owner-alpha RC is green. Remaining decisions in §3
gate the next stage, not this owner-only RC.

---

## 2. Gate 9 — Admin / debug visibility (DECISION TAKEN)

Gate 9's minimum rule: *"there must be some way to diagnose bad data without editing the
database directly."*

**What exists today:**
- Backend endpoints: `GET /api/shots/audit` (summary: row/column counts, date range, unique
  bags/statuses/fault-statuses, reference vs non-reference counts, + every shot with
  `rawRow`), `GET /api/airtable/status`, `GET /api/airtable/counts` (per-table
  `fromAirtable` vs app-created breakdown).
- A frontend page `ImportAudit.tsx` (`SyncAudit`) that renders status + counts + a Sync
  button + a Clear button — **but it is not routed in `App.tsx` and not in the nav**, so it
  is unreachable in the running app.
- No UI shows: excluded-vs-analytical shot counts, unresolved relationships (e.g. a shot
  whose `bagId` has no bag), active-Bag/active-Hopper status in one place.

### Options

| # | Option | Effort | Notes |
|---|---|---|---|
| **A** | **Route the existing `SyncAudit` page, read-only.** Add it to `App.tsx` + a Settings link or a nav entry; hide/disable the Sync + Clear buttons for the CSV-only release (they are Airtable writes). | S | Fastest. Covers import/sync status + `fromAirtable` counts. Doesn't cover excluded-shot counts or unresolved FKs without a small addition. |
| **B** | **New read-only "Data Health" page.** Shows: active Bag + active Hopper; shot counts (total / analysis-eligible / excluded / reference / signature); `fromAirtable` vs app-created per table; unresolved relationships (orphan `bagId`/`hopperId`, references outside the active bag); the `/shots/audit` summary. No write actions. | M | Cleanest for owner-alpha; hits every Gate-9 bullet. Reuses the existing endpoints + one new count query. |
| **C** | **Defer the UI; accept API-only.** Document that `/api/shots/audit` + `/api/airtable/counts` (curl / browser) satisfy the *minimum* rule, and a Data Health page is a fast follow. | XS | Gate 9 is "strongly recommended," not "required." Defensible for an owner-only release where the owner can hit an API. |

**Decision taken:** Option A shipped in PR #10. The existing page is routed as
`/data-health`, renamed/reframed as read-only owner diagnostics, linked from
navigation, and stripped of client-side Airtable sync/clear actions. Option B
remains a fast follow for excluded-shot counts and orphan-FK views.

---

## 3. Decision queue for Carl (unblocks queued tracks)

Each is a short answer. The recommendation column is what the existing decision docs
already propose — this table just collects them so they can be answered in one pass.

| Ref | Question | Doc recommendation | Unblocks | Size if "yes" |
|---|---|---|---|---|
| **EQ-1** | Approve equipment-default **Option A** — make Equipment-page `isDefault` the single source of truth; Dashboard reads it; retire the Settings `default*` machine/grinder/scale/tamper rows. | Approve. `equipment-default-source-of-truth-decision.md` already lands on Option A; the consolidation plan sequences it (Phase 0 reversible backfill → Phase 1 Dashboard+Settings). | Fixes the deprecated Settings rows Agent 2 keeps flagging; also removes the raw `key: value` spec-string leak in those dropdowns. | M (phased) |
| **EQ-2** | Decaf / pour-over grinder default — **launch need, or drop?** | Product call, no default recommendation. If "drop": Phase 1's removal of those Settings slots just stands. If "keep": it becomes a later per-role feature. | The decaf/pour-over Settings slots' fate. | S (decision) / L (if "keep") |
| **TS-1** | Approve the taste-selector **archive** slice (D1 archive-not-delete, D4 add an `origin` column now) + pick the archive column. | Approve. Decision already recorded from Carl 2026-08-27. Archive column: **`archived_at timestamptz NULL`** (no backfill, matches the nullable-timestamp lifecycle markers), unless cross-table `is_active` consistency is judged more important. | Resolves DI-5 (deleting a selector `ON DELETE CASCADE` strips the tag from every historical shot). Account-scoped custom selectors (D3) still wait for accounts. | M |
| **DI-4** | Does the **imported historical corpus** get a one-off rule-backfill — recompute include-in-analysis, normalise signature⇒reference and sour-exclusivity, clamp ratings — to match app-created shots? | Product call. Only needed if whole-corpus analytics consistency is required. If "yes", it's one script, best run after all the enforcement rules are final. | Whole-corpus analytics consistency. | M (one script) |
| **AUTH-0** | Confirm **magic-link** (email link, no passwords) as the auth mechanism for the eventual Tier-2 program. | Confirm. `auth-data-ownership-implementation-plan.md` recommends it (lowest friction + security surface for owner-invited testers; OAuth can be added later without redoing the ownership model). Not itself an implementation authorization. | Lets the auth plan's Phase 1 be scheduled once the plan itself is approved. | S (decision) |

None of these block the **owner-alpha RC** — that only needs Gates 2.5, 7, 9. They gate the
*next* stage (equipment/taste cleanup, and Tier 2).

---

## 4. RC declaration (Gate 12)

Declare the owner-alpha release candidate when:

- [x] Gate 2.5 pass recorded (real phone-width + color-only audit, any fixes landed).
- [x] Gate 7 pass recorded (dashboard-correctness test green in CI).
- [x] Gate 9 decision taken (A) and the page shipped.
- [x] CI green on the RC commit; typecheck + api-server tests + build:render all pass.
- [x] `smk-2-render-deploy-smoke.md` Part 2 either fully run or its remaining items
      (dashboard SHA / build-log confirmation) explicitly accepted.
- [x] Known open items **explicitly listed and accepted, not fixed** (per ADR-0008):
      EQ-1/EQ-2, GRD-1 (grind-precision display), DI-3/DI-4, GRD-2, the whole B/C queue,
      the `""` data artifacts in Bag #5 / shot #20, and the `days_since_open` timezone
      truncation edge.
- [x] A release-candidate report written (what's in, what's accepted-open, deploy target).

Then tag / release per ADR-0008 (owner-only) — no public access, no Airtable dependency.
