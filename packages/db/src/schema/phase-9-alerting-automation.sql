-- =====================================================================================
-- PHASE 9: ALERTING & AUTOMATION SYSTEM
-- =====================================================================================
-- Purpose: Configurable alerting and workflow automation system
-- Features: Alert rules, conditions, actions, escalations, workflow automation
-- Dependencies: Core tenant system, notification infrastructure
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

CREATE TYPE alert_trigger_type AS ENUM (
  'schedule',           -- Scheduled/recurring check (cron)
  'event',             -- Triggered by system event
  'threshold',         -- Triggered when metric crosses threshold
  'manual'             -- Manually triggered by user
);

CREATE TYPE alert_condition_operator AS ENUM (
  'equals',
  'not_equals',
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
  'is_null',
  'is_not_null',
  'between',
  'regex_match'
);

CREATE TYPE alert_action_type AS ENUM (
  'send_email',
  'send_sms',
  'send_push_notification',
  'create_task',
  'update_record',
  'trigger_webhook',
  'escalate',
  'run_script',
  'send_slack_message'
);

CREATE TYPE alert_frequency AS ENUM (
  'once',              -- Fire once then disable
  'every_occurrence',  -- Fire every time condition is met
  'daily_digest',      -- Aggregate and send once daily
  'hourly_digest',     -- Aggregate and send once hourly
  'rate_limited'       -- Fire with minimum interval between occurrences
);

CREATE TYPE alert_severity AS ENUM (
  'critical',
  'high',
  'medium',
  'low',
  'info'
);

CREATE TYPE alert_execution_status AS ENUM (
  'pending',
  'running',
  'success',
  'failed',
  'skipped',
  'rate_limited'
);

CREATE TYPE escalation_status AS ENUM (
  'pending',
  'in_progress',
  'escalated',
  'resolved',
  'cancelled'
);

CREATE TYPE workflow_trigger_type AS ENUM (
  'manual',
  'schedule',
  'record_created',
  'record_updated',
  'record_deleted',
  'field_changed',
  'status_changed',
  'deadline_approaching',
  'webhook'
);

CREATE TYPE workflow_action_type AS ENUM (
  'send_notification',
  'update_field',
  'create_record',
  'delete_record',
  'call_api',
  'run_query',
  'wait_for_duration',
  'wait_for_condition',
  'branch_condition',
  'loop',
  'send_webhook'
);

CREATE TYPE workflow_execution_status AS ENUM (
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled'
);

-- =====================================================================================
-- TABLE: alert_rules
-- =====================================================================================
-- Purpose: Define configurable alert rules with triggers and conditions
-- =====================================================================================

CREATE TABLE alert_rules (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Rule Definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),                     -- contract_expiration, dues_arrears, training_deadline, etc.
  
  -- Trigger Configuration
  trigger_type alert_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL,             -- { schedule: '0 6 * * *', event: 'contract.expiring', threshold: { metric: 'dues_balance', value: 0 } }
  
  -- Alert Configuration
  severity alert_severity NOT NULL DEFAULT 'medium',
  frequency alert_frequency NOT NULL DEFAULT 'every_occurrence',
  rate_limit_minutes INTEGER,                -- Minimum minutes between executions (for rate_limited frequency)
  
  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  
  -- Execution Tracking
  last_executed_at TIMESTAMPTZ,
  last_execution_status alert_execution_status,
  execution_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_rate_limit CHECK (
    frequency != 'rate_limited' OR rate_limit_minutes IS NOT NULL
  )
);

CREATE INDEX idx_alert_rules_tenant ON alert_rules(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_alert_rules_category ON alert_rules(category) WHERE is_enabled = true AND is_deleted = false;
CREATE INDEX idx_alert_rules_trigger ON alert_rules(trigger_type) WHERE is_enabled = true AND is_deleted = false;
CREATE INDEX idx_alert_rules_next_execution ON alert_rules(last_executed_at) WHERE is_enabled = true AND is_deleted = false;

COMMENT ON TABLE alert_rules IS 'Configurable alert rules with triggers, conditions, and actions';
COMMENT ON COLUMN alert_rules.trigger_config IS 'JSON configuration for trigger (schedule cron, event name, threshold config)';
COMMENT ON COLUMN alert_rules.rate_limit_minutes IS 'Minimum minutes between alert executions to prevent spam';

-- =====================================================================================
-- TABLE: alert_conditions
-- =====================================================================================
-- Purpose: Define conditions that must be met for alert to fire
-- =====================================================================================

CREATE TABLE alert_conditions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  
  -- Condition Definition
  field_path VARCHAR(255) NOT NULL,          -- Dot notation path to field: 'contract.expiration_date', 'member.dues_balance'
  operator alert_condition_operator NOT NULL,
  value JSONB,                               -- Value to compare against (can be scalar, array, or null)
  
  -- Logical Grouping
  condition_group INTEGER NOT NULL DEFAULT 1, -- Group conditions with AND/OR logic
  is_or_condition BOOLEAN NOT NULL DEFAULT false, -- If true, OR with next condition in group; if false, AND
  
  -- Execution Order
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_conditions_rule ON alert_conditions(alert_rule_id, order_index);

COMMENT ON TABLE alert_conditions IS 'Conditions that must be met for alert rule to fire';
COMMENT ON COLUMN alert_conditions.field_path IS 'Dot notation path to field in data model';
COMMENT ON COLUMN alert_conditions.condition_group IS 'Group number for logical AND/OR grouping';
COMMENT ON COLUMN alert_conditions.is_or_condition IS 'If true, OR with next condition; if false, AND';

-- =====================================================================================
-- TABLE: alert_actions
-- =====================================================================================
-- Purpose: Define actions to execute when alert fires
-- =====================================================================================

CREATE TABLE alert_actions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  
  -- Action Definition
  action_type alert_action_type NOT NULL,
  action_config JSONB NOT NULL,              -- Configuration specific to action type
  
  -- Execution Order
  order_index INTEGER NOT NULL DEFAULT 0,
  
  -- Conditional Execution
  execute_if_condition JSONB,                -- Optional condition to execute this action
  
  -- Retry Configuration
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_actions_rule ON alert_actions(alert_rule_id, order_index);

COMMENT ON TABLE alert_actions IS 'Actions to execute when alert rule fires';
COMMENT ON COLUMN alert_actions.action_config IS 'JSON config for action (email template, webhook URL, etc.)';
COMMENT ON COLUMN alert_actions.execute_if_condition IS 'Optional condition to execute this specific action';

-- =====================================================================================
-- TABLE: alert_escalations
-- =====================================================================================
-- Purpose: Define multi-level escalation workflows
-- =====================================================================================

CREATE TABLE alert_escalations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  
  -- Escalation Definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Escalation Levels (ordered array of escalation steps)
  escalation_levels JSONB NOT NULL,          -- [{ level: 1, delay_minutes: 15, recipients: [...], actions: [...] }]
  
  -- Current State
  current_level INTEGER NOT NULL DEFAULT 1,
  status escalation_status NOT NULL DEFAULT 'pending',
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_escalation_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Resolution
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_escalations_tenant ON alert_escalations(tenant_id);
CREATE INDEX idx_alert_escalations_rule ON alert_escalations(alert_rule_id);
CREATE INDEX idx_alert_escalations_status ON alert_escalations(status, next_escalation_at) WHERE status IN ('pending', 'in_progress');

COMMENT ON TABLE alert_escalations IS 'Multi-level escalation workflows for unresolved alerts';
COMMENT ON COLUMN alert_escalations.escalation_levels IS 'Array of escalation steps with delays and actions';
COMMENT ON COLUMN alert_escalations.next_escalation_at IS 'Timestamp when next escalation level should trigger';

-- =====================================================================================
-- TABLE: alert_executions
-- =====================================================================================
-- Purpose: Track alert rule executions and results
-- =====================================================================================

CREATE TABLE alert_executions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  
  -- Execution Context
  triggered_by alert_trigger_type NOT NULL,
  trigger_data JSONB,                        -- Context data that triggered the alert
  
  -- Execution Status
  status alert_execution_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Results
  conditions_met BOOLEAN,
  conditions_evaluated JSONB,                -- Results of each condition evaluation
  actions_executed JSONB,                    -- Results of each action execution
  
  -- Error Handling
  error_message TEXT,
  error_details JSONB,
  
  -- Performance
  execution_time_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_executions_rule ON alert_executions(alert_rule_id, created_at DESC);
CREATE INDEX idx_alert_executions_status ON alert_executions(status, started_at);
CREATE INDEX idx_alert_executions_created ON alert_executions(created_at DESC);

COMMENT ON TABLE alert_executions IS 'Historical record of alert rule executions';
COMMENT ON COLUMN alert_executions.conditions_evaluated IS 'Detailed results of condition evaluation';
COMMENT ON COLUMN alert_executions.actions_executed IS 'Detailed results of action execution';

-- =====================================================================================
-- TABLE: workflow_definitions
-- =====================================================================================
-- Purpose: Define automated workflows with triggers and actions
-- =====================================================================================

CREATE TABLE workflow_definitions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Workflow Definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Trigger Configuration
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL,             -- Configuration for trigger
  
  -- Workflow Steps (ordered array)
  workflow_steps JSONB NOT NULL,             -- [{ step: 1, type: 'send_notification', config: {...}, conditions: [...] }]
  
  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Execution Tracking
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_definitions_tenant ON workflow_definitions(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_workflow_definitions_trigger ON workflow_definitions(trigger_type) WHERE is_enabled = true AND is_deleted = false;
CREATE INDEX idx_workflow_definitions_category ON workflow_definitions(category) WHERE is_enabled = true AND is_deleted = false;

COMMENT ON TABLE workflow_definitions IS 'Automated workflow definitions with triggers and action steps';
COMMENT ON COLUMN workflow_definitions.workflow_steps IS 'Ordered array of workflow steps with actions and conditions';
COMMENT ON COLUMN workflow_definitions.version IS 'Version number for workflow definition changes';

-- =====================================================================================
-- TABLE: workflow_executions
-- =====================================================================================
-- Purpose: Track workflow executions and step progress
-- =====================================================================================

CREATE TABLE workflow_executions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Execution Context
  triggered_by workflow_trigger_type NOT NULL,
  trigger_data JSONB,
  
  -- Execution Status
  status workflow_execution_status NOT NULL DEFAULT 'pending',
  current_step INTEGER NOT NULL DEFAULT 1,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  
  -- Results
  step_results JSONB,                        -- Results of each step execution
  variables JSONB,                           -- Workflow variables (for passing data between steps)
  
  -- Error Handling
  error_message TEXT,
  error_details JSONB,
  failed_step INTEGER,
  
  -- Performance
  total_execution_time_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_definition_id, created_at DESC);
CREATE INDEX idx_workflow_executions_tenant ON workflow_executions(tenant_id, status);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status, started_at) WHERE status IN ('pending', 'running', 'paused');

COMMENT ON TABLE workflow_executions IS 'Historical record and active tracking of workflow executions';
COMMENT ON COLUMN workflow_executions.step_results IS 'Results of each workflow step execution';
COMMENT ON COLUMN workflow_executions.variables IS 'Workflow variables for passing data between steps';

-- =====================================================================================
-- TABLE: alert_recipients
-- =====================================================================================
-- Purpose: Define who should receive alerts
-- =====================================================================================

CREATE TABLE alert_recipients (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  
  -- Recipient Definition
  recipient_type VARCHAR(50) NOT NULL,       -- 'user', 'role', 'email', 'phone', 'webhook'
  recipient_id UUID,                         -- Profile ID or role ID (if applicable)
  recipient_value VARCHAR(255),              -- Email, phone, or webhook URL
  
  -- Delivery Preferences
  delivery_methods VARCHAR(50)[] NOT NULL DEFAULT ARRAY['email'], -- ['email', 'sms', 'push']
  quiet_hours_start TIME,                    -- Don't send during quiet hours
  quiet_hours_end TIME,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_recipients_rule ON alert_recipients(alert_rule_id);
CREATE INDEX idx_alert_recipients_type ON alert_recipients(recipient_type, recipient_id);

COMMENT ON TABLE alert_recipients IS 'Recipients who should receive alert notifications';
COMMENT ON COLUMN alert_recipients.quiet_hours_start IS 'Start of quiet hours (no notifications)';

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_recipients ENABLE ROW LEVEL SECURITY;

-- Alert Rules Policies
CREATE POLICY alert_rules_tenant_isolation ON alert_rules
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY alert_rules_select ON alert_rules
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND is_deleted = false
  );

CREATE POLICY alert_rules_insert ON alert_rules
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND created_by = auth.uid()
  );

CREATE POLICY alert_rules_update ON alert_rules
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
  );

CREATE POLICY alert_rules_delete ON alert_rules
  FOR DELETE USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
  );

-- Alert Conditions Policies (inherit from parent alert rule)
CREATE POLICY alert_conditions_access ON alert_conditions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alert_rules
      WHERE alert_rules.id = alert_conditions.alert_rule_id
      AND alert_rules.tenant_id = current_setting('app.current_tenant_id')::UUID
    )
  );

-- Alert Actions Policies (inherit from parent alert rule)
CREATE POLICY alert_actions_access ON alert_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alert_rules
      WHERE alert_rules.id = alert_actions.alert_rule_id
      AND alert_rules.tenant_id = current_setting('app.current_tenant_id')::UUID
    )
  );

-- Alert Escalations Policies
CREATE POLICY alert_escalations_tenant_isolation ON alert_escalations
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Alert Executions Policies (inherit from parent alert rule)
CREATE POLICY alert_executions_access ON alert_executions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alert_rules
      WHERE alert_rules.id = alert_executions.alert_rule_id
      AND alert_rules.tenant_id = current_setting('app.current_tenant_id')::UUID
    )
  );

-- Workflow Definitions Policies
CREATE POLICY workflow_definitions_tenant_isolation ON workflow_definitions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY workflow_definitions_select ON workflow_definitions
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND is_deleted = false
  );

CREATE POLICY workflow_definitions_insert ON workflow_definitions
  FOR INSERT WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id')::UUID
    AND created_by = auth.uid()
  );

CREATE POLICY workflow_definitions_update ON workflow_definitions
  FOR UPDATE USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
  );

CREATE POLICY workflow_definitions_delete ON workflow_definitions
  FOR DELETE USING (
    tenant_id = current_setting('app.current_tenant_id')::UUID
  );

-- Workflow Executions Policies
CREATE POLICY workflow_executions_tenant_isolation ON workflow_executions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Alert Recipients Policies (inherit from parent alert rule)
CREATE POLICY alert_recipients_access ON alert_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM alert_rules
      WHERE alert_rules.id = alert_recipients.alert_rule_id
      AND alert_rules.tenant_id = current_setting('app.current_tenant_id')::UUID
    )
  );

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update alert_rules.updated_at on modification
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update alert_escalations.updated_at on modification
CREATE TRIGGER update_alert_escalations_updated_at
  BEFORE UPDATE ON alert_escalations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update workflow_definitions.updated_at on modification
CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update workflow_executions.updated_at on modification
CREATE TRIGGER update_workflow_executions_updated_at
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update alert rule execution statistics
CREATE OR REPLACE FUNCTION update_alert_rule_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE alert_rules
    SET 
      last_executed_at = NEW.completed_at,
      last_execution_status = 'success',
      execution_count = execution_count + 1,
      success_count = success_count + 1
    WHERE id = NEW.alert_rule_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE alert_rules
    SET 
      last_executed_at = NEW.completed_at,
      last_execution_status = 'failed',
      execution_count = execution_count + 1,
      failure_count = failure_count + 1
    WHERE id = NEW.alert_rule_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alert_rule_execution_stats
  AFTER UPDATE OF status ON alert_executions
  FOR EACH ROW
  WHEN (NEW.status IN ('success', 'failed') AND OLD.status != NEW.status)
  EXECUTE FUNCTION update_alert_rule_stats();

-- Update workflow definition execution statistics
CREATE OR REPLACE FUNCTION update_workflow_definition_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE workflow_definitions
    SET 
      last_executed_at = NEW.completed_at,
      execution_count = execution_count + 1,
      success_count = success_count + 1
    WHERE id = NEW.workflow_definition_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE workflow_definitions
    SET 
      last_executed_at = NEW.completed_at,
      execution_count = execution_count + 1,
      failure_count = failure_count + 1
    WHERE id = NEW.workflow_definition_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_definition_execution_stats
  AFTER UPDATE OF status ON workflow_executions
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status)
  EXECUTE FUNCTION update_workflow_definition_stats();

-- =====================================================================================
-- GRANTS
-- =====================================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_conditions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_escalations TO authenticated;
GRANT SELECT, INSERT ON alert_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON workflow_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_recipients TO authenticated;

-- =====================================================================================
-- SAMPLE DATA / COMMON ALERT RULE TEMPLATES
-- =====================================================================================

COMMENT ON SCHEMA public IS 'Common alert rule templates:

1. CONTRACT EXPIRATION ALERT
   - Trigger: Schedule (daily 6 AM)
   - Conditions: contract.expiration_date BETWEEN NOW() AND NOW() + 90 days
   - Actions: Send email to bargaining team, Create task for negotiators
   - Escalation: 60 days (medium), 30 days (high), 7 days (critical)

2. DUES ARREARS ALERT
   - Trigger: Event (payment_failed)
   - Conditions: member.dues_balance < 0 AND member.arrears_months >= 3
   - Actions: Send email to member, Send SMS reminder, Flag account
   - Escalation: 3 months (info), 4 months (warning), 5 months (critical)

3. TRAINING CERTIFICATION EXPIRY
   - Trigger: Schedule (daily 6 AM)
   - Conditions: certification.expiration_date BETWEEN NOW() AND NOW() + 30 days
   - Actions: Send email to member, Send email to training coordinator
   - Escalation: 30 days (info), 14 days (warning), 7 days (critical)

4. GRIEVANCE DEADLINE ALERT
   - Trigger: Schedule (daily 8 AM)
   - Conditions: grievance.deadline BETWEEN NOW() AND NOW() + 3 days
   - Actions: Send email to steward, Send SMS to grievance officer, Create urgent task
   - Escalation: 3 days (warning), 1 day (critical), past deadline (urgent)

5. MEMBER ENGAGEMENT DROP
   - Trigger: Threshold (engagement_score < 40)
   - Conditions: member.engagement_score < 40 AND member.last_activity > 60 days ago
   - Actions: Send re-engagement email, Assign to membership coordinator
   - Frequency: Once per member per month

6. ORGANIZING CARD SIGNING MILESTONE
   - Trigger: Threshold (card_percentage >= 50)
   - Conditions: campaign.signed_cards / campaign.target_cards >= 0.5
   - Actions: Send celebration email to organizers, Update campaign status
   - Frequency: Once per milestone

7. STRIKE FUND LOW BALANCE
   - Trigger: Threshold (fund_balance < 10000)
   - Conditions: strike_fund.balance < 10000 AND strike_fund.is_active = true
   - Actions: Send alert to treasurer, Create fundraising task
   - Escalation: <$10k (warning), <$5k (critical), <$1k (urgent)

8. MEMBER ONBOARDING INCOMPLETE
   - Trigger: Schedule (daily 10 AM)
   - Conditions: member.created_at > 7 days ago AND member.onboarding_complete = false
   - Actions: Send reminder email, Assign to membership coordinator
   - Frequency: Weekly until complete
';
