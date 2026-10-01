# Architecture Decision Records

ADRs preserve significant decisions. They are immutable after acceptance except for status and supersession links.

## Naming

`ADR-NNNN-short-decision-title.md`

Example: `ADR-0001-airtable-and-postgresql-authority.md`

## Required template

```markdown
# ADR-NNNN: Title

- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded | Rejected
- Decision owner:
- Approval:

## Context

## Decision

## Evidence

## Alternatives considered

## Consequences

## Related Project Notes

## Related documentation

## Related code changes

## Supersedes / Superseded by
```

## Rules

- Accepted ADRs are not rewritten to hide old reasoning.
- A changed decision receives a new ADR that supersedes the old one.
- ADRs cannot override the Constitution silently.
- Constitutional changes require explicit amendment and approval.

## Register

| ADR | Title | Status |
|---|---|---|
| [ADR-0001](ADR-0001-postgres-system-of-record-and-airtable-transition.md) | Postgres System of Record and Airtable Transition | Accepted |
| [ADR-0002](ADR-0002-migration-authority.md) | Migration Authority | Accepted |
| [ADR-0003](ADR-0003-app-specific-environment-variables.md) | App-Specific Environment Variables | Accepted |
| [ADR-0004](ADR-0004-analysis-eligibility-and-reference-isolation.md) | Analysis Eligibility and Reference Isolation | Accepted |
| [ADR-0005](ADR-0005-csv-fixtures-and-evidence-policy.md) | CSV Fixtures and Evidence Policy | Accepted |
| [ADR-0006](ADR-0006-neon-postgres-rehearsal-and-release-database.md) | Neon Postgres Rehearsal and Release Database | Superseded by ADR-0010 |
| [ADR-0007](ADR-0007-render-first-hosting-and-domain.md) | Render-First Hosting and Domain | Accepted |
| [ADR-0008](ADR-0008-owner-only-first-release-access.md) | Owner-Only First Release Access | Accepted |
| [ADR-0009](ADR-0009-user-accounts-authentication-and-data-ownership.md) | User Accounts, Authentication, and Data Ownership | Accepted |
| [ADR-0010](ADR-0010-prisma-postgres-operational-database.md) | Prisma Postgres as the Operational Database | Accepted |
| [ADR-0011](ADR-0011-clickonomics-platform-and-clerk-identity.md) | Clickonomics Platform Architecture and Clerk as Identity Provider | Accepted |

ADR-0001 to 0005, 0007 and 0008 were accepted 2026-09-29; ADR-0009 and ADR-0011 on 2026-10-01 (design direction only; implementation is separately approval-gated). They document decisions already made or explicitly requested during Phase 1/1.5 stabilization and repository certification.
