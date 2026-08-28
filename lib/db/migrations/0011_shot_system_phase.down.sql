BEGIN;

ALTER TABLE shots
  DROP COLUMN IF EXISTS system_phase,
  DROP COLUMN IF EXISTS system_phase_name,
  DROP COLUMN IF EXISTS experiment_name;

COMMIT;
