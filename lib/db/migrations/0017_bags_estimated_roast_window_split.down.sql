ALTER TABLE bags
  DROP COLUMN IF EXISTS estimated_roast_window_start,
  DROP COLUMN IF EXISTS estimated_roast_window_end;
