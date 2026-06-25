import { boolean, date, integer, jsonb, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bagsTable } from "./bags";

export const hoppersTable = pgTable("hoppers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  bagId: integer("bag_id").references(() => bagsTable.id),
  startingBeans: real("starting_beans"),
  isActive: boolean("is_active").notNull().default(false),
  hopperMass: real("hopper_mass"),
  hopperPercent: real("hopper_percent"),
  shotsLeftEstimate: real("shots_left_estimate"),
  phase: text("phase"),
  notes: text("notes"),
  airtableRecordId: text("airtable_record_id").unique(),
  rawRow: jsonb("raw_row").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("one_active_hopper_per_bag").on(table.bagId).where(sql`${table.isActive} = true`),
]);

export const hopperRangeBaselinesTable = pgTable("hopper_range_baselines", {
  id: serial("id").primaryKey(),
  hopperRange: text("hopper_range").notNull().unique(),
  baselineOutputAdjustedDate: date("baseline_output_adjusted_date"),
  baselineOutputStatus: text("baseline_output_status"),
  baselineOutput: real("baseline_output"),
  avgInitialOutput: real("avg_initial_output"),
  observationCount: integer("observation_count"),
  airtableRecordId: text("airtable_record_id").unique(),
  rawRow: jsonb("raw_row").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHopperSchema = createInsertSchema(hoppersTable).omit({ id: true, createdAt: true });
export const insertHopperRangeBaselineSchema = createInsertSchema(hopperRangeBaselinesTable).omit({ id: true, createdAt: true });
export type InsertHopper = z.infer<typeof insertHopperSchema>;
export type Hopper = typeof hoppersTable.$inferSelect;
export type InsertHopperRangeBaseline = z.infer<typeof insertHopperRangeBaselineSchema>;
export type HopperRangeBaseline = typeof hopperRangeBaselinesTable.$inferSelect;
