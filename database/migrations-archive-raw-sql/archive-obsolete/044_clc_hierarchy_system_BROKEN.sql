-- Migration: CLC Multi-Level Tenant Hierarchy
-- Description: Implement CLC → Affiliate → Local structure with hierarchical data aggregation
-- Phase: 1 - Critical CLC Compliance
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: ORGANIZATION HIERARCHY SCHEMA
-- =====================================================================================

-- Organization levels enum
CREATE TYPE organization_level AS ENUM ('national', 'affiliate', 'local', 'chapter');

-- Add hierarchy columns to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS organization_level organization_level DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS clc_affiliate_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hierarchy_path TEXT, -- Materialized path for efficient queries
  ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_clc_affiliated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS per_capita_rate DECIMAL(10,2), -- Monthly per-capita tax to parent
  ADD COLUMN IF NOT EXISTS remittance_day INTEGER DEFAULT 15, -- Day of month for remittance
  ADD COLUMN IF NOT EXISTS last_remittance_date TIMESTAMP WITH TIME ZONE;

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_level ON organizations(organization_level);
CREATE INDEX IF NOT EXISTS idx_organizations_hierarchy_path ON organizations(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_organizations_clc_code ON organizations(clc_affiliate_code);

-- Trigger to maintain hierarchy_path automatically
CREATE OR REPLACE FUNCTION update_organization_hierarchy_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.hierarchy_path := NEW.id::TEXT;
    NEW.depth := 0;
  ELSE
    SELECT hierarchy_path || '.' || NEW.id::TEXT, depth + 1
    INTO NEW.hierarchy_path, NEW.depth
    FROM organizations
    WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_organization_hierarchy_path
  BEFORE INSERT OR UPDATE OF parent_id ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_hierarchy_path();

-- =====================================================================================
-- PART 2: PER-CAPITA REMITTANCE TRACKING
-- =====================================================================================

-- Per-capita remittance transactions
CREATE TABLE IF NOT EXISTS per_capita_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_organization_id UUID NOT NULL REFERENCES organizations(id),
  to_organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Remittance period
  remittance_month INTEGER NOT NULL, -- 1-12
  remittance_year INTEGER NOT NULL,
  due_date DATE NOT NULL,
  
  -- Member counts
  total_members INTEGER NOT NULL,
  good_standing_members INTEGER NOT NULL,
  remittable_members INTEGER NOT NULL, -- Only good standing members
  
  -- Financial details
  per_capita_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  
  -- CLC chart of accounts
  clc_account_code VARCHAR(50),
  gl_account VARCHAR(50),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending, submitted, paid, overdue, disputed
  submitted_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50), -- ACH, wire, cheque, manual
  payment_reference VARCHAR(100),
  
  -- File attachments
  remittance_file_url TEXT,
  receipt_file_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT chk_remittance_month CHECK (remittance_month BETWEEN 1 AND 12),
  CONSTRAINT chk_remittance_year CHECK (remittance_year BETWEEN 2020 AND 2100),
  CONSTRAINT chk_member_counts CHECK (
    remittable_members <= good_standing_members AND 
    good_standing_members <= total_members
  ),
  CONSTRAINT chk_total_amount CHECK (total_amount >= 0),
  CONSTRAINT unique_remittance_period UNIQUE (
    from_organization_id, 
    to_organization_id, 
    remittance_month, 
    remittance_year
  )
);

-- Indexes for remittance queries
CREATE INDEX idx_remittances_from_org ON per_capita_remittances(from_organization_id);
CREATE INDEX idx_remittances_to_org ON per_capita_remittances(to_organization_id);
CREATE INDEX idx_remittances_period ON per_capita_remittances(remittance_year, remittance_month);
CREATE INDEX idx_remittances_status ON per_capita_remittances(status);
CREATE INDEX idx_remittances_due_date ON per_capita_remittances(due_date);

-- RLS policies for per_capita_remittances
ALTER TABLE per_capita_remittances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_remittances ON per_capita_remittances;
CREATE POLICY select_remittances ON per_capita_remittances
  FOR SELECT
  USING (
    from_organization_id IN (
      SELECT id FROM organizations WHERE id = current_setting('app.current_organization_id', TRUE)::UUID
      OR parent_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    OR to_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS insert_remittances ON per_capita_remittances;
CREATE POLICY insert_remittances ON per_capita_remittances
  FOR INSERT
  WITH CHECK (
    from_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS update_remittances ON per_capita_remittances;
CREATE POLICY update_remittances ON per_capita_remittances
  FOR UPDATE
  USING (
    from_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR to_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
  );

-- =====================================================================================
-- PART 3: HIERARCHICAL AGGREGATION VIEWS
-- =====================================================================================

-- View: Organization hierarchy tree
CREATE OR REPLACE VIEW v_organization_hierarchy AS
WITH RECURSIVE org_tree AS (
  -- Base case: root organizations
  SELECT 
    id,
    parent_id,
    name,
    organization_level,
    hierarchy_path,
    depth,
    is_clc_affiliated,
    ARRAY[name] as path_names,
    name as root_name
  FROM organizations
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child organizations
  SELECT 
    o.id,
    o.parent_id,
    o.name,
    o.organization_level,
    o.hierarchy_path,
    o.depth,
    o.is_clc_affiliated,
    ot.path_names || o.name,
    ot.root_name
  FROM organizations o
  INNER JOIN org_tree ot ON o.parent_id = ot.id
)
SELECT * FROM org_tree;

-- View: Member counts by organization (with rollup)
CREATE OR REPLACE VIEW v_member_counts_hierarchy AS
WITH RECURSIVE member_rollup AS (
  -- Leaf organizations (direct member counts)
  SELECT 
    o.id as organization_id,
    o.name,
    o.organization_level,
    o.hierarchy_path,
    o.depth,
    COUNT(DISTINCT om.member_id) as direct_members,
    COUNT(DISTINCT om.member_id) as total_members,
    COUNT(DISTINCT CASE WHEN om.status = 'active' THEN om.member_id END) as active_members,
    COUNT(DISTINCT CASE 
      WHEN om.status = 'active' AND EXISTS (
        SELECT 1 FROM dues_transactions dt 
        WHERE dt.member_id = om.member_id 
        AND dt.payment_status = 'paid'
        AND dt.period_start >= CURRENT_DATE - INTERVAL '90 days'
      ) THEN om.member_id 
    END) as good_standing_members
  FROM organizations o
  LEFT JOIN organization_members om ON o.id = om.organization_id
  WHERE NOT EXISTS (
    SELECT 1 FROM organizations child 
    WHERE child.parent_id = o.id
  )
  GROUP BY o.id, o.name, o.organization_level, o.hierarchy_path, o.depth
  
  UNION ALL
  
  -- Parent organizations (aggregate from children)
  SELECT 
    o.id as organization_id,
    o.name,
    o.organization_level,
    o.hierarchy_path,
    o.depth,
    0 as direct_members,
    SUM(mr.total_members) as total_members,
    SUM(mr.active_members) as active_members,
    SUM(mr.good_standing_members) as good_standing_members
  FROM organizations o
  INNER JOIN member_rollup mr ON mr.hierarchy_path LIKE o.hierarchy_path || '.%'
  GROUP BY o.id, o.name, o.organization_level, o.hierarchy_path, o.depth
)
SELECT * FROM member_rollup;

-- View: Financial aggregation by hierarchy
CREATE OR REPLACE VIEW v_financial_aggregation_hierarchy AS
WITH RECURSIVE financial_rollup AS (
  -- Leaf organizations
  SELECT 
    o.id as organization_id,
    o.name,
    o.organization_level,
    o.hierarchy_path,
    o.depth,
    COALESCE(SUM(dt.amount), 0) as direct_dues_collected,
    COALESCE(SUM(dt.amount), 0) as total_dues_collected,
    COALESCE(SUM(CASE WHEN dt.payment_status = 'overdue' THEN dt.amount ELSE 0 END), 0) as arrears,
    COALESCE(SUM(dt.cope_amount), 0) as cope_collected,
    COALESCE(SUM(dt.pac_amount), 0) as pac_collected
  FROM organizations o
  LEFT JOIN organization_members om ON o.id = om.organization_id
  LEFT JOIN dues_transactions dt ON om.member_id = dt.member_id
  WHERE NOT EXISTS (
    SELECT 1 FROM organizations child 
    WHERE child.parent_id = o.id
  )
  AND dt.created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY o.id, o.name, o.organization_level, o.hierarchy_path, o.depth
  
  UNION ALL
  
  -- Parent organizations
  SELECT 
    o.id as organization_id,
    o.name,
    o.organization_level,
    o.hierarchy_path,
    o.depth,
    0 as direct_dues_collected,
    SUM(fr.total_dues_collected) as total_dues_collected,
    SUM(fr.arrears) as arrears,
    SUM(fr.cope_collected) as cope_collected,
    SUM(fr.pac_collected) as pac_collected
  FROM organizations o
  INNER JOIN financial_rollup fr ON fr.hierarchy_path LIKE o.hierarchy_path || '.%'
  GROUP BY o.id, o.name, o.organization_level, o.hierarchy_path, o.depth
)
SELECT * FROM financial_rollup;

-- =====================================================================================
-- PART 4: CLC CHART OF ACCOUNTS MAPPING
-- =====================================================================================

-- CLC account codes lookup table
CREATE TABLE IF NOT EXISTS clc_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CLC codes
  clc_account_code VARCHAR(50) NOT NULL UNIQUE,
  clc_account_name VARCHAR(200) NOT NULL,
  clc_category VARCHAR(100) NOT NULL, -- Revenue, Expense, Asset, Liability, Equity
  clc_subcategory VARCHAR(100),
  
  -- Mapping to internal GL
  internal_gl_code VARCHAR(50),
  account_type VARCHAR(50), -- dues, fees, donations, expenses, etc.
  
  -- Reporting
  is_per_capita BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  
  -- Metadata
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed CLC chart of accounts (sample - to be completed with actual CLC codes)
INSERT INTO clc_chart_of_accounts (clc_account_code, clc_account_name, clc_category, clc_subcategory, is_per_capita) VALUES
  ('4100', 'Per Capita Tax Revenue', 'Revenue', 'Membership Dues', true),
  ('4110', 'Initiation Fees', 'Revenue', 'Membership Fees', false),
  ('4200', 'COPE Contributions', 'Revenue', 'Political Action', false),
  ('4210', 'Strike Fund Contributions', 'Revenue', 'Defense Fund', false),
  ('5100', 'Officer Salaries', 'Expense', 'Personnel', false),
  ('5200', 'Office Rent', 'Expense', 'Facilities', false),
  ('5300', 'Legal Fees', 'Expense', 'Professional Services', false),
  ('5400', 'Arbitration Costs', 'Expense', 'Representational', false),
  ('5500', 'Education & Training', 'Expense', 'Member Services', false)
ON CONFLICT (clc_account_code) DO NOTHING;

-- Account mapping table (links transactions to CLC codes)
CREATE TABLE IF NOT EXISTS transaction_clc_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction reference (polymorphic)
  transaction_type VARCHAR(50) NOT NULL, -- dues_transaction, remittance, expense, etc.
  transaction_id UUID NOT NULL,
  
  -- CLC mapping
  clc_account_code VARCHAR(50) NOT NULL REFERENCES clc_chart_of_accounts(clc_account_code),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  
  -- Metadata
  mapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mapped_by UUID,
  notes TEXT,
  
  CONSTRAINT unique_transaction_mapping UNIQUE (transaction_type, transaction_id, clc_account_code)
);

CREATE INDEX idx_clc_mappings_transaction ON transaction_clc_mappings(transaction_type, transaction_id);
CREATE INDEX idx_clc_mappings_account ON transaction_clc_mappings(clc_account_code);

-- =====================================================================================
-- PART 5: AUTOMATED REMITTANCE CALCULATION
-- =====================================================================================

-- Function: Calculate monthly per-capita remittance
CREATE OR REPLACE FUNCTION calculate_per_capita_remittance(
  p_organization_id UUID,
  p_month INTEGER,
  p_year INTEGER
) RETURNS UUID AS $$
DECLARE
  v_parent_org_id UUID;
  v_per_capita_rate DECIMAL(10,2);
  v_remittance_day INTEGER;
  v_due_date DATE;
  v_total_members INTEGER;
  v_good_standing_members INTEGER;
  v_total_amount DECIMAL(12,2);
  v_remittance_id UUID;
BEGIN
  -- Get parent organization and rate
  SELECT parent_id, per_capita_rate, remittance_day
  INTO v_parent_org_id, v_per_capita_rate, v_remittance_day
  FROM organizations
  WHERE id = p_organization_id;
  
  -- Return if no parent or no rate set
  IF v_parent_org_id IS NULL OR v_per_capita_rate IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate due date (15th of following month by default)
  v_due_date := make_date(p_year, p_month, 1) + INTERVAL '1 month' + (v_remittance_day - 1) * INTERVAL '1 day';
  
  -- Count members
  SELECT 
    COUNT(DISTINCT om.member_id),
    COUNT(DISTINCT CASE 
      WHEN om.status = 'active' AND EXISTS (
        SELECT 1 FROM dues_transactions dt 
        WHERE dt.member_id = om.member_id 
        AND dt.payment_status = 'paid'
        AND dt.period_start >= make_date(p_year, p_month, 1) - INTERVAL '90 days'
      ) THEN om.member_id 
    END)
  INTO v_total_members, v_good_standing_members
  FROM organization_members om
  WHERE om.organization_id = p_organization_id
  AND om.joined_at <= make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day';
  
  -- Calculate total amount (only good standing members)
  v_total_amount := v_good_standing_members * v_per_capita_rate;
  
  -- Insert or update remittance record
  INSERT INTO per_capita_remittances (
    from_organization_id,
    to_organization_id,
    remittance_month,
    remittance_year,
    due_date,
    total_members,
    good_standing_members,
    remittable_members,
    per_capita_rate,
    total_amount,
    status,
    clc_account_code
  ) VALUES (
    p_organization_id,
    v_parent_org_id,
    p_month,
    p_year,
    v_due_date,
    v_total_members,
    v_good_standing_members,
    v_good_standing_members,
    v_per_capita_rate,
    v_total_amount,
    'pending',
    '4100' -- Per Capita Tax Revenue
  )
  ON CONFLICT (from_organization_id, to_organization_id, remittance_month, remittance_year)
  DO UPDATE SET
    total_members = EXCLUDED.total_members,
    good_standing_members = EXCLUDED.good_standing_members,
    remittable_members = EXCLUDED.remittable_members,
    total_amount = EXCLUDED.total_amount,
    updated_at = NOW()
  RETURNING id INTO v_remittance_id;
  
  RETURN v_remittance_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate remittances for all organizations
CREATE OR REPLACE FUNCTION generate_monthly_remittances(
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS TABLE (
  organization_id UUID,
  name VARCHAR,
  remittance_id UUID,
  amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH calculated_remittances AS (
    SELECT 
      o.id,
      o.name,
      calculate_per_capita_remittance(o.id, p_month, p_year) as remittance_id
    FROM organizations o
    WHERE o.parent_id IS NOT NULL
    AND o.per_capita_rate IS NOT NULL
    AND o.per_capita_rate > 0
  )
  SELECT 
    cr.id,
    cr.name,
    cr.remittance_id,
    pcr.total_amount
  FROM calculated_remittances cr
  LEFT JOIN per_capita_remittances pcr ON pcr.id = cr.remittance_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 6: AUDIT LOGGING
-- =====================================================================================

-- Audit log for hierarchy changes
CREATE TABLE IF NOT EXISTS organization_hierarchy_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Change tracking
  action VARCHAR(50) NOT NULL, -- parent_changed, level_changed, rate_changed
  old_parent_id UUID,
  new_parent_id UUID,
  old_level organization_level,
  new_level organization_level,
  old_rate DECIMAL(10,2),
  new_rate DECIMAL(10,2),
  
  -- Context
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  ip_address INET,
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_hierarchy_audit_org ON organization_hierarchy_audit(organization_id);
CREATE INDEX idx_hierarchy_audit_date ON organization_hierarchy_audit(changed_at);

-- Trigger to log hierarchy changes
CREATE OR REPLACE FUNCTION log_organization_hierarchy_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log parent changes
  IF (TG_OP = 'UPDATE' AND 
      (OLD.parent_id IS DISTINCT FROM NEW.parent_id OR
       OLD.organization_level IS DISTINCT FROM NEW.organization_level OR
       OLD.per_capita_rate IS DISTINCT FROM NEW.per_capita_rate)) THEN
    
    INSERT INTO organization_hierarchy_audit (
      organization_id,
      action,
      old_parent_id,
      new_parent_id,
      old_level,
      new_level,
      old_rate,
      new_rate,
      requires_approval
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN 'parent_changed'
        WHEN OLD.organization_level IS DISTINCT FROM NEW.organization_level THEN 'level_changed'
        WHEN OLD.per_capita_rate IS DISTINCT FROM NEW.per_capita_rate THEN 'rate_changed'
      END,
      OLD.parent_id,
      NEW.parent_id,
      OLD.organization_level,
      NEW.organization_level,
      OLD.per_capita_rate,
      NEW.per_capita_rate,
      (OLD.parent_id IS DISTINCT FROM NEW.parent_id) -- Require approval for parent changes
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_organization_hierarchy_changes
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_hierarchy_changes();

-- =====================================================================================
-- PART 7: STATISTICS CANADA LAB-05302 EXPORT SUPPORT
-- =====================================================================================

-- View for Statistics Canada Union Information Return (LAB-05302)
CREATE OR REPLACE VIEW v_statcan_lab05302_export AS
SELECT 
  o.id as organization_id,
  o.name,
  o.clc_affiliate_code,
  o.organization_level,
  
  -- Member statistics (Section A)
  COUNT(DISTINCT om.member_id) as total_members,
  COUNT(DISTINCT CASE WHEN m.gender = 'female' THEN om.member_id END) as female_members,
  COUNT(DISTINCT CASE WHEN m.gender = 'male' THEN om.member_id END) as male_members,
  
  -- Financial statistics (Section B)
  COALESCE(SUM(dt.amount), 0) as total_dues_collected,
  COALESCE(SUM(dt.cope_amount), 0) as political_contributions,
  COALESCE(SUM(CASE WHEN dt.payment_status = 'paid' THEN dt.amount ELSE 0 END), 0) as dues_received,
  
  -- Strike statistics (Section C)
  COUNT(DISTINCT sf.id) as active_strikes,
  COALESCE(SUM(sfd.amount), 0) as strike_fund_disbursed,
  
  -- Collective agreements (Section D)
  COUNT(DISTINCT cba.id) as active_agreements,
  
  -- Year end date
  o.fiscal_year_end
  
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
LEFT JOIN members m ON om.member_id = m.id
LEFT JOIN dues_transactions dt ON om.member_id = dt.member_id 
  AND dt.created_at >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 1)
LEFT JOIN strike_funds sf ON o.id = sf.organization_id AND sf.status = 'active'
LEFT JOIN fund_donations sfd ON sf.id = sfd.fund_id
LEFT JOIN collective_bargaining_agreements cba ON o.id = cba.organization_id AND cba.status = 'active'
WHERE o.is_clc_affiliated = true
GROUP BY o.id, o.name, o.clc_affiliate_code, o.organization_level, o.fiscal_year_end;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE per_capita_remittances IS 'Tracks monthly per-capita tax remittances from local/affiliate to parent organizations (CLC)';
COMMENT ON TABLE clc_chart_of_accounts IS 'CLC standardized chart of accounts for financial reporting';
COMMENT ON TABLE transaction_clc_mappings IS 'Maps internal transactions to CLC account codes for compliance reporting';
COMMENT ON TABLE organization_hierarchy_audit IS 'Audit trail for organization hierarchy changes requiring approval';

COMMENT ON FUNCTION calculate_per_capita_remittance IS 'Calculates monthly per-capita remittance based on good-standing member count';
COMMENT ON FUNCTION generate_monthly_remittances IS 'Batch generates remittances for all organizations with parent relationships';

COMMENT ON VIEW v_organization_hierarchy IS 'Recursive hierarchy view showing full organization tree';
COMMENT ON VIEW v_member_counts_hierarchy IS 'Aggregated member counts with parent rollup';
COMMENT ON VIEW v_financial_aggregation_hierarchy IS 'Financial aggregation across organization hierarchy';
COMMENT ON VIEW v_statcan_lab05302_export IS 'Statistics Canada Labour Organization Return (LAB-05302) export format';
