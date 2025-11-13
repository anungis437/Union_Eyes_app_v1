import { createClient } from '@supabase/supabase-js';
// import { Database } from '../types/database';
type Database = any; // TODO: Generate from Supabase schema

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
export class AnalyticsMonitoringService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  // ============================================================================
  // API USAGE TRACKING
  // ============================================================================

  /**
   * Log API usage for monitoring and analytics
   */
  async logAPIUsage(usage: Omit<APIUsageLog, 'id' | 'created_at'>): Promise<APIUsageLog> {
    const { data, error } = await this.supabase
      .from('api_usage_logs')
      .insert([usage])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get API usage logs with filtering and pagination
   */
  async getAPIUsageLogs(params: {
    organization_id: string;
    start_time?: string;
    end_time?: string;
    endpoint_category?: string;
    user_id?: string;
    status_codes?: number[];
    limit?: number;
    offset?: number;
  }): Promise<APIUsageLog[]> {
    let query = this.supabase
      .from('api_usage_logs')
      .select('*')
      .eq('organization_id', params.organization_id)
      .order('created_at', { ascending: false });

    if (params.start_time) {
      query = query.gte('created_at', params.start_time);
    }

    if (params.end_time) {
      query = query.lte('created_at', params.end_time);
    }

    if (params.endpoint_category) {
      query = query.eq('endpoint_category', params.endpoint_category);
    }

    if (params.user_id) {
      query = query.eq('user_id', params.user_id);
    }

    if (params.status_codes) {
      query = query.in('status_code', params.status_codes);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get aggregated API endpoint metrics
   */
  async getAPIEndpointMetrics(params: {
    organization_id: string;
    start_time?: string;
    end_time?: string;
    endpoint_category?: string;
    path_pattern?: string;
  }): Promise<APIEndpointMetrics[]> {
    let query = this.supabase
      .from('api_endpoint_metrics')
      .select('*')
      .eq('organization_id', params.organization_id)
      .order('hour_bucket', { ascending: false });

    if (params.start_time) {
      query = query.gte('hour_bucket', params.start_time);
    }

    if (params.end_time) {
      query = query.lte('hour_bucket', params.end_time);
    }

    if (params.endpoint_category) {
      query = query.eq('endpoint_category', params.endpoint_category);
    }

    if (params.path_pattern) {
      query = query.eq('path_pattern', params.path_pattern);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get API performance dashboard data
   */
  async getAPIPerformanceDashboard(organization_id: string): Promise<APIPerformanceDashboard[]> {
    const { data, error } = await this.supabase
      .from('api_performance_dashboard')
      .select('*')
      .eq('organization_id', organization_id);

    if (error) throw error;
    return data || [];
  }

  /**
   * Manually trigger API metrics aggregation
   */
  async aggregateAPIUsageMetrics(startTime?: string, endTime?: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('aggregate_api_usage_metrics', {
      p_start_time: startTime,
      p_end_time: endTime
    });

    if (error) throw error;
    return data || 0;
  }

  // ============================================================================
  // USER ACTIVITY ANALYTICS
  // ============================================================================

  /**
   * Get user activity analytics
   */
  async getUserActivityAnalytics(params: {
    organization_id: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<UserActivityAnalytics[]> {
    let query = this.supabase
      .from('user_activity_analytics')
      .select('*')
      .eq('organization_id', params.organization_id)
      .order('date_bucket', { ascending: false });

    if (params.user_id) {
      query = query.eq('user_id', params.user_id);
    }

    if (params.start_date) {
      query = query.gte('date_bucket', params.start_date);
    }

    if (params.end_date) {
      query = query.lte('date_bucket', params.end_date);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(organization_id: string): Promise<UserEngagementMetrics[]> {
    const { data, error } = await this.supabase
      .from('user_engagement_metrics')
      .select('*')
      .eq('organization_id', organization_id);

    if (error) throw error;
    return data || [];
  }

  /**
   * Manually trigger user activity analytics collection
   */
  async collectUserActivityAnalytics(date?: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('collect_user_activity_analytics', {
      p_date: date
    });

    if (error) throw error;
    return data || 0;
  }

  // ============================================================================
  // ERROR MONITORING AND INCIDENT MANAGEMENT
  // ============================================================================

  /**
   * Create error incident
   */
  async createErrorIncident(incident: Omit<ErrorIncident, 'id' | 'created_at' | 'updated_at'>): Promise<ErrorIncident> {
    const { data, error } = await this.supabase
      .from('error_incidents')
      .insert([incident])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get error incidents
   */
  async getErrorIncidents(params: {
    organization_id: string;
    status?: ErrorIncident['status'][];
    severity?: ErrorIncident['severity'][];
    error_type?: string;
    assigned_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<ErrorIncident[]> {
    let query = this.supabase
      .from('error_incidents')
      .select('*')
      .eq('organization_id', params.organization_id)
      .order('first_occurred_at', { ascending: false });

    if (params.status) {
      query = query.in('status', params.status);
    }

    if (params.severity) {
      query = query.in('severity', params.severity);
    }

    if (params.error_type) {
      query = query.eq('error_type', params.error_type);
    }

    if (params.assigned_to) {
      query = query.eq('assigned_to', params.assigned_to);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Update error incident
   */
  async updateErrorIncident(id: string, updates: Partial<ErrorIncident>): Promise<ErrorIncident> {
    const { data, error } = await this.supabase
      .from('error_incidents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Resolve error incident
   */
  async resolveErrorIncident(id: string, resolution_notes?: string, resolved_by?: string): Promise<ErrorIncident> {
    return this.updateErrorIncident(id, {
      status: 'resolved',
      resolution_notes,
      resolved_at: new Date().toISOString()
    });
  }

  // ============================================================================
  // ALERTING SYSTEM
  // ============================================================================

  /**
   * Create alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>): Promise<AlertRule> {
    const { data, error } = await this.supabase
      .from('alert_rules')
      .insert([rule])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get alert rules
   */
  async getAlertRules(organization_id: string, category?: string): Promise<AlertRule[]> {
    let query = this.supabase
      .from('alert_rules')
      .select('*')
      .eq('organization_id', organization_id)
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const { data, error } = await this.supabase
      .from('alert_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('alert_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get alert instances
   */
  async getAlertInstances(params: {
    organization_id: string;
    alert_rule_id?: string;
    status?: AlertInstance['status'][];
    severity?: string[];
    limit?: number;
    offset?: number;
  }): Promise<AlertInstance[]> {
    let query = this.supabase
      .from('alert_instances')
      .select('*')
      .eq('organization_id', params.organization_id)
      .order('created_at', { ascending: false });

    if (params.alert_rule_id) {
      query = query.eq('alert_rule_id', params.alert_rule_id);
    }

    if (params.status) {
      query = query.in('status', params.status);
    }

    if (params.severity) {
      query = query.in('severity', params.severity);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(id: string, acknowledged_by: string): Promise<AlertInstance> {
    const { data, error } = await this.supabase
      .from('alert_instances')
      .update({
        acknowledged_by,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Manually evaluate alert rules
   */
  async evaluateAlertRules(): Promise<number> {
    const { data, error } = await this.supabase.rpc('evaluate_alert_rules');
    if (error) throw error;
    return data || 0;
  }

  // ============================================================================
  // SYSTEM HEALTH MONITORING
  // ============================================================================

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(params: {
    start_time?: string;
    end_time?: string;
    limit?: number;
  }): Promise<SystemHealthMetrics[]> {
    let query = this.supabase
      .from('system_health_metrics')
      .select('*')
      .order('timestamp_bucket', { ascending: false });

    if (params.start_time) {
      query = query.gte('timestamp_bucket', params.start_time);
    }

    if (params.end_time) {
      query = query.lte('timestamp_bucket', params.end_time);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get system health overview
   */
  async getSystemHealthOverview(): Promise<SystemHealthOverview[]> {
    const { data, error } = await this.supabase
      .from('system_health_overview')
      .select('*')
      .limit(24); // Last 24 hours

    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // COMPLIANCE AND AUDIT REPORTING
  // ============================================================================

  /**
   * Create compliance report
   */
  async createComplianceReport(report: Omit<ComplianceReport, 'id' | 'created_at' | 'updated_at'>): Promise<ComplianceReport> {
    const { data, error } = await this.supabase
      .from('compliance_reports')
      .insert([report])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get compliance reports
   */
  async getComplianceReports(params: {
    organization_id: string;
    report_type?: string;
    status?: ComplianceReport['status'][];
    start_period?: string;
    end_period?: string;
    limit?: number;
  }): Promise<ComplianceReport[]> {
    let query = this.supabase
      .from('compliance_reports')
      .select('*')
      .eq('organization_id', params.organization_id)
      .order('created_at', { ascending: false });

    if (params.report_type) {
      query = query.eq('report_type', params.report_type);
    }

    if (params.status) {
      query = query.in('status', params.status);
    }

    if (params.start_period) {
      query = query.gte('reporting_period_start', params.start_period);
    }

    if (params.end_period) {
      query = query.lte('reporting_period_end', params.end_period);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Update compliance report
   */
  async updateComplianceReport(id: string, updates: Partial<ComplianceReport>): Promise<ComplianceReport> {
    const { data, error } = await this.supabase
      .from('compliance_reports')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Log data access for compliance
   */
  async logDataAccess(access: Omit<DataAccessLog, 'id' | 'created_at'>): Promise<DataAccessLog> {
    const { data, error } = await this.supabase
      .from('data_access_logs')
      .insert([access])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get data access logs
   */
  async getDataAccessLogs(params: {
    organization_id: string;
    user_id?: string;
    resource_type?: string;
    access_type?: string;
    contains_pii?: boolean;
    start_time?: string;
    end_time?: string;
    limit?: number;
    offset?: number;
  }): Promise<DataAccessLog[]> {
    let query = this.supabase
      .from('data_access_logs')
      .select('*')
      .eq('organization_id', params.organization_id)
      .order('created_at', { ascending: false });

    if (params.user_id) {
      query = query.eq('user_id', params.user_id);
    }

    if (params.resource_type) {
      query = query.eq('resource_type', params.resource_type);
    }

    if (params.access_type) {
      query = query.eq('access_type', params.access_type);
    }

    if (params.contains_pii !== undefined) {
      query = query.eq('contains_pii', params.contains_pii);
    }

    if (params.start_time) {
      query = query.gte('created_at', params.start_time);
    }

    if (params.end_time) {
      query = query.lte('created_at', params.end_time);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // DATA MANAGEMENT
  // ============================================================================

  /**
   * Cleanup old monitoring data
   */
  async cleanupMonitoringData(): Promise<string> {
    const { data, error } = await this.supabase.rpc('cleanup_monitoring_data');
    if (error) throw error;
    return data || '';
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(params: {
    organization_id: string;
    data_type: 'api_usage' | 'user_activity' | 'error_incidents' | 'compliance_logs';
    start_time: string;
    end_time: string;
    format?: 'json' | 'csv';
  }): Promise<any[]> {
    const { data_type, organization_id, start_time, end_time } = params;

    let query: any;
    
    switch (data_type) {
      case 'api_usage':
        query = this.supabase
          .from('api_usage_logs')
          .select('*')
          .eq('organization_id', organization_id)
          .gte('created_at', start_time)
          .lte('created_at', end_time);
        break;
        
      case 'user_activity':
        query = this.supabase
          .from('user_activity_analytics')
          .select('*')
          .eq('organization_id', organization_id)
          .gte('date_bucket', start_time)
          .lte('date_bucket', end_time);
        break;
        
      case 'error_incidents':
        query = this.supabase
          .from('error_incidents')
          .select('*')
          .eq('organization_id', organization_id)
          .gte('first_occurred_at', start_time)
          .lte('first_occurred_at', end_time);
        break;
        
      case 'compliance_logs':
        query = this.supabase
          .from('data_access_logs')
          .select('*')
          .eq('organization_id', organization_id)
          .gte('created_at', start_time)
          .lte('created_at', end_time);
        break;
        
      default:
        throw new Error(`Unsupported data type: ${data_type}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Hook for API performance monitoring
 */
export function useAPIPerformance(organizationId: string) {
  const [performance, setPerformance] = useState<APIPerformanceDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyticsService = useMemo(
    () => new AnalyticsMonitoringService(
      process.env.REACT_APP_SUPABASE_URL!,
      process.env.REACT_APP_SUPABASE_ANON_KEY!
    ),
    []
  );

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getAPIPerformanceDashboard(organizationId);
      setPerformance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API performance');
    } finally {
      setLoading(false);
    }
  }, [analyticsService, organizationId]);

  useEffect(() => {
    fetchPerformance();
    
    // Set up periodic refresh
    const interval = setInterval(fetchPerformance, 60000); // Every minute
    return () => clearInterval(interval);
  }, [fetchPerformance]);

  return {
    performance,
    loading,
    error,
    refetch: fetchPerformance
  };
}

/**
 * Hook for error incident management
 */
export function useErrorIncidents(organizationId: string) {
  const [incidents, setIncidents] = useState<ErrorIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyticsService = useMemo(
    () => new AnalyticsMonitoringService(
      process.env.REACT_APP_SUPABASE_URL!,
      process.env.REACT_APP_SUPABASE_ANON_KEY!
    ),
    []
  );

  const fetchIncidents = useCallback(async (params?: {
    status?: ErrorIncident['status'][];
    severity?: ErrorIncident['severity'][];
  }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getErrorIncidents({
        organization_id: organizationId,
        ...params,
        limit: 50
      });
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch error incidents');
    } finally {
      setLoading(false);
    }
  }, [analyticsService, organizationId]);

  const resolveIncident = useCallback(async (id: string, notes?: string) => {
    try {
      await analyticsService.resolveErrorIncident(id, notes);
      await fetchIncidents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve incident');
    }
  }, [analyticsService, fetchIncidents]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return {
    incidents,
    loading,
    error,
    fetchIncidents,
    resolveIncident
  };
}

/**
 * Hook for alert management
 */
export function useAlerts(organizationId: string) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [instances, setInstances] = useState<AlertInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyticsService = useMemo(
    () => new AnalyticsMonitoringService(
      process.env.REACT_APP_SUPABASE_URL!,
      process.env.REACT_APP_SUPABASE_ANON_KEY!
    ),
    []
  );

  const fetchAlertData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [rulesData, instancesData] = await Promise.all([
        analyticsService.getAlertRules(organizationId),
        analyticsService.getAlertInstances({ 
          organization_id: organizationId,
          status: ['firing'],
          limit: 20
        })
      ]);
      
      setRules(rulesData);
      setInstances(instancesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert data');
    } finally {
      setLoading(false);
    }
  }, [analyticsService, organizationId]);

  const createRule = useCallback(async (rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await analyticsService.createAlertRule(rule);
      await fetchAlertData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert rule');
    }
  }, [analyticsService, fetchAlertData]);

  const acknowledgeAlert = useCallback(async (id: string, userId: string) => {
    try {
      await analyticsService.acknowledgeAlert(id, userId);
      await fetchAlertData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  }, [analyticsService, fetchAlertData]);

  useEffect(() => {
    fetchAlertData();
    
    // Set up periodic refresh for alert instances
    const interval = setInterval(() => {
      analyticsService.getAlertInstances({ 
        organization_id: organizationId,
        status: ['firing'],
        limit: 20
      }).then(setInstances);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchAlertData, analyticsService, organizationId]);

  return {
    rules,
    instances,
    loading,
    error,
    createRule,
    acknowledgeAlert,
    refetch: fetchAlertData
  };
}

/**
 * Hook for user engagement analytics
 */
export function useUserEngagement(organizationId: string) {
  const [engagement, setEngagement] = useState<UserEngagementMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyticsService = useMemo(
    () => new AnalyticsMonitoringService(
      process.env.REACT_APP_SUPABASE_URL!,
      process.env.REACT_APP_SUPABASE_ANON_KEY!
    ),
    []
  );

  const fetchEngagement = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getUserEngagementMetrics(organizationId);
      setEngagement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user engagement');
    } finally {
      setLoading(false);
    }
  }, [analyticsService, organizationId]);

  useEffect(() => {
    fetchEngagement();
    
    // Set up periodic refresh
    const interval = setInterval(fetchEngagement, 300000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [fetchEngagement]);

  return {
    engagement,
    loading,
    error,
    refetch: fetchEngagement
  };
}

/**
 * Hook for system health monitoring
 */
export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealthOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyticsService = useMemo(
    () => new AnalyticsMonitoringService(
      process.env.REACT_APP_SUPABASE_URL!,
      process.env.REACT_APP_SUPABASE_ANON_KEY!
    ),
    []
  );

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getSystemHealthOverview();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  }, [analyticsService]);

  useEffect(() => {
    fetchHealth();
    
    // Set up periodic refresh
    const interval = setInterval(fetchHealth, 60000); // Every minute
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    health,
    loading,
    error,
    refetch: fetchHealth
  };
}

export default AnalyticsMonitoringService;
