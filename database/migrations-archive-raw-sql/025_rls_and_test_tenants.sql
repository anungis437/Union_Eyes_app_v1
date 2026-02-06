-- Migration: Row Level Security (RLS) for Multi-Tenant Isolation + Test Tenants
-- Description: Implement RLS policies and create test tenants for validation
-- Phase: 2 - Multi-Tenant Architecture Testing
-- Date: 2024-11-14

-- ============================================================================
-- PART 1: CREATE TEST TENANTS
-- ============================================================================

-- Insert Test Tenant 1: Union Local 123
INSERT INTO tenant_management.tenants (
  tenant_id,
  tenant_slug,
  tenant_name,
  subscription_tier,
  status,
  max_users,
  max_storage_gb,
  features,
  settings,
  billing_email,
  contact_email,
  timezone,
  locale
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'union-local-123',
  'Union Local 123',
  'professional',
  'active',
  50,
  100,
  '{"advanced_analytics": true, "ai_workbench": true, "grievance_engine": true, "cba_comparison": true}'::jsonb,
  '{"theme": "blue", "logo": "union-123.png"}'::jsonb,
  'billing@unionlocal123.org',
  'info@unionlocal123.org',
  'America/New_York',
  'en-US'
) ON CONFLICT (tenant_slug) DO NOTHING;

-- Insert Test Tenant 2: Workers Alliance
INSERT INTO tenant_management.tenants (
  tenant_id,
  tenant_slug,
  tenant_name,
  subscription_tier,
  status,
  max_users,
  max_storage_gb,
  features,
  settings,
  billing_email,
  contact_email,
  timezone,
  locale
) VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'workers-alliance',
  'Workers Alliance',
  'enterprise',
  'active',
  200,
  500,
  '{"advanced_analytics": true, "ai_workbench": true, "grievance_engine": true, "cba_comparison": true, "custom_branding": true, "sso": true}'::jsonb,
  '{"theme": "green", "logo": "workers-alliance.png"}'::jsonb,
  'billing@workersalliance.org',
  'contact@workersalliance.org',
  'America/Los_Angeles',
  'en-US'
) ON CONFLICT (tenant_slug) DO NOTHING;

-- Verify test tenants created
SELECT tenant_id, tenant_slug, tenant_name, subscription_tier, status 
FROM tenant_management.tenants 
WHERE tenant_slug IN ('union-local-123', 'workers-alliance');

-- ============================================================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on claims table
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Enable RLS on CBA clauses table
ALTER TABLE public.cba_clauses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on collective agreements table
ALTER TABLE public.collective_agreements ENABLE ROW LEVEL SECURITY;

-- Enable RLS on claim updates table
ALTER TABLE public.claim_updates ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit logs table
ALTER TABLE audit_security.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: CREATE RLS POLICIES FOR CLAIMS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS claims_tenant_isolation_select ON public.claims;
DROP POLICY IF EXISTS claims_tenant_isolation_insert ON public.claims;
DROP POLICY IF EXISTS claims_tenant_isolation_update ON public.claims;
DROP POLICY IF EXISTS claims_tenant_isolation_delete ON public.claims;

-- Policy: Users can only see claims from their tenant
CREATE POLICY claims_tenant_isolation_select ON public.claims
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert claims for their tenant
CREATE POLICY claims_tenant_isolation_insert ON public.claims
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only update claims from their tenant
CREATE POLICY claims_tenant_isolation_update ON public.claims
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only delete claims from their tenant
CREATE POLICY claims_tenant_isolation_delete ON public.claims
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- PART 4: CREATE RLS POLICIES FOR CBA CLAUSES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS cba_clauses_tenant_isolation_select ON public.cba_clauses;
DROP POLICY IF EXISTS cba_clauses_tenant_isolation_insert ON public.cba_clauses;
DROP POLICY IF EXISTS cba_clauses_tenant_isolation_update ON public.cba_clauses;
DROP POLICY IF EXISTS cba_clauses_tenant_isolation_delete ON public.cba_clauses;

-- Policy: Users can only see CBA clauses from their tenant
CREATE POLICY cba_clauses_tenant_isolation_select ON public.cba_clauses
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert CBA clauses for their tenant
CREATE POLICY cba_clauses_tenant_isolation_insert ON public.cba_clauses
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only update CBA clauses from their tenant
CREATE POLICY cba_clauses_tenant_isolation_update ON public.cba_clauses
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only delete CBA clauses from their tenant
CREATE POLICY cba_clauses_tenant_isolation_delete ON public.cba_clauses
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- PART 5: CREATE RLS POLICIES FOR COLLECTIVE AGREEMENTS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS collective_agreements_tenant_isolation_select ON public.collective_agreements;
DROP POLICY IF EXISTS collective_agreements_tenant_isolation_insert ON public.collective_agreements;
DROP POLICY IF EXISTS collective_agreements_tenant_isolation_update ON public.collective_agreements;
DROP POLICY IF EXISTS collective_agreements_tenant_isolation_delete ON public.collective_agreements;

-- Policy: Users can only see collective agreements from their tenant
CREATE POLICY collective_agreements_tenant_isolation_select ON public.collective_agreements
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert collective agreements for their tenant
CREATE POLICY collective_agreements_tenant_isolation_insert ON public.collective_agreements
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only update collective agreements from their tenant
CREATE POLICY collective_agreements_tenant_isolation_update ON public.collective_agreements
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only delete collective agreements from their tenant
CREATE POLICY collective_agreements_tenant_isolation_delete ON public.collective_agreements
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- PART 6: CREATE RLS POLICIES FOR CLAIM UPDATES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS claim_updates_tenant_isolation_select ON public.claim_updates;
DROP POLICY IF EXISTS claim_updates_tenant_isolation_insert ON public.claim_updates;

-- Policy: Users can only see claim updates from their tenant's claims
CREATE POLICY claim_updates_tenant_isolation_select ON public.claim_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.claims
      WHERE claims.claim_id = claim_updates.claim_id
      AND claims.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- Policy: Users can only insert claim updates for their tenant's claims
CREATE POLICY claim_updates_tenant_isolation_insert ON public.claim_updates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.claims
      WHERE claims.claim_id = claim_updates.claim_id
      AND claims.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ============================================================================
-- PART 7: CREATE RLS POLICIES FOR AUDIT LOGS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS audit_logs_tenant_isolation_select ON audit_security.audit_logs;
DROP POLICY IF EXISTS audit_logs_tenant_isolation_insert ON audit_security.audit_logs;

-- Policy: Users can only see audit logs from their tenant
CREATE POLICY audit_logs_tenant_isolation_select ON audit_security.audit_logs
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert audit logs for their tenant
CREATE POLICY audit_logs_tenant_isolation_insert ON audit_security.audit_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- PART 8: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS set_current_tenant(UUID);
DROP FUNCTION IF EXISTS get_current_tenant();
DROP FUNCTION IF EXISTS validate_tenant_isolation();

-- Function to set the current tenant ID in session
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the current tenant ID from session
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate tenant isolation (for testing)
CREATE OR REPLACE FUNCTION validate_tenant_isolation()
RETURNS TABLE(
  table_schema text,
  table_name text,
  has_rls boolean,
  policy_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_schema::text,
    c.table_name::text,
    c.row_security::boolean,
    COUNT(p.policyname)::bigint
  FROM information_schema.tables c
  LEFT JOIN pg_policies p ON p.schemaname = c.table_schema AND p.tablename = c.table_name
  WHERE c.table_schema IN ('public', 'audit_security')
  AND c.table_name IN ('claims', 'cba_clauses', 'collective_agreements', 'claim_updates', 'audit_logs')
  GROUP BY c.table_schema, c.table_name, c.row_security
  ORDER BY c.table_schema, c.table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 9: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION set_current_tenant(UUID) TO unionadmin;
GRANT EXECUTE ON FUNCTION get_current_tenant() TO unionadmin;
GRANT EXECUTE ON FUNCTION validate_tenant_isolation() TO unionadmin;

-- ============================================================================
-- PART 10: VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname IN ('public', 'audit_security')
AND tablename IN ('claims', 'cba_clauses', 'collective_agreements', 'claim_updates', 'audit_logs')
ORDER BY schemaname, tablename;

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname IN ('public', 'audit_security')
AND tablename IN ('claims', 'cba_clauses', 'collective_agreements', 'claim_updates', 'audit_logs')
ORDER BY schemaname, tablename, policyname;

-- Test validation function
SELECT * FROM validate_tenant_isolation();

-- ============================================================================
-- PART 11: CREATE TEST DATA FOR TENANT ISOLATION TESTING
-- ============================================================================

-- Create test claims for Union Local 123
INSERT INTO public.claims (
  claim_number,
  tenant_id,
  member_id,
  claim_type,
  status,
  priority,
  incident_date,
  location,
  description,
  desired_outcome
) VALUES 
(
  'CLM-2024-TEST-001',
  'a1111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001', -- Placeholder user ID
  'grievance_pay',
  'submitted',
  'high',
  '2024-11-01',
  'Main Office',
  'Test claim for Union Local 123 - unpaid overtime',
  'Payment of overtime hours'
),
(
  'CLM-2024-TEST-002',
  'a1111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'workplace_safety',
  'under_review',
  'critical',
  '2024-11-05',
  'Factory Floor',
  'Test claim for Union Local 123 - safety hazard',
  'Immediate safety improvements'
);

-- Create test claims for Workers Alliance
INSERT INTO public.claims (
  claim_number,
  tenant_id,
  member_id,
  claim_type,
  status,
  priority,
  incident_date,
  location,
  description,
  desired_outcome
) VALUES 
(
  'CLM-2024-TEST-003',
  'b2222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'discrimination_gender',
  'submitted',
  'medium',
  '2024-11-03',
  'Corporate HQ',
  'Test claim for Workers Alliance - gender discrimination',
  'Equal treatment and compensation'
),
(
  'CLM-2024-TEST-004',
  'b2222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000001',
  'harassment_verbal',
  'investigation',
  'high',
  '2024-11-07',
  'Warehouse',
  'Test claim for Workers Alliance - verbal harassment',
  'Disciplinary action and workplace training'
);

-- Verify test claims created
SELECT 
  claim_number,
  tenant_id,
  (SELECT tenant_name FROM tenant_management.tenants WHERE tenant_id = claims.tenant_id) as tenant_name,
  claim_type,
  status,
  priority,
  created_at
FROM public.claims
WHERE claim_number LIKE 'CLM-2024-TEST-%'
ORDER BY claim_number;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Display summary
SELECT 
  'RLS Migration Complete!' as status,
  (SELECT COUNT(*) FROM tenant_management.tenants WHERE tenant_slug IN ('union-local-123', 'workers-alliance')) as test_tenants_created,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname IN ('public', 'audit_security') AND tablename IN ('claims', 'cba_clauses', 'collective_agreements', 'claim_updates', 'audit_logs') AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname IN ('public', 'audit_security')) as total_policies,
  (SELECT COUNT(*) FROM public.claims WHERE claim_number LIKE 'CLM-2024-TEST-%') as test_claims_created;
