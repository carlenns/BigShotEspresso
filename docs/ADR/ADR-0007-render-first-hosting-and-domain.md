# ADR-0007: Render-First Hosting and Domain

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

BigShotEspresso no longer needs Replit to be the central hosting assumption. The project is being developed locally with Codex, source-controlled in GitHub, and moving toward Neon Postgres as the database authority.

The user already has a domain and wants a cleaner release path that avoids unnecessary platform confusion.

The application still needs a first production host for the app/API. The host should be easy to connect to GitHub and Neon, support normal environment variables, allow custom domains, and avoid tying the database to the hosting provider.

## Decision

Use Render as the first preferred non-Replit hosting target for the Coffee Log release candidate.

The target architecture is:

```text
Custom domain
  → Render-hosted Coffee Log app/API
    → Neon Postgres

GitHub
  → source control and CI

Airtable / CSV
  → temporary research/import/admin evidence
```

Replit is deferred as an optional development or alternate hosting surface. It is no longer the assumed first release host.

## Evidence

- The user confirmed they already own the domain.
- The user asked whether the whole app can be built without Replit.
- Current development is happening locally with GitHub as the repository source of truth.
- Neon is already selected as the first production-equivalent Postgres target.
- Separating host and database keeps the app portable.

## Alternatives considered

### Replit as first host

Deferred. Replit remains useful, but it is no longer necessary if local Codex development plus GitHub plus Render can cover release needs.

### Vercel as first host

Viable, especially for frontend-heavy apps. Deferred until the current app shape is verified because Coffee Log appears to include a backend/API that may be simpler to deploy as a standard web service.

### Fly.io as first host

Viable and portable, but more operationally technical than needed for the first release candidate.

### Railway as first host

Viable, but current architecture prefers Render plus Neon because it keeps app hosting and database authority clearly separated.

## Consequences

- Release deployment prep should target Render first.
- Domain/DNS setup should point to Render once the app is deployable.
- Neon remains the database authority.
- Replit-specific prep is retained only as optional/deferred guidance.
- The release checklist must be updated to refer to Render deployment prep rather than Replit as the default.
- Secrets must be configured in Render environment variables and never committed.

## Related Project Notes

- None yet.

## Related documentation

- [Neon Postgres Rehearsal Plan](../architecture/neon-postgres-rehearsal-plan.md)
- [Release Candidate Checklist](../implementation/release-candidate-checklist.md)
- [Render Deployment Prep](../implementation/render-deployment-prep.md)
- [Domain Setup Checklist](../implementation/domain-setup-checklist.md)
- [Airtable Exit Strategy](../architecture/airtable-exit-strategy.md)

## Related code changes

- None. This ADR records a hosting/deployment target decision only.

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
