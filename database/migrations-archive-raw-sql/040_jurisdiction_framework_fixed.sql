-- =====================================================
-- Phase 5D: Jurisdiction Framework
-- Migration 040 - FIXED FOR STANDALONE PostgreSQL
-- =====================================================
-- This migration creates the jurisdiction framework for Canadian labour law compliance
-- Removes Supabase-specific auth schema dependencies for standalone PostgreSQL

-- =====================================================
-- 1. ENUMS
-- =====================================================

-- Drop existing tables and enums if they exist (for re-running migration)
DROP TABLE IF EXISTS compliance_validations CASCADE;
DROP TABLE IF EXISTS jurisdiction_templates CASCADE;
DROP TABLE IF EXISTS statutory_holidays CASCADE;
DROP TABLE IF EXISTS jurisdiction_rules CASCADE;

DROP TYPE IF EXISTS jurisdiction_rule_type CASCADE;
DROP TYPE IF EXISTS certification_method CASCADE;
DROP TYPE IF EXISTS strike_vote_requirement CASCADE;
DROP TYPE IF EXISTS essential_service_designation CASCADE;
DROP TYPE IF EXISTS grievance_step_type CASCADE;
DROP TYPE IF EXISTS ca_jurisdiction CASCADE;

-- Jurisdiction rule types
CREATE TYPE jurisdiction_rule_type AS ENUM (
  'certification',
  'strike_vote',
  'grievance_arbitration',
  'essential_services',
  'replacement_workers',
  'collective_agreement',
  'unfair_labour_practice',
  'bargaining_rights',
  'union_security',
  'dues_checkoff'
);

-- Certification methods
CREATE TYPE certification_method AS ENUM (
  'automatic',           -- Automatic certification without vote
  'vote_required',       -- Vote required
  'mandatory_vote'       -- Always requires vote
);

-- Strike vote requirements
CREATE TYPE strike_vote_requirement AS ENUM (
  'simple_majority',     -- >50%
  'secret_ballot',       -- Must be by secret ballot
  'membership_quorum'    -- Requires minimum membership participation
);

-- Essential service designation types
CREATE TYPE essential_service_designation AS ENUM (
  'prohibited',          -- Strikes completely prohibited
  'restricted',          -- Strikes restricted with conditions
  'minimum_service'      -- Minimum service level required
);

-- Grievance step types
CREATE TYPE grievance_step_type AS ENUM (
  'informal',
  'formal_written',
  'mediation',
  'arbitration'
);

-- Canadian jurisdiction code enum
CREATE TYPE ca_jurisdiction AS ENUM (
  'CA-FED',  -- Federal
  'CA-ON',   -- Ontario
  'CA-QC',   -- Quebec
  'CA-BC',   -- British Columbia
  'CA-AB',   -- Alberta
  'CA-SK',   -- Saskatchewan
  'CA-MB',   -- Manitoba
  'CA-NB',   -- New Brunswick
  'CA-NS',   -- Nova Scotia
  'CA-PE',   -- Prince Edward Island
  'CA-NL',   -- Newfoundland and Labrador
  'CA-YT',   -- Yukon
  'CA-NT',   -- Northwest Territories
  'CA-NU'    -- Nunavut
);

-- =====================================================
-- 2. JURISDICTION RULES TABLE
-- =====================================================

CREATE TABLE jurisdiction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Jurisdiction identification
  jurisdiction ca_jurisdiction NOT NULL,
  rule_type jurisdiction_rule_type NOT NULL,
  rule_category TEXT NOT NULL,  -- e.g., 'arbitration_deadline', 'certification_threshold'
  rule_name TEXT NOT NULL,
  
  -- Rule details
  description TEXT,
  legal_reference TEXT NOT NULL,  -- e.g., "Canada Labour Code, s.57(2)"
  rule_parameters JSONB NOT NULL DEFAULT '{}',  -- Flexible JSON for jurisdiction-specific parameters
  
  -- Applicability
  applies_to_sectors TEXT[],  -- NULL means all sectors
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,  -- NULL for currently active rules
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  notes TEXT,
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (expiry_date IS NULL OR expiry_date > effective_date),
  CONSTRAINT valid_version CHECK (version > 0)
);

-- Indexes for jurisdiction rules
CREATE INDEX idx_jurisdiction_rules_jurisdiction ON jurisdiction_rules(jurisdiction);
CREATE INDEX idx_jurisdiction_rules_type ON jurisdiction_rules(rule_type);
CREATE INDEX idx_jurisdiction_rules_category ON jurisdiction_rules(rule_category);
CREATE INDEX idx_jurisdiction_rules_active ON jurisdiction_rules(jurisdiction, rule_category, version);
CREATE INDEX idx_jurisdiction_rules_effective ON jurisdiction_rules(effective_date);
CREATE INDEX idx_jurisdiction_rules_sectors ON jurisdiction_rules USING GIN(applies_to_sectors) WHERE applies_to_sectors IS NOT NULL;
CREATE INDEX idx_jurisdiction_rules_params ON jurisdiction_rules USING GIN(rule_parameters);

-- Comments
COMMENT ON TABLE jurisdiction_rules IS 'Canadian jurisdiction-specific labour law rules and requirements';
COMMENT ON COLUMN jurisdiction_rules.rule_parameters IS 'JSONB field for flexible jurisdiction-specific parameters';

-- =====================================================
-- 3. STATUTORY HOLIDAYS TABLE
-- =====================================================

CREATE TABLE statutory_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Jurisdiction and date
  jurisdiction ca_jurisdiction NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_name_fr TEXT,  -- French name (for Quebec)
  
  -- Business impact
  affects_deadlines BOOLEAN NOT NULL DEFAULT true,
  is_optional BOOLEAN NOT NULL DEFAULT false,  -- Some holidays are optional (e.g., provincial vs national)
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  -- Constraints
  CONSTRAINT unique_jurisdiction_holiday UNIQUE(jurisdiction, holiday_date)
);

-- Indexes for statutory holidays
CREATE INDEX idx_statutory_holidays_jurisdiction ON statutory_holidays(jurisdiction);
CREATE INDEX idx_statutory_holidays_date ON statutory_holidays(holiday_date);
CREATE INDEX idx_statutory_holidays_year ON statutory_holidays(EXTRACT(YEAR FROM holiday_date));
CREATE INDEX idx_statutory_holidays_affects ON statutory_holidays(jurisdiction, affects_deadlines) 
  WHERE affects_deadlines = true;

COMMENT ON TABLE statutory_holidays IS 'Statutory holidays by jurisdiction for deadline calculations';

-- =====================================================
-- 4. JURISDICTION TEMPLATES TABLE
-- =====================================================

CREATE TABLE jurisdiction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  jurisdiction ca_jurisdiction NOT NULL,
  template_type TEXT NOT NULL,  -- 'grievance_form', 'arbitration_request', 'certification_application', etc.
  template_name TEXT NOT NULL,
  
  -- Content
  template_content TEXT NOT NULL,  -- HTML/markdown template
  required_fields TEXT[] NOT NULL DEFAULT '{}',
  optional_fields TEXT[] NOT NULL DEFAULT '{}',
  
  -- Legal references
  legal_reference TEXT,
  form_number TEXT,  -- Official form number if applicable
  
  -- Status
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',  -- Language, format, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_jurisdiction_template UNIQUE(jurisdiction, template_type, version)
);

-- Indexes for jurisdiction templates
CREATE INDEX idx_jurisdiction_templates_jurisdiction ON jurisdiction_templates(jurisdiction);
CREATE INDEX idx_jurisdiction_templates_type ON jurisdiction_templates(template_type);
CREATE INDEX idx_jurisdiction_templates_active ON jurisdiction_templates(jurisdiction, template_type) 
  WHERE active = true;
CREATE INDEX idx_jurisdiction_templates_metadata ON jurisdiction_templates USING GIN(metadata);

COMMENT ON TABLE jurisdiction_templates IS 'Jurisdiction-specific document templates for legal forms';

-- =====================================================
-- 5. COMPLIANCE VALIDATIONS TABLE
-- =====================================================

CREATE TABLE compliance_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  organization_id UUID NOT NULL,
  reference_type TEXT NOT NULL,  -- 'claim', 'grievance', 'strike_vote', etc.
  reference_id UUID NOT NULL,
  
  -- Validation
  rule_id UUID NOT NULL REFERENCES jurisdiction_rules(id),
  validation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_compliant BOOLEAN NOT NULL,
  validation_message TEXT,
  
  -- Remediation
  requires_action BOOLEAN NOT NULL DEFAULT false,
  action_deadline DATE,
  action_taken TEXT,
  
  -- Metadata
  validated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_rule FOREIGN KEY (rule_id) REFERENCES jurisdiction_rules(id)
);

-- Indexes for compliance validations
CREATE INDEX idx_compliance_validations_org ON compliance_validations(organization_id);
CREATE INDEX idx_compliance_validations_reference ON compliance_validations(reference_type, reference_id);
CREATE INDEX idx_compliance_validations_rule ON compliance_validations(rule_id);
CREATE INDEX idx_compliance_validations_date ON compliance_validations(validation_date);
CREATE INDEX idx_compliance_validations_action ON compliance_validations(organization_id, requires_action) 
  WHERE requires_action = true;

COMMENT ON TABLE compliance_validations IS 'Audit trail of jurisdiction compliance validations';

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
  v_current_date DATE := p_start_date;
  v_business_days INTEGER := 0;
  v_is_holiday BOOLEAN;
BEGIN
  WHILE v_current_date < p_end_date LOOP
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

COMMENT ON FUNCTION calculate_business_days IS 'Calculate number of business days between two dates, excluding weekends and statutory holidays';

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
  INNER JOIN organizations o ON o.jurisdiction = jr.jurisdiction
  WHERE o.id = p_organization_id
  AND (p_rule_type IS NULL OR jr.rule_type = p_rule_type)
  AND (jr.expiry_date IS NULL OR jr.expiry_date > CURRENT_DATE)
  ORDER BY jr.rule_category, jr.version DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_jurisdiction_rules IS 'Get applicable jurisdiction rules for an organization';

-- Calculate jurisdiction-specific deadline
CREATE OR REPLACE FUNCTION calculate_jurisdiction_deadline(
  p_jurisdiction ca_jurisdiction,
  p_rule_category TEXT,
  p_start_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  deadline_date DATE,
  deadline_days INTEGER,
  deadline_type TEXT,
  rule_name TEXT,
  extensions_allowed BOOLEAN,
  max_extensions INTEGER
) AS $$
DECLARE
  v_rule_params JSONB;
  v_deadline_days INTEGER;
  v_deadline_type TEXT;
  v_result_date DATE;
BEGIN
  -- Get rule parameters
  SELECT jr.rule_parameters INTO v_rule_params
  FROM jurisdiction_rules jr
  WHERE jr.jurisdiction = p_jurisdiction
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
    v_result_date := add_business_days(p_jurisdiction, p_start_date, v_deadline_days);
  ELSE
    v_result_date := p_start_date + (v_deadline_days || ' days')::INTERVAL;
  END IF;
  
  RETURN QUERY
  SELECT 
    v_result_date,
    v_deadline_days,
    v_deadline_type,
    (SELECT jr.rule_name FROM jurisdiction_rules jr 
     WHERE jr.jurisdiction = p_jurisdiction 
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
-- MIGRATION COMPLETE
-- =====================================================

