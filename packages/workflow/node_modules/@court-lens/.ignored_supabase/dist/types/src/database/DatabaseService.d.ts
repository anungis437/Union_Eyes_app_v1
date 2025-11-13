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
export type DocumentType = 'contract' | 'agreement' | 'motion' | 'brief' | 'pleading' | 'discovery' | 'evidence' | 'correspondence' | 'court_order' | 'judgment' | 'settlement' | 'other';
export type CaseStatus = 'active' | 'pending' | 'on_hold' | 'settled' | 'dismissed' | 'won' | 'lost' | 'appealed' | 'closed';
export type BillingStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'attorney_client_privileged';
export type AuditEventType = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'access_granted' | 'access_denied' | 'export' | 'share' | 'download' | 'print';
export interface DocumentSearchResult {
    document_id: string;
    title: string;
    document_type: DocumentType;
    classification: DataClassification;
    rank: number;
    snippet: string;
}
export interface DocumentSearchParams {
    query: string;
    organizationId: string;
    matterId?: string;
    documentType?: DocumentType;
    classification?: DataClassification;
    limit?: number;
}
export interface BillingSummary {
    total_hours: number;
    total_amount: number;
    billable_hours: number;
    non_billable_hours: number;
    entry_count: number;
}
export interface BillingSummaryParams {
    organizationId: string;
    matterId?: string;
    startDate?: string;
    endDate?: string;
}
export interface AuditLogEntry {
    id: string;
    organization_id: string;
    user_id?: string;
    table_name: string;
    record_id?: string;
    event_type: AuditEventType;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changed_fields?: string[];
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    request_id?: string;
    data_classification: DataClassification;
    retention_date?: string;
    encrypted_data?: Uint8Array;
    checksum?: string;
    created_at: string;
}
export interface LegalHold {
    id: string;
    organization_id: string;
    matter_id: string;
    hold_name: string;
    description?: string;
    custodians: string[];
    data_sources: string[];
    start_date: string;
    end_date?: string;
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}
export interface DocumentClassification {
    id: string;
    document_id: string;
    classification: DataClassification;
    classification_reason?: string;
    classified_by?: string;
    classification_date: string;
    review_date?: string;
    auto_classified: boolean;
    confidence_score?: number;
    created_at: string;
}
export interface PerformanceMetric {
    hour: string;
    organization_id: string;
    avg_execution_time: number;
    max_execution_time: number;
    query_count: number;
    slow_queries: number;
}
export interface ComplianceDashboard {
    organization_id: string;
    organization_name: string;
    active_legal_holds: number;
    privileged_documents: number;
    audit_events_today: number;
    access_violations_today: number;
}
export interface DocumentSecurityOverview {
    organization_id: string;
    matter_id?: string;
    document_id: string;
    document_name: string;
    classification?: DataClassification;
    under_legal_hold: boolean;
    encrypted: boolean;
    created_at: string;
    updated_at: string;
}
export interface DataRetentionPolicy {
    id: string;
    organization_id: string;
    table_name: string;
    data_type: string;
    retention_period_months: number;
    classification: DataClassification;
    auto_delete: boolean;
    legal_hold_exempt: boolean;
    policy_description?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}
export declare class DatabaseService {
    private supabase;
    constructor(supabaseUrl: string, supabaseKey: string);
    /**
     * Search legal documents using full-text search
     */
    searchDocuments(params: DocumentSearchParams): Promise<DocumentSearchResult[]>;
    /**
     * Update document search index
     */
    updateDocumentSearchIndex(documentId: string, title: string, content: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Generate billing summary for organization or matter
     */
    generateBillingSummary(params: BillingSummaryParams): Promise<BillingSummary>;
    /**
     * Check if a record is under legal hold
     */
    isUnderLegalHold(organizationId: string, matterId?: string, documentId?: string): Promise<boolean>;
    /**
     * Get legal holds for organization
     */
    getLegalHolds(organizationId: string, isActive?: boolean): Promise<LegalHold[]>;
    /**
     * Create a new legal hold
     */
    createLegalHold(legalHold: Omit<LegalHold, 'id' | 'created_at' | 'updated_at'>): Promise<LegalHold>;
    /**
     * Update legal hold
     */
    updateLegalHold(id: string, updates: Partial<LegalHold>): Promise<LegalHold>;
    /**
     * Get document classifications
     */
    getDocumentClassifications(documentId: string): Promise<DocumentClassification[]>;
    /**
     * Create document classification
     */
    createDocumentClassification(classification: Omit<DocumentClassification, 'id' | 'created_at'>): Promise<DocumentClassification>;
    /**
     * Validate legal document structure
     */
    validateLegalDocument(documentData: Record<string, any>): Promise<boolean>;
    /**
     * Get audit logs for organization
     */
    getAuditLogs(organizationId: string, options?: {
        userId?: string;
        tableName?: string;
        eventType?: AuditEventType;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<AuditLogEntry[]>;
    /**
     * Get compliance dashboard data
     */
    getComplianceDashboard(organizationId?: string): Promise<ComplianceDashboard[]>;
    /**
     * Get document security overview
     */
    getDocumentSecurityOverview(organizationId: string): Promise<DocumentSecurityOverview[]>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(organizationId?: string, hours?: number): Promise<PerformanceMetric[]>;
    /**
     * Get data retention policies
     */
    getDataRetentionPolicies(organizationId: string): Promise<DataRetentionPolicy[]>;
    /**
     * Create data retention policy
     */
    createDataRetentionPolicy(policy: Omit<DataRetentionPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<DataRetentionPolicy>;
    /**
     * Apply data retention policy to a table
     */
    applyDataRetentionPolicy(tableName: string, organizationId: string): Promise<number>;
    /**
     * Encrypt sensitive data (server-side function)
     */
    encryptSensitiveData(dataText: string, keyName: string, organizationId: string): Promise<Uint8Array>;
    /**
     * Decrypt sensitive data (server-side function)
     */
    decryptSensitiveData(encryptedData: Uint8Array, keyName: string, organizationId: string): Promise<string>;
    /**
     * Calculate document checksum
     */
    calculateDocumentChecksum(documentContent: Uint8Array): Promise<string>;
    /**
     * Refresh daily usage statistics
     */
    refreshDailyUsageStats(): Promise<void>;
    /**
     * Get daily usage statistics
     */
    getDailyUsageStats(organizationId?: string, days?: number): Promise<any[]>;
    /**
     * Execute custom SQL query with proper error handling
     */
    executeCustomQuery(functionName: string, params?: Record<string, any>): Promise<any>;
    /**
     * Get database health status
     */
    getDatabaseHealth(): Promise<{
        connectionStatus: 'healthy' | 'degraded' | 'unhealthy';
        activeConnections?: number;
        slowQueries?: number;
        errorRate?: number;
    }>;
}
/**
 * Create a DatabaseService instance with environment configuration
 */
export declare function createDatabaseService(): DatabaseService;
/**
 * React hook for document search
 */
export declare function useDocumentSearch(): {
    searchDocuments: (params: DocumentSearchParams) => Promise<void>;
    clearResults: () => void;
    isSearching: boolean;
    results: DocumentSearchResult[];
    error: string | null;
};
/**
 * React hook for compliance monitoring
 */
export declare function useComplianceMonitoring(organizationId?: string): {
    dashboard: ComplianceDashboard | null;
    securityOverview: DocumentSecurityOverview[];
    isLoading: boolean;
    refreshData: () => Promise<void>;
};
/**
 * React hook for audit logs
 */
export declare function useAuditLogs(organizationId: string): {
    logs: AuditLogEntry[];
    isLoading: boolean;
    fetchLogs: (options?: {
        userId?: string;
        tableName?: string;
        eventType?: AuditEventType;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }) => Promise<void>;
    refresh: () => Promise<void>;
};
//# sourceMappingURL=DatabaseService.d.ts.map