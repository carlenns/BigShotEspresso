import { eq } from "drizzle-orm";
import { shotsTable } from "@workspace/db";

export const eligibleShotConditions = [
  eq(shotsTable.includeInAnalysis, true),
] as const;
