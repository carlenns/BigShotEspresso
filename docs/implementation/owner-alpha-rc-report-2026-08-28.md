# Owner-Alpha Release Candidate Report — 2026-08-28

## 1. Release identity

- **Release:** BigShotEspresso / Coffee Log owner-alpha release candidate
- **Access class:** owner-only, per [ADR-0008](../ADR/ADR-0008-owner-only-first-release-access.md)
- **RC commit:** `e0ff6cf` — `feat(gate9): route ImportAudit as a read-only /data-health diagnostics page (#10)`
- **Date declared:** 2026-08-28
- **Suggested tag:** `v0.1.0-owner-alpha`
- **Deployment target:** one integrated Render web service serving the API and SPA, backed by Neon Postgres

This release candidate is a stable operational foundation for daily owner use. It
is not a public launch, not a subscriber launch, and not the start of the
intelligence-engine phase.

## 2. What this release proves

This owner-alpha RC proves that Coffee Log can:

- run from Postgres/Neon as the operational database,
- preserve Airtable/CSV evidence separately from runtime state,
- import or reconcile legacy Coffee Log data safely,
- support core shot logging, editing, review, bag, hopper, equipment, and settings workflows,
- keep `Include in Analysis` deterministic and server-derived,
- show active-bag reference comparisons without silently mixing bags,
- expose enough read-only diagnostics to investigate bad data without editing the database,
- deploy repeatably to Render without leaking secrets.

## 3. Gate results

| Gate | Status | Evidence |
|---|---|---|
| 1 Repository / CI | Passed | CI green on `e0ff6cf`; checklist linked from `START_HERE.md` |
| 2 Security baseline | Passed for owner-alpha | secrets remain environment-only; admin routes require `ADMIN_API_TOKEN`; live unauthenticated admin import rejected |
| 2.5 Color-blind / mobile cues | Passed | real 390px viewport and deuteranopia/protanopia review; nav edge-fade fix merged in PR #8 |
| 3 Neon rehearsal | Passed | disposable-Neon rehearsal documented |
| 4 CSV import verification | Passed for owner-alpha | CSV-only release path accepted |
| 5 Airtable metadata/live sync | Not in release scope | blocked, but not required because this RC has no runtime Airtable dependency |
| 6 Runtime API contract | Passed | read-only API checks plus SMK-1 mutating smoke |
| 7 Dashboard correctness | Passed | behavioural dashboard comparison tests merged in PR #8 |
| 8 Shot entry/edit workflow | Passed | SMK-1 verified create/edit/clear/readback/cleanup |
| 9 Admin/debug visibility | Passed | `/data-health` read-only diagnostics merged in PR #10 |
| 10 Backup/recovery | Passed for owner-alpha | Neon backup/restore runbook and rehearsal evidence |
| 11 Deployment prep | Passed for owner-alpha | SMK-2 Render URL/API smoke passed |
| 12 Release decision | Declared | this report explicitly accepts remaining open items |

## 4. Verification snapshot

- GitHub CI on `main` at `e0ff6cf`: passed.
- CI gates covered secret scan, typecheck, API tests, API build, and frontend build.
- Latest merged test count at Gate 9: 89 API/server tests.
- SMK-1 mutating lifecycle smoke passed against live Neon with labelled test data fully cleaned up.
- SMK-2 Render URL/API smoke passed against `https://bigshotespresso.onrender.com`.
- Exact Render-dashboard deployed SHA/build-log review remains optional evidence; URL/API smoke passed.

## 5. Accepted-open items

These are explicitly accepted into the owner-alpha RC rather than fixed now:

- **GRD-1:** Log Shot grind setting uses fixed `0.01` precision instead of the selected grinder's stored precision/increment.
- **GRD-2:** per-grinder timed-dosing fields remain deferred.
- **DI-2 cosmetic remainder:** server rejects negative ratings, but zod/OpenAPI `minimum: 0` annotation is still missing.
- **DI-3:** accessories are not foreign-keyed; deleting a used accessory can leave a dangling Settings string.
- **DI-4:** imported historical corpus has not been one-off rule-backfilled to match every current app-created rule.
- **DI-5 / TS-1:** taste selector deletion/archive model still needs the approved archive slice.
- **EQ-0..EQ-5 / EQ-2:** equipment-default consolidation and decaf/pour-over defaults remain a next-stage decision track.
- **SC-1..SC-3:** Analysis Drink Type, personal-vs-standard drink types, and fun drink achievements are deferred.
- **AUTH-0..AUTH-9:** accounts/auth/data ownership remain the Tier 2/3 gate, not an owner-alpha gate.
- **PL-1..PL-8:** remaining polish items are accepted as non-blocking.
- **Known data artifacts:** literal empty-string values in Bag #5 and shot #20 remain data-cleanup follow-ups.
- **Days Since Open edge:** whole-day calculation follows the existing date-truncation convention and can be off by one around late-night local entries.

## 6. Out of scope / non-goals

The following are not part of this RC:

- DCI, OSI, HMI, BLI, MSI, or GSP intelligence engines,
- AI assistant/native MCP integration,
- live Airtable sync as a runtime dependency,
- full Airtable-replacement admin UI,
- public multi-user access,
- subscriptions/payments,
- community features, leaderboards, or shared equipment libraries.

## 7. Deployment target

The RC target is the existing Render deployment:

- integrated API + SPA service,
- Neon Postgres as authority,
- CSV-only import/reconciliation path,
- `/data-health` for read-only owner diagnostics,
- admin mutation routes still server-side token-gated.

## 8. Decision queue for the next stage

These decisions gate the next stage, not this RC:

- **EQ-1:** approve equipment-default Option A, making Equipment-page `isDefault` the single source of truth.
- **EQ-2:** decide whether decaf/pour-over grinder defaults are launch needs or should be dropped/deferred.
- **TS-1:** approve taste-selector archive slice and use `archived_at timestamptz NULL` unless revised.
- **DI-4:** decide whether to run a one-off rules backfill on the imported historical corpus.
- **AUTH-0:** confirm magic-link authentication as the Tier 2 mechanism.

## 9. Backup / recovery pointer

Use [Neon Backup and Restore Runbook](neon-backup-restore-runbook.md) for recovery.
Airtable and CSV evidence remain preserved separately from runtime Postgres data.

## 10. Sign-off

Owner-alpha RC declared on 2026-08-28 at `e0ff6cf`.

Recommended tag command after final approval:

```sh
git tag -a v0.1.0-owner-alpha -m "Owner-alpha release candidate (ADR-0008: owner-only). Gates 1-12 satisfied; known items accepted-open." e0ff6cf
git push origin v0.1.0-owner-alpha
```
