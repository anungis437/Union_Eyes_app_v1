/**
 * Tenant Utilities
 * 
 * Helper functions for tenant management and resolution.
 * In Phase 1, we use a default tenant for single-tenant operation.
 * In future phases, this will be enhanced to support multi-tenancy.
 */

import { db } from "@/db/db";
import { tenants } from "@/db/schema/tenant-management-schema";
import { tenantUsers } from "@/db/schema/user-management-schema";
import { eq } from "drizzle-orm";

/**
 * Default tenant ID used in Phase 1 for single-tenant operation.
 * This tenant is seeded in database/migrations/022_seed_demo_data.sql
 */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Get the tenant ID for a given Clerk user ID.
 * 
 * Phase 1 Implementation:
 * - Returns the default tenant ID for all users
 * - Validates that the tenant exists in the database
 * 
 * Future Enhancement (Phase 2+):
 * - Look up tenant from user's organization in Clerk
 * - Support multiple tenants per user
 * - Use Clerk organization metadata
 * 
 * @param clerkUserId - The Clerk user ID (from auth())
 * @returns The tenant ID UUID string
 * @throws Error if tenant not found
 */
export async function getTenantIdForUser(clerkUserId: string): Promise<string> {
  try {
    // Phase 1: Use default tenant for all users
    // In future phases, this will query the tenant_users table
    const tenantId = DEFAULT_TENANT_ID;
    
    // Validate that tenant exists
    const tenant = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);
    
    if (tenant.length === 0) {
      throw new Error(`Tenant ${tenantId} not found. Run database migrations to seed default tenant.`);
    }
    
    return tenantId;
  } catch (error) {
    console.error(`Error resolving tenant for user ${clerkUserId}:`, error);
    throw error;
  }
}

/**
 * Get the default tenant ID.
 * 
 * Use this function when you need a tenant ID but don't have a user context,
 * such as in background jobs or system operations.
 * 
 * @returns The default tenant ID
 */
export function getDefaultTenantId(): string {
  return DEFAULT_TENANT_ID;
}

/**
 * Validate that a tenant exists in the database.
 * 
 * @param tenantId - The tenant ID to validate
 * @returns True if tenant exists, false otherwise
 */
export async function validateTenantExists(tenantId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error(`Error validating tenant ${tenantId}:`, error);
    return false;
  }
}

/**
 * Get tenant information for a user.
 * 
 * Future Enhancement: This will return full tenant details including
 * subscription tier, features, settings, etc.
 * 
 * @param clerkUserId - The Clerk user ID
 * @returns Tenant information
 */
export async function getTenantInfo(clerkUserId: string) {
  const tenantId = await getTenantIdForUser(clerkUserId);
  
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);
  
  if (result.length === 0) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  
  return result[0];
}
