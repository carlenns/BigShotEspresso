# ADR-0004: Analysis Eligibility and Reference Isolation

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

Coffee Log contains operational records, failed shots, boundary shots, import evidence, and analytical records. These records should remain visible and preserved, but not every record is valid for performance analytics.

Earlier behavior allowed analytical defects, including queries that ignored `Include in Analysis` and reference comparison fallbacks that could cross bag boundaries.

## Decision

`Include in Analysis` is the central analytical eligibility control.

Analytical rollups, insights, similar-shot queries, reference-shot queries, and dashboard performance comparisons must use eligible shots only.

Operational logs, imports, sync, audit views, and raw counts may remain intentionally unfiltered when their purpose is administrative or evidentiary.

Current Shot vs Reference must compare the current active-Bag shot against eligible, manually marked Reference Shots from the same active Bag. Same-bean, global-reference, top-rated, and `Dialed In` inferred fallbacks are not allowed in that component.

## Evidence

- Phase 1.5 tests verify shared eligibility behavior for local and Airtable-imported shots.
- Phase 1.5 tests verify Current Shot vs Reference active-Bag isolation.
- Documentation requires Reference Shot to be explicit/manual, not inferred from rating or status.

## Alternatives considered

### Filter all views by Include in Analysis

Rejected because operational/audit views need to show excluded records.

### Use same-bean or global fallback references

Rejected for Current Shot vs Reference because it creates misleading cross-bag comparison.

### Infer Reference Shot from `Dialed In`

Rejected because selector status is not reference authority.

## Consequences

- Analytics queries should use a shared eligible-shot condition.
- Components must distinguish analytical counts from raw operational counts.
- Cross-bag comparison can be added later only as a separately named analytic.

## Related Project Notes

- Phase 1 and Phase 1.5 implementation records.

## Related documentation

- [Replit Audit Report](../replit-audit-report.md)
- [Intelligence Engine Map](../intelligence-engine-map.md)
- [Repository Certification Audit](../REPOSITORY_CERTIFICATION_AUDIT.md)

## Related code changes

- `artifacts/api-server/src/lib/shot-eligibility.ts`
- `artifacts/api-server/src/analytics.integration.test.ts`
- Dashboard and analytics routes.

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
