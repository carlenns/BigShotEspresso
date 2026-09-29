# Pre-Phase-2 Readiness Gates

> **Status:** Draft gate checklist  
> **Created:** 2026-08-17  
> **Purpose:** Identify what must be true before Coffee Log moves from data foundation into application/intelligence implementation  
> **Boundary:** Documentation only. This does not authorize Phase 2 or intelligence-engine implementation.

## Current Position

The project is in an offline-first stabilization window.

Airtable API access is currently constrained by account/API limits, but current CSV exports are available and documented. This allows migration planning, fixture policy, and target-model work to continue without live Airtable calls.

## Gate Summary

| Gate | Status | Can complete offline? | Notes |
| --- | --- | --- | --- |
| Repository documentation governance | Mostly complete | Yes | Constitution, ADR drafts, indexes, certification docs exist |
| Offline Airtable CSV evidence | Complete for visible exports | Yes | Corrected full Shots export has 235 records and 93 fields |
| CSV-to-Postgres coverage review | Complete draft | Yes | Known 9 Shot field gaps documented |
| Postgres target model | Complete draft | Yes | Requires approval before implementation |
| Airtable metadata verification | Blocked | No | Requires API reset or paid access |
| Fixture strategy decision | Needs approval | Mostly | Requires decision before changing fixtures/tests |
| Production-equivalent Postgres rehearsal | Planned for Neon | No, unless local/remote Postgres available | Needed before deployment certification |
| Live Airtable sync dry run | Blocked | No | Requires API calls and safe DB target |
| Phase 2 scope decision | Not ready | Partly | Depends on whether metadata blockers are waived |

## Gate 1 — Documentation Governance

Status: mostly complete.

Evidence:

- `docs/PROJECT_CONSTITUTION.md`
- `docs/START_HERE.md`
- `docs/ROADMAP.md`
- `docs/ADR/`
- `docs/architecture/`
- `docs/implementation/`
- `docs/testing/`
- `docs/REPOSITORY_CERTIFICATION_AUDIT.md`

Remaining decision:

- ADR drafts need explicit acceptance, revision, or rejection.

## Gate 2 — Offline CSV Evidence

Status: complete for visible exports.

Evidence:

- [Offline Airtable Export Audit](../architecture/offline-airtable-export-audit.md)

Current confirmed package:

- 10 CSV files.
- Corrected Shots export: 235 records, 93 columns.
- Table-level row counts and checksums recorded.

Limit:

- CSV cannot expose hidden fields, field types, formulas, view filters, or Airtable linked-record configuration.

## Gate 3 — CSV-to-Postgres Coverage

Status: complete draft.

Evidence:

- [CSV-to-Postgres Coverage Report](../architecture/csv-to-postgres-coverage-report.md)

Known Shot mapping review list:

- `Bag`
- `Rating ( Valid Only )`
- `Hopper Range Link`
- `Hopper Range Match`
- `Hopper Link`
- `Yield Window`
- `Ratio Window`
- `Initial Output vs Target Dose (g)`
- `Initial Output vs Hopper Baseline (g)`

Decision needed:

- Whether these fields are handled as typed storage, imported read-only evidence, relationships, or raw-only evidence.

## Gate 4 — Postgres Target Model

Status: complete draft.

Evidence:

- [Postgres Migration Target Model](../architecture/postgres-migration-target-model.md)

Main proposed model:

- Shots, Bags, Beans, Hoppers, and Hopper Range Baselines are production-critical.
- Grinder Jam Events and Shot Fault Rules are high-priority next reference/event models.
- Rating System is a medium-priority reference/documentation table.
- Project Notes are documentation/evidence first, runtime table optional.
- Launch Economics is product-planning evidence only.

Decision needed:

- Approve or revise the proposed table roles before schema work.

## Gate 5 — Airtable Metadata Verification

Status: blocked until API access resets.

Evidence/runbook:

- [Airtable Metadata Verification Runbook](../architecture/airtable-metadata-verification-runbook.md)

Required evidence:

- Field types.
- Field IDs.
- Formula definitions.
- Lookup/rollup sources.
- Linked-record cardinality.
- Selector and multi-select options.
- Hidden fields.
- View scope and filters.

Decision needed:

- Whether to wait for metadata before implementation, or explicitly waive metadata for a narrow offline-only implementation scope.

Recommended position:

- Do not waive metadata for relationship-heavy work.
- Relationship and formula questions should wait for reset-day verification.

## Gate 6 — Fixture Strategy

Status: needs decision before test fixture changes.

Evidence:

- [CSV Fixture Strategy](../testing/csv-fixture-strategy.md)

Known issue:

- Current committed Shot fixture has 164 records.
- Current corrected full Shot export has 235 records.
- Current committed Hopper fixture has 12 records and 8 columns.
- Current full Hopper export has 17 records and 9 columns.

Decision options:

1. Keep current fixtures unchanged.
2. Replace fixtures with full corrected exports.
3. Add full-export fixtures alongside smaller fixtures.
4. Create sanitized representative fixtures.

Recommended position:

- Add a fixture manifest before changing fixture files.
- Do not automatically commit full exports until privacy and repository-size policy is approved.

## Gate 7 — Production-Equivalent Postgres Rehearsal

Status: substantially satisfied. Forward migration, rollback, and restore were rehearsed on
Neon (2026-08-17); production itself then cut over from Neon to Prisma Postgres for real
(2026-09-28, [ADR-0010](../ADR/ADR-0010-prisma-postgres-operational-database.md)). The one
direction that had never been exercised even as a rehearsal — copying current production
(Prisma) back onto a Neon-shaped rollback target, which is what a real rollback now requires
per the runbook's rollback section — was rehearsed 2026-09-29 against a disposable Prisma
Postgres project (not the real Neon rollback instance, so the two-week Neon retention window
was never touched). See `docs/completed-tasks.md`, 2026-09-29 entry, for the run: `check` (0
warnings), `copy --confirm-empty-target` and `verify` (12/12 tables matched, no mismatches, no
sequence issues), and a local app smoke test (`/api/healthz`, `/api/bags`,
`/api/dashboard/intelligence` all 200 against the copy). The disposable project could not be
deleted via the available Prisma API (project default databases can't be removed
independently, same limitation the original rehearsal's leftover project hit) — safe to leave
on the free tier or delete manually in the console.

Evidence:

- [Neon Postgres Rehearsal Plan](../architecture/neon-postgres-rehearsal-plan.md)
- [Neon Postgres Rehearsal Report](neon-postgres-rehearsal-report.md)
- [ADR-0010: Prisma Postgres as the Operational Database](../ADR/ADR-0010-prisma-postgres-operational-database.md) — real cutover, not just a rehearsal
- [Prisma Postgres Migration Runbook](prisma-postgres-migration-runbook.md)
- `docs/completed-tasks.md`, 2026-09-29 — reverse-direction (Prisma → disposable) rehearsal

Why it matters:

- Local embedded tests are useful, but they do not prove production Postgres migration behavior.
- The future production path is likely Replit plus Postgres, Neon, Supabase, Railway, Render, Fly, or another PostgreSQL-backed deployment.

Required before deployment certification:

- Forward migration on a production-equivalent Postgres instance. — Done: Neon rehearsal
  (2026-08-17), then the real Neon → Prisma cutover (2026-09-28).
- Rollback rehearsal. — Done both directions now: the Neon rehearsal proved rollback on Neon;
  2026-09-29 proved the reverse-direction copy the runbook's actual rollback path needs
  (Prisma → Neon-shaped target), rehearsed against a disposable Prisma project. A rollback to
  the real Neon instance (the documented emergency path, still live) has still never itself
  been executed — that's the one piece left, and doing it for real isn't a rehearsal anymore.
- Re-run migration safety. — Done: a second `copy` attempt on an already-populated target was
  refused in both the original and 2026-09-29 rehearsals.
- Data import rehearsal. — Done (CSV import rehearsed pre-Neon; live data literally moved
  twice now: Neon→Prisma for real, Prisma→disposable as a rehearsal).
- Query/index sanity check. — Covered by `query-budget.route.test.ts` on the real schema.
- Backup/restore practice or documented alternative. — Done: weekly
  `prisma-postgres-migration.mjs backup`, with a documented restore-test procedure
  (`prisma-postgres-migration-runbook.md`).

Can proceed now?

- Yes for the current Phase 2A scope. The only remaining piece is executing a real Neon
  rollback if it's ever actually needed — not something to rehearse further without a real
  trigger.

Decision recorded:

- Use Neon as the first production-equivalent Postgres rehearsal target. (2026-09-28: superseded
  as the live operational database by Prisma Postgres, [ADR-0010](../ADR/ADR-0010-prisma-postgres-operational-database.md); Neon kept live as the rollback target.)

## Gate 8 — Live Airtable Sync Dry Run

Status: blocked until API access resets.

Required before full certification:

- Confirm environment variables point to Coffee Log.
- Confirm table names and field names.
- Run a read-only connection test.
- Run metadata capture first.
- Run dry sync into disposable Postgres/local database.
- Compare counts and mappings against CSV evidence.

Do not run:

- Bulk sync against a valuable database without backup/disposable target.
- Live sync before metadata verification.

## Gate 9 — Phase 2 Scope Decision

Status: **satisfied for Phase 2A only by option (2)** (2026-09-28) — see
[phase-2a-scope-authorization.md](phase-2a-scope-authorization.md). Full Phase 2 remains not ready.

Original status (2026-08-17): not ready.

Phase 2 should not begin until one of these is true:

1. Airtable metadata verification is completed and target model decisions are approved.
2. The user explicitly approves a narrow implementation scope that avoids unresolved metadata areas.

Safe Phase 2 candidates after gates:

- UI/application completion around already typed, already verified fields.
- Admin/debug visibility for import evidence and unresolved relationships.
- Postgres-first data review screens.

Unsafe Phase 2 candidates before gates:

- Relationship-heavy Hopper state architecture.
- Local replacement of Airtable formulas.
- Any intelligence engine.
- Automatic selector vocabulary generation.
- Cross-bag reference analytics.

## Next Big Decision Point

The next big decision is fixture/evidence strategy plus metadata timing:

1. Should the repository keep small committed fixtures only, or add full corrected export fixtures?
2. Should implementation wait for Airtable metadata reset, or proceed with a narrow no-metadata scope?
3. Which Postgres target should be used for the first production-equivalent rehearsal?

Until those are decided, the safest remaining work is documentation, evidence indexing, and non-code planning.
