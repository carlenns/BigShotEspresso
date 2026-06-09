import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { beansTable } from "./beans";

export const bagsTable = pgTable("bags", {
  id: serial("id").primaryKey(),
  beanId: integer("bean_id").references(() => beansTable.id),
  bagNumber: text("bag_number"),
  openedDate: text("opened_date"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBagSchema = createInsertSchema(bagsTable).omit({ id: true, createdAt: true });
export type InsertBag = z.infer<typeof insertBagSchema>;
export type Bag = typeof bagsTable.$inferSelect;
