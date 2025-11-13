-- =============================================================================
-- AUDIT TRIGGERS
-- 
-- PostgreSQL triggers for automatic audit logging on critical operations.
-- Captures changes to users, sessions, permissions, and sensitive data.
-- 
-- @module AuditTriggers
-- @author CourtLens Platform Team
-- @date October 23, 2025
-- @phase Phase 2 Week 1 Day 7
-- =============================================================================

-- =============================================================================
-- TRIGGER FUNCTIONS
-- =============================================================================

/**
 * Audit authentication events
 * 
 * Automatically logs successful logins, logouts, and password changes.
 */
CREATE OR REPLACE FUNCTION audit_auth_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Log login attempts
  IF (TG_OP = 'INSERT' AND NEW.event_type = 'login_attempt') THEN
    INSERT INTO login_attempts (
      user_id,
      firm_id,
      email,
      result,
      failure_reason,
      ip_address,
      user_agent,
      city,
      region,
      country,
      latitude,
      longitude,
      attempted_at
    ) VALUES (
      NEW.user_id,
      NEW.firm_id,
      NEW.email,
      COALESCE((NEW.metadata->>'result')::text, 'unknown'),
      (NEW.metadata->>'failure_reason')::text,
      NEW.ip_address,
      NEW.user_agent,
      NEW.city,
      NEW.region,
      NEW.country,
      (NEW.metadata->>'latitude')::numeric,
      (NEW.metadata->>'longitude')::numeric,
      NEW.created_at
    );
  END IF;

  -- Log password changes
  IF (TG_OP = 'UPDATE' AND OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password) THEN
    INSERT INTO audit_logs (
      user_id,
      firm_id,
      action_type,
      action_category,
      resource_type,
      resource_id,
      result,
      risk_level,
      ip_address,
      user_agent,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      NEW.firm_id,
      'auth.password_changed',
      'auth',
      'user',
      NEW.id,
      'success',
      'medium',
      current_setting('app.ip_address', true),
      current_setting('app.user_agent', true),
      jsonb_build_object(
        'password_changed_at', NOW(),
        'force_change', NEW.password_change_required
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Audit data access and modifications
 * 
 * Logs when sensitive data is accessed, modified, or deleted.
 */
CREATE OR REPLACE FUNCTION audit_data_operations()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_firm_id uuid;
  v_action_type text;
  v_before_state jsonb;
  v_after_state jsonb;
BEGIN
  -- Get current user context
  v_user_id := current_setting('app.user_id', true)::uuid;
  v_firm_id := current_setting('app.firm_id', true)::uuid;

  -- Determine action type
  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'data.created';
    v_after_state := to_jsonb(NEW);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action_type := 'data.modified';
    v_before_state := to_jsonb(OLD);
    v_after_state := to_jsonb(NEW);
  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'data.deleted';
    v_before_state := to_jsonb(OLD);
  END IF;

  -- Log the operation
  INSERT INTO audit_logs (
    user_id,
    firm_id,
    action_type,
    action_category,
    resource_type,
    resource_id,
    result,
    risk_level,
    before_state,
    after_state,
    ip_address,
    user_agent,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    v_firm_id,
    v_action_type,
    'data',
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    'success',
    CASE 
      WHEN TG_OP = 'DELETE' THEN 'high'
      WHEN TG_OP = 'UPDATE' THEN 'medium'
      ELSE 'low'
    END,
    v_before_state,
    v_after_state,
    current_setting('app.ip_address', true),
    current_setting('app.user_agent', true),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA
    ),
    NOW()
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Audit permission changes
 * 
 * Logs role assignments, permission grants, and access control modifications.
 */
CREATE OR REPLACE FUNCTION audit_permission_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_firm_id uuid;
  v_action_type text;
BEGIN
  -- Get current user context
  v_user_id := current_setting('app.user_id', true)::uuid;
  v_firm_id := current_setting('app.firm_id', true)::uuid;

  -- Determine action type
  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'rbac.role_assigned';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action_type := 'rbac.role_modified';
  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'rbac.role_revoked';
  END IF;

  -- Log the permission change
  INSERT INTO audit_logs (
    user_id,
    firm_id,
    action_type,
    action_category,
    resource_type,
    resource_id,
    result,
    risk_level,
    before_state,
    after_state,
    ip_address,
    user_agent,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    v_firm_id,
    v_action_type,
    'rbac',
    'role_assignment',
    COALESCE(NEW.id, OLD.id),
    'success',
    'high', -- Permission changes are always high risk
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    current_setting('app.ip_address', true),
    current_setting('app.user_agent', true),
    jsonb_build_object(
      'operation', TG_OP,
      'affected_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'role_id', COALESCE(NEW.role_id, OLD.role_id)
    ),
    NOW()
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Audit session activity
 * 
 * Logs session creation, updates, and termination.
 */
CREATE OR REPLACE FUNCTION audit_session_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type text;
BEGIN
  -- Determine action type
  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'auth.session_created';
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'terminated' AND OLD.status != 'terminated') THEN
    v_action_type := 'auth.session_terminated';
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action_type := 'auth.session_updated';
  END IF;

  -- Log to session_history
  INSERT INTO session_history (
    session_id,
    user_id,
    firm_id,
    status,
    ip_address,
    user_agent,
    device_type,
    browser,
    os,
    city,
    region,
    country,
    latitude,
    longitude,
    created_at,
    last_activity_at,
    terminated_at,
    is_suspicious,
    suspicious_reasons,
    metadata
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.firm_id,
    NEW.status,
    NEW.ip_address,
    NEW.user_agent,
    (NEW.metadata->>'device_type')::text,
    (NEW.metadata->>'browser')::text,
    (NEW.metadata->>'os')::text,
    (NEW.metadata->>'city')::text,
    (NEW.metadata->>'region')::text,
    (NEW.metadata->>'country')::text,
    (NEW.metadata->>'latitude')::numeric,
    (NEW.metadata->>'longitude')::numeric,
    NEW.created_at,
    NEW.updated_at,
    CASE WHEN NEW.status = 'terminated' THEN NEW.updated_at ELSE NULL END,
    COALESCE((NEW.metadata->>'is_suspicious')::boolean, false),
    CASE WHEN (NEW.metadata->>'is_suspicious')::boolean THEN 
      ARRAY[(NEW.metadata->>'suspicious_reason')::text]
    ELSE NULL END,
    NEW.metadata
  )
  ON CONFLICT (session_id) DO UPDATE
  SET
    status = EXCLUDED.status,
    last_activity_at = EXCLUDED.last_activity_at,
    terminated_at = EXCLUDED.terminated_at,
    is_suspicious = EXCLUDED.is_suspicious,
    suspicious_reasons = EXCLUDED.suspicious_reasons,
    metadata = EXCLUDED.metadata;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_auth_events_trigger ON auth.users;
DROP TRIGGER IF EXISTS audit_data_operations_trigger ON matters;
DROP TRIGGER IF EXISTS audit_permission_changes_trigger ON role_assignments;
DROP TRIGGER IF EXISTS audit_session_activity_trigger ON sessions;

-- Auth events trigger
CREATE TRIGGER audit_auth_events_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION audit_auth_events();

-- Data operations trigger (example: matters table)
CREATE TRIGGER audit_data_operations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON matters
  FOR EACH ROW
  EXECUTE FUNCTION audit_data_operations();

-- Permission changes trigger
CREATE TRIGGER audit_permission_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION audit_permission_changes();

-- Session activity trigger
CREATE TRIGGER audit_session_activity_trigger
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION audit_session_activity();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

/**
 * Set audit context
 * 
 * Call this function at the start of each request to set user/firm context.
 * 
 * @example
 * SELECT set_audit_context('user-uuid', 'firm-uuid', '192.168.1.1', 'Mozilla/5.0...');
 */
CREATE OR REPLACE FUNCTION set_audit_context(
  p_user_id uuid,
  p_firm_id uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, true);
  PERFORM set_config('app.firm_id', COALESCE(p_firm_id::text, ''), true);
  PERFORM set_config('app.ip_address', COALESCE(p_ip_address, ''), true);
  PERFORM set_config('app.user_agent', COALESCE(p_user_agent, ''), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION audit_auth_events() IS 'Audit trigger for authentication events (login, password change)';
COMMENT ON FUNCTION audit_data_operations() IS 'Audit trigger for data access and modifications';
COMMENT ON FUNCTION audit_permission_changes() IS 'Audit trigger for role and permission changes';
COMMENT ON FUNCTION audit_session_activity() IS 'Audit trigger for session lifecycle events';
COMMENT ON FUNCTION set_audit_context(uuid, uuid, text, text) IS 'Set audit context for current transaction';
