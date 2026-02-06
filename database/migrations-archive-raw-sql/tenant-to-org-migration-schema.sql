# Migration Schema
# 
# Database schema additions for supporting tenant-to-organization migrations.
# Run this SQL to create the necessary tables and columns.

-- =====================================================
-- Tenant-Organization Mapping Table
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_org_mappings (
  tenant_id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  migration_status TEXT NOT NULL CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
  migrated_at TIMESTAMPTZ,
  migrated_by UUID REFERENCES profiles(id),
  record_count INTEGER DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_org_mappings_org_id ON tenant_org_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_org_mappings_status ON tenant_org_mappings(migration_status);
CREATE INDEX IF NOT EXISTS idx_tenant_org_mappings_migrated_at ON tenant_org_mappings(migrated_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_tenant_org_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_org_mappings_updated_at
  BEFORE UPDATE ON tenant_org_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_org_mappings_updated_at();

-- =====================================================
-- Add organization_id columns to existing tables
-- =====================================================

-- Profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
  ON profiles(organization_id);

-- Claims
ALTER TABLE claims 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_claims_organization_id 
  ON claims(organization_id);

-- Documents
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_documents_organization_id 
  ON documents(organization_id);

-- Precedents
ALTER TABLE precedents 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_precedents_organization_id 
  ON precedents(organization_id);

-- Clause Library
ALTER TABLE clause_library 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_clause_library_organization_id 
  ON clause_library(organization_id);

-- Certification Applications
ALTER TABLE certification_applications 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_certification_applications_organization_id 
  ON certification_applications(organization_id);

-- Grievances
ALTER TABLE grievances 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_grievances_organization_id 
  ON grievances(organization_id);

-- Strike Votes
ALTER TABLE strike_votes 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_strike_votes_organization_id 
  ON strike_votes(organization_id);

-- =====================================================
-- Migration Audit Log
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL CHECK (operation IN ('validate', 'migrate', 'rollback', 'verify', 'backup')),
  phase TEXT NOT NULL CHECK (phase IN ('pre-migration', 'migration', 'post-migration', 'rollback')),
  status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  tenant_id TEXT,
  table_name TEXT,
  records_affected INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  performed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_migration_audit_log_operation ON migration_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_migration_audit_log_status ON migration_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_migration_audit_log_tenant_id ON migration_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_migration_audit_log_created_at ON migration_audit_log(created_at DESC);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get migration progress
CREATE OR REPLACE FUNCTION get_migration_progress()
RETURNS TABLE (
  table_name TEXT,
  total_rows BIGINT,
  migrated_rows BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'profiles'::TEXT as table_name,
    COUNT(*)::BIGINT as total_rows,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT as migrated_rows,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as percentage
  FROM profiles
  WHERE tenant_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'claims'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
  FROM claims
  WHERE tenant_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'documents'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
  FROM documents
  WHERE tenant_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'precedents'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
  FROM precedents
  WHERE tenant_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'clause_library'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
  FROM clause_library
  WHERE tenant_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'certification_applications'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
  FROM certification_applications
  WHERE tenant_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'grievances'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
  FROM grievances
  WHERE tenant_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'strike_votes'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::BIGINT,
    ROUND(COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
  FROM strike_votes
  WHERE tenant_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to validate migration readiness
CREATE OR REPLACE FUNCTION validate_migration_readiness()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: All tenants have organization mappings
  RETURN QUERY
  SELECT 
    'Tenant Mappings'::TEXT as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END as status,
    'Tenants without organization mapping: ' || COUNT(*)::TEXT as details
  FROM (
    SELECT DISTINCT tenant_id
    FROM profiles
    WHERE tenant_id IS NOT NULL
    EXCEPT
    SELECT tenant_id FROM tenant_org_mappings
  ) unmapped;

  -- Check 2: No orphaned records
  RETURN QUERY
  SELECT 
    'Orphaned Claims'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'WARN'::TEXT
    END,
    'Claims with invalid user_id: ' || COUNT(*)::TEXT
  FROM claims c
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.user_id IS NOT NULL AND p.id IS NULL;

  -- Check 3: No circular organization references
  RETURN QUERY
  SELECT 
    'Circular References'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END,
    'Organizations with circular parent references: ' || COUNT(*)::TEXT
  FROM (
    WITH RECURSIVE org_tree AS (
      SELECT id, parent_id, ARRAY[id] as path
      FROM organizations
      WHERE parent_id IS NULL
      
      UNION ALL
      
      SELECT o.id, o.parent_id, ot.path || o.id
      FROM organizations o
      JOIN org_tree ot ON o.parent_id = ot.id
      WHERE o.id != ALL(ot.path)
    )
    SELECT id
    FROM organizations
    WHERE id NOT IN (SELECT id FROM org_tree)
  ) circular;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS Policies for Migration Tables
-- =====================================================

-- Enable RLS
ALTER TABLE tenant_org_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin and super_admin can view all mappings
CREATE POLICY "Admins can view all mappings"
  ON tenant_org_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin and super_admin can modify mappings
CREATE POLICY "Admins can modify mappings"
  ON tenant_org_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin and super_admin can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON migration_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- System can always insert audit logs
CREATE POLICY "System can insert audit logs"
  ON migration_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- Sample Data / Test Mappings (Optional)
-- =====================================================

-- Example: Create test mapping
-- INSERT INTO tenant_org_mappings (tenant_id, organization_id, migration_status)
-- SELECT 
--   'legacy-tenant-1',
--   (SELECT id FROM organizations WHERE slug = 'canadian-labour-congress' LIMIT 1),
--   'pending';

-- =====================================================
-- Cleanup Functions (for development)
-- =====================================================

-- Function to reset migration (USE WITH CAUTION)
CREATE OR REPLACE FUNCTION reset_migration()
RETURNS VOID AS $$
BEGIN
  -- Clear organization_id from all tables
  UPDATE profiles SET organization_id = NULL WHERE organization_id IS NOT NULL;
  UPDATE claims SET organization_id = NULL WHERE organization_id IS NOT NULL;
  UPDATE documents SET organization_id = NULL WHERE organization_id IS NOT NULL;
  UPDATE precedents SET organization_id = NULL WHERE organization_id IS NOT NULL;
  UPDATE clause_library SET organization_id = NULL WHERE organization_id IS NOT NULL;
  UPDATE certification_applications SET organization_id = NULL WHERE organization_id IS NOT NULL;
  UPDATE grievances SET organization_id = NULL WHERE organization_id IS NOT NULL;
  UPDATE strike_votes SET organization_id = NULL WHERE organization_id IS NOT NULL;
  
  -- Reset mapping statuses
  UPDATE tenant_org_mappings SET migration_status = 'pending', migrated_at = NULL;
  
  -- Clear audit log
  TRUNCATE migration_audit_log;
  
  RAISE NOTICE 'Migration reset completed';
END;
$$ LANGUAGE plpgsql;

-- Grant execute to admins only
REVOKE EXECUTE ON FUNCTION reset_migration() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_migration() TO authenticated;
