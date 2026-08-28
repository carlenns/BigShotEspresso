import { pool } from "@workspace/db";
import { logger } from "./logger";

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

export async function ensureRuntimeSchema(): Promise<void> {
  await pool.query(EQUIPMENT_SCHEMA_SQL);
  await pool.query(SHOTS_SCHEMA_SQL);
  logger.info("Runtime schema check complete");
}
