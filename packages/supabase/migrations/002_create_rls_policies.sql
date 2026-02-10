-- Supabase storage/functions-only deployment
-- Migration disabled: RLS policies now live in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 002_create_rls_policies.sql (Supabase storage/functions-only).';
END $$;