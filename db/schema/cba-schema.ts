/**
 * CBA Schema (Stub for Phase 5B)
 * This is a temporary stub for clause library references
 * Links to collective-agreements-schema for full implementation
 */

import { pgTable, uuid, varchar, text, date, timestamp } from "drizzle-orm/pg-core";

// Stub CBA table - references collective agreements
// TODO: Merge with collective-agreements-schema in future
export const cba = pgTable("collective_agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  organizationId: uuid("organization_id").notNull(),
  employerName: varchar("employer_name", { length: 200 }),
  effectiveDate: date("effective_date"),
  expiryDate: date("expiry_date"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  documentUrl: text("document_url"),
  jurisdiction: varchar("jurisdiction", { length: 100 }), // Added to prevent relational query errors
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
