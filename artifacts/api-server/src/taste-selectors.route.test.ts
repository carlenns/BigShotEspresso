import assert from "node:assert/strict";
import { after, test } from "node:test";
import { api, stopServer } from "./test-support/http";

after(stopServer);

type Selector = { id: number; name: string; category: string; origin: string; archivedAt: string | null; canonicalKey: string | null };

async function list(includeArchived = false): Promise<Selector[]> {
  const { json } = await api("GET", `/taste-selectors${includeArchived ? "?includeArchived=true" : ""}`);
  return json as Selector[];
}

test("creating a custom selector normalizes the name and rejects blanks, bad categories and case-insensitive duplicates", async () => {
  const created = await api("POST", "/taste-selectors", { name: "  dark   CHOCOLATE ", category: "flavor" });
  assert.equal(created.status, 201);
  assert.equal(created.json.name, "Dark Chocolate");
  assert.equal(created.json.origin, "custom");
  assert.equal(created.json.category, "flavor");

  assert.equal((await api("POST", "/taste-selectors", { name: "   " })).status, 400);
  assert.equal((await api("POST", "/taste-selectors", { name: "Fruity Thing", category: "nonsense" })).status, 400);
  assert.equal((await api("POST", "/taste-selectors", { name: "DARK chocolate" })).status, 409);
});

test("seeding is idempotent and marks the seeded selectors standard", async () => {
  const first = await api("POST", "/taste-selectors/seed");
  assert.equal(first.status, 200);
  assert.ok(first.json.seeded > 0);
  const second = await api("POST", "/taste-selectors/seed");
  assert.equal(second.json.seeded, 0);
  assert.equal(second.json.total, first.json.total);
  const standard = (await list()).filter((s) => s.origin === "standard");
  assert.ok(standard.length > 0);
  assert.ok(standard.every((s) => s.canonicalKey));
});

test("standard selectors can't be renamed, recategorized or deleted", async () => {
  await api("POST", "/taste-selectors/seed");
  const std = (await list()).find((s) => s.origin === "standard")!;
  const rename = await api("PATCH", `/taste-selectors/${std.id}`, { name: "Something Else" });
  assert.equal(rename.status, 409);
  const other = std.category === "texture" ? "balance" : "texture";
  assert.equal((await api("PATCH", `/taste-selectors/${std.id}`, { category: other })).status, 409);
  assert.equal((await api("DELETE", `/taste-selectors/${std.id}`)).status, 409);
  assert.ok((await list()).some((s) => s.id === std.id));
});

test("custom selectors can be renamed, but not to a name that is taken", async () => {
  const a = await api("POST", "/taste-selectors", { name: "Rename Me" });
  const b = await api("POST", "/taste-selectors", { name: "Already Here" });
  const ok = await api("PATCH", `/taste-selectors/${a.json.id}`, { name: "renamed fine" });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.name, "Renamed Fine");
  assert.equal((await api("PATCH", `/taste-selectors/${a.json.id}`, { name: "already here" })).status, 409);
  assert.equal((await api("PATCH", "/taste-selectors/999999", { name: "Nope" })).status, 404);
  assert.notEqual(a.json.id, b.json.id);
});

test("archive hides a selector from the default list, restore brings it back, and an archived name stays taken", async () => {
  const s = await api("POST", "/taste-selectors", { name: "Archive Me" });
  const archived = await api("POST", `/taste-selectors/${s.json.id}/archive`);
  assert.equal(archived.status, 200);
  assert.ok(archived.json.archivedAt);
  assert.ok(!(await list()).some((x) => x.id === s.json.id));
  assert.ok((await list(true)).some((x) => x.id === s.json.id));
  assert.equal((await api("POST", "/taste-selectors", { name: "archive me" })).status, 409);

  const restored = await api("POST", `/taste-selectors/${s.json.id}/restore`);
  assert.equal(restored.status, 200);
  assert.equal(restored.json.archivedAt, null);
  assert.ok((await list()).some((x) => x.id === s.json.id));
  assert.equal((await api("POST", "/taste-selectors/999999/archive")).status, 404);
  assert.equal((await api("POST", "/taste-selectors/999999/restore")).status, 404);
});

test("promote needs a real category, locks the selector as standard, and can't run twice or clash on the key", async () => {
  const s = await api("POST", "/taste-selectors", { name: "Promote Me" });
  const noCategory = await api("POST", `/taste-selectors/${s.json.id}/promote`, {});
  assert.equal(noCategory.status, 400);
  assert.equal((await api("POST", `/taste-selectors/${s.json.id}/promote`, { category: "nonsense" })).status, 400);

  const promoted = await api("POST", `/taste-selectors/${s.json.id}/promote`, { category: "finish" });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.json.origin, "standard");
  assert.equal(promoted.json.category, "finish");
  assert.equal(promoted.json.canonicalKey, "finish.promote-me");
  assert.equal((await api("POST", `/taste-selectors/${s.json.id}/promote`, { category: "finish" })).status, 409);
  assert.equal((await api("PATCH", `/taste-selectors/${s.json.id}`, { name: "Changed" })).status, 409);
  assert.equal((await api("DELETE", `/taste-selectors/${s.json.id}`)).status, 409);

  // Another custom selector with the same name can't be promoted into the same key.
  const twin = await api("POST", "/taste-selectors", { name: "Promote-Me" });
  assert.equal(twin.status, 201);
  const clash = await api("POST", `/taste-selectors/${twin.json.id}/promote`, { category: "finish" });
  assert.equal(clash.status, 409);
  assert.equal((await api("POST", "/taste-selectors/999999/promote", { category: "finish" })).status, 404);
});

test("shot tags: PUT replaces the full set, GET reads it, and deleting a custom selector removes it from the shot", async () => {
  const shot = await api("POST", "/shots", { shotDate: "2026-09-29T08:00", status: "Good", faultStatus: ["Good"] });
  assert.equal(shot.status, 201);
  const a = await api("POST", "/taste-selectors", { name: "Tag Alpha" });
  const b = await api("POST", "/taste-selectors", { name: "Tag Beta" });

  assert.equal((await api("PUT", `/shots/${shot.json.id}/taste-selectors`, { ids: [a.json.id, b.json.id] })).status, 200);
  const both = await api("GET", `/shots/${shot.json.id}/taste-selectors`);
  assert.deepEqual(both.json.map((s: Selector) => s.id).sort(), [a.json.id, b.json.id].sort());

  await api("PUT", `/shots/${shot.json.id}/taste-selectors`, { ids: [b.json.id] });
  assert.deepEqual((await api("GET", `/shots/${shot.json.id}/taste-selectors`)).json.map((s: Selector) => s.id), [b.json.id]);
  assert.equal((await api("PUT", `/shots/${shot.json.id}/taste-selectors`, { ids: "nope" })).status, 400);

  assert.equal((await api("DELETE", `/taste-selectors/${b.json.id}`)).status, 204);
  assert.deepEqual((await api("GET", `/shots/${shot.json.id}/taste-selectors`)).json, []);
});
