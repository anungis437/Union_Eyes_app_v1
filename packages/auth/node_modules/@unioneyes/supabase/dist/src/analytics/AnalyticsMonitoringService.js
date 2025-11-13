import { createClient } from '@supabase/supabase-js';
/**
 * Analytics and Monitoring Service
 */
export class AnalyticsMonitoringService {
    constructor(supabaseUrl, supabaseAnonKey) {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    // ============================================================================
    // API USAGE TRACKING
    // ============================================================================
    /**
     * Log API usage for monitoring and analytics
     */
    async logAPIUsage(usage) {
        const { data, error } = await this.supabase
            .from('api_usage_logs')
            .insert([usage])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Get API usage logs with filtering and pagination
     */
    async getAPIUsageLogs(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Get aggregated API endpoint metrics
     */
    async getAPIEndpointMetrics(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Get API performance dashboard data
     */
    async getAPIPerformanceDashboard(organization_id) {
        const { data, error } = await this.supabase
            .from('api_performance_dashboard')
            .select('*')
            .eq('organization_id', organization_id);
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Manually trigger API metrics aggregation
     */
    async aggregateAPIUsageMetrics(startTime, endTime) {
        const { data, error } = await this.supabase.rpc('aggregate_api_usage_metrics', {
            p_start_time: startTime,
            p_end_time: endTime
        });
        if (error)
            throw error;
        return data || 0;
    }
    // ============================================================================
    // USER ACTIVITY ANALYTICS
    // ============================================================================
    /**
     * Get user activity analytics
     */
    async getUserActivityAnalytics(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Get user engagement metrics
     */
    async getUserEngagementMetrics(organization_id) {
        const { data, error } = await this.supabase
            .from('user_engagement_metrics')
            .select('*')
            .eq('organization_id', organization_id);
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Manually trigger user activity analytics collection
     */
    async collectUserActivityAnalytics(date) {
        const { data, error } = await this.supabase.rpc('collect_user_activity_analytics', {
            p_date: date
        });
        if (error)
            throw error;
        return data || 0;
    }
    // ============================================================================
    // ERROR MONITORING AND INCIDENT MANAGEMENT
    // ============================================================================
    /**
     * Create error incident
     */
    async createErrorIncident(incident) {
        const { data, error } = await this.supabase
            .from('error_incidents')
            .insert([incident])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Get error incidents
     */
    async getErrorIncidents(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Update error incident
     */
    async updateErrorIncident(id, updates) {
        const { data, error } = await this.supabase
            .from('error_incidents')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Resolve error incident
     */
    async resolveErrorIncident(id, resolution_notes, resolved_by) {
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
    async createAlertRule(rule) {
        const { data, error } = await this.supabase
            .from('alert_rules')
            .insert([rule])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Get alert rules
     */
    async getAlertRules(organization_id, category) {
        let query = this.supabase
            .from('alert_rules')
            .select('*')
            .eq('organization_id', organization_id)
            .order('name');
        if (category) {
            query = query.eq('category', category);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Update alert rule
     */
    async updateAlertRule(id, updates) {
        const { data, error } = await this.supabase
            .from('alert_rules')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Delete alert rule
     */
    async deleteAlertRule(id) {
        const { error } = await this.supabase
            .from('alert_rules')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
    /**
     * Get alert instances
     */
    async getAlertInstances(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Acknowledge alert
     */
    async acknowledgeAlert(id, acknowledged_by) {
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
        if (error)
            throw error;
        return data;
    }
    /**
     * Manually evaluate alert rules
     */
    async evaluateAlertRules() {
        const { data, error } = await this.supabase.rpc('evaluate_alert_rules');
        if (error)
            throw error;
        return data || 0;
    }
    // ============================================================================
    // SYSTEM HEALTH MONITORING
    // ============================================================================
    /**
     * Get system health metrics
     */
    async getSystemHealthMetrics(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Get system health overview
     */
    async getSystemHealthOverview() {
        const { data, error } = await this.supabase
            .from('system_health_overview')
            .select('*')
            .limit(24); // Last 24 hours
        if (error)
            throw error;
        return data || [];
    }
    // ============================================================================
    // COMPLIANCE AND AUDIT REPORTING
    // ============================================================================
    /**
     * Create compliance report
     */
    async createComplianceReport(report) {
        const { data, error } = await this.supabase
            .from('compliance_reports')
            .insert([report])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Get compliance reports
     */
    async getComplianceReports(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Update compliance report
     */
    async updateComplianceReport(id, updates) {
        const { data, error } = await this.supabase
            .from('compliance_reports')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Log data access for compliance
     */
    async logDataAccess(access) {
        const { data, error } = await this.supabase
            .from('data_access_logs')
            .insert([access])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Get data access logs
     */
    async getDataAccessLogs(params) {
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
        if (error)
            throw error;
        return data || [];
    }
    // ============================================================================
    // DATA MANAGEMENT
    // ============================================================================
    /**
     * Cleanup old monitoring data
     */
    async cleanupMonitoringData() {
        const { data, error } = await this.supabase.rpc('cleanup_monitoring_data');
        if (error)
            throw error;
        return data || '';
    }
    /**
     * Export analytics data
     */
    async exportAnalyticsData(params) {
        const { data_type, organization_id, start_time, end_time } = params;
        let query;
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
        if (error)
            throw error;
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
export function useAPIPerformance(organizationId) {
    const [performance, setPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const analyticsService = useMemo(() => new AnalyticsMonitoringService(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY), []);
    const fetchPerformance = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await analyticsService.getAPIPerformanceDashboard(organizationId);
            setPerformance(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch API performance');
        }
        finally {
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
export function useErrorIncidents(organizationId) {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const analyticsService = useMemo(() => new AnalyticsMonitoringService(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY), []);
    const fetchIncidents = useCallback(async (params) => {
        try {
            setLoading(true);
            setError(null);
            const data = await analyticsService.getErrorIncidents({
                organization_id: organizationId,
                ...params,
                limit: 50
            });
            setIncidents(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch error incidents');
        }
        finally {
            setLoading(false);
        }
    }, [analyticsService, organizationId]);
    const resolveIncident = useCallback(async (id, notes) => {
        try {
            await analyticsService.resolveErrorIncident(id, notes);
            await fetchIncidents();
        }
        catch (err) {
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
export function useAlerts(organizationId) {
    const [rules, setRules] = useState([]);
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const analyticsService = useMemo(() => new AnalyticsMonitoringService(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY), []);
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch alert data');
        }
        finally {
            setLoading(false);
        }
    }, [analyticsService, organizationId]);
    const createRule = useCallback(async (rule) => {
        try {
            await analyticsService.createAlertRule(rule);
            await fetchAlertData();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create alert rule');
        }
    }, [analyticsService, fetchAlertData]);
    const acknowledgeAlert = useCallback(async (id, userId) => {
        try {
            await analyticsService.acknowledgeAlert(id, userId);
            await fetchAlertData();
        }
        catch (err) {
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
export function useUserEngagement(organizationId) {
    const [engagement, setEngagement] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const analyticsService = useMemo(() => new AnalyticsMonitoringService(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY), []);
    const fetchEngagement = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await analyticsService.getUserEngagementMetrics(organizationId);
            setEngagement(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch user engagement');
        }
        finally {
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
    const [health, setHealth] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const analyticsService = useMemo(() => new AnalyticsMonitoringService(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY), []);
    const fetchHealth = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await analyticsService.getSystemHealthOverview();
            setHealth(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch system health');
        }
        finally {
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
//# sourceMappingURL=AnalyticsMonitoringService.js.map