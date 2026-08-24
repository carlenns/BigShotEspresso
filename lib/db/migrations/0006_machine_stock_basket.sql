BEGIN;

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS stock_basket text;

COMMIT;
