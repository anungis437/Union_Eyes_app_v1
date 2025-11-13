-- =============================================================================
-- MIGRATION 007: Re-enable Users Table RLS with JWT-Based Policies
-- =============================================================================
-- 
-- This migration re-enables RLS on the users table with new JWT-based policies
-- that don't cause infinite recursion.
--
-- Previous Issue: Old policies called helper functions that queried the users
-- table, creating circular dependencies.
--
-- Solution: New policies use JWT claims directly via the updated helper functions
-- that don't query the database.
-- =============================================================================

-- First, drop the old problematic policies
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;

-- =============================================================================
-- NEW JWT-BASED RLS POLICIES FOR USERS TABLE
-- =============================================================================

-- Users can read their own profile and other users in their organization
CREATE POLICY "users_select_jwt_based" ON users
    FOR SELECT USING (
        -- User can always see themselves
        id = auth.uid()
        OR
        -- User can see others in their organization (using JWT claim)
        organization_id = auth.get_user_organization_id()
    );

COMMENT ON POLICY "users_select_jwt_based" ON users IS 
'Users can read their own profile and others in their org. Uses JWT claims to avoid recursion.';

-- Users can update their own profile, admins can update any user in their org
CREATE POLICY "users_update_jwt_based" ON users
    FOR UPDATE USING (
        -- User can update themselves
        id = auth.uid()
        OR
        -- Admins can update users in their org (using JWT claim)
        (
            auth.is_admin()
            AND organization_id = auth.get_user_organization_id()
        )
    )
    WITH CHECK (
        -- Same conditions for the new values
        id = auth.uid()
        OR
        (
            auth.is_admin()
            AND organization_id = auth.get_user_organization_id()
        )
    );

COMMENT ON POLICY "users_update_jwt_based" ON users IS 
'Users can update themselves, admins can update users in their org. Uses JWT claims to avoid recursion.';

-- Only admins can insert new users
CREATE POLICY "users_insert_jwt_based" ON users
    FOR INSERT WITH CHECK (
        -- Must be admin in the same organization
        auth.is_admin()
        AND organization_id = auth.get_user_organization_id()
    );

COMMENT ON POLICY "users_insert_jwt_based" ON users IS 
'Only admins can create users in their organization. Uses JWT claims to avoid recursion.';

-- Only admins can delete users (soft delete via is_active recommended)
CREATE POLICY "users_delete_jwt_based" ON users
    FOR DELETE USING (
        -- Must be admin in the same organization
        auth.is_admin()
        AND organization_id = auth.get_user_organization_id()
    );

COMMENT ON POLICY "users_delete_jwt_based" ON users IS 
'Only admins can delete users in their organization. Uses JWT claims to avoid recursion.';

-- =============================================================================
-- RE-ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Re-enable RLS on users table with the new JWT-based policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 007 completed: Users table RLS re-enabled with JWT-based policies';
  RAISE NOTICE 'Policies: 4 total (SELECT, UPDATE, INSERT, DELETE)';
  RAISE NOTICE 'All policies use JWT claims via helper functions - NO database lookups';
  RAISE NOTICE 'RLS recursion issue is now RESOLVED ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Users must have JWT claims populated for RLS to work:';
  RAISE NOTICE '  - role: user role (admin, lawyer, etc)';
  RAISE NOTICE '  - organization_id: user organization UUID';
  RAISE NOTICE '  - permissions: array of permission strings';
  RAISE NOTICE '';
  RAISE NOTICE 'Call update_user_jwt_claims(user_id) after creating/updating user_profiles';
END $$;
