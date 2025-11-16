# Workflow Engine Documentation

## Overview

The Workflow Engine is a powerful automation system designed to orchestrate complex business processes in the Union Claims platform. It provides a visual workflow builder, execution engine, approval management, and comprehensive monitoring capabilities.

## Architecture

### Components

1. **Backend Service** (`services/workflow-service/`)
   - Express.js REST API
   - Workflow execution engine
   - Job queue management (Bull + Redis)
   - Database persistence (Supabase/PostgreSQL)

2. **Frontend Components** (`src/components/workflow/`)
   - WorkflowBuilder: Visual workflow designer
   - WorkflowMonitor: Real-time execution monitoring
   - WorkflowInstanceDetail: Detailed execution view
   - ApprovalQueue: Approval request management
   - WorkflowTemplateGallery: Pre-built workflow templates
   - WorkflowAnalytics: Performance metrics and insights

3. **Database Schema**
   - 6 tables: workflows, workflow_instances, workflow_node_executions, workflow_triggers, workflow_approvals, workflow_events
   - RLS policies for multi-tenancy
   - 3 reporting views
   - 2 utility functions

## Features

### 1. Workflow Builder

Visual drag-and-drop workflow designer with 10 node types:

- **Start**: Entry point for workflow
- **End**: Terminal node
- **Task**: Execute actions (update claim status, assign claims, create notes)
- **Decision**: Conditional branching based on context
- **Approval**: Pause workflow and request user approval
- **Notification**: Send notifications (email, Slack, etc.)
- **AI Prediction**: Call AI service for predictions
- **Delay**: Schedule delayed execution
- **API Call**: Make HTTP requests to external services
- **Parallel**: Execute multiple branches concurrently

### 2. Workflow Execution

- **Sequential Execution**: Nodes execute in order based on edges
- **Parallel Execution**: Multiple branches can run simultaneously
- **Conditional Routing**: Decision nodes route based on context evaluation
- **State Management**: Context persisted across node executions
- **Error Handling**: Automatic retries with exponential backoff
- **Pause/Resume**: Workflows can be paused for approvals and resumed

### 3. Pre-built Templates

5 production-ready workflow templates:

1. **Claim Intake Processing**: Automate new claim routing based on AI complexity assessment
2. **Multi-Level Approval Chain**: Sequential approval workflow for high-value claims
3. **Settlement Negotiation**: AI-powered settlement calculation and negotiation
4. **Claim Escalation**: Automatic escalation for stalled claims
5. **Document Review & Analysis**: Automated document collection and AI analysis

### 4. Approval Management

- Approval requests created by approval nodes
- Workflow pauses until approval response
- Approve/reject with comments
- Approval history tracking
- Multi-level approval chains supported

### 5. Monitoring & Analytics

- Real-time workflow execution monitoring
- Execution timeline visualization
- Node performance metrics
- Success/failure rate tracking
- Average execution time analysis
- Node-level failure rate monitoring

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Redis (for job queue)

### Installation

1. Install workflow service dependencies:
```bash
cd services/workflow-service
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migration:
```bash
psql -h <host> -U <user> -d <database> -f database/migrations/012_workflow_engine_tables.sql
```

4. Start the workflow service:
```bash
pnpm dev
```

The service will start on port 3006 (configurable via PORT environment variable).

### Basic Usage

#### Creating a Workflow

```typescript
import { WorkflowBuilder } from '@/components/workflow';

function MyWorkflowPage() {
  return (
    <WorkflowBuilder
      tenantId="tenant-123"
      onSave={(workflow) => {
        console.log('Workflow saved:', workflow);
      }}
      onTest={(workflow) => {
        console.log('Testing workflow:', workflow);
      }}
    />
  );
}
```

#### Starting a Workflow

```bash
POST /api/workflows/:id/start
Headers:
  X-Tenant-ID: tenant-123
Body:
{
  "context": {
    "claimId": "claim-456",
    "amount": 5000
  },
  "claimId": "claim-456"
}
```

#### Monitoring Workflows

```typescript
import { WorkflowMonitor } from '@/components/workflow';

function MonitoringPage() {
  return (
    <WorkflowMonitor
      tenantId="tenant-123"
      onViewDetails={(instanceId) => {
        navigate(`/workflows/instances/${instanceId}`);
      }}
    />
  );
}
```

## API Reference

### Workflow Definitions

#### List Workflows
```
GET /api/workflows
Headers: X-Tenant-ID
Response: Array of workflow definitions
```

#### Get Workflow
```
GET /api/workflows/:id
Headers: X-Tenant-ID
Response: Workflow definition
```

#### Create Workflow
```
POST /api/workflows
Headers: X-Tenant-ID, Content-Type: application/json
Body: WorkflowDefinition
Response: Created workflow
```

#### Update Workflow
```
PUT /api/workflows/:id
Headers: X-Tenant-ID, Content-Type: application/json
Body: WorkflowDefinition (partial)
Response: Updated workflow (version incremented)
```

#### Delete Workflow
```
DELETE /api/workflows/:id
Headers: X-Tenant-ID
Response: 204 No Content
```

### Workflow Execution

#### Start Workflow
```
POST /api/workflows/:id/start
Headers: X-Tenant-ID, Content-Type: application/json
Body:
{
  "context": { ... },
  "claimId": "optional-claim-id"
}
Response: WorkflowInstance
```

#### List Instances
```
GET /api/workflow-instances
Query params: status, workflowId, claimId
Headers: X-Tenant-ID
Response: Array of workflow instances
```

#### Get Instance
```
GET /api/workflow-instances/:id
Headers: X-Tenant-ID
Response: WorkflowInstance with node executions
```

#### Cancel Workflow
```
POST /api/workflow-instances/:id/cancel
Headers: X-Tenant-ID
Response: Updated workflow instance
```

### Approvals

#### List Approvals
```
GET /api/approvals
Headers: X-Tenant-ID, Authorization
Response: Array of pending approval requests for user
```

#### Respond to Approval
```
POST /api/approvals/:id/respond
Headers: X-Tenant-ID, Authorization, Content-Type: application/json
Body:
{
  "approved": true,
  "comments": "Approved with conditions"
}
Response: Updated approval request
```

### Templates

#### List Templates
```
GET /api/workflow-templates
Query params: category
Headers: X-Tenant-ID
Response: Array of workflow templates
```

#### Get Template
```
GET /api/workflow-templates/:id
Headers: X-Tenant-ID
Response: Workflow template
```

#### Create from Template
```
POST /api/workflow-templates/:id/create
Headers: X-Tenant-ID, Content-Type: application/json
Body:
{
  "name": "My Custom Workflow",
  "description": "Based on template",
  "variables": { ... }
}
Response: Created workflow definition
```

### Analytics

#### Workflow Analytics
```
GET /api/workflows/:id/analytics
Headers: X-Tenant-ID
Response:
{
  "workflowId": "...",
  "totalExecutions": 100,
  "successfulExecutions": 95,
  "failedExecutions": 5,
  "averageExecutionTime": 45000,
  "successRate": 95.0,
  "nodePerformance": [ ... ]
}
```

#### Overview Analytics
```
GET /api/analytics/overview
Headers: X-Tenant-ID
Response:
{
  "totalWorkflows": 10,
  "activeWorkflows": 8,
  "totalExecutions": 500,
  "runningExecutions": 12,
  "pausedExecutions": 3,
  "completedToday": 45,
  "averageSuccessRate": 92.5,
  "averageExecutionTime": 38000
}
```

## Node Types

### Start Node
Entry point for workflow execution. Every workflow must have exactly one start node.

**Config**: None

### End Node
Terminal node that completes workflow execution. Workflows can have multiple end nodes.

**Config**: None

### Task Node
Executes predefined actions.

**Config**:
```json
{
  "action": "update-claim-status" | "assign-claim" | "create-note",
  "parameters": {
    // Action-specific parameters
  }
}
```

**Actions**:
- `update-claim-status`: Update claim status
  - Parameters: `status`
- `assign-claim`: Assign claim to user
  - Parameters: `userId`
- `create-note`: Add note to claim
  - Parameters: `note`, `noteType`

### Decision Node
Conditional branching based on context evaluation.

**Config**:
```json
{
  "conditions": [
    {
      "expression": "context.amount > 1000",
      "label": "High Value"
    },
    {
      "operator": "<=",
      "field": "amount",
      "value": 1000,
      "label": "Low Value"
    }
  ]
}
```

**Evaluation**:
- Expression-based: Evaluate JavaScript expression
- Operator-based: Compare field with value using operator (==, !=, >, <, >=, <=)

### Approval Node
Pauses workflow and creates approval request.

**Config**:
```json
{
  "requestedFrom": "user-id" | ["user-id-1", "user-id-2"],
  "message": "Approval required for high-value claim",
  "autoApprove": false,
  "autoApproveCondition": "context.amount < 500"
}
```

**Behavior**:
- Workflow status set to "paused"
- Approval request created in database
- Workflow resumes when approval response received

### Notification Node
Sends notifications via configured channels.

**Config**:
```json
{
  "channel": "email" | "slack" | "sms",
  "to": "user@example.com" | ["user1@example.com", "user2@example.com"],
  "subject": "Notification Subject",
  "message": "Template: {{context.claimId}} requires attention",
  "template": "claim-notification"
}
```

### AI Prediction Node
Calls AI service for predictions.

**Config**:
```json
{
  "predictionType": "outcome" | "timeline" | "resources" | "settlement",
  "endpoint": "/api/ai/predict",
  "inputMapping": {
    "claimData": "context.claim"
  }
}
```

**Response**: Prediction result stored in context under `aiPrediction`

### Delay Node
Schedules delayed execution.

**Config**:
```json
{
  "duration": 300000, // milliseconds
  "unit": "minutes" | "hours" | "days",
  "value": 5
}
```

### API Call Node
Makes HTTP requests to external services.

**Config**:
```json
{
  "method": "GET" | "POST" | "PUT" | "DELETE",
  "url": "https://api.example.com/endpoint",
  "headers": {
    "Authorization": "Bearer {{context.apiToken}}"
  },
  "body": {
    "claimId": "{{context.claimId}}"
  },
  "timeout": 30000
}
```

**Response**: API response stored in context under `apiResponse`

### Parallel Node
Executes multiple branches concurrently.

**Config**:
```json
{
  "branches": ["branch-1", "branch-2", "branch-3"],
  "waitForAll": true // Wait for all branches to complete
}
```

## Context Management

The workflow context is a JSON object that persists across node executions. It can be accessed and modified by nodes.

### Initial Context
Provided when starting workflow:
```json
{
  "claimId": "claim-123",
  "amount": 5000,
  "status": "pending"
}
```

### Context Updates
Nodes can add/modify context values:
```json
{
  "claimId": "claim-123",
  "amount": 5000,
  "status": "pending",
  "aiPrediction": {
    "outcome": "approved",
    "confidence": 0.85
  },
  "assignedTo": "user-456"
}
```

### Context References
Use template syntax to reference context values:
- In strings: `"Claim {{context.claimId}} assigned to {{context.assignedTo}}"`
- In conditions: `context.amount > 1000`

## Error Handling

### Retry Logic
Failed nodes automatically retry with exponential backoff:
- Max retries: 3 (configurable)
- Backoff: 1s, 2s, 4s
- Errors logged to workflow_events table

### Workflow Failure
If a node fails after max retries:
- Workflow status set to "failed"
- Error details stored in workflow_instances.error
- Node execution error stored in workflow_node_executions.error

### Cancellation
Workflows can be cancelled at any time:
- Status set to "cancelled"
- Running nodes allowed to complete
- Subsequent nodes not executed

## Security

### Multi-tenancy
- All API requests require X-Tenant-ID header
- RLS policies enforce tenant isolation at database level
- Workflows only accessible by owning tenant

### Authentication
- JWT authentication required for all endpoints
- User ID extracted from token for approval requests
- Role-based access control (RBAC) can be added

### Input Validation
- All API inputs validated with Zod schemas
- Node configurations validated during execution
- Context values sanitized to prevent injection

## Performance

### Optimization Tips
1. **Minimize Node Count**: Combine related tasks into single nodes
2. **Use Parallel Nodes**: Execute independent tasks concurrently
3. **Set Timeouts**: Configure appropriate timeouts for external calls
4. **Index Filters**: Ensure database indexes on frequently filtered columns
5. **Cache Templates**: Template definitions cached for faster loading

### Scaling
- **Horizontal**: Run multiple workflow service instances behind load balancer
- **Vertical**: Increase Redis and PostgreSQL resources for queue and database
- **Job Queue**: Bull queue distributes work across workers
- **Database**: Connection pooling via Supabase handles concurrent requests

## Monitoring

### Metrics
- Total executions per workflow
- Success/failure rates
- Average execution time
- Node performance (avg time, failure rate)
- Active/paused/completed counts

### Logging
- All workflow events logged to workflow_events table
- Node execution details in workflow_node_executions
- Winston logger for service-level logs

### Alerts
- Configure alerts for high failure rates
- Monitor paused workflows for stuck approvals
- Track long-running executions

## Troubleshooting

### Common Issues

**Workflow not starting**
- Check workflow has Start node
- Verify X-Tenant-ID header matches workflow tenant
- Ensure workflow is active (isActive: true)

**Node execution fails**
- Check node configuration is valid
- Verify context contains required fields
- Review error in workflow_node_executions table

**Approval workflow stuck**
- Check approval request exists in workflow_approvals
- Verify requestedFrom user ID is correct
- Ensure user has access to approval queue

**Slow execution**
- Review node performance metrics
- Check external API response times
- Verify database query performance

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug pnpm dev
```

## Best Practices

1. **Start Simple**: Begin with linear workflows, add complexity as needed
2. **Use Templates**: Leverage pre-built templates for common patterns
3. **Test Thoroughly**: Use test mode before activating workflows
4. **Monitor Actively**: Review analytics regularly to identify issues
5. **Document Workflows**: Add descriptions to nodes and workflows
6. **Version Control**: Update workflow versions instead of modifying active workflows
7. **Handle Errors**: Always include error paths in decision nodes
8. **Set Timeouts**: Configure reasonable timeouts for all external calls
9. **Validate Inputs**: Check context values before using in nodes
10. **Audit Trail**: Use workflow_events for compliance and debugging

## Examples

### Example 1: Simple Claim Processing
```json
{
  "name": "Simple Claim Processing",
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "name": "Start"
    },
    {
      "id": "assign",
      "type": "task",
      "name": "Assign Claim",
      "config": {
        "action": "assign-claim",
        "parameters": {
          "userId": "adjuster-1"
        }
      }
    },
    {
      "id": "notify",
      "type": "notification",
      "name": "Notify Member",
      "config": {
        "channel": "email",
        "to": "{{context.memberEmail}}",
        "subject": "Claim Assigned",
        "message": "Your claim {{context.claimId}} has been assigned."
      }
    },
    {
      "id": "end",
      "type": "end",
      "name": "End"
    }
  ],
  "edges": [
    {"source": "start", "target": "assign"},
    {"source": "assign", "target": "notify"},
    {"source": "notify", "target": "end"}
  ]
}
```

### Example 2: Approval Workflow
```json
{
  "name": "High-Value Claim Approval",
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "name": "Start"
    },
    {
      "id": "decision",
      "type": "decision",
      "name": "Check Amount",
      "config": {
        "conditions": [
          {
            "operator": ">",
            "field": "amount",
            "value": 10000,
            "label": "High Value"
          }
        ]
      }
    },
    {
      "id": "approval",
      "type": "approval",
      "name": "Supervisor Approval",
      "config": {
        "requestedFrom": "supervisor-1",
        "message": "Approval required for ${{context.amount}} claim"
      }
    },
    {
      "id": "approve",
      "type": "task",
      "name": "Approve Claim",
      "config": {
        "action": "update-claim-status",
        "parameters": {
          "status": "approved"
        }
      }
    },
    {
      "id": "end",
      "type": "end",
      "name": "End"
    }
  ],
  "edges": [
    {"source": "start", "target": "decision"},
    {"source": "decision", "target": "approval", "condition": "High Value"},
    {"source": "decision", "target": "approve", "condition": "else"},
    {"source": "approval", "target": "approve"},
    {"source": "approve", "target": "end"}
  ]
}
```

## Support

For issues, questions, or feature requests:
- Check the API documentation
- Review workflow_events table for errors
- Enable debug logging for detailed traces
- Contact the development team

## License

Copyright © 2024 Union Claims Platform. All rights reserved.
