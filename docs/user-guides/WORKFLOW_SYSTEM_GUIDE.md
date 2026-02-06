# Workflow System User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Creating Workflows](#creating-workflows)
4. [Using Templates](#using-templates)
5. [Monitoring Workflows](#monitoring-workflows)
6. [Managing Approvals](#managing-approvals)
7. [Understanding Analytics](#understanding-analytics)
8. [Best Practices](#best-practices)

## Introduction

The Workflow System automates complex business processes in the Union Claims platform. It enables you to design, execute, and monitor workflows that orchestrate tasks, decisions, approvals, and integrations across your claims operations.

### Key Capabilities

- **Visual Workflow Design**: Drag-and-drop interface for building workflows
- **Pre-built Templates**: 5 production-ready workflows to get started quickly
- **Real-time Monitoring**: Track workflow executions as they happen
- **Approval Management**: Handle approval requests with comments
- **Performance Analytics**: Understand workflow efficiency and bottlenecks
- **Multi-tenant Support**: Isolated workflows per tenant

## Getting Started

### Accessing the Workflow System

Navigate to the Workflows section in the Union Claims platform:

1. Click **Workflows** in the main navigation
2. Choose from available options:
   - **Builder**: Create new workflows or edit existing ones
   - **Monitor**: View active and completed workflow executions
   - **Approvals**: Manage pending approval requests
   - **Templates**: Browse and use pre-built workflows
   - **Analytics**: Review performance metrics

### Understanding Workflow Concepts

**Workflow Definition**: The blueprint that describes your process flow

**Workflow Instance**: A single execution of a workflow definition

**Node**: Individual steps in your workflow (tasks, decisions, approvals, etc.)

**Edge**: Connections between nodes that define execution flow

**Context**: Data that persists and flows through the workflow execution

## Creating Workflows

### Using the Workflow Builder

#### Step 1: Create a New Workflow

1. Navigate to **Workflows > Builder**
2. Click **New Workflow** or edit an existing workflow
3. Enter workflow details:
   - **Name**: Descriptive name for your workflow
   - **Description**: What this workflow does
   - **Category**: Classification (claim-processing, approval, notification, custom)

#### Step 2: Add Nodes

The left sidebar contains the **Node Palette** with 10 node types:

1. **Drag a node** from the palette onto the canvas
2. **Position** the node where you want it
3. **Click** the node to see its properties in the right panel
4. **Configure** the node properties

**Available Node Types**:

- **Start** (Green): Entry point - required for every workflow
- **End** (Red): Terminal node - workflows can have multiple end nodes
- **Task** (Blue): Execute actions like updating claim status or assigning claims
- **Decision** (Yellow): Conditional branching based on data
- **Approval** (Purple): Pause workflow and request user approval
- **Notification** (Indigo): Send emails, Slack messages, or SMS
- **AI Prediction** (Pink): Call AI service for predictions
- **Delay** (Gray): Schedule delayed execution
- **API Call** (Teal): Make HTTP requests to external services
- **Parallel** (Orange): Execute multiple branches concurrently

#### Step 3: Connect Nodes

1. Click **Connect** mode button (or click a node's connection point)
2. Click the **source node** you want to connect from
3. Click the **target node** you want to connect to
4. An edge (arrow) appears connecting the nodes

For **Decision nodes**, you can label edges with conditions:
1. Select the edge in the canvas
2. Set the condition in the properties panel
3. The edge will route based on the condition result

#### Step 4: Configure Node Properties

Click any node to edit its properties in the right panel:

**Example: Task Node Configuration**
```
Name: Update Claim Status
Action: update-claim-status
Parameters:
  status: under-review
```

**Example: Decision Node Configuration**
```
Name: Check Claim Amount
Conditions:
  - Expression: context.amount > 10000
    Label: High Value
  - Expression: context.amount <= 10000
    Label: Standard
```

**Example: Approval Node Configuration**
```
Name: Supervisor Approval
Requested From: supervisor-user-id
Message: Approval required for ${{context.amount}} claim
Auto-approve: false
```

#### Step 5: Validate and Save

1. Click **Validate** to check for errors:
   - Must have Start and End nodes
   - All nodes must be connected
   - Workflow must have a name
2. Fix any validation errors shown in the alert
3. Click **Save** to persist the workflow

#### Step 6: Test Your Workflow

1. Click **Test** button
2. Enter test context data (JSON):
```json
{
  "claimId": "test-123",
  "amount": 5000,
  "memberEmail": "member@example.com"
}
```
3. Review execution results in the Monitor

### Advanced Features

**Zoom and Pan**
- Use zoom controls (+/-/reset) to navigate large workflows
- Click and drag the canvas to pan

**Export/Import**
- **Export**: Download workflow as JSON file
- **Import**: Load workflow from JSON file

**Context Variables**
- Access context data using `{{context.fieldName}}` syntax
- Example: `{{context.claimId}}` in notification messages
- Available in: notifications, API calls, task parameters

## Using Templates

### Browsing Templates

1. Navigate to **Workflows > Templates**
2. Filter by category: All, Claim Processing, Approval, Notification, Custom
3. Each template card shows:
   - Template name and description
   - Category badge
   - Node and edge counts
   - Estimated execution time
   - Usage count

### Available Templates

#### 1. Claim Intake Processing
**Purpose**: Automate new claim routing based on AI complexity assessment

**Flow**:
1. Start with new claim
2. AI prediction analyzes complexity
3. Decision routes based on complexity:
   - Low: Assign to junior adjuster
   - Medium: Assign to senior adjuster
   - High: Assign to specialist and notify manager
4. Send confirmation email to member

**When to Use**: Every new claim submission

#### 2. Multi-Level Approval Chain
**Purpose**: Sequential approval workflow for high-value claims

**Flow**:
1. Start with claim requiring approval
2. Supervisor approval request
3. If approved and amount > $50K, manager approval request
4. If both approved, update claim status to approved
5. Send approval notification

**When to Use**: Claims exceeding approval thresholds

#### 3. Settlement Negotiation
**Purpose**: AI-powered settlement calculation and negotiation

**Flow**:
1. Start with claim ready for settlement
2. AI prediction calculates settlement range
3. Decision checks if in acceptable range:
   - Yes: Create settlement offer
   - No: Escalate to manager
4. Send settlement offer to member
5. Delay 7 days for response
6. Check response and finalize or renegotiate

**When to Use**: Claims entering settlement phase

#### 4. Claim Escalation
**Purpose**: Automatic escalation for stalled claims

**Flow**:
1. Start with claim ID
2. Check last update timestamp
3. Decision: Is claim stalled (>30 days)?
   - Yes: Escalate to manager and create escalation note
   - No: End without action
4. Send escalation notification to manager and adjuster

**When to Use**: Daily batch process for all open claims

#### 5. Document Review & Analysis
**Purpose**: Automated document collection and AI analysis

**Flow**:
1. Start with claim requiring documents
2. Send document request to member
3. Delay until documents received (webhook trigger)
4. AI prediction analyzes documents
5. Decision based on completeness:
   - Complete: Update status to under-review
   - Incomplete: Send follow-up request
6. Create analysis note on claim

**When to Use**: Claims missing required documentation

### Creating from Template

1. Click **Use** on your chosen template
2. Customize the template:
   - **Name**: Give it a unique name
   - **Description**: Add specific details
   - **Variables**: Override template variables (JSON)
3. Click **Create from Template**
4. The new workflow opens in the Builder for further customization

### Customization Tips

- Modify node configurations to match your business rules
- Add or remove nodes as needed
- Adjust approval recipients to your users
- Update notification templates with your branding
- Test thoroughly before activating

## Monitoring Workflows

### Viewing All Executions

Navigate to **Workflows > Monitor** to see:

**Statistics Dashboard**:
- **Total**: All workflow instances
- **Running**: Currently executing (blue)
- **Paused**: Waiting for approval (yellow)
- **Completed**: Finished successfully (green)
- **Failed**: Encountered errors (red)

**Workflow Instance Table**:
- Workflow name and status
- Current node being executed
- Progress bar showing completion percentage
- Start time and duration
- Associated claim ID
- Actions: View details, Cancel

### Filtering and Search

**Search**: Enter workflow name, instance ID, or claim ID

**Status Filter**: Show only workflows in specific status:
- All
- Pending
- Running
- Paused
- Completed
- Failed
- Cancelled

**Auto-Refresh**: Set refresh interval (5s, 10s, 30s, 1 minute) for real-time updates

### Viewing Instance Details

Click **View Details** (eye icon) on any instance to see:

**Overview Section**:
- Workflow name, version, and status
- Start time (absolute and relative)
- Total duration
- Initiated by user
- Associated claim ID
- Error message (if failed)

**Execution Timeline**:
- Visual timeline of all node executions
- Status indicator (completed, failed, running)
- Duration for each node
- Error messages for failed nodes
- Retry attempts
- Click **View Details** to see node input/output/error

**Execution Path**:
- Badge flow showing node sequence
- Current node highlighted with animation
- Completed nodes in gray
- Upcoming nodes in light gray

**Context Variables**:
- Current workflow context as formatted JSON
- Shows data flowing through the workflow
- Updated as nodes execute

### Cancelling Workflows

For running or paused workflows:
1. Click **Cancel** (stop icon) in the Monitor
2. Confirm cancellation
3. Workflow status changes to "cancelled"
4. Current node completes, but subsequent nodes don't execute

## Managing Approvals

### Viewing Approval Queue

Navigate to **Workflows > Approvals** to see:

**Statistics**:
- **Pending**: Awaiting your response (yellow)
- **Approved**: You approved (green)
- **Rejected**: You rejected (red)

**Pending Approvals Section**:
- Workflow name and claim ID
- How long ago approval was requested
- Approval message from workflow
- Context data (JSON)
- Approve/Reject buttons

**Approval History Table**:
- All past approval decisions
- Workflow name and status
- When requested and responded
- Your comments

### Responding to Approvals

#### To Approve:
1. Review the approval request details
2. Check claim ID and context data
3. Click **Approve** (green button)
4. Optionally add comments explaining your decision
5. Click **Submit Approval**
6. Workflow resumes execution

#### To Reject:
1. Review the approval request
2. Click **Reject** (red button)
3. **Required**: Add comments explaining why
4. Click **Submit Rejection**
5. Workflow routing depends on workflow design

### Best Practices for Approvals

- **Review Context**: Check all relevant data before deciding
- **Add Comments**: Always explain your reasoning
- **Be Timely**: Respond promptly to avoid delays
- **Check Claim**: View the actual claim if needed before approving
- **Escalate**: If unsure, reject with comments to escalate

## Understanding Analytics

### Overview Analytics

Navigate to **Workflows > Analytics** and select **Overview (All Workflows)**:

**Key Metrics**:
- **Active Workflows**: How many of your workflows are currently active
- **Success Rate**: Overall success percentage with trend indicator
  - Excellent: >90% (green)
  - Good: >75% (yellow)
  - Needs Attention: <75% (red)
- **Avg Execution Time**: How long workflows typically take
- **Executions Today**: Count with running/paused breakdown

**Time Range**: Select 24h, 7d, 30d, or 90d to analyze different periods

### Workflow-Specific Analytics

Select a specific workflow from the dropdown to see:

**Execution Metrics**:
- **Total Executions**: How many times this workflow has run
- **Success Rate**: Percentage and count of successful executions
- **Failed Executions**: Count and failure rate
- **Avg Execution Time**: Typical duration for this workflow

**Node Performance Table**:
- **Node Name**: Each node in the workflow
- **Average Time**: How long the node typically takes
- **Failure Rate**: Percentage with visual progress bar
- **Status**: Health indicator
  - Healthy: <5% failure rate (green)
  - Monitor: 5-10% failure rate (yellow)
  - Needs Attention: >10% failure rate (red)

### Using Analytics to Improve Workflows

**Identify Bottlenecks**:
- Look for nodes with high average execution time
- Consider optimizing or parallelizing slow nodes
- Check if external API calls have long timeouts

**Address Failures**:
- Focus on nodes with high failure rates
- Review error messages in failed executions
- Update node configurations to handle edge cases
- Add better error handling in decision nodes

**Optimize Success Rates**:
- Investigate failed workflow instances
- Update conditions in decision nodes
- Add validation before external calls
- Increase retry counts for unreliable services

**Track Trends**:
- Compare metrics across different time ranges
- Monitor success rate changes after workflow updates
- Track execution time improvements

## Best Practices

### Workflow Design

1. **Start Simple**: Begin with linear workflows, add complexity gradually
2. **Name Clearly**: Use descriptive names for workflows and nodes
3. **Add Descriptions**: Document what each workflow and node does
4. **Plan Error Paths**: Include error handling in decision nodes
5. **Test Thoroughly**: Always test with realistic data before activating
6. **Version Control**: Create new versions instead of modifying active workflows
7. **Keep It Focused**: One workflow per business process

### Node Configuration

1. **Validate Inputs**: Check context values exist before using
2. **Set Timeouts**: Configure reasonable timeouts for external calls
3. **Use Variables**: Reference context data with `{{context.field}}` syntax
4. **Handle Errors**: Add retry logic and error branches
5. **Document Config**: Add comments in JSON configurations
6. **Test Individually**: Verify each node configuration works

### Context Management

1. **Initialize Early**: Set required context values at workflow start
2. **Keep It Clean**: Don't add unnecessary data to context
3. **Name Consistently**: Use clear, consistent field names
4. **Type Safely**: Validate data types in decision nodes
5. **Document Schema**: Specify expected context shape in description

### Approval Workflows

1. **Clear Messages**: Write specific approval request messages
2. **Include Context**: Provide all data needed for decision
3. **Set Owners**: Assign approvals to specific users or roles
4. **Add Timeouts**: Consider auto-escalation for old approvals
5. **Handle Rejection**: Design what happens when rejected

### Monitoring & Maintenance

1. **Check Daily**: Review workflow analytics regularly
2. **Fix Failures**: Investigate and resolve failed executions promptly
3. **Update Workflows**: Improve based on analytics insights
4. **Archive Unused**: Deactivate workflows no longer needed
5. **Document Changes**: Keep track of workflow modifications

### Performance Optimization

1. **Use Parallel Nodes**: Execute independent tasks concurrently
2. **Minimize Delays**: Only use delay nodes when necessary
3. **Cache Data**: Store frequently used data in context
4. **Batch Operations**: Group related tasks in single nodes
5. **Optimize Queries**: Ensure database queries are efficient

### Security & Compliance

1. **Limit Access**: Only grant workflow edit permissions to authorized users
2. **Audit Trail**: Review workflow_events for compliance
3. **Protect Sensitive Data**: Don't log sensitive information in context
4. **Use RBAC**: Implement role-based access for approvals
5. **Regular Reviews**: Periodically review active workflows

## Troubleshooting

### Common Issues

**Workflow Not Starting**
- ✓ Verify workflow has Start node
- ✓ Check workflow is active (not archived)
- ✓ Ensure all required context fields provided
- ✓ Review workflow validation errors

**Execution Fails Immediately**
- ✓ Check first node configuration
- ✓ Verify context data format (valid JSON)
- ✓ Review node execution error in timeline
- ✓ Test node configuration individually

**Stuck on Approval**
- ✓ Verify approval request was created
- ✓ Check assigned user has access to approval queue
- ✓ Ensure user ID is correct in approval node
- ✓ Review approval status in database

**Slow Execution**
- ✓ Check node performance in analytics
- ✓ Review external API response times
- ✓ Look for unnecessary delay nodes
- ✓ Consider using parallel nodes

**Decision Node Not Routing**
- ✓ Verify condition syntax is correct
- ✓ Check context contains required fields
- ✓ Test condition expression in isolation
- ✓ Add default "else" path

### Getting Help

If you encounter issues:
1. Check the workflow execution timeline for errors
2. Review node configurations for mistakes
3. Test with simplified workflow first
4. Enable debug logging for detailed traces
5. Contact support with workflow ID and error details

## Advanced Topics

### Webhook Triggers

Workflows can be triggered by external webhooks:
1. Configure webhook URL in workflow trigger settings
2. Send POST request to webhook URL with context data
3. Workflow starts automatically with provided context

### API Integration

Call external APIs using API Call nodes:
- Set method, URL, headers, and body
- Reference context values in configuration
- Response stored in context for subsequent nodes
- Set appropriate timeout values

### Parallel Execution

Execute multiple branches concurrently:
1. Add Parallel node
2. Connect to multiple downstream nodes
3. Configure "wait for all" setting
4. All branches execute simultaneously

### AI-Powered Workflows

Leverage AI predictions in workflows:
1. Use AI Prediction node
2. Select prediction type (outcome, timeline, resources, settlement)
3. Map context data to AI input
4. Decision nodes route based on AI prediction

### Custom Actions

Extend task nodes with custom actions:
1. Define action in workflow service
2. Implement action handler
3. Add action to node configuration
4. Deploy updated service

## Glossary

**Context**: JSON object containing workflow data
**Edge**: Connection between workflow nodes
**Instance**: Single execution of a workflow
**Node**: Individual step in a workflow
**Template**: Pre-built workflow ready for customization
**Trigger**: Event that starts a workflow execution

## Resources

- [API Documentation](./services/workflow-service/README.md)
- [Database Schema](./database/migrations/012_workflow_engine_tables.sql)
- [Development Guide](./docs/PHASE_3_WEEK_4_GRIEVANCE_ENGINE_COMPLETION.md)

---

**Need Help?** Contact the development team or submit a support ticket.

*Last Updated: November 2024*
