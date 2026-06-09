import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shotsTable = pgTable("shots", {
  id: serial("id").primaryKey(),
  shotDate: text("shot_date").notNull(),
  bean: text("bean"),
  bag: text("bag"),
  grindSetting: real("grind_setting"),
  grindTime: real("grind_time"),
  initialGrindWeight: real("initial_grind_weight"),
  dose: real("dose"),
  yield: real("yield"),
  ratio: text("ratio"),
  temperature: integer("temperature"),
  pourDelay: integer("pour_delay"),
  pourTime: integer("pour_time"),
  scaleTime: integer("scale_time"),
  rating: real("rating"),
  preferenceRating: real("preference_rating"),
  status: text("status"),
  faultStatus: text("fault_status"),
  isReference: boolean("is_reference").notNull().default(false),
  isForOthers: boolean("is_for_others"),
  notes: text("notes"),
  sensoryNotes: text("sensory_notes"),
  grindAdjusted: text("grind_adjusted"),
  doseCorrection: real("dose_correction"),
  doseCorrectionType: text("dose_correction_type"),
  shotsLeftEst: real("shots_left_est"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShotSchema = createInsertSchema(shotsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertShot = z.infer<typeof insertShotSchema>;
export type Shot = typeof shotsTable.$inferSelect;
