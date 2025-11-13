/**
 * @fileoverview Protected Route Component
 * 
 * React component for protecting routes that require authentication.
 * Automatically redirects unauthenticated users to login page.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../unified-auth';
import type { UserRole, Permission } from '../rbac';

// =========================================================================
// TYPES
// =========================================================================

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

// =========================================================================
// DEFAULT COMPONENTS
// =========================================================================

const DefaultLoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const DefaultFallbackComponent: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center max-w-md mx-auto p-8">
      <svg
        className="w-16 h-16 text-red-500 mx-auto mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600">
        You don't have permission to access this page. Please contact your administrator
        if you believe this is an error.
      </p>
    </div>
  </div>
);

// =========================================================================
// PROTECTED ROUTE COMPONENT
// =========================================================================

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
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
  requiredRoles,
  redirectTo = '/login',
  loadingComponent,
  fallbackComponent,
}) => {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return <>{loadingComponent || <DefaultLoadingComponent />}</>;
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return <>{fallbackComponent || <DefaultFallbackComponent />}</>;
    }
  }

  // Check permission requirements (user needs at least one)
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => 
      hasPermission(permission)
    );
    if (!hasRequiredPermission) {
      return <>{fallbackComponent || <DefaultFallbackComponent />}</>;
    }
  }

  // All checks passed - render protected content
  return <>{children}</>;
};

// =========================================================================
// EXPORTS
// =========================================================================

export default ProtectedRoute;
