import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL(
  "../../../lib/db/migrations/0001_phase1_data_foundation.sql",
  import.meta.url,
);

async function migratedDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE bags (
      id serial PRIMARY KEY,
      is_active boolean NOT NULL DEFAULT false
    );
    CREATE TABLE shots (
      id serial PRIMARY KEY,
      shot_date text NOT NULL,
      bag_id integer REFERENCES bags(id),
      scale_time integer,
      rating real,
      fault_status text,
      shot_classification text,
      bean_achievement text,
      expression_style text,
      include_in_analysis boolean,
      is_reference boolean NOT NULL DEFAULT false,
      airtable_record_id text
    );
  `);
  await db.exec(await readFile(fileURLToPath(migrationUrl), "utf8"));
  return db;
}

test("local and Airtable shots use the same Include in Analysis rule", async () => {
  const db = await migratedDatabase();
  await db.exec(`
    INSERT INTO bags (is_active) VALUES (true);
    INSERT INTO shots (
      shot_date, bag_id, rating, include_in_analysis, airtable_record_id
    ) VALUES
      ('2026-06-25T01:00:00.000Z', 1, 8, true, NULL),
      ('2026-06-25T02:00:00.000Z', 1, 9, true, 'rec-airtable'),
      ('2026-06-25T03:00:00.000Z', 1, 10, false, NULL),
      ('2026-06-25T04:00:00.000Z', 1, 10, NULL, 'rec-unknown');
  `);

  const eligible = await db.query<{
    id: number;
    airtable_record_id: string | null;
  }>(`
    SELECT id, airtable_record_id
    FROM shots
    WHERE include_in_analysis = true
    ORDER BY id
  `);

  assert.deepEqual(
    eligible.rows.map((row) => [row.id, row.airtable_record_id]),
    [[1, null], [2, "rec-airtable"]],
  );

  const aggregate = await db.query<{ count: number; average: number }>(`
    SELECT count(*)::int AS count, avg(rating)::real AS average
    FROM shots
    WHERE include_in_analysis = true
  `);
  assert.equal(aggregate.rows[0]?.count, 2);
  assert.equal(aggregate.rows[0]?.average, 8.5);
  await db.close();
});

test("Current Shot vs Reference is strictly isolated to the active Bag", async () => {
  const db = await migratedDatabase();
  await db.exec(`
    INSERT INTO bags (is_active) VALUES (true), (false);
    INSERT INTO shots (
      shot_date, bag_id, rating, include_in_analysis, is_reference, airtable_record_id
    ) VALUES
      ('2026-06-25T05:00:00.000Z', 1, 8, true, false, NULL),
      ('2026-06-25T04:00:00.000Z', 1, 9, true, true, 'rec-a-reference'),
      ('2026-06-25T06:00:00.000Z', 1, 10, false, true, 'rec-a-excluded'),
      ('2026-06-25T07:00:00.000Z', 2, 10, true, true, 'rec-b-reference');
  `);

  const latest = await db.query<{ id: number; bag_id: number }>(`
    SELECT id, bag_id
    FROM shots
    WHERE bag_id = 1 AND include_in_analysis = true
    ORDER BY shot_date DESC
    LIMIT 1
  `);
  const references = await db.query<{ id: number; bag_id: number }>(`
    SELECT id, bag_id
    FROM shots
    WHERE bag_id = 1
      AND include_in_analysis = true
      AND is_reference = true
    ORDER BY shot_date DESC
  `);

  assert.deepEqual(latest.rows, [{ id: 1, bag_id: 1 }]);
  assert.deepEqual(references.rows, [{ id: 2, bag_id: 1 }]);
  await db.close();
});

test("analytical route inventory uses the shared eligibility condition", async () => {
  const routeDirectory = new URL("./routes/", import.meta.url);
  const routeNames = ["beans.ts", "bags.ts", "insights.ts", "shots.ts", "dashboard.ts"];
  const source = await Promise.all(
    routeNames.map((name) => readFile(fileURLToPath(new URL(name, routeDirectory)), "utf8")),
  );

  for (const [index, contents] of source.entries()) {
    assert.match(
      contents,
      /eligibleShotConditions/,
      `${routeNames[index]} must use the shared eligibility condition`,
    );
    assert.doesNotMatch(
      contents,
      /isNotNull\(shotsTable\.airtableRecordId\)/,
      `${routeNames[index]} must not require Airtable identity for analytics`,
    );
  }

  const dashboardSource = source[4]!;
  // Current Shot vs Reference selection is delegated to the pure, unit-tested
  // helper (see dashboard-comparison.test.ts for the Gate 7 property tests). The
  // route must feed it the active-bag, analysis-eligible, newest-first array.
  assert.match(dashboardSource, /import \{ selectComparisonReferences \} from "\.\.\/lib\/dashboard-comparison"/);
  assert.match(
    dashboardSource,
    /const \{ latestAnalysisShot, compRefPool, compSource \} = selectComparisonReferences\(activeBagShots\)/,
  );
  assert.match(
    dashboardSource,
    /const activeBagShots = await db\.select\(\)\.from\(shotsTable\)[\s\S]{0,120}?eq\(shotsTable\.bagId, activeBagRow\.id\),[\s\S]{0,40}?\.\.\.eligibleShotConditions,/,
    "activeBagShots must be scoped to the active bag AND the shared eligibility condition before comparison",
  );
  // The insufficient-reference state is a labelled null, never a zeroed object.
  assert.match(dashboardSource, /bagReference: compRefPool\.length > 0 \? \{/);
  assert.match(dashboardSource, /\} : null,/);
  assert.match(
    dashboardSource,
    /const currentSetting = grindCurrent \?\? activeBagRow\.currentGrindSetting/,
    "Dashboard current grinder setting must prefer latest eligible shot data over imported Bag rollups",
  );
  assert.match(
    dashboardSource,
    /currentGrindSetting: currentSetting/,
    "Dashboard active bag response must expose the same latest-shot current grinder setting used by Grind Drift",
  );
  assert.match(
    dashboardSource,
    /const activeBagInventoryRecords = await db\.select\(\)\.from\(shotsTable\)/,
    "Dashboard must fetch all active-bag records separately for inventory consumption",
  );
  assert.match(
    dashboardSource,
    /const beanMassConsumed = activeBagInventoryRecords\.reduce/,
    "Dashboard bag progress must count all active-bag bean mass consumed, not only analysis-eligible basket dose",
  );
  assert.match(
    dashboardSource,
    /\+ \(waste > 0 \? waste : 0\)/,
    "Dashboard bag progress must include grinder setup and dial-in waste",
  );
  assert.match(
    dashboardSource,
    /\+ \(removed > 0 \? removed : 0\)/,
    "Dashboard bag progress must include over-grind removed from the basket",
  );
  assert.match(
    dashboardSource,
    /remaining = Math\.max\(0, Number\(activeBagRow\.bagWeight\) - beanMassConsumed\)/,
    "Dashboard shots-left estimate must derive from live active-bag bean consumption instead of stale imported Shot estimates",
  );
  assert.doesNotMatch(
    dashboardSource,
    /latestShotEstimate/,
    "Dashboard must not let historical imported Shots Left estimates override live active-bag progress",
  );
  assert.match(
    dashboardSource,
    /max\(case when \$\{bagsTable\.id\} = \$\{activeBagRow\.id\} then 1 else 0 end\)/,
    "Bag History must pin the active bag even when a new bag has fewer shots than historical bags",
  );
  // compRefPool comes only from the destructured helper result — it is never
  // reassigned to a cross-bag or rating-derived fallback pool.
  assert.doesNotMatch(dashboardSource, /compRefPool\s*=\s*[^=]/);

  // The helper itself: pool is the manual isReference flag, empty pool => a
  // distinct insufficient-data flag (unit-tested in dashboard-comparison.test.ts).
  const comparisonSource = await readFile(
    fileURLToPath(new URL("./lib/dashboard-comparison.ts", import.meta.url)),
    "utf8",
  );
  const comparisonBody = comparisonSource.slice(comparisonSource.indexOf("export function selectComparisonReferences"));
  assert.match(comparisonBody, /const compRefPool = activeBagShots\.filter\(\(s\) => s\.isReference === true\);/);
  assert.match(comparisonBody, /hasSufficientReferences: compRefPool\.length > 0,/);
  assert.doesNotMatch(comparisonBody, /rating|score|db\.|shotsTable/);
});

test("CSV-seeded Beans and Bags are visible without Airtable record IDs", async () => {
  const routeDirectory = new URL("./routes/", import.meta.url);
  const [beansSource, bagsSource] = await Promise.all([
    readFile(fileURLToPath(new URL("beans.ts", routeDirectory)), "utf8"),
    readFile(fileURLToPath(new URL("bags.ts", routeDirectory)), "utf8"),
  ]);

  assert.doesNotMatch(
    beansSource,
    /where\(isNotNull\(beansTable\.airtableRecordId\)\)/,
    "Beans list must not hide CSV/Postgres-created beans without Airtable IDs",
  );
  assert.doesNotMatch(
    bagsSource,
    /where\(isNotNull\(bagsTable\.airtableRecordId\)\)/,
    "Bags list must not hide CSV/Postgres-created bags without Airtable IDs",
  );
  assert.match(
    bagsSource,
    /latestGrind: sql<number \| null>`\(array_agg\(\$\{shotsTable\.grindSetting\} ORDER BY \$\{shotsTable\.shotDate\} DESC NULLS LAST\)\)\[1\]`/,
    "Bags list must derive current grind from the latest eligible shot rather than imported Bag rollups",
  );
  assert.match(
    bagsSource,
    /currentGrindSetting: bagStats\?\.latestGrind \?\? b\.currentGrindSetting/,
    "Bags list response must expose latest-shot current grind when available",
  );
  assert.match(
    bagsSource,
    /closedOutDate = !b\.isActive \? b\.closedOutDate \?\? bagStats\?\.latestShotDate \?\? null : null/,
    "Bags list must prefer stored closeout date before falling back to latest eligible shot date",
  );
  assert.match(
    bagsSource,
    /daysSinceClosedOut/,
    "Bags list response must expose days since an inactive bag was closed out",
  );

  const bagsPageSource = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(bagsPageSource, /Closed \{bag\.daysSinceClosedOut\}d ago/);
  assert.match(bagsPageSource, /Closed: \{bag\.closedOutDate\.slice\(0, 10\)\}/);
});
