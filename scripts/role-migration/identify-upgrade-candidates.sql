-- Role Migration - Identify Upgrade Candidates
-- Purpose: Find members who should be upgraded to new executive/specialized roles
-- Date: February 11, 2026
-- Phase: 2 - Role Assignment Migration

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- This script identifies organization members who are likely candidates for
-- role upgrades based on:
-- 1. Current role assignments
-- 2. Name patterns (President, VP, Treasurer, etc.)
-- 3. Permission patterns
-- 4. Historical activity

-- ============================================================================
-- SECTION 1: EXECUTIVE OFFICER CANDIDATES
-- ============================================================================

-- 1.1 President Candidates
-- Members with "officer" or "admin" role whose name contains "president"
SELECT 
  om.id AS member_id,
  om.tenant_id,
  om.user_id,
  om.name,
  om.email,
  om.role AS current_role,
  'president' AS suggested_role,
  90 AS suggested_level,
  'Name contains president-related keywords' AS reason,
  om.created_at AS member_since
FROM organization_members om
WHERE om.status = 'active'
  AND om.role IN ('officer', 'admin', 'union_rep')
  AND (
    om.name ILIKE '%president%' 
    OR om.name ILIKE '%pres.%'
    OR om.email ILIKE '%president%'
  )
ORDER BY om.tenant_id, om.name;

-- 1.2 Vice President Candidates
SELECT 
  om.id AS member_id,
  om.tenant_id,
  om.user_id,
  om.name,
  om.email,
  om.role AS current_role,
  'vice_president' AS suggested_role,
  85 AS suggested_level,
  'Name contains vice president keywords' AS reason,
  om.created_at AS member_since
FROM organization_members om
WHERE om.status = 'active'
  AND om.role IN ('officer', 'admin', 'union_rep')
  AND (
    om.name ILIKE '%vice%president%' 
    OR om.name ILIKE '%v.p.%'
    OR om.name ILIKE '%vp%'
    OR om.email ILIKE '%vice%president%'
  )
ORDER BY om.tenant_id, om.name;

-- 1.3 Secretary-Treasurer Candidates
SELECT 
  om.id AS member_id,
  om.tenant_id,
  om.user_id,
  om.name,
  om.email,
  om.role AS current_role,
  'secretary_treasurer' AS suggested_role,
  85 AS suggested_level,
  'Name contains treasurer/secretary keywords' AS reason,
  om.created_at AS member_since
FROM organization_members om
WHERE om.status = 'active'
  AND om.role IN ('officer', 'admin', 'union_rep')
  AND (
    om.name ILIKE '%treasurer%' 
    OR om.name ILIKE '%secretary%'
    OR om.name ILIKE '%sec%treas%'
    OR om.email ILIKE '%treasurer%'
    OR om.email ILIKE '%secretary%'
  )
ORDER BY om.tenant_id, om.name;

-- ============================================================================
-- SECTION 2: SENIOR REPRESENTATIVE CANDIDATES
-- ============================================================================

-- 2.1 Chief Steward Candidates
-- Members with "steward" role whose name contains "chief"
SELECT 
  om.id AS member_id,
  om.tenant_id,
  om.user_id,
  om.name,
  om.email,
  om.role AS current_role,
  'chief_steward' AS suggested_role,
  70 AS suggested_level,
  'Name contains chief steward keywords' AS reason,
  om.created_at AS member_since
FROM organization_members om
WHERE om.status = 'active'
  AND om.role IN ('steward', 'union_steward', 'officer')
  AND (
    om.name ILIKE '%chief%steward%' 
    OR om.name ILIKE '%head%steward%'
    OR om.name ILIKE '%lead%steward%'
    OR om.email ILIKE '%chief%'
  )
ORDER BY om.tenant_id, om.name;

-- 2.2 High-Activity Stewards (Potential Chief Steward)
-- Stewards with significantly more activity than average
WITH steward_activity AS (
  SELECT 
    om.id AS member_id,
    om.tenant_id,
    om.name,
    om.role,
    COUNT(DISTINCT c.id) AS claims_handled,
    COUNT(DISTINCT CASE WHEN c.status = 'resolved' THEN c.id END) AS claims_resolved,
    om.created_at AS member_since
  FROM organization_members om
  LEFT JOIN claims c ON c.created_by_member_id = om.id OR c.assigned_to_member_id = om.id
  WHERE om.status = 'active'
    AND om.role IN ('steward', 'union_steward')
  GROUP BY om.id, om.tenant_id, om.name, om.role, om.created_at
),
avg_activity AS (
  SELECT 
    tenant_id,
    AVG(claims_handled) AS avg_claims,
    STDDEV(claims_handled) AS stddev_claims
  FROM steward_activity
  GROUP BY tenant_id
)
SELECT 
  sa.member_id,
  sa.tenant_id,
  sa.name,
  sa.role AS current_role,
  'chief_steward' AS suggested_role,
  70 AS suggested_level,
  'High activity steward (2+ std dev above average)' AS reason,
  sa.claims_handled,
  sa.claims_resolved,
  ROUND((sa.claims_handled::NUMERIC / NULLIF(aa.avg_claims, 0)) * 100, 2) AS activity_vs_avg_pct,
  sa.member_since
FROM steward_activity sa
JOIN avg_activity aa ON sa.tenant_id = aa.tenant_id
WHERE sa.claims_handled > (aa.avg_claims + (2 * COALESCE(aa.stddev_claims, 0)))
  AND sa.claims_handled >= 10  -- Minimum threshold
ORDER BY sa.tenant_id, sa.claims_handled DESC;

-- ============================================================================
-- SECTION 3: SPECIALIZED REPRESENTATIVE CANDIDATES
-- ============================================================================

-- 3.1 Health & Safety Rep Candidates
SELECT 
  om.id AS member_id,
  om.tenant_id,
  om.user_id,
  om.name,
  om.email,
  om.role AS current_role,
  'health_safety_rep' AS suggested_role,
  30 AS suggested_level,
  'Name or activity suggests H&S role' AS reason,
  COUNT(DISTINCT c.id) AS safety_claims_created,
  om.created_at AS member_since
FROM organization_members om
LEFT JOIN claims c ON c.created_by_member_id = om.id 
  AND c.claim_type IN ('health_safety', 'workplace_safety', 'safety')
WHERE om.status = 'active'
  AND om.role IN ('member', 'steward', 'union_steward')
  AND (
    om.name ILIKE '%health%' 
    OR om.name ILIKE '%safety%'
    OR om.name ILIKE '%h&s%'
    OR om.email ILIKE '%safety%'
    OR COUNT(DISTINCT c.id) >= 5  -- Created 5+ safety claims
  )
GROUP BY om.id, om.tenant_id, om.user_id, om.name, om.email, om.role, om.created_at
HAVING COUNT(DISTINCT c.id) > 0 OR om.name ILIKE '%health%' OR om.name ILIKE '%safety%'
ORDER BY om.tenant_id, safety_claims_created DESC;

-- 3.2 Bargaining Committee Candidates
SELECT 
  om.id AS member_id,
  om.tenant_id,
  om.user_id,
  om.name,
  om.email,
  om.role AS current_role,
  'bargaining_committee' AS suggested_role,
  40 AS suggested_level,
  'Name suggests bargaining committee membership' AS reason,
  om.created_at AS member_since
FROM organization_members om
WHERE om.status = 'active'
  AND om.role IN ('officer', 'steward', 'union_steward', 'union_rep')
  AND (
    om.name ILIKE '%bargain%' 
    OR om.name ILIKE '%negotiat%'
    OR om.name ILIKE '%contract%committee%'
    OR om.email ILIKE '%bargain%'
  )
ORDER BY om.tenant_id, om.name;

-- ============================================================================
-- SECTION 4: CONSOLIDATED UPGRADE RECOMMENDATIONS
-- ============================================================================

-- 4.1 All Recommendations Ranked by Priority
WITH all_candidates AS (
  -- Presidents
  SELECT 
    om.id AS member_id,
    om.tenant_id,
    om.user_id,
    om.name,
    om.email,
    om.role AS current_role,
    'president' AS suggested_role,
    90 AS suggested_level,
    1 AS priority,
    'Executive Officer' AS role_category,
    'Name-based identification' AS detection_method
  FROM organization_members om
  WHERE om.status = 'active'
    AND om.role IN ('officer', 'admin', 'union_rep')
    AND (om.name ILIKE '%president%' OR om.email ILIKE '%president%')
    AND om.name NOT ILIKE '%vice%'
  
  UNION ALL
  
  -- Vice Presidents
  SELECT 
    om.id, om.tenant_id, om.user_id, om.name, om.email, om.role,
    'vice_president', 85, 2, 'Executive Officer', 'Name-based identification'
  FROM organization_members om
  WHERE om.status = 'active'
    AND om.role IN ('officer', 'admin', 'union_rep')
    AND (om.name ILIKE '%vice%president%' OR om.email ILIKE '%vice%')
  
  UNION ALL
  
  -- Secretary-Treasurers
  SELECT 
    om.id, om.tenant_id, om.user_id, om.name, om.email, om.role,
    'secretary_treasurer', 85, 3, 'Executive Officer', 'Name-based identification'
  FROM organization_members om
  WHERE om.status = 'active'
    AND om.role IN ('officer', 'admin', 'union_rep')
    AND (om.name ILIKE '%treasurer%' OR om.name ILIKE '%secretary%' 
         OR om.email ILIKE '%treasurer%' OR om.email ILIKE '%secretary%')
  
  UNION ALL
  
  -- Chief Stewards
  SELECT 
    om.id, om.tenant_id, om.user_id, om.name, om.email, om.role,
    'chief_steward', 70, 4, 'Senior Representative', 'Name-based identification'
  FROM organization_members om
  WHERE om.status = 'active'
    AND om.role IN ('steward', 'union_steward', 'officer')
    AND (om.name ILIKE '%chief%' OR om.name ILIKE '%head%steward%')
  
  UNION ALL
  
  -- Health & Safety Reps
  SELECT 
    om.id, om.tenant_id, om.user_id, om.name, om.email, om.role,
    'health_safety_rep', 30, 5, 'Specialized Representative', 'Name-based identification'
  FROM organization_members om
  WHERE om.status = 'active'
    AND (om.name ILIKE '%health%' OR om.name ILIKE '%safety%' 
         OR om.email ILIKE '%safety%')
  
  UNION ALL
  
  -- Bargaining Committee
  SELECT 
    om.id, om.tenant_id, om.user_id, om.name, om.email, om.role,
    'bargaining_committee', 40, 6, 'Specialized Representative', 'Name-based identification'
  FROM organization_members om
  WHERE om.status = 'active'
    AND (om.name ILIKE '%bargain%' OR om.name ILIKE '%negotiat%')
)
SELECT 
  ac.*,
  t.name AS organization_name,
  CASE 
    WHEN ac.priority <= 3 THEN 'HIGH'
    WHEN ac.priority <= 5 THEN 'MEDIUM'
    ELSE 'LOW'
  END AS upgrade_priority
FROM all_candidates ac
LEFT JOIN tenants t ON ac.tenant_id = t.id
ORDER BY ac.tenant_id, ac.priority, ac.suggested_level DESC, ac.name;

-- ============================================================================
-- SECTION 5: VALIDATION CHECKS
-- ============================================================================

-- 5.1 Check for Potential Conflicts (Multiple executives per org)
SELECT 
  tenant_id,
  COUNT(*) AS num_candidates,
  STRING_AGG(DISTINCT name, ', ' ORDER BY name) AS candidate_names,
  'Multiple president candidates - Manual review required' AS warning
FROM (
  SELECT om.tenant_id, om.name
  FROM organization_members om
  WHERE om.status = 'active'
    AND (om.name ILIKE '%president%' OR om.email ILIKE '%president%')
    AND om.name NOT ILIKE '%vice%'
) candidates
GROUP BY tenant_id
HAVING COUNT(*) > 1
ORDER BY num_candidates DESC;

-- 5.2 Organizations Without Executive Officers
SELECT 
  t.id AS tenant_id,
  t.name AS organization_name,
  COUNT(DISTINCT om.id) AS total_members,
  COUNT(DISTINCT CASE WHEN om.role IN ('officer', 'admin') THEN om.id END) AS officers,
  'No executive officers identified - May need manual assignment' AS recommendation
FROM tenants t
LEFT JOIN organization_members om ON t.id = om.tenant_id AND om.status = 'active'
GROUP BY t.id, t.name
HAVING COUNT(DISTINCT CASE WHEN om.role IN ('officer', 'admin') THEN om.id END) = 0
  AND COUNT(DISTINCT om.id) >= 10  -- Only orgs with 10+ members
ORDER BY total_members DESC;

-- 5.3 Summary Statistics
SELECT 
  'Total Active Organizations' AS metric,
  COUNT(DISTINCT t.id) AS value
FROM tenants t
WHERE t.status = 'active'

UNION ALL

SELECT 
  'Active Members' AS metric,
  COUNT(*) AS value
FROM organization_members
WHERE status = 'active'

UNION ALL

SELECT 
  'Current Officers (to review)' AS metric,
  COUNT(*) AS value
FROM organization_members
WHERE status = 'active' AND role IN ('officer', 'union_rep')

UNION ALL

SELECT 
  'Current Stewards (to review)' AS metric,
  COUNT(*) AS value
FROM organization_members
WHERE status = 'active' AND role IN ('steward', 'union_steward')

UNION ALL

SELECT 
  'Estimated President Candidates' AS metric,
  COUNT(*) AS value
FROM organization_members
WHERE status = 'active' 
  AND (name ILIKE '%president%' OR email ILIKE '%president%')
  AND name NOT ILIKE '%vice%';

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Run SECTION 4 first to get consolidated recommendations
-- 2. Review output, focusing on HIGH priority upgrades
-- 3. Run SECTION 5 to validate (check for conflicts)
-- 4. For each candidate:
--    a. Verify with union leadership
--    b. Use upgrade script (upgrade-member-role.sql)
--    c. Log in audit_log table
-- 
-- Expected Output Format:
-- member_id | tenant_id | name | current_role | suggested_role | priority
-- 
-- ============================================================================
