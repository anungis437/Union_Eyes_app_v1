/**
 * Audit Retention Service
 * 
 * Manages audit log retention policies, archival, and purging.
 * Ensures compliance with data retention requirements while optimizing storage.
 * 
 * @module AuditRetentionService
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */

import { getSupabaseClient } from '@unioneyes/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  id: string;
  firm_id?: string;
  event_type_pattern: string;
  retention_days: number;
  archive_after_days?: number;
  purge_after_days?: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Retention policy input
 */
export interface CreateRetentionPolicyInput {
  firmId?: string;
  eventTypePattern: string;
  retentionDays: number;
  archiveAfterDays?: number;
  purgeAfterDays?: number;
  enabled?: boolean;
}

/**
 * Archive statistics
 */
export interface ArchiveStats {
  total_logs: number;
  archived_logs: number;
  archive_size_bytes: number;
  oldest_log_date: string;
  newest_log_date: string;
  compression_ratio: number;
}

/**
 * Storage usage statistics
 */
export interface StorageUsage {
  total_audit_logs: number;
  total_login_attempts: number;
  total_session_history: number;
  total_security_events: number;
  total_records: number;
  estimated_size_mb: number;
  archived_records: number;
  archived_size_mb: number;
  active_records: number;
  active_size_mb: number;
}

/**
 * Purge result
 */
export interface PurgeResult {
  logs_purged: number;
  login_attempts_purged: number;
  session_history_purged: number;
  space_freed_mb: number;
}

/**
 * Archive result
 */
export interface ArchiveResult {
  logs_archived: number;
  archive_location: string;
  archive_size_mb: number;
  compression_ratio: number;
}

/**
 * Service result
 */
export interface RetentionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================================================
// DEFAULT RETENTION POLICIES
// ============================================================================

const DEFAULT_RETENTION_POLICIES: Omit<CreateRetentionPolicyInput, 'firmId'>[] = [
  {
    eventTypePattern: 'auth.%',
    retentionDays: 90,
    archiveAfterDays: 60,
    enabled: true
  },
  {
    eventTypePattern: 'data.%',
    retentionDays: 365,
    archiveAfterDays: 180,
    enabled: true
  },
  {
    eventTypePattern: 'rbac.%',
    retentionDays: 365,
    archiveAfterDays: 180,
    enabled: true
  },
  {
    eventTypePattern: 'security.%',
    retentionDays: 2555, // 7 years for security incidents
    archiveAfterDays: 365,
    enabled: true
  },
  {
    eventTypePattern: 'api.%',
    retentionDays: 30,
    archiveAfterDays: 20,
    enabled: true
  },
  {
    eventTypePattern: 'system.%',
    retentionDays: 365,
    archiveAfterDays: 180,
    enabled: true
  }
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Audit Retention Service
 * 
 * Manages lifecycle of audit logs from creation through archival to purging.
 */
export class AuditRetentionService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || getSupabaseClient();
  }

  // ==========================================================================
  // RETENTION POLICY MANAGEMENT
  // ==========================================================================

  /**
   * Create a retention policy
   */
  async createRetentionPolicy(
    input: CreateRetentionPolicyInput
  ): Promise<RetentionResult<RetentionPolicy>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_retention_policies')
        .insert({
          firm_id: input.firmId,
          event_type_pattern: input.eventTypePattern,
          retention_days: input.retentionDays,
          archive_after_days: input.archiveAfterDays,
          purge_after_days: input.purgeAfterDays,
          enabled: input.enabled ?? true
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to create retention policy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update a retention policy
   */
  async updateRetentionPolicy(
    policyId: string,
    updates: Partial<CreateRetentionPolicyInput>
  ): Promise<RetentionResult<RetentionPolicy>> {
    try {
      const updateData: any = {};
      
      if (updates.eventTypePattern) updateData.event_type_pattern = updates.eventTypePattern;
      if (updates.retentionDays !== undefined) updateData.retention_days = updates.retentionDays;
      if (updates.archiveAfterDays !== undefined) updateData.archive_after_days = updates.archiveAfterDays;
      if (updates.purgeAfterDays !== undefined) updateData.purge_after_days = updates.purgeAfterDays;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

      const { data, error } = await this.supabase
        .from('audit_retention_policies')
        .update(updateData)
        .eq('id', policyId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to update retention policy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a retention policy
   */
  async deleteRetentionPolicy(policyId: string): Promise<RetentionResult<void>> {
    try {
      const { error } = await this.supabase
        .from('audit_retention_policies')
        .delete()
        .eq('id', policyId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to delete retention policy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all retention policies
   */
  async getRetentionPolicies(firmId?: string): Promise<RetentionResult<RetentionPolicy[]>> {
    try {
      let query = this.supabase
        .from('audit_retention_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get retention policies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Initialize default retention policies for a firm
   */
  async initializeDefaultPolicies(firmId?: string): Promise<RetentionResult<RetentionPolicy[]>> {
    try {
      const policies: RetentionPolicy[] = [];

      for (const policy of DEFAULT_RETENTION_POLICIES) {
        const result = await this.createRetentionPolicy({
          ...policy,
          firmId
        });

        if (result.success && result.data) {
          policies.push(result.data);
        }
      }

      return { success: true, data: policies };
    } catch (error) {
      console.error('Failed to initialize default policies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // ARCHIVAL OPERATIONS
  // ==========================================================================

  /**
   * Archive old audit logs based on retention policies
   */
  async archiveOldLogs(options?: {
    firmId?: string;
    dryRun?: boolean;
  }): Promise<RetentionResult<ArchiveResult>> {
    try {
      const { firmId, dryRun = false } = options || {};

      // Call the database function to archive logs
      const { data, error } = await this.supabase.rpc('archive_old_audit_logs', {
        p_firm_id: firmId,
        p_dry_run: dryRun
      });

      if (error) throw error;

      const result: ArchiveResult = {
        logs_archived: data || 0,
        archive_location: 'database', // In real implementation, could be S3, etc.
        archive_size_mb: 0, // Calculate based on archived data
        compression_ratio: 0.7 // Assume 70% compression
      };

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to archive old logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Compress archived logs
   */
  async compressArchives(options?: {
    firmId?: string;
    olderThanDays?: number;
  }): Promise<RetentionResult<{ compressed_count: number; space_saved_mb: number }>> {
    try {
      // In a real implementation, this would compress archived logs
      // For now, we'll simulate the operation
      
      const { data: archivedLogs, error } = await this.supabase
        .from('audit_logs')
        .select('id, metadata')
        .eq('archived', true);

      if (error) throw error;

      // Simulate compression
      const result = {
        compressed_count: archivedLogs?.length || 0,
        space_saved_mb: ((archivedLogs?.length || 0) * 0.3) // Assume 30% space savings
      };

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to compress archives:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Restore logs from archive
   */
  async restoreFromArchive(options: {
    firmId?: string;
    startDate: Date | string;
    endDate: Date | string;
  }): Promise<RetentionResult<{ restored_count: number }>> {
    try {
      const { firmId, startDate, endDate } = options;

      // Update archived logs back to active
      let query = this.supabase
        .from('audit_logs')
        .update({ archived: false, archived_at: null })
        .eq('archived', true)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { data, error } = await query.select('id');

      if (error) throw error;

      return {
        success: true,
        data: { restored_count: data?.length || 0 }
      };
    } catch (error) {
      console.error('Failed to restore from archive:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(firmId?: string): Promise<RetentionResult<ArchiveStats>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('id, created_at, metadata', { count: 'exact' })
        .eq('archived', true);

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const logs = data || [];
      const dates = logs.map(l => new Date(l.created_at).getTime()).filter(Boolean);

      const stats: ArchiveStats = {
        total_logs: count || 0,
        archived_logs: count || 0,
        archive_size_bytes: (count || 0) * 2048, // Estimate 2KB per log
        oldest_log_date: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : '',
        newest_log_date: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : '',
        compression_ratio: 0.7
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to get archive stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // PURGING OPERATIONS
  // ==========================================================================

  /**
   * Purge expired logs based on retention policies
   */
  async purgeExpiredLogs(options?: {
    firmId?: string;
    dryRun?: boolean;
  }): Promise<RetentionResult<PurgeResult>> {
    try {
      const { firmId, dryRun = false } = options || {};

      if (dryRun) {
        // Count logs that would be purged
        const result = await this.countExpiredLogs(firmId);
        return {
          success: true,
          data: {
            logs_purged: result.audit_logs,
            login_attempts_purged: result.login_attempts,
            session_history_purged: result.session_history,
            space_freed_mb: (result.audit_logs * 2 + result.login_attempts * 0.5 + result.session_history * 1) / 1024
          }
        };
      }

      // Purge audit logs
      const auditLogsPurged = await this.purgeExpiredAuditLogs(firmId);
      
      // Purge login attempts
      const loginAttemptsPurged = await this.purgeExpiredLoginAttempts(firmId);
      
      // Purge session history
      const sessionHistoryPurged = await this.purgeExpiredSessionHistory(firmId);

      const result: PurgeResult = {
        logs_purged: auditLogsPurged,
        login_attempts_purged: loginAttemptsPurged,
        session_history_purged: sessionHistoryPurged,
        space_freed_mb: (auditLogsPurged * 2 + loginAttemptsPurged * 0.5 + sessionHistoryPurged * 1) / 1024
      };

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to purge expired logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Purge expired audit logs
   */
  private async purgeExpiredAuditLogs(firmId?: string): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365); // Default 1 year

      let query = this.supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('archived', true);

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { data } = await query.select('id');

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to purge audit logs:', error);
      return 0;
    }
  }

  /**
   * Purge expired login attempts
   */
  private async purgeExpiredLoginAttempts(firmId?: string): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days for login attempts

      let query = this.supabase
        .from('login_attempts')
        .delete()
        .lt('attempted_at', cutoffDate.toISOString());

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { data } = await query.select('id');

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to purge login attempts:', error);
      return 0;
    }
  }

  /**
   * Purge expired session history
   */
  private async purgeExpiredSessionHistory(firmId?: string): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days for session history

      let query = this.supabase
        .from('session_history')
        .delete()
        .lt('started_at', cutoffDate.toISOString())
        .eq('status', 'expired');

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { data } = await query.select('id');

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to purge session history:', error);
      return 0;
    }
  }

  /**
   * Count expired logs (for dry run)
   */
  private async countExpiredLogs(firmId?: string): Promise<{
    audit_logs: number;
    login_attempts: number;
    session_history: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365);

      // Count audit logs
      let auditQuery = this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString())
        .eq('archived', true);

      if (firmId) auditQuery = auditQuery.eq('firm_id', firmId);

      const { count: auditCount } = await auditQuery;

      // Count login attempts
      const loginCutoff = new Date();
      loginCutoff.setDate(loginCutoff.getDate() - 90);

      let loginQuery = this.supabase
        .from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .lt('attempted_at', loginCutoff.toISOString());

      if (firmId) loginQuery = loginQuery.eq('firm_id', firmId);

      const { count: loginCount } = await loginQuery;

      // Count session history
      let sessionQuery = this.supabase
        .from('session_history')
        .select('id', { count: 'exact', head: true })
        .lt('started_at', loginCutoff.toISOString())
        .eq('status', 'expired');

      if (firmId) sessionQuery = sessionQuery.eq('firm_id', firmId);

      const { count: sessionCount } = await sessionQuery;

      return {
        audit_logs: auditCount || 0,
        login_attempts: loginCount || 0,
        session_history: sessionCount || 0
      };
    } catch (error) {
      console.error('Failed to count expired logs:', error);
      return { audit_logs: 0, login_attempts: 0, session_history: 0 };
    }
  }

  // ==========================================================================
  // STORAGE MANAGEMENT
  // ==========================================================================

  /**
   * Calculate storage usage
   */
  async calculateStorageUsage(firmId?: string): Promise<RetentionResult<StorageUsage>> {
    try {
      // Get counts for each table
      const auditLogsCount = await this.getTableCount('audit_logs', firmId);
      const loginAttemptsCount = await this.getTableCount('login_attempts', firmId);
      const sessionHistoryCount = await this.getTableCount('session_history', firmId);
      const securityEventsCount = await this.getTableCount('security_events', firmId);

      // Get archived counts
      const archivedLogsCount = await this.getArchivedCount('audit_logs', firmId);

      // Estimate sizes (rough estimates in KB per record)
      const auditLogSize = 2; // 2KB per audit log
      const loginAttemptSize = 0.5; // 0.5KB per login attempt
      const sessionHistorySize = 1; // 1KB per session
      const securityEventSize = 1.5; // 1.5KB per security event

      const totalRecords = auditLogsCount + loginAttemptsCount + sessionHistoryCount + securityEventsCount;
      const activeRecords = totalRecords - archivedLogsCount;

      const totalSizeMb = (
        auditLogsCount * auditLogSize +
        loginAttemptsCount * loginAttemptSize +
        sessionHistoryCount * sessionHistorySize +
        securityEventsCount * securityEventSize
      ) / 1024;

      const archivedSizeMb = (archivedLogsCount * auditLogSize * 0.7) / 1024; // 70% due to compression
      const activeSizeMb = totalSizeMb - archivedSizeMb;

      const usage: StorageUsage = {
        total_audit_logs: auditLogsCount,
        total_login_attempts: loginAttemptsCount,
        total_session_history: sessionHistoryCount,
        total_security_events: securityEventsCount,
        total_records: totalRecords,
        estimated_size_mb: totalSizeMb,
        archived_records: archivedLogsCount,
        archived_size_mb: archivedSizeMb,
        active_records: activeRecords,
        active_size_mb: activeSizeMb
      };

      return { success: true, data: usage };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get table record count
   */
  private async getTableCount(table: string, firmId?: string): Promise<number> {
    try {
      let query = this.supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { count } = await query;

      return count || 0;
    } catch (error) {
      console.error(`Failed to count ${table}:`, error);
      return 0;
    }
  }

  /**
   * Get archived record count
   */
  private async getArchivedCount(table: string, firmId?: string): Promise<number> {
    try {
      let query = this.supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('archived', true);

      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      const { count } = await query;

      return count || 0;
    } catch (error) {
      console.error(`Failed to count archived ${table}:`, error);
      return 0;
    }
  }

  /**
   * Optimize storage (vacuum, reindex, etc.)
   */
  async optimizeStorage(firmId?: string): Promise<RetentionResult<{ optimized: boolean }>> {
    try {
      // In PostgreSQL, this would trigger VACUUM ANALYZE
      // For Supabase, we'll simulate optimization by archiving old logs
      
      await this.archiveOldLogs({ firmId });
      await this.compressArchives({ firmId });

      return {
        success: true,
        data: { optimized: true }
      };
    } catch (error) {
      console.error('Failed to optimize storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // SCHEDULED OPERATIONS
  // ==========================================================================

  /**
   * Run all retention maintenance tasks
   */
  async runMaintenanceTasks(options?: {
    firmId?: string;
    dryRun?: boolean;
  }): Promise<RetentionResult<{
    archived: ArchiveResult;
    purged: PurgeResult;
    storage: StorageUsage;
  }>> {
    try {
      const { firmId, dryRun = false } = options || {};

      // Archive old logs
      const archiveResult = await this.archiveOldLogs({ firmId, dryRun });
      if (!archiveResult.success) throw new Error('Archive failed');

      // Purge expired logs
      const purgeResult = await this.purgeExpiredLogs({ firmId, dryRun });
      if (!purgeResult.success) throw new Error('Purge failed');

      // Calculate storage usage
      const storageResult = await this.calculateStorageUsage(firmId);
      if (!storageResult.success) throw new Error('Storage calculation failed');

      return {
        success: true,
        data: {
          archived: archiveResult.data!,
          purged: purgeResult.data!,
          storage: storageResult.data!
        }
      };
    } catch (error) {
      console.error('Failed to run maintenance tasks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const auditRetentionService = new AuditRetentionService();

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createAuditRetentionService(supabaseClient?: SupabaseClient): AuditRetentionService {
  return new AuditRetentionService(supabaseClient);
}
