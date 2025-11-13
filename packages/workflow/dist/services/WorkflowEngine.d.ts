/**
 * WorkflowEngine - Core workflow execution engine
 *
 * Handles workflow execution, state management, condition evaluation,
 * error handling, retries, and execution monitoring.
 *
 * Features:
 * - Trigger-based workflow execution
 * - Conditional branching and parallel execution
 * - Action execution with retries
 * - State management and persistence
 * - Error handling and rollback
 * - Execution history and audit trail
 *
 * @module WorkflowEngine
 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type TriggerType = 'manual' | 'document_upload' | 'document_status_change' | 'case_status_change' | 'date_time' | 'webhook' | 'api';
export type ActionType = 'send_notification' | 'assign_task' | 'update_status' | 'create_document' | 'send_email' | 'webhook' | 'api_call' | 'run_workflow';
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'matches_regex';
export interface WorkflowTrigger {
    id: string;
    type: TriggerType;
    config: Record<string, any>;
    conditions?: WorkflowCondition[];
}
export interface WorkflowCondition {
    id: string;
    field: string;
    operator: ConditionOperator;
    value: any;
    logicalOperator?: 'AND' | 'OR';
}
export interface WorkflowAction {
    id: string;
    type: ActionType;
    config: Record<string, any>;
    retryConfig?: RetryConfig;
    conditions?: WorkflowCondition[];
    onSuccess?: string[];
    onFailure?: string[];
}
export interface RetryConfig {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
}
export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    organizationId: string;
    status: WorkflowStatus;
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
    variables?: Record<string, any>;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
export interface ExecutionContext {
    executionId: string;
    workflowId: string;
    organizationId: string;
    triggeredBy: string;
    triggeredAt: Date;
    triggerData: Record<string, any>;
    variables: Record<string, any>;
    state: Record<string, any>;
}
export interface ActionExecution {
    actionId: string;
    status: ExecutionStatus;
    startedAt: Date;
    completedAt?: Date;
    attempts: number;
    result?: any;
    error?: string;
    duration?: number;
}
export interface WorkflowExecution {
    id: string;
    workflowId: string;
    organizationId: string;
    status: ExecutionStatus;
    context: ExecutionContext;
    actions: ActionExecution[];
    actionsHistory?: ActionExecution[];
    startedAt: Date;
    completedAt?: Date;
    duration?: number;
    error?: string;
}
export interface WorkflowExecutionOptions {
    skipConditions?: boolean;
    dryRun?: boolean;
    variables?: Record<string, any>;
    onProgress?: (execution: WorkflowExecution) => void;
}
export declare class WorkflowEngine {
    private supabase;
    private activeExecutions;
    private actionHandlers;
    constructor();
    /**
     * Execute a workflow
     */
    executeWorkflow(workflowId: string, triggerData: Record<string, any>, triggeredBy: string, options?: WorkflowExecutionOptions): Promise<WorkflowExecution>;
    /**
     * Execute workflow actions in sequence
     */
    private executeActions;
    /**
     * Execute a single action with retry logic
     */
    private executeAction;
    /**
     * Evaluate workflow conditions
     */
    private evaluateConditions;
    /**
     * Evaluate a single condition
     */
    private evaluateCondition;
    /**
     * Resolve field value from context
     */
    private resolveFieldValue;
    /**
     * Register default action handlers
     */
    private registerDefaultActionHandlers;
    /**
     * Register custom action handler
     */
    registerActionHandler(type: ActionType, handler: ActionHandler): void;
    /**
     * Interpolate string with context variables
     */
    private interpolateString;
    /**
     * Interpolate object with context variables
     */
    private interpolateObject;
    /**
     * Get workflow definition
     */
    getWorkflow(workflowId: string): Promise<WorkflowDefinition | null>;
    /**
     * Create workflow
     */
    createWorkflow(workflow: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowDefinition>;
    /**
     * Update workflow
     */
    updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition>;
    /**
     * Delete workflow
     */
    deleteWorkflow(workflowId: string): Promise<void>;
    /**
     * List workflows
     */
    listWorkflows(organizationId: string, filters?: {
        status?: WorkflowStatus;
        triggerType?: TriggerType;
        search?: string;
    }): Promise<WorkflowDefinition[]>;
    /**
     * Get execution
     */
    getExecution(executionId: string): Promise<WorkflowExecution | null>;
    /**
     * List executions
     */
    listExecutions(workflowId: string, filters?: {
        status?: ExecutionStatus;
        limit?: number;
    }): Promise<WorkflowExecution[]>;
    /**
     * Cancel execution
     */
    cancelExecution(executionId: string): Promise<void>;
    /**
     * Persist execution to database
     */
    private persistExecution;
    /**
     * Generate execution ID
     */
    private generateExecutionId;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Map workflow from database
     */
    private mapWorkflowFromDB;
    /**
     * Map execution from database
     */
    private mapExecutionFromDB;
}
export type ActionHandler = (action: WorkflowAction, context: ExecutionContext) => Promise<any>;
//# sourceMappingURL=WorkflowEngine.d.ts.map