# Chart of Accounts - Quick Reference

## Current State (2026-02-12)

### 🔴 CRITICAL BUG
```
Code imports:  clcChartOfAccounts (EMPTY TABLE - 0 rows)
Data lives in: chart_of_accounts (HAS DATA - 30 rows)
Result:        Broken remittance exports, no financial reports
```

---

## 3 Tables Found

| Table Name | Status | Rows | Purpose |
|------------|--------|------|---------|
| `chart_of_accounts` | ✅ ACTIVE | 30 | **CANONICAL** - CLC standards + org accounts |
| `clc_chart_of_accounts` | ⚠️ DEPRECATED | 0 | Empty, should be dropped |
| `chart_of_accounts` (ERP) | ✅ ACTIVE | varies | ERP integration only (QuickBooks/Xero) |

---

## Fix Required (30 minutes)

### File: `services/clc/remittance-exporter.ts` (Line 7)

**❌ WRONG:**
```typescript
import { organizations, clcChartOfAccounts } from '@/db/schema';
```

**✅ CORRECT:**
```typescript
import { organizations, chartOfAccounts } from '@/db/schema';
```

**Test:**
```bash
pnpm vitest run services/clc/remittance-exporter
```

---

## Verification Queries

```sql
-- Should return 30
SELECT COUNT(*) FROM chart_of_accounts WHERE is_clc_standard = TRUE;

-- Should return 0
SELECT COUNT(*) FROM clc_chart_of_accounts;

-- Check for orphaned references (should return 0)
SELECT COUNT(*) 
FROM per_capita_remittances 
WHERE clc_account_code NOT IN (
  SELECT account_code FROM chart_of_accounts
);
```

---

## Import Rules (Going Forward)

### ✅ DO THIS:
```typescript
// CLC standard accounts and organization accounts
import { chartOfAccounts } from '@/db/schema';

// Or from domain
import { chartOfAccounts } from '@/db/schema/domains/financial/chart-of-accounts';
```

### ❌ DON'T DO THIS:
```typescript
// DEPRECATED - empty table
import { clcChartOfAccounts } from '@/db/schema';
```

### ℹ️ ERP Integration Only:
```typescript
// For QuickBooks/Xero connectors ONLY
import { chartOfAccounts as erpChartOfAccounts } from '@/db/schema/domains/infrastructure/erp';
```

---

## CLC Account Structure (30 accounts)

**4000 Series - Revenue (5 accounts)**
- Per-capita tax, membership dues, grants

**5000 Series - Operating Expenses (13 accounts)**
- Salaries, legal fees, admin, per-capita expense

**6000 Series - Special Expenses (8 accounts)**
- Strike fund, education, organizing, political action

**7000 Series - Assets (4 accounts)**
- Cash, investments, capital assets

---

## Schema Features Comparison

| Feature | Main Schema | CLC Schema | ERP Schema |
|---------|-------------|------------|------------|
| Multi-tenant | ✅ Yes | ❌ No | ✅ Yes |
| Hierarchy | ✅ Yes | ❌ Limited | ✅ Yes |
| CLC Standards | ✅ Yes | ✅ Yes | ❌ No |
| ERP Sync | ✅ Yes | ❌ No | ✅ Yes |
| Audit Trail | ✅ Yes | ❌ No | ✅ Yes |
| Data Present | ✅ 30 rows | ❌ 0 rows | ✅ varies |

---

## Related Files

### Schema Definitions
- ✅ `db/schema/domains/financial/chart-of-accounts.ts` - **USE THIS**
- ⚠️ `db/schema/clc-per-capita-schema.ts` - Deprecated
- ℹ️ `db/schema/domains/infrastructure/erp.ts` - ERP only

### Migrations
- ✅ `1770880372830_consolidate_chart_of_accounts_fixed.sql` - Current
- ⚠️ `0002_true_selene.sql` - Created empty table (deprecated)

### Service Files
- ❌ `services/clc/remittance-exporter.ts` - NEEDS FIX
- ✅ `services/clc/chart-of-accounts.ts` - Correct
- ✅ `services/clc/compliance-reports.ts` - Correct

---

## Timeline

| Day | Action | Time |
|-----|--------|------|
| Today | Fix import bug | 30 min |
| Today | Add deprecation warning | 30 min |
| Day 2 | Create deprecation migration | 2 hrs |
| Day 3 | Update docs | 3 hrs |
| Day 4 | Full test suite | 4 hrs |
| Day 5 | Deploy staging | 2 hrs |
| Day 8 | Create drop migration | 1 hr |
| Day 9 | Deploy production | 2 hrs |

**Total:** 15 hours over 9 days

---

## Success Criteria

- [x] Data exists in `chart_of_accounts` (30 rows)
- [ ] Code imports `chartOfAccounts` everywhere
- [ ] Zero references to `clcChartOfAccounts` in active code
- [ ] Deprecation warning in schema definition
- [ ] All tests passing
- [ ] `clc_chart_of_accounts` table dropped

---

## Emergency Contacts

**If this breaks in production:**
1. Check Sentry for exceptions
2. Verify table has data: `SELECT COUNT(*) FROM chart_of_accounts;`
3. Check imports: `grep -r "clcChartOfAccounts" services/`
4. Rollback code if needed: `git revert <commit>`

---

## Key Takeaway

```
┌─────────────────────────────────────────────┐
│  SINGLE SOURCE OF TRUTH:                    │
│  db/schema/domains/financial/               │
│  chart-of-accounts.ts                       │
│                                             │
│  Export: chartOfAccounts                    │
│  Table:  chart_of_accounts                  │
│  Rows:   30 CLC standard accounts           │
└─────────────────────────────────────────────┘
```

---

**For Full Details:** See `CHART_OF_ACCOUNTS_DUPLICATION_ANALYSIS.md`  
**For Action Plan:** See `CHART_OF_ACCOUNTS_ACTION_PLAN.md`  
**Status:** 🔴 CRITICAL - FIX IMMEDIATELY
