-- ============================================================================
-- Session Management Migration
-- 
-- Creates tables for tracking user sessions with device and location info
-- Supports session termination, concurrent session limits, and activity tracking
-- World-class session management features
-- ============================================================================

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Token info (hashed for security)
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  
  -- Session timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Device information
  device_id TEXT, -- Unique device identifier
  device_name TEXT, -- e.g., "iPhone 12", "MacBook Pro"
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  browser TEXT, -- e.g., "Chrome", "Firefox", "Safari"
  browser_version TEXT,
  os TEXT, -- e.g., "Windows", "macOS", "iOS", "Android"
  os_version TEXT,
  user_agent TEXT,
  
  -- Location information
  ip_address INET,
  country TEXT,
  country_code TEXT, -- ISO 3166-1 alpha-2
  city TEXT,
  region TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  timezone TEXT,
  
  -- Session status
  is_active BOOLEAN DEFAULT TRUE,
  terminated_at TIMESTAMPTZ,
  terminated_by UUID REFERENCES auth.users(id),
  termination_reason TEXT, -- 'user_signout', 'admin_force_signout', 'expired', 'concurrent_limit'
  
  -- Security flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  requires_reauth BOOLEAN DEFAULT FALSE,
  
  -- Indexes
  CONSTRAINT user_sessions_access_token_hash_key UNIQUE(access_token_hash)
);

-- Create indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity_at DESC);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_device_id ON user_sessions(device_id);
CREATE INDEX idx_user_sessions_ip_address ON user_sessions(ip_address);

-- ============================================================================
-- Session Activity Table
-- 
-- Tracks detailed session activity for security and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Activity details
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL, -- 'page_view', 'api_call', 'permission_check', 'data_access'
  resource TEXT, -- URL or resource identifier
  method TEXT, -- HTTP method or action type
  
  -- Request info
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  -- Response info
  status_code INT,
  duration_ms INT,
  
  -- Context
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_session_activity_session_id ON session_activity(session_id);
CREATE INDEX idx_session_activity_user_id ON session_activity(user_id);
CREATE INDEX idx_session_activity_timestamp ON session_activity(timestamp DESC);
CREATE INDEX idx_session_activity_action ON session_activity(action);

-- ============================================================================
-- Session Limits Table
-- 
-- Per-user session configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Limits
  max_concurrent_sessions INT DEFAULT 5,
  max_session_duration INT DEFAULT 86400, -- 24 hours in seconds
  idle_timeout INT DEFAULT 1800, -- 30 minutes in seconds
  
  -- Security
  require_reauth_for_sensitive BOOLEAN DEFAULT TRUE,
  allow_remember_me BOOLEAN DEFAULT TRUE,
  force_single_device BOOLEAN DEFAULT FALSE,
  
  -- IP restrictions
  allowed_ip_ranges INET[],
  blocked_ip_ranges INET[],
  
  -- Device restrictions
  allowed_device_types TEXT[],
  max_devices INT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to create session record
CREATE OR REPLACE FUNCTION create_session_record(
  p_user_id UUID,
  p_access_token_hash TEXT,
  p_refresh_token_hash TEXT,
  p_expires_at TIMESTAMPTZ,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_device_info JSONB;
  v_max_sessions INT;
  v_active_count INT;
BEGIN
  -- Get session limits
  SELECT max_concurrent_sessions INTO v_max_sessions
  FROM session_limits
  WHERE user_id = p_user_id;
  
  -- Use default if not set
  v_max_sessions := COALESCE(v_max_sessions, 5);
  
  -- Check concurrent session limit
  SELECT COUNT(*) INTO v_active_count
  FROM user_sessions
  WHERE user_id = p_user_id
    AND is_active = TRUE;
  
  -- If limit exceeded, terminate oldest session
  IF v_active_count >= v_max_sessions THEN
    UPDATE user_sessions
    SET
      is_active = FALSE,
      terminated_at = NOW(),
      termination_reason = 'concurrent_limit'
    WHERE id = (
      SELECT id
      FROM user_sessions
      WHERE user_id = p_user_id
        AND is_active = TRUE
      ORDER BY last_activity_at ASC
      LIMIT 1
    );
  END IF;
  
  -- Parse device info from user agent (simplified)
  v_device_info := parse_user_agent(p_user_agent);
  
  -- Insert session record
  INSERT INTO user_sessions (
    user_id,
    access_token_hash,
    refresh_token_hash,
    expires_at,
    user_agent,
    ip_address,
    device_type,
    browser,
    os
  ) VALUES (
    p_user_id,
    p_access_token_hash,
    p_refresh_token_hash,
    p_expires_at,
    p_user_agent,
    p_ip_address,
    (v_device_info->>'deviceType')::TEXT,
    v_device_info->>'browser',
    v_device_info->>'os'
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to parse user agent (simplified)
CREATE OR REPLACE FUNCTION parse_user_agent(p_user_agent TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
BEGIN
  IF p_user_agent IS NULL THEN
    RETURN v_result;
  END IF;
  
  -- Browser detection
  IF p_user_agent ILIKE '%Chrome%' THEN
    v_result := v_result || '{"browser": "Chrome"}';
  ELSIF p_user_agent ILIKE '%Firefox%' THEN
    v_result := v_result || '{"browser": "Firefox"}';
  ELSIF p_user_agent ILIKE '%Safari%' THEN
    v_result := v_result || '{"browser": "Safari"}';
  ELSIF p_user_agent ILIKE '%Edge%' THEN
    v_result := v_result || '{"browser": "Edge"}';
  ELSE
    v_result := v_result || '{"browser": "Unknown"}';
  END IF;
  
  -- OS detection
  IF p_user_agent ILIKE '%Windows%' THEN
    v_result := v_result || '{"os": "Windows"}';
  ELSIF p_user_agent ILIKE '%Mac%' THEN
    v_result := v_result || '{"os": "macOS"}';
  ELSIF p_user_agent ILIKE '%Linux%' THEN
    v_result := v_result || '{"os": "Linux"}';
  ELSIF p_user_agent ILIKE '%Android%' THEN
    v_result := v_result || '{"os": "Android"}';
  ELSIF p_user_agent ILIKE '%iOS%' THEN
    v_result := v_result || '{"os": "iOS"}';
  ELSE
    v_result := v_result || '{"os": "Unknown"}';
  END IF;
  
  -- Device type
  IF p_user_agent ILIKE '%Mobile%' THEN
    v_result := v_result || '{"deviceType": "mobile"}';
  ELSIF p_user_agent ILIKE '%Tablet%' THEN
    v_result := v_result || '{"deviceType": "tablet"}';
  ELSE
    v_result := v_result || '{"deviceType": "desktop"}';
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions
  SET
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to terminate session
CREATE OR REPLACE FUNCTION terminate_session(
  p_session_id UUID,
  p_terminated_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'user_signout'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE user_sessions
  SET
    is_active = FALSE,
    terminated_at = NOW(),
    terminated_by = p_terminated_by,
    termination_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_session_id
    AND is_active = TRUE;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE user_sessions
  SET
    is_active = FALSE,
    terminated_at = NOW(),
    termination_reason = 'expired',
    updated_at = NOW()
  WHERE is_active = TRUE
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old activity records (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_session_activity()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM session_activity
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_limits_updated_at
  BEFORE UPDATE ON session_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY user_sessions_select_own
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can terminate their own sessions
CREATE POLICY user_sessions_update_own
  ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Super admins can view and manage all sessions
CREATE POLICY user_sessions_admin_access
  ON user_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

-- Users can view their own activity
CREATE POLICY session_activity_select_own
  ON session_activity
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can view all activity
CREATE POLICY session_activity_admin_access
  ON session_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

-- Users can view and update their own session limits
CREATE POLICY session_limits_own_access
  ON session_limits
  FOR ALL
  USING (auth.uid() = user_id);

-- Super admins can manage all session limits
CREATE POLICY session_limits_admin_access
  ON session_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE user_sessions IS 'Tracks active user sessions with device and location information';
COMMENT ON TABLE session_activity IS 'Detailed activity log for each session';
COMMENT ON TABLE session_limits IS 'Per-user session configuration and limits';

COMMENT ON FUNCTION create_session_record IS 'Creates a new session record with device detection';
COMMENT ON FUNCTION update_session_activity IS 'Updates the last activity timestamp for a session';
COMMENT ON FUNCTION terminate_session IS 'Terminates a specific session';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Marks expired sessions as inactive';
COMMENT ON FUNCTION cleanup_old_session_activity IS 'Removes session activity older than 90 days';
