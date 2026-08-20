import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const beansTable = pgTable("beans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  coffeeName: text("coffee_name"),
  origin: text("origin"),
  region: text("region"),
  roaster: text("roaster"),
  roastLevel: text("roast_level"),
  process: text("process"),
  certification: text("certification"),
  variety: text("variety"),
  altitude: text("altitude"),
  roasterNotes: text("roaster_notes"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  airtableRecordId: text("airtable_record_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBeanSchema = createInsertSchema(beansTable).omit({ id: true, createdAt: true });
export type InsertBean = z.infer<typeof insertBeanSchema>;
export type Bean = typeof beansTable.$inferSelect;
