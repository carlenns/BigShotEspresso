# ADR-0003: App-Specific Environment Variables

- Date: 2026-08-17
- Status: Proposed
- Decision owner: Carl Enns
- Approval: Pending

## Context

Generic secret names such as `AIRTABLE_API_KEY` are common in examples and SDKs, but they become ambiguous when the same account or secret area contains multiple apps such as Coffee Log, IATSE, dashboards, or future services.

An Airtable Personal Access Token may be scoped to one base. If a Coffee Log-scoped token is stored under a generic name, it may be mistaken for a general Airtable credential.

## Decision

Coffee Log should prefer app-specific Airtable environment variables:

```text
COFFEELOG_AIRTABLE_API_KEY
COFFEELOG_AIRTABLE_BASE_ID
```

Legacy fallbacks may remain temporarily:

```text
AIRTABLE_API_KEY
AIRTABLE_BASE_ID
```

Credential values must never be committed to `.replit`, source code, documentation, tests, logs, or generated output.

## Evidence

- Security cleanup removed a hardcoded Airtable token from `.replit` and sanitized reachable Git history.
- The user identified confusion caused by generic environment variable names across different software projects.
- A test verifies Coffee Log-specific variables take precedence over legacy variables.

## Alternatives considered

### Keep only generic names

Rejected for long-term clarity because it encourages cross-app confusion.

### Use only prefixed names immediately

Deferred because temporary fallback reduces transition risk.

## Consequences

- UI/status messages should recommend `COFFEELOG_*` names.
- Legacy names should be treated as compatibility, not preferred documentation.
- Future app-specific integrations should use similarly explicit names.

## Related Project Notes

- Security cleanup and repository certification work.

## Related documentation

- [Repository Certification Audit](../REPOSITORY_CERTIFICATION_AUDIT.md)

## Related code changes

- `artifacts/api-server/src/lib/airtable-config.ts`
- `artifacts/api-server/src/api-contract.test.ts`
- `artifacts/coffee-log/src/pages/Settings.tsx`
- `artifacts/coffee-log/src/pages/ImportAudit.tsx`

## Supersedes / Superseded by

- Supersedes: none
- Superseded by: none
