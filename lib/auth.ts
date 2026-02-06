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
 */
export const ROLE_HIERARCHY = {
  super_admin: 100,
  admin: 80,
  steward: 60,
  member: 40,
  guest: 20,
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

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
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const userRoleLevel = ROLE_HIERARCHY[user.role as UserRole] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole as UserRole] || 0;
  
  return userRoleLevel >= requiredRoleLevel;
}
