// Current Shot vs Reference — comparison-input selection for the dashboard.
//
// Extracted from routes/dashboard.ts as a pure function so the four correctness
// properties Gate 7 cares about can be tested directly on fixtures:
//
//   1. Active-bag isolation — the function only ever sees the array the route
//      hands it, which the route scopes with
//      `where(eq(shotsTable.bagId, activeBagRow.id), ...eligibleShotConditions)`.
//      There is no cross-bag lookup or fallback pool in here.
//   2. Excluded shots don't affect analytics — the route pre-filters on
//      `include_in_analysis = true` (eligibleShotConditions) before calling this;
//      this function adds no path that could re-introduce an excluded shot.
//   3. Reference shots are manual — the pool is `isReference === true` only,
//      never derived from rating, recency, or any score.
//   4. Insufficient-reference-data is a distinct state — an empty pool yields
//      `hasSufficientReferences: false`, which the route renders as
//      `bagReference: null` (a labelled "no reference data" card), not zeros.

export interface ComparisonReferenceShot {
  isReference: boolean | null;
}

export interface ComparisonReferenceSelection<T> {
  /** Newest analysis-eligible shot for the active bag, or null when none. */
  latestAnalysisShot: T | null;
  /** Manually-flagged reference shots for the active bag (isReference === true). */
  compRefPool: T[];
  compSource: string;
  /** False when compRefPool is empty — caller emits a distinct no-reference state. */
  hasSufficientReferences: boolean;
}

/**
 * Select the Current-Shot-vs-Reference comparison inputs.
 *
 * `activeBagShots` MUST already be scoped by the caller to a single bag and to
 * analysis-eligible shots, ordered newest-first (the route's
 * `orderBy(desc(shotDate))`).
 */
export function selectComparisonReferences<T extends ComparisonReferenceShot>(
  activeBagShots: readonly T[],
): ComparisonReferenceSelection<T> {
  const latestAnalysisShot = activeBagShots[0] ?? null;
  const compRefPool = activeBagShots.filter((s) => s.isReference === true);
  return {
    latestAnalysisShot,
    compRefPool,
    compSource: "Active bag reference shots",
    hasSufficientReferences: compRefPool.length > 0,
  };
}
