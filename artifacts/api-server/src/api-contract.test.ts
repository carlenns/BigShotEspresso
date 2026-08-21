import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CreateHopperBody,
  CreateHopperRangeBaselineBody,
  CreateShotBody,
  ImportHopperRangeBaselinesCsvBody,
  ImportHoppersCsvBody,
  UpdateHopperBody,
  UpdateShotBody,
} from "@workspace/api-zod";
import { toShotApi } from "./lib/api-shapes";
import { getCoffeeLogAirtableConfig } from "./lib/airtable-config";

test("generated request validators match required runtime fields", () => {
  assert.equal(CreateShotBody.safeParse({}).success, false);
  const shot = CreateShotBody.parse({ shotDate: "2026-06-25T03:30:00.000Z" });
  assert.equal(shot.includeInAnalysis, true);
  assert.equal(CreateShotBody.safeParse({ shotDate: "2026-06-25T03:30:00.000Z", ratio: "2.00", preferenceRating: 11 }).success, true);
  assert.equal(UpdateShotBody.safeParse({ ratio: "2.00", preferenceRating: 11 }).success, true);

  assert.equal(CreateHopperBody.safeParse({}).success, false);
  assert.equal(CreateHopperBody.safeParse({ name: "Phase 1" }).success, true);
  assert.equal(UpdateHopperBody.safeParse({ notes: "updated" }).success, true);

  assert.equal(CreateHopperRangeBaselineBody.safeParse({}).success, false);
  assert.equal(
    CreateHopperRangeBaselineBody.safeParse({ hopperRange: "75–100%" }).success,
    true,
  );
  assert.equal(ImportHoppersCsvBody.safeParse({ csvText: "Name\nPhase 1" }).success, true);
  assert.equal(
    ImportHopperRangeBaselinesCsvBody.safeParse({ csvText: "Hopper Range\n75–100%" }).success,
    true,
  );
});

test("Shot route enforces rating, ratio, and signature/reference invariants", async () => {
  const source = await readFile(
    fileURLToPath(new URL("./routes/shots.ts", import.meta.url)),
    "utf8",
  );

  assert.match(source, /function calculatedRatio/);
  assert.equal(source.includes("Number(output) / Number(dose)"), true);
  assert.equal(source.includes("normalized.signatureShot === true"), true);
  assert.equal(source.includes("normalized.isReference = true"), true);
  assert.match(source, /Technical rating cannot exceed 10/);
  assert.match(source, /Preference rating cannot exceed 11/);
});

test("Shot detail exposes evaluation fields that affect interpretation", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)),
    "utf8",
  );

  for (const requiredText of [
    "Preference Rating",
    "Signature Shot",
    "Reference Shot",
    "Fault Status",
    "Shot Classification",
    "Bean Achievement",
    "Expression Style",
    "Taste Zone",
    "Include in Analysis",
  ]) {
    assert.match(source, new RegExp(requiredText));
  }
});

test("Today's Coffee Brief uses active-bag performance windows only", async () => {
  const source = await readFile(
    fileURLToPath(new URL("./routes/dashboard.ts", import.meta.url)),
    "utf8",
  );

  assert.match(source, /bestYieldWindow: bestYieldRange/);
  assert.match(source, /bestPourDelayWindow: bestPourDelayRange/);
  assert.doesNotMatch(source, /bestYieldWindow: timingWindows\.yieldRange/);
  assert.doesNotMatch(source, /bestPourDelayWindow: timingWindows\.pourDelayRange/);
});

test("Shot form supports editing, active-bag-first entry, and Taste Zone selection", async () => {
  const [appSource, formSource, detailSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/App.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)), "utf8"),
  ]);

  assert.match(appSource, /path="\/shots\/:id\/edit"/);
  assert.match(detailSource, /href=\{`\/shots\/\$\{id\}\/edit`\}/);
  assert.match(formSource, /useUpdateShot/);
  assert.match(formSource, /function ScalarSelect/);
  assert.match(formSource, /tasteZoneOptions/);
  assert.match(formSource, /FormLabel>Taste Zone/);
  assert.match(formSource, /FormLabel>Shot Status/);
  assert.match(formSource, /FormLabel>Fault Status/);
  assert.match(formSource, /FormLabel>Expression Style/);
  assert.match(formSource, /FormLabel>Bean Achievement/);
  assert.match(formSource, /FormLabel>Shot Classification/);
  assert.match(formSource, /const activeBags = bags\.filter\(\(b\) => b\.isActive\)/);
  assert.match(formSource, /const visibleBags = showPreviousBags \? bags : activeBags/);
  assert.match(formSource, /Show previous bags/);
  assert.match(formSource, /fetchShotTasteSelectors/);
  assert.match(formSource, /const NO_TASTE_SELECTORS: TasteSelector\[\] = \[\]/);
  assert.match(formSource, /const savedStatus = existingShot\.status \?\? ""/);
  assert.match(formSource, /const savedTasteZone = existingShot\.tasteZone \?\? ""/);
  assert.match(formSource, /form\.setValue\("status", savedStatus\)/);
  assert.match(formSource, /form\.setValue\("tasteZone", savedTasteZone\)/);
  assert.match(formSource, /<ScalarSelect/);
  assert.match(formSource, /onChange=\{\(value\) => field\.onChange\(value \? \[value\] : \[\]\)\}/);
  assert.doesNotMatch(formSource, /SelectValue placeholder="Select/);
  assert.doesNotMatch(formSource, /import \{ ChipSelector \}/);
  assert.match(formSource, /setSelectedTastes\(existingTasteSelectors\.map\(\(selector\) => selector\.id\)\)/);
  assert.match(formSource, /setShowAdvancedEvaluation\(hasAdvancedEvaluation\)/);
  assert.match(formSource, /data\.id && \(isEditing \|\| selectedTastes\.length > 0\)/);
});

test("API response shaping excludes internal evidence fields", () => {
  const response = toShotApi({
    id: 1,
    shotDate: "2026-06-25T03:30:00.000Z",
    isReference: false,
    airtableRecordId: "rec1",
    rawRow: { Date: "source" },
    importFingerprint: "fingerprint",
    createdAt: new Date("2026-06-25T03:30:00.000Z"),
  } as never);

  assert.equal("airtableRecordId" in response, false);
  assert.equal("rawRow" in response, false);
  assert.equal("importFingerprint" in response, false);
});

test("Hopper routes use generated request validators", async () => {
  const source = await readFile(
    fileURLToPath(new URL("./routes/hopper.ts", import.meta.url)),
    "utf8",
  );

  for (const validator of [
    "CreateHopperBody.safeParse",
    "UpdateHopperBody.safeParse",
    "ImportHoppersCsvBody.safeParse",
    "CreateHopperRangeBaselineBody.safeParse",
    "ImportHopperRangeBaselinesCsvBody.safeParse",
  ]) {
    assert.match(source, new RegExp(validator.replace(".", "\\.")));
  }
});

test("Coffee Log Airtable env lookup prefers app-specific names with legacy fallback", () => {
  const original = {
    coffeeToken: process.env.COFFEELOG_AIRTABLE_API_KEY,
    coffeeBaseId: process.env.COFFEELOG_AIRTABLE_BASE_ID,
    legacyToken: process.env.AIRTABLE_API_KEY,
    legacyBaseId: process.env.AIRTABLE_BASE_ID,
  };

  try {
    delete process.env.COFFEELOG_AIRTABLE_API_KEY;
    delete process.env.COFFEELOG_AIRTABLE_BASE_ID;
    delete process.env.AIRTABLE_API_KEY;
    delete process.env.AIRTABLE_BASE_ID;

    process.env.COFFEELOG_AIRTABLE_API_KEY = "ct";
    process.env.COFFEELOG_AIRTABLE_BASE_ID = "cb";
    assert.deepEqual(getCoffeeLogAirtableConfig(), {
      token: "ct",
      baseId: "cb",
      hasToken: true,
      hasBaseId: true,
    });

    delete process.env.COFFEELOG_AIRTABLE_API_KEY;
    delete process.env.COFFEELOG_AIRTABLE_BASE_ID;
    process.env.AIRTABLE_API_KEY = "lt";
    process.env.AIRTABLE_BASE_ID = "lb";
    assert.deepEqual(getCoffeeLogAirtableConfig(), {
      token: "lt",
      baseId: "lb",
      hasToken: true,
      hasBaseId: true,
    });

    process.env.COFFEELOG_AIRTABLE_API_KEY = "ct";
    process.env.COFFEELOG_AIRTABLE_BASE_ID = "cb";
    assert.deepEqual(getCoffeeLogAirtableConfig(), {
      token: "ct",
      baseId: "cb",
      hasToken: true,
      hasBaseId: true,
    });
  } finally {
    setOptionalEnv("COFFEELOG_AIRTABLE_API_KEY", original.coffeeToken);
    setOptionalEnv("COFFEELOG_AIRTABLE_BASE_ID", original.coffeeBaseId);
    setOptionalEnv("AIRTABLE_API_KEY", original.legacyToken);
    setOptionalEnv("AIRTABLE_BASE_ID", original.legacyBaseId);
  }
});

function setOptionalEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
