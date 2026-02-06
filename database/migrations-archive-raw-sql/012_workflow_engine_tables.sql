-- ============================================================================
-- Migration 012: Workflow Engine Tables
-- ============================================================================
-- Description: Database schema for workflow engine system
-- Date: January 2025
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- WORKFLOWS TABLE
-- Stores workflow definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL CHECK (category IN ('claim-processing', 'approval', 'notification', 'custom')),
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  variables JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for workflows
CREATE INDEX idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_active ON workflows(is_active);
CREATE INDEX idx_workflows_template ON workflows(is_template);
CREATE INDEX idx_workflows_created_by ON workflows(created_by);

-- ============================================================================
-- WORKFLOW_INSTANCES TABLE
-- Stores workflow execution instances
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version INTEGER NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  current_node_id TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  execution_path TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  error TEXT,
  claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  initiated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_instances
CREATE INDEX idx_workflow_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_tenant ON workflow_instances(tenant_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_claim ON workflow_instances(claim_id);
CREATE INDEX idx_workflow_instances_initiated ON workflow_instances(initiated_by);
CREATE INDEX idx_workflow_instances_started ON workflow_instances(started_at);

-- ============================================================================
-- WORKFLOW_NODE_EXECUTIONS TABLE
-- Stores individual node execution records
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_node_executions (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_node_executions
CREATE INDEX idx_node_executions_instance ON workflow_node_executions(instance_id);
CREATE INDEX idx_node_executions_node ON workflow_node_executions(node_id);
CREATE INDEX idx_node_executions_status ON workflow_node_executions(status);
CREATE INDEX idx_node_executions_assigned ON workflow_node_executions(assigned_to);
CREATE INDEX idx_node_executions_started ON workflow_node_executions(started_at);

-- ============================================================================
-- WORKFLOW_TRIGGERS TABLE
-- Stores workflow trigger configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_triggers (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('manual', 'event', 'schedule', 'webhook')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_triggers
CREATE INDEX idx_workflow_triggers_workflow ON workflow_triggers(workflow_id);
CREATE INDEX idx_workflow_triggers_tenant ON workflow_triggers(tenant_id);
CREATE INDEX idx_workflow_triggers_type ON workflow_triggers(type);
CREATE INDEX idx_workflow_triggers_active ON workflow_triggers(is_active);

-- ============================================================================
-- WORKFLOW_APPROVALS TABLE
-- Stores approval requests and responses
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_approvals (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  node_execution_id TEXT NOT NULL REFERENCES workflow_node_executions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  requested_from UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  message TEXT,
  comments TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  claim_id UUID REFERENCES claims(id) ON DELETE SET NULL
);

-- Indexes for workflow_approvals
CREATE INDEX idx_workflow_approvals_instance ON workflow_approvals(instance_id);
CREATE INDEX idx_workflow_approvals_node_exec ON workflow_approvals(node_execution_id);
CREATE INDEX idx_workflow_approvals_tenant ON workflow_approvals(tenant_id);
CREATE INDEX idx_workflow_approvals_requested_from ON workflow_approvals(requested_from);
CREATE INDEX idx_workflow_approvals_status ON workflow_approvals(status);
CREATE INDEX idx_workflow_approvals_claim ON workflow_approvals(claim_id);

-- ============================================================================
-- WORKFLOW_EVENTS TABLE
-- Stores workflow event log for audit and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id TEXT REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_id TEXT REFERENCES workflows(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')) DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_events
CREATE INDEX idx_workflow_events_tenant ON workflow_events(tenant_id);
CREATE INDEX idx_workflow_events_instance ON workflow_events(instance_id);
CREATE INDEX idx_workflow_events_workflow ON workflow_events(workflow_id);
CREATE INDEX idx_workflow_events_type ON workflow_events(event_type);
CREATE INDEX idx_workflow_events_created ON workflow_events(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_node_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY workflows_tenant_isolation ON workflows
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Workflow instances policies
CREATE POLICY workflow_instances_tenant_isolation ON workflow_instances
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Node executions policies (through instance)
CREATE POLICY workflow_node_executions_tenant_isolation ON workflow_node_executions
  FOR ALL
  USING (
    instance_id IN (
      SELECT id FROM workflow_instances 
      WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
    )
  );

-- Triggers policies
CREATE POLICY workflow_triggers_tenant_isolation ON workflow_triggers
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Approvals policies
CREATE POLICY workflow_approvals_tenant_isolation ON workflow_approvals
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Events policies
CREATE POLICY workflow_events_tenant_isolation ON workflow_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Active workflows view
CREATE OR REPLACE VIEW active_workflows_summary AS
SELECT 
  w.id,
  w.tenant_id,
  w.name,
  w.category,
  COUNT(DISTINCT wi.id) AS total_executions,
  COUNT(DISTINCT CASE WHEN wi.status = 'running' THEN wi.id END) AS running_executions,
  COUNT(DISTINCT CASE WHEN wi.status = 'completed' THEN wi.id END) AS completed_executions,
  COUNT(DISTINCT CASE WHEN wi.status = 'failed' THEN wi.id END) AS failed_executions,
  AVG(
    CASE 
      WHEN wi.status = 'completed' AND wi.completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))
      ELSE NULL 
    END
  ) AS avg_execution_time_seconds,
  MAX(wi.started_at) AS last_execution_at
FROM workflows w
LEFT JOIN workflow_instances wi ON w.id = wi.workflow_id
WHERE w.is_active = true
GROUP BY w.id, w.tenant_id, w.name, w.category;

-- Pending approvals view
CREATE OR REPLACE VIEW pending_approvals_summary AS
SELECT 
  wa.id,
  wa.tenant_id,
  wa.workflow_name,
  wa.requested_from,
  wa.requested_at,
  wa.claim_id,
  wi.workflow_id,
  wi.status AS instance_status,
  u.email AS approver_email,
  u.full_name AS approver_name
FROM workflow_approvals wa
JOIN workflow_instances wi ON wa.instance_id = wi.id
JOIN users u ON wa.requested_from = u.id
WHERE wa.status = 'pending';

-- Workflow performance metrics view
CREATE OR REPLACE VIEW workflow_performance_metrics AS
SELECT 
  w.id AS workflow_id,
  w.tenant_id,
  w.name AS workflow_name,
  COUNT(DISTINCT wi.id) AS total_executions,
  COUNT(DISTINCT CASE WHEN wi.status = 'completed' THEN wi.id END) AS successful_count,
  COUNT(DISTINCT CASE WHEN wi.status = 'failed' THEN wi.id END) AS failed_count,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN wi.status = 'completed' THEN wi.id END) / 
    NULLIF(COUNT(DISTINCT wi.id), 0), 
    2
  ) AS success_rate_percentage,
  AVG(
    CASE 
      WHEN wi.status = 'completed' AND wi.completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))
      ELSE NULL 
    END
  ) AS avg_execution_time_seconds,
  MIN(wi.started_at) AS first_execution,
  MAX(wi.started_at) AS last_execution
FROM workflows w
LEFT JOIN workflow_instances wi ON w.id = wi.workflow_id
GROUP BY w.id, w.tenant_id, w.name;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to clean up old completed workflow instances
CREATE OR REPLACE FUNCTION cleanup_old_workflow_instances(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM workflow_instances
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get workflow execution statistics
CREATE OR REPLACE FUNCTION get_workflow_stats(workflow_id_param TEXT, tenant_id_param UUID)
RETURNS TABLE (
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  avg_duration_seconds NUMERIC,
  last_execution TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::BIGINT,
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::NUMERIC,
    MAX(started_at)
  FROM workflow_instances
  WHERE workflow_id = workflow_id_param
    AND tenant_id = tenant_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

CREATE TRIGGER workflow_triggers_updated_at
  BEFORE UPDATE ON workflow_triggers
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflows IS 'Stores workflow definitions and configurations';
COMMENT ON TABLE workflow_instances IS 'Tracks individual workflow executions';
COMMENT ON TABLE workflow_node_executions IS 'Records execution of individual workflow nodes';
COMMENT ON TABLE workflow_triggers IS 'Defines when workflows should be triggered';
COMMENT ON TABLE workflow_approvals IS 'Manages approval requests within workflows';
COMMENT ON TABLE workflow_events IS 'Audit log of workflow events';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
