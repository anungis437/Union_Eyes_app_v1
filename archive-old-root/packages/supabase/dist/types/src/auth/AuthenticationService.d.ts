/**
 * Advanced Authentication Service for CourtLens
 *
 * TypeScript service that provides advanced Supabase Auth Pro features including
 * SSO integration, MFA setup, custom JWT claims, organization-based access control,
 * role-based permissions, and enhanced security features.
 *
 * Features:
 * - Single Sign-On (SSO) with multiple providers
 * - Multi-Factor Authentication (MFA) with TOTP
 * - Custom JWT claims and session management
 * - Role-based access control (RBAC)
 * - Organization-based user management
 * - Security monitoring and audit logging
 * - Advanced session management
 *
 * @module AuthenticationService
 */
import { SupabaseClient, AuthError, Session, User } from '@supabase/supabase-js';
import * as React from 'react';
export type SSOProviderType = 'saml' | 'oidc' | 'oauth2' | 'ldap';
export type UserRole = 'owner' | 'admin' | 'attorney' | 'user' | 'guest';
export type SecurityEventType = 'login_success' | 'login_failed' | 'logout' | 'password_changed' | 'mfa_enabled' | 'mfa_disabled' | 'mfa_verified' | 'role_changed' | 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_revoked' | 'suspicious_activity' | 'account_locked' | 'account_unlocked';
export interface AuthUser extends User {
    organization_id?: string;
    role?: UserRole;
    mfa_enabled?: boolean;
    last_login_at?: string;
    session_timeout_minutes?: number;
}
export interface CustomJWTClaims {
    user_id: string;
    email: string;
    role: UserRole;
    organization_id: string;
    organization_name: string;
    subscription_tier: string;
    roles: string[];
    permissions: string[];
    mfa_enabled: boolean;
    last_login: string;
    session_timeout: number;
}
export interface SSOProvider {
    id: string;
    organization_id: string;
    provider_type: SSOProviderType;
    provider_name: string;
    config: Record<string, any>;
    metadata: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface SSOUserMapping {
    id: string;
    user_id: string;
    sso_provider_id: string;
    external_user_id: string;
    external_email: string;
    external_attributes: Record<string, any>;
    first_login_at: string;
    last_login_at: string;
}
export interface Role {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    is_system_role: boolean;
    permissions: string[];
    parent_role_id?: string;
    created_at: string;
    updated_at: string;
}
export interface UserRoleAssignment {
    id: string;
    user_id: string;
    role_id: string;
    assigned_by?: string;
    assigned_at: string;
    expires_at?: string;
    is_active: boolean;
}
export interface UserSession {
    id: string;
    user_id: string;
    session_token: string;
    refresh_token?: string;
    ip_address?: string;
    user_agent?: string;
    location?: Record<string, any>;
    created_at: string;
    last_activity_at: string;
    expires_at: string;
    is_active: boolean;
    login_method: string;
    mfa_verified: boolean;
}
export interface SecurityEvent {
    id: string;
    user_id?: string;
    organization_id?: string;
    event_type: SecurityEventType;
    event_data: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    risk_score: number;
    created_at: string;
}
export interface LoginSecurityCheck {
    is_blocked: boolean;
    block_reason?: string;
    failed_attempts: number;
    mfa_required: boolean;
}
export interface MFASetupResult {
    secret: string;
    qr_code_url: string;
    backup_codes: string[];
}
export interface AuthenticationOptions {
    requireMFA?: boolean;
    sessionTimeout?: number;
    rememberMe?: boolean;
    ipWhitelist?: string[];
}
export interface OrganizationAuthSettings {
    sso_enabled: boolean;
    sso_domain?: string;
    sso_provider?: string;
    mfa_required: boolean;
    password_policy: {
        min_length: number;
        require_uppercase: boolean;
        require_lowercase: boolean;
        require_numbers: boolean;
        require_symbols: boolean;
    };
    session_timeout_minutes: number;
    allowed_domains?: string[];
    security_settings: Record<string, any>;
}
export interface PasswordPolicy {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
    max_age_days?: number;
    prevent_reuse?: number;
}
export declare class AuthenticationService {
    supabase: SupabaseClient;
    private organizationId?;
    constructor(supabaseUrl: string, supabaseKey: string, organizationId?: string);
    /**
     * Sign in with email and password with enhanced security checks
     */
    signIn(email: string, password: string, options?: AuthenticationOptions): Promise<{
        user: AuthUser | null;
        session: Session | null;
        error: AuthError | null;
        requiresMFA?: boolean;
    }>;
    /**
     * Sign in with SSO provider
     */
    signInWithSSO(providerId: string, options?: AuthenticationOptions): Promise<{
        url?: string;
        error: AuthError | null;
    }>;
    /**
     * Handle SSO callback and user provisioning
     */
    handleSSOCallback(externalUserId: string, email: string, ssoProviderId: string, externalAttributes?: Record<string, any>): Promise<AuthUser | null>;
    /**
     * Sign out with session cleanup
     */
    signOut(): Promise<{
        error: AuthError | null;
    }>;
    /**
     * Set up MFA for user
     */
    setupMFA(userId: string): Promise<MFASetupResult>;
    /**
     * Verify MFA token
     */
    verifyMFA(userId: string, token: string, isBackupCode?: boolean): Promise<boolean>;
    /**
     * Disable MFA for user
     */
    disableMFA(userId: string): Promise<boolean>;
    /**
     * Check if user has specific permission
     */
    hasPermission(userId: string, permission: string, resourceType?: string, resourceId?: string): Promise<boolean>;
    /**
     * Get user roles
     */
    getUserRoles(userId: string): Promise<Role[]>;
    /**
     * Assign role to user
     */
    assignRole(userId: string, roleId: string, assignedBy: string, expiresAt?: string): Promise<boolean>;
    /**
     * Remove role from user
     */
    removeRole(userId: string, roleId: string): Promise<boolean>;
    /**
     * Get SSO providers for organization
     */
    getSSOProviders(): Promise<SSOProvider[]>;
    /**
     * Get specific SSO provider
     */
    getSSOProvider(providerId: string): Promise<SSOProvider | null>;
    /**
     * Create SSO provider configuration
     */
    createSSOProvider(providerType: SSOProviderType, providerName: string, config: Record<string, any>, metadata?: Record<string, any>): Promise<SSOProvider | null>;
    /**
     * Create enhanced session with custom claims
     */
    createEnhancedSession(userId: string, sessionToken: string, refreshToken: string, options?: AuthenticationOptions): Promise<UserSession | null>;
    /**
     * Validate current session
     */
    validateSession(sessionToken: string): Promise<{
        isValid: boolean;
        user?: AuthUser;
        claims?: CustomJWTClaims;
    }>;
    /**
     * Get active sessions for user
     */
    getActiveSessions(userId: string): Promise<UserSession[]>;
    /**
     * Revoke session
     */
    revokeSession(sessionId: string): Promise<boolean>;
    /**
     * Check login security policies
     */
    checkLoginSecurity(email: string): Promise<LoginSecurityCheck>;
    /**
     * Log security event
     */
    logSecurityEvent(eventType: SecurityEventType, eventData?: Record<string, any>, riskScore?: number): Promise<void>;
    /**
     * Get security events for user
     */
    getSecurityEvents(userId?: string, eventType?: SecurityEventType, limit?: number): Promise<SecurityEvent[]>;
    /**
     * Get current authenticated user
     */
    getCurrentUser(): Promise<AuthUser | null>;
    /**
     * Get organization authentication settings
     */
    getOrganizationAuthSettings(): Promise<OrganizationAuthSettings | null>;
    /**
     * Validate password against policy
     */
    validatePassword(password: string, policy: PasswordPolicy): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Log failed login attempt
     */
    private logFailedLoginAttempt;
    /**
     * Verify backup code
     */
    private verifyBackupCode;
    /**
     * Hash backup code for storage
     */
    private hashBackupCode;
    /**
     * Get client IP address
     */
    private getClientIP;
}
/**
 * Create an AuthenticationService instance with environment configuration
 */
export declare function createAuthenticationService(organizationId?: string): AuthenticationService;
/**
 * Authentication context for React apps
 */
interface AuthContextType {
    user: AuthUser | null;
    session: Session | null;
    loading: boolean;
    authService: AuthenticationService;
    signIn: (email: string, password: string, options?: AuthenticationOptions) => Promise<any>;
    signOut: () => Promise<void>;
    hasPermission: (permission: string, resourceType?: string, resourceId?: string) => Promise<boolean>;
}
/**
 * Authentication provider component
 */
export declare function AuthProvider({ children, organizationId }: {
    children: React.ReactNode;
    organizationId?: string;
}): React.FunctionComponentElement<React.ProviderProps<AuthContextType | undefined>>;
/**
 * Hook to use authentication context
 */
export declare function useAuth(): AuthContextType;
/**
 * Hook for MFA management
 */
export declare function useMFA(): {
    setupMFA: () => Promise<MFASetupResult>;
    verifyMFA: (token: string, isBackupCode?: boolean) => Promise<boolean>;
    disableMFA: () => Promise<boolean>;
    isSettingUp: boolean;
};
/**
 * Hook for SSO management
 */
export declare function useSSO(): {
    providers: SSOProvider[];
    loading: boolean;
    signInWithSSO: (providerId: string) => Promise<{
        url?: string;
        error: AuthError | null;
    }>;
    reloadProviders: () => Promise<void>;
};
export {};
//# sourceMappingURL=AuthenticationService.d.ts.map