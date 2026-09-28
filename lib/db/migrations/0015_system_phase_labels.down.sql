-- Rollback for 0015. Removes the two System Phase settings rows (including any
-- owner edits made after seeding). Shots keep their system_phase /
-- system_phase_name values; the app falls back to built-in labels.
DELETE FROM settings WHERE key IN (
  'systemPhaseLabels', 'currentSystemPhase',
  'systemPhaseNameOptions', 'systemPhaseExperimentOptions'
);
