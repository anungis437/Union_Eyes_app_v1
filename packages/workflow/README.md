# Workflow Automation System

Complete workflow automation system for Court Lens with visual builder, triggers, actions, and execution monitoring.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Workflow Engine](#workflow-engine)
- [Triggers](#triggers)
- [Actions](#actions)
- [Workflow Builder](#workflow-builder)
- [React Components](#react-components)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

The Workflow Automation System enables users to create sophisticated automated workflows that respond to events, execute actions, and manage complex business logic without code.

### Key Capabilities

- **Event-Driven Triggers**: Respond to document uploads, status changes, schedules, webhooks, and API calls
- **Visual Workflow Builder**: Drag-and-drop interface for creating workflows with branching logic
- **Action Templates**: Pre-built actions for notifications, tasks, emails, integrations, and more
- **Conditional Execution**: Execute actions based on complex conditions and data
- **Retry & Error Handling**: Automatic retries with exponential backoff and error recovery
- **Real-Time Monitoring**: Track workflow execution progress and debug issues
- **State Management**: Persist execution state and maintain audit trails

## Features

### Triggers (7 Types)

1. **Manual** - User or API initiated
2. **Document Upload** - Triggered when documents are uploaded
3. **Document Status Change** - Triggered on document status transitions
4. **Case Status Change** - Triggered on case status transitions
5. **Date/Time** - Scheduled execution (cron or interval)
6. **Webhook** - External system webhooks with signature verification
7. **API** - Direct API trigger with authentication

### Actions (8 Types)

1. **Send Notification** - Push notifications to users
2. **Assign Task** - Create and assign tasks
3. **Update Status** - Update document or case status
4. **Create Document** - Generate documents from templates
5. **Send Email** - Email notifications with templates
6. **Webhook** - Call external webhooks
7. **API Call** - Make HTTP API requests
8. **Run Workflow** - Execute sub-workflows

### Execution Features

- ✅ Conditional branching (9 operators)
- ✅ Parallel action execution
- ✅ Sequential action chains
- ✅ Retry logic with exponential backoff
- ✅ Error handling and fallback actions
- ✅ Execution context and variables
- ✅ Progress tracking and monitoring
- ✅ Execution history and audit trail

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Engine                          │
│  - Execution orchestration                                  │
│  - State management                                         │
│  - Condition evaluation                                     │
│  - Action handlers                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Supporting Services                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│ TriggerService  │ ActionService   │ WorkflowBuilderService  │
│ - Event system  │ - Templates     │ - Validation           │
│ - Scheduling    │ - Execution     │ - Testing              │
│ - Webhooks      │ - Batch ops     │ - Import/export        │
└─────────────────┴─────────────────┴─────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                         │
│  - workflows (definitions)                                  │
│  - workflow_executions (history)                            │
│  - workflow_webhooks (webhook config)                       │
│  - workflow_analytics (metrics)                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Event → Trigger → Workflow Engine → Actions → Result
   ↓                                     ↓
Database                            Execution History
```

## Getting Started

### Installation

```typescript
import { WorkflowEngine } from '@court-lens/workflow/services/WorkflowEngine';
import { WorkflowBuilderService } from '@court-lens/workflow/services/WorkflowBuilderService';
import { TriggerService } from '@court-lens/workflow/services/TriggerService';
import { ActionService } from '@court-lens/workflow/services/ActionService';
```

### Basic Usage

```typescript
// Initialize services
const engine = new WorkflowEngine(supabaseClient);
const builder = new WorkflowBuilderService(engine);
const triggerService = new TriggerService(engine, supabaseClient);
const actionService = new ActionService();

// Create a simple workflow
const workflow = await engine.createWorkflow({
  name: 'Document Upload Notification',
  organizationId: 'org-123',
  trigger: {
    type: 'document_upload',
    config: {},
  },
  actions: [
    {
      id: 'action-1',
      type: 'send_notification',
      config: {
        title: 'New Document Uploaded',
        message: 'Document {{triggerData.documentName}} has been uploaded',
        recipients: ['user-123'],
      },
    },
  ],
  status: 'active',
});

// Execute manually
const execution = await engine.executeWorkflow(workflow.id, {
  triggerData: {
    documentId: 'doc-456',
    documentName: 'Contract.pdf',
  },
});
```

## Workflow Engine

### Core Methods

#### createWorkflow

```typescript
const workflow = await engine.createWorkflow({
  name: string;
  description?: string;
  organizationId: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  variables?: Record<string, any>;
  status: WorkflowStatus;
});
```

#### executeWorkflow

```typescript
const execution = await engine.executeWorkflow(
  workflowId: string,
  context: {
    triggerData?: Record<string, any>;
    variables?: Record<string, any>;
    userId?: string;
  },
  options?: {
    onProgress?: (progress: number, currentAction: string) => void;
  }
);
```

#### updateWorkflow

```typescript
await engine.updateWorkflow(workflowId, {
  name?: string;
  description?: string;
  trigger?: WorkflowTrigger;
  actions?: WorkflowAction[];
  status?: WorkflowStatus;
});
```

#### deleteWorkflow

```typescript
await engine.deleteWorkflow(workflowId);
```

### Execution Control

```typescript
// Get execution status
const execution = await engine.getExecution(executionId);

// List executions
const executions = await engine.listExecutions(workflowId, {
  status?: ExecutionStatus;
  limit?: number;
  offset?: number;
});

// Cancel execution
await engine.cancelExecution(executionId);
```

## Triggers

### Manual Trigger

```typescript
{
  type: 'manual',
  config: {}
}
```

Triggered via API or UI button click.

### Document Upload Trigger

```typescript
{
  type: 'document_upload',
  config: {
    documentType?: string; // Optional filter
  }
}
```

Triggered when documents are uploaded. Provides `triggerData`:
- `documentId`: Document ID
- `documentName`: File name
- `documentType`: Document type
- `uploadedBy`: User ID
- `uploadedAt`: Timestamp

### Document Status Change Trigger

```typescript
{
  type: 'document_status_change',
  config: {
    fromStatus?: string;
    toStatus?: string;
  }
}
```

Triggered on document status transitions. Provides `triggerData`:
- `documentId`: Document ID
- `fromStatus`: Previous status
- `toStatus`: New status
- `changedBy`: User ID
- `changedAt`: Timestamp

### Scheduled Trigger

```typescript
{
  type: 'date_time',
  config: {
    schedule: 'cron' | 'hourly' | 'daily' | 'weekly' | 'monthly',
    cronExpression?: string; // If schedule = 'cron'
  }
}
```

Cron format: `minute hour day month weekday`

Examples:
- `0 9 * * 1-5` - 9 AM on weekdays
- `0 0 1 * *` - First day of each month
- `*/30 * * * *` - Every 30 minutes

### Webhook Trigger

```typescript
{
  type: 'webhook',
  config: {
    verifySignature: boolean;
  }
}
```

Generates unique webhook URL and secret. External systems POST to URL with signature verification.

## Actions

### Send Notification

```typescript
{
  type: 'send_notification',
  config: {
    title: string;
    message: string;
    recipients: string[]; // User IDs
    priority?: 'low' | 'normal' | 'high';
  }
}
```

### Assign Task

```typescript
{
  type: 'assign_task',
  config: {
    title: string;
    description?: string;
    assigneeId: string;
    dueDate?: string; // ISO date
    priority?: 'low' | 'normal' | 'high';
  }
}
```

### Update Status

```typescript
{
  type: 'update_status',
  config: {
    entityType: 'document' | 'case';
    entityId: string;
    status: string;
  }
}
```

### Send Email

```typescript
{
  type: 'send_email',
  config: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
  }
}
```

### Webhook

```typescript
{
  type: 'webhook',
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
  }
}
```

### API Call

```typescript
{
  type: 'api_call',
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    authentication?: {
      type: 'bearer' | 'basic' | 'api-key';
      token?: string;
      username?: string;
      password?: string;
      apiKey?: string;
    };
  }
}
```

## Workflow Builder

### Templates

```typescript
const templates = builder.listTemplates();
// Returns 5 built-in templates:
// 1. document-upload-notification
// 2. case-status-workflow
// 3. daily-task-assignment
// 4. contract-review-workflow
// 5. deadline-reminder

const workflow = builder.createFromTemplate('document-upload-notification', {
  organizationId: 'org-123',
  variables: {
    recipientId: 'user-456',
  },
});
```

### Validation

```typescript
const result = builder.validateWorkflow(workflow);

if (!result.isValid) {
  console.error('Errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

Checks for:
- ✅ Required fields
- ✅ Circular references
- ✅ Orphaned actions
- ✅ Invalid configurations
- ✅ Missing action handlers

### Testing

```typescript
const testResult = await builder.testWorkflow(workflow, {
  triggerData: {
    documentId: 'test-doc',
    documentName: 'Test.pdf',
  },
});

console.log('Test passed:', testResult.success);
console.log('Results:', testResult.results);
```

### Import/Export

```typescript
// Export
const json = builder.exportWorkflow(workflow);

// Import
const imported = builder.importWorkflow(json, 'org-123');
```

## React Components

### WorkflowProvider

```tsx
import { WorkflowProvider } from '@court-lens/workflow/providers/WorkflowProvider';

<WorkflowProvider supabaseClient={supabase}>
  <App />
</WorkflowProvider>
```

### useWorkflow Hook

```tsx
import { useWorkflow } from '@court-lens/workflow/providers/WorkflowProvider';

function MyComponent() {
  const {
    workflows,
    loadWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
  } = useWorkflow();

  // ...
}
```

### useWorkflowExecution Hook

```tsx
import { useWorkflowExecution } from '@court-lens/workflow/hooks/useWorkflowExecution';

function ExecutionView({ executionId }) {
  const {
    execution,
    isLoading,
    isRunning,
    progress,
    cancel,
    refresh,
  } = useWorkflowExecution(executionId, {
    autoLoad: true,
    pollInterval: 2000,
  });

  return <div>Progress: {progress}%</div>;
}
```

### WorkflowList

```tsx
import { WorkflowList } from '@court-lens/workflow/components/WorkflowList';

<WorkflowList
  organizationId="org-123"
  onWorkflowClick={(workflow) => console.log(workflow)}
  onWorkflowEdit={(workflow) => setEditing(workflow)}
/>
```

### ExecutionMonitor

```tsx
import { ExecutionMonitor } from '@court-lens/workflow/components/ExecutionMonitor';

<ExecutionMonitor
  executionId="exec-123"
  organizationId="org-123"
  autoRefresh={true}
  refreshInterval={2000}
/>
```

## Examples

### Document Processing Workflow

```typescript
const workflow = await engine.createWorkflow({
  name: 'Contract Review Process',
  organizationId: 'org-123',
  trigger: {
    type: 'document_upload',
    config: {
      documentType: 'contract',
    },
  },
  actions: [
    {
      id: 'action-1',
      type: 'assign_task',
      config: {
        title: 'Review Contract: {{triggerData.documentName}}',
        description: 'Please review and approve the uploaded contract.',
        assigneeId: '{{variables.reviewerId}}',
        priority: 'high',
      },
      onSuccess: ['action-2'],
    },
    {
      id: 'action-2',
      type: 'send_email',
      config: {
        to: ['{{variables.reviewerEmail}}'],
        subject: 'New Contract for Review',
        body: 'A new contract has been uploaded and assigned to you for review.',
      },
      conditions: [
        {
          field: 'triggerData.urgent',
          operator: 'equals',
          value: true,
        },
      ],
    },
  ],
  variables: {
    reviewerId: 'user-456',
    reviewerEmail: 'reviewer@example.com',
  },
  status: 'active',
});
```

### Daily Task Assignment

```typescript
const workflow = await engine.createWorkflow({
  name: 'Daily Task Assignment',
  organizationId: 'org-123',
  trigger: {
    type: 'date_time',
    config: {
      schedule: 'cron',
      cronExpression: '0 9 * * 1-5', // 9 AM weekdays
    },
  },
  actions: [
    {
      id: 'action-1',
      type: 'assign_task',
      config: {
        title: 'Daily Review',
        description: 'Review pending cases and documents',
        assigneeId: '{{variables.assigneeId}}',
        dueDate: '{{variables.today}}',
      },
    },
  ],
  variables: {
    assigneeId: 'user-123',
  },
  status: 'active',
});
```

## Best Practices

### Workflow Design

1. **Keep it Simple**: Start with simple workflows and add complexity gradually
2. **Use Descriptive Names**: Name workflows and actions clearly
3. **Add Conditions**: Use conditions to control action execution
4. **Handle Errors**: Define fallback actions with `onFailure`
5. **Test Thoroughly**: Use `testWorkflow()` before activating

### Performance

1. **Limit Action Chains**: Keep action chains under 10 actions
2. **Use Parallel Execution**: Execute independent actions in parallel
3. **Set Retry Limits**: Configure retry attempts appropriately (max 3-5)
4. **Monitor Execution**: Track execution times and optimize slow workflows

### Security

1. **Validate Webhooks**: Always verify webhook signatures
2. **Secure API Keys**: Store credentials securely, never in workflow config
3. **Use RLS**: Enable Row Level Security on all workflow tables
4. **Audit Executions**: Monitor execution history for anomalies

### Monitoring

1. **Track Metrics**: Monitor success rates, execution times, error rates
2. **Set Alerts**: Configure alerts for workflow failures
3. **Review Logs**: Regularly review execution logs
4. **Optimize**: Identify and optimize slow-running workflows

### Maintenance

1. **Version Control**: Export workflows to JSON for version control
2. **Documentation**: Document workflow purpose and logic
3. **Archive Old Workflows**: Archive unused workflows instead of deleting
4. **Regular Reviews**: Review and update workflows quarterly

## API Reference

### WorkflowEngine

- `createWorkflow(definition)` - Create new workflow
- `updateWorkflow(id, updates)` - Update workflow
- `deleteWorkflow(id)` - Delete workflow
- `listWorkflows(organizationId, filters)` - List workflows
- `executeWorkflow(id, context, options)` - Execute workflow
- `getExecution(id)` - Get execution details
- `listExecutions(workflowId, filters)` - List executions
- `cancelExecution(id)` - Cancel running execution

### WorkflowBuilderService

- `createFromTemplate(templateId, params)` - Create from template
- `listTemplates()` - List available templates
- `validateWorkflow(workflow)` - Validate workflow
- `testWorkflow(workflow, context)` - Test workflow
- `exportWorkflow(workflow)` - Export to JSON
- `importWorkflow(json, organizationId)` - Import from JSON
- `cloneWorkflow(workflow)` - Clone workflow

### TriggerService

- `initialize()` - Initialize trigger listeners
- `registerScheduledTrigger(workflow)` - Register scheduled trigger
- `createWebhookTrigger(workflowId)` - Create webhook
- `handleWebhook(webhookId, request)` - Handle webhook request
- `triggerWorkflow(workflowId, data)` - Manual trigger
- `cleanup()` - Cleanup resources

### ActionService

- `createFromTemplate(templateId, config)` - Create action from template
- `listTemplates()` - List action templates
- `validateActionConfig(action)` - Validate action config
- `executeBatch(actions, context)` - Execute actions sequentially
- `executeParallel(actions, context)` - Execute actions in parallel

## Support

For issues, questions, or feature requests, please contact the Court Lens development team.

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**License**: Proprietary
