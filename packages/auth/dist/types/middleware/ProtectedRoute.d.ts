/**
 * @fileoverview Protected Route Component
 *
 * React component for protecting routes that require authentication.
 * Automatically redirects unauthenticated users to login page.
 */
import React from 'react';
import type { UserRole, Permission } from '../rbac';
interface ProtectedRouteProps {
    children: React.ReactNode;
    /** Required permissions - user must have at least one */
    requiredPermissions?: Permission[];
    /** Required roles - user must have one of these roles */
    requiredRoles?: UserRole[];
    /** Redirect path when unauthorized (default: /login) */
    redirectTo?: string;
    /** Show loading indicator while checking auth */
    loadingComponent?: React.ReactNode;
    /** Show when user is authenticated but lacks permissions */
    fallbackComponent?: React.ReactNode;
}
/**
 * ProtectedRoute Component
 *
 * Wraps route components to enforce authentication and authorization.
 *
 * @example
 * // Basic authentication check
 * <ProtectedRoute>
 *   <AdminDashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Require specific permissions
 * <ProtectedRoute requiredPermissions={['matters:write', 'clients:write']}>
 *   <CreateMatterForm />
 * </ProtectedRoute>
 *
 * @example
 * // Require specific roles
 * <ProtectedRoute requiredRoles={['org_admin', 'super_admin']}>
 *   <UserManagement />
 * </ProtectedRoute>
 *
 * @example
 * // Custom redirect and components
 * <ProtectedRoute
 *   redirectTo="/unauthorized"
 *   loadingComponent={<CustomSpinner />}
 *   fallbackComponent={<CustomAccessDenied />}
 * >
 *   <SecretPage />
 * </ProtectedRoute>
 */
export declare const ProtectedRoute: React.FC<ProtectedRouteProps>;
export default ProtectedRoute;
//# sourceMappingURL=ProtectedRoute.d.ts.map