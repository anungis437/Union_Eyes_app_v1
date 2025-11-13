/**
 * @fileoverview Authentication Middleware
 * 
 * Exports all middleware components and hooks for authentication.
 */

export { ProtectedRoute } from './ProtectedRoute';
export { useSSO, SSOMiddleware } from './useSSO';

// Re-export types
export type { UserRole, Permission } from '../rbac';
