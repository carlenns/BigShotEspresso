import { pgTable, serial, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ACCESSORY_TYPES = [
  "basket",
  "tamper",
  "puck_screen",
  "wdt_tool",
  "dosing_funnel",
  "dosing_cup",
  "blind_shaker",
  "scale",
  "distributor",
  "portafilter",
  "other",
] as const;

export type AccessoryType = (typeof ACCESSORY_TYPES)[number];

export const accessoriesTable = pgTable("accessories", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  shortLabel: text("short_label"),
  brand: text("brand"),
  model: text("model"),
  size: text("size"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  specs: jsonb("specs"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccessorySchema = createInsertSchema(accessoriesTable).omit({ id: true, createdAt: true });
export type InsertAccessory = z.infer<typeof insertAccessorySchema>;
export type Accessory = typeof accessoriesTable.$inferSelect;
