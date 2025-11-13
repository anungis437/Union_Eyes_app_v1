-- ============================================================================
-- Workflow Automation System - Database Schema
-- ============================================================================
-- 
-- Tables:
-- - workflows: Workflow definitions
-- - workflow_executions: Execution history and state
-- - workflow_webhooks: Webhook triggers
-- - workflow_analytics: Workflow performance metrics
--
-- Features:
-- - Full workflow lifecycle management
-- - Execution tracking and history
-- - Webhook integration
-- - Performance analytics
-- - Multi-tenancy with RLS
-- - Audit trail
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ============================================================================
-- Workflows Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
        CONSTRAINT workflows_status_check CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    
    -- Workflow definition (JSONB for flexibility)
    trigger JSONB NOT NULL,
        -- { type, config, conditions }
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
        -- [{ id, type, config, conditions, onSuccess, onFailure, retryConfig }]
    variables JSONB DEFAULT '{}'::jsonb,
        -- Default workflow variables
    metadata JSONB DEFAULT '{}'::jsonb,
        -- Additional metadata (tags, category, etc.)
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT workflows_name_org_unique UNIQUE (organization_id, name)
);

-- Indexes
CREATE INDEX idx_workflows_organization ON workflows(organization_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_trigger_type ON workflows((trigger->>'type'));
CREATE INDEX idx_workflows_created_by ON workflows(created_by);
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX idx_workflows_name_search ON workflows USING gin(name gin_trgm_ops);

-- Full-text search on name and description
CREATE INDEX idx_workflows_fulltext ON workflows USING gin(
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- ============================================================================
-- Workflow Executions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR(255) PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Execution state
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
        CONSTRAINT executions_status_check CHECK (
            status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused')
        ),
    
    -- Execution context (JSONB)
    context JSONB NOT NULL,
        -- { executionId, workflowId, organizationId, triggeredBy, triggeredAt, triggerData, variables, state }
    
    -- Action execution history
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
        -- [{ actionId, status, startedAt, completedAt, attempts, result, error, duration }]
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration INTEGER, -- milliseconds
    
    -- Error info
    error TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_organization ON workflow_executions(organization_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_executions_started_at ON workflow_executions(started_at DESC);
CREATE INDEX idx_executions_triggered_by ON workflow_executions((context->>'triggeredBy'));

-- Composite index for workflow status queries
CREATE INDEX idx_executions_workflow_status ON workflow_executions(workflow_id, status, started_at DESC);

-- ============================================================================
-- Workflow Webhooks Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_webhooks (
    id VARCHAR(255) PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Webhook config
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Stats
    total_calls INTEGER NOT NULL DEFAULT 0,
    successful_calls INTEGER NOT NULL DEFAULT 0,
    failed_calls INTEGER NOT NULL DEFAULT 0,
    last_called_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhooks_workflow ON workflow_webhooks(workflow_id);
CREATE INDEX idx_webhooks_organization ON workflow_webhooks(organization_id);
CREATE INDEX idx_webhooks_enabled ON workflow_webhooks(enabled);

-- ============================================================================
-- Workflow Analytics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Time period
    date DATE NOT NULL,
    hour INTEGER, -- 0-23 for hourly stats, NULL for daily
    
    -- Execution metrics
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    cancelled_executions INTEGER NOT NULL DEFAULT 0,
    
    -- Performance metrics
    avg_duration_ms INTEGER,
    min_duration_ms INTEGER,
    max_duration_ms INTEGER,
    p50_duration_ms INTEGER,
    p95_duration_ms INTEGER,
    p99_duration_ms INTEGER,
    
    -- Action metrics
    total_actions_executed INTEGER NOT NULL DEFAULT 0,
    failed_actions INTEGER NOT NULL DEFAULT 0,
    avg_actions_per_execution DECIMAL(10,2),
    
    -- Created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT workflow_analytics_unique UNIQUE (workflow_id, date, hour)
);

-- Indexes
CREATE INDEX idx_analytics_workflow ON workflow_analytics(workflow_id);
CREATE INDEX idx_analytics_organization ON workflow_analytics(organization_id);
CREATE INDEX idx_analytics_date ON workflow_analytics(date DESC);
CREATE INDEX idx_analytics_workflow_date ON workflow_analytics(workflow_id, date DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY workflows_org_isolation ON workflows
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Executions policies
CREATE POLICY executions_org_isolation ON workflow_executions
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Webhooks policies
CREATE POLICY webhooks_org_isolation ON workflow_webhooks
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Analytics policies
CREATE POLICY analytics_org_isolation ON workflow_analytics
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- ============================================================================
-- Functions
-- ============================================================================

-- Update workflow timestamp
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_timestamp();

-- Update webhook timestamp
CREATE OR REPLACE FUNCTION update_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhooks_updated_at
    BEFORE UPDATE ON workflow_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_timestamp();

-- Calculate execution metrics
CREATE OR REPLACE FUNCTION calculate_execution_metrics(
    p_workflow_id UUID,
    p_date DATE,
    p_hour INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_total INTEGER;
    v_successful INTEGER;
    v_failed INTEGER;
    v_cancelled INTEGER;
    v_avg_duration INTEGER;
    v_min_duration INTEGER;
    v_max_duration INTEGER;
    v_total_actions INTEGER;
    v_failed_actions INTEGER;
BEGIN
    -- Get execution counts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        AVG(duration)::INTEGER,
        MIN(duration),
        MAX(duration),
        SUM(jsonb_array_length(actions)),
        SUM((SELECT COUNT(*) FROM jsonb_array_elements(actions) a WHERE a->>'status' = 'failed'))
    INTO
        v_total,
        v_successful,
        v_failed,
        v_cancelled,
        v_avg_duration,
        v_min_duration,
        v_max_duration,
        v_total_actions,
        v_failed_actions
    FROM workflow_executions
    WHERE workflow_id = p_workflow_id
        AND started_at::DATE = p_date
        AND (p_hour IS NULL OR EXTRACT(HOUR FROM started_at) = p_hour);
    
    -- Insert or update analytics
    INSERT INTO workflow_analytics (
        workflow_id,
        organization_id,
        date,
        hour,
        total_executions,
        successful_executions,
        failed_executions,
        cancelled_executions,
        avg_duration_ms,
        min_duration_ms,
        max_duration_ms,
        total_actions_executed,
        failed_actions,
        avg_actions_per_execution
    )
    SELECT
        p_workflow_id,
        w.organization_id,
        p_date,
        p_hour,
        v_total,
        v_successful,
        v_failed,
        v_cancelled,
        v_avg_duration,
        v_min_duration,
        v_max_duration,
        v_total_actions,
        v_failed_actions,
        CASE WHEN v_total > 0 THEN v_total_actions::DECIMAL / v_total ELSE 0 END
    FROM workflows w
    WHERE w.id = p_workflow_id
    ON CONFLICT (workflow_id, date, hour)
    DO UPDATE SET
        total_executions = EXCLUDED.total_executions,
        successful_executions = EXCLUDED.successful_executions,
        failed_executions = EXCLUDED.failed_executions,
        cancelled_executions = EXCLUDED.cancelled_executions,
        avg_duration_ms = EXCLUDED.avg_duration_ms,
        min_duration_ms = EXCLUDED.min_duration_ms,
        max_duration_ms = EXCLUDED.max_duration_ms,
        total_actions_executed = EXCLUDED.total_actions_executed,
        failed_actions = EXCLUDED.failed_actions,
        avg_actions_per_execution = EXCLUDED.avg_actions_per_execution,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views
-- ============================================================================

-- Workflow summary view
CREATE OR REPLACE VIEW v_workflow_summary AS
SELECT
    w.id,
    w.organization_id,
    w.name,
    w.description,
    w.status,
    w.trigger->>'type' as trigger_type,
    jsonb_array_length(w.actions) as action_count,
    w.created_by,
    w.created_at,
    w.updated_at,
    
    -- Execution stats (last 30 days)
    COALESCE(e.total_executions, 0) as total_executions_30d,
    COALESCE(e.successful_executions, 0) as successful_executions_30d,
    COALESCE(e.failed_executions, 0) as failed_executions_30d,
    COALESCE(e.avg_duration_ms, 0) as avg_duration_ms_30d,
    
    -- Last execution
    le.started_at as last_executed_at,
    le.status as last_execution_status
FROM workflows w
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
        AVG(duration)::INTEGER as avg_duration_ms
    FROM workflow_executions
    WHERE workflow_id = w.id
        AND started_at >= NOW() - INTERVAL '30 days'
) e ON true
LEFT JOIN LATERAL (
    SELECT started_at, status
    FROM workflow_executions
    WHERE workflow_id = w.id
    ORDER BY started_at DESC
    LIMIT 1
) le ON true;

-- ============================================================================
-- Sample Data (for development/testing)
-- ============================================================================

-- Note: Uncomment to insert sample workflows

/*
INSERT INTO workflows (
    id,
    organization_id,
    name,
    description,
    status,
    trigger,
    actions,
    created_by
) VALUES (
    uuid_generate_v4(),
    (SELECT id FROM organizations LIMIT 1),
    'Document Upload Notification',
    'Notify team when new documents are uploaded',
    'active',
    '{
        "id": "trigger-1",
        "type": "document_upload",
        "config": {
            "documentTypes": ["contract", "pleading"]
        }
    }'::jsonb,
    '[
        {
            "id": "action-1",
            "type": "send_notification",
            "config": {
                "title": "New Document Uploaded",
                "message": "Document {{triggerData.documentName}} uploaded",
                "type": "info"
            }
        }
    ]'::jsonb,
    (SELECT id FROM auth.users LIMIT 1)
);
*/

-- ============================================================================
-- Grants
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_webhooks TO authenticated;
GRANT SELECT ON workflow_analytics TO authenticated;

-- Grant access to service role (for background jobs)
GRANT ALL ON workflows TO service_role;
GRANT ALL ON workflow_executions TO service_role;
GRANT ALL ON workflow_webhooks TO service_role;
GRANT ALL ON workflow_analytics TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE workflows IS 'Workflow definitions with triggers and actions';
COMMENT ON TABLE workflow_executions IS 'Workflow execution history and state';
COMMENT ON TABLE workflow_webhooks IS 'Webhook triggers for workflows';
COMMENT ON TABLE workflow_analytics IS 'Workflow performance metrics and analytics';

COMMENT ON COLUMN workflows.trigger IS 'JSONB containing trigger type, config, and conditions';
COMMENT ON COLUMN workflows.actions IS 'JSONB array of workflow actions with configs';
COMMENT ON COLUMN workflows.variables IS 'Default variables for workflow execution';
COMMENT ON COLUMN workflows.metadata IS 'Additional metadata like tags, category';

COMMENT ON COLUMN workflow_executions.context IS 'Full execution context including trigger data and variables';
COMMENT ON COLUMN workflow_executions.actions IS 'Array of action execution results';

COMMENT ON FUNCTION calculate_execution_metrics IS 'Calculate and store workflow execution metrics';
