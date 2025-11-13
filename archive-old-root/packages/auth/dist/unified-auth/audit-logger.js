/**
 * @fileoverview Security Audit Logger
 *
 * Tracks all authentication events for security compliance and monitoring.
 */
import { getSupabaseClient } from '@court-lens/supabase';
// Initialize supabase client
const supabase = getSupabaseClient();
// =========================================================================
// AUDIT LOGGER CLASS
// =========================================================================
export class AuditLogger {
    constructor() {
        this.queue = [];
        this.flushInterval = null;
        this.FLUSH_INTERVAL = 10000; // 10 seconds
        this.MAX_QUEUE_SIZE = 50;
        this.startFlushInterval();
        // Flush on page unload
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.flush();
            });
        }
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }
    /**
     * Log authentication event
     */
    async logAuthEvent(event) {
        try {
            // Enrich event with browser info
            const enrichedEvent = {
                ...event,
                ipAddress: await this.getIpAddress(),
                userAgent: this.getUserAgent(),
            };
            // Add to queue
            this.queue.push(enrichedEvent);
            // Flush if queue is full
            if (this.queue.length >= this.MAX_QUEUE_SIZE) {
                await this.flush();
            }
        }
        catch (error) {
            console.error('Error logging auth event:', error);
        }
    }
    /**
     * Flush queue to database
     */
    async flush() {
        if (this.queue.length === 0) {
            return;
        }
        const events = [...this.queue];
        this.queue = [];
        try {
            const entries = events.map(event => ({
                user_id: event.userId,
                event_type: event.event,
                app_name: event.appName,
                timestamp: event.timestamp.toISOString(),
                ip_address: event.ipAddress,
                user_agent: event.userAgent,
                details: event.details,
            }));
            const { error } = await supabase
                .from('auth_audit_logs')
                .insert(entries);
            if (error) {
                console.error('Error flushing audit logs:', error);
                // Re-add to queue on error
                this.queue.unshift(...events);
            }
        }
        catch (error) {
            console.error('Error flushing audit logs:', error);
            // Re-add to queue on error
            this.queue.unshift(...events);
        }
    }
    /**
     * Start automatic flush interval
     */
    startFlushInterval() {
        this.flushInterval = setInterval(() => {
            this.flush();
        }, this.FLUSH_INTERVAL);
    }
    /**
     * Stop flush interval
     */
    stop() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flush();
    }
    /**
     * Get user's IP address
     */
    async getIpAddress() {
        try {
            // In production, this would be handled server-side
            // For now, we'll skip IP detection on client-side
            return undefined;
        }
        catch (error) {
            return undefined;
        }
    }
    /**
     * Get user agent string
     */
    getUserAgent() {
        if (typeof window !== 'undefined' && window.navigator) {
            return window.navigator.userAgent;
        }
        return undefined;
    }
    /**
     * Query audit logs
     */
    async getAuditLogs(options) {
        try {
            let query = supabase
                .from('auth_audit_logs')
                .select('*')
                .order('timestamp', { ascending: false });
            if (options.userId) {
                query = query.eq('user_id', options.userId);
            }
            if (options.eventType) {
                query = query.eq('event_type', options.eventType);
            }
            if (options.appName) {
                query = query.eq('app_name', options.appName);
            }
            if (options.startDate) {
                query = query.gte('timestamp', options.startDate.toISOString());
            }
            if (options.endDate) {
                query = query.lte('timestamp', options.endDate.toISOString());
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }
    }
    /**
     * Get audit summary for a user
     */
    async getUserAuditSummary(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const logs = await this.getAuditLogs({
                userId,
                startDate,
            });
            return {
                totalEvents: logs.length,
                signInCount: logs.filter(log => log.event_type === 'SIGNED_IN').length,
                signOutCount: logs.filter(log => log.event_type === 'SIGNED_OUT').length,
                failedAttempts: logs.filter(log => log.event_type === 'PASSWORD_RECOVERY').length,
                lastActivity: logs.length > 0 ? new Date(logs[0].timestamp) : null,
            };
        }
        catch (error) {
            console.error('Error getting user audit summary:', error);
            return {
                totalEvents: 0,
                signInCount: 0,
                signOutCount: 0,
                failedAttempts: 0,
                lastActivity: null,
            };
        }
    }
}
// =========================================================================
// EXPORTS
// =========================================================================
export default AuditLogger;
//# sourceMappingURL=audit-logger.js.map