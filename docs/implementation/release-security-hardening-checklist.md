# Release Security Hardening Checklist

> **Status:** Draft release security gate  
> **Created:** 2026-08-17  
> **Scope:** Coffee Log / BigShotEspresso first Postgres-backed release candidate  
> **Boundary:** Documentation only. This checklist does not change application code, infrastructure, schemas, APIs, or secrets.

## Purpose

This checklist exists so Coffee Log does not become a fragile “vibe-coded” app with hidden credential, database, or admin-route risks.

Security is not a one-time scan. For release, it must be a gate with evidence.

## Release Security Position

The current repository is safer than a typical quick prototype because:

- hardcoded Airtable credentials were removed,
- current files and reachable history were scanned,
- `.env` files are ignored,
- app-specific Airtable environment variables are preferred,
- CI exists,
- CSV fixtures are documented,
- and Postgres/Neon is being treated as the production data foundation.

However, release security is not complete until runtime, deployment, database, and admin-access risks are checked.

## Gate 1 — Secrets and Environment Variables

Required:

- No hardcoded Airtable tokens.
- No hardcoded Neon/Postgres connection strings.
- No OpenAI/API/provider keys in source.
- No passwords or connection strings in docs, logs, screenshots, or generated files.
- `.env` and `.env.*` ignored.
- `.env.example` contains placeholders only if present.

Approved environment variable names:

| Purpose | Preferred variable |
| --- | --- |
| Coffee Log Airtable token | `COFFEELOG_AIRTABLE_API_KEY` |
| Coffee Log Airtable base | `COFFEELOG_AIRTABLE_BASE_ID` |
| Postgres/Neon database | `DATABASE_URL` |
| Production admin/bulk action token | `ADMIN_API_TOKEN` |

Temporary legacy fallbacks:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`

Release rule:

- Legacy fallbacks may remain for compatibility during transition, but release docs and deployment configuration should use app-specific names.

Verification:

- Secret scan tracked files.
- Secret scan untracked files.
- Review `.replit`.
- Review docs for placeholder patterns that trigger false positives.
- Review GitHub security alerts if available.

## Gate 2 — Database Access

Required:

- Use a disposable Neon target for rehearsal.
- Use a separate production Neon target for release.
- Do not reuse personal/admin database credentials for runtime if a scoped role can be used.
- Do not expose database connection strings in logs.
- Confirm migrations run against the intended target.

Preferred release setup:

| Environment | Database |
| --- | --- |
| Local development | local or disposable Neon branch |
| Rehearsal | disposable Neon branch/database |
| Release | production Neon branch/database |

Before release:

- Confirm backup/export path.
- Confirm how to rotate the database password.
- Confirm who has dashboard access.

## Gate 3 — Airtable Access

Required if Airtable sync is included:

- Use app-specific Coffee Log Airtable variables.
- Confirm token is scoped only to required Coffee Log base where possible.
- Confirm scopes are no broader than needed.
- Run metadata verification before live sync.
- Run dry sync into disposable database before release sync.

If Airtable API remains blocked:

- Release must not depend on live Airtable runtime access.
- CSV/manual import path must be sufficient for release scope.

## Gate 4 — Admin and Dangerous Routes

Routes and actions to review before public deployment:

- Airtable sync.
- Airtable clear/delete.
- CSV import.
- Any database reset/clear route.
- Any diagnostic route exposing raw rows.
- Any route exposing sync evidence or raw Airtable fields.

Required:

- Dangerous write/delete actions must not be publicly reachable without protection.
- Clear/delete routes must require explicit confirmation and access control.
- Production bulk/admin actions require `ADMIN_API_TOKEN`.
- Raw evidence routes must not expose secrets.
- Admin/debug screens must be intentionally scoped.

If access control is not implemented:

- Do not expose admin/destructive routes publicly.
- Release only behind private/admin access or defer public deployment.

## Gate 5 — API Write Safety

Required:

- Create/update payloads reject read-only fields.
- Multi-selects are arrays, not comma-string mutations.
- `Include in Analysis` defaults correctly for locally-created shots.
- `Reference Shot` remains manual authority.
- No route silently invents selector values.
- No route silently infers cross-bag reference authority.

Verification:

- API validation tests.
- OpenAPI/runtime contract check.
- Manual smoke tests for create/edit/delete.

## Gate 6 — Logging and Error Handling

Required:

- Logs do not print secrets.
- Errors do not echo full connection strings.
- Airtable errors do not print bearer tokens.
- Database errors shown to users are safe and non-sensitive.
- Internal details are available only in developer/admin logs.

Verification:

- Run intentional bad-credential smoke tests with redacted output.
- Review error responses from connection and sync failures.

## Gate 7 — Dependency and Supply Chain

Required:

- Dependency audit reviewed.
- Known high-severity issues are either fixed, documented, or accepted with rationale.
- Lockfile is committed.
- CI installs from lockfile.

Verification:

- Run dependency audit before release.
- Record any remaining findings in release report.

Current evidence:

- [Dependency Security Audit — 2026-08-17](dependency-security-audit-2026-08-17.md)

## Gate 8 — Browser/UI Exposure

Required:

- No secrets in frontend bundle.
- Frontend does not expose server-only environment values.
- Admin/debug screens are not accidentally linked as public user features.
- Raw import evidence is not exposed in public views.
- Production CORS is closed by default unless `CORS_ORIGIN` is deliberately configured.
- Production/API responses include baseline browser protection headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Strict Content Security Policy is deferred until deployed frontend smoke testing so it does not accidentally break required assets.

Verification:

- Build inspection or bundle grep for known secret variable names.
- Manual UI smoke test.

## Gate 9 — Data Privacy and Evidence

Required:

- Full Airtable exports remain local/private unless explicitly approved.
- Committed fixtures are documented and safe.
- Raw import evidence is treated as potentially sensitive.
- Public repo does not include private operational data beyond approved fixtures.

Verification:

- Fixture manifest reviewed.
- Full export policy reviewed.
- Secret scan includes fixture/documentation paths.

## Gate 10 — Release Approval

Release security can pass only when:

- Secret scan passes.
- Deployment secrets are configured safely.
- Neon target is verified.
- Dangerous routes are protected or not exposed.
- Airtable sync is either certified or excluded from release runtime.
- Dependency audit is reviewed.
- Build does not expose secrets.
- Remaining risks are documented and accepted.

## Current Known Security Work Before Release

1. Run fresh tracked/untracked secret scan before release.
2. Review admin/destructive API routes.
3. Decide whether Airtable sync is included in release.
4. Run Neon rehearsal.
5. Review dependency audit.
6. Verify frontend bundle does not expose secrets.
7. Document backup/restore approach.
8. Add and test a strict Content Security Policy after first deployed frontend smoke test.
