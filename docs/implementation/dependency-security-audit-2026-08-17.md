# Dependency Security Audit — 2026-08-17

> **Status:** Current dependency audit evidence  
> **Date:** 2026-08-17  
> **Scope:** Release security gate for Coffee Log / BigShotEspresso  
> **Boundary:** Dependency overrides and lockfile refresh only. No application feature logic, schema, migration, Airtable sync, or intelligence-engine changes were made.

## Summary

The release dependency audit initially reported high-severity findings in build/codegen tooling paths.

Targeted dependency overrides were added to clear high-severity findings without broad, unreviewed framework migration.

## Initial Audit Result

Command:

```text
pnpm audit --audit-level high
```

Initial result:

```text
22 vulnerabilities found
Severity: 3 low | 5 moderate | 14 high
```

High-severity packages included:

- `vite`
- `postcss`
- `nanoid`
- `linkify-it`
- `brace-expansion`
- `js-yaml`
- `fast-uri`

Most findings were in development/build/code-generation dependency paths such as Vite and Orval/Typedoc transitive dependencies.

## Changes Made

Targeted dependency overrides were added in `pnpm-workspace.yaml`:

| Package | Patched version |
| --- | --- |
| `vite` | `^7.3.5` catalog floor |
| `brace-expansion` | `5.0.9` |
| `fast-uri` | `3.1.5` |
| `js-yaml` | `4.3.1` |
| `linkify-it` | `5.0.2` |
| `nanoid` | `3.3.18` |
| `postcss` | `8.5.18` |

The lockfile was refreshed after these overrides.

## Current Audit Result

Command:

```text
pnpm audit --audit-level high
```

Current result:

```text
6 vulnerabilities found
Severity: 3 low | 3 moderate
```

Release interpretation:

- High-severity dependency findings are cleared.
- Low/moderate findings remain and should be reviewed before final public release.

## Verification

Passed locally:

- `CI=true pnpm --filter @workspace/api-server typecheck`
- `CI=true pnpm --filter @workspace/coffee-log typecheck`
- `pnpm audit --audit-level high`

Blocked locally:

- `CI=true pnpm run build:render` is still blocked on this Mac by the intentionally excluded optional native package `@rollup/rollup-darwin-arm64`.

Expected external verification:

- GitHub Actions and Render Linux builds should verify production build behavior.

## Remaining Work

Before final release:

1. Review remaining low/moderate dependency findings.
2. Confirm GitHub Actions passes with the updated lockfile.
3. Confirm Render build passes in Linux deployment environment.
4. Re-run dependency audit before release tagging.
