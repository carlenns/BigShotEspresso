# ADR-0001: Postgres System of Record and Airtable Transition

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

BigShotEspresso began with Airtable as the practical research, inspection, and source-evidence environment. Airtable remains useful for seeing missing fields, workflow gaps, selector issues, and modeling mistakes while the product is still being discovered.

For a live scalable application, Airtable should not be the runtime dependency for normal user-facing workflows. The application already has a PostgreSQL-backed API foundation and must remain portable across hosts such as Replit, Neon, Supabase, Railway, Render, Fly, or another PostgreSQL-capable platform.

## Decision

PostgreSQL is the intended production system of record for BigShotEspresso application data.

Airtable remains a transitional research/admin/source-evidence system and an import/synchronization source, but normal production app behavior must be designed to run from PostgreSQL.

Runtime app code should depend on `DATABASE_URL` for PostgreSQL and should avoid live Airtable dependencies outside explicit sync/import/admin workflows.

## Evidence

- Phase 1 and Phase 1.5 established typed PostgreSQL structures, migrations, import tests, and API contracts.
- CI now verifies CSV import behavior using committed fixtures.
- Airtable API availability is currently blocked by free-account limits, demonstrating why live Airtable cannot be a production runtime dependency.
- The user explicitly intends to move away from Airtable for launch while preserving its value during discovery.

## Alternatives considered

### Keep Airtable as production runtime source

Rejected for production scale because it creates API-limit, pricing, performance, governance, and portability risks.

### Use Replit-specific database as the long-term source

Rejected as an architecture decision because it could create hosting lock-in. Replit may host the app, but the database contract should remain standard PostgreSQL via `DATABASE_URL`.

### Move immediately away from Airtable

Rejected for the current phase because Airtable still contains useful research evidence, field semantics, and debugging visibility.

## Consequences

- Future feature implementation should write/read PostgreSQL first.
- Airtable sync/import must be isolated and explicitly named.
- Airtable retirement must be planned before public launch or paid scale.
- Admin/debug screens must replace the inspection value currently provided by Airtable.
- Production migration rehearsal remains mandatory before Phase 2 or deployment certification.

## Related Project Notes

- Dated Project Notes and CSV exports remain source evidence until explicitly replaced by accepted ADRs and implemented Postgres/admin workflows.

## Related documentation

- [Repository Certification Audit](../REPOSITORY_CERTIFICATION_AUDIT.md)
- [Airtable Exit Strategy](../architecture/airtable-exit-strategy.md)
- [Table Relationships](../table-relationships.md)
- [Field Type Map](../field-type-map.md)

## Related code changes

- Existing PostgreSQL schema and migration foundation.
- Existing Airtable synchronization routes and CSV import routes.

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
