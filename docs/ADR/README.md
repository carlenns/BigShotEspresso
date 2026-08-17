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
| [ADR-0001](ADR-0001-postgres-system-of-record-and-airtable-transition.md) | Postgres System of Record and Airtable Transition | Proposed |
| [ADR-0002](ADR-0002-migration-authority.md) | Migration Authority | Proposed |
| [ADR-0003](ADR-0003-app-specific-environment-variables.md) | App-Specific Environment Variables | Proposed |
| [ADR-0004](ADR-0004-analysis-eligibility-and-reference-isolation.md) | Analysis Eligibility and Reference Isolation | Proposed |
| [ADR-0005](ADR-0005-csv-fixtures-and-evidence-policy.md) | CSV Fixtures and Evidence Policy | Proposed |

These ADRs are drafts until reviewed and accepted. They document decisions already made or explicitly requested during Phase 1/1.5 stabilization and repository certification.
