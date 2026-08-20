BEGIN;

ALTER TABLE bags
  ADD COLUMN IF NOT EXISTS roast_date_used text,
  ADD COLUMN IF NOT EXISTS estimated_roast_window text,
  ADD COLUMN IF NOT EXISTS actual_roast_date text,
  ADD COLUMN IF NOT EXISTS estimated_roast_date text,
  ADD COLUMN IF NOT EXISTS freshness_dating_method text,
  ADD COLUMN IF NOT EXISTS roast_date_confidence text,
  ADD COLUMN IF NOT EXISTS roast_date_notes text;

COMMIT;
