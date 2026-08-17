import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const requireFromDb = createRequire(path.join(root, "lib/db/package.json"));
const { Client } = requireFromDb("pg");

const binDir = process.env.LIBPQ_BIN ?? "/opt/homebrew/opt/libpq/bin";
const pgDump = path.join(binDir, "pg_dump");
const pgRestore = path.join(binDir, "pg_restore");
const psql = path.join(binDir, "psql");

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

function redactedOutput(output) {
  return output.replaceAll(process.env.DATABASE_URL ?? "", "[redacted DATABASE_URL]");
}

function postgresEnv() {
  const url = new URL(process.env.DATABASE_URL);
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: url.pathname.replace(/^\//, ""),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get("sslmode") ?? "require",
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: {
        ...process.env,
        ...postgresEnv(),
      },
      stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
      options.onStdout?.(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${path.basename(command)} exited ${code}: ${redactedOutput(stderr || stdout)}`));
      }
    });
  });
}

async function restoreDump(dumpPath) {
  const restore = spawn(pgRestore, ["--no-owner", "--no-acl", "--file", "-", dumpPath], {
    cwd: root,
    env: { ...process.env, ...postgresEnv() },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const apply = spawn(psql, ["--set", "ON_ERROR_STOP=1"], {
    cwd: root,
    env: { ...process.env, ...postgresEnv() },
    stdio: ["pipe", "pipe", "pipe"],
  });

  restore.stdout.pipe(apply.stdin);
  let restoreErr = "";
  let applyErr = "";
  restore.stderr.on("data", (chunk) => {
    restoreErr += chunk.toString();
  });
  apply.stderr.on("data", (chunk) => {
    applyErr += chunk.toString();
  });

  const restoreCode = await new Promise((resolve) => restore.once("exit", resolve));
  const applyCode = await new Promise((resolve) => apply.once("exit", resolve));
  if (restoreCode !== 0 || applyCode !== 0) {
    throw new Error(redactedOutput(restoreErr || applyErr || "restore failed"));
  }
}

async function assertKnownTables(client) {
  const existing = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 order by table_name",
    ["public"],
  );
  const existingNames = existing.rows.map((row) => row.table_name);
  const unknownTables = existingNames.filter((name) => !knownTables.includes(name));
  if (unknownTables.length > 0) {
    throw new Error(`Unknown public tables present: ${unknownTables.join(", ")}`);
  }
  return existingNames;
}

async function resetKnownTables(client) {
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

async function counts(client) {
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

function equalCounts(before, after) {
  return Object.keys(before).every((key) => Number(before[key]) === Number(after[key]));
}

async function apiSmoke() {
  const port = 4324;
  const child = spawn(
    process.execPath,
    [path.join(root, "artifacts/api-server/dist/index.mjs")],
    {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        ADMIN_API_TOKEN: "local-admin",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  try {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
        if (response.ok) break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    const health = await fetch(`http://127.0.0.1:${port}/api/healthz`);
    const shots = await fetch(`http://127.0.0.1:${port}/api/shots?limit=1`);
    const hoppers = await fetch(`http://127.0.0.1:${port}/api/hoppers`);
    return {
      health: health.status,
      shots: shots.status,
      hoppers: hoppers.status,
    };
  } finally {
    child.kill("SIGINT");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

async function main() {
  const args = parseArgs();
  if (!args.has("--reset-disposable")) {
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

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "bse-neon-restore-"));
  const dumpPath = path.join(tmpDir, "coffee-log.dump");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await assertKnownTables(client);
    const before = await counts(client);

    await run(pgDump, [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      dumpPath,
    ]);
    const dumpStats = await stat(dumpPath);

    await resetKnownTables(client);
    await assertKnownTables(client);

    await restoreDump(dumpPath);

    const after = await counts(client);
    const api = await apiSmoke();

    console.log(JSON.stringify({
      connected: true,
      resetDisposable: true,
      backupCreated: true,
      dumpBytes: dumpStats.size,
      countsBefore: before,
      countsAfter: after,
      countsMatch: equalCounts(before, after),
      apiSmoke: api,
      dumpRemoved: true,
    }, null, 2));

    if (!equalCounts(before, after) || Object.values(api).some((status) => status !== 200)) {
      process.exitCode = 1;
    }
  } finally {
    await client.end().catch(() => {});
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    connected: false,
    error: redactedOutput(error.message),
  }, null, 2));
  process.exitCode = 1;
});
