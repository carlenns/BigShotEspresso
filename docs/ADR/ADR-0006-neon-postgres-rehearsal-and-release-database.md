# ADR-0006: Neon Postgres Rehearsal and Release Database

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

BigShotEspresso needs a production-equivalent PostgreSQL target before it can be certified for release.

Local embedded database tests are useful, but they do not prove deployment-ready PostgreSQL behavior. Airtable is currently constrained by account/API limits and should not be the normal production runtime database. Replit may be used as the first app host, but the database should remain portable and PostgreSQL-standard.

The project therefore needs a first external Postgres target for:

- migration rehearsal,
- rollback rehearsal,
- CSV import rehearsal,
- runtime API smoke testing,
- deployment preparation,
- and eventual production data storage.

## Decision

Use Neon Postgres as the first production-equivalent PostgreSQL rehearsal target for Coffee Log.

The intended architecture is:

```text
Replit-hosted app/API
  → Neon Postgres

Airtable / CSV
  → controlled admin/import/sync workflows
  → Neon Postgres
```

Neon should be used first with a disposable rehearsal database or branch. Production use should only follow successful migration, rollback, import, runtime, and security checks.

## Evidence

- The user explicitly selected Neon for the Postgres path.
- Neon provides standard PostgreSQL connection behavior through `DATABASE_URL`.
- Neon supports disposable databases/branches suitable for rehearsal workflows.
- Neon can be connected from Replit without making Replit the database authority.
- The existing repository already treats PostgreSQL as the operational database and Airtable as transitional research/import evidence.

## Alternatives considered

### Replit-managed database as primary authority

Rejected as the primary architectural choice because it would tie the data foundation too closely to the app host.

Replit remains acceptable as the first app host.

### Supabase

Viable alternative. Supabase provides Postgres plus broader platform features such as auth, storage, realtime, and dashboards. Deferred because Coffee Log currently needs a clean Postgres foundation more than a larger backend platform.

### Railway

Viable alternative for simple app/database hosting. Deferred because the current architecture prefers separating app host from database authority and keeping the database decision Postgres-first.

### Render Postgres

Viable traditional managed Postgres option. Deferred because Neon’s branching/disposable workflow is better aligned with rehearsal and migration testing.

### Continue with Airtable as runtime database

Rejected for release architecture because Airtable API limits, plan constraints, and formula/relationship opacity create production risk.

## Consequences

- Release-readiness planning should use Neon as the first production-equivalent database.
- Replit deployment prep should assume Replit runs the app and Neon owns the database.
- `DATABASE_URL` remains the runtime database contract.
- Neon credentials must never be committed or logged.
- Migration and rollback rehearsal must run against a disposable Neon target before release certification.
- Airtable sync must remain admin/import-only and must not become a normal runtime dependency.

## Related Project Notes

- Current offline Airtable exports and dated Project Notes remain evidence until live Airtable metadata is captured.

## Related documentation

- [Postgres Migration Target Model](../architecture/postgres-migration-target-model.md)
- [Neon Postgres Rehearsal Plan](../architecture/neon-postgres-rehearsal-plan.md)
- [Release Candidate Checklist](../implementation/release-candidate-checklist.md)
- [Replit Deployment Prep](../implementation/replit-deployment-prep.md)
- [Airtable Exit Strategy](../architecture/airtable-exit-strategy.md)

## Related code changes

- None. This ADR records an architecture/deployment target decision only.

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
