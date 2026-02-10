-- Supabase storage/functions-only deployment
-- Migration disabled: JWT helper functions now live in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 006_20251022000002_fix_helper_functions_jwt.sql (Supabase storage/functions-only).';
END $$;