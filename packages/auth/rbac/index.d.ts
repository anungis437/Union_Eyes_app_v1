/**
 * @fileoverview Role-Based Access Control (RBAC) System
 *
 * Defines roles, permissions, and access control logic for CourtLens platform.
 */
export type UserRole = 'super_admin' | 'org_admin' | 'lawyer' | 'paralegal' | 'support_staff' | 'client';
export type Permission = 'matters:read' | 'matters:write' | 'matters:delete' | 'matters:assign' | 'clients:read' | 'clients:write' | 'clients:delete' | 'clients:export' | 'documents:read' | 'documents:write' | 'documents:delete' | 'documents:share' | 'billing:read' | 'billing:write' | 'billing:approve' | 'billing:export' | 'time:read' | 'time:write' | 'time:approve' | 'reports:read' | 'reports:generate' | 'reports:export' | 'admin:access' | 'admin:users' | 'admin:settings' | 'admin:audit' | 'settings:manage' | 'settings:integrations' | 'settings:security';
export interface RoleDefinition {
    role: UserRole;
    name: string;
    description: string;
    permissions: Permission[];
    inherits?: UserRole[];
}
export declare const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition>;
export declare class RBAC {
    /**
     * Check if a role has a specific permission
     */
    static hasPermission(role: UserRole, permission: Permission): boolean;
    /**
     * Check if a role has any of the specified permissions
     */
    static hasAnyPermission(role: UserRole, permissions: Permission[]): boolean;
    /**
     * Check if a role has all of the specified permissions
     */
    static hasAllPermissions(role: UserRole, permissions: Permission[]): boolean;
    /**
     * Get all permissions for a role
     */
    static getPermissions(role: UserRole): Permission[];
    /**
     * Get role definition
     */
    static getRoleDefinition(role: UserRole): RoleDefinition | undefined;
    /**
     * Get all role definitions
     */
    static getAllRoles(): RoleDefinition[];
    /**
     * Check if a role can perform an action on a resource
     */
    static canPerformAction(role: UserRole, action: 'read' | 'write' | 'delete' | 'approve' | 'assign', resource: 'matters' | 'clients' | 'documents' | 'billing' | 'time' | 'reports' | 'admin' | 'settings'): boolean;
    /**
     * Get role hierarchy level (higher number = more permissions)
     */
    static getRoleLevel(role: UserRole): number;
    /**
     * Check if roleA has more permissions than roleB
     */
    static isHigherRole(roleA: UserRole, roleB: UserRole): boolean;
    /**
     * Filter permissions based on role
     */
    static filterPermissions(role: UserRole, requestedPermissions: Permission[]): Permission[];
}
export { withPermission, withRole } from './hocs';
export default RBAC;
//# sourceMappingURL=index.d.ts.map