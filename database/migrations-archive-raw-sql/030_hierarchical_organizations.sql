-- =====================================================
-- Phase 5A: Hierarchical Multi-Tenancy Migration
-- For Canadian Labour Congress (CLC) Support
-- =====================================================
-- This migration transforms flat tenant structure into hierarchical organization model
-- supporting: CLC → Provincial Federations → National Unions → Local Unions

-- =====================================================
-- 1. CREATE ENUMS (Idempotent - drop existing first)
-- =====================================================

-- Drop existing types if they exist (CASCADE handles dependencies)
DROP TYPE IF EXISTS organization_status CASCADE;
DROP TYPE IF EXISTS organization_relationship_type CASCADE;
DROP TYPE IF EXISTS labour_sector CASCADE;
DROP TYPE IF EXISTS ca_jurisdiction CASCADE;
DROP TYPE IF EXISTS organization_type CASCADE;

-- Organization types in the hierarchy
CREATE TYPE organization_type AS ENUM (
  'congress',      -- CLC national level
  'federation',    -- Provincial/territorial federations (OFL, BCFED, etc.)
  'union',         -- National/international unions (CUPE, Unifor, UFCW)
  'local',         -- Local unions/chapters
  'region',        -- Regional councils
  'district'       -- District labour councils
);

-- Canadian jurisdictions (13 provinces/territories + federal)
CREATE TYPE ca_jurisdiction AS ENUM (
  'federal',       -- Federal jurisdiction (10% of workforce)
  'AB',            -- Alberta
  'BC',            -- British Columbia
  'MB',            -- Manitoba
  'NB',            -- New Brunswick
  'NL',            -- Newfoundland and Labrador
  'NS',            -- Nova Scotia
  'NT',            -- Northwest Territories
  'NU',            -- Nunavut
  'ON',            -- Ontario
  'PE',            -- Prince Edward Island
  'QC',            -- Quebec
  'SK',            -- Saskatchewan
  'YT'             -- Yukon
);

-- Labour sectors
CREATE TYPE labour_sector AS ENUM (
  'healthcare',
  'education',
  'public_service',
  'trades',
  'manufacturing',
  'transportation',
  'retail',
  'hospitality',
  'technology',
  'construction',
  'utilities',
  'telecommunications',
  'financial_services',
  'agriculture',
  'arts_culture',
  'other'
);

-- =====================================================
-- 2. CREATE ORGANIZATIONS TABLE (Idempotent)
-- =====================================================

-- Drop table if exists (CASCADE handles foreign keys)
DROP TABLE IF EXISTS organization_relationships CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier
  display_name TEXT, -- Optional display override
  short_name TEXT, -- Acronym (e.g., "CUPE", "CLC")
  
  -- Hierarchy
  organization_type organization_type NOT NULL,
  parent_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  hierarchy_path TEXT[], -- Materialized path: ['clc', 'ofl', 'cupe-ontario', 'cupe-79']
  hierarchy_level INTEGER NOT NULL DEFAULT 0, -- 0=congress, 1=federation, 2=union, 3=local
  
  -- Jurisdiction & Sectors
  jurisdiction ca_jurisdiction, -- Primary jurisdiction
  province_territory TEXT, -- For display purposes
  sectors labour_sector[] DEFAULT '{}', -- Multiple sectors allowed
  
  -- Contact & Metadata
  email TEXT,
  phone TEXT,
  website TEXT,
  address JSONB, -- { street, city, postal_code, etc. }
  
  -- CLC Affiliation
  clc_affiliated BOOLEAN DEFAULT false, -- Is this a CLC affiliate?
  affiliation_date DATE, -- When joined CLC
  charter_number TEXT, -- Union charter/local number
  
  -- Membership Counts (cached for performance)
  member_count INTEGER DEFAULT 0,
  active_member_count INTEGER DEFAULT 0,
  last_member_count_update TIMESTAMPTZ,
  
  -- Billing & Settings
  subscription_tier TEXT, -- free, basic, premium, enterprise
  billing_contact_id UUID, -- References users table
  settings JSONB DEFAULT '{}', -- Organization-specific config
  features_enabled TEXT[] DEFAULT '{}', -- Feature flags
  
  -- Status & Audit
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- User who created
  
  -- Legacy Migration Support
  legacy_tenant_id UUID, -- Reference to old tenant_management.tenants.tenant_id
  
  -- Constraints
  CONSTRAINT valid_hierarchy_path CHECK (
    (hierarchy_level = 0 AND parent_id IS NULL) OR
    (hierarchy_level > 0 AND parent_id IS NOT NULL)
  ),
  
  CONSTRAINT valid_affiliation CHECK (
    (clc_affiliated = false) OR
    (clc_affiliated = true AND affiliation_date IS NOT NULL)
  )
);

-- =====================================================
-- 3. CREATE ORGANIZATION RELATIONSHIPS TABLE
-- =====================================================

CREATE TABLE organization_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship Parties
  parent_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  child_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Relationship Type
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN (
      'affiliate',      -- CLC → National Union
      'federation',     -- CLC → Provincial Federation
      'local',          -- National Union → Local
      'chapter',        -- National Union → Chapter
      'region',         -- National Union → Regional Council
      'district',       -- Federation → District Council
      'joint_council',  -- Multiple unions → Joint council
      'merged_from',    -- Historical merger
      'split_from'      -- Historical split
    )
  ),
  
  -- Temporal Tracking
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL = active relationship
  
  -- Relationship Details
  notes TEXT,
  metadata JSONB DEFAULT '{}', -- Flexible storage for relationship-specific data
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  UNIQUE(parent_org_id, child_org_id, relationship_type, effective_date),
  CONSTRAINT no_self_reference CHECK (parent_org_id != child_org_id),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= effective_date)
);

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

-- Organizations table indexes
CREATE INDEX idx_organizations_parent ON organizations(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_organizations_type ON organizations(organization_type);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_hierarchy_path ON organizations USING GIN(hierarchy_path);
CREATE INDEX idx_organizations_hierarchy_level ON organizations(hierarchy_level);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_clc_affiliated ON organizations(clc_affiliated) WHERE clc_affiliated = true;
CREATE INDEX idx_organizations_jurisdiction ON organizations(jurisdiction) WHERE jurisdiction IS NOT NULL;
CREATE INDEX idx_organizations_sectors ON organizations USING GIN(sectors);
CREATE INDEX idx_organizations_legacy_tenant ON organizations(legacy_tenant_id) WHERE legacy_tenant_id IS NOT NULL;

-- Relationships table indexes
CREATE INDEX idx_org_relationships_parent ON organization_relationships(parent_org_id);
CREATE INDEX idx_org_relationships_child ON organization_relationships(child_org_id);
CREATE INDEX idx_org_relationships_type ON organization_relationships(relationship_type);
CREATE INDEX idx_org_relationships_active ON organization_relationships(effective_date, end_date) 
  WHERE end_date IS NULL;

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function: Update hierarchy_path when parent changes
CREATE OR REPLACE FUNCTION update_organization_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT[];
  parent_level INTEGER;
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Root organization (CLC)
    NEW.hierarchy_path := ARRAY[NEW.slug];
    NEW.hierarchy_level := 0;
  ELSE
    -- Get parent's path and level
    SELECT hierarchy_path, hierarchy_level 
    INTO parent_path, parent_level
    FROM organizations 
    WHERE id = NEW.parent_id;
    
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'Parent organization not found or has no hierarchy_path';
    END IF;
    
    -- Append current slug to parent's path
    NEW.hierarchy_path := parent_path || NEW.slug;
    NEW.hierarchy_level := parent_level + 1;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organization_hierarchy
  BEFORE INSERT OR UPDATE OF parent_id, slug
  ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_hierarchy();

-- Function: Get all ancestor organization IDs (for RLS)
CREATE OR REPLACE FUNCTION get_ancestor_org_ids(org_id UUID)
RETURNS SETOF UUID AS $$
  WITH RECURSIVE ancestors AS (
    -- Base case: the organization itself
    SELECT id, parent_id
    FROM organizations
    WHERE id = org_id
    
    UNION ALL
    
    -- Recursive case: parent organizations
    SELECT o.id, o.parent_id
    FROM organizations o
    INNER JOIN ancestors a ON o.id = a.parent_id
  )
  SELECT id FROM ancestors;
$$ LANGUAGE sql STABLE;

-- Function: Get all descendant organization IDs (for RLS)
CREATE OR REPLACE FUNCTION get_descendant_org_ids(org_id UUID)
RETURNS SETOF UUID AS $$
  WITH RECURSIVE descendants AS (
    -- Base case: the organization itself
    SELECT id, parent_id
    FROM organizations
    WHERE id = org_id
    
    UNION ALL
    
    -- Recursive case: child organizations
    SELECT o.id, o.parent_id
    FROM organizations o
    INNER JOIN descendants d ON o.parent_id = d.id
  )
  SELECT id FROM descendants;
$$ LANGUAGE sql STABLE;

-- Function: Get all organizations visible to a user (for RLS)
CREATE OR REPLACE FUNCTION get_user_visible_orgs(p_user_id TEXT)
RETURNS SETOF UUID AS $$
  WITH user_orgs AS (
    -- Get organizations user is directly member of (tenant_id is UUID column)
    SELECT DISTINCT om.tenant_id as org_id
    FROM organization_members om
    WHERE om.user_id = p_user_id
      AND om.status = 'active'
  )
  SELECT DISTINCT descendant_id
  FROM user_orgs uo
  CROSS JOIN LATERAL get_descendant_org_ids(uo.org_id) AS descendant_id;
$$ LANGUAGE sql STABLE;

-- Function: Check if user can access organization
CREATE OR REPLACE FUNCTION user_can_access_org(p_user_id TEXT, p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM get_user_visible_orgs(p_user_id) AS visible_org_id
    WHERE visible_org_id = p_org_id
  );
$$ LANGUAGE sql STABLE;

-- =====================================================
-- 6. CREATE VIEWS FOR BACKWARD COMPATIBILITY
-- =====================================================

-- View: Emulate old tenants table
CREATE OR REPLACE VIEW tenant_management_view AS
SELECT 
  id as tenant_id,
  slug as tenant_slug,
  name as tenant_name,
  display_name as tenant_display_name,
  status as tenant_status,
  settings as tenant_settings,
  created_at as tenant_created_at,
  updated_at as tenant_updated_at
FROM organizations;

-- View: Organization hierarchy tree (for admin UI)
CREATE OR REPLACE VIEW organization_tree AS
WITH RECURSIVE tree AS (
  -- Root organizations
  SELECT 
    id,
    parent_id,
    name,
    slug,
    organization_type,
    hierarchy_level,
    hierarchy_path,
    ARRAY[name] as display_path,
    name as full_path
  FROM organizations
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Child organizations
  SELECT 
    o.id,
    o.parent_id,
    o.name,
    o.slug,
    o.organization_type,
    o.hierarchy_level,
    o.hierarchy_path,
    t.display_path || o.name,
    t.full_path || ' → ' || o.name
  FROM organizations o
  INNER JOIN tree t ON o.parent_id = t.id
)
SELECT * FROM tree
ORDER BY hierarchy_path;

-- =====================================================
-- 7. SEED DATA: CLC Root Organization
-- =====================================================

-- Insert CLC as root organization
INSERT INTO organizations (
  id,
  name,
  slug,
  display_name,
  short_name,
  organization_type,
  parent_id,
  hierarchy_level,
  hierarchy_path,
  jurisdiction,
  email,
  website,
  clc_affiliated,
  affiliation_date,
  status,
  settings
) VALUES (
  '10000000-0000-0000-0000-000000000001'::UUID, -- Fixed UUID for CLC root
  'Canadian Labour Congress',
  'clc',
  'Canadian Labour Congress / Congrès du travail du Canada',
  'CLC',
  'congress',
  NULL, -- No parent (root)
  0,
  ARRAY['clc'],
  'federal',
  'info@clcctc.ca',
  'https://canadianlabour.ca',
  true,
  '1956-04-23', -- CLC founding date
  'active',
  '{
    "bilingual": true,
    "primary_language": "en",
    "secondary_language": "fr",
    "headquarters": "Ottawa, ON"
  }'::JSONB
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. MIGRATION: Convert existing tenants
-- =====================================================

-- Update organizations table to reference legacy tenants
-- (This will be populated by separate migration script)

COMMENT ON TABLE organizations IS 'Hierarchical multi-tenant organization structure supporting CLC congress → federation → union → local model';
COMMENT ON TABLE organization_relationships IS 'Explicit relationship tracking between organizations with temporal support';
COMMENT ON COLUMN organizations.hierarchy_path IS 'Materialized path array for fast ancestor/descendant queries';
COMMENT ON COLUMN organizations.clc_affiliated IS 'True if organization is a CLC affiliate union';
COMMENT ON FUNCTION get_user_visible_orgs IS 'Returns all organization IDs visible to user (own org + all descendants)';

-- =====================================================
-- Success!
-- =====================================================
-- Next steps:
-- 1. Run migration: psql < 030_hierarchical_organizations.sql
-- 2. Execute data migration script to convert existing tenants
-- 3. Update RLS policies on all tables (claims, members, etc.)
-- 4. Update application code to use organization_id instead of tenant_id
