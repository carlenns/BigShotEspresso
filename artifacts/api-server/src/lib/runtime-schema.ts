import { pool } from "@workspace/db";
import { logger } from "./logger";

const EQUIPMENT_SCHEMA_SQL = `
ALTER TABLE grinders
  ADD COLUMN IF NOT EXISTS adjustment_type text,
  ADD COLUMN IF NOT EXISTS grind_setting_precision integer,
  ADD COLUMN IF NOT EXISTS grind_step_increment real;

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS stock_basket text;
`;

export async function ensureRuntimeSchema(): Promise<void> {
  await pool.query(EQUIPMENT_SCHEMA_SQL);
  logger.info("Runtime schema check complete");
}
