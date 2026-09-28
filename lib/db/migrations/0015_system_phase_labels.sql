-- 0015 — Seed owner-approved System Phase labels and the current System Phase
-- (2026-09-28). Settings rows only; no schema change. ON CONFLICT DO NOTHING so
-- a saved value is never overwritten. Kept in sync with the runtime schema guard
-- (artifacts/api-server/src/lib/runtime-schema.ts), which is what applies it to
-- the deployed database.
INSERT INTO settings (key, value) VALUES
  ('systemPhaseLabels', '[{"number":1,"name":"Initial Setup"},{"number":2,"name":"Scientific Process / Baseline"},{"number":3,"name":"Timed Dose Optimization"},{"number":4,"name":"Active Experimentation Era"}]'),
  ('currentSystemPhase', '3')
ON CONFLICT (key) DO NOTHING;
