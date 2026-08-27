# Decision Proposal: "Default Machine / Grinder" Source-of-Truth Split

Status: **Proposal — pending Carl/Codex approval. Not implemented.**
Date: 2026-08-27
Author: Agent 2 (review/docs)
Scope: documentation only. No code, schema, migration, or API change is made by this file.

---

## 1. Problem

BigShotEspresso currently has **two independent mechanisms** for "which machine / grinder
is the default," they are never synchronised, they are stored differently, and they feed
different screens. A user who sets a default in one place sees no effect in the other.

## 2. Current behaviour, mechanism by mechanism

### 2a. Settings → "Equipment Defaults" / "Grinder Defaults" (string settings keys)

`artifacts/coffee-log/src/pages/Settings.tsx` (`EquipmentDefaultsSection` ~L464,
`GrinderDefaultsSection` ~L298) renders dropdowns that write these `settings` key/value
rows (values are **label strings** such as `"Profitec Go"`, chosen from a dropdown
populated by equipment/accessory records but persisted as free text, not a foreign key):

| Settings key | Written by | Twinned write | Read by |
|---|---|---|---|
| `defaultMachine` | Espresso Machine dropdown | — | `routes/dashboard.ts` L508 |
| `defaultRegularGrinder` | Regular Grinder dropdown | also sets `defaultGrinder` | `routes/dashboard.ts` L507 (via `defaultGrinder \|\| defaultRegularGrinder`) |
| `defaultGrinder` | Grinder Defaults section | also sets `defaultRegularGrinder` | `routes/dashboard.ts` L507 |
| `defaultBasket` | Default Basket dropdown | also sets `defaultBasketSize` | `routes/dashboard.ts` L509 |
| `defaultPuckScreen` | Default Puck Screen dropdown | — | `routes/dashboard.ts` L511 |
| `defaultBasketSize` | (twin of `defaultBasket`) | — | **nothing** |
| `defaultScale` | Default Scale dropdown | — | **nothing** |
| `defaultTamper` | Default Tamper dropdown | — | **nothing** |
| `defaultDecafGrinder` | Decaf Grinder dropdown | — | **nothing** |
| `defaultPourOverGrinder` | Pour-Over Grinder dropdown | — | **nothing** |

**Consumer:** only `artifacts/api-server/src/routes/dashboard.ts` L507–511, which resolves
`settings.defaultGrinder \|\| settings.defaultRegularGrinder`, `settings.defaultMachine`,
`settings.defaultBasket`, `settings.defaultPuckScreen` into compact labels for the
Dashboard **"Current Baseline"** setup summary (the `activeBag.grinder / machine / basket /
puckScreen` fields). Nothing else in the app reads any of these keys.

Settings' own copy already says so (`EquipmentDefaultsSection` CardDescription): *"These
feed the Dashboard setup summary and pre-fill accessory/basket workflows. The Machine and
Grinder that Log Shot pre-selects come from whichever record is marked Default on the
Equipment page, not from here."*

### 2b. Equipment page → per-record `isDefault` flag (row boolean)

`grinders.isDefault` / `machines.isDefault` are boolean columns. `routes/equipment.ts`
(L18, L41, L77, L96) clears the flag on **all other rows of the same table** before
setting it — no `WHERE`, so there is **exactly one** default grinder and **exactly one**
default machine globally (not one per role/type).

**Consumer:** `artifacts/coffee-log/src/pages/ShotForm.tsx`
- L549: `machines.find((m) => m.isDefault)` → pre-selects `machineId` on a new shot.
- L576: `grinders.find((g) => g.isDefault)` → pre-selects `grinderId` on a new shot.
- L568: the default machine's own `brewMethod` seeds the Brew Method field.

`docs/architecture/equipment-capability-library-model.md` L167/L173 also treats
"configured as the user's default machine/grinder" (i.e. `isDefault`) as a verified-owner
signal for the future community-evidence model.

Accessories also carry `isDefault` (`Accessory` type, Settings.tsx L48) but no code path
reads it today.

## 3. Where the two diverge

1. **No sync.** Changing a Settings dropdown never touches `isDefault`; toggling
   `isDefault` on the Equipment page never touches a settings key. The Dashboard summary
   and the Log Shot pre-select can (and by default do) disagree.
2. **Storage type.** Settings keys store a **label string**; renaming a machine/grinder
   silently breaks the key (label no longer matches any record → summary line goes blank).
   `isDefault` is a row flag and survives renames.
3. **Granularity.** Settings has role-specific grinder slots (Regular / Decaf / Pour-Over);
   `isDefault` is a single global grinder. Log Shot always pre-selects that one grinder
   regardless of the shot's drink type or brew method.
4. **Dead controls.** `defaultScale`, `defaultTamper`, `defaultDecafGrinder`,
   `defaultPourOverGrinder`, and the `defaultBasketSize` write-twin are saved and shown in
   Settings but read nowhere — the same "controls that visibly do nothing" class as
   `launch-readiness-audit.md` Critical Blocker #4.
5. **Alias pairs.** `defaultGrinder`⇄`defaultRegularGrinder` and
   `defaultBasket`⇄`defaultBasketSize` are kept in step only by write-time `set()`
   twinning in the UI — `launch-readiness-audit.md` Medium-priority polish #9.

## 4. Reconciliation options

### Option A — `isDefault` is authoritative; Dashboard reads it; retire the Settings equipment dropdowns

- `routes/dashboard.ts` L507–511: replace `settings.default*` lookups with
  `machines.find(m => m.isDefault)` / `grinders.find(g => g.isDefault)` and (for
  basket/puck-screen) `accessories.find(a => a.isDefault && a.type === …)`.
- Settings: remove the machine/grinder rows from "Equipment Defaults" and the grinder row
  from "Grinder Defaults"; keep only genuinely Settings-level preferences.
- **Data/migration:** one-time best-effort backfill — for each existing `default*` key,
  find the equipment/accessory record whose label matches and set its `isDefault = true`
  (unmatched labels reported to the owner, never silently dropped). Accessories need the
  same "clear others of the same type" logic `equipment.ts` already has for grinders/
  machines. Orphaned `default*` settings rows are inert; delete them in a later cleanup
  migration or leave them.
- **Pros:** one concept; rename-safe; matches where the primary workflow (Log Shot)
  already looks; consistent with the model doc's owner-signal; removes 5 dead controls.
- **Cons:** role-specific grinder slots (decaf / pour-over) are lost unless `isDefault`
  grows a role dimension — that is a *feature* decision and schema work, out of current
  bounds. Basket/scale/tamper/puck-screen defaults would need accessory `isDefault` wired
  through (several have no consumer today anyway).

### Option B — Settings keys are authoritative; Log Shot reads them; `isDefault` becomes display-only

- `ShotForm.tsx`: resolve `settings.defaultMachine` / `settings.defaultRegularGrinder` to a
  record id by label match and pre-select that (`settings` is already fetched in the form).
- Keeps the role-specific grinder slots and the familiar "one Settings screen" model.
- **Cons:** label-string storage stays fragile (rename breaks pre-select); the Equipment
  page's "Default" badge/highlight becomes decorative or must be removed; contradicts the
  model doc's `isDefault`-based owner signal; still needs the dead-key cleanup.

### Option C — Keep both, sync bidirectionally on write

- `equipment.ts`: setting `isDefault` also writes the matching `default*` settings key.
  Settings route/UI: changing a `default*` dropdown also flips `isDefault` on the matching
  record. Dashboard and Log Shot are unchanged.
- **Pros:** smallest UI change; both entry points keep working.
- **Cons:** two stores to keep consistent forever; import, direct DB edits, and renames
  still desync; role-specific grinders still cannot map onto a single `isDefault`; the 5
  dead keys remain unless separately cleaned. This is the highest long-term maintenance
  cost and is exactly the "duplicate-purpose keys bridged only by fallback logic" smell
  the audit already flags.

## 5. Recommendation

**Option A, phased.**

- **Phase 1 (no schema change):** point `routes/dashboard.ts` at `isDefault` for machine
  and grinder; leave basket/puck-screen reading the settings key for now. Add a read-only
  note to (or hide) the machine/grinder rows in Settings "Equipment Defaults". Run the
  best-effort `isDefault` backfill from the existing `default*` keys, logging every
  unmatched label for the owner to resolve by hand on the Equipment page.
- **Phase 2 (separate approval):** decide whether role-specific grinders (decaf /
  pour-over) are a real launch need. If yes, that is a deliberate feature — a `grinder`
  selection on the shot driven by drink type, or a `grinder_role` dimension — not part of
  this reconciliation. If no, drop those two Settings slots.
- **Phase 3:** delete the now-inert `default*` settings rows in a cleanup migration, or
  leave them (harmless).

**Data implications:** no `shots` / `bags` / `hoppers` rows are touched by any phase. Only
the `settings` key/value table and equipment `isDefault` flags change. The backfill is
best-effort label matching; unmatched defaults are surfaced, never guessed.

**Why A over B/C:** the primary logging workflow already uses `isDefault`; it is
rename-safe; it is the signal the equipment-capability model doc already assumes; and it
lets us delete dead Settings controls instead of wiring more of them up.

## 6. Open questions for Carl/Codex

1. Are decaf / pour-over grinder defaults a launch requirement, or post-launch?
2. Should the Dashboard "Current Baseline" summary show equipment at all once Log Shot
   records `machineId` / `grinderId` per shot — i.e. is the summary line even needed?
3. Keep or delete the orphaned `default*` settings rows (Phase 3)?
