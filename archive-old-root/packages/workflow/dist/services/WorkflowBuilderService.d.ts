/**
 * WorkflowBuilderService - Visual workflow builder and validator
 *
 * Provides tools for creating, editing, and validating workflows with
 * drag-drop support, templates, and visual design capabilities.
 *
 * Features:
 * - Workflow templates
 * - Visual node-based design
 * - Validation and error checking
 * - Import/export workflows
 * - Version management
 * - Testing and simulation
 *
 * @module WorkflowBuilderService
 */
import type { WorkflowDefinition, WorkflowAction, WorkflowTrigger } from './WorkflowEngine';
export interface WorkflowNode {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'branch';
    position: {
        x: number;
        y: number;
    };
    data: any;
    connections: string[];
}
export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
    variables?: Record<string, any>;
    tags?: string[];
}
export interface ValidationError {
    type: 'error' | 'warning';
    field: string;
    message: string;
    nodeId?: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}
export interface WorkflowTestResult {
    success: boolean;
    executionId?: string;
    duration: number;
    steps: {
        actionId: string;
        success: boolean;
        duration: number;
        error?: string;
    }[];
}
export declare class WorkflowBuilderService {
    private templates;
    constructor();
    /**
     * Register default workflow templates
     */
    private registerDefaultTemplates;
    /**
     * Register a workflow template
     */
    registerTemplate(template: WorkflowTemplate): void;
    /**
     * Get workflow template
     */
    getTemplate(templateId: string): WorkflowTemplate | undefined;
    /**
     * List workflow templates
     */
    listTemplates(category?: string): WorkflowTemplate[];
    /**
     * Create workflow from template
     */
    createFromTemplate(templateId: string, customization?: {
        name?: string;
        description?: string;
        variables?: Record<string, any>;
    }): Partial<WorkflowDefinition>;
    /**
     * Validate workflow definition
     */
    validateWorkflow(workflow: Partial<WorkflowDefinition>): ValidationResult;
    /**
     * Validate trigger configuration
     */
    private validateTrigger;
    /**
     * Validate action configuration
     */
    private validateAction;
    /**
     * Validate condition
     */
    private validateCondition;
    /**
     * Check for circular references in action flow
     */
    private checkCircularReferences;
    /**
     * Find orphaned actions (not reachable from any path)
     */
    private findOrphanedActions;
    /**
     * Test workflow with sample data
     */
    testWorkflow(workflow: Partial<WorkflowDefinition>, testData: Record<string, any>): Promise<WorkflowTestResult>;
    /**
     * Simulate action execution (for testing)
     */
    private simulateAction;
    /**
     * Export workflow to JSON
     */
    exportWorkflow(workflow: WorkflowDefinition): string;
    /**
     * Import workflow from JSON
     */
    importWorkflow(json: string): Partial<WorkflowDefinition>;
    /**
     * Clone workflow
     */
    cloneWorkflow(workflow: WorkflowDefinition, customization?: {
        name?: string;
        description?: string;
    }): Partial<WorkflowDefinition>;
    /**
     * Convert workflow to nodes (for visual builder)
     */
    workflowToNodes(workflow: WorkflowDefinition): WorkflowNode[];
    /**
     * Convert nodes to workflow (from visual builder)
     */
    nodesToWorkflow(nodes: WorkflowNode[], baseWorkflow: Partial<WorkflowDefinition>): Partial<WorkflowDefinition>;
}
//# sourceMappingURL=WorkflowBuilderService.d.ts.map