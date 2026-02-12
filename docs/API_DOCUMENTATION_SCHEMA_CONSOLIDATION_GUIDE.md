# 🚀 API Documentation & Schema Consolidation Tools

This guide covers the new automated tooling for OpenAPI generation and schema consolidation implemented as part of the **A+ roadmap**.

---

## 📚 OpenAPI Generator

### Overview
Automated documentation generation from Next.js App Router routes. Scans all `app/api/**/route.ts` files and generates OpenAPI 3.0 specification.

### Features
- ✅ Auto-detects HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ Extracts Zod schemas for request/response validation
- ✅ Infers authentication requirements from `requireApiAuth` usage
- ✅ Generates standardized error responses
- ✅ Preserves manual documentation annotations
- ✅ Merges with existing OpenAPI spec

### Usage

#### Generate Fresh Spec
```bash
pnpm run openapi:generate
```
**Output:** `docs/api/openapi-generated.yaml`

#### Merge with Existing Spec
```bash
pnpm run openapi:generate:merge
```
Preserves hand-written documentation from `docs/api/openapi.yaml`

#### Watch Mode (Development)
```bash
pnpm run openapi:watch
```
Auto-regenerates on route file changes

### Output Statistics
```
📊 Statistics:
  - Total route files: 462
  - Routes with HTTP methods: 462
  - Total HTTP handlers: 731
  - Routes with auth: 520+
  - Routes with Zod: 380+
```

### Next Steps

#### 1. Install Swagger UI
```bash
pnpm add swagger-ui-react
pnpm add -D @types/swagger-ui-react
```

#### 2. Create Docs Endpoint
Create `app/api/docs/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET() {
  const specPath = path.join(process.cwd(), 'docs/api/openapi-generated.yaml');
  const spec = yaml.load(fs.readFileSync(specPath, 'utf-8'));
  
  return NextResponse.json(spec);
}
```

#### 3. Create Swagger UI Page
Create `app/api-docs/page.tsx`:
```typescript
'use client';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  return <SwaggerUI url="/api/docs" />;
}
```

#### 4. Add to Navigation
```typescript
// In your navigation/header
<Link href="/api-docs">API Documentation</Link>
```

### Improving Documentation Quality

#### Add JSDoc Comments to Routes
```typescript
/**
 * GET /api/voting/sessions
 * 
 * List all voting sessions for the authenticated user's organization
 * 
 * @description Retrieves voting sessions with pagination and filtering
 */
export async function GET(request: NextRequest) {
  // ... implementation
}
```

#### Use Zod Schemas
```typescript
const createSessionSchema = z.object({
  title: z.string().min(1).describe('Session title'),
  startDate: z.string().datetime().describe('Start date in ISO 8601 format'),
  endDate: z.string().datetime().describe('End date in ISO 8601 format'),
});
```

The generator will extract these descriptions for better OpenAPI documentation.

---

## 🗂️ Schema Consolidation

### Overview
Consolidates duplicate chart of accounts schemas across 5+ locations into a single unified schema.

### Problem Solved
**Before:** Chart of accounts duplicated in:
- `services/clc/chart-of-accounts.ts` (hardcoded constant - 383 accounts)
- `db/schema/clc-per-capita-schema.ts` (clcChartOfAccounts table)
- `services/financial-service/drizzle/schema.ts` (duplicate table)
- `db/schema/domains/finance/accounting.ts` (chartOfAccounts table)
- `db/schema/domains/data/accounting.ts` (externalAccounts table)

**After:** Single source of truth:
- `db/schema/domains/financial/chart-of-accounts.ts` (unified schema)
- Database-driven with seed data from original constant

### Usage

#### Preview Changes (Dry Run)
```bash
pnpm run schema:consolidate:dry-run
```

#### Preview with Details
```bash
pnpm run schema:consolidate:verbose
```

#### Execute Consolidation
```bash
pnpm run schema:consolidate
```

### What It Does

1. **Extracts CLC Accounts** from hardcoded constant (383 accounts)
2. **Generates Unified Schema** at `db/schema/domains/financial/chart-of-accounts.ts`
3. **Creates SQL Migration** with:
   - New enums (`account_type`, `account_category`)
   - Unified `chart_of_accounts` table
   - Account mappings table for transaction templates
   - Indexes for performance
   - Seed data for CLC standard accounts
   - Migration from old tables
4. **Generates Seed Script** at `scripts/seed-clc-accounts.ts`

### Generated Files

```
✅ db/schema/domains/financial/chart-of-accounts.ts
✅ db/migrations/{timestamp}_consolidate_chart_of_accounts.sql
✅ scripts/seed-clc-accounts.ts
```

### Migration Steps

#### 1. Review Generated Files
```bash
# Preview what will be created
pnpm run schema:consolidate:dry-run --verbose

# Generate files
pnpm run schema:consolidate
```

#### 2. Backup Database
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

#### 3. Run Migration (Option A: Direct SQL)
```bash
psql $DATABASE_URL -f db/migrations/{timestamp}_consolidate_chart_of_accounts.sql
```

#### 4. Run Migration (Option B: Drizzle)
```bash
pnpm db:migrate
```

#### 5. Verify Data
```sql
-- Check CLC accounts were seeded
SELECT COUNT(*) FROM chart_of_accounts WHERE is_clc_standard = TRUE;
-- Expected: 383+ accounts

-- Check data integrity
SELECT 
  account_type,
  account_category,
  COUNT(*) 
FROM chart_of_accounts 
GROUP BY account_type, account_category;
```

#### 6. Update Code Imports
Replace old imports:
```typescript
// ❌ OLD
import { clcChartOfAccounts } from '@/db/schema/clc-per-capita-schema';
import { CLC_CHART_OF_ACCOUNTS } from '@/services/clc/chart-of-accounts';

// ✅ NEW
import { chartOfAccounts } from '@/db/schema/domains/financial/chart-of-accounts';
```

#### 7. Update Service Layer
Update `services/clc/chart-of-accounts.ts` to query database:
```typescript
// ❌ OLD: Return hardcoded constant
getAllAccounts() {
  return CLC_CHART_OF_ACCOUNTS;
}

// ✅ NEW: Query database
async getAllAccounts() {
  return await db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.isCLCStandard, true))
    .orderBy(chartOfAccounts.sortOrder);
}
```

#### 8. Test Thoroughly
```bash
# Run financial tests
pnpm test __tests__/services/clc/

# Run integration tests
pnpm test __tests__/clc-per-capita.test.ts
```

#### 9. Deprecate Old Tables (After Validation)
```sql
-- ONLY after full validation and testing
DROP TABLE IF EXISTS clc_chart_of_accounts CASCADE;
```

### Schema Structure

#### Unified Table: `chart_of_accounts`
```sql
- id (UUID, PK)
- organization_id (UUID, FK to organizations) -- NULL for CLC standard accounts
- account_code (VARCHAR(50)) -- e.g., '4100', '5200-001'
- account_name (VARCHAR(255))
- account_type (ENUM: revenue, expense, asset, liability, equity)
- account_category (ENUM: dues_revenue, salaries_wages, etc.)
- parent_account_code (VARCHAR(50)) -- Hierarchy support
- is_clc_standard (BOOLEAN) -- TRUE for CLC 4000-7000 series
- is_system (BOOLEAN) -- Cannot be modified by users
- statistics_canada_code (VARCHAR(50)) -- StatCan reporting
- external_system_id (VARCHAR(255)) -- QuickBooks/Xero ID
- external_provider (VARCHAR(50)) -- QUICKBOOKS, XERO
```

**Key Features:**
- ✅ Supports CLC standard accounts (global, `organization_id = NULL`)
- ✅ Supports org-specific custom accounts
- ✅ Multi-level hierarchy via `parent_account_code`
- ✅ ERP integration mapping
- ✅ StatCan compliance
- ✅ Row-level security ready

---

## 🎯 Success Metrics

### Before Implementation
| Metric | Value |
|--------|-------|
| API Documentation Coverage | 1.6% (12/731) |
| Schema Duplication | 5 locations |
| Manual Documentation Updates | Required |
| Schema Source of Truth | None (constant + 4 tables) |

### After Implementation
| Metric | Target |
|--------|--------|
| API Documentation Coverage | 95%+ (690+/731) |
| Schema Duplication | 1 canonical source |
| Manual Documentation Updates | Auto-generated |
| Schema Source of Truth | Single unified schema |

---

## 🔧 Troubleshooting

### OpenAPI Generator

#### Issue: "Cannot find module 'glob'"
```bash
pnpm add -D glob @types/glob
```

#### Issue: "Cannot find module 'js-yaml'"
```bash
pnpm add -D js-yaml @types/js-yaml
```

#### Issue: TypeScript compilation errors
The generator uses the TypeScript compiler API. Ensure:
```bash
pnpm add -D typescript@latest
```

### Schema Consolidation

#### Issue: Migration fails with constraint violation
- Likely duplicate account codes
- Review existing data:
  ```sql
  SELECT account_code, COUNT(*) 
  FROM clc_chart_of_accounts 
  GROUP BY account_code 
  HAVING COUNT(*) > 1;
  ```

#### Issue: Missing accounts after migration
- Check migration log for errors
- Verify seed data was applied:
  ```sql
  SELECT COUNT(*) FROM chart_of_accounts WHERE is_clc_standard = TRUE;
  ```

---

## 📞 Support

For issues or questions:
1. Check generated files in `docs/api/` and `db/migrations/`
2. Review logs for errors
3. Test in staging environment first
4. Contact: Backend team

---

## 🎉 Next Steps for A+ Grade

### Phase 1: API Documentation (In Progress)
- [x] Create OpenAPI generator
- [ ] Set up Swagger UI endpoint
- [ ] Add JSDoc comments to top 50 endpoints
- [ ] Integrate OpenAPI validation in CI/CD

### Phase 2: Schema Consolidation (In Progress)
- [x] Create consolidation script
- [ ] Run migration in staging
- [ ] Update service layer
- [ ] Deprecate old schemas

### Phase 3: Error Standardization (Next)
- [ ] Create ESLint rule
- [ ] Audit all routes
- [ ] Migrate to standardErrorResponse
- [ ] Add integration tests

**Target Completion:** End of Sprint 3 (6 weeks)
**Expected Grade:** A+ (95/100)
