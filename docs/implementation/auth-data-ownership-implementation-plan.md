# Auth, Accounts, and Data Ownership — Implementation Plan

Last updated: 2026-08-26

## Purpose

Turns [ADR-0009](../ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md)'s accepted-direction decision (row-level `user_id` ownership, a shared query-scoping helper, nullable `user_id` on tables that will eventually support a shared/verified library) into a concrete, phased implementation sequence. This is planning only — no migration, schema, API, or auth code accompanies this document, per its explicit boundary. Nothing here is authorized for implementation until this plan itself is reviewed and approved, per the Constitution's "documentation before implementation" and "plan and obtain approval before implementation" rules.

## Prerequisite decision this plan does not make

ADR-0009 deliberately left the **authentication mechanism** open (Open Question 1) as separable from the ownership model. This plan needs *a* mechanism to sequence around, so it recommends one without re-opening the ADR's ownership decision:

**Recommendation: start with email + magic-link sign-in, not password storage.** For BSE's actual near-term need (Tier 2: a handful of owner-invited testers) this is the lowest-friction, lowest-security-surface option — no password hashing/reset/breach exposure to manage, and it matches an audience (home espresso enthusiasts, not necessarily technical) that benefits from not having another password to remember. A third-party OAuth provider (Google, etc.) can be added later as an additional option for Tier 3 self-serve signup without redoing the ownership model — the `user_id` scoping work below is identical regardless of which mechanism ultimately attaches a `user_id` to a request. This recommendation should be confirmed or revised before Phase 1 starts; it is not itself an implementation authorization.

## Tables needing user ownership (from direct schema inspection, restated concretely)

| Table | `user_id` | Notes |
|---|---|---|
| `shots` | `NOT NULL` | Most sensitive; no shared rows ever. |
| `bags` | `NOT NULL` | |
| `beans` | `NOT NULL` | |
| `hoppers` | `NOT NULL` | `one_active_hopper_per_bag` partial unique index scopes by `bag_id`, which becomes user-scoped transitively — no change to that index's logic. |
| `hopper_range_baselines` | `NOT NULL` | Personal calibration evidence today; community-shared baselines are explicit future scope, not this plan. |
| `accessories` | `NOT NULL` | |
| `settings` | `NOT NULL`, **plus a constraint change** | `key text unique` must become a compound `UNIQUE(user_id, key)` — the one migration in this plan that is not purely additive. See Phase 3. |

## Tables needing nullable `user_id` for future shared/verified library use

| Table | `user_id` | Notes |
|---|---|---|
| `grinders` | nullable | `docs/architecture/equipment-capability-library-model.md`'s "personal first, shared verified library later" model maps directly onto `user_id = NULL` reserved for a future admin-curated shared row. Do not use `NULL` as an ordinary-row default — every personal grinder gets a real `user_id`. |
| `machines` | nullable | Same as `grinders`. |
| `taste_selectors` | nullable | Already has an `isDefault` flag distinguishing curated defaults from user entries — curated defaults keep `user_id = NULL`, custom user-added selectors get a real `user_id`, mirroring the existing Drink Type pattern. |
| `shot_taste_selectors` | none needed | Pure join table on `(shot_id, taste_selector_id)`; ownership inherits transitively through `shots.user_id`. |

**Open, not decided here:** `airtable_sync_evidence`. Recommend it stays unscoped (owner-only operational data) unless/until Airtable sync itself becomes a per-user feature — nothing in current product docs describes per-user Airtable sync, and scoping it now would be speculative. Revisit if that changes.

## Phased sequence

Each phase should land, be verified, and be reviewable independently — this plan explicitly avoids proposing one large "add auth" change. Phases are ordered by hard dependency, not by size.

### Phase 1 — `users` table and session model (design)

- Conceptual `users` table: `id`, `email` (unique), `created_at`, `is_owner` (marks the single existing owner distinctly — see Phase 7), `display_name` optional. Exact columns depend on the auth-mechanism decision above (e.g. magic-link needs a `magic_link_tokens` table or equivalent, not a password hash column).
- Session model recommendation: a server-side `sessions` table (session id, `user_id`, `created_at`, `expires_at`, revoked flag) referenced by a signed, httpOnly cookie — not a stateless JWT. A DB-backed session is revocable and auditable (matches `docs/completed-tasks.md`'s established evidence/audit-trail habits in this project) and is simple to reason about at this project's scale; a JWT's main advantage (avoiding a DB lookup per request) isn't a real constraint here.
- This phase creates the owner's own first `users` row — a real precondition for Phase 7, not just a schema exercise.

### Phase 2 — `user_id` migration strategy (all tables except `settings`)

- One migration per table (matching this project's existing small, focused migration style — `0002` through `0009` each did one thing), not one giant cross-table migration. Each migration: add `user_id` (nullable at first if the table has existing rows), backfill every existing row to the owner's `user_id` from Phase 1, then `ALTER COLUMN ... SET NOT NULL` (or leave nullable, for the two shared-library tables) — as one transactional migration per table, not split across separate deploys, so there is never a window where rows have `user_id = NULL` and are invisible to a scoped query.
- Recommended table order (lowest-risk/most-isolated first, to prove the pattern before touching higher-stakes tables): `accessories` → `beans` → `bags` → `hopper_range_baselines` → `hoppers` → `grinders`/`machines` (nullable) → `taste_selectors` (nullable) → `shots` last, since it's the largest, most heavily-tested, and most write-path-complex table.

### Phase 3 — `settings` migration (highest-risk migration in this plan)

Its own phase, not folded into Phase 2, because it changes an existing constraint's shape rather than only adding a column:

1. Add `user_id` (nullable).
2. Backfill every existing row to the owner's `user_id`.
3. Drop the existing `UNIQUE(key)` constraint.
4. Add a new compound `UNIQUE(user_id, key)` constraint.
5. `ALTER COLUMN user_id SET NOT NULL`.

All five steps as one transactional migration with a real rollback (drop the compound constraint, restore `UNIQUE(key)`, drop the column) — this is the migration that most needs a rehearsal against a disposable Neon target before it ever touches production, per this project's existing Neon-rehearsal pattern.

### Phase 4 — Route-scoping helper (build once, before touching any route)

- A shared helper — a thin repository/query-wrapper layer that takes `userId` and returns a pre-scoped Drizzle query builder for a given table — built and tested in isolation before any of the ~9 route files are touched. This is the single most important risk-reduction step in this whole plan: per-route manual `WHERE user_id = ...` filtering, repeated by hand across `shots.ts`, `bags.ts`, `beans.ts`, `equipment.ts`, `hopper.ts`, `settings.ts`, `accessories.ts`, `taste-selectors.ts`, is exactly the pattern that produces one missed clause somewhere, and a missed clause is a silent data leak, not a crash (per ADR-0009's Security/privacy risks section).
- Also build the authentication middleware here: attaches `req.userId` from the session cookie, rejects unauthenticated requests to user-owned-table routes. This is separate from, and sits alongside, the existing `requireAdminToken` middleware — the two remain independent (admin/bulk routes stay owner/operator-gated regardless of how per-user auth is implemented).

### Phase 5 — Per-route update order

Once the helper exists, updating each route to use it is mechanical, but should still land as separate, reviewable changes in this order (matching Phase 2's table order, since a route can't be safely scoped before its table has `user_id`): `accessories.ts` → `beans.ts` → `bags.ts` → `hopper.ts` (covers both `hoppers` and `hopper_range_baselines`) → `equipment.ts` (`grinders`/`machines`, nullable-aware) → `taste-selectors.ts` (nullable-aware) → `settings.ts` (after Phase 3's constraint migration specifically) → `shots.ts` last. `dashboard.ts` and `insights.ts` also need scoping (they read from the same tables) — insert them immediately after whichever table they depend on most, likely alongside or just after `shots.ts`.

### Phase 6 — Frontend login/session UI

- New login page (email entry → magic-link sent → click-through session). For Tier 2, no public signup form is needed — see Phase 9.
- A session-aware API client: every existing `fetch(...)` call across `artifacts/coffee-log/src` needs to either rely on the cookie automatically (simplest, if the session cookie is httpOnly + same-site) or attach a token explicitly — recommend the cookie approach specifically because it requires no changes to the ~40+ existing `fetch` call sites, only a login page and a route guard.
- A logged-out route guard in `App.tsx` (redirect to login if no valid session) and minimal account UI in `Shell.tsx` (at minimum: show the signed-in user, provide sign-out — `Shell.tsx` currently has zero account UI of any kind, confirmed by direct inspection while drafting ADR-0009).

### Phase 7 — Owner migration/backfill

- A specific, one-time, carefully-sequenced operation, not a generic "backfill" step: create the owner's `users` row (Phase 1) *before* any table's Phase 2/3 migration runs its backfill step, since every backfill needs a real `user_id` to backfill to. This ordering dependency is easy to get backwards and should be called out explicitly in whatever future task actually executes this plan.
- After backfill, the owner should log in through the new Phase 6 UI and confirm every existing bean/bag/shot/hopper/setting is visible and unchanged — this is the first real end-to-end proof the migration worked, not just that it ran without error.

### Phase 8 — Cross-user isolation tests (mandatory gate, not optional)

- A dedicated test suite: create two real users, create real data for each (at minimum one bean/bag/shot/setting per user), and assert user A's session cannot read, update, or delete user B's rows through any scoped route — for every table in the ownership list above, not a sample. This is the single most important test category in this entire plan, directly closing the "missed scoping clause is a silent leak" risk from ADR-0009.
- This must pass, fully, before any Tier 2 invite goes out — not "should," a hard gate.
- The existing regression suite (60+ tests as of this session, growing) will also need real rework: most `api-contract.test.ts` tests that create/read shots, bags, etc. will need a user context once scoping lands. This is a non-trivial, but mechanical, amount of test-suite migration work, not a design question — flagged here so it isn't underestimated when this plan is scoped into actual tasks.

### Phase 9 — Deployment rollout

1. Everything above fully verified in dev (typecheck, full test suite including Phase 8's isolation tests, build).
2. Rehearse the `settings` migration (Phase 3) and the full migration set against a disposable Neon target first, per this project's existing Neon-rehearsal pattern (`docs/architecture/neon-postgres-rehearsal-plan.md`) — do not skip this for the constraint-changing migration specifically.
3. Apply to production Neon, including the owner backfill (Phase 7).
4. Deploy the new app code.
5. Owner logs in and smoke-tests the full lifecycle as themselves (extends the still-outstanding full browser smoke test from `launch-readiness-audit.md`).
6. Only then provision Tier 2 invite accounts, one at a time initially, watching for anything Phase 8's tests didn't catch.

## What can remain owner-only until later (explicitly, not by omission)

- **Airtable sync** (`requireAdminToken`-gated bulk routes) — no per-user scoping proposed; stays an owner/operator tool.
- **Self-serve signup** — Tier 2 uses owner-provisioned invites only; a public signup form is Tier 3 scope.
- **Billing/subscription enforcement** — entirely out of this plan; needs its own future plan once this ownership work is done.
- **OAuth provider integration** — magic-link is sufficient for Tier 2; adding Google/etc. is additive, later, Tier 3 work.
- **Shared/verified equipment library rollout** — the nullable `user_id` columns above make it *possible* later; this plan does not build the curation/moderation/admin-review workflow itself, which `equipment-capability-library-model.md` already correctly defers.

## Recommendation: stage Tier 2 before building for Tier 3 directly

Build the full row-level ownership model above once (it's the same work either way — there's no cheaper "Tier 2 only" version of the schema/scoping changes), but keep the **auth mechanism and onboarding UI** deliberately minimal for an initial Tier 2 release: magic-link only, owner-provisioned invites, no signup form, no billing. This lets real outside testers validate that the ownership model actually works correctly in practice — including Phase 8's isolation tests running against real usage, not just synthetic tests — before the added complexity of self-serve signup, OAuth, and billing enforcement is built on top of it for Tier 3. If Phase 8/9 surface a real isolation bug once real testers are using the app, it's far cheaper to find and fix that before Tier 3's public surface area exists than after.

## Highest-risk items in this plan (consolidated)

1. The `settings` compound-unique-constraint migration (Phase 3) — the one non-additive schema change here.
2. A missed scoping clause on any route — mitigated by building the shared helper first (Phase 4) rather than per-route manual filtering, and by treating Phase 8's isolation tests as a hard gate.
3. Getting the owner-backfill ordering wrong (Phase 7's `users` row must exist before any table's backfill step) — a sequencing mistake, not a technical one, so it's called out explicitly rather than assumed obvious.
4. Underestimating the existing regression-suite rework (Phase 8) — real, mechanical, but non-trivial work across a large and growing test file.

## Related documentation

- [ADR-0009: User Accounts, Authentication, and Data Ownership](../ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md)
- [Launch Readiness Audit](launch-readiness-audit.md)
- [Release Candidate Checklist](release-candidate-checklist.md)
- [Equipment Capability and Shared Library Model](../architecture/equipment-capability-library-model.md)
- [Neon Postgres Rehearsal Plan](../architecture/neon-postgres-rehearsal-plan.md)

## Explicit non-goals of this plan

Per its own boundary: no migrations, schema changes, API changes, UI changes, or auth code were written to produce this document. No billing/subscription implementation. No intelligence engines. No public-launch work of any kind. This is the sequencing plan a future, separately-approved implementation task should follow — it is not itself that implementation.
