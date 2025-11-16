import { z } from 'zod';

// Workflow Node Types
export type NodeType = 
  | 'start'
  | 'end'
  | 'task'
  | 'decision'
  | 'parallel'
  | 'approval'
  | 'notification'
  | 'ai-prediction'
  | 'delay'
  | 'api-call';

// Workflow Node
export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

// Workflow Edge (Connection)
export interface WorkflowEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  condition?: string; // for decision nodes
  label?: string;
}

// Workflow Definition
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  tenantId: string;
  category: 'claim-processing' | 'approval' | 'notification' | 'custom';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>; // workflow-level variables
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isTemplate: boolean;
}

// Workflow Instance (Execution)
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowVersion: number;
  tenantId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  currentNodeId?: string;
  context: Record<string, any>; // runtime variables
  error?: string;
  claimId?: string; // associated claim
  initiatedBy: string;
  executionPath: string[]; // history of executed nodes
}

// Task/Node Execution
export interface NodeExecution {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
  assignedTo?: string; // for approval/task nodes
}

// Workflow Trigger
export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  tenantId: string;
  type: 'manual' | 'event' | 'schedule' | 'webhook';
  config: {
    event?: string; // e.g., 'claim.created', 'claim.updated'
    schedule?: string; // cron expression
    webhookUrl?: string;
    conditions?: Record<string, any>; // trigger conditions
  };
  isActive: boolean;
}

// Approval Request
export interface ApprovalRequest {
  id: string;
  instanceId: string;
  nodeExecutionId: string;
  workflowName: string;
  requestedFrom: string; // user ID
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  comments?: string;
  requestedAt: Date;
  respondedAt?: Date;
  claimId?: string;
}

// Workflow Template
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  definition: Omit<WorkflowDefinition, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'>;
  usageCount: number;
  rating?: number;
}

// Workflow Analytics
export interface WorkflowAnalytics {
  workflowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  mostCommonErrors: Array<{ error: string; count: number }>;
  nodePerformance: Array<{
    nodeId: string;
    nodeName: string;
    avgExecutionTime: number;
    failureRate: number;
  }>;
}

// Zod Schemas for Validation
export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['start', 'end', 'task', 'decision', 'parallel', 'approval', 'notification', 'ai-prediction', 'delay', 'api-call']),
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.any()),
  position: z.object({ x: z.number(), y: z.number() }),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  condition: z.string().optional(),
  label: z.string().optional(),
});

export const workflowDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['claim-processing', 'approval', 'notification', 'custom']),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  variables: z.record(z.any()).optional().default({}),
  isActive: z.boolean().default(true),
  isTemplate: z.boolean().default(false),
});

export const startWorkflowSchema = z.object({
  workflowId: z.string(),
  context: z.record(z.any()).optional().default({}),
  claimId: z.string().optional(),
});

export const approvalResponseSchema = z.object({
  approved: z.boolean(),
  comments: z.string().optional(),
});
