/**
 * @fileoverview Session Manager
 *
 * Manages JWT tokens and cross-application session persistence.
 * Ensures users stay authenticated across all 17 CourtLens applications.
 */
import { Session } from '@supabase/supabase-js';
export declare class SessionManager {
    private static instance;
    private session;
    private refreshTimer;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): SessionManager;
    /**
     * Store session in localStorage
     */
    storeSession(session: Session): void;
    /**
     * Load session from localStorage
     */
    loadSession(): Session | null;
    /**
     * Clear session from storage
     */
    clearSession(): void;
    /**
     * Get current session
     */
    getSession(): Session | null;
    /**
     * Check if session is expired
     */
    private isSessionExpired;
    /**
     * Check if session needs refresh
     */
    needsRefresh(session: Session): boolean;
    /**
     * Schedule automatic session refresh
     */
    private scheduleSessionRefresh;
    /**
     * Get access token
     */
    getAccessToken(): string | null;
    /**
     * Get refresh token
     */
    getRefreshToken(): string | null;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Get session metadata
     */
    getSessionMetadata(): {
        expiresAt: Date | null;
        timeRemaining: number;
        needsRefresh: boolean;
    };
}
export default SessionManager;
//# sourceMappingURL=index.d.ts.map