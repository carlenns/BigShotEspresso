-- 0018 — EQ-5: remove the inert pre-Option-A Settings equipment rows
-- (2026-09-29). backfillEquipmentDefaultsOnce (Phase 2A S5) already copied
-- these onto the per-record isDefault flags months ago, and
-- resolveEquipmentDefaults() — what Dashboard actually calls — reads only
-- isDefault now. Confirmed via grep: nothing else in the app reads these 6
-- keys. Does not touch `equipmentDefaultsBackfill` (the backfill's own
-- marker/report row), which Settings.tsx still reads.
-- Kept in sync with the runtime schema guard
-- (artifacts/api-server/src/lib/runtime-schema.ts), which is what applies it
-- to the deployed database.
DELETE FROM settings WHERE key IN (
  'defaultMachine', 'defaultGrinder', 'defaultRegularGrinder',
  'defaultBasket', 'defaultBasketSize', 'defaultPuckScreen'
);
