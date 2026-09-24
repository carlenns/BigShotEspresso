BEGIN;

-- Permanent key for standard (canonical) selectors, e.g. "finish.minty-freshness"
-- (docs/architecture/taste-selector-vocabulary-model.md, D2). Custom selectors
-- stay NULL until promoted. Additive.
ALTER TABLE taste_selectors
  ADD COLUMN IF NOT EXISTS canonical_key text;

CREATE UNIQUE INDEX IF NOT EXISTS taste_selectors_canonical_key_unique
  ON taste_selectors (canonical_key);

-- Backfill standard rows that have no key yet; never rewrites an existing key.
UPDATE taste_selectors
SET canonical_key = category || '.' || trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
WHERE origin = 'standard'
  AND canonical_key IS NULL;

COMMIT;
