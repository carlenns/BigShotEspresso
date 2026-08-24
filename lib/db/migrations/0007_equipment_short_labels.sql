ALTER TABLE grinders
  ADD COLUMN IF NOT EXISTS short_label text;

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS short_label text;

ALTER TABLE accessories
  ADD COLUMN IF NOT EXISTS short_label text;
