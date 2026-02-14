/**
 * Tests for lib\auth\permissions.ts
 * Tests role-based permission checking and authorization logic
 */

import { describe, it, expect } from 'vitest';
import { 
  roleHasPermission, 
  anyRoleHasPermission, 
  getPermissionsForRole, 
  getPermissionsForRoles
} from '@/lib/auth/permissions';
import { UserRole, Permission } from '@/lib/auth/roles';

describe('permissions', () => {
  describe('roleHasPermission', () => {
    it('returns true when role has the permission', () => {
      expect(roleHasPermission(UserRole.ADMIN, Permission.MANAGE_MEMBERS)).toBe(true);
      expect(roleHasPermission(UserRole.ADMIN, Permission.VIEW_ALL_CLAIMS)).toBe(true);
    });

    it('returns false when role does not have the permission', () => {
      expect(roleHasPermission(UserRole.MEMBER, Permission.MANAGE_MEMBERS)).toBe(false);
      expect(roleHasPermission(UserRole.MEMBER, Permission.DELETE_CLAIM)).toBe(false);
    });

    it('handles all role types correctly', () => {
      // CLC roles
      expect(roleHasPermission(UserRole.CLC_EXECUTIVE, Permission.VIEW_ALL_MEMBERS)).toBe(true);
      
      // Federation roles
      expect(roleHasPermission(UserRole.FED_EXECUTIVE, Permission.VIEW_ALL_CLAIMS)).toBe(true);
      
      // Union officer roles
      expect(roleHasPermission(UserRole.PRESIDENT, Permission.APPROVE_CLAIM)).toBe(true);
      
      // Member role - minimal permissions
      expect(roleHasPermission(UserRole.MEMBER, Permission.VIEW_OWN_PROFILE)).toBe(true);
    });
  });

  describe('anyRoleHasPermission', () => {
    it('returns true when any role has the permission', () => {
      const roles = [UserRole.MEMBER, UserRole.STEWARD, UserRole.ADMIN];
      expect(anyRoleHasPermission(roles, Permission.VIEW_ALL_CLAIMS)).toBe(true);
    });

    it('returns false when no roles have the permission', () => {
      const roles = [UserRole.MEMBER, UserRole.STEWARD];
      expect(anyRoleHasPermission(roles, Permission.DELETE_MEMBER)).toBe(false);
    });

    it('handles empty role array', () => {
      expect(anyRoleHasPermission([], Permission.VIEW_OWN_PROFILE)).toBe(false);
    });

    it('handles single role array', () => {
      expect(anyRoleHasPermission([UserRole.ADMIN], Permission.MANAGE_MEMBERS)).toBe(true);
    });
  });

  describe('getPermissionsForRole', () => {
    it('returns all permissions for admin role', () => {
      const permissions = getPermissionsForRole(UserRole.ADMIN);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain(Permission.VIEW_ALL_MEMBERS);
      expect(permissions).toContain(Permission.MANAGE_MEMBERS);
    });

    it('returns limited permissions for member role', () => {
      const permissions = getPermissionsForRole(UserRole.MEMBER);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toContain(Permission.VIEW_OWN_PROFILE);
      expect(permissions).not.toContain(Permission.DELETE_MEMBER);
    });

    it('returns permissions for steward role', () => {
      const permissions = getPermissionsForRole(UserRole.STEWARD);
      expect(permissions).toContain(Permission.CREATE_CLAIM);
      expect(permissions).toContain(Permission.VIEW_ALL_CLAIMS);
    });

    it('returns empty array for invalid role', () => {
      const permissions = getPermissionsForRole('invalid_role' as UserRole);
      expect(permissions).toEqual([]);
    });
  });

  describe('getPermissionsForRoles', () => {
    it('combines permissions from multiple roles', () => {
      const roles = [UserRole.MEMBER, UserRole.STEWARD];
      const permissions = getPermissionsForRoles(roles);
      
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toContain(Permission.VIEW_OWN_PROFILE); // From MEMBER
      expect(permissions).toContain(Permission.CREATE_CLAIM); // From STEWARD
    });

    it('deduplicates permissions from multiple roles', () => {
      const roles = [UserRole.STEWARD, UserRole.OFFICER];
      const permissions = getPermissionsForRoles(roles);
      
      const uniquePermissions = new Set(permissions);
      expect(permissions.length).toBe(uniquePermissions.size);
    });

    it('handles empty role array', () => {
      const permissions = getPermissionsForRoles([]);
      expect(permissions).toEqual([]);
    });

    it('handles single role', () => {
      const permissions = getPermissionsForRoles([UserRole.ADMIN]);
      expect(permissions.length).toBeGreaterThan(0);
    });
  });
});
