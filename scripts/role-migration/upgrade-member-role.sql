-- Role Migration - Upgrade Member Role
-- Purpose: Safely upgrade a member to a new role with validation and audit logging
-- Date: February 11, 2026
-- Phase: 2 - Role Assignment Migration

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 
-- This script upgrades a member's role in BOTH tables:
-- 1. organization_members.role (legacy simple role)
-- 2. member_roles (enhanced RBAC with scope/terms)
--
-- Replace these placeholder values before running:
-- - {member_id}: UUID of member to upgrade
-- - {tenant_id}: UUID of organization
-- - {user_id}: Clerk user ID (for verification)
-- - {new_role_code}: New role (president, vice_president, etc.)
-- - {admin_user_id}: User ID performing upgrade
-- - {scope_type}: 'global', 'department', 'location', 'shift', 'chapter'
-- - {scope_value}: Department name, location, etc. (NULL for global)
-- - {assignment_type}: 'elected', 'appointed', 'acting', 'emergency'
-- - {term_years}: Term length (3 for executives, 2 for reps, NULL for indefinite)
-- - {election_date}: Date elected (NULL if appointed)
-- - {reason}: Brief reason for upgrade
--
-- ============================================================================

-- ============================================================================
-- STEP 1: PRE-FLIGHT CHECKS
-- ============================================================================

-- 1.1 Verify member exists and is active
DO $$
DECLARE
  v_member_exists BOOLEAN;
  v_member_status TEXT;
  v_member_name TEXT;
BEGIN
  SELECT 
    EXISTS(SELECT 1 FROM organization_members WHERE id = '{member_id}'),
    status,
    name
  INTO v_member_exists, v_member_status, v_member_name
  FROM organization_members
  WHERE id = '{member_id}';
  
  IF NOT v_member_exists THEN
    RAISE EXCEPTION 'Member ID {member_id} not found';
  END IF;
  
  IF v_member_status != 'active' THEN
    RAISE EXCEPTION 'Member % (%) is not active (status: %)', 
      v_member_name, '{member_id}', v_member_status;
  END IF;
  
  RAISE NOTICE 'Pre-flight check passed: Member % (%) is active', 
    v_member_name, '{member_id}';
END $$;

-- 1.2 Verify role definition exists
DO $$
DECLARE
  v_role_exists BOOLEAN;
  v_role_name TEXT;
  v_role_level INT;
BEGIN
  SELECT 
    is_active,
    role_name,
    role_level
  INTO v_role_exists, v_role_name, v_role_level
  FROM role_definitions
  WHERE role_code = '{new_role_code}';
  
  IF NOT v_role_exists THEN
    RAISE EXCEPTION 'Role code {new_role_code} not found in role_definitions';
  END IF;
  
  RAISE NOTICE 'Role verified: % (%) - Level %', 
    '{new_role_code}', v_role_name, v_role_level;
END $$;

-- 1.3 Check for existing active role in same scope
DO $$
DECLARE
  v_existing_role TEXT;
BEGIN
  SELECT role_code INTO v_existing_role
  FROM member_roles
  WHERE member_id = '{member_id}'
    AND tenant_id = '{tenant_id}'
    AND role_code = '{new_role_code}'
    AND scope_type = '{scope_type}'
    AND COALESCE(scope_value, '') = COALESCE('{scope_value}', '')
    AND status = 'active';
  
  IF v_existing_role IS NOT NULL THEN
    RAISE EXCEPTION 'Member already has active role % in scope %:%', 
      '{new_role_code}', '{scope_type}', COALESCE('{scope_value}', 'global');
  END IF;
  
  RAISE NOTICE 'No conflicting role found - Safe to proceed';
END $$;

-- ============================================================================
-- STEP 2: BACKUP CURRENT STATE
-- ============================================================================

-- 2.1 Create backup of current role assignment
CREATE TEMP TABLE IF NOT EXISTS role_upgrade_backup AS
SELECT 
  om.id,
  om.tenant_id,
  om.user_id,
  om.name,
  om.email,
  om.role AS old_role,
  '{new_role_code}' AS new_role,
  NOW() AS backup_timestamp,
  '{admin_user_id}' AS upgraded_by
FROM organization_members om
WHERE om.id = '{member_id}';

-- 2.2 Backup existing member_roles records
INSERT INTO audit_log (
  event_type,
  resource_type,
  resource_id,
  tenant_id,
  user_id,
  event_data,
  ip_address,
  user_agent,
  status,
  created_at
)
SELECT 
  'role_upgrade_backup',
  'member_roles',
  mr.id::TEXT,
  mr.tenant_id,
  '{admin_user_id}',
  jsonb_build_object(
    'member_id', mr.member_id,
    'old_role_code', mr.role_code,
    'new_role_code', '{new_role_code}',
    'scope_type', mr.scope_type,
    'scope_value', mr.scope_value,
    'status', mr.status,
    'assignment_type', mr.assignment_type,
    'reason', '{reason}'
  ),
  'system',
  'role_migration_script',
  'success',
  NOW()
FROM member_roles mr
WHERE mr.member_id = '{member_id}'
  AND mr.tenant_id = '{tenant_id}'
  AND mr.status = 'active';

RAISE NOTICE 'Backup created in audit_log table';

-- ============================================================================
-- STEP 3: UPDATE ORGANIZATION_MEMBERS TABLE (Legacy)
-- ============================================================================

UPDATE organization_members
SET 
  role = '{new_role_code}',
  updated_at = NOW()
WHERE id = '{member_id}'
  AND tenant_id = '{tenant_id}';

-- Verify update
DO $$
DECLARE
  v_updated_role TEXT;
  v_member_name TEXT;
BEGIN
  SELECT role, name INTO v_updated_role, v_member_name
  FROM organization_members
  WHERE id = '{member_id}';
  
  IF v_updated_role != '{new_role_code}' THEN
    RAISE EXCEPTION 'Role update failed for member %', '{member_id}';
  END IF;
  
  RAISE NOTICE 'Updated organization_members.role: % → %', 
    v_member_name, '{new_role_code}';
END $$;

-- ============================================================================
-- STEP 4: INSERT NEW MEMBER_ROLE RECORD (Enhanced RBAC)
-- ============================================================================

INSERT INTO member_roles (
  id,
  member_id,
  tenant_id,
  role_code,
  scope_type,
  scope_value,
  start_date,
  term_years,
  next_election_date,
  assignment_type,
  election_date,
  status,
  requires_approval,
  created_at,
  created_by,
  updated_at
) VALUES (
  gen_random_uuid(),
  '{member_id}',
  '{tenant_id}',
  '{new_role_code}',
  '{scope_type}',
  NULLIF('{scope_value}', ''),  -- NULL if empty string
  CURRENT_DATE,
  NULLIF('{term_years}', '')::INT,  -- NULL if empty
  CASE 
    WHEN '{term_years}' != '' THEN 
      CURRENT_DATE + ('{term_years}'::INT * INTERVAL '1 year')
    ELSE NULL 
  END,
  '{assignment_type}',
  NULLIF('{election_date}', '')::DATE,
  'active',
  FALSE,  -- No approval needed for migrations
  NOW(),
  '{admin_user_id}',
  NOW()
);

RAISE NOTICE 'Created new member_roles record with scope %:%', 
  '{scope_type}', COALESCE('{scope_value}', 'global');

-- ============================================================================
-- STEP 5: EXPIRE OLD CONFLICTING ROLES (If Any)
-- ============================================================================

-- Expire any lower-level roles in global scope (prevents permission bloat)
UPDATE member_roles
SET 
  status = 'expired',
  end_date = CURRENT_DATE,
  updated_at = NOW(),
  updated_by = '{admin_user_id}'
WHERE member_id = '{member_id}'
  AND tenant_id = '{tenant_id}'
  AND role_code != '{new_role_code}'
  AND scope_type = 'global'  -- Only expire global roles
  AND status = 'active'
  AND role_code IN (
    SELECT role_code FROM role_definitions 
    WHERE role_level < (
      SELECT role_level FROM role_definitions WHERE role_code = '{new_role_code}'
    )
  );

-- Report expired roles
DO $$
DECLARE
  v_expired_count INT;
BEGIN
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  IF v_expired_count > 0 THEN
    RAISE NOTICE 'Expired % lower-level global role(s) to prevent permission bloat', 
      v_expired_count;
  ELSE
    RAISE NOTICE 'No conflicting roles to expire';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: AUDIT LOGGING
-- ============================================================================

INSERT INTO audit_log (
  event_type,
  resource_type,
  resource_id,
  tenant_id,
  user_id,
  event_data,
  ip_address,
  user_agent,
  status,
  created_at
) VALUES (
  'role_upgraded',
  'organization_members',
  '{member_id}',
  '{tenant_id}',
  '{admin_user_id}',
  jsonb_build_object(
    'member_id', '{member_id}',
    'new_role_code', '{new_role_code}',
    'scope_type', '{scope_type}',
    'scope_value', NULLIF('{scope_value}', ''),
    'assignment_type', '{assignment_type}',
    'term_years', NULLIF('{term_years}', '')::INT,
    'election_date', NULLIF('{election_date}', ''),
    'reason', '{reason}',
    'migration_phase', 2,
    'script_version', '1.0'
  ),
  'system',
  'role_migration_script_v1',
  'success',
  NOW()
);

RAISE NOTICE 'Audit log entry created';

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

-- 7.1 Verify final state
SELECT 
  om.id,
  om.name,
  om.email,
  om.role AS current_simple_role,
  mr.role_code AS current_enhanced_role,
  mr.scope_type,
  mr.scope_value,
  mr.assignment_type,
  mr.start_date,
  mr.next_election_date,
  mr.status,
  rd.role_level,
  rd.role_name
FROM organization_members om
JOIN member_roles mr ON om.id = mr.member_id AND mr.status = 'active'
JOIN role_definitions rd ON mr.role_code = rd.role_code
WHERE om.id = '{member_id}'
  AND om.tenant_id = '{tenant_id}'
ORDER BY mr.created_at DESC;

-- 7.2 Check permissions
SELECT 
  mr.role_code,
  mr.scope_type,
  mr.status,
  rd.permissions,
  rd.role_level
FROM member_roles mr
JOIN role_definitions rd ON mr.role_code = rd.role_code
WHERE mr.member_id = '{member_id}'
  AND mr.tenant_id = '{tenant_id}'
  AND mr.status = 'active'
ORDER BY rd.role_level DESC;

-- ============================================================================
-- STEP 8: SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  v_member_name TEXT;
  v_role_name TEXT;
BEGIN
  SELECT om.name, rd.role_name
  INTO v_member_name, v_role_name
  FROM organization_members om
  JOIN member_roles mr ON om.id = mr.member_id
  JOIN role_definitions rd ON mr.role_code = rd.role_code
  WHERE om.id = '{member_id}' AND mr.status = 'active'
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROLE UPGRADE SUCCESSFUL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Member: %', v_member_name;
  RAISE NOTICE 'New Role: % (%)', v_role_name, '{new_role_code}';
  RAISE NOTICE 'Scope: %', '{scope_type}';
  IF '{scope_value}' != '' THEN
    RAISE NOTICE 'Scope Value: %', '{scope_value}';
  END IF;
  RAISE NOTICE 'Assignment Type: %', '{assignment_type}';
  IF '{term_years}' != '' THEN
    RAISE NOTICE 'Term: % years', '{term_years}';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- ROLLBACK PROCEDURE (In Case of Issues)
-- ============================================================================
-- 
-- If you need to undo this upgrade, run:
-- 
-- BEGIN;
-- 
-- -- Restore organization_members role
-- UPDATE organization_members
-- SET role = (SELECT old_role FROM role_upgrade_backup WHERE id = '{member_id}'),
--     updated_at = NOW()
-- WHERE id = '{member_id}';
-- 
-- -- Delete new member_roles record
-- DELETE FROM member_roles
-- WHERE member_id = '{member_id}'
--   AND tenant_id = '{tenant_id}'
--   AND role_code = '{new_role_code}'
--   AND created_at >= (SELECT backup_timestamp FROM role_upgrade_backup);
-- 
-- -- Reactivate old roles
-- UPDATE member_roles
-- SET status = 'active',
--     end_date = NULL,
--     updated_at = NOW()
-- WHERE member_id = '{member_id}'
--   AND tenant_id = '{tenant_id}'
--   AND status = 'expired'
--   AND updated_at >= (SELECT backup_timestamp FROM role_upgrade_backup);
-- 
-- COMMIT;
-- 
-- ============================================================================
