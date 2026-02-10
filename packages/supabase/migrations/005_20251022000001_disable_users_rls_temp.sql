-- Supabase storage/functions-only deployment
-- Migration disabled: users RLS handled in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 005_20251022000001_disable_users_rls_temp.sql (Supabase storage/functions-only).';
END $$;