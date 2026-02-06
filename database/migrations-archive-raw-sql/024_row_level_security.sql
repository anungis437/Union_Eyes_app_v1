-- Migration: Row Level Security (RLS) for Multi-Tenant Isolation
-- Description: Implement RLS policies to ensure complete data isolation between tenants
-- Phase: 2 - Multi-Tenant Architecture
-- Date: 2025-11-14

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON TENANT-SPECIFIC TABLES
-- ============================================================================

-- Enable RLS on claims table
ALTER TABLE claims_management.claims ENABLE ROW LEVEL SECURITY;

-- Enable RLS on members table
ALTER TABLE member_management.members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on grievances table (if exists)
ALTER TABLE IF EXISTS grievance_management.grievances ENABLE ROW LEVEL SECURITY;

-- Enable RLS on claim_history table
ALTER TABLE claims_management.claim_history ENABLE ROW LEVEL SECURITY;

-- Enable RLS on claim_documents table
ALTER TABLE claims_management.claim_documents ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cba_clauses table
ALTER TABLE contract_management.cba_clauses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_logs table
ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES FOR CLAIMS
-- ============================================================================

-- Policy: Users can only see claims from their tenant
CREATE POLICY claims_tenant_isolation_select ON claims_management.claims
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert claims for their tenant
CREATE POLICY claims_tenant_isolation_insert ON claims_management.claims
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only update claims from their tenant
CREATE POLICY claims_tenant_isolation_update ON claims_management.claims
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only delete claims from their tenant
CREATE POLICY claims_tenant_isolation_delete ON claims_management.claims
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- CREATE RLS POLICIES FOR MEMBERS
-- ============================================================================

-- Policy: Users can only see members from their tenant
CREATE POLICY members_tenant_isolation_select ON member_management.members
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert members for their tenant
CREATE POLICY members_tenant_isolation_insert ON member_management.members
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only update members from their tenant
CREATE POLICY members_tenant_isolation_update ON member_management.members
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only delete members from their tenant
CREATE POLICY members_tenant_isolation_delete ON member_management.members
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- CREATE RLS POLICIES FOR CLAIM HISTORY
-- ============================================================================

-- Policy: Users can only see claim history from their tenant
CREATE POLICY claim_history_tenant_isolation_select ON claims_management.claim_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims_management.claims
      WHERE claims.claim_id = claim_history.claim_id
      AND claims.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- Policy: Users can only insert claim history for their tenant's claims
CREATE POLICY claim_history_tenant_isolation_insert ON claims_management.claim_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims_management.claims
      WHERE claims.claim_id = claim_history.claim_id
      AND claims.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ============================================================================
-- CREATE RLS POLICIES FOR CLAIM DOCUMENTS
-- ============================================================================

-- Policy: Users can only see documents from their tenant's claims
CREATE POLICY claim_documents_tenant_isolation_select ON claims_management.claim_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims_management.claims
      WHERE claims.claim_id = claim_documents.claim_id
      AND claims.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- Policy: Users can only insert documents for their tenant's claims
CREATE POLICY claim_documents_tenant_isolation_insert ON claims_management.claim_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims_management.claims
      WHERE claims.claim_id = claim_documents.claim_id
      AND claims.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- Policy: Users can only delete documents from their tenant's claims
CREATE POLICY claim_documents_tenant_isolation_delete ON claims_management.claim_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM claims_management.claims
      WHERE claims.claim_id = claim_documents.claim_id
      AND claims.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ============================================================================
-- CREATE RLS POLICIES FOR CBA CLAUSES
-- ============================================================================

-- Policy: Users can only see CBA clauses from their tenant
CREATE POLICY cba_clauses_tenant_isolation_select ON contract_management.cba_clauses
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert CBA clauses for their tenant
CREATE POLICY cba_clauses_tenant_isolation_insert ON contract_management.cba_clauses
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only update CBA clauses from their tenant
CREATE POLICY cba_clauses_tenant_isolation_update ON contract_management.cba_clauses
  FOR UPDATE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only delete CBA clauses from their tenant
CREATE POLICY cba_clauses_tenant_isolation_delete ON contract_management.cba_clauses
  FOR DELETE
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- CREATE RLS POLICIES FOR AUDIT LOGS
-- ============================================================================

-- Policy: Users can only see audit logs from their tenant
CREATE POLICY audit_logs_tenant_isolation_select ON audit.audit_logs
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Policy: Users can only insert audit logs for their tenant
CREATE POLICY audit_logs_tenant_isolation_insert ON audit.audit_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- CREATE HELPER FUNCTION TO SET TENANT CONTEXT
-- ============================================================================

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

-- ============================================================================
-- CREATE TENANT VALIDATION FUNCTION
-- ============================================================================

-- Function to validate tenant isolation (for testing)
CREATE OR REPLACE FUNCTION validate_tenant_isolation()
RETURNS TABLE(
  table_name text,
  has_rls boolean,
  policy_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text,
    c.relrowsecurity,
    COUNT(p.polname)::integer
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace IN (
    SELECT oid FROM pg_namespace 
    WHERE nspname IN ('claims_management', 'member_management', 'contract_management', 'audit')
  )
  AND c.relkind = 'r'
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission on helper functions to application role
-- Adjust role name as needed for your setup
GRANT EXECUTE ON FUNCTION set_current_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_tenant_isolation() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname IN ('claims_management', 'member_management', 'contract_management', 'audit')
ORDER BY schemaname, tablename;

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname IN ('claims_management', 'member_management', 'contract_management', 'audit')
ORDER BY schemaname, tablename, policyname;

-- Test validation function
SELECT * FROM validate_tenant_isolation();
