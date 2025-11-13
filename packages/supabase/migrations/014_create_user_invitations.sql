-- ============================================================================
-- User Invitations Migration
-- 
-- Creates tables and functions for user invitation system
-- Supports secure token-based invitations with email magic links
-- Pre-assigned roles and permissions before user signup
-- ============================================================================

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invitation details
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'lawyer', 'paralegal', 'support_staff', 'client')),
  permissions TEXT[] DEFAULT '{}',
  
  -- Token and security
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  invitation_message TEXT,
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT user_invitations_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT user_invitations_expires_check CHECK (expires_at > created_at)
);

-- Create indexes
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX idx_user_invitations_organization ON user_invitations(organization_id);
CREATE INDEX idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX idx_user_invitations_pending ON user_invitations(status, expires_at) 
  WHERE status = 'pending';

-- ============================================================================
-- Invitation Activity Log
-- 
-- Tracks all invitation-related events for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitation_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES user_invitations(id) ON DELETE CASCADE,
  
  -- Activity details
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL, -- 'created', 'sent', 'viewed', 'accepted', 'cancelled', 'expired', 'resent'
  actor_id UUID REFERENCES auth.users(id), -- Who performed the action
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_invitation_activity_invitation_id ON invitation_activity(invitation_id);
CREATE INDEX idx_invitation_activity_timestamp ON invitation_activity(timestamp DESC);
CREATE INDEX idx_invitation_activity_action ON invitation_activity(action);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to check if email already has pending invitation
CREATE OR REPLACE FUNCTION check_pending_invitation(
  p_email TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_invitations
    WHERE email = LOWER(p_email)
      AND organization_id = p_organization_id
      AND status = 'pending'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is already registered
CREATE OR REPLACE FUNCTION check_existing_user(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles
    WHERE email = LOWER(p_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log invitation activity
CREATE OR REPLACE FUNCTION log_invitation_activity(
  p_invitation_id UUID,
  p_action TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO invitation_activity (
    invitation_id,
    action,
    actor_id,
    metadata
  ) VALUES (
    p_invitation_id,
    p_action,
    p_actor_id,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invitation statistics
CREATE OR REPLACE FUNCTION get_invitation_stats(p_organization_id UUID)
RETURNS TABLE(
  total_invitations BIGINT,
  pending_invitations BIGINT,
  accepted_invitations BIGINT,
  expired_invitations BIGINT,
  cancelled_invitations BIGINT,
  acceptance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_invitations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_invitations,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_invitations,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_invitations,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('accepted', 'expired', 'cancelled')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'accepted')::NUMERIC / 
        COUNT(*) FILTER (WHERE status IN ('accepted', 'expired', 'cancelled'))::NUMERIC * 100,
        2
      )
      ELSE 0
    END as acceptance_rate
  FROM user_invitations
  WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old invitations (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_invitations()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM user_invitations
  WHERE status IN ('accepted', 'expired', 'cancelled')
    AND created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update trigger for logging creation
CREATE OR REPLACE FUNCTION log_invitation_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_invitation_activity(
    NEW.id,
    'created',
    NEW.invited_by,
    jsonb_build_object(
      'email', NEW.email,
      'role', NEW.role,
      'organization_id', NEW.organization_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invitation_created
  AFTER INSERT ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION log_invitation_created();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_invitation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    PERFORM log_invitation_activity(
      NEW.id,
      NEW.status,
      CASE
        WHEN NEW.status = 'cancelled' THEN NEW.cancelled_by
        WHEN NEW.status = 'accepted' THEN (
          SELECT user_id FROM user_profiles WHERE email = NEW.email LIMIT 1
        )
        ELSE NULL
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invitation_status_change
  AFTER UPDATE ON user_invitations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_invitation_status_change();

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_activity ENABLE ROW LEVEL SECURITY;

-- Users can view invitations sent to their email
CREATE POLICY invitation_view_own_email
  ON user_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM user_profiles WHERE user_id = auth.uid())
  );

-- Org admins can view invitations for their organization
CREATE POLICY invitation_view_org_admin
  ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.organization_id = user_invitations.organization_id
        AND user_profiles.role IN ('org_admin', 'super_admin')
    )
  );

-- Org admins can create invitations for their organization
CREATE POLICY invitation_create_org_admin
  ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.organization_id = user_invitations.organization_id
        AND user_profiles.role IN ('org_admin', 'super_admin')
    )
  );

-- Org admins can update invitations for their organization
CREATE POLICY invitation_update_org_admin
  ON user_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.organization_id = user_invitations.organization_id
        AND user_profiles.role IN ('org_admin', 'super_admin')
    )
  );

-- Super admins can do everything
CREATE POLICY invitation_superadmin_all
  ON user_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

-- Activity log: Users can view activity for their invitations
CREATE POLICY invitation_activity_view_own
  ON invitation_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_invitations
      WHERE user_invitations.id = invitation_activity.invitation_id
        AND (
          user_invitations.email = (SELECT email FROM user_profiles WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.user_id = auth.uid()
              AND user_profiles.organization_id = user_invitations.organization_id
              AND user_profiles.role IN ('org_admin', 'super_admin')
          )
        )
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_invitations IS 'User invitation system with token-based magic links';
COMMENT ON TABLE invitation_activity IS 'Audit log for all invitation-related actions';

COMMENT ON FUNCTION check_pending_invitation IS 'Check if email already has pending invitation for organization';
COMMENT ON FUNCTION check_existing_user IS 'Check if email is already registered';
COMMENT ON FUNCTION mark_expired_invitations IS 'Mark all expired invitations (run via cron)';
COMMENT ON FUNCTION log_invitation_activity IS 'Log invitation activity for audit trail';
COMMENT ON FUNCTION get_invitation_stats IS 'Get invitation statistics for organization';
COMMENT ON FUNCTION cleanup_old_invitations IS 'Remove old accepted/expired/cancelled invitations (90 day retention)';

-- ============================================================================
-- Initial Data / Examples
-- ============================================================================

-- Example: Mark expired invitations (should be run via cron job)
-- SELECT mark_expired_invitations();

-- Example: Get stats for an organization
-- SELECT * FROM get_invitation_stats('organization-uuid-here');

-- Example: Cleanup old invitations
-- SELECT cleanup_old_invitations();
