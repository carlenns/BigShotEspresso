// The server carries a shot's grind setting/time onto the active bag's stored
// current_grind_* columns. It must honour the Settings toggle and only follow
// the bag's newest shot (editing or back-dating an older shot must not
// overwrite the grind the bag is using now). Reads the raw columns directly:
// the bags API shows a value derived from the latest shot instead.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";
import { db, bagsTable } from "@workspace/db";
import { api, queryCounter, stopServer } from "./test-support/http";

after(stopServer);

async function newBag(isActive = true): Promise<number> {
  const r = await api("POST", "/bags", { bagName: `Carry ${Math.random()}`, isActive, openedDate: "2026-09-01" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.id;
}

async function stored(bagId: number) {
  const [row] = await db.select({ s: bagsTable.currentGrindSetting, t: bagsTable.currentGrindTime })
    .from(bagsTable).where(eq(bagsTable.id, bagId));
  return { setting: row?.s ?? null, time: row?.t ?? null };
}

async function shot(bagId: number, shotDate: string, grindSetting: number, grindTime: number) {
  const r = await api("POST", "/shots", { shotDate, bagId, status: "Good", faultStatus: ["Good"], grindSetting, grindTime });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.id as number;
}

test("a new shot on the active bag carries its grind setting and time onto the bag", async () => {
  await api("PUT", "/settings", { rememberLastGrindSetting: "true" });
  const bag = await newBag();
  await shot(bag, "2026-09-10T08:00", 2.3, 8.1);
  assert.deepEqual(await stored(bag), { setting: 2.3, time: 8.1 });
});

test("with the Settings toggle off, neither creating nor editing a shot touches the bag", async () => {
  const bag = await newBag();
  await api("PUT", "/settings", { rememberLastGrindSetting: "true" });
  const first = await shot(bag, "2026-09-10T08:00", 2.3, 8.1);
  await api("PUT", "/settings", { rememberLastGrindSetting: "false" });
  await shot(bag, "2026-09-11T08:00", 3.0, 9.0);
  assert.deepEqual(await stored(bag), { setting: 2.3, time: 8.1 });
  // Editing the newest shot is also ignored while the toggle is off.
  const newest = await shot(bag, "2026-09-12T08:00", 3.5, 9.5);
  await api("PATCH", `/shots/${newest}`, { grindSetting: 3.6 });
  assert.deepEqual(await stored(bag), { setting: 2.3, time: 8.1 });
  assert.notEqual(first, newest);
  await api("PUT", "/settings", { rememberLastGrindSetting: "true" });
});

test("editing an older shot does not overwrite the bag's grind, but editing the newest does", async () => {
  await api("PUT", "/settings", { rememberLastGrindSetting: "true" });
  const bag = await newBag();
  const older = await shot(bag, "2026-09-10T08:00", 2.0, 7.0);
  const newest = await shot(bag, "2026-09-12T08:00", 2.6, 8.6);
  assert.deepEqual(await stored(bag), { setting: 2.6, time: 8.6 });

  await api("PATCH", `/shots/${older}`, { grindSetting: 1.1, grindTime: 6.1 });
  assert.deepEqual(await stored(bag), { setting: 2.6, time: 8.6 }, "older shot edit is ignored");

  await api("PATCH", `/shots/${newest}`, { grindSetting: 2.7 });
  assert.deepEqual(await stored(bag), { setting: 2.7, time: 8.6 }, "newest shot edit is carried");
});

test("a back-dated new shot does not overwrite the bag's grind", async () => {
  await api("PUT", "/settings", { rememberLastGrindSetting: "true" });
  const bag = await newBag();
  await shot(bag, "2026-09-12T08:00", 2.6, 8.6);
  await shot(bag, "2026-09-05T08:00", 1.0, 5.0);
  assert.deepEqual(await stored(bag), { setting: 2.6, time: 8.6 });
});

test("a shot on a bag that is not active leaves that bag alone", async () => {
  await api("PUT", "/settings", { rememberLastGrindSetting: "true" });
  const bag = await newBag(false);
  await shot(bag, "2026-09-10T08:00", 2.3, 8.1);
  assert.deepEqual(await stored(bag), { setting: null, time: null });
});

test("the carry-forward is still one extra statement per shot write", async () => {
  await api("PUT", "/settings", { rememberLastGrindSetting: "true" });
  const bag = await newBag();
  await api("GET", "/healthz");
  queryCounter.reset();
  await api("POST", "/shots", { shotDate: "2026-09-10T08:00", bagId: bag, status: "Good", faultStatus: ["Good"], grindSetting: 2.3, grindTime: 8.1 });
  assert.ok(queryCounter.count <= 3, `create used ${queryCounter.count}`);
});
