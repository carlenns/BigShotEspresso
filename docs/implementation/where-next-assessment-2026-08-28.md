# Where Next — launch-tier assessment (2026-08-28)

Planning snapshot, prepared while orchestrating the owner-alpha cleanup batch. Sequencing
only — authorizes nothing. Cross-references `release-candidate-checklist.md`,
`launch-readiness-roadmap.md`, `auth-data-ownership-implementation-plan.md`, ADR-0008,
ADR-0009.

Base: `main` @ `3ff7b94` (PRs #2–#6 merged); this batch = `owner-alpha-cleanup`.

---

## 1. Owner-alpha release candidate (ADR-0008, owner-only) — CLOSE

The two long-standing "never done" blockers cleared this cycle:

- **SMK-1** — continuous mutating lifecycle pass: recorded 2026-08-28 (test bean/bags/
  hoppers/shot created, clear-on-edit verified by reload, blocked delete showed a human
  409, cleanup + owner active-Bag-7 / Hopper-Phase-2 restore confirmed).
- **SMK-2** — Render deploy + URL/API smoke: recorded 2026-08-28. Optional Render-dashboard
  SHA / build-log confirmation still open (`smk-2-render-deploy-smoke.md` Part 2d).

**Remaining before an RC can be declared (Gate 12):**

| Gate | Item | Size |
|---|---|---|
| 7 | Dashboard correctness — "partially ready". Add a dashboard route test / smoke fixture for: active-Bag isolation, excluded shots don't affect analytics, manual (not inferred) references, insufficient-reference state, no Bag-A-uses-Bag-B. | S |
| 2.5 | Color-blind / color-only pass. Agent 2's 2026-08-28 scan found the shipped cues OK (underline+weight nav, text Δ legend, "Finer" label). A true ~390px phone-width render is still unverified (tooling `resize_window` inert) — needs a real-device / DevTools pass. | S |
| 9 | Admin / debug visibility — scope decision (what an owner can see about imports, sync evidence, errors). "Strongly recommended", not strictly required. | S (decision) |
| 11 | Optional: confirm the deployed Render commit SHA + a clean build log. | XS |

Everything else code-side is green (83 tests, typecheck, build; PRs #2–#6 in).

**Known items explicitly ACCEPTED for the RC, not fixed** (per ADR-0008): EQ-1 (Settings still
shows deprecated Decaf/Pour-Over Grinder / Scale / Tamper default rows), the raw `key: value`
spec-string leak in those same dropdowns, GRD-1 (grind-precision display "2" vs "2.33"),
DI-3/DI-4, GRD-1/2, the whole B/C queue. Bag #5's name and shot #20's notes carry literal
`""` double-quote artifacts — owner data cleanup, not code.

**Recommended:** do Gate 7's test + the phone-width check, take the Gate 9 decision, then
declare the owner-alpha RC. It is genuinely close.

---

## 2. Outside testers (Tier 2, owner-invited) — GATED on the full auth program

Nothing ships to a non-owner until row-level data isolation exists and is proven. Per
`auth-data-ownership-implementation-plan.md`:

- **Not yet authorized to start.** The plan itself needs review + approval, and the auth
  *mechanism* (its recommendation: email + magic-link, no passwords) needs Carl's confirm
  (AUTH-0).
- Then a 9-phase build: `users` table + session model → `user_id` migration across all
  tables except `settings` → the `settings` compound-unique migration (highest-risk) →
  a shared route-scoping helper built + tested in isolation *before* any route is touched →
  per-route scoping across ~9 route files → login/session UI (`Shell.tsx` has zero account
  UI today) → owner backfill → **cross-user isolation test suite (hard gate — two real
  users, every table, no sampling)** → staged rollout, invites one at a time.
- A missed `WHERE user_id = …` clause is a silent data leak, not a crash — hence the
  build-the-helper-first and test-every-table discipline.

**Rough size:** multi-week. The schema/scoping work is the same whether you stop at Tier 2
or go to Tier 3 — only the auth UI and onboarding stay minimal for Tier 2.

---

## 3. Auth / data-ownership gate (blocks Tier 2 and everything after)

- ADR-0009 direction (row-level `user_id`, shared scoping helper, nullable `user_id` for a
  future shared library) is **accepted**; the implementation plan is **not**.
- **Carl's decisions needed to unblock:** (a) approve the implementation plan, (b) confirm
  magic-link as the mechanism.
- This is the single largest gate between "owner-alpha" and "anyone else touches it."

---

## 4. Paid public launch (Tier 3) — Tier 2 + a second program

On top of everything in Tier 2:

- Self-serve signup form (Tier 2 is owner-provisioned invites only).
- OAuth provider option (Google/etc.) — additive on the same ownership model.
- Billing + entitlement enforcement.
- ToS / privacy policy / community-research consent (separate from ChatGPT-integration
  consent).
- Public-surface abuse/rate-limiting review.

Weeks beyond Tier 2. Not a near-term concern.

---

## Recommended order

1. **Finish the owner-alpha RC** (Gate 7 test, phone-width check, Gate 9 decision) → declare it.
2. **Decision-gathering pass with Carl** — the B/C queue answers that release queued tracks:
   equipment-default Option A (EQ-1/EQ-2), taste-selector archive (TS-1), import-corpus
   backfill (DI-4), and the auth mechanism (AUTH-0). Each is a short answer.
3. **Approve the auth plan** → start Phase 1 of the Tier-2 program.
4. Tier 3 concerns only after real Tier-2 testers have exercised the isolation model.
