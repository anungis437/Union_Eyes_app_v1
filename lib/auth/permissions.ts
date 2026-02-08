/**
 * Permission Matrix & Authorization Utilities
 * Re-exports and augments the permission system from roles.ts
 */

import { UserRole, Permission, ROLE_PERMISSIONS } from './roles';
import type { PermissionCheckOptions, RoleCheckOptions } from './types';

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.includes(permission);
}

/**
 * Check if any of the given roles have a specific permission
 */
export function anyRoleHasPermission(roles: UserRole[], permission: Permission): boolean {
  return roles.some(role => roleHasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get all permissions for multiple roles (union)
 */
export function getPermissionsForRoles(roles: UserRole[]): Permission[] {
  const permissionSet = new Set<Permission>();
  roles.forEach(role => {
    const permissions = getPermissionsForRole(role);
    permissions.forEach(p => permissionSet.add(p));
  });
  return Array.from(permissionSet);
}

/**
 * @deprecated Use withPermission() from lib/enterprise-role-middleware.ts instead
 * This function is deprecated and will be removed in a future version.
 * 
 * MIGRATION GUIDE:
 * Replace: checkUserPermission({ userId, organizationId, permission: 'MANAGE_MEMBERS' })
 * With: withPermission('MANAGE_MEMBERS', async (request, context) => { ... })
 * 
 * Check if a user has required permissions
 * This is a stub - actual implementation should query user's role from database
 */
export async function checkUserPermission(options: PermissionCheckOptions): Promise<boolean> {
  // TODO: Implement actual permission check by:
  // 1. Fetch user's role from database
  // 2. Check if role has required permission
  // 3. Consider organization-specific overrides
  console.warn(
    'checkUserPermission is deprecated. Use withPermission() from lib/enterprise-role-middleware.ts instead. ' +
    'This stub always returns false and should not be used in production.'
  );
  return false;
}

/**
 * @deprecated Use withEnhancedRoleAuth() from lib/enterprise-role-middleware.ts instead
 * This function is deprecated and will be removed in a future version.
 * 
 * MIGRATION GUIDE:
 * Replace: checkUserRole({ userId, organizationId, role: 'admin' })
 * With: withEnhancedRoleAuth(ROLE_LEVELS.ADMIN, async (request, context) => { ... })
 * 
 * Check if a user has required role
 * This is a stub - actual implementation should query user's role from database
 */
export async function checkUserRole(options: RoleCheckOptions): Promise<boolean> {
  // TODO: Implement actual role check by:
  // 1. Fetch user's role from database
  // 2. Check if user has any of the required roles
  // 3. Consider organization-specific role assignments
  console.warn(
    'checkUserRole is deprecated. Use withEnhancedRoleAuth() from lib/enterprise-role-middleware.ts instead. ' +
    'This stub always returns false and should not be used in production.'
  );
  return false;
}

/**
 * Re-export permission system
 */
export { UserRole, Permission, ROLE_PERMISSIONS };
