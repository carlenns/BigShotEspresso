BEGIN;

ALTER TABLE bags
  DROP COLUMN IF EXISTS roast_date_notes,
  DROP COLUMN IF EXISTS roast_date_confidence,
  DROP COLUMN IF EXISTS freshness_dating_method,
  DROP COLUMN IF EXISTS estimated_roast_date,
  DROP COLUMN IF EXISTS actual_roast_date,
  DROP COLUMN IF EXISTS estimated_roast_window,
  DROP COLUMN IF EXISTS roast_date_used;

COMMIT;
