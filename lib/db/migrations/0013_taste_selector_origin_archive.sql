BEGIN;

-- Taste selector vocabulary model (docs/architecture/taste-selector-vocabulary-model.md,
-- decisions D1 + D4). Both columns are additive.
--
-- archived_at: archiving hides a selector from the shot-form picker for new
-- shots but leaves it tagged on every historical shot (never a cascade delete).
--
-- origin: 'standard' = canonical vocabulary (eligible for future cross-user
-- profiling); 'custom' = personal, never aggregated globally unless it is
-- later promoted into the standard list.
ALTER TABLE taste_selectors
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'standard';

-- Backfill from is_default, but only rows that were never custom-marked
-- (idempotent: a re-run leaves already-custom rows untouched).
UPDATE taste_selectors
SET origin = 'custom'
WHERE is_default = false
  AND origin = 'standard';

COMMIT;
