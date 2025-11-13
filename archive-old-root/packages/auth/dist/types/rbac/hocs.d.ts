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
export declare function withPermission(permission: Permission): <P extends object>(Component: React.ComponentType<P>) => (props: P) => import("react/jsx-runtime").JSX.Element;
/**
 * Higher-Order Component for role-based rendering
 *
 * @example
 * ```tsx
 * const AdminOnlyComponent = withRole(['super_admin', 'org_admin'])(MyComponent);
 * ```
 */
export declare function withRole(allowedRoles: UserRole[]): <P extends object>(Component: React.ComponentType<P>) => (props: P) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=hocs.d.ts.map