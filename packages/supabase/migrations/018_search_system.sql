-- Supabase storage/functions-only deployment
-- Migration disabled: search system now lives in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 018_search_system.sql (Supabase storage/functions-only).';
END $$;