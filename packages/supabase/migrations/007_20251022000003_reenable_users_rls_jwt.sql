-- Supabase storage/functions-only deployment
-- Migration disabled: users RLS handled in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 007_20251022000003_reenable_users_rls_jwt.sql (Supabase storage/functions-only).';
END $$;