-- Supabase storage/functions-only deployment
-- Migration disabled: audit logging schema now lives in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 017_security_audit_logging.sql (Supabase storage/functions-only).';
END $$;