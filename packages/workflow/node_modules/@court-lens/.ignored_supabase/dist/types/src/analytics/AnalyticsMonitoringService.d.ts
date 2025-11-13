/**
 * Analytics and Monitoring Service for CourtLens
 *
 * Provides comprehensive API analytics, performance monitoring, error tracking,
 * user activity analytics, compliance reporting, and real-time alerting for
 * the legal practice management platform.
 *
 * Features:
 * - API usage tracking and performance metrics
 * - Real-time error monitoring and incident management
 * - User activity analytics and engagement metrics
 * - Compliance reporting and audit trails
 * - Configurable alerting and notifications
 * - System health monitoring and diagnostics
 * - Data retention and cleanup management
 */
export interface APIUsageLog {
    id: string;
    organization_id: string;
    user_id?: string;
    api_key_id?: string;
    method: string;
    path: string;
    endpoint_category?: string;
    query_params?: Record<string, any>;
    status_code: number;
    response_size_bytes?: number;
    response_time_ms: number;
    ip_address?: string;
    user_agent?: string;
    client_version?: string;
    error_type?: string;
    error_message?: string;
    error_details?: Record<string, any>;
    cpu_time_ms?: number;
    memory_usage_mb?: number;
    db_queries_count?: number;
    db_query_time_ms?: number;
    rate_limit_bucket?: string;
    rate_limit_remaining?: number;
    data_classification?: string;
    access_scope?: string[];
    compliance_flags?: Record<string, any>;
    created_at: string;
}
export interface APIEndpointMetrics {
    id: string;
    organization_id: string;
    method: string;
    path_pattern: string;
    endpoint_category: string;
    hour_bucket: string;
    request_count: number;
    success_count: number;
    error_count: number;
    avg_response_time_ms: number;
    p50_response_time_ms: number;
    p95_response_time_ms: number;
    p99_response_time_ms: number;
    max_response_time_ms: number;
    avg_response_size_bytes: number;
    total_data_transferred_bytes: number;
    error_4xx_count: number;
    error_5xx_count: number;
    timeout_count: number;
    avg_db_queries_per_request: number;
    avg_db_time_per_request_ms: number;
    created_at: string;
}
export interface UserActivityAnalytics {
    id: string;
    organization_id: string;
    user_id: string;
    date_bucket: string;
    total_requests: number;
    unique_endpoints: number;
    total_session_time_minutes: number;
    documents_accessed: number;
    documents_created: number;
    documents_modified: number;
    matters_accessed: number;
    searches_performed: number;
    comments_added: number;
    shares_created: number;
    real_time_sessions: number;
    time_entries_created: number;
    billable_hours_logged: number;
    audit_logs_viewed: number;
    exports_performed: number;
    created_at: string;
}
export interface ErrorIncident {
    id: string;
    organization_id: string;
    error_type: string;
    error_code?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description?: string;
    endpoint?: string;
    user_id?: string;
    session_id?: string;
    request_id?: string;
    stack_trace?: string;
    error_data?: Record<string, any>;
    environment_info?: Record<string, any>;
    status: 'open' | 'investigating' | 'resolved' | 'ignored';
    assigned_to?: string;
    resolution_notes?: string;
    first_occurred_at: string;
    last_occurred_at: string;
    resolved_at?: string;
    affected_users_count: number;
    occurrence_count: number;
    created_at: string;
    updated_at: string;
}
export interface AlertRule {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    category: 'performance' | 'error_rate' | 'security' | 'compliance';
    is_active: boolean;
    metric_name: string;
    condition_operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
    threshold_value: number;
    time_window_minutes: number;
    evaluation_frequency_minutes: number;
    severity: 'info' | 'warning' | 'error' | 'critical';
    notification_channels: string[];
    escalation_rules?: Record<string, any>;
    cooldown_minutes: number;
    max_alerts_per_hour: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}
export interface AlertInstance {
    id: string;
    alert_rule_id: string;
    organization_id: string;
    title: string;
    message?: string;
    severity: string;
    metric_value: number;
    threshold_value: number;
    evaluation_data?: Record<string, any>;
    status: 'firing' | 'resolved' | 'silenced';
    acknowledged_by?: string;
    acknowledged_at?: string;
    resolved_at?: string;
    notifications_sent?: string[];
    last_notification_at?: string;
    created_at: string;
    updated_at: string;
}
export interface SystemHealthMetrics {
    id: string;
    timestamp_bucket: string;
    db_connections_active?: number;
    db_connections_idle?: number;
    db_slow_queries_count?: number;
    db_deadlocks_count?: number;
    db_cache_hit_ratio?: number;
    storage_used_gb?: number;
    storage_available_gb?: number;
    bandwidth_in_mb?: number;
    bandwidth_out_mb?: number;
    edge_function_invocations?: number;
    edge_function_errors?: number;
    edge_function_avg_duration_ms?: number;
    realtime_connections?: number;
    realtime_messages_sent?: number;
    realtime_channel_count?: number;
    auth_signins_count?: number;
    auth_failures_count?: number;
    auth_mfa_challenges?: number;
    created_at: string;
}
export interface ComplianceReport {
    id: string;
    organization_id: string;
    report_type: 'sox' | 'gdpr' | 'hipaa' | 'custom';
    report_name: string;
    reporting_period_start: string;
    reporting_period_end: string;
    findings?: any[];
    metrics?: Record<string, any>;
    recommendations?: any[];
    status: 'draft' | 'under_review' | 'approved' | 'published';
    generated_by?: string;
    reviewed_by?: string;
    approved_by?: string;
    report_file_path?: string;
    supporting_documents?: string[];
    created_at: string;
    updated_at: string;
}
export interface DataAccessLog {
    id: string;
    organization_id: string;
    user_id?: string;
    resource_type: string;
    resource_id?: string;
    resource_name?: string;
    access_type: 'read' | 'write' | 'delete' | 'export' | 'share';
    data_classification: string;
    contains_pii: boolean;
    contains_phi: boolean;
    contains_privileged_info: boolean;
    access_method?: string;
    business_justification?: string;
    matter_id?: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    requires_approval: boolean;
    approved_by?: string;
    approval_reason?: string;
    created_at: string;
}
export interface APIPerformanceDashboard {
    organization_id: string;
    endpoint_category: string;
    total_requests: number;
    avg_response_time: number;
    error_rate: number;
    worst_p99_response_time: number;
    total_data_mb: number;
}
export interface UserEngagementMetrics {
    organization_id: string;
    user_id: string;
    email: string;
    role: string;
    daily_requests: number;
    documents_accessed_today: number;
    searches_today: number;
    last_login_at?: string;
    activity_status: 'active_today' | 'active_week' | 'active_month' | 'inactive';
}
export interface SystemHealthOverview {
    timestamp_bucket: string;
    db_connections_active?: number;
    db_slow_queries_count?: number;
    db_cache_hit_ratio?: number;
    storage_used_gb?: number;
    storage_available_gb?: number;
    storage_usage_percent?: number;
    edge_function_invocations?: number;
    edge_function_errors?: number;
    edge_function_error_rate?: number;
    realtime_connections?: number;
    auth_signins_count?: number;
    auth_failures_count?: number;
    auth_failure_rate?: number;
}
/**
 * Analytics and Monitoring Service
 */
export declare class AnalyticsMonitoringService {
    private supabase;
    constructor(supabaseUrl: string, supabaseAnonKey: string);
    /**
     * Log API usage for monitoring and analytics
     */
    logAPIUsage(usage: Omit<APIUsageLog, 'id' | 'created_at'>): Promise<APIUsageLog>;
    /**
     * Get API usage logs with filtering and pagination
     */
    getAPIUsageLogs(params: {
        organization_id: string;
        start_time?: string;
        end_time?: string;
        endpoint_category?: string;
        user_id?: string;
        status_codes?: number[];
        limit?: number;
        offset?: number;
    }): Promise<APIUsageLog[]>;
    /**
     * Get aggregated API endpoint metrics
     */
    getAPIEndpointMetrics(params: {
        organization_id: string;
        start_time?: string;
        end_time?: string;
        endpoint_category?: string;
        path_pattern?: string;
    }): Promise<APIEndpointMetrics[]>;
    /**
     * Get API performance dashboard data
     */
    getAPIPerformanceDashboard(organization_id: string): Promise<APIPerformanceDashboard[]>;
    /**
     * Manually trigger API metrics aggregation
     */
    aggregateAPIUsageMetrics(startTime?: string, endTime?: string): Promise<number>;
    /**
     * Get user activity analytics
     */
    getUserActivityAnalytics(params: {
        organization_id: string;
        user_id?: string;
        start_date?: string;
        end_date?: string;
        limit?: number;
    }): Promise<UserActivityAnalytics[]>;
    /**
     * Get user engagement metrics
     */
    getUserEngagementMetrics(organization_id: string): Promise<UserEngagementMetrics[]>;
    /**
     * Manually trigger user activity analytics collection
     */
    collectUserActivityAnalytics(date?: string): Promise<number>;
    /**
     * Create error incident
     */
    createErrorIncident(incident: Omit<ErrorIncident, 'id' | 'created_at' | 'updated_at'>): Promise<ErrorIncident>;
    /**
     * Get error incidents
     */
    getErrorIncidents(params: {
        organization_id: string;
        status?: ErrorIncident['status'][];
        severity?: ErrorIncident['severity'][];
        error_type?: string;
        assigned_to?: string;
        limit?: number;
        offset?: number;
    }): Promise<ErrorIncident[]>;
    /**
     * Update error incident
     */
    updateErrorIncident(id: string, updates: Partial<ErrorIncident>): Promise<ErrorIncident>;
    /**
     * Resolve error incident
     */
    resolveErrorIncident(id: string, resolution_notes?: string, resolved_by?: string): Promise<ErrorIncident>;
    /**
     * Create alert rule
     */
    createAlertRule(rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>): Promise<AlertRule>;
    /**
     * Get alert rules
     */
    getAlertRules(organization_id: string, category?: string): Promise<AlertRule[]>;
    /**
     * Update alert rule
     */
    updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule>;
    /**
     * Delete alert rule
     */
    deleteAlertRule(id: string): Promise<void>;
    /**
     * Get alert instances
     */
    getAlertInstances(params: {
        organization_id: string;
        alert_rule_id?: string;
        status?: AlertInstance['status'][];
        severity?: string[];
        limit?: number;
        offset?: number;
    }): Promise<AlertInstance[]>;
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(id: string, acknowledged_by: string): Promise<AlertInstance>;
    /**
     * Manually evaluate alert rules
     */
    evaluateAlertRules(): Promise<number>;
    /**
     * Get system health metrics
     */
    getSystemHealthMetrics(params: {
        start_time?: string;
        end_time?: string;
        limit?: number;
    }): Promise<SystemHealthMetrics[]>;
    /**
     * Get system health overview
     */
    getSystemHealthOverview(): Promise<SystemHealthOverview[]>;
    /**
     * Create compliance report
     */
    createComplianceReport(report: Omit<ComplianceReport, 'id' | 'created_at' | 'updated_at'>): Promise<ComplianceReport>;
    /**
     * Get compliance reports
     */
    getComplianceReports(params: {
        organization_id: string;
        report_type?: string;
        status?: ComplianceReport['status'][];
        start_period?: string;
        end_period?: string;
        limit?: number;
    }): Promise<ComplianceReport[]>;
    /**
     * Update compliance report
     */
    updateComplianceReport(id: string, updates: Partial<ComplianceReport>): Promise<ComplianceReport>;
    /**
     * Log data access for compliance
     */
    logDataAccess(access: Omit<DataAccessLog, 'id' | 'created_at'>): Promise<DataAccessLog>;
    /**
     * Get data access logs
     */
    getDataAccessLogs(params: {
        organization_id: string;
        user_id?: string;
        resource_type?: string;
        access_type?: string;
        contains_pii?: boolean;
        start_time?: string;
        end_time?: string;
        limit?: number;
        offset?: number;
    }): Promise<DataAccessLog[]>;
    /**
     * Cleanup old monitoring data
     */
    cleanupMonitoringData(): Promise<string>;
    /**
     * Export analytics data
     */
    exportAnalyticsData(params: {
        organization_id: string;
        data_type: 'api_usage' | 'user_activity' | 'error_incidents' | 'compliance_logs';
        start_time: string;
        end_time: string;
        format?: 'json' | 'csv';
    }): Promise<any[]>;
}
/**
 * Hook for API performance monitoring
 */
export declare function useAPIPerformance(organizationId: string): {
    performance: APIPerformanceDashboard[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};
/**
 * Hook for error incident management
 */
export declare function useErrorIncidents(organizationId: string): {
    incidents: ErrorIncident[];
    loading: boolean;
    error: string | null;
    fetchIncidents: (params?: {
        status?: ErrorIncident["status"][];
        severity?: ErrorIncident["severity"][];
    }) => Promise<void>;
    resolveIncident: (id: string, notes?: string) => Promise<void>;
};
/**
 * Hook for alert management
 */
export declare function useAlerts(organizationId: string): {
    rules: AlertRule[];
    instances: AlertInstance[];
    loading: boolean;
    error: string | null;
    createRule: (rule: Omit<AlertRule, "id" | "created_at" | "updated_at">) => Promise<void>;
    acknowledgeAlert: (id: string, userId: string) => Promise<void>;
    refetch: () => Promise<void>;
};
/**
 * Hook for user engagement analytics
 */
export declare function useUserEngagement(organizationId: string): {
    engagement: UserEngagementMetrics[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};
/**
 * Hook for system health monitoring
 */
export declare function useSystemHealth(): {
    health: SystemHealthOverview[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};
export default AnalyticsMonitoringService;
//# sourceMappingURL=AnalyticsMonitoringService.d.ts.map