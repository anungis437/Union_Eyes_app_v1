-- Supabase storage/functions-only deployment
-- Migration disabled: auth/user tables now live in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 004_create_auth_tables.sql (Supabase storage/functions-only).';
END $$;