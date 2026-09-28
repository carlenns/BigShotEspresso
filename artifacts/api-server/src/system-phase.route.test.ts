import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { api, stopServer } from "./test-support/http";
import { ensureRuntimeSchema } from "./lib/runtime-schema";

after(stopServer);

const helperUrl = new URL("../../coffee-log/src/lib/system-phases.ts", import.meta.url).href;
type Label = { number: number; name: string };
const phases = (await import(helperUrl)) as {
  DEFAULT_SYSTEM_PHASE_LABELS: Label[];
  parseSystemPhaseLabels: (raw?: string | null) => Label[];
  parseCurrentSystemPhase: (raw?: string | null) => number | null;
  formatSystemPhase: (labels: Label[], phase?: number | null) => string;
};

const APPROVED = [
  { number: 1, name: "Initial Setup" },
  { number: 2, name: "Scientific Process / Baseline" },
  { number: 3, name: "Timed Dose Optimization" },
  { number: 4, name: "Active Experimentation Era" },
];

test("System Phase labels are the owner-approved list, and phase 3 is the default", () => {
  assert.deepEqual(phases.DEFAULT_SYSTEM_PHASE_LABELS, APPROVED);
  assert.equal(phases.parseCurrentSystemPhase(undefined), 3);
  assert.equal(phases.parseCurrentSystemPhase("none"), null);
  assert.equal(phases.parseCurrentSystemPhase("2"), 2);
  assert.deepEqual(phases.parseSystemPhaseLabels("not json"), APPROVED);
  assert.deepEqual(
    phases.parseSystemPhaseLabels('[{"number":2,"name":" B "},{"number":1,"name":"A"},{"number":2,"name":"dup"},{"number":0,"name":"bad"}]'),
    [{ number: 1, name: "A" }, { number: 2, name: "B" }],
  );
  assert.equal(phases.formatSystemPhase(APPROVED, 3), "Phase 3 — Timed Dose Optimization");
  assert.equal(phases.formatSystemPhase(APPROVED, 9), "Phase 9");
});

test("Server seeds the saved System Phase labels and current phase without overwriting edits", async () => {
  const first = await api("GET", "/settings");
  assert.deepEqual(JSON.parse(first.json.systemPhaseLabels), APPROVED);
  assert.equal(first.json.currentSystemPhase, "3");

  const edited = [...APPROVED.slice(0, 3), { number: 4, name: "Hopper Overfill Era" }];
  await api("PUT", "/settings", { systemPhaseLabels: JSON.stringify(edited), currentSystemPhase: "4" });
  await ensureRuntimeSchema(); // simulate the next deploy/boot
  const after = await api("GET", "/settings");
  assert.deepEqual(JSON.parse(after.json.systemPhaseLabels), edited);
  assert.equal(after.json.currentSystemPhase, "4");

  const migration = await readFile(
    fileURLToPath(new URL("../../../lib/db/migrations/0015_system_phase_labels.sql", import.meta.url)),
    "utf8",
  );
  assert.match(migration, /ON CONFLICT \(key\) DO NOTHING/);
});

test("Log Shot uses a System Phase dropdown seeded from Settings on new shots only", async () => {
  const form = await readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8");
  assert.match(form, /if \(isEditing \|\| settings === undefined \|\| appliedSystemPhaseDefault\.current\) return;/);
  assert.match(form, /parseCurrentSystemPhase\(settings\.currentSystemPhase\)/);
  assert.match(form, /if \(phase == null \|\| form\.getValues\("systemPhase"\) != null\) return;/);
  assert.match(form, /<SelectTrigger aria-label="System Phase">/);
  const settings = await readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)), "utf8");
  assert.match(settings, /<SystemPhasesSection values=\{values\} set=\{set\} \/>/);
});
