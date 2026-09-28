import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

type G = { grindSettingPrecision?: number | null; grindStepIncrement?: number | null } | null | undefined;
const helperUrl = new URL("../../coffee-log/src/lib/grind-step.ts", import.meta.url).href;
const g = (await import(helperUrl)) as {
  grindStepFor: (grinder?: G) => number;
  grindDecimalsFor: (grinder?: G) => number;
  roundGrindSetting: (value: number, grinder?: G) => number;
  describeGrindStep: (grinder?: G, label?: string) => string;
};

test("GRD-1: step comes from marker spacing, then precision, then the historical 0.01", () => {
  assert.equal(g.grindStepFor({ grindStepIncrement: 0.25, grindSettingPrecision: 2 }), 0.25);
  assert.equal(g.grindStepFor({ grindSettingPrecision: 1 }), 0.1);
  assert.equal(g.grindStepFor({ grindSettingPrecision: 0 }), 1);
  assert.equal(g.grindStepFor({ grindSettingPrecision: 2 }), 0.01);
  assert.equal(g.grindStepFor({ grindStepIncrement: 0, grindSettingPrecision: null }), 0.01);
  assert.equal(g.grindStepFor({ grindSettingPrecision: 7 }), 0.01, "out-of-range precision is ignored");
  assert.equal(g.grindStepFor(null), 0.01);
});

test("GRD-1: stepper output is rounded to the grinder's precision without float noise", () => {
  assert.equal(g.grindDecimalsFor({ grindSettingPrecision: 2 }), 2);
  assert.equal(g.grindDecimalsFor({ grindStepIncrement: 0.25, grindSettingPrecision: 1 }), 2, "never coarser than the step");
  assert.equal(g.roundGrindSetting(2.33 + 0.01, { grindSettingPrecision: 2 }), 2.34);
  assert.equal(g.roundGrindSetting(0.1 + 0.2, { grindSettingPrecision: 1 }), 0.3);
  assert.equal(g.roundGrindSetting(2.3300000001, null), 2.33);
});

test("GRD-1: Log Shot wires the stepper to the selected grinder and explains it", async () => {
  const form = await readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8");
  assert.doesNotMatch(form, /name="grindSetting"[\s\S]{0,200}step=\{0\.01\}/);
  assert.match(form, /<NumberStepper field=\{field\} step=\{grindStep\} decimals=\{grindDecimals\}/);
  assert.match(form, /const grindStep = grindStepFor\(selectedGrinder\);/);
  assert.doesNotMatch(form, /don't drive this yet/);
  assert.match(g.describeGrindStep({ grindSettingPrecision: 2 }, "Eureka"), /Eureka's precision from Equipment/);
});
