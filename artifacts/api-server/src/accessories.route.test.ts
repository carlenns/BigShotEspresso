import assert from "node:assert/strict";
import { after, test } from "node:test";
import { api, stopServer } from "./test-support/http";

after(stopServer);

async function defaultsOfType(type: string): Promise<number[]> {
  const { json } = await api("GET", "/accessories");
  return (json as Array<{ id: number; type: string; isDefault: boolean }>)
    .filter((a) => a.type === type && a.isDefault)
    .map((a) => a.id);
}

test("EQ-3: creating a default accessory clears the previous default of the same type only", async () => {
  const a = await api("POST", "/accessories", { type: "basket", brand: "Test A", isDefault: true });
  const b = await api("POST", "/accessories", { type: "basket", brand: "Test B", isDefault: true });
  const tamper = await api("POST", "/accessories", { type: "tamper", brand: "Test T", isDefault: true });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.deepEqual(await defaultsOfType("basket"), [b.json.id]);
  assert.deepEqual(await defaultsOfType("tamper"), [tamper.json.id]);
});

test("EQ-3: a toggle-only PATCH (no type in body) still keeps one default per type", async () => {
  const x = await api("POST", "/accessories", { type: "puck_screen", brand: "Test X", isDefault: true });
  const y = await api("POST", "/accessories", { type: "puck_screen", brand: "Test Y" });
  const patched = await api("PATCH", `/accessories/${y.json.id}`, { isDefault: true });
  assert.equal(patched.status, 200);
  assert.equal(patched.json.isDefault, true);
  assert.deepEqual(await defaultsOfType("puck_screen"), [y.json.id]);
  assert.notEqual(x.json.id, y.json.id);
});

test("EQ-3: PATCH on a missing accessory is a 404 and changes no defaults", async () => {
  const before = await defaultsOfType("puck_screen");
  const missing = await api("PATCH", "/accessories/999999", { isDefault: true });
  assert.equal(missing.status, 404);
  assert.deepEqual(await defaultsOfType("puck_screen"), before);
});

// DI-3: no table references accessories today (no foreign key exists to
// violate), so the only real gap was that DELETE had no guard at all —
// missing id, invalid id, and the default accessory of a type all deleted
// (or 204'd) unconditionally. Mirrors the existence + protected-record guard
// pattern already used for grinders/machines/bags.
test("DI-3: DELETE /accessories/:id rejects a bad id, a missing id, and the default of its type", async () => {
  const bad = await api("DELETE", "/accessories/not-a-number");
  assert.equal(bad.status, 400);

  const missing = await api("DELETE", "/accessories/999999");
  assert.equal(missing.status, 404);

  const wdt = await api("POST", "/accessories", { type: "wdt_tool", brand: "Test WDT", isDefault: true });
  const blocked = await api("DELETE", `/accessories/${wdt.json.id}`);
  assert.equal(blocked.status, 409);
  assert.match(blocked.json.error, /default/i);
  assert.equal((await api("GET", `/accessories/${wdt.json.id}`)).status, 200, "not actually deleted");

  const nonDefault = await api("POST", "/accessories", { type: "wdt_tool", brand: "Test WDT 2" });
  const allowed = await api("DELETE", `/accessories/${nonDefault.json.id}`);
  assert.equal(allowed.status, 204);
  assert.equal((await api("GET", `/accessories/${nonDefault.json.id}`)).status, 404);
});
