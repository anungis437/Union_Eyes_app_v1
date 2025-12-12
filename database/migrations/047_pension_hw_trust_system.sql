-- Migration: Pension & Health-Welfare Trust Administration
-- Description: Complete Taft-Hartley pension and H&W trust management system
-- Phase: 2 - High-Value CLC Features
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: PENSION PLAN SCHEMA
-- =====================================================================================

-- Pension plan types
DROP TYPE IF EXISTS pension_plan_type CASCADE;
CREATE TYPE pension_plan_type AS ENUM (
  'defined_benefit', -- DB: Fixed benefit formula
  'defined_contribution', -- DC: Fixed contribution amount
  'hybrid', -- Combination of DB and DC
  'target_benefit', -- Shared risk
  'multi_employer' -- Taft-Hartley/JSPP
);

-- Pension plan status
DROP TYPE IF EXISTS pension_plan_status CASCADE;
CREATE TYPE pension_plan_status AS ENUM (
  'active',
  'frozen', -- No new entrants
  'closed', -- Wound up
  'under_review'
);

-- Pension plans table
CREATE TABLE IF NOT EXISTS pension_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization context
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Plan identification
  plan_name VARCHAR(200) NOT NULL,
  plan_number VARCHAR(50), -- Registration number (CRA/IRS)
  plan_type pension_plan_type NOT NULL,
  plan_status pension_plan_status DEFAULT 'active',
  
  -- Taft-Hartley joint trust
  is_taft_hartley BOOLEAN DEFAULT false,
  is_multi_employer BOOLEAN DEFAULT false,
  participating_employers_count INTEGER,
  
  -- Registration and compliance
  cra_registration_number VARCHAR(50), -- Canada: RPP registration
  irs_ein VARCHAR(20), -- US: Employer Identification Number
  form_5500_required BOOLEAN DEFAULT false, -- US requirement
  t3_filing_required BOOLEAN DEFAULT true, -- Canada requirement
  
  -- Plan details
  benefit_formula TEXT, -- DB: e.g., "2% × years of service × final average earnings"
  contribution_rate DECIMAL(5,2), -- DC: % of salary or $ per hour
  normal_retirement_age INTEGER DEFAULT 65,
  early_retirement_age INTEGER DEFAULT 55,
  vesting_period_years INTEGER DEFAULT 2,
  
  -- Funding
  current_assets DECIMAL(15,2),
  current_liabilities DECIMAL(15,2),
  funded_ratio DECIMAL(5,2), -- (Assets / Liabilities) × 100
  solvency_ratio DECIMAL(5,2), -- For wind-up scenarios
  
  -- Actuarial
  last_valuation_date DATE,
  next_valuation_date DATE,
  valuation_frequency_months INTEGER DEFAULT 36, -- Every 3 years typical
  actuary_firm VARCHAR(200),
  actuary_contact VARCHAR(200),
  
  -- Dates
  plan_effective_date DATE NOT NULL,
  plan_year_end DATE NOT NULL,
  fiscal_year_end DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_pension_plans_org ON pension_plans(organization_id);
CREATE INDEX idx_pension_plans_type ON pension_plans(plan_type);
CREATE INDEX idx_pension_plans_status ON pension_plans(plan_status);
CREATE INDEX idx_pension_plans_registration ON pension_plans(cra_registration_number);

-- RLS policies
ALTER TABLE pension_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_pension_plans ON pension_plans
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY manage_pension_plans ON pension_plans
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee')
  );

-- =====================================================================================
-- PART 2: HOURS BANK & CREDIT TRACKING
-- =====================================================================================

-- Hours bank (for contribution credits)
CREATE TABLE IF NOT EXISTS pension_hours_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pension_plan_id UUID NOT NULL REFERENCES pension_plans(id),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- Period tracking
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  
  -- Hours worked
  total_hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0,
  pensionable_hours DECIMAL(10,2) NOT NULL DEFAULT 0, -- After caps/exclusions
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Employer breakdown (for multi-employer plans)
  primary_employer_id UUID,
  secondary_employer_ids JSONB, -- Array of {employer_id, hours}
  
  -- Reciprocity (hours from other plans)
  reciprocal_hours DECIMAL(10,2) DEFAULT 0,
  reciprocal_plan_ids JSONB, -- Array of plan references
  
  -- Contribution credits
  contribution_credits DECIMAL(10,2), -- Years/months of service credit
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, transferred, suspended
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_hours_positive CHECK (
    total_hours_worked >= 0 AND 
    pensionable_hours >= 0 AND 
    pensionable_hours <= total_hours_worked
  ),
  CONSTRAINT unique_member_period UNIQUE (pension_plan_id, member_id, reporting_period_start)
);

CREATE INDEX idx_hours_banks_plan ON pension_hours_banks(pension_plan_id);
CREATE INDEX idx_hours_banks_member ON pension_hours_banks(member_id);
CREATE INDEX idx_hours_banks_period ON pension_hours_banks(reporting_period_start, reporting_period_end);
CREATE INDEX idx_hours_banks_employer ON pension_hours_banks(primary_employer_id);

-- RLS policies
ALTER TABLE pension_hours_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_hours_banks ON pension_hours_banks
  FOR SELECT
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
  );

CREATE POLICY manage_hours_banks ON pension_hours_banks
  FOR ALL
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee', 'hr_admin')
  );

-- =====================================================================================
-- PART 3: EMPLOYER CONTRIBUTIONS
-- =====================================================================================

-- Pension contributions from employers
CREATE TABLE IF NOT EXISTS pension_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pension_plan_id UUID NOT NULL REFERENCES pension_plans(id),
  
  -- Employer details
  employer_id UUID, -- Reference to employer table
  employer_name VARCHAR(200) NOT NULL,
  employer_registration_number VARCHAR(50),
  
  -- Contribution period
  contribution_period_start DATE NOT NULL,
  contribution_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Member breakdown
  total_members_covered INTEGER NOT NULL,
  member_contributions JSONB, -- Array of {member_id, hours, amount}
  
  -- Financial amounts
  total_contribution_amount DECIMAL(12,2) NOT NULL,
  employer_portion DECIMAL(12,2),
  employee_portion DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'CAD',
  
  -- Reconciliation
  expected_amount DECIMAL(12,2),
  variance_amount DECIMAL(12,2), -- Actual - Expected
  variance_percentage DECIMAL(5,2),
  reconciliation_status VARCHAR(50) DEFAULT 'pending', -- pending, matched, variance, disputed
  
  -- Payment tracking
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, partial, overdue, defaulted
  payment_date DATE,
  payment_method VARCHAR(50), -- ACH, wire, cheque, EFT
  payment_reference VARCHAR(100),
  
  -- Late payment
  is_late BOOLEAN DEFAULT false,
  days_late INTEGER,
  late_fee_amount DECIMAL(10,2),
  interest_charged DECIMAL(10,2),
  
  -- File attachments
  remittance_file_url TEXT,
  reconciliation_report_url TEXT,
  
  -- Blockchain verification (immutable contribution hash)
  contribution_hash VARCHAR(128), -- SHA-512 of contribution details
  blockchain_tx_hash VARCHAR(200),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_by UUID,
  
  CONSTRAINT chk_contribution_amounts CHECK (
    total_contribution_amount >= 0 AND
    (employer_portion IS NULL OR employer_portion >= 0) AND
    (employee_portion IS NULL OR employee_portion >= 0)
  )
);

CREATE INDEX idx_pension_contributions_plan ON pension_contributions(pension_plan_id);
CREATE INDEX idx_pension_contributions_employer ON pension_contributions(employer_id);
CREATE INDEX idx_pension_contributions_period ON pension_contributions(contribution_period_start, contribution_period_end);
CREATE INDEX idx_pension_contributions_status ON pension_contributions(payment_status);
CREATE INDEX idx_pension_contributions_due_date ON pension_contributions(due_date);
CREATE INDEX idx_pension_contributions_hash ON pension_contributions(contribution_hash);

-- RLS policies
ALTER TABLE pension_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_pension_contributions ON pension_contributions
  FOR SELECT
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
  );

CREATE POLICY manage_pension_contributions ON pension_contributions
  FOR ALL
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee', 'hr_admin')
  );

-- =====================================================================================
-- PART 4: TRUSTEE BOARD MANAGEMENT
-- =====================================================================================

-- Trustee board composition
CREATE TABLE IF NOT EXISTS pension_trustee_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pension_plan_id UUID NOT NULL REFERENCES pension_plans(id),
  
  -- Board details
  board_name VARCHAR(200) NOT NULL,
  is_joint_board BOOLEAN DEFAULT true, -- Labor-management joint trusteeship
  
  -- Composition requirements
  total_trustees INTEGER NOT NULL,
  labor_trustees_required INTEGER,
  management_trustees_required INTEGER,
  independent_trustees_required INTEGER DEFAULT 0,
  
  -- Meeting schedule
  meeting_frequency VARCHAR(50), -- monthly, quarterly, semi-annual, annual
  quorum_requirement INTEGER,
  
  -- Governance
  bylaws_url TEXT,
  trust_agreement_url TEXT,
  investment_policy_url TEXT,
  
  -- Metadata
  established_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trustee_boards_plan ON pension_trustee_boards(pension_plan_id);

-- Individual trustees
CREATE TABLE IF NOT EXISTS pension_trustees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  trustee_board_id UUID NOT NULL REFERENCES pension_trustee_boards(id),
  
  -- Trustee details
  user_id UUID, -- Link to system user if applicable
  trustee_name VARCHAR(200) NOT NULL,
  trustee_type VARCHAR(50) NOT NULL, -- labor, management, independent
  
  -- Position
  position VARCHAR(100), -- chair, vice_chair, secretary, treasurer, member
  is_voting_member BOOLEAN DEFAULT true,
  
  -- Term
  term_start_date DATE NOT NULL,
  term_end_date DATE,
  term_length_years INTEGER DEFAULT 3,
  is_current BOOLEAN DEFAULT true,
  
  -- Representing
  representing_organization VARCHAR(200), -- Union local or employer
  representing_organization_id UUID,
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Metadata
  notes TEXT,
  appointed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  appointed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trustees_board ON pension_trustees(trustee_board_id);
CREATE INDEX idx_trustees_type ON pension_trustees(trustee_type);
CREATE INDEX idx_trustees_current ON pension_trustees(is_current);
CREATE INDEX idx_trustees_user ON pension_trustees(user_id);

-- Trustee meetings
CREATE TABLE IF NOT EXISTS pension_trustee_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  trustee_board_id UUID NOT NULL REFERENCES pension_trustee_boards(id),
  
  -- Meeting details
  meeting_title VARCHAR(200) NOT NULL,
  meeting_type VARCHAR(50) DEFAULT 'regular', -- regular, special, emergency, annual
  meeting_date DATE NOT NULL,
  meeting_start_time TIME,
  meeting_end_time TIME,
  
  -- Location
  meeting_location VARCHAR(200),
  is_virtual BOOLEAN DEFAULT false,
  meeting_link TEXT,
  
  -- Attendance
  trustees_present JSONB, -- Array of trustee IDs
  trustees_absent JSONB,
  guests_present JSONB,
  quorum_met BOOLEAN,
  
  -- Documents
  agenda_url TEXT,
  minutes_url TEXT,
  minutes_approved BOOLEAN DEFAULT false,
  minutes_approved_date DATE,
  
  -- Voting record
  motions JSONB, -- Array of {motion, moved_by, seconded_by, votes_for, votes_against, result}
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_trustee_meetings_board ON pension_trustee_meetings(trustee_board_id);
CREATE INDEX idx_trustee_meetings_date ON pension_trustee_meetings(meeting_date);
CREATE INDEX idx_trustee_meetings_type ON pension_trustee_meetings(meeting_type);

-- =====================================================================================
-- PART 5: BENEFIT CLAIMS & PAYMENTS
-- =====================================================================================

-- Benefit claim types
DROP TYPE IF EXISTS pension_claim_type CASCADE;
CREATE TYPE pension_claim_type AS ENUM (
  'retirement_pension',
  'early_retirement',
  'disability_pension',
  'survivor_benefit',
  'death_benefit',
  'lump_sum_withdrawal',
  'pension_transfer'
);

-- Pension benefit claims
CREATE TABLE IF NOT EXISTS pension_benefit_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pension_plan_id UUID NOT NULL REFERENCES pension_plans(id),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- Claim details
  claim_type pension_claim_type NOT NULL,
  claim_number VARCHAR(50) UNIQUE,
  claim_status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, approved, denied, paid
  
  -- Dates
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  benefit_start_date DATE,
  benefit_end_date DATE, -- For fixed-term benefits
  
  -- Calculated benefits
  monthly_benefit_amount DECIMAL(10,2),
  annual_benefit_amount DECIMAL(10,2),
  lump_sum_amount DECIMAL(12,2),
  
  -- Calculation details
  years_of_service DECIMAL(8,2),
  final_average_earnings DECIMAL(10,2),
  benefit_formula_used TEXT,
  reduction_percentage DECIMAL(5,2), -- For early retirement
  
  -- Approval workflow
  submitted_by UUID,
  reviewed_by UUID,
  approved_by UUID,
  review_date DATE,
  approval_date DATE,
  denial_reason TEXT,
  
  -- Payment details
  payment_frequency VARCHAR(50), -- monthly, quarterly, lump_sum
  payment_method VARCHAR(50), -- direct_deposit, cheque, wire
  bank_account_info_encrypted TEXT,
  
  -- Tax withholding
  tax_withholding_rate DECIMAL(5,2),
  tax_withholding_amount DECIMAL(10,2),
  
  -- Documents
  application_form_url TEXT,
  supporting_documents_urls JSONB,
  approval_letter_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pension_claims_plan ON pension_benefit_claims(pension_plan_id);
CREATE INDEX idx_pension_claims_member ON pension_benefit_claims(member_id);
CREATE INDEX idx_pension_claims_type ON pension_benefit_claims(claim_type);
CREATE INDEX idx_pension_claims_status ON pension_benefit_claims(claim_status);
CREATE INDEX idx_pension_claims_start_date ON pension_benefit_claims(benefit_start_date);

-- RLS policies
ALTER TABLE pension_benefit_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_pension_claims ON pension_benefit_claims
  FOR SELECT
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

CREATE POLICY manage_pension_claims ON pension_benefit_claims
  FOR ALL
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee', 'hr_admin')
  );

-- =====================================================================================
-- PART 6: ACTUARIAL VALUATIONS
-- =====================================================================================

-- Actuarial valuations
CREATE TABLE IF NOT EXISTS pension_actuarial_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pension_plan_id UUID NOT NULL REFERENCES pension_plans(id),
  
  -- Valuation details
  valuation_date DATE NOT NULL,
  valuation_type VARCHAR(50) NOT NULL, -- going_concern, solvency, wind_up
  
  -- Actuary information
  actuary_firm VARCHAR(200) NOT NULL,
  actuary_name VARCHAR(200),
  actuary_designation VARCHAR(50), -- FSA, FCIA, etc.
  
  -- Assets
  market_value_assets DECIMAL(15,2) NOT NULL,
  smoothed_value_assets DECIMAL(15,2),
  
  -- Liabilities
  going_concern_liabilities DECIMAL(15,2),
  solvency_liabilities DECIMAL(15,2),
  wind_up_liabilities DECIMAL(15,2),
  
  -- Funded status
  going_concern_surplus_deficit DECIMAL(15,2),
  going_concern_funded_ratio DECIMAL(5,2),
  solvency_surplus_deficit DECIMAL(15,2),
  solvency_funded_ratio DECIMAL(5,2),
  
  -- Assumptions
  discount_rate DECIMAL(5,2),
  inflation_rate DECIMAL(5,2),
  salary_increase_rate DECIMAL(5,2),
  mortality_table VARCHAR(100), -- CPM-2014, UP-1994, etc.
  
  -- Contribution recommendations
  recommended_employer_contribution DECIMAL(12,2),
  recommended_contribution_rate DECIMAL(5,2),
  special_payment_required DECIMAL(12,2),
  
  -- Reports
  valuation_report_url TEXT NOT NULL,
  summary_report_url TEXT,
  
  -- Filing
  filed_with_regulator BOOLEAN DEFAULT false,
  filing_date DATE,
  regulator_response_url TEXT,
  
  -- Next valuation
  next_valuation_required_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_actuarial_valuations_plan ON pension_actuarial_valuations(pension_plan_id);
CREATE INDEX idx_actuarial_valuations_date ON pension_actuarial_valuations(valuation_date);
CREATE INDEX idx_actuarial_valuations_type ON pension_actuarial_valuations(valuation_type);

-- RLS policies
ALTER TABLE pension_actuarial_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_actuarial_valuations ON pension_actuarial_valuations
  FOR SELECT
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
  );

CREATE POLICY manage_actuarial_valuations ON pension_actuarial_valuations
  FOR ALL
  USING (
    pension_plan_id IN (
      SELECT id FROM pension_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee')
  );

-- =====================================================================================
-- PART 7: PENSION ESTIMATOR CALCULATIONS
-- =====================================================================================

-- Function: Calculate pension estimate
CREATE OR REPLACE FUNCTION calculate_pension_estimate(
  p_member_id UUID,
  p_pension_plan_id UUID,
  p_retirement_age INTEGER DEFAULT 65,
  p_final_average_earnings DECIMAL DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_years_of_service DECIMAL;
  v_pensionable_hours DECIMAL;
  v_fae DECIMAL;
  v_monthly_pension DECIMAL;
  v_annual_pension DECIMAL;
  v_reduction_factor DECIMAL := 1.0;
  v_result JSONB;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan
  FROM pension_plans
  WHERE id = p_pension_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pension plan not found: %', p_pension_plan_id;
  END IF;
  
  -- Calculate years of service from hours bank
  SELECT 
    COALESCE(SUM(contribution_credits), 0),
    COALESCE(SUM(pensionable_hours), 0)
  INTO v_years_of_service, v_pensionable_hours
  FROM pension_hours_banks
  WHERE member_id = p_member_id
  AND pension_plan_id = p_pension_plan_id;
  
  -- Get final average earnings (use provided or calculate from transactions)
  IF p_final_average_earnings IS NOT NULL THEN
    v_fae := p_final_average_earnings;
  ELSE
    -- Simplified: Use average of last 3 years
    SELECT AVG(annual_salary) INTO v_fae
    FROM (
      SELECT 
        EXTRACT(YEAR FROM dt.period_start) as year,
        SUM(dt.amount) * 12 as annual_salary
      FROM dues_transactions dt
      WHERE dt.member_id = p_member_id
      AND dt.period_start >= CURRENT_DATE - INTERVAL '3 years'
      GROUP BY EXTRACT(YEAR FROM dt.period_start)
      ORDER BY year DESC
      LIMIT 3
    ) recent_years;
    
    v_fae := COALESCE(v_fae, 0);
  END IF;
  
  -- Apply early retirement reduction if applicable
  IF p_retirement_age < v_plan.normal_retirement_age THEN
    -- Simplified: 6% per year reduction (typical for many plans)
    v_reduction_factor := 1.0 - (0.06 * (v_plan.normal_retirement_age - p_retirement_age));
    v_reduction_factor := GREATEST(v_reduction_factor, 0.3); -- Cap reduction at 70%
  END IF;
  
  -- Calculate pension based on plan type
  IF v_plan.plan_type = 'defined_benefit' THEN
    -- Simplified DB formula: 2% × years × FAE
    v_annual_pension := 0.02 * v_years_of_service * v_fae * v_reduction_factor;
  ELSIF v_plan.plan_type = 'defined_contribution' THEN
    -- DC: Would need account balance (not implemented here)
    v_annual_pension := 0; -- Placeholder
  ELSE
    v_annual_pension := 0;
  END IF;
  
  v_monthly_pension := v_annual_pension / 12;
  
  -- Build result
  v_result := jsonb_build_object(
    'pension_plan_id', p_pension_plan_id,
    'member_id', p_member_id,
    'plan_type', v_plan.plan_type,
    'retirement_age', p_retirement_age,
    'normal_retirement_age', v_plan.normal_retirement_age,
    'years_of_service', ROUND(v_years_of_service, 2),
    'total_pensionable_hours', ROUND(v_pensionable_hours, 2),
    'final_average_earnings', ROUND(v_fae, 2),
    'early_retirement_reduction', ROUND((1.0 - v_reduction_factor) * 100, 2),
    'estimated_monthly_pension', ROUND(v_monthly_pension, 2),
    'estimated_annual_pension', ROUND(v_annual_pension, 2),
    'calculation_date', CURRENT_DATE,
    'disclaimer', 'This is an estimate only. Actual benefits may vary based on final plan provisions and actuarial calculations.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE pension_plans IS 'Pension and retirement plans including Taft-Hartley multi-employer plans';
COMMENT ON TABLE pension_hours_banks IS 'Hours worked and contribution credits by member and period';
COMMENT ON TABLE pension_contributions IS 'Employer pension contributions with reconciliation and blockchain verification';
COMMENT ON TABLE pension_trustee_boards IS 'Joint labor-management trustee boards for pension governance';
COMMENT ON TABLE pension_trustees IS 'Individual trustees serving on pension boards';
COMMENT ON TABLE pension_trustee_meetings IS 'Trustee board meetings with attendance and voting records';
COMMENT ON TABLE pension_benefit_claims IS 'Pension benefit claims and payment processing';
COMMENT ON TABLE pension_actuarial_valuations IS 'Actuarial valuations for funding and compliance';

COMMENT ON FUNCTION calculate_pension_estimate IS 'Calculates estimated pension benefit based on service credits and earnings';

-- =====================================================================================
-- PART 8: HEALTH & WELFARE TRUST ADMINISTRATION
-- =====================================================================================

-- H&W plan types
DROP TYPE IF EXISTS hw_plan_type CASCADE;
CREATE TYPE hw_plan_type AS ENUM (
  'health_medical',
  'dental',
  'vision',
  'prescription',
  'disability_short_term',
  'disability_long_term',
  'life_insurance',
  'accidental_death',
  'critical_illness',
  'employee_assistance'
);

-- Health & Welfare plans
CREATE TABLE IF NOT EXISTS hw_benefit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization context
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Plan identification
  plan_name VARCHAR(200) NOT NULL,
  plan_type hw_plan_type NOT NULL,
  plan_number VARCHAR(50),
  
  -- Carrier/TPA
  carrier_name VARCHAR(200),
  carrier_policy_number VARCHAR(100),
  tpa_name VARCHAR(200), -- Third-Party Administrator
  tpa_contact VARCHAR(200),
  
  -- Coverage details
  coverage_type VARCHAR(50), -- individual, family, dependent
  coverage_tier_structure JSONB, -- {single, couple, family} rates
  
  -- Financial
  monthly_premium_amount DECIMAL(10,2),
  employer_contribution_percentage DECIMAL(5,2),
  employee_contribution_percentage DECIMAL(5,2),
  annual_maximum DECIMAL(10,2),
  lifetime_maximum DECIMAL(12,2),
  deductible DECIMAL(8,2),
  coinsurance_percentage DECIMAL(5,2),
  out_of_pocket_maximum DECIMAL(10,2),
  
  -- Eligibility
  waiting_period_days INTEGER DEFAULT 0,
  hours_required_per_month INTEGER, -- For multi-employer eligibility
  
  -- Plan details
  plan_year_start DATE,
  plan_year_end DATE,
  renewal_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_self_insured BOOLEAN DEFAULT false, -- vs. fully insured
  
  -- Documents
  plan_booklet_url TEXT,
  summary_plan_description_url TEXT, -- SPD (ERISA requirement)
  benefits_at_a_glance_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_hw_plans_org ON hw_benefit_plans(organization_id);
CREATE INDEX idx_hw_plans_type ON hw_benefit_plans(plan_type);
CREATE INDEX idx_hw_plans_carrier ON hw_benefit_plans(carrier_name);

-- RLS policies
ALTER TABLE hw_benefit_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_hw_plans ON hw_benefit_plans
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY manage_hw_plans ON hw_benefit_plans
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee', 'hr_admin')
  );

-- H&W benefit enrollment
CREATE TABLE IF NOT EXISTS hw_benefit_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  hw_plan_id UUID NOT NULL REFERENCES hw_benefit_plans(id),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- Enrollment details
  enrollment_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  termination_date DATE,
  
  -- Coverage tier
  coverage_tier VARCHAR(50), -- single, couple, family
  
  -- Dependents
  dependents JSONB, -- Array of {name, relationship, dob, ssn_last4}
  total_dependents INTEGER DEFAULT 0,
  
  -- Premium
  monthly_premium DECIMAL(10,2),
  employer_contribution DECIMAL(10,2),
  employee_contribution DECIMAL(10,2),
  
  -- Status
  enrollment_status VARCHAR(50) DEFAULT 'active', -- active, terminated, suspended, pending
  
  -- Qualifying event
  qualifying_event VARCHAR(100), -- new_hire, open_enrollment, marriage, birth, loss_of_coverage
  qualifying_event_date DATE,
  
  -- Elections
  waived_coverage BOOLEAN DEFAULT false,
  waiver_reason TEXT,
  
  -- Documents
  enrollment_form_url TEXT,
  beneficiary_designation_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_member_plan_period UNIQUE (hw_plan_id, member_id, effective_date)
);

CREATE INDEX idx_hw_enrollments_plan ON hw_benefit_enrollments(hw_plan_id);
CREATE INDEX idx_hw_enrollments_member ON hw_benefit_enrollments(member_id);
CREATE INDEX idx_hw_enrollments_status ON hw_benefit_enrollments(enrollment_status);
CREATE INDEX idx_hw_enrollments_effective ON hw_benefit_enrollments(effective_date);

-- RLS policies
ALTER TABLE hw_benefit_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_hw_enrollments ON hw_benefit_enrollments
  FOR SELECT
  USING (
    hw_plan_id IN (
      SELECT id FROM hw_benefit_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

CREATE POLICY manage_hw_enrollments ON hw_benefit_enrollments
  FOR ALL
  USING (
    hw_plan_id IN (
      SELECT id FROM hw_benefit_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee', 'hr_admin')
  );

-- =====================================================================================
-- PART 9: HEALTH & WELFARE CLAIMS PROCESSING
-- =====================================================================================

-- H&W claim status
DROP TYPE IF EXISTS hw_claim_status CASCADE;
CREATE TYPE hw_claim_status AS ENUM (
  'submitted',
  'received',
  'pending_review',
  'under_investigation',
  'approved',
  'partially_approved',
  'denied',
  'paid',
  'appealed',
  'appeal_denied',
  'appeal_approved'
);

-- H&W benefit claims
CREATE TABLE IF NOT EXISTS hw_benefit_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  hw_plan_id UUID NOT NULL REFERENCES hw_benefit_plans(id),
  enrollment_id UUID NOT NULL REFERENCES hw_benefit_enrollments(id),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- Claim identification
  claim_number VARCHAR(50) UNIQUE NOT NULL,
  carrier_claim_number VARCHAR(100), -- Carrier's reference number
  
  -- Service details
  service_date DATE NOT NULL,
  service_type VARCHAR(100), -- office_visit, surgery, prescription, etc.
  diagnosis_codes JSONB, -- Array of ICD-10 codes
  procedure_codes JSONB, -- Array of CPT codes
  
  -- Provider information
  provider_name VARCHAR(200),
  provider_npi VARCHAR(20), -- National Provider Identifier
  provider_type VARCHAR(100), -- physician, hospital, pharmacy, etc.
  provider_tax_id VARCHAR(20),
  
  -- Patient information
  patient_name VARCHAR(200),
  patient_relationship VARCHAR(50), -- self, spouse, child, dependent
  
  -- Financial amounts
  total_billed_amount DECIMAL(10,2) NOT NULL,
  eligible_amount DECIMAL(10,2),
  deductible_applied DECIMAL(10,2) DEFAULT 0,
  coinsurance_amount DECIMAL(10,2) DEFAULT 0,
  copay_amount DECIMAL(10,2) DEFAULT 0,
  plan_paid_amount DECIMAL(10,2),
  member_responsibility DECIMAL(10,2),
  
  -- Coordination of benefits (COB)
  is_cob BOOLEAN DEFAULT false,
  primary_payer VARCHAR(200),
  primary_payer_amount DECIMAL(10,2),
  
  -- Status and workflow
  claim_status hw_claim_status DEFAULT 'submitted',
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date DATE,
  processed_date DATE,
  paid_date DATE,
  
  -- Denial/Appeal
  denial_reason TEXT,
  denial_code VARCHAR(50),
  appeal_deadline DATE,
  appeal_submitted_date DATE,
  appeal_decision_date DATE,
  appeal_notes TEXT,
  
  -- EDI tracking
  edi_837_file_url TEXT, -- Outbound claim file
  edi_835_file_url TEXT, -- Remittance advice
  edi_277_status_url TEXT, -- Claim status
  
  -- Payment
  payment_method VARCHAR(50), -- direct_deposit, cheque, provider_payment
  payment_reference VARCHAR(100),
  eob_url TEXT, -- Explanation of Benefits
  
  -- Fraud detection flags
  flagged_for_review BOOLEAN DEFAULT false,
  fraud_score INTEGER, -- 0-100
  fraud_indicators JSONB,
  
  -- Documents
  claim_form_url TEXT,
  supporting_documents_urls JSONB,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by UUID,
  processed_by UUID
);

CREATE INDEX idx_hw_claims_plan ON hw_benefit_claims(hw_plan_id);
CREATE INDEX idx_hw_claims_enrollment ON hw_benefit_claims(enrollment_id);
CREATE INDEX idx_hw_claims_member ON hw_benefit_claims(member_id);
CREATE INDEX idx_hw_claims_status ON hw_benefit_claims(claim_status);
CREATE INDEX idx_hw_claims_service_date ON hw_benefit_claims(service_date);
CREATE INDEX idx_hw_claims_carrier_number ON hw_benefit_claims(carrier_claim_number);
CREATE INDEX idx_hw_claims_fraud ON hw_benefit_claims(flagged_for_review, fraud_score);

-- RLS policies
ALTER TABLE hw_benefit_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_hw_claims ON hw_benefit_claims
  FOR SELECT
  USING (
    hw_plan_id IN (
      SELECT id FROM hw_benefit_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

CREATE POLICY manage_hw_claims ON hw_benefit_claims
  FOR ALL
  USING (
    hw_plan_id IN (
      SELECT id FROM hw_benefit_plans 
      WHERE organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee', 'hr_admin', 'claims_adjuster')
  );

-- =====================================================================================
-- PART 10: COMPLIANCE & REPORTING
-- =====================================================================================

-- Regulatory compliance reports
CREATE TABLE IF NOT EXISTS trust_compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan reference (can be pension or H&W)
  pension_plan_id UUID REFERENCES pension_plans(id),
  hw_plan_id UUID REFERENCES hw_benefit_plans(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Report type
  report_type VARCHAR(100) NOT NULL, -- Form_5500, T3_Trust_Return, SAR, SOC1_Type2, etc.
  report_year INTEGER NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  
  -- Filing details
  due_date DATE NOT NULL,
  filed_date DATE,
  filing_status VARCHAR(50) DEFAULT 'pending', -- pending, filed, late, amended
  
  -- Regulator information
  regulator VARCHAR(100), -- IRS, DOL, CRA, OSFI, etc.
  filing_confirmation_number VARCHAR(100),
  
  -- Financial summary (from report)
  total_plan_assets DECIMAL(15,2),
  total_plan_liabilities DECIMAL(15,2),
  total_contributions_received DECIMAL(12,2),
  total_benefits_paid DECIMAL(12,2),
  administrative_expenses DECIMAL(10,2),
  
  -- Auditor information
  audit_required BOOLEAN DEFAULT false,
  auditor_name VARCHAR(200),
  auditor_opinion VARCHAR(50), -- unqualified, qualified, adverse, disclaimer
  audit_report_url TEXT,
  
  -- Late filing
  is_late BOOLEAN DEFAULT false,
  days_late INTEGER,
  late_filing_penalty DECIMAL(10,2),
  penalty_paid BOOLEAN DEFAULT false,
  
  -- Reports and attachments
  report_file_url TEXT NOT NULL,
  schedules_urls JSONB, -- Additional schedules
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prepared_by UUID,
  filed_by UUID,
  
  CONSTRAINT chk_plan_reference CHECK (
    (pension_plan_id IS NOT NULL AND hw_plan_id IS NULL) OR
    (pension_plan_id IS NULL AND hw_plan_id IS NOT NULL) OR
    (pension_plan_id IS NULL AND hw_plan_id IS NULL AND organization_id IS NOT NULL)
  )
);

CREATE INDEX idx_compliance_reports_pension ON trust_compliance_reports(pension_plan_id);
CREATE INDEX idx_compliance_reports_hw ON trust_compliance_reports(hw_plan_id);
CREATE INDEX idx_compliance_reports_org ON trust_compliance_reports(organization_id);
CREATE INDEX idx_compliance_reports_type_year ON trust_compliance_reports(report_type, report_year);
CREATE INDEX idx_compliance_reports_status ON trust_compliance_reports(filing_status);
CREATE INDEX idx_compliance_reports_due_date ON trust_compliance_reports(due_date);

-- RLS policies
ALTER TABLE trust_compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_compliance_reports ON trust_compliance_reports
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY manage_compliance_reports ON trust_compliance_reports
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'trustee')
  );

-- =====================================================================================
-- PART 11: AGGREGATION VIEWS FOR REPORTING
-- =====================================================================================

-- View: Pension plan funding summary
CREATE OR REPLACE VIEW v_pension_funding_summary AS
SELECT 
  pp.id as plan_id,
  pp.organization_id,
  pp.plan_name,
  pp.plan_type,
  pp.is_multi_employer,
  pp.current_assets,
  pp.current_liabilities,
  pp.funded_ratio,
  pav.going_concern_funded_ratio as latest_gc_funded_ratio,
  pav.solvency_funded_ratio as latest_solvency_funded_ratio,
  pav.valuation_date as latest_valuation_date,
  COUNT(DISTINCT phb.member_id) as total_active_members,
  SUM(phb.pensionable_hours) as total_pensionable_hours,
  COUNT(DISTINCT pbc.id) as total_benefit_claims,
  SUM(CASE WHEN pbc.claim_status = 'approved' THEN pbc.annual_benefit_amount ELSE 0 END) as total_annual_benefits_approved
FROM pension_plans pp
LEFT JOIN pension_hours_banks phb ON pp.id = phb.pension_plan_id
LEFT JOIN pension_benefit_claims pbc ON pp.id = pbc.pension_plan_id
LEFT JOIN LATERAL (
  SELECT * FROM pension_actuarial_valuations pav2
  WHERE pav2.pension_plan_id = pp.id
  ORDER BY pav2.valuation_date DESC
  LIMIT 1
) pav ON true
GROUP BY 
  pp.id, pp.organization_id, pp.plan_name, pp.plan_type, pp.is_multi_employer,
  pp.current_assets, pp.current_liabilities, pp.funded_ratio,
  pav.going_concern_funded_ratio, pav.solvency_funded_ratio, pav.valuation_date;

-- View: H&W claims aging report
CREATE OR REPLACE VIEW v_hw_claims_aging AS
SELECT 
  hwp.id as plan_id,
  hwp.organization_id,
  hwp.plan_name,
  hwp.plan_type,
  COUNT(*) as total_claims,
  SUM(hwc.total_billed_amount) as total_billed,
  SUM(hwc.plan_paid_amount) as total_paid,
  COUNT(*) FILTER (WHERE hwc.claim_status IN ('submitted', 'received', 'pending_review')) as pending_count,
  SUM(hwc.total_billed_amount) FILTER (WHERE hwc.claim_status IN ('submitted', 'received', 'pending_review')) as pending_amount,
  COUNT(*) FILTER (WHERE hwc.submission_date < CURRENT_DATE - INTERVAL '30 days' AND hwc.claim_status NOT IN ('paid', 'denied', 'appeal_denied')) as aged_30_days_count,
  COUNT(*) FILTER (WHERE hwc.submission_date < CURRENT_DATE - INTERVAL '60 days' AND hwc.claim_status NOT IN ('paid', 'denied', 'appeal_denied')) as aged_60_days_count,
  COUNT(*) FILTER (WHERE hwc.submission_date < CURRENT_DATE - INTERVAL '90 days' AND hwc.claim_status NOT IN ('paid', 'denied', 'appeal_denied')) as aged_90_days_count,
  AVG(COALESCE(hwc.processed_date, CURRENT_DATE) - hwc.submission_date) as avg_processing_days
FROM hw_benefit_plans hwp
LEFT JOIN hw_benefit_claims hwc ON hwp.id = hwc.hw_plan_id
GROUP BY hwp.id, hwp.organization_id, hwp.plan_name, hwp.plan_type;

-- View: Member eligibility snapshot
CREATE OR REPLACE VIEW v_member_benefit_eligibility AS
SELECT 
  m.id as member_id,
  m.organization_id,
  m.first_name,
  m.last_name,
  m.status as membership_status,
  
  -- Pension eligibility
  COUNT(DISTINCT phb.pension_plan_id) as pension_plans_enrolled,
  SUM(phb.pensionable_hours) as total_pension_hours,
  MAX(phb.reporting_period_end) as last_pension_contribution_date,
  
  -- H&W eligibility
  COUNT(DISTINCT hwe.hw_plan_id) as hw_plans_enrolled,
  SUM(CASE WHEN hwe.enrollment_status = 'active' THEN 1 ELSE 0 END) as active_hw_enrollments,
  MAX(hwe.effective_date) as latest_hw_enrollment_date,
  
  -- Claims activity
  COUNT(DISTINCT pbc.id) as total_pension_claims,
  COUNT(DISTINCT hwc.id) as total_hw_claims,
  SUM(COALESCE(pbc.annual_benefit_amount, 0)) as total_pension_benefits_claimed,
  SUM(COALESCE(hwc.plan_paid_amount, 0)) as total_hw_benefits_paid
  
FROM members m
LEFT JOIN pension_hours_banks phb ON m.id = phb.member_id
LEFT JOIN hw_benefit_enrollments hwe ON m.id = hwe.member_id
LEFT JOIN pension_benefit_claims pbc ON m.id = pbc.member_id
LEFT JOIN hw_benefit_claims hwc ON m.id = hwc.member_id
GROUP BY m.id, m.organization_id, m.first_name, m.last_name, m.status;

-- =====================================================================================
-- PART 12: HELPER FUNCTIONS FOR TRUST ADMINISTRATION
-- =====================================================================================

-- Function: Check pension vesting eligibility
CREATE OR REPLACE FUNCTION check_pension_vesting(
  p_member_id UUID,
  p_pension_plan_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_years_of_service DECIMAL;
  v_is_vested BOOLEAN;
  v_vesting_date DATE;
BEGIN
  -- Get plan vesting requirements
  SELECT * INTO v_plan
  FROM pension_plans
  WHERE id = p_pension_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pension plan not found: %', p_pension_plan_id;
  END IF;
  
  -- Calculate years of service
  SELECT COALESCE(SUM(contribution_credits), 0)
  INTO v_years_of_service
  FROM pension_hours_banks
  WHERE member_id = p_member_id
  AND pension_plan_id = p_pension_plan_id;
  
  -- Determine vesting
  v_is_vested := v_years_of_service >= v_plan.vesting_period_years;
  
  -- Calculate vesting date
  IF v_is_vested THEN
    SELECT MIN(reporting_period_end)
    INTO v_vesting_date
    FROM (
      SELECT 
        reporting_period_end,
        SUM(contribution_credits) OVER (ORDER BY reporting_period_end) as cumulative_credits
      FROM pension_hours_banks
      WHERE member_id = p_member_id
      AND pension_plan_id = p_pension_plan_id
    ) sub
    WHERE cumulative_credits >= v_plan.vesting_period_years;
  END IF;
  
  RETURN jsonb_build_object(
    'member_id', p_member_id,
    'pension_plan_id', p_pension_plan_id,
    'is_vested', v_is_vested,
    'years_of_service', ROUND(v_years_of_service, 2),
    'vesting_period_required', v_plan.vesting_period_years,
    'vesting_date', v_vesting_date,
    'years_until_vested', GREATEST(0, v_plan.vesting_period_years - v_years_of_service)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate Form 5500 data export
CREATE OR REPLACE FUNCTION generate_form_5500_data(
  p_pension_plan_id UUID,
  p_plan_year INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_total_participants INTEGER;
  v_total_contributions DECIMAL;
  v_total_benefits_paid DECIMAL;
  v_admin_expenses DECIMAL;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan
  FROM pension_plans pp
  WHERE pp.id = p_pension_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pension plan not found: %', p_pension_plan_id;
  END IF;
  
  -- Calculate plan year dates
  v_start_date := DATE(p_plan_year || '-01-01');
  v_end_date := DATE(p_plan_year || '-12-31');
  
  -- Count participants
  SELECT COUNT(DISTINCT member_id)
  INTO v_total_participants
  FROM pension_hours_banks
  WHERE pension_plan_id = p_pension_plan_id
  AND reporting_period_start BETWEEN v_start_date AND v_end_date;
  
  -- Sum contributions
  SELECT COALESCE(SUM(total_contribution_amount), 0)
  INTO v_total_contributions
  FROM pension_contributions
  WHERE pension_plan_id = p_pension_plan_id
  AND contribution_period_start BETWEEN v_start_date AND v_end_date;
  
  -- Sum benefits paid
  SELECT COALESCE(SUM(annual_benefit_amount), 0)
  INTO v_total_benefits_paid
  FROM pension_benefit_claims
  WHERE pension_plan_id = p_pension_plan_id
  AND benefit_start_date BETWEEN v_start_date AND v_end_date
  AND claim_status = 'paid';
  
  -- Build Form 5500 data structure
  RETURN jsonb_build_object(
    'plan_name', v_plan.plan_name,
    'plan_number', v_plan.plan_number,
    'ein', v_plan.irs_ein,
    'plan_year', p_plan_year,
    'plan_year_begin', v_start_date,
    'plan_year_end', v_end_date,
    'plan_type_code', CASE 
      WHEN v_plan.plan_type = 'defined_benefit' THEN '2J'
      WHEN v_plan.plan_type = 'defined_contribution' THEN '2E'
      ELSE '2K'
    END,
    'participants_eof_year', v_total_participants,
    'total_assets_eoy', v_plan.current_assets,
    'total_liabilities_eoy', v_plan.current_liabilities,
    'employer_contributions', v_total_contributions,
    'benefits_paid', v_total_benefits_paid,
    'administrative_expenses', v_admin_expenses,
    'funded_ratio', v_plan.funded_ratio,
    'actuary_firm', v_plan.actuary_firm,
    'is_multi_employer', v_plan.is_multi_employer,
    'generated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- FINAL COMMENTS
-- =====================================================================================

COMMENT ON TABLE hw_benefit_plans IS 'Health & welfare benefit plans including medical, dental, vision, disability, and life insurance';
COMMENT ON TABLE hw_benefit_enrollments IS 'Member enrollment in H&W benefit plans with dependent tracking';
COMMENT ON TABLE hw_benefit_claims IS 'Health & welfare benefit claims processing with EDI tracking and fraud detection';
COMMENT ON TABLE trust_compliance_reports IS 'Regulatory compliance reports for pension and H&W trusts (Form 5500, T3, SOC-1, etc.)';

COMMENT ON FUNCTION check_pension_vesting IS 'Determines if a member has met vesting requirements for pension benefits';
COMMENT ON FUNCTION generate_form_5500_data IS 'Generates IRS Form 5500 Annual Return data for a pension plan year';

COMMENT ON VIEW v_pension_funding_summary IS 'Comprehensive pension plan funding status with member and claim counts';
COMMENT ON VIEW v_hw_claims_aging IS 'Health & welfare claims aging report with processing time metrics';
COMMENT ON VIEW v_member_benefit_eligibility IS 'Member eligibility snapshot across pension and H&W benefits';
