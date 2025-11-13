/**
 * useWorkflowExecution - React hook for workflow execution
 *
 * Manages workflow execution state, progress tracking, and results.
 */
import { useState, useEffect, useCallback } from 'react';
import { useWorkflow } from '../providers/WorkflowProvider';
export function useWorkflowExecution(workflowId, executionId, options = {}) {
    const { engine, getExecution, executeWorkflow: contextExecuteWorkflow, cancelExecution } = useWorkflow();
    const [execution, setExecution] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Load execution
    const loadExecution = useCallback(async () => {
        if (!executionId)
            return;
        setIsLoading(true);
        setError(null);
        try {
            // Try context first
            let exec = getExecution(executionId);
            // Load from engine if not in context
            if (!exec) {
                const loadedExec = await engine.getExecution(executionId);
                exec = loadedExec || undefined;
            }
            setExecution(exec || null);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        }
        finally {
            setIsLoading(false);
        }
    }, [executionId, getExecution, engine]);
    // Auto-load
    useEffect(() => {
        if (options.autoLoad && executionId) {
            loadExecution();
        }
    }, [options.autoLoad, executionId, loadExecution]);
    // Poll for updates
    useEffect(() => {
        if (!options.pollInterval || !executionId)
            return;
        const interval = setInterval(() => {
            if (execution?.status === 'running' || execution?.status === 'pending') {
                loadExecution();
            }
        }, options.pollInterval);
        return () => clearInterval(interval);
    }, [options.pollInterval, executionId, execution?.status, loadExecution]);
    // Execute workflow
    const execute = useCallback(async (triggerData, userId) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await contextExecuteWorkflow(workflowId, triggerData, userId);
            setExecution(result);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [workflowId, contextExecuteWorkflow]);
    // Cancel execution
    const cancel = useCallback(async () => {
        if (!execution?.id)
            return;
        setIsLoading(true);
        setError(null);
        try {
            await cancelExecution(execution.id);
            await loadExecution();
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [execution?.id, cancelExecution, loadExecution]);
    // Refresh
    const refresh = useCallback(async () => {
        await loadExecution();
    }, [loadExecution]);
    // Status helpers
    const isPending = execution?.status === 'pending';
    const isRunning = execution?.status === 'running';
    const isCompleted = execution?.status === 'completed';
    const isFailed = execution?.status === 'failed';
    const isCancelled = execution?.status === 'cancelled';
    const isExecuting = isPending || isRunning;
    // Progress calculation
    const completedActions = execution?.actions.filter(a => a.status === 'completed' || a.status === 'failed').length || 0;
    const totalActions = execution?.actions.length || 0;
    const progress = totalActions > 0
        ? Math.round((completedActions / totalActions) * 100)
        : 0;
    const currentAction = execution?.actions.find(a => a.status === 'running')?.actionId || null;
    return {
        execution,
        isLoading,
        isExecuting,
        error,
        isPending,
        isRunning,
        isCompleted,
        isFailed,
        isCancelled,
        progress,
        currentAction,
        completedActions,
        totalActions,
        execute,
        cancel,
        refresh,
    };
}
//# sourceMappingURL=useWorkflowExecution.js.map