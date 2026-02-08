/**
 * Auth compatibility layer
 * Provides unified authentication functions using Clerk
 * 
 * Exports:
 * - getCurrentUser: Get authenticated user with full profile
 * - getServerSession: next-auth compatible session wrapper
 * - getUserFromRequest: Extract user from request context
 * - authOptions: Placeholder for next-auth compatibility
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

/**
 * Union Role Hierarchy Levels
 * Defines permission levels for user roles in descending order of authority
 * 
 * ALIGNED WITH DATABASE: These roles match the member_role enum in PostgreSQL:
 * - admin: Highest organizational role (100)
 * - officer: Management level, similar to admin authority (80)
 * - steward: Shop steward or representative (60)
 * - member: Regular union member (40)
 * 
 * For system-level admin (super admin), use isSystemAdmin() function
 * which checks the is_system_admin column in users table.
 */
export const ROLE_HIERARCHY = {
  admin: 100,    // Organizational admin
  officer: 80,   // Officer/management level
  steward: 60,   // Shop steward
  member: 40,    // Regular member
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

/**
 * Legacy role mappings for backward compatibility
 * @deprecated Use aligned roles: admin, officer, steward, member
 */
export const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  'super_admin': 'admin',  // Maps to admin + is_system_admin flag
  'guest': 'member',       // Maps to member with limited permissions
} as const;

// User type for consistent return structure
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  tenantId: string | null;
  role: string | null;
  organizationId: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Get current authenticated user
 * Primary auth function used throughout the application
 * Returns full user profile or null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return null;
    }

    const user = await currentUser();
    
    if (!user) {
      return null;
    }

    // Extract tenant/org info from metadata or session
    const publicMetadata = user.publicMetadata || {};
    const privateMetadata = user.privateMetadata || {};

    return {
      id: userId,
      email: user.emailAddresses?.[0]?.emailAddress || null,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      imageUrl: user.imageUrl || null,
      tenantId: (publicMetadata.tenantId as string) || (privateMetadata.tenantId as string) || orgId || null,
      role: (publicMetadata.role as string) || (privateMetadata.role as string) || 'member',
      organizationId: orgId || null,
      metadata: { ...publicMetadata },
    };
  } catch (error) {
    console.error('[Auth] Error getting current user:', error);
    return null;
  }
}

/**
 * Get server session (Clerk-compatible wrapper)
 * Returns a next-auth-like session object from Clerk
 */
export async function getServerSession(options?: typeof authOptions) {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  // Return a session object compatible with next-auth structure
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.imageUrl,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  };
}

/**
 * Get user from request
 * Extracts user information from Clerk auth session
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  return getCurrentUser();
}

/**
 * Require authentication - throws if not authenticated
 * Useful for API routes that must have authenticated users
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Authenticated user with guaranteed tenantId
 */
export interface AuthUserWithTenant extends AuthUser {
  tenantId: string;
}

/**
 * Require authentication with tenant - throws if not authenticated or no tenant
 * Useful for API routes that require multi-tenant context
 */
export async function requireAuthWithTenant(): Promise<AuthUserWithTenant> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  if (!user.tenantId) {
    throw new Error('Tenant context required');
  }
  
  return user as AuthUserWithTenant;
}

/**
 * Check if user has specific role
 * Uses role hierarchy where higher-level roles inherit permissions of lower-level roles
 * Automatically handles legacy role mappings for backward compatibility
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // Normalize roles to handle legacy mappings
  const normalizedUserRole = normalizeRole(user.role || 'member');
  const normalizedRequiredRole = normalizeRole(requiredRole);
  
  const userRoleLevel = ROLE_HIERARCHY[normalizedUserRole as UserRole] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[normalizedRequiredRole as UserRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Normalize role string to aligned database enum value
 * Handles legacy role names for backward compatibility
 * 
 * @param role - Role string (may be legacy)
 * @returns Normalized role matching database enum
 * 
 * @example
 * normalizeRole('super_admin') // Returns 'admin'
 * normalizeRole('guest') // Returns 'member'
 * normalizeRole('admin') // Returns 'admin'
 */
export function normalizeRole(role: string): UserRole {
  // Check if it's a legacy role
  if (role in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[role as keyof typeof LEGACY_ROLE_MAP];
  }
  
  // Check if it's a valid current role
  if (role in ROLE_HIERARCHY) {
    return role as UserRole;
  }
  
  // Default to member
  return 'member';
}

/**
 * Check if user is a system administrator
 * System admins have elevated privileges across all organizations.
 * This checks the is_system_admin column in user_management.users table.
 * 
 * Use this instead of checking for 'super_admin' role.
 * 
 * @param userId - User ID to check (defaults to current user)
 * @returns Promise<boolean>
 * 
 * @example
 * if (await isSystemAdmin()) {
 *   // Allow system-wide operations
 * }
 */
export async function isSystemAdmin(userId?: string): Promise<boolean> {
  try {
    const targetUserId = userId || (await getCurrentUser())?.id;
    
    if (!targetUserId) {
      return false;
    }
    
    // Import db here to avoid circular dependencies
    const { db } = await import('@/db/db');
    const { users } = await import('@/db/schema/user-management-schema');
    const { eq } = await import('drizzle-orm');
    
    const user = await db.query.users.findFirst({
      where: eq(users.userId, targetUserId),
      columns: { isSystemAdmin: true },
    });
    
    return user?.isSystemAdmin ?? false;
  } catch (error) {
    console.error('[Auth] Error checking system admin status:', error);
    return false;
  }
}

/**
 * Require system admin privileges
 * Throws error if user is not a system administrator
 * 
 * @throws Error if not system admin
 * 
 * @example
 * export async function DELETE(req: Request) {
 *   await requireSystemAdmin();
 *   // Proceed with system-level operation
 * }
 */
export async function requireSystemAdmin(): Promise<void> {
  const isAdmin = await isSystemAdmin();
  
  if (!isAdmin) {
    throw new Error('System administrator privileges required');
  }
}

/**
 * Check if user has specific role within a specific organization
 * More granular than hasRole() - checks organization membership
 * 
 * @param organizationId - Organization ID to check
 * @param requiredRole - Required role level
 * @returns Promise<boolean>
 * 
 * @example
 * if (await hasRoleInOrganization(orgId, 'admin')) {
 *   // User is admin in this specific organization
 * }
 */
export async function hasRoleInOrganization(
  organizationId: string,
  requiredRole: string
): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    // Import db here to avoid circular dependencies
    const { db } = await import('@/db/db');
    const { organizationMembers } = await import('@/db/schema/organization-management-schema');
    const { eq, and } = await import('drizzle-orm');
    
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.tenantId, organizationId),
        eq(organizationMembers.status, 'active')
      ),
      columns: { role: true },
    });
    
    if (!membership) return false;
    
    // Normalize roles
    const normalizedUserRole = normalizeRole(membership.role);
    const normalizedRequiredRole = normalizeRole(requiredRole);
    
    const userRoleLevel = ROLE_HIERARCHY[normalizedUserRole as UserRole] || 0;
    const requiredRoleLevel = ROLE_HIERARCHY[normalizedRequiredRole as UserRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  } catch (error) {
    console.error('[Auth] Error checking organization role:', error);
    return false;
  }
}
