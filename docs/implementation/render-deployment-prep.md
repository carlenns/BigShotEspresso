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

Required for Postgres runtime:

| Variable name | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon production or staging database connection |

Required only if Airtable sync/import is enabled:

| Variable name | Purpose |
| --- | --- |
| `COFFEELOG_AIRTABLE_API_KEY` | Coffee Log Airtable token |
| `COFFEELOG_AIRTABLE_BASE_ID` | Coffee Log Airtable base |

Do not use broad/shared Airtable secrets for Coffee Log release if app-specific secrets are available.

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

- Is Coffee Log deployed as one web service or split frontend/API services?
- What is the production build command?
- What is the production start command?
- Which package/workspace is the deploy root?
- Does the app require a static frontend build plus API server?
- Does the server listen on Render-provided `PORT`?
- Are migrations run manually before deploy or as a deploy step?

Do not guess these commands. Verify from repository scripts before creating the service.

## Current Repository Script Evidence

Current scripts indicate a split app/API shape:

| Package | Build command | Start/serve command | Notes |
| --- | --- | --- | --- |
| workspace root | `pnpm run build` | none | Runs typecheck and package builds |
| `@workspace/api-server` | `pnpm --filter @workspace/api-server build` | `pnpm --filter @workspace/api-server start` | Express API server; requires `PORT` |
| `@workspace/coffee-log` | `pnpm --filter @workspace/coffee-log build` | `pnpm --filter @workspace/coffee-log serve` | Vite frontend; requires `PORT` and `BASE_PATH` |

Current deployment implication:

- The API server and frontend may need separate Render services, or
- the API server may need an approved static-file serving integration before a single-service deployment.

Do not implement that integration without an approved code plan.

## Candidate Render Shapes

### Option A — Two Render services

```text
Render static/frontend service
  → Coffee Log frontend

Render web service
  → Coffee Log API
    → Neon Postgres
```

Benefits:

- Matches current split package shape.
- Avoids changing API server to serve frontend assets.

Risks:

- Requires frontend API base URL configuration.
- Requires CORS/domain review.

### Option B — One Render web service

```text
Render web service
  → API server
  → serves built frontend assets
  → Neon Postgres
```

Benefits:

- Simpler domain and cookie/security model.
- One service to deploy.

Risks:

- Requires app/API integration work if not already present.
- Must be implemented deliberately and tested.

Recommended next step:

- Inspect current frontend API-base configuration and API server static-serving support before selecting Option A or Option B.

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
