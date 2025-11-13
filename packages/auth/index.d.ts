/**
 * @fileoverview Unified Authentication Package - Main Entry Point
 *
 * Central authentication system for all CourtLens applications.
 * Provides SSO, session management, RBAC, and audit logging.
 */
export { AuthProvider, useAuth } from './unified-auth/AuthProvider';
export type { AuthUser, AuthContextType } from './unified-auth/AuthProvider';
export type { UserRole, Permission, RoleDefinition } from './rbac';
export { SessionManager } from './session-manager';
export { SessionManagement } from './services/sessionManagement';
export type { SessionInfo, SessionActivity, SessionLimits, } from './services/sessionManagement';
export { useSessionManagement } from './hooks/useSessionManagement';
export type { UseSessionManagementOptions, UseSessionManagementReturn, } from './hooks/useSessionManagement';
export { AuditLogger } from './unified-auth/audit-logger';
export type { AuthAuditEvent, AuditLogEntry } from './unified-auth/audit-logger';
export { RBAC, ROLE_DEFINITIONS } from './rbac';
export { validatePassword, calculatePasswordStrength, generatePolicyDescription, checkPasswordHistory, DEFAULT_PASSWORD_POLICY, PASSWORD_POLICY_PRESETS, } from './utils/passwordPolicy';
export type { PasswordPolicyConfig, PasswordStrength, PasswordValidationResult, } from './utils/passwordPolicy';
export { usePasswordValidation } from './hooks/usePasswordValidation';
export { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
export { ChangePasswordPage } from './components/ChangePasswordPage';
export { PasswordExpirationBanner, useDaysUntilExpiration } from './components/PasswordExpirationBanner';
export { SessionCard } from './components/SessionCard';
export { SessionList } from './components/SessionList';
export { SessionManagementDashboard } from './components/SessionManagementDashboard';
export { useInvitations } from './hooks/useInvitations';
export { InviteUserModal } from './components/InviteUserModal';
export { InvitationList } from './components/InvitationList';
export { AcceptInvitationPage } from './components/AcceptInvitationPage';
export { InvitationService } from './services/invitationService';
export type { Invitation, InvitationCreate, InvitationAccept, InvitationStatus, InvitationEmail, } from './services/invitationService';
export type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
//# sourceMappingURL=index.d.ts.map