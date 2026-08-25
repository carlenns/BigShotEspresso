-- Restores the column shape only. Values are not recoverable once dropped —
-- the field was a derived Airtable chart formula of initial_grind_weight,
-- re-importable from Airtable/CSV evidence if ever needed again.
ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS grinder_initial_output_for_charts real;
