import { pgTable, text, timestamp, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const memberRoleEnum = pgEnum("member_role", ["member", "steward", "officer", "admin"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "inactive", "on-leave"]);

// Organization Members table
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull(), // Legacy Clerk organization ID (deprecated)
  userId: text("user_id").notNull(), // Clerk user ID
  tenantId: uuid("tenant_id").notNull(), // FK to tenant_management.tenants
  
  // Basic Info
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  
  // Role & Status
  role: memberRoleEnum("role").notNull().default("member"),
  status: memberStatusEnum("status").notNull().default("active"),
  
  // Work Info
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 200 }),
  hireDate: timestamp("hire_date"),
  
  // Union Info
  membershipNumber: varchar("membership_number", { length: 50 }),
  seniority: text("seniority"), // Years/months calculated
  unionJoinDate: timestamp("union_join_date"),
  
  // Contact Preferences
  preferredContactMethod: varchar("preferred_contact_method", { length: 20 }).default("email"),
  
  // Metadata
  metadata: text("metadata"), // JSON string for additional flexible data
  
  // Search
  searchVector: text("search_vector"), // Full-text search vector (tsvector in DB)
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"),
});

export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;
export type SelectOrganizationMember = typeof organizationMembers.$inferSelect;
