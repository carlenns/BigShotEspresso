import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { parseBaselineCsvData, parseHopperCsvData } from "./lib/hopper-csv";

process.env.DATABASE_URL ??= ["postgresql:", "", "test.invalid", "phase15"].join("/");
const { parseCsvAndImport } = await import("./routes/shots");

const currentShotsUrl = new URL(
  "../test-fixtures/csv/Shots-Shots Entering-7.csv",
  import.meta.url,
);
const historicalShotsUrl = new URL(
  "../../../attached_assets/Shots-Shots_Entering-3_1780995685326.csv",
  import.meta.url,
);
const hopperUrl = new URL(
  "../test-fixtures/csv/Hopper-Grid view.csv",
  import.meta.url,
);
const baselineUrl = new URL(
  "../test-fixtures/csv/Hopper Range Baselines-Hopper Range Baselines.csv",
  import.meta.url,
);
const migrationUrl = new URL(
  "../../../lib/db/migrations/0001_phase1_data_foundation.sql",
  import.meta.url,
);

async function text(url: URL): Promise<string> {
  return readFile(fileURLToPath(url), "utf8");
}

function relationshipLookups(csvText: string) {
  const initial = parseCsvAndImport(csvText);
  const bags = new Map<string, { bagId: number; beanName: string | null }>();
  const hoppers = new Map<string, number>();
  const baselines = new Map<string, number>();
  let nextBag = 1;
  let nextHopper = 1;
  let nextBaseline = 1;

  for (const row of initial.rows) {
    if (row.bag && !bags.has(row.bag)) {
      bags.set(row.bag, { bagId: nextBag++, beanName: `Bean ${row.bag}` });
    }
    const raw = row.rawRow ?? {};
    const hopper = String(raw["Hopper Link"] ?? "").replace(/"/g, "").trim();
    if (hopper && !hoppers.has(hopper)) hoppers.set(hopper, nextHopper++);
    const range = String(raw["Hopper Range Link"] ?? raw["Hopper Range"] ?? "").trim();
    if (range && !baselines.has(range)) baselines.set(range, nextBaseline++);
  }
  return { bags, hoppers, baselines };
}

test("current and historical Shot CSV exports parse completely", async () => {
  const currentText = await text(currentShotsUrl);
  const currentLookups = relationshipLookups(currentText);
  const current = parseCsvAndImport(
    currentText,
    currentLookups.bags,
    currentLookups.hoppers,
    currentLookups.baselines,
    true,
  );

  assert.equal(current.headers.length, 93);
  assert.equal(current.rows.length, 164);
  assert.deepEqual(current.errors, []);
  assert.equal(new Set(current.rows.map((row) => row.importFingerprint)).size, 164);
  assert.equal(current.rows.some((row) => row.flowTime != null), true);
  assert.equal(current.rows.some((row) => row.includeInAnalysis === true), true);
  assert.equal(
    current.rows.some((row) =>
      row.faultStatus?.join("|") === "Fault|Grinder Issue"),
    true,
  );
  for (const row of current.rows) {
    const raw = row.rawRow ?? {};
    for (const [sourceField, parsed] of [
      ["Fault Status", row.faultStatus],
      ["Shot Classification", row.shotClassification],
      ["Bean Achievement", row.beanAchievement],
      ["Expression Style", row.expressionStyle],
      ["Intelligence Lesson Type", row.intelligenceLessonType],
    ] as const) {
      const source = String(raw[sourceField] ?? "").trim();
      if (source) assert.equal(parsed?.join(","), source);
    }
  }

  const historicalText = await text(historicalShotsUrl);
  const historicalLookups = relationshipLookups(historicalText);
  const historical = parseCsvAndImport(
    historicalText,
    historicalLookups.bags,
    historicalLookups.hoppers,
    historicalLookups.baselines,
    true,
  );

  assert.equal(historical.headers.length, 87);
  assert.equal(historical.rows.length, 132);
  assert.deepEqual(historical.errors, []);
  assert.equal(historical.rows.some((row) => row.flowTime != null), true);
});

test("strict Shot CSV parsing reports unresolved relationships", async () => {
  const parsed = parseCsvAndImport(await text(currentShotsUrl), new Map(), new Map(), new Map(), true);
  assert.equal(parsed.rows.length < 164, true);
  assert.match(parsed.errors[0] ?? "", /was not found/);
});

test("Hopper and baseline CSV exports preserve source values", async () => {
  const hoppers = parseHopperCsvData(await text(hopperUrl));
  const baselines = parseBaselineCsvData(await text(baselineUrl));

  assert.equal(hoppers.headers.length, 8);
  assert.equal(hoppers.rows.length, 12);
  assert.deepEqual(hoppers.errors, []);
  assert.equal(hoppers.rows[0]?.hopperPercent, 100);
  assert.equal(hoppers.rows[1]?.hopperPercent, -86.53);
  assert.equal(Object.keys(hoppers.rows[0]?.rawRow ?? {}).length, 8);

  assert.equal(baselines.headers.length, 7);
  assert.equal(baselines.rows.length, 5);
  assert.deepEqual(baselines.errors, []);
  assert.equal(baselines.rows[0]?.observationCount, 44);
  assert.equal(Object.keys(baselines.rows[0]?.rawRow ?? {}).length, 7);
});

test("Hopper and baseline records insert into the migrated database", async () => {
  const db = new PGlite();
  await db.exec(`
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
  `);
  await db.exec(await text(migrationUrl));

  const hoppers = parseHopperCsvData(await text(hopperUrl));
  for (const row of hoppers.rows) {
    await db.query(
      `INSERT INTO hoppers (
        name, starting_beans, is_active, hopper_mass, hopper_percent,
        shots_left_estimate, notes, raw_row
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        row.name,
        row.startingBeans,
        row.isActive,
        row.hopperMass,
        row.hopperPercent,
        row.shotsLeftEstimate,
        row.notes,
        JSON.stringify(row.rawRow),
      ],
    );
  }

  const baselines = parseBaselineCsvData(await text(baselineUrl));
  for (const row of baselines.rows) {
    await db.query(
      `INSERT INTO hopper_range_baselines (
        hopper_range, baseline_output_adjusted_date, baseline_output_status,
        baseline_output, avg_initial_output, observation_count, raw_row
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        row.hopperRange,
        row.baselineOutputAdjustedDate,
        row.baselineOutputStatus,
        row.baselineOutput,
        row.avgInitialOutput,
        row.observationCount,
        JSON.stringify(row.rawRow),
      ],
    );
  }

  const hopperCount = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM hoppers");
  const baselineCount = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM hopper_range_baselines");
  assert.equal(hopperCount.rows[0]?.count, 12);
  assert.equal(baselineCount.rows[0]?.count, 5);
  await db.close();
});
