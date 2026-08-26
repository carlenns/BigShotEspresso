BEGIN;

ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS brew_method text;

-- Backfill only rows with no brew method recorded (never overwrite a value
-- that already exists). Every shot logged before this column existed was
-- an espresso shot: no non-Espresso Machine or pour-over evidence exists
-- anywhere in the current dataset.
UPDATE shots
SET brew_method = 'Espresso'
WHERE brew_method IS NULL;

COMMIT;
