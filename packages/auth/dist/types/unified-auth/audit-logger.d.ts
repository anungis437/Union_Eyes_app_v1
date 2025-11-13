/**
 * @fileoverview Security Audit Logger
 *
 * Tracks all authentication events for security compliance and monitoring.
 */
import { AuthChangeEvent } from '@supabase/supabase-js';
export interface AuthAuditEvent {
    event: AuthChangeEvent | 'SIGNED_UP' | 'PASSWORD_RECOVERY' | 'USER_UPDATED';
    userId: string;
    appName: string;
    timestamp: Date;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}
export interface AuditLogEntry {
    id?: string;
    user_id: string;
    event_type: string;
    app_name: string;
    timestamp: string;
    ip_address?: string;
    user_agent?: string;
    details?: Record<string, any>;
    created_at?: string;
}
export declare class AuditLogger {
    private static instance;
    private queue;
    private flushInterval;
    private readonly FLUSH_INTERVAL;
    private readonly MAX_QUEUE_SIZE;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): AuditLogger;
    /**
     * Log authentication event
     */
    logAuthEvent(event: AuthAuditEvent): Promise<void>;
    /**
     * Flush queue to database
     */
    private flush;
    /**
     * Start automatic flush interval
     */
    private startFlushInterval;
    /**
     * Stop flush interval
     */
    stop(): void;
    /**
     * Get user's IP address
     */
    private getIpAddress;
    /**
     * Get user agent string
     */
    private getUserAgent;
    /**
     * Query audit logs
     */
    getAuditLogs(options: {
        userId?: string;
        eventType?: string;
        appName?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<AuditLogEntry[]>;
    /**
     * Get audit summary for a user
     */
    getUserAuditSummary(userId: string, days?: number): Promise<{
        totalEvents: number;
        signInCount: number;
        signOutCount: number;
        failedAttempts: number;
        lastActivity: Date | null;
    }>;
}
export default AuditLogger;
//# sourceMappingURL=audit-logger.d.ts.map