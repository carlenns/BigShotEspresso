-- 0015 — Seed owner-approved System Phase labels and the current System Phase
-- (2026-09-28). Settings rows only; no schema change. ON CONFLICT DO NOTHING so
-- a saved value is never overwritten. Kept in sync with the runtime schema guard
-- (artifacts/api-server/src/lib/runtime-schema.ts), which is what applies it to
-- the deployed database.
INSERT INTO settings (key, value) VALUES
  ('systemPhaseLabels', '[{"number":1,"name":"Initial Setup"},{"number":2,"name":"Scientific Process / Baseline"},{"number":3,"name":"Timed Dose Optimization"},{"number":4,"name":"Active Experimentation Era"}]'),
  ('currentSystemPhase', '3')
ON CONFLICT (key) DO NOTHING;

-- Saved Phase Name / Experiment selector options, grouped by System Phase,
-- seeded once from values already on shots. DO NOTHING keeps later edits.
INSERT INTO settings (key, value)
SELECT 'systemPhaseNameOptions', COALESCE(json_object_agg(p, names)::text, '{}')
FROM (
  SELECT system_phase::text AS p, json_agg(DISTINCT trim(system_phase_name) ORDER BY trim(system_phase_name)) AS names
  FROM shots
  WHERE system_phase IS NOT NULL AND coalesce(trim(system_phase_name), '') <> ''
  GROUP BY system_phase
) t
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
SELECT 'systemPhaseExperimentOptions', COALESCE(json_object_agg(p, names)::text, '{}')
FROM (
  SELECT system_phase::text AS p, json_agg(DISTINCT trim(experiment_name) ORDER BY trim(experiment_name)) AS names
  FROM shots
  WHERE system_phase IS NOT NULL AND coalesce(trim(experiment_name), '') <> ''
  GROUP BY system_phase
) t
ON CONFLICT (key) DO NOTHING;
