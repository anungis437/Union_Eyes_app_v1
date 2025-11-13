/**
 * WorkflowProvider - React Context for Workflow Management
 * 
 * Provides centralized workflow state management, execution tracking,
 * and workflow operations across the application.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { WorkflowEngine, WorkflowDefinition, WorkflowExecution } from '../services/WorkflowEngine';
import { WorkflowBuilderService } from '../services/WorkflowBuilderService';
import { TriggerService } from '../services/TriggerService';
import { ActionService } from '../services/ActionService';

// ============================================================================
// Types
// ============================================================================

interface WorkflowContextValue {
  // Services
  engine: WorkflowEngine;
  builder: WorkflowBuilderService;
  triggerService: TriggerService;
  actionService: ActionService;
  
  // State
  workflows: Map<string, WorkflowDefinition>;
  executions: Map<string, WorkflowExecution>;
  isLoading: boolean;
  error: Error | null;
  
  // Operations
  loadWorkflows: (organizationId: string) => Promise<void>;
  getWorkflow: (workflowId: string) => WorkflowDefinition | undefined;
  createWorkflow: (workflow: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WorkflowDefinition>;
  updateWorkflow: (workflowId: string, updates: Partial<WorkflowDefinition>) => Promise<WorkflowDefinition>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  executeWorkflow: (workflowId: string, triggerData: Record<string, any>, userId: string) => Promise<WorkflowExecution>;
  
  // Executions
  getExecution: (executionId: string) => WorkflowExecution | undefined;
  loadExecutions: (workflowId: string) => Promise<void>;
  cancelExecution: (executionId: string) => Promise<void>;
  
  // Utilities
  clearCache: () => void;
}

// ============================================================================
// Context
// ============================================================================

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  // Initialize services
  const [engine] = useState(() => new WorkflowEngine());
  const [builder] = useState(() => new WorkflowBuilderService());
  const [triggerService] = useState(() => new TriggerService(engine));
  const [actionService] = useState(() => new ActionService());
  
  // State
  const [workflows, setWorkflows] = useState<Map<string, WorkflowDefinition>>(new Map());
  const [executions, setExecutions] = useState<Map<string, WorkflowExecution>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load workflows
  const loadWorkflows = useCallback(async (organizationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const workflowList = await engine.listWorkflows(organizationId);
      
      const workflowMap = new Map<string, WorkflowDefinition>();
      workflowList.forEach(workflow => {
        workflowMap.set(workflow.id, workflow);
      });

      setWorkflows(workflowMap);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Get workflow
  const getWorkflow = useCallback((workflowId: string) => {
    return workflows.get(workflowId);
  }, [workflows]);

  // Create workflow
  const createWorkflow = useCallback(async (
    workflow: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const created = await engine.createWorkflow(workflow);
      
      setWorkflows(prev => new Map(prev).set(created.id, created));

      return created;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Update workflow
  const updateWorkflow = useCallback(async (
    workflowId: string,
    updates: Partial<WorkflowDefinition>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const updated = await engine.updateWorkflow(workflowId, updates);
      
      setWorkflows(prev => new Map(prev).set(updated.id, updated));

      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Delete workflow
  const deleteWorkflow = useCallback(async (workflowId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await engine.deleteWorkflow(workflowId);
      
      setWorkflows(prev => {
        const updated = new Map(prev);
        updated.delete(workflowId);
        return updated;
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Execute workflow
  const executeWorkflow = useCallback(async (
    workflowId: string,
    triggerData: Record<string, any>,
    userId: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const execution = await engine.executeWorkflow(workflowId, triggerData, userId);
      
      setExecutions(prev => new Map(prev).set(execution.id, execution));

      return execution;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Get execution
  const getExecution = useCallback((executionId: string) => {
    return executions.get(executionId);
  }, [executions]);

  // Load executions
  const loadExecutions = useCallback(async (workflowId: string) => {
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Cancel execution
  const cancelExecution = useCallback(async (executionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await engine.cancelExecution(executionId);
      
      // Reload execution state
      const execution = await engine.getExecution(executionId);
      if (execution) {
        setExecutions(prev => new Map(prev).set(execution.id, execution));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  // Clear cache
  const clearCache = useCallback(() => {
    setWorkflows(new Map());
    setExecutions(new Map());
    setError(null);
  }, []);

  const value: WorkflowContextValue = {
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

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
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
