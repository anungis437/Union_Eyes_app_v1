/**
 * @fileoverview RBAC Higher-Order Components
 * 
 * React HOCs for permission and role-based component rendering.
 */

import React from 'react';
import type { Permission, UserRole } from './index';

/**
 * Higher-Order Component for permission-based rendering
 * 
 * @example
 * ```tsx
 * const ProtectedComponent = withPermission('matters:write')(MyComponent);
 * ```
 */
export function withPermission(permission: Permission) {
  return function<P extends object>(Component: React.ComponentType<P>) {
    return function PermissionWrapper(props: P) {
      // This would use the useAuth hook to check permissions
      // Implementation will be added when integrating with AuthProvider
      // For now, returning the component as-is
      return <Component {...props} />;
    };
  };
}

/**
 * Higher-Order Component for role-based rendering
 * 
 * @example
 * ```tsx
 * const AdminOnlyComponent = withRole(['super_admin', 'org_admin'])(MyComponent);
 * ```
 */
export function withRole(allowedRoles: UserRole[]) {
  return function<P extends object>(Component: React.ComponentType<P>) {
    return function RoleWrapper(props: P) {
      // This would use the useAuth hook to check role
      // Implementation will be added when integrating with AuthProvider
      // For now, returning the component as-is
      return <Component {...props} />;
    };
  };
}
