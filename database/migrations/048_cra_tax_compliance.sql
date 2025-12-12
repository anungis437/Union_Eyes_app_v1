-- Migration: CRA Tax Compliance & Receipting
-- Description: T4A slip generation, COPE political contribution receipts, and CRA XML export
-- Phase: 2 - High-Value CLC Features
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: TAX SLIP TYPES & CONFIGURATION
-- =====================================================================================

-- Tax slip types
DROP TYPE IF EXISTS tax_slip_type CASCADE;
CREATE TYPE tax_slip_type AS ENUM (
  't4a', -- Statement of Pension, Retirement, Annuity, and Other Income
  't4a_box_016', -- Pension or superannuation
  't4a_box_018', -- Lump-sum payments
  't4a_box_048', -- Fees for services
  'cope_receipt', -- COPE political contribution receipt
  'rl_1', -- Quebec: Relevé 1 (provincial equivalent of T4A)
  'rl_24' -- Quebec: Political contribution receipt
);

-- Tax year configuration
CREATE TABLE IF NOT EXISTS tax_year_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Tax year
  tax_year INTEGER NOT NULL,
  
  -- Filing deadlines
  t4a_filing_deadline DATE NOT NULL, -- Last day of February following tax year
  cope_receipt_deadline DATE NOT NULL, -- Last day of February following tax year
  rl_1_filing_deadline DATE, -- For Quebec filers
  
  -- CRA transmitter details
  cra_transmitter_number VARCHAR(8), -- MM999999
  cra_web_access_code VARCHAR(16),
  cra_business_number VARCHAR(15), -- 9-digit BN + 2-char program + 4-digit reference
  
  -- Revenu Québec (for Quebec unions)
  rq_identification_number VARCHAR(10),
  rq_file_number VARCHAR(6),
  
  -- Elections Canada (for COPE)
  elections_canada_agent_id VARCHAR(50),
  elections_canada_recipient_number VARCHAR(20),
  
  -- Contact information for slips
  organization_contact_name VARCHAR(200),
  organization_contact_phone VARCHAR(50),
  organization_contact_email VARCHAR(255),
  organization_mailing_address TEXT,
  
  -- Status
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  finalized_by UUID,
  
  -- CRA submission tracking
  xml_file_generated BOOLEAN DEFAULT false,
  xml_generated_at TIMESTAMP WITH TIME ZONE,
  submitted_to_cra BOOLEAN DEFAULT false,
  cra_submission_date DATE,
  cra_confirmation_number VARCHAR(100),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_org_tax_year UNIQUE (organization_id, tax_year)
);

CREATE INDEX idx_tax_year_config_org ON tax_year_configurations(organization_id);
CREATE INDEX idx_tax_year_config_year ON tax_year_configurations(tax_year);

-- RLS policies
ALTER TABLE tax_year_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_tax_year_config ON tax_year_configurations;
CREATE POLICY select_tax_year_config ON tax_year_configurations
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_tax_year_config ON tax_year_configurations;
CREATE POLICY manage_tax_year_config ON tax_year_configurations
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'treasurer')
  );

-- =====================================================================================
-- PART 2: TAX SLIPS (T4A, COPE RECEIPTS)
-- =====================================================================================

-- Tax slips master table
CREATE TABLE IF NOT EXISTS tax_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  tax_year_config_id UUID NOT NULL REFERENCES tax_year_configurations(id),
  
  -- Recipient information
  member_id UUID REFERENCES members(id),
  recipient_name VARCHAR(200) NOT NULL,
  recipient_sin VARCHAR(11), -- Social Insurance Number (encrypted in production)
  recipient_address_line1 VARCHAR(200),
  recipient_address_line2 VARCHAR(200),
  recipient_city VARCHAR(100),
  recipient_province VARCHAR(2), -- ON, QC, BC, etc.
  recipient_postal_code VARCHAR(7),
  
  -- Slip details
  slip_type tax_slip_type NOT NULL,
  tax_year INTEGER NOT NULL,
  slip_number VARCHAR(50) UNIQUE NOT NULL, -- Sequential number for tracking
  
  -- T4A amounts (all in CAD cents to avoid floating-point issues)
  box_016_pension_amount INTEGER DEFAULT 0, -- Pension or superannuation
  box_018_lump_sum_amount INTEGER DEFAULT 0, -- Lump-sum payments
  box_020_self_employed_commissions INTEGER DEFAULT 0,
  box_022_income_tax_deducted INTEGER DEFAULT 0, -- Federal tax withheld
  box_024_annuities INTEGER DEFAULT 0,
  box_048_fees_for_services INTEGER DEFAULT 0,
  box_101_resp_accumulated_income INTEGER DEFAULT 0,
  box_102_resp_educational_assistance INTEGER DEFAULT 0,
  box_105_other_income INTEGER DEFAULT 0,
  
  -- COPE political contribution
  cope_contribution_amount INTEGER DEFAULT 0, -- In cents
  cope_eligible_amount INTEGER DEFAULT 0, -- Amount eligible for tax credit
  cope_ineligible_amount INTEGER DEFAULT 0, -- Administrative/non-political portion
  
  -- Quebec RL-1 (if applicable)
  rl_1_box_o_pension_amount INTEGER DEFAULT 0,
  quebec_provincial_tax_withheld INTEGER DEFAULT 0,
  
  -- Source transactions
  source_transaction_ids JSONB, -- Array of transaction IDs that generated this slip
  
  -- Amendment tracking
  is_amended BOOLEAN DEFAULT false,
  original_slip_id UUID REFERENCES tax_slips(id),
  amendment_number INTEGER DEFAULT 0,
  amendment_reason TEXT,
  
  -- Status
  slip_status VARCHAR(50) DEFAULT 'draft', -- draft, finalized, issued, amended, cancelled
  finalized_at TIMESTAMP WITH TIME ZONE,
  issued_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery tracking
  delivery_method VARCHAR(50), -- email, mail, member_portal, cra_online
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_opened_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  
  -- PDF generation
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- CRA XML inclusion
  included_in_xml_batch BOOLEAN DEFAULT false,
  xml_batch_id UUID,
  
  -- Digital signature for authenticity
  slip_hash VARCHAR(128), -- SHA-512 of slip contents
  digital_signature TEXT, -- Organization's digital signature
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT chk_amounts_non_negative CHECK (
    box_016_pension_amount >= 0 AND
    box_018_lump_sum_amount >= 0 AND
    box_022_income_tax_deducted >= 0 AND
    cope_contribution_amount >= 0
  )
);

CREATE INDEX idx_tax_slips_org ON tax_slips(organization_id);
CREATE INDEX idx_tax_slips_config ON tax_slips(tax_year_config_id);
CREATE INDEX idx_tax_slips_member ON tax_slips(member_id);
CREATE INDEX idx_tax_slips_type ON tax_slips(slip_type);
CREATE INDEX idx_tax_slips_year ON tax_slips(tax_year);
CREATE INDEX idx_tax_slips_status ON tax_slips(slip_status);
CREATE INDEX idx_tax_slips_sin ON tax_slips(recipient_sin); -- For lookup, encrypt in production
CREATE INDEX idx_tax_slips_hash ON tax_slips(slip_hash);

-- RLS policies
ALTER TABLE tax_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_tax_slips ON tax_slips;
CREATE POLICY select_tax_slips ON tax_slips
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS manage_tax_slips ON tax_slips;
CREATE POLICY manage_tax_slips ON tax_slips
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'treasurer', 'bookkeeper')
  );

-- =====================================================================================
-- PART 3: CRA XML SUBMISSION BATCHES
-- =====================================================================================

-- CRA XML submission batches
CREATE TABLE IF NOT EXISTS cra_xml_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  tax_year_config_id UUID NOT NULL REFERENCES tax_year_configurations(id),
  
  -- Batch details
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  tax_year INTEGER NOT NULL,
  return_type VARCHAR(20) NOT NULL, -- T4A, RL1, COPE
  
  -- CRA transmitter information
  transmitter_number VARCHAR(8) NOT NULL,
  transmitter_name VARCHAR(200),
  transmitter_type VARCHAR(10) DEFAULT 'E', -- E=Employer, S=Service provider
  
  -- Counts and totals
  total_slips_count INTEGER NOT NULL,
  total_amount_reported INTEGER NOT NULL, -- In cents
  total_tax_withheld INTEGER NOT NULL, -- In cents
  
  -- XML file details
  xml_filename VARCHAR(255),
  xml_file_size_bytes BIGINT,
  xml_schema_version VARCHAR(20), -- e.g., "2.3"
  xml_content TEXT, -- Store full XML for audit trail
  xml_file_url TEXT, -- S3/Blob storage URL
  
  -- Generation
  generated_at TIMESTAMP WITH TIME ZONE,
  generated_by UUID,
  
  -- Submission to CRA
  submission_method VARCHAR(50), -- internet_file_transfer, web_forms, cra_api
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID,
  
  -- CRA response
  cra_confirmation_number VARCHAR(100),
  cra_accepted BOOLEAN,
  cra_response_date DATE,
  cra_response_details JSONB,
  cra_errors JSONB, -- Array of error messages if rejected
  
  -- Status
  batch_status VARCHAR(50) DEFAULT 'draft', -- draft, ready, submitted, accepted, rejected, resubmitted
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cra_batches_org ON cra_xml_batches(organization_id);
CREATE INDEX idx_cra_batches_config ON cra_xml_batches(tax_year_config_id);
CREATE INDEX idx_cra_batches_year ON cra_xml_batches(tax_year);
CREATE INDEX idx_cra_batches_status ON cra_xml_batches(batch_status);
CREATE INDEX idx_cra_batches_confirmation ON cra_xml_batches(cra_confirmation_number);

-- RLS policies
ALTER TABLE cra_xml_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_cra_batches ON cra_xml_batches;
CREATE POLICY select_cra_batches ON cra_xml_batches
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_cra_batches ON cra_xml_batches;
CREATE POLICY manage_cra_batches ON cra_xml_batches
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'treasurer')
  );

-- =====================================================================================
-- PART 4: COPE POLITICAL CONTRIBUTIONS TRACKING
-- =====================================================================================

-- COPE contribution transactions (links to financial transactions)
CREATE TABLE IF NOT EXISTS cope_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- Contribution details
  contribution_date DATE NOT NULL,
  contribution_type VARCHAR(50) DEFAULT 'payroll_deduction', -- payroll_deduction, lump_sum, event_donation
  
  -- Amounts (in cents)
  total_amount INTEGER NOT NULL,
  political_portion INTEGER NOT NULL, -- Eligible for tax credit
  administrative_portion INTEGER NOT NULL, -- Not eligible
  
  -- Tax credit eligibility
  is_eligible_for_credit BOOLEAN DEFAULT true,
  ineligible_reason TEXT,
  
  -- Payment method
  payment_method VARCHAR(50), -- payroll_deduction, cheque, credit_card, etransfer
  payment_reference VARCHAR(100),
  
  -- Source transaction
  dues_transaction_id UUID, -- Link to dues_transactions if from payroll
  financial_transaction_id UUID, -- Link to general ledger
  
  -- Receipt generation
  receipt_issued BOOLEAN DEFAULT false,
  receipt_issued_date DATE,
  tax_slip_id UUID REFERENCES tax_slips(id),
  
  -- Elections Canada reporting
  reported_to_elections_canada BOOLEAN DEFAULT false,
  elections_canada_report_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_cope_amounts CHECK (
    total_amount >= 0 AND
    political_portion >= 0 AND
    administrative_portion >= 0 AND
    total_amount = political_portion + administrative_portion
  )
);

CREATE INDEX idx_cope_contributions_org ON cope_contributions(organization_id);
CREATE INDEX idx_cope_contributions_member ON cope_contributions(member_id);
CREATE INDEX idx_cope_contributions_date ON cope_contributions(contribution_date);
CREATE INDEX idx_cope_contributions_slip ON cope_contributions(tax_slip_id);
CREATE INDEX idx_cope_contributions_dues_txn ON cope_contributions(dues_transaction_id);

-- RLS policies
ALTER TABLE cope_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_cope_contributions ON cope_contributions;
CREATE POLICY select_cope_contributions ON cope_contributions
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS manage_cope_contributions ON cope_contributions;
CREATE POLICY manage_cope_contributions ON cope_contributions
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'treasurer', 'bookkeeper')
  );

-- =====================================================================================
-- PART 5: FUNCTION - GENERATE T4A SLIPS FROM PENSION BENEFITS
-- =====================================================================================

-- Function: Generate T4A slips for pension benefits paid in a tax year
CREATE OR REPLACE FUNCTION generate_t4a_slips_for_year(
  p_organization_id UUID,
  p_tax_year INTEGER,
  p_minimum_amount INTEGER DEFAULT 500 -- Minimum $5.00 to issue slip (in cents)
) RETURNS JSONB AS $$
DECLARE
  v_config_id UUID;
  v_slips_created INTEGER := 0;
  v_total_amount INTEGER := 0;
  v_claim RECORD;
  v_slip_id UUID;
BEGIN
  -- Get or create tax year configuration
  SELECT id INTO v_config_id
  FROM tax_year_configurations
  WHERE organization_id = p_organization_id
  AND tax_year = p_tax_year;
  
  IF v_config_id IS NULL THEN
    -- Create default configuration
    INSERT INTO tax_year_configurations (
      organization_id,
      tax_year,
      t4a_filing_deadline,
      cope_receipt_deadline
    ) VALUES (
      p_organization_id,
      p_tax_year,
      DATE(p_tax_year + 1 || '-02-28'),
      DATE(p_tax_year + 1 || '-02-28')
    ) RETURNING id INTO v_config_id;
  END IF;
  
  -- Generate T4A slip for each member who received pension benefits
  FOR v_claim IN
    SELECT 
      m.id as member_id,
      m.first_name || ' ' || m.last_name as recipient_name,
      m.sin as recipient_sin,
      m.address_line1,
      m.address_line2,
      m.city,
      m.province,
      m.postal_code,
      SUM(CASE 
        WHEN pbc.claim_type = 'retirement_pension' THEN pbc.annual_benefit_amount * 100 -- Convert to cents
        ELSE 0
      END)::INTEGER as total_pension,
      SUM(CASE 
        WHEN pbc.claim_type IN ('lump_sum_withdrawal', 'death_benefit') THEN pbc.lump_sum_amount * 100
        ELSE 0
      END)::INTEGER as total_lump_sum,
      SUM(pbc.tax_withholding_amount * 100)::INTEGER as total_tax_withheld,
      array_agg(pbc.id) as claim_ids
    FROM pension_benefit_claims pbc
    JOIN members m ON pbc.member_id = m.id
    WHERE m.organization_id = p_organization_id
    AND EXTRACT(YEAR FROM pbc.benefit_start_date) = p_tax_year
    AND pbc.claim_status = 'paid'
    GROUP BY m.id, m.first_name, m.last_name, m.sin, m.address_line1, 
             m.address_line2, m.city, m.province, m.postal_code
    HAVING (SUM(CASE 
      WHEN pbc.claim_type = 'retirement_pension' THEN pbc.annual_benefit_amount * 100
      ELSE 0
    END) + SUM(CASE 
      WHEN pbc.claim_type IN ('lump_sum_withdrawal', 'death_benefit') THEN pbc.lump_sum_amount * 100
      ELSE 0
    END)) >= p_minimum_amount
  LOOP
    -- Create T4A slip
    INSERT INTO tax_slips (
      organization_id,
      tax_year_config_id,
      member_id,
      recipient_name,
      recipient_sin,
      recipient_address_line1,
      recipient_address_line2,
      recipient_city,
      recipient_province,
      recipient_postal_code,
      slip_type,
      tax_year,
      slip_number,
      box_016_pension_amount,
      box_018_lump_sum_amount,
      box_022_income_tax_deducted,
      source_transaction_ids,
      slip_status
    ) VALUES (
      p_organization_id,
      v_config_id,
      v_claim.member_id,
      v_claim.recipient_name,
      v_claim.recipient_sin,
      v_claim.address_line1,
      v_claim.address_line2,
      v_claim.city,
      v_claim.province,
      v_claim.postal_code,
      't4a',
      p_tax_year,
      'T4A-' || p_tax_year || '-' || LPAD(v_slips_created + 1::TEXT, 6, '0'),
      v_claim.total_pension,
      v_claim.total_lump_sum,
      v_claim.total_tax_withheld,
      to_jsonb(v_claim.claim_ids),
      'draft'
    ) RETURNING id INTO v_slip_id;
    
    v_slips_created := v_slips_created + 1;
    v_total_amount := v_total_amount + v_claim.total_pension + v_claim.total_lump_sum;
  END LOOP;
  
  RETURN jsonb_build_object(
    'organization_id', p_organization_id,
    'tax_year', p_tax_year,
    'slips_created', v_slips_created,
    'total_amount_cents', v_total_amount,
    'total_amount_dollars', ROUND(v_total_amount / 100.0, 2),
    'tax_year_config_id', v_config_id,
    'generated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- PART 6: FUNCTION - GENERATE COPE RECEIPTS FOR TAX YEAR
-- =====================================================================================

-- Function: Generate COPE political contribution receipts for a tax year
CREATE OR REPLACE FUNCTION generate_cope_receipts_for_year(
  p_organization_id UUID,
  p_tax_year INTEGER,
  p_minimum_amount INTEGER DEFAULT 0 -- No minimum for COPE receipts
) RETURNS JSONB AS $$
DECLARE
  v_config_id UUID;
  v_receipts_created INTEGER := 0;
  v_total_amount INTEGER := 0;
  v_contribution RECORD;
  v_slip_id UUID;
BEGIN
  -- Get or create tax year configuration
  SELECT id INTO v_config_id
  FROM tax_year_configurations
  WHERE organization_id = p_organization_id
  AND tax_year = p_tax_year;
  
  IF v_config_id IS NULL THEN
    INSERT INTO tax_year_configurations (
      organization_id,
      tax_year,
      t4a_filing_deadline,
      cope_receipt_deadline
    ) VALUES (
      p_organization_id,
      p_tax_year,
      DATE(p_tax_year + 1 || '-02-28'),
      DATE(p_tax_year + 1 || '-02-28')
    ) RETURNING id INTO v_config_id;
  END IF;
  
  -- Generate COPE receipt for each member with contributions
  FOR v_contribution IN
    SELECT 
      m.id as member_id,
      m.first_name || ' ' || m.last_name as recipient_name,
      m.sin as recipient_sin,
      m.address_line1,
      m.address_line2,
      m.city,
      m.province,
      m.postal_code,
      SUM(cc.total_amount)::INTEGER as total_contributed,
      SUM(cc.political_portion)::INTEGER as eligible_amount,
      SUM(cc.administrative_portion)::INTEGER as ineligible_amount,
      array_agg(cc.id) as contribution_ids
    FROM cope_contributions cc
    JOIN members m ON cc.member_id = m.id
    WHERE m.organization_id = p_organization_id
    AND EXTRACT(YEAR FROM cc.contribution_date) = p_tax_year
    GROUP BY m.id, m.first_name, m.last_name, m.sin, m.address_line1, 
             m.address_line2, m.city, m.province, m.postal_code
    HAVING SUM(cc.total_amount) > p_minimum_amount
  LOOP
    -- Create COPE receipt
    INSERT INTO tax_slips (
      organization_id,
      tax_year_config_id,
      member_id,
      recipient_name,
      recipient_sin,
      recipient_address_line1,
      recipient_address_line2,
      recipient_city,
      recipient_province,
      recipient_postal_code,
      slip_type,
      tax_year,
      slip_number,
      cope_contribution_amount,
      cope_eligible_amount,
      cope_ineligible_amount,
      source_transaction_ids,
      slip_status
    ) VALUES (
      p_organization_id,
      v_config_id,
      v_contribution.member_id,
      v_contribution.recipient_name,
      v_contribution.recipient_sin,
      v_contribution.address_line1,
      v_contribution.address_line2,
      v_contribution.city,
      v_contribution.province,
      v_contribution.postal_code,
      'cope_receipt',
      p_tax_year,
      'COPE-' || p_tax_year || '-' || LPAD(v_receipts_created + 1::TEXT, 6, '0'),
      v_contribution.total_contributed,
      v_contribution.eligible_amount,
      v_contribution.ineligible_amount,
      to_jsonb(v_contribution.contribution_ids),
      'draft'
    ) RETURNING id INTO v_slip_id;
    
    -- Mark contributions as receipted
    UPDATE cope_contributions
    SET receipt_issued = true,
        receipt_issued_date = CURRENT_DATE,
        tax_slip_id = v_slip_id
    WHERE id = ANY(v_contribution.contribution_ids);
    
    v_receipts_created := v_receipts_created + 1;
    v_total_amount := v_total_amount + v_contribution.total_contributed;
  END LOOP;
  
  RETURN jsonb_build_object(
    'organization_id', p_organization_id,
    'tax_year', p_tax_year,
    'receipts_created', v_receipts_created,
    'total_amount_cents', v_total_amount,
    'total_amount_dollars', ROUND(v_total_amount / 100.0, 2),
    'tax_year_config_id', v_config_id,
    'generated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- PART 7: FUNCTION - GENERATE CRA XML EXPORT (T4A)
-- =====================================================================================

-- Function: Generate CRA XML file structure for T4A submission
CREATE OR REPLACE FUNCTION generate_cra_t4a_xml_data(
  p_tax_year_config_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_config RECORD;
  v_slips JSONB;
  v_summary JSONB;
  v_total_slips INTEGER;
  v_total_pension INTEGER := 0;
  v_total_lump_sum INTEGER := 0;
  v_total_tax_withheld INTEGER := 0;
BEGIN
  -- Get configuration
  SELECT 
    tyc.*,
    o.name as organization_name,
    o.address_line1 as org_address_line1,
    o.city as org_city,
    o.province as org_province,
    o.postal_code as org_postal_code
  INTO v_config
  FROM tax_year_configurations tyc
  JOIN organizations o ON tyc.organization_id = o.id
  WHERE tyc.id = p_tax_year_config_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tax year configuration not found: %', p_tax_year_config_id;
  END IF;
  
  -- Get all finalized T4A slips for this tax year
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'slip_number', ts.slip_number,
        'recipient_sin', ts.recipient_sin,
        'recipient_name', ts.recipient_name,
        'recipient_address', jsonb_build_object(
          'line1', ts.recipient_address_line1,
          'line2', ts.recipient_address_line2,
          'city', ts.recipient_city,
          'province', ts.recipient_province,
          'postal_code', ts.recipient_postal_code
        ),
        'box_016', ts.box_016_pension_amount,
        'box_018', ts.box_018_lump_sum_amount,
        'box_020', ts.box_020_self_employed_commissions,
        'box_022', ts.box_022_income_tax_deducted,
        'box_024', ts.box_024_annuities,
        'box_048', ts.box_048_fees_for_services
      )
    ),
    COUNT(*),
    SUM(ts.box_016_pension_amount),
    SUM(ts.box_018_lump_sum_amount),
    SUM(ts.box_022_income_tax_deducted)
  INTO v_slips, v_total_slips, v_total_pension, v_total_lump_sum, v_total_tax_withheld
  FROM tax_slips ts
  WHERE ts.tax_year_config_id = p_tax_year_config_id
  AND ts.slip_type = 't4a'
  AND ts.slip_status = 'finalized';
  
  -- Build summary
  v_summary := jsonb_build_object(
    'total_slips', v_total_slips,
    'total_pension_cents', v_total_pension,
    'total_lump_sum_cents', v_total_lump_sum,
    'total_tax_withheld_cents', v_total_tax_withheld,
    'total_pension_dollars', ROUND(v_total_pension / 100.0, 2),
    'total_lump_sum_dollars', ROUND(v_total_lump_sum / 100.0, 2),
    'total_tax_withheld_dollars', ROUND(v_total_tax_withheld / 100.0, 2)
  );
  
  -- Return XML data structure
  RETURN jsonb_build_object(
    'transmitter', jsonb_build_object(
      'transmitter_number', v_config.cra_transmitter_number,
      'transmitter_name', v_config.organization_name,
      'transmitter_type', 'E',
      'contact_name', v_config.organization_contact_name,
      'contact_phone', v_config.organization_contact_phone,
      'contact_email', v_config.organization_contact_email,
      'address', jsonb_build_object(
        'line1', v_config.org_address_line1,
        'city', v_config.org_city,
        'province', v_config.org_province,
        'postal_code', v_config.org_postal_code
      )
    ),
    'return_info', jsonb_build_object(
      'tax_year', v_config.tax_year,
      'return_type', 'T4A',
      'business_number', v_config.cra_business_number,
      'filing_deadline', v_config.t4a_filing_deadline
    ),
    'summary', v_summary,
    'slips', COALESCE(v_slips, '[]'::jsonb),
    'generated_at', NOW(),
    'schema_version', '2.3'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- PART 8: AGGREGATION VIEWS
-- =====================================================================================

-- View: Tax slip summary by year and type
CREATE OR REPLACE VIEW v_tax_slip_summary AS
SELECT 
  ts.organization_id,
  ts.tax_year,
  ts.slip_type,
  ts.slip_status,
  COUNT(*) as total_slips,
  SUM(ts.box_016_pension_amount + ts.box_018_lump_sum_amount + ts.cope_contribution_amount) as total_amount_cents,
  ROUND(SUM(ts.box_016_pension_amount + ts.box_018_lump_sum_amount + ts.cope_contribution_amount) / 100.0, 2) as total_amount_dollars,
  SUM(ts.box_022_income_tax_deducted) as total_tax_withheld_cents,
  ROUND(SUM(ts.box_022_income_tax_deducted) / 100.0, 2) as total_tax_withheld_dollars,
  COUNT(*) FILTER (WHERE ts.email_sent_at IS NOT NULL) as slips_emailed,
  COUNT(*) FILTER (WHERE ts.downloaded_at IS NOT NULL) as slips_downloaded
FROM tax_slips ts
GROUP BY ts.organization_id, ts.tax_year, ts.slip_type, ts.slip_status;

-- View: COPE contribution summary by member
CREATE OR REPLACE VIEW v_cope_member_summary AS
SELECT 
  cc.organization_id,
  cc.member_id,
  m.first_name,
  m.last_name,
  m.email,
  COUNT(*) as total_contributions,
  MIN(cc.contribution_date) as first_contribution_date,
  MAX(cc.contribution_date) as latest_contribution_date,
  SUM(cc.total_amount) as lifetime_total_cents,
  ROUND(SUM(cc.total_amount) / 100.0, 2) as lifetime_total_dollars,
  SUM(cc.political_portion) as lifetime_political_cents,
  ROUND(SUM(cc.political_portion) / 100.0, 2) as lifetime_political_dollars,
  COUNT(*) FILTER (WHERE cc.receipt_issued = true) as receipts_issued,
  COUNT(*) FILTER (WHERE cc.receipt_issued = false) as receipts_pending
FROM cope_contributions cc
JOIN members m ON cc.member_id = m.id
GROUP BY cc.organization_id, cc.member_id, m.first_name, m.last_name, m.email;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE tax_year_configurations IS 'Tax year setup including CRA/Elections Canada credentials and filing deadlines';
COMMENT ON TABLE tax_slips IS 'T4A slips and COPE political contribution receipts with CRA compliance tracking';
COMMENT ON TABLE cra_xml_batches IS 'CRA XML submission batches with acceptance tracking';
COMMENT ON TABLE cope_contributions IS 'COPE political contributions linked to tax receipts';

COMMENT ON FUNCTION generate_t4a_slips_for_year IS 'Generates T4A slips for pension benefits paid in a tax year';
COMMENT ON FUNCTION generate_cope_receipts_for_year IS 'Generates COPE political contribution receipts for a tax year';
COMMENT ON FUNCTION generate_cra_t4a_xml_data IS 'Generates CRA-compliant XML data structure for T4A submission';

COMMENT ON VIEW v_tax_slip_summary IS 'Tax slip summary by year, type, and status';
COMMENT ON VIEW v_cope_member_summary IS 'COPE contribution summary by member with lifetime totals';
