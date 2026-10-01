# Phase 2B — Pre-Outside-Users Readiness: Scope Authorization

Date: 2026-10-01
Status: **Authorized (pre-work only)** — plan approved by Carl in the 2026-09-30/10-01 planning session.
Authority: subordinate to the [Constitution](../PROJECT_CONSTITUTION.md), [ROADMAP](../ROADMAP.md), ADRs,
[ADR-0008](../ADR/ADR-0008-owner-only-first-release-access.md) (owner-only access still applies),
[ADR-0009](../ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md) and
[ADR-0011](../ADR/ADR-0011-clickonomics-platform-and-clerk-identity.md).

## Why this exists

Carl wants BSE ready for an invite-only handful of outside testers and the Clerk track. The approved
platform order puts BSE's ownership migration after the Clickonomics-first steps, so the safe work now is
everything that must be true *before* any login work. This document is the approval record for that
pre-work. It does not authorize outside access.

Decisions: follow the platform order; first beta is invite-only, a handful of trusted testers, no
self-serve signup, no billing, no CSV import or Airtable connection for testers.

## Authorized workstreams

| WS | Scope | Category |
|---|---|---|
| W0 | Governance: ADR-0009 amendments and acceptance, ADR-0011, ROADMAP/START_HERE, this document, the tracker | docs |
| W1 | Owner decisions: EQ-2, TS-1, DI-4 remainder, tester CSV/Airtable access, first Clickonomics reference app | decisions |
| W2 | App housekeeping from the RC accepted-open list, one small slice at a time, each separately approved | A/B |
| W3 | Verification: continuous browser lifecycle walkthrough, Render smoke test on the Prisma-backed service, mobile nav check | verification |
| W4 | Operations: Prisma and Render plan decisions, backup confirmation, monitoring, domain checklist, Neon-era doc supersession notes | ops/docs |
| W5 | Auth-independent security hardening: secret scan, dependency audit, bundle check, CSP, rate limiting, admin-route review | A/B |
| W6 | Product and legal drafts: privacy policy, terms, beta onboarding copy, support path (drafts for Carl's review) | docs |
| W7 | Auth-readiness documents: updated implementation plan, isolation test specification, route scoping inventory, migration rehearsal plan | docs |

## Explicit non-goals

Any Clerk or auth code, the `users` table, any `user_id` column or migration, production Clerk or
billing configuration, entitlement enforcement, tester accounts, any DNS or domain change, any
Clickonomics repository change, intelligence engines (DCI/OSI/HMI/BLI/MSI/GSP), live Airtable sync,
community features, and any plan or infrastructure change not explicitly approved by Carl at the time
(Prisma and Render plan upgrades are decisions for Carl).

## Working rules

- One slice at a time; each code slice verified with `pnpm run typecheck`,
  `pnpm --filter @workspace/api-server test` and `pnpm run build:render` before it is proposed for commit.
- No commit, push, merge, tag, or deploy without Carl's explicit request (CLAUDE.md).
- Back up (`node scripts/prisma-postgres-migration.mjs backup`) before any production-data change.
- Time is recorded in [DEVELOPMENT_TIME_LOG](../RESEARCH/DEVELOPMENT_TIME_LOG.md) as ordinary development, not R&D.

## Readiness checkpoint (exit criteria)

See the tracker: [pre-outside-users-checklist.md](pre-outside-users-checklist.md). BSE then waits on
Clickonomics platform steps 2 to 5 before the BSE ownership migration (step 6) begins; that is a
separate authorization.

## Completion record

Not started. W0 drafted 2026-10-01 (uncommitted at time of writing).
