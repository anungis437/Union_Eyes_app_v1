import { WorkflowTemplate } from '../types/workflow.js';

/**
 * Pre-built workflow templates for common use cases
 */
export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'claim-intake-processing',
    name: 'Claim Intake Processing',
    description: 'Automated workflow for processing new claim submissions',
    category: 'claim-processing',
    icon: 'FileInput',
    usageCount: 0,
    definition: {
      name: 'Claim Intake Processing',
      description: 'Process new claims with validation, assignment, and notification',
      version: 1,
      category: 'claim-processing',
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          config: {},
          position: { x: 100, y: 100 },
        },
        {
          id: 'validate',
          type: 'task',
          name: 'Validate Claim Data',
          description: 'Validate all required claim fields',
          config: {
            action: 'validate-claim',
            rules: ['required_fields', 'date_format', 'member_active'],
          },
          position: { x: 100, y: 200 },
        },
        {
          id: 'ai-predict',
          type: 'ai-prediction',
          name: 'AI Outcome Prediction',
          description: 'Predict claim outcome and timeline',
          config: {
            predictionType: 'outcome',
          },
          position: { x: 100, y: 300 },
        },
        {
          id: 'decision',
          type: 'decision',
          name: 'Check Complexity',
          description: 'Route based on claim complexity',
          config: {
            conditions: [
              { name: 'high', expression: 'context.prediction.complexity === "high"' },
              { name: 'medium', expression: 'context.prediction.complexity === "medium"' },
            ],
          },
          position: { x: 100, y: 400 },
        },
        {
          id: 'assign-senior',
          type: 'task',
          name: 'Assign to Senior Adjuster',
          config: {
            action: 'assign-claim',
            parameters: { assignee: 'senior-adjuster', priority: 'high' },
          },
          position: { x: 50, y: 500 },
        },
        {
          id: 'assign-junior',
          type: 'task',
          name: 'Assign to Junior Adjuster',
          config: {
            action: 'assign-claim',
            parameters: { assignee: 'junior-adjuster', priority: 'normal' },
          },
          position: { x: 250, y: 500 },
        },
        {
          id: 'notify',
          type: 'notification',
          name: 'Notify Member',
          description: 'Send confirmation email to member',
          config: {
            recipients: ['member'],
            template: 'claim-received',
            channel: 'email',
          },
          position: { x: 100, y: 600 },
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 100, y: 700 },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'validate', label: 'Begin' },
        { id: 'e2', source: 'validate', target: 'ai-predict' },
        { id: 'e3', source: 'ai-predict', target: 'decision' },
        { id: 'e4', source: 'decision', target: 'assign-senior', condition: 'context.decision === "high"' },
        { id: 'e5', source: 'decision', target: 'assign-junior', condition: 'context.decision !== "high"' },
        { id: 'e6', source: 'assign-senior', target: 'notify' },
        { id: 'e7', source: 'assign-junior', target: 'notify' },
        { id: 'e8', source: 'notify', target: 'end' },
      ],
      variables: {},
      isActive: true,
      isTemplate: true,
    },
  },
  {
    id: 'approval-chain',
    name: 'Multi-Level Approval Chain',
    description: 'Workflow for claims requiring multiple approval levels',
    category: 'approval',
    icon: 'CheckSquare',
    usageCount: 0,
    definition: {
      name: 'Multi-Level Approval Chain',
      description: 'Sequential approval workflow with escalation',
      version: 1,
      category: 'approval',
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          config: {},
          position: { x: 100, y: 100 },
        },
        {
          id: 'check-amount',
          type: 'decision',
          name: 'Check Claim Amount',
          config: {
            conditions: [
              { name: 'high', expression: 'context.claimAmount > 50000' },
              { name: 'medium', expression: 'context.claimAmount > 10000' },
            ],
          },
          position: { x: 100, y: 200 },
        },
        {
          id: 'supervisor-approval',
          type: 'approval',
          name: 'Supervisor Approval',
          config: {
            approvers: ['supervisor'],
            message: 'Please review and approve this claim',
          },
          position: { x: 100, y: 300 },
        },
        {
          id: 'manager-approval',
          type: 'approval',
          name: 'Manager Approval',
          description: 'Required for high-value claims',
          config: {
            approvers: ['manager'],
            message: 'High-value claim requires your approval',
          },
          position: { x: 100, y: 400 },
        },
        {
          id: 'director-approval',
          type: 'approval',
          name: 'Director Approval',
          description: 'Final approval for very high-value claims',
          config: {
            approvers: ['director'],
            message: 'Executive approval required',
          },
          position: { x: 100, y: 500 },
        },
        {
          id: 'approve-claim',
          type: 'task',
          name: 'Approve Claim',
          config: {
            action: 'update-claim-status',
            parameters: { status: 'approved' },
          },
          position: { x: 100, y: 600 },
        },
        {
          id: 'notify-approval',
          type: 'notification',
          name: 'Send Approval Notification',
          config: {
            recipients: ['member', 'assignee'],
            template: 'claim-approved',
            channel: 'email',
          },
          position: { x: 100, y: 700 },
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 100, y: 800 },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'check-amount' },
        { id: 'e2', source: 'check-amount', target: 'supervisor-approval' },
        { id: 'e3', source: 'supervisor-approval', target: 'manager-approval', condition: 'context.decision === "high"' },
        { id: 'e4', source: 'supervisor-approval', target: 'approve-claim', condition: 'context.decision !== "high"' },
        { id: 'e5', source: 'manager-approval', target: 'director-approval', condition: 'context.claimAmount > 100000' },
        { id: 'e6', source: 'manager-approval', target: 'approve-claim', condition: 'context.claimAmount <= 100000' },
        { id: 'e7', source: 'director-approval', target: 'approve-claim' },
        { id: 'e8', source: 'approve-claim', target: 'notify-approval' },
        { id: 'e9', source: 'notify-approval', target: 'end' },
      ],
      variables: {},
      isActive: true,
      isTemplate: true,
    },
  },
  {
    id: 'settlement-negotiation',
    name: 'Settlement Negotiation Workflow',
    description: 'Automated settlement offer and negotiation process',
    category: 'claim-processing',
    icon: 'DollarSign',
    usageCount: 0,
    definition: {
      name: 'Settlement Negotiation',
      description: 'AI-powered settlement calculation and negotiation',
      version: 1,
      category: 'claim-processing',
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          config: {},
          position: { x: 100, y: 100 },
        },
        {
          id: 'ai-settlement',
          type: 'ai-prediction',
          name: 'Calculate Settlement Range',
          config: {
            predictionType: 'settlement',
          },
          position: { x: 100, y: 200 },
        },
        {
          id: 'create-offer',
          type: 'task',
          name: 'Create Settlement Offer',
          config: {
            action: 'create-note',
            parameters: {
              note: 'Settlement offer created based on AI analysis',
            },
          },
          position: { x: 100, y: 300 },
        },
        {
          id: 'notify-member',
          type: 'notification',
          name: 'Send Offer to Member',
          config: {
            recipients: ['member'],
            template: 'settlement-offer',
            channel: 'email',
          },
          position: { x: 100, y: 400 },
        },
        {
          id: 'wait-response',
          type: 'delay',
          name: 'Wait for Response',
          description: 'Allow 7 days for member response',
          config: {
            duration: 7,
            unit: 'days',
          },
          position: { x: 100, y: 500 },
        },
        {
          id: 'check-response',
          type: 'decision',
          name: 'Check Response',
          config: {
            conditions: [
              { name: 'accepted', expression: 'context.offerAccepted === true' },
              { name: 'countered', expression: 'context.counterOffer !== undefined' },
            ],
          },
          position: { x: 100, y: 600 },
        },
        {
          id: 'process-acceptance',
          type: 'task',
          name: 'Process Acceptance',
          config: {
            action: 'update-claim-status',
            parameters: { status: 'settled' },
          },
          position: { x: 50, y: 700 },
        },
        {
          id: 'review-counter',
          type: 'approval',
          name: 'Review Counter Offer',
          config: {
            approvers: ['manager'],
            message: 'Review counter offer from member',
          },
          position: { x: 250, y: 700 },
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 100, y: 800 },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'ai-settlement' },
        { id: 'e2', source: 'ai-settlement', target: 'create-offer' },
        { id: 'e3', source: 'create-offer', target: 'notify-member' },
        { id: 'e4', source: 'notify-member', target: 'wait-response' },
        { id: 'e5', source: 'wait-response', target: 'check-response' },
        { id: 'e6', source: 'check-response', target: 'process-acceptance', condition: 'context.decision === "accepted"' },
        { id: 'e7', source: 'check-response', target: 'review-counter', condition: 'context.decision === "countered"' },
        { id: 'e8', source: 'process-acceptance', target: 'end' },
        { id: 'e9', source: 'review-counter', target: 'end' },
      ],
      variables: {},
      isActive: true,
      isTemplate: true,
    },
  },
  {
    id: 'escalation-workflow',
    name: 'Claim Escalation Workflow',
    description: 'Automatic escalation based on time and complexity',
    category: 'notification',
    icon: 'AlertTriangle',
    usageCount: 0,
    definition: {
      name: 'Claim Escalation',
      description: 'Escalate stalled or complex claims',
      version: 1,
      category: 'notification',
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          config: {},
          position: { x: 100, y: 100 },
        },
        {
          id: 'check-age',
          type: 'decision',
          name: 'Check Claim Age',
          config: {
            conditions: [
              { name: 'overdue', expression: 'context.daysOpen > 30' },
              { name: 'urgent', expression: 'context.priority === "high" && context.daysOpen > 14' },
            ],
          },
          position: { x: 100, y: 200 },
        },
        {
          id: 'notify-supervisor',
          type: 'notification',
          name: 'Notify Supervisor',
          config: {
            recipients: ['supervisor'],
            template: 'claim-overdue',
            channel: 'email',
          },
          position: { x: 100, y: 300 },
        },
        {
          id: 'wait-action',
          type: 'delay',
          name: 'Wait for Action',
          config: {
            duration: 3,
            unit: 'days',
          },
          position: { x: 100, y: 400 },
        },
        {
          id: 'check-progress',
          type: 'decision',
          name: 'Check Progress',
          config: {
            conditions: [
              { name: 'no_progress', expression: 'context.hasProgress === false' },
            ],
          },
          position: { x: 100, y: 500 },
        },
        {
          id: 'escalate-manager',
          type: 'notification',
          name: 'Escalate to Manager',
          config: {
            recipients: ['manager'],
            template: 'escalation-required',
            channel: 'email',
          },
          position: { x: 100, y: 600 },
        },
        {
          id: 'reassign',
          type: 'task',
          name: 'Reassign Claim',
          config: {
            action: 'assign-claim',
            parameters: { assignee: 'senior-adjuster' },
          },
          position: { x: 100, y: 700 },
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 100, y: 800 },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'check-age' },
        { id: 'e2', source: 'check-age', target: 'notify-supervisor', condition: 'context.decision === "overdue" || context.decision === "urgent"' },
        { id: 'e3', source: 'check-age', target: 'end', condition: 'context.decision !== "overdue" && context.decision !== "urgent"' },
        { id: 'e4', source: 'notify-supervisor', target: 'wait-action' },
        { id: 'e5', source: 'wait-action', target: 'check-progress' },
        { id: 'e6', source: 'check-progress', target: 'escalate-manager', condition: 'context.decision === "no_progress"' },
        { id: 'e7', source: 'check-progress', target: 'end', condition: 'context.decision !== "no_progress"' },
        { id: 'e8', source: 'escalate-manager', target: 'reassign' },
        { id: 'e9', source: 'reassign', target: 'end' },
      ],
      variables: {},
      isActive: true,
      isTemplate: true,
    },
  },
  {
    id: 'document-review',
    name: 'Document Review & Analysis',
    description: 'AI-powered document analysis workflow',
    category: 'claim-processing',
    icon: 'FileText',
    usageCount: 0,
    definition: {
      name: 'Document Review & Analysis',
      description: 'Automated document collection and AI analysis',
      version: 1,
      category: 'claim-processing',
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          config: {},
          position: { x: 100, y: 100 },
        },
        {
          id: 'request-docs',
          type: 'notification',
          name: 'Request Documents',
          config: {
            recipients: ['member'],
            template: 'document-request',
            channel: 'email',
          },
          position: { x: 100, y: 200 },
        },
        {
          id: 'wait-upload',
          type: 'delay',
          name: 'Wait for Upload',
          config: {
            duration: 7,
            unit: 'days',
          },
          position: { x: 100, y: 300 },
        },
        {
          id: 'check-uploaded',
          type: 'decision',
          name: 'Check if Documents Uploaded',
          config: {
            conditions: [
              { name: 'uploaded', expression: 'context.documentsUploaded === true' },
            ],
          },
          position: { x: 100, y: 400 },
        },
        {
          id: 'ai-analyze',
          type: 'api-call',
          name: 'AI Document Analysis',
          config: {
            url: 'http://localhost:3005/api/ai/analyze/document',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { documentIds: '{{context.documentIds}}' },
          },
          position: { x: 100, y: 500 },
        },
        {
          id: 'review-analysis',
          type: 'approval',
          name: 'Review AI Analysis',
          config: {
            approvers: ['adjuster'],
            message: 'Review AI document analysis results',
          },
          position: { x: 100, y: 600 },
        },
        {
          id: 'update-claim',
          type: 'task',
          name: 'Update Claim with Findings',
          config: {
            action: 'create-note',
            parameters: {
              note: 'Document analysis completed',
            },
          },
          position: { x: 100, y: 700 },
        },
        {
          id: 'send-reminder',
          type: 'notification',
          name: 'Send Reminder',
          config: {
            recipients: ['member'],
            template: 'document-reminder',
            channel: 'email',
          },
          position: { x: 250, y: 500 },
        },
        {
          id: 'end',
          type: 'end',
          name: 'End',
          config: {},
          position: { x: 100, y: 800 },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'request-docs' },
        { id: 'e2', source: 'request-docs', target: 'wait-upload' },
        { id: 'e3', source: 'wait-upload', target: 'check-uploaded' },
        { id: 'e4', source: 'check-uploaded', target: 'ai-analyze', condition: 'context.decision === "uploaded"' },
        { id: 'e5', source: 'check-uploaded', target: 'send-reminder', condition: 'context.decision !== "uploaded"' },
        { id: 'e6', source: 'ai-analyze', target: 'review-analysis' },
        { id: 'e7', source: 'review-analysis', target: 'update-claim' },
        { id: 'e8', source: 'update-claim', target: 'end' },
        { id: 'e9', source: 'send-reminder', target: 'end' },
      ],
      variables: {},
      isActive: true,
      isTemplate: true,
    },
  },
];

/**
 * Get all workflow templates
 */
export function getAllTemplates(): WorkflowTemplate[] {
  return workflowTemplates;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.category === category);
}

/**
 * Create workflow from template
 */
export function createFromTemplate(
  templateId: string,
  tenantId: string,
  userId: string,
  customizations?: Partial<WorkflowTemplate['definition']>
): any {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const workflow = {
    ...template.definition,
    ...customizations,
    tenant_id: tenantId,
    created_by: userId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return workflow;
}
