-- Date: 2026-02-10
-- Migration: Rename tenant_users to organization_users and tenant_id to organization_id

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'user_management'
      AND table_name = 'tenant_users'
  ) THEN
    ALTER TABLE user_management.tenant_users RENAME TO organization_users;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'user_management'
      AND table_name = 'organization_users'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_management.organization_users RENAME COLUMN tenant_id TO organization_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'user_management'
      AND table_name = 'organization_users'
      AND column_name = 'tenant_user_id'
  ) THEN
    ALTER TABLE user_management.organization_users RENAME COLUMN tenant_user_id TO organization_user_id;
  END IF;
END $$;

-- Rename policies to remove tenant terminology
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'user_management'
      AND tablename = 'organization_users'
      AND policyname = 'tenant_users_select_org'
  ) THEN
    EXECUTE 'ALTER POLICY tenant_users_select_org ON user_management.organization_users RENAME TO organization_users_select_org';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'user_management'
      AND tablename = 'organization_users'
      AND policyname = 'tenant_users_insert_admin'
  ) THEN
    EXECUTE 'ALTER POLICY tenant_users_insert_admin ON user_management.organization_users RENAME TO organization_users_insert_admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'user_management'
      AND tablename = 'organization_users'
      AND policyname = 'tenant_users_update_admin'
  ) THEN
    EXECUTE 'ALTER POLICY tenant_users_update_admin ON user_management.organization_users RENAME TO organization_users_update_admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'user_management'
      AND tablename = 'organization_users'
      AND policyname = 'tenant_users_delete_admin'
  ) THEN
    EXECUTE 'ALTER POLICY tenant_users_delete_admin ON user_management.organization_users RENAME TO organization_users_delete_admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'user_management'
      AND tablename = 'organization_users'
      AND policyname = 'tenant_users_own_record'
  ) THEN
    EXECUTE 'ALTER POLICY tenant_users_own_record ON user_management.organization_users RENAME TO organization_users_own_record';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'user_management'
      AND tablename = 'organization_users'
      AND policyname = 'tenant_users_admin_access'
  ) THEN
    EXECUTE 'ALTER POLICY tenant_users_admin_access ON user_management.organization_users RENAME TO organization_users_admin_access';
  END IF;
END $$;

-- Optional: rename index if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_tenant_users_user_id'
      AND n.nspname = 'user_management'
  ) THEN
    EXECUTE 'ALTER INDEX user_management.idx_tenant_users_user_id RENAME TO idx_organization_users_user_id';
  END IF;
END $$;
