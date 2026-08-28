BEGIN;

-- Shot-level System Phase / Experiment context — the machine/workflow
-- "learning era" a shot belongs to (Carl's Airtable-era workflow concept),
-- kept deliberately separate from hopper_phase (a bean/hopper operating
-- window). system_phase is the era number, system_phase_name its
-- user-defined label, experiment_name an optional named test nested inside
-- that phase.
--
-- Purely additive. NO backfill: no historical "System Phase" field exists in
-- any Airtable base or CSV export (verified 2026-08-27), so existing shots
-- stay NULL rather than being guessed from hopper_phase or shot id.
ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS system_phase integer,
  ADD COLUMN IF NOT EXISTS system_phase_name text,
  ADD COLUMN IF NOT EXISTS experiment_name text;

COMMIT;
