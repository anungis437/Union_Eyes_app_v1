-- Supabase storage/functions-only deployment
-- Migration disabled: session management now lives in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 013_create_session_management.sql (Supabase storage/functions-only).';
END $$;