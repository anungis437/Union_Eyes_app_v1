-- =============================================================================
-- TEMPORARY: Disable RLS on users table to break circular dependency
-- =============================================================================
-- 
-- The users table RLS policies call auth.get_user_organization_id() which
-- queries the users table, creating infinite recursion. We'll re-enable
-- with JWT-based policies later.

-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;

COMMENT ON TABLE users IS 'User accounts - RLS temporarily disabled to fix recursion issue';

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 005: Disabled RLS on users table';
  RAISE NOTICE 'This is temporary to fix circular dependency with user_profiles';
  RAISE NOTICE 'Will re-enable with JWT-based policies in next migration';
END $$;
