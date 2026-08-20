import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { beansTable } from "./beans";

export const bagsTable = pgTable("bags", {
  id: serial("id").primaryKey(),
  beanId: integer("bean_id").references(() => beansTable.id),
  bagNumber: text("bag_number"),
  bagName: text("bag_name"),
  purchaseDate: text("purchase_date"),
  roastDate: text("roast_date"),
  roastDateUsed: text("roast_date_used"),
  estimatedRoastWindow: text("estimated_roast_window"),
  actualRoastDate: text("actual_roast_date"),
  estimatedRoastDate: text("estimated_roast_date"),
  freshnessDatingMethod: text("freshness_dating_method"),
  roastDateConfidence: text("roast_date_confidence"),
  roastDateNotes: text("roast_date_notes"),
  openedDate: text("opened_date"),
  closedOutDate: text("closed_out_date"),
  bagWeight: real("bag_weight"),
  remainingEstimate: real("remaining_estimate"),
  cost: real("cost"),
  isActive: boolean("is_active").notNull().default(false),
  startGrindSetting: real("start_grind_setting"),
  currentGrindSetting: real("current_grind_setting"),
  startGrindTime: real("start_grind_time"),
  currentGrindTime: real("current_grind_time"),
  defaultDose: real("default_dose"),
  defaultYield: real("default_yield"),
  defaultTemp: integer("default_temp"),
  dialInNotes: text("dial_in_notes"),
  notes: text("notes"),
  airtableRecordId: text("airtable_record_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBagSchema = createInsertSchema(bagsTable).omit({ id: true, createdAt: true });
export type InsertBag = z.infer<typeof insertBagSchema>;
export type Bag = typeof bagsTable.$inferSelect;
