# One-Service Render Implementation Report

> **Status:** Implementation report  
> **Date:** 2026-08-17  
> **Scope:** Minimal production static-serving support for one Render web service  
> **Boundary:** No database schema, migration, OpenAPI, Airtable sync, or intelligence-engine changes were made.

## Summary

The API server now supports the simpler one-service Render deployment path.

In production mode, the API server will:

1. continue serving API routes under `/api`,
2. serve the built Coffee Log frontend assets,
3. return the frontend `index.html` for non-API routes so client-side routing works,
4. and warn rather than crash if the frontend build is not present.

## Files Changed

| File | Change |
| --- | --- |
| `artifacts/api-server/src/app.ts` | Added production static asset serving and SPA fallback for non-API routes |
| `artifacts/api-server/src/static-serving.test.ts` | Added test for production frontend fallback and `/api/healthz` preservation |
| `artifacts/coffee-log/vite.config.ts` | Removed Replit-only requirement for `PORT` and `BASE_PATH` during builds by adding safe defaults |
| `package.json` | Added candidate Render build/start scripts |
| `render.yaml` | Added starter Render Blueprint with secret values omitted |
| `docs/implementation/render-deployment-prep.md` | Updated Render deployment docs to reflect one-service deployment direction |
| `docs/implementation/release-candidate-checklist.md` | Updated release checklist to record one integrated Render service |

## Deployment Behavior

Default production frontend build location:

```text
artifacts/coffee-log/dist/public
```

Override environment variable:

```text
COFFEELOG_STATIC_DIR
```

The override is intended for hosts where build artifacts are copied to a different location.

## Safety Behavior

If the frontend build is missing in production:

- the API server logs a warning,
- API routes still run,
- and the server does not crash solely because static assets are missing.

This allows API-only smoke checks to continue while making missing frontend builds visible in logs.

## Verification

Completed locally:

- API typecheck passed.
- Coffee Log frontend typecheck passed.
- Render build script was added and invoked.

Blocked locally:

- `pnpm run build:render` is blocked locally by missing optional native package `@rollup/rollup-darwin-arm64`.
- API build remains blocked separately by missing optional native package `@esbuild/darwin-arm64` if invoked directly.
- Full API test run is blocked by the same missing local esbuild native package used by `tsx`.

These are local dependency-environment blockers. They should be verified in GitHub Actions after push, where the Linux CI environment has previously passed build and test checks.

## Required CI Verification

After push, confirm GitHub Actions passes:

- tracked-file secret scan,
- workspace typecheck,
- Phase 1.5 API/integration tests,
- API production build,
- Coffee Log frontend production build.

## Remaining Deployment Work

Before Render deployment:

1. Verify `pnpm run build:render` builds both frontend and API.
2. Verify `pnpm run start:render` starts the API server.
3. Verify frontend assets exist before API startup.
4. Run Neon rehearsal.
5. Configure Render environment variables.
6. Run Render smoke test.
7. Configure custom domain after Render URL passes.
