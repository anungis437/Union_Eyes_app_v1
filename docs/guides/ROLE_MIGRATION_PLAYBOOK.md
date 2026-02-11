# Role Migration Playbook

**Mission-Critical Guide for Upgrading Union Executive Roles**  
**Date:** February 11, 2026  
**Phase:** 2 - Role Assignment Migration  
**Audience:** System Administrators, Database Administrators, Union IT Staff  
**Estimated Time:** 4-8 hours per organization (depending on size)

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Phase 1: Identification](#phase-1-identification)
4. [Phase 2: Review & Approval](#phase-2-review--approval)
5. [Phase 3: Execution](#phase-3-execution)
6. [Phase 4: Validation](#phase-4-validation)
7. [Phase 5: Rollback (If Needed)](#phase-5-rollback-if-needed)
8. [Post-Migration](#post-migration)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Overview

### What This Migration Does

This migration upgrades existing union member role assignments to use the **enhanced 10-role RBAC system** that includes proper executive positions:

**Before (4 simplified roles):**
- admin → System administrator
- officer → Union officers (generic)
- steward → Department representatives
- member → Base membership

**After (10 complete roles):**
- admin → IT administrator (unchanged)
- **president** → Union president, CBA signatory ✅ NEW
- **vice_president** → Deputy, succession planning ✅ NEW
- **secretary_treasurer** → Financial officer ✅ NEW
- **chief_steward** → Supervises stewards ✅ NEW
- officer → Board members
- steward → Department representatives
- **bargaining_committee** → Contract negotiations ✅ NEW
- **health_safety_rep** → Workplace safety ✅ NEW
- member → Base membership

### Why This Migration Is Needed

1. **Legal Compliance:** Union governance structure must reflect actual executive positions for audit and labor law compliance
2. **Security:** Clear separation of duties (President ≠ IT Admin, President ≠ generic Officer)
3. **Audit Trail:** CBA signatures, financial approvals, and committee appointments must be traceable to specific executive roles
4. **Permission Accuracy:** Each role now has fine-grained permissions (e.g., SIGN_CBA only for President)

### Migration Tools Overview

| Tool | Purpose | When to Use |
|------|---------|-------------|
| [`identify-upgrade-candidates.sql`](../scripts/role-migration/identify-upgrade-candidates.sql) | Find members who should be upgraded to new executive/specialized roles | Phase 1 (Identification) |
| [`upgrade-member-role.sql`](../scripts/role-migration/upgrade-member-role.sql) | Safely upgrade a single member's role with validation and audit logging | Phase 3 (Execution - Manual) |
| [`POST /api/members/[memberId]/roles`](../app/api/members/[memberId]/roles/route.ts) | Programmatically assign roles via API with authorization checks | Phase 3 (Execution - Programmatic) |
| [`POST /api/admin/roles/batch`](../app/api/admin/roles/batch/route.ts) | Assign multiple roles in a single transaction | Phase 3 (Execution - Batch) |
| [`validate-role-assignments.sql`](../scripts/role-migration/validate-role-assignments.sql) | Run 10 validation checks to ensure migration correctness | Phase 4 (Validation) |

---

## Pre-Migration Checklist

### ⚠️ MUST DO BEFORE STARTING

- [ ] **Backup Database:** Full database backup with verified restore capability
- [ ] **Schedule Downtime:** 2-hour maintenance window (optional but recommended)
- [ ] **Notify Stakeholders:** Inform union leadership, administrators, and users
- [ ] **Test in Staging:** Run full migration on staging environment first
- [ ] **Verify Access:** Confirm you have database admin rights and API admin credentials
- [ ] **Review Documentation:**
  - [ ] [RBAC Gap Closure Report](./RBAC_GAP_CLOSURE_REPORT.md)
  - [ ] [Union Role Assignment Guide](../guides/UNION_ROLE_ASSIGNMENT_GUIDE.md)
- [ ] **Prepare Rollback Plan:** Know how to revert changes if something goes wrong
- [ ] **Confirm Change Approval:** Written approval from CIO, Union President, or IT Director

### Environment Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| PostgreSQL Version | 13.0 | 15.0+ |
| Database Backup Age | < 1 hour | Immediate pre-migration |
| Staging Environment | Yes | Yes (mandatory) |
| Admin API Access | Yes | Yes |
| Database Admin Rights | SUPERUSER or OWNER | SUPERUSER |
| Estimated Duration | 2 hours | 4-8 hours (with validation) |

---

## Phase 1: Identification

**Goal:** Find all members who should be upgraded to new executive or specialized roles.

### Step 1.1: Run Candidate Identification Query

```bash
# Connect to database (replace with your connection string)
psql "postgresql://user:password@host:5432/union_eyes_db"

# Run identification script
\i scripts/role-migration/identify-upgrade-candidates.sql
```

**What This Script Does:**
1. Searches for executive officers by name patterns (President, Vice President, Treasurer, Secretary)
2. Identifies senior representatives (Chief Steward) by name + high activity (2+ std dev above average)
3. Finds specialized representatives (Health & Safety, Bargaining Committee) by name patterns + activity
4. Ranks candidates by priority (HIGH/MEDIUM/LOW)
5. Detects conflicts (multiple candidates for same role)
6. Identifies organizations without executive officers

### Step 1.2: Review Output

The script produces 5 sections of output:

#### Section 1: Executive Officer Candidates
```
member_id | tenant_id | name              | current_role | suggested_role        | suggested_level | reason                           | priority
----------|-----------|-------------------|--------------|----------------------|-----------------|----------------------------------|----------
abc-123   | org-1     | John President    | officer      | president            | 90              | Name matches 'president'         | HIGH
def-456   | org-1     | Jane Vice Pres    | officer      | vice_president       | 85              | Name matches 'vice'              | HIGH
ghi-789   | org-1     | Bob Treasurer     | officer      | secretary_treasurer  | 85              | Name matches 'treasurer'         | HIGH
```

#### Section 2: Senior Representative Candidates
```
member_id | tenant_id | name              | current_role | suggested_role | suggested_level | reason                                    | priority
----------|-----------|-------------------|--------------|----------------|-----------------|-------------------------------------------|----------
jkl-012   | org-1     | Mary Chief Steward| steward      | chief_steward  | 70              | Name + handles 45 claims (3.2σ above avg) | MEDIUM
```

#### Section 3: Specialized Representative Candidates
```
member_id | tenant_id | name              | current_role | suggested_role        | suggested_level | reason                           | priority
----------|-----------|-------------------|--------------|----------------------|-----------------|----------------------------------|----------
mno-345   | org-1     | Tom Safety Officer| steward      | health_safety_rep    | 30              | Name + 12 safety claims          | LOW
```

#### Section 4: Consolidated Recommendations (Use This!)
```
member_id | tenant_id | organization_name | name           | current_role | suggested_role  | suggested_level | reason                     | priority
----------|-----------|-------------------|----------------|--------------|-----------------|-----------------|----------------------------|----------
abc-123   | org-1     | CUPE Local 79     | John President | officer      | president       | 90              | Name matches 'president'   | HIGH
...
```

#### Section 5: Validation Warnings
```
⚠️ Multiple candidates for same role detected:
- org-1 (CUPE Local 79): 2 candidates for 'president'
  - John President (member_id: abc-123)
  - Jane President (member_id: xyz-999)

⚠️ Organizations without executive officers (10+ members):
- org-2 (Unifor Local 555): 42 members, no president/VP/treasurer
```

### Step 1.3: Export Results for Review

```sql
-- Export to CSV for spreadsheet review
COPY (
  SELECT 
    member_id, tenant_id, organization_name, name, 
    current_role, suggested_role, suggested_level, reason, priority
  FROM (
    -- Paste Section 4 query from identify-upgrade-candidates.sql
    ...
  ) AS consolidated_recommendations
) TO '/tmp/role_upgrade_candidates.csv' WITH CSV HEADER;
```

### Step 1.4: Document Decisions

Create a migration decision log:

```markdown
# Role Migration Decision Log - Organization: CUPE Local 79

| Member ID | Name           | Current Role | Suggested Role | ACTION | Notes |
|-----------|----------------|--------------|----------------|--------|-------|
| abc-123   | John President | officer      | president      | ✅ APPROVE | Current acting president |
| def-456   | Jane Vice Pres | officer      | vice_president | ✅ APPROVE | Elected 2025-06-01 |
| xyz-999   | Jane President | officer      | president      | ❌ REJECT | Historical name, no longer president |
| ghi-789   | Bob Treasurer  | officer      | secretary_treasurer | ✅ APPROVE | Treasurer since 2023 |
```

---

## Phase 2: Review & Approval

**Goal:** Get stakeholder sign-off before making changes.

### Step 2.1: Prepare Migration Plan Document

Create a one-page summary for each organization:

```markdown
# Role Migration Plan - CUPE Local 79

**Organization ID:** org-1  
**Total Members:** 342  
**Roles to Upgrade:** 6  
**Estimated Duration:** 15 minutes  
**Risk Level:** Low  

## Proposed Changes

| Member Name    | Current Role | New Role            | Justification |
|----------------|--------------|---------------------|---------------|
| John President | officer      | president           | Acting president, handles CBA signing |
| Jane Vice Pres | officer      | vice_president      | Elected VP, 2025 election |
| Bob Treasurer  | officer      | secretary_treasurer | Financial officer, bank signatory |
| Mary Chief     | steward      | chief_steward       | Supervises 8 stewards, highest activity |
| Tom Safety     | steward      | health_safety_rep   | H&S committee chair |
| Sue Bargain    | steward      | bargaining_committee| Negotiating committee member |

## Impact Assessment

- **Permissions:** Members will gain appropriate executive and specialized permissions
- **User Experience:** No UI changes required (roles already supported)
- **Audit Trail:** All assignments logged with election dates and justifications
- **Rollback:** Full rollback capability via backup and SQL scripts

## Approval Required From:
- [ ] Union President (John)
- [ ] IT Director
- [ ] Database Administrator
```

### Step 2.2: Conduct Review Meeting

Schedule a 30-minute meeting with:
- Union President or Executive Board
- IT Director or System Administrator
- Database Administrator (if separate role)

**Agenda:**
1. Explain why migration is needed (5 min)
2. Review proposed role changes (10 min)
3. Address questions and concerns (10 min)
4. Obtain written approval (5 min)

### Step 2.3: Get Written Approval

**Email Template:**

```
Subject: APPROVAL REQUIRED - Role Migration for [Organization Name]

Dear [President/IT Director],

We are ready to proceed with the role migration to upgrade member roles 
to the enhanced RBAC system. This migration will provide:

1. Proper executive role separation (President, VP, Treasurer)
2. Enhanced audit trail for CBA signing and financial approvals
3. Fine-grained permissions for union operations

PROPOSED CHANGES: See attached migration plan
ESTIMATED DURATION: 15 minutes
SCHEDULED DATE/TIME: [Date] at [Time]
ROLLBACK PLAN: Full backup + revert scripts

APPROVAL REQUIRED:
- [ ] I approve these role changes
- [ ] I approve the scheduled maintenance window
- [ ] I understand the rollback procedures

Please reply with "APPROVED" to proceed.

Best regards,
[Your Name]
[Your Title]
```

---

## Phase 3: Execution

**Goal:** Safely upgrade member roles using approved migration plan.

### Decision: Which Method to Use?

| Method | Best For | Skill Level | Tool |
|--------|----------|-------------|------|
| **Manual SQL** | 1-10 upgrades, maximum control | Advanced (DBA) | `upgrade-member-role.sql` |
| **Single API** | 1-10 upgrades, programmatic control | Intermediate (Dev) | `POST /api/members/[id]/roles` |
| **Batch API** | 10+ upgrades, high efficiency | Intermediate (Dev) | `POST /api/admin/roles/batch` |

### Method A: Manual SQL Upgrade (Recommended for First Migration)

**Pros:** Maximum control, step-by-step validation, detailed logging  
**Cons:** Slower for large batches, requires SQL knowledge  

#### Step 3A.1: Prepare SQL Script

```sql
-- Open upgrade-member-role.sql in editor
-- Replace placeholders with actual values

-- EXAMPLE: Upgrade John to President
-- Before:
{member_id}        -- Replace with: 'abc-123'
{tenant_id}        -- Replace with: 'org-1'
{user_id}          -- Replace with: 'abc-123'
{new_role_code}    -- Replace with: 'president'
{admin_user_id}    -- Replace with: 'your-admin-id'
{scope_type}       -- Replace with: 'global'
{scope_value}      -- Replace with: ''
{assignment_type}  -- Replace with: 'elected'
{term_years}       -- Replace with: 3
{election_date}    -- Replace with: '2025-06-01'
{reason}           -- Replace with: 'Acting president, elected 2025, CBA signatory'
```

#### Step 3A.2: Execute Script

```bash
# Connect to database
psql "postgresql://user:password@host:5432/union_eyes_db"

# Start transaction (IMPORTANT!)
BEGIN;

# Run upgrade script
\i scripts/role-migration/upgrade-member-role.sql

# Review output - look for "SUCCESS" message
# If successful, commit:
COMMIT;

# If error, rollback:
ROLLBACK;
```

#### Step 3A.3: Verify Single Upgrade

```sql
-- Check member_roles table
SELECT 
  mr.role_code,
  mr.scope_type,
  mr.assignment_type,
  mr.start_date,
  mr.election_date,
  mr.next_election_date,
  mr.status
FROM member_roles mr
WHERE mr.member_id = 'abc-123'
ORDER BY mr.created_at DESC
LIMIT 5;

-- Check organization_members table
SELECT role, updated_at
FROM organization_members
WHERE id = 'abc-123';

-- Check audit log
SELECT 
  action,
  details,
  timestamp
FROM audit_log
WHERE resource_id = 'abc-123'
ORDER BY timestamp DESC
LIMIT 3;
```

---

### Method B: Single API Upgrade (Programmatic Control)

**Pros:** Authorization checks built-in, easier for developers  
**Cons:** Requires API credentials, one-at-a-time processing  

#### Step 3B.1: Prepare API Request

```bash
# Set environment variables
export API_URL="https://your-union-eyes-instance.com"
export ADMIN_TOKEN="your-admin-jwt-token"
export MEMBER_ID="abc-123"

# Test API connection
curl -X GET "$API_URL/api/members/$MEMBER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Step 3B.2: Execute Single Role Assignment

```bash
# Assign President role
curl -X POST "$API_URL/api/members/$MEMBER_ID/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleCode": "president",
    "scopeType": "global",
    "assignmentType": "elected",
    "reason": "Acting president, elected June 2025, CBA signatory",
    "electionDate": "2025-06-01T00:00:00Z",
    "termYears": 3,
    "voteCount": 145,
    "totalVotes": 200
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Role assigned successfully",
#   "data": {
#     "memberId": "abc-123",
#     "memberName": "John President",
#     "roleCode": "president",
#     "scopeType": "global",
#     "assignmentType": "elected",
#     "startDate": "2026-02-11T10:30:00Z",
#     "nextElectionDate": "2028-06-01T00:00:00Z"
#   }
# }
```

#### Step 3B.3: Verify via API

```bash
# Get member's roles
curl -X GET "$API_URL/api/members/$MEMBER_ID/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

### Method C: Batch API Upgrade (High Efficiency)

**Pros:** Fastest for large batches, dry-run mode, rollback on error  
**Cons:** Less granular control, requires JSON preparation  

#### Step 3C.1: Prepare Batch JSON

```json
{
  "assignments": [
    {
      "memberId": "abc-123",
      "roleCode": "president",
      "scopeType": "global",
      "assignmentType": "elected",
      "reason": "Acting president, elected June 2025, CBA signatory",
      "electionDate": "2025-06-01T00:00:00Z",
      "termYears": 3,
      "voteCount": 145,
      "totalVotes": 200
    },
    {
      "memberId": "def-456",
      "roleCode": "vice_president",
      "scopeType": "global",
      "assignmentType": "elected",
      "reason": "Elected VP, succession planning",
      "electionDate": "2025-06-01T00:00:00Z",
      "termYears": 3,
      "voteCount": 130,
      "totalVotes": 200
    },
    {
      "memberId": "ghi-789",
      "roleCode": "secretary_treasurer",
      "scopeType": "global",
      "assignmentType": "elected",
      "reason": "Financial officer, bank signatory, handles union finances",
      "electionDate": "2025-06-01T00:00:00Z",
      "termYears": 3,
      "voteCount": 155,
      "totalVotes": 200
    }
  ],
  "dryRun": true,
  "stopOnError": false
}
```

#### Step 3C.2: Test with Dry Run

```bash
# Test batch assignment (NO CHANGES MADE)
curl -X POST "$API_URL/api/admin/roles/batch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @role-assignments.json

# Expected Response:
# {
#   "success": true,
#   "message": "Dry run completed - no changes made",
#   "summary": {
#     "total": 3,
#     "successful": 3,
#     "skipped": 0,
#     "failed": 0,
#     "dryRun": true
#   },
#   "results": [...]
# }
```

#### Step 3C.3: Execute Real Batch

```bash
# Update JSON: "dryRun": false
# Then execute:
curl -X POST "$API_URL/api/admin/roles/batch" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @role-assignments.json

# Expected Response:
# {
#   "success": true,
#   "message": "Batch role assignment completed: 3 successful, 0 skipped, 0 failed",
#   "summary": {
#     "total": 3,
#     "successful": 3,
#     "skipped": 0,
#     "failed": 0,
#     "dryRun": false
#   },
#   "results": [...]
# }
```

---

## Phase 4: Validation

**Goal:** Verify migration correctness with 10 automated checks.

### Step 4.1: Run Validation Script

```bash
# Connect to database
psql "postgresql://user:password@host:5432/union_eyes_db"

# Run validation script
\i scripts/role-migration/validate-role-assignments.sql
```

### Step 4.2: Review Validation Results

The script runs 10 checks:

| Check | Purpose | Pass Criteria |
|-------|---------|---------------|
| 1. Role Consistency | Verify `organization_members.role` matches highest `member_roles.role_code` | 0 mismatches |
| 2. No Orphaned Roles | Ensure all `member_roles` reference valid members | 0 orphans |
| 3. Role Definition Validity | Verify all `role_code` values exist in `role_definitions` | 0 invalid |
| 4. No Duplicate Active Roles | Check for duplicate active roles in same scope | 0 duplicates |
| 5. Executive Distribution | Verify each org has appropriate executives | < 10% orgs without president |
| 6. Scope Validation | Ensure non-global scopes have `scope_value` | 0 invalid scopes |
| 7. Term Expiration Logic | Verify `term_years` and `next_election_date` consistency | < 5% inconsistent |
| 8. Acting Role Validation | Ensure acting roles have required fields | 0 invalid |
| 9. Election Data Consistency | Verify elected roles have election dates | < 10% missing dates |
| 10. Vote Percentage Validation | Ensure vote percentages are mathematically correct | 0 incorrect |

**Example Output:**

```
test_name                        | status    | details
---------------------------------|-----------|---------------------------------
Role Consistency Check           | ✅ PASS   | NULL
Orphaned Member Roles Check      | ✅ PASS   | NULL
Role Definition Validity Check   | ✅ PASS   | NULL
Duplicate Active Roles Check     | ✅ PASS   | NULL
Executive Role Distribution Check| ⚠️ WARN   | Orgs with 10+ members but no president: 2 | Orgs with multiple presidents: 0
Scope Validation Check           | ✅ PASS   | NULL
Term Expiration Logic Check      | ⚠️ WARN   | 3 roles missing term data
Acting Role Validation Check     | ✅ PASS   | NULL
Election Data Consistency Check  | ⚠️ WARN   | 5 elected roles missing election_date
Vote Percentage Validation Check | ✅ PASS   | NULL

VALIDATION SUMMARY
------------------
Total Checks: 10
Passed: 7
Failed: 0
Warnings: 3
Overall Status: ✅ ALL CHECKS PASSED (with warnings)
```

### Step 4.3: Address Warnings

For each warning, determine if it's acceptable:

**Warning: Organizations without president**
- **Acceptable if:** Org has < 10 members (small local), president not yet elected
- **Action required if:** Org has 10+ members and is active
- **Fix:** Identify acting president and assign role

**Warning: Term expiration inconsistencies**
- **Acceptable if:** Appointed roles (no term limits)
- **Action required if:** Elected roles missing term data
- **Fix:** Update `member_roles` with correct term_years and election dates

**Warning: Election data missing**
- **Acceptable if:** Role was appointed, not elected
- **Action required if:** Assignment type is 'elected'
- **Fix:** Update `member_roles` with election_date

### Step 4.4: Verify in UI

1. Log in as admin
2. Navigate to Members → [Select upgraded member]
3. Verify:
   - Role badge shows new role (e.g., "President")
   - Permissions show new capabilities (e.g., "Sign CBA")
   - Audit log shows role assignment entry

---

## Phase 5: Rollback (If Needed)

**⚠️ USE ONLY IF CRITICAL ISSUES FOUND**

### When to Rollback

Rollback if:
- Multiple critical validation checks fail
- Database corruption detected
- Incorrect permissions granted (security issue)
- Stakeholder requests urgent revert

### Rollback Method A: Restore from Backup (Safest)

```bash
# Stop application servers
systemctl stop union-eyes

# Drop current database
dropdb union_eyes_db

# Restore from backup
pg_restore -d union_eyes_db /backups/union_eyes_db_pre_migration.dump

# Restart application
systemctl start union-eyes

# Verify restoration
psql -d union_eyes_db -c "SELECT COUNT(*) FROM member_roles WHERE role_code IN ('president', 'vice_president', 'secretary_treasurer');"
# Expected: 0 (no new executive roles)
```

### Rollback Method B: SQL Script (Selective Revert)

```sql
-- ROLLBACK SCRIPT - Use with caution!

BEGIN;

-- Step 1: Restore organization_members.role from backup temp table
UPDATE organization_members om
SET 
  role = b.old_role,
  updated_at = NOW()
FROM role_upgrade_backup b
WHERE om.id = b.member_id;

-- Step 2: Delete newly created member_roles records
DELETE FROM member_roles
WHERE created_at >= '2026-02-11 09:00:00'  -- Replace with migration start time
  AND role_code IN ('president', 'vice_president', 'secretary_treasurer', 'chief_steward', 'bargaining_committee', 'health_safety_rep');

-- Step 3: Re-activate expired roles
UPDATE member_roles
SET 
  status = 'active',
  end_date = NULL,
  updated_at = NOW()
WHERE end_date >= '2026-02-11 09:00:00'  -- Replace with migration start time
  AND status = 'expired';

-- Step 4: Audit log entry
INSERT INTO audit_log (tenant_id, user_id, action, resource_type, details, timestamp)
VALUES (
  'system',
  'admin',
  'role_migration_rollback',
  'member_roles',
  '{"reason": "Critical issue detected during validation", "rollback_time": "2026-02-11T11:00:00Z"}',
  NOW()
);

-- Verify rollback
SELECT COUNT(*) FROM member_roles WHERE role_code IN ('president', 'vice_president', 'secretary_treasurer');
-- Expected: 0 or original count before migration

COMMIT;  -- Only if verification looks correct
-- ROLLBACK;  -- If verification fails
```

---

## Post-Migration

### Step 6.1: Communicate Changes

**Email to Administrators:**

```
Subject: Role Migration Complete - [Organization Name]

Dear Administrators,

The role migration for [Organization Name] has been completed successfully.

SUMMARY:
- Upgraded Roles: 6
- Duration: 18 minutes
- Validation: All checks passed
- Rollback Required: No

NEW EXECUTIVE ROLES:
- John President → President (CBA signatory, board chair)
- Jane Vice Pres → Vice President (succession planning)
- Bob Treasurer → Secretary-Treasurer (financial officer)
- Mary Chief → Chief Steward (supervises stewards)
- Tom Safety → Health & Safety Rep (workplace safety)
- Sue Bargain → Bargaining Committee (contract negotiations)

WHAT'S CHANGED:
- Members have new role badges in profiles
- Enhanced permissions for executive functions
- Improved audit trail for CBA and financial actions

WHAT HASN'T CHANGED:
- All existing permissions preserved
- UI navigation remains the same
- No user re-authentication required

DOCUMENTATION:
- Role descriptions: [Link to Union Role Assignment Guide]
- Permission matrix: [Link to RBAC Gap Closure Report]

If you have questions, reply to this email.

Best regards,
[Your Name]
```

### Step 6.2: Monitor for Issues

For the next 7 days, monitor:

- [ ] Error logs for permission-related errors
- [ ] User support tickets mentioning roles or permissions
- [ ] Audit log for unusual role changes
- [ ] Database performance (role checks should remain fast)

### Step 6.3: Schedule Follow-Up Migrations

If this was a pilot migration, schedule remaining organizations:

```markdown
# Remaining Migration Schedule

| Week | Organizations | Members | Estimated Duration |
|------|---------------|---------|-------------------|
| 1 (Pilot) | CUPE Local 79 | 342 | 4 hours | ✅ COMPLETE
| 2 | Unifor Local 555, UFCW Local 1006A | 800 | 6 hours |
| 3 | SteelWorkers Local 1005, CAW Local 222 | 1,200 | 8 hours |
| 4 | Remaining 15 organizations | 3,500 | 12 hours |
```

---

## Troubleshooting

### Issue 1: Script Fails with "Member Not Found"

**Symptoms:** `upgrade-member-role.sql` throws error: "Member with ID abc-123 not found"

**Cause:** Incorrect `member_id` or member doesn't exist in this organization

**Solution:**
```sql
-- Verify member exists
SELECT id, name, tenant_id, status
FROM organization_members
WHERE id = 'abc-123';

-- If wrong ID, find correct one:
SELECT id, name, email
FROM organization_members
WHERE name ILIKE '%President%'
  AND tenant_id = 'org-1';
```

---

### Issue 2: API Returns 403 Forbidden

**Symptoms:** `POST /api/members/[id]/roles` returns error: "Insufficient permissions to assign role: president"

**Cause:** Current user lacks authorization to assign this role

**Solution:**
- Verify you're using an `admin` account (token with role='admin')
- Check user's role: `SELECT role FROM organization_members WHERE id = 'your-user-id'`
- If using `president` role, you can only assign roles up to `officer` (level 60)
- For executive role assignments, use `admin` credentials

---

### Issue 3: Validation Check Fails - "Duplicate Active Roles"

**Symptoms:** Validation script reports multiple active roles for same member in same scope

**Cause:** Previous migration attempt didn't complete cleanly, or manual SQL update created duplicates

**Solution:**
```sql
-- Find duplicates
SELECT member_id, role_code, scope_type, scope_value, COUNT(*)
FROM member_roles
WHERE status = 'active'
GROUP BY member_id, role_code, scope_type, scope_value
HAVING COUNT(*) > 1;

-- Expire older duplicate (keep most recent)
WITH dupe_roles AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY member_id, role_code, scope_type, scope_value ORDER BY created_at DESC) AS rn
  FROM member_roles
  WHERE status = 'active'
)
UPDATE member_roles
SET status = 'expired', end_date = NOW(), updated_at = NOW()
WHERE id IN (SELECT id FROM dupe_roles WHERE rn > 1);

-- Re-run validation
\i scripts/role-migration/validate-role-assignments.sql
```

---

### Issue 4: Organization Has Multiple "President" Candidates

**Symptoms:** Identification script shows 2+ members with name matching "President"

**Cause:** Historical names, multiple locations, or ambiguous name patterns

**Solution:**
1. **Review manually:** Contact union leadership to confirm current president
2. **Check activity:** Who has most recent CBA signatures, board meeting attendance?
3. **Verify email:** Current president should have official union email
4. **Document decision:** Add note to migration decision log explaining choice
5. **Update other candidates:** Assign appropriate alternate role (e.g., vice_president, officer, member)

---

### Issue 5: Batch Migration Shows "Skipped" Results

**Symptoms:** Batch API returns `"skipped": 5` in summary

**Cause:** Members already have the target role, or members are inactive

**Solution:**
- Review `results` array in API response for `skipReason` field
- Common skip reasons:
  - "Member already has president in global scope" → Expected, no action needed
  - "Member is inactive, skipping" → Member account disabled, verify if intentional
  - "Member not found in organization" → Check `tenant_id` in batch JSON

---

## FAQ

### Q1: Can I rollback a single role assignment?

**A:** Yes. Use the rollback procedure in `upgrade-member-role.sql` comments, or manually:

```sql
BEGIN;

-- Find the role assignment
SELECT id, member_id, role_code, created_at
FROM member_roles
WHERE member_id = 'abc-123'
  AND role_code = 'president'
ORDER BY created_at DESC
LIMIT 1;

-- Delete the assignment
DELETE FROM member_roles WHERE id = 'role-assignment-id';

-- Restore previous role in organization_members
UPDATE organization_members
SET role = 'officer', updated_at = NOW()
WHERE id = 'abc-123';

-- Audit log
INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, details, timestamp)
VALUES ('org-1', 'admin', 'role_assignment_reverted', 'member_role', 'abc-123', 
  '{"reason": "Incorrect assignment", "reverted_role": "president"}', NOW());

COMMIT;
```

---

### Q2: How long does each migration method take?

| Method | Setup Time | Execution Time per Role | Best For |
|--------|------------|------------------------|----------|
| Manual SQL | 5 min | 2-3 min | 1-5 roles, learning |
| Single API | 10 min | 30 sec | 5-20 roles, automation |
| Batch API | 15 min | 5 sec | 20+ roles, efficiency |

---

### Q3: What happens to old permissions?

**A:** Old permissions are **preserved and enhanced**:

- Members assigned to new executive roles gain additional permissions (e.g., SIGN_CBA for President)
- Existing permissions from old role remain active
- Lower-level global roles are automatically expired (e.g., if upgraded from `officer` to `president`, old `officer` role is expired)
- Scoped roles (e.g., `steward` for department) remain active alongside new global roles

---

### Q4: Can a member have multiple roles?

**A:** Yes, with restrictions:

- ✅ **Allowed:** Different scopes (e.g., `president` global + `steward` in Manufacturing department)
- ✅ **Allowed:** Multiple specialized roles (e.g., `health_safety_rep` + `bargaining_committee`)
- ❌ **Not allowed:** Same role in same scope (e.g., two `president` global roles)
- ❌ **Not recommended:** Multiple executive roles at same level (e.g., `president` + `vice_president` would be unusual)

---

### Q5: How do I handle term limits and elections?

**A:** Use `term_years` and `election_date` fields:

```bash
# Assign elected role with 3-year term
curl -X POST "$API_URL/api/members/$MEMBER_ID/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleCode": "president",
    "assignmentType": "elected",
    "electionDate": "2025-06-01T00:00:00Z",
    "termYears": 3,
    "voteCount": 145,
    "totalVotes": 200,
    "reason": "Elected president, 72.5% vote share"
  }'
```

System automatically calculates `nextElectionDate` (June 2028).

---

### Q6: What if validation checks show warnings?

**A:** Warnings are **informational, not failures**:

- **Review each warning** to determine if expected (e.g., small org without president)
- **Document exceptions** in migration log (e.g., "Local 555 has no president due to recent retirement")
- **Proceed with migration** if warnings are acceptable
- **Address issues** if warnings indicate data problems (e.g., elected role missing election_date)

---

### Q7: Can I test migration without affecting production?

**A:** Yes, three approaches:

1. **Dry run mode (Batch API):** Set `"dryRun": true` in batch request
2. **Staging environment:** Run full migration on staging database first
3. **Manual transaction:** Use `BEGIN; ... ROLLBACK;` instead of `COMMIT;` in SQL

---

### Q8: How do I assign an acting role?

**A:** Set `isActingRole: true` and provide acting context:

```bash
curl -X POST "$API_URL/api/members/$MEMBER_ID/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleCode": "president",
    "isActingRole": true,
    "actingForMemberId": "original-president-id",
    "actingReason": "President on medical leave",
    "actingStartDate": "2026-02-01T00:00:00Z",
    "actingEndDate": "2026-05-01T00:00:00Z",
    "reason": "Temporary delegation due to medical leave"
  }'
```

---

## Appendix A: Quick Reference

### Role Codes
- `admin` → IT administrator
- `president` → Union president
- `vice_president` → Deputy
- `secretary_treasurer` → Financial officer
- `chief_steward` → Supervises stewards
- `officer` → Board members
- `steward` → Department representatives
- `bargaining_committee` → Contract negotiations
- `health_safety_rep` → Workplace safety
- `member` → Base membership

### Scope Types
- `global` → Organization-wide authority
- `department` → Specific department (e.g., "Manufacturing")
- `location` → Specific location (e.g., "Plant 2")
- `shift` → Specific shift (e.g., "Night Shift")
- `chapter` → Specific chapter (e.g., "Chapter A")

### Assignment Types
- `elected` → Elected by membership (track elections)
- `appointed` → Appointed by executive or board
- `acting` → Temporary delegation (requires actingForMemberId)
- `emergency` → Emergency appointment (unusual circumstances)

---

## Appendix B: File Locations

| File | Path |
|------|------|
| Candidate Identification | `scripts/role-migration/identify-upgrade-candidates.sql` |
| Upgrade Procedure | `scripts/role-migration/upgrade-member-role.sql` |
| Validation Script | `scripts/role-migration/validate-role-assignments.sql` |
| Single Role API | `app/api/members/[memberId]/roles/route.ts` |
| Batch Role API | `app/api/admin/roles/batch/route.ts` |
| RBAC Report | `docs/security/RBAC_GAP_CLOSURE_REPORT.md` |
| Admin Guide | `docs/guides/UNION_ROLE_ASSIGNMENT_GUIDE.md` |
| This Playbook | `docs/guides/ROLE_MIGRATION_PLAYBOOK.md` |

---

**END OF PLAYBOOK**

For questions or issues not covered in this playbook, contact:
- System Administrator: [Your Email]
- Database Administrator: [DBA Email]
- IT Support: [Support Email]
