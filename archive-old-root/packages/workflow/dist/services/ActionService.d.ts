/**
 * ActionService - Workflow action execution and management
 *
 * Provides action handlers, action templates, and utilities for
 * executing workflow actions.
 *
 * Features:
 * - Built-in action handlers
 * - Custom action registration
 * - Action templates
 * - Action validation
 * - Batch action execution
 * - Action result tracking
 *
 * @module ActionService
 */
import type { WorkflowAction, ExecutionContext, ActionType } from './WorkflowEngine';
export interface ActionTemplate {
    id: string;
    type: ActionType;
    name: string;
    description: string;
    category: string;
    defaultConfig: Record<string, any>;
    configSchema: ActionConfigField[];
}
export interface ActionConfigField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json';
    required: boolean;
    default?: any;
    options?: {
        label: string;
        value: any;
    }[];
    placeholder?: string;
    helpText?: string;
}
export interface ActionResult {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
}
export declare class ActionService {
    private supabase;
    private templates;
    constructor();
    /**
     * Register default action templates
     */
    private registerDefaultTemplates;
    /**
     * Register action template
     */
    registerTemplate(template: ActionTemplate): void;
    /**
     * Get action template
     */
    getTemplate(templateId: string): ActionTemplate | undefined;
    /**
     * List action templates
     */
    listTemplates(category?: string): ActionTemplate[];
    /**
     * Get template categories
     */
    getCategories(): string[];
    /**
     * Create action from template
     */
    createFromTemplate(templateId: string, config?: Record<string, any>): Partial<WorkflowAction>;
    /**
     * Generate action ID
     */
    private generateActionId;
    /**
     * Validate action configuration
     */
    validateActionConfig(action: WorkflowAction, context?: ExecutionContext): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Execute multiple actions in sequence
     */
    executeBatch(actions: WorkflowAction[], context: ExecutionContext, actionHandler: (action: WorkflowAction) => Promise<any>): Promise<ActionResult[]>;
    /**
     * Execute multiple actions in parallel
     */
    executeParallel(actions: WorkflowAction[], context: ExecutionContext, actionHandler: (action: WorkflowAction) => Promise<any>): Promise<ActionResult[]>;
    /**
     * Get action display name
     */
    getActionDisplayName(action: WorkflowAction): string;
    /**
     * Get action icon
     */
    getActionIcon(action: WorkflowAction): string;
    /**
     * Get action category
     */
    getActionCategory(action: WorkflowAction): string;
}
//# sourceMappingURL=ActionService.d.ts.map