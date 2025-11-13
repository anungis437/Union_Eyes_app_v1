import { pgTable, uuid, varchar, boolean, timestamp, text, jsonb, integer, decimal, pgSchema, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Create tenant_management schema
export const tenantManagementSchema = pgSchema("tenant_management");

// Tenants table - primary organization/union management
export const tenants = tenantManagementSchema.table("tenants", {
  tenantId: uuid("tenant_id").primaryKey().defaultRandom(),
  tenantSlug: varchar("tenant_slug", { length: 100 }).notNull().unique(),
  tenantName: varchar("tenant_name", { length: 255 }).notNull(),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).notNull().default("free"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  maxUsers: integer("max_users").default(10),
  maxStorageGb: integer("max_storage_gb").default(5),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  subscriptionStartedAt: timestamp("subscription_started_at", { withTimezone: true }),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  features: jsonb("features").default(sql`'{}'::jsonb`),
  settings: jsonb("settings").default(sql`'{}'::jsonb`),
  billingEmail: varchar("billing_email", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  locale: varchar("locale", { length: 10 }).default("en-US"),
  logoUrl: text("logo_url"),
  customDomain: varchar("custom_domain", { length: 255 }),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  checkSubscriptionTier: check("valid_subscription_tier", 
    sql`${table.subscriptionTier} IN ('free', 'basic', 'premium', 'enterprise')`),
  checkStatus: check("valid_status", 
    sql`${table.status} IN ('active', 'suspended', 'cancelled', 'trial')`),
}));

// Tenant configurations table - flexible configuration storage
export const tenantConfigurations = tenantManagementSchema.table("tenant_configurations", {
  configId: uuid("config_id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  value: jsonb("value").notNull(),
  description: text("description"),
  isEncrypted: boolean("is_encrypted").default(false),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Tenant usage tracking table
export const tenantUsage = tenantManagementSchema.table("tenant_usage", {
  usageId: uuid("usage_id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  activeUsers: integer("active_users").default(0),
  storageUsedGb: decimal("storage_used_gb", { precision: 10, scale: 3 }).default("0"),
  apiRequests: integer("api_requests").default(0),
  aiTokensUsed: integer("ai_tokens_used").default(0),
  voiceMinutesUsed: integer("voice_minutes_used").default(0),
  documentsProcessed: integer("documents_processed").default(0),
  emailsSent: integer("emails_sent").default(0),
  smsMessagesSent: integer("sms_messages_sent").default(0),
  usageDetails: jsonb("usage_details").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  checkPeriod: check("valid_period", 
    sql`${table.periodEnd} > ${table.periodStart}`),
}));

// Database connection pool management
export const databasePools = tenantManagementSchema.table("database_pools", {
  poolId: uuid("pool_id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
  connectionString: text("connection_string").notNull(),
  poolSize: integer("pool_size").default(10),
  minConnections: integer("min_connections").default(2),
  maxConnections: integer("max_connections").default(20),
  idleTimeoutSeconds: integer("idle_timeout_seconds").default(300),
  isActive: boolean("is_active").default(true),
  lastHealthCheck: timestamp("last_health_check", { withTimezone: true }),
  healthStatus: varchar("health_status", { length: 20 }).default("healthy"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  checkHealthStatus: check("valid_health_status", 
    sql`${table.healthStatus} IN ('healthy', 'degraded', 'unhealthy')`),
  checkPoolSize: check("valid_pool_size", 
    sql`${table.minConnections} <= ${table.poolSize} AND ${table.poolSize} <= ${table.maxConnections}`),
}));

// Export types
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantConfiguration = typeof tenantConfigurations.$inferSelect;
export type NewTenantConfiguration = typeof tenantConfigurations.$inferInsert;
export type TenantUsage = typeof tenantUsage.$inferSelect;
export type NewTenantUsage = typeof tenantUsage.$inferInsert;
export type DatabasePool = typeof databasePools.$inferSelect;
export type NewDatabasePool = typeof databasePools.$inferInsert;
