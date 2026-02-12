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
import { logger } from '../utils/logger';
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
    constructor(supabaseClient) {
        this.supabase = supabaseClient || getSupabaseClient();
    }
    // ==========================================================================
    // AUDIT LOG OPERATIONS
    // ==========================================================================
    /**
     * Log an authentication event
     */
    async logAuthEvent(options) {
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
            if (error)
                throw error;
            return { success: true, data };
        }
        catch (error) {
            logger.error('Failed to log auth event:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Log a data access event
     */
    async logDataAccess(options) {
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
            if (error)
                throw error;
            return { success: true, data };
        }
        catch (error) {
            logger.error('Failed to log data access:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Log a data modification event
     */
    async logDataModification(options) {
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
            if (error)
                throw error;
            return { success: true, data };
        }
        catch (error) {
            logger.error('Failed to log data modification:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Log a permission check event
     */
    async logPermissionCheck(options) {
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
            if (error)
                throw error;
            return { success: true, data };
        }
        catch (error) {
            logger.error('Failed to log permission check:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Log a security event
     */
    async logSecurityEvent(options) {
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
            if (error)
                throw error;
            return { success: true, data };
        }
        catch (error) {
            logger.error('Failed to log security event:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Log a login attempt
     */
    async logLoginAttempt(options) {
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
            if (error)
                throw error;
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
        }
        catch (error) {
            logger.error('Failed to log login attempt:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Log or update session
     */
    async logSessionEvent(options) {
        try {
            const { data, error } = await this.supabase.rpc('upsert_session_history', {
                p_firm_id: options.firmId,
                p_user_id: options.userId,
                p_session_id: options.sessionId,
                p_ip_address: options.ipAddress,
                p_user_agent: options.userAgent,
                p_status: options.status || 'active'
            });
            if (error)
                throw error;
            return { success: true, data };
        }
        catch (error) {
            logger.error('Failed to log session event:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Log API access
     */
    async logAPIAccess(options) {
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
            if (error)
                throw error;
            return { success: true, data: data.id };
        }
        catch (error) {
            logger.error('Failed to log API access:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create audit log entry (generic)
     */
    async createAuditLog(options) {
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
            if (error)
                throw error;
            return { success: true, data: data.id };
        }
        catch (error) {
            logger.error('Failed to create audit log:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Batch create audit logs (for performance)
     */
    async batchCreateAuditLogs(options) {
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
            if (error)
                throw error;
            return { success: true, data: data.map(r => r.id) };
        }
        catch (error) {
            logger.error('Failed to batch create audit logs:', error);
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
    async getAuditLogs(filters = {}) {
        try {
            let query = this.supabase
                .from('audit_logs')
                .select('*');
            // Apply filters
            if (filters.firmId)
                query = query.eq('firm_id', filters.firmId);
            if (filters.userId)
                query = query.eq('user_id', filters.userId);
            if (filters.sessionId)
                query = query.eq('session_id', filters.sessionId);
            if (filters.resourceId)
                query = query.eq('resource_id', filters.resourceId);
            if (filters.ipAddress)
                query = query.eq('ip_address', filters.ipAddress);
            if (filters.success !== undefined)
                query = query.eq('success', filters.success);
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
            if (filters.startDate)
                query = query.gte('created_at', filters.startDate);
            if (filters.endDate)
                query = query.lte('created_at', filters.endDate);
            // Ordering
            const orderBy = filters.orderBy || 'created_at';
            const direction = filters.orderDirection || 'desc';
            query = query.order(orderBy, { ascending: direction === 'asc' });
            // Pagination
            if (filters.limit)
                query = query.limit(filters.limit);
            if (filters.offset)
                query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
            const { data, error } = await query;
            if (error)
                throw error;
            return { success: true, data: data || [] };
        }
        catch (error) {
            logger.error('Failed to get audit logs:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Search audit logs
     */
    async searchAuditLogs(searchTerm, filters = {}) {
        try {
            // Search in metadata, error_message, failure_reason
            const { data, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .or(`metadata::text.ilike.%${searchTerm}%,error_message.ilike.%${searchTerm}%,failure_reason.ilike.%${searchTerm}%`)
                .limit(filters.limit || 100);
            if (error)
                throw error;
            return { success: true, data: data || [] };
        }
        catch (error) {
            logger.error('Failed to search audit logs:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get security timeline (combined view of all security-relevant events)
     */
    async getSecurityTimeline(options) {
        try {
            const timeline = [];
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
                    type: 'audit',
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
        }
        catch (error) {
            logger.error('Failed to get security timeline:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get login history
     */
    async getLoginHistory(options) {
        try {
            let query = this.supabase
                .from('login_attempts')
                .select('*');
            if (options.firmId)
                query = query.eq('firm_id', options.firmId);
            if (options.userId)
                query = query.eq('user_id', options.userId);
            if (options.email)
                query = query.eq('email', options.email);
            if (options.startDate)
                query = query.gte('attempted_at', options.startDate);
            if (options.endDate)
                query = query.lte('attempted_at', options.endDate);
            query = query
                .order('attempted_at', { ascending: false })
                .limit(options.limit || 100);
            const { data, error } = await query;
            if (error)
                throw error;
            return { success: true, data: data || [] };
        }
        catch (error) {
            logger.error('Failed to get login history:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get data access history
     */
    async getDataAccessHistory(options) {
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
                ],
                startDate: options.startDate,
                endDate: options.endDate,
                limit: options.limit || 100
            });
        }
        catch (error) {
            logger.error('Failed to get data access history:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get user activity summary
     */
    async getUserActivity(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const { data: logs, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', startDate.toISOString());
            if (error)
                throw error;
            // Calculate summary
            const summary = {
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
        }
        catch (error) {
            logger.error('Failed to get user activity:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get high-risk events
     */
    async getHighRiskEvents(options) {
        try {
            return await this.getAuditLogs({
                firmId: options.firmId,
                riskLevel: ['high', 'critical'],
                startDate: options.startDate,
                endDate: options.endDate,
                limit: options.limit || 100
            });
        }
        catch (error) {
            logger.error('Failed to get high-risk events:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get security events
     */
    async getSecurityEvents(options) {
        try {
            let query = this.supabase
                .from('security_events')
                .select('*');
            if (options.firmId)
                query = query.eq('firm_id', options.firmId);
            if (options.resolved !== undefined)
                query = query.eq('resolved', options.resolved);
            if (options.severity) {
                const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
                query = query.in('severity', severities);
            }
            query = query
                .order('created_at', { ascending: false })
                .limit(options.limit || 100);
            const { data, error } = await query;
            if (error)
                throw error;
            return { success: true, data: data || [] };
        }
        catch (error) {
            logger.error('Failed to get security events:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Export audit logs
     */
    async exportAuditLogs(filters, format = 'json') {
        try {
            const result = await this.getAuditLogs(filters);
            if (!result.success || !result.data) {
                throw new Error('Failed to fetch audit logs for export');
            }
            let exportData;
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
        }
        catch (error) {
            logger.error('Failed to export audit logs:', error);
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
    calculateAuthRiskLevel(actionType, success) {
        if (!success)
            return 'medium';
        if (actionType.includes('2fa'))
            return 'medium';
        if (actionType.includes('suspicious'))
            return 'high';
        if (actionType.includes('concurrent'))
            return 'medium';
        return 'low';
    }
    /**
     * Calculate risk level for data access events
     */
    calculateDataAccessRiskLevel(actionType, resourceType) {
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
    calculateAPIRiskLevel(statusCode) {
        if (statusCode >= 500)
            return 'high';
        if (statusCode === 401 || statusCode === 403)
            return 'medium';
        if (statusCode >= 400)
            return 'low';
        return 'info';
    }
    /**
     * Format audit log details for timeline
     */
    formatAuditLogDetails(log) {
        const parts = [];
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
    calculateMostCommonActions(logs) {
        const counts = logs.reduce((acc, log) => {
            acc[log.action_type] = (acc[log.action_type] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    /**
     * Calculate access patterns
     */
    calculateAccessPatterns(logs) {
        const byHour = {};
        const byDay = {};
        const byResource = {};
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
    convertToCSV(logs) {
        if (logs.length === 0)
            return '';
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
export function createSecurityAuditService(supabaseClient) {
    return new SecurityAuditService(supabaseClient);
}
//# sourceMappingURL=securityAuditService.js.map