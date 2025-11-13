/**
 * @fileoverview Role-Based Access Control (RBAC) System
 * 
 * Defines roles, permissions, and access control logic for CourtLens platform.
 */

// =========================================================================
// TYPES
// =========================================================================

export type UserRole = 
  | 'super_admin'
  | 'org_admin'
  | 'lawyer'
  | 'paralegal'
  | 'support_staff'
  | 'client';

export type Permission = 
  // Matter permissions
  | 'matters:read'
  | 'matters:write'
  | 'matters:delete'
  | 'matters:assign'
  // Client permissions
  | 'clients:read'
  | 'clients:write'
  | 'clients:delete'
  | 'clients:export'
  // Document permissions
  | 'documents:read'
  | 'documents:write'
  | 'documents:delete'
  | 'documents:share'
  // Billing permissions
  | 'billing:read'
  | 'billing:write'
  | 'billing:approve'
  | 'billing:export'
  // Time tracking permissions
  | 'time:read'
  | 'time:write'
  | 'time:approve'
  // Report permissions
  | 'reports:read'
  | 'reports:generate'
  | 'reports:export'
  // Admin permissions
  | 'admin:access'
  | 'admin:users'
  | 'admin:settings'
  | 'admin:audit'
  // Settings permissions
  | 'settings:manage'
  | 'settings:integrations'
  | 'settings:security';

export interface RoleDefinition {
  role: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: UserRole[];
}

// =========================================================================
// ROLE DEFINITIONS
// =========================================================================

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    name: 'Super Administrator',
    description: 'Full platform access across all organizations',
    permissions: [
      // All permissions
      'matters:read', 'matters:write', 'matters:delete', 'matters:assign',
      'clients:read', 'clients:write', 'clients:delete', 'clients:export',
      'documents:read', 'documents:write', 'documents:delete', 'documents:share',
      'billing:read', 'billing:write', 'billing:approve', 'billing:export',
      'time:read', 'time:write', 'time:approve',
      'reports:read', 'reports:generate', 'reports:export',
      'admin:access', 'admin:users', 'admin:settings', 'admin:audit',
      'settings:manage', 'settings:integrations', 'settings:security',
    ],
  },

  org_admin: {
    role: 'org_admin',
    name: 'Organization Administrator',
    description: 'Full access within organization',
    permissions: [
      'matters:read', 'matters:write', 'matters:delete', 'matters:assign',
      'clients:read', 'clients:write', 'clients:delete', 'clients:export',
      'documents:read', 'documents:write', 'documents:delete', 'documents:share',
      'billing:read', 'billing:write', 'billing:approve', 'billing:export',
      'time:read', 'time:write', 'time:approve',
      'reports:read', 'reports:generate', 'reports:export',
      'admin:access', 'admin:users', 'admin:settings',
      'settings:manage', 'settings:integrations',
    ],
  },

  lawyer: {
    role: 'lawyer',
    name: 'Lawyer',
    description: 'Full access to assigned matters and clients',
    permissions: [
      'matters:read', 'matters:write', 'matters:assign',
      'clients:read', 'clients:write',
      'documents:read', 'documents:write', 'documents:share',
      'billing:read', 'billing:write',
      'time:read', 'time:write',
      'reports:read', 'reports:generate',
    ],
  },

  paralegal: {
    role: 'paralegal',
    name: 'Paralegal',
    description: 'Access to assigned matters, limited client access',
    permissions: [
      'matters:read', 'matters:write',
      'clients:read',
      'documents:read', 'documents:write',
      'billing:read',
      'time:read', 'time:write',
      'reports:read',
    ],
  },

  support_staff: {
    role: 'support_staff',
    name: 'Support Staff',
    description: 'Limited access for administrative tasks',
    permissions: [
      'matters:read',
      'clients:read',
      'documents:read',
      'billing:read',
      'time:read',
    ],
  },

  client: {
    role: 'client',
    name: 'Client',
    description: 'View-only access to own matters and documents',
    permissions: [
      'matters:read',
      'documents:read',
      'billing:read',
    ],
  },
};

// =========================================================================
// RBAC CLASS
// =========================================================================

export class RBAC {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: UserRole, permission: Permission): boolean {
    const roleDefinition = ROLE_DEFINITIONS[role];
    if (!roleDefinition) return false;

    // Check direct permissions
    if (roleDefinition.permissions.includes(permission)) {
      return true;
    }

    // Check inherited permissions
    if (roleDefinition.inherits) {
      return roleDefinition.inherits.some(inheritedRole => 
        this.hasPermission(inheritedRole, permission)
      );
    }

    return false;
  }

  /**
   * Check if a role has any of the specified permissions
   */
  static hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  /**
   * Check if a role has all of the specified permissions
   */
  static hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  /**
   * Get all permissions for a role
   */
  static getPermissions(role: UserRole): Permission[] {
    const roleDefinition = ROLE_DEFINITIONS[role];
    if (!roleDefinition) return [];

    const permissions = new Set(roleDefinition.permissions);

    // Add inherited permissions
    if (roleDefinition.inherits) {
      roleDefinition.inherits.forEach(inheritedRole => {
        this.getPermissions(inheritedRole).forEach(permission => 
          permissions.add(permission)
        );
      });
    }

    return Array.from(permissions);
  }

  /**
   * Get role definition
   */
  static getRoleDefinition(role: UserRole): RoleDefinition | undefined {
    return ROLE_DEFINITIONS[role];
  }

  /**
   * Get all role definitions
   */
  static getAllRoles(): RoleDefinition[] {
    return Object.values(ROLE_DEFINITIONS);
  }

  /**
   * Check if a role can perform an action on a resource
   */
  static canPerformAction(
    role: UserRole,
    action: 'read' | 'write' | 'delete' | 'approve' | 'assign',
    resource: 'matters' | 'clients' | 'documents' | 'billing' | 'time' | 'reports' | 'admin' | 'settings'
  ): boolean {
    const permission = `${resource}:${action}` as Permission;
    return this.hasPermission(role, permission);
  }

  /**
   * Get role hierarchy level (higher number = more permissions)
   */
  static getRoleLevel(role: UserRole): number {
    const levels: Record<UserRole, number> = {
      super_admin: 6,
      org_admin: 5,
      lawyer: 4,
      paralegal: 3,
      support_staff: 2,
      client: 1,
    };
    return levels[role] || 0;
  }

  /**
   * Check if roleA has more permissions than roleB
   */
  static isHigherRole(roleA: UserRole, roleB: UserRole): boolean {
    return this.getRoleLevel(roleA) > this.getRoleLevel(roleB);
  }

  /**
   * Filter permissions based on role
   */
  static filterPermissions(role: UserRole, requestedPermissions: Permission[]): Permission[] {
    const rolePermissions = this.getPermissions(role);
    return requestedPermissions.filter(permission => 
      rolePermissions.includes(permission)
    );
  }
}

// =========================================================================
// EXPORTS
// =========================================================================

// Re-export HOCs from separate file (hocs.tsx)
export { withPermission, withRole } from './hocs';

export default RBAC;
