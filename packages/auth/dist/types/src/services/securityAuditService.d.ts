/**
 * Security Audit Service
 *
 * Comprehensive audit logging service for security monitoring, compliance,
 * and forensic analysis. Supports SOC2, GDPR, and HIPAA requirements.
 *
 * @module SecurityAuditService
 * @author CourtLens Platform Team
 * @date October 23, 2025
 * @phase Phase 2 Week 1 Day 7
 */
import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Audit log action types (matches database enum)
 */
export type AuditLogActionType = 'auth.login.success' | 'auth.login.failed' | 'auth.logout' | 'auth.signup' | 'auth.password_reset_requested' | 'auth.password_reset_completed' | 'auth.password_changed' | 'auth.email_verified' | 'auth.email_verification_sent' | 'auth.session_created' | 'auth.session_renewed' | 'auth.session_expired' | 'auth.session_terminated' | 'auth.concurrent_login_detected' | 'auth.suspicious_login_blocked' | 'auth.2fa_enabled' | 'auth.2fa_disabled' | 'auth.2fa_verified' | 'auth.2fa_failed' | 'auth.2fa_recovery_used' | 'user.created' | 'user.updated' | 'user.deleted' | 'user.profile_viewed' | 'user.profile_updated' | 'user.avatar_uploaded' | 'user.avatar_deleted' | 'user.preferences_updated' | 'rbac.role_assigned' | 'rbac.role_removed' | 'rbac.permission_granted' | 'rbac.permission_revoked' | 'rbac.access_granted' | 'rbac.access_denied' | 'rbac.privilege_escalation_attempted' | 'data.matter_created' | 'data.matter_viewed' | 'data.matter_updated' | 'data.matter_deleted' | 'data.client_created' | 'data.client_viewed' | 'data.client_updated' | 'data.client_deleted' | 'data.document_uploaded' | 'data.document_viewed' | 'data.document_downloaded' | 'data.document_deleted' | 'data.sensitive_data_accessed' | 'data.pii_accessed' | 'data.financial_data_accessed' | 'data.exported' | 'data.imported' | 'data.bulk_download' | 'data.report_generated' | 'api.call' | 'api.rate_limit_exceeded' | 'api.invalid_request' | 'api.unauthorized_access' | 'system.config_changed' | 'system.integration_enabled' | 'system.integration_disabled' | 'system.backup_created' | 'system.restore_completed' | 'security.anomaly_detected' | 'security.brute_force_detected' | 'security.data_breach_suspected' | 'security.unusual_activity' | 'security.ip_blocked' | 'security.session_hijack_suspected';
/**
 * Risk level for audit events
 */
export type AuditRiskLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';
/**
 * Resource types being audited
 */
export type AuditResourceType = 'user' | 'profile' | 'session' | 'matter' | 'client' | 'document' | 'task' | 'note' | 'email' | 'billing' | 'invoice' | 'role' | 'permission' | 'organization' | 'team' | 'api_key' | 'webhook' | 'integration' | 'report' | 'export' | 'system_config';
/**
 * Login result status
 */
export type LoginResult = 'success' | 'failed_invalid_credentials' | 'failed_account_locked' | 'failed_2fa_required' | 'failed_2fa_invalid' | 'failed_email_not_verified' | 'failed_account_disabled' | 'failed_ip_blocked' | 'failed_rate_limited';
/**
 * Session status
 */
export type SessionStatus = 'active' | 'expired' | 'terminated' | 'suspicious' | 'hijacked';
/**
 * Audit log entry
 */
export interface AuditLog {
    id: string;
    firm_id?: string;
    user_id?: string;
    session_id?: string;
    action_type: AuditLogActionType;
    resource_type?: AuditResourceType;
    resource_id?: string;
    ip_address?: string;
    user_agent?: string;
    request_id?: string;
    api_endpoint?: string;
    http_method?: string;
    http_status_code?: number;
    country_code?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    risk_level: AuditRiskLevel;
    success: boolean;
    failure_reason?: string;
    before_state?: Record<string, any>;
    after_state?: Record<string, any>;
    metadata?: Record<string, any>;
    error_code?: string;
    error_message?: string;
    stack_trace?: string;
    response_time_ms?: number;
    created_at: string;
    retention_days: number;
    archived: boolean;
    archived_at?: string;
}
/**
 * Login attempt entry
 */
export interface LoginAttempt {
    id: string;
    firm_id?: string;
    user_id?: string;
    email: string;
    result: LoginResult;
    ip_address: string;
    user_agent?: string;
    country_code?: string;
    region?: string;
    city?: string;
    is_suspicious: boolean;
    consecutive_failures: number;
    metadata?: Record<string, any>;
    attempted_at: string;
    retention_days: number;
}
/**
 * Session history entry
 */
export interface SessionHistory {
    id: string;
    firm_id?: string;
    user_id: string;
    session_id: string;
    status: SessionStatus;
    started_at: string;
    last_activity_at: string;
    ended_at?: string;
    duration_seconds?: number;
    ip_address?: string;
    user_agent?: string;
    device_type?: string;
    os?: string;
    browser?: string;
    country_code?: string;
    region?: string;
    city?: string;
    is_suspicious: boolean;
    concurrent_sessions: number;
    location_changed: boolean;
    page_views: number;
    api_calls: number;
    metadata?: Record<string, any>;
    retention_days: number;
}
/**
 * Security event entry
 */
export interface SecurityEvent {
    id: string;
    firm_id?: string;
    user_id?: string;
    event_type: string;
    severity: AuditRiskLevel;
    title: string;
    description: string;
    related_user_id?: string;
    related_resource_type?: AuditResourceType;
    related_resource_id?: string;
    ip_address?: string;
    user_agent?: string;
    acknowledged: boolean;
    acknowledged_by?: string;
    acknowledged_at?: string;
    resolved: boolean;
    resolved_by?: string;
    resolved_at?: string;
    resolution_notes?: string;
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
    retention_days: number;
}
/**
 * Options for creating audit log
 */
export interface CreateAuditLogOptions {
    firmId?: string;
    userId?: string;
    sessionId?: string;
    actionType: AuditLogActionType;
    resourceType?: AuditResourceType;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    apiEndpoint?: string;
    httpMethod?: string;
    httpStatusCode?: number;
    riskLevel?: AuditRiskLevel;
    success?: boolean;
    failureReason?: string;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    metadata?: Record<string, any>;
    errorCode?: string;
    errorMessage?: string;
    stackTrace?: string;
    responseTimeMs?: number;
}
/**
 * Filter options for querying audit logs
 */
export interface AuditLogFilters {
    firmId?: string;
    userId?: string;
    sessionId?: string;
    actionType?: AuditLogActionType | AuditLogActionType[];
    resourceType?: AuditResourceType | AuditResourceType[];
    resourceId?: string;
    riskLevel?: AuditRiskLevel | AuditRiskLevel[];
    success?: boolean;
    ipAddress?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'risk_level';
    orderDirection?: 'asc' | 'desc';
}
/**
 * Result of audit log operation
 */
export interface AuditLogResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}
/**
 * Batch audit log options
 */
export interface BatchAuditLogOptions {
    logs: CreateAuditLogOptions[];
}
/**
 * Security timeline entry
 */
export interface SecurityTimelineEntry {
    timestamp: string;
    type: 'audit' | 'login' | 'session' | 'security_event';
    action: string;
    user_id?: string;
    user_email?: string;
    risk_level: AuditRiskLevel;
    success: boolean;
    details: string;
    metadata?: Record<string, any>;
}
/**
 * User activity summary
 */
export interface UserActivitySummary {
    user_id: string;
    total_actions: number;
    successful_actions: number;
    failed_actions: number;
    high_risk_actions: number;
    last_activity: string;
    most_common_actions: Array<{
        action: string;
        count: number;
    }>;
    access_patterns: {
        by_hour: Record<number, number>;
        by_day: Record<string, number>;
        by_resource: Record<string, number>;
    };
}
/**
 * Export format for audit logs
 */
export type ExportFormat = 'json' | 'csv' | 'xlsx';
/**
 * Security Audit Service
 *
 * Comprehensive service for managing security audit logs, login attempts,
 * session history, and security events.
 */
export declare class SecurityAuditService {
    private supabase;
    constructor(supabaseClient?: SupabaseClient);
    /**
     * Log an authentication event
     */
    logAuthEvent(options: {
        firmId?: string;
        userId?: string;
        sessionId?: string;
        actionType: Extract<AuditLogActionType, `auth.${string}`>;
        success?: boolean;
        failureReason?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<AuditLogResult<string>>;
    /**
     * Log a data access event
     */
    logDataAccess(options: {
        firmId?: string;
        userId?: string;
        sessionId?: string;
        resourceType: AuditResourceType;
        resourceId: string;
        actionType: Extract<AuditLogActionType, `data.${string}`>;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<AuditLogResult<string>>;
    /**
     * Log a data modification event
     */
    logDataModification(options: {
        firmId?: string;
        userId?: string;
        sessionId?: string;
        resourceType: AuditResourceType;
        resourceId: string;
        actionType: Extract<AuditLogActionType, `data.${string}`>;
        beforeState?: Record<string, any>;
        afterState?: Record<string, any>;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<AuditLogResult<string>>;
    /**
     * Log a permission check event
     */
    logPermissionCheck(options: {
        firmId?: string;
        userId?: string;
        sessionId?: string;
        actionType: Extract<AuditLogActionType, `rbac.${string}`>;
        resourceType?: AuditResourceType;
        resourceId?: string;
        granted: boolean;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<AuditLogResult<string>>;
    /**
     * Log a security event
     */
    logSecurityEvent(options: {
        firmId?: string;
        userId?: string;
        eventType: string;
        severity: AuditRiskLevel;
        title: string;
        description: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<AuditLogResult<string>>;
    /**
     * Log a login attempt
     */
    logLoginAttempt(options: {
        firmId?: string;
        userId?: string;
        email: string;
        result: LoginResult;
        ipAddress: string;
        userAgent?: string;
        isSuspicious?: boolean;
        metadata?: Record<string, any>;
    }): Promise<AuditLogResult<string>>;
    /**
     * Log or update session
     */
    logSessionEvent(options: {
        firmId?: string;
        userId: string;
        sessionId: string;
        status?: SessionStatus;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuditLogResult<string>>;
    /**
     * Log API access
     */
    logAPIAccess(options: {
        firmId?: string;
        userId?: string;
        sessionId?: string;
        endpoint: string;
        method: string;
        statusCode: number;
        responseTimeMs: number;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<AuditLogResult<string>>;
    /**
     * Create audit log entry (generic)
     */
    createAuditLog(options: CreateAuditLogOptions): Promise<AuditLogResult<string>>;
    /**
     * Batch create audit logs (for performance)
     */
    batchCreateAuditLogs(options: BatchAuditLogOptions): Promise<AuditLogResult<string[]>>;
    /**
     * Get audit logs with filters
     */
    getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogResult<AuditLog[]>>;
    /**
     * Search audit logs
     */
    searchAuditLogs(searchTerm: string, filters?: AuditLogFilters): Promise<AuditLogResult<AuditLog[]>>;
    /**
     * Get security timeline (combined view of all security-relevant events)
     */
    getSecurityTimeline(options: {
        firmId?: string;
        userId?: string;
        startDate?: Date | string;
        endDate?: Date | string;
        limit?: number;
    }): Promise<AuditLogResult<SecurityTimelineEntry[]>>;
    /**
     * Get login history
     */
    getLoginHistory(options: {
        firmId?: string;
        userId?: string;
        email?: string;
        startDate?: Date | string;
        endDate?: Date | string;
        limit?: number;
    }): Promise<AuditLogResult<LoginAttempt[]>>;
    /**
     * Get data access history
     */
    getDataAccessHistory(options: {
        firmId?: string;
        userId?: string;
        resourceType?: AuditResourceType;
        resourceId?: string;
        startDate?: Date | string;
        endDate?: Date | string;
        limit?: number;
    }): Promise<AuditLogResult<AuditLog[]>>;
    /**
     * Get user activity summary
     */
    getUserActivity(userId: string, days?: number): Promise<AuditLogResult<UserActivitySummary>>;
    /**
     * Get high-risk events
     */
    getHighRiskEvents(options: {
        firmId?: string;
        startDate?: Date | string;
        endDate?: Date | string;
        limit?: number;
    }): Promise<AuditLogResult<AuditLog[]>>;
    /**
     * Get security events
     */
    getSecurityEvents(options: {
        firmId?: string;
        resolved?: boolean;
        severity?: AuditRiskLevel | AuditRiskLevel[];
        limit?: number;
    }): Promise<AuditLogResult<SecurityEvent[]>>;
    /**
     * Export audit logs
     */
    exportAuditLogs(filters: AuditLogFilters, format?: ExportFormat): Promise<AuditLogResult<string>>;
    /**
     * Calculate risk level for authentication events
     */
    private calculateAuthRiskLevel;
    /**
     * Calculate risk level for data access events
     */
    private calculateDataAccessRiskLevel;
    /**
     * Calculate risk level for API events
     */
    private calculateAPIRiskLevel;
    /**
     * Format audit log details for timeline
     */
    private formatAuditLogDetails;
    /**
     * Calculate most common actions
     */
    private calculateMostCommonActions;
    /**
     * Calculate access patterns
     */
    private calculateAccessPatterns;
    /**
     * Convert audit logs to CSV format
     */
    private convertToCSV;
}
export declare const securityAuditService: SecurityAuditService;
export declare function createSecurityAuditService(supabaseClient?: SupabaseClient): SecurityAuditService;
//# sourceMappingURL=securityAuditService.d.ts.map