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
import { createClient } from '@supabase/supabase-js';
// ============================================================================
// Session Management Service
// ============================================================================
export class SessionManagement {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    /**
     * Get all active sessions for a user
     */
    async getUserSessions(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_sessions')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('last_activity_at', { ascending: false });
            if (error)
                throw error;
            return (data || []).map(this.mapSessionData);
        }
        catch (error) {
            console.error('Error fetching user sessions:', error);
            return [];
        }
    }
    /**
     * Get current session info
     */
    async getCurrentSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error)
                throw error;
            if (!session)
                return null;
            // Get additional session metadata
            const { data: sessionData } = await this.supabase
                .from('user_sessions')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('access_token_hash', this.hashToken(session.access_token))
                .single();
            return {
                id: session.access_token.substring(0, 8),
                userId: session.user.id,
                accessToken: session.access_token,
                refreshToken: session.refresh_token || '',
                expiresAt: new Date(session.expires_at * 1000),
                createdAt: new Date(session.user.created_at),
                updatedAt: new Date(),
                isActive: true,
                isCurrent: true,
                deviceId: sessionData?.device_id,
                deviceName: sessionData?.device_name,
                deviceType: sessionData?.device_type,
                browser: sessionData?.browser,
                os: sessionData?.os,
                ipAddress: sessionData?.ip_address,
                country: sessionData?.country,
                city: sessionData?.city,
                lastActivityAt: sessionData?.last_activity_at ? new Date(sessionData.last_activity_at) : undefined,
            };
        }
        catch (error) {
            console.error('Error fetching current session:', error);
            return null;
        }
    }
    /**
     * Get all sessions across all users (admin only)
     */
    async getAllSessions(limit = 100) {
        try {
            const { data, error } = await this.supabase
                .from('user_sessions')
                .select(`
          *,
          users:auth.users!inner(email)
        `)
                .eq('is_active', true)
                .order('last_activity_at', { ascending: false })
                .limit(limit);
            if (error)
                throw error;
            return (data || []).map(this.mapSessionData);
        }
        catch (error) {
            console.error('Error fetching all sessions:', error);
            return [];
        }
    }
    /**
     * Terminate a specific session
     */
    async terminateSession(sessionId, userId) {
        try {
            // Mark session as inactive
            const { error } = await this.supabase
                .from('user_sessions')
                .update({
                is_active: false,
                terminated_at: new Date().toISOString(),
                terminated_by: userId,
            })
                .eq('id', sessionId);
            if (error)
                throw error;
            // If terminating current session, sign out
            const currentSession = await this.getCurrentSession();
            if (currentSession?.id === sessionId) {
                await this.supabase.auth.signOut();
            }
            return true;
        }
        catch (error) {
            console.error('Error terminating session:', error);
            return false;
        }
    }
    /**
     * Terminate all sessions except current
     */
    async terminateOtherSessions(userId) {
        try {
            const currentSession = await this.getCurrentSession();
            if (!currentSession)
                return 0;
            const { data, error } = await this.supabase
                .from('user_sessions')
                .update({
                is_active: false,
                terminated_at: new Date().toISOString(),
                terminated_by: userId,
            })
                .eq('user_id', userId)
                .eq('is_active', true)
                .neq('id', currentSession.id)
                .select();
            if (error)
                throw error;
            return data?.length || 0;
        }
        catch (error) {
            console.error('Error terminating other sessions:', error);
            return 0;
        }
    }
    /**
     * Terminate all sessions for a user (admin action)
     */
    async terminateAllUserSessions(userId, adminUserId) {
        try {
            const { data, error } = await this.supabase
                .from('user_sessions')
                .update({
                is_active: false,
                terminated_at: new Date().toISOString(),
                terminated_by: adminUserId,
                termination_reason: 'admin_force_signout',
            })
                .eq('user_id', userId)
                .eq('is_active', true)
                .select();
            if (error)
                throw error;
            return data?.length || 0;
        }
        catch (error) {
            console.error('Error terminating all user sessions:', error);
            return 0;
        }
    }
    /**
     * Update session activity
     */
    async updateSessionActivity(sessionId) {
        try {
            await this.supabase
                .from('user_sessions')
                .update({
                last_activity_at: new Date().toISOString(),
            })
                .eq('id', sessionId);
        }
        catch (error) {
            console.error('Error updating session activity:', error);
        }
    }
    /**
     * Check concurrent session limit
     */
    async checkConcurrentSessionLimit(userId, maxSessions) {
        try {
            const { count, error } = await this.supabase
                .from('user_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_active', true);
            if (error)
                throw error;
            return {
                allowed: (count || 0) < maxSessions,
                activeCount: count || 0,
            };
        }
        catch (error) {
            console.error('Error checking concurrent session limit:', error);
            return { allowed: true, activeCount: 0 };
        }
    }
    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        try {
            const { data, error } = await this.supabase
                .from('user_sessions')
                .update({
                is_active: false,
                terminated_at: new Date().toISOString(),
                termination_reason: 'expired',
            })
                .eq('is_active', true)
                .lt('expires_at', new Date().toISOString())
                .select();
            if (error)
                throw error;
            return data?.length || 0;
        }
        catch (error) {
            console.error('Error cleaning up expired sessions:', error);
            return 0;
        }
    }
    /**
     * Get session activity history
     */
    async getSessionActivity(sessionId, limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('session_activity')
                .select('*')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: false })
                .limit(limit);
            if (error)
                throw error;
            return (data || []).map(activity => ({
                sessionId: activity.session_id,
                timestamp: new Date(activity.timestamp),
                action: activity.action,
                ipAddress: activity.ip_address,
                userAgent: activity.user_agent,
            }));
        }
        catch (error) {
            console.error('Error fetching session activity:', error);
            return [];
        }
    }
    /**
     * Parse user agent string
     */
    parseUserAgent(userAgent) {
        if (!userAgent)
            return {};
        // Simple user agent parsing (in production, use a library like ua-parser-js)
        const result = {};
        // Browser detection
        if (userAgent.includes('Chrome'))
            result.browser = 'Chrome';
        else if (userAgent.includes('Firefox'))
            result.browser = 'Firefox';
        else if (userAgent.includes('Safari'))
            result.browser = 'Safari';
        else if (userAgent.includes('Edge'))
            result.browser = 'Edge';
        else
            result.browser = 'Unknown';
        // OS detection
        if (userAgent.includes('Windows'))
            result.os = 'Windows';
        else if (userAgent.includes('Mac'))
            result.os = 'macOS';
        else if (userAgent.includes('Linux'))
            result.os = 'Linux';
        else if (userAgent.includes('Android'))
            result.os = 'Android';
        else if (userAgent.includes('iOS'))
            result.os = 'iOS';
        else
            result.os = 'Unknown';
        // Device type
        if (userAgent.includes('Mobile'))
            result.deviceType = 'mobile';
        else if (userAgent.includes('Tablet'))
            result.deviceType = 'tablet';
        else
            result.deviceType = 'desktop';
        return result;
    }
    /**
     * Hash token for storage (simple hash for demo)
     */
    hashToken(token) {
        // In production, use proper hashing (e.g., SHA-256)
        return token.substring(0, 16);
    }
    /**
     * Map database session data to SessionInfo
     */
    mapSessionData(data) {
        return {
            id: data.id,
            userId: data.user_id,
            accessToken: '', // Don't expose actual token
            refreshToken: '',
            expiresAt: new Date(data.expires_at),
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            deviceId: data.device_id,
            deviceName: data.device_name,
            deviceType: data.device_type,
            browser: data.browser,
            os: data.os,
            ipAddress: data.ip_address,
            country: data.country,
            city: data.city,
            isActive: data.is_active,
            isCurrent: false, // Will be set by caller
            lastActivityAt: data.last_activity_at ? new Date(data.last_activity_at) : undefined,
        };
    }
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Format session duration
 */
export function formatSessionDuration(startDate, endDate = new Date()) {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0)
        return `${diffDays}d ${diffHours % 24}h ago`;
    if (diffHours > 0)
        return `${diffHours}h ${diffMins % 60}m ago`;
    if (diffMins > 0)
        return `${diffMins}m ago`;
    return 'Just now';
}
/**
 * Get device icon name
 */
export function getDeviceIcon(deviceType) {
    switch (deviceType) {
        case 'desktop': return 'computer';
        case 'mobile': return 'smartphone';
        case 'tablet': return 'tablet';
        default: return 'device_unknown';
    }
}
/**
 * Get browser icon
 */
export function getBrowserIcon(browser) {
    if (!browser)
        return 'public';
    const lowerBrowser = browser.toLowerCase();
    if (lowerBrowser.includes('chrome'))
        return 'chrome';
    if (lowerBrowser.includes('firefox'))
        return 'firefox';
    if (lowerBrowser.includes('safari'))
        return 'safari';
    if (lowerBrowser.includes('edge'))
        return 'edge';
    return 'public';
}
//# sourceMappingURL=sessionManagement.js.map