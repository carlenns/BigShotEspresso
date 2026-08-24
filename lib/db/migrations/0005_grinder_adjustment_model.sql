BEGIN;

ALTER TABLE grinders
  ADD COLUMN IF NOT EXISTS adjustment_type text,
  ADD COLUMN IF NOT EXISTS grind_setting_precision integer,
  ADD COLUMN IF NOT EXISTS grind_step_increment real;

COMMIT;
