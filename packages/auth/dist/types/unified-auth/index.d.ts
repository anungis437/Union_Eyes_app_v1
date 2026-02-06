/**
 * @fileoverview Unified Authentication Package
 *
 * Central authentication system for all CourtLens applications.
 * Provides SSO, session management, RBAC, and audit logging.
 */
export { AuthProvider, useAuth } from './AuthProvider';
export type { AuthUser, AuthContextType } from './AuthProvider';
export type { UserRole, Permission, RoleDefinition } from '../rbac';
export { SessionManager } from '../session-manager';
export { AuditLogger } from './audit-logger';
export type { AuthAuditEvent, AuditLogEntry } from './audit-logger';
export { updateUserJWTClaims, populateJWTClaimsFromProfile, createUserProfileWithClaims, refreshJWTClaims, } from './jwt-claims';
export type { JWTClaims } from './jwt-claims';
export { RBAC, ROLE_DEFINITIONS } from '../rbac';
export { useSSO, SSOMiddleware } from '../middleware';
export type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
//# sourceMappingURL=index.d.ts.map