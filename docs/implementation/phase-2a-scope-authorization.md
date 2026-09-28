# Phase 2A — Owner-Alpha App Completion: Scope Authorization

Date: 2026-09-28
Status: **Authorized (narrow scope)** — plan approved by Carl in the 2026-09-28 planning session.
Authority: subordinate to the [Constitution](../PROJECT_CONSTITUTION.md), [ROADMAP](../ROADMAP.md), ADRs, and [ADR-0008](../ADR/ADR-0008-owner-only-first-release-access.md) (owner-only access still applies).

## Why this exists

[Pre-Phase-2 Readiness Gates](pre-phase-2-readiness-gates.md) Gate 9 allows Phase 2 to begin by
option (2): **explicit owner approval of a narrow scope that avoids unresolved Airtable-metadata
areas.** This document is that approval record. It does not authorize the full roadmap Phase 2,
and it does not authorize any intelligence phase.

## Gate waivers (this scope only)

| Gate | Waiver | Rationale |
|---|---|---|
| 5 Airtable metadata | Waived for Phase 2A | Every Phase 2A slice uses fields the owner-alpha RC already reads/writes from Postgres. No slice replaces an Airtable formula, adds a relationship, or depends on unverified field configuration. |
| 8 Live Airtable sync dry run | Waived for Phase 2A | The RC has no runtime Airtable dependency (RC Gate 5 "not in release scope"). Phase 2A adds none. |

Gates 3, 4 and 6 remain draft/open and continue to gate any work that touches unmapped Shot
fields, target-model changes, or fixture policy.

## Authorized slices

| Slice | Scope | Category |
|---|---|---|
| S0 | Governance catch-up: this doc, ROADMAP status, completed-tasks backfill, stale-doc fixes | docs |
| S1 | DI-2 contract `minimum: 0`; EQ-3 accessory POST per-type default; PL-1, PL-2, PL-3, PL-4, PL-6 | A |
| S2 | Shot List filter controls and paging over the existing `GET /shots` query params, plus one additive exact `bagId` param (the name filter is a substring match) | B |
| S2b | System Phase labels + default (added mid-session at Carl's request, 2026-09-28): saved labels 1 Initial Setup / 2 Scientific Process / Baseline / 3 Timed Dose Optimization / 4 Active Experimentation Era; Current System Phase = 3 for new shots; Log Shot dropdown fills Phase Name. Settings rows only (migration 0015 + runtime seed, never overwrites); no schema change, no backfill of existing shots | B |
| S2c | Saved Phase Name / Experiment selectors per System Phase, with + to add a new value that is saved for future shots; seeded once from existing shot values (Carl-requested, 2026-09-28). Settings rows only | B |
| S3 | Hopper phase **edit** and **end** in the Bags UI via existing `PATCH /hoppers/:id`; no UI delete; no range-baseline UI | B (UI only) |
| S4 | GRD-1: Log Shot grind stepper follows the selected grinder's stored increment/precision (display only; stored history unchanged) | B |
| S5 | Equipment defaults Option A (EQ-0/EQ-1/EQ-4/DI-6) — **approved by Carl 2026-09-28** incl. moving Default Basket to Accessories; EQ-2 decaf/pour-over deferred; old Settings rows left inert (EQ-5 not done) | B |
| S6 | Query-efficiency preparation for a future per-operation-billed Postgres host: test-only query counter, fewer round trips on dashboard and shot writes. **No database/host change.** | A/B |

## Explicit non-goals

Quick Log revival (stays parked per RC Gate 0.5), DI-4 corpus backfill, GRD-2 timed-dosing
schema, SC-1..3, PL-5/PL-7/PL-8, DI-3 accessory foreign keys beyond what S5 resolves,
accounts/auth/Clerk/`user_id`, any DCI/OSI/HMI/BLI/MSI/GSP intelligence, live Airtable sync,
the Neon → Prisma Postgres switch, and any infrastructure or plan change.

## Working rules

- One slice at a time; each verified with `pnpm run typecheck`, `pnpm run test:phase1.5`, and
  `pnpm run build` before it is proposed for commit.
- No commit, push, merge, tag, or deploy without Carl's explicit request (CLAUDE.md).
- Time is recorded in [DEVELOPMENT_TIME_LOG](../RESEARCH/DEVELOPMENT_TIME_LOG.md) as ordinary
  development, not R&D.

## Completion record

See [completed-tasks.md](../completed-tasks.md) entries titled "Phase 2A — S*".

| Slice | Status (2026-09-28) |
|---|---|
| S0–S6 (incl. S2b, S2c, S5) | Implemented and verified; merged to `main` via PR #13 (merge commit `5d23e2d`, 2026-09-28). Pre-merge check on Carl's Mac: typecheck ✓, 131/131 tests ✓, Render build ✓ |
