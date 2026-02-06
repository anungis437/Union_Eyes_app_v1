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

import { getSupabaseClient } from '@unioneyes/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Audit log action types (matches database enum)
 */
export type AuditLogActionType =
  // Authentication
  | 'auth.login.success' | 'auth.login.failed' | 'auth.logout' | 'auth.signup'
  | 'auth.password_reset_requested' | 'auth.password_reset_completed' | 'auth.password_changed'
  | 'auth.email_verified' | 'auth.email_verification_sent'
  | 'auth.session_created' | 'auth.session_renewed' | 'auth.session_expired' | 'auth.session_terminated'
  | 'auth.concurrent_login_detected' | 'auth.suspicious_login_blocked'
  // 2FA
  | 'auth.2fa_enabled' | 'auth.2fa_disabled' | 'auth.2fa_verified' | 'auth.2fa_failed' | 'auth.2fa_recovery_used'
  // User & Profile
  | 'user.created' | 'user.updated' | 'user.deleted' | 'user.profile_viewed' | 'user.profile_updated'
  | 'user.avatar_uploaded' | 'user.avatar_deleted' | 'user.preferences_updated'
  // RBAC
  | 'rbac.role_assigned' | 'rbac.role_removed' | 'rbac.permission_granted' | 'rbac.permission_revoked'
  | 'rbac.access_granted' | 'rbac.access_denied' | 'rbac.privilege_escalation_attempted'
  // Data Access
  | 'data.matter_created' | 'data.matter_viewed' | 'data.matter_updated' | 'data.matter_deleted'
  | 'data.client_created' | 'data.client_viewed' | 'data.client_updated' | 'data.client_deleted'
  | 'data.document_uploaded' | 'data.document_viewed' | 'data.document_downloaded' | 'data.document_deleted'
  | 'data.sensitive_data_accessed' | 'data.pii_accessed' | 'data.financial_data_accessed'
  // Export/Import
  | 'data.exported' | 'data.imported' | 'data.bulk_download' | 'data.report_generated'
  // API
  | 'api.call' | 'api.rate_limit_exceeded' | 'api.invalid_request' | 'api.unauthorized_access'
  // System
  | 'system.config_changed' | 'system.integration_enabled' | 'system.integration_disabled'
  | 'system.backup_created' | 'system.restore_completed'
  // Security Events
  | 'security.anomaly_detected' | 'security.brute_force_detected' | 'security.data_breach_suspected'
  | 'security.unusual_activity' | 'security.ip_blocked' | 'security.session_hijack_suspected';

/**
 * Risk level for audit events
 */
export type AuditRiskLevel = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Resource types being audited
 */
export type AuditResourceType =
  | 'user' | 'profile' | 'session' | 'matter' | 'client' | 'document' | 'task'
  | 'note' | 'email' | 'billing' | 'invoice' | 'role' | 'permission'
  | 'organization' | 'team' | 'api_key' | 'webhook' | 'integration'
  | 'report' | 'export' | 'system_config';

/**
 * Login result status
 */
export type LoginResult =
  | 'success'
  | 'failed_invalid_credentials'
  | 'failed_account_locked'
  | 'failed_2fa_required'
  | 'failed_2fa_invalid'
  | 'failed_email_not_verified'
  | 'failed_account_disabled'
  | 'failed_ip_blocked'
  | 'failed_rate_limited';

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
  most_common_actions: Array<{ action: string; count: number }>;
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

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * Security Audit Service
 * 
 * Comprehensive service for managing security audit logs, login attempts,
 * session history, and security events.
 */
export class SecurityAuditService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || getSupabaseClient();
  }

  // ==========================================================================
  // AUDIT LOG OPERATIONS
  // ==========================================================================

  /**
   * Log an authentication event
   */
  async logAuthEvent(options: {
    firmId?: string;
    userId?: string;
    sessionId?: string;
    actionType: Extract<AuditLogActionType, `auth.${string}`>;
    success?: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogResult<string>> {
    try {
      const riskLevel = this.calculateAuthRiskLevel(options.actionType, options.success);
      
      const { data, error } = await this.supabase.rpc('log_audit_event', {
        p_firm_id: options.firmId,
        p_user_id: options.userId,
        p_session_id: options.sessionId,
        p_action_type: options.actionType,
        p_resource_type: 'user',
        p_ip_address: options.ipAddress,
        p_user_agent: options.userAgent,
        p_risk_level: riskLevel,
        p_success: options.success ?? true,
        p_failure_reason: options.failureReason,
        p_metadata: options.metadata || {}
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to log auth event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log a data access event
   */
  async logDataAccess(options: {
    firmId?: string;
    userId?: string;
    sessionId?: string;
    resourceType: AuditResourceType;
    resourceId: string;
    actionType: Extract<AuditLogActionType, `data.${string}`>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogResult<string>> {
    try {
      const riskLevel = this.calculateDataAccessRiskLevel(options.actionType, options.resourceType);
      
      const { data, error } = await this.supabase.rpc('log_audit_event', {
        p_firm_id: options.firmId,
        p_user_id: options.userId,
        p_session_id: options.sessionId,
        p_action_type: options.actionType,
        p_resource_type: options.resourceType,
        p_resource_id: options.resourceId,
        p_ip_address: options.ipAddress,
        p_user_agent: options.userAgent,
        p_risk_level: riskLevel,
        p_success: true,
        p_metadata: options.metadata || {}
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to log data access:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log a data modification event
   */
  async logDataModification(options: {
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
  }): Promise<AuditLogResult<string>> {
    try {
      const riskLevel = this.calculateDataAccessRiskLevel(options.actionType, options.resourceType);
      
      const { data, error } = await this.supabase.rpc('log_audit_event', {
        p_firm_id: options.firmId,
        p_user_id: options.userId,
        p_session_id: options.sessionId,
        p_action_type: options.actionType,
        p_resource_type: options.resourceType,
        p_resource_id: options.resourceId,
        p_ip_address: options.ipAddress,
        p_user_agent: options.userAgent,
        p_risk_level: riskLevel,
        p_success: true,
        p_before_state: options.beforeState,
        p_after_state: options.afterState,
        p_metadata: options.metadata || {}
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to log data modification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log a permission check event
   */
  async logPermissionCheck(options: {
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
  }): Promise<AuditLogResult<string>> {
    try {
      const riskLevel = options.granted ? 'low' : 'medium';
      
      const { data, error } = await this.supabase.rpc('log_audit_event', {
        p_firm_id: options.firmId,
        p_user_id: options.userId,
        p_session_id: options.sessionId,
        p_action_type: options.actionType,
        p_resource_type: options.resourceType,
        p_resource_id: options.resourceId,
        p_ip_address: options.ipAddress,
        p_user_agent: options.userAgent,
        p_risk_level: riskLevel,
        p_success: options.granted,
        p_failure_reason: options.granted ? undefined : 'Access denied',
        p_metadata: options.metadata || {}
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to log permission check:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(options: {
    firmId?: string;
    userId?: string;
    eventType: string;
    severity: AuditRiskLevel;
    title: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogResult<string>> {
    try {
      const { data, error } = await this.supabase.rpc('log_security_event', {
        p_firm_id: options.firmId,
        p_user_id: options.userId,
        p_event_type: options.eventType,
        p_severity: options.severity,
        p_title: options.title,
        p_description: options.description,
        p_ip_address: options.ipAddress,
        p_metadata: options.metadata || {}
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to log security event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log a login attempt
   */
  async logLoginAttempt(options: {
    firmId?: string;
    userId?: string;
    email: string;
    result: LoginResult;
    ipAddress: string;
    userAgent?: string;
    isSuspicious?: boolean;
    metadata?: Record<string, any>;
  }): Promise<AuditLogResult<string>> {
    try {
      const { data, error } = await this.supabase.rpc('log_login_attempt', {
        p_firm_id: options.firmId,
        p_user_id: options.userId,
        p_email: options.email,
        p_result: options.result,
        p_ip_address: options.ipAddress,
        p_user_agent: options.userAgent,
        p_is_suspicious: options.isSuspicious || false,
        p_metadata: options.metadata || {}
      });

      if (error) throw error;

      // Also log to main audit log
      await this.logAuthEvent({
        firmId: options.firmId,
        userId: options.userId,
        actionType: options.result === 'success' ? 'auth.login.success' : 'auth.login.failed',
        success: options.result === 'success',
        failureReason: options.result !== 'success' ? options.result : undefined,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: options.metadata
      });

      return { success: true, data };
    } catch (error) {
      console.error('Failed to log login attempt:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log or update session
   */
  async logSessionEvent(options: {
    firmId?: string;
    userId: string;
    sessionId: string;
    status?: SessionStatus;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogResult<string>> {
    try {
      const { data, error } = await this.supabase.rpc('upsert_session_history', {
        p_firm_id: options.firmId,
        p_user_id: options.userId,
        p_session_id: options.sessionId,
        p_ip_address: options.ipAddress,
        p_user_agent: options.userAgent,
        p_status: options.status || 'active'
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Failed to log session event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log API access
   */
  async logAPIAccess(options: {
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
  }): Promise<AuditLogResult<string>> {
    try {
      const success = options.statusCode >= 200 && options.statusCode < 400;
      const riskLevel = this.calculateAPIRiskLevel(options.statusCode);
      
      const { data, error } = await this.supabase.from('audit_logs').insert({
        firm_id: options.firmId,
        user_id: options.userId,
        session_id: options.sessionId,
        action_type: 'api.call',
        api_endpoint: options.endpoint,
        http_method: options.method,
        http_status_code: options.statusCode,
        response_time_ms: options.responseTimeMs,
        ip_address: options.ipAddress,
        user_agent: options.userAgent,
        risk_level: riskLevel,
        success,
        metadata: options.metadata || {}
      }).select('id').single();

      if (error) throw error;

      return { success: true, data: data.id };
    } catch (error) {
      console.error('Failed to log API access:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create audit log entry (generic)
   */
  async createAuditLog(options: CreateAuditLogOptions): Promise<AuditLogResult<string>> {
    try {
      const { data, error } = await this.supabase.from('audit_logs').insert({
        firm_id: options.firmId,
        user_id: options.userId,
        session_id: options.sessionId,
        action_type: options.actionType,
        resource_type: options.resourceType,
        resource_id: options.resourceId,
        ip_address: options.ipAddress,
        user_agent: options.userAgent,
        request_id: options.requestId,
        api_endpoint: options.apiEndpoint,
        http_method: options.httpMethod,
        http_status_code: options.httpStatusCode,
        risk_level: options.riskLevel || 'low',
        success: options.success ?? true,
        failure_reason: options.failureReason,
        before_state: options.beforeState,
        after_state: options.afterState,
        metadata: options.metadata || {},
        error_code: options.errorCode,
        error_message: options.errorMessage,
        stack_trace: options.stackTrace,
        response_time_ms: options.responseTimeMs
      }).select('id').single();

      if (error) throw error;

      return { success: true, data: data.id };
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Batch create audit logs (for performance)
   */
  async batchCreateAuditLogs(options: BatchAuditLogOptions): Promise<AuditLogResult<string[]>> {
    try {
      const records = options.logs.map(log => ({
        firm_id: log.firmId,
        user_id: log.userId,
        session_id: log.sessionId,
        action_type: log.actionType,
        resource_type: log.resourceType,
        resource_id: log.resourceId,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        request_id: log.requestId,
        api_endpoint: log.apiEndpoint,
        http_method: log.httpMethod,
        http_status_code: log.httpStatusCode,
        risk_level: log.riskLevel || 'low',
        success: log.success ?? true,
        failure_reason: log.failureReason,
        before_state: log.beforeState,
        after_state: log.afterState,
        metadata: log.metadata || {},
        error_code: log.errorCode,
        error_message: log.errorMessage,
        stack_trace: log.stackTrace,
        response_time_ms: log.responseTimeMs
      }));

      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert(records)
        .select('id');

      if (error) throw error;

      return { success: true, data: data.map(r => r.id) };
    } catch (error) {
      console.error('Failed to batch create audit logs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*');

      // Apply filters
      if (filters.firmId) query = query.eq('firm_id', filters.firmId);
      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.sessionId) query = query.eq('session_id', filters.sessionId);
      if (filters.resourceId) query = query.eq('resource_id', filters.resourceId);
      if (filters.ipAddress) query = query.eq('ip_address', filters.ipAddress);
      if (filters.success !== undefined) query = query.eq('success', filters.success);

      // Array filters
      if (filters.actionType) {
        const actions = Array.isArray(filters.actionType) ? filters.actionType : [filters.actionType];
        query = query.in('action_type', actions);
      }
      if (filters.resourceType) {
        const types = Array.isArray(filters.resourceType) ? filters.resourceType : [filters.resourceType];
        query = query.in('resource_type', types);
      }
      if (filters.riskLevel) {
        const levels = Array.isArray(filters.riskLevel) ? filters.riskLevel : [filters.riskLevel];
        query = query.in('risk_level', levels);
      }

      // Date range
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);

      // Ordering
      const orderBy = filters.orderBy || 'created_at';
      const direction = filters.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: direction === 'asc' });

      // Pagination
      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(searchTerm: string, filters: AuditLogFilters = {}): Promise<AuditLogResult<AuditLog[]>> {
    try {
      // Search in metadata, error_message, failure_reason
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .or(`metadata::text.ilike.%${searchTerm}%,error_message.ilike.%${searchTerm}%,failure_reason.ilike.%${searchTerm}%`)
        .limit(filters.limit || 100);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to search audit logs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get security timeline (combined view of all security-relevant events)
   */
  async getSecurityTimeline(options: {
    firmId?: string;
    userId?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    limit?: number;
  }): Promise<AuditLogResult<SecurityTimelineEntry[]>> {
    try {
      const timeline: SecurityTimelineEntry[] = [];

      // Get audit logs
      const auditResult = await this.getAuditLogs({
        firmId: options.firmId,
        userId: options.userId,
        startDate: options.startDate,
        endDate: options.endDate,
        limit: options.limit || 100
      });

      if (auditResult.success && auditResult.data) {
        timeline.push(...auditResult.data.map(log => ({
          timestamp: log.created_at,
          type: 'audit' as const,
          action: log.action_type,
          user_id: log.user_id,
          user_email: undefined,
          risk_level: log.risk_level,
          success: log.success,
          details: this.formatAuditLogDetails(log),
          metadata: log.metadata
        })));
      }

      // Sort by timestamp
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return { success: true, data: timeline.slice(0, options.limit || 100) };
    } catch (error) {
      console.error('Failed to get security timeline:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get login history
   */
  async getLoginHistory(options: {
    firmId?: string;
    userId?: string;
    email?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    limit?: number;
  }): Promise<AuditLogResult<LoginAttempt[]>> {
    try {
      let query = this.supabase
        .from('login_attempts')
        .select('*');

      if (options.firmId) query = query.eq('firm_id', options.firmId);
      if (options.userId) query = query.eq('user_id', options.userId);
      if (options.email) query = query.eq('email', options.email);
      if (options.startDate) query = query.gte('attempted_at', options.startDate);
      if (options.endDate) query = query.lte('attempted_at', options.endDate);

      query = query
        .order('attempted_at', { ascending: false })
        .limit(options.limit || 100);

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get login history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get data access history
   */
  async getDataAccessHistory(options: {
    firmId?: string;
    userId?: string;
    resourceType?: AuditResourceType;
    resourceId?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    limit?: number;
  }): Promise<AuditLogResult<AuditLog[]>> {
    try {
      return await this.getAuditLogs({
        firmId: options.firmId,
        userId: options.userId,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        actionType: [
          'data.matter_viewed', 'data.matter_created', 'data.matter_updated', 'data.matter_deleted',
          'data.client_viewed', 'data.client_created', 'data.client_updated', 'data.client_deleted',
          'data.document_viewed', 'data.document_downloaded', 'data.document_uploaded', 'data.document_deleted',
          'data.sensitive_data_accessed', 'data.pii_accessed', 'data.financial_data_accessed'
        ] as AuditLogActionType[],
        startDate: options.startDate,
        endDate: options.endDate,
        limit: options.limit || 100
      });
    } catch (error) {
      console.error('Failed to get data access history:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(userId: string, days: number = 30): Promise<AuditLogResult<UserActivitySummary>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Calculate summary
      const summary: UserActivitySummary = {
        user_id: userId,
        total_actions: logs?.length || 0,
        successful_actions: logs?.filter(l => l.success).length || 0,
        failed_actions: logs?.filter(l => !l.success).length || 0,
        high_risk_actions: logs?.filter(l => ['high', 'critical'].includes(l.risk_level)).length || 0,
        last_activity: logs?.[0]?.created_at || '',
        most_common_actions: this.calculateMostCommonActions(logs || []),
        access_patterns: this.calculateAccessPatterns(logs || [])
      };

      return { success: true, data: summary };
    } catch (error) {
      console.error('Failed to get user activity:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get high-risk events
   */
  async getHighRiskEvents(options: {
    firmId?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    limit?: number;
  }): Promise<AuditLogResult<AuditLog[]>> {
    try {
      return await this.getAuditLogs({
        firmId: options.firmId,
        riskLevel: ['high', 'critical'],
        startDate: options.startDate,
        endDate: options.endDate,
        limit: options.limit || 100
      });
    } catch (error) {
      console.error('Failed to get high-risk events:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(options: {
    firmId?: string;
    resolved?: boolean;
    severity?: AuditRiskLevel | AuditRiskLevel[];
    limit?: number;
  }): Promise<AuditLogResult<SecurityEvent[]>> {
    try {
      let query = this.supabase
        .from('security_events')
        .select('*');

      if (options.firmId) query = query.eq('firm_id', options.firmId);
      if (options.resolved !== undefined) query = query.eq('resolved', options.resolved);
      if (options.severity) {
        const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
        query = query.in('severity', severities);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(options.limit || 100);

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get security events:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(
    filters: AuditLogFilters,
    format: ExportFormat = 'json'
  ): Promise<AuditLogResult<string>> {
    try {
      const result = await this.getAuditLogs(filters);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to fetch audit logs for export');
      }

      let exportData: string;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(result.data, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(result.data);
          break;
        case 'xlsx':
          throw new Error('XLSX export not yet implemented');
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return { success: true, data: exportData };
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate risk level for authentication events
   */
  private calculateAuthRiskLevel(
    actionType: AuditLogActionType,
    success?: boolean
  ): AuditRiskLevel {
    if (!success) return 'medium';
    
    if (actionType.includes('2fa')) return 'medium';
    if (actionType.includes('suspicious')) return 'high';
    if (actionType.includes('concurrent')) return 'medium';
    
    return 'low';
  }

  /**
   * Calculate risk level for data access events
   */
  private calculateDataAccessRiskLevel(
    actionType: AuditLogActionType,
    resourceType: AuditResourceType
  ): AuditRiskLevel {
    if (actionType.includes('sensitive') || actionType.includes('pii') || actionType.includes('financial')) {
      return 'high';
    }
    
    if (actionType.includes('deleted') || actionType.includes('exported')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Calculate risk level for API events
   */
  private calculateAPIRiskLevel(statusCode: number): AuditRiskLevel {
    if (statusCode >= 500) return 'high';
    if (statusCode === 401 || statusCode === 403) return 'medium';
    if (statusCode >= 400) return 'low';
    return 'info';
  }

  /**
   * Format audit log details for timeline
   */
  private formatAuditLogDetails(log: AuditLog): string {
    const parts: string[] = [];
    
    if (log.resource_type && log.resource_id) {
      parts.push(`${log.resource_type} ${log.resource_id}`);
    }
    
    if (log.ip_address) {
      parts.push(`from ${log.ip_address}`);
    }
    
    if (!log.success && log.failure_reason) {
      parts.push(`failed: ${log.failure_reason}`);
    }
    
    return parts.join(' ');
  }

  /**
   * Calculate most common actions
   */
  private calculateMostCommonActions(logs: AuditLog[]): Array<{ action: string; count: number }> {
    const counts = logs.reduce((acc, log) => {
      acc[log.action_type] = (acc[log.action_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate access patterns
   */
  private calculateAccessPatterns(logs: AuditLog[]): {
    by_hour: Record<number, number>;
    by_day: Record<string, number>;
    by_resource: Record<string, number>;
  } {
    const byHour: Record<number, number> = {};
    const byDay: Record<string, number> = {};
    const byResource: Record<string, number> = {};

    logs.forEach(log => {
      const date = new Date(log.created_at);
      const hour = date.getHours();
      const day = date.toISOString().split('T')[0];
      
      byHour[hour] = (byHour[hour] || 0) + 1;
      byDay[day] = (byDay[day] || 0) + 1;
      
      if (log.resource_type) {
        byResource[log.resource_type] = (byResource[log.resource_type] || 0) + 1;
      }
    });

    return { by_hour: byHour, by_day: byDay, by_resource: byResource };
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID', 'Created At', 'User ID', 'Action Type', 'Resource Type', 'Resource ID',
      'Risk Level', 'Success', 'IP Address', 'User Agent', 'Failure Reason'
    ];

    const rows = logs.map(log => [
      log.id,
      log.created_at,
      log.user_id || '',
      log.action_type,
      log.resource_type || '',
      log.resource_id || '',
      log.risk_level,
      log.success,
      log.ip_address || '',
      log.user_agent || '',
      log.failure_reason || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const securityAuditService = new SecurityAuditService();

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createSecurityAuditService(supabaseClient?: SupabaseClient): SecurityAuditService {
  return new SecurityAuditService(supabaseClient);
}
