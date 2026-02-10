-- Supabase storage/functions-only deployment
-- Migration disabled: multi-tenant schema now lives in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 015_create_multi_tenant_schema.sql (Supabase storage/functions-only).';
END $$;