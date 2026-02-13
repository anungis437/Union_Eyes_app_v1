# Type Check & ESLint Fix Plan

**Created:** February 12, 2026  
**Goal:** Fix all TypeScript and ESLint errors before Phase 1  
**Strategy:** Systematic, file-by-file fixes with verification

---

## Error Summary

### TypeScript Errors: ~200
### ESLint Errors: ~50+ (mostly in generated files)

---

## Error Categories

### 1. Signature Workflow Service (40+ errors)
**File:** `lib/services/signature-workflow-service.ts`

**Missing Properties:**
- `externalId` - not in signatureWorkflows schema
- `documentName` - not in signatureWorkflows schema  
- `subject` - not in signatureWorkflows schema
- `documentHash` - not in signatureWorkflows schema
- `storageUrl` - not in signatureWorkflows schema
- `signedDocumentHash` - not in signatureWorkflows schema

**Type Mismatches:**
- `SignatureStatus` includes `"pending"` which isn't in schema enum
- Various insert operations using incorrect field names

**Fix Strategy:** 
1. Check actual schema definition in `db/schema.ts`
2. Update service to match schema OR add missing fields to schema
3. Fix enum mismatches

---

### 2. Strike Fund Tax Service (10+ errors)
**File:** `lib/services/strike-fund-tax-service.ts`

**Missing Properties on Profile:**
- `fullName`
- `name`
- `address`
- `province`

**Fix Strategy:**
1. Check profiles schema
2. Use correct field names or add computed properties
3. Likely need `displayName` instead of `fullName`

---

### 3. Member Data Utils (15+ errors)
**File:** `lib/utils/member-data-utils.ts`

**Missing Properties:**
- `displayName` (on profiles)
- `phoneNumber` (should be `phone`)
- `memberNumber` (not in schema)
- `id` (on profiles table reference)

**Fix Strategy:**
1. Map to correct schema field names
2. Remove references to non-existent fields
3. Use nullable handling for optional fields

---

### 4. Workflow Automation Engine (50+ errors)
**File:** `lib/workflow-automation-engine.ts`

**Missing Properties on grievanceDeadlines:**
- `claimId` (should be `grievanceId`)
- `isMet` (not in schema)
- `deadlineDate` (should be `dueDate`)
- `escalateOnMiss` (not in schema)
- `escalatedAt` (not in schema)
- `escalateTo` (not in schema)
- `assignedTo` (not in schema)
- `organizationId` (not in schema - use grievance's org)

**Fix Strategy:**
1. Update to use `grievanceId` instead of `claimId`
2. Use `dueDate` instead of `deadlineDate`
3. Remove references to non-existent escalation fields
4. Use status field for tracking met/missed deadlines

---

### 5. Rewards Stats Utils (10+ errors)
**File:** `lib/utils/rewards-stats-utils.ts`

**Missing Properties on rewardWalletLedger:**
- `eventType` (not in current schema)
- `amountCredits` (not in current schema)
- `orgId` (should be `organizationId`)

**Fix Strategy:**
1. Check actual rewardWalletLedger schema
2. Map to correct field names
3. Update queries to use existing fields

---

### 6. PKI Services (5+ errors)
**Files:** 
- `services/pki/certificate-manager.ts`
- `services/pki/signature-service.ts`
- `services/pki/verification-service.ts`

**Issues:**
- New signature types not in enum (`"pki_certificate"`, `"digital_signature"`)
- Missing `logger` import

**Fix Strategy:**
1. Add new signature types to schema enum
2. Import logger utility
3. Fix type annotations

---

### 7. Support Service (2 errors)
**File:** `lib/services/support-service.ts`

**Issues:**
- `string | undefined` passed where `string` expected
- Nullable `viewCount` not handled

**Fix Strategy:**
1. Add null/undefined checks
2. Use optional chaining or default values

---

### 8. Other Services (10+ errors)
- `lib/services/transfer-pricing-service.ts` - Cannot find `@/db/client`
- `lib/utils/autopay-utils.ts` - Stripe type imports
- `lib/utils/pdf-generator.ts` - Missing pdfkit types
- `lib/utils/smart-onboarding.ts` - Array/object type confusion
- `lib/validation/rewards-schemas.ts` - Zod partial issue
- `lib/workers/*` - Various type issues
- `lib/workflow-engine.ts` - Date | null issues

---

### 9. Supabase Functions (50+ errors)
**Files:** `supabase/functions/**/*.ts`

**Issues:**
- All Deno-specific imports and APIs
- These are edge functions, not part of main app

**Fix Strategy:**
1. Exclude from main tsconfig
2. Create separate tsconfig for Supabase functions
3. Low priority - these run separately

---

### 10. ESLint Issues
**Main Issue:** Empty object types `{}` in generated routes file

**Fix Strategy:**
1. Update eslint config to allow `{}` in generated files
2. Exclude `.next/**` from linting
3. Fix any source file ESLint errors

---

## Fix Order (Priority)

### Phase 1: Critical Services (1-2 hours)
1. ✅ Signature workflow service
2. ✅ Workflow automation engine  
3. ✅ Strike fund tax service
4. ✅ Member data utils
5. ✅ Rewards stats utils

### Phase 2: Supporting Services (30 min)
6. ✅ PKI services
7. ✅ Support service
8. ✅ Transfer pricing service
9. ✅ Autopay utils
10. ✅ PDF generator types

### Phase 3: Worker & Edge Services (30 min)
11. ✅ Worker type fixes
12. ✅ Workflow engine date handling
13. ⚠️ Supabase functions config (exclude)

### Phase 4: Configuration & Verification (30 min)
14. ✅ ESLint config updates
15. ✅ Final type check
16. ✅ Final ESLint run

---

## Verification Plan

After each phase:
```bash
# Type check
pnpm tsc --noEmit --incremental

# ESLint
pnpm eslint . --ext .ts,.tsx --max-warnings 0

# Count remaining errors
pnpm tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object
```

---

## Success Criteria

- [ ] Zero TypeScript errors in `pnpm type-check`
- [ ] Zero ESLint errors in source files
- [ ] All Phase 0 features still working
- [ ] No breaking changes to existing APIs
- [ ] Supabase functions properly excluded

---

## Next Steps

1. Start with signature workflow service (highest error count)
2. Work through services systematically
3. Verify after each major fix
4. Create final validation report
