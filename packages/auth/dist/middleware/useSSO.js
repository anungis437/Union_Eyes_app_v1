import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview SSO Middleware
 *
 * Middleware for Single Sign-On functionality across CourtLens apps.
 * Handles cross-app session synchronization and automatic login.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../unified-auth';
import { SessionManager } from '../session-manager';
// =========================================================================
// SSO MIDDLEWARE HOOK
// =========================================================================
/**
 * useSSO Hook
 *
 * Enables Single Sign-On functionality in any CourtLens application.
 * Automatically syncs authentication state across all apps via localStorage.
 *
 * @example
 * function App() {
 *   useSSO({
 *     enabled: true,
 *     checkInterval: 30000, // Check every 30 seconds
 *     onSSOLogin: (userId) => console.log('User logged in via SSO:', userId),
 *     onSSOLogout: () => console.log('User logged out via SSO')
 *   });
 *
 *   return <YourApp />;
 * }
 */
export const useSSO = (config = {}) => {
    const { enabled = true, checkInterval = 30000, // 30 seconds
    debug = false, onSSOLogin, onSSOLogout, } = config;
    const { user, session, refreshSession } = useAuth();
    const sessionManager = SessionManager.getInstance();
    const intervalRef = useRef(null);
    const lastCheckRef = useRef(Date.now());
    /**
     * Log debug messages
     */
    const log = useCallback((message, ...args) => {
        if (debug) {
            console.log(`[SSO] ${message}`, ...args);
        }
    }, [debug]);
    /**
     * Broadcast SSO event to other tabs/apps
     */
    const broadcastSSOEvent = useCallback((event) => {
        try {
            localStorage.setItem('courtlens_sso_event', JSON.stringify(event));
            log('Broadcasted SSO event:', event.type);
        }
        catch (error) {
            console.error('[SSO] Failed to broadcast event:', error);
        }
    }, [log]);
    /**
     * Handle SSO login detected from another app
     */
    const handleSSOLogin = useCallback(async (userId) => {
        log('SSO login detected for user:', userId);
        // Refresh current session to sync with new login
        try {
            await refreshSession();
            onSSOLogin?.(userId);
        }
        catch (error) {
            console.error('[SSO] Failed to refresh session on SSO login:', error);
        }
    }, [refreshSession, onSSOLogin, log]);
    /**
     * Handle SSO logout detected from another app
     */
    const handleSSOLogout = useCallback(() => {
        log('SSO logout detected');
        // Clear local session
        sessionManager.clearSession();
        onSSOLogout?.();
        // Force reload to show login screen
        // Note: In production, you might want a more graceful approach
        window.location.href = '/login';
    }, [sessionManager, onSSOLogout, log]);
    /**
     * Check for SSO events from other tabs/apps
     */
    const checkForSSOEvents = useCallback(() => {
        try {
            const eventData = localStorage.getItem('courtlens_sso_event');
            if (!eventData)
                return;
            const event = JSON.parse(eventData);
            // Only process events newer than our last check
            if (event.timestamp <= lastCheckRef.current)
                return;
            lastCheckRef.current = event.timestamp;
            log('Received SSO event:', event);
            // Handle event based on type
            switch (event.type) {
                case 'login':
                    if (event.userId && !user) {
                        handleSSOLogin(event.userId);
                    }
                    break;
                case 'logout':
                    if (user) {
                        handleSSOLogout();
                    }
                    break;
                case 'refresh':
                    if (user && event.userId === user.id) {
                        refreshSession();
                    }
                    break;
            }
        }
        catch (error) {
            console.error('[SSO] Error processing SSO event:', error);
        }
    }, [user, handleSSOLogin, handleSSOLogout, refreshSession, log]);
    /**
     * Listen for storage events (cross-tab communication)
     */
    useEffect(() => {
        if (!enabled)
            return;
        const handleStorageChange = (e) => {
            if (e.key === 'courtlens_sso_event' && e.newValue) {
                log('Storage event detected');
                checkForSSOEvents();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        log('SSO listener registered');
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            log('SSO listener unregistered');
        };
    }, [enabled, checkForSSOEvents, log]);
    /**
     * Periodic check for SSO events (fallback for same-tab changes)
     */
    useEffect(() => {
        if (!enabled)
            return;
        intervalRef.current = setInterval(() => {
            checkForSSOEvents();
        }, checkInterval);
        log('SSO periodic check started (interval:', checkInterval, 'ms)');
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                log('SSO periodic check stopped');
            }
        };
    }, [enabled, checkInterval, checkForSSOEvents, log]);
    /**
     * Broadcast login events
     */
    useEffect(() => {
        if (!enabled || !user)
            return;
        broadcastSSOEvent({
            type: 'login',
            userId: user.id,
            timestamp: Date.now(),
            appName: 'current-app', // Could be passed via config
        });
    }, [enabled, user, broadcastSSOEvent]);
    /**
     * Broadcast logout events
     */
    useEffect(() => {
        if (!enabled)
            return;
        // Detect logout
        const storedSession = sessionManager.getSession();
        if (!user && storedSession) {
            broadcastSSOEvent({
                type: 'logout',
                timestamp: Date.now(),
                appName: 'current-app',
            });
        }
    }, [enabled, user, sessionManager, broadcastSSOEvent]);
    return {
        enabled,
        checkInterval,
    };
};
/**
 * SSOMiddleware Component
 *
 * Component wrapper for SSO functionality. Use this if you prefer
 * a component-based approach instead of the hook.
 *
 * @example
 * <AuthProvider>
 *   <SSOMiddleware enabled={true} debug={true}>
 *     <App />
 *   </SSOMiddleware>
 * </AuthProvider>
 */
export const SSOMiddleware = ({ children, ...config }) => {
    useSSO(config);
    return _jsx(_Fragment, { children: children });
};
// =========================================================================
// EXPORTS
// =========================================================================
export default useSSO;
//# sourceMappingURL=useSSO.js.map