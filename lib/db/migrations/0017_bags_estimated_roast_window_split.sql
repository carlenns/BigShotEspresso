-- 0017 — Estimated Roast Window Start/End on bags (2026-09-29). Structured
-- replacement for the old free-text estimated_roast_window
-- ("2026-08-03 to 2026-08-17"), so the window is queryable/analyzable instead
-- of a string to parse. The old column is left as-is for existing rows — no
-- backfill, since parsing its historical free-text phrasing into two dates
-- would be a guess; the app shows any existing value read-only instead.
-- Kept in sync with the runtime schema guard
-- (artifacts/api-server/src/lib/runtime-schema.ts), which is what applies it
-- to the deployed database.
ALTER TABLE bags
  ADD COLUMN IF NOT EXISTS estimated_roast_window_start text,
  ADD COLUMN IF NOT EXISTS estimated_roast_window_end text;
