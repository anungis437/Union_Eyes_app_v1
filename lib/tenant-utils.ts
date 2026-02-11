/**
 * Tenant Utilities
 * 
 * Helper functions for tenant management and resolution.
 * In Phase 1, we use a default tenant for single-tenant operation.
 * In future phases, this will be enhanced to support multi-tenancy.
 */

import { tenants } from "@/db/schema/tenant-management-schema";
import { organizationUsers } from "@/db/schema/user-management-schema";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { withRLSContext } from "@/lib/rls-middleware";

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
 * @param tx - Optional transaction context for RLS enforcement
 * @returns The tenant ID UUID string
 * @throws Error if tenant not found
 */
/**
 * @deprecated Use getOrganizationIdForUser instead. This function remains for backward compatibility.
 */
export async function getTenantIdForUser(
  clerkUserId: string,
  tx?: NodePgDatabase<any>
): Promise<string> {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      // Check if user has selected a specific tenant via cookie
      const cookieStore = await cookies();
      const selectedOrganizationId = cookieStore.get("selected_organization_id")?.value;
      const selectedTenantId = cookieStore.get("selected_tenant_id")?.value;
      const selectedScopeId = selectedOrganizationId ?? selectedTenantId;
if (selectedScopeId) {
        // Verify user has access to the selected tenant/organization
        const userTenant = await dbOrTx
          .select({ organizationId: organizationUsers.organizationId })
          .from(organizationUsers)
          .where(
            and(
              eq(organizationUsers.userId, clerkUserId),
              eq(organizationUsers.organizationId, selectedScopeId)
            )
          )
          .limit(1);
if (userTenant.length > 0) {
return selectedScopeId;
        } else {
}
      }
      
      // Fall back to user's first available tenant
      const userTenants = await dbOrTx
        .select({ organizationId: organizationUsers.organizationId })
        .from(organizationUsers)
        .where(eq(organizationUsers.userId, clerkUserId))
        .limit(1);
      
      if (userTenants.length > 0) {
return userTenants[0].organizationId;
      }
      
      // Final fallback to default tenant
      const tenantId = DEFAULT_TENANT_ID;
// Validate that tenant exists
      const tenant = await dbOrTx
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);
      
      if (tenant.length === 0) {
        throw new Error(`Tenant ${tenantId} not found. Run database migrations to seed default tenant.`);
      }
      
      return tenantId;
    } catch (error) {
throw error;
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
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
 * @param tx - Optional transaction context for RLS enforcement
 * @returns True if tenant exists, false otherwise
 */
/**
 * @deprecated Use validateOrganizationExists instead. This function remains for backward compatibility.
 */
export async function validateTenantExists(
  tenantId: string,
  tx?: NodePgDatabase<any>
): Promise<boolean> {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      const result = await dbOrTx
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
return false;
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
}

/**
 * Get tenant information for a user.
 * 
 * Future Enhancement: This will return full tenant details including
 * subscription tier, features, settings, etc.
 * 
 * @param clerkUserId - The Clerk user ID
 * @param tx - Optional transaction context for RLS enforcement
 * @returns Tenant information
 */
/**
 * @deprecated Use getOrganizationInfo instead. This function remains for backward compatibility.
 */
export async function getTenantInfo(
  clerkUserId: string,
  tx?: NodePgDatabase<any>
) {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    const tenantId = await getTenantIdForUser(clerkUserId, dbOrTx);
    
    const result = await dbOrTx
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);
    
    if (result.length === 0) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    
    return result[0];
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
}

/**
 * Get the organization ID for a given Clerk user ID.
 *
 * Legacy implementation backed by organization_users and tenants tables.
 * This will be migrated to organizations in a later phase.
 */
export async function getOrganizationIdForUser(
  clerkUserId: string,
  tx?: NodePgDatabase<any>
): Promise<string> {
  return getTenantIdForUser(clerkUserId, tx);
}

/**
 * Get the default organization ID (legacy tenant ID).
 */
export function getDefaultOrganizationId(): string {
  return getDefaultTenantId();
}

/**
 * Validate that an organization exists (legacy tenants table).
 */
export async function validateOrganizationExists(
  organizationId: string,
  tx?: NodePgDatabase<any>
): Promise<boolean> {
  return validateTenantExists(organizationId, tx);
}

/**
 * Get organization info for a user (legacy tenants table).
 */
export async function getOrganizationInfo(
  clerkUserId: string,
  tx?: NodePgDatabase<any>
) {
  return getTenantInfo(clerkUserId, tx);
}

