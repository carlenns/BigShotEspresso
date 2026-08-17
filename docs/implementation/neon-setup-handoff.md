# Neon Setup Handoff

> **Status:** Practical setup guide  
> **Created:** 2026-08-17  
> **Audience:** Project owner  
> **Boundary:** This guide does not require committing secrets and does not modify application code.

## Purpose

This is the short owner-facing setup guide for creating the Neon database target needed for the Coffee Log release rehearsal.

The goal is to give Codex a safe disposable Postgres target for migration, rollback, CSV import, and runtime smoke tests.

## What To Create In Neon

Create one Neon project for BigShotEspresso/Coffee Log.

Recommended names:

```text
Project name: bigshotespresso
Database or branch purpose: coffee-log-rehearsal
```

If Neon asks for a region, choose the region closest to where the app will normally run or where you are developing. For the first rehearsal, exact region is less important than making sure the database is disposable.

## What Connection Value Is Needed

Codex/the app needs the Neon Postgres connection string.

It should be stored under this environment variable name:

```text
DATABASE_URL
```

Do not paste the connection string into:

- GitHub commits,
- Markdown docs,
- screenshots,
- chat messages,
- terminal logs,
- or `.replit`.

## Where To Save It

Use one of these safe places:

| Place | Use |
| --- | --- |
| Local shell/session secret | Best for local rehearsal |
| Codex/local environment if available | Good for one-off testing |
| Replit Secrets | Later deployment/staging |
| GitHub Actions Secrets | Later CI integration, only if needed |

Do not commit it to the repository.

## Disposable Target Rule

The first Neon target should be disposable.

That means:

- It is safe to migrate.
- It is safe to roll back.
- It is safe to wipe/recreate.
- It does not contain valuable production data.
- It is not the future production database unless explicitly promoted later.

## What To Give Codex

Do not give Codex the raw connection string in a normal chat message if avoidable.

Better options:

1. Save it locally as `DATABASE_URL` in the approved environment and say, “It is set.”
2. Put it in Replit Secrets later and say, “It is set in Replit.”
3. If you must paste it somewhere, make sure it is a private secure input, not a committed file or public screenshot.

## What Codex Will Do After It Exists

Once a disposable Neon target is available, Codex should run the rehearsal from:

- [Neon Postgres Rehearsal Plan](../architecture/neon-postgres-rehearsal-plan.md)

Expected output:

```text
docs/implementation/neon-postgres-rehearsal-report.md
```

The rehearsal should verify:

- connection,
- empty/disposable target,
- forward migration,
- repeat migration,
- rollback,
- rollback-forward cycle,
- committed fixture import,
- optional full local CSV export rehearsal,
- and API runtime smoke checks if possible.

## Stop Conditions

Stop setup or rehearsal if:

- the connection string is exposed,
- Neon target appears to contain valuable data,
- the app points to production by mistake,
- migration fails,
- rollback fails,
- or the database cannot be identified confidently.

## Plain-English Summary

Create a Neon Postgres database for testing, keep its connection string secret, save it as `DATABASE_URL`, and tell Codex when it is set.

Do not worry about Airtable during this step.
