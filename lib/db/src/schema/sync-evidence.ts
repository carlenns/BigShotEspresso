import { jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const airtableSyncEvidenceTable = pgTable("airtable_sync_evidence", {
  id: serial("id").primaryKey(),
  sourceTable: text("source_table").notNull(),
  sourceRecordId: text("source_record_id").notNull(),
  sourceCreatedTime: timestamp("source_created_time", { withTimezone: true }),
  fields: jsonb("fields").$type<Record<string, unknown>>().notNull(),
  contentHash: text("content_hash").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("airtable_sync_evidence_record_hash_unique")
    .on(table.sourceTable, table.sourceRecordId, table.contentHash),
]);
