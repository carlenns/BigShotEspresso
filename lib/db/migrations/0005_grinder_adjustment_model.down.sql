BEGIN;

ALTER TABLE grinders
  DROP COLUMN IF EXISTS grind_step_increment,
  DROP COLUMN IF EXISTS grind_setting_precision,
  DROP COLUMN IF EXISTS adjustment_type;

COMMIT;
