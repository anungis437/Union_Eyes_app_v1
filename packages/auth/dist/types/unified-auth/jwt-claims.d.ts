/**
 * @fileoverview JWT Claims Management
 *
 * Utilities for populating and managing JWT claims for RLS policies.
 * After user profile is created/updated, JWT claims must be set for
 * JWT-based RLS policies to work correctly.
 */
import type { UserRole, Permission } from '../rbac';
export interface JWTClaims {
    role: UserRole;
    organization_id: string;
    permissions: Permission[];
}
/**
 * Update user JWT claims in their auth metadata
 * This is called after creating or updating a user profile
 *
 * @param userId - The user's ID
 * @param claims - The claims to set (role, organization_id, permissions)
 * @returns Promise<void>
 */
export declare const updateUserJWTClaims: (userId: string, claims: JWTClaims) => Promise<{
    error: Error | null;
}>;
/**
 * Fetch user profile and populate JWT claims
 * This is called during sign-in to ensure JWT has latest claims
 *
 * @param userId - The user's ID
 * @returns Promise with claims or error
 */
export declare const populateJWTClaimsFromProfile: (userId: string) => Promise<{
    claims: JWTClaims | null;
    error: Error | null;
}>;
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
export declare const createUserProfileWithClaims: (userId: string, role: UserRole, organizationId: string, permissions?: Permission[]) => Promise<{
    error: Error | null;
}>;
/**
 * Refresh JWT claims from current session
 * Call this after updating a user's role or permissions
 *
 * @returns Promise<void>
 */
export declare const refreshJWTClaims: () => Promise<{
    error: Error | null;
}>;
//# sourceMappingURL=jwt-claims.d.ts.map