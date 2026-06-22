import { pgTable, serial, text, real, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bagsTable } from "./bags";
import { grindersTable } from "./equipment";
import { machinesTable } from "./equipment";

export const shotsTable = pgTable("shots", {
  id: serial("id").primaryKey(),
  shotDate: text("shot_date").notNull(),
  bagId: integer("bag_id").references(() => bagsTable.id),
  bean: text("bean"),
  bag: text("bag"),
  grinderId: integer("grinder_id").references(() => grindersTable.id),
  machineId: integer("machine_id").references(() => machinesTable.id),
  grindSetting: real("grind_setting"),
  grindTime: real("grind_time"),
  initialGrindWeight: real("initial_grind_weight"),
  totalOutput: real("total_output"),
  dose: real("dose"),
  timeAdj: real("time_adj"),
  topUpGrind: real("top_up_grind"),
  overGrindRemoved: real("over_grind_removed"),
  beanDelta: real("bean_delta"),
  grindWaste: real("grind_waste"),
  beansAdded: real("beans_added"),
  doseCorrectionType: text("dose_correction_type"),
  doseCorrection: real("dose_correction"),
  outputDelta: real("output_delta"),
  yield: real("yield"),
  ratio: text("ratio"),
  temperature: integer("temperature"),
  pourDelay: integer("pour_delay"),
  pourTime: integer("pour_time"),
  scaleTime: integer("scale_time"),
  rating: real("rating"),
  preferenceRating: real("preference_rating"),
  ratingDifference: real("rating_difference"),
  avgWeightedRating: real("avg_weighted_rating"),
  rated: boolean("rated"),
  isForOthers: boolean("is_for_others"),
  isReference: boolean("is_reference").notNull().default(false),
  signatureShot: boolean("signature_shot"),
  sourShot: boolean("sour_shot"),
  beanAchievement: text("bean_achievement"),
  drinkType: text("drink_type"),
  status: text("status"),
  shotClassification: text("shot_classification"),
  faultStatus: text("fault_status"),
  referenceType: text("reference_type"),
  expressionStyle: text("expression_style"),
  dailyDriverCount: integer("daily_driver_count"),
  includeInAnalysis: boolean("include_in_analysis"),
  notes: text("notes"),
  faultNotes: text("fault_notes"),
  bagOpenedDate: text("bag_opened_date"),
  hopperPhase: text("hopper_phase"),
  grindAdjusted: text("grind_adjusted"),
  shotsLeftEst: real("shots_left_est"),
  finishedShot: boolean("finished_shot"),
  sensoryNotes: text("sensory_notes"),
  airtableRecordId: text("airtable_record_id").unique(),
  rawRow: jsonb("raw_row").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShotSchema = createInsertSchema(shotsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertShot = z.infer<typeof insertShotSchema>;
export type Shot = typeof shotsTable.$inferSelect;
