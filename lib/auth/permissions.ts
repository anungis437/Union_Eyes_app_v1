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
 * Check if a user has required permissions
 * This is a stub - actual implementation should query user's role from database
 */
export async function checkUserPermission(options: PermissionCheckOptions): Promise<boolean> {
  // TODO: Implement actual permission check by:
  // 1. Fetch user's role from database
  // 2. Check if role has required permission
  // 3. Consider organization-specific overrides
  console.warn('checkUserPermission is a stub - implement actual logic');
  return false;
}

/**
 * Check if a user has required role
 * This is a stub - actual implementation should query user's role from database
 */
export async function checkUserRole(options: RoleCheckOptions): Promise<boolean> {
  // TODO: Implement actual role check by:
  // 1. Fetch user's role from database
  // 2. Check if user has any of the required roles
  // 3. Consider organization-specific role assignments
  console.warn('checkUserRole is a stub - implement actual logic');
  return false;
}

/**
 * Re-export permission system
 */
export { UserRole, Permission, ROLE_PERMISSIONS };
