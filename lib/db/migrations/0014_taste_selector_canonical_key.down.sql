BEGIN;

DROP INDEX IF EXISTS taste_selectors_canonical_key_unique;

ALTER TABLE taste_selectors
  DROP COLUMN IF EXISTS canonical_key;

COMMIT;
