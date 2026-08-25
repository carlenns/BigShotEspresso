# ADR-0009: User Accounts, Authentication, and Data Ownership

- Date: 2026-08-25
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

ADR-0008 established that the first release candidate is owner-only, and explicitly deferred the real question: *"public-user release is blocked until authentication, authorization, and data ownership rules are designed and implemented."* This ADR is that design step. It does not implement anything — no code, schema, or migration changes accompany it, per this task's explicit boundary.

The gap is large and confirmed by direct inspection, not assumption:

- Every table in `lib/db/src/schema/*.ts` (`beans`, `bags`, `grinders`, `machines`, `hoppers`, `hopper_range_baselines`, `accessories`, `shots`, `settings`, `taste_selectors`, `shot_taste_selectors`, `airtable_sync_evidence`) has **no `user_id`/`owner_id` column of any kind**.
- Every ordinary CRUD route (`shots.ts`, `bags.ts`, `beans.ts`, `equipment.ts`, `hopper.ts`, `settings.ts`, `accessories.ts`, `taste-selectors.ts`) queries and writes with **no user-scoping filter at all** — confirmed by reading the route files directly.
- The only access control that exists is `requireAdminToken` (`artifacts/api-server/src/middlewares/admin-auth.ts`), a single shared secret compared via `timingSafeEqual`, gating exactly six bulk/import/sync routes (`app.ts` lines 51–56: Airtable clear/sync, three CSV imports, taste-selector seed) and only in `NODE_ENV=production`. It has no concept of individual user identity — it is a single owner/admin gate, not an accounts system.
- `App.tsx` contains no auth-related routing, guard, or redirect logic of any kind.
- `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md` already commits to a concrete public paid launch plan ($10/month, an $80/year Founder tier limited to the first 500 users, then $110/month) — this is not a hypothetical future feature, it is the standing business plan this ADR must make possible.
- `docs/implementation/launch-readiness-audit.md` (Critical Blocker #1, confirmed unchanged across every reconciliation pass since) identifies this as the single largest gap between the current codebase and that plan.

This ADR does not decide *when* to launch publicly. It decides the *shape* of the work required so that decision can be made with real estimates instead of a vague "auth is missing."

## Decision

Adopt **row-level ownership via a `user_id` foreign key on every user-owned table**, backed by a new `users` table (not created by this ADR), as the primary data-ownership model. Reject schema-per-tenant and database-per-tenant as the primary model for this project's current scale. Authentication itself (the login mechanism — email/password, magic link, or OAuth provider) is a separable decision from data ownership and is intentionally left open below rather than pre-decided, since it does not change the schema/routing shape.

### Why row-level `user_id`, not schema-per-tenant or database-per-tenant

- It is the standard, well-documented pattern for an application at this scale (hundreds to low thousands of users, not enterprise/compliance-driven isolation requirements), and is directly supported by the Drizzle ORM already in use — no new infrastructure category is introduced.
- Migration is incremental and additive: `ADD COLUMN user_id` on each table, backfill existing rows to a single "owner" user, enforce `NOT NULL` once backfilled. Schema-per-tenant would instead require running every future migration once per tenant schema, and database-per-tenant would require per-tenant connection routing — both meaningfully heavier than this project's current single-database, single-migration-runner architecture is built for.
- It composes naturally with a pattern this project has already anticipated elsewhere: `docs/architecture/equipment-capability-library-model.md`'s "personal record first, shared verified library later" model for equipment, and the curated-default-plus-custom-entries pattern already live for `taste_selectors` (`isDefault` rows) and Drink Type (`selector-options.ts`). Both map directly onto "row has `user_id = NULL` (shared/curated) or a real `user_id` (personal)" — schema-per-tenant has no clean equivalent for a shared row visible to every tenant.
- The main risk of row-level ownership — a missing `WHERE user_id = ...` clause leaking one user's data to another — is real and must be taken seriously (see Security/privacy risks below), but it is a known, well-understood risk class with well-understood mitigations (a shared query-scoping helper, not per-route manual filtering; tests that assert isolation), not a novel one.

### Tables likely needing `user_id` or ownership scoping

Confirmed by reading every schema file directly, not inferred from table names:

| Table | Scoping needed | Notes |
|---|---|---|
| `shots` | `user_id NOT NULL` | The most sensitive table — a user's actual research data. No shared/default rows ever make sense here. |
| `bags` | `user_id NOT NULL` | Personal bag records. |
| `beans` | `user_id NOT NULL` | Personal bean records. Could later support a shared bean-catalog concept, but that is explicit future scope per the landing page doc, not this ADR. |
| `hoppers` | `user_id NOT NULL` | Personal hopper state. The existing `one_active_hopper_per_bag` partial unique index scopes by `bag_id`, which will itself be user-scoped transitively — no change needed to that index's logic, just its inputs. |
| `hopper_range_baselines` | `user_id NOT NULL` | Personal calibration evidence today. Community-shared baselines are plausible future scope (`docs/product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md`'s citizen-science section), not this ADR. |
| `grinders`, `machines` (in `equipment.ts`) | `user_id` nullable, with a `verified`/shared-library path | Matches the already-documented "personal first, shared verified library later" model exactly. `user_id = NULL` should be reserved for a future admin-curated shared library, not used as a default/fallback for ordinary rows. |
| `accessories` | `user_id NOT NULL` | Personal accessory records; no shared-library concept documented for these yet. |
| `settings` | `user_id NOT NULL`, **and the unique constraint must change** | This is the one table needing more than an added column. `key text unique` (`lib/db/src/schema/settings.ts`) is a *global* unique constraint today — two users could not both have a `defaultDose` key under the current schema even with a `user_id` column added, because the existing `UNIQUE` is on `key` alone. This needs to become a compound unique constraint on `(user_id, key)`. Flagged explicitly because it is easy to miss if this table is scoped mechanically the same way as the others. |
| `taste_selectors` | `user_id` nullable, hybrid | Already has an `isDefault` flag distinguishing curated defaults from user entries — the natural mapping is curated defaults keep `user_id = NULL`, user-added custom selectors get a real `user_id`, exactly mirroring the existing Drink Type pattern. |
| `shot_taste_selectors` | No direct column needed | Pure join table on `(shot_id, taste_selector_id)`; ownership is inherited transitively through `shots.user_id`. |
| `airtable_sync_evidence` | Open question | Provenance/evidence records for Airtable sync. If Airtable sync remains an owner-only operational tool (plausible — nothing in current product docs describes per-user Airtable sync), this table may not need per-user scoping at all for the scope of this ADR. Listed as an explicit open question below rather than decided here.

### API/routing implications

- Every route file listed under Context needs its `db.select()`/`db.insert()`/`db.update()`/`db.delete()` calls scoped by the authenticated user's id. This should be implemented as a shared, mandatory scoping helper (e.g. a Drizzle query builder wrapper or a thin repository layer) rather than a manual `WHERE user_id = ...` added ad hoc to each of the ~9 route files independently — the latter is exactly the pattern that produces a missed clause somewhere.
- A new authentication middleware (parallel to, not a replacement for, `requireAdminToken`) must run before any user-owned-table route and attach the authenticated user's id to the request. Unauthenticated requests to those routes must be rejected, not silently scoped to nothing or to a default user.
- The existing `requireAdminToken` bulk/admin routes are a separate concern from per-user auth and should remain owner/operator-only regardless of how user auth is implemented — they are not user-data routes.
- OpenAPI-governed routes (`shots`, `hoppers` — confirmed via `lib/api-spec/openapi.yaml`) versus hand-written routes (`bags`, confirmed via earlier work this session finding `/api/bags` has no OpenAPI/generated-validator involvement) will need the scoping applied consistently across both styles; this is a real but mechanical implication, not a design blocker.

### UI implications

- A real login/signup flow must be built — `Shell.tsx` currently has zero account/profile/sign-out UI anywhere (confirmed by direct inspection this session).
- Every data-fetching call in `artifacts/coffee-log/src` currently assumes it will only ever see one user's data (there is no concept of "whose data is this" anywhere in the frontend either) — this is a smaller change than the backend scoping work, since the frontend mostly just needs to stop assuming a single global dataset and start trusting whatever the now-scoped API returns, but session/token handling (attaching credentials to every request) is new frontend infrastructure that doesn't exist today.
- `Settings.tsx` already anticipates this exact change in its own UI copy (confirmed, line 576 as of this session): *"User-specific active equipment will become stricter after accounts/OAuth are added."* — the product intent has been on record in-app for a while; this ADR is the design catching up to it.

### Migration risks

- The `settings` table's unique-constraint change (above) is the one item in this list that is not a pure additive column — it changes an existing constraint's shape and needs its own careful migration and rollback, not just an `ADD COLUMN IF NOT EXISTS`.
- Backfilling existing rows to a single "owner" user must happen atomically with adding the `NOT NULL` constraint, or there is a window where rows have `user_id = NULL` and are invisible to every scoped query — this needs to be a single transactional migration, not two separate ones landed independently.
- Every existing regression test that reads/writes these tables (a large fraction of `artifacts/api-server/src/api-contract.test.ts`, which is now several hundred tests) will need to either supply a user context or be updated for the new scoping — this is a real, non-trivial amount of test-suite rework, not just a schema change.
- This is exactly the kind of change the Constitution's "every schema change requires migration and rollback" and "documentation before implementation" rules are for — it should not be attempted as a single large migration without a dedicated implementation plan of its own, separate from this ADR.

### Security/privacy risks

- **Missing scoping is a data-leak class, not a crash class.** A route that forgets its `WHERE user_id = ...` clause doesn't error — it silently returns another user's data. This argues strongly for the shared-scoping-helper approach above over per-route manual filtering, and for adding explicit cross-user-isolation regression tests (user A cannot see/edit/delete user B's shots, bags, settings, etc.) as a required, not optional, part of implementation.
- Authentication mechanism choice (below) has its own security surface (password storage, session/token handling, OAuth provider trust) that this ADR does not resolve, since it's a separable decision — but whichever is chosen must follow this project's existing security posture: `docs/implementation/release-security-hardening-checklist.md`'s gates, not a bespoke scheme.
- `settings`'s current global-key-value shape, if scoped naively without fixing the unique constraint, would let one user's settings save silently overwrite another's — this is called out twice in this document (here and above) because it is the single easiest mistake to make in this migration.

### Outside-tester requirements (lighter bar than paid launch)

Per `docs/implementation/launch-readiness-audit.md`'s Tier 2 framing: a handful of trusted testers do not need full self-serve signup, OAuth, or billing — they need *some* real data separation so two testers on the same deployed instance don't see each other's bags and shots. The row-level `user_id` model above satisfies this at Tier 2 with a much smaller authentication surface than Tier 3 needs: a simple owner-provisioned login (e.g. an invite-only account created directly by the owner, no self-serve signup flow, no payment integration) would be sufficient for Tier 2 while the full model is built out for Tier 3.

### Paid-launch requirements (full bar)

Tier 3 additionally needs, beyond the data-ownership model itself:

- Self-serve account creation (not owner-provisioned).
- A real authentication mechanism (see Alternatives, below) with password reset / account recovery.
- Billing/subscription enforcement matching the landing page's tiered pricing — this ADR's scope stops at data ownership and does not decide the billing integration, which needs its own ADR.
- A privacy policy and terms of service — not yet mentioned as existing anywhere in this project's docs, and required once real personal data is collected under a paid product.
- The public-access-scoped portions of `docs/implementation/release-security-hardening-checklist.md`, which have not been reviewed against this specific model as part of this ADR.

## Evidence

- `lib/db/src/schema/*.ts` — read in full; no `user_id`/`owner_id` column exists on any table.
- `artifacts/api-server/src/routes/*.ts` — read/grepped; no user-scoping in any query.
- `artifacts/api-server/src/middlewares/admin-auth.ts` and `app.ts` lines 51–56 — the only access control that exists today, confirmed single-secret/no-identity.
- `artifacts/coffee-log/src/App.tsx` and `Shell.tsx` — confirmed no auth UI or routing guard anywhere.
- `artifacts/coffee-log/src/pages/Settings.tsx` line 576 — the codebase already anticipates this change in its own UI copy.
- `docs/product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md` — the concrete pricing/Founder-tier plan that makes this a real, not hypothetical, near-term need.
- `docs/architecture/equipment-capability-library-model.md` — the existing "personal first, shared verified later" pattern this ADR's `user_id`-nullable recommendation for equipment/taste-selectors extends rather than invents.
- `docs/implementation/launch-readiness-audit.md` — Critical Blocker #1, confirmed unchanged across every reconciliation pass to date.
- ADR-0008 — the decision this ADR fulfills the deferred half of.

## Alternatives considered

### Schema-per-tenant (one Postgres schema per user)

Rejected as the primary model. Strong isolation guarantee (a bug can't easily leak across schemas), but every migration must run once per tenant schema, connection routing/pooling becomes materially more complex, and Drizzle's tooling in this codebase is not currently set up for multi-schema operation. Appropriate at a scale or compliance requirement this project does not have yet; would be a significant, unforced increase in operational complexity for a 500-seat Founder-tier launch.

### Database-per-tenant

Rejected outright at this scale — the operational overhead (provisioning, migrating, backing up, and monitoring N databases) is disproportionate to a project currently targeting a single Render service and a single Neon database.

### Do nothing until public launch is imminent

Rejected. `docs/implementation/launch-readiness-audit.md`'s Tier 2 (outside testers) already needs a lighter version of this problem solved, and the amount of route/schema/test surface area this touches (confirmed above by direct inspection, not estimation) means starting late compounds the cost — every new table and route added between now and "later" adds to the eventual retrofit.

### Pre-deciding the authentication mechanism now (email/password vs. magic link vs. OAuth provider)

Deferred, deliberately, rather than rejected. The data-ownership model (row-level `user_id`) is the same regardless of which authentication mechanism eventually attaches a `user_id` to a request — deciding the mechanism now would be scope creep on an ADR whose job is the ownership model, and the mechanism choice has its own tradeoffs (OAuth reduces password-security surface but adds a third-party dependency; email/password is simplest to reason about but puts credential security fully on this project) that deserve their own focused decision once this model is accepted.

## Consequences

- Every table listed above eventually needs a migration adding `user_id` (and, for `settings`, a constraint change) — a real, multi-file, multi-test-suite implementation effort, not a small patch.
- Every route file needs a consistent scoping mechanism, ideally introduced once as a shared helper rather than duplicated nine times.
- The frontend needs new session/auth-state infrastructure that doesn't exist today, plus login/signup/account UI.
- Outside-tester access (Tier 2) can be reached with a smaller slice of this work (owner-provisioned accounts, no self-serve signup, no billing) than full paid launch (Tier 3) needs — this ADR's model supports building Tier 2 first without redoing the ownership design later for Tier 3.
- This ADR does not by itself unblock anything — it is the design that a future, separately-approved implementation plan will execute against, per the Constitution's "documentation before implementation" and "plan and obtain approval before implementation" rules.

## Open questions

1. **Authentication mechanism** — email/password, magic link, or a third-party OAuth provider (Google/GitHub/etc.)? Deliberately left open above; needs its own decision, informed by how much of the target audience (home espresso enthusiasts, not necessarily already OAuth-habituated) will tolerate each option.
2. **`airtable_sync_evidence` scoping** — does Airtable sync remain an owner-only operational tool indefinitely, or does it eventually become per-user? Nothing in current product docs describes per-user Airtable sync; if it stays owner-only, this table may not need `user_id` at all.
3. **Migration sequencing** — should the `user_id` columns and backfill land as one large migration, or a sequence of smaller per-table migrations? The `settings` constraint change (above) argues for treating it as its own dedicated migration regardless of how the rest is sequenced.
4. **Scoping helper design** — a Drizzle-level query wrapper, a thin repository/service layer, or per-route middleware that injects a pre-scoped query builder? This is an implementation-detail decision for whichever future task actually builds this, not decided here.
5. **Shared-library rollout timing for equipment/taste-selectors** — this ADR recommends the schema shape (`user_id` nullable) that *supports* a future shared/verified library, but does not decide when that library work itself happens; `docs/architecture/equipment-capability-library-model.md` already defers it until "after account/auth, ownership, moderation, admin review, and privacy controls exist," which this ADR is a prerequisite for, not a trigger of.
6. **Tier 2 vs. Tier 3 sequencing decision** — should implementation target the lighter Tier 2 (outside-tester) slice first as a deliberate milestone, or build the full Tier 3 model in one pass? This ADR shows Tier 2 is reachable with less work, but doesn't decide whether that staging is worth the extra planning overhead versus building once for Tier 3 directly.

## Related Project Notes

- Phase 1.5 Foundation Stabilization
- Launch Readiness Audit (Critical Blocker #1)
- Owner-only first release access decision (ADR-0008)

## Related documentation

- [Launch Readiness Audit](../implementation/launch-readiness-audit.md)
- [Release Candidate Checklist](../implementation/release-candidate-checklist.md)
- [Release Security Hardening Checklist](../implementation/release-security-hardening-checklist.md)
- [Product Landing Page Content Brief](../product/BSE_PRODUCT_LANDING_PAGE_CONTENT.md)
- [Equipment Capability and Shared Library Model](../architecture/equipment-capability-library-model.md)
- [ADR-0008: Owner-Only First Release Access](ADR-0008-owner-only-first-release-access.md)

## Related code changes

None. This ADR is documentation/planning only, per its explicit task boundary — no code, schema, or migration files were changed to produce it.

## Supersedes / Superseded by

- Supersedes: none (fulfills, rather than supersedes, the deferred question left open by ADR-0008)
- Superseded by: none
