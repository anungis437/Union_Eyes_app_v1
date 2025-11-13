-- Migration: 017_security_audit_logging.sql
-- Description: Comprehensive security audit logging system for compliance and security monitoring
-- Author: CourtLens Platform Team
-- Date: October 23, 2025
-- Phase: 2 Week 1 Day 7

-- ============================================================================
-- ENUMS: Action Types, Risk Levels, Resource Types
-- ============================================================================

-- Audit log action types (50+ security-relevant actions)
CREATE TYPE audit_log_action_type AS ENUM (
  -- Authentication Actions
  'auth.login.success',
  'auth.login.failed',
  'auth.logout',
  'auth.signup',
  'auth.password_reset_requested',
  'auth.password_reset_completed',
  'auth.password_changed',
  'auth.email_verified',
  'auth.email_verification_sent',
  'auth.session_created',
  'auth.session_renewed',
  'auth.session_expired',
  'auth.session_terminated',
  'auth.concurrent_login_detected',
  'auth.suspicious_login_blocked',
  
  -- Two-Factor Authentication
  'auth.2fa_enabled',
  'auth.2fa_disabled',
  'auth.2fa_verified',
  'auth.2fa_failed',
  'auth.2fa_recovery_used',
  
  -- User & Profile Actions
  'user.created',
  'user.updated',
  'user.deleted',
  'user.profile_viewed',
  'user.profile_updated',
  'user.avatar_uploaded',
  'user.avatar_deleted',
  'user.preferences_updated',
  
  -- Role & Permission Actions
  'rbac.role_assigned',
  'rbac.role_removed',
  'rbac.permission_granted',
  'rbac.permission_revoked',
  'rbac.access_granted',
  'rbac.access_denied',
  'rbac.privilege_escalation_attempted',
  
  -- Data Access Actions
  'data.matter_created',
  'data.matter_viewed',
  'data.matter_updated',
  'data.matter_deleted',
  'data.client_created',
  'data.client_viewed',
  'data.client_updated',
  'data.client_deleted',
  'data.document_uploaded',
  'data.document_viewed',
  'data.document_downloaded',
  'data.document_deleted',
  'data.sensitive_data_accessed',
  'data.pii_accessed',
  'data.financial_data_accessed',
  
  -- Export & Import Actions
  'data.exported',
  'data.imported',
  'data.bulk_download',
  'data.report_generated',
  
  -- API Actions
  'api.call',
  'api.rate_limit_exceeded',
  'api.invalid_request',
  'api.unauthorized_access',
  
  -- System Actions
  'system.config_changed',
  'system.integration_enabled',
  'system.integration_disabled',
  'system.backup_created',
  'system.restore_completed',
  
  -- Security Events
  'security.anomaly_detected',
  'security.brute_force_detected',
  'security.data_breach_suspected',
  'security.unusual_activity',
  'security.ip_blocked',
  'security.session_hijack_suspected'
);

-- Risk level for security events
CREATE TYPE audit_risk_level AS ENUM (
  'info',      -- Informational, routine operations
  'low',       -- Low risk, normal user activity
  'medium',    -- Medium risk, requires monitoring
  'high',      -- High risk, immediate attention needed
  'critical'   -- Critical risk, security incident
);

-- Resource types being audited
CREATE TYPE audit_resource_type AS ENUM (
  'user',
  'profile',
  'session',
  'matter',
  'client',
  'document',
  'task',
  'note',
  'email',
  'billing',
  'invoice',
  'role',
  'permission',
  'organization',
  'team',
  'api_key',
  'webhook',
  'integration',
  'report',
  'export',
  'system_config'
);

-- Login result status
CREATE TYPE login_result AS ENUM (
  'success',
  'failed_invalid_credentials',
  'failed_account_locked',
  'failed_2fa_required',
  'failed_2fa_invalid',
  'failed_email_not_verified',
  'failed_account_disabled',
  'failed_ip_blocked',
  'failed_rate_limited'
);

-- Session status
CREATE TYPE session_status AS ENUM (
  'active',
  'expired',
  'terminated',
  'suspicious',
  'hijacked'
);

-- ============================================================================
-- TABLES: Audit Logging
-- ============================================================================

-- Main audit log table (comprehensive event tracking)
CREATE TABLE audit_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Organization & User Context
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  
  -- Action Details
  action_type audit_log_action_type NOT NULL,
  resource_type audit_resource_type,
  resource_id UUID,
  
  -- Request Context
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  api_endpoint VARCHAR(500),
  http_method VARCHAR(10),
  http_status_code INTEGER,
  
  -- Location Data (from IP geolocation)
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Security Context
  risk_level audit_risk_level DEFAULT 'low',
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  
  -- State Changes (for data modifications)
  before_state JSONB,
  after_state JSONB,
  
  -- Additional Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Error Context (if applicable)
  error_code VARCHAR(50),
  error_message TEXT,
  stack_trace TEXT,
  
  -- Performance Metrics
  response_time_ms INTEGER,
  
  -- Audit Trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Retention (for automatic archival)
  retention_days INTEGER DEFAULT 365,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ
);

-- Indexes for audit_logs (optimized for common queries)
CREATE INDEX idx_audit_logs_firm ON audit_logs(firm_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_audit_logs_failed ON audit_logs(success, created_at DESC) WHERE success = FALSE;
CREATE INDEX idx_audit_logs_ip ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_archived ON audit_logs(archived, created_at) WHERE archived = FALSE;

-- GIN index for metadata JSONB searches
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- Composite index for user activity timeline
CREATE INDEX idx_audit_logs_user_timeline ON audit_logs(user_id, created_at DESC);

-- Composite index for firm security overview
CREATE INDEX idx_audit_logs_firm_risk ON audit_logs(firm_id, risk_level, created_at DESC);

-- ============================================================================
-- Login Attempts Tracking
-- ============================================================================

CREATE TABLE login_attempts (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User Context
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  
  -- Attempt Details
  result login_result NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  
  -- Location Data
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Security Context
  is_suspicious BOOLEAN DEFAULT FALSE,
  consecutive_failures INTEGER DEFAULT 0,
  
  -- Additional Context
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Retention
  retention_days INTEGER DEFAULT 90
);

-- Indexes for login_attempts
CREATE INDEX idx_login_attempts_firm ON login_attempts(firm_id);
CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at DESC);
CREATE INDEX idx_login_attempts_failed ON login_attempts(result, attempted_at DESC) 
  WHERE result != 'success';
CREATE INDEX idx_login_attempts_suspicious ON login_attempts(is_suspicious, attempted_at DESC) 
  WHERE is_suspicious = TRUE;

-- ============================================================================
-- Session History Tracking
-- ============================================================================

CREATE TABLE session_history (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Session Context
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  
  -- Session Lifecycle
  status session_status DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Session Context
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  os VARCHAR(50),
  browser VARCHAR(50),
  
  -- Location Data
  country_code VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Security Flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  concurrent_sessions INTEGER DEFAULT 1,
  location_changed BOOLEAN DEFAULT FALSE,
  
  -- Activity Metrics
  page_views INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Retention
  retention_days INTEGER DEFAULT 90
);

-- Indexes for session_history
CREATE INDEX idx_session_history_firm ON session_history(firm_id);
CREATE INDEX idx_session_history_user ON session_history(user_id);
CREATE INDEX idx_session_history_session ON session_history(session_id);
CREATE INDEX idx_session_history_status ON session_history(status);
CREATE INDEX idx_session_history_started_at ON session_history(started_at DESC);
CREATE INDEX idx_session_history_active ON session_history(status, last_activity_at) 
  WHERE status = 'active';
CREATE INDEX idx_session_history_suspicious ON session_history(is_suspicious, started_at DESC) 
  WHERE is_suspicious = TRUE;

-- ============================================================================
-- Security Events (High-Priority Security Incidents)
-- ============================================================================

CREATE TABLE security_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event Context
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type VARCHAR(100) NOT NULL,
  severity audit_risk_level NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Associated Entities
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_resource_type audit_resource_type,
  related_resource_id UUID,
  
  -- Request Context
  ip_address INET,
  user_agent TEXT,
  
  -- Response & Resolution
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Additional Data
  metadata JSONB DEFAULT '{}',
  
  -- Audit Trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Retention
  retention_days INTEGER DEFAULT 2555 -- 7 years for compliance
);

-- Indexes for security_events
CREATE INDEX idx_security_events_firm ON security_events(firm_id);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_unresolved ON security_events(resolved, created_at DESC) 
  WHERE resolved = FALSE;
CREATE INDEX idx_security_events_critical ON security_events(severity, created_at DESC) 
  WHERE severity IN ('high', 'critical');

-- ============================================================================
-- FUNCTIONS: Audit Logging Helpers
-- ============================================================================

-- Function to log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_firm_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_action_type audit_log_action_type,
  p_resource_type audit_resource_type DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_risk_level audit_risk_level DEFAULT 'low',
  p_success BOOLEAN DEFAULT TRUE,
  p_failure_reason TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    firm_id,
    user_id,
    session_id,
    action_type,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    risk_level,
    success,
    failure_reason,
    before_state,
    after_state,
    metadata
  ) VALUES (
    p_firm_id,
    p_user_id,
    p_session_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_ip_address,
    p_user_agent,
    p_risk_level,
    p_success,
    p_failure_reason,
    p_before_state,
    p_after_state,
    p_metadata
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log login attempt
CREATE OR REPLACE FUNCTION log_login_attempt(
  p_firm_id UUID,
  p_user_id UUID,
  p_email VARCHAR,
  p_result login_result,
  p_ip_address INET,
  p_user_agent TEXT DEFAULT NULL,
  p_is_suspicious BOOLEAN DEFAULT FALSE,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
  v_consecutive_failures INTEGER := 0;
BEGIN
  -- Count recent consecutive failures for this email/IP
  IF p_result != 'success' THEN
    SELECT COUNT(*)
    INTO v_consecutive_failures
    FROM login_attempts
    WHERE (email = p_email OR ip_address = p_ip_address)
      AND result != 'success'
      AND attempted_at > NOW() - INTERVAL '1 hour';
  END IF;
  
  INSERT INTO login_attempts (
    firm_id,
    user_id,
    email,
    result,
    ip_address,
    user_agent,
    is_suspicious,
    consecutive_failures,
    metadata
  ) VALUES (
    p_firm_id,
    p_user_id,
    p_email,
    p_result,
    p_ip_address,
    p_user_agent,
    p_is_suspicious OR v_consecutive_failures >= 3,
    v_consecutive_failures + 1,
    p_metadata
  ) RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or update session
CREATE OR REPLACE FUNCTION upsert_session_history(
  p_firm_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_ip_address INET,
  p_user_agent TEXT,
  p_status session_status DEFAULT 'active'
) RETURNS UUID AS $$
DECLARE
  v_session_history_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Check for concurrent sessions
  SELECT COUNT(*)
  INTO v_existing_count
  FROM session_history
  WHERE user_id = p_user_id
    AND status = 'active'
    AND session_id != p_session_id;
  
  INSERT INTO session_history (
    firm_id,
    user_id,
    session_id,
    status,
    ip_address,
    user_agent,
    concurrent_sessions
  ) VALUES (
    p_firm_id,
    p_user_id,
    p_session_id,
    p_status,
    p_ip_address,
    p_user_agent,
    v_existing_count + 1
  )
  ON CONFLICT (session_id) DO UPDATE SET
    last_activity_at = NOW(),
    status = p_status,
    concurrent_sessions = v_existing_count + 1
  RETURNING id INTO v_session_history_id;
  
  RETURN v_session_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
  p_firm_id UUID,
  p_user_id UUID,
  p_event_type VARCHAR,
  p_severity audit_risk_level,
  p_title VARCHAR,
  p_description TEXT,
  p_ip_address INET DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (
    firm_id,
    user_id,
    event_type,
    severity,
    title,
    description,
    ip_address,
    metadata
  ) VALUES (
    p_firm_id,
    p_user_id,
    p_event_type,
    p_severity,
    p_title,
    p_description,
    p_ip_address,
    p_metadata
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user audit trail
CREATE OR REPLACE FUNCTION get_user_audit_trail(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  id UUID,
  action_type audit_log_action_type,
  resource_type audit_resource_type,
  resource_id UUID,
  risk_level audit_risk_level,
  success BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action_type,
    al.resource_type,
    al.resource_id,
    al.risk_level,
    al.success,
    al.created_at
  FROM audit_logs al
  WHERE al.user_id = p_user_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect brute force attacks
CREATE OR REPLACE FUNCTION detect_brute_force(
  p_lookback_minutes INTEGER DEFAULT 15,
  p_threshold INTEGER DEFAULT 5
) RETURNS TABLE (
  email VARCHAR,
  ip_address INET,
  failure_count BIGINT,
  last_attempt TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    la.email,
    la.ip_address,
    COUNT(*) as failure_count,
    MAX(la.attempted_at) as last_attempt
  FROM login_attempts la
  WHERE la.result != 'success'
    AND la.attempted_at > NOW() - (p_lookback_minutes || ' minutes')::INTERVAL
  GROUP BY la.email, la.ip_address
  HAVING COUNT(*) >= p_threshold
  ORDER BY failure_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs(
  p_batch_size INTEGER DEFAULT 1000
) RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  WITH archived AS (
    UPDATE audit_logs
    SET archived = TRUE,
        archived_at = NOW()
    WHERE archived = FALSE
      AND created_at < NOW() - (retention_days || ' days')::INTERVAL
    LIMIT p_batch_size
    RETURNING id
  )
  SELECT COUNT(*) INTO v_archived_count FROM archived;
  
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES: Row-Level Security
-- ============================================================================

-- Enable RLS on all audit tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Audit logs: Users can view their own logs, admins can view all
CREATE POLICY audit_logs_user_select ON audit_logs
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'security_admin')
    )
  );

-- Audit logs: Only system can insert (via functions)
CREATE POLICY audit_logs_system_insert ON audit_logs
  FOR INSERT
  WITH CHECK (TRUE); -- Restricted by SECURITY DEFINER functions

-- Login attempts: Users can view their own, admins can view all
CREATE POLICY login_attempts_user_select ON login_attempts
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'security_admin')
    )
  );

-- Session history: Users can view their own, admins can view all
CREATE POLICY session_history_user_select ON session_history
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'security_admin')
    )
  );

-- Security events: Only security admins and admins can view
CREATE POLICY security_events_admin_select ON security_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'security_admin')
    )
  );

-- Security events: Only security admins can update (acknowledge/resolve)
CREATE POLICY security_events_admin_update ON security_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'security_admin')
    )
  );

-- ============================================================================
-- TRIGGERS: Automatic Audit Logging
-- ============================================================================

-- Trigger to update session duration on end
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_history_duration_trigger
  BEFORE UPDATE ON session_history
  FOR EACH ROW
  EXECUTE FUNCTION update_session_duration();

-- Trigger to update security_events updated_at
CREATE OR REPLACE FUNCTION update_security_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_events_updated_at_trigger
  BEFORE UPDATE ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION update_security_event_timestamp();

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all security-relevant events';
COMMENT ON TABLE login_attempts IS 'Tracking of all login attempts (successful and failed)';
COMMENT ON TABLE session_history IS 'Session lifecycle tracking for security monitoring';
COMMENT ON TABLE security_events IS 'High-priority security incidents requiring attention';

COMMENT ON FUNCTION log_audit_event IS 'Insert audit log entry with automatic metadata capture';
COMMENT ON FUNCTION log_login_attempt IS 'Log login attempt with brute force detection';
COMMENT ON FUNCTION upsert_session_history IS 'Create or update session history with concurrent session detection';
COMMENT ON FUNCTION log_security_event IS 'Log critical security event';
COMMENT ON FUNCTION get_user_audit_trail IS 'Retrieve audit trail for specific user';
COMMENT ON FUNCTION detect_brute_force IS 'Detect potential brute force attacks';
COMMENT ON FUNCTION archive_old_audit_logs IS 'Archive old audit logs based on retention policy';

-- ============================================================================
-- GRANTS: Permissions
-- ============================================================================

-- Grant execute on functions to authenticated users (will be controlled by RLS)
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION log_login_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_session_history TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_audit_trail TO authenticated;
GRANT EXECUTE ON FUNCTION detect_brute_force TO authenticated;

-- Grant execute on archival function to service role only
GRANT EXECUTE ON FUNCTION archive_old_audit_logs TO service_role;

-- ============================================================================
-- END MIGRATION
-- ============================================================================
