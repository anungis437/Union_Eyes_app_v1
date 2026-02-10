-- Supabase storage/functions-only deployment
-- Migration disabled: password history now lives in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 012_create_password_history.sql (Supabase storage/functions-only).';
END $$;