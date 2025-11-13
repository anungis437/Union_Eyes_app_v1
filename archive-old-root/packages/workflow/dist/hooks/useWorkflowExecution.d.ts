/**
 * useWorkflowExecution - React hook for workflow execution
 *
 * Manages workflow execution state, progress tracking, and results.
 */
import type { WorkflowExecution } from '../services/WorkflowEngine';
export interface UseWorkflowExecutionOptions {
    autoLoad?: boolean;
    pollInterval?: number;
}
export interface UseWorkflowExecutionReturn {
    execution: WorkflowExecution | null;
    isLoading: boolean;
    isExecuting: boolean;
    error: Error | null;
    isPending: boolean;
    isRunning: boolean;
    isCompleted: boolean;
    isFailed: boolean;
    isCancelled: boolean;
    progress: number;
    currentAction: string | null;
    completedActions: number;
    totalActions: number;
    execute: (triggerData: Record<string, any>, userId: string) => Promise<void>;
    cancel: () => Promise<void>;
    refresh: () => Promise<void>;
}
export declare function useWorkflowExecution(workflowId: string, executionId?: string, options?: UseWorkflowExecutionOptions): UseWorkflowExecutionReturn;
//# sourceMappingURL=useWorkflowExecution.d.ts.map