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

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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

export type TaskType = 
  | 'cleanup.expired_sessions'
  | 'cleanup.old_logs' 
  | 'cleanup.temp_files'
  | 'notifications.email_digest'
  | 'notifications.sms_alerts'
  | 'notifications.push_notifications'
  | 'reports.billing_summary'
  | 'reports.usage_analytics'
  | 'reports.performance_metrics'
  | 'sync.external_calendar'
  | 'sync.billing_system'
  | 'sync.court_records'
  | 'analysis.document_processing'
  | 'analysis.case_insights'
  | 'analysis.client_metrics'
  | 'maintenance.database_vacuum'
  | 'maintenance.index_rebuild'
  | 'maintenance.backup_verification'
  | 'security.audit_review'
  | 'security.access_cleanup'
  | 'security.compliance_check';

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

// ============================================================================
// EDGE FUNCTIONS SERVICE CLASS
// ============================================================================

export class EdgeFunctionsService {
  private supabase: SupabaseClient;
  private baseConfig: EdgeFunctionConfig;

  constructor(
    supabaseUrl: string,
    supabaseAnonKey: string,
    config: EdgeFunctionConfig = {}
  ) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.baseConfig = {
      timeout: 300000, // 5 minutes default
      retries: 3,
      retryDelay: 1000,
      headers: {},
      ...config
    };
  }

  // ============================================================================
  // DOCUMENT ANALYSIS FUNCTIONS
  // ============================================================================

  /**
   * Analyze a document using AI-powered processing
   */
  async analyzeDocument(
    request: DocumentAnalysisRequest,
    config?: EdgeFunctionConfig
  ): Promise<EdgeFunctionResponse<DocumentAnalysisResult>> {
    return this.invokeFunction('document-analysis', request, {
      ...this.baseConfig,
      ...config,
      timeout: 600000 // 10 minutes for document analysis
    });
  }

  /**
   * Get document analysis status
   */
  async getDocumentAnalysisStatus(
    documentId: string
  ): Promise<EdgeFunctionResponse<{ status: string; progress?: number }>> {
    return this.invokeFunction('document-analysis', {
      action: 'status',
      documentId
    });
  }

  /**
   * Cancel ongoing document analysis
   */
  async cancelDocumentAnalysis(
    documentId: string
  ): Promise<EdgeFunctionResponse<{ cancelled: boolean }>> {
    return this.invokeFunction('document-analysis', {
      action: 'cancel',
      documentId
    });
  }

  // ============================================================================
  // BACKGROUND TASKS FUNCTIONS
  // ============================================================================

  /**
   * Execute a background task immediately
   */
  async executeBackgroundTask(
    request: BackgroundTaskRequest,
    config?: EdgeFunctionConfig
  ): Promise<EdgeFunctionResponse<BackgroundTaskResult>> {
    return this.invokeFunction('background-tasks/execute', request, config);
  }

  /**
   * Schedule a background task for later execution
   */
  async scheduleBackgroundTask(
    request: BackgroundTaskRequest,
    config?: EdgeFunctionConfig
  ): Promise<EdgeFunctionResponse<{ taskId: string; scheduled: boolean }>> {
    return this.invokeFunction('background-tasks/schedule', request, config);
  }

  /**
   * Get background task status
   */
  async getBackgroundTaskStatus(
    taskId: string
  ): Promise<EdgeFunctionResponse<BackgroundTaskResult>> {
    return this.invokeFunction(`background-tasks/status?taskId=${taskId}`, {}, {
      method: 'GET'
    });
  }

  /**
   * Execute pending scheduled tasks (typically called by cron)
   */
  async executePendingTasks(): Promise<EdgeFunctionResponse<{
    executed: number;
    results: BackgroundTaskResult[];
  }>> {
    return this.invokeFunction('background-tasks/cron', {});
  }

  // ============================================================================
  // WEBHOOK HANDLER FUNCTIONS
  // ============================================================================

  /**
   * Process an incoming webhook (typically called from external systems)
   */
  async processWebhook(
    provider: string,
    payload: any,
    headers: Record<string, string> = {}
  ): Promise<EdgeFunctionResponse<any>> {
    return this.invokeFunction(`webhook-handler/${provider}`, payload, {
      headers,
      method: 'POST'
    });
  }

  /**
   * Get webhook processing logs
   */
  async getWebhookLogs(
    provider?: string,
    limit: number = 50
  ): Promise<EdgeFunctionResponse<WebhookEventData[]>> {
    const query = provider ? `?provider=${provider}&limit=${limit}` : `?limit=${limit}`;
    return this.invokeFunction(`webhook-handler/logs${query}`, {}, {
      method: 'GET'
    });
  }

  /**
   * Retry failed webhook processing
   */
  async retryWebhook(
    eventId: string
  ): Promise<EdgeFunctionResponse<{ retried: boolean }>> {
    return this.invokeFunction('webhook-handler/retry', { eventId });
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Test Edge Function connectivity and authentication
   */
  async testConnection(): Promise<EdgeFunctionResponse<{ 
    authenticated: boolean; 
    functions: string[];
  }>> {
    try {
      // Try to call a simple health check function
      const response = await this.supabase.functions.invoke('health-check', {
        body: { action: 'ping' }
      });

      return {
        success: !response.error,
        data: response.data,
        error: response.error?.message,
        functionName: 'health-check'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        functionName: 'health-check'
      };
    }
  }

  /**
   * Get available Edge Functions
   */
  async listAvailableFunctions(): Promise<EdgeFunctionResponse<string[]>> {
    // This would typically query Supabase management API
    // For now, return the known functions
    const functions = [
      'document-analysis',
      'background-tasks',
      'webhook-handler',
      'health-check'
    ];

    return {
      success: true,
      data: functions,
      functionName: 'list-functions'
    };
  }

  /**
   * Monitor Edge Function performance
   */
  async getFunctionMetrics(
    functionName: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<EdgeFunctionResponse<{
    invocations: number;
    errors: number;
    avgDuration: number;
    timeRange: string;
  }>> {
    // This would integrate with Supabase Analytics API
    // For now, return mock data
    return {
      success: true,
      data: {
        invocations: 0,
        errors: 0,
        avgDuration: 0,
        timeRange
      },
      functionName: 'metrics'
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generic Edge Function invocation with retry logic
   */
  private async invokeFunction<T = any>(
    functionName: string,
    payload: any,
    config: EdgeFunctionConfig & { method?: string } = {}
  ): Promise<EdgeFunctionResponse<T>> {
    const startTime = Date.now();
    const finalConfig = { ...this.baseConfig, ...config };
    
    let lastError: string = '';
    
    for (let attempt = 0; attempt <= (finalConfig.retries || 0); attempt++) {
      try {
        const requestConfig: any = {
          body: config.method === 'GET' ? undefined : payload,
          headers: finalConfig.headers
        };

        // Add timeout if specified
        if (finalConfig.timeout) {
          requestConfig.timeout = finalConfig.timeout;
        }

        const response = await this.supabase.functions.invoke(functionName, requestConfig);

        const result: EdgeFunctionResponse<T> = {
          success: !response.error,
          data: response.data,
          error: response.error?.message,
          functionName,
          executionTime: Date.now() - startTime,
          requestId: this.generateRequestId()
        };

        if (result.success) {
          return result;
        }

        lastError = result.error || 'Unknown error';
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          break;
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (this.isNonRetryableError(lastError)) {
          break;
        }
      }

      // Wait before retry (except on last attempt)
      if (attempt < (finalConfig.retries || 0)) {
        await this.delay(finalConfig.retryDelay || 1000);
      }
    }

    return {
      success: false,
      error: lastError,
      functionName,
      executionTime: Date.now() - startTime,
      requestId: this.generateRequestId()
    };
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: string): boolean {
    const nonRetryableErrors = [
      'authentication',
      'authorization',
      'not found',
      'invalid',
      'forbidden',
      'bad request'
    ];

    return nonRetryableErrors.some(err => 
      error.toLowerCase().includes(err)
    );
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // AUTHENTICATION HELPERS
  // ============================================================================

  /**
   * Set authentication token for Edge Function calls
   */
  setAuthToken(token: string): void {
    this.baseConfig.headers = {
      ...this.baseConfig.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    const { Authorization, ...otherHeaders } = this.baseConfig.headers || {};
    this.baseConfig.headers = otherHeaders;
  }

  /**
   * Update default configuration
   */
  updateConfig(config: Partial<EdgeFunctionConfig>): void {
    this.baseConfig = { ...this.baseConfig, ...config };
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Execute multiple Edge Functions in parallel
   */
  async executeBatch<T = any>(
    requests: Array<{
      functionName: string;
      payload: any;
      config?: EdgeFunctionConfig;
    }>
  ): Promise<EdgeFunctionResponse<T>[]> {
    const promises = requests.map(req => 
      this.invokeFunction(req.functionName, req.payload, req.config)
    );

    return Promise.all(promises);
  }

  /**
   * Execute multiple background tasks as a batch
   */
  async executeTaskBatch(
    tasks: BackgroundTaskRequest[],
    config?: EdgeFunctionConfig
  ): Promise<EdgeFunctionResponse<BackgroundTaskResult[]>> {
    return this.invokeFunction('background-tasks/batch', { tasks }, config);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an EdgeFunctionsService instance with environment configuration
 */
export function createEdgeFunctionsService(
  config?: EdgeFunctionConfig
): EdgeFunctionsService {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Please check environment variables.');
  }

  return new EdgeFunctionsService(supabaseUrl, supabaseAnonKey, config);
}

// ============================================================================
// REACT HOOKS FOR EDGE FUNCTIONS
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

/**
 * React hook for document analysis
 */
export function useDocumentAnalysis() {
  const [service] = useState(() => createEdgeFunctionsService());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeDocument = useCallback(async (request: DocumentAnalysisRequest) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await service.analyzeDocument(request);
      
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [service]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyzeDocument,
    clearResult,
    isAnalyzing,
    result,
    error
  };
}

/**
 * React hook for background tasks
 */
export function useBackgroundTasks() {
  const [service] = useState(() => createEdgeFunctionsService());
  const [tasks, setTasks] = useState<Map<string, BackgroundTaskResult>>(new Map());

  const executeTask = useCallback(async (request: BackgroundTaskRequest) => {
    const response = await service.executeBackgroundTask(request);
    
    if (response.success && response.data) {
      setTasks(prev => new Map(prev.set(response.data!.taskId, response.data!)));
      return response.data;
    }
    
    throw new Error(response.error || 'Task execution failed');
  }, [service]);

  const scheduleTask = useCallback(async (request: BackgroundTaskRequest) => {
    const response = await service.scheduleBackgroundTask(request);
    
    if (response.success && response.data) {
      return response.data.taskId;
    }
    
    throw new Error(response.error || 'Task scheduling failed');
  }, [service]);

  const getTaskStatus = useCallback(async (taskId: string) => {
    const response = await service.getBackgroundTaskStatus(taskId);
    
    if (response.success && response.data) {
      setTasks(prev => new Map(prev.set(taskId, response.data!)));
      return response.data;
    }
    
    return null;
  }, [service]);

  return {
    executeTask,
    scheduleTask,
    getTaskStatus,
    tasks: Array.from(tasks.values()),
    getTask: (taskId: string) => tasks.get(taskId)
  };
}

/**
 * React hook for Edge Function monitoring
 */
export function useEdgeFunctionMonitoring() {
  const [service] = useState(() => createEdgeFunctionsService());
  const [metrics, setMetrics] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const getFunctionMetrics = useCallback(async (
    functionName: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ) => {
    setIsLoading(true);
    
    try {
      const response = await service.getFunctionMetrics(functionName, timeRange);
      
      if (response.success && response.data) {
        setMetrics(prev => new Map(prev.set(functionName, response.data)));
        return response.data;
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const testConnection = useCallback(async () => {
    return service.testConnection();
  }, [service]);

  useEffect(() => {
    // Auto-refresh metrics every 5 minutes
    const interval = setInterval(() => {
      metrics.forEach((_, functionName) => {
        getFunctionMetrics(functionName);
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [metrics, getFunctionMetrics]);

  return {
    getFunctionMetrics,
    testConnection,
    metrics: Array.from(metrics.entries()),
    isLoading
  };
}
