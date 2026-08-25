import { eq, isNotNull, sql } from "drizzle-orm";
import { shotsTable } from "@workspace/db";

export const eligibleShotConditions = [
  eq(shotsTable.includeInAnalysis, true),
] as const;

export const ratingEligibleShotConditions = [
  ...eligibleShotConditions,
  isNotNull(shotsTable.rating),
  sql`${shotsTable.rated} is distinct from false`,
] as const;
