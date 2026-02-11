/**
 * Migration Verification Script
 * 
 * Run this script to verify that migrations 0062-0065 have been applied to the database.
 * This script checks for:
 * - Table existence
 * - Column existence
 * - Trigger existence
 * - Function existence
 * 
 * Usage:
 *   psql -d your_database -f scripts/verify-migrations.sql
 * 
 * Expected output: All checks should return TRUE or show expected data
 */

-- =============================================================================
-- MIGRATION 0062: Immutable Transition History
-- =============================================================================

\echo '=== Verifying Migration 0062: Immutable Transition History ==='

-- Check if grievance_transitions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'grievances' 
  AND table_name = 'grievance_transitions'
) AS "0062_grievance_transitions_exists";

-- Check if grievance_approvals table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'grievances' 
  AND table_name = 'grievance_approvals'
) AS "0062_grievance_approvals_exists";

-- Check critical columns in grievance_transitions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'grievances'
  AND table_name = 'grievance_transitions'
  AND column_name IN ('id', 'grievance_id', 'from_status', 'to_status', 'transitioned_at', 'transitioned_by')
ORDER BY ordinal_position;

-- =============================================================================
-- MIGRATION 0063: Audit Log Archive Support
-- =============================================================================

\echo ''
\echo '=== Verifying Migration 0063: Audit Log Archive Support ==='

-- Check if audit_logs table has archive columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'audit_security'
  AND table_name = 'audit_logs'
  AND column_name IN ('archived', 'archived_at', 'archived_path')
ORDER BY ordinal_position;

-- Count archived vs active audit logs
SELECT 
  COUNT(*) FILTER (WHERE archived = true) AS archived_logs,
  COUNT(*) FILTER (WHERE archived = false OR archived IS NULL) AS active_logs,
  COUNT(*) AS total_logs
FROM audit_security.audit_logs;

-- =============================================================================
-- MIGRATION 0064: Immutability Triggers
-- =============================================================================

\echo ''
\echo '=== Verifying Migration 0064: Immutability Triggers ==='

-- Check if reject_mutation() function exists
SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'reject_mutation'
) AS "0064_reject_mutation_function_exists";

-- Check if audit_log_immutability_guard() function exists
SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'audit_log_immutability_guard'
) AS "0064_audit_log_guard_function_exists";

-- List all immutability triggers
SELECT 
  n.nspname AS schema_name,
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name,
  CASE t.tgtype::int & 2
    WHEN 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END AS trigger_timing,
  CASE t.tgtype::int & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    ELSE 'MULTIPLE'
  END AS trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname IN ('reject_mutation', 'audit_log_immutability_guard')
ORDER BY n.nspname, c.relname, t.tgname;

-- Verify specific immutability triggers exist
SELECT 
  COUNT(*) AS immutability_trigger_count,
  string_agg(DISTINCT c.relname::text, ', ' ORDER BY c.relname::text) AS protected_tables
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname IN ('reject_mutation', 'audit_log_immutability_guard');

-- =============================================================================
-- MIGRATION 0065: Governance Tables
-- =============================================================================

\echo ''
\echo '=== Verifying Migration 0065: Governance Tables ==='

-- Check if governance tables exist
SELECT 
  table_name,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'governance' 
    AND tables.table_name = t.table_name
  ) AS exists
FROM (VALUES 
  ('golden_shares'),
  ('reserved_matter_votes'),
  ('council_elections'),
  ('mission_audits')
) AS t(table_name);

-- Check golden_shares table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'governance'
  AND table_name = 'golden_shares'
ORDER BY ordinal_position;

-- Count governance records
SELECT 
  'golden_shares' AS table_name,
  COUNT(*) AS record_count
FROM governance.golden_shares
UNION ALL
SELECT 
  'reserved_matter_votes',
  COUNT(*)
FROM governance.reserved_matter_votes
UNION ALL
SELECT 
  'council_elections',
  COUNT(*)
FROM governance.council_elections
UNION ALL
SELECT 
  'mission_audits',
  COUNT(*)
FROM governance.mission_audits;

-- =============================================================================
-- OVERALL MIGRATION STATUS SUMMARY
-- =============================================================================

\echo ''
\echo '=== Migration Status Summary ==='

-- Create a summary view of all migration-related objects
SELECT 
  '0062' AS migration,
  'grievance_transitions table' AS object_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'grievances' AND table_name = 'grievance_transitions'
    ) THEN '✅ VERIFIED'
    ELSE '❌ MISSING'
  END AS status
UNION ALL
SELECT 
  '0062',
  'grievance_approvals table',
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'grievances' AND table_name = 'grievance_approvals'
    ) THEN '✅ VERIFIED'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  '0063',
  'audit_logs.archived column',
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'audit_security' 
      AND table_name = 'audit_logs' 
      AND column_name = 'archived'
    ) THEN '✅ VERIFIED'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  '0064',
  'reject_mutation() function',
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'reject_mutation'
    ) THEN '✅ VERIFIED'
    ELSE '❌ MISSING'
  END
UNION ALL
SELECT 
  '0064',
  'immutability triggers',
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE p.proname IN ('reject_mutation', 'audit_log_immutability_guard')
    ) >= 5 THEN '✅ VERIFIED (5+ triggers)'
    ELSE '⚠️ PARTIAL/MISSING'
  END
UNION ALL
SELECT 
  '0065',
  'governance.golden_shares table',
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'governance' AND table_name = 'golden_shares'
    ) THEN '✅ VERIFIED'
    ELSE '❌ MISSING'
  END
ORDER BY migration, object_name;

\echo ''
\echo '=== Verification Complete ==='
\echo 'Review the output above. All items should show ✅ VERIFIED or show expected data.'
\echo 'If any items show ❌ MISSING, the corresponding migration may not have been applied.'
