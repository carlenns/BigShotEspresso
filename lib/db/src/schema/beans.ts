import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const beansTable = pgTable("beans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  origin: text("origin"),
  roaster: text("roaster"),
  roastLevel: text("roast_level"),
  process: text("process"),
  variety: text("variety"),
  altitude: text("altitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBeanSchema = createInsertSchema(beansTable).omit({ id: true, createdAt: true });
export type InsertBean = z.infer<typeof insertBeanSchema>;
export type Bean = typeof beansTable.$inferSelect;
