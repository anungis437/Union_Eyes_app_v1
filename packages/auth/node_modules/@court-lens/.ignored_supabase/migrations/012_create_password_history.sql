-- ============================================================================
-- Password History Migration
-- 
-- Creates table to track password history for preventing reuse
-- Supports password expiration tracking
-- World-class security features
-- ============================================================================

-- Create password_history table
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  changed_by UUID REFERENCES auth.users(id), -- Support for admin password resets
  change_reason TEXT, -- 'user_requested', 'admin_reset', 'expired', 'compromised'
  ip_address INET,
  user_agent TEXT,
  
  -- Indexes
  CONSTRAINT password_history_user_id_created_at_key UNIQUE(user_id, created_at)
);

-- Create indexes
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created_at ON password_history(created_at DESC);

-- ============================================================================
-- Password Metadata Table
-- 
-- Stores password policy metadata and expiration info
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_metadata (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Password expiration
  password_set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  password_expires_at TIMESTAMPTZ,
  password_expired BOOLEAN DEFAULT FALSE,
  expiration_warning_sent BOOLEAN DEFAULT FALSE,
  
  -- Security
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  must_change_password BOOLEAN DEFAULT FALSE,
  
  -- Policy applied
  policy_version TEXT DEFAULT 'standard',
  policy_config JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_password_metadata_expires_at ON password_metadata(password_expires_at);
CREATE INDEX idx_password_metadata_expired ON password_metadata(password_expired) WHERE password_expired = TRUE;
CREATE INDEX idx_password_metadata_locked ON password_metadata(locked_until) WHERE locked_until > NOW();

-- ============================================================================
-- Password Breach Check Table (Optional)
-- 
-- For storing results from breach detection services (e.g., Have I Been Pwned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_breach_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash_prefix TEXT NOT NULL, -- First 5 chars of SHA-1 hash (k-anonymity)
  breach_count INT DEFAULT 0,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Cache for 24 hours
  CONSTRAINT password_breach_checks_hash_prefix_key UNIQUE(password_hash_prefix)
);

CREATE INDEX idx_password_breach_checks_checked_at ON password_breach_checks(checked_at);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to add password to history
CREATE OR REPLACE FUNCTION add_password_to_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if password actually changed
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    INSERT INTO password_history (
      user_id,
      password_hash,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.encrypted_password,
      NEW.id, -- Assume user changed their own password
      'user_requested'
    );
    
    -- Update password metadata
    INSERT INTO password_metadata (user_id, password_set_at)
    VALUES (NEW.id, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      password_set_at = NOW(),
      password_expired = FALSE,
      failed_attempts = 0,
      locked_until = NULL,
      must_change_password = FALSE,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to track password changes
DROP TRIGGER IF EXISTS track_password_changes ON auth.users;
CREATE TRIGGER track_password_changes
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION add_password_to_history();

-- ============================================================================
-- Password Expiration Functions
-- ============================================================================

-- Function to check for expired passwords
CREATE OR REPLACE FUNCTION check_password_expiration(
  p_user_id UUID,
  p_expiration_days INT DEFAULT 90
)
RETURNS TABLE (
  expired BOOLEAN,
  days_until_expiration INT,
  must_change BOOLEAN
) AS $$
DECLARE
  v_password_set_at TIMESTAMPTZ;
  v_must_change BOOLEAN;
  v_days_until_expiration INT;
BEGIN
  -- Get password metadata
  SELECT pm.password_set_at, pm.must_change_password
  INTO v_password_set_at, v_must_change
  FROM password_metadata pm
  WHERE pm.user_id = p_user_id;
  
  -- If no metadata, assume password is current
  IF v_password_set_at IS NULL THEN
    RETURN QUERY SELECT FALSE, p_expiration_days, FALSE;
    RETURN;
  END IF;
  
  -- Calculate days until expiration
  v_days_until_expiration := p_expiration_days - EXTRACT(DAY FROM NOW() - v_password_set_at)::INT;
  
  -- Return expiration status
  RETURN QUERY SELECT
    v_days_until_expiration <= 0 OR v_must_change,
    v_days_until_expiration,
    COALESCE(v_must_change, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark passwords as expired
CREATE OR REPLACE FUNCTION mark_expired_passwords(p_expiration_days INT DEFAULT 90)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  days_expired INT
) AS $$
BEGIN
  -- Update expired passwords
  UPDATE password_metadata pm
  SET
    password_expired = TRUE,
    updated_at = NOW()
  WHERE pm.password_expired = FALSE
    AND pm.password_set_at < NOW() - (p_expiration_days || ' days')::INTERVAL;
  
  -- Return list of users with expired passwords
  RETURN QUERY
  SELECT
    pm.user_id,
    u.email,
    EXTRACT(DAY FROM NOW() - pm.password_set_at)::INT - p_expiration_days AS days_expired
  FROM password_metadata pm
  JOIN auth.users u ON u.id = pm.user_id
  WHERE pm.password_expired = TRUE
  ORDER BY pm.password_set_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Account Lockout Functions
-- ============================================================================

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(
  p_user_id UUID,
  p_max_attempts INT DEFAULT 5,
  p_lockout_minutes INT DEFAULT 30
)
RETURNS TABLE (
  locked BOOLEAN,
  attempts_remaining INT,
  locked_until TIMESTAMPTZ
) AS $$
DECLARE
  v_failed_attempts INT;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Increment failed attempts
  INSERT INTO password_metadata (user_id, failed_attempts)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    failed_attempts = password_metadata.failed_attempts + 1,
    locked_until = CASE
      WHEN password_metadata.failed_attempts + 1 >= p_max_attempts
      THEN NOW() + (p_lockout_minutes || ' minutes')::INTERVAL
      ELSE password_metadata.locked_until
    END,
    updated_at = NOW()
  RETURNING password_metadata.failed_attempts, password_metadata.locked_until
  INTO v_failed_attempts, v_locked_until;
  
  -- Return lockout status
  RETURN QUERY SELECT
    v_failed_attempts >= p_max_attempts,
    GREATEST(0, p_max_attempts - v_failed_attempts),
    v_locked_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM password_metadata
  WHERE user_id = p_user_id;
  
  IF v_locked_until IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if lockout has expired
  IF v_locked_until <= NOW() THEN
    -- Clear lockout
    UPDATE password_metadata
    SET
      locked_until = NULL,
      failed_attempts = 0,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset failed attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE password_metadata
  SET
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_breach_checks ENABLE ROW LEVEL SECURITY;

-- Users can view their own password history (not the actual hashes, just metadata)
CREATE POLICY password_history_select_own
  ON password_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own password metadata
CREATE POLICY password_metadata_select_own
  ON password_metadata
  FOR SELECT
  USING (auth.uid() = user_id);

-- Super admins can view all password metadata (for admin purposes)
CREATE POLICY password_metadata_admin_access
  ON password_metadata
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

-- Breach check cache is read-only for all authenticated users
CREATE POLICY password_breach_checks_select_all
  ON password_breach_checks
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE password_history IS 'Tracks password change history for preventing reuse';
COMMENT ON TABLE password_metadata IS 'Stores password policy metadata and expiration information';
COMMENT ON TABLE password_breach_checks IS 'Caches password breach check results (k-anonymity)';

COMMENT ON FUNCTION add_password_to_history() IS 'Automatically tracks password changes in history table';
COMMENT ON FUNCTION check_password_expiration(UUID, INT) IS 'Checks if a user''s password has expired';
COMMENT ON FUNCTION mark_expired_passwords(INT) IS 'Marks all passwords older than N days as expired';
COMMENT ON FUNCTION record_failed_login(UUID, INT, INT) IS 'Records failed login attempt and locks account if threshold reached';
COMMENT ON FUNCTION is_account_locked(UUID) IS 'Checks if an account is currently locked due to failed attempts';
COMMENT ON FUNCTION reset_failed_attempts(UUID) IS 'Resets failed login attempts counter on successful login';
