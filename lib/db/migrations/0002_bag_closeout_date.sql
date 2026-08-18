BEGIN;

ALTER TABLE bags
  ADD COLUMN IF NOT EXISTS closed_out_date text;

COMMIT;
