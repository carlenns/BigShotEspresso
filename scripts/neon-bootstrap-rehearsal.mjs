import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const requireFromDb = createRequire(path.join(root, "lib/db/package.json"));
const { Client } = requireFromDb("pg");

const knownTables = [
  "shot_taste_selectors",
  "taste_selectors",
  "airtable_sync_evidence",
  "shots",
  "hopper_range_baselines",
  "hoppers",
  "bags",
  "settings",
  "accessories",
  "machines",
  "grinders",
  "beans",
];

const requiredTables = [
  "accessories",
  "airtable_sync_evidence",
  "bags",
  "beans",
  "grinders",
  "hopper_range_baselines",
  "hoppers",
  "machines",
  "settings",
  "shot_taste_selectors",
  "shots",
  "taste_selectors",
];

const requiredIndexes = [
  "airtable_sync_evidence_record_hash_unique",
  "one_active_hopper_per_bag",
  "shots_analysis_bag_date_idx",
  "shots_analysis_reference_bag_idx",
  "shots_import_fingerprint_unique",
];

async function loadEnv() {
  const envPath = path.join(root, ".env");
  const text = await readFile(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  await loadEnv();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const reset = process.argv.includes("--reset-disposable");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const existing = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 order by table_name",
    ["public"],
  );
  const existingNames = existing.rows.map((row) => row.table_name);
  const unknownTables = existingNames.filter((name) => !knownTables.includes(name));

  if (unknownTables.length > 0) {
    console.log(JSON.stringify({
      stopped: true,
      reason: "unknown_tables_present",
      unknownTables,
    }, null, 2));
    await client.end();
    process.exitCode = 2;
    return;
  }

  if (existingNames.length > 0 && !reset) {
    console.log(JSON.stringify({
      stopped: true,
      reason: "database_not_empty",
      tables: existingNames,
      hint: "rerun with --reset-disposable only for an approved disposable database",
    }, null, 2));
    await client.end();
    process.exitCode = 2;
    return;
  }

  if (reset) {
    await client.query(`
      DROP TABLE IF EXISTS shot_taste_selectors CASCADE;
      DROP TABLE IF EXISTS taste_selectors CASCADE;
      DROP TABLE IF EXISTS airtable_sync_evidence CASCADE;
      DROP TABLE IF EXISTS shots CASCADE;
      DROP TABLE IF EXISTS hopper_range_baselines CASCADE;
      DROP TABLE IF EXISTS hoppers CASCADE;
      DROP TABLE IF EXISTS bags CASCADE;
      DROP TABLE IF EXISTS settings CASCADE;
      DROP TABLE IF EXISTS accessories CASCADE;
      DROP TABLE IF EXISTS machines CASCADE;
      DROP TABLE IF EXISTS grinders CASCADE;
      DROP TABLE IF EXISTS beans CASCADE;
    `);
  }

  const bootstrap = await readFile(
    path.join(root, "lib/db/migrations/0000_bootstrap_current_schema.sql"),
    "utf8",
  );
  const phase1 = await readFile(
    path.join(root, "lib/db/migrations/0001_phase1_data_foundation.sql"),
    "utf8",
  );

  await client.query(bootstrap);
  await client.query(bootstrap);
  await client.query(phase1);

  const tables = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 order by table_name",
    ["public"],
  );
  const indexes = await client.query(
    "select indexname from pg_indexes where schemaname = $1 and indexname = any($2) order by indexname",
    ["public", requiredIndexes],
  );
  const shotColumns = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = $1
      and table_name = $2
      and column_name = any($3)
    order by column_name
  `, [
    "public",
    "shots",
    [
      "flow_time",
      "include_in_analysis",
      "fault_status",
      "shot_classification",
      "bean_achievement",
      "expression_style",
      "intelligence_lesson_type",
      "raw_row",
    ],
  ]);
  const localDefault = await client.query(`
    insert into shots (shot_date, include_in_analysis)
    values ('2026-08-17T19:30:00.000Z', DEFAULT)
    returning include_in_analysis
  `);

  const tableNames = tables.rows.map((row) => row.table_name);
  const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
  const indexNames = indexes.rows.map((row) => row.indexname);
  const missingIndexes = requiredIndexes.filter((index) => !indexNames.includes(index));

  console.log(JSON.stringify({
    connected: true,
    resetDisposable: reset,
    bootstrap: missingTables.length === 0 && missingIndexes.length === 0 ? "passed" : "failed",
    bootstrapRepeat: "passed",
    phase1Compatibility: "passed",
    localIncludeDefault: localDefault.rows[0]?.include_in_analysis,
    tableCount: tableNames.length,
    missingTables,
    verifiedIndexes: indexNames,
    missingIndexes,
    verifiedShotColumns: shotColumns.rows.map((row) => row.column_name),
  }, null, 2));

  await client.end();

  if (missingTables.length > 0 || missingIndexes.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    connected: false,
    error: error.message,
  }, null, 2));
  process.exitCode = 1;
});
