# Non-Critical RLS Violations - Fix Strategy

**Version:** 1.0.0
**Last Updated:** February 9, 2026
**Commit:** `bcf0aee8`

---

## Current State

**Scanner Results:**

```

Total queries: 691
TENANT (critical table violations): 0 ✅
ADMIN: 2
WEBHOOK: 26
SYSTEM: 554
UNKNOWN: 0 ✅

Non-Critical Tenant Violations: 99

```

**Classification:** These 99 violations are queries against `organizationMembers` and other non-critical tables from TENANT contexts that aren't wrapped in `withRLSContext()`.

---

## Violation Breakdown

### By File Type

1. **Actions Modules (52 violations)**

   - `actions/analytics-actions.ts`: 10 violations

   - `actions/rewards-actions.ts`: 2 violations

   - Other actions: ~40 violations

2. **API Routes (35 violations)**

   - `app/api/organizations/route.ts`: 1 violation

   - `app/api/clause-library/route.ts`: 3 violations

   - `app/api/voting/sessions/route.ts`: 2 violations

   - `app/api/stripe/webhooks/route.ts`: 1 violation

   - Other API routes: ~28 violations

3. **Helper Functions (12 violations)**

   - `getCurrentUserOrgId()`: 6 occurrences

   - `checkAdminRole()`: 4 occurrences

   - Other helpers: 2 occurrences

---

## Fix Strategies

### Strategy 1: Wrap Helper Functions (Recommended)

**When to Use:**

- Helper functions that query organizationMembers for auth context

- Functions called from multiple locations

- Minimal code changes required

**Example:**

```typescript

// BEFORE
async function getCurrentUserOrgId() {
  const { userId } = await getCurrentUser();
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, userId)
  });
  return member?.organizationId;
}

// AFTER
async function getCurrentUserOrgId() {
  const { userId } = await getCurrentUser();

  return await withRLSContext(async () => {
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId)
    });
    return member?.organizationId;
  }, { organizationId: 'self' }); // Special marker for self-lookup
}

```

**Pros:**

- Minimal code changes

- Centralizes RLS wrapping

- Type-safe

**Cons:**

- Nested withRLSContext calls if helper is called from already-wrapped code

- "organizationId: 'self'" is a workaround for self-lookup patterns

---

### Strategy 2: Pass organizationId as Parameter

**When to Use:**

- Functions where organizationId is already available in caller

- Avoids nested withRLSContext calls

**Example:**

```typescript

// BEFORE
async function getOrganizationMembers() {
  const orgId = await getCurrentUserOrgId(); // Queries organizationMembers
  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.organizationId, orgId)
  });
  return members;
}

// AFTER
async function getOrganizationMembers(organizationId: string) {
  return await withRLSContext(async () => {
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, organizationId)
    });
    return members;
  }, { organizationId });
}

// Caller
const orgId = await getCurrentUserOrgId(); // Still needs RLS, but isolated
const members = await getOrganizationMembers(orgId);

```

**Pros:**

- Cleaner separation of concerns

- Avoids nested withRLSContext

- More explicit context passing

**Cons:**

- Requires refactoring callers

- More code changes

---

### Strategy 3: Allowlist Non-Critical Violations

**When to Use:**

- organizationMembers queries for authentication/authorization only

- Queries that don't return sensitive tenant data

- Helper functions that are inherently cross-request

**Example:**

```typescript

// In scripts/scan-rls-usage-v2.ts

const ALLOWLIST: AllowlistEntry[] = [
  // ... existing entries
  {
    pattern: /getCurrentUserOrgId|checkAdminRole/,
    justification: 'Helper functions for authentication context - called from auth-checked routes. ' +
                   'organizationMembers queries filter by current userId, ensuring user can only access their own membership.',
    category: 'SYSTEM', // Treat as system-level auth
  },
  {
    pattern: /actions\/analytics-actions\.ts.*organizationMembers/,
    justification: 'Analytics actions query organizationMembers for permission checks before returning aggregated data. ' +
                   'All analytics data queries are wrapped in withRLSContext.',
    category: 'TENANT',
  },
];

```

**Pros:**

- No code changes required

- Documents rationale for violations

- Acknowledges legitimate patterns

**Cons:**

- Doesn't enforce RLS at runtime

- Could hide actual violations

- Reduces audit credibility

---

## Recommended Approach (Hybrid)

### Phase 1: Fix Helper Functions (12 violations)

Wrap helper functions with withRLSContext:

- `getCurrentUserOrgId()`

- `checkAdminRole()`

- `getCurrentUserRoles()`

### Phase 2: Fix Actions Modules (52 violations)

Option A: Pass organizationId as parameter (preferred)
Option B: Wrap each query individually

### Phase 3: Fix API Routes (35 violations)

Ensure each route:

1. Has `getCurrentUser()` call

2. Fetches organizationId early

3. Wraps all DB queries in withRLSContext

### Phase 4: Document Remaining Patterns

For any violations that are authentication-related and don't expose tenant data, add to allowlist with justification.

---

## Implementation Script

**File:** `scripts/fix-non-critical-rls.ts`

```typescript

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

interface Violation {
  file: string;
  line: number;
  code: string;
}

async function fixHelperFunctions() {
  console.log('🔧 Fixing helper functions...');

  const files = await glob('actions/**/*.ts');

  for (const file of files) {
    let content = readFileSync(file, 'utf-8');

    // Fix getCurrentUserOrgId pattern
    content = content.replace(
      /(async function getCurrentUserOrgId\(\) \{[\s\S]*?)(const member = await db\.query\.organizationMembers\.findFirst\(\{[\s\S]*?\}\);)/g,
      (match, prefix, query) => {
        return `${prefix}return await withRLSContext(async () => {\n    ${query}\n    return member?.organizationId;\n  }, { organizationId: await getCurrentUser().then(u => u.organizationId) });`;
      }
    );

    // Fix checkAdminRole pattern
    content = content.replace(
      /(async function checkAdminRole\(\) \{[\s\S]*?)(const member = await db\.query\.organizationMembers\.findFirst\(\{[\s\S]*?\}\);)/g,
      (match, prefix, query) => {
        return `${prefix}return await withRLSContext(async () => {\n    ${query}\n    return member?.role === 'admin';\n  }, { organizationId: await getCurrentUser().then(u => u.organizationId) });`;
      }
    );

    writeFileSync(file, content);
  }

  console.log('✅ Helper functions fixed');
}

async function analyzeRemaining() {
  console.log('📊 Analyzing remaining violations...');

  // Re-run scanner
  const { execSync } = require('child_process');
  const result = execSync('pnpm tsx scripts/scan-rls-usage-v2.ts', { encoding: 'utf-8' });

  const violations = result.match(/Non-Critical Tenant Violations: (\d+)/);
  const count = violations ? parseInt(violations[1]) : 0;

  console.log(`📊 Remaining violations: ${count}`);

  if (count === 0) {
    console.log('🎉 All non-critical violations resolved!');
  } else {
    console.log('ℹ️  Review remaining violations in scanner output');
  }
}

async function main() {
  await fixHelperFunctions();
  await analyzeRemaining();
}

main();

```

---

## Testing After Fixes

### 1. Run RLS Scanner

```bash

pnpm tsx scripts/scan-rls-usage-v2.ts

```

**Expected:**

- Non-Critical Tenant Violations: < 50 (after Phase 1)

- Non-Critical Tenant Violations: 0 (after all phases)

### 2. Run Test Suite

```bash

pnpm vitest run

```

**Expected:**

- All tests pass

- No new failures from withRLSContext wrapping

### 3. Check for Regressions

```bash

# Run critical security tests

pnpm vitest run __tests__/services/claim-workflow-fsm.test.ts
pnpm vitest run __tests__/api/claims-fsm-integration.test.ts
pnpm vitest run __tests__/enforcement-layer.test.ts

```

---

## Acceptance Criteria

Before marking non-critical violations as complete:

- [ ] RLS scanner shows 0 non-critical violations OR

- [ ] All remaining violations are allowlisted with justifications

- [ ] Full test suite passes (0 failures)

- [ ] Manual testing of affected routes confirms functionality

- [ ] Documentation updated (REPOSITORY_VALIDATION_REPORT.md)

---

## Timeline Estimate

| Phase | Violations | Time Estimate | Priority |
|-------|------------|---------------|----------|
| Phase 1: Helper Functions | 12 | 2 hours | High |
| Phase 2: Actions Modules | 52 | 6 hours | Medium |
| Phase 3: API Routes | 35 | 4 hours | Medium |
| Phase 4: Allowlist Documentation | Remaining | 1 hour | Low |

**Total:** ~13 hours of engineering time

---

## Rationale for Priority

**Why this is NOT blocking RC-1:**

1. **Critical Tables Protected:** All 10 critical tables (claims, grievances, members, votes, elections, notifications, messages) have 0 violations

2. **Unknown Contexts Resolved:** 465→0 unknown contexts, meaning all code is properly classified

3. **Non-Critical Tables:** Remaining violations are in organizationMembers (auth metadata) and other non-tenant-isolated tables

4. **Auth-Context Violations:** Most violations are in permission check helpers that filter by userId, preventing cross-tenant access

**Why we should still fix them:**

1. **Audit Credibility:** Investors and auditors prefer "0 violations" messaging

2. **Defense in Depth:** Even non-critical tables benefit from RLS enforcement

3. **Future-Proofing:** If schema changes make these tables critical, RLS is already enforced

4. **Best Practice:** Demonstrates comprehensive security posture

---

**Document Owner:** Platform Engineering Team
**Review Date:** February 9, 2026
