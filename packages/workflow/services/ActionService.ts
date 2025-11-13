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

import { createClient } from '@supabase/supabase-js';
import type { WorkflowAction, ExecutionContext, ActionType } from './WorkflowEngine';

// ============================================================================
// Types & Interfaces
// ============================================================================

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
  options?: { label: string; value: any }[];
  placeholder?: string;
  helpText?: string;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

// ============================================================================
// ActionService Class
// ============================================================================

export class ActionService {
  private supabase;
  private templates: Map<string, ActionTemplate> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    this.registerDefaultTemplates();
  }

  // ==========================================================================
  // Action Templates
  // ==========================================================================

  /**
   * Register default action templates
   */
  private registerDefaultTemplates(): void {
    // Send Notification
    this.registerTemplate({
      id: 'send-notification',
      type: 'send_notification',
      name: 'Send Notification',
      description: 'Send in-app notification to users',
      category: 'communication',
      defaultConfig: {
        type: 'info',
      },
      configSchema: [
        {
          name: 'userId',
          label: 'User ID',
          type: 'text',
          required: false,
          placeholder: '{{triggerData.userId}}',
          helpText: 'Leave empty to notify triggered user',
        },
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: 'Notification Title',
        },
        {
          name: 'message',
          label: 'Message',
          type: 'text',
          required: true,
          placeholder: 'Notification message',
        },
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          default: 'info',
          options: [
            { label: 'Info', value: 'info' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Error', value: 'error' },
          ],
        },
      ],
    });

    // Assign Task
    this.registerTemplate({
      id: 'assign-task',
      type: 'assign_task',
      name: 'Assign Task',
      description: 'Create and assign a task to a user',
      category: 'tasks',
      defaultConfig: {
        priority: 'medium',
      },
      configSchema: [
        {
          name: 'assigneeId',
          label: 'Assignee',
          type: 'text',
          required: true,
          placeholder: '{{variables.userId}}',
          helpText: 'User ID to assign task to',
        },
        {
          name: 'title',
          label: 'Task Title',
          type: 'text',
          required: true,
          placeholder: 'Task title',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'text',
          required: false,
          placeholder: 'Task description',
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          required: true,
          default: 'medium',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ],
        },
        {
          name: 'dueDate',
          label: 'Due Date',
          type: 'text',
          required: false,
          placeholder: '2024-12-31',
          helpText: 'ISO date string',
        },
      ],
    });

    // Update Status
    this.registerTemplate({
      id: 'update-status',
      type: 'update_status',
      name: 'Update Status',
      description: 'Update record status in database',
      category: 'data',
      defaultConfig: {},
      configSchema: [
        {
          name: 'table',
          label: 'Table Name',
          type: 'select',
          required: true,
          options: [
            { label: 'Documents', value: 'documents' },
            { label: 'Cases', value: 'cases' },
            { label: 'Tasks', value: 'tasks' },
            { label: 'Matters', value: 'matters' },
          ],
        },
        {
          name: 'recordId',
          label: 'Record ID',
          type: 'text',
          required: true,
          placeholder: '{{triggerData.documentId}}',
        },
        {
          name: 'status',
          label: 'New Status',
          type: 'text',
          required: true,
          placeholder: 'approved',
        },
      ],
    });

    // Send Email
    this.registerTemplate({
      id: 'send-email',
      type: 'send_email',
      name: 'Send Email',
      description: 'Send email to recipients',
      category: 'communication',
      defaultConfig: {},
      configSchema: [
        {
          name: 'to',
          label: 'To',
          type: 'text',
          required: true,
          placeholder: 'user@example.com',
          helpText: 'Email address or variable',
        },
        {
          name: 'subject',
          label: 'Subject',
          type: 'text',
          required: true,
          placeholder: 'Email subject',
        },
        {
          name: 'body',
          label: 'Body',
          type: 'text',
          required: true,
          placeholder: 'Email body content',
        },
        {
          name: 'from',
          label: 'From',
          type: 'text',
          required: false,
          placeholder: 'noreply@courtlens.com',
          helpText: 'Leave empty for default',
        },
      ],
    });

    // Webhook
    this.registerTemplate({
      id: 'webhook',
      type: 'webhook',
      name: 'Send Webhook',
      description: 'Send HTTP request to external service',
      category: 'integrations',
      defaultConfig: {
        method: 'POST',
      },
      configSchema: [
        {
          name: 'url',
          label: 'Webhook URL',
          type: 'text',
          required: true,
          placeholder: 'https://api.example.com/webhook',
        },
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          default: 'POST',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        {
          name: 'headers',
          label: 'Headers',
          type: 'json',
          required: false,
          placeholder: '{"Authorization": "Bearer token"}',
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'json',
          required: false,
          placeholder: '{"data": "{{triggerData}}"}',
        },
      ],
    });

    // API Call
    this.registerTemplate({
      id: 'api-call',
      type: 'api_call',
      name: 'Call API',
      description: 'Call internal API endpoint',
      category: 'integrations',
      defaultConfig: {
        method: 'POST',
      },
      configSchema: [
        {
          name: 'endpoint',
          label: 'Endpoint Name',
          type: 'text',
          required: true,
          placeholder: 'process-document',
          helpText: 'Supabase Edge Function name',
        },
        {
          name: 'method',
          label: 'HTTP Method',
          type: 'select',
          required: true,
          default: 'POST',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        {
          name: 'body',
          label: 'Request Body',
          type: 'json',
          required: false,
          placeholder: '{"documentId": "{{triggerData.documentId}}"}',
        },
      ],
    });

    // Create Document
    this.registerTemplate({
      id: 'create-document',
      type: 'create_document',
      name: 'Create Document',
      description: 'Generate document from template',
      category: 'documents',
      defaultConfig: {},
      configSchema: [
        {
          name: 'templateId',
          label: 'Template',
          type: 'text',
          required: true,
          placeholder: 'contract-template-id',
        },
        {
          name: 'caseId',
          label: 'Case ID',
          type: 'text',
          required: true,
          placeholder: '{{triggerData.caseId}}',
        },
        {
          name: 'variables',
          label: 'Template Variables',
          type: 'json',
          required: false,
          placeholder: '{"clientName": "{{variables.clientName}}"}',
        },
      ],
    });

    // Run Workflow
    this.registerTemplate({
      id: 'run-workflow',
      type: 'run_workflow',
      name: 'Run Workflow',
      description: 'Trigger another workflow',
      category: 'workflow',
      defaultConfig: {},
      configSchema: [
        {
          name: 'workflowId',
          label: 'Workflow ID',
          type: 'text',
          required: true,
          placeholder: 'workflow-id',
        },
        {
          name: 'variables',
          label: 'Variables',
          type: 'json',
          required: false,
          placeholder: '{"data": "{{triggerData}}"}',
        },
      ],
    });
  }

  /**
   * Register action template
   */
  registerTemplate(template: ActionTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get action template
   */
  getTemplate(templateId: string): ActionTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List action templates
   */
  listTemplates(category?: string): ActionTemplate[] {
    const templates = Array.from(this.templates.values());

    if (category) {
      return templates.filter(t => t.category === category);
    }

    return templates;
  }

  /**
   * Get template categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    const templateValues = Array.from(this.templates.values());
    for (const template of templateValues) {
      categories.add(template.category);
    }
    return Array.from(categories).sort();
  }

  // ==========================================================================
  // Action Creation
  // ==========================================================================

  /**
   * Create action from template
   */
  createFromTemplate(
    templateId: string,
    config?: Record<string, any>
  ): Partial<WorkflowAction> {
    const template = this.getTemplate(templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      id: this.generateActionId(),
      type: template.type,
      config: {
        ...template.defaultConfig,
        ...config,
      },
      retryConfig: {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 30000,
      },
    };
  }

  /**
   * Generate action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // ==========================================================================
  // Action Validation
  // ==========================================================================

  /**
   * Validate action configuration
   */
  validateActionConfig(
    action: WorkflowAction,
    context?: ExecutionContext
  ): { valid: boolean; errors: string[] } {
    const template = Array.from(this.templates.values()).find(
      t => t.type === action.type
    );

    if (!template) {
      return {
        valid: false,
        errors: [`Unknown action type: ${action.type}`],
      };
    }

    const errors: string[] = [];

    // Validate required fields
    for (const field of template.configSchema) {
      if (field.required && !action.config[field.name]) {
        errors.push(`${field.label} is required`);
      }

      // Type validation
      if (action.config[field.name] !== undefined) {
        const value = action.config[field.name];

        switch (field.type) {
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push(`${field.label} must be a number`);
            }
            break;

          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`${field.label} must be a boolean`);
            }
            break;

          case 'json':
            if (typeof value === 'string') {
              try {
                JSON.parse(value);
              } catch {
                errors.push(`${field.label} must be valid JSON`);
              }
            } else if (typeof value !== 'object') {
              errors.push(`${field.label} must be an object or JSON string`);
            }
            break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ==========================================================================
  // Batch Actions
  // ==========================================================================

  /**
   * Execute multiple actions in sequence
   */
  async executeBatch(
    actions: WorkflowAction[],
    context: ExecutionContext,
    actionHandler: (action: WorkflowAction) => Promise<any>
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      const startTime = Date.now();

      try {
        const data = await actionHandler(action);
        
        results.push({
          success: true,
          data,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });

        // Stop on first error unless configured otherwise
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple actions in parallel
   */
  async executeParallel(
    actions: WorkflowAction[],
    context: ExecutionContext,
    actionHandler: (action: WorkflowAction) => Promise<any>
  ): Promise<ActionResult[]> {
    const promises = actions.map(async action => {
      const startTime = Date.now();

      try {
        const data = await actionHandler(action);
        
        return {
          success: true,
          data,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        };
      }
    });

    return await Promise.all(promises);
  }

  // ==========================================================================
  // Action Utilities
  // ==========================================================================

  /**
   * Get action display name
   */
  getActionDisplayName(action: WorkflowAction): string {
    const template = Array.from(this.templates.values()).find(
      t => t.type === action.type
    );

    if (template) {
      return template.name;
    }

    // Fallback to type name formatted
    return action.type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get action icon
   */
  getActionIcon(action: WorkflowAction): string {
    const icons: Record<ActionType, string> = {
      send_notification: '🔔',
      assign_task: '📋',
      update_status: '🔄',
      create_document: '📄',
      send_email: '📧',
      webhook: '🔗',
      api_call: '🌐',
      run_workflow: '⚙️',
    };

    return icons[action.type] || '⚡';
  }

  /**
   * Get action category
   */
  getActionCategory(action: WorkflowAction): string {
    const template = Array.from(this.templates.values()).find(
      t => t.type === action.type
    );

    return template?.category || 'other';
  }
}
