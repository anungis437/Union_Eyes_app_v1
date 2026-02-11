# Database Evidence Snapshot
**Union Eyes Application - v2.0.0-rc1**  
**Purpose:** Runtime verification that migrations 0062-0065 are applied to live database  
**Last Updated:** February 11, 2026

---

## ⚠️ IMPORTANT: This Document Must Be Updated Per Environment

This template shows the **expected SQL queries and outputs**. Database administrators must:

1. Run these queries on each environment (Dev, Staging, Production)
2. Document the actual output below
3. Sign off on verification
4. Update this file with real timestamps and results

---

## Quick Verification Status

| Environment | Status | Verified By | Date | Notes |
|------------|--------|-------------|------|-------|
| **Development** | ⚠️ PENDING | [DBA Name] | [Date] | [Link to evidence] |
| **Staging** | ⚠️ PENDING | [DBA Name] | [Date] | [Link to evidence] |
| **Production** | ⚠️ PENDING | [DBA Name] | [Date] | [Link to evidence] |

---

## Migration 0062: Immutable Transition History

### Evidence Required

**Query 1: Verify tables exist**
```sql
SELECT 
  table_schema,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE columns.table_schema = tables.table_schema 
   AND columns.table_name = tables.table_name) AS column_count
FROM information_schema.tables
WHERE table_schema = 'grievances'
  AND table_name IN ('grievance_transitions', 'grievance_approvals')
ORDER BY table_name;
```

**Expected Output:**
```
 table_schema |      table_name        | column_count 
--------------+------------------------+--------------
 grievances   | grievance_approvals    |     8
 grievances   | grievance_transitions  |     9
(2 rows)
```

**Actual Output (Development):**
```
[PENDING: DBA TO POPULATE]
```

**Actual Output (Staging):**
```
[PENDING: DBA TO POPULATE]
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

**Query 2: Verify indexes exist**
```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'grievances'
  AND tablename IN ('grievance_transitions', 'grievance_approvals')
ORDER BY tablename, indexname;
```

**Expected Output:**
```
 schemaname |      tablename         |           indexname
------------+------------------------+-------------------------------
 grievances | grievance_approvals    | grievance_approvals_pkey
 grievances | grievance_approvals    | idx_grievance_approvals_...
 grievances | grievance_transitions  | grievance_transitions_pkey
 grievances | grievance_transitions  | idx_grievance_transitions_...
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

## Migration 0063: Audit Log Archive Support

### Evidence Required

**Query: Verify archive columns exist**
```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'audit_security'
  AND table_name = 'audit_logs'
  AND column_name IN ('archived', 'archived_at', 'archived_path')
ORDER BY column_name;
```

**Expected Output:**
```
   column_name   |          data_type           | is_nullable | column_default 
-----------------+------------------------------+-------------+----------------
 archived        | boolean                      | NO          | false
 archived_at     | timestamp with time zone     | YES         | NULL
 archived_path   | text                         | YES         | NULL
(3 rows)
```

**Actual Output (Development):**
```
[PENDING: DBA TO POPULATE]
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

**Query: Verify archive functionality (sample data)**
```sql
SELECT 
  COUNT(*) FILTER (WHERE archived = false) AS active_logs,
  COUNT(*) FILTER (WHERE archived = true) AS archived_logs,
  COUNT(*) AS total_logs,
  MAX(archived_at) AS last_archive_operation
FROM audit_security.audit_logs;
```

**Expected Output (example):**
```
 active_logs | archived_logs | total_logs | last_archive_operation
-------------+---------------+------------+------------------------
      15234  |           0   |   15234    | NULL
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

## Migration 0064: Immutability Triggers (CRITICAL)

### Evidence Required

**Query 1: Verify functions exist**
```sql
SELECT 
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_functiondef(p.oid) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('reject_mutation', 'audit_log_immutability_guard');
```

**Expected Output:**
```
        function_name         | return_type |  definition_preview
------------------------------+-------------+--------------------
 reject_mutation              | trigger     | CREATE OR REPLACE...
 audit_log_immutability_guard | trigger     | CREATE OR REPLACE...
(2 rows)
```

**Actual Output (Development):**
```
[PENDING: DBA TO POPULATE]
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

**Query 2: Verify triggers exist on protected tables**
```sql
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  t.tgname AS trigger_name,
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
  END AS trigger_event,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
  END AS trigger_status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname IN ('reject_mutation', 'audit_log_immutability_guard')
ORDER BY n.nspname, c.relname, t.tgname;
```

**Expected Output (at least 5 triggers):**
```
 schema_name  |      table_name         |          trigger_name             |      function_name           | trigger_timing | trigger_event | trigger_status
--------------+-------------------------+-----------------------------------+------------------------------+----------------+---------------+----------------
 audit_security | audit_logs            | prevent_audit_log_mutation        | audit_log_immutability_guard | BEFORE         | UPDATE        | ENABLED
 claims       | claim_updates           | prevent_claim_update_mutation     | reject_mutation              | BEFORE         | UPDATE        | ENABLED
 grievances   | grievance_approvals     | prevent_grievance_approval_...    | reject_mutation              | BEFORE         | UPDATE        | ENABLED
 grievances   | grievance_transitions   | prevent_grievance_transition_...  | reject_mutation              | BEFORE         | UPDATE        | ENABLED
 voting       | votes                   | prevent_vote_mutation             | reject_mutation              | BEFORE         | UPDATE        | ENABLED
(5+ rows)
```

**Actual Output (Development):**
```
[PENDING: DBA TO POPULATE]
```

**Actual Output (Production - CRITICAL):**
```
[PENDING: DBA TO POPULATE]
```

---

**Query 3: FUNCTIONAL TEST - Attempt to modify immutable record**
```sql
-- This query MUST FAIL with error message
-- Test immutability enforcement on grievance_transitions
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Try to update an immutable record (should fail)
  UPDATE grievances.grievance_transitions 
  SET from_status = to_status 
  WHERE id = (SELECT id FROM grievances.grievance_transitions LIMIT 1);
  
  test_result := '❌ IMMUTABILITY BROKEN: Update succeeded (should have failed)';
  RAISE EXCEPTION '%', test_result;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%cannot modify immutable%' OR SQLERRM LIKE '%reject_mutation%' THEN
    RAISE NOTICE '✅ IMMUTABILITY VERIFIED: Trigger correctly prevented mutation';
  ELSE
    RAISE NOTICE '⚠️ UNEXPECTED ERROR: %', SQLERRM;
  END IF;
END $$;
```

**Expected Output:**
```
NOTICE:  ✅ IMMUTABILITY VERIFIED: Trigger correctly prevented mutation
DO
```

**Actual Output (Production - CRITICAL):**
```
[PENDING: DBA TO POPULATE]
```

---

## Migration 0065: Governance Tables

### Evidence Required

**Query 1: Verify governance schema exists**
```sql
SELECT 
  schema_name,
  schema_owner,
  catalog_name
FROM information_schema.schemata
WHERE schema_name = 'governance';
```

**Expected Output:**
```
 schema_name | schema_owner |  catalog_name
-------------+--------------+----------------
 governance  | postgres     | union_eyes_db
(1 row)
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

**Query 2: Verify all governance tables exist**
```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE columns.table_schema = 'governance' 
   AND columns.table_name = tables.table_name) AS column_count,
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE schemaname = 'governance' 
   AND tablename = tables.table_name) AS index_count
FROM information_schema.tables
WHERE table_schema = 'governance'
ORDER BY table_name;
```

**Expected Output:**
```
      table_name         | column_count | index_count
-------------------------+--------------+-------------
 council_elections       |     10       |     3
 golden_shares           |     8        |     2
 mission_audits          |     12       |     4
 reserved_matter_votes   |     9        |     3
(4 rows)
```

**Actual Output (Development):**
```
[PENDING: DBA TO POPULATE]
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

**Query 3: Verify foreign key relationships**
```sql
SELECT
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'governance'
ORDER BY tc.table_name, kcu.column_name;
```

**Expected Output (example):**
```
     source_table        | source_column  | referenced_table | referenced_column
-------------------------+----------------+------------------+-------------------
 council_elections       | organization_id| organizations    | id
 golden_shares           | organization_id| organizations    | id
 mission_audits          | auditor_id     | users            | id
 reserved_matter_votes   | vote_session_id| voting_sessions  | id
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

## Comprehensive Health Check

### All Migrations Status Check
```sql
-- Query drizzle migration tracker (if using Drizzle)
SELECT 
  id,
  hash,
  created_at
FROM drizzle.__drizzle_migrations
WHERE id >= 62 AND id <= 65
ORDER BY id;
```

**Expected Output:**
```
 id  |         hash         |          created_at
-----+----------------------+-----------------------------
  62 | [hash_0062]          | [timestamp]
  63 | [hash_0063]          | [timestamp]
  64 | [hash_0064]          | [timestamp]
  65 | [hash_0065]          | [timestamp]
(4 rows)
```

**Actual Output (Production):**
```
[PENDING: DBA TO POPULATE]
```

---

## Compliance Sign-Off

### Development Environment
- **Database Administrator:** [Name]  
- **Verification Date:** [Date]  
- **All Assertions Verified:** [ ] YES [ ] NO  
- **Issues Encountered:** [None / Description]  
- **Signature:** _________________________  

### Staging Environment
- **Database Administrator:** [Name]  
- **Verification Date:** [Date]  
- **All Assertions Verified:** [ ] YES [ ] NO  
- **Issues Encountered:** [None / Description]  
- **Signature:** _________________________  

### Production Environment (CRITICAL)
- **Database Administrator:** [Name]  
- **Verification Date:** [Date]  
- **All Assertions Verified:** [ ] YES [ ] NO  
- **Issues Encountered:** [None / Description]  
- **Immutability Test Passed:** [ ] YES [ ] NO  
- **Compliance Officer Sign-Off:** [ ] YES [ ] NO  
- **Signature (DBA):** _________________________  
- **Signature (Compliance):** _________________________  

---

## Evidence Retention

### Document Storage
- **Development Evidence:** `docs/audit/evidence/dev-migration-verification-[date].pdf`
- **Staging Evidence:** `docs/audit/evidence/staging-migration-verification-[date].pdf`
- **Production Evidence:** `docs/audit/evidence/prod-migration-verification-[date].pdf`

### Retention Period
- **Minimum:** 7 years (compliance requirement)
- **Recommendation:** Indefinite (demonstrates due diligence)

### Access Control
- **Classification:** INTERNAL - CONFIDENTIAL
- **Access:** DBA, Compliance Officer, Technical Lead, External Auditors (with approval)

---

## Automated Verification Script Results

Include output from running `scripts/verify-migrations.sql`:

```bash
psql -h [DB_HOST] -U [DB_USER] -d [DB_NAME] -f scripts/verify-migrations.sql > migration-verification-output-[ENV]-[DATE].txt
```

**Attach file or paste output below:**

```
[PENDING: ATTACH VERIFICATION SCRIPT OUTPUT]
```

---

## Compliance Mapping Evidence

### SOC 2 Type II Requirements
- **CC6.3 (Audit Log Integrity):** Migration 0064 evidence above demonstrates immutability
- **CC8.1 (Change Control):** This document provides change verification audit trail

### GDPR Requirements
- **Article 5.2 (Accountability):** Immutable audit logs verified operational
- **Article 30 (Records of Processing):** Audit table structure documented

### Labor Law Requirements
- **Grievance History Integrity:** Immutability triggers verified on grievance tables

---

## Next Review Date

**Scheduled Review:** [Date + 90 days]  
**Reviewer:** [Database Administrator Name]  
**Purpose:** Verify migrations remain applied, no drift occurred

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-11 | Repository Validation Team | Initial template created |
| 1.1 | [Date] | [DBA Name] | Added development environment evidence |
| 1.2 | [Date] | [DBA Name] | Added staging environment evidence |
| 1.3 | [Date] | [DBA Name] | Added production environment evidence |

---

**Document Classification:** INTERNAL - CONFIDENTIAL  
**Retention Period:** 7 years minimum (compliance requirement)  
**Review Frequency:** Quarterly or after any migration application

---

**End of Database Evidence Snapshot**
