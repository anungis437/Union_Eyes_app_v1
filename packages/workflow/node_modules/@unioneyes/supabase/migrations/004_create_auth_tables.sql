-- Migration 004: Create Authentication Tables
-- Created: 2025-10-22
-- Purpose: Phase 2 Week 1 - Unified Authentication System
-- Tables: user_profiles, auth_audit_logs

-- =============================================================================
-- USER PROFILES TABLE
-- Stores extended user information including organization and role assignments
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  -- Primary Key
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Organization Details
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  organization_name TEXT,
  
  -- Role & Permissions
  role TEXT NOT NULL CHECK (role IN (
    'super_admin',
    'org_admin',
    'lawyer',
    'paralegal',
    'support_staff',
    'client'
  )),
  permissions TEXT[] DEFAULT '{}',
  
  -- User Metadata
  display_name TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_updated_at();

-- =============================================================================
-- AUTH AUDIT LOGS TABLE
-- Comprehensive security audit trail for all authentication events
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User Information
  user_id TEXT NOT NULL, -- Using TEXT for flexibility (can store email or UUID)
  user_email TEXT,
  
  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sign_in',
    'sign_out',
    'sign_up',
    'password_reset_request',
    'password_reset_complete',
    'password_change',
    'session_refresh',
    'sign_in_failed',
    'session_expired',
    'permission_denied',
    'role_changed',
    'profile_updated'
  )),
  
  -- Application Context
  app_name TEXT NOT NULL,
  
  -- Event Timestamp
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Request Metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Additional Details (JSON)
  details JSONB DEFAULT '{}',
  
  -- Status
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for auth_audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON auth_audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON auth_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON auth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_app_name ON auth_audit_logs(app_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON auth_audit_logs(success);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON auth_audit_logs(user_id, timestamp DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile (using JWT claims, no DB lookup)
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (using JWT claims, no DB lookup)
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow profile creation with service role or during signup
CREATE POLICY "Allow profile creation"
  ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Note: Complex admin access is handled at the application layer
-- using the service_role key to bypass RLS when needed

-- Enable RLS on auth_audit_logs
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit logs (using JWT claims)
CREATE POLICY "Users can read own audit logs"
  ON auth_audit_logs
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- Allow audit log creation (service role will handle this)
CREATE POLICY "Service can insert audit logs"
  ON auth_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's role (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE user_id = user_uuid;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_uuid
      AND permission = ANY(permissions)
  ) INTO has_perm;
  RETURN COALESCE(has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id FROM user_profiles WHERE user_id = user_uuid;
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user's JWT claims with role and org data
-- Call this after creating/updating user_profile
CREATE OR REPLACE FUNCTION update_user_jwt_claims(user_uuid UUID)
RETURNS void AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile data
  SELECT role, organization_id, permissions
  INTO user_profile
  FROM user_profiles
  WHERE user_id = user_uuid;
  
  -- Update auth.users app_metadata with profile info
  -- This will be included in the JWT on next token refresh
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
    'role', user_profile.role,
    'organization_id', user_profile.organization_id::text,
    'permissions', user_profile.permissions
  )
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- INITIAL DATA SEEDING
-- =============================================================================

-- This section should only run if tables are empty
-- Insert default super admin profile (replace with actual user ID after first signup)
-- INSERT INTO user_profiles (user_id, organization_name, role, permissions, display_name)
-- VALUES (
--   'REPLACE_WITH_ACTUAL_USER_ID',
--   'CourtLens Admin',
--   'super_admin',
--   ARRAY[
--     'matters:read', 'matters:write', 'matters:delete', 'matters:assign', 'matters:approve',
--     'clients:read', 'clients:write', 'clients:delete', 'clients:assign',
--     'documents:read', 'documents:write', 'documents:delete', 'documents:assign',
--     'billing:read', 'billing:write', 'billing:delete', 'billing:approve',
--     'time:read', 'time:write', 'time:approve',
--     'reports:read', 'reports:write',
--     'admin:access', 'admin:users', 'admin:billing', 'admin:settings', 'admin:analytics',
--     'settings:read', 'settings:write'
--   ],
--   'System Administrator'
-- )
-- ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE user_profiles IS 'Extended user profiles with organization and role information for RBAC';
COMMENT ON TABLE auth_audit_logs IS 'Security audit trail for all authentication and authorization events';

COMMENT ON COLUMN user_profiles.role IS 'User role: super_admin, org_admin, lawyer, paralegal, support_staff, client';
COMMENT ON COLUMN user_profiles.permissions IS 'Array of specific permissions granted to this user';
COMMENT ON COLUMN auth_audit_logs.event_type IS 'Type of authentication event (sign_in, sign_out, etc.)';
COMMENT ON COLUMN auth_audit_logs.details IS 'Additional event context stored as JSON';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 004 completed: Authentication tables created successfully';
  RAISE NOTICE 'Tables: user_profiles, auth_audit_logs';
  RAISE NOTICE 'Indexes: 11 total (6 on audit_logs, 3 on user_profiles)';
  RAISE NOTICE 'RLS Policies: 5 total (3 on user_profiles, 2 on audit_logs)';
  RAISE NOTICE 'Helper Functions: 3 (get_user_role, user_has_permission, get_user_organization)';
  RAISE NOTICE 'Note: RLS uses JWT claims only - no database lookups to avoid recursion';
  RAISE NOTICE 'Note: Admin operations use service_role key to bypass RLS';
END $$;
