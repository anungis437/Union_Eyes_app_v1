import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Unified Authentication Provider
 *
 * Central authentication context provider for all 17 CourtLens applications.
 * Provides SSO functionality, session management, and authentication state.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@unioneyes/supabase';
import { SessionManager } from '../session-manager';
import { AuditLogger } from './audit-logger';
// Initialize supabase client
const supabase = getSupabaseClient();
// =========================================================================
// CONTEXT
// =========================================================================
const AuthContext = createContext(undefined);
// =========================================================================
// AUTH PROVIDER COMPONENT
// =========================================================================
export const AuthProvider = ({ children, appName = 'CourtLens' }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    // Initialize session manager
    const sessionManager = SessionManager.getInstance();
    const auditLogger = AuditLogger.getInstance();
    /**
     * Fetch user profile and permissions from database
     */
    const fetchUserProfile = async (userId) => {
        try {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('organization_id, organization_name, role, permissions')
                .eq('user_id', userId)
                .single();
            if (error)
                throw error;
            if (!profile)
                return {};
            return {
                organizationId: profile.organization_id,
                organizationName: profile.organization_name,
                role: profile.role,
                permissions: profile.permissions,
            };
        }
        catch (error) {
            console.error('Error fetching user profile:', error);
            return {};
        }
    };
    /**
     * Handle authentication state changes
     */
    const handleAuthStateChange = useCallback(async (event, session) => {
        console.log(`Auth event: ${event} in ${appName}`);
        if (session?.user) {
            // For initial session or token refresh, ensure JWT has latest claims
            if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                try {
                    const { populateJWTClaimsFromProfile } = await import('./jwt-claims');
                    await populateJWTClaimsFromProfile(session.user.id);
                }
                catch (error) {
                    console.warn('Could not populate JWT claims:', error);
                }
            }
            // Fetch additional user profile data
            const profile = await fetchUserProfile(session.user.id);
            const authUser = {
                ...session.user,
                organizationId: profile.organizationId,
                organizationName: profile.organizationName,
                role: profile.role,
                permissions: profile.permissions,
            };
            setUser(authUser);
            setSession(session);
            // Store session across apps
            sessionManager.storeSession(session);
            // Log authentication event
            await auditLogger.logAuthEvent({
                event,
                userId: session.user.id,
                appName,
                timestamp: new Date(),
            });
        }
        else {
            setUser(null);
            setSession(null);
            sessionManager.clearSession();
        }
        setLoading(false);
    }, [appName]);
    /**
     * Initialize authentication
     */
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then((response) => {
            handleAuthStateChange('INITIAL_SESSION', response.data.session);
        });
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
        return () => {
            subscription.unsubscribe();
        };
    }, [handleAuthStateChange]);
    /**
     * Check if session is still valid (refresh if needed)
     */
    useEffect(() => {
        const interval = setInterval(async () => {
            if (session) {
                const { data: { session: refreshedSession } } = await supabase.auth.getSession();
                if (refreshedSession) {
                    setSession(refreshedSession);
                    sessionManager.storeSession(refreshedSession);
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
        return () => clearInterval(interval);
    }, [session]);
    // =========================================================================
    // AUTH METHODS
    // =========================================================================
    const signIn = async (email, password) => {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error)
                throw error;
            // Populate JWT claims from user profile
            if (data.user) {
                const { populateJWTClaimsFromProfile } = await import('./jwt-claims');
                await populateJWTClaimsFromProfile(data.user.id);
                // Refresh session to get updated JWT with claims
                await supabase.auth.refreshSession();
            }
            await auditLogger.logAuthEvent({
                event: 'SIGNED_IN',
                userId: data.user?.id || 'unknown',
                appName,
                timestamp: new Date(),
                details: { email },
            });
            return { error: null };
        }
        catch (error) {
            console.error('Sign in error:', error);
            return { error: error };
        }
        finally {
            setLoading(false);
        }
    };
    const signUp = async (email, password, metadata) => {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata,
                },
            });
            if (error)
                throw error;
            // If user was created successfully, create their profile with JWT claims
            if (data.user) {
                // Note: In production, this would be called from a server-side function
                // after email verification. For now, we'll create a basic profile.
                // The organization_id and role should come from metadata or a registration flow.
                const role = metadata?.role || 'client';
                const organizationId = metadata?.organizationId || 'default-org-id';
                // Import JWT claims utility
                const { createUserProfileWithClaims } = await import('./jwt-claims');
                await createUserProfileWithClaims(data.user.id, role, organizationId);
            }
            await auditLogger.logAuthEvent({
                event: 'SIGNED_UP',
                userId: data.user?.id || 'unknown',
                appName,
                timestamp: new Date(),
                details: { email },
            });
            return { error: null };
        }
        catch (error) {
            console.error('Sign up error:', error);
            return { error: error };
        }
        finally {
            setLoading(false);
        }
    };
    const signOut = async () => {
        try {
            setLoading(true);
            await auditLogger.logAuthEvent({
                event: 'SIGNED_OUT',
                userId: user?.id || 'unknown',
                appName,
                timestamp: new Date(),
            });
            const { error } = await supabase.auth.signOut();
            if (error)
                throw error;
            setUser(null);
            setSession(null);
            sessionManager.clearSession();
            return { error: null };
        }
        catch (error) {
            console.error('Sign out error:', error);
            return { error: error };
        }
        finally {
            setLoading(false);
        }
    };
    const resetPassword = async (email) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error)
                throw error;
            await auditLogger.logAuthEvent({
                event: 'PASSWORD_RECOVERY',
                userId: 'unknown',
                appName,
                timestamp: new Date(),
                details: { email },
            });
            return { error: null };
        }
        catch (error) {
            console.error('Password reset error:', error);
            return { error: error };
        }
    };
    const updatePassword = async (newPassword) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (error)
                throw error;
            await auditLogger.logAuthEvent({
                event: 'USER_UPDATED',
                userId: user?.id || 'unknown',
                appName,
                timestamp: new Date(),
                details: { action: 'password_changed' },
            });
            return { error: null };
        }
        catch (error) {
            console.error('Password update error:', error);
            return { error: error };
        }
    };
    const refreshSession = async () => {
        try {
            const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
            if (error)
                throw error;
            if (refreshedSession) {
                setSession(refreshedSession);
                sessionManager.storeSession(refreshedSession);
            }
        }
        catch (error) {
            console.error('Session refresh error:', error);
        }
    };
    // =========================================================================
    // PERMISSION CHECKS
    // =========================================================================
    const hasPermission = (permission) => {
        if (!user || !user.permissions)
            return false;
        // Super admins have all permissions
        if (user.role === 'super_admin')
            return true;
        return user.permissions.includes(permission);
    };
    const hasRole = (role) => {
        if (!user || !user.role)
            return false;
        return user.role === role;
    };
    // =========================================================================
    // CONTEXT VALUE
    // =========================================================================
    const value = {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        hasPermission,
        hasRole,
        refreshSession,
    };
    return (_jsx(AuthContext.Provider, { value: value, children: children }));
};
// =========================================================================
// HOOK
// =========================================================================
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
//# sourceMappingURL=AuthProvider.js.map