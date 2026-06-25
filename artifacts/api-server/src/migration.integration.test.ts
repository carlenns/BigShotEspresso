import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const forwardMigrationUrl = new URL(
  "../../../lib/db/migrations/0001_phase1_data_foundation.sql",
  import.meta.url,
);
const rollbackMigrationUrl = new URL(
  "../../../lib/db/migrations/0001_phase1_data_foundation.down.sql",
  import.meta.url,
);

async function loadMigration(url: URL): Promise<string> {
  return readFile(fileURLToPath(url), "utf8");
}

async function createLegacySchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE bags (
      id serial PRIMARY KEY
    );

    CREATE TABLE shots (
      id serial PRIMARY KEY,
      shot_date text NOT NULL,
      bag_id integer REFERENCES bags(id),
      scale_time integer,
      fault_status text,
      shot_classification text,
      bean_achievement text,
      expression_style text,
      include_in_analysis boolean,
      is_reference boolean NOT NULL DEFAULT false,
      airtable_record_id text
    );
  `);
}

test("Phase 1 migration applies, is repeatable, and rolls back without losing legacy values", async () => {
  const db = new PGlite();
  await createLegacySchema(db);
  await db.exec(`
    INSERT INTO bags DEFAULT VALUES;
    INSERT INTO shots (
      shot_date,
      bag_id,
      scale_time,
      fault_status,
      shot_classification,
      bean_achievement,
      expression_style,
      include_in_analysis,
      is_reference
    ) VALUES (
      '2026-06-24T03:30:00.000Z',
      1,
      27,
      'Fault,Grinder Issue',
      'Balanced,Caramel Rich',
      'Guest Worthy,Daily Driver',
      'Balanced Comfort',
      true,
      true
    );
  `);

  const forward = await loadMigration(forwardMigrationUrl);
  const rollback = await loadMigration(rollbackMigrationUrl);

  await db.exec(forward);
  await db.exec(forward);

  const migrated = await db.query<{
    flow_time: number;
    fault_status: string[];
    shot_classification: string[];
    bean_achievement: string[];
    expression_style: string[];
  }>(`
    SELECT
      flow_time,
      fault_status,
      shot_classification,
      bean_achievement,
      expression_style
    FROM shots
    WHERE id = 1
  `);

  assert.deepEqual(migrated.rows[0], {
    flow_time: 27,
    fault_status: ["Fault,Grinder Issue"],
    shot_classification: ["Balanced,Caramel Rich"],
    bean_achievement: ["Guest Worthy,Daily Driver"],
    expression_style: ["Balanced Comfort"],
  });

  const localEligibility = await db.query<{ include_in_analysis: boolean }>(`
    INSERT INTO shots (shot_date, include_in_analysis)
    VALUES ('2026-06-25T03:30:00.000Z', DEFAULT)
    RETURNING include_in_analysis
  `);
  assert.equal(localEligibility.rows[0]?.include_in_analysis, true);

  const tables = await db.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name IN (
      'hoppers',
      'hopper_range_baselines',
      'airtable_sync_evidence'
    )
    ORDER BY table_name
  `);
  assert.deepEqual(
    tables.rows.map((row) => row.table_name),
    ["airtable_sync_evidence", "hopper_range_baselines", "hoppers"],
  );

  const indexes = await db.query<{ indexname: string }>(`
    SELECT indexname
    FROM pg_indexes
    WHERE indexname IN (
      'one_active_hopper_per_bag',
      'shots_import_fingerprint_unique',
      'shots_analysis_bag_date_idx',
      'shots_analysis_reference_bag_idx'
    )
    ORDER BY indexname
  `);
  assert.equal(indexes.rows.length, 4);

  await db.exec(rollback);
  await db.exec(rollback);

  const restored = await db.query<{
    scale_time: number;
    fault_status: string;
    shot_classification: string;
    bean_achievement: string;
    expression_style: string;
  }>(`
    SELECT
      scale_time,
      fault_status,
      shot_classification,
      bean_achievement,
      expression_style
    FROM shots
    WHERE id = 1
  `);

  assert.deepEqual(restored.rows[0], {
    scale_time: 27,
    fault_status: "Fault,Grinder Issue",
    shot_classification: "Balanced,Caramel Rich",
    bean_achievement: "Guest Worthy,Daily Driver",
    expression_style: "Balanced Comfort",
  });

  await db.close();
});

test("Phase 1 migration refuses conflicting scale_time and flow_time values", async () => {
  const db = new PGlite();
  await createLegacySchema(db);
  await db.exec(`
    ALTER TABLE shots ADD COLUMN flow_time integer;
    INSERT INTO shots (shot_date, scale_time, flow_time)
    VALUES ('2026-06-24T03:30:00.000Z', 27, 28);
  `);

  await assert.rejects(db.exec(await loadMigration(forwardMigrationUrl)), /conflicting values/);
  await db.close();
});
