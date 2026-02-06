-- Migration: Equity, Diversity & Demographics Module
-- Description: Privacy-compliant equity data collection with Indigenous data sovereignty (OCAP principles)
-- Phase: 2 - High-Value CLC Features
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: EQUITY DATA COLLECTION WITH CONSENT
-- =====================================================================================

-- Equity group categories (based on Canadian Employment Equity Act)
DROP TYPE IF EXISTS equity_group_type CASCADE;
CREATE TYPE equity_group_type AS ENUM (
  'women',
  'visible_minority', -- Racialized persons
  'indigenous', -- First Nations, Inuit, Métis
  'persons_with_disabilities',
  'lgbtq2plus',
  'newcomer', -- Recent immigrant/refugee
  'youth', -- Under 30
  'prefer_not_to_say'
);

-- Gender identity options
DROP TYPE IF EXISTS gender_identity_type CASCADE;
CREATE TYPE gender_identity_type AS ENUM (
  'man',
  'woman',
  'non_binary',
  'two_spirit',
  'gender_fluid',
  'agender',
  'other',
  'prefer_not_to_say'
);

-- Indigenous identity (OCAP principles: Ownership, Control, Access, Possession)
DROP TYPE IF EXISTS indigenous_identity_type CASCADE;
CREATE TYPE indigenous_identity_type AS ENUM (
  'first_nations_status', -- Registered/Treaty Indian
  'first_nations_non_status',
  'inuit',
  'metis',
  'multiple_indigenous_identities',
  'prefer_not_to_say'
);

-- Member demographic data (highly sensitive, encrypted at rest)
CREATE TABLE IF NOT EXISTS member_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  member_id UUID NOT NULL REFERENCES members(id) UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Consent tracking (CRITICAL for PIPEDA compliance)
  data_collection_consent BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE,
  consent_withdrawn_date TIMESTAMP WITH TIME ZONE,
  consent_type VARCHAR(50), -- explicit, implied, opt_in, opt_out
  consent_purpose TEXT, -- What the data will be used for
  
  -- Data retention
  data_retention_years INTEGER DEFAULT 7,
  data_expiry_date DATE, -- Automatic deletion date
  
  -- Equity groups (multi-select)
  equity_groups JSONB DEFAULT '[]'::jsonb, -- Array of equity_group_type values
  
  -- Gender identity
  gender_identity gender_identity_type,
  gender_identity_other TEXT, -- If "other" selected
  
  -- Indigenous identity (OCAP compliance)
  is_indigenous BOOLEAN,
  indigenous_identity indigenous_identity_type,
  indigenous_nation VARCHAR(200), -- Nation/band/community name
  indigenous_treaty_number VARCHAR(50),
  indigenous_data_governance_consent BOOLEAN DEFAULT false, -- Consent for nation-level data sharing
  
  -- Visible minority/racialized identity
  is_visible_minority BOOLEAN,
  visible_minority_groups JSONB, -- Array of specific groups
  
  -- Disability
  has_disability BOOLEAN,
  disability_types JSONB, -- Array of disability categories (if disclosed)
  requires_accommodation BOOLEAN,
  accommodation_details_encrypted TEXT, -- PGP encrypted
  
  -- LGBTQ2+ identity
  is_lgbtq2plus BOOLEAN,
  lgbtq2plus_identity JSONB, -- Specific identity if disclosed
  
  -- Age/generation
  date_of_birth DATE,
  age_range VARCHAR(20), -- "18-24", "25-34", etc. for reporting
  
  -- Immigration status
  is_newcomer BOOLEAN,
  immigration_year INTEGER,
  country_of_origin VARCHAR(100),
  
  -- Language
  primary_language VARCHAR(50),
  speaks_french BOOLEAN,
  speaks_indigenous_language BOOLEAN,
  indigenous_language_name VARCHAR(100),
  
  -- Intersectionality tracking
  intersectionality_count INTEGER, -- How many equity groups member belongs to
  
  -- Accessibility needs
  needs_interpretation BOOLEAN DEFAULT false,
  interpretation_language VARCHAR(100),
  needs_translation BOOLEAN DEFAULT false,
  translation_language VARCHAR(100),
  needs_mobility_accommodation BOOLEAN DEFAULT false,
  
  -- Privacy controls
  allow_aggregate_reporting BOOLEAN DEFAULT true, -- Can be included in anonymized stats
  allow_research_participation BOOLEAN DEFAULT false,
  allow_external_reporting BOOLEAN DEFAULT false, -- Statistics Canada, etc.
  
  -- Audit trail
  data_access_log JSONB DEFAULT '[]'::jsonb, -- Array of {user_id, access_date, purpose}
  last_updated_by UUID,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_consent_required CHECK (
    data_collection_consent = true OR 
    (equity_groups = '[]'::jsonb AND gender_identity IS NULL AND is_indigenous IS NULL)
  )
);

CREATE INDEX idx_demographics_member ON member_demographics(member_id);
CREATE INDEX idx_demographics_org ON member_demographics(organization_id);
CREATE INDEX idx_demographics_consent ON member_demographics(data_collection_consent);
CREATE INDEX idx_demographics_indigenous ON member_demographics(is_indigenous);
CREATE INDEX idx_demographics_expiry ON member_demographics(data_expiry_date);

-- RLS policies (EXTREMELY RESTRICTIVE)
ALTER TABLE member_demographics ENABLE ROW LEVEL SECURITY;

-- Members can only see their own data
CREATE POLICY select_own_demographics ON member_demographics
  FOR SELECT
  USING (member_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Only specific roles with valid purpose can access aggregate data
CREATE POLICY select_demographics_admin ON member_demographics
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'equity_officer', 'hr_admin')
    AND data_collection_consent = true
    AND allow_aggregate_reporting = true
  );

-- Only member themselves or equity officers can update
CREATE POLICY update_demographics ON member_demographics
  FOR UPDATE
  USING (
    member_id = current_setting('app.current_user_id', TRUE)::UUID
    OR (
      organization_id = current_setting('app.current_organization_id', TRUE)::UUID
      AND current_setting('app.current_user_role', TRUE) IN ('equity_officer')
    )
  );

-- =====================================================================================
-- PART 2: PAY EQUITY COMPLAINT TRACKING
-- =====================================================================================

-- Pay equity complaint status
DROP TYPE IF EXISTS pay_equity_status CASCADE;
CREATE TYPE pay_equity_status AS ENUM (
  'intake',
  'under_review',
  'investigation',
  'mediation',
  'arbitration',
  'resolved',
  'dismissed',
  'withdrawn',
  'appealed'
);

-- Pay equity complaints (specialized claim type)
CREATE TABLE IF NOT EXISTS pay_equity_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Complainant information
  complainant_member_id UUID REFERENCES members(id),
  complainant_name VARCHAR(200), -- May be anonymous
  is_anonymous BOOLEAN DEFAULT false,
  
  -- Group complaint
  is_group_complaint BOOLEAN DEFAULT false,
  group_member_count INTEGER,
  group_member_ids JSONB, -- Array of member IDs if not anonymous
  
  -- Complaint details
  complaint_number VARCHAR(50) UNIQUE NOT NULL,
  filed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Pay equity violation alleged
  job_class_complainant VARCHAR(200) NOT NULL,
  job_class_comparator VARCHAR(200) NOT NULL, -- Male-dominated job being compared to
  
  -- Compensation gap
  complainant_hourly_rate DECIMAL(10,2),
  comparator_hourly_rate DECIMAL(10,2),
  estimated_pay_gap_percentage DECIMAL(5,2),
  estimated_annual_loss DECIMAL(10,2),
  
  -- Work value factors (from Canadian Pay Equity Act)
  skill_comparison TEXT, -- Education, training, experience required
  effort_comparison TEXT, -- Physical and mental effort
  responsibility_comparison TEXT, -- Level of responsibility
  working_conditions_comparison TEXT, -- Environment and hazards
  
  -- Legislative framework
  jurisdiction VARCHAR(50), -- federal, provincial (ON, QC, BC, etc.)
  legislation_cited VARCHAR(200), -- "Canadian Pay Equity Act", "Ontario Pay Equity Act", etc.
  
  -- Status and workflow
  complaint_status pay_equity_status DEFAULT 'intake',
  assigned_investigator UUID,
  investigation_start_date DATE,
  investigation_completion_date DATE,
  
  -- Employer response
  employer_response_date DATE,
  employer_position TEXT,
  employer_supporting_documents_urls JSONB,
  
  -- Union representation
  union_representative_id UUID,
  union_position TEXT,
  union_supporting_documents_urls JSONB,
  
  -- Mediation
  mediation_scheduled_date DATE,
  mediator_name VARCHAR(200),
  mediation_outcome VARCHAR(50), -- settled, failed, withdrawn
  
  -- Resolution
  resolution_date DATE,
  resolution_type VARCHAR(50), -- pay_adjustment, job_reclassification, dismissed, settled
  settlement_amount DECIMAL(12,2),
  retroactive_payment_amount DECIMAL(12,2),
  retroactive_period_start DATE,
  retroactive_period_end DATE,
  ongoing_pay_adjustment DECIMAL(10,2), -- Per hour/year increase
  
  -- Appeal
  appeal_filed BOOLEAN DEFAULT false,
  appeal_filed_date DATE,
  appeal_decision_date DATE,
  appeal_outcome TEXT,
  
  -- Statistics Canada reporting
  reported_to_statcan BOOLEAN DEFAULT false,
  statcan_report_date DATE,
  
  -- Documents
  complaint_form_url TEXT,
  investigation_report_url TEXT,
  settlement_agreement_url TEXT,
  
  -- Confidentiality
  is_confidential BOOLEAN DEFAULT true,
  confidentiality_restrictions TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_pay_equity_complaints_org ON pay_equity_complaints(organization_id);
CREATE INDEX idx_pay_equity_complaints_member ON pay_equity_complaints(complainant_member_id);
CREATE INDEX idx_pay_equity_complaints_status ON pay_equity_complaints(complaint_status);
CREATE INDEX idx_pay_equity_complaints_filed_date ON pay_equity_complaints(filed_date);
CREATE INDEX idx_pay_equity_complaints_investigator ON pay_equity_complaints(assigned_investigator);

-- RLS policies
ALTER TABLE pay_equity_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_pay_equity_complaints ON pay_equity_complaints
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR complainant_member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

CREATE POLICY manage_pay_equity_complaints ON pay_equity_complaints
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'equity_officer', 'grievance_officer')
  );

-- =====================================================================================
-- PART 3: EQUITY ANALYTICS & REPORTING
-- =====================================================================================

-- Workplace demographics snapshot (time-series for tracking progress)
CREATE TABLE IF NOT EXISTS equity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Snapshot details
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type VARCHAR(50) DEFAULT 'annual', -- annual, quarterly, ad_hoc
  
  -- Total membership
  total_members INTEGER NOT NULL,
  total_active_members INTEGER,
  
  -- Gender breakdown
  women_count INTEGER DEFAULT 0,
  men_count INTEGER DEFAULT 0,
  non_binary_count INTEGER DEFAULT 0,
  gender_not_disclosed INTEGER DEFAULT 0,
  
  -- Equity groups
  visible_minority_count INTEGER DEFAULT 0,
  indigenous_count INTEGER DEFAULT 0,
  persons_with_disabilities_count INTEGER DEFAULT 0,
  lgbtq2plus_count INTEGER DEFAULT 0,
  
  -- Indigenous breakdown (if disclosed)
  first_nations_count INTEGER DEFAULT 0,
  inuit_count INTEGER DEFAULT 0,
  metis_count INTEGER DEFAULT 0,
  
  -- Intersectionality
  multiple_equity_groups_count INTEGER DEFAULT 0,
  avg_intersectionality_score DECIMAL(5,2),
  
  -- Leadership representation (from org roles)
  executive_board_total INTEGER,
  executive_board_women INTEGER DEFAULT 0,
  executive_board_visible_minority INTEGER DEFAULT 0,
  executive_board_indigenous INTEGER DEFAULT 0,
  
  stewards_total INTEGER,
  stewards_women INTEGER DEFAULT 0,
  stewards_visible_minority INTEGER DEFAULT 0,
  
  -- Pay equity metrics
  avg_hourly_rate_all DECIMAL(10,2),
  avg_hourly_rate_women DECIMAL(10,2),
  avg_hourly_rate_men DECIMAL(10,2),
  gender_pay_gap_percentage DECIMAL(5,2), -- (Men - Women) / Men × 100
  
  -- Consent metrics
  total_consent_given INTEGER,
  consent_rate_percentage DECIMAL(5,2),
  
  -- Statistics Canada reporting
  reported_to_statcan BOOLEAN DEFAULT false,
  statcan_report_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT unique_org_snapshot_date UNIQUE (organization_id, snapshot_date)
);

CREATE INDEX idx_equity_snapshots_org ON equity_snapshots(organization_id);
CREATE INDEX idx_equity_snapshots_date ON equity_snapshots(snapshot_date);

-- RLS policies
ALTER TABLE equity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_equity_snapshots ON equity_snapshots
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY manage_equity_snapshots ON equity_snapshots
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'equity_officer')
  );

-- =====================================================================================
-- PART 4: STATISTICS CANADA INTEGRATION
-- =====================================================================================

-- Statistics Canada data submissions
CREATE TABLE IF NOT EXISTS statcan_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Submission details
  survey_code VARCHAR(50) NOT NULL, -- e.g., "LAB-05302", "3701", "5173"
  survey_name VARCHAR(200), -- "Union Membership", "Labour Force Survey", etc.
  reference_period_start DATE NOT NULL,
  reference_period_end DATE NOT NULL,
  
  -- Submission
  submission_date DATE,
  submitted_by UUID,
  
  -- Data payload
  data_payload JSONB NOT NULL, -- Statistics Canada data structure
  
  -- Validation
  validation_status VARCHAR(50) DEFAULT 'pending', -- pending, validated, failed, accepted
  validation_errors JSONB,
  
  -- Statistics Canada response
  statcan_confirmation_number VARCHAR(100),
  statcan_accepted BOOLEAN,
  statcan_response_date DATE,
  statcan_response_details JSONB,
  
  -- Export file
  export_file_url TEXT,
  export_file_format VARCHAR(20), -- CSV, XML, JSON
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_statcan_submissions_org ON statcan_submissions(organization_id);
CREATE INDEX idx_statcan_submissions_survey ON statcan_submissions(survey_code);
CREATE INDEX idx_statcan_submissions_period ON statcan_submissions(reference_period_start, reference_period_end);

-- RLS policies
ALTER TABLE statcan_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_statcan_submissions ON statcan_submissions
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY manage_statcan_submissions ON statcan_submissions
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'equity_officer')
  );

-- =====================================================================================
-- PART 5: FUNCTION - GENERATE EQUITY SNAPSHOT
-- =====================================================================================

-- Function: Generate equity snapshot from current demographics
CREATE OR REPLACE FUNCTION generate_equity_snapshot(
  p_organization_id UUID,
  p_snapshot_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_total_members INTEGER;
  v_total_active INTEGER;
  v_consent_count INTEGER;
BEGIN
  -- Count total members
  SELECT COUNT(*) INTO v_total_members
  FROM members
  WHERE organization_id = p_organization_id;
  
  SELECT COUNT(*) INTO v_total_active
  FROM members
  WHERE organization_id = p_organization_id
  AND membership_status = 'active';
  
  -- Count members who consented to data collection
  SELECT COUNT(*) INTO v_consent_count
  FROM member_demographics
  WHERE organization_id = p_organization_id
  AND data_collection_consent = true
  AND allow_aggregate_reporting = true;
  
  -- Create snapshot
  INSERT INTO equity_snapshots (
    organization_id,
    snapshot_date,
    total_members,
    total_active_members,
    women_count,
    men_count,
    non_binary_count,
    gender_not_disclosed,
    visible_minority_count,
    indigenous_count,
    persons_with_disabilities_count,
    lgbtq2plus_count,
    first_nations_count,
    inuit_count,
    metis_count,
    multiple_equity_groups_count,
    avg_intersectionality_score,
    total_consent_given,
    consent_rate_percentage
  )
  SELECT 
    p_organization_id,
    p_snapshot_date,
    v_total_members,
    v_total_active,
    COUNT(*) FILTER (WHERE md.gender_identity = 'woman'),
    COUNT(*) FILTER (WHERE md.gender_identity = 'man'),
    COUNT(*) FILTER (WHERE md.gender_identity = 'non_binary'),
    v_total_members - v_consent_count,
    COUNT(*) FILTER (WHERE md.is_visible_minority = true),
    COUNT(*) FILTER (WHERE md.is_indigenous = true),
    COUNT(*) FILTER (WHERE md.has_disability = true),
    COUNT(*) FILTER (WHERE md.is_lgbtq2plus = true),
    COUNT(*) FILTER (WHERE md.indigenous_identity = 'first_nations_status' OR md.indigenous_identity = 'first_nations_non_status'),
    COUNT(*) FILTER (WHERE md.indigenous_identity = 'inuit'),
    COUNT(*) FILTER (WHERE md.indigenous_identity = 'metis'),
    COUNT(*) FILTER (WHERE md.intersectionality_count > 1),
    AVG(md.intersectionality_count),
    v_consent_count,
    ROUND((v_consent_count::DECIMAL / NULLIF(v_total_members, 0)) * 100, 2)
  FROM member_demographics md
  WHERE md.organization_id = p_organization_id
  AND md.data_collection_consent = true
  AND md.allow_aggregate_reporting = true
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- PART 6: FUNCTION - CALCULATE INTERSECTIONALITY SCORE
-- =====================================================================================

-- Function: Calculate intersectionality score for a member
CREATE OR REPLACE FUNCTION calculate_intersectionality_score(
  p_member_demographics_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_demo RECORD;
BEGIN
  SELECT * INTO v_demo
  FROM member_demographics
  WHERE id = p_member_demographics_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Count equity group memberships
  IF v_demo.gender_identity IN ('woman', 'non_binary', 'two_spirit') THEN
    v_score := v_score + 1;
  END IF;
  
  IF v_demo.is_visible_minority = true THEN
    v_score := v_score + 1;
  END IF;
  
  IF v_demo.is_indigenous = true THEN
    v_score := v_score + 1;
  END IF;
  
  IF v_demo.has_disability = true THEN
    v_score := v_score + 1;
  END IF;
  
  IF v_demo.is_lgbtq2plus = true THEN
    v_score := v_score + 1;
  END IF;
  
  IF v_demo.is_newcomer = true THEN
    v_score := v_score + 1;
  END IF;
  
  -- Update the record
  UPDATE member_demographics
  SET intersectionality_count = v_score
  WHERE id = p_member_demographics_id;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-calculate intersectionality on update
CREATE OR REPLACE FUNCTION trigger_calculate_intersectionality()
RETURNS TRIGGER AS $$
BEGIN
  NEW.intersectionality_count := (
    (CASE WHEN NEW.gender_identity IN ('woman', 'non_binary', 'two_spirit') THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.is_visible_minority = true THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.is_indigenous = true THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.has_disability = true THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.is_lgbtq2plus = true THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.is_newcomer = true THEN 1 ELSE 0 END)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_intersectionality
  BEFORE INSERT OR UPDATE ON member_demographics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_intersectionality();

-- =====================================================================================
-- PART 7: AGGREGATION VIEWS
-- =====================================================================================

-- View: Anonymized equity statistics (SAFE for public reporting)
CREATE OR REPLACE VIEW v_equity_statistics_anonymized AS
SELECT 
  es.organization_id,
  es.snapshot_date,
  es.total_members,
  -- Only show percentages, not counts (to protect small groups)
  ROUND((es.women_count::DECIMAL / NULLIF(es.total_members, 0)) * 100, 1) as women_percentage,
  ROUND((es.visible_minority_count::DECIMAL / NULLIF(es.total_members, 0)) * 100, 1) as visible_minority_percentage,
  ROUND((es.indigenous_count::DECIMAL / NULLIF(es.total_members, 0)) * 100, 1) as indigenous_percentage,
  ROUND((es.persons_with_disabilities_count::DECIMAL / NULLIF(es.total_members, 0)) * 100, 1) as disability_percentage,
  ROUND((es.lgbtq2plus_count::DECIMAL / NULLIF(es.total_members, 0)) * 100, 1) as lgbtq2plus_percentage,
  es.gender_pay_gap_percentage,
  es.consent_rate_percentage
FROM equity_snapshots es
WHERE es.total_members >= 10; -- Suppress if fewer than 10 members (privacy threshold)

-- View: Pay equity complaint pipeline
CREATE OR REPLACE VIEW v_pay_equity_pipeline AS
SELECT 
  pec.organization_id,
  pec.complaint_status,
  pec.jurisdiction,
  COUNT(*) as total_complaints,
  AVG(pec.estimated_pay_gap_percentage) as avg_pay_gap_percentage,
  SUM(pec.settlement_amount) as total_settlements,
  AVG(COALESCE(pec.resolution_date, CURRENT_DATE) - pec.filed_date) as avg_days_to_resolution,
  COUNT(*) FILTER (WHERE pec.resolution_type = 'pay_adjustment') as pay_adjustments_granted,
  COUNT(*) FILTER (WHERE pec.appeal_filed = true) as appeals_filed
FROM pay_equity_complaints pec
GROUP BY pec.organization_id, pec.complaint_status, pec.jurisdiction;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE member_demographics IS 'Privacy-compliant equity and demographic data with OCAP compliance for Indigenous data sovereignty';
COMMENT ON TABLE pay_equity_complaints IS 'Pay equity complaints tracking with Canadian Pay Equity Act compliance';
COMMENT ON TABLE equity_snapshots IS 'Time-series workplace demographics snapshots for tracking equity progress';
COMMENT ON TABLE statcan_submissions IS 'Statistics Canada survey submissions and responses';

COMMENT ON FUNCTION generate_equity_snapshot IS 'Generates anonymized equity snapshot from consented demographic data';
COMMENT ON FUNCTION calculate_intersectionality_score IS 'Calculates intersectionality score based on equity group memberships';

COMMENT ON VIEW v_equity_statistics_anonymized IS 'Anonymized equity statistics safe for public reporting (10+ member threshold)';
COMMENT ON VIEW v_pay_equity_pipeline IS 'Pay equity complaint pipeline with resolution metrics';
