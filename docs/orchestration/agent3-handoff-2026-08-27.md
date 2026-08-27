# Agent 3 Orchestrator Handoff — 2026-08-27

State handoff so a **cloud Claude Code session** can take over as orchestrator
("Agent 3") for BigShotEspresso / Coffee-Log, driven from Carl's phone with the
laptop closed.

---

## 1. Read these first

- `docs/implementation/launch-readiness-roadmap.md` — the board. Every open item,
  dependency-ordered, tagged A (safe now) / B (needs Carl's approval) / C (needs
  a product decision) / D (blocked on ADR-0009 auth).
- `docs/implementation/launch-readiness-audit.md` — findings record (Parts 1 & 2).
- `docs/architecture/equipment-default-source-of-truth-decision.md` +
  `docs/implementation/equipment-default-consolidation-plan.md` — Option A.
- `docs/architecture/taste-selector-vocabulary-model.md` — archive-not-delete decision.
- `docs/PROJECT_CONSTITUTION.md`, `docs/START_HERE.md` — project ground rules.

## 2. Git state

- Repo: `https://github.com/carlenns/BigShotEspresso.git`, working path is the
  `Coffee-Log/` subdir (that's the git root).
- `main` is pushed and in sync with `origin/main` as of commit `1edeb3f`.
- Last 7 commits this session (oldest→newest): `7dd9ac2` `a0fc7ba` `3230e02`
  `bd7265a` `4b1c6b6` `56888d3` `1edeb3f`.
- Working tree is clean.

### What those commits delivered
- `7dd9ac2` / `bd7265a` — Log Shot: bag-default visibility, then WYSIWYG number
  defaults (shown default is the saved default; create-only seeding effect).
- `a0fc7ba` — confirm-gate one-tap deletes on Beans/Equipment/Accessories/Taste
  Selectors; equipment-default decision doc; standing-rule audit Part 1.
- `3230e02` — server-side: sour-shot exclusivity in `normalizeShotInput`;
  hopper-phase allow-list on `/hoppers`; dead `usePuckScreen` key rewired.
- `4b1c6b6` — taste-selector vocabulary model decision record.
- `56888d3` — graceful `409`/`404` delete error contract for catalog routes;
  reject negative ratings; the launch-readiness roadmap.
- `1edeb3f` — dose-correction: record `overGrindRemoved` when a top-up overshoots
  the target dose (restores Carl's original formula); preview-box rewording;
  0.2 s floor on Top-Up Time Adj.

## 3. Agent model going forward

The old setup was three local `claude` terminal sessions (Agent 1, Agent 2,
Agent 3) on Carl's Mac. **Those die when the laptop closes and you cannot reach
them.** As a cloud orchestrator:

- Spawn your own **worker subagents** (the `Agent` tool) in the cloud for
  implementation and review slices. They report back to you.
- One implementation slice at a time per subagent. Give each a precise,
  file-scoped task; forbid pushing and committing without Carl's explicit word.
- **Every task prompt must end with:** "send your completion report to the
  orchestrator via your normal return channel — do not just write it into the
  files." (A local peer once finished and went idle without reporting.)
- After a subagent reports: freeze the tree (`git diff | git hash-object
  --stdin` before and after), run the three verification gates, review the diff,
  then present a commit to Carl.

## 4. Verification gates (required for any code/TSX/test change)

```
CI=true pnpm run typecheck
CI=true pnpm --filter @workspace/api-server test
CI=true pnpm run build:render
```

Docs-only changes need none. `pnpm --filter @workspace/api-server test` is the
only test runner; `coffee-log` has none, so logic in `coffee-log/src/lib` is
covered by source-scan assertions in `artifacts/api-server/src/api-contract.test.ts`.
Test count is currently **77/77**.

## 5. Commit / push discipline

- Commit only when Carl explicitly says so. Push only when Carl explicitly says
  so (he lifted the standing no-push rule on 2026-08-27 to enable cloud work).
- Commit message footer:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- Combined commits per dated cycle are fine (precedent: several this session)
  when shared files (`api-contract.test.ts`, `completed-tasks.md`,
  `launch-readiness-audit.md`) make a per-slice split fiddly.
- `completed-tasks.md` gets a new dated `##` section at the TOP per slice.

## 6. Open decisions awaiting Carl (blockers on whole tracks)

| Ref | Decision needed |
|---|---|
| EQ-1 | Approve equipment-default consolidation Option A (make Equipment `isDefault` the single source of truth; deprecate the Settings `default*` keys) + the `archived_at` vs `is_active` style question |
| EQ-2 | Decaf / pour-over grinder default model (product decision) |
| TS-1 | Approve the taste-selector archive slice + its additive migration (`archived_at timestamptz NULL` recommended, plus an `origin` column) |
| DI-4 | Whether the imported historical corpus gets a one-off rule-backfill (recompute include-in-analysis, normalise signature/sour, clamp ratings) |
| AUTH-0 | Confirm the auth approach (magic-link) to unblock ADR-0009 |

## 7. Ready-to-run slices (no new decision needed)

- **Frontend 409 message rendering** (A, S) — the catalog delete `mutationFn`s
  do `throw new Error(await response.text())` then `toast({ description:
  String(e) })`, so a `409` shows as `Error: {"error":"…"}`. Parse the JSON and
  throw `body.error`. Four files: Beans/Equipment/Accessories/TasteSelectors.tsx.
- **SMK-1 / SMK-2** (A, M) — a real-browser lifecycle smoke pass (bean → bag →
  dial-in → log → edit → detail → close → Change Bag → Start Phase → Dashboard)
  and a Render deploy smoke test. Never done end-to-end; gates the Gate-12
  release decision. Roadmap's #1 recommendation.
- **EQ-0 / EQ-3** (A, S) — backfill `isDefault` from Settings label strings; fix
  accessory `POST` `isDefault` per-type. De-risks EQ-1 regardless of the decision.

## 8. Known limitations logged (not bugs to chase)

- ShotForm bag-switch: a field already holding a value (manual or auto-seed) is
  not re-seeded to a new bag's default; the pre-existing `appliedBagDefaultsFor`
  effect still refreshes the five bag-scoped fields where the new bag provides a
  value.
- `totalOutput` is populated only by CSV/Airtable import, never by app-created
  shots — deliberate (Carl's call on the dose-correction slice).
- Three launch docs now exist (audit / checklist / roadmap) — watch for drift.

## 9. Hard boundaries (do not implement without explicit scope)

auth/users/payments · predictive intelligence · Bluetooth / brew curves ·
community features · MCP/native AI · new schema/migration/API fields (flag for
approval first) · Quick Log revival · inventing fields / formulas / selector
values / thresholds. Postgres is source of truth. Full Log Shot is primary;
Quick Log is shelved. Preserve historical data.
