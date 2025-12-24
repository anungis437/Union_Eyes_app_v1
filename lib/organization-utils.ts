/**
 * Organization Utilities
 * 
 * Helper functions for organization management and resolution.
 * Supports hierarchical multi-tenancy with organizations.
 */

import { db } from "@/db/db";
import { organizations, organizationMembers } from "@/db/schema-organizations";
import { eq, and } from "drizzle-orm";
import { cookies } from "next/headers";

/**
 * Default organization ID used for system operations
 */
export const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Get the organization ID for a given user ID.
 * 
 * Priority order:
 * 1. Selected organization from cookie
 * 2. User's primary organization
 * 3. User's first available organization
 * 4. Default organization (fallback)
 * 
 * @param userId - The Clerk user ID (from auth())
 * @returns The organization ID UUID string
 * @throws Error if no organization found
 */
export async function getOrganizationIdForUser(userId: string): Promise<string> {
  try {
    // Check if user has selected a specific organization via cookie (uses slug)
    const cookieStore = await cookies();
    const selectedOrgSlug = cookieStore.get("active-organization")?.value;
    
    if (selectedOrgSlug) {
      // Look up organization by slug to get UUID
      const org = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, selectedOrgSlug))
        .limit(1);
      
      if (org.length > 0) {
        // Check if user is a super admin (has admin role in default org)
        const isSuperAdmin = await db
          .select({ role: organizationMembers.role })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.organizationId, DEFAULT_ORGANIZATION_ID)
            )
          )
          .limit(1);
        
        const hasAdminAccess = isSuperAdmin.length > 0 && 
          (isSuperAdmin[0].role === 'admin' || isSuperAdmin[0].role === 'super_admin');
        
        // If super admin, grant access to all organizations
        if (hasAdminAccess) {
          return org[0].id;
        }
        
        // Otherwise, verify user has explicit membership in this organization
        const userOrg = await db
          .select({ tenantId: organizationMembers.organizationId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.organizationId, org[0].id)
            )
          )
          .limit(1);
        
        if (userOrg.length > 0) {
          return org[0].id;
        }
      }
    }
    
    // Get user's first organization (primary/default) - return UUID
    const userOrgs = await db
      .select({ tenantId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);
    
    if (userOrgs.length > 0 && userOrgs[0].tenantId) {
      return userOrgs[0].tenantId;
    }
    
    // Final fallback to default organization
    const organizationId = DEFAULT_ORGANIZATION_ID;
    
    // Validate that organization exists
    const org = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    if (org.length === 0) {
      throw new Error(`Organization ${organizationId} not found. Run database migrations to seed organizations.`);
    }
    
    return organizationId;
  } catch (error) {
    console.error(`Error resolving organization for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get the default organization ID.
 * 
 * Use this function when you need an organization ID but don't have a user context,
 * such as in background jobs or system operations.
 * 
 * @returns The default organization ID
 */
export function getDefaultOrganizationId(): string {
  return DEFAULT_ORGANIZATION_ID;
}

/**
 * Validate that an organization exists in the database.
 * 
 * @param organizationId - The organization ID to validate
 * @returns True if the organization exists, false otherwise
 */
export async function validateOrganizationExists(organizationId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error(`Error validating organization ${organizationId}:`, error);
    return false;
  }
}

/**
 * Get basic organization information.
 * 
 * @param organizationId - The organization ID
 * @returns Organization info or null if not found
 */
export async function getOrganizationInfo(organizationId: string) {
  try {
    const result = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.organizationType,
        parentId: organizations.parentId,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error(`Error fetching organization info for ${organizationId}:`, error);
    return null;
  }
}

/**
 * Check if a user has access to a specific organization.
 * 
 * @param userId - The Clerk user ID
 * @param organizationId - The organization ID to check
 * @returns True if the user has access, false otherwise
 */
export async function userHasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const result = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking organization access:`, error);
    return false;
  }
}
