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
import { createClient } from '@supabase/supabase-js';
// ============================================================================
// WorkflowEngine Class
// ============================================================================
export class WorkflowEngine {
    constructor() {
        this.activeExecutions = new Map();
        this.actionHandlers = new Map();
        this.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
        this.registerDefaultActionHandlers();
    }
    // ==========================================================================
    // Workflow Execution
    // ==========================================================================
    /**
     * Execute a workflow
     */
    async executeWorkflow(workflowId, triggerData, triggeredBy, options = {}) {
        // Load workflow definition
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        if (workflow.status !== 'active') {
            throw new Error(`Workflow ${workflowId} is not active`);
        }
        // Create execution context
        const executionId = this.generateExecutionId();
        const context = {
            executionId,
            workflowId,
            organizationId: workflow.organizationId,
            triggeredBy,
            triggeredAt: new Date(),
            triggerData,
            variables: {
                ...workflow.variables,
                ...options.variables,
            },
            state: {},
        };
        // Create execution record
        const execution = {
            id: executionId,
            workflowId,
            organizationId: workflow.organizationId,
            status: 'pending',
            context,
            actions: [],
            startedAt: new Date(),
        };
        // Store execution
        this.activeExecutions.set(executionId, execution);
        try {
            // Persist execution to database
            await this.persistExecution(execution);
            // Check trigger conditions
            if (!options.skipConditions && workflow.trigger.conditions) {
                const conditionsMatch = await this.evaluateConditions(workflow.trigger.conditions, context);
                if (!conditionsMatch) {
                    execution.status = 'completed';
                    execution.completedAt = new Date();
                    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
                    await this.persistExecution(execution);
                    return execution;
                }
            }
            // Dry run mode
            if (options.dryRun) {
                execution.status = 'completed';
                execution.completedAt = new Date();
                execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
                return execution;
            }
            // Update status to running
            execution.status = 'running';
            await this.persistExecution(execution);
            // Execute actions
            await this.executeActions(workflow, execution, options);
            // Mark as completed
            execution.status = 'completed';
            execution.completedAt = new Date();
            execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
        }
        catch (error) {
            execution.status = 'failed';
            execution.error = error instanceof Error ? error.message : String(error);
            execution.completedAt = new Date();
            execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
            throw error;
        }
        finally {
            // Persist final state
            await this.persistExecution(execution);
            // Clean up
            this.activeExecutions.delete(executionId);
        }
        return execution;
    }
    /**
     * Execute workflow actions in sequence
     */
    async executeActions(workflow, execution, options) {
        const actionsToExecute = [...workflow.actions];
        const executedActions = new Set();
        while (actionsToExecute.length > 0) {
            const action = actionsToExecute.shift();
            // Skip if already executed
            if (executedActions.has(action.id)) {
                continue;
            }
            // Check conditions
            if (!options.skipConditions && action.conditions) {
                const conditionsMatch = await this.evaluateConditions(action.conditions, execution.context);
                if (!conditionsMatch) {
                    executedActions.add(action.id);
                    continue;
                }
            }
            // Execute action
            const actionExecution = await this.executeAction(action, execution);
            // Add to execution record
            execution.actions.push(actionExecution);
            // Notify progress
            if (options.onProgress) {
                options.onProgress(execution);
            }
            // Persist progress
            await this.persistExecution(execution);
            // Handle success/failure paths
            if (actionExecution.status === 'completed' && action.onSuccess) {
                // Queue next actions
                const nextActions = workflow.actions.filter(a => action.onSuccess.includes(a.id) && !executedActions.has(a.id));
                actionsToExecute.unshift(...nextActions);
            }
            else if (actionExecution.status === 'failed' && action.onFailure) {
                // Queue fallback actions
                const fallbackActions = workflow.actions.filter(a => action.onFailure.includes(a.id) && !executedActions.has(a.id));
                actionsToExecute.unshift(...fallbackActions);
            }
            executedActions.add(action.id);
        }
    }
    /**
     * Execute a single action with retry logic
     */
    async executeAction(action, execution) {
        const actionExecution = {
            actionId: action.id,
            status: 'running',
            startedAt: new Date(),
            attempts: 0,
        };
        const retryConfig = action.retryConfig || {
            maxAttempts: 3,
            delayMs: 1000,
            backoffMultiplier: 2,
            maxDelayMs: 30000,
        };
        let lastError = null;
        let delayMs = retryConfig.delayMs;
        while (actionExecution.attempts < retryConfig.maxAttempts) {
            actionExecution.attempts++;
            try {
                // Get action handler
                const handler = this.actionHandlers.get(action.type);
                if (!handler) {
                    throw new Error(`No handler registered for action type: ${action.type}`);
                }
                // Execute action
                const result = await handler(action, execution.context);
                // Success
                actionExecution.status = 'completed';
                actionExecution.result = result;
                actionExecution.completedAt = new Date();
                actionExecution.duration =
                    actionExecution.completedAt.getTime() - actionExecution.startedAt.getTime();
                return actionExecution;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Check if should retry
                if (actionExecution.attempts >= retryConfig.maxAttempts) {
                    break;
                }
                // Wait before retry
                await this.sleep(delayMs);
                // Increase delay with backoff
                if (retryConfig.backoffMultiplier) {
                    delayMs = Math.min(delayMs * retryConfig.backoffMultiplier, retryConfig.maxDelayMs || Infinity);
                }
            }
        }
        // Failed after all retries
        actionExecution.status = 'failed';
        actionExecution.error = lastError?.message || 'Unknown error';
        actionExecution.completedAt = new Date();
        actionExecution.duration =
            actionExecution.completedAt.getTime() - actionExecution.startedAt.getTime();
        return actionExecution;
    }
    // ==========================================================================
    // Condition Evaluation
    // ==========================================================================
    /**
     * Evaluate workflow conditions
     */
    async evaluateConditions(conditions, context) {
        if (conditions.length === 0) {
            return true;
        }
        const results = [];
        let currentLogicalOperator = 'AND';
        for (const condition of conditions) {
            const result = await this.evaluateCondition(condition, context);
            if (results.length === 0) {
                results.push(result);
            }
            else {
                if (currentLogicalOperator === 'AND') {
                    const prevResult = results.pop();
                    results.push(prevResult && result);
                }
                else {
                    results.push(result);
                }
            }
            currentLogicalOperator = condition.logicalOperator || 'AND';
        }
        // Combine results
        return currentLogicalOperator === 'AND'
            ? results.every(r => r)
            : results.some(r => r);
    }
    /**
     * Evaluate a single condition
     */
    async evaluateCondition(condition, context) {
        const fieldValue = this.resolveFieldValue(condition.field, context);
        const conditionValue = condition.value;
        switch (condition.operator) {
            case 'equals':
                return fieldValue === conditionValue;
            case 'not_equals':
                return fieldValue !== conditionValue;
            case 'contains':
                return String(fieldValue).includes(String(conditionValue));
            case 'not_contains':
                return !String(fieldValue).includes(String(conditionValue));
            case 'greater_than':
                return Number(fieldValue) > Number(conditionValue);
            case 'less_than':
                return Number(fieldValue) < Number(conditionValue);
            case 'in':
                return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
            case 'not_in':
                return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
            case 'matches_regex':
                const regex = new RegExp(conditionValue);
                return regex.test(String(fieldValue));
            default:
                return false;
        }
    }
    /**
     * Resolve field value from context
     */
    resolveFieldValue(field, context) {
        // Support dot notation: triggerData.documentId, variables.userId, etc.
        const parts = field.split('.');
        let value = context;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    // ==========================================================================
    // Action Handlers
    // ==========================================================================
    /**
     * Register default action handlers
     */
    registerDefaultActionHandlers() {
        // Send notification
        this.registerActionHandler('send_notification', async (action, context) => {
            const { userId, title, message, type } = action.config;
            await this.supabase.from('notifications').insert({
                user_id: userId || context.triggeredBy,
                title: this.interpolateString(title, context),
                message: this.interpolateString(message, context),
                type: type || 'info',
                organization_id: context.organizationId,
            });
            return { sent: true };
        });
        // Assign task
        this.registerActionHandler('assign_task', async (action, context) => {
            const { assigneeId, title, description, dueDate, priority } = action.config;
            const { data, error } = await this.supabase.from('tasks').insert({
                assignee_id: assigneeId,
                title: this.interpolateString(title, context),
                description: this.interpolateString(description, context),
                due_date: dueDate,
                priority: priority || 'medium',
                organization_id: context.organizationId,
                created_by: context.triggeredBy,
            }).select().single();
            if (error)
                throw error;
            return { taskId: data.id };
        });
        // Update status
        this.registerActionHandler('update_status', async (action, context) => {
            const { table, recordId, status } = action.config;
            const { error } = await this.supabase
                .from(table)
                .update({ status })
                .eq('id', recordId);
            if (error)
                throw error;
            return { updated: true };
        });
        // Send email
        this.registerActionHandler('send_email', async (action, context) => {
            const { to, subject, body, from } = action.config;
            // Call edge function for email sending
            const { data, error } = await this.supabase.functions.invoke('send-email', {
                body: {
                    to: this.interpolateString(to, context),
                    subject: this.interpolateString(subject, context),
                    body: this.interpolateString(body, context),
                    from: from || 'noreply@courtlens.com',
                },
            });
            if (error)
                throw error;
            return data;
        });
        // Webhook
        this.registerActionHandler('webhook', async (action, context) => {
            const { url, method, headers, body } = action.config;
            const response = await fetch(this.interpolateString(url, context), {
                method: method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify(this.interpolateObject(body, context)),
            });
            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.statusText}`);
            }
            return await response.json();
        });
        // API call
        this.registerActionHandler('api_call', async (action, context) => {
            const { endpoint, method, body } = action.config;
            const { data, error } = await this.supabase.functions.invoke(endpoint, {
                method: method || 'POST',
                body: this.interpolateObject(body, context),
            });
            if (error)
                throw error;
            return data;
        });
        // Run workflow
        this.registerActionHandler('run_workflow', async (action, context) => {
            const { workflowId, variables } = action.config;
            const execution = await this.executeWorkflow(workflowId, context.triggerData, context.triggeredBy, { variables });
            return { executionId: execution.id };
        });
    }
    /**
     * Register custom action handler
     */
    registerActionHandler(type, handler) {
        this.actionHandlers.set(type, handler);
    }
    /**
     * Interpolate string with context variables
     */
    interpolateString(template, context) {
        if (!template)
            return template;
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.resolveFieldValue(path.trim(), context);
            return value !== undefined ? String(value) : match;
        });
    }
    /**
     * Interpolate object with context variables
     */
    interpolateObject(obj, context) {
        if (typeof obj === 'string') {
            return this.interpolateString(obj, context);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.interpolateObject(item, context));
        }
        if (obj && typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.interpolateObject(value, context);
            }
            return result;
        }
        return obj;
    }
    // ==========================================================================
    // Workflow Management
    // ==========================================================================
    /**
     * Get workflow definition
     */
    async getWorkflow(workflowId) {
        const { data, error } = await this.supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();
        if (error || !data) {
            return null;
        }
        return this.mapWorkflowFromDB(data);
    }
    /**
     * Create workflow
     */
    async createWorkflow(workflow) {
        const { data, error } = await this.supabase
            .from('workflows')
            .insert({
            name: workflow.name,
            description: workflow.description,
            organization_id: workflow.organizationId,
            status: workflow.status,
            trigger: workflow.trigger,
            actions: workflow.actions,
            variables: workflow.variables,
            metadata: workflow.metadata,
            created_by: workflow.createdBy,
        })
            .select()
            .single();
        if (error)
            throw error;
        return this.mapWorkflowFromDB(data);
    }
    /**
     * Update workflow
     */
    async updateWorkflow(workflowId, updates) {
        const { data, error } = await this.supabase
            .from('workflows')
            .update({
            name: updates.name,
            description: updates.description,
            status: updates.status,
            trigger: updates.trigger,
            actions: updates.actions,
            variables: updates.variables,
            metadata: updates.metadata,
        })
            .eq('id', workflowId)
            .select()
            .single();
        if (error)
            throw error;
        return this.mapWorkflowFromDB(data);
    }
    /**
     * Delete workflow
     */
    async deleteWorkflow(workflowId) {
        const { error } = await this.supabase
            .from('workflows')
            .delete()
            .eq('id', workflowId);
        if (error)
            throw error;
    }
    /**
     * List workflows
     */
    async listWorkflows(organizationId, filters) {
        let query = this.supabase
            .from('workflows')
            .select('*')
            .eq('organization_id', organizationId);
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.triggerType) {
            query = query.eq('trigger->type', filters.triggerType);
        }
        if (filters?.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error)
            throw error;
        return data.map(d => this.mapWorkflowFromDB(d));
    }
    // ==========================================================================
    // Execution Management
    // ==========================================================================
    /**
     * Get execution
     */
    async getExecution(executionId) {
        const { data, error } = await this.supabase
            .from('workflow_executions')
            .select('*')
            .eq('id', executionId)
            .single();
        if (error || !data) {
            return null;
        }
        return this.mapExecutionFromDB(data);
    }
    /**
     * List executions
     */
    async listExecutions(workflowId, filters) {
        let query = this.supabase
            .from('workflow_executions')
            .select('*')
            .eq('workflow_id', workflowId);
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        const { data, error } = await query.order('started_at', { ascending: false });
        if (error)
            throw error;
        return data.map(d => this.mapExecutionFromDB(d));
    }
    /**
     * Cancel execution
     */
    async cancelExecution(executionId) {
        const execution = this.activeExecutions.get(executionId);
        if (execution) {
            execution.status = 'cancelled';
            execution.completedAt = new Date();
            execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
            await this.persistExecution(execution);
            this.activeExecutions.delete(executionId);
        }
        else {
            // Update in database
            const { error } = await this.supabase
                .from('workflow_executions')
                .update({ status: 'cancelled' })
                .eq('id', executionId);
            if (error)
                throw error;
        }
    }
    /**
     * Persist execution to database
     */
    async persistExecution(execution) {
        const { error } = await this.supabase
            .from('workflow_executions')
            .upsert({
            id: execution.id,
            workflow_id: execution.workflowId,
            organization_id: execution.organizationId,
            status: execution.status,
            context: execution.context,
            actions: execution.actions,
            started_at: execution.startedAt.toISOString(),
            completed_at: execution.completedAt?.toISOString(),
            duration: execution.duration,
            error: execution.error,
        });
        if (error)
            throw error;
    }
    // ==========================================================================
    // Utilities
    // ==========================================================================
    /**
     * Generate execution ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Map workflow from database
     */
    mapWorkflowFromDB(data) {
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            organizationId: data.organization_id,
            status: data.status,
            trigger: data.trigger,
            actions: data.actions,
            variables: data.variables,
            metadata: data.metadata,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            createdBy: data.created_by,
        };
    }
    /**
     * Map execution from database
     */
    mapExecutionFromDB(data) {
        return {
            id: data.id,
            workflowId: data.workflow_id,
            organizationId: data.organization_id,
            status: data.status,
            context: data.context,
            actions: data.actions,
            startedAt: new Date(data.started_at),
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            duration: data.duration,
            error: data.error,
        };
    }
}
//# sourceMappingURL=WorkflowEngine.js.map