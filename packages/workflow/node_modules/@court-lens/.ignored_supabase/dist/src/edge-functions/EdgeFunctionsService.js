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
import { createClient } from '@supabase/supabase-js';
// ============================================================================
// EDGE FUNCTIONS SERVICE CLASS
// ============================================================================
export class EdgeFunctionsService {
    constructor(supabaseUrl, supabaseAnonKey, config = {}) {
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
    async analyzeDocument(request, config) {
        return this.invokeFunction('document-analysis', request, {
            ...this.baseConfig,
            ...config,
            timeout: 600000 // 10 minutes for document analysis
        });
    }
    /**
     * Get document analysis status
     */
    async getDocumentAnalysisStatus(documentId) {
        return this.invokeFunction('document-analysis', {
            action: 'status',
            documentId
        });
    }
    /**
     * Cancel ongoing document analysis
     */
    async cancelDocumentAnalysis(documentId) {
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
    async executeBackgroundTask(request, config) {
        return this.invokeFunction('background-tasks/execute', request, config);
    }
    /**
     * Schedule a background task for later execution
     */
    async scheduleBackgroundTask(request, config) {
        return this.invokeFunction('background-tasks/schedule', request, config);
    }
    /**
     * Get background task status
     */
    async getBackgroundTaskStatus(taskId) {
        return this.invokeFunction(`background-tasks/status?taskId=${taskId}`, {}, {
            method: 'GET'
        });
    }
    /**
     * Execute pending scheduled tasks (typically called by cron)
     */
    async executePendingTasks() {
        return this.invokeFunction('background-tasks/cron', {});
    }
    // ============================================================================
    // WEBHOOK HANDLER FUNCTIONS
    // ============================================================================
    /**
     * Process an incoming webhook (typically called from external systems)
     */
    async processWebhook(provider, payload, headers = {}) {
        return this.invokeFunction(`webhook-handler/${provider}`, payload, {
            headers,
            method: 'POST'
        });
    }
    /**
     * Get webhook processing logs
     */
    async getWebhookLogs(provider, limit = 50) {
        const query = provider ? `?provider=${provider}&limit=${limit}` : `?limit=${limit}`;
        return this.invokeFunction(`webhook-handler/logs${query}`, {}, {
            method: 'GET'
        });
    }
    /**
     * Retry failed webhook processing
     */
    async retryWebhook(eventId) {
        return this.invokeFunction('webhook-handler/retry', { eventId });
    }
    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    /**
     * Test Edge Function connectivity and authentication
     */
    async testConnection() {
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
        }
        catch (error) {
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
    async listAvailableFunctions() {
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
    async getFunctionMetrics(functionName, timeRange = '24h') {
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
    async invokeFunction(functionName, payload, config = {}) {
        const startTime = Date.now();
        const finalConfig = { ...this.baseConfig, ...config };
        let lastError = '';
        for (let attempt = 0; attempt <= (finalConfig.retries || 0); attempt++) {
            try {
                const requestConfig = {
                    body: config.method === 'GET' ? undefined : payload,
                    headers: finalConfig.headers
                };
                // Add timeout if specified
                if (finalConfig.timeout) {
                    requestConfig.timeout = finalConfig.timeout;
                }
                const response = await this.supabase.functions.invoke(functionName, requestConfig);
                const result = {
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
            }
            catch (error) {
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
    isNonRetryableError(error) {
        const nonRetryableErrors = [
            'authentication',
            'authorization',
            'not found',
            'invalid',
            'forbidden',
            'bad request'
        ];
        return nonRetryableErrors.some(err => error.toLowerCase().includes(err));
    }
    /**
     * Delay utility for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Generate unique request ID for tracking
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // ============================================================================
    // AUTHENTICATION HELPERS
    // ============================================================================
    /**
     * Set authentication token for Edge Function calls
     */
    setAuthToken(token) {
        this.baseConfig.headers = {
            ...this.baseConfig.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    /**
     * Clear authentication token
     */
    clearAuthToken() {
        const { Authorization, ...otherHeaders } = this.baseConfig.headers || {};
        this.baseConfig.headers = otherHeaders;
    }
    /**
     * Update default configuration
     */
    updateConfig(config) {
        this.baseConfig = { ...this.baseConfig, ...config };
    }
    // ============================================================================
    // BATCH OPERATIONS
    // ============================================================================
    /**
     * Execute multiple Edge Functions in parallel
     */
    async executeBatch(requests) {
        const promises = requests.map(req => this.invokeFunction(req.functionName, req.payload, req.config));
        return Promise.all(promises);
    }
    /**
     * Execute multiple background tasks as a batch
     */
    async executeTaskBatch(tasks, config) {
        return this.invokeFunction('background-tasks/batch', { tasks }, config);
    }
}
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Create an EdgeFunctionsService instance with environment configuration
 */
export function createEdgeFunctionsService(config) {
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
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const analyzeDocument = useCallback(async (request) => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const response = await service.analyzeDocument(request);
            if (response.success && response.data) {
                setResult(response.data);
            }
            else {
                setError(response.error || 'Analysis failed');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
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
    const [tasks, setTasks] = useState(new Map());
    const executeTask = useCallback(async (request) => {
        const response = await service.executeBackgroundTask(request);
        if (response.success && response.data) {
            setTasks(prev => new Map(prev.set(response.data.taskId, response.data)));
            return response.data;
        }
        throw new Error(response.error || 'Task execution failed');
    }, [service]);
    const scheduleTask = useCallback(async (request) => {
        const response = await service.scheduleBackgroundTask(request);
        if (response.success && response.data) {
            return response.data.taskId;
        }
        throw new Error(response.error || 'Task scheduling failed');
    }, [service]);
    const getTaskStatus = useCallback(async (taskId) => {
        const response = await service.getBackgroundTaskStatus(taskId);
        if (response.success && response.data) {
            setTasks(prev => new Map(prev.set(taskId, response.data)));
            return response.data;
        }
        return null;
    }, [service]);
    return {
        executeTask,
        scheduleTask,
        getTaskStatus,
        tasks: Array.from(tasks.values()),
        getTask: (taskId) => tasks.get(taskId)
    };
}
/**
 * React hook for Edge Function monitoring
 */
export function useEdgeFunctionMonitoring() {
    const [service] = useState(() => createEdgeFunctionsService());
    const [metrics, setMetrics] = useState(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const getFunctionMetrics = useCallback(async (functionName, timeRange = '24h') => {
        setIsLoading(true);
        try {
            const response = await service.getFunctionMetrics(functionName, timeRange);
            if (response.success && response.data) {
                setMetrics(prev => new Map(prev.set(functionName, response.data)));
                return response.data;
            }
            return null;
        }
        finally {
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
//# sourceMappingURL=EdgeFunctionsService.js.map