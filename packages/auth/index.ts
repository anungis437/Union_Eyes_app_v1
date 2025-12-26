/**
 * @fileoverview Unified Authentication Package - Main Entry Point
 * 
 * Central authentication system for all CourtLens applications.
 * Provides SSO, session management, RBAC, and audit logging.
 */

// Main authentication components
export { AuthProvider, useAuth } from './unified-auth/AuthProvider';
export type { 
  AuthUser,
  AuthContextType 
} from './unified-auth/AuthProvider';

// Re-export RBAC types
export type { UserRole, Permission, RoleDefinition } from './rbac';

// Session management
export { SessionManager } from './session-manager';
export { SessionManagement } from './services/sessionManagement';
export type {
  SessionInfo,
  SessionActivity,
  SessionLimits,
} from './services/sessionManagement';

// Session Management Hook
export { useSessionManagement } from './hooks/useSessionManagement';
export type {
  UseSessionManagementOptions,
  UseSessionManagementReturn,
} from './hooks/useSessionManagement';

// Audit logging
export { AuditLogger } from './unified-auth/audit-logger';
export type { 
  AuthAuditEvent,
  AuditLogEntry 
} from './unified-auth/audit-logger';

// RBAC
export { RBAC, ROLE_DEFINITIONS } from './rbac';

// Password Policy & Validation
export {
  validatePassword,
  calculatePasswordStrength,
  generatePolicyDescription,
  checkPasswordHistory,
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_POLICY_PRESETS,
} from './utils/passwordPolicy';
export type {
  PasswordPolicyConfig,
  PasswordStrength,
  PasswordValidationResult,
} from './utils/passwordPolicy';

// Password Validation Hook
export { usePasswordValidation } from './hooks/usePasswordValidation';

// Password Strength Meter Component
export { PasswordStrengthMeter } from './components/PasswordStrengthMeter';

// Change Password Component - Temporarily disabled (uses react-router-dom)
// export { ChangePasswordPage } from './components/ChangePasswordPage';

// Password Expiration Warning - Temporarily disabled (uses react-router-dom)
// export { PasswordExpirationBanner, useDaysUntilExpiration } from './components/PasswordExpirationBanner';

// Session Management Components
export { SessionCard } from './components/SessionCard';
export { SessionList } from './components/SessionList';
export { SessionManagementDashboard } from './components/SessionManagementDashboard';

// User Invitation System
export { useInvitations } from './hooks/useInvitations';
export { InviteUserModal } from './components/InviteUserModal';
export { InvitationList } from './components/InvitationList';
// Temporarily disabled for Next.js build (uses react-router-dom)
// export { AcceptInvitationPage } from './components/AcceptInvitationPage';

// Invitation Service and Types
export { InvitationService } from './services/invitationService';
export type {
  Invitation,
  InvitationCreate,
  InvitationAccept,
  InvitationStatus,
  InvitationEmail,
} from './services/invitationService';

// Re-export commonly used types
export type {
  User,
  Session,
  AuthChangeEvent
} from '@supabase/supabase-js';
