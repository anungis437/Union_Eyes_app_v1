-- Migration: Add tenant_id to organization_members table
-- Description: Align organization_members with multi-tenant architecture
-- Date: 2025-11-14

-- Step 1: Add tenant_id column (nullable initially for migration)
ALTER TABLE organization_members 
ADD COLUMN tenant_id UUID REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE;

-- Step 2: Create mapping from old organization_id to tenant_id
-- Map 'default-org' to the Default Organization tenant
UPDATE organization_members 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id = 'default-org';

-- Step 3: Add NOT NULL constraint after data migration
ALTER TABLE organization_members 
ALTER COLUMN tenant_id SET NOT NULL;

-- Step 4: Create index on tenant_id for performance
CREATE INDEX idx_org_members_tenant_id ON organization_members(tenant_id);

-- Step 5: Add RLS policy for tenant isolation
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see members from their own tenant
CREATE POLICY organization_members_tenant_isolation ON organization_members
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));

-- Policy: Bypass RLS for service role
CREATE POLICY organization_members_service_role ON organization_members
  FOR ALL
  TO unionadmin
  USING (true);

-- Step 6: Add composite unique constraint for tenant + user
-- Drop old unique constraint if it exists
ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS organization_members_organization_id_user_id_key;

-- Add new tenant-based unique constraint
ALTER TABLE organization_members 
ADD CONSTRAINT organization_members_tenant_user_unique UNIQUE (tenant_id, user_id);

-- Step 7: Update trigger function to include tenant_id
-- (The existing updated_at trigger will continue to work)

COMMENT ON COLUMN organization_members.tenant_id IS 'FK to tenant_management.tenants - isolates members by tenant';
COMMENT ON INDEX idx_org_members_tenant_id IS 'Index for tenant-based member queries';
COMMENT ON POLICY organization_members_tenant_isolation ON organization_members IS 'RLS: Users can only access members from their tenant';

-- Verification query (run manually to check):
-- SELECT COUNT(*), tenant_id FROM organization_members GROUP BY tenant_id;
