/**
 * Phase 5B: Inter-Union Features - Sharing Permissions Schema
 * Created: November 19, 2025
 * Purpose: Organization sharing settings, access logs, and explicit grants
 */

import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  boolean, 
  timestamp,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "../schema-organizations";

// ============================================================================
// ORGANIZATION SHARING SETTINGS
// ============================================================================

export const organizationSharingSettings = pgTable("organization_sharing_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  
  // Clause library sharing
  enableClauseSharing: boolean("enable_clause_sharing").default(false),
  defaultClauseSharingLevel: varchar("default_clause_sharing_level", { length: 50 }).default("private"),
  autoAnonymizeClauses: boolean("auto_anonymize_clauses").default(true),
  
  // Precedent sharing
  enablePrecedentSharing: boolean("enable_precedent_sharing").default(false),
  defaultPrecedentSharingLevel: varchar("default_precedent_sharing_level", { length: 50 }).default("federation"),
  alwaysRedactMemberNames: boolean("always_redact_member_names").default(true),
  
  // Analytics sharing
  enableAnalyticsSharing: boolean("enable_analytics_sharing").default(false),
  shareMemberCounts: boolean("share_member_counts").default(false),
  shareFinancialData: boolean("share_financial_data").default(false),
  shareClaimsData: boolean("share_claims_data").default(false),
  shareStrikeData: boolean("share_strike_data").default(false),
  
  // Audit
  lastModifiedBy: uuid("last_modified_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  orgIdx: index("idx_sharing_settings_org").on(table.organizationId),
}));

// ============================================================================
// CROSS-ORG ACCESS LOG
// ============================================================================

export const crossOrgAccessLog = pgTable("cross_org_access_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Who accessed
  userId: uuid("user_id").notNull(),
  userOrganizationId: uuid("user_organization_id")
    .notNull()
    .references(() => organizations.id),
  
  // What was accessed
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: uuid("resource_id").notNull(),
  resourceOwnerOrgId: uuid("resource_owner_org_id")
    .notNull()
    .references(() => organizations.id),
  
  // Access context
  accessType: varchar("access_type", { length: 50 }).notNull(),
  sharingLevel: varchar("sharing_level", { length: 50 }),
  wasGrantExplicit: boolean("was_grant_explicit").default(false),
  
  // Request metadata
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Audit
  accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("idx_access_log_user").on(table.userId),
  userOrgIdx: index("idx_access_log_user_org").on(table.userOrganizationId),
  resourceIdx: index("idx_access_log_resource").on(table.resourceType, table.resourceId),
  ownerIdx: index("idx_access_log_owner").on(table.resourceOwnerOrgId),
  dateIdx: index("idx_access_log_date").on(table.accessedAt),
}));

// ============================================================================
// ORGANIZATION SHARING GRANTS
// ============================================================================

export const organizationSharingGrants = pgTable("organization_sharing_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Grantor and grantee
  grantorOrgId: uuid("grantor_org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  granteeOrgId: uuid("grantee_org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  
  // What is granted
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  allResources: boolean("all_resources").default(false),
  specificResourceIds: uuid("specific_resource_ids").array(),
  
  // Grant metadata
  grantReason: text("grant_reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedBy: uuid("revoked_by"),
  revokeReason: text("revoke_reason"),
  
  // Audit
  grantedBy: uuid("granted_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  grantorIdx: index("idx_sharing_grants_grantor").on(table.grantorOrgId),
  granteeIdx: index("idx_sharing_grants_grantee").on(table.granteeOrgId),
  resourceIdx: index("idx_sharing_grants_resource").on(table.resourceType),
  expiresIdx: index("idx_sharing_grants_expires").on(table.expiresAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const organizationSharingSettingsRelations = relations(organizationSharingSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationSharingSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const crossOrgAccessLogRelations = relations(crossOrgAccessLog, ({ one }) => ({
  userOrganization: one(organizations, {
    fields: [crossOrgAccessLog.userOrganizationId],
    references: [organizations.id],
    relationName: "userOrganization",
  }),
  resourceOwnerOrg: one(organizations, {
    fields: [crossOrgAccessLog.resourceOwnerOrgId],
    references: [organizations.id],
    relationName: "resourceOwnerOrg",
  }),
}));

export const organizationSharingGrantsRelations = relations(organizationSharingGrants, ({ one }) => ({
  grantorOrg: one(organizations, {
    fields: [organizationSharingGrants.grantorOrgId],
    references: [organizations.id],
    relationName: "grantorOrg",
  }),
  granteeOrg: one(organizations, {
    fields: [organizationSharingGrants.granteeOrgId],
    references: [organizations.id],
    relationName: "granteeOrg",
  }),
}));

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type OrganizationSharingSettings = typeof organizationSharingSettings.$inferSelect;
export type NewOrganizationSharingSettings = typeof organizationSharingSettings.$inferInsert;

export type CrossOrgAccessLog = typeof crossOrgAccessLog.$inferSelect;
export type NewCrossOrgAccessLog = typeof crossOrgAccessLog.$inferInsert;

export type OrganizationSharingGrant = typeof organizationSharingGrants.$inferSelect;
export type NewOrganizationSharingGrant = typeof organizationSharingGrants.$inferInsert;

// Sharing level types (imported from clause library schema)
// export type SharingLevel = "private" | "federation" | "congress" | "public";

// Resource types
export type ResourceType = "clause" | "precedent" | "analytics" | "cba" | "decision";

// Access types
export type AccessType = "view" | "download" | "compare" | "cite" | "export";
