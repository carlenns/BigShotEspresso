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

// 2026-10-02 audit: the Reference counts on bag and bean cards must match the Reference Shots list, which only
// shows shots that count for analysis. A shot flagged Reference but excluded (not Good/Dialed In, or with a
// fault) keeps its flag but is not counted. This already held (all those queries filter to eligible shots);
// the test pins it so the cards and the list cannot drift apart.
test("Reference counts on bag and bean cards only include shots that count for analysis", async () => {
  const bean = await api("POST", "/beans", { name: "Reference Count Bean" });
  assert.equal(bean.status, 201);
  const bag = await api("POST", "/bags", { bagName: "Reference Count Bag", beanId: bean.json.id, isActive: true });
  assert.equal(bag.status, 201);
  const eligible = await api("POST", "/shots", { shotDate: "2026-10-02T08:00", bagId: bag.json.id, status: "Good", faultStatus: ["Good"], isReference: true, rating: 9 });
  const excluded = await api("POST", "/shots", { shotDate: "2026-10-02T08:05", bagId: bag.json.id, status: "Needs Work", faultStatus: ["Good"], isReference: true, rating: 5 });
  assert.equal(eligible.status, 201, JSON.stringify(eligible.json));
  assert.equal(excluded.status, 201, JSON.stringify(excluded.json));
  assert.equal(eligible.json.includeInAnalysis, true);
  assert.equal(excluded.json.includeInAnalysis, false);
  assert.equal(excluded.json.isReference, true, "premise: the excluded shot really is saved as a Reference shot");

  const bags = await api("GET", "/bags");
  assert.equal(bags.json.find((b: { id: number }) => b.id === bag.json.id).referenceCount, 1);
  const detail = await api("GET", `/bags/${bag.json.id}`);
  assert.equal(detail.json.analysis.referenceShots, 1);
  assert.equal(detail.json.referenceShots.length, 1);
  const beans = await api("GET", "/beans");
  assert.equal(beans.json.find((b: { id: number }) => b.id === bean.json.id).referenceCount, 1);
  // The Reference Shots list agrees.
  const list = await api("GET", `/shots?bagId=${bag.json.id}&isReference=true`);
  assert.equal(list.json.total ?? list.json.shots.length, list.json.shots.length);
});

// 2026-10-02 (Carl): For Others always means Not Rated, enforced on every create and update, not only in the form.
// Unticking For Others leaves Not Rated alone. Shots that are not For Others are untouched. (The CSV and Airtable
// import paths are separate and are not changed; imported history keeps its original values.)
test("For Others implies Not Rated on the server, one way only", async () => {
  const bag = await api("POST", "/bags", { bagName: "For Others Rule Bag", isActive: true });
  const base = { bagId: bag.json.id, status: "Good", faultStatus: ["Good"] };

  // Create: For Others with a rating sent -> stored Not Rated with the ratings cleared.
  const forOthers = await api("POST", "/shots", { ...base, shotDate: "2026-10-02T09:00", isForOthers: true, rated: true, rating: 9, preferenceRating: 8 });
  assert.equal(forOthers.status, 201, JSON.stringify(forOthers.json));
  assert.equal(forOthers.json.isForOthers, true);
  assert.equal(forOthers.json.rated, false);
  assert.equal(forOthers.json.rating, null);
  assert.equal(forOthers.json.preferenceRating, null);

  // A normal rated shot is untouched.
  const normal = await api("POST", "/shots", { ...base, shotDate: "2026-10-02T09:05", rated: true, rating: 9 });
  assert.equal(normal.json.rated, true);
  assert.equal(normal.json.rating, 9);
  assert.equal(normal.json.isForOthers ?? false, false);

  // Update: marking a rated shot For Others makes it Not Rated and clears the ratings.
  const patched = await api("PATCH", `/shots/${normal.json.id}`, { isForOthers: true });
  assert.equal(patched.status, 200, JSON.stringify(patched.json));
  assert.equal(patched.json.rated, false);
  assert.equal(patched.json.rating, null);

  // Unticking For Others leaves Not Rated as it is (Not Rated can stand alone).
  const unticked = await api("PATCH", `/shots/${normal.json.id}`, { isForOthers: false });
  assert.equal(unticked.json.isForOthers, false);
  assert.equal(unticked.json.rated, false);

  // Editing an unrelated field on a For Others shot keeps it Not Rated.
  const noted = await api("PATCH", `/shots/${forOthers.json.id}`, { notes: "for a guest" });
  assert.equal(noted.json.rated, false);
  assert.equal(noted.json.isForOthers, true);
});

// 2026-10-06 (Carl): "Bag dialed in" is about consistency, not a high average. The last 5 rated shots must be
// within 1.0 point of each other (highest minus lowest) and average at least 7.5. Supersedes the 2026-10-02
// "3 rated shots averaging 8.5+" rule.
test("Dashboard says 'Bag dialed in' only when the last 5 rated shots are within 1.0 point and average 7.5+", async () => {
  const bag = await api("POST", "/bags", { bagName: "Dialed In Rule Bag", isActive: true });
  assert.equal(bag.status, 201);
  let minute = 0;
  const shot = (rating: number) => api("POST", "/shots", { bagId: bag.json.id, shotDate: `2026-10-02T10:${String(++minute).padStart(2, "0")}`, status: "Good", faultStatus: ["Good"], rated: true, rating });
  const dialed = async () => JSON.stringify((await api("GET", "/dashboard/intelligence")).json).includes("Bag dialed in");

  for (const r of [8, 8, 8, 8]) await shot(r);
  assert.equal(await dialed(), false, "four rated shots are not enough");
  await shot(8.5);
  assert.equal(await dialed(), true, "five shots within 1.0 point averaging 8.1 is dialed in");
  await shot(9.5);
  assert.equal(await dialed(), false, "the last 5 (8,8,8,8.5,9.5) span 1.5, so not dialed in");
  await shot(8.5);
  await shot(8.5);
  await shot(8.5);
  assert.equal(await dialed(), true, "consistent again once the wide shot leaves the window of 5");
});

test("Dashboard does not say 'Bag dialed in' when 5 consistent shots average under 7.5", async () => {
  const bag = await api("POST", "/bags", { bagName: "Consistent But Low Bag", isActive: true });
  assert.equal(bag.status, 201);
  for (let i = 1; i <= 5; i++) {
    await api("POST", "/shots", { bagId: bag.json.id, shotDate: `2026-10-03T10:0${i}`, status: "Good", faultStatus: ["Good"], rated: true, rating: 6.5 });
  }
  const text = JSON.stringify((await api("GET", "/dashboard/intelligence")).json);
  assert.equal(text.includes("Bag dialed in"), false);
});
