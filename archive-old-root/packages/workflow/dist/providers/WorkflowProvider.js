import { jsx as _jsx } from "react/jsx-runtime";
/**
 * WorkflowProvider - React Context for Workflow Management
 *
 * Provides centralized workflow state management, execution tracking,
 * and workflow operations across the application.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { WorkflowEngine } from '../services/WorkflowEngine';
import { WorkflowBuilderService } from '../services/WorkflowBuilderService';
import { TriggerService } from '../services/TriggerService';
import { ActionService } from '../services/ActionService';
// ============================================================================
// Context
// ============================================================================
const WorkflowContext = createContext(null);
export function WorkflowProvider({ children }) {
    // Initialize services
    const [engine] = useState(() => new WorkflowEngine());
    const [builder] = useState(() => new WorkflowBuilderService());
    const [triggerService] = useState(() => new TriggerService(engine));
    const [actionService] = useState(() => new ActionService());
    // State
    const [workflows, setWorkflows] = useState(new Map());
    const [executions, setExecutions] = useState(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Load workflows
    const loadWorkflows = useCallback(async (organizationId) => {
        setIsLoading(true);
        setError(null);
        try {
            const workflowList = await engine.listWorkflows(organizationId);
            const workflowMap = new Map();
            workflowList.forEach(workflow => {
                workflowMap.set(workflow.id, workflow);
            });
            setWorkflows(workflowMap);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    // Get workflow
    const getWorkflow = useCallback((workflowId) => {
        return workflows.get(workflowId);
    }, [workflows]);
    // Create workflow
    const createWorkflow = useCallback(async (workflow) => {
        setIsLoading(true);
        setError(null);
        try {
            const created = await engine.createWorkflow(workflow);
            setWorkflows(prev => new Map(prev).set(created.id, created));
            return created;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    // Update workflow
    const updateWorkflow = useCallback(async (workflowId, updates) => {
        setIsLoading(true);
        setError(null);
        try {
            const updated = await engine.updateWorkflow(workflowId, updates);
            setWorkflows(prev => new Map(prev).set(updated.id, updated));
            return updated;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    // Delete workflow
    const deleteWorkflow = useCallback(async (workflowId) => {
        setIsLoading(true);
        setError(null);
        try {
            await engine.deleteWorkflow(workflowId);
            setWorkflows(prev => {
                const updated = new Map(prev);
                updated.delete(workflowId);
                return updated;
            });
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    // Execute workflow
    const executeWorkflow = useCallback(async (workflowId, triggerData, userId) => {
        setIsLoading(true);
        setError(null);
        try {
            const execution = await engine.executeWorkflow(workflowId, triggerData, userId);
            setExecutions(prev => new Map(prev).set(execution.id, execution));
            return execution;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    // Get execution
    const getExecution = useCallback((executionId) => {
        return executions.get(executionId);
    }, [executions]);
    // Load executions
    const loadExecutions = useCallback(async (workflowId) => {
        setIsLoading(true);
        setError(null);
        try {
            const executionList = await engine.listExecutions(workflowId);
            setExecutions(prev => {
                const updated = new Map(prev);
                executionList.forEach(execution => {
                    updated.set(execution.id, execution);
                });
                return updated;
            });
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    // Cancel execution
    const cancelExecution = useCallback(async (executionId) => {
        setIsLoading(true);
        setError(null);
        try {
            await engine.cancelExecution(executionId);
            // Reload execution state
            const execution = await engine.getExecution(executionId);
            if (execution) {
                setExecutions(prev => new Map(prev).set(execution.id, execution));
            }
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    // Clear cache
    const clearCache = useCallback(() => {
        setWorkflows(new Map());
        setExecutions(new Map());
        setError(null);
    }, []);
    const value = {
        engine,
        builder,
        triggerService,
        actionService,
        workflows,
        executions,
        isLoading,
        error,
        loadWorkflows,
        getWorkflow,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        executeWorkflow,
        getExecution,
        loadExecutions,
        cancelExecution,
        clearCache,
    };
    return (_jsx(WorkflowContext.Provider, { value: value, children: children }));
}
// ============================================================================
// Hook
// ============================================================================
export function useWorkflow() {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error('useWorkflow must be used within WorkflowProvider');
    }
    return context;
}
//# sourceMappingURL=WorkflowProvider.js.map