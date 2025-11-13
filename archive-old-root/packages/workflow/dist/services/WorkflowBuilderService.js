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
// ============================================================================
// WorkflowBuilderService Class
// ============================================================================
export class WorkflowBuilderService {
    constructor() {
        this.templates = new Map();
        this.registerDefaultTemplates();
    }
    // ==========================================================================
    // Templates
    // ==========================================================================
    /**
     * Register default workflow templates
     */
    registerDefaultTemplates() {
        // Document upload notification
        this.registerTemplate({
            id: 'document-upload-notification',
            name: 'Document Upload Notification',
            description: 'Notify team members when a new document is uploaded',
            category: 'documents',
            tags: ['notification', 'documents'],
            trigger: {
                id: 'trigger-1',
                type: 'document_upload',
                config: {
                    documentTypes: ['contract', 'pleading', 'brief'],
                },
            },
            actions: [
                {
                    id: 'action-1',
                    type: 'send_notification',
                    config: {
                        title: 'New Document Uploaded',
                        message: 'Document "{{triggerData.documentName}}" has been uploaded to {{triggerData.caseName}}',
                        type: 'info',
                    },
                },
                {
                    id: 'action-2',
                    type: 'send_email',
                    config: {
                        to: '{{variables.teamEmail}}',
                        subject: 'New Document: {{triggerData.documentName}}',
                        body: 'A new document has been uploaded and requires your review.',
                    },
                },
            ],
        });
        // Case status change workflow
        this.registerTemplate({
            id: 'case-status-workflow',
            name: 'Case Status Change Workflow',
            description: 'Automatic actions when case status changes',
            category: 'cases',
            tags: ['automation', 'cases'],
            trigger: {
                id: 'trigger-1',
                type: 'case_status_change',
                config: {
                    statuses: ['filed', 'in_progress', 'closed'],
                },
            },
            actions: [
                {
                    id: 'action-1',
                    type: 'send_notification',
                    config: {
                        title: 'Case Status Updated',
                        message: 'Case {{triggerData.caseName}} status changed to {{triggerData.newStatus}}',
                        type: 'info',
                    },
                    conditions: [
                        {
                            id: 'cond-1',
                            field: 'triggerData.newStatus',
                            operator: 'in',
                            value: ['filed', 'in_progress'],
                        },
                    ],
                },
                {
                    id: 'action-2',
                    type: 'assign_task',
                    config: {
                        assigneeId: '{{variables.responsibleAttorney}}',
                        title: 'Review Closed Case',
                        description: 'Case {{triggerData.caseName}} has been closed. Please review.',
                        priority: 'high',
                    },
                    conditions: [
                        {
                            id: 'cond-2',
                            field: 'triggerData.newStatus',
                            operator: 'equals',
                            value: 'closed',
                        },
                    ],
                },
            ],
        });
        // Daily task assignment
        this.registerTemplate({
            id: 'daily-task-assignment',
            name: 'Daily Task Assignment',
            description: 'Automatically assign tasks based on schedule',
            category: 'tasks',
            tags: ['automation', 'scheduling', 'tasks'],
            trigger: {
                id: 'trigger-1',
                type: 'date_time',
                config: {
                    schedule: 'daily',
                    time: '09:00',
                    timezone: 'America/New_York',
                },
            },
            actions: [
                {
                    id: 'action-1',
                    type: 'assign_task',
                    config: {
                        assigneeId: '{{variables.assigneeId}}',
                        title: 'Daily Review',
                        description: 'Complete your daily case review',
                        priority: 'medium',
                        dueDate: '{{variables.today}}',
                    },
                },
            ],
        });
        // Contract review workflow
        this.registerTemplate({
            id: 'contract-review-workflow',
            name: 'Contract Review Workflow',
            description: 'Automated contract review and approval process',
            category: 'documents',
            tags: ['contracts', 'review', 'approval'],
            trigger: {
                id: 'trigger-1',
                type: 'document_upload',
                config: {
                    documentTypes: ['contract'],
                },
            },
            actions: [
                {
                    id: 'action-1',
                    type: 'assign_task',
                    config: {
                        assigneeId: '{{variables.juniorAttorney}}',
                        title: 'Initial Contract Review',
                        description: 'Review contract: {{triggerData.documentName}}',
                        priority: 'high',
                    },
                },
                {
                    id: 'action-2',
                    type: 'send_notification',
                    config: {
                        userId: '{{variables.seniorAttorney}}',
                        title: 'Contract Pending Review',
                        message: 'New contract awaiting initial review',
                        type: 'info',
                    },
                },
                {
                    id: 'action-3',
                    type: 'assign_task',
                    config: {
                        assigneeId: '{{variables.seniorAttorney}}',
                        title: 'Final Contract Approval',
                        description: 'Approve contract after junior review',
                        priority: 'high',
                    },
                    onSuccess: ['action-4'],
                },
                {
                    id: 'action-4',
                    type: 'update_status',
                    config: {
                        table: 'documents',
                        recordId: '{{triggerData.documentId}}',
                        status: 'approved',
                    },
                },
            ],
        });
        // Deadline reminder workflow
        this.registerTemplate({
            id: 'deadline-reminder-workflow',
            name: 'Deadline Reminder Workflow',
            description: 'Send reminders for upcoming deadlines',
            category: 'tasks',
            tags: ['reminders', 'deadlines'],
            trigger: {
                id: 'trigger-1',
                type: 'date_time',
                config: {
                    schedule: 'daily',
                    time: '08:00',
                },
            },
            actions: [
                {
                    id: 'action-1',
                    type: 'api_call',
                    config: {
                        endpoint: 'get-upcoming-deadlines',
                        method: 'GET',
                    },
                },
                {
                    id: 'action-2',
                    type: 'send_notification',
                    config: {
                        title: 'Upcoming Deadlines',
                        message: 'You have {{state.deadlineCount}} deadlines in the next 7 days',
                        type: 'warning',
                    },
                    conditions: [
                        {
                            id: 'cond-1',
                            field: 'state.deadlineCount',
                            operator: 'greater_than',
                            value: 0,
                        },
                    ],
                },
            ],
        });
    }
    /**
     * Register a workflow template
     */
    registerTemplate(template) {
        this.templates.set(template.id, template);
    }
    /**
     * Get workflow template
     */
    getTemplate(templateId) {
        return this.templates.get(templateId);
    }
    /**
     * List workflow templates
     */
    listTemplates(category) {
        const templates = Array.from(this.templates.values());
        if (category) {
            return templates.filter(t => t.category === category);
        }
        return templates;
    }
    /**
     * Create workflow from template
     */
    createFromTemplate(templateId, customization) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        return {
            name: customization?.name || template.name,
            description: customization?.description || template.description,
            trigger: JSON.parse(JSON.stringify(template.trigger)),
            actions: JSON.parse(JSON.stringify(template.actions)),
            variables: {
                ...template.variables,
                ...customization?.variables,
            },
            metadata: {
                templateId,
                templateName: template.name,
            },
        };
    }
    // ==========================================================================
    // Workflow Validation
    // ==========================================================================
    /**
     * Validate workflow definition
     */
    validateWorkflow(workflow) {
        const errors = [];
        const warnings = [];
        // Validate basic fields
        if (!workflow.name || workflow.name.trim() === '') {
            errors.push({
                type: 'error',
                field: 'name',
                message: 'Workflow name is required',
            });
        }
        if (!workflow.organizationId) {
            errors.push({
                type: 'error',
                field: 'organizationId',
                message: 'Organization ID is required',
            });
        }
        if (!workflow.createdBy) {
            errors.push({
                type: 'error',
                field: 'createdBy',
                message: 'Creator ID is required',
            });
        }
        // Validate trigger
        if (!workflow.trigger) {
            errors.push({
                type: 'error',
                field: 'trigger',
                message: 'Workflow must have a trigger',
            });
        }
        else {
            const triggerValidation = this.validateTrigger(workflow.trigger);
            errors.push(...triggerValidation.errors);
            warnings.push(...triggerValidation.warnings);
        }
        // Validate actions
        if (!workflow.actions || workflow.actions.length === 0) {
            errors.push({
                type: 'error',
                field: 'actions',
                message: 'Workflow must have at least one action',
            });
        }
        else {
            workflow.actions.forEach((action, index) => {
                const actionValidation = this.validateAction(action);
                errors.push(...actionValidation.errors.map(e => ({
                    ...e,
                    nodeId: action.id,
                    field: `actions[${index}].${e.field}`,
                })));
                warnings.push(...actionValidation.warnings.map(w => ({
                    ...w,
                    nodeId: action.id,
                    field: `actions[${index}].${w.field}`,
                })));
            });
            // Check for circular references
            const circularCheck = this.checkCircularReferences(workflow.actions);
            if (circularCheck) {
                errors.push({
                    type: 'error',
                    field: 'actions',
                    message: `Circular reference detected: ${circularCheck}`,
                });
            }
            // Check for orphaned actions
            const orphanedActions = this.findOrphanedActions(workflow.actions);
            if (orphanedActions.length > 0) {
                warnings.push({
                    type: 'warning',
                    field: 'actions',
                    message: `Orphaned actions found: ${orphanedActions.join(', ')}`,
                });
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate trigger configuration
     */
    validateTrigger(trigger) {
        const errors = [];
        const warnings = [];
        if (!trigger.type) {
            errors.push({
                type: 'error',
                field: 'type',
                message: 'Trigger type is required',
            });
        }
        // Type-specific validation
        switch (trigger.type) {
            case 'date_time':
                if (!trigger.config?.schedule && !trigger.config?.cron) {
                    errors.push({
                        type: 'error',
                        field: 'config',
                        message: 'Date/time trigger requires schedule or cron expression',
                    });
                }
                break;
            case 'webhook':
                if (!trigger.config?.webhookUrl) {
                    warnings.push({
                        type: 'warning',
                        field: 'config',
                        message: 'Webhook URL will be generated automatically',
                    });
                }
                break;
        }
        // Validate conditions
        if (trigger.conditions) {
            trigger.conditions.forEach((condition, index) => {
                const conditionValidation = this.validateCondition(condition);
                errors.push(...conditionValidation.errors.map(e => ({
                    ...e,
                    field: `conditions[${index}].${e.field}`,
                })));
            });
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Validate action configuration
     */
    validateAction(action) {
        const errors = [];
        const warnings = [];
        if (!action.id) {
            errors.push({
                type: 'error',
                field: 'id',
                message: 'Action ID is required',
            });
        }
        if (!action.type) {
            errors.push({
                type: 'error',
                field: 'type',
                message: 'Action type is required',
            });
        }
        // Type-specific validation
        switch (action.type) {
            case 'send_notification':
                if (!action.config?.title) {
                    errors.push({
                        type: 'error',
                        field: 'config.title',
                        message: 'Notification title is required',
                    });
                }
                if (!action.config?.message) {
                    errors.push({
                        type: 'error',
                        field: 'config.message',
                        message: 'Notification message is required',
                    });
                }
                break;
            case 'assign_task':
                if (!action.config?.assigneeId) {
                    errors.push({
                        type: 'error',
                        field: 'config.assigneeId',
                        message: 'Task assignee is required',
                    });
                }
                if (!action.config?.title) {
                    errors.push({
                        type: 'error',
                        field: 'config.title',
                        message: 'Task title is required',
                    });
                }
                break;
            case 'send_email':
                if (!action.config?.to) {
                    errors.push({
                        type: 'error',
                        field: 'config.to',
                        message: 'Email recipient is required',
                    });
                }
                if (!action.config?.subject) {
                    errors.push({
                        type: 'error',
                        field: 'config.subject',
                        message: 'Email subject is required',
                    });
                }
                break;
            case 'webhook':
                if (!action.config?.url) {
                    errors.push({
                        type: 'error',
                        field: 'config.url',
                        message: 'Webhook URL is required',
                    });
                }
                break;
            case 'update_status':
                if (!action.config?.table) {
                    errors.push({
                        type: 'error',
                        field: 'config.table',
                        message: 'Table name is required',
                    });
                }
                if (!action.config?.recordId) {
                    errors.push({
                        type: 'error',
                        field: 'config.recordId',
                        message: 'Record ID is required',
                    });
                }
                if (!action.config?.status) {
                    errors.push({
                        type: 'error',
                        field: 'config.status',
                        message: 'Status value is required',
                    });
                }
                break;
        }
        // Validate conditions
        if (action.conditions) {
            action.conditions.forEach((condition, index) => {
                const conditionValidation = this.validateCondition(condition);
                errors.push(...conditionValidation.errors.map(e => ({
                    ...e,
                    field: `conditions[${index}].${e.field}`,
                })));
            });
        }
        // Validate retry config
        if (action.retryConfig) {
            if (action.retryConfig.maxAttempts < 1) {
                errors.push({
                    type: 'error',
                    field: 'retryConfig.maxAttempts',
                    message: 'Max attempts must be at least 1',
                });
            }
            if (action.retryConfig.delayMs < 0) {
                errors.push({
                    type: 'error',
                    field: 'retryConfig.delayMs',
                    message: 'Delay must be non-negative',
                });
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Validate condition
     */
    validateCondition(condition) {
        const errors = [];
        const warnings = [];
        if (!condition.field) {
            errors.push({
                type: 'error',
                field: 'field',
                message: 'Condition field is required',
            });
        }
        if (!condition.operator) {
            errors.push({
                type: 'error',
                field: 'operator',
                message: 'Condition operator is required',
            });
        }
        if (condition.value === undefined || condition.value === null) {
            warnings.push({
                type: 'warning',
                field: 'value',
                message: 'Condition value is not set',
            });
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Check for circular references in action flow
     */
    checkCircularReferences(actions) {
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (actionId, path) => {
            if (recursionStack.has(actionId)) {
                return [...path, actionId].join(' → ');
            }
            if (visited.has(actionId)) {
                return null;
            }
            visited.add(actionId);
            recursionStack.add(actionId);
            const action = actions.find(a => a.id === actionId);
            if (action) {
                const nextActions = [
                    ...(action.onSuccess || []),
                    ...(action.onFailure || []),
                ];
                for (const nextId of nextActions) {
                    const cycle = dfs(nextId, [...path, actionId]);
                    if (cycle)
                        return cycle;
                }
            }
            recursionStack.delete(actionId);
            return null;
        };
        for (const action of actions) {
            const cycle = dfs(action.id, []);
            if (cycle)
                return cycle;
        }
        return null;
    }
    /**
     * Find orphaned actions (not reachable from any path)
     */
    findOrphanedActions(actions) {
        const reachable = new Set();
        // First action is always reachable
        if (actions.length > 0) {
            reachable.add(actions[0].id);
        }
        const dfs = (actionId) => {
            const action = actions.find(a => a.id === actionId);
            if (!action)
                return;
            const nextActions = [
                ...(action.onSuccess || []),
                ...(action.onFailure || []),
            ];
            for (const nextId of nextActions) {
                if (!reachable.has(nextId)) {
                    reachable.add(nextId);
                    dfs(nextId);
                }
            }
        };
        if (actions.length > 0) {
            dfs(actions[0].id);
        }
        return actions
            .filter(a => !reachable.has(a.id))
            .map(a => a.id);
    }
    // ==========================================================================
    // Workflow Testing
    // ==========================================================================
    /**
     * Test workflow with sample data
     */
    async testWorkflow(workflow, testData) {
        const startTime = Date.now();
        const steps = [];
        try {
            // Validate first
            const validation = this.validateWorkflow(workflow);
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors[0].message}`);
            }
            // Simulate execution
            if (workflow.actions) {
                for (const action of workflow.actions) {
                    const stepStartTime = Date.now();
                    try {
                        // Simulate action execution
                        await this.simulateAction(action, testData);
                        steps.push({
                            actionId: action.id,
                            success: true,
                            duration: Date.now() - stepStartTime,
                        });
                    }
                    catch (error) {
                        steps.push({
                            actionId: action.id,
                            success: false,
                            duration: Date.now() - stepStartTime,
                            error: error instanceof Error ? error.message : String(error),
                        });
                        throw error;
                    }
                }
            }
            return {
                success: true,
                duration: Date.now() - startTime,
                steps,
            };
        }
        catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                steps,
            };
        }
    }
    /**
     * Simulate action execution (for testing)
     */
    async simulateAction(action, testData) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        // Validate required fields
        switch (action.type) {
            case 'send_notification':
                if (!action.config?.title || !action.config?.message) {
                    throw new Error('Missing required notification fields');
                }
                break;
            case 'assign_task':
                if (!action.config?.assigneeId || !action.config?.title) {
                    throw new Error('Missing required task fields');
                }
                break;
            case 'send_email':
                if (!action.config?.to || !action.config?.subject) {
                    throw new Error('Missing required email fields');
                }
                break;
        }
    }
    // ==========================================================================
    // Import/Export
    // ==========================================================================
    /**
     * Export workflow to JSON
     */
    exportWorkflow(workflow) {
        return JSON.stringify(workflow, null, 2);
    }
    /**
     * Import workflow from JSON
     */
    importWorkflow(json) {
        const workflow = JSON.parse(json);
        // Remove ID to create a new workflow
        delete workflow.id;
        delete workflow.createdAt;
        delete workflow.updatedAt;
        return workflow;
    }
    /**
     * Clone workflow
     */
    cloneWorkflow(workflow, customization) {
        const cloned = JSON.parse(JSON.stringify(workflow));
        delete cloned.id;
        delete cloned.createdAt;
        delete cloned.updatedAt;
        if (customization?.name) {
            cloned.name = customization.name;
        }
        else {
            cloned.name = `${workflow.name} (Copy)`;
        }
        if (customization?.description) {
            cloned.description = customization.description;
        }
        return cloned;
    }
    // ==========================================================================
    // Node Management (for visual builder)
    // ==========================================================================
    /**
     * Convert workflow to nodes (for visual builder)
     */
    workflowToNodes(workflow) {
        const nodes = [];
        // Add trigger node
        nodes.push({
            id: workflow.trigger.id,
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: workflow.trigger,
            connections: workflow.actions.length > 0 ? [workflow.actions[0].id] : [],
        });
        // Add action nodes
        workflow.actions.forEach((action, index) => {
            const connections = [
                ...(action.onSuccess || []),
                ...(action.onFailure || []),
            ];
            nodes.push({
                id: action.id,
                type: 'action',
                position: { x: 100 + index * 250, y: 300 },
                data: action,
                connections,
            });
        });
        return nodes;
    }
    /**
     * Convert nodes to workflow (from visual builder)
     */
    nodesToWorkflow(nodes, baseWorkflow) {
        const triggerNode = nodes.find(n => n.type === 'trigger');
        const actionNodes = nodes.filter(n => n.type === 'action');
        if (!triggerNode) {
            throw new Error('Workflow must have a trigger node');
        }
        return {
            ...baseWorkflow,
            trigger: triggerNode.data,
            actions: actionNodes.map(node => node.data),
        };
    }
}
//# sourceMappingURL=WorkflowBuilderService.js.map