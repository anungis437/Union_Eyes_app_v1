import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { WorkflowExecutionEngine } from './engine/executor.js';
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  createFromTemplate,
} from './templates/index.js';
import {
  workflowDefinitionSchema,
  startWorkflowSchema,
  approvalResponseSchema,
} from './types/workflow.js';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const app = express();
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
const executor = new WorkflowExecutionEngine();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    tenantId: req.headers['x-tenant-id'],
  });
  next();
});

// Authentication middleware
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = decoded;
    req.tenantId = req.headers['x-tenant-id'] as string || decoded.tenant_id;
    
    next();
  } catch (error) {
    logger.error('Authentication failed', { error });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      tenantId?: string;
    }
  }
}

// ============================================================================
// WORKFLOW DEFINITION ROUTES
// ============================================================================

/**
 * GET /api/workflows - List all workflows for tenant
 */
app.get('/api/workflows', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ workflows: data });
  } catch (error: any) {
    logger.error('Failed to list workflows', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id - Get workflow by ID
 */
app.get('/api/workflows/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(data);
  } catch (error: any) {
    logger.error('Failed to get workflow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows - Create new workflow
 */
app.post('/api/workflows', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = workflowDefinitionSchema.parse(req.body);

    const workflow = {
      id: nanoid(),
      ...validated,
      tenant_id: req.tenantId,
      created_by: req.user.id,
      version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const { data, error } = await supabase
      .from('workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    logger.error('Failed to create workflow', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/workflows/:id - Update workflow
 */
app.put('/api/workflows/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = workflowDefinitionSchema.parse(req.body);

    // Get current version
    const { data: current } = await supabase
      .from('workflows')
      .select('version')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    const { data, error } = await supabase
      .from('workflows')
      .update({
        ...validated,
        version: (current?.version || 0) + 1,
        updated_at: new Date(),
      })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    logger.error('Failed to update workflow', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id - Delete workflow
 */
app.delete('/api/workflows/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete workflow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WORKFLOW EXECUTION ROUTES
// ============================================================================

/**
 * POST /api/workflows/:id/start - Start workflow execution
 */
app.post('/api/workflows/:id/start', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = startWorkflowSchema.parse({
      workflowId: req.params.id,
      ...req.body,
    });

    const instance = await executor.startWorkflow(
      validated.workflowId,
      req.tenantId!,
      req.user.id,
      validated.context,
      validated.claimId
    );

    res.status(201).json(instance);
  } catch (error: any) {
    logger.error('Failed to start workflow', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/workflow-instances - List workflow instances
 */
app.get('/api/workflow-instances', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, workflowId, claimId } = req.query;

    let query = supabase
      .from('workflow_instances')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('started_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (workflowId) query = query.eq('workflow_id', workflowId);
    if (claimId) query = query.eq('claim_id', claimId);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ instances: data });
  } catch (error: any) {
    logger.error('Failed to list instances', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflow-instances/:id - Get instance details
 */
app.get('/api/workflow-instances/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (instanceError) throw instanceError;
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    // Get node executions
    const { data: executions, error: executionsError } = await supabase
      .from('workflow_node_executions')
      .select('*')
      .eq('instance_id', req.params.id)
      .order('started_at', { ascending: true });

    if (executionsError) throw executionsError;

    res.json({
      ...instance,
      executions,
    });
  } catch (error: any) {
    logger.error('Failed to get instance', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflow-instances/:id/cancel - Cancel workflow
 */
app.post('/api/workflow-instances/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    await executor.cancelWorkflow(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to cancel workflow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// APPROVAL ROUTES
// ============================================================================

/**
 * GET /api/approvals - List pending approvals for user
 */
app.get('/api/approvals', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('workflow_approvals')
      .select(`
        *,
        workflow_instances!inner(workflow_id, context, claim_id)
      `)
      .eq('tenant_id', req.tenantId)
      .eq('requested_from', req.user.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;

    res.json({ approvals: data });
  } catch (error: any) {
    logger.error('Failed to list approvals', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/approvals/:id/respond - Respond to approval request
 */
app.post('/api/approvals/:id/respond', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = approvalResponseSchema.parse(req.body);

    // Get approval
    const { data: approval, error: approvalError } = await supabase
      .from('workflow_approvals')
      .select('*')
      .eq('id', req.params.id)
      .eq('requested_from', req.user.id)
      .single();

    if (approvalError) throw approvalError;
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    // Resume workflow
    await executor.resumeWorkflow(
      approval.instance_id,
      validated.approved,
      validated.comments
    );

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to respond to approval', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/workflow-templates - List all templates
 */
app.get('/api/workflow-templates', authenticate, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let templates = getAllTemplates();

    if (category) {
      templates = getTemplatesByCategory(category as string);
    }

    res.json({ templates });
  } catch (error: any) {
    logger.error('Failed to list templates', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflow-templates/:id - Get template by ID
 */
app.get('/api/workflow-templates/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    logger.error('Failed to get template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflow-templates/:id/create - Create workflow from template
 */
app.post('/api/workflow-templates/:id/create', authenticate, async (req: Request, res: Response) => {
  try {
    const workflow = createFromTemplate(
      req.params.id,
      req.tenantId!,
      req.user.id,
      req.body.customizations
    );

    const { data, error } = await supabase
      .from('workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error: any) {
    logger.error('Failed to create from template', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/workflows/:id/analytics - Get workflow analytics
 */
app.get('/api/workflows/:id/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: instances, error } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('workflow_id', req.params.id)
      .eq('tenant_id', req.tenantId);

    if (error) throw error;

    const totalExecutions = instances.length;
    const successfulExecutions = instances.filter(i => i.status === 'completed').length;
    const failedExecutions = instances.filter(i => i.status === 'failed').length;

    const completedInstances = instances.filter(i => i.status === 'completed' && i.started_at && i.completed_at);
    const averageExecutionTime = completedInstances.length > 0
      ? completedInstances.reduce((sum, i) => {
          const duration = new Date(i.completed_at).getTime() - new Date(i.started_at).getTime();
          return sum + duration;
        }, 0) / completedInstances.length
      : 0;

    // Get node executions for performance analysis
    const { data: executions } = await supabase
      .from('workflow_node_executions')
      .select('node_id, node_name, status, started_at, completed_at')
      .in('instance_id', instances.map(i => i.id));

    const nodePerformance = executions ? Object.values(
      executions.reduce((acc: any, exec) => {
        if (!acc[exec.node_id]) {
          acc[exec.node_id] = {
            nodeId: exec.node_id,
            nodeName: exec.node_name,
            executions: [],
            failures: 0,
          };
        }
        if (exec.started_at && exec.completed_at) {
          const duration = new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
          acc[exec.node_id].executions.push(duration);
        }
        if (exec.status === 'failed') {
          acc[exec.node_id].failures++;
        }
        return acc;
      }, {})
    ).map((node: any) => ({
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      avgExecutionTime: node.executions.length > 0
        ? node.executions.reduce((a: number, b: number) => a + b, 0) / node.executions.length
        : 0,
      failureRate: node.executions.length > 0
        ? node.failures / node.executions.length
        : 0,
    })) : [];

    res.json({
      workflowId: req.params.id,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      nodePerformance,
    });
  } catch (error: any) {
    logger.error('Failed to get analytics', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/overview - Overall workflow analytics
 */
app.get('/api/analytics/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const { data: instances, error } = await supabase
      .from('workflow_instances')
      .select('workflow_id, status, started_at, completed_at')
      .eq('tenant_id', req.tenantId);

    if (error) throw error;

    const activeWorkflows = new Set(instances.map(i => i.workflow_id)).size;
    const totalExecutions = instances.length;
    const runningExecutions = instances.filter(i => i.status === 'running').length;
    const pausedExecutions = instances.filter(i => i.status === 'paused').length;

    const completedToday = instances.filter(i => {
      if (!i.completed_at) return false;
      const completedDate = new Date(i.completed_at);
      const today = new Date();
      return completedDate.toDateString() === today.toDateString();
    }).length;

    res.json({
      activeWorkflows,
      totalExecutions,
      runningExecutions,
      pausedExecutions,
      completedToday,
    });
  } catch (error: any) {
    logger.error('Failed to get overview', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'workflow-service',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Workflow service started on port ${PORT}`);
});

export default app;
