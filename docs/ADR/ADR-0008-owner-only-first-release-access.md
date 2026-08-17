# ADR-0008: Owner-Only First Release Access

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

Coffee Log is moving toward a Render-hosted, Neon-backed first release candidate.

The application already has useful operational workflows, CSV import, Airtable sync support, Postgres persistence, and dashboard analytics. It does not yet have a complete user authentication and authorization system for multiple public users.

Phase 1.5 and release-prep work protected dangerous bulk/admin actions in production with `ADMIN_API_TOKEN`, including Airtable clear/sync, CSV imports, Hopper imports, baseline imports, and selector seeding.

Normal application write routes still exist for owner workflows such as creating and editing shots, beans, bags, equipment, settings, and selectors. Locking all of those behind the admin-token middleware without a real UI login flow would protect the deployment, but it would also break normal app usage.

## Decision

The first release candidate is owner-only, not public multi-user software.

Until a deliberate authentication model is implemented:

- the app must not be marketed or treated as a public self-serve product,
- deployment access should be limited to the owner or trusted testers,
- dangerous bulk/admin routes remain protected by `ADMIN_API_TOKEN`,
- ordinary app write routes may remain usable for owner workflows,
- public-user release is blocked until authentication, authorization, and data ownership rules are designed and implemented.

This decision keeps Coffee Log useful for real owner testing while avoiding the false claim that it is already safe as a public SaaS app.

## Evidence

- The release path now targets Render plus Neon.
- Production admin/bulk routes are protected separately.
- The current app does not contain a full login/session/user-ownership model.
- Coffee Log still depends on owner-curated Airtable/CSV/Postgres workflows.
- The user wants the app secure, but also wants to continue logging and testing without unnecessary platform churn.

## Alternatives considered

### Make all write routes admin-token protected immediately

Rejected for the first release candidate because the frontend does not currently provide an owner login/token workflow for normal daily use. This would likely make normal shot logging and editing unusable.

### Launch publicly without authentication

Rejected. Public write access without identity, ownership, or authorization would be unsafe.

### Implement full authentication before any owner deployment

Deferred. It may be required before public release, but it is not required to continue owner-only release rehearsal, Neon migration testing, and private operational use.

## Consequences

- Render deployment can proceed as a private/owner release candidate once Neon rehearsal passes.
- Public launch remains blocked until access control is deliberately implemented.
- Release checklists must distinguish owner-only deployment from public release.
- Security reviews must continue to treat write routes as a known risk if the deployment is exposed broadly.

## Related Project Notes

- Phase 1.5 Foundation Stabilization
- Render-first deployment decision
- Release security hardening checklist

## Related documentation

- [Release Security Hardening Checklist](../implementation/release-security-hardening-checklist.md)
- [Release Candidate Checklist](../implementation/release-candidate-checklist.md)
- [Render Deployment Prep](../implementation/render-deployment-prep.md)

## Related code changes

- `artifacts/api-server/src/middlewares/admin-auth.ts`
- `artifacts/api-server/src/app.ts`

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
