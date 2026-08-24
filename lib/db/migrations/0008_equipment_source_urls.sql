ALTER TABLE grinders
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE accessories
  ADD COLUMN IF NOT EXISTS source_url text;
