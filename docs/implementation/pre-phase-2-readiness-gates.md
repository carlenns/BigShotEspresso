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
| Repository documentation governance | Complete (2026-10-01) | Yes | Constitution, ADR drafts, indexes, certification docs exist |
| Offline Airtable CSV evidence | Complete for visible exports | Yes | Corrected full Shots export has 235 records and 93 fields |
| CSV-to-Postgres coverage review | Decided 2026-09-30 | Yes | Treatments for the 9 Shot fields recorded; Airtable formulas still unverified (Gate 5) |
| Postgres target model | Approved 2026-09-30 | Yes | Roles approved; no schema work authorized |
| Airtable metadata verification | Done 2026-10-01 | No | 8 Airtable calls; hidden-field and Taste gaps found and resolved (see Gate 5 results) |
| Fixture strategy decision | Approved 2026-09-30 | Mostly | Manifest first; fixtures unchanged until then |
| Production-equivalent Postgres rehearsal | Substantially satisfied | No | Neon rehearsal, real cutover to Prisma Postgres, restore-from-backup tested 2026-09-29 |
| Live Airtable sync dry run | Not required (Carl, 2026-10-01) | No | App is the daily system of record; Airtable is evidence only |
| Phase 2 scope decision | Phase 2A only (confirmed 2026-09-30) | Partly | Full Phase 2 still not ready |

## Gate 1 — Documentation Governance

Status: **complete (2026-10-01).** ADR-0001 to 0005, 0007 and 0008 were accepted on 2026-09-29, ADR-0006 is
superseded, and ADR-0009, ADR-0010 and ADR-0011 are accepted (0009 and 0011 on 2026-10-01 as design direction only;
implementation is separately approval-gated).

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

- None. ADR-0009 was accepted 2026-10-01 (design direction only, no implementation).

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

Status: field treatments decided by Carl 2026-09-30 and confirmed by the Airtable metadata check 2026-10-01 (Gate 5).

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

Decision recorded 2026-09-30 (Carl):

| Field | Treatment |
| --- | --- |
| `Bag` | Relationship, already covered by `shots.bag_id` (with `bag_label`); no separate storage |
| `Rating ( Valid Only )` | Imported read-only / raw-only evidence; not recalculated until the formula is verified |
| `Hopper Range Link` | Relationship, already covered by `shots.hopper_range_baseline_id` |
| `Hopper Range Match` | Raw-only evidence |
| `Hopper Link` | Relationship, already covered by `shots.hopper_id` |
| `Yield Window` | Imported read-only evidence |
| `Ratio Window` | Imported read-only evidence |
| `Initial Output vs Target Dose (g)` | Evidence only; **not** mapped to `actual_dose_error` |
| `Initial Output vs Hopper Baseline (g)` | Evidence only; **not** mapped to `baseline_output_delta` |

Rationale for the last two (Carl's recollection, corrected against the export on 2026-09-30):

- `Initial Output vs Target Dose (g)`: an earlier dose comparison later superseded by a newer field. Verified
  2026-10-01: its formula is Initial Output minus Expected Dose by Hopper Range (not the target dose, despite the
  name). The app calculates initial output minus target dose itself (`dose-correction.ts`), a different comparison. Evidence: the
  export has values for it on 154 of 235 shots, from shot #21 (2026-04-27) to shot #196
  (2026-07-18), then none, which fits it being retired in mid-July. It is not confined to System
  Phase 1 (52 early, 66 middle, 36 late shots).
- `Initial Output vs Hopper Baseline (g)`: Carl recalls it was created by ChatGPT as part of
  evaluating hopper performance and that he never really used it. It is still populated on 188 of the
  189 shots that have an Initial Output, through the last exported shot (2026-08-15), so it looks like
  a live Airtable formula, not a retired field. That does not change the treatment: the app does not import it
  (its matching column is empty); whether any code reads that column was not traced.
- The current field, confirmed by Carl 2026-09-30 as the correct one in use both in Airtable and in
  the app, is `Initial Output (g)`, stored as `shots.initial_grind_weight`: present from
  shot #21 to the end, on 233 of 282 production shots (Phase 1: 28 of 51, Phase 2: 126 of 146, Phase 3:
  78 of 84; shots 1-20 have none). System Phase 1 is only 51 of the 282 shots, so neither field
  is limited to Phase 1 shots.
- Checked 2026-09-30: `actual_dose_error` and `baseline_output_delta` are empty for all 282 production
  shots, so treating these two fields as evidence-only changes no existing data. Verified 2026-10-01 (Gate 5):
  the app maps `actual_dose_error` from a different Airtable field, `Actual Dose Error (g)` (Dose minus Target Dose),
  which is hidden from the CSV export; that is why the column is empty. The identity of any newer replacement for
  field 8 has not been confirmed.

Verified 2026-10-01 (Gate 5): the metadata confirms the treatments for fields 1-7 (see Gate 5 results). No
treatment needs to change.

## Gate 4 — Postgres Target Model

Status: **approved by Carl 2026-09-30** (table roles below).

Evidence:

- [Postgres Migration Target Model](../architecture/postgres-migration-target-model.md)

Main proposed model:

- Shots, Bags, Beans, Hoppers, and Hopper Range Baselines are production-critical.
- Grinder Jam Events and Shot Fault Rules are high-priority next reference/event models.
- Rating System is a medium-priority reference/documentation table.
- Project Notes are documentation/evidence first, runtime table optional.
- Launch Economics is product-planning evidence only.

Decision recorded 2026-09-30 (Carl): the proposed table roles are approved as written. This approves
the roles only; it authorizes no schema work. Grinder Jam Events, Shot Fault Rules and the Rating System
still have no first-class tables, and adding any of them needs its own plan, migration and rollback.

## Gate 5 — Airtable Metadata Verification

Status: **core verification completed 2026-10-01** with 8 Airtable (MCP) calls, well inside the runbook's
250-call stop limit. Results below are sanitized (no Airtable IDs, no verbatim formulas; raw responses are kept
outside the repository). Not done: view filters (the MCP does not expose them), full spot-check list (Reference
Shot, excluded shot, Grinder Jam Event, Baseline), and Beans/Baselines/Jam Events/Rules/Notes/Rating-System
record counts.

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

Recommended position (original, 2026-08-17):

- Do not waive metadata for relationship-heavy work.
- Relationship and formula questions should wait for reset-day verification.

### Results, 2026-10-01 (sanitized)

Tables: Beans, Bags, Shots, Hopper, Hopper Range Baselines, Shot Fault Rules, Project Notes, 10-Point Rating
System, Grinder Jam Events, BSE Launch Economics. Shots has **117 fields**; the CSV export has **93**.

**The nine unmapped Shot fields (Gate 3), now verified from metadata:**

| Field | Verified nature |
| --- | --- |
| `Bag` | Linked record to Bags; inverse is Bags.Shots; multiple allowed. The authoritative relationship |
| `Bag Label` | Lookup of the Bags "Bag Label" formula ("Bag N" plus the bean name); display helper |
| `Rating ( Valid Only )` | Formula: Rating only when Shot Status is Good or Dialed In |
| `Hopper Range Link` | Linked record to Hopper Range Baselines; single link; inverse is Baselines.Shots |
| `Hopper Range Match` | Audit formula: compares the shot's Hopper Range with the linked baseline's range (match, mismatch or missing link) |
| `Hopper Link` | Linked record to Hopper; inverse is Hopper.Shots |
| `Yield Window`, `Ratio Window` | Lookups of the Bag's yield and ratio window formulas (low / center / high text) |
| `Initial Output vs Target Dose (g)` | Formula: Initial Output minus **Expected Dose by Hopper Range** (a lookup from the baseline). The name says "Target Dose" but the formula does not use it |
| `Initial Output vs Hopper Baseline (g)` | Formula: Initial Output minus Baseline Unaided Output (a lookup); 0 when the difference is under 0.05 |

**Hidden from the export (24 Shot fields):** Bag Label, Purge/Toss (g), Dose Adj, Time Adj, Bean Helper, Time,
Project Phase, Milk Drink?, Effective Drink Type, **Taste**, Hopper Range (from link), Cost per Shot, Bag Cost
per Gram, Scale Zone, Flow Time Low/Center/High, Flow Time Offset (Scale), **Actual Dose Error (g)**, **Target
Dose (g)**, Expected Dose by Hopper Range (g), Target Gap (g), Signature Shot Count, Grinder Jam Events.
`Actual Dose Error (g)` is a formula (Dose minus Target Dose) that the app already maps to
`shots.actual_dose_error`; because the export omits it, that column is empty in production.

**Record completeness (live Airtable vs CSV vs production database):**

| | Airtable | CSV | Database |
| --- | --- | --- | --- |
| Shots | 262 (2026-04-10 to 2026-08-15) | 235 | 283 on 2026-10-01 |
| Bags | 6 | 6 | 8 (2 created in the app) |
| Hopper | 17 | 17 | 21 (4 created in the app) |

- 25 Airtable shots dated before 2026-04-21 (Phase 1 setup period) were not exported and are not in the database. This
  matches Airtable's own `Include in Analysis` formula, which only counts shots from 2026-04-21.
- 2 more Airtable records (2026-04-21 and 2026-04-22) are non-shot notes (a hopper refill note and a puck-screen
  change note) with no bag, dose or output; not exported, not imported.
- Every database shot dated through 2026-08-16 matches an Airtable shot by timestamp; nothing in the database is unexplained.
- **Historical Taste data was never imported.** Airtable has Taste values on 84 shots (502 selections); the export
  hid the field and the sync code does not map it. The database has taste links on 8 shots, none of them imported shots.
  (68 of the 84 shots exist in the database; the other 16 are pre-2026-04-21.)

**`Include in Analysis`:** Airtable's rule is Shot Status Good or Dialed In, AND Fault Status contains "Good", AND date
2026-04-21 or later. The app's rule (`computeIncludeInAnalysis`) is Good or Dialed In AND Fault Status exactly
`["Good"]`, with no date cutoff. On Airtable's 262 shots: Airtable includes 190, the app rule 202. Airtable includes 3 the
app rule excludes (exactly the three DI-4 shots Carl reviewed on 2026-09-29: purge, grinder jam, intentional grind waste;
production keeps them included by Carl's decision). The app rule includes 15 that Airtable excludes (all Good with Fault
Status `["Good"]`, i.e. the pre-2026-04-21 shots, which are not in the database).

**Project Phase** (Airtable, hidden from the export) has options Phase 1 to Phase 5; shots carry Phase 1 (27), Phase 2 (188)
and Phase 3 (47). The database's `system_phase` values differ in count (1: 51, 2: 146, 3: 84); the mapping was not traced.

**Select options captured** (kept privately) for Shot Status, Fault Status, Shot Classification, Bean Achievement,
Expression Style, Intelligence Lesson Type, Drink Type, Hopper Phase, Project Phase, Taste, Bags.Status,
Beans.Certification and the three Grinder Jam Events selects. Bags.Status options: Dialing In, Good, Finished, Active.

**Decisions after the check (Carl, 2026-10-01):**
- Taste history: Carl built the graded Taste vocabulary (attribute plus Low/Medium/High) so an AI could read intensities
  that the selector colors hid, then found it too tedious for a public app. Usage by month confirms the pattern with one
  twist: heavy use Apr 10-May 20 (60 shots), none May 21-Jul 19, and a return Jul 20-Aug 15 (24 of 36 shots).
  Decision, refined the same day: import the taste data for the Phase 2 shots (44) as well as the late Phase 3 shots (24),
  68 shots in all, using only the app's current selectors. Done, then **reversed the same day at Carl's request**: all 351
  imported links were removed and the selectors kept (the matched selectors sounded wrong against the old graded data).
  Final state: no historical Airtable taste data is in the database; Airtable remains the preserved record of how the
  taste-selector system evolved (see completed-tasks.md).
- Project Phase is understood to be the app's System Phase; Field 8 is believed already corrected in the app; neither
  was re-verified.
- The 25 Phase 1 setup shots (before 2026-04-21) and 2 non-shot notes are **not** being added (Carl, 2026-10-01); Phase 1
  was setup only and feeds no calculation. Every Phase 2 and Phase 3 shot is already in the database.

**Remaining unknowns:** view filters; whether any other table is view-filtered; the Project Phase to `system_phase` mapping.
Taste history was deliberately left out of the database (see above).

## Gate 6 — Fixture Strategy

Status: **approved by Carl 2026-09-30** (manifest first; fixtures unchanged for now).

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

Recommended position (approved by Carl 2026-09-30):

- Add a fixture manifest before changing fixture files.
- Do not automatically commit full exports until privacy and repository-size policy is approved.
- Until then the committed fixtures stay unchanged (option 1). Writing the manifest is a separate,
  not yet started task.

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
  (Prisma → Neon-shaped target), rehearsed against a disposable Prisma project. Neon was retired on
  2026-09-29, so there is no longer a Neon rollback instance. Recovery is now a restore from a
  `prisma-postgres-migration.mjs backup` dump into a fresh Prisma database (runbook, "Rollback").
  A restore of a real dump into a fresh Prisma database was rehearsed on 2026-09-29
  (`pg_restore` of `bse-2026-09-29.dump`, then `verify` against production: 12/12 tables matched,
  280 shots, no mismatches).
- Re-run migration safety. — Done: a second `copy` attempt on an already-populated target was
  refused in both the original and 2026-09-29 rehearsals.
- Data import rehearsal. — Done (CSV import rehearsed pre-Neon; live data literally moved
  twice now: Neon→Prisma for real, Prisma→disposable as a rehearsal).
- Query/index sanity check. — Covered by `query-budget.route.test.ts` on the real schema.
- Backup/restore practice or documented alternative. — Done: weekly
  `prisma-postgres-migration.mjs backup`, with a documented restore-test procedure
  (`prisma-postgres-migration-runbook.md`).

Can proceed now?

- Yes for the current Phase 2A scope. Neon is retired and the restore-from-dump
  path has been rehearsed on Prisma (see Rollback above); nothing further is required for Gate 7.

Decision recorded:

- Use Neon as the first production-equivalent Postgres rehearsal target. (2026-09-28: superseded
  as the live operational database by Prisma Postgres, [ADR-0010](../ADR/ADR-0010-prisma-postgres-operational-database.md); Neon was kept as the rollback target and retired 2026-09-29.)

## Gate 8 — Live Airtable Sync Dry Run

Status: **not required, decided by Carl 2026-10-01.** Airtable API access is available again and the metadata check
(Gate 5) is done, but the sync dry run was deliberately not run: the app has been the system of record in daily use
since the Neon setup, so a live Airtable sync has no job to do. Airtable stays preserved evidence only. If live sync is
ever wanted, the safeguards below still apply, and the app's sync route updates existing rows with no dry-run switch,
so it must only ever run against a disposable copy. Readiness review 2026-10-01 (code only, no calls): the sync reports
inserted/updated/skipped/errors per table and saves raw evidence, but it does not read the Taste field and the clear route
is a separate admin-token route.

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

Status: **satisfied for Phase 2A only by option (2)** (2026-09-28; confirmed by Carl 2026-09-30) — see
[phase-2a-scope-authorization.md](phase-2a-scope-authorization.md). Full Phase 2 remains not ready.

Confirmation 2026-09-30 (Carl): approves the Phase 2A-only position as it stands. It does not
authorize full Phase 2, intelligence engines, accounts/auth, or anything on the "unsafe" list below.

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

Resolved 2026-09-30 (kept for history). The decision point was fixture/evidence strategy plus metadata timing:

1. Should the repository keep small committed fixtures only, or add full corrected export fixtures?
2. Should implementation wait for Airtable metadata reset, or proceed with a narrow no-metadata scope?
3. Which Postgres target should be used for the first production-equivalent rehearsal?

Answers: (1) manifest first, small committed fixtures kept (Gate 6); (2) a narrow no-metadata scope
was approved as Phase 2A (Gate 9); (3) Neon was used for the rehearsal, and production is now on Prisma
Postgres (Gate 7, ADR-0010).
