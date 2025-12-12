-- =====================================================
-- Phase 5D: Jurisdiction Framework
-- Canadian Labour Law Compliance System
-- =====================================================
-- Implements jurisdiction-specific rules for federal + 13 provinces/territories
-- Supports arbitration deadlines, certification thresholds, strike procedures

-- =====================================================
-- 1. CREATE ENUMS
-- =====================================================

DROP TYPE IF EXISTS jurisdiction_rule_type CASCADE;
DROP TYPE IF EXISTS certification_method CASCADE;
DROP TYPE IF EXISTS strike_vote_requirement CASCADE;
DROP TYPE IF EXISTS essential_service_designation CASCADE;
DROP TYPE IF EXISTS grievance_step_type CASCADE;

-- Rule categories
CREATE TYPE jurisdiction_rule_type AS ENUM (
  'arbitration',           -- Arbitration procedures and deadlines
  'certification',         -- Union certification process
  'strike',                -- Strike and lockout rules
  'grievance',             -- Grievance procedures
  'essential_services',    -- Essential services designation
  'unfair_labour_practice', -- ULP complaint procedures
  'collective_bargaining', -- Bargaining timeline requirements
  'dues_checkoff',         -- Union dues collection rules
  'successor_rights'       -- Successor employer rights
);

-- Certification methods by jurisdiction
CREATE TYPE certification_method AS ENUM (
  'automatic',             -- Automatic certification with card majority (55%+)
  'mandatory_vote',        -- Always requires vote regardless of card count
  'threshold_vote',        -- Vote required if cards between min-max threshold
  'hybrid'                 -- Different rules for different sectors
);

-- Strike vote requirements
CREATE TYPE strike_vote_requirement AS ENUM (
  'simple_majority',       -- 50% + 1 of votes cast
  'supermajority',         -- 2/3 or higher threshold
  'majority_membership',   -- Majority of all members (not just voters)
  'sector_dependent'       -- Varies by sector/industry
);

-- Essential services framework
CREATE TYPE essential_service_designation AS ENUM (
  'prohibited',            -- Strike absolutely prohibited
  'restricted',            -- Strike allowed with minimum service levels
  'unrestricted',          -- Full strike rights
  'arbitration_required'   -- Must go to binding arbitration
);

-- Grievance step categories
CREATE TYPE grievance_step_type AS ENUM (
  'informal_discussion',
  'written_grievance',
  'management_review',
  'mediation',
  'arbitration',
  'expedited_arbitration'
);

-- =====================================================
-- 2. JURISDICTION RULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.jurisdiction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Jurisdiction identification
  jurisdiction ca_jurisdiction NOT NULL,
  rule_type jurisdiction_rule_type NOT NULL,
  rule_category TEXT NOT NULL,  -- Subcategory (e.g., "arbitration_deadline", "strike_notice")
  
  -- Rule definition
  rule_name TEXT NOT NULL,
  rule_description TEXT NOT NULL,
  legal_reference TEXT,  -- Act section (e.g., "Canada Labour Code s.57(2)")
  
  -- Rule parameters (flexible JSONB for jurisdiction-specific data)
  rule_parameters JSONB NOT NULL DEFAULT '{}',
  /* Example rule_parameters structures:
  
  Arbitration Deadline:
  {
    "deadline_days": 25,
    "deadline_type": "calendar" | "business",
    "start_event": "grievance_filed" | "step_3_denial",
    "extensions_allowed": true,
    "max_extensions": 2,
    "extension_days": 30
  }
  
  Certification Threshold:
  {
    "method": "automatic" | "vote" | "threshold_vote",
    "card_threshold_min": 35,  // % to trigger process
    "card_threshold_auto": 55, // % for automatic certification
    "vote_threshold": 50,       // % of votes cast needed
    "voting_period_days": 5,
    "campaign_period_days": 10
  }
  
  Strike Vote:
  {
    "requirement": "simple_majority" | "supermajority",
    "threshold_percentage": 50,
    "quorum_required": true,
    "quorum_percentage": 35,
    "notice_period_days": 72,
    "cooling_off_period_days": 17,
    "secret_ballot_required": true
  }
  
  Grievance Step:
  {
    "step_number": 1,
    "step_type": "informal_discussion",
    "deadline_days": 5,
    "deadline_type": "business",
    "response_required_days": 10,
    "can_skip": false,
    "required_participants": ["steward", "supervisor"]
  }
  */
  
  -- Applicability
  applies_to_sectors TEXT[],  -- NULL = all sectors, or specific sectors
  applies_to_org_types organization_type[],  -- NULL = all types
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  version INTEGER DEFAULT 1,
  notes TEXT,
  
  -- Constraints
  UNIQUE(jurisdiction, rule_type, rule_category, effective_date)
);

-- Indexes
CREATE INDEX idx_jurisdiction_rules_jurisdiction ON jurisdiction_rules(jurisdiction);
CREATE INDEX idx_jurisdiction_rules_type ON jurisdiction_rules(rule_type);
CREATE INDEX idx_jurisdiction_rules_category ON jurisdiction_rules(rule_category);
CREATE INDEX idx_jurisdiction_rules_effective ON jurisdiction_rules(effective_date) WHERE expiry_date IS NULL;
CREATE INDEX idx_jurisdiction_rules_sectors ON jurisdiction_rules USING GIN(applies_to_sectors) WHERE applies_to_sectors IS NOT NULL;
CREATE INDEX idx_jurisdiction_rules_params ON jurisdiction_rules USING GIN(rule_parameters);

-- RLS Policies
ALTER TABLE jurisdiction_rules ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read jurisdiction rules (public legal information)
CREATE POLICY jurisdiction_rules_select ON jurisdiction_rules
  FOR SELECT
  USING (true);

-- Only system admins can modify jurisdiction rules
CREATE POLICY jurisdiction_rules_modify ON jurisdiction_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND organization_id IN (
        SELECT id FROM organizations WHERE organization_type = 'congress'
      )
    )
  );

COMMENT ON TABLE jurisdiction_rules IS 'Jurisdiction-specific labour law rules for compliance automation';
COMMENT ON COLUMN jurisdiction_rules.rule_parameters IS 'Flexible JSONB structure for jurisdiction-specific rule details';

-- =====================================================
-- 3. STATUTORY HOLIDAYS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.statutory_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  jurisdiction ca_jurisdiction NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  year INTEGER NOT NULL,
  
  -- Holiday characteristics
  is_federal BOOLEAN DEFAULT false,
  is_provincial BOOLEAN DEFAULT true,
  is_moveable BOOLEAN DEFAULT false,  -- Fixed date vs calculated (e.g., Easter)
  
  -- Impact on deadlines
  affects_deadlines BOOLEAN DEFAULT true,
  alternative_observance_date DATE,  -- If holiday falls on weekend
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(jurisdiction, holiday_date, year)
);

CREATE INDEX idx_statutory_holidays_jurisdiction ON statutory_holidays(jurisdiction);
CREATE INDEX idx_statutory_holidays_date ON statutory_holidays(holiday_date);
CREATE INDEX idx_statutory_holidays_year ON statutory_holidays(year);

-- RLS: Public read access
ALTER TABLE statutory_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY statutory_holidays_select ON statutory_holidays
  FOR SELECT
  USING (true);

COMMENT ON TABLE statutory_holidays IS 'Statutory holidays by jurisdiction for accurate deadline calculations';

-- =====================================================
-- 4. JURISDICTION TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.jurisdiction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  jurisdiction ca_jurisdiction NOT NULL,
  template_type TEXT NOT NULL,  -- 'grievance_form', 'arbitration_request', 'certification_application'
  template_name TEXT NOT NULL,
  
  -- Template content
  template_category TEXT NOT NULL,  -- 'forms', 'letters', 'notices'
  content_html TEXT,
  content_markdown TEXT,
  
  -- Dynamic fields
  required_fields JSONB NOT NULL DEFAULT '[]',
  /* Example: [
    {"name": "grievor_name", "type": "text", "required": true, "label": "Grievor Full Name"},
    {"name": "incident_date", "type": "date", "required": true, "label": "Date of Incident"},
    {"name": "article_violated", "type": "text", "required": true, "label": "CBA Article Violated"}
  ] */
  
  optional_fields JSONB DEFAULT '[]',
  
  -- Validation rules
  validation_rules JSONB DEFAULT '{}',
  
  -- Usage metadata
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  replaced_by_id UUID REFERENCES jurisdiction_templates(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  UNIQUE(jurisdiction, template_type, template_name, version)
);

CREATE INDEX idx_jurisdiction_templates_jurisdiction ON jurisdiction_templates(jurisdiction);
CREATE INDEX idx_jurisdiction_templates_type ON jurisdiction_templates(template_type);
CREATE INDEX idx_jurisdiction_templates_active ON jurisdiction_templates(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE jurisdiction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY jurisdiction_templates_select ON jurisdiction_templates
  FOR SELECT
  USING (is_active = true);

COMMENT ON TABLE jurisdiction_templates IS 'Jurisdiction-specific document templates for compliance';

-- =====================================================
-- 5. COMPLIANCE VALIDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.compliance_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What's being validated
  tenant_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  resource_type TEXT NOT NULL,  -- 'claim', 'grievance', 'strike_vote', 'certification'
  resource_id UUID NOT NULL,
  
  -- Jurisdiction context
  jurisdiction ca_jurisdiction NOT NULL,
  
  -- Validation results
  validation_type TEXT NOT NULL,  -- 'deadline', 'threshold', 'procedure', 'documentation'
  is_compliant BOOLEAN NOT NULL,
  
  -- Details
  rule_id UUID REFERENCES jurisdiction_rules(id),
  expected_value JSONB,
  actual_value JSONB,
  variance JSONB,
  
  -- Risk assessment
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Remediation
  suggested_action TEXT,
  can_auto_fix BOOLEAN DEFAULT false,
  auto_fix_applied BOOLEAN DEFAULT false,
  
  -- Audit trail
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_validations_org ON compliance_validations(organization_id);
CREATE INDEX idx_compliance_validations_resource ON compliance_validations(resource_type, resource_id);
CREATE INDEX idx_compliance_validations_jurisdiction ON compliance_validations(jurisdiction);
CREATE INDEX idx_compliance_validations_compliant ON compliance_validations(is_compliant) WHERE is_compliant = false;
CREATE INDEX idx_compliance_validations_severity ON compliance_validations(severity) WHERE severity IN ('error', 'critical');

-- RLS
ALTER TABLE compliance_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_validations_select ON compliance_validations
  FOR SELECT
  USING (
    organization_id IN (SELECT id FROM get_user_visible_orgs(auth.uid()))
  );

COMMENT ON TABLE compliance_validations IS 'Compliance validation results and remediation tracking';

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Calculate business days between two dates for a jurisdiction
CREATE OR REPLACE FUNCTION calculate_business_days(
  p_jurisdiction ca_jurisdiction,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
  v_business_days INTEGER := 0;
  v_current_date DATE := p_start_date;
  v_is_holiday BOOLEAN;
BEGIN
  -- Loop through each day
  WHILE v_current_date <= p_end_date LOOP
    -- Check if it's a weekday (Monday = 1, Sunday = 7)
    IF EXTRACT(ISODOW FROM v_current_date) BETWEEN 1 AND 5 THEN
      -- Check if it's a statutory holiday
      SELECT EXISTS(
        SELECT 1 FROM statutory_holidays
        WHERE jurisdiction = p_jurisdiction
        AND holiday_date = v_current_date
        AND affects_deadlines = true
      ) INTO v_is_holiday;
      
      IF NOT v_is_holiday THEN
        v_business_days := v_business_days + 1;
      END IF;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_business_days;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_business_days IS 'Calculate business days between dates, excluding weekends and statutory holidays';

-- Add business days to a date
CREATE OR REPLACE FUNCTION add_business_days(
  p_jurisdiction ca_jurisdiction,
  p_start_date DATE,
  p_days_to_add INTEGER
) RETURNS DATE AS $$
DECLARE
  v_result_date DATE := p_start_date;
  v_days_added INTEGER := 0;
  v_is_holiday BOOLEAN;
BEGIN
  WHILE v_days_added < p_days_to_add LOOP
    v_result_date := v_result_date + INTERVAL '1 day';
    
    -- Check if it's a weekday
    IF EXTRACT(ISODOW FROM v_result_date) BETWEEN 1 AND 5 THEN
      -- Check if it's a statutory holiday
      SELECT EXISTS(
        SELECT 1 FROM statutory_holidays
        WHERE jurisdiction = p_jurisdiction
        AND holiday_date = v_result_date
        AND affects_deadlines = true
      ) INTO v_is_holiday;
      
      IF NOT v_is_holiday THEN
        v_days_added := v_days_added + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_result_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION add_business_days IS 'Add business days to a date, excluding weekends and statutory holidays';

-- Get applicable jurisdiction rules for an organization
CREATE OR REPLACE FUNCTION get_jurisdiction_rules(
  p_organization_id UUID,
  p_rule_type jurisdiction_rule_type DEFAULT NULL
) RETURNS TABLE (
  rule_id UUID,
  jurisdiction ca_jurisdiction,
  rule_type jurisdiction_rule_type,
  rule_category TEXT,
  rule_name TEXT,
  rule_parameters JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jr.id,
    jr.jurisdiction,
    jr.rule_type,
    jr.rule_category,
    jr.rule_name,
    jr.rule_parameters
  FROM jurisdiction_rules jr
  JOIN organizations o ON o.jurisdiction = jr.jurisdiction
  WHERE o.id = p_organization_id
  AND (p_rule_type IS NULL OR jr.rule_type = p_rule_type)
  AND (jr.expiry_date IS NULL OR jr.expiry_date > CURRENT_DATE)
  AND (
    jr.applies_to_sectors IS NULL 
    OR o.sectors && jr.applies_to_sectors
  )
  AND (
    jr.applies_to_org_types IS NULL
    OR o.organization_type = ANY(jr.applies_to_org_types)
  )
  ORDER BY jr.rule_category, jr.version DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_jurisdiction_rules IS 'Get applicable jurisdiction rules for an organization based on location and sector';

-- Calculate deadline with jurisdiction rules
CREATE OR REPLACE FUNCTION calculate_jurisdiction_deadline(
  p_organization_id UUID,
  p_rule_category TEXT,
  p_start_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  deadline_date DATE,
  deadline_days INTEGER,
  deadline_type TEXT,
  rule_name TEXT,
  can_extend BOOLEAN,
  max_extensions INTEGER
) AS $$
DECLARE
  v_jurisdiction ca_jurisdiction;
  v_rule_params JSONB;
  v_deadline_days INTEGER;
  v_deadline_type TEXT;
  v_result_date DATE;
BEGIN
  -- Get organization jurisdiction
  SELECT o.jurisdiction INTO v_jurisdiction
  FROM organizations o
  WHERE o.id = p_organization_id;
  
  -- Get rule parameters
  SELECT jr.rule_parameters INTO v_rule_params
  FROM jurisdiction_rules jr
  WHERE jr.jurisdiction = v_jurisdiction
  AND jr.rule_category = p_rule_category
  AND (jr.expiry_date IS NULL OR jr.expiry_date > CURRENT_DATE)
  ORDER BY jr.version DESC
  LIMIT 1;
  
  IF v_rule_params IS NULL THEN
    RAISE EXCEPTION 'No jurisdiction rule found for category: %', p_rule_category;
  END IF;
  
  -- Extract deadline parameters
  v_deadline_days := (v_rule_params->>'deadline_days')::INTEGER;
  v_deadline_type := v_rule_params->>'deadline_type';
  
  -- Calculate deadline based on type
  IF v_deadline_type = 'business' THEN
    v_result_date := add_business_days(v_jurisdiction, p_start_date, v_deadline_days);
  ELSE
    v_result_date := p_start_date + (v_deadline_days || ' days')::INTERVAL;
  END IF;
  
  RETURN QUERY
  SELECT 
    v_result_date,
    v_deadline_days,
    v_deadline_type,
    (SELECT jr.rule_name FROM jurisdiction_rules jr 
     WHERE jr.jurisdiction = v_jurisdiction 
     AND jr.rule_category = p_rule_category 
     ORDER BY jr.version DESC LIMIT 1),
    COALESCE((v_rule_params->>'extensions_allowed')::BOOLEAN, false),
    COALESCE((v_rule_params->>'max_extensions')::INTEGER, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION calculate_jurisdiction_deadline IS 'Calculate compliance deadline based on jurisdiction rules';

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_jurisdiction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jurisdiction_rules_updated
  BEFORE UPDATE ON jurisdiction_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_jurisdiction_timestamp();

CREATE TRIGGER jurisdiction_templates_updated
  BEFORE UPDATE ON jurisdiction_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_jurisdiction_timestamp();

-- =====================================================
-- 8. VIEWS
-- =====================================================

-- Active rules summary by jurisdiction
CREATE OR REPLACE VIEW jurisdiction_rules_summary AS
SELECT 
  jurisdiction,
  rule_type,
  COUNT(*) as rule_count,
  COUNT(DISTINCT rule_category) as category_count,
  MIN(effective_date) as earliest_effective,
  MAX(effective_date) as latest_effective
FROM jurisdiction_rules
WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE
GROUP BY jurisdiction, rule_type
ORDER BY jurisdiction, rule_type;

COMMENT ON VIEW jurisdiction_rules_summary IS 'Summary of active jurisdiction rules by type';

-- =====================================================
-- 9. GRANTS
-- =====================================================

-- Grant read access to authenticated users
GRANT SELECT ON jurisdiction_rules TO authenticated;
GRANT SELECT ON statutory_holidays TO authenticated;
GRANT SELECT ON jurisdiction_templates TO authenticated;
GRANT SELECT ON compliance_validations TO authenticated;
GRANT SELECT ON jurisdiction_rules_summary TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_business_days TO authenticated;
GRANT EXECUTE ON FUNCTION add_business_days TO authenticated;
GRANT EXECUTE ON FUNCTION get_jurisdiction_rules TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_jurisdiction_deadline TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
