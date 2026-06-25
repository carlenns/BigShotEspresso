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
} from "@workspace/api-zod";
import { toShotApi } from "./lib/api-shapes";

test("generated request validators match required runtime fields", () => {
  assert.equal(CreateShotBody.safeParse({}).success, false);
  const shot = CreateShotBody.parse({ shotDate: "2026-06-25T03:30:00.000Z" });
  assert.equal(shot.includeInAnalysis, true);

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
