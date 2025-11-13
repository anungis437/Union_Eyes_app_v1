import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Higher-Order Component for permission-based rendering
 *
 * @example
 * ```tsx
 * const ProtectedComponent = withPermission('matters:write')(MyComponent);
 * ```
 */
export function withPermission(permission) {
    return function (Component) {
        return function PermissionWrapper(props) {
            // This would use the useAuth hook to check permissions
            // Implementation will be added when integrating with AuthProvider
            // For now, returning the component as-is
            return _jsx(Component, { ...props });
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
export function withRole(allowedRoles) {
    return function (Component) {
        return function RoleWrapper(props) {
            // This would use the useAuth hook to check role
            // Implementation will be added when integrating with AuthProvider
            // For now, returning the component as-is
            return _jsx(Component, { ...props });
        };
    };
}
//# sourceMappingURL=hocs.js.map