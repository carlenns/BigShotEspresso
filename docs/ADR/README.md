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

No numbered ADRs have been formally adopted yet. Existing Phase 1 and Phase 1.5 decisions should be converted into ADRs before further architecture expansion.
