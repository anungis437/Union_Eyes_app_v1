-- Date: 2026-02-10
-- Migration: Add RLS policies for organization_users table

-- =============================================================================
-- Organization Users - Admin Management Policies
-- =============================================================================

-- Drop existing policies if they exist (idempotent migration)
DROP POLICY IF EXISTS organization_users_select_org ON user_management.organization_users;
DROP POLICY IF EXISTS organization_users_insert_admin ON user_management.organization_users;
DROP POLICY IF EXISTS organization_users_update_admin ON user_management.organization_users;
DROP POLICY IF EXISTS organization_users_delete_admin ON user_management.organization_users;
DROP POLICY IF EXISTS organization_users_own_record ON user_management.organization_users;

-- Allow users to see their own organization memberships, or admins to see all members
CREATE POLICY organization_users_select_org ON user_management.organization_users
  FOR SELECT
  USING (
    -- User can see their own organization memberships
    user_id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'sub'),
      current_setting('app.current_user_id', true)
    )
    -- Or admin can see all members of their organizations
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub'),
        current_setting('app.current_user_id', true)
      )
      AND om.tenant_id = organization_users.organization_id
      AND om.role IN ('admin', 'officer')
      AND om.status = 'active'
    )
  );

-- Admin can insert new organization users
CREATE POLICY organization_users_insert_admin ON user_management.organization_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub'),
        current_setting('app.current_user_id', true)
      )
      AND om.tenant_id = organization_users.organization_id
      AND om.role IN ('admin', 'officer')
      AND om.status = 'active'
    )
  );

-- Admin can update organization users
CREATE POLICY organization_users_update_admin ON user_management.organization_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub'),
        current_setting('app.current_user_id', true)
      )
      AND om.tenant_id = organization_users.organization_id
      AND om.role IN ('admin', 'officer')
      AND om.status = 'active'
    )
  );

-- Admin can delete organization users
CREATE POLICY organization_users_delete_admin ON user_management.organization_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub'),
        current_setting('app.current_user_id', true)
      )
      AND om.tenant_id = organization_users.organization_id
      AND om.role IN ('admin', 'officer')
      AND om.status = 'active'
    )
  );

-- Allow users to view and manage their own record
CREATE POLICY organization_users_own_record ON user_management.organization_users
  FOR ALL
  USING (
    user_id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'sub'),
      current_setting('app.current_user_id', true)
    )
  );
