-- Supabase storage/functions-only deployment
-- Migration disabled: billing tables now live in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 001_create_billing_tables.sql (Supabase storage/functions-only).';
END $$;