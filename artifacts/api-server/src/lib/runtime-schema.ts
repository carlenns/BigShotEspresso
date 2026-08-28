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
`;

export async function ensureRuntimeSchema(): Promise<void> {
  await pool.query(EQUIPMENT_SCHEMA_SQL);
  await pool.query(SHOTS_SCHEMA_SQL);
  logger.info("Runtime schema check complete");
}
