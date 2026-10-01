import assert from "node:assert/strict";
import { after, test } from "node:test";
import { api, stopServer } from "./test-support/http";

after(stopServer);

test("creating a bean needs a name, defaults to active, and can be read back", async () => {
  assert.equal((await api("POST", "/beans", {})).status, 400);
  assert.equal((await api("POST", "/beans", { name: "   " })).status, 400);

  const created = await api("POST", "/beans", { name: "Route Test Bean", origin: "Ethiopia", roaster: "Test Roasters" });
  assert.equal(created.status, 201);
  assert.equal(created.json.isActive, true);
  assert.equal(created.json.origin, "Ethiopia");

  const read = await api("GET", `/beans/${created.json.id}`);
  assert.equal(read.status, 200);
  assert.equal(read.json.name, "Route Test Bean");
  const list = (await api("GET", "/beans")).json as Array<{ id: number }>;
  assert.ok(list.some((b) => b.id === created.json.id));
});

test("a bean can be created inactive", async () => {
  const created = await api("POST", "/beans", { name: "Inactive Route Bean", isActive: false });
  assert.equal(created.json.isActive, false);
});

test("PATCH changes only the fields sent", async () => {
  const created = await api("POST", "/beans", { name: "Patch Bean", origin: "Kenya", roaster: "Original Roaster" });
  const patched = await api("PATCH", `/beans/${created.json.id}`, { roaster: "New Roaster" });
  assert.equal(patched.status, 200);
  assert.equal(patched.json.roaster, "New Roaster");
  assert.equal(patched.json.origin, "Kenya");
  assert.equal(patched.json.name, "Patch Bean");
  const deactivated = await api("PATCH", `/beans/${created.json.id}`, { isActive: false });
  assert.equal(deactivated.json.isActive, false);
  assert.equal(deactivated.json.roaster, "New Roaster");
});

test("missing and invalid bean ids are clear errors", async () => {
  assert.equal((await api("GET", "/beans/999999")).status, 404);
  assert.equal((await api("GET", "/beans/abc")).status, 400);
  assert.equal((await api("PATCH", "/beans/999999", { notes: "x" })).status, 404);
  assert.equal((await api("PATCH", "/beans/abc", { notes: "x" })).status, 400);
  assert.equal((await api("DELETE", "/beans/999999")).status, 404);
  assert.equal((await api("DELETE", "/beans/abc")).status, 400);
});

test("a bean used by bags can't be deleted, and the message counts them; a free bean can be", async () => {
  const bean = await api("POST", "/beans", { name: "Used Bean" });
  await api("POST", "/bags", { bagName: "Used Bag 1", beanId: bean.json.id, isActive: false });
  const refused = await api("DELETE", `/beans/${bean.json.id}`);
  assert.equal(refused.status, 409);
  assert.match(refused.json.error, /1 bag uses this bean/);

  await api("POST", "/bags", { bagName: "Used Bag 2", beanId: bean.json.id, isActive: false });
  const refusedTwo = await api("DELETE", `/beans/${bean.json.id}`);
  assert.match(refusedTwo.json.error, /2 bags use this bean/);
  assert.equal((await api("GET", `/beans/${bean.json.id}`)).status, 200);

  const free = await api("POST", "/beans", { name: "Free Bean" });
  assert.equal((await api("DELETE", `/beans/${free.json.id}`)).status, 204);
  assert.equal((await api("GET", `/beans/${free.json.id}`)).status, 404);
});
