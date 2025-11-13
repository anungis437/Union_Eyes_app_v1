-- =============================================================================
-- MIGRATION 006: Fix Helper Functions to Use JWT Claims Only
-- =============================================================================
-- 
-- This migration fixes the infinite recursion issue by updating helper functions
-- to ONLY use JWT claims, eliminating database lookups that trigger RLS policies.
--
-- Root Cause: Helper functions were querying the users table, which triggered
-- RLS policies on that table, which called the same helper functions again.
--
-- Solution: Read organization_id and role from JWT claims only.
-- =============================================================================

-- Drop old helper functions that cause recursion
DROP FUNCTION IF EXISTS auth.get_user_organization_id();
DROP FUNCTION IF EXISTS auth.has_role(TEXT);
DROP FUNCTION IF EXISTS auth.is_admin();
DROP FUNCTION IF EXISTS auth.is_lawyer();

-- =============================================================================
-- NEW JWT-BASED HELPER FUNCTIONS (NO DATABASE LOOKUPS)
-- =============================================================================

-- Get current user's organization ID from JWT claims
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    -- Only read from JWT, no database lookup
    RETURN (auth.jwt() ->> 'organization_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.get_user_organization_id() IS 
'Gets user organization ID from JWT claims only. No database lookup to avoid RLS recursion.';

-- Check if user has specific role (from JWT)
CREATE OR REPLACE FUNCTION auth.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only read from JWT, no database lookup
    RETURN (auth.jwt() ->> 'role') = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.has_role(TEXT) IS 
'Checks if user has specified role using JWT claims only. No database lookup to avoid RLS recursion.';

-- Check if user is admin (from JWT)
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Only read from JWT, no database lookup
    RETURN (auth.jwt() ->> 'role') IN ('admin', 'super_admin', 'org_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.is_admin() IS 
'Checks if user is an admin using JWT claims only. No database lookup to avoid RLS recursion.';

-- Check if user is lawyer (from JWT)
CREATE OR REPLACE FUNCTION auth.is_lawyer()
RETURNS BOOLEAN AS $$
BEGIN
    -- Only read from JWT, no database lookup
    RETURN (auth.jwt() ->> 'role') IN ('lawyer', 'admin', 'super_admin', 'org_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.is_lawyer() IS 
'Checks if user is a lawyer or admin using JWT claims only. No database lookup to avoid RLS recursion.';

-- Check if user has specific permission (from JWT)
CREATE OR REPLACE FUNCTION auth.has_permission(required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
BEGIN
    -- Get permissions array from JWT
    user_permissions := (auth.jwt() -> 'permissions');
    
    -- Check if permission exists in array
    RETURN user_permissions @> to_jsonb(ARRAY[required_permission]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.has_permission(TEXT) IS 
'Checks if user has specified permission using JWT claims only. No database lookup to avoid RLS recursion.';

-- =============================================================================
-- UPDATED can_access_matter FUNCTION
-- =============================================================================

-- Check if user can access matter (JWT-based)
CREATE OR REPLACE FUNCTION auth.can_access_matter(matter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    matter_org_id UUID;
    user_org_id UUID;
BEGIN
    -- Get user's org from JWT (no recursion)
    user_org_id := auth.get_user_organization_id();
    
    -- Admins can access all matters in their organization
    IF auth.is_admin() THEN
        -- Only query matters table, not users table
        SELECT organization_id INTO matter_org_id
        FROM matters
        WHERE id = matter_id;
        
        RETURN matter_org_id = user_org_id;
    END IF;
    
    -- Regular users can only access matters they're assigned to
    RETURN EXISTS (
        SELECT 1 FROM matters m
        WHERE m.id = matter_id
          AND m.organization_id = user_org_id
          AND (
            m.assigned_to = auth.uid()
            OR m.created_by = auth.uid()
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.can_access_matter(UUID) IS 
'Checks if user can access a matter using JWT claims for role/org checks. Queries only matters table, not users.';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 006 completed: Helper functions updated to use JWT claims only';
  RAISE NOTICE 'Functions: get_user_organization_id, has_role, is_admin, is_lawyer, has_permission, can_access_matter';
  RAISE NOTICE 'All functions now use JWT claims - NO database lookups to avoid RLS recursion';
  RAISE NOTICE 'Next: Run migration 007 to re-enable users table RLS with JWT-based policies';
END $$;
