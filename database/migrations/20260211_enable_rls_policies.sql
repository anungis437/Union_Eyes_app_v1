-- Migration: Enable RLS Policies for Security Compliance
-- Date: 2026-02-11
-- Purpose: Enable Row Level Security on critical tables identified in test failures

-- =============================================================================
-- ENABLE RLS ON MESSAGES TABLE
-- =============================================================================

-- Enable RLS on messages table (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'messages' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on messages table';
  ELSE
    RAISE NOTICE 'RLS already enabled on messages table';
  END IF;
END $$;

-- Create RLS policies for messages (if not exists)
DO $$
BEGIN
  -- Policy: Users can view messages in their organization
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messages' 
    AND policyname = 'messages_select_org'
  ) THEN
    CREATE POLICY messages_select_org ON messages
      FOR SELECT
      USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
      );
    RAISE NOTICE 'Created messages_select_org policy';
  END IF;

  -- Policy: Users can insert messages in their organization
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messages' 
    AND policyname = 'messages_insert_org'
  ) THEN
    CREATE POLICY messages_insert_org ON messages
      FOR INSERT
      WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::uuid
      );
    RAISE NOTICE 'Created messages_insert_org policy';
  END IF;

  -- Policy: Users can update their own messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messages' 
    AND policyname = 'messages_update_own'
  ) THEN
    CREATE POLICY messages_update_own ON messages
      FOR UPDATE
      USING (
        sender_id = current_setting('app.current_user_id', true)
        AND organization_id = current_setting('app.current_organization_id', true)::uuid
      );
    RAISE NOTICE 'Created messages_update_own policy';
  END IF;

  -- Policy: Users can delete their own messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'messages' 
    AND policyname = 'messages_delete_own'
  ) THEN
    CREATE POLICY messages_delete_own ON messages
      FOR DELETE
      USING (
        sender_id = current_setting('app.current_user_id', true)
        AND organization_id = current_setting('app.current_organization_id', true)::uuid
      );
    RAISE NOTICE 'Created messages_delete_own policy';
  END IF;
END $$;

-- =============================================================================
-- ENABLE RLS ON MEMBERS TABLE
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'members' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE members ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on members table';
  ELSE
    RAISE NOTICE 'RLS already enabled on members table';
  END IF;
END $$;

-- Create RLS policies for members
DO $$
BEGIN
  -- Policy: Users can view members in their organization
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'members' 
    AND policyname = 'members_select_org'
  ) THEN
    CREATE POLICY members_select_org ON members
      FOR SELECT
      USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
      );
    RAISE NOTICE 'Created members_select_org policy';
  END IF;

  -- Policy: Users can view their own member record
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'members' 
    AND policyname = 'members_select_self'
  ) THEN
    CREATE POLICY members_select_self ON members
      FOR SELECT
      USING (
        user_id = current_setting('app.current_user_id', true)
      );
    RAISE NOTICE 'Created members_select_self policy';
  END IF;

  -- Policy: Admins can insert members
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'members' 
    AND policyname = 'members_insert_admin'
  ) THEN
    CREATE POLICY members_insert_admin ON members
      FOR INSERT
      WITH CHECK (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND current_setting('app.current_user_role', true)::int >= 130  -- Officer or above
      );
    RAISE NOTICE 'Created members_insert_admin policy';
  END IF;

  -- Policy: Admins can update members in their org
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'members' 
    AND policyname = 'members_update_admin'
  ) THEN
    CREATE POLICY members_update_admin ON members
      FOR UPDATE
      USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND current_setting('app.current_user_role', true)::int >= 130
      );
    RAISE NOTICE 'Created members_update_admin policy';
  END IF;
END $$;

-- =============================================================================
-- ENABLE RLS ON ENCRYPTION_KEYS TABLE (PII_ENCRYPTION_KEYS)
-- =============================================================================

DO $$
BEGIN
  -- Check if table exists first
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pii_encryption_keys'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'pii_encryption_keys' 
      AND rowsecurity = true
    ) THEN
      ALTER TABLE pii_encryption_keys ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE 'RLS enabled on pii_encryption_keys table';
    ELSE
      RAISE NOTICE 'RLS already enabled on pii_encryption_keys table';
    END IF;

    -- Only system admins can access encryption keys
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'pii_encryption_keys' 
      AND policyname = 'encryption_keys_admin_only'
    ) THEN
      CREATE POLICY encryption_keys_admin_only ON pii_encryption_keys
        FOR ALL
        USING (
          current_setting('app.current_user_role', true)::int >= 200  -- System Admin
        );
      RAISE NOTICE 'Created encryption_keys_admin_only policy';
    END IF;
  ELSE
    RAISE NOTICE 'pii_encryption_keys table does not exist, skipping';
  END IF;
END $$;

-- =============================================================================
-- ENABLE RLS ON PII_ACCESS_LOG TABLE
-- =============================================================================

DO $$
BEGIN
  -- Check if table exists first
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pii_access_log'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'pii_access_log' 
      AND rowsecurity = true
    ) THEN
      ALTER TABLE pii_access_log ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE 'RLS enabled on pii_access_log table';
    ELSE
      RAISE NOTICE 'RLS already enabled on pii_access_log table';
    END IF;

    -- Only admins can view PII access logs
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'pii_access_log' 
      AND policyname = 'pii_access_log_admin_only'
    ) THEN
      CREATE POLICY pii_access_log_admin_only ON pii_access_log
        FOR SELECT
        USING (
          current_setting('app.current_user_role', true)::int >= 140  -- Union President or above
        );
      RAISE NOTICE 'Created pii_access_log_admin_only policy';
    END IF;

    -- System can always insert audit logs
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'pii_access_log' 
      AND policyname = 'pii_access_log_insert_always'
    ) THEN
      CREATE POLICY pii_access_log_insert_always ON pii_access_log
        FOR INSERT
        WITH CHECK (true);  -- Always allow inserts for audit trail
      RAISE NOTICE 'Created pii_access_log_insert_always policy';
    END IF;
  ELSE
    RAISE NOTICE 'pii_access_log table does not exist, skipping';
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify RLS is enabled on critical tables
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('messages', 'members', 'pii_encryption_keys', 'pii_access_log')
    AND rowsecurity = true;
  
  RAISE NOTICE 'RLS enabled on % critical tables', rls_count;
END $$;

-- Count total RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Total RLS policies in database: %', policy_count;
END $$;
