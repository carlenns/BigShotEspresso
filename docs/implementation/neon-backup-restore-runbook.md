# Neon Backup and Restore Runbook

> **Status:** Draft release runbook  
> **Created:** 2026-08-17  
> **Scope:** Coffee Log / BigShotEspresso Neon Postgres release path  
> **Boundary:** Documentation only. This does not create databases, run exports, rotate credentials, or modify application code.

## Purpose

This runbook defines the minimum backup and restore process needed before Coffee Log becomes a live Postgres-backed application.

The goal is simple: before real release data is trusted to Neon, the project must know how to get the data back out and how to restore or recreate a working database.

## Release Rule

Do not treat Postgres as the source of truth until at least one backup and restore path has been verified against a disposable database or branch.

For the first release candidate:

- backup rehearsal may use disposable Neon data,
- restore rehearsal must not target production,
- connection strings must never be committed,
- export files containing real Coffee Log data must remain local/private unless explicitly approved.

## Environments

| Environment | Purpose | Backup expectation |
| --- | --- | --- |
| Disposable Neon rehearsal | Migration, import, rollback, and restore testing | Safe to reset/delete |
| Neon staging | Deployment smoke tests before production | Export before destructive tests |
| Neon production | Real Coffee Log data after release | Backup before bulk imports, sync, migration, or destructive admin action |

## What Must Be Protected

Backup coverage must include:

- schema,
- migrations history,
- Coffee Log tables,
- typed Shot fields,
- raw import evidence where stored,
- Hopper and Hopper Range Baseline tables,
- relationship tables and foreign keys,
- selector/reference data needed by the UI,
- migration metadata.

## Backup Methods

### Preferred: Neon Branching

Use a Neon branch before risky operations when available.

Use this before:

- production migration,
- bulk CSV import,
- Airtable sync,
- data repair,
- schema-altering deployment.

Verification expectation:

- branch is created from the intended source,
- branch connection string is kept secret,
- risky operation is rehearsed on the branch first,
- production is changed only after rehearsal passes.

### Portable SQL Export

Use standard Postgres export tooling for a provider-portable backup.

Expected output:

- a schema/data dump that can recreate the database on Neon or another PostgreSQL host,
- stored outside the repository,
- named with date, environment, and purpose.

Example naming convention:

```text
bigshotespresso-coffee-log-YYYY-MM-DD-environment-purpose.dump
```

Do not commit this file.

### CSV Export

CSV export is useful for human inspection and emergency recovery, but it is not the complete backup authority once Postgres owns relationships, migrations, and runtime state.

Use CSV exports for:

- audit evidence,
- Airtable comparison,
- manual spot checks,
- human-readable archive.

Do not rely on CSV alone for production database restore.

## Restore Rehearsal

Restore rehearsal must happen against a disposable target.

Minimum restore test:

1. Create or reset disposable Neon target.
2. Restore exported database backup into disposable target.
3. Run migrations or migration status check as appropriate.
4. Start API against restored target.
5. Verify `/api/healthz`.
6. Verify representative read routes.
7. Verify shot counts and relationship counts against expected source.
8. Verify Include in Analysis behavior still works.
9. Verify Current Shot vs Reference remains active-bag isolated.
10. Delete or preserve disposable target according to rehearsal notes.

## Before Risky Production Actions

Before any risky production operation, record:

- target database/environment,
- reason for action,
- latest commit deployed,
- backup method used,
- backup timestamp,
- restore rehearsal status,
- rollback plan,
- person approving the action.

Risky operations include:

- database migration,
- rollback,
- bulk CSV import,
- Airtable sync,
- destructive clear/delete route,
- manual database repair,
- credentials rotation.

## Credential Rotation

Credential rotation must be documented before public release.

Minimum process:

1. Create replacement Neon credential or reset database password.
2. Update deployment environment variable `DATABASE_URL`.
3. Restart app service.
4. Verify API health and core routes.
5. Confirm old credential no longer works if Neon exposes that control.
6. Record rotation date in release notes or private operations notes.

Do not paste the old or new connection string into repository files, screenshots, tickets, or chat logs.

## Verification Evidence To Record

Each successful backup/restore rehearsal should record:

- date,
- commit SHA,
- Neon target name, redacted if needed,
- backup method,
- restore target,
- migration check result,
- import/check result,
- route smoke result,
- unresolved issues.

Recommended location:

```text
docs/implementation/neon-rehearsal-report-YYYY-MM-DD.md
```

Only commit this report if it contains no secrets or private export data.

## Current Status

As of 2026-08-17:

- Neon is selected as the production-equivalent Postgres target.
- Backup/restore procedure is now documented.
- A live Neon backup/restore rehearsal has not yet been run in this repository.
- The next required external input is a disposable Neon `DATABASE_URL`.

## Release Gate

Backup/restore readiness is complete only when:

- a disposable Neon target exists,
- migration/import rehearsal passes,
- a backup can be created,
- a restore or recreate workflow is verified,
- API smoke checks pass against the restored target,
- no secrets are committed,
- the rehearsal report is written.
