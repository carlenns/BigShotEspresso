# Testing and Certification Standards

## Required verification

Changes should be verified in proportion to risk:

- Documentation: structure, links, authority, provenance, and contradiction audit.
- Schema: forward migration, repeat application, rollback, and data comparison.
- CSV/Airtable: row counts, fields, nulls, relationships, provenance, and repeat import.
- API: OpenAPI generation, request validation, response shape, and compatibility.
- Analytics: eligibility and scope fixtures.
- UI: typecheck, production build, and relevant interaction/browser checks.

## Current commands

```sh
pnpm test:phase1.5
pnpm run typecheck
PORT=3000 BASE_PATH=/ pnpm run build
pnpm --filter @workspace/api-spec codegen
```

## Current evidence

Phase 1.5 locally reports:

- 16 tests passed.
- Workspace typecheck passed.
- OpenAPI generation passed.
- Production builds passed with existing source-map and bundle-size warnings.

See [completed-tasks.md](../completed-tasks.md).

## External certification gates

- Live Airtable dry synchronization.
- Production-equivalent PostgreSQL migration/rollback rehearsal.
- CI execution of the stabilization suite.

Local embedded-database tests do not replace deployment rehearsal.
