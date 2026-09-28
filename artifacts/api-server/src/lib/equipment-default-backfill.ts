import { eq, inArray } from "drizzle-orm";
import { db, settingsTable, grindersTable, machinesTable, accessoriesTable } from "@workspace/db";
import { logger } from "./logger";
import {
  EQUIPMENT_DEFAULTS_BACKFILL_MARKER_KEY,
  planEquipmentDefaultBackfill,
  type BackfillOutcome,
} from "./equipment-defaults";

/**
 * Runs once per database (marker row in `settings`), on boot. Copies the old
 * Settings equipment strings onto the Equipment/Accessories `isDefault` flags
 * where exactly one record matches and no default is set yet. Never overwrites
 * or deletes anything; the report is stored under the marker key so the
 * Settings page can show anything that needs setting by hand.
 */
export async function backfillEquipmentDefaultsOnce(): Promise<BackfillOutcome[] | null> {
  const [marker] = await db.select().from(settingsTable).where(eq(settingsTable.key, EQUIPMENT_DEFAULTS_BACKFILL_MARKER_KEY));
  if (marker) return null;

  const [settingRows, grinders, machines, accessories] = await Promise.all([
    db.select().from(settingsTable),
    db.select().from(grindersTable),
    db.select().from(machinesTable),
    db.select().from(accessoriesTable),
  ]);
  const settings: Record<string, string> = {};
  for (const r of settingRows) settings[r.key] = r.value;

  const outcomes = planEquipmentDefaultBackfill({ settings, grinders, machines, accessories });
  const ids = (table: string) => outcomes.flatMap((o) => (o.kind === "set" && o.table === table ? [o.id] : []));

  await db.transaction(async (tx) => {
    if (ids("machines").length) await tx.update(machinesTable).set({ isDefault: true }).where(inArray(machinesTable.id, ids("machines")));
    if (ids("grinders").length) await tx.update(grindersTable).set({ isDefault: true }).where(inArray(grindersTable.id, ids("grinders")));
    if (ids("accessories").length) await tx.update(accessoriesTable).set({ isDefault: true }).where(inArray(accessoriesTable.id, ids("accessories")));
    await tx.insert(settingsTable)
      .values({ key: EQUIPMENT_DEFAULTS_BACKFILL_MARKER_KEY, value: JSON.stringify({ ranAt: new Date().toISOString(), outcomes }) })
      .onConflictDoNothing({ target: settingsTable.key });
  });

  logger.info({ outcomes }, "Equipment defaults backfill complete");
  return outcomes;
}
