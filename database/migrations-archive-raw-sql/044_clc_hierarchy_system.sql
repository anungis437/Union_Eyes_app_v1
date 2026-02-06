-- Migration: CLC Multi-Level Tenant Hierarchy (Cleaned for Existing Schema)
-- Description: Add per-capita remittances, CLC chart of accounts, and hierarchy features
-- Phase: 1 - Critical CLC Compliance
-- Date: 2025-11-24
-- Note: Assumes organizations table already has: name, parent_id, hierarchy_path (UUID[]), hierarchy_level (INTEGER)

-- =====================================================================================
-- PART 1: ORGANIZATION HIERARCHY - ADD ONLY NEW COLUMNS
-- =====================================================================================

-- Add only NEW columns that don't exist yet
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS clc_affiliate_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS per_capita_rate DECIMAL(10,2), -- Monthly per-capita tax to parent
  ADD COLUMN IF NOT EXISTS remittance_day INTEGER DEFAULT 15, -- Day of month for remittance
  ADD COLUMN IF NOT EXISTS last_remittance_date TIMESTAMP WITH TIME ZONE;

-- Create index for CLC code (parent_id and hierarchy_path indexes likely already exist)
CREATE INDEX IF NOT EXISTS idx_organizations_clc_code ON organizations(clc_affiliate_code);

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
  CONSTRAINT chk_positive_amounts CHECK (total_amount >= 0 AND per_capita_rate >= 0),
  CONSTRAINT uq_remittance_period UNIQUE (from_organization_id, remittance_month, remittance_year)
);

-- Indexes for per_capita_remittances
CREATE INDEX IF NOT EXISTS idx_remittances_from_org ON per_capita_remittances(from_organization_id);
CREATE INDEX IF NOT EXISTS idx_remittances_to_org ON per_capita_remittances(to_organization_id);
CREATE INDEX IF NOT EXISTS idx_remittances_period ON per_capita_remittances(remittance_month, remittance_year);
CREATE INDEX IF NOT EXISTS idx_remittances_status ON per_capita_remittances(status);
CREATE INDEX IF NOT EXISTS idx_remittances_due_date ON per_capita_remittances(due_date);

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
-- PART 3: CLC CHART OF ACCOUNTS
-- =====================================================================================

CREATE TABLE IF NOT EXISTS clc_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(50) NOT NULL UNIQUE,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
  parent_account_code VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  requires_affiliate_code BOOLEAN DEFAULT false,
  
  -- CLC-specific
  statcan_code VARCHAR(20), -- Statistics Canada classification
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coa_code ON clc_chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON clc_chart_of_accounts(parent_account_code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON clc_chart_of_accounts(account_type);

-- =====================================================================================
-- PART 4: TRANSACTION TO CLC MAPPING
-- =====================================================================================

CREATE TABLE IF NOT EXISTS transaction_clc_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL, -- References financial_transactions(id) if that table exists
  clc_account_code VARCHAR(50) NOT NULL REFERENCES clc_chart_of_accounts(account_code),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_mappings_transaction ON transaction_clc_mappings(transaction_id);
CREATE INDEX IF NOT EXISTS idx_mappings_account ON transaction_clc_mappings(clc_account_code);

-- RLS policies for transaction_clc_mappings
ALTER TABLE transaction_clc_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_clc_mappings ON transaction_clc_mappings;
CREATE POLICY select_clc_mappings ON transaction_clc_mappings
  FOR SELECT
  USING (true); -- Adjust based on your security requirements

DROP POLICY IF EXISTS insert_clc_mappings ON transaction_clc_mappings;
CREATE POLICY insert_clc_mappings ON transaction_clc_mappings
  FOR INSERT
  WITH CHECK (true); -- Adjust based on your security requirements

-- =====================================================================================
-- PART 5: HIERARCHY UTILITY FUNCTIONS (Using Existing Schema)
-- =====================================================================================

-- Get all child organizations recursively
CREATE OR REPLACE FUNCTION get_child_organizations(parent_org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  hierarchy_level INTEGER,
  hierarchy_path UUID[],
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE children AS (
    -- Base case: direct children
    SELECT o.id, o.name, o.hierarchy_level, o.hierarchy_path, 
           array_length(o.hierarchy_path, 1) as depth
    FROM organizations o
    WHERE o.parent_id = parent_org_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT o.id, o.name, o.hierarchy_level, o.hierarchy_path,
           array_length(o.hierarchy_path, 1) as depth
    FROM organizations o
    INNER JOIN children c ON o.parent_id = c.id
  )
  SELECT * FROM children;
END;
$$ LANGUAGE plpgsql;

-- Get all parent organizations recursively
CREATE OR REPLACE FUNCTION get_parent_organizations(child_org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  hierarchy_level INTEGER,
  hierarchy_path UUID[],
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE parents AS (
    -- Base case: immediate parent
    SELECT o.id, o.name, o.hierarchy_level, o.hierarchy_path,
           array_length(o.hierarchy_path, 1) as depth
    FROM organizations o
    WHERE o.id = (SELECT parent_id FROM organizations WHERE id = child_org_id)
    
    UNION ALL
    
    -- Recursive case: parent of parent
    SELECT o.id, o.name, o.hierarchy_level, o.hierarchy_path,
           array_length(o.hierarchy_path, 1) as depth
    FROM organizations o
    INNER JOIN parents p ON o.id = p.parent_id
  )
  SELECT * FROM parents;
END;
$$ LANGUAGE plpgsql;

-- Get aggregate member count for organization and all children
CREATE OR REPLACE FUNCTION get_aggregate_member_count(org_id UUID)
RETURNS TABLE (
  organization_id UUID,
  total_members BIGINT,
  good_standing_members BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    org_id,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE status = 'active' AND good_standing = true) as good_standing_members
  FROM organization_members
  WHERE organization_id IN (
    SELECT org_id
    UNION
    SELECT id FROM get_child_organizations(org_id)
  )
  GROUP BY organization_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 6: HIERARCHY AUDIT TRACKING
-- =====================================================================================

CREATE TABLE IF NOT EXISTS organization_hierarchy_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  change_type VARCHAR(50) NOT NULL, -- parent_changed, level_changed, created, deleted
  old_parent_id UUID,
  new_parent_id UUID,
  old_level INTEGER,
  new_level INTEGER,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON organization_hierarchy_audit(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON organization_hierarchy_audit(change_type);
CREATE INDEX IF NOT EXISTS idx_audit_date ON organization_hierarchy_audit(changed_at);

-- Trigger to log hierarchy changes
CREATE OR REPLACE FUNCTION log_organization_hierarchy_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND 
     (OLD.parent_id IS DISTINCT FROM NEW.parent_id OR
      OLD.hierarchy_level IS DISTINCT FROM NEW.hierarchy_level)
  THEN
    INSERT INTO organization_hierarchy_audit (
      organization_id,
      change_type,
      old_parent_id,
      new_parent_id,
      old_level,
      new_level,
      changed_by,
      notes,
      requires_approval
    ) VALUES (
      NEW.id,
      CASE
        WHEN OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN 'parent_changed'
        WHEN OLD.hierarchy_level IS DISTINCT FROM NEW.hierarchy_level THEN 'level_changed'
        ELSE 'updated'
      END,
      OLD.parent_id,
      NEW.parent_id,
      OLD.hierarchy_level,
      NEW.hierarchy_level,
      current_setting('app.current_user_id', TRUE)::UUID,
      'Automatic hierarchy change detection',
      (OLD.parent_id IS DISTINCT FROM NEW.parent_id) -- Require approval for parent changes
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_hierarchy_changes
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_hierarchy_changes();

-- =====================================================================================
-- PART 7: REPORTING VIEWS
-- =====================================================================================

-- View: Pending remittances summary
CREATE OR REPLACE VIEW v_pending_remittances AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.clc_affiliate_code,
  COUNT(r.id) as pending_count,
  SUM(r.total_amount) as total_pending,
  MIN(r.due_date) as earliest_due_date,
  MAX(r.due_date) as latest_due_date
FROM organizations o
LEFT JOIN per_capita_remittances r ON o.id = r.from_organization_id AND r.status = 'pending'
GROUP BY o.id, o.name, o.clc_affiliate_code
HAVING COUNT(r.id) > 0;

-- View: Annual remittance summary
CREATE OR REPLACE VIEW v_annual_remittance_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.clc_affiliate_code,
  o.hierarchy_level,
  r.remittance_year,
  COUNT(r.id) as remittance_count,
  SUM(r.total_amount) as total_remitted,
  SUM(r.remittable_members) as total_members,
  AVG(r.per_capita_rate) as avg_per_capita_rate
FROM organizations o
LEFT JOIN per_capita_remittances r ON o.id = r.from_organization_id
WHERE r.status = 'paid'
GROUP BY o.id, o.name, o.clc_affiliate_code, o.hierarchy_level, r.remittance_year;

-- =====================================================================================
-- PART 8: STATISTICS CANADA EXPORT FUNCTION
-- =====================================================================================

CREATE OR REPLACE FUNCTION generate_statcan_export(fiscal_year INTEGER)
RETURNS TABLE (
  clc_affiliate_code VARCHAR,
  organization_name VARCHAR,
  total_members BIGINT,
  good_standing_members BIGINT,
  annual_revenue DECIMAL,
  statcan_classification VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.clc_affiliate_code,
    o.name,
    COALESCE(SUM(om.member_count), 0)::BIGINT as total_members,
    COALESCE(SUM(om.good_standing_count), 0)::BIGINT as good_standing_members,
    COALESCE(SUM(r.total_amount), 0) as annual_revenue,
    'TBD' as statcan_classification -- To be mapped from CLC chart of accounts
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as member_count,
      COUNT(*) FILTER (WHERE status = 'active' AND good_standing = true) as good_standing_count
    FROM organization_members
    WHERE organization_id = o.id
  ) om ON true
  LEFT JOIN per_capita_remittances r ON o.id = r.from_organization_id 
    AND r.remittance_year = fiscal_year
    AND r.status = 'paid'
  WHERE o.parent_id IS NOT NULL
  GROUP BY o.id, o.name, o.clc_affiliate_code, o.hierarchy_level;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Added:
-- - 4 new tables: per_capita_remittances, clc_chart_of_accounts, transaction_clc_mappings, organization_hierarchy_audit
-- - 4 new columns to organizations: clc_affiliate_code, per_capita_rate, remittance_day, last_remittance_date
-- - 4 utility functions: get_child_organizations, get_parent_organizations, get_aggregate_member_count, generate_statcan_export
-- - 2 reporting views: v_pending_remittances, v_annual_remittance_summary
-- - RLS policies for data isolation
-- - Audit logging for hierarchy changes

