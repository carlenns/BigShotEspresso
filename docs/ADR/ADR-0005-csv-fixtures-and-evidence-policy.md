# ADR-0005: CSV Fixtures and Evidence Policy

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

Phase 1.5 tests originally depended on CSV files stored outside the Git repository. That worked locally but failed in GitHub Actions because CI only checks out repository contents.

CSV exports remain important source evidence, but not every source export should automatically become a committed application artifact. The project needs a distinction between full authoritative evidence and minimal committed fixtures used for repeatable tests.

## Decision

Committed CSV fixtures may be stored under package-specific test fixture directories when required for CI.

These fixtures are for repeatable automated verification. They do not replace Airtable, dated Project Notes, or full source exports as research authority.

Full source evidence should receive a future manifest/checksum policy before being treated as a complete repository evidence archive.

## Evidence

- GitHub Actions failed when tests referenced `../CSV Files/...` outside the repository.
- Adding committed fixtures under `artifacts/api-server/test-fixtures/csv/` allowed the latest visible CI run to pass.
- The Repository Certification Audit records source-data provenance as partial until a full evidence-storage policy is adopted.

## Alternatives considered

### Keep tests dependent on parent workspace files

Rejected because CI and fresh clones cannot reproduce the tests.

### Commit every source export immediately

Deferred until privacy, provenance, checksum, and evidence-retention policy is approved.

### Remove CSV import tests from CI

Rejected because import behavior is foundational to the Airtable-to-Postgres transition.

## Consequences

- Tests should use repository-local fixtures.
- Fixture updates must be intentional and reviewable.
- Full evidence policy remains a certification follow-up.

## Related Project Notes

- Phase 1.5 CSV import verification.

## Related documentation

- [Repository Certification Audit](../REPOSITORY_CERTIFICATION_AUDIT.md)
- [CSV Data Dictionary](../csv-data-dictionary.md)

## Related code changes

- `artifacts/api-server/src/csv-import.integration.test.ts`
- `artifacts/api-server/test-fixtures/csv/`

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
