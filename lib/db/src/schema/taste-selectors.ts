import { pgTable, serial, text, boolean, integer, timestamp, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shotsTable } from "./shots";

export const TASTE_SELECTOR_CATEGORIES = ["balance", "texture", "flavor", "finish", "character", "custom"] as const;
// standard = canonical vocabulary (eligible for future cross-user profiling);
// custom = personal, never aggregated globally unless promoted into the canon.
export const TASTE_SELECTOR_ORIGINS = ["standard", "custom"] as const;

export const tasteSelectorsTable = pgTable("taste_selectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("custom"),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  origin: text("origin").notNull().default("standard"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  // Permanent key for standard selectors ("finish.minty-freshness"); NULL for custom.
  canonicalKey: text("canonical_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("taste_selectors_canonical_key_unique").on(t.canonicalKey)]);

export const shotTasteSelectorsTable = pgTable(
  "shot_taste_selectors",
  {
    shotId: integer("shot_id").notNull().references(() => shotsTable.id, { onDelete: "cascade" }),
    tasteSelectorId: integer("taste_selector_id").notNull().references(() => tasteSelectorsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.shotId, t.tasteSelectorId] })]
);

export const insertTasteSelectorSchema = createInsertSchema(tasteSelectorsTable).omit({ id: true, createdAt: true });
export type InsertTasteSelector = z.infer<typeof insertTasteSelectorSchema>;
export type TasteSelector = typeof tasteSelectorsTable.$inferSelect;
