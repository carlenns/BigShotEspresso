# ADR-0002: Migration Authority

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

The repository includes Drizzle schema definitions and explicit SQL migration files. Schema-push commands are convenient during development, but production data requires reviewed, reversible migration steps and evidence that migrations preserve historical Coffee Log data.

Phase 1.5 added migration tests for apply, repeat, rollback, and conflict detection. Production-equivalent PostgreSQL rehearsal remains pending.

## Decision

Reviewed SQL migrations are the authority for durable schema changes.

Schema push is a development convenience only. It must not be treated as production migration authority unless a later ADR explicitly narrows and approves that use.

Before Phase 2 or deployment certification, migrations must be rehearsed against a production-equivalent PostgreSQL database or anonymized snapshot.

## Evidence

- Phase 1.5 migration tests verify the Flow Time / Scale Time migration path and conflict detection.
- The Repository Certification Audit identifies production-equivalent PostgreSQL rehearsal as a blocker.
- The app is intended to scale on standard PostgreSQL, making migration discipline critical.

## Alternatives considered

### Use schema push as the primary workflow

Rejected for production because it weakens reviewability, rollback planning, and historical-data preservation.

### Delay migration discipline until launch

Rejected because intelligence engines will depend on stable field semantics and historical data.

## Consequences

- New schema changes require explicit migration files.
- Migration rollback or reversal strategy must be documented.
- CI should continue to verify migration behavior where practical.
- Production-equivalent rehearsal must be recorded before certification advances.

## Related Project Notes

- Phase 1 and Phase 1.5 implementation records.

## Related documentation

- [Repository Certification Audit](../REPOSITORY_CERTIFICATION_AUDIT.md)
- [Testing standards](../testing/README.md)

## Related code changes

- `lib/db/migrations/`
- `artifacts/api-server/src/migration.integration.test.ts`

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
