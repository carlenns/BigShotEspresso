ALTER TABLE accessories
  DROP COLUMN IF EXISTS short_label;

ALTER TABLE machines
  DROP COLUMN IF EXISTS short_label;

ALTER TABLE grinders
  DROP COLUMN IF EXISTS short_label;
