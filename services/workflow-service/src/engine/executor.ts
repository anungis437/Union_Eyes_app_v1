import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  WorkflowDefinition,
  WorkflowInstance,
  NodeExecution,
  WorkflowNode,
  WorkflowEdge,
} from '../types/workflow.js';
import { nanoid } from 'nanoid';

export class WorkflowExecutionEngine {
  private supabase;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  }

  /**
   * Start a workflow execution
   */
  async startWorkflow(
    workflowId: string,
    tenantId: string,
    userId: string,
    context: Record<string, any> = {},
    claimId?: string
  ): Promise<WorkflowInstance> {
    logger.info('Starting workflow execution', { workflowId, tenantId, userId });

    // Get workflow definition
    const { data: workflow, error: workflowError } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (workflowError || !workflow) {
      throw new Error(`Workflow not found or inactive: ${workflowId}`);
    }

    // Create workflow instance
    const instance: WorkflowInstance = {
      id: nanoid(),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      tenantId,
      status: 'pending',
      startedAt: new Date(),
      currentNodeId: undefined,
      context: { ...workflow.variables, ...context },
      claimId,
      initiatedBy: userId,
      executionPath: [],
    };

    const { error: insertError } = await this.supabase
      .from('workflow_instances')
      .insert({
        id: instance.id,
        workflow_id: instance.workflowId,
        workflow_version: instance.workflowVersion,
        tenant_id: instance.tenantId,
        status: instance.status,
        started_at: instance.startedAt,
        context: instance.context,
        claim_id: instance.claimId,
        initiated_by: instance.initiatedBy,
        execution_path: instance.executionPath,
      });

    if (insertError) {
      throw new Error(`Failed to create workflow instance: ${insertError.message}`);
    }

    // Start execution
    await this.executeWorkflow(instance, workflow);

    return instance;
  }

  /**
   * Execute workflow from current state
   */
  async executeWorkflow(
    instance: WorkflowInstance,
    workflow: any
  ): Promise<void> {
    try {
      // Update instance status to running
      instance.status = 'running';
      await this.updateInstance(instance);

      const nodes: WorkflowNode[] = workflow.nodes;
      const edges: WorkflowEdge[] = workflow.edges;

      // Find start node
      const startNode = nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      // Execute from start node
      await this.executeNode(instance, startNode, nodes, edges);

      // If we reach here, workflow completed successfully
      instance.status = 'completed';
      instance.completedAt = new Date();
      await this.updateInstance(instance);

      logger.info('Workflow completed successfully', { instanceId: instance.id });
    } catch (error: any) {
      logger.error('Workflow execution failed', {
        instanceId: instance.id,
        error: error.message,
      });

      instance.status = 'failed';
      instance.error = error.message;
      instance.completedAt = new Date();
      await this.updateInstance(instance);

      throw error;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    instance: WorkflowInstance,
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[]
  ): Promise<void> {
    logger.info('Executing node', {
      instanceId: instance.id,
      nodeId: node.id,
      nodeType: node.type,
    });

    // Update current node
    instance.currentNodeId = node.id;
    instance.executionPath.push(node.id);
    await this.updateInstance(instance);

    // Create node execution record
    const execution: NodeExecution = {
      id: nanoid(),
      instanceId: instance.id,
      nodeId: node.id,
      nodeName: node.name,
      status: 'running',
      startedAt: new Date(),
      input: { context: instance.context, config: node.config },
      retryCount: 0,
    };

    await this.createNodeExecution(execution);

    try {
      // Execute based on node type
      let output: Record<string, any> = {};

      switch (node.type) {
        case 'start':
          output = { message: 'Workflow started' };
          break;

        case 'end':
          output = { message: 'Workflow ended' };
          execution.status = 'completed';
          execution.completedAt = new Date();
          execution.output = output;
          await this.updateNodeExecution(execution);
          return; // End workflow

        case 'task':
          output = await this.executeTaskNode(node, instance);
          break;

        case 'decision':
          output = await this.executeDecisionNode(node, instance);
          break;

        case 'approval':
          output = await this.executeApprovalNode(node, instance, execution);
          break;

        case 'notification':
          output = await this.executeNotificationNode(node, instance);
          break;

        case 'ai-prediction':
          output = await this.executeAIPredictionNode(node, instance);
          break;

        case 'delay':
          output = await this.executeDelayNode(node, instance);
          break;

        case 'api-call':
          output = await this.executeAPICallNode(node, instance);
          break;

        case 'parallel':
          output = await this.executeParallelNode(node, instance, allNodes, allEdges);
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Update execution with output
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.output = output;
      await this.updateNodeExecution(execution);

      // Merge output into context
      instance.context = { ...instance.context, ...output };

      // Find next nodes
      const nextNodes = await this.getNextNodes(node, allNodes, allEdges, instance.context);

      // Execute next nodes
      for (const nextNode of nextNodes) {
        await this.executeNode(instance, nextNode, allNodes, allEdges);
      }
    } catch (error: any) {
      logger.error('Node execution failed', {
        nodeId: node.id,
        error: error.message,
      });

      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      await this.updateNodeExecution(execution);

      throw error;
    }
  }

  /**
   * Execute task node
   */
  private async executeTaskNode(
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const { action, parameters } = node.config;

    switch (action) {
      case 'update-claim-status':
        if (instance.claimId) {
          await this.supabase
            .from('claims')
            .update({ status: parameters.status })
            .eq('id', instance.claimId)
            .eq('tenant_id', instance.tenantId);
        }
        return { success: true, action };

      case 'assign-claim':
        if (instance.claimId && parameters.assignee) {
          await this.supabase
            .from('claims')
            .update({ assigned_to: parameters.assignee })
            .eq('id', instance.claimId)
            .eq('tenant_id', instance.tenantId);
        }
        return { success: true, assignee: parameters.assignee };

      case 'create-note':
        if (instance.claimId && parameters.note) {
          await this.supabase.from('claim_notes').insert({
            claim_id: instance.claimId,
            tenant_id: instance.tenantId,
            content: parameters.note,
            created_by: instance.initiatedBy,
          });
        }
        return { success: true, action };

      default:
        return { success: true, action, message: 'Task executed' };
    }
  }

  /**
   * Execute decision node
   */
  private async executeDecisionNode(
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const { conditions } = node.config;

    // Evaluate conditions
    for (const condition of conditions) {
      if (this.evaluateCondition(condition, instance.context)) {
        return { decision: condition.name, result: true };
      }
    }

    return { decision: 'default', result: false };
  }

  /**
   * Execute approval node (creates approval request and pauses)
   */
  private async executeApprovalNode(
    node: WorkflowNode,
    instance: WorkflowInstance,
    execution: NodeExecution
  ): Promise<Record<string, any>> {
    const { approvers, message } = node.config;

    // Create approval request
    const approvalRequest = {
      id: nanoid(),
      instance_id: instance.id,
      node_execution_id: execution.id,
      workflow_name: node.name,
      requested_from: approvers[0], // First approver
      status: 'pending',
      message,
      requested_at: new Date(),
      claim_id: instance.claimId,
      tenant_id: instance.tenantId,
    };

    await this.supabase.from('workflow_approvals').insert(approvalRequest);

    // Pause workflow
    instance.status = 'paused';
    await this.updateInstance(instance);

    return { approval_requested: true, approval_id: approvalRequest.id };
  }

  /**
   * Execute notification node
   */
  private async executeNotificationNode(
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const { recipients, template, channel } = node.config;

    // Create notification (simplified - would integrate with notification service)
    logger.info('Sending notification', {
      recipients,
      template,
      channel,
    });

    return { notification_sent: true, recipients };
  }

  /**
   * Execute AI prediction node
   */
  private async executeAIPredictionNode(
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const { predictionType } = node.config;

    if (!instance.claimId) {
      throw new Error('AI prediction requires claim ID');
    }

    // Call AI service
    const response = await fetch(`${config.aiService.url}/api/ai/predict/${predictionType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': instance.tenantId,
      },
      body: JSON.stringify({
        claimId: instance.claimId,
        context: instance.context,
      }),
    });

    if (!response.ok) {
      throw new Error('AI prediction failed');
    }

    const prediction = await response.json();
    return { prediction, predictionType };
  }

  /**
   * Execute delay node
   */
  private async executeDelayNode(
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const { duration, unit } = node.config;

    let ms = duration;
    if (unit === 'minutes') ms *= 60 * 1000;
    else if (unit === 'hours') ms *= 60 * 60 * 1000;
    else if (unit === 'days') ms *= 24 * 60 * 60 * 1000;

    // In production, this would schedule a delayed job
    await new Promise(resolve => setTimeout(resolve, ms));

    return { delayed: true, duration, unit };
  }

  /**
   * Execute API call node
   */
  private async executeAPICallNode(
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const { url, method, headers, body } = node.config;

    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { api_response: data, status: response.status };
  }

  /**
   * Execute parallel node (runs multiple branches)
   */
  private async executeParallelNode(
    node: WorkflowNode,
    instance: WorkflowInstance,
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[]
  ): Promise<Record<string, any>> {
    const branches = await this.getNextNodes(node, allNodes, allEdges, instance.context);

    const results = await Promise.all(
      branches.map(branch => this.executeNode(instance, branch, allNodes, allEdges))
    );

    return { parallel_results: results };
  }

  /**
   * Get next nodes based on edges and conditions
   */
  private async getNextNodes(
    currentNode: WorkflowNode,
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[],
    context: Record<string, any>
  ): Promise<WorkflowNode[]> {
    const outgoingEdges = allEdges.filter(e => e.source === currentNode.id);

    const nextNodes: WorkflowNode[] = [];

    for (const edge of outgoingEdges) {
      // Check condition if exists
      if (edge.condition) {
        if (!this.evaluateCondition({ expression: edge.condition }, context)) {
          continue;
        }
      }

      const nextNode = allNodes.find(n => n.id === edge.target);
      if (nextNode) {
        nextNodes.push(nextNode);
      }
    }

    return nextNodes;
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(
    condition: { expression?: string; field?: string; operator?: string; value?: any },
    context: Record<string, any>
  ): boolean {
    if (condition.expression) {
      // Simple expression evaluation (in production, use a safe eval library)
      try {
        const func = new Function('context', `return ${condition.expression}`);
        return func(context);
      } catch {
        return false;
      }
    }

    if (condition.field && condition.operator && condition.value !== undefined) {
      const fieldValue = context[condition.field];
      switch (condition.operator) {
        case '==': return fieldValue == condition.value;
        case '===': return fieldValue === condition.value;
        case '!=': return fieldValue != condition.value;
        case '>': return fieldValue > condition.value;
        case '<': return fieldValue < condition.value;
        case '>=': return fieldValue >= condition.value;
        case '<=': return fieldValue <= condition.value;
        default: return false;
      }
    }

    return true;
  }

  /**
   * Resume workflow after approval
   */
  async resumeWorkflow(
    instanceId: string,
    approved: boolean,
    comments?: string
  ): Promise<void> {
    const { data: instance, error } = await this.supabase
      .from('workflow_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error || !instance) {
      throw new Error('Workflow instance not found');
    }

    if (instance.status !== 'paused') {
      throw new Error('Workflow is not paused');
    }

    // Update approval
    await this.supabase
      .from('workflow_approvals')
      .update({
        status: approved ? 'approved' : 'rejected',
        comments,
        responded_at: new Date(),
      })
      .eq('instance_id', instanceId)
      .eq('status', 'pending');

    if (!approved) {
      // Workflow rejected
      await this.supabase
        .from('workflow_instances')
        .update({
          status: 'cancelled',
          completed_at: new Date(),
        })
        .eq('id', instanceId);
      return;
    }

    // Continue workflow
    const { data: workflow } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', instance.workflow_id)
      .single();

    if (workflow) {
      const workflowInstance: WorkflowInstance = {
        id: instance.id,
        workflowId: instance.workflow_id,
        workflowVersion: instance.workflow_version,
        tenantId: instance.tenant_id,
        status: 'running',
        startedAt: new Date(instance.started_at),
        currentNodeId: instance.current_node_id,
        context: instance.context,
        claimId: instance.claim_id,
        initiatedBy: instance.initiated_by,
        executionPath: instance.execution_path,
      };

      await this.executeWorkflow(workflowInstance, workflow);
    }
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(instanceId: string): Promise<void> {
    await this.supabase
      .from('workflow_instances')
      .update({
        status: 'cancelled',
        completed_at: new Date(),
      })
      .eq('id', instanceId);
  }

  /**
   * Helper methods for database operations
   */
  private async updateInstance(instance: WorkflowInstance): Promise<void> {
    await this.supabase
      .from('workflow_instances')
      .update({
        status: instance.status,
        current_node_id: instance.currentNodeId,
        context: instance.context,
        execution_path: instance.executionPath,
        error: instance.error,
        completed_at: instance.completedAt,
      })
      .eq('id', instance.id);
  }

  private async createNodeExecution(execution: NodeExecution): Promise<void> {
    await this.supabase.from('workflow_node_executions').insert({
      id: execution.id,
      instance_id: execution.instanceId,
      node_id: execution.nodeId,
      node_name: execution.nodeName,
      status: execution.status,
      started_at: execution.startedAt,
      input: execution.input,
      retry_count: execution.retryCount,
      assigned_to: execution.assignedTo,
    });
  }

  private async updateNodeExecution(execution: NodeExecution): Promise<void> {
    await this.supabase
      .from('workflow_node_executions')
      .update({
        status: execution.status,
        completed_at: execution.completedAt,
        output: execution.output,
        error: execution.error,
      })
      .eq('id', execution.id);
  }
}
