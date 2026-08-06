# Start Here

This is the required entry point for BigShotEspresso contributors and AI assistants.

## Mandatory reading order

1. [Project Constitution](PROJECT_CONSTITUTION.md)
2. [Roadmap](ROADMAP.md)
3. [Repository Certification Audit](REPOSITORY_CERTIFICATION_AUDIT.md)
4. [Live Airtable schema snapshot](airtable/README.md)
5. [Live Airtable drift report](airtable/drift-report-2026-08-06.md)
6. Relevant [Architecture Decision Records](ADR/README.md)
7. [Architecture index](architecture/README.md)
8. Relevant [Research index](RESEARCH/README.md)
9. [Implementation record](implementation/README.md)
10. [Testing standards](testing/README.md)

## Authority

When sources conflict:

1. Constitution
2. Approved ADR
3. Current architecture documentation
4. Dated Project Notes and authoritative CSV exports
5. Approved implementation plan
6. Code

The live Airtable base defines current schema and formula authority. CSV exports preserve dated record evidence. The versioned live-schema snapshot records Airtable metadata without exposing record values.

## Working rules

- Do not invent selectors, formulas, relationships, thresholds, or engine behavior.
- Preserve raw evidence and historical aliases.
- Do not delete meaningful history; supersede it.
- Plan and obtain approval before implementation.
- Limit work to the approved phase.
- Verify every completed task.
- Record decisions, assumptions, unresolved issues, and evidence.

## Repository map

- `docs/` — governance root
- `docs/ADR/` — architectural decisions
- `docs/HISTORY/` — superseded and historical documentation register
- `docs/RESEARCH/` — engine-specific research
- `docs/architecture/` — current architecture documentation
- `docs/implementation/` — implementation plans and completion records
- `docs/prompts/` — reusable agent instructions and prompt provenance
- `docs/testing/` — testing standards and evidence
- `lib/db/` — database schema and migrations
- `lib/api-spec/` — authoritative API contract
- `artifacts/api-server/` — API implementation
- `artifacts/coffee-log/` — application UI

## Current gate

Phase 1.5 passed locally against the June 25 repository state. Phase 2 remains blocked until:

- Live Airtable synchronization is reconciled against the 2026-08-06 schema snapshot.
- The migration is rehearsed against an anonymized production-equivalent PostgreSQL snapshot.
