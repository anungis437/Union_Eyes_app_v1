/**
 * @fileoverview Session Manager
 *
 * Manages JWT tokens and cross-application session persistence.
 * Ensures users stay authenticated across all 17 CourtLens applications.
 */
// =========================================================================
// CONSTANTS
// =========================================================================
const SESSION_STORAGE_KEY = 'courtlens_session';
const SESSION_EXPIRY_KEY = 'courtlens_session_expiry';
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
// =========================================================================
// SESSION MANAGER CLASS
// =========================================================================
export class SessionManager {
    constructor() {
        this.session = null;
        this.refreshTimer = null;
        this.loadSession();
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }
    /**
     * Store session in localStorage
     */
    storeSession(session) {
        try {
            this.session = session;
            // Store session data
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
            // Store expiry time
            if (session.expires_at) {
                localStorage.setItem(SESSION_EXPIRY_KEY, session.expires_at.toString());
            }
            // Set up refresh timer
            this.scheduleSessionRefresh(session);
        }
        catch (error) {
            console.error('Error storing session:', error);
        }
    }
    /**
     * Load session from localStorage
     */
    loadSession() {
        try {
            const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!storedSession) {
                return null;
            }
            const session = JSON.parse(storedSession);
            // Check if session is expired
            if (this.isSessionExpired(session)) {
                this.clearSession();
                return null;
            }
            this.session = session;
            this.scheduleSessionRefresh(session);
            return session;
        }
        catch (error) {
            console.error('Error loading session:', error);
            return null;
        }
    }
    /**
     * Clear session from storage
     */
    clearSession() {
        try {
            this.session = null;
            localStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(SESSION_EXPIRY_KEY);
            if (this.refreshTimer) {
                clearTimeout(this.refreshTimer);
                this.refreshTimer = null;
            }
        }
        catch (error) {
            console.error('Error clearing session:', error);
        }
    }
    /**
     * Get current session
     */
    getSession() {
        return this.session;
    }
    /**
     * Check if session is expired
     */
    isSessionExpired(session) {
        if (!session.expires_at) {
            return false;
        }
        const expiryTime = typeof session.expires_at === 'number'
            ? session.expires_at * 1000
            : new Date(session.expires_at).getTime();
        return Date.now() >= expiryTime;
    }
    /**
     * Check if session needs refresh
     */
    needsRefresh(session) {
        if (!session.expires_at) {
            return false;
        }
        const expiryTime = typeof session.expires_at === 'number'
            ? session.expires_at * 1000
            : new Date(session.expires_at).getTime();
        const timeUntilExpiry = expiryTime - Date.now();
        return timeUntilExpiry < REFRESH_THRESHOLD;
    }
    /**
     * Schedule automatic session refresh
     */
    scheduleSessionRefresh(session) {
        if (!session.expires_at) {
            return;
        }
        // Clear existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        const expiryTime = typeof session.expires_at === 'number'
            ? session.expires_at * 1000
            : new Date(session.expires_at).getTime();
        const timeUntilRefresh = expiryTime - Date.now() - REFRESH_THRESHOLD;
        if (timeUntilRefresh > 0) {
            this.refreshTimer = setTimeout(() => {
                // Emit event for components to refresh
                window.dispatchEvent(new CustomEvent('session-refresh-needed'));
            }, timeUntilRefresh);
        }
    }
    /**
     * Get access token
     */
    getAccessToken() {
        return this.session?.access_token || null;
    }
    /**
     * Get refresh token
     */
    getRefreshToken() {
        return this.session?.refresh_token || null;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.session !== null && !this.isSessionExpired(this.session);
    }
    /**
     * Get session metadata
     */
    getSessionMetadata() {
        if (!this.session || !this.session.expires_at) {
            return {
                expiresAt: null,
                timeRemaining: 0,
                needsRefresh: false,
            };
        }
        const expiryTime = typeof this.session.expires_at === 'number'
            ? this.session.expires_at * 1000
            : new Date(this.session.expires_at).getTime();
        const timeRemaining = Math.max(0, expiryTime - Date.now());
        return {
            expiresAt: new Date(expiryTime),
            timeRemaining,
            needsRefresh: this.needsRefresh(this.session),
        };
    }
}
// =========================================================================
// EXPORTS
// =========================================================================
export default SessionManager;
//# sourceMappingURL=index.js.map