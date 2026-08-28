import assert from "node:assert/strict";
import { test } from "node:test";

import { selectComparisonReferences } from "./lib/dashboard-comparison";

// Fixture shot — only the fields selectComparisonReferences and its callers read.
interface Shot {
  id: number;
  bagId: number;
  isReference: boolean | null;
  rating: number | null;
  includeInAnalysis: boolean;
  shotDate: string;
}

const shot = (over: Partial<Shot> & { id: number }): Shot => ({
  bagId: 1,
  isReference: false,
  rating: null,
  includeInAnalysis: true,
  shotDate: `2026-06-${String(over.id).padStart(2, "0")}T00:00:00.000Z`,
  ...over,
});

// The route hands the function shots already scoped to the active bag + eligible,
// newest-first. These helpers mirror that so the fixtures read like real input.
const eligibleActiveBagShotsNewestFirst = (bagId: number, shots: Shot[]): Shot[] =>
  shots
    .filter((s) => s.bagId === bagId && s.includeInAnalysis === true)
    .sort((a, b) => b.shotDate.localeCompare(a.shotDate));

test("Gate 7.3 — reference pool is the manual isReference flag, never inferred from rating", () => {
  const shots = [
    shot({ id: 1, isReference: false, rating: 10 }), // top-rated but NOT a reference
    shot({ id: 2, isReference: true, rating: 5 }),   // low-rated but IS a reference
    shot({ id: 3, isReference: null, rating: 9 }),   // unset flag — excluded
    shot({ id: 4, isReference: true, rating: null }), // reference with no rating at all
  ];

  const { compRefPool, hasSufficientReferences } = selectComparisonReferences(
    eligibleActiveBagShotsNewestFirst(1, shots),
  );

  assert.deepEqual(compRefPool.map((s) => s.id).sort(), [2, 4]);
  assert.equal(hasSufficientReferences, true);
  // No rating-derived inclusion: the rating-10 shot is absent, the rating-5 present.
  assert.equal(compRefPool.some((s) => s.id === 1), false);
  assert.equal(compRefPool.some((s) => s.id === 2), true);
});

test("Gate 7.1 — the pool never contains another bag's reference shots", () => {
  const shots = [
    shot({ id: 1, bagId: 1, isReference: true, rating: 8 }),
    shot({ id: 2, bagId: 2, isReference: true, rating: 9 }), // Bag B reference
    shot({ id: 3, bagId: 2, isReference: true, rating: 10 }),
  ];

  const bagA = selectComparisonReferences(eligibleActiveBagShotsNewestFirst(1, shots));
  assert.deepEqual(bagA.compRefPool.map((s) => s.id), [1]);
  assert.equal(bagA.compRefPool.every((s) => s.bagId === 1), true);

  // Switching the active bag switches the pool wholesale — no carryover.
  const bagB = selectComparisonReferences(eligibleActiveBagShotsNewestFirst(2, shots));
  assert.deepEqual(bagB.compRefPool.map((s) => s.id).sort(), [2, 3]);
  assert.equal(bagB.compRefPool.some((s) => s.id === 1), false);
});

test("Gate 7.2 — excluded shots (include_in_analysis = false) are absent from the pool and the current shot", () => {
  const shots = [
    shot({ id: 1, isReference: false, rating: 7 }),
    shot({ id: 2, isReference: true, rating: 8 }),
    shot({ id: 3, isReference: true, rating: 10, includeInAnalysis: false }), // excluded reference
    shot({ id: 4, isReference: false, rating: 9, includeInAnalysis: false }), // excluded, newest by date
  ];

  const { compRefPool, latestAnalysisShot } = selectComparisonReferences(
    eligibleActiveBagShotsNewestFirst(1, shots),
  );

  // The excluded reference (id 3) must not reach the pool...
  assert.deepEqual(compRefPool.map((s) => s.id), [2]);
  // ...and the excluded shot 4, though newest, must not be the "current" shot.
  assert.equal(latestAnalysisShot?.id, 2);
});

test("Gate 7.4 — no references yields a distinct insufficient state, not zeros", () => {
  const noRefs = selectComparisonReferences(
    eligibleActiveBagShotsNewestFirst(1, [
      shot({ id: 1, isReference: false, rating: 9 }),
      shot({ id: 2, isReference: false, rating: 8 }),
    ]),
  );
  assert.equal(noRefs.hasSufficientReferences, false);
  assert.deepEqual(noRefs.compRefPool, []);
  assert.equal(noRefs.latestAnalysisShot?.id, 2); // a current shot still exists

  const noShots = selectComparisonReferences([] as Shot[]);
  assert.equal(noShots.hasSufficientReferences, false);
  assert.deepEqual(noShots.compRefPool, []);
  assert.equal(noShots.latestAnalysisShot, null);
});

test("selectComparisonReferences takes the newest shot as current and does not mutate input", () => {
  const input = eligibleActiveBagShotsNewestFirst(1, [
    shot({ id: 1, isReference: true }),
    shot({ id: 5, isReference: true }),
    shot({ id: 3, isReference: false }),
  ]);
  const snapshot = input.map((s) => s.id);

  const { latestAnalysisShot, compRefPool, compSource } = selectComparisonReferences(input);
  assert.equal(latestAnalysisShot?.id, 5);
  assert.deepEqual(compRefPool.map((s) => s.id), [5, 1]);
  assert.equal(compSource, "Active bag reference shots");
  assert.deepEqual(input.map((s) => s.id), snapshot, "input array is not reordered or mutated");
});
