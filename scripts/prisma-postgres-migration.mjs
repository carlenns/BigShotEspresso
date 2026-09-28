#!/usr/bin/env node
// Neon → Prisma Postgres migration helper (docs/implementation/prisma-postgres-migration-runbook.md).
//
//   node scripts/prisma-postgres-migration.mjs check
//   node scripts/prisma-postgres-migration.mjs copy --confirm-empty-target
//   node scripts/prisma-postgres-migration.mjs verify
//
// Reads SOURCE_DATABASE_URL (Neon, the current production database) and
// TARGET_DATABASE_URL (Prisma Postgres DIRECT connection string, db.prisma.io)
// from the environment or the repo-root .env. The SOURCE is only ever read:
// `pg_dump` and SELECTs, never a write. `copy` refuses to run unless the target
// has no tables in `public`, so it cannot overwrite a database by mistake.
// Connection strings are never printed.
//
// Needs pg_dump / pg_restore at least as new as the source server
// (macOS: `brew install libpq`; set LIBPQ_BIN if they are not on PATH).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const { Client } = createRequire(path.join(root, "lib/db/package.json"))("pg");

function binary(name) {
  const candidates = [
    process.env.LIBPQ_BIN && path.join(process.env.LIBPQ_BIN, name),
    path.join("/opt/homebrew/opt/libpq/bin", name),
    path.join("/usr/local/opt/libpq/bin", name),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? name; // fall back to PATH
}

async function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of (await readFile(envPath, "utf8")).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function urls() {
  const source = process.env.SOURCE_DATABASE_URL;
  const target = process.env.TARGET_DATABASE_URL;
  if (!source || !target) throw new Error("Set SOURCE_DATABASE_URL (Neon) and TARGET_DATABASE_URL (Prisma Postgres direct).");
  if (source === target) throw new Error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL are the same database.");
  if (/pooled\.db\.prisma\.io/.test(target)) {
    throw new Error("TARGET_DATABASE_URL is the pooled Prisma URL; use the direct one (db.prisma.io) for pg_restore.");
  }
  return { source, target };
}

function redact(text) {
  let out = String(text ?? "");
  for (const secret of [process.env.SOURCE_DATABASE_URL, process.env.TARGET_DATABASE_URL]) {
    if (secret) out = out.replaceAll(secret, "[redacted]");
  }
  return out.replace(/postgres(ql)?:\/\/[^\s"']+/g, "[redacted-url]");
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return "unknown"; }
}

function sslFor(url) {
  const mode = (() => { try { return new URL(url).searchParams.get("sslmode"); } catch { return null; } })();
  return mode && mode !== "disable" ? { rejectUnauthorized: false } : undefined;
}

async function connect(url) {
  // Drop sslmode from the pg connection string and pass ssl explicitly, so
  // node-postgres does not treat sslmode=require as verify-full.
  const u = new URL(url);
  const ssl = sslFor(url);
  u.searchParams.delete("sslmode");
  const client = new Client({ connectionString: u.toString(), ssl });
  await client.connect();
  return client;
}

async function tables(client) {
  const r = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name",
  );
  return r.rows.map((row) => row.table_name);
}

/** Row count + an order-independent content fingerprint per table. */
async function fingerprint(client) {
  const out = {};
  for (const table of await tables(client)) {
    const r = await client.query(
      `select count(*)::int as rows,
              coalesce(md5(string_agg(md5(t::text), '' order by md5(t::text))), 'empty') as digest
         from public."${table.replaceAll('"', '""')}" t`,
    );
    out[table] = { rows: r.rows[0].rows, digest: r.rows[0].digest };
  }
  return out;
}

/** Sequences must be at or past max(id) or the next insert collides. */
async function sequenceProblems(client) {
  const r = await client.query(`
    select c.relname as table_name, a.attname as column_name, pg_get_serial_sequence(format('public.%I', c.relname), a.attname) as seq
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where c.relkind = 'r' and pg_get_serial_sequence(format('public.%I', c.relname), a.attname) is not null`);
  const problems = [];
  for (const row of r.rows) {
    const max = await client.query(`select coalesce(max("${row.column_name}"), 0)::bigint as m from public."${row.table_name}"`);
    const seq = await client.query(`select last_value::bigint as v, is_called from ${row.seq}`);
    const next = Number(seq.rows[0].v) + (seq.rows[0].is_called ? 1 : 0);
    if (next <= Number(max.rows[0].m)) problems.push(`${row.table_name}.${row.column_name}: next ${next} <= max ${max.rows[0].m}`);
  }
  return problems;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", (e) => reject(new Error(`${path.basename(command)}: ${e.message}`)));
    child.on("exit", (code) => (code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${path.basename(command)} exited ${code}: ${redact(stderr || stdout)}`))));
  });
}

async function serverInfo(client) {
  const r = await client.query("select current_setting('server_version') as version, current_database() as db");
  return r.rows[0];
}

function major(version) {
  const m = /(\d+)(?:\.\d+)?/.exec(String(version));
  return m ? Number(m[1]) : NaN;
}

function versionWarnings(sourceVersion, targetVersion, dumpVersion) {
  const warnings = [];
  const [src, tgt, dump] = [major(sourceVersion), major(targetVersion), major(String(dumpVersion).replace(/^\D+/, ""))];
  if (tgt < src) warnings.push(`Target Postgres ${tgt} is older than source ${src}. BSE uses plain tables only (checked 2026-09-28: no generated columns, no named NOT NULL constraints, only plpgsql), so the restore is expected to work; it runs in one transaction, so if it fails nothing is written. Proceed with copy and send the error if it fails.`);
  if (Number.isFinite(dump) && dump < src) warnings.push(`pg_dump ${dump} is older than the source server ${src}; install a newer libpq (brew upgrade libpq).`);
  return warnings;
}

async function check({ source, target }) {
  const [s, t] = [await connect(source), await connect(target)];
  try {
    const dump = await run(binary("pg_dump"), ["--version"]).then((r) => r.stdout.trim()).catch((e) => `missing (${e.message})`);
    return {
      source: { host: hostOf(source), ...(await serverInfo(s)), tables: await fingerprint(s) },
      target: { host: hostOf(target), ...(await serverInfo(t)), tables: await tables(t) },
      pgDump: dump,
      warnings: versionWarnings((await serverInfo(s)).version, (await serverInfo(t)).version, dump),
    };
  } finally {
    await s.end().catch(() => {});
    await t.end().catch(() => {});
  }
}

async function copy({ source, target }, confirmed) {
  if (!confirmed) return { stopped: true, reason: "rerun with --confirm-empty-target (the target must be a new, empty Prisma Postgres database)" };
  const t = await connect(target);
  try {
    const existing = await tables(t);
    if (existing.length > 0) return { stopped: true, reason: "target is not empty", targetTables: existing };
  } finally {
    await t.end().catch(() => {});
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "bse-prisma-migration-"));
  const dumpPath = path.join(dir, "coffee-log.dump");
  try {
    await run(binary("pg_dump"), ["--format=custom", "--no-owner", "--no-acl", "--schema=public", "--file", dumpPath, "--dbname", source]);
    const size = (await stat(dumpPath)).size;
    // `--schema=public` makes pg_dump emit CREATE SCHEMA public, which already
    // exists on a new database. Restore from a TOC list without that entry.
    const toc = await run(binary("pg_restore"), ["--list", dumpPath]);
    const listPath = path.join(dir, "restore.list");
    const kept = toc.stdout.split("\n").filter((line) => !/^\d+;.*\bSCHEMA\b\s+-\s+public\b/.test(line));
    await writeFile(listPath, kept.join("\n"));
    await run(binary("pg_restore"), ["--no-owner", "--no-acl", "--single-transaction", "--exit-on-error", "--use-list", listPath, "--dbname", target, dumpPath]);
    return { copied: true, dumpBytes: size, ...(await verify({ source, target })) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function verify({ source, target }) {
  const [s, t] = [await connect(source), await connect(target)];
  try {
    const [a, b] = [await fingerprint(s), await fingerprint(t)];
    const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const mismatches = names.filter((n) => a[n]?.rows !== b[n]?.rows || a[n]?.digest !== b[n]?.digest);
    const sequenceIssues = await sequenceProblems(t);
    return {
      verified: mismatches.length === 0 && sequenceIssues.length === 0,
      tables: Object.fromEntries(names.map((n) => [n, { source: a[n]?.rows ?? null, target: b[n]?.rows ?? null, match: !mismatches.includes(n) }])),
      mismatches,
      sequenceIssues,
    };
  } finally {
    await s.end().catch(() => {});
    await t.end().catch(() => {});
  }
}

async function main() {
  const command = process.argv[2];
  if (!["check", "copy", "verify"].includes(command ?? "")) {
    console.log("usage: node scripts/prisma-postgres-migration.mjs <check|copy --confirm-empty-target|verify>");
    process.exitCode = 2;
    return;
  }
  await loadEnv();
  const pair = urls();
  const result = command === "check" ? await check(pair)
    : command === "copy" ? await copy(pair, process.argv.includes("--confirm-empty-target"))
      : await verify(pair);
  console.log(JSON.stringify(result, null, 2));
  if (result.stopped || result.verified === false) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ error: redact(error.message) }, null, 2));
  process.exitCode = 1;
});
