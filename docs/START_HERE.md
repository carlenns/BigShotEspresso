# Start Here

This is the required entry point for BigShotEspresso contributors and AI assistants.

## Mandatory reading order

1. [Project Constitution](PROJECT_CONSTITUTION.md)
2. [Roadmap](ROADMAP.md)
3. [Repository Certification Audit](REPOSITORY_CERTIFICATION_AUDIT.md)
4. Relevant [Architecture Decision Records](ADR/README.md)
5. [Architecture index](architecture/README.md)
6. Relevant [Research index](RESEARCH/README.md)
7. [Implementation record](implementation/README.md)
8. [Testing standards](testing/README.md)

## Product guidance

- [ChatGPT Integration and Onboarding Strategy](product/BSE_CHATGPT_INTEGRATION_AND_ONBOARDING.md) — product boundaries, scientific logging guidance, cost controls, privacy guardrails, and current-versus-future scope. This is guidance only and does not override the Constitution, roadmap, ADRs, or phase gates.
- [Subscriber Feasibility Study](product/BSE_SUBSCRIBER_FEASIBILITY.md) — the US$10/month pricing hypothesis, founder offer, historical 100–10,000-user economics, downside case, cost omissions, and launch validation gates.
- [Airtable Exit Strategy](architecture/airtable-exit-strategy.md) — transition from Airtable-backed discovery to Postgres-first production.
- [Offline Airtable Export Audit](architecture/offline-airtable-export-audit.md) — current CSV export inventory, checksums, row counts, and offline verification limits while live Airtable API access is blocked.

## Authority

When sources conflict:

1. Constitution
2. Approved ADR
3. Current architecture documentation
4. Dated Project Notes and authoritative CSV exports
5. Approved implementation plan
6. Code

CSV exports define current research data evidence. Airtable metadata and formulas are required where exports do not expose field configuration or calculation rules.

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
- `docs/product/` — product strategy and onboarding guidance subordinate to project governance
- `docs/testing/` — testing standards and evidence
- `lib/db/` — database schema and migrations
- `lib/api-spec/` — authoritative API contract
- `artifacts/api-server/` — API implementation
- `artifacts/coffee-log/` — application UI

## Current gate

Phase 1.5 passes locally. Phase 2 remains blocked until:

- Live Airtable synchronization is reconciled.
- The migration is rehearsed against an anonymized production-equivalent PostgreSQL snapshot.
- Stale operational documentation is corrected.
- First ADRs are accepted or explicitly revised.
