# Render Environment Checklist

> **Status:** Draft setup checklist  
> **Created:** 2026-08-17  
> **Scope:** Render environment variables and owner-only deployment settings for Coffee Log  
> **Boundary:** Documentation only. This does not create a Render service, configure secrets, deploy, or change application code.

## Purpose

This checklist is the practical setup reference for Render.

Use it when creating or reviewing the Render web service so Coffee Log does not accidentally deploy with missing secrets, wrong database targets, or public-launch assumptions.

## Required Service Shape

Use one Render web service:

```text
Render web service
  → builds Coffee Log frontend
  → builds API server
  → API server serves frontend in production
  → connects to Neon through DATABASE_URL
```

Repository file:

```text
render.yaml
```

Expected commands:

| Setting | Value |
| --- | --- |
| Build command | `pnpm install --frozen-lockfile && pnpm run build:render` |
| Start command | `pnpm run start:render` |
| Runtime | Node |
| Service type | Web service |

## Required Environment Variables

| Variable | Required? | Where value comes from | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | Render Blueprint/static value | Must be `production` |
| `BASE_PATH` | Yes | Render Blueprint/static value | Use `/` for root-domain deployment |
| `DATABASE_URL` | Yes | Neon | Secret. Do not commit or paste into docs |
| `ADMIN_API_TOKEN` | Yes | Generated owner secret | Secret. Required for production bulk/admin routes |

## Optional Environment Variables

| Variable | Use only when | Notes |
| --- | --- | --- |
| `COFFEELOG_AIRTABLE_API_KEY` | Airtable sync is included | Prefer app-specific Coffee Log token |
| `COFFEELOG_AIRTABLE_BASE_ID` | Airtable sync is included | Prefer Coffee Log base only |
| `CORS_ORIGIN` | Frontend and API are intentionally split across origins | Leave unset for one-service same-origin Render deployment |
| `LOG_LEVEL` | Debugging deployment issues | Do not use verbose logs forever in production |
| `COFFEELOG_STATIC_DIR` | Render build path differs unexpectedly | Usually not needed |

## Variables Render Provides

Render should provide `PORT` for the running web service.

Do not invent a local `PORT` value in the Blueprint unless Render documentation or runtime evidence requires it.

## Owner-Only Release Settings

For the first release candidate:

- Treat the deployment as private/owner-only.
- Do not publish it as a public self-serve app.
- Do not add public signup/subscriber claims.
- Share the URL only with the owner or trusted testers.
- Keep `ADMIN_API_TOKEN` private.

Public launch remains blocked until authentication, authorization, user ownership, and data isolation exist.

## Pre-Deploy Check

Before clicking deploy:

- CI is green on `main`.
- Render Blueprint has no secret values.
- Neon target is disposable/staging unless this is an approved production release.
- `DATABASE_URL` is set in Render environment variables.
- `ADMIN_API_TOKEN` is set in Render environment variables.
- Airtable variables are omitted unless sync is in scope.
- `CORS_ORIGIN` is omitted for one-service deployment.
- Backup/restore runbook exists.
- Owner-only access decision is understood.

## Post-Deploy Check

After deploy:

- Render build succeeds.
- Render start succeeds.
- App URL opens.
- `/api/healthz` returns healthy status.
- Nested frontend routes refresh correctly.
- Browser console has no obvious startup errors.
- Admin/bulk route without token is blocked.
- No secret values appear in browser, logs, or error pages.

## Stop Conditions

Stop and fix before continuing if:

- `DATABASE_URL` points to the wrong database.
- `ADMIN_API_TOKEN` is missing in production.
- Render logs print a secret value.
- The frontend cannot load.
- API health fails.
- Protected bulk/admin routes are reachable without token.
- The deployment is being treated as public before authentication exists.

## Related Documentation

- [Render Deployment Prep](render-deployment-prep.md)
- [Owner-Only Release Smoke Test](owner-only-release-smoke-test.md)
- [Route Exposure Audit](route-exposure-audit.md)
- [Neon Backup and Restore Runbook](neon-backup-restore-runbook.md)
- [ADR-0008: Owner-Only First Release Access](../ADR/ADR-0008-owner-only-first-release-access.md)
