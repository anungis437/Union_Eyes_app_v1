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
import type { SupabaseClient } from '@supabase/supabase-js';
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
/**
 * Audit Retention Service
 *
 * Manages lifecycle of audit logs from creation through archival to purging.
 */
export declare class AuditRetentionService {
    private supabase;
    constructor(supabaseClient?: SupabaseClient);
    /**
     * Create a retention policy
     */
    createRetentionPolicy(input: CreateRetentionPolicyInput): Promise<RetentionResult<RetentionPolicy>>;
    /**
     * Update a retention policy
     */
    updateRetentionPolicy(policyId: string, updates: Partial<CreateRetentionPolicyInput>): Promise<RetentionResult<RetentionPolicy>>;
    /**
     * Delete a retention policy
     */
    deleteRetentionPolicy(policyId: string): Promise<RetentionResult<void>>;
    /**
     * Get all retention policies
     */
    getRetentionPolicies(firmId?: string): Promise<RetentionResult<RetentionPolicy[]>>;
    /**
     * Initialize default retention policies for a firm
     */
    initializeDefaultPolicies(firmId?: string): Promise<RetentionResult<RetentionPolicy[]>>;
    /**
     * Archive old audit logs based on retention policies
     */
    archiveOldLogs(options?: {
        firmId?: string;
        dryRun?: boolean;
    }): Promise<RetentionResult<ArchiveResult>>;
    /**
     * Compress archived logs
     */
    compressArchives(options?: {
        firmId?: string;
        olderThanDays?: number;
    }): Promise<RetentionResult<{
        compressed_count: number;
        space_saved_mb: number;
    }>>;
    /**
     * Restore logs from archive
     */
    restoreFromArchive(options: {
        firmId?: string;
        startDate: Date | string;
        endDate: Date | string;
    }): Promise<RetentionResult<{
        restored_count: number;
    }>>;
    /**
     * Get archive statistics
     */
    getArchiveStats(firmId?: string): Promise<RetentionResult<ArchiveStats>>;
    /**
     * Purge expired logs based on retention policies
     */
    purgeExpiredLogs(options?: {
        firmId?: string;
        dryRun?: boolean;
    }): Promise<RetentionResult<PurgeResult>>;
    /**
     * Purge expired audit logs
     */
    private purgeExpiredAuditLogs;
    /**
     * Purge expired login attempts
     */
    private purgeExpiredLoginAttempts;
    /**
     * Purge expired session history
     */
    private purgeExpiredSessionHistory;
    /**
     * Count expired logs (for dry run)
     */
    private countExpiredLogs;
    /**
     * Calculate storage usage
     */
    calculateStorageUsage(firmId?: string): Promise<RetentionResult<StorageUsage>>;
    /**
     * Get table record count
     */
    private getTableCount;
    /**
     * Get archived record count
     */
    private getArchivedCount;
    /**
     * Optimize storage (vacuum, reindex, etc.)
     */
    optimizeStorage(firmId?: string): Promise<RetentionResult<{
        optimized: boolean;
    }>>;
    /**
     * Run all retention maintenance tasks
     */
    runMaintenanceTasks(options?: {
        firmId?: string;
        dryRun?: boolean;
    }): Promise<RetentionResult<{
        archived: ArchiveResult;
        purged: PurgeResult;
        storage: StorageUsage;
    }>>;
}
export declare const auditRetentionService: AuditRetentionService;
export declare function createAuditRetentionService(supabaseClient?: SupabaseClient): AuditRetentionService;
//# sourceMappingURL=auditRetentionService.d.ts.map