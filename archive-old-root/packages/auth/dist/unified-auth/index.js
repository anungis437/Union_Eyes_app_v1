/**
 * @fileoverview Unified Authentication Package
 *
 * Central authentication system for all CourtLens applications.
 * Provides SSO, session management, RBAC, and audit logging.
 */
// Main authentication components
export { AuthProvider, useAuth } from './AuthProvider';
// Session management
export { SessionManager } from '../session-manager';
// Audit logging
export { AuditLogger } from './audit-logger';
// JWT Claims Management
export { updateUserJWTClaims, populateJWTClaimsFromProfile, createUserProfileWithClaims, refreshJWTClaims, } from './jwt-claims';
// RBAC
export { RBAC, ROLE_DEFINITIONS } from '../rbac';
// Middleware (SSO and protected routes)
export { ProtectedRoute, useSSO, SSOMiddleware } from '../middleware';
// UI Components
export { LoginPage } from '../components';
//# sourceMappingURL=index.js.map