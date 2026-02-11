# Migration Verification Guide
**Union Eyes Application - RC-1**  
**Last Updated:** February 11, 2026

## Purpose

This guide provides step-by-step instructions for verifying that migrations 0062-0065 have been successfully applied to database environments.

---

## Quick Verification

### Run Automated Verification Script

```bash
# Production
psql -h production-db.example.com -U app_user -d union_eyes_prod -f scripts/verify-migrations.sql

# Staging
psql -h staging-db.example.com -U app_user -d union_eyes_staging -f scripts/verify-migrations.sql

# Development
psql -h localhost -U postgres -d union_eyes_dev -f scripts/verify-migrations.sql
```

**Expected Output:** All checks should show "✅ VERIFIED"

---

## Environment Status

### Production

| Migration | Status | Applied Date | Applied By | Verification |
|-----------|--------|--------------|------------|--------------|
| 0062 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0063 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0064 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0065 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |

**Action Required:** Database administrator must run verification script and update this table.

### Staging

| Migration | Status | Applied Date | Applied By | Verification |
|-----------|--------|--------------|------------|--------------|
| 0062 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0063 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0064 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0065 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |

### Development

| Migration | Status | Applied Date | Applied By | Verification |
|-----------|--------|--------------|------------|--------------|
| 0062 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0063 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0064 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |
| 0065 | ⚠️ **PENDING VERIFICATION** | TBD | TBD | Run verification script |

---

## Manual Verification Steps

If you cannot run the automated script, verify manually:

### Migration 0062: Immutable Transition History

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'grievances' 
  AND table_name IN ('grievance_transitions', 'grievance_approvals');

-- Should return 2 rows
```

**Expected:**
- `grievance_transitions` exists
- `grievance_approvals` exists

### Migration 0063: Audit Log Archive Support

```sql
-- Check archive columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'audit_security' 
  AND table_name = 'audit_logs' 
  AND column_name IN ('archived', 'archived_at', 'archived_path');

-- Should return 3 rows
```

**Expected:**
- `archived` column exists (boolean)
- `archived_at` column exists (timestamp)
- `archived_path` column exists (text)

### Migration 0064: Immutability Triggers

```sql
-- Check immutability functions exist
SELECT proname 
FROM pg_proc 
WHERE proname IN ('reject_mutation', 'audit_log_immutability_guard');

-- Should return 2 rows

-- Check triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%immutab%' OR trigger_name LIKE '%reject_mutation%';

-- Should return at least 5 triggers
```

**Expected:**
- `reject_mutation()` function exists
- `audit_log_immutability_guard()` function exists
- At least 5 immutability triggers installed

### Migration 0065: Governance Tables

```sql
-- Check governance schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'governance';

-- Should return 1 row

-- Check governance tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'governance' 
  AND table_name IN (
    'golden_shares', 
    'reserved_matter_votes', 
    'council_elections', 
    'mission_audits'
  );

-- Should return 4 rows
```

**Expected:**
- `governance` schema exists
- All 4 governance tables exist

---

## Rollback Procedures

If migrations need to be rolled back, use the scripts in `db/migrations/rollback/`:

### Before Rolling Back

1. **Create full database backup:**
   ```bash
   pg_dump -h DB_HOST -U DB_USER -d DB_NAME -F c -f backup_before_rollback_$(date +%Y%m%d_%H%M%S).dump
   ```

2. **Document reason for rollback** in incident log

3. **Get approval** from:
   - Database administrator
   - Technical lead
   - Compliance officer (for migration 0064)

### Rollback Order

⚠️ **IMPORTANT:** Roll back in **reverse order** (0065 → 0064 → 0063 → 0062)

```bash
# Step 1: Rollback 0065 (Governance Tables)
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/rollback/0065_rollback.sql

# Step 2: Rollback 0064 (Immutability Triggers) - REQUIRES COMPLIANCE APPROVAL
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/rollback/0064_rollback.sql

# Step 3: Rollback 0063 (Audit Log Archive)
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/rollback/0063_rollback.sql

# Step 4: Rollback 0062 (Immutable Transition History)
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/rollback/0062_rollback.sql
```

### After Rollback

1. **Verify rollback success** using verification script
2. **Update environment status table** in this document
3. **Notify stakeholders** of rollback completion
4. **Document lessons learned**

---

## Applying Migrations

If migrations are not yet applied, use the migration runner:

```bash
# Using Drizzle migrations
pnpm drizzle-kit push

# Or apply manually in order
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/0062_add_immutable_transition_history.sql
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/0063_add_audit_log_archive_support.sql
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/0064_add_immutability_triggers.sql
psql -h DB_HOST -U DB_USER -d DB_NAME -f db/migrations/0065_add_governance_tables.sql
```

---

## Compliance Notes

### Migration 0064: Immutability Triggers

This migration is **required for audit compliance**:
- **SOC 2 Type II:** Ensures audit log integrity
- **GDPR:** Provides immutable record-keeping
- **Labor Law:** Protects grievance history from tampering

**DO NOT roll back migration 0064 without legal/compliance approval.**

---

## Troubleshooting

### Verification Script Fails to Connect

**Problem:** `psql: FATAL: password authentication failed`

**Solution:**
1. Verify database credentials in `.env`
2. Check VPN connection to database
3. Confirm user has sufficient permissions

### Triggers Not Found

**Problem:** Verification shows "⚠️ PARTIAL/MISSING" for triggers

**Possible Causes:**
- Migration 0064 not applied
- Triggers were manually dropped
- Database restore from before migration

**Solution:**
1. Check migration history: `SELECT * FROM drizzle.__drizzle_migrations;`
2. If missing, apply migration: `psql -f db/migrations/0064_add_immutability_triggers.sql`
3. Re-run verification script

### Governance Schema Missing

**Problem:** `governance` schema does not exist

**Solution:**
- Migration 0065 not applied yet
- Apply manually: `psql -f db/migrations/0065_add_governance_tables.sql`

---

## Contact

For migration verification issues:
- **Database Team:** [DBA contact]
- **DevOps:** [DevOps contact]  
- **Compliance:** [Compliance contact]

---

**Last Verification Run:** *Pending - Please run verification script and update this document*
