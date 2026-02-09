# Clerk User ID Migration Checklist

**Migration ID:** 0055  
**Status:** ✅ **COMPLETED - Staging Database (2024)**  
**Database:** unioneyes-staging-db (Azure PostgreSQL)  
**Success Report:** [0055_MIGRATION_SUCCESS_REPORT.md](../../db/migrations/0055_MIGRATION_SUCCESS_REPORT.md)

## Goal

Ensure all user identifier columns migrated from UUID to Clerk string IDs (`varchar(255)`) are aligned and data remains valid.

## Before Migration

- ✅ Confirm backup completed for the target database.
- ✅ Verify application is running the target schema branch.
- ⚠️ Pause background jobs that write to claims, grievance, and training tables. (Not applicable for staging)

## Apply Migration

- ✅ Apply core migration: `db/migrations/0055_align_user_ids_to_clerk.sql` - **COMMITTED successfully**

## Schema Validation

- ✅ Run validation script:
  - `pnpm tsx scripts/validate-clerk-user-ids.ts`
- ✅ Ensure all expected columns report `character varying` (and arrays report `_varchar`).
  - **Result:** 16/16 columns converted successfully
  - **Missing tables:** grievance_*, traditional_knowledge_registry (not deployed to staging - expected)

## Data Quality Checks

Run these checks and resolve any failures:

```sql
-- Check for non-Clerk values (optional pattern check)
SELECT 'claims.member_id' AS column, COUNT(*) AS invalid_count
FROM claims
WHERE member_id IS NOT NULL AND member_id NOT LIKE 'user_%'
UNION ALL
SELECT 'grievance_assignments.assigned_to', COUNT(*)
FROM grievance_assignments
WHERE assigned_to IS NOT NULL AND assigned_to NOT LIKE 'user_%'
UNION ALL
SELECT 'grievance_assignments.assigned_by', COUNT(*)
FROM grievance_assignments
WHERE assigned_by IS NOT NULL AND assigned_by NOT LIKE 'user_%';

-- Check array column for invalid values
SELECT COUNT(*) AS invalid_count
FROM grievance_communications
WHERE to_user_ids IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(to_user_ids) AS v
    WHERE v NOT LIKE 'user_%'
  );
```

## Application Validation

- [ ] Run targeted integration tests or smoke tests for:
  - Claims creation and updates
  - Grievance assignment/document upload flows
  - Training registrations and program enrollments
- [ ] Verify audit logs capture Clerk user IDs in new writes.

## Rollback Plan

- [ ] If rollback is needed, restore from backup.
- [ ] Log any manual corrections and re-run the validation script after restore.
