# Taste Selector Vocabulary Model

Status: **Decision record + future-work scope. Records a decision from Carl (2026-08-27).
Does NOT authorize implementation or any migration.** The "Immediate implementable slice"
section below is the recommended shape of the first PR, not approval to write it.

Related: `docs/implementation/launch-readiness-audit.md` → "Standing-Rule Enforcement Audit
— Part 2 (delete integrity, rating bounds, import) — 2026-08-27" (the CASCADE-delete
finding this doc responds to); `docs/ADR/ADR-0009-user-accounts-authentication-and-data-ownership.md`
(the account model the custom-selector scoping depends on).

---

## Problem

### 1. Standardization is required for global aggregation

A future global / online records database aggregates shot data across users. Taste tags are
a primary analytic dimension ("shots tagged Bright Expression average …"). If every user
invents their own free-form vocabulary, cross-user aggregation is meaningless — "Choc",
"chocolatey", "Chocolate" and "cocoa" are four rows. The canonical vocabulary must be a
single shared list with stable identity so the same concept aggregates the same way for
everyone.

### 2. Destructive delete silently rewrites history

Current behaviour (verified — see the Part 2 audit): `shot_taste_selectors.taste_selector_id`
is declared `ON DELETE CASCADE` (`lib/db/migrations/0000_bootstrap_current_schema.sql:256`),
and `DELETE /taste-selectors/:id` (`artifacts/api-server/src/routes/taste-selectors.ts:79`)
is a bare `db.delete`. Deleting a selector removes it from **every historical shot that
carried it**, with no record it ever existed. This conflicts directly with the standing
"preserve historical data" rule and would corrupt any records already uploaded to the
global DB.

### 3. `is_default` is overloaded

`taste_selectors.is_default` (`lib/db/src/schema/taste-selectors.ts`) currently does two
unrelated jobs at once:

- marks a selector as one of the 25 seeded "standard" selectors (`STANDARD_SELECTORS` in
  `routes/taste-selectors.ts`, inserted with `isDefault: true`), and
- gates the UI: `TasteSelectors.tsx` only shows the edit/delete controls for
  `!s.isDefault` selectors.

There is no field that says "this is a personal selector vs a canonical one" as a
first-class concept, and `category === "custom"` does **not** mean that (a personal
selector could legitimately be categorized `flavor`).

---

## Decision

### D1. Archive instead of destructive delete

Selectors are **archived**, not deleted. Archiving hides a selector from the tag picker for
new shots but leaves the tag intact on every historical shot and in personal analytics.
Restore un-hides it. A true "remove from all records" hard delete still exists but is gated
and rare — pre-launch vocabulary cleanup only. **Nothing is hard-deleted once the canonical
master list is locked and any records have been uploaded globally.**

Requires one additive, nullable column on `taste_selectors` — see "Archive column
recommendation" below.

### D2. Master list is canonical and versioned

The standard list is the canonical vocabulary. It will evolve — selectors get added,
renamed, or retired as the taste model matures. Therefore canonical selectors need:

- **stable, deployment-independent identity** — the current `id` is a Postgres `serial`
  assigned at seed time, so the same "Acidity" concept can have a different `id` on
  different instances. Global aggregation cannot key on that. A canonical selector needs a
  stable `canonical_key` (a slug such as `balance.acidity`, or a UUID minted in the canon
  definition, not the DB) that is identical everywhere.
- **a version stamp** so a selector can be retired from the canon (stop offering it for new
  tagging) without orphaning old records or breaking the aggregation mapping — retired
  canonical selectors still resolve for historical data.

The mechanism for this (`canonical_key`, `canon_version`, how the canon definition is
distributed and applied) is **future work** — see Out of scope. It is called out here so
the archive/origin migration below is designed not to block it (both `canonical_key` and
`canon_version` are additive columns when they land).

### D3. Custom selectors are account-scoped and never aggregate globally

- A user's custom selector works fully on their own shots and personal analytics.
- It is flagged personal and is **excluded from the global upload** — only canonical
  selectors flow to the global records DB.
- The escape hatch for anything not worth a selector is the existing free-text
  `shots.sensory_notes` field (already in the schema; already surfaced in Log Shot and
  Shot Detail). Personal vocabulary that does not warrant a selector belongs there.
- Future option: BSE observes that a personal selector is widely and consistently used and
  promotes it into the canon (with a new `canonical_key`), after which it aggregates
  globally going forward. Not built now.

This depends on the account / ownership model (a `user_id` on `taste_selectors`), which is
deferred — see Dependency.

### D4. Add a `scope` / `origin` column now, not later

Add an explicit origin column to `taste_selectors` in the **same migration** as the archive
column:

- values: `standard` (canonical) vs `custom` (personal).
- backfill: existing rows with `is_default = true` → `standard`; all others → `custom`.
- new code reads `origin` for the "is this canonical?" question and for gating
  edit/hard-delete in the UI; `is_default` is left in place (dropping a column is a
  separate, destructive change) but stops being read for that purpose.

Retrofitting the personal/canonical split **after** users have created selectors — with no
column that records which is which — is painful and error-prone (you would be guessing from
`is_default`, `category`, and creation date). Doing it now, while there is effectively one
user and a clean 25-item standard list, is cheap.

---

## Archive column recommendation

**Recommend: `archived_at timestamptz NULL`** (not `is_active boolean`).

| | `archived_at timestamptz NULL` | `is_active boolean NOT NULL DEFAULT true` |
|---|---|---|
| Records *when* it was retired | yes — matters for the "preserve historical data / audit trail" motivation that is the whole reason we are not hard-deleting | no |
| Migration on existing rows | `ADD COLUMN archived_at timestamptz` — every existing row is `NULL` = active, no backfill | needs `DEFAULT true` and a backfill is implicit |
| "active?" query | `WHERE archived_at IS NULL` | `WHERE is_active` (slightly terser) |
| Restore | `SET archived_at = NULL` | `SET is_active = true` |
| Schema consistency | matches `taste_selectors.created_at` and the nullable-timestamp lifecycle markers already used for bag closeout (`bags.closed_out_date`) and hopper phases | matches the `is_active` booleans on `bags` / `beans` / `accessories` |

Both are defensible; the project uses each pattern somewhere. The tie-breaker is that the
reason for this whole change is *not losing information when something is retired* — a
timestamp keeps "retired on 2026-09-14", a boolean does not. If the team prefers boolean
consistency with `bags`/`beans`/`accessories`, `is_active boolean NOT NULL DEFAULT true` is
an acceptable substitute that loses only the timestamp; do not do both.

---

## Dependency

- **D3 (account-scoped custom selectors) cannot ship before the accounts / ownership model
  (ADR-0009 auth work, currently deferred).** Until there is a `user_id`, "custom" just
  means "not canonical" for a single owner; the "flagged personal, excluded from global
  upload" behaviour only becomes meaningful once uploads and multiple users exist.
- **D1 (archive) is independent of accounts and can ship now.** D4 (`origin` column) is
  also account-independent and should ride along with D1.

---

## Immediate implementable slice (no accounts needed)

Recommended shape of the first PR. **Not authorized here.**

1. **Additive migration** (`lib/db/migrations/`, plus matching `.down.sql`):
   - `ALTER TABLE taste_selectors ADD COLUMN archived_at timestamptz;` (nullable, no
     default → existing rows active).
   - `ALTER TABLE taste_selectors ADD COLUMN origin text NOT NULL DEFAULT 'standard';`
   - `UPDATE taste_selectors SET origin = 'custom' WHERE is_default = false;`
   - down migration drops both columns. No data loss, fully reversible.
   - Update `lib/db/src/schema/taste-selectors.ts` and the generated API zod/types
     accordingly (additive).
2. **API** (`artifacts/api-server/src/routes/taste-selectors.ts`):
   - `GET /taste-selectors` returns `archived_at` and `origin`; add `?includeArchived=true`
     (default: archived excluded).
   - Archive / restore: either extend `PATCH /taste-selectors/:id` to accept
     `archived_at` (set to now / clear to null), or add `POST /taste-selectors/:id/archive`
     and `.../restore`. Prefer the explicit endpoints for auditability.
   - Keep `DELETE /taste-selectors/:id` but gate it: require the admin token (same posture
     as the import routes) **and** an explicit `?force=true`, and have it also delete the
     `shot_taste_selectors` rows in an explicit statement rather than relying on the
     cascade, so "this is destructive" is visible in the code. Document it as
     pre-launch-cleanup-only.
   - Add `isNaN(id)` guards to the archive/restore/delete handlers (currently missing on
     delete).
3. **Taste Selectors page** (`artifacts/coffee-log/src/pages/TasteSelectors.tsx`):
   - Replace the common-case Delete with **Archive** (available for both `standard` and
     `custom` selectors).
   - A collapsed "Archived" section with a **Restore** action.
   - Hard delete moved behind a second confirmation, labelled "removes this tag from every
     historical shot", and shown only when it is actually permitted (pre-launch / admin).
   - Gate edit/hard-delete on `origin === 'custom'` instead of `!is_default`.
4. **Tag picker filtering** — anywhere `/api/taste-selectors` feeds a chooser (the Log Shot
   "Taste Selectors" chips; any future picker): exclude `archived_at != null` from the
   options, but continue to render archived tags on historical shots and in Shot Detail.
5. **Join table** — leave `shot_taste_selectors` and its `ON DELETE CASCADE` as-is for now;
   only the gated hard-delete path exercises it, and archive never touches join rows.
6. **Tests** (`api-contract.test.ts` source-scan + `migration.integration.test.ts`):
   - migration is additive and the down migration restores the prior schema;
   - `origin` backfill maps `is_default` correctly;
   - `GET /taste-selectors` excludes archived by default and includes them with the flag;
   - the tag-picker query excludes archived;
   - hard delete requires the admin token + `force`.

---

## Out of scope / future

- **Canon versioning mechanism** — `canonical_key` (stable, deployment-independent slug or
  UUID), `canon_version`, how the canon definition is authored and rolled out, mapping
  local rows to canonical identity for the global upload. Additive when it lands; does not
  block the slice above.
- **Custom-selector creation as an account-scoped feature** — needs `user_id` (ADR-0009).
  The current "Add Custom" flow keeps working for the single owner in the meantime.
- **Personal → canon promotion flow** — detecting a widely-used personal selector and
  minting a canonical key for it.
- **Global upload pipeline** — the actual export of canonical-only tagged shot data.
- **Dropping the now-redundant `is_default` column** — a later, separate destructive change
  once nothing reads it.

---

## Cross-reference

This doc is the decision recorded in response to the delete-integrity finding in
`docs/implementation/launch-readiness-audit.md`, section "Standing-Rule Enforcement Audit —
Part 2 (delete integrity, rating bounds, import) — 2026-08-27", specifically the
`shot_taste_selectors` `ON DELETE CASCADE` item.
