ALTER TABLE accessories
  DROP COLUMN IF EXISTS source_url;

ALTER TABLE machines
  DROP COLUMN IF EXISTS source_url;

ALTER TABLE grinders
  DROP COLUMN IF EXISTS source_url;
