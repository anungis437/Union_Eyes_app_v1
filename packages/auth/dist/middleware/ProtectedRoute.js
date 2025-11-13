import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../unified-auth';
// =========================================================================
// DEFAULT COMPONENTS
// =========================================================================
const DefaultLoadingComponent = () => (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading..." })] }) }));
const DefaultFallbackComponent = () => (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsxs("div", { className: "text-center max-w-md mx-auto p-8", children: [_jsx("svg", { className: "w-16 h-16 text-red-500 mx-auto mb-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-2", children: "Access Denied" }), _jsx("p", { className: "text-gray-600", children: "You don't have permission to access this page. Please contact your administrator if you believe this is an error." })] }) }));
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
export const ProtectedRoute = ({ children, requiredPermissions, requiredRoles, redirectTo = '/login', loadingComponent, fallbackComponent, }) => {
    const { user, loading, hasPermission, hasRole } = useAuth();
    const location = useLocation();
    // Show loading state while checking authentication
    if (loading) {
        return _jsx(_Fragment, { children: loadingComponent || _jsx(DefaultLoadingComponent, {}) });
    }
    // Not authenticated - redirect to login
    if (!user) {
        return _jsx(Navigate, { to: redirectTo, state: { from: location }, replace: true });
    }
    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(role => hasRole(role));
        if (!hasRequiredRole) {
            return _jsx(_Fragment, { children: fallbackComponent || _jsx(DefaultFallbackComponent, {}) });
        }
    }
    // Check permission requirements (user needs at least one)
    if (requiredPermissions && requiredPermissions.length > 0) {
        const hasRequiredPermission = requiredPermissions.some(permission => hasPermission(permission));
        if (!hasRequiredPermission) {
            return _jsx(_Fragment, { children: fallbackComponent || _jsx(DefaultFallbackComponent, {}) });
        }
    }
    // All checks passed - render protected content
    return _jsx(_Fragment, { children: children });
};
// =========================================================================
// EXPORTS
// =========================================================================
export default ProtectedRoute;
//# sourceMappingURL=ProtectedRoute.js.map