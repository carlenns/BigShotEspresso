# ADR-0011: Clickonomics Platform Architecture and Clerk as Identity Provider

- Date: 2026-10-01
- Status: Accepted (2026-10-01)
- Decision owner: Carl Enns
- Approval: Accepted by Carl Enns, 2026-10-01. Records the owner-directed 2026-09-08 architecture; the four owner decisions listed under "Still open" remain open.

## Context

BSE is owner-only (ADR-0008) and has no accounts (ADR-0009 designs row-level ownership). On
2026-09-08 Carl directed that Clickonomics is the customer front door and control plane (account,
authentication, subscription, entitlement, dashboards) and that BSE and other apps stay independent
deployments behind it, and approved Clerk as the managed identity provider. That direction lives in
[clickonomics-platform-architecture](../implementation/clickonomics-platform-architecture.md) and
[clickonomics-clerk-integration-plan](../implementation/clickonomics-clerk-integration-plan.md) but had no ADR.

## Decision

1. **Clerk** is the managed identity, session and (later) billing provider. Clerk is not the
   Clickonomics frontend; Clickonomics is the frontend and control plane.
2. **One production Clerk application** with `clickonomics.ca` as the primary domain and
   `app.bigshotespresso.com` as a satellite domain, so sign-in stays canonical at Clickonomics while BSE
   keeps its own brand and deployment. Redirect origins and authorized parties are restricted to exact
   approved origins.
3. **Application boundary:** each application owns its operational data, record ownership and API
   authorization, and enforces entitlement on its own backend. No shared database across applications.
4. **Sequence (platform order):** Clickonomics account shell, entitlement vocabulary, subscription pilot,
   one federated reference app, then the BSE ownership migration, then BSE domain federation. BSE
   ownership migration does not start before its migration rehearsal and cross-user isolation suite
   are ready, and backfills the owner's existing data only after the owner's real Clerk identity exists.

## Evidence

- Platform architecture and Clerk integration plan (both 2026-09-08, owner-directed).
- Carl's approval of Clerk as the mechanism direction, 2026-09-08, and of the platform order for planning, 2026-09-30.
- ADR-0009 (ownership model) and the verified BSE schema/route analysis in the Clerk plan.

## Alternatives considered

- **Self-built email/magic-link auth inside BSE** (the earlier recommendation in the implementation plan):
  superseded 2026-09-08 by Clerk; avoids owning password/session/magic-link security.
- **BSE-first Clerk topology** (BSE as the primary customer and identity surface): rejected in the
  platform architecture; it would duplicate accounts and billing per product.
- **Separate login per product:** rejected (explicit non-goal in the platform architecture).

## Consequences

- BSE outside-user work waits on Clickonomics platform steps 2 to 5; pre-work in the meantime is
  [Phase 2B](../implementation/phase-2b-scope-authorization.md).
- BSE needs a text `user_id`, a local `users` mirror, and three request checks (session, entitlement,
  ownership); ADR-0009 amendments 2 and 3.
- Production Clerk configuration, billing, and any `user_id` migration remain separately approval-gated.

## Still open (owner decisions, platform doc section 9)

1. Confirm `clickonomics.ca` as canonical and `clickonomics.im` as an initial redirect.
2. Choose the first reference application for federation.
3. Personal accounts, organization workspaces, or both for the first Clickonomics dashboard customers.
4. Approve the first product/feature vocabulary and invite-only test plan before configuring live billing.

## Related Project Notes

- 2026-09-08 Clickonomics/Clerk planning handoff; 2026-09-30 Phase 2B planning session.

## Related documentation

- [ADR-0009](ADR-0009-user-accounts-authentication-and-data-ownership.md), [ADR-0008](ADR-0008-owner-only-first-release-access.md)
- [Platform architecture](../implementation/clickonomics-platform-architecture.md)
- [Clerk integration plan](../implementation/clickonomics-clerk-integration-plan.md) (superseded at platform level; schema and isolation analysis still valid)
- [Auth, accounts and data ownership implementation plan](../implementation/auth-data-ownership-implementation-plan.md)

## Related code changes

None. Documentation only.

## Supersedes / Superseded by

- Supersedes: the self-built magic-link recommendation in the implementation plan (already marked superseded there).
- Superseded by: none
