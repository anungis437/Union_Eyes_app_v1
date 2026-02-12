-- Migration: Setup Encryption Infrastructure for PII Protection
-- Date: 2026-02-11
-- Purpose: Create encryption tables and initialize encryption keys for GDPR/privacy compliance

-- =============================================================================
-- CREATE PII ENCRYPTION KEYS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS pii_encryption_keys (
  key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value TEXT NOT NULL,  -- Base64-encoded encryption key
  algorithm VARCHAR(50) DEFAULT 'AES-256-GCM' NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255),
  notes TEXT,
  
  -- Constraints
  CONSTRAINT pii_encryption_keys_key_value_check CHECK (length(key_value) >= 32),
  CONSTRAINT pii_encryption_keys_only_one_active CHECK (
    is_active = false OR (
      SELECT COUNT(*) FROM pii_encryption_keys WHERE is_active = true
    ) <= 1
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pii_encryption_keys_active 
  ON pii_encryption_keys(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pii_encryption_keys_created_at 
  ON pii_encryption_keys(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE pii_encryption_keys IS 'Stores encryption keys for PII field encryption. Only one key can be active at a time. Keys support rotation without data loss.';
COMMENT ON COLUMN pii_encryption_keys.key_value IS 'Base64-encoded AES-256 encryption key. Should be 32+ bytes when decoded.';
COMMENT ON COLUMN pii_encryption_keys.is_active IS 'Only one key can be active at a time. Active key is used for all new encryptions.';

-- =============================================================================
-- CREATE PII ACCESS LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS pii_access_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  organization_id UUID,
  member_id UUID,
  field_name VARCHAR(100) NOT NULL,  -- Which PII field was accessed (e.g., 'sin', 'ssn', 'bank_account')
  access_type VARCHAR(20) NOT NULL,  -- 'read', 'write', 'decrypt', 'encrypt'
  access_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT pii_access_log_access_type_check CHECK (
    access_type IN ('read', 'write', 'decrypt', 'encrypt', 'delete')
  )
);

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_pii_access_log_user_id 
  ON pii_access_log(user_id);

CREATE INDEX IF NOT EXISTS idx_pii_access_log_organization_id 
  ON pii_access_log(organization_id);

CREATE INDEX IF NOT EXISTS idx_pii_access_log_member_id 
  ON pii_access_log(member_id);

CREATE INDEX IF NOT EXISTS idx_pii_access_log_accessed_at 
  ON pii_access_log(accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pii_access_log_field_name 
  ON pii_access_log(field_name);

-- Add comments
COMMENT ON TABLE pii_access_log IS 'Audit trail for all PII field access. Required for GDPR Article 30 compliance.';
COMMENT ON COLUMN pii_access_log.field_name IS 'Name of the PII field accessed (e.g., sin, ssn, bank_account_number)';
COMMENT ON COLUMN pii_access_log.access_type IS 'Type of access: read (view), write (create/update), decrypt (explicit decryption), encrypt (explicit encryption)';

-- =============================================================================
-- CREATE ENCRYPTION HELPER FUNCTIONS
-- =============================================================================

-- Function to get the active encryption key
CREATE OR REPLACE FUNCTION get_active_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_key TEXT;
BEGIN
  SELECT key_value INTO active_key
  FROM pii_encryption_keys
  WHERE is_active = true
  LIMIT 1;
  
  IF active_key IS NULL THEN
    RAISE EXCEPTION 'No active encryption key found. Please initialize encryption keys.';
  END IF;
  
  RETURN active_key;
END;
$$;

COMMENT ON FUNCTION get_active_encryption_key() IS 'Returns the currently active encryption key for PII encryption operations.';

-- Function to log PII access
CREATE OR REPLACE FUNCTION log_pii_access(
  p_user_id VARCHAR(255),
  p_organization_id UUID,
  p_member_id UUID,
  p_field_name VARCHAR(100),
  p_access_type VARCHAR(20),
  p_access_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO pii_access_log (
    user_id,
    organization_id,
    member_id,
    field_name,
    access_type,
    access_reason,
    accessed_at
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_member_id,
    p_field_name,
    p_access_type,
    p_access_reason,
    NOW()
  )
  RETURNING log_id INTO log_id;
  
  RETURN log_id;
END;
$$;

COMMENT ON FUNCTION log_pii_access IS 'Logs PII field access to audit trail. Required for GDPR compliance.';

-- =============================================================================
-- INITIALIZE FIRST ENCRYPTION KEY
-- =============================================================================

-- Generate and insert the initial encryption key
DO $$
DECLARE
  key_exists BOOLEAN;
  new_key_id UUID;
BEGIN
  -- Check if any keys exist
  SELECT EXISTS(SELECT 1 FROM pii_encryption_keys) INTO key_exists;
  
  IF NOT key_exists THEN
    -- Generate new random key (32 bytes = 256 bits for AES-256)
    INSERT INTO pii_encryption_keys (
      key_id,
      key_value,
      algorithm,
      is_active,
      created_at,
      created_by,
      notes
    ) VALUES (
      gen_random_uuid(),
      encode(gen_random_bytes(32), 'base64'),
      'AES-256-GCM',
      true,
      NOW(),
      'system_initialization',
      'Initial encryption key generated during migration 20260211'
    )
    RETURNING key_id INTO new_key_id;
    
    RAISE NOTICE 'Created initial encryption key: %', new_key_id;
    RAISE NOTICE '⚠️  IMPORTANT: Backup this encryption key immediately!';
    RAISE NOTICE '   Loss of encryption keys will result in permanent data loss!';
  ELSE
    RAISE NOTICE 'Encryption keys already exist, skipping initialization';
  END IF;
END $$;

-- =============================================================================
-- CREATE VIEW FOR SAFE KEY MANAGEMENT
-- =============================================================================

-- View that shows key metadata without exposing the actual key value
CREATE OR REPLACE VIEW encryption_keys_safe_view AS
SELECT 
  key_id,
  algorithm,
  is_active,
  created_at,
  deactivated_at,
  created_by,
  CASE 
    WHEN is_active THEN 'ACTIVE'
    WHEN deactivated_at IS NOT NULL THEN 'DEACTIVATED'
    ELSE 'INACTIVE'
  END as status,
  length(key_value) as key_length_bytes,
  notes
FROM pii_encryption_keys
ORDER BY created_at DESC;

COMMENT ON VIEW encryption_keys_safe_view IS 'Safe view of encryption keys showing metadata only, not actual key values.';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Only superusers and admin role can access encryption keys directly
-- RLS policies will be applied in separate migration

-- Grant usage of helper functions to application role
-- GRANT EXECUTE ON FUNCTION get_active_encryption_key() TO app_role;
-- GRANT EXECUTE ON FUNCTION log_pii_access TO app_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  key_count INTEGER;
  active_key_count INTEGER;
  log_table_exists BOOLEAN;
BEGIN
  -- Count total keys
  SELECT COUNT(*) INTO key_count
  FROM pii_encryption_keys;
  
  -- Count active keys
  SELECT COUNT(*) INTO active_key_count
  FROM pii_encryption_keys
  WHERE is_active = true;
  
  -- Check log table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pii_access_log'
  ) INTO log_table_exists;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Encryption Infrastructure Setup Complete';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total encryption keys: %', key_count;
  RAISE NOTICE 'Active encryption keys: %', active_key_count;
  RAISE NOTICE 'PII access log table: %', CASE WHEN log_table_exists THEN 'Created' ELSE 'Missing' END;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  CRITICAL SECURITY REMINDERS:';
  RAISE NOTICE '  1. Backup encryption keys immediately to secure location';
  RAISE NOTICE '  2. Store keys separately from database backups';
  RAISE NOTICE '  3. Implement key rotation policy (recommended: 90 days)';
  RAISE NOTICE '  4. Restrict access to pii_encryption_keys table';
  RAISE NOTICE '  5. Monitor pii_access_log for suspicious activity';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Show the safe view of keys
SELECT * FROM encryption_keys_safe_view;
