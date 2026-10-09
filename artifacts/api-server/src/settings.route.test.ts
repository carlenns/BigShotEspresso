import assert from "node:assert/strict";
import { after, test } from "node:test";
import { api, stopServer } from "./test-support/http";

after(stopServer);

test("PUT /settings inserts new keys, updates existing ones, and leaves other keys alone", async () => {
  await api("PUT", "/settings", { rtA: "1", rtB: "keep" });
  await api("PUT", "/settings", { rtA: "2", rtC: "new" });
  const all = (await api("GET", "/settings")).json;
  assert.equal(all.rtA, "2");
  assert.equal(all.rtB, "keep");
  assert.equal(all.rtC, "new");
});

test("PUT /settings stores every value as a string", async () => {
  await api("PUT", "/settings", { rtNum: 18.5, rtBool: false });
  const all = (await api("GET", "/settings")).json;
  assert.equal(all.rtNum, "18.5");
  assert.equal(all.rtBool, "false");
});

test("PUT /settings with an empty object succeeds and changes nothing", async () => {
  await api("PUT", "/settings", { rtKeep: "same" });
  const res = await api("PUT", "/settings", {});
  assert.equal(res.status, 200);
  assert.equal((await api("GET", "/settings")).json.rtKeep, "same");
});

test("DELETE /settings/:key removes that key only, and deleting a missing key is harmless", async () => {
  await api("PUT", "/settings", { rtGone: "x", rtStay: "y" });
  assert.equal((await api("DELETE", "/settings/rtGone")).status, 200);
  const all = (await api("GET", "/settings")).json;
  assert.equal("rtGone" in all, false);
  assert.equal(all.rtStay, "y");
  assert.equal((await api("DELETE", "/settings/never-existed")).status, 200);
});
