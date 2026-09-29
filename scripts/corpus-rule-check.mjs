// DI-4 read-only check: how many shots break the rules the app enforces on
// shots created today? Nothing is written; no rows are changed.
//
//   node scripts/corpus-rule-check.mjs --csv "path/to/Shots.csv"
//   DATABASE_URL=<connection string> node scripts/corpus-rule-check.mjs --database
//
// Rules mirrored from the app (keep in lockstep):
//   - include-in-analysis: Shot Status is Good or Dialed In AND Fault Status is
//     exactly ["Good"]  (artifacts/api-server/src/lib/shot-analysis-eligibility.ts)
//   - Signature Shot implies Reference Shot  (routes/shots.ts normalizeShotInput)
//   - a Sour shot is never a Reference or Signature shot  (same)
//   - technical rating 0-10, preference rating 0-11  (routes/shots.ts validateRatings)
// A blank Include in Analysis counts as "not included", as the app reads it.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true);
};

function parseCsvRecords(text) {
  const records = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) records.push(row);
      row = [];
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) records.push(row);
  }
  return records;
}

const bool = (v) => {
  const n = String(v ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "checked"].includes(n)) return true;
  if (["0", "false", "no", "unchecked"].includes(n)) return false;
  return null;
};
const list = (v) => String(v ?? "").split(",").map((p) => p.trim()).filter(Boolean);
const num = (v) => { const n = Number(String(v ?? "").trim()); return String(v ?? "").trim() === "" || Number.isNaN(n) ? null : n; };

function eligible(status, faults) {
  return (status === "Good" || status === "Dialed In") && faults.length === 1 && faults[0] === "Good";
}

async function loadCsv(file) {
  const records = parseCsvRecords((await readFile(file, "utf8")).replace(/^﻿/, ""));
  const head = records[0].map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name.toLowerCase());
  const idx = {
    date: col("Date"), bag: col("Bag"), status: col("Shot Status"), fault: col("Fault Status"),
    include: col("Include in Analysis"), ref: col("Reference Shot"), sig: col("Signature Shot"),
    sour: col("Sour"), rating: col("Rating"), pref: col("Preference Rating"),
  };
  const get = (r, i) => (i >= 0 ? r[i] : undefined);
  return records.slice(1).filter((r) => (get(r, idx.date) ?? "").trim()).map((r, n) => ({
    label: `row ${n + 2} (${get(r, idx.date)}, bag ${get(r, idx.bag)})`,
    status: (get(r, idx.status) ?? "").trim() || null,
    faults: list(get(r, idx.fault)),
    include: bool(get(r, idx.include)),
    ref: bool(get(r, idx.ref)),
    sig: bool(get(r, idx.sig)),
    sour: bool(get(r, idx.sour)),
    rating: num(get(r, idx.rating)),
    pref: num(get(r, idx.pref)),
  }));
}

async function loadDatabase() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { Client } = createRequire(path.join(root, "lib/db/package.json"))("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("--database needs DATABASE_URL in the environment.");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("set transaction read only").catch(() => {});
    const { rows } = await client.query(
      `select id, shot_date, bag, status, fault_status, include_in_analysis, is_reference,
              signature_shot, sour_shot, rating, preference_rating
         from shots order by id`,
    );
    return rows.map((r) => ({
      label: `shot id ${r.id} (${r.shot_date}, bag ${r.bag})`,
      status: r.status,
      faults: r.fault_status ?? [],
      include: r.include_in_analysis,
      ref: r.is_reference,
      sig: r.signature_shot,
      sour: r.sour_shot,
      rating: r.rating,
      pref: r.preference_rating,
    }));
  } finally {
    await client.end();
  }
}

const csv = flag("--csv");
const shots = typeof csv === "string" ? await loadCsv(csv) : flag("--database") ? await loadDatabase() : null;
if (!shots) {
  console.error('Usage: node scripts/corpus-rule-check.mjs --csv "<Shots.csv>"  |  --database (uses DATABASE_URL)');
  process.exit(2);
}

const findings = {
  "Include in Analysis differs from the rule (status Good/Dialed In and fault status only Good)": [],
  "Signature Shot without Reference Shot": [],
  "Sour shot also flagged Reference or Signature": [],
  "Technical rating outside 0-10": [],
  "Preference rating outside 0-11": [],
};
const [K_INC, K_SIG, K_SOUR, K_RATING, K_PREF] = Object.keys(findings);
for (const s of shots) {
  const expected = eligible(s.status, s.faults);
  if ((s.include === true) !== expected) {
    findings[K_INC].push(`${s.label}: stored=${s.include === true} rule=${expected} status=${JSON.stringify(s.status)} faults=${JSON.stringify(s.faults.join(", "))}`);
  }
  if (s.sig === true && s.ref !== true) findings[K_SIG].push(s.label);
  if (s.sour === true && (s.ref === true || s.sig === true)) findings[K_SOUR].push(`${s.label}: reference=${s.ref} signature=${s.sig}`);
  if (s.rating != null && (s.rating < 0 || s.rating > 10)) findings[K_RATING].push(`${s.label}: ${s.rating}`);
  if (s.pref != null && (s.pref < 0 || s.pref > 11)) findings[K_PREF].push(`${s.label}: ${s.pref}`);
}

console.log(`Shots checked: ${shots.length} (read-only; nothing was changed)\n`);
for (const [name, rows] of Object.entries(findings)) {
  console.log(`${name}: ${rows.length}`);
  for (const r of rows) console.log(`  - ${r}`);
}
process.exitCode = Object.values(findings).some((rows) => rows.length) ? 1 : 0;
