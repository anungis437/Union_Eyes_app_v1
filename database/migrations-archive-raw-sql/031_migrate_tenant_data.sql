-- =====================================================
-- Data Migration: Existing Tenants → Organizations
-- =====================================================
-- This script migrates existing tenant_management.tenants to new organizations table
-- Preserves all existing data and creates backward-compatible references

BEGIN;

-- =====================================================
-- 1. MIGRATE EXISTING TENANTS TO ORGANIZATIONS
-- =====================================================

-- Insert each existing tenant as a 'local' type organization
-- Assumption: Existing tenants are local unions until hierarchy is defined
INSERT INTO organizations (
  id,
  name,
  slug,
  display_name,
  organization_type,
  parent_id,
  hierarchy_level,
  hierarchy_path,
  jurisdiction,
  status,
  settings,
  created_at,
  updated_at,
  legacy_tenant_id
)
SELECT 
  gen_random_uuid(), -- New UUID for organization
  t.tenant_name,
  t.tenant_slug,
  t.tenant_name, -- Use tenant_name for display_name
  'local', -- Default to 'local' type
  '10000000-0000-0000-0000-000000000001'::UUID, -- Parent = CLC (for now)
  1, -- Level 1 under CLC
  ARRAY['clc', t.tenant_slug], -- Path: CLC → this org
  'ON', -- Default to Ontario (most common)
  COALESCE(t.status, 'active'),
  COALESCE(t.settings, '{}'::JSONB),
  COALESCE(t.created_at, NOW()),
  COALESCE(t.updated_at, NOW()),
  t.tenant_id -- Store original tenant_id for reference
FROM tenant_management.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.legacy_tenant_id = t.tenant_id
);

-- =====================================================
-- 2. UPDATE ORGANIZATION_MEMBERS TO USE NEW IDs
-- =====================================================

-- Add new organization_id column to organization_members
ALTER TABLE organization_members 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Populate organization_id from tenant_id mapping
UPDATE organization_members om
SET organization_id = o.id
FROM organizations o
WHERE o.legacy_tenant_id = om.tenant_id
  AND om.organization_id IS NULL;

-- Create index on new column
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id 
  ON organization_members(organization_id);

-- =====================================================
-- 3. SPECIAL CASE: Migrate Known Test Tenants
-- =====================================================

-- Union Local 123 → CUPE Local 123 (fictional but realistic)
UPDATE organizations
SET 
  name = 'CUPE Local 123',
  short_name = 'CUPE 123',
  display_name = 'Canadian Union of Public Employees Local 123',
  organization_type = 'local',
  sectors = ARRAY['public_service']::labour_sector[],
  jurisdiction = 'ON',
  province_territory = 'Ontario',
  clc_affiliated = true,
  affiliation_date = '2000-01-01', -- Default affiliation date
  charter_number = 'CUPE-123'
WHERE legacy_tenant_id = 'a1111111-1111-1111-1111-111111111111'::UUID;

-- Workers Alliance → Unifor Local 444 (real union in Windsor)
UPDATE organizations
SET 
  name = 'Unifor Local 444',
  short_name = 'Unifor 444',
  display_name = 'Unifor Local 444 - Automotive Workers',
  organization_type = 'local',
  sectors = ARRAY['manufacturing', 'trades']::labour_sector[],
  jurisdiction = 'ON',
  province_territory = 'Ontario',
  clc_affiliated = true,
  affiliation_date = '1985-09-01',
  charter_number = 'UNIFOR-444',
  website = 'https://www.uniforlocal444.ca',
  settings = '{
    "industry": "automotive",
    "major_employers": ["Stellantis Windsor Assembly", "Nemak"],
    "founded": 1938
  }'::JSONB
WHERE legacy_tenant_id = 'b2222222-2222-2222-2222-222222222222'::UUID;

-- Default Union → UFCW Local 1006A (real union in Ontario)
UPDATE organizations
SET 
  name = 'UFCW Local 1006A',
  short_name = 'UFCW 1006A',
  display_name = 'United Food and Commercial Workers Local 1006A',
  organization_type = 'local',
  sectors = ARRAY['retail', 'hospitality']::labour_sector[],
  jurisdiction = 'ON',
  province_territory = 'Ontario',
  clc_affiliated = true,
  affiliation_date = '1999-01-01',
  charter_number = 'UFCW-1006A',
  website = 'https://www.ufcw1006a.ca',
  member_count = 50000,
  settings = '{
    "industry": "retail_food_service",
    "major_employers": ["Loblaws", "Metro", "Sobeys", "various hotels"],
    "largest_local_in_canada": true
  }'::JSONB
WHERE legacy_tenant_id = '29cec18c-5df2-41c0-a7c8-73a9464c9d3b'::UUID;

-- =====================================================
-- 4. CREATE PARENT ORGANIZATIONS (National Unions)
-- =====================================================

-- CUPE National
INSERT INTO organizations (
  id,
  name,
  slug,
  short_name,
  display_name,
  organization_type,
  parent_id,
  hierarchy_level,
  hierarchy_path,
  jurisdiction,
  sectors,
  clc_affiliated,
  affiliation_date,
  website,
  member_count,
  settings
) VALUES (
  '20000000-0000-0000-0000-000000000001'::UUID,
  'Canadian Union of Public Employees',
  'cupe',
  'CUPE',
  'Canadian Union of Public Employees / Syndicat canadien de la fonction publique',
  'union',
  '10000000-0000-0000-0000-000000000001'::UUID, -- Parent: CLC
  1,
  ARRAY['clc', 'cupe'],
  'federal',
  ARRAY['public_service', 'healthcare', 'education']::labour_sector[],
  true,
  '1963-01-01',
  'https://cupe.ca',
  700000,
  '{
    "bilingual": true,
    "locals_count": 2000,
    "largest_union_in_canada": true
  }'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- Unifor National
INSERT INTO organizations (
  id,
  name,
  slug,
  short_name,
  display_name,
  organization_type,
  parent_id,
  hierarchy_level,
  hierarchy_path,
  jurisdiction,
  sectors,
  clc_affiliated,
  affiliation_date,
  website,
  member_count,
  settings
) VALUES (
  '20000000-0000-0000-0000-000000000002'::UUID,
  'Unifor',
  'unifor',
  'Unifor',
  'Unifor / Unifor',
  'union',
  '10000000-0000-0000-0000-000000000001'::UUID, -- Parent: CLC
  1,
  ARRAY['clc', 'unifor'],
  'federal',
  ARRAY['manufacturing', 'trades', 'transportation', 'utilities']::labour_sector[],
  true,
  '2013-09-01', -- Formed from CAW + CEP merger
  'https://www.unifor.org',
  315000,
  '{
    "bilingual": true,
    "locals_count": 800,
    "formed_by_merger": ["CAW", "CEP"],
    "sectors": ["automotive", "aerospace", "rail", "energy", "media"]
  }'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- UFCW Canada
INSERT INTO organizations (
  id,
  name,
  slug,
  short_name,
  display_name,
  organization_type,
  parent_id,
  hierarchy_level,
  hierarchy_path,
  jurisdiction,
  sectors,
  clc_affiliated,
  affiliation_date,
  website,
  member_count,
  settings
) VALUES (
  '20000000-0000-0000-0000-000000000003'::UUID,
  'United Food and Commercial Workers Canada',
  'ufcw-canada',
  'UFCW Canada',
  'United Food and Commercial Workers Canada',
  'union',
  '10000000-0000-0000-0000-000000000001'::UUID, -- Parent: CLC
  1,
  ARRAY['clc', 'ufcw-canada'],
  'federal',
  ARRAY['retail', 'hospitality', 'agriculture']::labour_sector[],
  true,
  '1979-01-01',
  'https://www.ufcw.ca',
  250000,
  '{
    "bilingual": true,
    "locals_count": 200,
    "international_affiliate": "UFCW International",
    "sectors": ["grocery", "retail", "food_processing", "hospitality"]
  }'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. UPDATE LOCAL UNIONS' PARENT RELATIONSHIPS
-- =====================================================

-- Link CUPE Local 123 to CUPE National
UPDATE organizations
SET 
  parent_id = '20000000-0000-0000-0000-000000000001'::UUID,
  hierarchy_level = 2,
  hierarchy_path = ARRAY['clc', 'cupe', slug]
WHERE short_name = 'CUPE 123';

-- Link Unifor Local 444 to Unifor National
UPDATE organizations
SET 
  parent_id = '20000000-0000-0000-0000-000000000002'::UUID,
  hierarchy_level = 2,
  hierarchy_path = ARRAY['clc', 'unifor', slug]
WHERE short_name = 'Unifor 444';

-- Link UFCW Local 1006A to UFCW Canada
UPDATE organizations
SET 
  parent_id = '20000000-0000-0000-0000-000000000003'::UUID,
  hierarchy_level = 2,
  hierarchy_path = ARRAY['clc', 'ufcw-canada', slug]
WHERE short_name = 'UFCW 1006A';

-- =====================================================
-- 6. CREATE ORGANIZATION RELATIONSHIPS
-- =====================================================

-- CLC ← CUPE (affiliate)
INSERT INTO organization_relationships (
  parent_org_id,
  child_org_id,
  relationship_type,
  effective_date,
  notes
) VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID, -- CLC
  '20000000-0000-0000-0000-000000000001'::UUID, -- CUPE
  'affiliate',
  '1963-01-01',
  'CUPE founding member of CLC'
);

-- CLC ← Unifor (affiliate)
INSERT INTO organization_relationships (
  parent_org_id,
  child_org_id,
  relationship_type,
  effective_date,
  notes
) VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID, -- CLC
  '20000000-0000-0000-0000-000000000002'::UUID, -- Unifor
  'affiliate',
  '2013-09-01',
  'Unifor joined CLC upon formation from CAW-CEP merger'
);

-- CLC ← UFCW Canada (affiliate)
INSERT INTO organization_relationships (
  parent_org_id,
  child_org_id,
  relationship_type,
  effective_date,
  notes
) VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID, -- CLC
  '20000000-0000-0000-0000-000000000003'::UUID, -- UFCW Canada
  'affiliate',
  '1979-01-01',
  'UFCW Canada CLC affiliate'
);

-- CUPE National ← CUPE Local 123 (local)
INSERT INTO organization_relationships (
  parent_org_id,
  child_org_id,
  relationship_type,
  effective_date
) 
SELECT 
  '20000000-0000-0000-0000-000000000001'::UUID, -- CUPE National
  o.id, -- CUPE Local 123
  'local',
  '1960-01-01'
FROM organizations o
WHERE o.short_name = 'CUPE 123';

-- Unifor National ← Unifor Local 444 (local)
INSERT INTO organization_relationships (
  parent_org_id,
  child_org_id,
  relationship_type,
  effective_date
) 
SELECT 
  '20000000-0000-0000-0000-000000000002'::UUID, -- Unifor National
  o.id, -- Unifor Local 444
  'local',
  '1938-01-01'
FROM organizations o
WHERE o.short_name = 'Unifor 444';

-- UFCW Canada ← UFCW Local 1006A (local)
INSERT INTO organization_relationships (
  parent_org_id,
  child_org_id,
  relationship_type,
  effective_date
) 
SELECT 
  '20000000-0000-0000-0000-000000000003'::UUID, -- UFCW Canada
  o.id, -- UFCW Local 1006A
  'local',
  '1999-01-01'
FROM organizations o
WHERE o.short_name = 'UFCW 1006A';

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Show organization hierarchy
SELECT 
  o.hierarchy_level,
  REPEAT('  ', o.hierarchy_level) || o.name as indented_name,
  o.organization_type,
  o.short_name,
  o.member_count,
  ARRAY_TO_STRING(o.sectors, ', ') as sectors,
  o.jurisdiction
FROM organizations o
ORDER BY o.hierarchy_path;

-- Show relationship counts
SELECT 
  relationship_type,
  COUNT(*) as count
FROM organization_relationships
GROUP BY relationship_type
ORDER BY count DESC;

-- Verify all organization_members have organization_id
SELECT 
  COUNT(*) as total_members,
  COUNT(organization_id) as with_org_id,
  COUNT(*) - COUNT(organization_id) as missing_org_id
FROM organization_members;

COMMIT;

-- =====================================================
-- Success!
-- =====================================================
-- Hierarchy created:
-- CLC (Congress)
--   ├── CUPE National (Union)
--   │   └── CUPE Local 123 (Local)
--   ├── Unifor National (Union)
--   │   └── Unifor Local 444 (Local)
--   └── UFCW Canada (Union)
--       └── UFCW Local 1006A (Local)
