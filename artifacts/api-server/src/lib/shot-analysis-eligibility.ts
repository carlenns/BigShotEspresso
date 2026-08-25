// The single approved analysis-eligibility rule, mirrored from the client's
// `describeAnalysisEligibility` (artifacts/coffee-log/src/lib/selector-options.ts)
// so the server never has to trust a client-supplied `includeInAnalysis`
// value. `Include in Analysis` is documented as read-only/derived
// (docs/csv-data-dictionary.md) with no approved manual override, so this
// is applied unconditionally on every write, not just when the client
// leaves the field blank.
//
// Deliberately dependency-free (no drizzle/@workspace/db imports) so it can
// be unit-tested directly without requiring a live database connection —
// unlike shot-eligibility.ts, which builds drizzle query conditions and so
// requires @workspace/db's connected client just to import it.
const INCLUDED_STATUSES = new Set(["Good", "Dialed In"]);

export function computeIncludeInAnalysis(
  status: string | null | undefined,
  faultStatus: (string | null)[] | null | undefined,
): boolean {
  if (!status || !INCLUDED_STATUSES.has(status)) return false;
  const faults = faultStatus ?? [];
  return faults.length === 1 && faults[0] === "Good";
}
