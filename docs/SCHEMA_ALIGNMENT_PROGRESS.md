# Schema Alignment Cleanup Progress

**Date:** February 12, 2026  
**Status:** IN PROGRESS  
**Goal:** Achieve zero TypeScript errors across entire codebase

---

## Progress Summary

| Metric | Initial | Current | Fixed | Remaining |
|--------|---------|---------|-------|-----------|
| **Total Errors** | 6,484 | 6,394 | 90 | 6,394 |
| **Completion** | 0% | 1.4% | +1.4% | 98.6% |

---

## Fixes Applied (90 errors eliminated)

### Round 1: Manual Schema Fixes (59 errors)
- ✅ `lib/utils/member-data-utils.ts` - Profile field references
- ✅ `lib/services/strike-fund-tax-service.ts` - User fields, province lookups
- ✅ `lib/services/provincial-privacy-service.ts` - Breach notifications, types
- ✅ `lib/services/index.ts` - Invalid service exports (35 fixes)
- ✅ `tsconfig.json` - Removed fixed files from exclusions

### Round 2: Systematic Field Fixes (31 errors)
- ✅ `auditLogs.timestamp` → `auditLogs.createdAt` (8 changes)
- ✅ `users.id` → `users.userId` (2 changes)
- ✅ `.tenantId` → `.organizationId` (72 changes across 25 files)

**Files Modified:** 32 total  
**Changes Applied:** 152 replacements

---

## Error Distribution (Current State)

| Directory | Errors | % of Total | Priority |
|-----------|--------|------------|----------|
| `app/` | 5,234 | 81.9% | Medium (API routes) |
| `lib/` | 936 | 14.6% | **HIGH** |
| `db/` | 119 | 1.9% | High |
| `actions/` | 81 | 1.3% | Medium |
| `components/` | 46 | 0.7% | Medium |
| `services/` | 4 | 0.1% | High |
| Root files | 4 | 0.1% | Low |

### lib/ Subdirectory Breakdown

| Subdirectory | Errors | Status |
|--------------|--------|--------|
| `lib/integrations` | 503 | Needs fix |
| `lib/services` | 137 | **In Progress** |
| `lib/graphql` | 45 | Needs fix |
| `lib/auth` | 27 | Needs fix |
| `lib/ai` | 21 | Needs fix |
| `lib/utils` | 16 | Needs fix |
| `lib/gdpr` | 16 | Needs fix |
| Others | 171 | Needs fix |

---

## Common Error Patterns Identified

### 1. Schema Field Mismatches
**Pattern:** Code references non-existent table fields  
**Examples:**
- `profile.displayName` (doesn't exist → use `users.displayName`)
- `profile.phoneNumber` (doesn't exist → use `users.phone`)
- `claims.tenantId` (doesn't exist → use `claims.organizationId`)
- `auditLogs.timestamp` (doesn't exist → use `auditLogs.createdAt`)

### 2. Wrong Table References
**Pattern:** Query wrong table for data  
**Examples:**
- Query `users.province` (doesn't exist → use `strikeFundDisbursements.province` or `federations.province`)
- Query `members` table (doesn't exist → use `users` or `organization_users`)

### 3. Type Mismatches
**Pattern:** Function exports vs class exports  
**Status:** ✅ **FIXED** in `lib/services/index.ts`

### 4. Missing Type Definitions
**Pattern:** Missing fields in interfaces  
**Example:** `BreachNotification` missing `affectedCount` field  
**Status:** ✅ **FIXED** in `provincial-privacy-service.ts`

---

## Next Steps (Prioritized)

### Phase 1: High-Impact Services (Target: 200 errors)
- [ ] Fix remaining `lib/services` errors (137 remaining)
- [ ] Fix `lib/utils` errors (16 errors)
- [ ] Fix `db/` schema issues (119 errors)
- [ ] Fix high-priority `actions/` files (81 errors)

### Phase 2: Medium-Impact Areas (Target: 1,000 errors)
- [ ] Fix `lib/integrations` adapters (503 errors)
- [ ] Fix `lib/graphql` (45 errors)
- [ ] Fix `lib/auth` (27 errors)
- [ ] Fix `components/` (46 errors)

### Phase 3: App Directory Cleanup (Target: 5,000+ errors)
- [ ] Fix API routes in `app/api`
- [ ] Fix page components in `app/[locale]`
- [ ] Fix middleware and route handlers

---

## Automated Fix Scripts Created

### 1. `schema-field-diagnostics.ps1`
**Purpose:** Detect schema field mismatches  
**Location:** `scripts/diagnostics/`  
**Usage:** `.\schema-field-diagnostics.ps1 -Detailed`

### 2. `fix-schema-fields.ps1`
**Purpose:** Apply systematic field replacements  
**Location:** `scripts/diagnostics/`  
**Usage:** `.\fix-schema-fields.ps1 [-DryRun]`  
**Results:** 82 replacements across 27 files

### 3. `comprehensive-schema-audit.ps1`
**Purpose:** Full codebase schema analysis  
**Location:** `scripts/diagnostics/`  
**Status:** Created, needs refinement

---

## Schema Reference (Canonical Truth)

### Core Tables

#### `profiles` (public schema)
**Fields:** `userId`, `email`, `membership`, `paymentProvider`, `stripeCustomerId`, `stripeSubscriptionId`, `whopUserId`, `whopMembershipId`, `planDuration`, billing fields, usage fields, `status`, timestamps

**❌ Does NOT have:** `displayName`, `phoneNumber`, `memberNumber`, `fullName`, `firstName`, `lastName`, `phone`, `address`, `province`

#### `users` (user_management schema)
**Fields:** `userId` (**NOT** `id`), `email`, `emailVerified`, `emailVerifiedAt`, `passwordHash`, `firstName`, `lastName`, `displayName`, `avatarUrl`, `phone`, `phoneVerified`, `timezone`, `locale`, `isActive`, `isSystemAdmin`, authentication fields, 2FA fields, encrypted PII fields, timestamps

**❌ Does NOT have:** `id`, `fullName`, `memberNumber`, `address`, `province`, `tenantId`

#### `audit_logs` (audit_security schema)
**Fields:** `auditId`, `organizationId`, `userId`, `action`, `resourceType`, `resourceId`, `oldValues`, `newValues`, `ipAddress`, `userAgent`, `sessionId`, `correlationId`, `severity`, `outcome`, `errorMessage`, `metadata`, archive fields, `createdAt` (**NOT** `timestamp`)

**❌ Does NOT have:** `id`, `timestamp`, `tenantId`

#### Province Data Location
- **Tax purposes:** `strikeFund Disbursements.province`
- **Organization location:** `federations.province`
- **❌ NOT in:** `users.province`, `members.province` (members table doesn't exist)

---

## Validation Commands

```bash
# Full type check
pnpm exec tsc --noEmit

# Type check specific directory
pnpm exec tsc --noEmit 2>&1 | Select-String "lib/services/"

# Count errors by directory
pnpm exec tsc --noEmit --pretty false 2>&1 | Select-String "error TS" | Group-Object { ($_ -split ':')[0] -replace '\\.*$' } | Sort-Object Count -Descending

# Run ESLint
pnpm eslint . --ext .ts,.tsx
```

---

## Key Learnings

1. **Schema drift is pervasive** - Many files reference old schema structure
2. **Automated fixes work** - Regex replacements effective for common patterns
3. **Manual review still needed** - Some fixes require contextual understanding
4. **Test files excluded** - Focus on production code first (~99% of errors)
5. **Phase 0 clean** - Core features have zero errors ✅

---

## Success Criteria

- [x] Phase 0 code: 0 errors ✅
- [ ] lib/services: 0 errors (137 remaining)
- [ ] lib/utils: 0 errors (16 remaining)
- [ ] actions: 0 errors (81 remaining)
- [ ] components: 0 errors (46 remaining)
- [ ] db: 0 errors (119 remaining)
- [ ] app: <100 errors (5,234 remaining - focus on critical paths)
- [ ] Full codebase: 0 errors

---

## Estimated Completion

- **High-Impact Phase (Phases 1-2):** 2-3 days @ 100-150 errors/day
- **App Directory Cleanup (Phase 3):** 3-5 days (large volume, lower priority)
- **Total Estimated:** 5-8 days for complete cleanup

**Current Velocity:** 45 errors/hour (90 errors in 2 hours)

---

*Last Updated: February 12, 2026 - Round 2 Complete*
