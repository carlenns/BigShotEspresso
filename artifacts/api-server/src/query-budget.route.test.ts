// S6: database-operation budgets per request. A per-operation-billed Postgres
// host (e.g. Prisma Postgres) charges for every statement, so these tests pin
// how many statements the hottest requests issue. Counted at the Drizzle layer
// (BEGIN/COMMIT not included). Raise a budget only deliberately.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { api, queryCounter, stopServer } from "./test-support/http";

after(stopServer);

const measured: Record<string, number> = {};

async function count(label: string, method: string, path: string, body?: unknown) {
  await api("GET", "/healthz"); // make sure the server is up before counting
  queryCounter.reset();
  const res = await api(method, path, body);
  measured[label] = queryCounter.count;
  if (process.env.SHOW_SQL) console.log(label, queryCounter.statements.map((q) => q.slice(0, 140)));
  return { ...res, statements: queryCounter.count };
}

let bagId = 0;
let shotId = 0;

before(async () => {
  const bean = await api("POST", "/beans", { name: "Budget Bean" });
  const bag = await api("POST", "/bags", { bagName: "Budget Bag", beanId: bean.json.id, isActive: true, openedDate: "2026-09-01" });
  bagId = bag.json.id;
  await api("POST", "/hoppers", { name: "Budget hopper", bagId, isActive: true, phase: "Phase 1" });
  for (let i = 0; i < 6; i++) {
    const s = await api("POST", "/shots", {
      shotDate: `2026-09-${String(10 + i).padStart(2, "0")}T08:00`, bagId, status: "Good", faultStatus: ["Good"],
      rating: 7 + (i % 3), preferenceRating: 8, dose: 18, yield: 36, pourDelay: 6, pourTime: 28, isReference: i === 2,
      initialGrindWeight: 18.1, grindSetting: 2.33, grindTime: 8.1,
    });
    assert.equal(s.status, 201, JSON.stringify(s.json));
    shotId = s.json.id;
  }
  await api("PUT", "/settings", { defaultDose: "18", defaultTargetYield: "36" });
});

test("query budget: GET /dashboard/intelligence", async () => {
  const r = await count("GET /dashboard/intelligence", "GET", "/dashboard/intelligence");
  assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 300));
  assert.ok(r.statements <= 8, `dashboard used ${r.statements}`);
});

test("query budget: POST /shots", async () => {
  const r = await count("POST /shots", "POST", "/shots", { shotDate: "2026-09-20T08:00", bagId, status: "Good", faultStatus: ["Good"], rating: 8, grindSetting: 2.34, grindTime: 8.2 });
  assert.equal(r.status, 201);
  assert.ok(r.statements <= 3, `create used ${r.statements}`);
});

test("query budget: PATCH /shots/:id", async () => {
  const r = await count("PATCH /shots/:id", "PATCH", `/shots/${shotId}`, { notes: "budget edit" });
  assert.equal(r.status, 200);
  assert.ok(r.statements <= 2, `update used ${r.statements}`);
});

test("query budget: GET /bags and GET /shots", async () => {
  const bags = await count("GET /bags", "GET", "/bags");
  assert.equal(bags.status, 200);
  assert.ok(bags.statements <= 4, `bags used ${bags.statements}`);
  const shots = await count("GET /shots", "GET", `/shots?bagId=${bagId}&limit=25`);
  assert.equal(shots.status, 200);
  assert.ok(shots.statements <= 2, `shots used ${shots.statements}`);
});

test("query budget: PUT /settings with 5 keys", async () => {
  const r = await count("PUT /settings (5 keys)", "PUT", "/settings", { a1: "1", a2: "2", a3: "3", a4: "4", a5: "5" });
  assert.equal(r.status, 200);
  assert.equal(r.statements, 1, "one multi-row upsert, not one statement per key");
  // Upsert still updates existing keys and inserts new ones.
  await api("PUT", "/settings", { a1: "changed", a6: "new" });
  const after = await api("GET", "/settings");
  assert.equal(after.json.a1, "changed");
  assert.equal(after.json.a2, "2");
  assert.equal(after.json.a6, "new");
});

test("PATCH /shots keeps Days Since Open correct when the bag changes (joined opened_date only reused for the same bag)", async () => {
  const other = await api("POST", "/bags", { bagName: "Other Budget Bag", openedDate: "2026-09-15" });
  const created = await api("POST", "/shots", { shotDate: "2026-09-20T08:00", bagId, status: "Good", faultStatus: ["Good"] });
  assert.equal(created.json.daysSinceOpen, 19, "opened 2026-09-01");
  const sameBag = await api("PATCH", `/shots/${created.json.id}`, { shotDate: "2026-09-21T08:00" });
  assert.equal(sameBag.json.daysSinceOpen, 20);
  const moved = await api("PATCH", `/shots/${created.json.id}`, { bagId: other.json.id });
  assert.equal(moved.json.daysSinceOpen, 6, "recomputed from the new bag's opened date");
});

after(() => {
  console.log("QUERY_BUDGET " + JSON.stringify(measured));
});

test("Dashboard single-read still separates eligible shots from the whole-bag inventory", async () => {
  const before = await api("GET", "/dashboard/intelligence");
  const eligibleBefore = before.json.bagIntelligence.shotCount as number;
  // An excluded shot marked Dialed In: not analysis-eligible, but it still flips the dial-in flag.
  await api("POST", "/shots", { shotDate: "2026-09-25T08:00", bagId, status: "Dialed In", faultStatus: ["Sour"], rating: 5 });
  const after = await api("GET", "/dashboard/intelligence");
  assert.equal(after.json.bagIntelligence.shotCount, eligibleBefore, "excluded shot does not enter analytics");
  assert.equal(after.json.bagIntelligence.hasDialedInShot, true, "whole-bag inventory still sees it");
});
