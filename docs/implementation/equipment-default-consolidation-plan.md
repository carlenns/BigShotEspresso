# Implementation Plan: Equipment Default Consolidation (Option A)

Status: **Pending Carl's approval. This is a plan, not authorization to implement.**
Date: 2026-08-27
Author: Agent 2 (review/docs)
Source decision: `docs/architecture/equipment-default-source-of-truth-decision.md` — Option A
("Equipment page `isDefault` is the single source of truth; Dashboard reads it; retire the
Settings equipment dropdowns").

No code, schema, migration, or test is changed by this file.

---

## 1. Goal and scope

Make the per-record `isDefault` flag (already the source for Log Shot's machine/grinder
pre-select) the **only** mechanism for "default machine / grinder", and stop the parallel
Settings string keys from feeding the Dashboard setup summary.

**In scope:** default **machine** and **regular grinder**. **Out of scope for the first
phase:** default basket / puck screen / scale / tamper (accessory-side, phased later), and
the decaf / pour-over grinder question (a product decision, Phase 3).

## 2. Current state (verified `a0fc7ba`)

| Concern | Settings key(s) | Read by | `isDefault` on | Read by |
|---|---|---|---|---|
| Machine | `defaultMachine` | `routes/dashboard.ts` L508 | `machines.is_default` | `ShotForm.tsx` L549 (machineId pre-select), L568 (brewMethod seed) |
| Grinder | `defaultGrinder` / `defaultRegularGrinder` (twinned on write) | `routes/dashboard.ts` L507 | `grinders.is_default` | `ShotForm.tsx` L576 (grinderId pre-select) |
| Basket | `defaultBasket` / `defaultBasketSize` (twinned) | `routes/dashboard.ts` L509 | `accessories.is_default` (type `basket`) | nothing |
| Puck screen | `defaultPuckScreen` | `routes/dashboard.ts` L511 | `accessories.is_default` (type `puck_screen`) | nothing |
| Scale / Tamper / Decaf grinder / Pour-over grinder | `defaultScale`, `defaultTamper`, `defaultDecafGrinder`, `defaultPourOverGrinder` | **nothing** | — | — |

`isDefault` write semantics (existing): `routes/equipment.ts` clears the flag on **all**
rows of the same table before setting one (→ exactly one default machine, one default
grinder, globally). `routes/accessories.ts` **PATCH** clears per-`type` (L60) but **POST**
clears across all types (L37–38) — a pre-existing inconsistency to fix before the accessory
phase.

## 3. Keys deprecated by this plan

- **Retired from the UI and no longer read (Phase 1):** `defaultMachine`, `defaultGrinder`,
  `defaultRegularGrinder`.
- **Retired from the UI, already read nowhere (Phase 1):** `defaultScale`, `defaultTamper`,
  `defaultDecafGrinder`, `defaultPourOverGrinder`, `defaultBasketSize`.
- **Retired later (Phase 4):** `defaultBasket`, `defaultPuckScreen` (once the Dashboard
  summary reads accessory `isDefault`).
- The rows are **left in the `settings` table** through Phases 1–3 (inert once unread) and
  only deleted in Phase 5. Nothing else depends on them.

## 4. Phases

### Phase 0 — Backfill `isDefault` from existing keys (data prep, reversible)

A one-off script (not a schema migration; pure data): for each of `defaultMachine`,
`defaultGrinder` / `defaultRegularGrinder`:

1. Read the settings value (a label string such as `"Profitec Go"`).
2. Find the machine / grinder whose `equipmentLabel(row)` (shortLabel → name →
   brand+model) equals that string.
3. If exactly one match and no row of that table currently has `isDefault = true`, set it.
4. If a match exists but a *different* row is already `isDefault`, **do not overwrite** —
   log both and leave the existing flag.
5. If no match, **log the unmatched label** for the owner to resolve by hand on the
   Equipment page.

Output: a printed report (`matched`, `already-set`, `conflict`, `unmatched`). Idempotent —
safe to re-run. No `shots` / `bags` / `hoppers` rows touched.

### Phase 1 — Dashboard reads `isDefault`; Settings drops the machine/grinder rows

- `routes/dashboard.ts` L507–508:
  - `machine: compactLabel(machines.find((m) => m.isDefault) ?? null)` — return the compact
    label of the default machine, or `null`.
  - `grinder: compactLabel(grinders.find((g) => g.isDefault) ?? null)`.
  - (`compactLabel` currently takes `(savedValue, rows)` and matches by label; it needs a
    variant or small refactor that takes a row directly. Non-behavioural for other callers.)
  - L510 `usePuckScreen` / L511 `puckScreen` and L509 `basket` are **unchanged in Phase 1**
    (still key-driven). Note: `usePuckScreen` is already dead — see the launch-readiness
    audit "Bonus finding" — fixing it is optional cleanup, not part of this plan.
- `Settings.tsx`:
  - `EquipmentDefaultsSection`: remove the **Espresso Machine** and **Regular Grinder**
    `SettingsSelect`s. Remove **Decaf Grinder**, **Pour-Over Grinder**, **Default Scale**,
    **Default Tamper** (all read nowhere). Keep **Default Basket** and **Default Puck
    Screen** for now (still read by the Dashboard).
  - `GrinderDefaultsSection`: remove the `defaultGrinder` control (L322–327).
  - Update the card copy: it currently says Log Shot's machine/grinder come "from whichever
    record is marked Default on the Equipment page" — after Phase 1 that is also true of the
    Dashboard summary, so the sentence becomes "The Dashboard setup summary and Log Shot
    both use the record marked Default on the Equipment page."
  - Add a short link/hint pointing at `/equipment` for setting machine/grinder defaults.
- `equipment-capability-library-model.md` already treats `isDefault` as the owner signal —
  no change needed, but worth a one-line note that consolidation happened.

### Phase 2 — Decaf / Pour-over grinder decision (product, separate approval)

Carl decides whether role-specific grinder defaults (decaf, pour-over) are a launch need:

- **If no:** nothing further — the Phase 1 removal of those Settings slots stands.
- **If yes:** this is a *feature*, not part of this consolidation. Likely shape: a
  `grinder` choice on the shot itself, defaulted by `drinkType` / `brewMethod`, or a
  `role` column on `grinders`. Both are schema/feature work with their own plan and are
  explicitly **not** authorized here.

### Phase 3 — Fix accessory `isDefault` POST semantics

Prerequisite for Phase 4. `routes/accessories.ts` POST (L37–38) must clear `isDefault`
**per `type`** (like its own PATCH at L60), so a default basket and a default puck screen
can coexist. Small, self-contained, testable in isolation.

### Phase 4 — Dashboard basket / puck screen read accessory `isDefault`

- `routes/dashboard.ts` L509 / L511: resolve from
  `accessories.find((a) => a.isDefault && a.type === "basket")` /
  `… === "puck_screen"` instead of `settings.defaultBasket` / `settings.defaultPuckScreen`.
- Backfill `accessories.is_default` from `defaultBasket` / `defaultPuckScreen` using the
  Phase 0 pattern (per-type).
- `Settings.tsx`: remove the **Default Basket** and **Default Puck Screen** controls.
- Decide the fate of `machines.stockBasket` as a basket-default source (currently mixed
  into the Settings basket dropdown options) — likely leave as-is; it is a machine spec,
  not a default.

### Phase 5 — Delete the orphaned `settings` rows (optional cleanup)

A data script (not a schema migration) deleting the now-unread keys: `defaultMachine`,
`defaultGrinder`, `defaultRegularGrinder`, `defaultBasket`, `defaultBasketSize`,
`defaultPuckScreen`, `defaultScale`, `defaultTamper`, `defaultDecafGrinder`,
`defaultPourOverGrinder`. Reversible only from backup; safe because nothing reads them
after Phase 4. Could also just be left — the rows are inert.

## 5. After Phase 1 — exactly what `routes/dashboard.ts` L507–511 returns

| Field | Before | After Phase 1 |
|---|---|---|
| `activeBag.grinder` | `compactLabel(settings.defaultGrinder \|\| settings.defaultRegularGrinder, grinders)` | compact label of `grinders.find(g => g.isDefault)`, else `null` |
| `activeBag.machine` | `compactLabel(settings.defaultMachine, machines)` | compact label of `machines.find(m => m.isDefault)`, else `null` |
| `activeBag.basket` | `compactLabel(settings.defaultBasket, accessories) ?? settings.defaultBasket ?? null` | **unchanged** (Phase 4) |
| `activeBag.usePuckScreen` | `settings.usePuckScreen === "true"` (already always false) | **unchanged** (out of scope; already broken) |
| `activeBag.puckScreen` | `compactPuckScreenLabel(settings.defaultPuckScreen, accessories)` | **unchanged** (Phase 4) |

The Dashboard type (`Dashboard.tsx` `Intelligence.activeBag`) is unchanged — same field
names, same `string \| null` shapes.

## 6. Rollback

- **Phase 0:** re-run with a `--revert` mode that clears only the `isDefault` flags the
  report says it set (`matched` rows), or accept them (they also feed Log Shot, which
  already used `isDefault`, so they are not harmful).
- **Phase 1:** revert the `routes/dashboard.ts` and `Settings.tsx` diffs. The `settings`
  rows were never deleted, so the old read path works immediately. No data restore needed.
- **Phase 3:** revert the one-line POST change.
- **Phase 4:** revert diffs; `defaultBasket` / `defaultPuckScreen` rows still present.
- **Phase 5:** restore the deleted `settings` rows from backup (this is the only
  non-trivially-reversible step, which is why it is last and optional).

## 7. Test surface

Source-scan tests (existing `api-contract.test.ts` style), added as **new blocks** so they
do not collide with Agent 1's current edits:

- **Phase 1:**
  - `routes/dashboard.ts` resolves machine/grinder from `.find(x => x.isDefault)` and no
    longer references `settings.defaultMachine` / `settings.defaultGrinder` /
    `settings.defaultRegularGrinder`.
  - `Settings.tsx` no longer renders an Espresso Machine / Regular Grinder / Decaf Grinder
    / Pour-Over Grinder / Scale / Tamper `SettingsSelect`; `GrinderDefaultsSection` no
    longer sets `defaultGrinder`.
  - `Settings.tsx` card copy names the Equipment page as the single source.
  - Regression: `ShotForm.tsx` still pre-selects `machineId` / `grinderId` from `isDefault`
    (unchanged, pin it so a future edit can't silently break the now-sole mechanism).
- **Phase 0 / 4 backfill:** unit test the label-match resolver — exact match sets the flag;
  ambiguous / conflicting / unmatched are reported and do not overwrite.
- **Phase 3:** `routes/accessories.ts` POST clears `isDefault` filtered by `type`.
- **Dashboard behaviour** (if a route-level fixture test is added): a machine flagged
  `isDefault` surfaces as `activeBag.machine`; none flagged → `null`.

## 8. Migration / data implications summary

- No `shots`, `bags`, `hoppers`, or equipment **schema** change in any phase.
- Phase 0 / 4 write `is_default` booleans on existing `grinders` / `machines` /
  `accessories` rows (columns already exist, default `false`).
- Phase 5 deletes `settings` key/value rows (optional, backup-reversible).
- Best-effort label matching never guesses: unmatched defaults are reported for the owner
  to set by hand, never silently dropped or approximated.

## 9. Open questions for Carl

1. Approve Option A and this phasing? Which phases are in the first slice — just Phase 0+1,
   or through Phase 4?
2. Decaf / pour-over grinder defaults — launch need (Phase 2 "yes" path) or drop?
3. Delete the orphaned `settings` rows (Phase 5) or leave them inert?
4. Fix the already-dead `activeBag.usePuckScreen` read as part of Phase 1, or track it
   separately?
