# Route Exposure Audit

> **Status:** Draft release audit  
> **Created:** 2026-08-17  
> **Scope:** Coffee Log API route exposure before owner-only release  
> **Boundary:** Documentation only. This does not change route protection, authentication, schemas, or APIs.

## Purpose

This audit separates:

- public-safe read routes,
- owner workflow write routes,
- protected bulk/admin routes,
- unresolved routes that need a release decision.

The current first-release decision is owner-only. Public self-serve release remains blocked until authentication, authorization, and data ownership rules are implemented.

## Current Protection Model

Confirmed production protection exists for bulk/admin actions requiring `ADMIN_API_TOKEN` through `x-admin-token`.

Protected route prefixes:

- `/api/airtable/clear`
- `/api/airtable/sync`
- `/api/shots/import-csv`
- `/api/hoppers/import-csv`
- `/api/hopper-range-baselines/import-csv`
- `/api/taste-selectors/seed`

Normal owner workflow create/edit/delete routes are not yet protected by a full login system. This is acceptable only for owner-only/private deployment, not public launch.

## Public-Safe Read Candidates

These routes are read-only by method, but still require privacy review before public exposure because Coffee Log data may be personal research/operations data.

| Route | Method | Notes |
| --- | --- | --- |
| `/api/healthz` | GET | Health check; public-safe if it exposes only generic status |
| `/api/beans` | GET | Coffee data; privacy/content review needed |
| `/api/beans/:id` | GET | Coffee data; privacy/content review needed |
| `/api/bags` | GET | Bag data; may include purchase/operations detail |
| `/api/bags/:id` | GET | Bag detail and analytics; privacy review needed |
| `/api/shots` | GET | General shot list; privacy review needed |
| `/api/shots/:id` | GET | Shot detail; ensure raw evidence is not exposed |
| `/api/shots/reference` | GET | Analytics/reference data; active-bag rules apply |
| `/api/shots/:id/similar` | GET | Analytics data; Include in Analysis applies |
| `/api/shots/selector-options` | GET | Selector vocabulary; generally low risk |
| `/api/shots/audit` | GET | Diagnostic; not public-safe until reviewed |
| `/api/dashboard/*` | GET | Dashboard analytics; not public-safe until privacy reviewed |
| `/api/insights` | GET | Analytics; not public-safe until privacy reviewed |
| `/api/hoppers` | GET | Hopper state; operational data |
| `/api/hopper-range-baselines` | GET | Hopper baseline data |
| `/api/equipment/*` | GET | Equipment data; low/medium privacy risk |
| `/api/accessories` | GET | Accessory data; low/medium privacy risk |
| `/api/accessories/:id` | GET | Accessory detail |
| `/api/taste-selectors` | GET | Selector data; generally low risk |
| `/api/shots/:id/taste-selectors` | GET | Shot-linked taste data |
| `/api/settings` | GET | Needs review before public exposure |
| `/api/airtable/status` | GET | Shows connection presence, not secret values; owner/admin view preferred |
| `/api/airtable/counts` | GET | Diagnostic; owner/admin view preferred |

## Protected Bulk/Admin Routes

These routes are protected in production and should remain protected.

| Route | Method | Reason |
| --- | --- | --- |
| `/api/airtable/clear` | POST | Destructive database clearing |
| `/api/airtable/sync` | POST | Bulk sync/write operation |
| `/api/shots/import-csv` | POST | Bulk data import |
| `/api/hoppers/import-csv` | POST | Bulk hopper import |
| `/api/hopper-range-baselines/import-csv` | POST | Bulk baseline import |
| `/api/taste-selectors/seed` | POST | Bulk selector mutation |

## Owner Workflow Write Routes

These routes support normal owner use but are not public-safe without authentication and ownership rules.

| Route | Methods | Current release treatment |
| --- | --- | --- |
| `/api/shots` and `/api/shots/:id` | POST, PATCH, DELETE | Owner-only workflow |
| `/api/beans` and `/api/beans/:id` | POST, PATCH, DELETE | Owner-only workflow |
| `/api/bags` and `/api/bags/:id` | POST, PATCH, DELETE | Owner-only workflow |
| `/api/accessories` and `/api/accessories/:id` | POST, PATCH, DELETE | Owner-only workflow |
| `/api/equipment/grinders` and `/api/equipment/grinders/:id` | POST, PATCH, DELETE | Owner-only workflow |
| `/api/equipment/machines` and `/api/equipment/machines/:id` | POST, PATCH, DELETE | Owner-only workflow |
| `/api/hoppers` and `/api/hoppers/:id` | POST, PATCH | Owner-only workflow |
| `/api/hopper-range-baselines` | POST | Owner-only workflow |
| `/api/taste-selectors` and `/api/taste-selectors/:id` | POST, PATCH, DELETE | Owner-only workflow |
| `/api/shots/:id/taste-selectors` | PUT | Owner-only workflow |
| `/api/settings` and `/api/settings/:key` | PUT, DELETE | Owner-only/admin workflow |
| `/api/airtable/test` | POST | Owner/admin diagnostic; should not be public self-serve |

## Release Findings

Current finding:

- Bulk/destructive routes are protected in production.
- Normal workflow write routes remain open to whoever can reach the deployed app.
- This is acceptable only under the owner-only release decision.
- Public launch requires authentication and authorization work before these routes can be considered safe.

## Required Before Public Launch

Before public or subscriber access:

- choose authentication provider/session model,
- define user ownership boundaries,
- scope every write route to the authenticated user or tenant,
- separate admin routes from ordinary user routes,
- decide whether public users can import CSV,
- decide whether public users can connect Airtable,
- add rate limiting/abuse protection,
- add tests proving cross-user data isolation.

## Related Documentation

- [ADR-0008: Owner-Only First Release Access](../ADR/ADR-0008-owner-only-first-release-access.md)
- [Release Candidate Checklist](release-candidate-checklist.md)
- [Release Security Hardening Checklist](release-security-hardening-checklist.md)
- [Owner-Only Release Smoke Test](owner-only-release-smoke-test.md)
