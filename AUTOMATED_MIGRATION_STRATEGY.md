# Automated Route Migration Strategy

## Overview
Systematic migration of 375 API routes using automated script with validation gates.

## Phase 1: Script Validation (Current)
**Status:** ✅ Complete  
**Duration:** 2-3 hours

- [x] Created migration script with pattern detection
- [x] Tested dry-run on sample routes
- [x] Validated error pattern detection (7 patterns)
- [x] Enhanced edge case handling (catch blocks, error details)

**Dry Run Results:**
- 375 routes identified needing migration
- Patterns detected: 400, 401, 403, 404, 409, 429, 500 errors
- 0 failed migrations in dry-run

## Phase 2: Batch Testing (Next)
**Target:** 20 routes  
**Duration:** 1 hour

### Selected Test Batch:
High-priority routes with diverse patterns:

1. `/api/clause-library/route.ts` - Complex validation (2 changes)
2. `/api/voting/sessions/route.ts` - Multiple error types (10 changes)
3. `/api/bargaining-notes/route.ts` - Auth + validation (10 changes)
4. `/api/cbas/route.ts` - Heavy migration (14 changes)
5. `/api/precedents/route.ts` - Max changes (15 changes)
6. `/api/organizations/route.ts` - Conflict errors (5 changes)
7. `/api/upload/route.ts` - File handling (9 changes)
8. `/api/webhooks/signatures/route.ts` - Auth patterns (7 changes)
9. `/api/external-data/route.ts` - External API (11 changes)
10. `/api/onboarding/route.ts` - User flows (3 changes)

### Validation Checklist:
- [ ] Run actual migration on test batch
- [ ] Verify TypeScript compiles
- [ ] Check import statements added correctly
- [ ] Verify error codes map correctly
- [ ] Test at least 3 routes manually
- [ ] Run security audit (should show increased score)
- [ ] Check no regressions in existing tests

## Phase 3: Domain-Specific Migration
**Target:** 355 remaining routes  
**Duration:** 2-3 hours

### Batch 1: Communications (50 routes)
- `/api/communications/**`
- Pattern: High frequency, well-structured
- Risk: Low

### Batch 2: Claims & Workflow (40 routes)
- `/api/claims/**`
- `/api/workflow/**`
- Pattern: State machine transitions
- Risk: Medium (FSM validation)

### Batch 3: Admin & System (37 routes)
- `/api/admin/**`
- Pattern: Role-based access
- Risk: Medium (permission checks)

### Batch 4: Documents & Storage (30 routes)
- `/api/documents/**`
- `/api/storage/**`
- Pattern: File operations
- Risk: Medium (multipart data)

### Batch 5: Analytics & Reports (20 routes)
- `/api/analytics/**`
- `/api/reports/**` (remaining)
- Pattern: Data aggregation
- Risk: Low

### Batch 6: Governance & Voting (15 routes)
- `/api/voting/**`
- `/api/governance/**`
- Pattern: Democratic processes
- Risk: High (integrity critical)

### Batch 7: Integrations (40 routes)
- `/api/webhooks/**`
- `/api/external-data/**`
- Pattern: External APIs
- Risk: Medium (third-party)

### Batch 8: Long Tail (123 routes)
- All remaining routes
- Pattern: Mixed
- Risk: Variable

## Phase 4: Validation & Testing
**Duration:** 2-3 hours

### Automated Validation:
- [ ] TypeScript compilation: `pnpm type-check`
- [ ] Run test suite: `pnpm test`
- [ ] Security audit: `pnpm security:audit-routes`
- [ ] Check coverage: `pnpm coverage:summary`

### Manual Validation:
- [ ] Test 10 migrated endpoints with real requests
- [ ] Verify error responses include trace IDs
- [ ] Check Sentry captures 5xx errors
- [ ] Validate rate limiting errors work
- [ ] Test validation error messages

### Acceptance Criteria:
- ✅ Security score ≥ 75/100 (↑ from 70)
- ✅ Standardized errors: 387/413 (94%, ↑ from 3%)
- ✅ Zero breaking changes in tests
- ✅ TypeScript compilation clean
- ✅ All existing functionality preserved

## Phase 5: Documentation Update
**Duration:** 1 hour

- [ ] Update ERROR_MIGRATION_TRACKER.md
- [ ] Update NEXT_STEPS.md
- [ ] Create MIGRATION_REPORT.md with metrics
- [ ] Update A+_ROADMAP_DEVELOPER_QUICKREF.md

## Risk Mitigation

### Pre-Migration Backup:
```bash
git checkout -b error-migration-backup
git commit -am "Pre-migration snapshot"
```

### Rollback Plan:
```bash
# If issues occur:
git checkout main
git reset --hard error-migration-backup
```

### Safety Checks:
1. **Always dry-run first**: Test patterns before applying
2. **Batch verification**: Validate each batch before next
3. **Incremental commits**: Commit after each successful batch
4. **Test coverage**: Run tests after each domain batch

## Execution Commands

### Dry Run (Safe):
```bash
# Test specific route
pnpm tsx scripts/migrate-route-errors.ts --routes="app/api/path/route.ts" --dry-run

# Test batch
pnpm tsx scripts/migrate-route-errors.ts --routes="app/api/route1.ts,app/api/route2.ts" --dry-run

# Test all
pnpm tsx scripts/migrate-route-errors.ts --all --dry-run
```

### Actual Migration:
```bash
# Single route
pnpm tsx scripts/migrate-route-errors.ts --routes="app/api/path/route.ts"

# Batch with glob pattern
pnpm tsx scripts/migrate-route-errors.ts --routes="app/api/communications/*/route.ts"

# Domain-specific
find app/api/communications -name "route.ts" -type f | xargs -I {} pnpm tsx scripts/migrate-route-errors.ts --routes={}

# All remaining (after validation)
pnpm tsx scripts/migrate-route-errors.ts --all
```

### Validation:
```bash
# After each batch
pnpm type-check
pnpm test --run
pnpm security:audit-routes

# Verify specific route
curl -X GET http://localhost:3000/api/route-name
```

## Progress Tracking

### Current Status:
- **Routes migrated manually:** 12/413 (3%)
- **Routes needing migration:** 375/413 (91%)
- **Routes already compliant:** 26/413 (6%)

### Target Status:
- **Routes migrated:** 387/413 (94%)
- **Security score:** 75+/100
- **Estimated effort:** 6-8 hours total

## Success Metrics

### Before:
- Security Score: 70/100
- Standardized Errors: 12/413 (3%)
- Critical Issues: 141

### After (Target):
- Security Score: 75+/100
- Standardized Errors: 387/413 (94%)
- Critical Issues: <100

### Benefits:
- ✅ Consistent error format across all routes
- ✅ Better debugging with trace IDs
- ✅ Automatic Sentry error reporting
- ✅ Type-safe error codes
- ✅ Easier maintenance and testing

## Next Steps

1. **Execute Phase 2 (Test Batch)**: Migrate 20 representative routes
2. **Validate thoroughly**: Run all checks
3. **If successful → Phase 3**: Domain-specific batches
4. **If issues → Refine**: Fix script and retry

---

**Ready to proceed?**  
Run: `pnpm tsx scripts/migrate-route-errors.ts --routes="app/api/clause-library/route.ts,app/api/voting/sessions/route.ts,app/api/bargaining-notes/route.ts" --dry-run`
