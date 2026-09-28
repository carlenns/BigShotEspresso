import { eq, isNotNull, sql } from "drizzle-orm";
import { shotsTable } from "@workspace/db";

export const eligibleShotConditions = [
  eq(shotsTable.includeInAnalysis, true),
] as const;

/**
 * In-memory twin of `eligibleShotConditions` for rows already fetched (Phase 2A
 * S6: the dashboard reads a bag's shots once and derives the eligible subset
 * instead of issuing a second query). Keep the two in lockstep.
 */
export function isEligibleShotRow(row: { includeInAnalysis: boolean | null }): boolean {
  return row.includeInAnalysis === true;
}

export const ratingEligibleShotConditions = [
  ...eligibleShotConditions,
  isNotNull(shotsTable.rating),
  sql`${shotsTable.rated} is distinct from false`,
] as const;
