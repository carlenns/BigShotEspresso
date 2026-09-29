-- 0016 — Best-Before Date on bags (2026-09-29). Records the raw printed
-- Best-Before date as evidence only; distinct from the existing
-- "Best-Before Minus One Year" Freshness Dating Method, which computes a
-- roast date from it. No formula here — it never feeds roastDate/roastDateUsed.
-- Kept in sync with the runtime schema guard
-- (artifacts/api-server/src/lib/runtime-schema.ts), which is what applies it
-- to the deployed database.
ALTER TABLE bags
  ADD COLUMN IF NOT EXISTS best_before_date text;
