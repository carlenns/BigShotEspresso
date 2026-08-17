# Render Deployment Prep

> **Status:** Draft deployment checklist  
> **Created:** 2026-08-17  
> **Target host:** Render  
> **Database target:** Neon Postgres  
> **Boundary:** Documentation only. This does not create a Render service, change DNS, modify app code, configure secrets, or deploy.

## Purpose

This checklist prepares Coffee Log for a Render-hosted first release while keeping Neon as the production database authority.

Render should run the app/API. Neon should hold the production Postgres data.

## Target Release Shape

```text
Custom domain
  → Render-hosted Coffee Log app/API
    → Neon Postgres

GitHub
  → source control and CI

Optional admin/import path:
  Airtable / CSV
    → controlled import/sync
    → Neon Postgres
```

## Deployment Principles

1. Do not put secrets in source.
2. Do not put secrets in Render build logs.
3. Do not use Airtable as the production runtime database.
4. Do not run destructive admin actions against production without backup.
5. Keep the app database-portable through `DATABASE_URL`.
6. Use GitHub as the source of truth for deployment.

## Required Render Environment Variables

See also:

- [Render Environment Checklist](render-environment-checklist.md)

Required for Postgres runtime:

| Variable name | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon production or staging database connection |
| `NODE_ENV` | Set to `production` |
| `BASE_PATH` | Set to `/` unless the app is hosted under a path prefix |
| `ADMIN_API_TOKEN` | Required for production bulk/admin actions |

Required only if Airtable sync/import is enabled:

| Variable name | Purpose |
| --- | --- |
| `COFFEELOG_AIRTABLE_API_KEY` | Coffee Log Airtable token |
| `COFFEELOG_AIRTABLE_BASE_ID` | Coffee Log Airtable base |

Optional:

| Variable name | Purpose |
| --- | --- |
| `CORS_ORIGIN` | Comma-separated allowed browser origins if cross-origin API access is intentionally needed |

Do not use broad/shared Airtable secrets for Coffee Log release if app-specific secrets are available.

## Render Blueprint

The repository includes a starter Render Blueprint:

```text
render.yaml
```

Current Blueprint intent:

- one Node web service,
- free plan for first setup/rehearsal,
- `pnpm run build:render` as the build command,
- `pnpm run start:render` as the start command,
- `NODE_ENV=production`,
- `BASE_PATH=/`,
- `DATABASE_URL` declared with `sync: false` so Render prompts for the secret value instead of committing it.
- `ADMIN_API_TOKEN` declared with `sync: false` so Render prompts for the secret value instead of committing it.

Production CORS defaults to same-origin operation. Do not set `CORS_ORIGIN` unless the frontend and API are deliberately split across origins.

Production bulk/admin actions are unavailable unless `ADMIN_API_TOKEN` is configured and requests include the expected `x-admin-token` header.

Airtable secrets are intentionally not included in the Blueprint yet. Add them later only if Airtable sync is included in the release scope.

## Pre-Deployment Requirements

Before deploying to Render:

- CI passes on GitHub.
- Neon rehearsal report exists.
- Release security checklist passes or has accepted exceptions.
- Neon staging or production target exists.
- `DATABASE_URL` is configured in Render environment variables.
- App build/start commands are verified locally or in CI.
- Admin/destructive routes are protected or excluded.
- Custom domain DNS plan is ready.

## Environment Separation

Use separate database targets:

| Environment | Purpose |
| --- | --- |
| Local | development and safe testing |
| Neon rehearsal | disposable migration/import rehearsal |
| Neon staging | Render deployment smoke test |
| Neon production | real release data |

Do not point Render production at the rehearsal database.

## Render Service Questions To Resolve

Before creating the Render service, verify:

- Which package/workspace is the deploy root?
- Does the server listen on Render-provided `PORT`?
- Are migrations run manually before deploy or as a deploy step?

The repository now provides explicit Render candidate scripts:

```text
Build command: pnpm run build:render
Start command: pnpm run start:render
```

These commands still require CI/Render verification before release.

## Current Repository Script Evidence

Current scripts indicate a split app/API source shape with an approved one-service release direction:

| Package | Build command | Start/serve command | Notes |
| --- | --- | --- | --- |
| workspace root | `pnpm run build` | none | Runs typecheck and package builds |
| workspace root | `pnpm run build:render` | `pnpm run start:render` | Candidate one-service Render commands |
| `@workspace/api-server` | `pnpm --filter @workspace/api-server build` | `pnpm --filter @workspace/api-server start` | Express API server; requires `PORT`; serves built frontend in production |
| `@workspace/coffee-log` | `pnpm --filter @workspace/coffee-log build` | `pnpm --filter @workspace/coffee-log serve` | Vite frontend; defaults `BASE_PATH` to `/` and dev/preview `PORT` to `3000` if missing |

Current deployment implication:

- The first Render release should use one web service.
- The frontend must be built before the API server starts.
- In production, the API server serves the built frontend assets while preserving `/api` routes.

## Selected Render Shape

```text
Render web service
  → API server
  → serves built frontend assets
  → Neon Postgres
```

Benefits:

- Simpler domain and cookie/security model.
- One service to deploy.
- Same-origin frontend API calls work with existing `/api/...` usage.

Risks:

- Requires the frontend build artifact to exist before the API starts.
- Requires Render build/start commands to build both packages correctly.

Recommended next step:

- Verify the one-service build/start commands in CI or a Render preview environment.

## Deployment Smoke Test

After deployment, verify:

- App loads from Render URL.
- Health route works.
- API can connect to Neon.
- Shot list loads.
- Dashboard loads.
- No secret values appear in browser, logs, or error messages.
- Build artifacts do not expose server-only variables.
- Import/sync/admin screens are not publicly dangerous.
- Custom domain points to the expected Render service after DNS is configured.

## Airtable Sync Position

Preferred first release:

- Render app uses Neon/Postgres for runtime.
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
- Follow the [Neon Backup and Restore Runbook](neon-backup-restore-runbook.md).

## Release Blockers

Deployment should stop if:

- Render environment variables are missing.
- `DATABASE_URL` points to the wrong database.
- Any credential is found in source or logs.
- Admin/destructive routes are exposed without protection.
- Migration status is unknown.
- Neon rehearsal has not passed.
- App cannot start from clean deployment.
- Domain DNS points to the wrong service.

## Current Recommendation

Use Render as the first live hosting surface only after Neon rehearsal passes.

Keep the architecture portable:

- Render runs the app/API.
- Neon owns Postgres.
- GitHub owns source and CI.
- Airtable is research/import/admin evidence.
- The custom domain points to the Render-hosted app.
