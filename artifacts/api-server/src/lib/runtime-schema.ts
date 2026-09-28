import { pool } from "@workspace/db";
import { logger } from "./logger";
import { backfillEquipmentDefaultsOnce } from "./equipment-default-backfill";

const EQUIPMENT_SCHEMA_SQL = `
ALTER TABLE grinders
  ADD COLUMN IF NOT EXISTS short_label text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS adjustment_type text,
  ADD COLUMN IF NOT EXISTS grind_setting_precision integer,
  ADD COLUMN IF NOT EXISTS grind_step_increment real;

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS short_label text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS stock_basket text;

ALTER TABLE accessories
  ADD COLUMN IF NOT EXISTS short_label text,
  ADD COLUMN IF NOT EXISTS source_url text;
`;

// Shot-level Brew Method (how it was extracted: Espresso, Pour-over,
// AeroPress, ...) — separate from Drink Type (what was served). Backfill is
// scoped to `brew_method IS NULL` so it never overwrites an existing value
// and is a no-op on every boot after the first (see 0010_shot_brew_method.sql
// for the same guard, kept in sync since this runtime guard — not the
// migration file — is what actually applies to the deployed database).
//
// System Phase / Experiment (0011_shot_system_phase.sql): the machine/workflow
// learning era a shot belongs to, distinct from hopper_phase. Purely additive,
// NO backfill — no historical System Phase field exists in any export, so
// existing shots stay NULL rather than being guessed.
//
// Days Since Open (0012_shot_days_since_open_backfill.sql): a derived integer
// (shot_date − bag opened_date). The column already exists and was only ever
// filled by CSV/Airtable import; the route now computes it on every POST/PATCH
// and this backfills the pre-existing in-app rows. Guarded on
// `days_since_open IS NULL` so it is a no-op on every boot after the first.
const SHOTS_SCHEMA_SQL = `
ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS brew_method text;

UPDATE shots
SET brew_method = 'Espresso'
WHERE brew_method IS NULL;

ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS system_phase integer,
  ADD COLUMN IF NOT EXISTS system_phase_name text,
  ADD COLUMN IF NOT EXISTS experiment_name text;

ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS days_since_open integer;

UPDATE shots s
SET days_since_open = (s.shot_date::date - b.opened_date::date)
FROM bags b
WHERE s.bag_id = b.id
  AND s.days_since_open IS NULL
  AND b.opened_date IS NOT NULL
  AND s.shot_date IS NOT NULL
  AND s.shot_date ~ '^\\d{4}-\\d{2}-\\d{2}';
`;

// Taste selector origin + archive (0013_taste_selector_origin_archive.sql) and
// canonical key (0014_taste_selector_canonical_key.sql), kept in sync. The key
// backfill only fills standard rows with no key, so it never rewrites one. Additive; the origin backfill only touches non-default rows
// still marked 'standard', so it is a no-op on every boot after the first.
const TASTE_SELECTORS_SCHEMA_SQL = `
ALTER TABLE taste_selectors
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'standard';

UPDATE taste_selectors
SET origin = 'custom'
WHERE is_default = false
  AND origin = 'standard';

ALTER TABLE taste_selectors
  ADD COLUMN IF NOT EXISTS canonical_key text;

CREATE UNIQUE INDEX IF NOT EXISTS taste_selectors_canonical_key_unique
  ON taste_selectors (canonical_key);

UPDATE taste_selectors
SET canonical_key = category || '.' || trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
WHERE origin = 'standard'
  AND canonical_key IS NULL;
`;

// System Phase labels + current phase (migration 0015). Additive seed only:
// ON CONFLICT DO NOTHING never overwrites labels the owner has edited in Settings.
const SYSTEM_PHASE_SETTINGS_SQL = `
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
`;

export async function ensureRuntimeSchema(): Promise<void> {
  await pool.query(EQUIPMENT_SCHEMA_SQL);
  await pool.query(SHOTS_SCHEMA_SQL);
  await pool.query(TASTE_SELECTORS_SCHEMA_SQL);
  await pool.query(SYSTEM_PHASE_SETTINGS_SQL);
  // Equipment defaults Option A (Phase 2A S5): one-time, never-overwriting copy of
  // the retired Settings equipment strings onto the isDefault flags.
  await backfillEquipmentDefaultsOnce();
  logger.info("Runtime schema check complete");
}
