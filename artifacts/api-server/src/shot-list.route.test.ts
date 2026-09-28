import assert from "node:assert/strict";
import { after, test } from "node:test";
import { api, stopServer } from "./test-support/http";
// The helper lives in the coffee-log app; load it by URL so it stays outside this
// package's TypeScript rootDir.
const filtersUrl = new URL("../../coffee-log/src/lib/shot-list-filters.ts", import.meta.url).href;
const {
  EMPTY_SHOT_LIST_FILTERS,
  activeFilterCount,
  pageSummary,
  parseShotListQuery,
  toListShotsParams,
  toShotListQuery,
} = (await import(filtersUrl)) as {
  EMPTY_SHOT_LIST_FILTERS: Record<string, unknown> & { page: number };
  activeFilterCount: (f: object) => number;
  pageSummary: (page: number, total: number, pageSize?: number) => { from: number; to: number; pageCount: number };
  parseShotListQuery: (search: string) => Record<string, unknown>;
  toListShotsParams: (f: object, pageSize?: number) => Record<string, string>;
  toShotListQuery: (f: object) => string;
};

after(stopServer);

test("Shot Log filters round-trip through the URL and ignore junk", () => {
  const f = { ...EMPTY_SHOT_LIST_FILTERS, search: "kenya", bagId: "8", faultStatus: "Sour", reference: "true" as const, ratingMin: "8", dateFrom: "2026-09-01", dateTo: "2026-09-27", page: 3 };
  assert.deepEqual(parseShotListQuery(toShotListQuery(f)), f);
  assert.equal(toShotListQuery(EMPTY_SHOT_LIST_FILTERS), "");
  assert.deepEqual(
    parseShotListQuery("?bag=abc&ref=maybe&ratingMin=-1&from=yesterday&page=0"),
    EMPTY_SHOT_LIST_FILTERS,
  );
  assert.equal(activeFilterCount(f), 6);
});

test("Shot Log filters map onto existing GET /shots params with inclusive day bounds and paging", () => {
  const params = toListShotsParams({ ...EMPTY_SHOT_LIST_FILTERS, bagId: "8", status: "Good", dateFrom: "2026-09-01", dateTo: "2026-09-27", page: 2 }, 25);
  assert.deepEqual(params, {
    limit: "25",
    offset: "25",
    bagId: "8",
    status: "Good",
    dateFrom: "2026-09-01",
    dateTo: "2026-09-27T23:59:59.999Z",
  });
  assert.deepEqual(pageSummary(2, 60, 25), { from: 26, to: 50, pageCount: 3 });
  assert.deepEqual(pageSummary(1, 0, 25), { from: 0, to: 0, pageCount: 1 });
  assert.deepEqual(pageSummary(2, 16, 25), { from: 0, to: 0, pageCount: 1 }, "past the last page shows no range");
});

test("GET /shots filters by exact bagId, reference, rating and inclusive day range, and pages with a total", async () => {
  const a = await api("POST", "/bags", { bagName: "Bag 1", isActive: false });
  const b = await api("POST", "/bags", { bagName: "Bag 10", isActive: false });
  assert.equal(a.status, 201);
  const shot = (bagId: number, shotDate: string, extra: Record<string, unknown> = {}) =>
    api("POST", "/shots", { shotDate, bagId, status: "Good", faultStatus: ["Good"], ...extra });
  for (const [bagId, date, extra] of [
    [a.json.id, "2026-09-01T08:00", { rating: 9, isReference: true }],
    [a.json.id, "2026-09-27T21:30", { rating: 7 }], // local evening on the last day
    [a.json.id, "2026-09-28T07:00", { rating: 8 }],
    [b.json.id, "2026-09-02T08:00", { rating: 9 }],
  ] as const) {
    const res = await shot(bagId, date, extra);
    assert.equal(res.status, 201, JSON.stringify(res.json));
  }

  const byBag = await api("GET", `/shots?bagId=${a.json.id}`);
  assert.equal(byBag.json.total, 3, "exact bag id does not also match 'Bag 10'");

  const ranged = await api("GET", `/shots?bagId=${a.json.id}&dateFrom=2026-09-01&dateTo=2026-09-27T23:59:59.999Z`);
  assert.equal(ranged.json.total, 2, "inclusive of a late-evening shot on the end day");

  const refs = await api("GET", `/shots?bagId=${a.json.id}&isReference=true`);
  assert.deepEqual(refs.json.shots.map((s: { rating: number }) => s.rating), [9]);

  const rated = await api("GET", "/shots?ratingMin=9");
  assert.equal(rated.json.total, 2);

  const page2 = await api("GET", `/shots?bagId=${a.json.id}&limit=2&offset=2`);
  assert.equal(page2.json.total, 3);
  assert.equal(page2.json.shots.length, 1);

  const bad = await api("GET", "/shots?bagId=x");
  assert.equal(bad.status, 400);
});

test("Shot Log filters by System Phase, Phase Name (mode) and Experiment", async () => {
  const f = { ...EMPTY_SHOT_LIST_FILTERS, systemPhase: "3", phaseName: "Hopper Overfill Mode", experiment: "Timed Dose Stability" };
  assert.deepEqual(parseShotListQuery(toShotListQuery(f)), f);
  assert.deepEqual(parseShotListQuery("?phase=abc"), EMPTY_SHOT_LIST_FILTERS);
  assert.equal(activeFilterCount(f), 3);
  const params = toListShotsParams(f, 25);
  assert.equal(params.systemPhase, "3");
  assert.equal(params.systemPhaseName, "Hopper Overfill Mode");
  assert.equal(params.experimentName, "Timed Dose Stability");

  const mk = (systemPhase: number | null, systemPhaseName: string | null, experimentName: string | null) =>
    api("POST", "/shots", { shotDate: "2026-09-27T08:00", status: "Good", faultStatus: ["Good"], systemPhase, systemPhaseName, experimentName });
  await mk(3, "Hopper Overfill Mode", "Timed Dose Stability");
  await mk(3, "Timed Dose Optimization", null);
  await mk(2, "Scientific Process / Baseline", "Timed Dose Stability");
  await mk(null, null, null);

  assert.equal((await api("GET", "/shots?systemPhase=3")).json.total, 2);
  assert.equal((await api("GET", "/shots?systemPhaseName=hopper%20overfill%20mode")).json.total, 1, "case-insensitive");
  assert.equal((await api("GET", "/shots?experimentName=Timed%20Dose%20Stability")).json.total, 2);
  assert.equal((await api("GET", "/shots?systemPhase=3&experimentName=Timed%20Dose%20Stability")).json.total, 1);
  assert.equal((await api("GET", "/shots?systemPhase=x")).status, 400);
});
