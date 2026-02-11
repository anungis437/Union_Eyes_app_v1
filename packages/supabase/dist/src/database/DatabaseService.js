/**
 * Database Service for Advanced Features
 *
 * TypeScript service that provides access to advanced PostgreSQL features,
 * custom functions, and legal compliance operations for CourtLens.
 *
 * Features:
 * - Advanced search capabilities with full-text search
 * - Legal compliance and audit operations
 * - Data encryption and security functions
 * - Performance monitoring and optimization
 * - Document classification and retention
 * - Billing and time tracking analytics
 *
 * @module DatabaseService
 */
import { createClient } from '@supabase/supabase-js';
// ============================================================================
// DATABASE SERVICE CLASS
// ============================================================================
export class DatabaseService {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    // ============================================================================
    // SEARCH OPERATIONS
    // ============================================================================
    /**
     * Search legal documents using full-text search
     */
    async searchDocuments(params) {
        const { data, error } = await this.supabase.rpc('search_legal_documents', {
            search_query: params.query,
            organization_id: params.organizationId,
            matter_id: params.matterId || null,
            doc_type: params.documentType || null,
            classification_filter: params.classification || null,
            limit_results: params.limit || 50
        });
        if (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Update document search index
     */
    async updateDocumentSearchIndex(documentId, title, content, metadata) {
        const { error } = await this.supabase.rpc('update_document_search_vector', {
            doc_id: documentId,
            title,
            content,
            metadata: metadata || {}
        });
        if (error) {
            throw new Error(`Failed to update search index: ${error.message}`);
        }
    }
    // ============================================================================
    // BILLING AND TIME TRACKING
    // ============================================================================
    /**
     * Generate billing summary for organization or matter
     */
    async generateBillingSummary(params) {
        const { data, error } = await this.supabase.rpc('generate_billing_summary', {
            organization_id: params.organizationId,
            matter_id: params.matterId || null,
            start_date: params.startDate || null,
            end_date: params.endDate || null
        });
        if (error) {
            throw new Error(`Failed to generate billing summary: ${error.message}`);
        }
        return data?.[0] || {
            total_hours: 0,
            total_amount: 0,
            billable_hours: 0,
            non_billable_hours: 0,
            entry_count: 0
        };
    }
    // ============================================================================
    // LEGAL COMPLIANCE OPERATIONS
    // ============================================================================
    /**
     * Check if a record is under legal hold
     */
    async isUnderLegalHold(organizationId, matterId, documentId) {
        const { data, error } = await this.supabase.rpc('is_under_legal_hold', {
            organization_id: organizationId,
            matter_id: matterId || null,
            document_id: documentId || null
        });
        if (error) {
            throw new Error(`Failed to check legal hold status: ${error.message}`);
        }
        return data || false;
    }
    /**
     * Get legal holds for organization
     */
    async getLegalHolds(organizationId, isActive = true) {
        let query = this.supabase
            .from('legal_holds')
            .select('*')
            .eq('organization_id', organizationId);
        if (isActive) {
            query = query.eq('is_active', true);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
            throw new Error(`Failed to fetch legal holds: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Create a new legal hold
     */
    async createLegalHold(legalHold) {
        const { data, error } = await this.supabase
            .from('legal_holds')
            .insert(legalHold)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create legal hold: ${error.message}`);
        }
        return data;
    }
    /**
     * Update legal hold
     */
    async updateLegalHold(id, updates) {
        const { data, error } = await this.supabase
            .from('legal_holds')
            .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update legal hold: ${error.message}`);
        }
        return data;
    }
    // ============================================================================
    // DOCUMENT CLASSIFICATION
    // ============================================================================
    /**
     * Get document classifications
     */
    async getDocumentClassifications(documentId) {
        const { data, error } = await this.supabase
            .from('document_classifications')
            .select('*')
            .eq('document_id', documentId)
            .order('classification_date', { ascending: false });
        if (error) {
            throw new Error(`Failed to fetch document classifications: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Create document classification
     */
    async createDocumentClassification(classification) {
        const { data, error } = await this.supabase
            .from('document_classifications')
            .insert(classification)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create document classification: ${error.message}`);
        }
        return data;
    }
    /**
     * Validate legal document structure
     */
    async validateLegalDocument(documentData) {
        const { data, error } = await this.supabase.rpc('validate_legal_document', {
            document_data: documentData
        });
        if (error) {
            throw new Error(`Failed to validate document: ${error.message}`);
        }
        return data || false;
    }
    // ============================================================================
    // AUDIT AND MONITORING
    // ============================================================================
    /**
     * Get audit logs for organization
     */
    async getAuditLogs(organizationId, options = {}) {
        let query = this.supabase
            .from('audit_logs_enhanced')
            .select('*')
            .eq('organization_id', organizationId);
        if (options.userId) {
            query = query.eq('user_id', options.userId);
        }
        if (options.tableName) {
            query = query.eq('table_name', options.tableName);
        }
        if (options.eventType) {
            query = query.eq('event_type', options.eventType);
        }
        if (options.startDate) {
            query = query.gte('created_at', options.startDate);
        }
        if (options.endDate) {
            query = query.lte('created_at', options.endDate);
        }
        query = query
            .order('created_at', { ascending: false })
            .limit(options.limit || 100);
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to fetch audit logs: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Get compliance dashboard data
     */
    async getComplianceDashboard(organizationId) {
        let query = this.supabase.from('legal_compliance_dashboard').select('*');
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to fetch compliance dashboard: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Get document security overview
     */
    async getDocumentSecurityOverview(organizationId) {
        const { data, error } = await this.supabase
            .from('document_security_overview')
            .select('*')
            .eq('organization_id', organizationId);
        if (error) {
            throw new Error(`Failed to fetch document security overview: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Get performance metrics
     */
    async getPerformanceMetrics(organizationId, hours = 24) {
        let query = this.supabase
            .from('performance_monitoring')
            .select('*')
            .gte('hour', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query.order('hour', { ascending: false });
        if (error) {
            throw new Error(`Failed to fetch performance metrics: ${error.message}`);
        }
        return data || [];
    }
    // ============================================================================
    // DATA RETENTION AND CLEANUP
    // ============================================================================
    /**
     * Get data retention policies
     */
    async getDataRetentionPolicies(organizationId) {
        const { data, error } = await this.supabase
            .from('data_retention_policies')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
        if (error) {
            throw new Error(`Failed to fetch data retention policies: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Create data retention policy
     */
    async createDataRetentionPolicy(policy) {
        const { data, error } = await this.supabase
            .from('data_retention_policies')
            .insert(policy)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create data retention policy: ${error.message}`);
        }
        return data;
    }
    /**
     * Apply data retention policy to a table
     */
    async applyDataRetentionPolicy(tableName, organizationId) {
        const { data, error } = await this.supabase.rpc('apply_data_retention_policy', {
            target_table: tableName,
            organization_id: organizationId
        });
        if (error) {
            throw new Error(`Failed to apply data retention policy: ${error.message}`);
        }
        return data || 0;
    }
    // ============================================================================
    // ENCRYPTION OPERATIONS
    // ============================================================================
    /**
     * Encrypt sensitive data (server-side function)
     */
    async encryptSensitiveData(dataText, keyName, organizationId) {
        const { data, error } = await this.supabase.rpc('encrypt_sensitive_data', {
            data_text: dataText,
            key_name: keyName,
            organization_id: organizationId
        });
        if (error) {
            throw new Error(`Failed to encrypt data: ${error.message}`);
        }
        return data;
    }
    /**
     * Decrypt sensitive data (server-side function)
     */
    async decryptSensitiveData(encryptedData, keyName, organizationId) {
        const { data, error } = await this.supabase.rpc('decrypt_sensitive_data', {
            encrypted_data: encryptedData,
            key_name: keyName,
            organization_id: organizationId
        });
        if (error) {
            throw new Error(`Failed to decrypt data: ${error.message}`);
        }
        return data;
    }
    /**
     * Calculate document checksum
     */
    async calculateDocumentChecksum(documentContent) {
        const { data, error } = await this.supabase.rpc('calculate_document_checksum', {
            document_content: documentContent
        });
        if (error) {
            throw new Error(`Failed to calculate checksum: ${error.message}`);
        }
        return data;
    }
    // ============================================================================
    // MATERIALIZED VIEW OPERATIONS
    // ============================================================================
    /**
     * Refresh daily usage statistics
     */
    async refreshDailyUsageStats() {
        const { error } = await this.supabase.rpc('refresh_materialized_view', {
            view_name: 'daily_usage_stats'
        });
        if (error) {
            throw new Error(`Failed to refresh usage stats: ${error.message}`);
        }
    }
    /**
     * Get daily usage statistics
     */
    async getDailyUsageStats(organizationId, days = 30) {
        let query = this.supabase
            .from('daily_usage_stats')
            .select('*')
            .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) {
            throw new Error(`Failed to fetch usage stats: ${error.message}`);
        }
        return data || [];
    }
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    /**
     * Execute custom SQL query with proper error handling
     */
    async executeCustomQuery(functionName, params = {}) {
        const { data, error } = await this.supabase.rpc(functionName, params);
        if (error) {
            throw new Error(`Query execution failed: ${error.message}`);
        }
        return data;
    }
    /**
     * Get database health status
     */
    async getDatabaseHealth() {
        try {
            // Simple health check query
            const { error } = await this.supabase
                .from('organizations')
                .select('id')
                .limit(1);
            if (error) {
                return { connectionStatus: 'unhealthy' };
            }
            // Get performance metrics for health assessment
            const metrics = await this.getPerformanceMetrics(undefined, 1);
            const slowQueries = metrics.reduce((sum, m) => sum + m.slow_queries, 0);
            const totalQueries = metrics.reduce((sum, m) => sum + m.query_count, 0);
            const connectionStatus = slowQueries / totalQueries > 0.1 ? 'degraded' : 'healthy';
            return {
                connectionStatus,
                slowQueries,
                errorRate: slowQueries / totalQueries
            };
        }
        catch (error) {
            return { connectionStatus: 'unhealthy' };
        }
    }
}
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Create a DatabaseService instance with environment configuration
 */
export function createDatabaseService() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration. Please check environment variables.');
    }
    return new DatabaseService(supabaseUrl, supabaseKey);
}
// ============================================================================
// REACT HOOKS FOR DATABASE OPERATIONS
// ============================================================================
import { useState, useCallback, useEffect } from 'react';
/**
 * React hook for document search
 */
export function useDocumentSearch() {
    const [service] = useState(() => createDatabaseService());
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);
    const searchDocuments = useCallback(async (params) => {
        setIsSearching(true);
        setError(null);
        try {
            const searchResults = await service.searchDocuments(params);
            setResults(searchResults);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults([]);
        }
        finally {
            setIsSearching(false);
        }
    }, [service]);
    const clearResults = useCallback(() => {
        setResults([]);
        setError(null);
    }, []);
    return {
        searchDocuments,
        clearResults,
        isSearching,
        results,
        error
    };
}
/**
 * React hook for compliance monitoring
 */
export function useComplianceMonitoring(organizationId) {
    const [service] = useState(() => createDatabaseService());
    const [dashboard, setDashboard] = useState(null);
    const [securityOverview, setSecurityOverview] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const refreshData = useCallback(async () => {
        if (!organizationId)
            return;
        setIsLoading(true);
        try {
            const [dashboardData, securityData] = await Promise.all([
                service.getComplianceDashboard(organizationId),
                service.getDocumentSecurityOverview(organizationId)
            ]);
            setDashboard(dashboardData[0] || null);
            setSecurityOverview(securityData);
        }
        catch (error) {
}
        finally {
            setIsLoading(false);
        }
    }, [service, organizationId]);
    useEffect(() => {
        refreshData();
    }, [refreshData]);
    return {
        dashboard,
        securityOverview,
        isLoading,
        refreshData
    };
}
/**
 * React hook for audit logs
 */
export function useAuditLogs(organizationId) {
    const [service] = useState(() => createDatabaseService());
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const fetchLogs = useCallback(async (options = {}) => {
        setIsLoading(true);
        try {
            const auditLogs = await service.getAuditLogs(organizationId, options);
            setLogs(auditLogs);
        }
        catch (error) {
}
        finally {
            setIsLoading(false);
        }
    }, [service, organizationId]);
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);
    return {
        logs,
        isLoading,
        fetchLogs,
        refresh: () => fetchLogs()
    };
}
//# sourceMappingURL=DatabaseService.js.map
