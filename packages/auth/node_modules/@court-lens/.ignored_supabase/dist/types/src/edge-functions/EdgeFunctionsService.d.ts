/**
 * Edge Functions Service Client
 *
 * TypeScript service for managing and invoking Supabase Edge Functions
 * from the CourtLens frontend applications.
 *
 * Features:
 * - Type-safe Edge Function invocation
 * - Automatic authentication handling
 * - Request/response transformation
 * - Error handling and retry logic
 * - Background task scheduling
 * - Webhook management
 * - Real-time status monitoring
 *
 * @module EdgeFunctionsService
 */
export interface EdgeFunctionResponse<T = any> {
    data?: T;
    error?: string;
    success: boolean;
    executionTime?: number;
    functionName: string;
    requestId?: string;
}
export interface DocumentAnalysisRequest {
    documentId: string;
    organizationId: string;
    options: {
        extractEntities?: boolean;
        detectClauses?: boolean;
        assessRisk?: boolean;
        extractSummary?: boolean;
        language?: string;
        notifyWebhook?: string;
    };
}
export interface DocumentAnalysisResult {
    documentId: string;
    status: 'processing' | 'completed' | 'failed';
    extractedText?: string;
    entities?: ExtractedEntity[];
    clauses?: DetectedClause[];
    riskAssessment?: RiskAssessment;
    summary?: DocumentSummary;
    metadata: {
        pageCount?: number;
        wordCount?: number;
        confidence?: number;
        processingTime: number;
        language?: string;
    };
    error?: string;
}
export interface ExtractedEntity {
    type: 'person' | 'organization' | 'date' | 'amount' | 'location' | 'legal_reference';
    text: string;
    confidence: number;
    position: {
        start: number;
        end: number;
        page?: number;
    };
    metadata?: Record<string, any>;
}
export interface DetectedClause {
    type: string;
    category: 'liability' | 'termination' | 'payment' | 'confidentiality' | 'compliance' | 'other';
    text: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    suggestions?: string[];
    position: {
        start: number;
        end: number;
        page?: number;
    };
}
export interface RiskAssessment {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: RiskFactor[];
    recommendations: string[];
    complianceIssues: ComplianceIssue[];
}
export interface RiskFactor {
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likelihood: number;
    impact: number;
}
export interface ComplianceIssue {
    regulation: string;
    description: string;
    severity: 'minor' | 'major' | 'critical';
    recommendation: string;
}
export interface DocumentSummary {
    executiveSummary: string;
    keyTerms: KeyTerm[];
    importantDates: Date[];
    parties: Party[];
    obligations: string[];
}
export interface KeyTerm {
    term: string;
    definition: string;
    importance: 'low' | 'medium' | 'high';
}
export interface Party {
    name: string;
    role: string;
    type: 'individual' | 'organization';
    obligations?: string[];
}
export interface BackgroundTaskRequest {
    taskType: TaskType;
    priority: TaskPriority;
    payload: Record<string, any>;
    organizationId?: string;
    userId?: string;
    scheduledAt?: string;
    retryCount?: number;
    maxRetries?: number;
}
export interface BackgroundTaskResult {
    taskId: string;
    status: TaskStatus;
    result?: any;
    error?: string;
    processingTime: number;
    completedAt: string;
    nextRetryAt?: string;
}
export type TaskType = 'cleanup.expired_sessions' | 'cleanup.old_logs' | 'cleanup.temp_files' | 'notifications.email_digest' | 'notifications.sms_alerts' | 'notifications.push_notifications' | 'reports.billing_summary' | 'reports.usage_analytics' | 'reports.performance_metrics' | 'sync.external_calendar' | 'sync.billing_system' | 'sync.court_records' | 'analysis.document_processing' | 'analysis.case_insights' | 'analysis.client_metrics' | 'maintenance.database_vacuum' | 'maintenance.index_rebuild' | 'maintenance.backup_verification' | 'security.audit_review' | 'security.access_cleanup' | 'security.compliance_check';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export interface WebhookEventData {
    id: string;
    provider: string;
    eventType: string;
    payload: Record<string, any>;
    timestamp: string;
    verified: boolean;
    processed: boolean;
}
export interface EdgeFunctionConfig {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    headers?: Record<string, string>;
}
export declare class EdgeFunctionsService {
    private supabase;
    private baseConfig;
    constructor(supabaseUrl: string, supabaseAnonKey: string, config?: EdgeFunctionConfig);
    /**
     * Analyze a document using AI-powered processing
     */
    analyzeDocument(request: DocumentAnalysisRequest, config?: EdgeFunctionConfig): Promise<EdgeFunctionResponse<DocumentAnalysisResult>>;
    /**
     * Get document analysis status
     */
    getDocumentAnalysisStatus(documentId: string): Promise<EdgeFunctionResponse<{
        status: string;
        progress?: number;
    }>>;
    /**
     * Cancel ongoing document analysis
     */
    cancelDocumentAnalysis(documentId: string): Promise<EdgeFunctionResponse<{
        cancelled: boolean;
    }>>;
    /**
     * Execute a background task immediately
     */
    executeBackgroundTask(request: BackgroundTaskRequest, config?: EdgeFunctionConfig): Promise<EdgeFunctionResponse<BackgroundTaskResult>>;
    /**
     * Schedule a background task for later execution
     */
    scheduleBackgroundTask(request: BackgroundTaskRequest, config?: EdgeFunctionConfig): Promise<EdgeFunctionResponse<{
        taskId: string;
        scheduled: boolean;
    }>>;
    /**
     * Get background task status
     */
    getBackgroundTaskStatus(taskId: string): Promise<EdgeFunctionResponse<BackgroundTaskResult>>;
    /**
     * Execute pending scheduled tasks (typically called by cron)
     */
    executePendingTasks(): Promise<EdgeFunctionResponse<{
        executed: number;
        results: BackgroundTaskResult[];
    }>>;
    /**
     * Process an incoming webhook (typically called from external systems)
     */
    processWebhook(provider: string, payload: any, headers?: Record<string, string>): Promise<EdgeFunctionResponse<any>>;
    /**
     * Get webhook processing logs
     */
    getWebhookLogs(provider?: string, limit?: number): Promise<EdgeFunctionResponse<WebhookEventData[]>>;
    /**
     * Retry failed webhook processing
     */
    retryWebhook(eventId: string): Promise<EdgeFunctionResponse<{
        retried: boolean;
    }>>;
    /**
     * Test Edge Function connectivity and authentication
     */
    testConnection(): Promise<EdgeFunctionResponse<{
        authenticated: boolean;
        functions: string[];
    }>>;
    /**
     * Get available Edge Functions
     */
    listAvailableFunctions(): Promise<EdgeFunctionResponse<string[]>>;
    /**
     * Monitor Edge Function performance
     */
    getFunctionMetrics(functionName: string, timeRange?: '1h' | '24h' | '7d' | '30d'): Promise<EdgeFunctionResponse<{
        invocations: number;
        errors: number;
        avgDuration: number;
        timeRange: string;
    }>>;
    /**
     * Generic Edge Function invocation with retry logic
     */
    private invokeFunction;
    /**
     * Check if an error should not be retried
     */
    private isNonRetryableError;
    /**
     * Delay utility for retry logic
     */
    private delay;
    /**
     * Generate unique request ID for tracking
     */
    private generateRequestId;
    /**
     * Set authentication token for Edge Function calls
     */
    setAuthToken(token: string): void;
    /**
     * Clear authentication token
     */
    clearAuthToken(): void;
    /**
     * Update default configuration
     */
    updateConfig(config: Partial<EdgeFunctionConfig>): void;
    /**
     * Execute multiple Edge Functions in parallel
     */
    executeBatch<T = any>(requests: Array<{
        functionName: string;
        payload: any;
        config?: EdgeFunctionConfig;
    }>): Promise<EdgeFunctionResponse<T>[]>;
    /**
     * Execute multiple background tasks as a batch
     */
    executeTaskBatch(tasks: BackgroundTaskRequest[], config?: EdgeFunctionConfig): Promise<EdgeFunctionResponse<BackgroundTaskResult[]>>;
}
/**
 * Create an EdgeFunctionsService instance with environment configuration
 */
export declare function createEdgeFunctionsService(config?: EdgeFunctionConfig): EdgeFunctionsService;
/**
 * React hook for document analysis
 */
export declare function useDocumentAnalysis(): {
    analyzeDocument: (request: DocumentAnalysisRequest) => Promise<void>;
    clearResult: () => void;
    isAnalyzing: boolean;
    result: DocumentAnalysisResult | null;
    error: string | null;
};
/**
 * React hook for background tasks
 */
export declare function useBackgroundTasks(): {
    executeTask: (request: BackgroundTaskRequest) => Promise<BackgroundTaskResult>;
    scheduleTask: (request: BackgroundTaskRequest) => Promise<string>;
    getTaskStatus: (taskId: string) => Promise<BackgroundTaskResult | null>;
    tasks: BackgroundTaskResult[];
    getTask: (taskId: string) => BackgroundTaskResult | undefined;
};
/**
 * React hook for Edge Function monitoring
 */
export declare function useEdgeFunctionMonitoring(): {
    getFunctionMetrics: (functionName: string, timeRange?: "1h" | "24h" | "7d" | "30d") => Promise<{
        invocations: number;
        errors: number;
        avgDuration: number;
        timeRange: string;
    } | null>;
    testConnection: () => Promise<EdgeFunctionResponse<{
        authenticated: boolean;
        functions: string[];
    }>>;
    metrics: [string, any][];
    isLoading: boolean;
};
//# sourceMappingURL=EdgeFunctionsService.d.ts.map