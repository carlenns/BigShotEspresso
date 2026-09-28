import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { api, stopServer } from "./test-support/http";

after(stopServer);

test("S3: a hopper phase can be edited and ended through PATCH, and the record is kept", async () => {
  const bag = await api("POST", "/bags", { bagName: "Hopper Test Bag", isActive: true });
  assert.equal(bag.status, 201);
  const started = await api("POST", "/hoppers", { name: `Bag #${bag.json.id} — Phase 1 — test`, bagId: bag.json.id, isActive: true, phase: "Phase 1", startingBeans: 250 });
  assert.equal(started.status, 201, JSON.stringify(started.json));

  const edited = await api("PATCH", `/hoppers/${started.json.id}`, { startingBeans: 240.5, notes: "weighed after purge" });
  assert.equal(edited.status, 200);
  assert.equal(edited.json.startingBeans, 240.5);
  assert.equal(edited.json.notes, "weighed after purge");
  assert.equal(edited.json.isActive, true, "editing does not end the phase");

  const cleared = await api("PATCH", `/hoppers/${started.json.id}`, { startingBeans: null, notes: null });
  assert.equal(cleared.json.startingBeans ?? null, null, "explicit null clears the baseline");

  const ended = await api("PATCH", `/hoppers/${started.json.id}`, { isActive: false });
  assert.equal(ended.status, 200);
  assert.equal(ended.json.isActive, false);

  const list = await api("GET", "/hoppers");
  const row = list.json.find((h: { id: number }) => h.id === started.json.id);
  assert.ok(row, "ended phase is still listed as history");
  assert.equal(row.isActive, false);
  assert.equal(row.phase, "Phase 1");
});

test("S3: Bags UI edits/ends via the generated PATCH hook and never deletes a hopper", async () => {
  const bags = await readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)), "utf8");
  assert.match(bags, /const updateHopper = useUpdateHopper\(\);/);
  assert.match(bags, /\.\.\.\(end \? \{ isActive: false \} : \{\}\)/);
  assert.match(bags, /nothing is deleted/);
  assert.doesNotMatch(bags, /useDeleteHopper|method: "DELETE"[\s\S]{0,80}hoppers|\/api\/hoppers\/\$\{[^}]+\}`,\s*\{\s*method: "DELETE"/);
});
