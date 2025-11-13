/**
 * WorkflowProvider - React Context for Workflow Management
 *
 * Provides centralized workflow state management, execution tracking,
 * and workflow operations across the application.
 */
import { ReactNode } from 'react';
import { WorkflowEngine, WorkflowDefinition, WorkflowExecution } from '../services/WorkflowEngine';
import { WorkflowBuilderService } from '../services/WorkflowBuilderService';
import { TriggerService } from '../services/TriggerService';
import { ActionService } from '../services/ActionService';
interface WorkflowContextValue {
    engine: WorkflowEngine;
    builder: WorkflowBuilderService;
    triggerService: TriggerService;
    actionService: ActionService;
    workflows: Map<string, WorkflowDefinition>;
    executions: Map<string, WorkflowExecution>;
    isLoading: boolean;
    error: Error | null;
    loadWorkflows: (organizationId: string) => Promise<void>;
    getWorkflow: (workflowId: string) => WorkflowDefinition | undefined;
    createWorkflow: (workflow: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WorkflowDefinition>;
    updateWorkflow: (workflowId: string, updates: Partial<WorkflowDefinition>) => Promise<WorkflowDefinition>;
    deleteWorkflow: (workflowId: string) => Promise<void>;
    executeWorkflow: (workflowId: string, triggerData: Record<string, any>, userId: string) => Promise<WorkflowExecution>;
    getExecution: (executionId: string) => WorkflowExecution | undefined;
    loadExecutions: (workflowId: string) => Promise<void>;
    cancelExecution: (executionId: string) => Promise<void>;
    clearCache: () => void;
}
interface WorkflowProviderProps {
    children: ReactNode;
}
export declare function WorkflowProvider({ children }: WorkflowProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useWorkflow(): WorkflowContextValue;
export {};
//# sourceMappingURL=WorkflowProvider.d.ts.map