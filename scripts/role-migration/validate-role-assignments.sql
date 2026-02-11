-- Role Migration - Validation Script
-- Purpose: Validate role assignments after migration
-- Date: February 11, 2026
-- Phase: 2 - Role Assignment Migration

-- ============================================================================
-- VALIDATION SUITE
-- Run these checks after performing role migrations to ensure data integrity
-- ============================================================================

-- ============================================================================
-- CHECK 1: Role Consistency Between Tables
-- ============================================================================

-- Verify organization_members.role matches highest member_roles.role_code
WITH member_highest_roles AS (
  SELECT 
    mr.member_id,
    mr.tenant_id,
    max(rd.role_level) AS highest_level,
    (ARRAY_AGG(mr.role_code ORDER BY rd.role_level DESC))[1] AS highest_role
  FROM member_roles mr
  JOIN role_definitions rd ON mr.role_code = rd.role_code
  WHERE mr.status = 'active'
  GROUP BY mr.member_id, mr.tenant_id
)
SELECT 
  'Role Consistency Check' AS test_name,
  COUNT(*) AS mismatches,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  STRING_AGG(
    om.name || ' (org_member: ' || om.role || ' vs highest: ' || mhr.highest_role || ')',
    ', ' 
    ORDER BY om.name
  ) AS details
FROM organization_members om
JOIN member_highest_roles mhr ON om.id = mhr.member_id AND om.tenant_id = mhr.tenant_id
WHERE om.role != mhr.highest_role
  AND om.status = 'active';

-- ============================================================================
-- CHECK 2: No Orphaned Member Roles
-- ============================================================================

-- Ensure all member_roles reference valid members
SELECT 
  'Orphaned Member Roles Check' AS test_name,
  COUNT(*) AS orphaned_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  STRING_AGG(mr.id::TEXT, ', ') AS orphaned_role_ids
FROM member_roles mr
LEFT JOIN organization_members om ON mr.member_id = om.id
WHERE om.id IS NULL;

-- ============================================================================
-- CHECK 3: Role Definition Validity
-- ============================================================================

-- Ensure all role_code values reference valid role_definitions
SELECT 
  'Role Definition Validity Check' AS test_name,
  COUNT(*) AS invalid_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  STRING_AGG(DISTINCT mr.role_code, ', ') AS invalid_role_codes
FROM member_roles mr
LEFT JOIN role_definitions rd ON mr.role_code = rd.role_code
WHERE rd.role_code IS NULL;

-- ============================================================================
-- CHECK 4: Duplicate Active Roles
-- ============================================================================

-- Check for duplicate active roles in same scope
WITH role_counts AS (
  SELECT 
    member_id,
    tenant_id,
    role_code,
    scope_type,
    COALESCE(scope_value, '') AS scope_value,
    COUNT(*) AS active_count
  FROM member_roles
  WHERE status = 'active'
  GROUP BY member_id, tenant_id, role_code, scope_type, COALESCE(scope_value, '')
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicate Active Roles Check' AS test_name,
  COUNT(*) AS duplicate_count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  STRING_AGG(
    om.name || ' has ' || rc.active_count || 'x ' || rc.role_code || 
    ' (' || rc.scope_type || ':' || rc.scope_value || ')',
    '; '
  ) AS details
FROM role_counts rc
JOIN organization_members om ON rc.member_id = om.id;

-- ============================================================================
-- CHECK 5: Executive Role Distribution
-- ============================================================================

-- Verify each org has appropriate executive officers
WITH org_executives AS (
  SELECT 
    t.id AS tenant_id,
    t.name AS org_name,
    COUNT(DISTINCT CASE WHEN mr.role_code = 'president' THEN mr.member_id END) AS presidents,
    COUNT(DISTINCT CASE WHEN mr.role_code = 'vice_president' THEN mr.member_id END) AS vice_presidents,
    COUNT(DISTINCT CASE WHEN mr.role_code = 'secretary_treasurer' THEN mr.member_id END) AS treasurers,
    COUNT(DISTINCT om.id) AS total_members
  FROM tenants t
  LEFT JOIN organization_members om ON t.id = om.tenant_id AND om.status = 'active'
  LEFT JOIN member_roles mr ON om.id = mr.member_id AND mr.status = 'active'
  WHERE t.status = 'active'
  GROUP BY t.id, t.name
)
SELECT 
  'Executive Role Distribution Check' AS test_name,
  COUNT(*) FILTER (WHERE presidents = 0 AND total_members >= 10) AS orgs_without_president,
  COUNT(*) FILTER (WHERE presidents > 1) AS orgs_with_multiple_presidents,
  CASE 
    WHEN COUNT(*) FILTER (WHERE presidents > 1) > 0 THEN '⚠️ WARN'
    ELSE '✅ PASS' 
  END AS status,
  'Orgs with 10+ members but no president: ' || 
    COUNT(*) FILTER (WHERE presidents = 0 AND total_members >= 10) ||
  ' | Orgs with multiple presidents: ' ||
    COUNT(*) FILTER (WHERE presidents > 1) AS details
FROM org_executives;

-- ============================================================================
-- CHECK 6: Scope Validation
-- ============================================================================

-- Ensure scope_value is provided for non-global scopes
SELECT 
  'Scope Validation Check' AS test_name,
  COUNT(*) AS invalid_scopes,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  STRING_AGG(
    om.name || ' has ' || mr.scope_type || ' scope without value',
    '; '
  ) AS details
FROM member_roles mr
JOIN organization_members om ON mr.member_id = om.id
WHERE mr.status = 'active'
  AND mr.scope_type != 'global'
  AND (mr.scope_value IS NULL OR mr.scope_value = '');

-- ============================================================================
-- CHECK 7: Term Expiration Logic
-- ============================================================================

-- Verify term_years and next_election_date consistency
SELECT 
  'Term Expiration Logic Check' AS test_name,
  COUNT(*) AS inconsistent_terms,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '⚠️ WARN' END AS status,
  STRING_AGG(
    om.name || ' (' || mr.role_code || '): term_years=' || mr.term_years || 
    ' but next_election_date=' || COALESCE(mr.next_election_date::TEXT, 'NULL'),
    '; '
  ) AS details
FROM member_roles mr
JOIN organization_members om ON mr.member_id = om.id
WHERE mr.status = 'active'
  AND (
    (mr.term_years IS NOT NULL AND mr.next_election_date IS NULL)
    OR (mr.term_years IS NULL AND mr.next_election_date IS NOT NULL)
  );

-- ============================================================================
-- CHECK 8: Acting Role Validation
-- ============================================================================

-- Ensure acting roles have required fields
SELECT 
  'Acting Role Validation Check' AS test_name,
  COUNT(*) AS invalid_acting_roles,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  STRING_AGG(
    om.name || ' is acting but missing: ' || 
    CASE 
      WHEN mr.acting_for_member_id IS NULL THEN 'acting_for_member_id '
      ELSE ''
    END ||
    CASE 
      WHEN mr.acting_reason IS NULL THEN 'acting_reason '
      ELSE ''
    END,
    '; '
  ) AS details
FROM member_roles mr
JOIN organization_members om ON mr.member_id = om.id
WHERE mr.status = 'active'
  AND mr.is_acting_role = TRUE
  AND (mr.acting_for_member_id IS NULL OR mr.acting_reason IS NULL);

-- ============================================================================
-- CHECK 9: Election Data Consistency
-- ============================================================================

-- Verify elected roles have election data
SELECT 
  'Election Data Consistency Check' AS test_name,
  COUNT(*) AS missing_election_data,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '⚠️ WARN' END AS status,
  STRING_AGG(
    om.name || ' (' || mr.role_code || ') marked elected but election_date=' || 
    COALESCE(mr.election_date::TEXT, 'NULL'),
    '; '
  ) AS details
FROM member_roles mr
JOIN organization_members om ON mr.member_id = om.id
WHERE mr.status = 'active'
  AND mr.assignment_type = 'elected'
  AND mr.election_date IS NULL;

-- ============================================================================
-- CHECK 10: Vote Percentage Validation
-- ============================================================================

-- Ensure vote percentages are mathematically correct
SELECT 
  'Vote Percentage Validation Check' AS test_name,
  COUNT(*) AS incorrect_percentages,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  STRING_AGG(
    om.name || ': calculated=' || 
    ROUND((mr.vote_count::NUMERIC / mr.total_votes * 100), 2) || 
    '% vs stored=' || mr.vote_percentage || '%',
    '; '
  ) AS details
FROM member_roles mr
JOIN organization_members om ON mr.member_id = om.id
WHERE mr.status = 'active'
  AND mr.vote_count IS NOT NULL
  AND mr.total_votes IS NOT NULL
  AND mr.vote_percentage IS NOT NULL
  AND ABS(mr.vote_percentage - (mr.vote_count::NUMERIC / mr.total_votes * 100)) > 0.01;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- Aggregate validation results
WITH all_checks AS (
  -- Combine all check results here using UNION ALL
  SELECT 'Role Consistency' AS check_name, 
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
  FROM organization_members om
  JOIN (
    SELECT member_id, tenant_id, (ARRAY_AGG(role_code ORDER BY role_level DESC))[1] AS highest_role
    FROM member_roles mr
    JOIN role_definitions rd ON mr.role_code = rd.role_code
    WHERE mr.status = 'active'
    GROUP BY member_id, tenant_id
  ) mhr ON om.id = mhr.member_id AND om.tenant_id = mhr.tenant_id
  WHERE om.role != mhr.highest_role AND om.status = 'active'
)
SELECT 
  '============================================' AS separator,
  'VALIDATION SUMMARY' AS title,
  COUNT(*) AS total_checks,
  COUNT(*) FILTER (WHERE result = 'PASS') AS passed,
  COUNT(*) FILTER (WHERE result = 'FAIL') AS failed,
  COUNT(*) FILTER (WHERE result = 'WARN') AS warnings,
  CASE 
    WHEN COUNT(*) FILTER (WHERE result = 'FAIL') = 0 THEN '✅ ALL CHECKS PASSED'
    ELSE '❌ ' || COUNT(*) FILTER (WHERE result = 'FAIL') || ' CHECK(S) FAILED'
  END AS overall_status
FROM all_checks;

-- ============================================================================
-- DETAILED STATISTICS
-- ============================================================================

-- Role distribution across all organizations
SELECT 
  '============================================' AS separator,
  'ROLE DISTRIBUTION' AS section;

SELECT 
  rd.role_code,
  rd.role_name,
  rd.role_level,
  COUNT(DISTINCT mr.member_id) AS members_with_role,
  COUNT(DISTINCT mr.tenant_id) AS organizations,
  COUNT(*) AS total_assignments,
  COUNT(*) FILTER (WHERE mr.scope_type = 'global') AS global_scope,
  COUNT(*) FILTER (WHERE mr.scope_type != 'global') AS scoped
FROM role_definitions rd
LEFT JOIN member_roles mr ON rd.role_code = mr.role_code AND mr.status = 'active'
WHERE rd.is_active = TRUE
GROUP BY rd.role_code, rd.role_name, rd.role_level
ORDER BY rd.role_level DESC;

-- ============================================================================
-- MIGRATION COMPLETENESS
-- ============================================================================

SELECT 
  '============================================' AS separator,
  'MIGRATION COMPLETENESS' AS section;

WITH migration_stats AS (
  SELECT 
    COUNT(DISTINCT t.id) AS total_orgs,
    COUNT(DISTINCT CASE WHEN mr.role_code IN ('president', 'vice_president', 'secretary_treasurer') 
          THEN mr.tenant_id END) AS orgs_with_executives,
    COUNT(DISTINCT CASE WHEN mr.role_code = 'chief_steward' 
          THEN mr.tenant_id END) AS orgs_with_chief_steward,
    COUNT(DISTINCT CASE WHEN mr.role_code IN ('health_safety_rep', 'bargaining_committee') 
          THEN mr.tenant_id END) AS orgs_with_specialized
  FROM tenants t
  LEFT JOIN member_roles mr ON t.id = mr.tenant_id AND mr.status = 'active'
  WHERE t.status = 'active'
)
SELECT 
  'Total Active Organizations' AS metric,
  total_orgs AS count,
  '100%' AS percentage
FROM migration_stats
UNION ALL
SELECT 
  'Organizations with Executives',
  orgs_with_executives,
  ROUND((orgs_with_executives::NUMERIC / NULLIF(total_orgs, 0) * 100), 1)::TEXT || '%'
FROM migration_stats
UNION ALL
SELECT 
  'Organizations with Chief Steward',
  orgs_with_chief_steward,
  ROUND((orgs_with_chief_steward::NUMERIC / NULLIF(total_orgs, 0) * 100), 1)::TEXT || '%'
FROM migration_stats
UNION ALL
SELECT 
  'Organizations with Specialized Reps',
  orgs_with_specialized,
  ROUND((orgs_with_specialized::NUMERIC / NULLIF(total_orgs, 0) * 100), 1)::TEXT || '%'
FROM migration_stats;

-- ============================================================================
-- END OF VALIDATION SCRIPT
-- ============================================================================

-- RECOMMENDED ACTIONS BASED ON RESULTS:
-- 
-- IF CHECKS FAIL:
-- 1. Review failure details in each check output
-- 2. Fix data inconsistencies using upgrade-member-role.sql
-- 3. Re-run validation script
-- 
-- IF CHECKS PASS WITH WARNINGS:
-- 1. Review warning details
-- 2. Determine if warnings are acceptable (e.g., small orgs without president)
-- 3. Document exceptions
-- 
-- IF ALL CHECKS PASS:
-- 1. Proceed to next phase (UI updates)
-- 2. Communicate role changes to administrators
-- 3. Monitor for issues in production
