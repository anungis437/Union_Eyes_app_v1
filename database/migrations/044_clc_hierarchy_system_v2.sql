-- Migration: CLC Multi-Level Tenant Hierarchy (Updated for existing schema)
-- Description: Add CLC-specific functionality to existing organization hierarchy
-- Phase: 1 - Critical CLC Compliance
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: ORGANIZATION HIERARCHY ENHANCEMENTS
-- =====================================================================================

-- Add CLC-specific columns to existing organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS clc_affiliate_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS per_capita_rate DECIMAL(10,2), -- Monthly per-capita tax to parent
  ADD COLUMN IF NOT EXISTS remittance_day INTEGER DEFAULT 15, -- Day of month for remittance
  ADD COLUMN IF NOT EXISTS last_remittance_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS fiscal_year_end DATE DEFAULT '2024-12-31';

-- Create indexes for CLC-specific queries
CREATE INDEX IF NOT EXISTS idx_organizations_clc_code ON organizations(clc_affiliate_code) WHERE clc_affiliate_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_clc_affiliated ON organizations(clc_affiliated) WHERE clc_affiliated = true;

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
  CONSTRAINT chk_remittable_members CHECK (remittable_members <= good_standing_members),
  CONSTRAINT chk_good_standing CHECK (good_standing_members <= total_members),
  CONSTRAINT unique_org_remittance_period UNIQUE (
    from_organization_id,
    to_organization_id,
    remittance_month, 
    remittance_year
  )
);

-- Indexes for remittance queries
CREATE INDEX IF NOT EXISTS idx_remittances_from_org ON per_capita_remittances(from_organization_id);
CREATE INDEX IF NOT EXISTS idx_remittances_to_org ON per_capita_remittances(to_organization_id);
CREATE INDEX IF NOT EXISTS idx_remittances_period ON per_capita_remittances(remittance_year, remittance_month);
CREATE INDEX IF NOT EXISTS idx_remittances_status ON per_capita_remittances(status);
CREATE INDEX IF NOT EXISTS idx_remittances_due_date ON per_capita_remittances(due_date);

-- RLS policies for per_capita_remittances
ALTER TABLE per_capita_remittances ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_remittances ON per_capita_remittances
  FOR SELECT
  USING (
    from_organization_id IN (
      SELECT id FROM organizations WHERE id = current_setting('app.current_organization_id', TRUE)::UUID
      OR parent_id = current_setting('app.current_organization_id', TRUE)::UUID
    )
    OR to_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
  );

CREATE POLICY insert_remittances ON per_capita_remittances
  FOR INSERT
  WITH CHECK (
    from_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
  );

CREATE POLICY update_remittances ON per_capita_remittances
  FOR UPDATE
  USING (
    from_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR to_organization_id = current_setting('app.current_organization_id', TRUE)::UUID
  );

-- =====================================================================================
-- PART 3: CLC CHART OF ACCOUNTS MAPPING
-- =====================================================================================

-- CLC chart of accounts
CREATE TABLE IF NOT EXISTS clc_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(50) NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, revenue, expense, equity
  parent_account_code VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  
  -- CLC reporting categories
  financial_statement_line VARCHAR(100),
  statistics_canada_code VARCHAR(50),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clc_accounts_code ON clc_chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_clc_accounts_type ON clc_chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_clc_accounts_parent ON clc_chart_of_accounts(parent_account_code);

-- Transaction to CLC account mapping
CREATE TABLE IF NOT EXISTS transaction_clc_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Transaction reference
  transaction_type VARCHAR(50) NOT NULL, -- dues_payment, donation, strike_fund, cope_contribution, etc
  transaction_id UUID NOT NULL,
  transaction_date DATE NOT NULL,
  
  -- CLC mapping
  clc_account_code VARCHAR(50) NOT NULL,
  gl_account VARCHAR(50),
  
  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT unique_transaction_mapping UNIQUE (transaction_type, transaction_id, clc_account_code)
);

CREATE INDEX IF NOT EXISTS idx_clc_mappings_org ON transaction_clc_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_clc_mappings_transaction ON transaction_clc_mappings(transaction_type, transaction_id);
CREATE INDEX IF NOT EXISTS idx_clc_mappings_account ON transaction_clc_mappings(clc_account_code);
CREATE INDEX IF NOT EXISTS idx_clc_mappings_date ON transaction_clc_mappings(transaction_date);

-- RLS for transaction mappings
ALTER TABLE transaction_clc_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_clc_mappings ON transaction_clc_mappings
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY insert_clc_mappings ON transaction_clc_mappings
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

-- =====================================================================================
-- PART 4: HELPER FUNCTIONS
-- =====================================================================================

-- Function to get all child organizations (recursive)
CREATE OR REPLACE FUNCTION get_child_organizations(parent_org_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  level INTEGER,
  path UUID[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE child_orgs AS (
    -- Base case: direct children
    SELECT 
      id,
      name,
      hierarchy_level,
      hierarchy_path
    FROM organizations
    WHERE parent_id = parent_org_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT 
      o.id,
      o.name,
      o.hierarchy_level,
      o.hierarchy_path
    FROM organizations o
    INNER JOIN child_orgs co ON o.parent_id = co.id
  )
  SELECT 
    id as organization_id,
    name as organization_name,
    hierarchy_level as level,
    hierarchy_path as path
  FROM child_orgs;
END;
$$ LANGUAGE plpgsql;

-- Function to get all parent organizations (recursive)
CREATE OR REPLACE FUNCTION get_parent_organizations(child_org_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE parent_orgs AS (
    -- Base case: direct parent
    SELECT 
      o.id,
      o.name,
      o.hierarchy_level,
      o.parent_id
    FROM organizations o
    WHERE o.id = child_org_id
    
    UNION ALL
    
    -- Recursive case: parents of parents
    SELECT 
      o.id,
      o.name,
      o.hierarchy_level,
      o.parent_id
    FROM organizations o
    INNER JOIN parent_orgs po ON o.id = po.parent_id
  )
  SELECT 
    id as organization_id,
    name as organization_name,
    hierarchy_level as level
  FROM parent_orgs
  WHERE id != child_org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate aggregate member count for organization tree
CREATE OR REPLACE FUNCTION get_aggregate_member_count(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(member_count), 0)
  INTO total_count
  FROM organizations
  WHERE id = org_id
     OR id IN (SELECT organization_id FROM get_child_organizations(org_id));
  
  RETURN total_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 5: VIEWS FOR REPORTING
-- =====================================================================================

-- View: Organization hierarchy with aggregated data
CREATE OR REPLACE VIEW v_organization_hierarchy_summary AS
SELECT 
  o.id,
  o.name,
  o.display_name,
  o.short_name,
  o.organization_type,
  o.hierarchy_level,
  o.hierarchy_path,
  o.parent_id,
  p.name as parent_name,
  o.clc_affiliated,
  o.clc_affiliate_code,
  o.per_capita_rate,
  o.member_count,
  o.active_member_count,
  get_aggregate_member_count(o.id) as total_tree_members,
  (SELECT COUNT(*) FROM get_child_organizations(o.id)) as child_organization_count,
  o.province_territory,
  o.status,
  o.created_at
FROM organizations o
LEFT JOIN organizations p ON o.parent_id = p.id
ORDER BY o.hierarchy_path;

-- View: Pending remittances dashboard
CREATE OR REPLACE VIEW v_pending_remittances AS
SELECT 
  r.id,
  r.from_organization_id,
  fo.name as from_organization_name,
  r.to_organization_id,
  to_org.name as to_organization_name,
  r.remittance_month,
  r.remittance_year,
  r.due_date,
  r.remittable_members,
  r.per_capita_rate,
  r.total_amount,
  r.status,
  CASE 
    WHEN r.due_date < CURRENT_DATE THEN 'overdue'
    WHEN r.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'upcoming'
  END as urgency,
  r.created_at
FROM per_capita_remittances r
JOIN organizations fo ON r.from_organization_id = fo.id
JOIN organizations to_org ON r.to_organization_id = to_org.id
WHERE r.status IN ('pending', 'submitted')
ORDER BY r.due_date;

-- View: Annual remittance summary by organization
CREATE OR REPLACE VIEW v_annual_remittance_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.clc_affiliate_code,
  r.remittance_year,
  COUNT(*) as total_remittances,
  SUM(r.total_amount) as total_amount_remitted,
  SUM(r.remittable_members) as total_remittable_members,
  AVG(r.per_capita_rate) as avg_per_capita_rate,
  COUNT(*) FILTER (WHERE r.status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE r.status = 'overdue') as overdue_count,
  MAX(r.paid_date) as last_payment_date
FROM organizations o
LEFT JOIN per_capita_remittances r ON r.from_organization_id = o.id
WHERE o.clc_affiliated = true
GROUP BY o.id, o.name, o.clc_affiliate_code, r.remittance_year
ORDER BY r.remittance_year DESC, o.name;

-- =====================================================================================
-- PART 6: STATISTICS CANADA EXPORT FUNCTIONS
-- =====================================================================================

-- Function to generate Statistics Canada formatted export
CREATE OR REPLACE FUNCTION generate_statcan_export(
  reporting_year INTEGER,
  reporting_quarter INTEGER DEFAULT NULL
)
RETURNS TABLE (
  organization_name TEXT,
  clc_code VARCHAR,
  jurisdiction TEXT,
  sector TEXT[],
  total_members INTEGER,
  active_members INTEGER,
  remittances_paid DECIMAL,
  fiscal_period VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.name,
    o.clc_affiliate_code,
    o.province_territory,
    o.sectors,
    o.member_count,
    o.active_member_count,
    COALESCE(SUM(r.total_amount), 0) as remittances_paid,
    CASE 
      WHEN reporting_quarter IS NULL THEN reporting_year::TEXT
      ELSE reporting_year::TEXT || '-Q' || reporting_quarter::TEXT
    END as fiscal_period
  FROM organizations o
  LEFT JOIN per_capita_remittances r ON r.from_organization_id = o.id
    AND r.remittance_year = reporting_year
    AND (reporting_quarter IS NULL OR 
         CEIL(r.remittance_month::DECIMAL / 3) = reporting_quarter)
    AND r.status = 'paid'
  WHERE o.clc_affiliated = true
  GROUP BY o.id, o.name, o.clc_affiliate_code, o.province_territory, 
           o.sectors, o.member_count, o.active_member_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 7: AUDIT TRAIL
-- =====================================================================================

-- Audit table for hierarchy changes
CREATE TABLE IF NOT EXISTS organization_hierarchy_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Change details
  change_type VARCHAR(50) NOT NULL, -- parent_changed, level_changed, clc_code_assigned, etc
  old_parent_id UUID,
  new_parent_id UUID,
  old_hierarchy_level INTEGER,
  new_hierarchy_level INTEGER,
  old_clc_code VARCHAR(20),
  new_clc_code VARCHAR(20),
  
  -- Metadata
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID,
  reason TEXT,
  
  -- Snapshot of path before/after
  old_hierarchy_path UUID[],
  new_hierarchy_path UUID[]
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_audit_org ON organization_hierarchy_audit(organization_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_audit_date ON organization_hierarchy_audit(changed_at);
CREATE INDEX IF NOT EXISTS idx_hierarchy_audit_type ON organization_hierarchy_audit(change_type);

-- Trigger to log hierarchy changes
CREATE OR REPLACE FUNCTION log_hierarchy_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Log parent changes
    IF OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
      INSERT INTO organization_hierarchy_audit (
        organization_id, change_type, old_parent_id, new_parent_id,
        old_hierarchy_path, new_hierarchy_path, changed_by
      ) VALUES (
        NEW.id, 'parent_changed', OLD.parent_id, NEW.parent_id,
        OLD.hierarchy_path, NEW.hierarchy_path,
        current_setting('app.current_user_id', TRUE)::UUID
      );
    END IF;
    
    -- Log level changes
    IF OLD.hierarchy_level IS DISTINCT FROM NEW.hierarchy_level THEN
      INSERT INTO organization_hierarchy_audit (
        organization_id, change_type, old_hierarchy_level, new_hierarchy_level,
        changed_by
      ) VALUES (
        NEW.id, 'level_changed', OLD.hierarchy_level, NEW.hierarchy_level,
        current_setting('app.current_user_id', TRUE)::UUID
      );
    END IF;
    
    -- Log CLC code changes
    IF OLD.clc_affiliate_code IS DISTINCT FROM NEW.clc_affiliate_code THEN
      INSERT INTO organization_hierarchy_audit (
        organization_id, change_type, old_clc_code, new_clc_code,
        changed_by
      ) VALUES (
        NEW.id, 'clc_code_changed', OLD.clc_affiliate_code, NEW.clc_affiliate_code,
        current_setting('app.current_user_id', TRUE)::UUID
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_hierarchy_changes
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_hierarchy_changes();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE per_capita_remittances IS 'Tracks monthly per-capita tax remittances from local unions to parent organizations (affiliates to CLC)';
COMMENT ON TABLE clc_chart_of_accounts IS 'CLC standardized chart of accounts for financial reporting consistency across affiliates';
COMMENT ON TABLE transaction_clc_mappings IS 'Maps internal transactions to CLC chart of accounts for consolidated reporting';
COMMENT ON TABLE organization_hierarchy_audit IS 'Audit trail for changes to organization hierarchy structure';

COMMENT ON FUNCTION get_child_organizations IS 'Recursively retrieves all child organizations in the hierarchy tree';
COMMENT ON FUNCTION get_parent_organizations IS 'Recursively retrieves all parent organizations up to root';
COMMENT ON FUNCTION get_aggregate_member_count IS 'Calculates total member count for an organization and all its children';
COMMENT ON FUNCTION generate_statcan_export IS 'Generates Statistics Canada formatted membership and financial data export';
