BEGIN;

ALTER TABLE taste_selectors
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS origin;

COMMIT;
