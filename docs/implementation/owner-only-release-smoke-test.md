# Owner-Only Release Smoke Test

> **Status:** Draft release smoke-test checklist  
> **Created:** 2026-08-17  
> **Scope:** Coffee Log / BigShotEspresso first owner-only Render + Neon release candidate  
> **Boundary:** Documentation only. This does not deploy, change code, modify schemas, or implement intelligence engines.

## Purpose

This checklist defines what must be checked before Coffee Log is used as an owner-only release candidate.

The first release candidate is not a public app. It is a private/owner operational release meant to prove that Coffee Log can run from Postgres, preserve Airtable/CSV evidence, support normal shot logging and review, and avoid obvious security mistakes.

## Required Starting Conditions

Before running this smoke test:

- CI is green on `main`.
- Working tree is clean.
- Render service exists or preview deploy exists.
- Render has `DATABASE_URL` configured from Neon.
- Render has `ADMIN_API_TOKEN` configured.
- Airtable variables are configured only if Airtable sync is included in the test.
- Disposable Neon rehearsal has passed before any production-like data is trusted.
- The deployment is treated as owner-only/private.

## Owner-Only Access Check

Confirm:

- The app is not advertised as public self-serve software.
- The URL is shared only with the owner or trusted testers.
- No public signup/subscriber flow is implied.
- The release notes clearly state that public launch is blocked until authentication, authorization, and data ownership rules exist.

Reference:

- [ADR-0008: Owner-Only First Release Access](../ADR/ADR-0008-owner-only-first-release-access.md)

## Deployment Smoke Test

After deployment:

1. Open the Render URL.
2. Confirm the Coffee Log frontend loads.
3. Refresh a nested route, such as a shot detail or dashboard route.
4. Confirm the app does not show a blank page.
5. Confirm `/api/healthz` returns healthy status.
6. Confirm browser console has no obvious startup errors.
7. Confirm app requests are same-origin unless `CORS_ORIGIN` was deliberately configured.

## Core Data Smoke Test

Confirm:

- Shot list loads.
- Shot detail loads.
- Bag list loads.
- Bean list loads.
- Dashboard summary loads.
- Insights page loads if included in the owner workflow.
- Hopper pages/routes load if included in the owner workflow.
- Empty states render clearly when data is missing.
- Errors are understandable and do not expose connection strings or secrets.

## Shot Entry and Review Smoke Test

Using disposable or explicitly approved owner test data:

1. Create a test shot.
2. Confirm `Flow Time` appears as the current UI/API name.
3. Confirm historical `Scale Time` language does not appear as the primary label.
4. Set or confirm `Include in Analysis`.
5. Use at least one multi-select field.
6. Save the shot.
7. Reopen the shot.
8. Confirm multi-select values round-trip without reordering or comma-string loss.
9. Edit an approved editable field.
10. Confirm read-only/import evidence fields are not silently overwritten.
11. Delete the test shot only if the environment is disposable or the record was created specifically for smoke testing.

## Dashboard Correctness Smoke Test

Confirm:

- Current Shot vs Reference uses the active Bag only.
- Excluded shots do not affect analytical averages.
- Manual Reference Shot status is respected.
- No-reference or insufficient-reference-data state is clear.
- Bag A does not silently compare against Bag B.

## Admin/Bulk Route Smoke Test

In production mode:

- Call a protected bulk/admin route without `x-admin-token`.
- Confirm it is blocked.
- Call the same route with an invalid token.
- Confirm it is blocked.
- Do not call destructive routes with a valid token unless the database is disposable or a backup exists.

Protected bulk/admin route examples:

- `/api/airtable/clear`
- `/api/airtable/sync`
- `/api/shots/import-csv`
- `/api/hoppers/import-csv`
- `/api/hopper-range-baselines/import-csv`
- `/api/taste-selectors/seed`

## Airtable Decision Check

If Airtable API is unavailable or rate-limited:

- Do not require live Airtable sync for normal owner use.
- Use CSV/manual import path only if it has been verified against the target database.
- Record Airtable sync as blocked/deferred.

If Airtable sync is included:

- Verify metadata first.
- Run dry sync against disposable Neon target.
- Confirm token is Coffee Log scoped where possible.
- Confirm no Airtable token values appear in logs.

## Backup and Restore Check

Before real owner data is trusted:

- Confirm backup/restore runbook exists.
- Confirm disposable restore/recreate rehearsal has passed or is explicitly deferred.
- Confirm production-like risky actions have a backup first.

Reference:

- [Neon Backup and Restore Runbook](neon-backup-restore-runbook.md)

## Pass Criteria

Owner-only release smoke test passes only when:

- frontend loads,
- API health works,
- core read routes work,
- shot entry/review workflow works,
- dashboard correctness checks pass,
- protected admin routes are blocked without valid token,
- no secrets are exposed in UI, logs, docs, or bundle,
- database target is correct,
- known blockers are documented.

## Stop Conditions

Stop release testing if:

- the app points at the wrong database,
- a secret appears in logs or UI,
- admin/bulk routes are publicly usable without protection,
- dashboard references cross bags,
- shot entry corrupts multi-selects or field names,
- migration/import evidence is missing,
- backup/restore path is unknown for valuable data.
