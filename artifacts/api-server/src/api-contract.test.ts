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

test("Editing a shot can clear optional fields back to null", () => {
  // Regression guard: editing must be able to send an explicit `null` for a
  // previously-set optional field so the server actually clears it, instead
  // of the field being silently dropped by JSON.stringify(undefined) and
  // leaving a stale Postgres value behind.
  const clearable = {
    machineId: null,
    grinderId: null,
    grindWaste: null,
    topUpGrind: null,
    timeAdj: null,
    overGrindRemoved: null,
    grindAdjusted: null,
    tasteZone: null,
    shotClassification: null,
    beanAchievement: null,
    expressionStyle: null,
    sensoryNotes: null,
    notes: null,
    drinkType: null,
    finishedShot: null,
    isForOthers: null,
    rated: null,
    sourShot: null,
    signatureShot: null,
  };
  const result = UpdateShotBody.safeParse(clearable);
  assert.equal(result.success, true, result.success ? undefined : JSON.stringify(result.error.issues));

  // `isReference` is NOT NULL in the `shots` table (with a default), so the
  // contract must keep rejecting an explicit null for it even though every
  // other flag field above now accepts one.
  assert.equal(UpdateShotBody.safeParse({ isReference: null }).success, false);
  assert.equal(UpdateShotBody.safeParse({ isReference: false }).success, true);
});

test("Log Shot converts cleared optional fields to null only when editing, never on create", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)),
    "utf8",
  );

  assert.match(source, /NULLABLE_ON_EDIT_FIELDS/);
  assert.match(source, /if \(isEditing\) \{[\s\S]{0,300}NULLABLE_ON_EDIT_FIELDS/);
  // isReference is NOT NULL in the DB and must stay out of the nullable list.
  assert.doesNotMatch(source, /NULLABLE_ON_EDIT_FIELDS[\s\S]{0,20}=[\s\S]{0,600}"isReference"/);

  // grindAdjusted isn't a FormValues key (it's set programmatically from the
  // "Record grind change / purge waste" checkbox), so it can't live in
  // NULLABLE_ON_EDIT_FIELDS — it needs its own edit-only null fallback,
  // mirroring the existing overGrindRemoved one-off.
  assert.match(source, /if \(payload\.grindAdjusted === undefined\) payload\.grindAdjusted = null;/);
  // Unchecking the grind-waste event must still delete both keys first
  // (preserving prior grindWaste-clearing behavior) before the edit-only
  // fallback turns the resulting missing grindAdjusted into an explicit null.
  assert.match(source, /delete payload\.grindWaste;\s*\n\s*delete payload\.grindAdjusted;/);
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

test("computeIncludeInAnalysis enforces the single approved eligibility rule with no override path", async () => {
  const { computeIncludeInAnalysis } = await import("./lib/shot-analysis-eligibility");

  // Eligible: Status Good/Dialed In AND Fault Status exactly ["Good"].
  assert.equal(computeIncludeInAnalysis("Good", ["Good"]), true);
  assert.equal(computeIncludeInAnalysis("Dialed In", ["Good"]), true);

  // API create/update must not be able to force `includeInAnalysis: true`
  // when Status/Fault make the shot ineligible — the function itself has no
  // parameter through which a caller could pass a different result, so this
  // is enforced structurally, not just by convention.
  assert.equal(computeIncludeInAnalysis("Needs Work", ["Good"]), false);
  assert.equal(computeIncludeInAnalysis("Good", ["Channeling"]), false);
  assert.equal(computeIncludeInAnalysis("Good", ["Good", "Channeling"]), false);
  assert.equal(computeIncludeInAnalysis("Good", []), false);
  assert.equal(computeIncludeInAnalysis(null, ["Good"]), false);
  assert.equal(computeIncludeInAnalysis(undefined, undefined), false);

  // API create/update must not be able to force `includeInAnalysis: false`
  // when Status/Fault make the shot eligible either — same structural
  // guarantee, and per docs/csv-data-dictionary.md `Include in Analysis` is
  // documented read-only/derived with no approved manual override, so there
  // is no case where a caller-supplied override should win.
  assert.equal(computeIncludeInAnalysis("Good", ["Good"]), true);

  // Sour shots are not excluded by this rule on their own — Sour lives
  // outside Status/Fault Status, so an otherwise-eligible sour shot still
  // computes as included, matching "Sour shots may still be included if
  // Status/Fault criteria are satisfied."
  assert.equal(computeIncludeInAnalysis("Good", ["Good"]), true);
});

test("Shot create/update recompute includeInAnalysis server-side and never trust client input", async () => {
  const source = await readFile(
    fileURLToPath(new URL("./routes/shots.ts", import.meta.url)),
    "utf8",
  );

  assert.match(source, /import \{ eligibleShotConditions \} from "\.\.\/lib\/shot-eligibility";/);
  assert.match(source, /import \{ computeIncludeInAnalysis \} from "\.\.\/lib\/shot-analysis-eligibility";/);

  // POST /shots: must unconditionally overwrite whatever includeInAnalysis
  // the client sent, using only the submitted Status/Fault Status — not
  // gated behind an `if (data.includeInAnalysis === undefined)` check that
  // would let a client-supplied value win.
  const postMatch = source.match(/router\.post\("\/shots", async[\s\S]*?\n\}\);/);
  assert.ok(postMatch, "POST /shots handler not found");
  assert.match(postMatch![0], /data\.includeInAnalysis = computeIncludeInAnalysis\(data\.status, data\.faultStatus\);/);
  assert.doesNotMatch(postMatch![0], /if \(data\.includeInAnalysis/);

  // PATCH /shots/:id: must fetch the existing shot first (so a partial
  // update that omits Status/Fault Status can still be evaluated against
  // the shot's actual current values) and recompute unconditionally from
  // whichever of Status/Fault Status this request is actually changing,
  // merged with the existing row for whichever it isn't.
  const patchMatch = source.match(/router\.patch\("\/shots\/:id", async[\s\S]*?\n\}\);/);
  assert.ok(patchMatch, "PATCH /shots/:id handler not found");
  const patchBody = patchMatch![0];
  assert.match(patchBody, /const existing = await db\.select\(\)\.from\(shotsTable\)\.where\(eq\(shotsTable\.id, id\)\);/);
  assert.match(patchBody, /if \(!existing\[0\]\) \{ res\.status\(404\)\.json\(\{ error: "Shot not found" \}\); return; \}/);
  assert.match(patchBody, /const effectiveStatus = data\.status !== undefined \? data\.status : existing\[0\]\.status;/);
  assert.match(patchBody, /const effectiveFaultStatus = data\.faultStatus !== undefined \? data\.faultStatus : existing\[0\]\.faultStatus;/);
  assert.match(patchBody, /data\.includeInAnalysis = computeIncludeInAnalysis\(effectiveStatus, effectiveFaultStatus\);/);
  assert.doesNotMatch(patchBody, /if \(data\.includeInAnalysis/);

  // Neither handler may filter/hide excluded shots from the response —
  // they still return whatever row was written, included or not.
  assert.doesNotMatch(postMatch![0], /if \(!data\.includeInAnalysis\)/);
  assert.doesNotMatch(patchBody, /if \(!data\.includeInAnalysis\)/);
});

test("Log Shot flag selection suggests Status/Fault Status only when blank, never overwrites", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)),
    "utf8",
  );

  // Flags must only fill in a blank Status/Fault Status — never force-overwrite
  // a value the user already entered.
  assert.match(source, /const setStatusIfBlank = \(status: "Good" \| "Dialed In"\) => \{/);
  assert.equal(source.includes('if (form.getValues("status")) return;'), true);
  assert.match(source, /const setFaultStatusIfBlank = \(fault: "Good"\) => \{/);
  assert.equal(source.includes('if ((form.getValues("faultStatus") ?? []).length > 0) return;'), true);

  // Reference/Signature suggest Dialed In status AND Good fault status; Sour
  // suggests Good status AND Good fault status.
  assert.equal(source.includes('setStatusIfBlank("Dialed In");'), true);
  assert.equal(source.includes('setStatusIfBlank("Good");'), true);
  assert.equal(source.includes('setFaultStatusIfBlank("Good");'), true);

  // Reference Shot's own handler suggests both Status and Fault Status.
  assert.equal(
    source.includes(
      'if (ref) {\n' +
        '                              setStatusIfBlank("Dialed In");\n' +
        '                              setFaultStatusIfBlank("Good");\n' +
        '                              form.setValue("sourShot", false);\n' +
        '                            }',
    ),
    true,
  );

  // Signature Shot's own handler also suggests both Status and Fault Status,
  // and implies Reference Shot (programmatic form.setValue does not trigger
  // Reference Shot's own onCheckedChange, so Signature must apply the same
  // suggestions itself rather than relying on Reference's handler to fire).
  assert.equal(
    source.includes(
      'if (sig) {\n' +
        '                                setStatusIfBlank("Dialed In");\n' +
        '                                setFaultStatusIfBlank("Good");\n' +
        '                                form.setValue("isReference", true);\n' +
        '                                form.setValue("sourShot", false);\n' +
        '                              }',
    ),
    true,
  );
  assert.equal(source.includes('form.setValue("isReference", true);'), true);

  // Selecting Reference or Signature clears Sour; selecting Sour clears both
  // Reference and Signature; deselecting Reference also clears Signature.
  assert.equal(source.includes('form.setValue("sourShot", false);'), true);
  assert.equal(source.includes('form.setValue("isReference", false);'), true);
  assert.equal(source.includes('form.setValue("signatureShot", false);'), true);
  assert.equal(source.includes('if (!ref) form.setValue("signatureShot", false);'), true);

  // Short, mobile-friendly Flags helper text explaining Reference/Signature/Sour.
  assert.match(source, /Reference = benchmark shot/);
  assert.match(source, /Signature = rare, extraordinary/);
  assert.match(source, /Sour = valid if Status\/Fault are Good/);
});

test("Shot Classification excludes flag-duplicate values; Daily Driver lives under Bean Achievement", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/lib/selector-options.ts", import.meta.url)),
    "utf8",
  );

  // Reference Shot, Signature Shot, and Sour Shot are flags, not workflow-type
  // choices; Daily Driver is a Bean Achievement, not a Shot Classification.
  // Scope the check to the shotClassification array body specifically so a
  // match elsewhere in the file can't produce a false pass.
  const shotClassificationMatch = source.match(/shotClassification:\s*\[([\s\S]*?)\]/);
  assert.ok(shotClassificationMatch, "shotClassification list not found in selector-options.ts");
  const shotClassificationBody = shotClassificationMatch![1];
  for (const excluded of ["Sour", "Reference Shot", "Signature Shot", "Daily Driver"]) {
    assert.doesNotMatch(shotClassificationBody, new RegExp(excluded));
  }

  const beanAchievementMatch = source.match(/beanAchievement:\s*\[([\s\S]*?)\]/);
  assert.ok(beanAchievementMatch, "beanAchievement list not found in selector-options.ts");
  assert.match(beanAchievementMatch![1], /Daily Driver/);
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
    "Serving Context",
    "Drink Type",
    "For Others",
    "Not Rated",
    "Did Not Finish",
  ]) {
    assert.match(source, new RegExp(requiredText));
  }
});

test("Shot entry separates serving context from automated analysis eligibility", async () => {
  const [quickLogSource, shotFormSource, settingsSource, selectorSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/QuickLog.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/lib/selector-options.ts", import.meta.url)), "utf8"),
  ]);

  for (const required of [
    "Default Drink Type",
    "defaultDrinkType",
    "Americano",
    "Milk Drink",
    "Guest Drink",
  ]) {
    assert.match(`${settingsSource}\n${selectorSource}`, new RegExp(required));
  }

  for (const required of [
    "Serving Context",
    "Drink Type",
    "For Others",
    "Not Rated",
    "Did Not Finish",
    "body.rated = evalValues.rated",
    "body.isForOthers = evalValues.isForOthers",
    "body.rating = null",
    "body.preferenceRating = null",
    "includeInAnalysis = analysisEligibility.included",
  ]) {
    assert.match(quickLogSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const required of [
    "Serving Context",
    "Drink Type",
    "For Others",
    "Not Rated",
    "Did Not Finish",
    "payload.rating = null",
    "payload.preferenceRating = null",
    "includeInAnalysis: describeAnalysisEligibility",
  ]) {
    assert.match(shotFormSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Shot-level Brew Method is durable evidence, independent of Drink Type", async () => {
  const [schemaSource, migrationSource, migrationRollbackSource, runtimeSchemaSource, openApiSource, selectorSource, settingsSource, shotFormSource, shotDetailSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../../lib/db/src/schema/shots.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/migrations/0010_shot_brew_method.sql", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/migrations/0010_shot_brew_method.down.sql", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./lib/runtime-schema.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/api-spec/openapi.yaml", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/lib/selector-options.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)), "utf8"),
  ]);

  // Schema: a real, separate, nullable column — not reusing drinkType.
  assert.match(schemaSource, /brewMethod: text\("brew_method"\)/);

  // Migration: additive, and the backfill only ever fills a blank value.
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS brew_method text/);
  assert.match(migrationSource, /SET brew_method = 'Espresso'/);
  assert.match(migrationSource, /WHERE brew_method IS NULL/);
  assert.match(migrationRollbackSource, /DROP COLUMN IF EXISTS brew_method/);

  // This repo's live/deployed DB is actually kept in sync by the additive
  // runtime guard (ensureRuntimeSchema), not by running migration files
  // directly — the guard must carry the identical additive+backfill logic.
  assert.match(runtimeSchemaSource, /ADD COLUMN IF NOT EXISTS brew_method text/);
  assert.match(runtimeSchemaSource, /SET brew_method = 'Espresso'/);
  assert.match(runtimeSchemaSource, /WHERE brew_method IS NULL/);

  // OpenAPI: present on both the read shape and the shared write-fields
  // shape (covers both create and update request bodies).
  const shotSchemaBlock = openApiSource.slice(openApiSource.indexOf("    Shot:"), openApiSource.indexOf("    ShotList:"));
  assert.match(shotSchemaBlock, /brewMethod: \{ type: \["string", "null"\]/);
  const shotWriteFieldsBlock = openApiSource.slice(openApiSource.indexOf("    ShotWriteFields:"), openApiSource.indexOf("    ShotInput:"));
  assert.match(shotWriteFieldsBlock, /brewMethod: \{ type: \["string", "null"\] \}/);

  // Generated API types actually picked up the spec change.
  const [shotType, shotWriteFieldsType] = await Promise.all([
    readFile(fileURLToPath(new URL("../../../lib/api-zod/src/generated/types/shot.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/api-zod/src/generated/types/shotWriteFields.ts", import.meta.url)), "utf8"),
  ]);
  assert.match(shotType, /brewMethod\?: string \| null/);
  assert.match(shotWriteFieldsType, /brewMethod\?: string \| null/);

  // Curated options: must exactly match Settings' existing Brew Method
  // options — no invented values — and Settings must source from the same
  // shared list rather than keeping its own separate hardcoded array.
  assert.match(selectorSource, /brewMethod: \["Espresso", "Pour-over", "AeroPress", "French Press", "Moka Pot"\]/);
  assert.match(settingsSource, /options: CURATED_SELECTOR_OPTIONS\.brewMethod/);
  assert.doesNotMatch(settingsSource, /options: \["Espresso", "Pour-over", "AeroPress", "French Press", "Moka Pot"\]/);

  // ShotForm: field exists, is clearable to null on edit, defaults from the
  // selected Machine's own brewMethod when available (only after the
  // machines list has finished loading, avoiding a race with the Settings
  // fallback), else from Settings, and never overwrites a value already set.
  assert.match(shotFormSource, /brewMethod: z\.string\(\)\.optional\(\)/);
  assert.match(shotFormSource, /"drinkType", "brewMethod", "finishedShot"/);
  assert.match(shotFormSource, /brewMethod: existingShot\.brewMethod \?\? undefined/);
  assert.match(shotFormSource, /if \(isEditing \|\| isLoadingMachines\) return;/);
  assert.match(shotFormSource, /if \(form\.getValues\("brewMethod"\)\) return;/);
  assert.match(shotFormSource, /const preferred = relevantMachine\?\.brewMethod \|\| settings\?\.brewMethod;/);
  assert.match(shotFormSource, /name="brewMethod"/);
  assert.match(shotFormSource, /<FormLabel>Brew Method<\/FormLabel>/);

  // User-visible copy (not just code comments) spells out that Brew Method is
  // the extraction method and Drink Type is the served drink, that the Drink
  // Type helper distinguishes the Settings default from a per-shot change, and
  // that an unset default points at Settings rather than hard-coding a drink.
  assert.match(shotFormSource, /How it was extracted \(e\.g\. Espresso\) — separate from Drink Type/);
  assert.match(shotFormSource, /The drink you served \(e\.g\. Americano, Latte, Affogato\) — separate from Brew Method/);
  assert.match(shotFormSource, /field\.value === settings\.defaultDrinkType/);
  assert.match(shotFormSource, /Using your Settings default/);
  assert.match(shotFormSource, /Changed for this shot — your Settings default is/);
  assert.match(shotFormSource, /Set a Default Drink Type in Settings to prefill this on new shots/);
  assert.doesNotMatch(shotFormSource, /form\.setValue\("drinkType", "Americano"\)/);
  // The Drink Type helper distinction is create-only (edit mode shows the saved value plainly).
  assert.match(shotFormSource, /\{!isEditing && \(settings\?\.defaultDrinkType/);

  // Edit mode preserves the saved Drink Type / Brew Method — reset seeds both
  // from existingShot, and both default-fill effects early-return on isEditing.
  assert.match(shotFormSource, /drinkType: existingShot\.drinkType \?\? undefined/);
  assert.match(shotFormSource, /brewMethod: existingShot\.brewMethod \?\? undefined/);
  assert.match(shotFormSource, /if \(isEditing \|\| !settings\?\.defaultDrinkType\) return;/);

  // Settings makes the Brew Method / Drink Type relationship explicit and
  // guides the user when Default Drink Type is unset without implying Americano.
  assert.match(settingsSource, /They are independent fields/);
  assert.match(settingsSource, /How the shot is extracted — e\.g\. Espresso, Pour-over\./);
  assert.match(settingsSource, /there is no universal default/);
  assert.doesNotMatch(settingsSource, /Default Drink Type[^\n]*(?:defaults to|is) Americano/);

  // Independence: changing one must never set the other. The Drink Type
  // default-fill effect must not reference brewMethod, and the Brew Method
  // default-fill effect must not reference drinkType.
  const drinkTypeEffect = shotFormSource.slice(
    shotFormSource.indexOf('if (isEditing || !settings?.defaultDrinkType) return;') - 20,
    shotFormSource.indexOf('}, [settings?.defaultDrinkType, isEditing, form]);'),
  );
  assert.doesNotMatch(drinkTypeEffect, /brewMethod/);
  const brewMethodEffect = shotFormSource.slice(
    shotFormSource.indexOf('if (isEditing || isLoadingMachines) return;') - 20,
    shotFormSource.indexOf('}, [machines, isLoadingMachines, selectedMachineId, settings?.brewMethod, isEditing, form]);'),
  );
  assert.doesNotMatch(brewMethodEffect, /drinkType/);

  // Shot Detail: shown near Extraction Details / Machine, not invented text.
  assert.match(shotDetailSource, /shot\.brewMethod && <DetailItem label="Brew Method" value=\{shot\.brewMethod\} \/>/);
});

test("Drink Type is user-extensible: Affogato is curated and custom values merge without dropping saved shots", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/lib/selector-options.ts", import.meta.url)),
    "utf8",
  );

  assert.match(source, /"Affogato"/);
  assert.match(source, /CUSTOM_DRINK_TYPES_SETTINGS_KEY = "customDrinkTypes"/);

  // parseCustomDrinkTypes: tolerant of missing/malformed settings values, and
  // only accepts real, non-empty strings out of the parsed JSON array.
  assert.match(source, /function parseCustomDrinkTypes/);
  assert.match(source, /JSON\.parse\(raw\)/);
  assert.match(source, /Array\.isArray\(parsed\)/);
  assert.match(source, /typeof value === "string" && value\.trim\(\)\.length > 0/);

  // mergeDrinkTypeOptions: custom values are deduped against curated options,
  // and a selected value that predates both lists (an existing saved shot's
  // drinkType) is preserved by appending it if it's still missing.
  assert.match(source, /function mergeDrinkTypeOptions/);
  assert.match(source, /customDrinkTypes\.filter\(\(value\) => value && !curated\.includes\(value\)\)/);
  assert.match(source, /selectedValue && !merged\.includes\(selectedValue\) \? \[\.\.\.merged, selectedValue\] : merged/);

  assert.match(source, /function drinkTypeOptionsFromSettings/);
});

test("Settings lets users add custom Drink Types and pick a Default Drink Type; Quick Log stays shelved", async () => {
  const [settingsSource, shotFormSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
  ]);

  for (const required of [
    "Default Drink Type",
    "Add Drink Type",
    "DrinkTypeDefaultField",
    "CUSTOM_DRINK_TYPES_SETTINGS_KEY",
    "parseCustomDrinkTypes",
    "mergeDrinkTypeOptions",
    "addCustomDrinkType",
  ]) {
    assert.match(settingsSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(shotFormSource, /drinkTypeOptionsFromSettings/);

  // Settings must not reintroduce the shelved Quick Log preferences UI while
  // wiring up drink type controls.
  assert.doesNotMatch(settingsSource, /LoggingPreferencesSection/);
  assert.doesNotMatch(settingsSource, /Choose which fields appear in Quick Log/);
});

test("Drink Type never forces Not Rated; For Others may suggest it but stays overridable", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)),
    "utf8",
  );

  // Regression guard: Drink Type selection must be a plain field update with
  // no side effect on `rated`. The removed `setDrinkType` helper used to set
  // rated=false whenever drinkType differed from the Default Drink Type.
  assert.doesNotMatch(source, /setDrinkType/);
  assert.match(source, /name="drinkType"[\s\S]{0,400}onChange=\{field\.onChange\}/);

  // For Others is the only control allowed to suggest Not Rated.
  assert.match(source, /if \(forOthers\) form\.setValue\("rated", false\)/);

  // The Not Rated checkbox remains its own independent, always-editable
  // field, so a user can still rate a For Others shot if they tasted it.
  assert.match(source, /name="rated"[\s\S]{0,300}onCheckedChange=\{\(checked\) => field\.onChange\(checked === true \? false : true\)\}/);
});

test("Shot Detail groups serving-context fields and shows them only when meaningful", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)),
    "utf8",
  );

  assert.match(source, /const hasServingContext =/);
  assert.match(source, /shot\.rated === false/);
  assert.match(source, /shot\.finishedShot === false/);
  assert.match(source, /shot\.isForOthers === true/);
  assert.match(source, /\{hasServingContext && \(/);
  assert.match(source, /Serving Context/);
  assert.match(source, /label="Not Rated" value="Yes"/);
  assert.match(source, /label="Did Not Finish" value="Yes"/);
  assert.match(source, /label="For Others" value="Yes"/);
});

test("Shot Detail shows Sour Shot and hides blank Shot Classification/Bean Achievement/Expression Style/Taste Zone", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)),
    "utf8",
  );

  // Sour Shot must display as clearly as Reference/Signature, which it did not before.
  assert.equal(source.includes("{shot.sourShot && ("), true);
  assert.match(source, /Sour Shot/);

  // These four fields must not render blank/dash noise when unset.
  assert.equal(source.includes('{(shot.shotClassification?.length ?? 0) > 0 && <DetailItem label="Shot Classification"'), true);
  assert.equal(source.includes('{(shot.beanAchievement?.length ?? 0) > 0 && <DetailItem label="Bean Achievement"'), true);
  assert.equal(source.includes('{(shot.expressionStyle?.length ?? 0) > 0 && <DetailItem label="Expression Style"'), true);
  assert.equal(source.includes('{(shot.tasteZone || shot.zone) && <DetailItem label="Taste Zone"'), true);

  // Grind/waste workflow evidence stays visually separate from extraction data.
  assert.match(source, /const hasGrinderWorkflowEvent =/);
  assert.match(source, /\{hasGrinderWorkflowEvent && \(/);
  assert.match(source, /Grinder \/ Workflow Event/);
});

test("Machine/profile-level drink defaults are documented as deferred, not implemented", async () => {
  const [checklistSource, dictionarySource, equipmentSchemaSource, shotFormSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../../docs/implementation/release-candidate-checklist.md", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../docs/csv-data-dictionary.md", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/src/schema/equipment.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
  ]);

  assert.match(checklistSource, /Machine-level and grinder\/profile-level drink type defaults[\s\S]{0,200}are shelved for now/);
  assert.match(dictionarySource, /Machine\/profile-level drink type defaults[\s\S]{0,200}are deferred/);

  // The schema must not have grown a machine-level default drink type field.
  assert.doesNotMatch(equipmentSchemaSource, /default_drink_type|defaultDrinkType/);

  // Log Shot has a machine/grinder selector (wired to shots.machineId/grinderId),
  // which unblocks this feature, but selecting equipment must not itself apply
  // a drink-type default — that remains deferred.
  assert.match(shotFormSource, /machineId/);
  assert.match(shotFormSource, /grinderId/);
  assert.doesNotMatch(shotFormSource, /machine(Id)?[\s\S]{0,120}defaultDrinkType|grinder(Id)?[\s\S]{0,120}defaultDrinkType/i);
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

test("Best Shot recipe exposes repeatability fields and hides default dose noise", async () => {
  const [routeSource, dashboardSource] = await Promise.all([
    readFile(fileURLToPath(new URL("./routes/dashboard.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Dashboard.tsx", import.meta.url)), "utf8"),
  ]);

  for (const required of [
    "targetDose: activeBagRow.defaultDose ?? 18",
    "initialGrindWeight: bestShot.initialGrindWeight",
    "overGrindRemoved: bestShot.overGrindRemoved",
    "topUpGrind: bestShot.topUpGrind",
    "grindTime: bestShot.grindTime",
    "pourDelay: bestShot.pourDelay",
    "flowTime: bestShot.flowTime",
  ]) {
    assert.match(routeSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(dashboardSource, /function BestShotRecipeCard/);
  assert.match(dashboardSource, /Repeat this shot/);
  assert.match(dashboardSource, /Dose Detail:/);
  assert.match(dashboardSource, /Math\.abs\(shot\.dose - targetDose\) >= 0\.05/);
});

test("weighted score is calculated from ratings and settings, not uploaded as source data", async () => {
  const [helperSource, settingsSource, dashboardSource, beanRouteSource, bagRouteSource, openApiSource] = await Promise.all([
    readFile(fileURLToPath(new URL("./lib/rating-weighting.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/dashboard.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/beans.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/bags.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/api-spec/openapi.yaml", import.meta.url)), "utf8"),
  ]);

  assert.match(helperSource, /weightedShotScore/);
  assert.match(helperSource, /preferenceRating/);
  assert.match(helperSource, /preference = preferenceRating/);
  assert.match(settingsSource, /Personal Score Weighting/);
  assert.match(settingsSource, /ratingTechnicalWeight/);
  assert.match(settingsSource, /ratingPreferenceWeight/);
  assert.match(dashboardSource, /weightedScore/);
  assert.match(beanRouteSource, /weightedScore/);
  assert.match(bagRouteSource, /weightedScore/);
  assert.doesNotMatch(openApiSource.match(/ShotWriteFields:[\s\S]*?ShotInput:/)?.[0] ?? "", /weightedScore/);
  assert.doesNotMatch(openApiSource.match(/ShotWriteFields:[\s\S]*?ShotInput:/)?.[0] ?? "", /avgWeightedRating/);
});

test("equipment entry offers reviewable suggested setup details", async () => {
  const [librarySource, equipmentSource, accessoriesSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/lib/equipment-suggestions.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Equipment.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Accessories.tsx", import.meta.url)), "utf8"),
  ]);

  assert.match(librarySource, /BSE suggested — review before saving/);
  assert.match(librarySource, /User-confirmed/);
  assert.match(librarySource, /Eureka Mignon Magnifico/);
  assert.match(librarySource, /shortLabel/);
  assert.match(librarySource, /sourceUrl/);
  assert.match(librarySource, /B0C6HNPYBQ/);
  assert.match(librarySource, /B0B46VFT8P/);
  assert.match(librarySource, /B0CQY78HV6/);
  assert.match(librarySource, /B0DP9ZCHCD/);
  assert.match(librarySource, /B0CM5XDGFR/);
  assert.match(librarySource, /B09S3PWHBY/);
  assert.match(librarySource, /Profitec Go/);
  assert.match(librarySource, /Normcore Spring-Loaded Tamper/);
  assert.match(librarySource, /Normcore 58\.5mm Puck Screen Set/);
  assert.match(librarySource, /Maestri House Mini Espresso Scale/);
  assert.match(librarySource, /Bamynoir WDT Distribution Tool/);
  assert.match(librarySource, /MATOW Magnetic Dosing Funnel/);
  assert.match(librarySource, /Dosing Cup/);
  assert.match(librarySource, /68\.7g/);
  assert.match(equipmentSource, /Suggested Equipment Details/);
  assert.match(equipmentSource, /Product Link Or ASIN/);
  assert.match(equipmentSource, /Product Link Or Model Evidence/);
  assert.match(equipmentSource, /Review before saving/);
  assert.match(equipmentSource, /admin-verified/);
  assert.match(accessoriesSource, /Suggested Accessory Details/);
  assert.match(accessoriesSource, /Product Link Or ASIN/);
  assert.match(accessoriesSource, /admin-verified/);
  assert.match(accessoriesSource, /15 lb/);
  assert.match(accessoriesSource, /25 lb/);
  assert.match(accessoriesSource, /30 lb/);
});

test("large setup dialogs stay scrollable inside small windows", async () => {
  const [equipmentSource, accessoriesSource, bagsSource, tasteSelectorsSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Equipment.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Accessories.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/TasteSelectors.tsx", import.meta.url)), "utf8"),
  ]);

  for (const source of [equipmentSource, accessoriesSource, bagsSource, tasteSelectorsSource]) {
    assert.match(source, /max-h-\[90vh\]/);
    assert.match(source, /overflow-y-auto/);
  }
});

test("Start Hopper Phase uses only approved phase labels via the existing Hopper API", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  // Only the approved, launch-documented phase labels may be offered.
  assert.match(source, /HOPPER_PHASE_OPTIONS = \["Phase 1", "Phase 2", "Phase 3", "End of Bag", "Single Bag Phase", "Custom"\]/);
  assert.doesNotMatch(source, /Grinder Cleanout/);

  // Custom must require a custom label or notes explaining it.
  assert.match(source, /phase === "Custom" && !customLabel && !notes/);

  // Must reuse the existing POST /api/hoppers endpoint (no new schema/API),
  // always as a new active row, so the server's existing transactional
  // "deactivate the bag's other active hopper" logic applies.
  assert.match(source, /fetch\("\/api\/hoppers"/);
  assert.match(source, /isActive: true/);

  // Documented hopper name format: Bag #{bagNumber} — {phase} — {YYYY-MM-DD}.
  assert.match(source, /`Bag #\$\{startPhaseBag\.bagNumber \?\? startPhaseBag\.id\} — \$\{phase\} — \$\{todayDate\(\)\}`/);

  // Non-blocking warning when more than one bag is active; no hard single-active-bag rule.
  assert.match(source, /activeBags\.length > 1/);
  assert.doesNotMatch(source, /disabled=\{[^}]*activeBags\.length > 1/);

  // Must explain phases are measured windows, not total physical inventory,
  // and that unmeasured leftovers may be intentionally ignored.
  assert.match(source, /measured operating window/);
  assert.match(source, /intentionally.*left out/);
});

test("Start Hopper Phase prefill, status cues, and closeout copy are launch-safe", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  // Starting Beans is only prefilled when this bag has never had a hopper
  // phase before (no way to know true depletion once a phase exists) and
  // the bag's own recorded weight is known — never a computed/guessed value.
  assert.match(source, /isFirstPhaseForBag = !hoppers\.some\(\(h\) => h\.bagId === bag\.id\)/);
  assert.match(source, /const prefill = isFirstPhaseForBag && bag\.bagWeight != null/);
  assert.match(source, /startingBeans: prefill \? String\(bag\.bagWeight\) : ""/);

  // A gentle, non-blocking cue must exist for an active bag with no active
  // hopper phase, and it must not be a disabled/blocking control.
  assert.match(source, /No active hopper phase — start one/);
  assert.doesNotMatch(source, /No active hopper phase[\s\S]{0,200}disabled/);

  // Closeout copy must cover all four required points without adding fields.
  assert.match(source, /marks it inactive as of the closed-out date/);
  assert.match(source, /reconciliation evidence only/);
  assert.match(source, /Closeout notes are saved/);
  assert.match(source, /not yet tracked as their own lifecycle events/);

  // BagRow's action area must wrap instead of forcing a single cramped row on mobile.
  assert.match(source, /flex flex-col sm:flex-row sm:items-start justify-between gap-4/);
  assert.match(source, /flex flex-wrap items-center gap-3 shrink-0/);
});

test("Bag closeout makes measured-vs-unmeasured leftover explicit and guides toward the next bag", async () => {
  const [bagsPageSource, bagsRouteSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/bags.ts", import.meta.url)), "utf8"),
  ]);

  // The user must be able to explicitly say leftover mass was measured vs
  // intentionally skipped, not just leave a number blank (ambiguous).
  assert.match(bagsPageSource, /leftoverMeasured/);
  assert.match(bagsPageSource, /I measured it/);
  assert.match(bagsPageSource, /Not measured — intentionally skipped/);
  assert.match(bagsPageSource, /intentionally not measured at closeout/);

  // An explicit "unmeasured" choice must clear any stale prior estimate
  // (send null), not just omit the field.
  assert.match(bagsPageSource, /if \(!measured\) body\.remainingEstimate = null;/);

  // Regression guard: PATCH /api/bags must distinguish an explicit null
  // (clear) from an omitted field (leave untouched) for remainingEstimate,
  // the same class of bug fixed for shots in an earlier session — otherwise
  // the client's explicit-clear-on-unmeasured behavior above would silently
  // no-op against a stale database value.
  assert.match(bagsRouteSource, /remainingEstimate: body\.remainingEstimate === null \? null : body\.remainingEstimate != null \? Number\(body\.remainingEstimate\) : undefined/);

  // Closeout/cleanout notes field must explicitly invite purge/cleanout evidence.
  assert.match(bagsPageSource, /Closeout \/ Cleanout Notes/);
  assert.match(bagsPageSource, /grinder purge, hopper emptying, or machine cleaning/);

  // Must guide the user toward the next bag/hopper phase after closing.
  assert.match(bagsPageSource, /Next: create or select your new bag, then use Start Hopper Phase/);

  // Previous (inactive) bags must show a reconciled-remaining figure when
  // present, without cluttering active bags.
  assert.match(bagsPageSource, /!bag\.isActive && bag\.remainingEstimate != null && <span>Reconciled remaining: \{bag\.remainingEstimate\}g<\/span>/);
});

test("Change Bag guided flow reuses existing endpoints and never forces hopper phase creation", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  // Trigger action must exist near the active bag section, and its label
  // adapts to whether a bag is currently active.
  assert.match(source, /\{activeBags\.length > 0 \? "Change Bag" : "Start New Bag"\}/);

  // Must reuse only existing endpoints — no new backend routes invented.
  assert.match(source, /fetch\("\/api\/beans", \{/);
  assert.match(source, /fetch\("\/api\/bags", \{/);
  assert.match(source, /fetch\(`\/api\/bags\/\$\{form\.bagToCloseId\}`, \{/);
  assert.match(source, /fetch\("\/api\/hoppers", \{/);

  // Only the approved phase labels may be offered, same as the standalone
  // Start Hopper Phase dialog (shared HOPPER_PHASE_OPTIONS constant).
  assert.match(source, /HOPPER_PHASE_OPTIONS\.map\(\(p\) => <SelectItem key=\{p\} value=\{p\}>\{p\}<\/SelectItem>\)/g);
  assert.doesNotMatch(source, /Grinder Cleanout/);

  // Starting a hopper phase must be optional (a Switch the user can turn
  // off), not a forced/required step of the flow.
  assert.match(source, /Start the first hopper phase now/);
  assert.match(source, /checked=\{form\.startPhase\} onCheckedChange=\{\(v\) => set\("startPhase", v\)\}/);
  assert.match(source, /never required to finish changing bags/);

  // No local hopper-percentage/formula calculation — starting beans is
  // passed straight through as the raw entered/blank value, nothing derived.
  assert.doesNotMatch(source, /hopperPercent\s*=/);
  assert.doesNotMatch(source, /hopperMass\s*=/);

  // Measured-vs-unmeasured leftover choice and cleanout-notes-are-evidence
  // copy must both be present in the guided flow, not only the standalone
  // closeout dialog.
  assert.match(source, /rounded-lg border p-3">\s*\n\s*<div className="flex items-center justify-between">\s*\n\s*<Label className="font-normal">Close out the old bag now<\/Label>/);
  assert.match(source, /Purge, cleanout, and maintenance notes are text evidence only for now/);
  assert.match(source, /not expected to know the exact leftover amount/);

  // Mobile-friendly, scrollable dialog per the existing pattern.
  assert.match(source, /<DialogContent className="max-w-lg max-h-\[90vh\] overflow-y-auto">/);

  // Submission order must create the new bag before closing the old one, so
  // a failure never leaves the user with zero active bags.
  const beanStepIndex = source.indexOf('fetch("/api/beans", {');
  const bagStepIndex = source.indexOf('fetch("/api/bags", {');
  const closeStepIndex = source.indexOf("fetch(`/api/bags/${form.bagToCloseId}`, {");
  assert.ok(beanStepIndex > 0 && bagStepIndex > beanStepIndex && closeStepIndex > bagStepIndex, "expected bean -> new bag -> close-old order in ChangeBagDialog's mutationFn");
});

test("Change Bag suggests the next Bag Number and clearly labels Roast Date", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  // Suggestion is derived only from purely-numeric existing bag numbers
  // ("7" -> 8), never invents a starting number, and never overwrites a
  // manual edit: it seeds the initial form value once (in blank()) rather
  // than being applied by an effect that could re-fire after the user types.
  assert.match(source, /function suggestNextBagNumber\(bags: Bag\[\]\): string \{/);
  assert.match(source, /\/\^\\d\+\$\/\.test\(n\)/);
  assert.match(source, /numeric\.length > 0 \? String\(Math\.max\(\.\.\.numeric\) \+ 1\) : ""/);
  assert.match(source, /bagNumber: suggestNextBagNumber\(allBags\)/);
  assert.doesNotMatch(source, /useEffect\([^)]*setForm[^)]*bagNumber[^)]*suggestNextBagNumber/s);

  // The full bags list (not just the active bag) must reach the dialog, and
  // ChangeBagDialog's own props type must require it.
  assert.match(source, /allBags=\{bags\}/);
  assert.match(source, /allBags: Bag\[\];/);

  // Graceful fallback + explanation when no numeric bag numbers exist yet,
  // vs. an explicit statement of what was suggested when they do.
  assert.match(source, /Bag Number suggested as \$\{suggestedBagNumber\}/);
  assert.match(source, /No previous numeric bag numbers found, so nothing was suggested/);

  // Roast Date must now have an explicit, unambiguous Label distinguishing
  // it from Purchase Date and Opened Date — not just an input placeholder.
  assert.match(source, /<Label className="text-xs font-normal text-muted-foreground">Roast Date <span className="text-muted-foreground\/70">\(or estimated\)<\/span><\/Label>/);
  assert.match(source, /Roast Date is when the beans were roasted \(exact or your best estimate\) — not Purchase Date \(when bought, not collected here\)\. Opened Date is set automatically to today when this bag is created\./);

  // Roast Date Confidence already exists on the Bag schema (used elsewhere
  // in this same file's full Edit form) and is small/safe enough to surface
  // here too — no new schema, reuses the existing ROAST_DATE_CONFIDENCE list.
  assert.match(source, /roastDateConfidence: ""/);
  assert.match(source, /if \(form\.roastDateConfidence\) bagBody\.roastDateConfidence = form\.roastDateConfidence;/);
  const changeBagDialogSource = source.slice(source.indexOf("function ChangeBagDialog("));
  assert.match(changeBagDialogSource, /ROAST_DATE_CONFIDENCE\.map\(\(v\) => <SelectItem key=\{v\} value=\{v\}>\{v\}<\/SelectItem>\)/);

  // Deliberately excluded from this compact flow (available via full Edit
  // later): free-text roast-date detail is more than a quick-create flow
  // warrants, and this task's boundaries forbid new schema regardless.
  assert.doesNotMatch(changeBagDialogSource, /freshnessDatingMethod/);
  assert.doesNotMatch(changeBagDialogSource, /estimatedRoastWindow/);

  // The Change Bag helper copy should point to Dating Method via Edit
  // without adding a field to this compact flow (prose only, no identifier).
  assert.match(source, /Add Freshness Dating Method \(how you derived the Roast Date, e\.g\. Best-Before Minus One Year\) and more detail anytime from Edit\./);
});

test("Freshness Dating Method is a curated selector that preserves historical free text", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  // No new schema/formula: reuses the existing freshnessDatingMethod column
  // as a curated set of user-facing options, exactly as requested — no
  // values invented beyond what was specified.
  assert.match(
    source,
    /const FRESHNESS_DATING_METHOD_OPTIONS = \[\s*"Exact Roast Date",\s*"Best-Before Minus One Year",\s*"Roaster \/ Staff Confirmed",\s*"Printed Bag Code",\s*"Unknown",\s*"Other",\s*\];/,
  );

  // Freshness Dating Method must now be a curated Select (not a free-text
  // Input) in the full Edit Bag form, matching the existing Roast Date
  // Confidence Select pattern already used elsewhere in this same form.
  assert.match(
    source,
    /<Select value=\{form\.freshnessDatingMethod \|\| "__none__"\} onValueChange=\{\(v\) => set\("freshnessDatingMethod", v === "__none__" \? "" : v\)\}>/,
  );
  assert.match(source, /\{freshnessDatingMethodOptions\.map\(\(v\) => <SelectItem key=\{v\} value=\{v\}>\{v\}<\/SelectItem>\)\}/);

  // A historical value that predates this curated list (confirmed live on
  // the real dev DB's De Luca's bag: free text, not one of the six curated
  // options) must stay selectable rather than becoming invisible.
  assert.match(
    source,
    /const freshnessDatingMethodOptions = form\.freshnessDatingMethod && !FRESHNESS_DATING_METHOD_OPTIONS\.includes\(form\.freshnessDatingMethod\)\s*\n\s*\? \[\.\.\.FRESHNESS_DATING_METHOD_OPTIONS, form\.freshnessDatingMethod\]\s*\n\s*: FRESHNESS_DATING_METHOD_OPTIONS;/,
  );

  // Roast Date exact-vs-estimated, Dating Method, and Confidence must be
  // explained together, with the concrete, owner-verified De Luca's example
  // (Best-Before month/year ~1 year after roast/packing; high confidence for
  // the month, lower for the exact day unless confirmed).
  assert.match(source, /Roast Date can be exact or your best estimate\. Freshness Dating Method records how you derived it/);
  assert.match(source, /De Luca's own Best-Before month\/year appears to be about one year after the roast\/packing month/);
  assert.match(source, /pick "Best-Before Minus One Year" and set Roast Date Confidence to Estimated High for the month/);
  assert.match(source, /If Dating Method is "Other", describe it in Roast Date Notes below\./);

  // No new formula: this is a manual selection/explanation, never a
  // computed roast-date-from-best-before-date assignment.
  assert.doesNotMatch(source, /estimatedRoastDate\s*=.*-\s*1|roastDate\s*=.*bestBefore/i);
});

test("ChangeBagDialog refreshes cached queries on partial failure, not just on success", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  // Regression guard: a partial failure (e.g. bean + bag created, hopper
  // phase step then fails) leaves real data in the database that must show
  // up in the UI immediately, not only after a manual reload. Scope the
  // check to the onError block specifically so a match in onSuccess can't
  // produce a false pass.
  const onErrorMatch = source.match(/onError: \(e\) => \{([\s\S]*?)\},\s*\n\s*\}\);\s*\n\s*\n\s*return \(\s*\n\s*<Dialog/);
  assert.ok(onErrorMatch, "ChangeBagDialog's changeBagMutation onError block not found");
  const onErrorBody = onErrorMatch![1];
  for (const key of ['["bags"]', '["beans"]', "getListHoppersQueryKey()", '["intelligence"]', '["dashboard-intelligence"]']) {
    assert.ok(
      onErrorBody.includes(`qc.invalidateQueries({ queryKey: ${key} })`),
      `expected onError to invalidate ${key}, same as onSuccess`,
    );
  }
});

test("Hopper API supports delete and clears bagId/startingBeans/phase/notes on explicit null", async () => {
  const [routeSource, hopperUpdateSource] = await Promise.all([
    readFile(fileURLToPath(new URL("./routes/hopper.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/api-zod/src/generated/types/hopperUpdate.ts", import.meta.url)), "utf8"),
  ]);

  // DELETE /hoppers/:id must exist, mirroring bags.ts's DELETE /bags/:id
  // pattern, and 404 when the row doesn't exist (bags.ts's own DELETE does
  // not 404 — this route intentionally does, per its own spec).
  assert.match(routeSource, /router\.delete\("\/hoppers\/:id", async \(req, res\): Promise<void> => \{/);
  assert.match(routeSource, /const \[row\] = await db\.delete\(hoppersTable\)\.where\(eq\(hoppersTable\.id, id\)\)\.returning\(\);/);

  // PATCH must distinguish explicit null (clear) from omitted (undefined,
  // leave untouched) for every nullable hopper field — the same bug class
  // already fixed for bags.ts's remainingEstimate.
  assert.match(routeSource, /const bagId = body\.bagId === null \? null : body\.bagId != null \? Number\(body\.bagId\) : undefined;/);
  assert.match(routeSource, /startingBeans: body\.startingBeans === null \? null : body\.startingBeans != null \? Number\(body\.startingBeans\) : undefined,/);
  assert.match(routeSource, /phase: body\.phase === null \? null : \(body\.phase as string \| undefined\),/);
  assert.match(routeSource, /notes: body\.notes === null \? null : \(body\.notes as string \| undefined\),/);

  // The API contract itself must accept null for phase/notes (bagId and
  // startingBeans already did) — otherwise the route fix above is unreachable,
  // the same trap found with shots'/bags' contracts in earlier sessions.
  assert.match(hopperUpdateSource, /phase\?: string \| null;/);
  assert.match(hopperUpdateSource, /notes\?: string \| null;/);
});

test("Bags page exposes launch-safe bag lifecycle workflow", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  for (const requiredText of [
    "Bag Lifecycle Flow",
    "Close / Reconcile Old Bag",
    "Record Maintenance Or Purge Waste",
    "Create Or Select Bean",
    "Create New Active Bag",
    "Fill / Reset Hopper Phase",
    "Dial In Before Stable Logging",
    "Dedicated lifecycle events",
  ]) {
    assert.match(source, new RegExp(requiredText));
  }
});

test("Bags page distinguishes the guided Change Bag flow from per-row actions, and warns before a second active bag", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)),
    "utf8",
  );

  // Launch-QA finding: two independent review passes flagged that nothing
  // explained when to use "Change Bag" vs. the per-row Close/Start Phase
  // buttons. The Bag Lifecycle Flow card's intro copy must say so.
  assert.match(source, /runs this whole flow in one guided dialog/);

  // The Add\/Edit Bag dialog's own "Active Bag" switch could silently create
  // a second active bag with zero warning, unlike Start Hopper Phase and
  // Change Bag which already warn about this. Must reuse the same pattern
  // (AlertTriangle, amber styling, excludes the bag currently being edited).
  assert.match(source, /activeBags\.filter\(\(b\) => b\.id !== editing\?\.id\)\.length > 0/);
  assert.match(source, /also marked active/);
  assert.match(source, /the "Change Bag" button on this[\s\S]{0,30}page handles closing the old bag/);
});

test("Settings equipment defaults use saved equipment and accessory selectors", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)),
    "utf8",
  );

  for (const requiredText of [
    "fetchGrinders",
    "fetchMachines",
    "fetchAccessories",
    "EquipmentDefaultsSection",
    "GrinderDefaultsSection",
    "Choose from equipment and active accessories",
    "Default Grinder",
    "Typed legacy values remain selectable",
    "stockBasketOptions",
    "specValues",
    "Add Machine",
    "Add Grinder",
    "Add Basket",
    "Add Scale",
    "Add Tamper",
    "Add Puck Screen",
    "defaultRegularGrinder",
    "defaultGrinder",
    "defaultBasketSize",
  ]) {
    assert.match(source, new RegExp(requiredText));
  }
});

test("Settings no longer offers controls that nothing in the app reads", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)),
    "utf8",
  );

  // Confirmed via repo-wide search (launch-readiness-audit.md, Critical
  // Blocker #4) that none of these keys are read anywhere outside this
  // file. Removed rather than left implying functionality that doesn't
  // exist. grindStepIncrement/usePuckScreen/temperatureUnit here refer to
  // the removed *global Settings* keys specifically — the real, wired
  // per-grinder grindStepIncrement (Equipment.tsx) and per-bag
  // usePuckScreen (Dashboard.tsx) are unrelated and must remain untouched.
  for (const removedKey of [
    '"ratingSystem"',
    '"ratingInputMode"',
    '"unitSystem"',
    '"timeFormat"',
    '"temperatureUnit"',
    '"defaultBrewRatio"',
    '"usePuckScreen"',
    '"hopperTracking"',
    '"defaultHopperFullness"',
    '"grindTimeIncrement"',
    '"grindScaleMin"',
    '"grindScaleMax"',
    '"grindStepIncrement"',
  ]) {
    assert.doesNotMatch(source, new RegExp(removedKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  // grindMinTime is real (read by ShotForm.tsx) and must remain.
  assert.match(source, /"grindMinTime"/);

  // grindTimerMode is kept but must be visibly labeled as not yet wired to
  // anything, rather than silently implying it does something.
  assert.match(source, /"grindTimerMode"/);
  assert.match(source, /Not yet used elsewhere in the app/);
});

test("Grinder records support adjustment style and precision metadata", async () => {
  const [schemaSource, migrationSource, routeSource, equipmentSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../../lib/db/src/schema/equipment.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/migrations/0005_grinder_adjustment_model.sql", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/equipment.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Equipment.tsx", import.meta.url)), "utf8"),
  ]);

  for (const requiredText of [
    "adjustmentType",
    "grindSettingPrecision",
    "grindStepIncrement",
  ]) {
    assert.match(schemaSource, new RegExp(requiredText));
    assert.match(routeSource, new RegExp(requiredText));
    assert.match(equipmentSource, new RegExp(requiredText));
  }

  for (const requiredText of [
    "adjustment_type",
    "grind_setting_precision",
    "grind_step_increment",
  ]) {
    assert.match(migrationSource, new RegExp(requiredText));
  }

  assert.match(equipmentSource, /Stepless grinders can be recorded to two decimals/);
  assert.match(equipmentSource, /Approximate spacing between visible grinder marks/);
});

test("Machine records can provide stock basket defaults", async () => {
  const [schemaSource, migrationSource, routeSource, equipmentSource, settingsSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../../lib/db/src/schema/equipment.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/migrations/0006_machine_stock_basket.sql", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/equipment.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Equipment.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)), "utf8"),
  ]);

  for (const source of [schemaSource, routeSource, equipmentSource, settingsSource]) {
    assert.match(source, /stockBasket/);
  }

  assert.match(migrationSource, /stock_basket/);
  assert.match(equipmentSource, /Stock Basket/);
  assert.match(settingsSource, /stockBasketOptions/);
});

test("Equipment and accessories preserve personal short labels and source evidence separately from full names", async () => {
  const [equipmentSchema, accessorySchema, equipmentRoute, accessoryRoute, equipmentPage, accessoriesPage, dashboardRoute, shortLabelMigrationSource, sourceUrlMigrationSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../../lib/db/src/schema/equipment.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/src/schema/accessories.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/equipment.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/accessories.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Equipment.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Accessories.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./routes/dashboard.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/migrations/0007_equipment_short_labels.sql", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../lib/db/migrations/0008_equipment_source_urls.sql", import.meta.url)), "utf8"),
  ]);

  for (const source of [equipmentSchema, accessorySchema, equipmentRoute, accessoryRoute, equipmentPage, accessoriesPage]) {
    assert.match(source, /shortLabel/);
    assert.match(source, /sourceUrl/);
  }

  assert.match(equipmentSchema, /short_label/);
  assert.match(equipmentSchema, /source_url/);
  assert.match(accessorySchema, /short_label/);
  assert.match(accessorySchema, /source_url/);
  assert.match(shortLabelMigrationSource, /short_label/);
  assert.match(sourceUrlMigrationSource, /source_url/);
  assert.match(equipmentPage, /Short Label/);
  assert.match(accessoriesPage, /Short Label/);
  assert.match(dashboardRoute, /function compactLabel/);
  assert.match(dashboardRoute, /function compactPuckScreenLabel/);
  assert.match(dashboardRoute, /Full name remains the system\/library identity|shortLabel/);
});

test("Dashboard summarizes puck screen display by useful thickness only", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Dashboard.tsx", import.meta.url)),
    "utf8",
  );

  assert.match(source, /function formatPuckScreenSummary/);
  assert.match(source, /thickness:/);
  assert.match(source, /Puck Screen/);
  assert.doesNotMatch(source, /Puck screen\{bag\.puckScreen/);
});

test("Dashboard explains blank hopper mass/percent/shots-left instead of hiding them silently", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Dashboard.tsx", import.meta.url)),
    "utf8",
  );

  // Regression guard for launch-readiness-audit.md High-Priority Fix #7: a
  // hopper phase started through the app's own dialogs has startingBeans but
  // never hopperMass/hopperPercent/shotsLeftEstimate (those are imported/
  // computed-elsewhere values, never written by POST /api/hoppers). Blindly
  // hiding the fields when null reads as broken, not as "not yet tracked."
  for (const label of ["Hopper mass", "Hopper %", "Shots left (est.)"]) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      source,
      new RegExp(`label="${escapedLabel}" value="Not tracked yet"`),
      `expected a "Not tracked yet" fallback for ${label}`,
    );
  }
  assert.match(source, /Imported value — not set for phases started in the app/);

  // Must not invent a hopper mass/percentage formula to fill the gap.
  assert.doesNotMatch(source, /hopperMass\s*=.*hopperPercent\s*\*/);
  assert.doesNotMatch(source, /hopperPercent\s*=.*startingBeans/);
});

test("Active Hopper Status is compact for phase-only hoppers, not a large standalone panel", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/Dashboard.tsx", import.meta.url)),
    "utf8",
  );

  // A hopper only counts as having "real phase-level calculations" once one
  // of these three fields is populated; a phase started purely through the
  // app's own dialogs has only phase/startingBeans and must not get the full
  // standalone card treatment.
  assert.match(
    source,
    /const detailedHoppers = activeHoppers\.filter\(\s*\(h\) => h\.hopperMass != null \|\| h\.hopperPercent != null \|\| h\.shotsLeftEstimate != null,\s*\);/,
  );
  assert.match(
    source,
    /const compactHoppers = activeHoppers\.filter\(\s*\(h\) => h\.hopperMass == null && h\.hopperPercent == null && h\.shotsLeftEstimate == null,\s*\);/,
  );

  // The compact line lives near Current Baseline (inside the same Card as
  // the bag identity/recipe/equipment lines), not in a separate section.
  assert.match(source, /Line 4: compact hopper phase context/);
  // Phase-only hoppers never have a null-collapsing gap: a missing phase
  // falls back to "Hopper phase tracking active" rather than rendering
  // nothing, and startingBeans is labeled as a measured baseline.
  assert.equal(source.includes('hopper.phase ? `Hopper phase: ${hopper.phase}` : "Hopper phase tracking active",'), true);
  assert.equal(source.includes('hopper.startingBeans != null ? `measured baseline ${hopper.startingBeans}g` : null,'), true);
  // The compact line must state, in words, that it is NOT whole-bag inventory.
  assert.equal(source.includes('"separate from whole-bag Bag Progress",'), true);

  // The full "Active Hopper Status" section only renders once a hopper has
  // real calculations, and only maps over detailedHoppers (not all active
  // hoppers) — no big empty/dashed placeholder card for the no-bag or
  // no-active-hopper cases anymore.
  assert.match(source, /detailedHoppers\.length > 0 && \(/);
  assert.match(source, /\{detailedHoppers\.map\(\(hopper\) => \(/);
  assert.doesNotMatch(source, /No active bag set — hopper status is shown per active bag/);
  assert.doesNotMatch(source, /No active hopper linked to this bag/);

  // Must not invent phase-remaining/consumed/shots-left calculations.
  assert.doesNotMatch(source, /phaseRemaining\s*=/);
  assert.doesNotMatch(source, /phaseConsumed\s*=/);
});

test("Dashboard and Bags copy separates whole-bag inventory from hopper phase baseline", async () => {
  const [dashboardSource, bagsSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Dashboard.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Bags.tsx", import.meta.url)), "utf8"),
  ]);

  // User concern: "Bag Progress shows whole-bag consumed/remaining" vs "Hopper
  // phase shows phase-level starting beans only" must not be visually or
  // verbally confused. Both Dashboard section labels carry an explicit scope,
  // and Bag Progress states in words that a hopper phase baseline is separate
  // and not subtracted from it.
  assert.match(dashboardSource, /<SectionLabel scope="Whole-bag inventory">Bag Progress<\/SectionLabel>/);
  assert.match(dashboardSource, /<SectionLabel scope="Current hopper phase">Active Hopper Status<\/SectionLabel>/);
  assert.match(dashboardSource, /Whole-bag consumed and remaining\. A hopper phase baseline is a separate measured window and is not subtracted here\./);

  // Product rules (docs/table-relationships.md line ~74): Single Bag Phase =
  // whole bag as one tracked phase; End of Bag = final leftover phase, not a
  // fixed quantity. These meanings must be surfaced in the UI, not just docs.
  assert.match(bagsSource, /Treats the whole bag as one tracked phase — use it when you won't split this bag into separate hopper loads\./);
  assert.match(bagsSource, /The final leftover phase after earlier measured phases are used up — not a fixed amount of its own\./);
  assert.match(bagsSource, /The Dashboard's Bag Progress still tracks whole-bag\s+consumed and remaining separately from this phase baseline\./);

  // The guided flows must each state, in a plain sentence, what the action
  // does — not leave a new user to infer it from the form fields.
  assert.match(bagsSource, /Close Out Bag records that you have stopped using this bag/);
  assert.match(bagsSource, /Change Bag walks the whole switch in one pass/);

  // Maintenance copy must always describe a FUTURE separate workflow, never
  // imply one exists today.
  assert.match(bagsSource, /a dedicated maintenance workflow with calm, non-blocking reminders is planned separately/i);
  assert.match(bagsSource, /not yet tracked as their own lifecycle events/);
  assert.doesNotMatch(bagsSource, /maintenance reminders? (are|is) now (available|enabled|tracked)/i);
});

test("Runtime startup applies additive equipment schema guards", async () => {
  const [indexSource, runtimeSchemaSource] = await Promise.all([
    readFile(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("./lib/runtime-schema.ts", import.meta.url)), "utf8"),
  ]);

  assert.match(indexSource, /ensureRuntimeSchema/);

  for (const requiredText of [
    "ADD COLUMN IF NOT EXISTS short_label",
    "ADD COLUMN IF NOT EXISTS source_url",
    "ADD COLUMN IF NOT EXISTS adjustment_type",
    "ADD COLUMN IF NOT EXISTS grind_setting_precision",
    "ADD COLUMN IF NOT EXISTS grind_step_increment",
    "ADD COLUMN IF NOT EXISTS stock_basket",
  ]) {
    assert.match(runtimeSchemaSource, new RegExp(requiredText));
  }
});

test("Mobile shell exposes setup and system navigation", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/components/layout/Shell.tsx", import.meta.url)),
    "utf8",
  );

  for (const requiredText of [
    "mobileMoreNav",
    "mobileBottomNav",
    "Swipeable mobile navigation",
    "overflow-x-auto",
    "snap-x",
    "Setup &amp; System",
    "Open setup menu",
    "/equipment",
    "/accessories",
    "/taste-selectors",
    "/settings",
  ]) {
    assert.match(source, new RegExp(requiredText));
  }
});

test("Mobile bottom nav signals it scrolls and marks the active tab without relying on color alone", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/components/layout/Shell.tsx", import.meta.url)),
    "utf8",
  );

  // A right-edge fade mask on the scrollable nav — the nav already included
  // Settings and already scrolled correctly, but nothing signaled that it
  // scrolled, which is what actually made Settings undiscoverable on phone.
  assert.match(source, /mask-image:linear-gradient\(to_right,black_85%,transparent_100%\)/);

  // Active tab must be distinguishable without relying on color alone:
  // a shape cue (underline bar) and a label-weight cue (bold vs medium).
  assert.match(source, /isActive && <span aria-hidden="true"[\s\S]{0,80}bg-primary/);
  assert.match(source, /isActive \? "text-primary font-semibold" : "text-muted-foreground font-medium/);
});

test("Primary logging UI uses the full shot form and keeps Quick Log shelved", async () => {
  const [shellSource, quickSource, formSource, settingsSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/components/layout/Shell.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/QuickLog.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/Settings.tsx", import.meta.url)), "utf8"),
  ]);

  assert.match(shellSource, /Log Shot/);
  assert.doesNotMatch(shellSource, /href="\/shots\/quick"/);
  assert.doesNotMatch(settingsSource, /LoggingPreferencesSection/);
  assert.doesNotMatch(settingsSource, /Choose which fields appear in Quick Log/);
  assert.doesNotMatch(shellSource, /Full Log Form/);
  assert.match(quickSource, /Fast shot entry/);
  assert.match(quickSource, /best while brewing/);
  // Naming consistency: the primary logging page's own H1 must say "Log Shot"
  // — the same name every nav entry point (Shell, Dashboard) already uses —
  // not "Detailed Log", which only ever existed as this page's internal H1
  // and never matched what any button/nav item said to get there.
  assert.match(formSource, /\{isEditing \? "Edit Shot" : "Log Shot"\}/);
  assert.doesNotMatch(formSource, /Detailed Log/);
  assert.match(formSource, /Complete shot record/);
  assert.match(formSource, /review, tasting notes, and advanced details/);
});

test("/shots/quick is hard-blocked (redirects), not just unlinked from navigation", async () => {
  const appSource = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/App.tsx", import.meta.url)),
    "utf8",
  );

  // Regression guard: being absent from nav (already covered by the test
  // above) is not the same as the route itself being blocked. A stray
  // bookmark, old shared link, or guessed URL must not still land a user on
  // the shelved Quick Log form — it must redirect to the primary Log Shot
  // workflow instead.
  assert.match(appSource, /<Route path="\/shots\/quick">/);
  assert.match(appSource, /<Redirect to="\/shots\/new" \/>/);

  // The old route must not render QuickLog anymore, and QuickLog must not
  // even be imported into App.tsx — if it were still imported, that alone
  // would be a strong signal something re-wired it back onto a live route.
  assert.doesNotMatch(appSource, /component=\{QuickLog\}/);
  assert.doesNotMatch(appSource, /from "@\/pages\/QuickLog"/);

  // QuickLog.tsx itself must still exist on disk (not deleted) — the
  // project rule is routing/copy cleanup over destructive removal, and nothing
  // else in the repo should assume the file is gone.
  await readFile(fileURLToPath(new URL("../../coffee-log/src/pages/QuickLog.tsx", import.meta.url)), "utf8");
});

test("Shot form supports editing, active-bag-first entry, and Taste Zone selection", async () => {
  const [appSource, formSource, detailSource, selectorSource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/App.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../coffee-log/src/lib/selector-options.ts", import.meta.url)), "utf8"),
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

  // New-shot Bag default: exactly one active bag preselects; multiple active
  // bags never silently guess (visible cue instead); edit and manual choices
  // are never overridden (create-only effect, guarded by a run-once ref).
  assert.match(formSource, /const didAutoSelectBag = useRef\(false\)/);
  assert.match(formSource, /if \(isEditing \|\| didAutoSelectBag\.current\) return;/);
  assert.match(formSource, /const active = bags\.filter\(\(b\) => b\.isActive\);/);
  assert.match(formSource, /if \(active\.length === 1\) form\.setValue\("bagId", active\[0\]\.id\);/);
  assert.match(formSource, /!isEditing && !activeBagId && activeBags\.length > 1 &&/);
  assert.match(formSource, /Multiple bags are active/);

  // Bag auto-fill applies once per distinct selection so a background bags
  // refetch can't re-clobber edits made after the bag was chosen.
  assert.match(formSource, /const appliedBagDefaultsFor = useRef<number \| null>\(null\)/);
  assert.match(formSource, /if \(appliedBagDefaultsFor\.current === bagId\) return;/);
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
  assert.match(selectorSource, /const INCLUDED_STATUSES = new Set\(\["Good", "Dialed In"\]\)/);
  assert.match(selectorSource, /Shot Status must be Good or Dialed In/);
  assert.doesNotMatch(selectorSource, /"Pretty Good"/);
  assert.match(formSource, /setSelectedTastes\(existingTasteSelectors\.map\(\(selector\) => selector\.id\)\)/);
  assert.match(formSource, /setShowAdvancedEvaluation\(hasAdvancedEvaluation\)/);
  assert.match(formSource, /data\.id && \(isEditing \|\| selectedTastes\.length > 0\)/);
});

test("Expression Style is a true multi-select chip control, unlike the intentionally single-select fields", async () => {
  const [formSource, dictionarySource] = await Promise.all([
    readFile(fileURLToPath(new URL("../../coffee-log/src/pages/ShotForm.tsx", import.meta.url)), "utf8"),
    readFile(fileURLToPath(new URL("../../../docs/csv-data-dictionary.md", import.meta.url)), "utf8"),
  ]);

  // docs/csv-data-dictionary.md documents Expression Style as plain "Multi
  // Select" / "chips" with no single-choice curation note, unlike Fault
  // Status / Bean Achievement / Shot Classification (each explicitly
  // "curated as single-choice ... in app"). The UI must match that.
  assert.match(dictionarySource, /\| Expression Style \| Multi Select \| E \| chips \|/);
  assert.match(dictionarySource, /Fault Status \| Multi Select historically; curated as single-choice/);
  assert.match(dictionarySource, /Bean Achievement \| Multi Select historically; curated as single-choice/);
  assert.match(dictionarySource, /Shot Classification \| Multi Select historically; curated as single-choice/);

  // Expression Style renders through the true multi-select chip toggle...
  assert.match(formSource, /function ChipMultiSelect/);
  assert.match(
    formSource,
    /name="expressionStyle" render=\{\(\{ field \}\) => \([\s\S]{0,400}<ChipMultiSelect/,
  );
  assert.match(formSource, /value=\{field\.value \?\? \[\]\}\s*\n\s*onChange=\{field\.onChange\}/);

  // ...and its options are no longer truncated to the first selected value.
  assert.doesNotMatch(formSource, /curatedOptions\("expressionStyle", form\.watch\("expressionStyle"\)\?\.slice\(0, 1\)/);

  // Bean Achievement and Shot Classification remain single-select dropdowns
  // — this fix must not touch either of them.
  assert.match(
    formSource,
    /name="beanAchievement" render=\{\(\{ field \}\) => \([\s\S]{0,200}<ScalarSelect/,
  );
  assert.match(
    formSource,
    /name="shotClassification" render=\{\(\{ field \}\) => \([\s\S]{0,200}<ScalarSelect/,
  );
});

test("Shot Detail displays zero ratings instead of treating them as blank", async () => {
  const detailSource = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)),
    "utf8",
  );

  assert.match(detailSource, /shot\.rating != null \? shot\.rating : "-"/);
  assert.doesNotMatch(detailSource, /shot\.rating \|\| "-"/);
  assert.match(detailSource, /shot\.preferenceRating != null \? shot\.preferenceRating : "—"/);
});

test("Shot Detail never renders the literal word null for unrecorded extraction fields", async () => {
  const detailSource = await readFile(
    fileURLToPath(new URL("../../coffee-log/src/pages/ShotDetail.tsx", import.meta.url)),
    "utf8",
  );

  // Regression guard: dose/yield/pourTime are nullable columns (real, live
  // shots — e.g. grinder-cleanout/workflow-event entries with status
  // "Grinder Setup" — regularly have all three null). Rendering
  // `${shot.dose}g` unconditionally literally prints "nullg" to the user.
  assert.match(detailSource, /shot\.dose != null \? `\$\{shot\.dose\}g` : "-"/);
  assert.match(detailSource, /shot\.yield != null \? `\$\{shot\.yield\}g` : "-"/);
  assert.match(detailSource, /shot\.pourTime != null \? `\$\{shot\.pourTime\}s` : "-"/);
  assert.doesNotMatch(detailSource, /value=\{`\$\{shot\.dose\}g`\}/);
  assert.doesNotMatch(detailSource, /value=\{`\$\{shot\.yield\}g`\}/);
  assert.doesNotMatch(detailSource, /value=\{`\$\{shot\.pourTime\}s`\}/);
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
