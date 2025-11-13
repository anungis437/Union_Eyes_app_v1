/**
 * Session Management Service
 *
 * World-class session management with:
 * - List all active sessions
 * - Force sign out specific sessions
 * - Device and location tracking
 * - Concurrent session limits
 * - Real-time session monitoring
 */
export interface SessionInfo {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    deviceId?: string;
    deviceName?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser?: string;
    os?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
    isActive: boolean;
    isCurrent: boolean;
    lastActivityAt?: Date;
}
export interface SessionActivity {
    sessionId: string;
    timestamp: Date;
    action: string;
    ipAddress?: string;
    userAgent?: string;
}
export interface SessionLimits {
    maxConcurrentSessions: number;
    maxSessionDuration: number;
    idleTimeout: number;
    requireReauthentication: boolean;
}
export declare class SessionManagement {
    private supabase;
    constructor(supabaseUrl: string, supabaseKey: string);
    /**
     * Get all active sessions for a user
     */
    getUserSessions(userId: string): Promise<SessionInfo[]>;
    /**
     * Get current session info
     */
    getCurrentSession(): Promise<SessionInfo | null>;
    /**
     * Get all sessions across all users (admin only)
     */
    getAllSessions(limit?: number): Promise<SessionInfo[]>;
    /**
     * Terminate a specific session
     */
    terminateSession(sessionId: string, userId: string): Promise<boolean>;
    /**
     * Terminate all sessions except current
     */
    terminateOtherSessions(userId: string): Promise<number>;
    /**
     * Terminate all sessions for a user (admin action)
     */
    terminateAllUserSessions(userId: string, adminUserId: string): Promise<number>;
    /**
     * Update session activity
     */
    updateSessionActivity(sessionId: string): Promise<void>;
    /**
     * Check concurrent session limit
     */
    checkConcurrentSessionLimit(userId: string, maxSessions: number): Promise<{
        allowed: boolean;
        activeCount: number;
    }>;
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): Promise<number>;
    /**
     * Get session activity history
     */
    getSessionActivity(sessionId: string, limit?: number): Promise<SessionActivity[]>;
    /**
     * Parse user agent string
     */
    private parseUserAgent;
    /**
     * Hash token for storage (simple hash for demo)
     */
    private hashToken;
    /**
     * Map database session data to SessionInfo
     */
    private mapSessionData;
}
/**
 * Format session duration
 */
export declare function formatSessionDuration(startDate: Date, endDate?: Date): string;
/**
 * Get device icon name
 */
export declare function getDeviceIcon(deviceType?: SessionInfo['deviceType']): string;
/**
 * Get browser icon
 */
export declare function getBrowserIcon(browser?: string): string;
//# sourceMappingURL=sessionManagement.d.ts.map