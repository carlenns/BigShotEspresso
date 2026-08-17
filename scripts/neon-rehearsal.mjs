import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const requireFromDb = createRequire(path.join(root, "lib/db/package.json"));
const { Client } = requireFromDb("pg");

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
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function fingerprint(rawRow) {
  return createHash("sha256").update(JSON.stringify(rawRow)).digest("hex");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return { headers, records: records.filter((record) => record.some((value) => value.trim() !== "")) };
}

function rawObject(headers, record) {
  return Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]));
}

function numberOrNull(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function boolOrFalse(value) {
  return ["1", "true", "yes", "checked"].includes(String(value ?? "").trim().toLowerCase());
}

async function main() {
  await loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const forward = await readFile(
    path.join(root, "lib/db/migrations/0001_phase1_data_foundation.sql"),
    "utf8",
  );
  const rollback = await readFile(
    path.join(root, "lib/db/migrations/0001_phase1_data_foundation.down.sql"),
    "utf8",
  );

  const baselineTables = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 order by table_name",
    ["public"],
  );
  if (baselineTables.rowCount !== 0) {
    console.log(JSON.stringify({
      stopped: true,
      reason: "database_not_empty",
      tables: baselineTables.rows.map((row) => row.table_name),
    }, null, 2));
    await client.end();
    process.exitCode = 2;
    return;
  }

  await client.query(`
    CREATE TABLE bags (id serial PRIMARY KEY);
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

  await client.query(forward);
  await client.query(forward);

  const migrated = await client.query(`
    select
      flow_time,
      fault_status,
      shot_classification,
      bean_achievement,
      expression_style
    from shots
    where id = 1
  `);
  const indexes = await client.query(`
    select indexname
    from pg_indexes
    where schemaname = $1
      and indexname = any($2)
    order by indexname
  `, [
    "public",
    [
      "one_active_hopper_per_bag",
      "shots_import_fingerprint_unique",
      "shots_analysis_bag_date_idx",
      "shots_analysis_reference_bag_idx",
    ],
  ]);
  const localDefault = await client.query(`
    insert into shots (shot_date, include_in_analysis)
    values ('2026-06-25T03:30:00.000Z', DEFAULT)
    returning include_in_analysis
  `);

  await client.query(rollback);
  await client.query(rollback);

  const restored = await client.query(`
    select
      scale_time,
      fault_status,
      shot_classification,
      bean_achievement,
      expression_style
    from shots
    where id = 1
  `);

  await client.query(forward);

  const hopperCsv = await readFile(
    path.join(root, "artifacts/api-server/test-fixtures/csv/Hopper-Grid view.csv"),
    "utf8",
  );
  const hopperParsed = parseCsv(hopperCsv);
  for (const record of hopperParsed.records) {
    const raw = rawObject(hopperParsed.headers, record);
    await client.query(`
      insert into hoppers (
        name,
        starting_beans,
        is_active,
        hopper_mass,
        hopper_percent,
        shots_left_estimate,
        notes,
        raw_row
      ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      on conflict (name) do nothing
    `, [
      raw["Name"] || raw["Hopper ID"] || `Hopper ${fingerprint(raw).slice(0, 8)}`,
      numberOrNull(raw["Starting Beans"]),
      boolOrFalse(raw["Active"]),
      numberOrNull(raw["Hopper Mass"]),
      numberOrNull(raw["Hopper %"]),
      numberOrNull(raw["Shots Left Estimate"]),
      raw["Notes"] || null,
      JSON.stringify(raw),
    ]);
  }

  const baselineCsv = await readFile(
    path.join(root, "artifacts/api-server/test-fixtures/csv/Hopper Range Baselines-Hopper Range Baselines.csv"),
    "utf8",
  );
  const baselineParsed = parseCsv(baselineCsv);
  for (const record of baselineParsed.records) {
    const raw = rawObject(baselineParsed.headers, record);
    await client.query(`
      insert into hopper_range_baselines (
        hopper_range,
        baseline_output_adjusted_date,
        baseline_output_status,
        baseline_output,
        avg_initial_output,
        observation_count,
        raw_row
      ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)
      on conflict (hopper_range) do nothing
    `, [
      raw["Hopper Range"] || raw["Name"] || `Range ${fingerprint(raw).slice(0, 8)}`,
      raw["Baseline Output Adjusted Date"] || null,
      raw["Baseline Output Status"] || null,
      numberOrNull(raw["Baseline Output"]),
      numberOrNull(raw["Avg Initial Output"]),
      numberOrNull(raw["Observation Count"]),
      JSON.stringify(raw),
    ]);
  }

  const finalTables = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 order by table_name",
    ["public"],
  );
  const finalColumns = await client.query(`
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
      "scale_time",
      "include_in_analysis",
      "hopper_id",
      "hopper_range_baseline_id",
      "bag_label",
      "import_fingerprint",
    ],
  ]);
  const counts = await client.query(`
    select 'bags' as table_name, count(*)::int as count from bags
    union all select 'shots', count(*)::int from shots
    union all select 'hoppers', count(*)::int from hoppers
    union all select 'hopper_range_baselines', count(*)::int from hopper_range_baselines
    order by table_name
  `);

  console.log(JSON.stringify({
    connected: true,
    migrationRehearsal: "passed",
    forwardRepeat: "passed",
    rollbackRepeat: "passed",
    rollbackForward: "passed",
    migratedSample: migrated.rows[0],
    localIncludeDefault: localDefault.rows[0]?.include_in_analysis,
    restoredSample: restored.rows[0],
    fixtureImport: {
      hopperRowsParsed: hopperParsed.records.length,
      baselineRowsParsed: baselineParsed.records.length,
    },
    finalTables: finalTables.rows.map((row) => row.table_name),
    finalShotColumns: finalColumns.rows.map((row) => row.column_name),
    indexCountAfterForward: indexes.rowCount,
    counts: Object.fromEntries(counts.rows.map((row) => [row.table_name, row.count])),
  }, null, 2));

  await client.end();
}

main().catch((error) => {
  console.error(JSON.stringify({
    connected: false,
    error: error.message,
  }, null, 2));
  process.exitCode = 1;
});
