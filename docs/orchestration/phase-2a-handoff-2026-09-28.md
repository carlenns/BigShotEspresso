# Phase 2A Handoff — 2026-09-28

State handoff for whoever picks up BigShotEspresso / Coffee-Log next (Carl at his
computer, or a new Claude session).

## 1. Where the work is

- Branch: `phase-2a/owner-alpha-completion`, **10 commits on top of `main` @ `f9cd885`**.
- **Not pushed.** The cloud session that built it had no GitHub write access to
  `carlenns/BigShotEspresso`. The branch was delivered as `bse-phase-2a.bundle` (all commits)
  and `phase-2a-all.patch` (one diff).
- To publish (on Carl's Mac, in the repo, with `main` up to date):

```sh
git fetch ~/Downloads/bse-phase-2a.bundle phase-2a/owner-alpha-completion:phase-2a/owner-alpha-completion
git checkout phase-2a/owner-alpha-completion
pnpm install --frozen-lockfile && pnpm run typecheck && pnpm run test:phase1.5 && pnpm run build
git push -u origin phase-2a/owner-alpha-completion
```

Then open a PR into `main`. Merging deploys to Render as usual.

## 2. What the 10 commits deliver

| Commit | Slice | Summary |
|---|---|---|
| `b7c70c5` | S0 | Phase 2A scope record (Gate 9 option 2, Gates 5/8 waived for this scope); roadmap + records catch-up |
| `f81af51` | S1 | DI-2, EQ-3 (toggle-only PATCH), PL-1/2/3/6; PGlite route-test harness (`pglite-test` export condition) |
| `74dd25f` | S2 | Shot Log filters + paging; exact `bagId` filter on `GET /shots` |
| `5c8b322` | S2b | System Phase labels (1 Initial Setup, 2 Scientific Process / Baseline, 3 Timed Dose Optimization, 4 Active Experimentation Era); new shots start on Phase 3 |
| `c94d17a` | S3 | Edit / end the active hopper phase (no delete) |
| `79addfa` | S4 | GRD-1: grind stepper follows the selected grinder |
| `03106f2` | S6 | Fewer DB operations (settings save N→1, dashboard 9→8, shot edit 3→2) with pinned budgets; React Query caching |
| `0b79edd` | — | Shot Log paging clamp; verification record |
| `4e80c46` | S2c | Saved Phase Name / Experiment selectors per System Phase, with + to add |
| `3ee01dd` | S5 | Equipment defaults Option A: Equipment/Accessories Default is the single source; one-time boot backfill; Settings card read-only |

Details and verification for each: `docs/completed-tasks.md` ("Phase 2A — S*") and
`docs/implementation/phase-2a-scope-authorization.md`.

Verification at handoff: typecheck ✓ · `test:phase1.5` 131/131 (was 99) ✓ · Render build ✓ ·
390 px browser pass of every new screen.

## 3. What happens on first deploy (automatic, never overwrites)

- Settings rows seeded: `systemPhaseLabels`, `currentSystemPhase` (= 3), and
  `systemPhaseNameOptions` / `systemPhaseExperimentOptions` built from values already on shots.
- Equipment defaults backfill runs once: old Settings strings (`defaultMachine`,
  `defaultGrinder`, `defaultBasket`, `defaultPuckScreen`) are copied onto the one matching
  Equipment/Accessories record, only if that type has no default yet. The report is stored in
  `settings.equipmentDefaultsBackfill`.

## 4. Carl's post-deploy checklist (~5 min, owner smoke)

1. Settings → Equipment Defaults: confirm machine / grinder / basket / puck screen. If a
   yellow "couldn't be matched" note appears, mark the right record Default on Equipment or
   Accessories.
2. Settings → System Phases: labels and Current System Phase = 3 are there.
3. Log Shot: System Phase shows "Phase 3 — Timed Dose Optimization"; try + on Phase Name and
   Experiment; grind +/− steps by your grinder's increment.
4. Save a test shot, then check it in the Shot Log with the Active bag filter; edit and clean up.
5. Bags: tap "Hopper: Phase X" to confirm the edit/end dialog opens (Cancel is fine).

## 5. Decisions recorded this session

- Phase 2A narrow scope approved; Airtable Gates 5/8 waived for it only.
- System Phase labels and default Phase 3; Phase Name / Experiment options saved per phase.
- Equipment defaults Option A approved, including moving Default Basket to Accessories.
  Decaf / pour-over defaults deferred. Old Settings rows left inert (EQ-5 not done).
- Quick Log stays parked.

## 6. Still open / sensible next steps

- Publish and merge this branch, then run the §4 smoke.
- Candidates for the next slice (none authorized yet): PL-5 / PL-7 / PL-8 polish, DI-3 accessory
  FKs, DI-4 corpus backfill decision, Shot Log filter by System Phase / Experiment, the Neon →
  Prisma Postgres migration phase (runbook + remaining query merges listed in
  `docs/implementation/query-efficiency-2026-09-28.md`), and the Clickonomics / Clerk auth track.
- The tag `v0.1.0-owner-alpha` from the RC report was never created; optional.
