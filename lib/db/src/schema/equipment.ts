import { pgTable, serial, text, boolean, timestamp, real, integer } from "drizzle-orm/pg-core";
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
  adjustmentType: text("adjustment_type"), // stepless | stepped | indexed | unknown
  grindSettingPrecision: integer("grind_setting_precision"),
  grindStepIncrement: real("grind_step_increment"),
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
  stockBasket: text("stock_basket"),
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
