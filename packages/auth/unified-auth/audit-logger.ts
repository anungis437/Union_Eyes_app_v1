/**
 * @fileoverview Security Audit Logger
 * 
 * Tracks all authentication events for security compliance and monitoring.
 */

import { getSupabaseClient } from '@unioneyes/supabase';
import { AuthChangeEvent } from '@supabase/supabase-js';
import { logger } from '../src/utils/logger';

// Initialize supabase client
const supabase = getSupabaseClient();

// =========================================================================
// TYPES
// =========================================================================

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

// =========================================================================
// AUDIT LOGGER CLASS
// =========================================================================

export class AuditLogger {
  private static instance: AuditLogger;
  private queue: AuthAuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 10000; // 10 seconds
  private readonly MAX_QUEUE_SIZE = 50;

  private constructor() {
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
  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log authentication event
   */
  public async logAuthEvent(event: AuthAuditEvent): Promise<void> {
    try {
      // Enrich event with browser info
      const enrichedEvent: AuthAuditEvent = {
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
    } catch (error) {
      logger.error('Error logging auth event:', error);
    }
  }

  /**
   * Flush queue to database
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const events = [...this.queue];
    this.queue = [];

    try {
      const entries: Omit<AuditLogEntry, 'id' | 'created_at'>[] = events.map(event => ({
        user_id: event.userId,
        event_type: event.event,
        app_name: event.appName,
        timestamp: event.timestamp.toISOString(),
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        details: event.details,
      }));

      const { error } = await (supabase as any)
        .from('auth_audit_logs')
        .insert(entries);

      if (error) {
        logger.error('Error flushing audit logs:', error);
        // Re-add to queue on error
        this.queue.unshift(...events);
      }
    } catch (error) {
      logger.error('Error flushing audit logs:', error);
      // Re-add to queue on error
      this.queue.unshift(...events);
    }
  }

  /**
   * Start automatic flush interval
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop flush interval
   */
  public stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  /**
   * Get user's IP address
   */
  private async getIpAddress(): Promise<string | undefined> {
    try {
      // In production, this would be handled server-side
      // For now, we'll skip IP detection on client-side
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get user agent string
   */
  private getUserAgent(): string | undefined {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.userAgent;
    }
    return undefined;
  }

  /**
   * Query audit logs
   */
  public async getAuditLogs(options: {
    userId?: string;
    eventType?: string;
    appName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = (supabase as any)
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

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit summary for a user
   */
  public async getUserAuditSummary(userId: string, days: number = 30): Promise<{
    totalEvents: number;
    signInCount: number;
    signOutCount: number;
    failedAttempts: number;
    lastActivity: Date | null;
  }> {
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
    } catch (error) {
      logger.error('Error getting user audit summary:', error);
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
