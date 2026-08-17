import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
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

const defaultExportDir = "/Users/carlenns/Documents/Airtable Tables/Coffee Log";
const rehearsalAdminHeader = "local-admin";

function parseArgs() {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index++) {
    const arg = process.argv[index];
    if (arg?.startsWith("--")) {
      const next = process.argv[index + 1];
      if (next && !next.startsWith("--")) {
        args.set(arg, next);
        index++;
      } else {
        args.set(arg, true);
      }
    }
  }
  return args;
}

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

function parseCsvRecords(text) {
  const records = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) records.push(row);
      row = [];
      if (character === "\r" && text[index + 1] === "\n") index++;
    } else {
      field += character;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) records.push(row);
  }

  return records;
}

function recordsToRows(text) {
  const records = parseCsvRecords(text);
  if (records.length < 2) return { headers: [], rows: [] };
  const headers = records[0].map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim(),
  );
  return {
    headers,
    rows: records.slice(1).map((record) =>
      Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])),
    ),
  };
}

function str(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function num(value) {
  const normalized = value?.trim().replace(/%$/, "");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return false;
  return ["1", "true", "yes", "checked"].includes(normalized);
}

function boolOrNull(value) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "checked"].includes(normalized)) return true;
  if (["0", "false", "no", "unchecked"].includes(normalized)) return false;
  return null;
}

async function readExport(exportDir, filename) {
  const filePath = path.join(exportDir, filename);
  if (!existsSync(filePath)) throw new Error(`Missing export file: ${filePath}`);
  return readFile(filePath, "utf8");
}

async function resetAndBootstrap(client) {
  const existing = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 order by table_name",
    ["public"],
  );
  const existingNames = existing.rows.map((row) => row.table_name);
  const unknownTables = existingNames.filter((name) => !knownTables.includes(name));
  if (unknownTables.length > 0) {
    throw new Error(`Unknown public tables present: ${unknownTables.join(", ")}`);
  }

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

  const bootstrap = await readFile(
    path.join(root, "lib/db/migrations/0000_bootstrap_current_schema.sql"),
    "utf8",
  );
  const phase1 = await readFile(
    path.join(root, "lib/db/migrations/0001_phase1_data_foundation.sql"),
    "utf8",
  );
  await client.query(bootstrap);
  await client.query(phase1);
}

async function seedBeansAndBags(client, exportDir) {
  const beansCsv = await readExport(exportDir, "Beans-Beans View.csv");
  const bagsCsv = await readExport(exportDir, "Bags-Bags View.csv");
  const beans = recordsToRows(beansCsv).rows;
  const bags = recordsToRows(bagsCsv).rows;
  const beanIds = new Map();
  let insertedBeans = 0;
  let insertedBags = 0;

  for (const bean of beans) {
    const name = str(bean["Beans"]) ?? str(bean["Name"]);
    if (!name) continue;
    const inserted = await client.query(
      `insert into beans (name, roaster, origin, region, process, notes, is_active)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        name,
        str(bean["Roaster"]),
        str(bean["Country"]),
        str(bean["Region"]),
        str(bean["Process"]),
        str(bean["Notes"]),
        boolOrNull(bean["Active"]) ?? true,
      ],
    );
    beanIds.set(name, inserted.rows[0].id);
    insertedBeans++;
  }

  for (const bag of bags) {
    const beanName = str(bag["Beans"]);
    const beanId = beanName ? beanIds.get(beanName) ?? null : null;
    await client.query(
      `insert into bags (
        bean_id, bag_number, bag_name, purchase_date, roast_date, opened_date,
        bag_weight, remaining_estimate, cost, is_active, start_grind_setting,
        current_grind_setting, default_dose, default_yield, dial_in_notes, notes
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        beanId,
        str(bag["Bag ID"]),
        str(bag["Bag Label"]),
        str(bag["Bag Purchased Date"]),
        str(bag["Roast Date Used"]) ?? str(bag["Actual Roast Date"]) ?? str(bag["Estimated Roast Date"]),
        str(bag["Opened Date"]),
        num(bag["Bag Size (g)"]),
        null,
        num(bag["Bag Cost"]),
        bool(bag["Active"]),
        num(bag["Initial Grinder Setting"]),
        num(bag["Average Grinder Setting"]),
        num(bag["Target Dose (g)"]),
        null,
        str(bag["Bag Behaviour Review"]),
        str(bag["Notes"]) ?? str(bag["Bag Notes"]),
      ],
    );
    insertedBags++;
  }

  return { beans: insertedBeans, bags: insertedBags };
}

function startApi(port) {
  const child = spawn(
    process.execPath,
    [path.join(root, "artifacts/api-server/dist/index.mjs")],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        ADMIN_API_TOKEN: rehearsalAdminHeader,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  return { child, getLogs: () => logs };
}

async function waitForApi(port) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("API did not become ready in time");
}

async function postCsv(port, route, csvText) {
  const response = await fetch(`http://127.0.0.1:${port}/api/${route}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-token": rehearsalAdminHeader,
    },
    body: JSON.stringify({ csvText }),
  });
  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  if (!response.ok) {
    throw new Error(`${route} failed with ${response.status}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

async function countTables(client) {
  const result = await client.query(`
    select
      (select count(*)::int from beans) as beans,
      (select count(*)::int from bags) as bags,
      (select count(*)::int from hoppers) as hoppers,
      (select count(*)::int from hopper_range_baselines) as hopper_range_baselines,
      (select count(*)::int from shots) as shots,
      (select count(*)::int from shots where include_in_analysis is true) as analysis_shots,
      (select count(*)::int from shots where is_reference is true) as reference_shots
  `);
  return result.rows[0];
}

async function main() {
  const args = parseArgs();
  const reset = args.has("--reset-disposable");
  const exportDir = path.resolve(String(args.get("--export-dir") ?? defaultExportDir));
  const port = Number(args.get("--port") ?? 4322);

  if (!reset) {
    console.log(JSON.stringify({
      stopped: true,
      reason: "reset_flag_required",
      hint: "rerun with --reset-disposable only for an approved disposable database",
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  await loadEnv();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await resetAndBootstrap(client);
  const seeded = await seedBeansAndBags(client, exportDir);

  const api = startApi(port);
  try {
    await waitForApi(port);
    const hoppersCsv = await readExport(exportDir, "Hopper-Hopper View.csv");
    const baselinesCsv = await readExport(exportDir, "Hopper Range Baselines-Hopper Range Baselines.csv");
    const shotsCsv = await readExport(exportDir, "Shots-Shots Entering.csv");

    const hopperImport = await postCsv(port, "hoppers/import-csv", hoppersCsv);
    const baselineImport = await postCsv(port, "hopper-range-baselines/import-csv", baselinesCsv);
    const shotImport = await postCsv(port, "shots/import-csv", shotsCsv);
    const counts = await countTables(client);

    console.log(JSON.stringify({
      connected: true,
      resetDisposable: true,
      exportDir,
      seeded,
      imports: {
        hoppers: hopperImport,
        hopperRangeBaselines: baselineImport,
        shots: {
          imported: shotImport.imported,
          skipped: shotImport.skipped,
          errors: shotImport.errors,
          warning: shotImport.warning,
          totalColumns: shotImport.summary?.totalColumns,
        },
      },
      counts,
    }, null, 2));
  } finally {
    api.child.kill("SIGINT");
    await new Promise((resolve) => api.child.once("exit", resolve));
    await client.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    connected: false,
    error: error.message,
  }, null, 2));
  process.exitCode = 1;
});
