-- Supabase storage/functions-only deployment
-- Migration disabled: seed data now lives in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 003_seed_data.sql (Supabase storage/functions-only).';
END $$;