BEGIN;

-- No-op. days_since_open is a deterministic derived value (shot_date − bag
-- opened_date), and this migration only filled rows that were NULL. There is no
-- safe way to tell a backfilled value apart from one that arrived via CSV/
-- Airtable import, so we do not try to un-fill it. The column itself is not
-- dropped here — it predates this migration (added with the original schema).

COMMIT;
