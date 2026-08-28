BEGIN;

-- Days Since Open — a derived integer (shot_date::date − bag.opened_date::date).
-- The column already exists; it was only ever populated by CSV/Airtable import,
-- so every shot created in-app since the Neon move has it NULL. The route now
-- computes it on every POST/PATCH; this backfills the rows that predate that.
--
-- Guarded on `days_since_open IS NULL` so it is a no-op on every run after the
-- first (idempotent). Only fills rows whose bag has an opened_date and whose
-- shot_date starts with a YYYY-MM-DD calendar date; never overwrites a value
-- that already exists.
ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS days_since_open integer;

UPDATE shots s
SET days_since_open = (s.shot_date::date - b.opened_date::date)
FROM bags b
WHERE s.bag_id = b.id
  AND s.days_since_open IS NULL
  AND b.opened_date IS NOT NULL
  AND s.shot_date IS NOT NULL
  AND s.shot_date ~ '^\d{4}-\d{2}-\d{2}';

COMMIT;
