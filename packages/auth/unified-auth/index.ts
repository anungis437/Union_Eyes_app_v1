/**
 * @fileoverview Unified Authentication Package
 * 
 * Central authentication system for all CourtLens applications.
 * Provides SSO, session management, RBAC, and audit logging.
 */

// Main authentication components
export { AuthProvider, useAuth } from './AuthProvider';
export type { 
  AuthUser,
  AuthContextType 
} from './AuthProvider';

// Re-export RBAC types that AuthUser uses
export type { UserRole, Permission, RoleDefinition } from '../rbac';

// Session management
export { SessionManager } from '../session-manager';

// Audit logging
export { AuditLogger } from './audit-logger';
export type { 
  AuthAuditEvent,
  AuditLogEntry 
} from './audit-logger';

// JWT Claims Management
export {
  updateUserJWTClaims,
  populateJWTClaimsFromProfile,
  createUserProfileWithClaims,
  refreshJWTClaims,
} from './jwt-claims';
export type { JWTClaims } from './jwt-claims';

// RBAC
export { RBAC, ROLE_DEFINITIONS } from '../rbac';

// Middleware (SSO and protected routes)
export { useSSO, SSOMiddleware } from '../middleware';

// UI Components
// export { LoginPage } from '../components';

// Re-export commonly used types
export type {
  User,
  Session,
  AuthChangeEvent
} from '@supabase/supabase-js';
