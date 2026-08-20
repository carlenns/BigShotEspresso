BEGIN;

ALTER TABLE beans
  ADD COLUMN IF NOT EXISTS coffee_name text,
  ADD COLUMN IF NOT EXISTS certification text;

COMMIT;
