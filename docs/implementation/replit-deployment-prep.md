# Replit Deployment Prep

> **Status:** Draft deployment checklist  
> **Created:** 2026-08-17  
> **Target host:** Replit for first live deployment  
> **Database target:** Neon Postgres  
> **Boundary:** Documentation only. This does not modify Replit configuration, secrets, app code, schemas, APIs, or migrations.

## Purpose

This checklist prepares Coffee Log for a Replit-hosted first release while keeping Neon as the production database authority.

Replit should run the app. Neon should hold the production Postgres data.

## Target Release Shape

```text
User browser
  → Replit-hosted Coffee Log app/API
    → Neon Postgres

Optional admin/import path:
  Airtable / CSV
    → controlled import/sync
    → Neon Postgres
```

## Deployment Principles

1. Do not put secrets in source.
2. Do not put secrets in `.replit`.
3. Do not use Airtable as the production runtime database.
4. Do not run destructive admin actions against production without backup.
5. Keep Replit deployable but database-portable.

## Required Replit Secrets

Required for Postgres runtime:

| Secret name | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon production or staging database connection |

Required only if Airtable sync/import is enabled:

| Secret name | Purpose |
| --- | --- |
| `COFFEELOG_AIRTABLE_API_KEY` | Coffee Log Airtable token |
| `COFFEELOG_AIRTABLE_BASE_ID` | Coffee Log Airtable base |

Do not use broad/shared Airtable secrets for Coffee Log release if app-specific secrets are available.

## Pre-Deployment Requirements

Before deploying to Replit:

- CI passes on GitHub.
- Neon rehearsal report exists.
- Release security checklist passes or has accepted exceptions.
- Production/staging Neon target exists.
- `DATABASE_URL` is configured in Replit secrets.
- `.replit` contains no credential values.
- App build/start command is known.
- Admin/destructive routes are protected or excluded.

## Environment Separation

Use separate database targets:

| Environment | Purpose |
| --- | --- |
| Local | development and safe testing |
| Neon rehearsal | disposable migration/import rehearsal |
| Neon staging | deployment smoke test |
| Neon production | real release data |

Do not point Replit production at the rehearsal database.

## Deployment Smoke Test

After deployment, verify:

- App loads.
- Health route works.
- API can connect to Neon.
- Shot list loads.
- Dashboard loads.
- No secret values appear in browser, logs, or error messages.
- Build artifacts do not expose server-only variables.
- Import/sync/admin screens are not publicly dangerous.

## Airtable Sync Position

Preferred first release:

- Replit app uses Neon/Postgres for runtime.
- Airtable sync is admin-only and optional.
- If Airtable API remains blocked or unverified, release can proceed only if live Airtable sync is not required for normal operation.

Do not:

- Make the deployed app depend on live Airtable API for every normal page load.
- Run live Airtable sync before metadata verification and dry-run evidence.

## Backup and Recovery

Before real release data is entered:

- Document how to export Neon data.
- Document how to restore or recreate the database.
- Preserve CSV/Airtable evidence separately.
- Confirm how to rotate Neon credentials.

## Release Blockers

Deployment should stop if:

- Replit secrets are missing.
- `DATABASE_URL` points to the wrong database.
- Any credential is found in source or logs.
- Admin/destructive routes are exposed without protection.
- Migration status is unknown.
- Neon rehearsal has not passed.
- App cannot start from clean deployment.

## Current Recommendation

Use Replit as the first live hosting surface only after Neon rehearsal passes.

Keep the architecture portable:

- Replit runs the app.
- Neon owns Postgres.
- Airtable is research/import/admin evidence.
- The repository remains the source of truth for application behavior.
