-- Supabase storage/functions-only deployment
-- Migration disabled: audit triggers now live in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 017_audit_triggers.sql (Supabase storage/functions-only).';
END $$;