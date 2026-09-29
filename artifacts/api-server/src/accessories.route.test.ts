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

test("DI-3: deleting the default accessory is refused; a non-default one can be deleted", async () => {
  const keep = await api("POST", "/accessories", { type: "dosing_cup", brand: "Guard A", isDefault: true });
  const other = await api("POST", "/accessories", { type: "dosing_cup", brand: "Guard B" });

  const refused = await api("DELETE", `/accessories/${keep.json.id}`);
  assert.equal(refused.status, 409);
  assert.match(refused.json.error, /default/i);
  assert.ok((await defaultsOfType("dosing_cup")).includes(keep.json.id));

  assert.equal((await api("DELETE", `/accessories/${other.json.id}`)).status, 204);
  const remaining = (await api("GET", "/accessories")).json as Array<{ id: number }>;
  assert.ok(!remaining.some((a) => a.id === other.json.id));
});

test("DI-3: once Default is turned off (or moved), the accessory can be deleted", async () => {
  const a = await api("POST", "/accessories", { type: "distributor", brand: "Guard C", isDefault: true });
  assert.equal((await api("DELETE", `/accessories/${a.json.id}`)).status, 409);
  await api("PATCH", `/accessories/${a.json.id}`, { isDefault: false });
  assert.equal((await api("DELETE", `/accessories/${a.json.id}`)).status, 204);
});

test("DI-3: deleting a missing or invalid accessory id is a clear error, not a silent 204", async () => {
  assert.equal((await api("DELETE", "/accessories/999999")).status, 404);
  assert.equal((await api("DELETE", "/accessories/abc")).status, 400);
});
