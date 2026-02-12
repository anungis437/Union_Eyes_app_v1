# Chart of Accounts Consolidation - Action Plan
**Priority:** 🔴 CRITICAL  
**Impact:** Financial Data Integrity  
**Estimated Time:** 2-3 developer days + 1 week testing

---

## Critical Issue Summary

**Problem:** Code queries empty table (`clc_chart_of_accounts` with 0 rows) while data exists in `chart_of_accounts` (30 rows)

**Impact:**
- ❌ Remittance exports fail
- ❌ Financial reports return no accounts
- ❌ StatCan compliance broken
- ❌ Transaction mappings not found

---

## Immediate Actions (Today - 4 hours)

### 1. Emergency Code Fix ⚠️
**Priority:** P0 - BLOCKING PRODUCTION  
**Time:** 30 minutes

**File:** `services/clc/remittance-exporter.ts`

```typescript
// Line 7 - CHANGE THIS:
import { organizations, clcChartOfAccounts } from '@/db/schema';

// TO THIS:
import { organizations, chartOfAccounts } from '@/db/schema';
```

**Test:**
```bash
cd c:\APPS\Union_Eyes_app_v1
pnpm vitest run services/clc/remittance-exporter
```

**Deploy:** Immediately after tests pass

---

### 2. Add Deprecation Warning ⚠️
**Priority:** P1  
**Time:** 30 minutes

**File:** `db/schema/clc-per-capita-schema.ts` (Line 112)

Add deprecation comment:
```typescript
/**
 * @deprecated Use chartOfAccounts from @/db/schema instead
 * 
 * WARNING: This table exists in DB but is EMPTY (0 rows).
 * All CLC standard accounts are in chart_of_accounts table.
 * 
 * Migration: Will be dropped in version 2.1.0
 * See: CHART_OF_ACCOUNTS_DUPLICATION_ANALYSIS.md
 */
export const clcChartOfAccounts = pgTable(
  'clc_chart_of_accounts',
  { /* ... */ }
);
```

---

### 3. Verify Database State 🔍
**Priority:** P1  
**Time:** 15 minutes

```sql
-- Should return 30 rows
SELECT COUNT(*) FROM chart_of_accounts WHERE is_clc_standard = TRUE;

-- Should return 0 rows
SELECT COUNT(*) FROM clc_chart_of_accounts;

-- Check for broken remittances
SELECT COUNT(*) 
FROM per_capita_remittances 
WHERE clc_account_code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE account_code = per_capita_remittances.clc_account_code
  );
-- Should return 0 (no orphaned references)
```

---

### 4. Search for Other Bad Imports 🔍
**Priority:** P1  
**Time:** 15 minutes

```powershell
# Find all files still importing clcChartOfAccounts
Get-ChildItem -Recurse -Include *.ts,*.tsx | 
  Select-String "clcChartOfAccounts" | 
  Where-Object { $_.Line -notmatch "export.*clcChartOfAccounts" } |
  Select-Object Path, LineNumber, Line
```

**Expected Result:** Only definition in `clc-per-capita-schema.ts`

---

## This Week (Days 2-5)

### Day 2: Create Deprecation Migration
**Priority:** P1  
**Time:** 2 hours

**File:** `db/migrations/1770880400000_deprecate_clc_chart_of_accounts.sql`

```sql
-- Add deprecation comment to table
COMMENT ON TABLE clc_chart_of_accounts IS 
  'DEPRECATED: Use chart_of_accounts instead. Table is empty and will be dropped in v2.1.0';

-- Prevent accidental inserts
ALTER TABLE clc_chart_of_accounts 
ADD CONSTRAINT deprecated_no_inserts 
CHECK (id IS NULL);

-- Add notice function
CREATE OR REPLACE FUNCTION warn_deprecated_clc_chart()
RETURNS TRIGGER AS $$
BEGIN
  RAISE WARNING 'clc_chart_of_accounts is DEPRECATED. Use chart_of_accounts instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach warning trigger
CREATE TRIGGER warn_on_clc_chart_query
BEFORE SELECT ON clc_chart_of_accounts
FOR EACH STATEMENT
EXECUTE FUNCTION warn_deprecated_clc_chart();
```

**Test:**
```bash
psql -f db/migrations/1770880400000_deprecate_clc_chart_of_accounts.sql
```

---

### Day 3: Update Documentation
**Priority:** P2  
**Time:** 3 hours

**Files to Update:**
1. `docs/API_DOCUMENTATION_SCHEMA_CONSOLIDATION_GUIDE.md`
2. `docs/implementation/WEEK1_TASK3_PER_CAPITA_SERVICE.md`
3. `SCHEMA_REVIEW_2026-02-13.md`

**Changes:**
- Replace all `clcChartOfAccounts` examples with `chartOfAccounts`
- Add migration guide section
- Update code samples

---

### Day 4: Full Test Suite
**Priority:** P1  
**Time:** 4 hours

```bash
# Run affected tests
pnpm vitest run services/clc
pnpm vitest run __tests__/services/clc
pnpm vitest run __tests__/clc-per-capita.test.ts

# Run integration tests
pnpm vitest run __tests__/integration

# Full coverage
pnpm test:coverage

# Type check
pnpm type-check
```

**Success Criteria:**
- ✅ All tests passing
- ✅ Zero TypeScript errors
- ✅ No runtime exceptions in logs

---

### Day 5: Deploy to Staging
**Priority:** P1  
**Time:** 2 hours

**Steps:**
1. Deploy code changes
2. Run deprecation migration
3. Smoke test remittance exports
4. Check application logs for warnings
5. Monitor for 24 hours

---

## Next Week (Drop Table)

### Day 8: Create Drop Migration
**Priority:** P2  
**Time:** 1 hour

**File:** `db/migrations/1770880500000_drop_clc_chart_of_accounts.sql`

```sql
-- Remove deprecation trigger
DROP TRIGGER IF EXISTS warn_on_clc_chart_query ON clc_chart_of_accounts;
DROP FUNCTION IF EXISTS warn_deprecated_clc_chart();

-- Remove check constraint
ALTER TABLE clc_chart_of_accounts 
DROP CONSTRAINT IF EXISTS deprecated_no_inserts;

-- Drop table
DROP TABLE IF EXISTS clc_chart_of_accounts CASCADE;

-- Clean up indexes (if they still exist)
DROP INDEX IF EXISTS idx_clc_accounts_code;
DROP INDEX IF EXISTS idx_clc_accounts_parent;
DROP INDEX IF EXISTS idx_clc_accounts_type;
DROP INDEX IF EXISTS idx_coa_code;
DROP INDEX IF EXISTS idx_coa_parent;
DROP INDEX IF EXISTS idx_coa_type;
```

---

### Day 9: Deploy to Production
**Priority:** P1  
**Time:** 2 hours

**Pre-deployment Checklist:**
- [ ] Staging stable for 7 days
- [ ] No errors in staging logs
- [ ] All tests passing in CI/CD
- [ ] Backup production database
- [ ] Rollback plan documented

**Deployment:**
1. Announce maintenance window
2. Deploy drop migration
3. Verify table no longer exists
4. Full smoke test
5. Monitor for 24 hours

---

## Later (Weeks 2-4)

### ERP Schema Cleanup
**Priority:** P3  
**Time:** 4 hours

**Decision:** Rename ERP schema to avoid confusion

**File:** `db/schema/domains/infrastructure/erp.ts`

```typescript
// Rename from chartOfAccounts to erpChartOfAccounts
export const erpChartOfAccounts = pgTable('erp_chart_of_accounts', {
  // Keep existing columns
  // This is ERP-scoped (QuickBooks, Xero, Sage)
  // Separate from CLC standard accounts
});
```

**Create Migration:**
```sql
ALTER TABLE chart_of_accounts 
RENAME TO erp_chart_of_accounts;

-- Update foreign keys in gl_account_mappings
ALTER TABLE gl_account_mappings 
  DROP CONSTRAINT gl_account_mappings_erp_account_id_fkey,
  ADD CONSTRAINT gl_account_mappings_erp_account_id_fkey
    FOREIGN KEY (erp_account_id) 
    REFERENCES erp_chart_of_accounts(id);
```

---

## Verification Checklist

### After Emergency Fix (Today)
- [ ] `remittance-exporter.ts` imports `chartOfAccounts`
- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] Deployed to production

### After Deprecation (Day 2)
- [ ] Migration applied
- [ ] Database constraint active
- [ ] Warning trigger works
- [ ] No accidental inserts possible

### After Table Drop (Day 9)
- [ ] Table no longer exists
- [ ] No references in code
- [ ] All tests still passing
- [ ] Production stable

### After ERP Rename (Week 3)
- [ ] No naming conflicts
- [ ] Clear separation of concerns
- [ ] Documentation updated
- [ ] All tests passing

---

## Rollback Procedures

### If Emergency Fix Breaks Production
```bash
git revert <commit-hash>
pnpm build
pnpm deploy

# Restore old code
git checkout HEAD~1 services/clc/remittance-exporter.ts
```

### If Drop Migration Causes Issues
```sql
-- Recreate table from backup
CREATE TABLE clc_chart_of_accounts AS 
SELECT * FROM chart_of_accounts 
WHERE is_clc_standard = TRUE;

-- Restore indexes
CREATE INDEX idx_clc_accounts_code ON clc_chart_of_accounts(account_code);
CREATE INDEX idx_clc_accounts_parent ON clc_chart_of_accounts(parent_account_code);
CREATE INDEX idx_clc_accounts_type ON clc_chart_of_accounts(account_type);
```

---

## Communication Plan

### Stakeholders to Notify
1. **Development Team** - Today
   - Share this action plan
   - Assign code review tasks
   - Schedule deployment windows

2. **QA Team** - Day 2
   - Test remittance exports
   - Verify financial reports
   - Check StatCan compliance

3. **DevOps Team** - Day 4
   - Schedule deployment windows
   - Backup database
   - Monitor logs and metrics

4. **Product Owner** - Day 5
   - Status update
   - Risk assessment
   - Timeline confirmation

---

## Success Metrics

### Code Quality
- ✅ Zero imports of `clcChartOfAccounts` (except definition)
- ✅ All files use `chartOfAccounts` from main schema
- ✅ 100% test coverage for chart of accounts functions

### Database Health
- ✅ Single source of truth: `chart_of_accounts`
- ✅ 30 CLC standard accounts seeded
- ✅ No orphaned references
- ✅ No duplicate tables

### System Reliability
- ✅ Remittance exports working
- ✅ Financial reports accurate
- ✅ StatCan compliance maintained
- ✅ Zero production errors

---

## Cost Estimate

**Developer Time:**
- Emergency fix: 4 hours
- Week 1 tasks: 11 hours
- Week 2 deployment: 3 hours
- ERP cleanup: 4 hours
- **Total:** 22 hours (2.75 days)

**Testing Time:**
- Unit tests: 2 hours
- Integration tests: 3 hours
- Smoke tests: 2 hours
- **Total:** 7 hours

**QA Time:**
- Test plan: 2 hours
- Execution: 4 hours
- Regression: 3 hours
- **Total:** 9 hours

**Grand Total:** 38 hours (4.75 developer-days)

**Timeline:** 3 weeks (with 1 week monitoring between phases)

---

## Next Steps

1. **Immediately:** Fix `remittance-exporter.ts` import
2. **Today:** Run verification queries
3. **Tomorrow:** Create deprecation migration
4. **This Week:** Deploy to staging
5. **Next Week:** Drop deprecated table
6. **Weeks 2-4:** ERP schema cleanup

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-12  
**Owner:** Development Team Lead  
**Status:** 🔴 READY FOR EXECUTION
