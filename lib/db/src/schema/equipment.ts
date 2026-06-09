import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const grindersTable = pgTable("grinders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  model: text("model"),
  type: text("type"), // espresso | decaf | pour-over | hand
  burrSize: text("burr_size"),
  burrType: text("burr_type"),
  isDefault: boolean("is_default").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const machinesTable = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  model: text("model"),
  brewMethod: text("brew_method"), // espresso | pour-over | aeropress | french-press | moka | lever
  isDefault: boolean("is_default").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGrinderSchema = createInsertSchema(grindersTable).omit({ id: true, createdAt: true });
export const insertMachineSchema = createInsertSchema(machinesTable).omit({ id: true, createdAt: true });
export type InsertGrinder = z.infer<typeof insertGrinderSchema>;
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Grinder = typeof grindersTable.$inferSelect;
export type Machine = typeof machinesTable.$inferSelect;
