-- Supabase storage/functions-only deployment
-- Migration disabled: user invitations now live in Azure Postgres.

DO $$
BEGIN
  RAISE NOTICE 'Skipping 014_create_user_invitations.sql (Supabase storage/functions-only).';
END $$;