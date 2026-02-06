-- Migration 009: Deadline Tracking & Escalation System
-- Created: November 14, 2025
-- Purpose: Proactive deadline management with automated escalation and alerts

-- ============================================================================
-- DEADLINE RULES TABLE
-- Defines deadline calculation rules per claim type and priority
-- ============================================================================
CREATE TABLE IF NOT EXISTS deadline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Rule identification
  rule_name VARCHAR(200) NOT NULL,
  rule_code VARCHAR(50) NOT NULL, -- e.g., "grievance_step_1", "arbitration_filing"
  description TEXT,
  
  -- Applicability
  claim_type VARCHAR(50), -- NULL = applies to all types
  priority_level VARCHAR(20), -- "low", "medium", "high", "critical", NULL = all
  step_number INT, -- For multi-step processes (grievance steps)
  
  -- Deadline calculation
  days_from_event INT NOT NULL, -- e.g., 30 days from filing
  event_type VARCHAR(50) NOT NULL, -- "claim_created", "status_changed", "document_received", "hearing_scheduled"
  business_days_only BOOLEAN DEFAULT FALSE, -- Exclude weekends/holidays
  
  -- Extensions
  allows_extension BOOLEAN DEFAULT TRUE,
  max_extension_days INT DEFAULT 30,
  requires_approval BOOLEAN DEFAULT FALSE,
  
  -- Escalation rules
  escalate_to_role VARCHAR(50), -- Role to escalate to when overdue
  escalation_delay_days INT DEFAULT 0, -- Days overdue before escalation
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_system_rule BOOLEAN DEFAULT FALSE, -- System rules can't be deleted
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  
  -- Constraints
  CHECK (days_from_event > 0),
  CHECK (max_extension_days >= 0),
  CHECK (escalation_delay_days >= 0),
  
  -- Unique rule per tenant/code
  UNIQUE(tenant_id, rule_code)
);

CREATE INDEX idx_deadline_rules_tenant ON deadline_rules(tenant_id);
CREATE INDEX idx_deadline_rules_active ON deadline_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_deadline_rules_type ON deadline_rules(claim_type, priority_level);

-- ============================================================================
-- CLAIM DEADLINES TABLE
-- Tracks calculated deadlines for each claim
-- ============================================================================
CREATE TABLE IF NOT EXISTS claim_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Deadline details
  deadline_rule_id UUID REFERENCES deadline_rules(id),
  deadline_name VARCHAR(200) NOT NULL, -- "File Step 2 Grievance", "Arbitration Hearing"
  deadline_type VARCHAR(50) NOT NULL, -- "filing", "response", "hearing", "settlement", "custom"
  
  -- Dates
  event_date DATE NOT NULL, -- Date the triggering event occurred
  original_deadline DATE NOT NULL, -- Calculated deadline
  current_deadline DATE NOT NULL, -- Deadline after extensions
  completed_at TIMESTAMP, -- When the action was completed
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- "pending", "completed", "missed", "extended", "waived"
  priority VARCHAR(20) DEFAULT 'medium', -- "low", "medium", "high", "critical"
  
  -- Extensions
  extension_count INT DEFAULT 0,
  total_extension_days INT DEFAULT 0,
  last_extension_date DATE,
  last_extension_reason TEXT,
  extension_approved_by UUID REFERENCES organization_members(id),
  
  -- Completion
  completed_by UUID REFERENCES organization_members(id),
  completion_notes TEXT,
  
  -- Escalation tracking
  is_overdue BOOLEAN GENERATED ALWAYS AS (
    status = 'pending' AND current_deadline < CURRENT_DATE
  ) STORED,
  days_until_due INT GENERATED ALWAYS AS (
    CASE 
      WHEN status = 'pending' THEN current_deadline - CURRENT_DATE
      ELSE NULL
    END
  ) STORED,
  days_overdue INT GENERATED ALWAYS AS (
    CASE 
      WHEN status = 'pending' AND current_deadline < CURRENT_DATE 
      THEN CURRENT_DATE - current_deadline
      ELSE 0
    END
  ) STORED,
  
  escalated_at TIMESTAMP,
  escalated_to UUID REFERENCES organization_members(id),
  escalation_reason TEXT,
  
  -- Alerts sent
  alert_sent_at TIMESTAMP,
  alert_count INT DEFAULT 0,
  last_alert_sent TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  
  -- Constraints
  CHECK (status IN ('pending', 'completed', 'missed', 'extended', 'waived')),
  CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CHECK (current_deadline >= original_deadline OR extension_count > 0),
  CHECK (extension_count >= 0),
  CHECK (total_extension_days >= 0)
);

-- Indexes for performance
CREATE INDEX idx_claim_deadlines_claim ON claim_deadlines(claim_id);
CREATE INDEX idx_claim_deadlines_tenant ON claim_deadlines(tenant_id);
CREATE INDEX idx_claim_deadlines_status ON claim_deadlines(status);
CREATE INDEX idx_claim_deadlines_overdue ON claim_deadlines(is_overdue) WHERE is_overdue = TRUE;
CREATE INDEX idx_claim_deadlines_upcoming ON claim_deadlines(current_deadline, status) 
  WHERE status = 'pending' AND current_deadline >= CURRENT_DATE;
CREATE INDEX idx_claim_deadlines_priority ON claim_deadlines(priority, current_deadline) 
  WHERE status = 'pending';

-- ============================================================================
-- DEADLINE EXTENSIONS TABLE
-- Tracks history of deadline extensions
-- ============================================================================
CREATE TABLE IF NOT EXISTS deadline_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id UUID NOT NULL REFERENCES claim_deadlines(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Extension request
  requested_by UUID NOT NULL REFERENCES organization_members(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  requested_days INT NOT NULL,
  request_reason TEXT NOT NULL,
  
  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending', -- "pending", "approved", "denied", "cancelled"
  requires_approval BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES organization_members(id),
  approval_decision_at TIMESTAMP,
  approval_notes TEXT,
  
  -- Extension granted
  new_deadline DATE,
  days_granted INT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  CHECK (requested_days > 0),
  CHECK (days_granted IS NULL OR days_granted > 0)
);

CREATE INDEX idx_deadline_extensions_deadline ON deadline_extensions(deadline_id);
CREATE INDEX idx_deadline_extensions_status ON deadline_extensions(status);
CREATE INDEX idx_deadline_extensions_pending ON deadline_extensions(status, requested_at) 
  WHERE status = 'pending';

-- ============================================================================
-- DEADLINE ALERTS TABLE
-- Tracks deadline alert notifications sent
-- ============================================================================
CREATE TABLE IF NOT EXISTS deadline_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deadline_id UUID NOT NULL REFERENCES claim_deadlines(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL, -- "upcoming", "due_today", "overdue", "critical"
  alert_severity VARCHAR(20) DEFAULT 'info', -- "info", "warning", "error", "critical"
  alert_trigger VARCHAR(50) NOT NULL, -- "3_days_before", "1_day_before", "day_of", "overdue"
  
  -- Recipient
  recipient_id UUID NOT NULL REFERENCES organization_members(id),
  recipient_role VARCHAR(50), -- Role at time of alert
  
  -- Delivery
  delivery_method VARCHAR(20) NOT NULL, -- "email", "sms", "in_app", "webhook"
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  delivery_status VARCHAR(20) DEFAULT 'pending', -- "pending", "sent", "delivered", "failed", "bounced"
  delivery_error TEXT,
  
  -- Interaction
  viewed_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  action_taken VARCHAR(50), -- "extended", "completed", "dismissed", "escalated"
  action_taken_at TIMESTAMP,
  
  -- Alert content
  subject TEXT,
  message TEXT,
  action_url TEXT, -- Deep link to claim
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CHECK (alert_type IN ('upcoming', 'due_today', 'overdue', 'critical', 'reminder')),
  CHECK (alert_severity IN ('info', 'warning', 'error', 'critical')),
  CHECK (delivery_method IN ('email', 'sms', 'in_app', 'webhook', 'push')),
  CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced'))
);

CREATE INDEX idx_deadline_alerts_deadline ON deadline_alerts(deadline_id);
CREATE INDEX idx_deadline_alerts_recipient ON deadline_alerts(recipient_id);
CREATE INDEX idx_deadline_alerts_status ON deadline_alerts(delivery_status);
CREATE INDEX idx_deadline_alerts_pending ON deadline_alerts(delivery_status, sent_at) 
  WHERE delivery_status IN ('pending', 'sent');
CREATE INDEX idx_deadline_alerts_unviewed ON deadline_alerts(recipient_id, viewed_at) 
  WHERE viewed_at IS NULL;

-- ============================================================================
-- HOLIDAY CALENDAR TABLE
-- Excludes holidays from business day calculations
-- ============================================================================
CREATE TABLE IF NOT EXISTS holiday_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = system-wide
  
  -- Holiday details
  holiday_date DATE NOT NULL,
  holiday_name VARCHAR(200) NOT NULL,
  holiday_type VARCHAR(50) DEFAULT 'federal', -- "federal", "state", "local", "organization"
  is_recurring BOOLEAN DEFAULT FALSE, -- Annual recurring holiday
  recurrence_rule TEXT, -- iCal RRULE for recurring holidays
  
  -- Applicability
  applies_to_region VARCHAR(100), -- US state, province, etc.
  is_observed BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  UNIQUE(tenant_id, holiday_date)
);

CREATE INDEX idx_holiday_calendar_tenant ON holiday_calendar(tenant_id);
CREATE INDEX idx_holiday_calendar_date ON holiday_calendar(holiday_date);
CREATE INDEX idx_holiday_calendar_upcoming ON holiday_calendar(holiday_date) 
  WHERE holiday_date >= CURRENT_DATE AND is_observed = TRUE;

-- ============================================================================
-- SEED DATA: Default Deadline Rules
-- ============================================================================

-- Federal grievance deadlines (common union contract timelines)
INSERT INTO deadline_rules (
  tenant_id, rule_name, rule_code, description, 
  claim_type, step_number, days_from_event, event_type,
  business_days_only, allows_extension, max_extension_days, is_system_rule
) 
SELECT 
  t.id as tenant_id,
  'Step 1 Grievance Filing' as rule_name,
  'grievance_step_1' as rule_code,
  'File initial grievance within 30 calendar days of incident' as description,
  'grievance' as claim_type,
  1 as step_number,
  30 as days_from_event,
  'claim_created' as event_type,
  FALSE as business_days_only,
  TRUE as allows_extension,
  15 as max_extension_days,
  TRUE as is_system_rule
FROM tenants t
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

INSERT INTO deadline_rules (
  tenant_id, rule_name, rule_code, description, 
  claim_type, step_number, days_from_event, event_type,
  business_days_only, allows_extension, max_extension_days, is_system_rule
) 
SELECT 
  t.id as tenant_id,
  'Step 2 Grievance Filing' as rule_name,
  'grievance_step_2' as rule_code,
  'Escalate to Step 2 within 15 business days of Step 1 denial' as description,
  'grievance' as claim_type,
  2 as step_number,
  15 as days_from_event,
  'status_changed' as event_type,
  TRUE as business_days_only,
  TRUE as allows_extension,
  10 as max_extension_days,
  TRUE as is_system_rule
FROM tenants t
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

INSERT INTO deadline_rules (
  tenant_id, rule_name, rule_code, description, 
  claim_type, step_number, days_from_event, event_type,
  business_days_only, allows_extension, max_extension_days, is_system_rule
) 
SELECT 
  t.id as tenant_id,
  'Arbitration Filing' as rule_name,
  'arbitration_filing' as rule_code,
  'File for arbitration within 30 days of final grievance denial' as description,
  'grievance' as claim_type,
  NULL as step_number,
  30 as days_from_event,
  'status_changed' as event_type,
  FALSE as business_days_only,
  FALSE as allows_extension, -- Strict deadline
  0 as max_extension_days,
  TRUE as is_system_rule
FROM tenants t
ON CONFLICT (tenant_id, rule_code) DO NOTHING;

-- ============================================================================
-- SEED DATA: US Federal Holidays 2025-2026
-- ============================================================================

INSERT INTO holiday_calendar (holiday_date, holiday_name, holiday_type, is_recurring, applies_to_region) VALUES
  -- 2025
  ('2025-01-01', 'New Year''s Day', 'federal', TRUE, 'US'),
  ('2025-01-20', 'Martin Luther King Jr. Day', 'federal', TRUE, 'US'),
  ('2025-02-17', 'Presidents'' Day', 'federal', TRUE, 'US'),
  ('2025-05-26', 'Memorial Day', 'federal', TRUE, 'US'),
  ('2025-06-19', 'Juneteenth', 'federal', TRUE, 'US'),
  ('2025-07-04', 'Independence Day', 'federal', TRUE, 'US'),
  ('2025-09-01', 'Labor Day', 'federal', TRUE, 'US'),
  ('2025-10-13', 'Columbus Day', 'federal', TRUE, 'US'),
  ('2025-11-11', 'Veterans Day', 'federal', TRUE, 'US'),
  ('2025-11-27', 'Thanksgiving Day', 'federal', TRUE, 'US'),
  ('2025-12-25', 'Christmas Day', 'federal', TRUE, 'US'),
  
  -- 2026
  ('2026-01-01', 'New Year''s Day', 'federal', TRUE, 'US'),
  ('2026-01-19', 'Martin Luther King Jr. Day', 'federal', TRUE, 'US'),
  ('2026-02-16', 'Presidents'' Day', 'federal', TRUE, 'US'),
  ('2026-05-25', 'Memorial Day', 'federal', TRUE, 'US'),
  ('2026-06-19', 'Juneteenth', 'federal', TRUE, 'US'),
  ('2026-07-03', 'Independence Day (Observed)', 'federal', TRUE, 'US'),
  ('2026-09-07', 'Labor Day', 'federal', TRUE, 'US'),
  ('2026-10-12', 'Columbus Day', 'federal', TRUE, 'US'),
  ('2026-11-11', 'Veterans Day', 'federal', TRUE, 'US'),
  ('2026-11-26', 'Thanksgiving Day', 'federal', TRUE, 'US'),
  ('2026-12-25', 'Christmas Day', 'federal', TRUE, 'US')
ON CONFLICT (tenant_id, holiday_date) DO NOTHING;

-- ============================================================================
-- FUNCTIONS: Deadline Calculation & Management
-- ============================================================================

-- Function to calculate business days between two dates
CREATE OR REPLACE FUNCTION calculate_business_days(
  start_date DATE,
  end_date DATE,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  business_days INT := 0;
  current_date DATE := start_date;
  day_of_week INT;
  is_holiday BOOLEAN;
BEGIN
  WHILE current_date <= end_date LOOP
    -- Get day of week (0=Sunday, 6=Saturday)
    day_of_week := EXTRACT(DOW FROM current_date);
    
    -- Check if it's a weekday
    IF day_of_week NOT IN (0, 6) THEN
      -- Check if it's a holiday
      SELECT EXISTS(
        SELECT 1 FROM holiday_calendar
        WHERE holiday_date = current_date
          AND is_observed = TRUE
          AND (tenant_id IS NULL OR tenant_id = p_tenant_id)
      ) INTO is_holiday;
      
      IF NOT is_holiday THEN
        business_days := business_days + 1;
      END IF;
    END IF;
    
    current_date := current_date + 1;
  END LOOP;
  
  RETURN business_days;
END;
$$ LANGUAGE plpgsql;

-- Function to add business days to a date
CREATE OR REPLACE FUNCTION add_business_days(
  start_date DATE,
  days_to_add INT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
  result_date DATE := start_date;
  days_added INT := 0;
  day_of_week INT;
  is_holiday BOOLEAN;
BEGIN
  WHILE days_added < days_to_add LOOP
    result_date := result_date + 1;
    day_of_week := EXTRACT(DOW FROM result_date);
    
    -- Check if it's a weekday
    IF day_of_week NOT IN (0, 6) THEN
      -- Check if it's a holiday
      SELECT EXISTS(
        SELECT 1 FROM holiday_calendar
        WHERE holiday_date = result_date
          AND is_observed = TRUE
          AND (tenant_id IS NULL OR tenant_id = p_tenant_id)
      ) INTO is_holiday;
      
      IF NOT is_holiday THEN
        days_added := days_added + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically mark overdue deadlines
CREATE OR REPLACE FUNCTION mark_overdue_deadlines()
RETURNS INT AS $$
DECLARE
  updated_count INT;
BEGIN
  -- Update pending deadlines that are now overdue
  WITH updated AS (
    UPDATE claim_deadlines
    SET status = 'missed',
        updated_at = NOW()
    WHERE status = 'pending'
      AND current_deadline < CURRENT_DATE
      AND completed_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update deadline alert counts
CREATE OR REPLACE FUNCTION update_deadline_alert_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE claim_deadlines
    SET alert_count = alert_count + 1,
        last_alert_sent = NEW.sent_at,
        updated_at = NOW()
    WHERE id = NEW.deadline_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deadline_alert_stats
  AFTER INSERT ON deadline_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_deadline_alert_stats();

-- Update timestamps
CREATE TRIGGER trigger_deadline_rules_updated_at
  BEFORE UPDATE ON deadline_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_claim_deadlines_updated_at
  BEFORE UPDATE ON claim_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS: Deadline Dashboards
-- ============================================================================

-- Critical deadlines view (overdue + due within 3 days)
CREATE OR REPLACE VIEW v_critical_deadlines AS
SELECT 
  cd.*,
  c.claim_number,
  c.claim_type,
  c.status as claim_status,
  c.priority as claim_priority,
  om.name as assigned_to_name,
  CASE 
    WHEN cd.is_overdue THEN 'overdue'
    WHEN cd.days_until_due = 0 THEN 'due_today'
    WHEN cd.days_until_due <= 3 THEN 'due_soon'
    ELSE 'upcoming'
  END as urgency_status
FROM claim_deadlines cd
JOIN claims c ON cd.claim_id = c.id
LEFT JOIN organization_members om ON c.assigned_to = om.id
WHERE cd.status = 'pending'
  AND cd.current_deadline <= CURRENT_DATE + INTERVAL '3 days'
ORDER BY cd.current_deadline, cd.priority DESC;

-- Deadline summary by member
CREATE OR REPLACE VIEW v_member_deadline_summary AS
SELECT 
  c.assigned_to as member_id,
  om.name as member_name,
  cd.tenant_id,
  COUNT(*) as total_deadlines,
  COUNT(*) FILTER (WHERE cd.is_overdue) as overdue_count,
  COUNT(*) FILTER (WHERE cd.days_until_due <= 3 AND cd.days_until_due >= 0) as due_soon_count,
  COUNT(*) FILTER (WHERE cd.priority = 'critical') as critical_count,
  MIN(cd.current_deadline) FILTER (WHERE cd.status = 'pending') as next_deadline
FROM claim_deadlines cd
JOIN claims c ON cd.claim_id = c.id
LEFT JOIN organization_members om ON c.assigned_to = om.id
WHERE cd.status = 'pending'
GROUP BY c.assigned_to, om.name, cd.tenant_id;

-- Deadline compliance metrics
CREATE OR REPLACE VIEW v_deadline_compliance_metrics AS
SELECT 
  cd.tenant_id,
  DATE_TRUNC('month', cd.created_at) as month,
  COUNT(*) as total_deadlines,
  COUNT(*) FILTER (WHERE cd.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE cd.status = 'missed') as missed_count,
  COUNT(*) FILTER (WHERE cd.completed_at <= cd.current_deadline) as on_time_count,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE cd.completed_at <= cd.current_deadline) / 
    NULLIF(COUNT(*) FILTER (WHERE cd.status IN ('completed', 'missed')), 0),
    2
  ) as on_time_percentage,
  AVG(
    CASE 
      WHEN cd.status = 'completed' AND cd.completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (cd.completed_at::TIMESTAMP - cd.created_at)) / 86400
      ELSE NULL
    END
  ) as avg_completion_days
FROM claim_deadlines cd
GROUP BY cd.tenant_id, DATE_TRUNC('month', cd.created_at)
ORDER BY cd.tenant_id, month DESC;

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

COMMENT ON TABLE deadline_rules IS 'Defines deadline calculation rules per claim type and priority';
COMMENT ON TABLE claim_deadlines IS 'Tracks calculated deadlines for each claim with extensions and escalation';
COMMENT ON TABLE deadline_extensions IS 'History of deadline extension requests and approvals';
COMMENT ON TABLE deadline_alerts IS 'Tracks deadline alert notifications sent to members';
COMMENT ON TABLE holiday_calendar IS 'Holiday calendar for business day calculations';

-- Migration complete
