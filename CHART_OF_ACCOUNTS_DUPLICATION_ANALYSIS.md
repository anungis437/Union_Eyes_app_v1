# Chart of Accounts Schema Duplication - Comprehensive Analysis
**Generated:** 2026-02-12  
**Status:** ⚠️ CRITICAL - Multiple Duplicate Definitions Found  
**Impact:** Financial Data Integrity Risk

---

## Executive Summary

**Finding:** Three (3) distinct chart of accounts table definitions exist across the codebase, creating confusion, data fragmentation, and potential financial reporting errors.

**Critical Issues:**
- ✅ `chart_of_accounts` table exists in database WITH DATA (30 rows)
- ⚠️ `clc_chart_of_accounts` table exists in database EMPTY (0 rows) 
- ❌ Code queries wrong table (references `clc_chart_of_accounts`)
- ❌ ERP integration uses separate definition
- ❌ Financial-service uses isolated schema

**Recommendation:** Consolidate to single `chart_of_accounts` table immediately.

---

## 1. Duplication Matrix

### Table Definitions Side-by-Side

| Aspect | `chart_of_accounts` (Main DB) | `clc_chart_of_accounts` (CLC Schema) | `chartOfAccounts` (ERP Schema) |
|--------|------|------|------|
| **Location** | `db/schema/domains/financial/chart-of-accounts.ts` | `db/schema/clc-per-capita-schema.ts` | `db/schema/domains/infrastructure/erp.ts` |
| **Table Name** | `chart_of_accounts` | `clc_chart_of_accounts` | `chart_of_accounts` (ERP scoped) |
| **Status** | ✅ EXISTS IN DB (30 rows) | ⚠️ EXISTS BUT EMPTY | ✅ EXISTS IN DB |
| **Organization FK** | YES (nullable for CLC standards) | NO | YES (required) |
| **Primary Key** | `id` (UUID) | `id` (UUID) | `id` (UUID) |
| **Unique Constraints** | 2 (org+code, CLC code) | 1 (account_code) | 1 (per connector) |
| **Indexes** | 9 indexes | 6 indexes | 4 indexes |
| **Column Count** | 22 columns | 11 columns | 16 columns |

### Detailed Column Comparison

#### Core Columns (Present in All)
| Column | Main Schema | CLC Schema | ERP Schema |
|--------|-------------|------------|------------|
| `id` | uuid | uuid | uuid |
| `account_code` | varchar(50) | varchar(50) | varchar(100) as `account_number` |
| `account_name` | varchar(255) | varchar(255) | varchar(255) |
| `account_type` | ENUM | varchar(50) | ENUM |
| `is_active` | boolean | boolean | boolean |
| `description` | text | text | text |
| `created_at` | timestamp | timestamp | timestamp |
| `updated_at` | timestamp | timestamp | timestamp |

#### Main Schema Exclusive Columns (11 columns)
- `organization_id` - Multi-tenant support
- `account_category` - ENUM for classification
- `level` - Hierarchy depth (0=root)
- `sort_order` - Display ordering
- `is_clc_standard` - CLC vs custom flag
- `is_system` - System protection flag
- `external_system_id` - ERP mapping
- `external_provider` - ERP system type
- `last_synced_at` - Sync timestamp
- `created_by` - user audit
- `updated_by` - user audit

#### CLC Schema Missing Features
❌ NO organization scoping  
❌ NO account categories  
❌ NO hierarchy levels  
❌ NO external ERP mapping  
❌ NO user audit trails  
❌ NO system protection

#### ERP Schema Exclusive Columns (5 columns)
- `connector_id` - ERP connector reference
- `external_id` - External system ID
- `parent_account_id` - UUID FK (vs code)
- `is_header` - Header account flag
- `currency` - Multi-currency support
- `balance` - Current balance tracking
- `balance_date` - Balance timestamp
- `tax_classification` - Tax categories

---

## 2. Import Analysis - Where Each Definition is Used

### Main Schema (`chart_of_accounts`) - 30+ Usages

**Primary Definition:**
```typescript
File: db/schema/domains/financial/chart-of-accounts.ts (Line 72)
Export: chartOfAccounts
```

**Imports:**
1. ✅ `services/clc/chart-of-accounts.ts` (Line 19)
   - Alias: `unifiedChartOfAccounts`
   - Usage: CLC account lookups, hierarchies, mappings

2. ✅ `services/clc/compliance-reports.ts` (Line 33)
   - Import: `chartOfAccounts` from `@/db/schema`
   - Usage: Financial reporting, StatCan compliance

3. ✅ `scripts/seed-clc-accounts.ts` (Line 9)
   - Direct import
   - Usage: Seeding 30 CLC standard accounts

4. ✅ `scripts/schema-consolidation/consolidate-chart-of-accounts.ts` (Line 555)
   - Migration script reference

5. ✅ `db/schema/domains/financial/chart-of-accounts.ts`
   - Related: `accountMappings` table (transaction templates)
   - Foreign keys to chartOfAccounts

6. ❌ **CONFLICT:** `services/clc/remittance-exporter.ts` (Line 7)
   - Imports `clcChartOfAccounts` instead of `chartOfAccounts`
   - **BUG:** Queries empty table

### CLC Schema (`clcChartOfAccounts`) - 3 Usages

**Definition:**
```typescript
File: db/schema/clc-per-capita-schema.ts (Line 112)
Export: clcChartOfAccounts
```

**Imports:**
1. ❌ `services/clc/remittance-exporter.ts` (Line 7)
   - Import: `clcChartOfAccounts`
   - **PROBLEM:** Queries empty table (0 rows)

2. ✅ Self-reference in relations (Lines 340-341)

### ERP Schema (`chartOfAccounts`) - 15+ Usages

**Definition:**
```typescript
File: db/schema/domains/infrastructure/erp.ts (Line 109)
Export: chartOfAccounts
```

**Imports:**
1. ✅ `packages/financial/src/erp/connector-interface.ts` (Line 66)
   - Interface: `importChartOfAccounts(): Promise<ChartOfAccount[]>`

2. ✅ `packages/financial/src/erp/connectors/quickbooks-online.ts` (Line 123)
   - Method: `async importChartOfAccounts()`

3. ✅ `packages/financial/src/erp/connectors/xero.ts` (Line 122)
   - Method: `async importChartOfAccounts()`
   - Also calls at Lines 440, 497

4. ✅ `packages/financial/src/erp/gl-integration.ts` (Lines 43, 522)
   - Usage: `await this.connector.importChartOfAccounts()`

5. ✅ `__tests__/db/schema/erp-integration-schema.test.ts` (Line 8)
   - Test imports and validations

6. ✅ `__tests__/packages/financial/erp/connectors/xero.test.ts` (Line 247)
   - Test coverage for import methods

**Scope:** ERP integration only - connector-specific accounts

---

## 3. Migration Analysis

### Migrations Creating Chart of Accounts Tables

#### Migration 1: `0002_true_selene.sql` (Lines 87-103)
**Table:** `clc_chart_of_accounts`  
**Status:** ✅ APPLIED, ⚠️ EMPTY  
**Date:** Early migration (Phase 2)

```sql
CREATE TABLE IF NOT EXISTS "clc_chart_of_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_code" varchar(50) NOT NULL,
  "account_name" varchar(255) NOT NULL,
  "account_type" varchar(50) NOT NULL,
  "parent_account_code" varchar(50),
  "is_active" boolean DEFAULT true,
  "description" text,
  "financial_statement_line" varchar(100),
  "statistics_canada_code" varchar(50),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "clc_chart_of_accounts_account_code_key" UNIQUE("account_code")
);
```

**Indexes:**
- `idx_clc_accounts_code`
- `idx_clc_accounts_parent`
- `idx_clc_accounts_type`

**Issues:**
- ❌ No organization_id (can't support multi-tenancy)
- ❌ No account_category enum
- ❌ No hierarchy level tracking
- ⚠️ NEVER SEEDED - 0 rows

---

#### Migration 2: `0008_lean_mother_askani.sql` (Line 405+)
**Table:** `chart_of_accounts`  
**Status:** ✅ APPLIED  
**Date:** Phase 4 - Financial systems

```sql
CREATE TABLE "chart_of_accounts" (
  -- ERP-focused definition
  -- Connector-scoped, used by ERP integration
);
```

**Purpose:** ERP system integration  
**Scope:** Per-connector accounts (QuickBooks, Xero, Sage)

---

#### Migration 3: `1770880372830_consolidate_chart_of_accounts_fixed.sql` (Lines 1-188)
**Table:** `chart_of_accounts` (UNIFIED)  
**Status:** ✅ APPLIED, ✅ SEEDED (30 rows)  
**Date:** February 12, 2026 (TODAY)

```sql
-- Backup existing data
CREATE TABLE chart_of_accounts_backup AS SELECT * FROM chart_of_accounts;

-- Drop and recreate with unified schema
DROP TABLE IF EXISTS chart_of_accounts CASCADE;

-- Create enums
CREATE TYPE account_type AS ENUM (...);
CREATE TYPE account_category AS ENUM (...);

-- Create unified table
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID, -- Nullable for CLC standards
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type account_type NOT NULL,
  account_category account_category,
  parent_account_code VARCHAR(50),
  level INTEGER DEFAULT 0,
  is_clc_standard BOOLEAN DEFAULT FALSE,
  statistics_canada_code VARCHAR(50),
  -- ... 22 columns total
);

-- Insert 30 CLC standard accounts (4000-7000 series)
```

**Seeded Data:**
- ✅ 4000 series: Revenue (5 accounts)
- ✅ 5000 series: Operating Expenses (13 accounts)
- ✅ 6000 series: Special Expenses (8 accounts)
- ✅ 7000 series: Assets & Investments (4 accounts)

---

#### Migration 4: Financial Service Schema (Line 1948)
**Location:** `services/financial-service/drizzle/0000_lucky_mole_man.sql`  
**Table:** `clc_chart_of_accounts`  
**Status:** ⚠️ DUPLICATE IN FINANCIAL-SERVICE MICROSERVICE

```sql
CREATE TABLE IF NOT EXISTS "clc_chart_of_accounts" (
  -- Identical to main DB definition
  -- BUT ISOLATED IN FINANCIAL-SERVICE DATABASE
);
```

**Problem:** Separate database = data island

---

### Seed Files

#### File: `db/seeds/clc-chart-of-accounts.sql`
**Target Table:** `clc_chart_of_accounts` ❌ WRONG TABLE  
**Status:** ⚠️ CONFLICTS WITH CURRENT SCHEMA

```sql
-- Targets empty table
INSERT INTO clc_chart_of_accounts (code, name, type, ...) VALUES
  ('4000', 'Revenue', 'revenue', ...),
  -- ... 30 accounts
```

**Problem:** Seed file uses old table name, modern migration uses `chart_of_accounts`

---

## 4. Canonical Definition Recommendation

### ✅ CANONICAL: `db/schema/domains/financial/chart-of-accounts.ts`

**Reasons:**
1. ✅ **Most Complete:** 22 columns vs 11 columns (CLC schema)
2. ✅ **Multi-tenant Ready:** organization_id support
3. ✅ **Hierarchy Support:** parent_account_code, level, sort_order
4. ✅ **CLC Compliance:** is_clc_standard flag, statistics_canada_code
5. ✅ **ERP Integration:** external_system_id, external_provider, last_synced_at
6. ✅ **Audit Trail:** created_by, updated_by
7. ✅ **Seeded with Data:** 30 CLC standard accounts in production
8. ✅ **Latest Migration:** Modern consolidated schema (Feb 12, 2026)
9. ✅ **Account Mappings:** Companion table for transaction templates
10. ✅ **Most Used:** 30+ imports vs 3 imports

**Table Name:** `chart_of_accounts`  
**Export Name:** `chartOfAccounts`

---

## 5. Consolidation Plan

### Phase 1: Deprecation (Immediate)

#### Step 1.1: Update Import References
**Files to Change:**

```typescript
// ❌ OLD (services/clc/remittance-exporter.ts:7)
import { clcChartOfAccounts } from '@/db/schema';

// ✅ NEW
import { chartOfAccounts } from '@/db/schema';
```

**Affected Files:**
- `services/clc/remittance-exporter.ts` (Line 7)

**Code Changes Required:** 1 file

---

#### Step 1.2: Deprecate CLC Schema Export
**File:** `db/schema/clc-per-capita-schema.ts`

```typescript
/**
 * @deprecated Use chartOfAccounts from @/db/schema instead
 * This table exists but is EMPTY. All data is in chart_of_accounts.
 * Will be removed in next major version.
 */
export const clcChartOfAccounts = pgTable(
  'clc_chart_of_accounts',
  { /* ... */ }
);
```

---

#### Step 1.3: Add Migration Warning
**File:** Create `db/migrations/1770880400000_deprecate_clc_chart_of_accounts.sql`

```sql
-- Add deprecation notice
COMMENT ON TABLE clc_chart_of_accounts IS 
  'DEPRECATED: Use chart_of_accounts instead. This table is empty and will be dropped in future release.';

-- Add check constraint to prevent accidental inserts
ALTER TABLE clc_chart_of_accounts 
ADD CONSTRAINT deprecated_table_check 
CHECK (FALSE);
```

---

### Phase 2: Data Migration (Within 1 Week)

#### Step 2.1: Verify No Data in CLC Table
```sql
-- Must return 0 rows
SELECT COUNT(*) FROM clc_chart_of_accounts;

-- Verify data exists in correct table
SELECT COUNT(*) FROM chart_of_accounts WHERE is_clc_standard = TRUE;
-- Expected: 30 rows
```

---

#### Step 2.2: Update Seed Files
**File:** `db/seeds/clc-chart-of-accounts.sql`

Rename seeds/update to target correct table:

```sql
-- OLD
INSERT INTO clc_chart_of_accounts (...) VALUES (...);

-- NEW
INSERT INTO chart_of_accounts (...) VALUES (...);
```

---

#### Step 2.3: Drop Deprecated Table
**File:** `db/migrations/1770880500000_drop_clc_chart_of_accounts.sql`

```sql
-- Remove check constraint
ALTER TABLE clc_chart_of_accounts 
DROP CONSTRAINT IF EXISTS deprecated_table_check;

-- Drop deprecated table
DROP TABLE IF EXISTS clc_chart_of_accounts CASCADE;

-- Clean up related indexes
DROP INDEX IF EXISTS idx_clc_accounts_code;
DROP INDEX IF EXISTS idx_clc_accounts_parent;
DROP INDEX IF EXISTS idx_clc_accounts_type;
DROP INDEX IF EXISTS idx_coa_code;
DROP INDEX IF EXISTS idx_coa_parent;
DROP INDEX IF EXISTS idx_coa_type;
```

---

### Phase 3: ERP Schema Reconciliation (Within 2 Weeks)

#### Decision Point: Keep or Merge?

**Option A: Keep Separate (RECOMMENDED)**
- ERP schema serves different purpose (external system sync)
- Scoped to connectors (QuickBooks, Xero, Sage)
- Contains external system IDs and balance tracking
- No overlap with CLC-standard accounts

**Option B: Merge into Main Schema**
- Add `is_erp_account` boolean flag
- Risk: Mixing CLC standards with external accounts
- Complexity: Managing two account types in one table

**Recommendation:** Keep ERP schema separate, rename for clarity:

```typescript
// db/schema/domains/infrastructure/erp.ts
export const erpChartOfAccounts = pgTable('erp_chart_of_accounts', {
  // Rename to avoid confusion with main chartOfAccounts
});
```

---

### Phase 4: Schema Export Cleanup (Within 2 Weeks)

#### Update Main Schema Index
**File:** `db/schema/index.ts`

```typescript
// ============================================================================
// DOMAIN EXPORTS
// ============================================================================

// Financial Domain - CLC Chart of Accounts
export {
  chartOfAccounts,          // Main CLC chart
  accountMappings,          // Transaction templates
  accountTypeEnum,
  accountCategoryEnum,
  type ChartOfAccount,
  type AccountMapping,
} from './domains/financial/chart-of-accounts';

// ERP Integration - External Accounts  
export {
  erpChartOfAccounts,       // Renamed for clarity
  erpConnectors,
  glAccountMappings,
} from './domains/infrastructure/erp';

// ❌ REMOVED: clcChartOfAccounts (deprecated)
```

---

### Phase 5: Financial Service Alignment (Within 1 Month)

#### File: `services/financial-service/drizzle/schema.ts`

**Problem:** Financial service has isolated duplicate schema

**Options:**

1. **Import from Main Schema (RECOMMENDED)**
   ```typescript
   // Remove duplicate definition
   // Import from main schema instead
   import { chartOfAccounts } from '@/db/schema';
   ```

2. **Keep Separate for Service Boundary**
   - If financial-service is truly isolated microservice
   - Ensure data sync mechanisms
   - Document architectural decision

**Recommendation:** Import from main schema unless strong service boundary justification

---

## 6. Risk Assessment

### High Risk ⚠️
1. **Data Fragmentation**
   - Code queries `clc_chart_of_accounts` (0 rows)
   - Data exists in `chart_of_accounts` (30 rows)
   - **Impact:** Remittance exports fail, NULL references

2. **Financial Reporting Errors**
   - Compliance reports may return no accounts
   - StatCan LAB-05302 exports incomplete
   - **Impact:** Regulatory non-compliance

3. **Transaction Mapping Failures**
   - `accountMappings` table references `chartOfAccounts`
   - If code uses `clcChartOfAccounts`, no mappings found
   - **Impact:** Automated posting rules broken

### Medium Risk ⚠️
4. **Developer Confusion**
   - 3 definitions with similar names
   - Unclear which to import
   - **Impact:** New features use wrong table

5. **Test Failures**
   - Tests may pass locally (seeded table)
   - Fail in production (wrong table)
   - **Impact:** CI/CD pipeline issues

6. **Migration Conflicts**
   - Future migrations unclear which table to update
   - Schema drift between definitions
   - **Impact:** Deployment failures

### Low Risk ⚠️
7. **ERP Integration Isolation**
   - ERP schema separate but intentional
   - Low risk if kept separate
   - **Impact:** Code clarity improvements needed

---

## 7. Migration Strategy - Detailed Steps

### Pre-Migration Checklist
- [ ] Backup production database
- [ ] Verify `chart_of_accounts` has 30 rows
- [ ] Verify `clc_chart_of_accounts` has 0 rows  
- [ ] Document all current imports
- [ ] Run full test suite before changes

### Step-by-Step Execution

**Day 1: Code Changes**
1. Update `services/clc/remittance-exporter.ts` import
2. Add deprecation comments to CLC schema
3. Run tests: `pnpm vitest run services/clc`
4. Commit: `fix(schema): consolidate chart of accounts imports`

**Day 2: Migration Prep**
5. Create deprecation migration script
6. Test migration on dev database
7. Verify constraint prevents insertions
8. Code review + approval

**Week 1: Deploy Deprecation**
9. Deploy to staging
10. Monitor for errors (7 days)
11. Check Sentry for exceptions
12. Verify no queries to deprecated table

**Week 2: Drop Table**
13. Create drop table migration
14. Deploy to staging
15. Run full regression tests
16. Deploy to production

**Week 3-4: ERP Cleanup** (if merging)
17. Rename ERP schema (if keeping separate)
18. Update imports across ERP packages
19. Update documentation

---

## 8. Verification & Testing

### Database Checks

```sql
-- 1. Verify canonical table has data
SELECT COUNT(*), 
       SUM(CASE WHEN is_clc_standard THEN 1 ELSE 0 END) as clc_accounts
FROM chart_of_accounts;
-- Expected: 30 total, 30 CLC standard

-- 2. Verify hierarchy integrity
SELECT level, COUNT(*) 
FROM chart_of_accounts 
WHERE is_clc_standard = TRUE
GROUP BY level 
ORDER BY level;
-- Expected: Level 0: 4 parents, Level 1+: 26 children

-- 3. Verify deprecated table is empty
SELECT COUNT(*) FROM clc_chart_of_accounts;
-- Expected: 0 rows (if table exists)

-- 4. Check for orphaned references
SELECT 
  COUNT(DISTINCT clc_account_code) as referenced_accounts,
  COUNT(CASE WHEN coa.id IS NULL THEN 1 END) as missing_accounts
FROM per_capita_remittances pcr
LEFT JOIN chart_of_accounts coa ON pcr.clc_account_code = coa.account_code
WHERE pcr.clc_account_code IS NOT NULL;
```

### Code Tests

```bash
# Run affected tests
pnpm vitest run services/clc
pnpm vitest run __tests__/services/clc/chart-of-accounts.test.ts
pnpm vitest run __tests__/clc-per-capita.test.ts

# Run integration tests
pnpm vitest run __tests__/integration

# Full regression
pnpm test:coverage
```

### Import Verification Script

```bash
# Check for old imports
grep -r "clcChartOfAccounts" --include="*.ts" --include="*.tsx" .

# Expected after fix: 
# - db/schema/clc-per-capita-schema.ts (definition only - deprecated)
# - No usages in services/ or app/
```

---

## 9. Documentation Updates

### Files to Update

1. **Schema Documentation**
   - `docs/API_DOCUMENTATION_SCHEMA_CONSOLIDATION_GUIDE.md`
   - Update all examples to use `chartOfAccounts`
   - Remove references to `clcChartOfAccounts`

2. **Implementation Guides**
   - `docs/implementation/WEEK1_TASK3_PER_CAPITA_SERVICE.md`
   - Update import statements
   - Fix code examples

3. **Schema Review**
   - `SCHEMA_REVIEW_2026-02-13.md` (current file)
   - Mark consolidation as COMPLETE

4. **README Updates**
   - `README.md` - Database schema section
   - Note: Single source of truth for chart of accounts

---

## 10. Success Criteria

### Phase 1: Complete When
- [ ] All code imports `chartOfAccounts` from main schema
- [ ] Zero references to `clcChartOfAccounts` in active code
- [ ] Deprecation warnings in console logs
- [ ] All tests passing

### Phase 2: Complete When
- [ ] `clc_chart_of_accounts` table dropped
- [ ] All migrations reference `chart_of_accounts`
- [ ] Seed files updated
- [ ] Database objects cleaned up

### Phase 3: Complete When  
- [ ] ERP schema clearly separated or merged
- [ ] `erpChartOfAccounts` renamed (if keeping)
- [ ] No naming conflicts
- [ ] Documentation complete

### Phase 4: Complete When
- [ ] Schema exports clean and organized
- [ ] Type definitions accurate
- [ ] Import paths standardized
- [ ] Zero IDE errors

### Phase 5: Complete When
- [ ] Financial service aligned
- [ ] Microservice boundaries clear
- [ ] Data sync strategy documented
- [ ] Architectural decisions recorded

---

## 11. Rollback Plan

### If Problems Discovered

#### Before Table Drop
**Rollback:** Revert code changes only
```bash
git revert <commit-hash>
pnpm deploy
```

#### After Table Drop
**Restore:** From backup if needed
```sql
-- Restore from backup
CREATE TABLE clc_chart_of_accounts AS 
SELECT * FROM chart_of_accounts_backup 
WHERE is_clc_standard = TRUE;
```

**Revert migration:**
```bash
psql -f db/migrations/rollback/undo_drop_clc_chart.sql
```

---

## 12. Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1: Code Deprecation | 1 day | Today | Tomorrow | 🔴 NOT STARTED |
| Phase 2: Table Drop | 1 week | +1 day | +8 days | ⏳ PENDING |
| Phase 3: ERP Cleanup | 2 weeks | +8 days | +22 days | ⏳ PENDING |
| Phase 4: Export Cleanup | 2 weeks | +8 days | +22 days | ⏳ PENDING |
| Phase 5: Service Alignment | 1 month | +8 days | +38 days | ⏳ PENDING |

**Total Estimated Time:** 5-6 weeks  
**Critical Path:** Phase 1-2 (Must complete first)

---

## Appendix A: File Inventory

### Schema Definition Files (3)
1. `db/schema/domains/financial/chart-of-accounts.ts` ✅ CANONICAL
2. `db/schema/clc-per-capita-schema.ts` ⚠️ DEPRECATED
3. `db/schema/domains/infrastructure/erp.ts` ⚠️ RENAME NEEDED

### Migration Files (4)
1. `db/migrations/0002_true_selene.sql` - Created `clc_chart_of_accounts`
2. `db/migrations/0008_lean_mother_askani.sql` - Created `chart_of_accounts` (ERP)
3. `db/migrations/1770880372830_consolidate_chart_of_accounts_fixed.sql` - Unified schema
4. `services/financial-service/drizzle/0000_lucky_mole_man.sql` - Duplicate definition

### Seed Files (1)
1. `db/seeds/clc-chart-of-accounts.sql` - ⚠️ TARGETS WRONG TABLE

### Service Files Using Schema (6)
1. `services/clc/chart-of-accounts.ts` ✅ CORRECT (uses canonical)
2. `services/clc/compliance-reports.ts` ✅ CORRECT
3. `services/clc/remittance-exporter.ts` ❌ INCORRECT (uses deprecated)
4. `packages/financial/src/erp/connector-interface.ts` ✅ CORRECT (ERP scoped)
5. `packages/financial/src/erp/connectors/quickbooks-online.ts` ✅ CORRECT
6. `packages/financial/src/erp/connectors/xero.ts` ✅ CORRECT

### Test Files (4)
1. `__tests__/services/clc/chart-of-accounts.test.ts`
2. `__tests__/clc-per-capita.test.ts`
3. `__tests__/db/schema/erp-integration-schema.test.ts`
4. `__tests__/packages/financial/erp/connectors/xero.test.ts`

### Documentation Files (4)
1. `SCHEMA_REVIEW_2026-02-13.md` ✅ CURRENT ASSESSMENT
2. `docs/API_DOCUMENTATION_SCHEMA_CONSOLIDATION_GUIDE.md` ⚠️ NEEDS UPDATE
3. `docs/implementation/WEEK1_TASK3_PER_CAPITA_SERVICE.md` ⚠️ NEEDS UPDATE
4. `docs/guides/CLC_PER_CAPITA_WORKFLOW.md` ⚠️ NEEDS UPDATE

---

## Appendix B: SQL Table States

### Current Production State (Estimated)

```sql
-- Table 1: chart_of_accounts
SELECT 
  'chart_of_accounts' as table_name,
  COUNT(*) as row_count,
  SUM(CASE WHEN is_clc_standard THEN 1 ELSE 0 END) as clc_standard_count,
  SUM(CASE WHEN organization_id IS NULL THEN 1 ELSE 0 END) as global_count,
  MIN(created_at) as oldest_record,
  MAX(updated_at) as newest_record
FROM chart_of_accounts;

-- Expected Result:
-- table_name          | row_count | clc_standard | global | oldest              | newest
-- chart_of_accounts   | 30        | 30           | 30     | 2026-02-12 xx:xx:xx | 2026-02-12 xx:xx:xx

-- Table 2: clc_chart_of_accounts (EMPTY)
SELECT 
  'clc_chart_of_accounts' as table_name,
  COUNT(*) as row_count
FROM clc_chart_of_accounts;

-- Expected Result:
-- table_name             | row_count
-- clc_chart_of_accounts  | 0
```

---

## Appendix C: Account Code Structure

### CLC Standard Account Codes (30 accounts seeded)

**4000 Series - Revenue (5 accounts)**
- 4000: Revenue (parent)
- 4100: Per-Capita Tax Revenue
- 4100-001: CLC Per-Capita Tax
- 4100-002: Federation Per-Capita Tax
- 4200: Membership Dues Revenue

**5000 Series - Operating Expenses (13 accounts)**
- 5000: Operating Expenses (parent)
- 5100: Salaries and Wages
- 5100-001: Officer Salaries
- 5100-002: Staff Salaries
- 5100-003: Employee Benefits
- 5200: Legal and Professional Fees
- 5200-001: Legal Counsel
- 5200-002: Arbitration Costs
- 5200-003: Accounting and Audit
- 5300: Per-Capita Tax Expense
- 5400: Administrative Expenses
- 5500: Travel and Meetings
- 5600: Office Rent and Utilities

**6000 Series - Special Expenses (8 accounts)**
- 6000: Special Expenses (parent)
- 6100: Strike Fund Disbursements
- 6200: Education and Training
- 6300: Organizing Campaigns
- 6400: Political Action
- 6500: Community Programs
- 6600: International Solidarity
- 6700: Research and Publications

**7000 Series - Assets (4 accounts)**
- 7000: Assets (parent)
- 7100: Cash and Bank Accounts
- 7200: Investments
- 7300: Capital Assets

---

## Appendix D: Related Schema Objects

### Tables with Foreign Keys to Chart of Accounts

1. **account_mappings** (transaction templates)
   - FK: None (references by code)
   - Usage: maps debit/credit account codes

2. **transaction_clc_mappings** (financial-service)
   - FK: None (references by code)
   - Column: `clc_account_code`

3. **per_capita_remittances**
   - FK: None (references by code)
   - Column: `clc_account_code`

### Related Enums

1. **account_type** - 5 values
   - revenue
   - expense
   - asset
   - liability
   - equity

2. **account_category** - 13 values
   - dues_revenue
   - per_capita_revenue
   - other_revenue
   - salaries_wages
   - administrative
   - legal_professional
   - strike_fund
   - education_training
   - organizing
   - political_action
   - assets
   - liabilities
   - equity

---

## Conclusion

**Immediate Action Required:**
1. Fix `services/clc/remittance-exporter.ts` import TODAY
2. Deploy deprecation migration THIS WEEK
3. Drop `clc_chart_of_accounts` table NEXT WEEK

**Long-term:**
- Maintain single source of truth: `chart_of_accounts`
- Keep ERP schema separate but clearly named
- Update all documentation
- Establish schema governance process

**Estimated Cost:**
- Developer time: 2-3 days
- Testing time: 1 week
- Total timeline: 5-6 weeks (phased)

**Risk if Not Addressed:**
- Financial reporting failures
- Regulatory compliance violations
- Data integrity issues
- Developer confusion and bugs

---

**Report Generated:** 2026-02-12T23:59:59Z  
**Analyst:** GitHub Copilot (Claude Sonnet 4.5)  
**Status:** ⚠️ READY FOR REVIEW AND IMPLEMENTATION
