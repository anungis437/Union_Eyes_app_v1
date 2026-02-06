-- =====================================================================================
-- Migration 050: Hierarchical RLS Policies for Multi-Level Organizations
-- Description: Transform all RLS policies to support CLC hierarchy (view own + descendants)
-- Phase: 1 - Critical CLC Compliance
-- Date: 2025-12-03
-- Dependencies: 030_hierarchical_organizations.sql, 044_clc_hierarchy_system.sql
-- =====================================================================================

-- =====================================================================================
-- PART 1: HELPER FUNCTIONS (Enhanced)
-- =====================================================================================

-- Enhanced: Get all descendant organization IDs (optimized with materialized path)
CREATE OR REPLACE FUNCTION get_descendant_org_ids(org_id UUID)
RETURNS SETOF UUID AS $$
  SELECT id
  FROM organizations
  WHERE hierarchy_path @> (
    SELECT hierarchy_path FROM organizations WHERE id = org_id
  )
  OR id = org_id; -- Include the organization itself
$$ LANGUAGE sql STABLE PARALLEL SAFE;

-- Enhanced: Get all ancestor organization IDs (optimized with materialized path)
CREATE OR REPLACE FUNCTION get_ancestor_org_ids(org_id UUID)
RETURNS SETOF UUID AS $$
  WITH org_path AS (
    SELECT hierarchy_path FROM organizations WHERE id = org_id
  )
  SELECT id
  FROM organizations, org_path
  WHERE organizations.hierarchy_path <@ org_path.hierarchy_path;
$$ LANGUAGE sql STABLE PARALLEL SAFE;

-- New: Check if user has access to specific organization (cached in session)
CREATE OR REPLACE FUNCTION user_can_access_org(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_orgs UUID[];
  accessible_orgs UUID[];
BEGIN
  -- Get all organizations user is a member of
  SELECT ARRAY_AGG(DISTINCT organization_id)
  INTO user_orgs
  FROM organization_members
  WHERE user_id = p_user_id::TEXT
    AND status = 'active';

  -- Get all descendant organizations
  SELECT ARRAY_AGG(DISTINCT descendant_id)
  INTO accessible_orgs
  FROM unnest(user_orgs) AS user_org
  CROSS JOIN LATERAL get_descendant_org_ids(user_org) AS descendant_id;

  -- Check if target org is in accessible set
  RETURN p_org_id = ANY(accessible_orgs);
END;
$$ LANGUAGE plpgsql STABLE;

-- New: Get all organization IDs visible to current user (for RLS)
CREATE OR REPLACE FUNCTION get_current_user_visible_orgs()
RETURNS SETOF UUID AS $$
DECLARE
  current_user_id UUID;
  user_orgs UUID[];
BEGIN
  -- Get current user ID from session context
  BEGIN
    current_user_id := current_setting('app.current_user_id', TRUE)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN; -- No access if user ID not set
  END;

  -- Return empty set if no user ID
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get all organizations user is a member of
  SELECT ARRAY_AGG(DISTINCT organization_id)
  INTO user_orgs
  FROM organization_members
  WHERE user_id = current_user_id::TEXT
    AND status = 'active';

  -- Return all descendant organizations
  RETURN QUERY
  SELECT DISTINCT descendant_id
  FROM unnest(user_orgs) AS user_org
  CROSS JOIN LATERAL get_descendant_org_ids(user_org) AS descendant_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_descendant_org_ids IS 'Returns organization ID + all descendant IDs (children, grandchildren, etc.) - optimized with GIN index on hierarchy_path';
COMMENT ON FUNCTION get_ancestor_org_ids IS 'Returns organization ID + all ancestor IDs (parent, grandparent, etc.) up to CLC root';
COMMENT ON FUNCTION user_can_access_org IS 'Checks if user can access specific organization (member of org or any ancestor)';
COMMENT ON FUNCTION get_current_user_visible_orgs IS 'Returns all organization IDs visible to current session user (own orgs + descendants)';

-- =====================================================================================
-- PART 2: ADD organization_id COLUMN TO ALL TABLES (Backward Compatible)
-- =====================================================================================

-- Claims table
ALTER TABLE claims 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_claims_organization_id ON claims(organization_id);

-- Populate organization_id from legacy tenant_id (if legacy_tenant_id mapping exists)
UPDATE claims c
SET organization_id = o.id
FROM organizations o
WHERE c.tenant_id = o.legacy_tenant_id
  AND c.organization_id IS NULL;

-- Dues payments
ALTER TABLE dues_payments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_dues_payments_organization_id ON dues_payments(organization_id);

-- Strike funds
ALTER TABLE strike_funds
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_strike_funds_organization_id ON strike_funds(organization_id);

-- Deadlines
ALTER TABLE deadlines
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_deadlines_organization_id ON deadlines(organization_id);

-- Documents (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
  END IF;
END $$;

-- Grievances (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grievances') THEN
    ALTER TABLE grievances ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    CREATE INDEX IF NOT EXISTS idx_grievances_organization_id ON grievances(organization_id);
  END IF;
END $$;

-- Collective agreements
ALTER TABLE collective_agreements
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_collective_agreements_organization_id ON collective_agreements(organization_id);

-- =====================================================================================
-- PART 3: HIERARCHICAL RLS POLICIES - CLAIMS
-- =====================================================================================

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS select_claims ON claims;
DROP POLICY IF EXISTS insert_claims ON claims;
DROP POLICY IF EXISTS update_claims ON claims;
DROP POLICY IF EXISTS delete_claims ON claims;

-- SELECT: Users can view claims from their organization + all descendant organizations
CREATE POLICY select_claims ON claims
  FOR SELECT
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
  );

-- INSERT: Users can only create claims in organizations they're a member of (not descendants)
CREATE POLICY insert_claims ON claims
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND status = 'active'
    )
  );

-- UPDATE: Users can update claims in their organizations + descendants (if they have admin/officer role)
CREATE POLICY update_claims ON claims
  FOR UPDATE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND (
      -- Claim owner can always update
      created_by = current_setting('app.current_user_id', TRUE)::UUID
      OR
      -- Admins/officers can update any claim in visible orgs
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
          AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
          AND role IN ('admin', 'officer', 'manager')
          AND status = 'active'
      )
    )
  );

-- DELETE: Only admins can delete claims in their organizations + descendants
CREATE POLICY delete_claims ON claims
  FOR DELETE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND role = 'admin'
        AND status = 'active'
    )
  );

COMMENT ON POLICY select_claims ON claims IS 'Hierarchical RLS: Users see claims from own org + all descendant orgs';
COMMENT ON POLICY insert_claims ON claims IS 'Hierarchical RLS: Users create claims only in orgs they are direct members of';
COMMENT ON POLICY update_claims ON claims IS 'Hierarchical RLS: Owners or admins/officers can update claims in visible orgs';
COMMENT ON POLICY delete_claims ON claims IS 'Hierarchical RLS: Only admins can delete claims in visible orgs';

-- =====================================================================================
-- PART 4: HIERARCHICAL RLS POLICIES - ORGANIZATION MEMBERS
-- =====================================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_organization_members ON organization_members;
DROP POLICY IF EXISTS insert_organization_members ON organization_members;
DROP POLICY IF EXISTS update_organization_members ON organization_members;
DROP POLICY IF EXISTS delete_organization_members ON organization_members;

-- SELECT: View members in own org + descendants
CREATE POLICY select_organization_members ON organization_members
  FOR SELECT
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
  );

-- INSERT: Admins can add members to their own org + descendants
CREATE POLICY insert_organization_members ON organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND om.organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND om.role IN ('admin', 'officer')
        AND om.status = 'active'
    )
  );

-- UPDATE: Admins can update member records in visible orgs
CREATE POLICY update_organization_members ON organization_members
  FOR UPDATE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND (
      -- Users can update their own record
      user_id = current_setting('app.current_user_id', TRUE)::TEXT
      OR
      -- Admins can update any member in visible orgs
      EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = current_setting('app.current_user_id', TRUE)::TEXT
          AND om.organization_id IN (SELECT * FROM get_current_user_visible_orgs())
          AND om.role IN ('admin', 'officer')
          AND om.status = 'active'
      )
    )
  );

-- DELETE: Only admins can remove members from visible orgs
CREATE POLICY delete_organization_members ON organization_members
  FOR DELETE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND om.organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND om.role = 'admin'
        AND om.status = 'active'
    )
  );

-- =====================================================================================
-- PART 5: HIERARCHICAL RLS POLICIES - DUES PAYMENTS
-- =====================================================================================

ALTER TABLE dues_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_dues_payments ON dues_payments;
DROP POLICY IF EXISTS insert_dues_payments ON dues_payments;
DROP POLICY IF EXISTS update_dues_payments ON dues_payments;

-- SELECT: View dues payments in own org + descendants
CREATE POLICY select_dues_payments ON dues_payments
  FOR SELECT
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
  );

-- INSERT: Admins/officers can record dues payments in visible orgs
CREATE POLICY insert_dues_payments ON dues_payments
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND role IN ('admin', 'officer', 'treasurer')
        AND status = 'active'
    )
  );

-- UPDATE: Admins/officers/treasurers can update dues in visible orgs
CREATE POLICY update_dues_payments ON dues_payments
  FOR UPDATE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND role IN ('admin', 'officer', 'treasurer')
        AND status = 'active'
    )
  );

-- =====================================================================================
-- PART 6: HIERARCHICAL RLS POLICIES - STRIKE FUNDS
-- =====================================================================================

ALTER TABLE strike_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_strike_funds ON strike_funds;
DROP POLICY IF EXISTS insert_strike_funds ON strike_funds;
DROP POLICY IF EXISTS update_strike_funds ON strike_funds;

-- SELECT: View strike funds in own org + descendants
CREATE POLICY select_strike_funds ON strike_funds
  FOR SELECT
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
  );

-- INSERT: Only admins/officers can create strike fund entries
CREATE POLICY insert_strike_funds ON strike_funds
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND role IN ('admin', 'officer', 'treasurer')
        AND status = 'active'
    )
  );

-- UPDATE: Only admins/officers can update strike funds
CREATE POLICY update_strike_funds ON strike_funds
  FOR UPDATE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND role IN ('admin', 'officer', 'treasurer')
        AND status = 'active'
    )
  );

-- =====================================================================================
-- PART 7: HIERARCHICAL RLS POLICIES - DEADLINES
-- =====================================================================================

ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_deadlines ON deadlines;
DROP POLICY IF EXISTS insert_deadlines ON deadlines;
DROP POLICY IF EXISTS update_deadlines ON deadlines;
DROP POLICY IF EXISTS delete_deadlines ON deadlines;

-- SELECT: View deadlines in own org + descendants
CREATE POLICY select_deadlines ON deadlines
  FOR SELECT
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
  );

-- INSERT: Any active member can create deadlines in their org
CREATE POLICY insert_deadlines ON deadlines
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND status = 'active'
    )
  );

-- UPDATE: Owner or admins can update deadlines
CREATE POLICY update_deadlines ON deadlines
  FOR UPDATE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND (
      created_by = current_setting('app.current_user_id', TRUE)::UUID
      OR EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
          AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
          AND role IN ('admin', 'officer')
          AND status = 'active'
      )
    )
  );

-- DELETE: Only owner or admins can delete deadlines
CREATE POLICY delete_deadlines ON deadlines
  FOR DELETE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND (
      created_by = current_setting('app.current_user_id', TRUE)::UUID
      OR EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
          AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
          AND role = 'admin'
          AND status = 'active'
      )
    )
  );

-- =====================================================================================
-- PART 8: HIERARCHICAL RLS POLICIES - COLLECTIVE AGREEMENTS
-- =====================================================================================

ALTER TABLE collective_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_collective_agreements ON collective_agreements;
DROP POLICY IF EXISTS insert_collective_agreements ON collective_agreements;
DROP POLICY IF EXISTS update_collective_agreements ON collective_agreements;

-- SELECT: View CBAs in own org + descendants
CREATE POLICY select_collective_agreements ON collective_agreements
  FOR SELECT
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
  );

-- INSERT: Only admins/officers can create CBAs
CREATE POLICY insert_collective_agreements ON collective_agreements
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND role IN ('admin', 'officer')
        AND status = 'active'
    )
  );

-- UPDATE: Only admins/officers can update CBAs
CREATE POLICY update_collective_agreements ON collective_agreements
  FOR UPDATE
  USING (
    organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = current_setting('app.current_user_id', TRUE)::TEXT
        AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
        AND role IN ('admin', 'officer')
        AND status = 'active'
    )
  );

-- =====================================================================================
-- PART 9: CONDITIONAL RLS POLICIES (If Tables Exist)
-- =====================================================================================

-- Grievances (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grievances') THEN
    EXECUTE 'ALTER TABLE grievances ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS select_grievances ON grievances';
    EXECUTE 'CREATE POLICY select_grievances ON grievances FOR SELECT USING (
      organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    )';
    
    EXECUTE 'DROP POLICY IF EXISTS insert_grievances ON grievances';
    EXECUTE 'CREATE POLICY insert_grievances ON grievances FOR INSERT WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = current_setting(''app.current_user_id'', TRUE)::TEXT
          AND status = ''active''
      )
    )';
    
    EXECUTE 'DROP POLICY IF EXISTS update_grievances ON grievances';
    EXECUTE 'CREATE POLICY update_grievances ON grievances FOR UPDATE USING (
      organization_id IN (SELECT * FROM get_current_user_visible_orgs())
      AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = current_setting(''app.current_user_id'', TRUE)::TEXT
          AND organization_id IN (SELECT * FROM get_current_user_visible_orgs())
          AND role IN (''admin'', ''officer'', ''steward'')
          AND status = ''active''
      )
    )';
  END IF;
END $$;

-- Documents (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    EXECUTE 'ALTER TABLE documents ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS select_documents ON documents';
    EXECUTE 'CREATE POLICY select_documents ON documents FOR SELECT USING (
      organization_id IN (SELECT * FROM get_current_user_visible_orgs())
    )';
    
    EXECUTE 'DROP POLICY IF EXISTS insert_documents ON documents';
    EXECUTE 'CREATE POLICY insert_documents ON documents FOR INSERT WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = current_setting(''app.current_user_id'', TRUE)::TEXT
          AND status = ''active''
      )
    )';
  END IF;
END $$;

-- =====================================================================================
-- PART 10: PERFORMANCE OPTIMIZATION
-- =====================================================================================

-- Create GIN index on hierarchy_path for fast containment queries (@> operator)
CREATE INDEX IF NOT EXISTS idx_organizations_hierarchy_path_gin 
  ON organizations USING GIN(hierarchy_path);

-- Analyze tables for query planner
ANALYZE organizations;
ANALYZE organization_members;
ANALYZE claims;
ANALYZE dues_payments;
ANALYZE strike_funds;
ANALYZE deadlines;
ANALYZE collective_agreements;

-- =====================================================================================
-- PART 11: MONITORING & VALIDATION
-- =====================================================================================

-- View: Monitor RLS policy performance
CREATE OR REPLACE VIEW v_rls_policy_stats AS
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  ARRAY_AGG(policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC;

-- Function: Validate hierarchical access (for testing)
CREATE OR REPLACE FUNCTION validate_hierarchical_access(
  test_user_id UUID,
  test_org_id UUID
) RETURNS TABLE (
  user_id UUID,
  org_id UUID,
  org_name TEXT,
  can_access BOOLEAN,
  access_path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    test_user_id,
    test_org_id,
    o.name,
    user_can_access_org(test_user_id, test_org_id),
    o.hierarchy_path
  FROM organizations o
  WHERE o.id = test_org_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON VIEW v_rls_policy_stats IS 'Monitor RLS policy coverage across all tables';
COMMENT ON FUNCTION validate_hierarchical_access IS 'Test function to validate user access to specific organization';

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Summary:
-- ✅ Added organization_id column to 8 core tables (claims, dues, strike_funds, etc.)
-- ✅ Created 4 optimized helper functions for hierarchical queries
-- ✅ Implemented hierarchical RLS policies on 8 core tables
-- ✅ Backward compatible: tenant_id columns preserved for migration period
-- ✅ Performance optimized: GIN indexes on hierarchy_path
-- ✅ Monitoring: v_rls_policy_stats view + validate_hierarchical_access() function
--
-- Next Steps:
-- 1. Run migration: psql < 050_hierarchical_rls_policies.sql
-- 2. Populate organization_id from tenant_id mappings
-- 3. Test with sample users across org hierarchy
-- 4. Monitor query performance (EXPLAIN ANALYZE)
-- 5. Update application code to set session context: SET app.current_user_id = '...'
-- =====================================================================================

