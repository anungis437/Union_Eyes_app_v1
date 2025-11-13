/**
 * @fileoverview JWT Claims Management
 * 
 * Utilities for populating and managing JWT claims for RLS policies.
 * After user profile is created/updated, JWT claims must be set for
 * JWT-based RLS policies to work correctly.
 */

import { getSupabaseClient } from '@unioneyes/supabase';
import type { UserRole, Permission } from '../rbac';

// =========================================================================
// TYPES
// =========================================================================

export interface JWTClaims {
  role: UserRole;
  organization_id: string;
  permissions: Permission[];
}

// =========================================================================
// JWT CLAIMS UTILITIES
// =========================================================================

/**
 * Update user JWT claims in their auth metadata
 * This is called after creating or updating a user profile
 * 
 * @param userId - The user's ID
 * @param claims - The claims to set (role, organization_id, permissions)
 * @returns Promise<void>
 */
export const updateUserJWTClaims = async (
  userId: string,
  claims: JWTClaims
): Promise<{ error: Error | null }> => {
  try {
    const supabase = getSupabaseClient();

    // Update the user's app_metadata with the JWT claims
    // Note: This requires service_role access for auth.admin.updateUserById
    // For now, we'll update the user's metadata which gets included in JWT
    const { error } = await supabase.auth.updateUser({
      data: {
        role: claims.role,
        organization_id: claims.organization_id,
        permissions: claims.permissions,
      },
    });

    if (error) throw error;

    console.log('✅ JWT claims updated for user:', userId, claims);
    return { error: null };
  } catch (error) {
    console.error('❌ Error updating JWT claims:', error);
    return { error: error as Error };
  }
};

/**
 * Fetch user profile and populate JWT claims
 * This is called during sign-in to ensure JWT has latest claims
 * 
 * @param userId - The user's ID
 * @returns Promise with claims or error
 */
export const populateJWTClaimsFromProfile = async (
  userId: string
): Promise<{ claims: JWTClaims | null; error: Error | null }> => {
  try {
    const supabase = getSupabaseClient();

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, organization_id, permissions')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    if (!profile) {
      throw new Error('User profile not found');
    }

    const claims: JWTClaims = {
      role: (profile as any).role as UserRole,
      organization_id: (profile as any).organization_id,
      permissions: (profile as any).permissions as Permission[],
    };

    // Update JWT with these claims
    const { error: updateError } = await updateUserJWTClaims(userId, claims);
    
    if (updateError) throw updateError;

    return { claims, error: null };
  } catch (error) {
    console.error('❌ Error populating JWT claims:', error);
    return { claims: null, error: error as Error };
  }
};

/**
 * Create user profile with JWT claims
 * This is called during sign-up
 * 
 * @param userId - The user's ID
 * @param role - The user's role
 * @param organizationId - The user's organization ID
 * @param permissions - The user's permissions (optional, defaults by role)
 * @returns Promise with success/error
 */
export const createUserProfileWithClaims = async (
  userId: string,
  role: UserRole,
  organizationId: string,
  permissions?: Permission[]
): Promise<{ error: Error | null }> => {
  try {
    const supabase = getSupabaseClient();

    // Default permissions based on role if not provided
    const defaultPermissions: Record<UserRole, Permission[]> = {
      super_admin: [
        'matters:read', 'matters:write', 'matters:delete', 'matters:assign',
        'clients:read', 'clients:write', 'clients:delete', 'clients:export',
        'documents:read', 'documents:write', 'documents:delete', 'documents:share',
        'billing:read', 'billing:write', 'billing:approve', 'billing:export',
        'admin:access', 'admin:users', 'admin:settings', 'admin:audit',
      ],
      org_admin: [
        'matters:read', 'matters:write', 'matters:delete', 'matters:assign',
        'clients:read', 'clients:write', 'clients:delete', 'clients:export',
        'documents:read', 'documents:write', 'documents:delete', 'documents:share',
        'billing:read', 'billing:write', 'billing:approve', 'billing:export',
        'admin:access', 'admin:users', 'admin:settings',
      ],
      lawyer: [
        'matters:read', 'matters:write', 'matters:assign',
        'clients:read', 'clients:write',
        'documents:read', 'documents:write', 'documents:share',
        'billing:read', 'billing:write',
        'time:read', 'time:write',
      ],
      paralegal: [
        'matters:read', 'matters:write',
        'clients:read',
        'documents:read', 'documents:write',
        'time:read', 'time:write',
      ],
      support_staff: [
        'matters:read',
        'clients:read',
        'documents:read',
        'time:read',
      ],
      client: [
        'matters:read',
        'documents:read',
      ],
    };

    const userPermissions = permissions || defaultPermissions[role] || ['matters:read'];

    // Create user profile
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        role,
        organization_id: organizationId,
        permissions: userPermissions,
        is_active: true,
      } as any);

    if (insertError) throw insertError;

    // Update JWT claims
    const claims: JWTClaims = {
      role,
      organization_id: organizationId,
      permissions: userPermissions,
    };

    const { error: claimsError } = await updateUserJWTClaims(userId, claims);
    
    if (claimsError) throw claimsError;

    console.log('✅ User profile created with JWT claims:', userId);
    return { error: null };
  } catch (error) {
    console.error('❌ Error creating user profile with claims:', error);
    return { error: error as Error };
  }
};

/**
 * Refresh JWT claims from current session
 * Call this after updating a user's role or permissions
 * 
 * @returns Promise<void>
 */
export const refreshJWTClaims = async (): Promise<{ error: Error | null }> => {
  try {
    const supabase = getSupabaseClient();

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    if (!session?.user) {
      throw new Error('No active session');
    }

    // Refresh claims from profile
    const { error } = await populateJWTClaimsFromProfile(session.user.id);
    
    if (error) throw error;

    // Refresh the session to get new JWT
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) throw refreshError;

    console.log('✅ JWT claims refreshed');
    return { error: null };
  } catch (error) {
    console.error('❌ Error refreshing JWT claims:', error);
    return { error: error as Error };
  }
};
