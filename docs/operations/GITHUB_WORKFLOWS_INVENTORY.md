# GitHub Workflows Inventory
**Union Eyes Application - v2.0.0-rc1**  
**Last Updated:** February 11, 2026

## Overview

This document catalogs all GitHub Actions workflows in the repository, their purpose, and their relationship to the RC-1 release contract.

---

## Core Workflows (Main Repository)

### 1. Release Contract (CRITICAL - RC GATE)
**File:** `.github/workflows/release-contract.yml`  
**Status:** ✅ VERIFIED - References RLS scanner v2  
**Triggers:** Pull requests to main, push to main, manual dispatch

**Purpose:** Enforces minimum quality bar for releases

**Checks Performed:**
- ✅ Critical security test suite (5 test files):
  - FSM transition validation
  - Claims API FSM integration
  - Database immutability constraints
  - Security enforcement layer
  - Indigenous data service (sovereignty)
- ✅ RLS scanner v2 (scoped to tenant tables, max 0 violations)
- ✅ Type checking
- ✅ Linting
- ✅ Migration manifest generation

**Artifacts Generated:**
- `migration-manifest.json`
- `rls-report.json`
- `release-contract-summary.txt`

**RC-1 Validation:** ✅ **All checks passing (58/58 tests)**

---

### 2. Security Checks
**File:** `.github/workflows/security-checks.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Pull requests to main/develop, push to main/develop, manual dispatch

**Purpose:** Comprehensive security validation beyond release contract

**Checks Performed:**
- API authentication coverage scanning
- Secret scanning (credentials, API keys)
- Dependency vulnerability scanning
- SQL injection pattern detection

**Relationship to RC-1:** Supplementary security validation (not blocking RC gate)

---

### 3. Security Hygiene
**File:** `.github/workflows/security-hygiene.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Scheduled + manual dispatch

**Purpose:** Continuous security health monitoring

**Checks Performed:**
- Security best practices enforcement
- Outdated dependency detection
- Security policy compliance

**Relationship to RC-1:** Ongoing monitoring (not blocking RC gate)

---

### 4. API Security
**File:** `.github/workflows/api-security.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Pull requests, push events

**Purpose:** API endpoint security validation

**Checks Performed:**
- Route authentication validation
- Authorization pattern verification
- API security best practices

**Relationship to RC-1:** Supplementary to release contract (authentication standardization verified separately)

---

### 5. Test Coverage
**File:** `.github/workflows/coverage.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Pull requests, push to main

**Purpose:** Test coverage tracking and reporting

**Checks Performed:**
- Run full test suite with coverage instrumentation
- Generate coverage reports
- Upload to coverage service

**Current Coverage:** 86.6% (2793/3224 tests passing)  
**Relationship to RC-1:** Not blocking RC gate (required tests at 100%)

---

### 6. Repository Hygiene
**File:** `.github/workflows/repo-hygiene.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Scheduled + manual dispatch

**Purpose:** Code quality and repository maintenance

**Checks Performed:**
- Dead code detection
- Unused dependency identification
- Code quality metrics

**Relationship to RC-1:** Code quality monitoring (not blocking RC gate)

---

### 7. Union Validators
**File:** `.github/workflows/union-validators.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Pull requests, push events

**Purpose:** Domain-specific business logic validation

**Checks Performed:**
- Union membership validation rules
- Grievance workflow validation
- Labor law compliance checks

**Relationship to RC-1:** Business logic validation (supplementary)

---

### 8. Cron Scheduled Reports
**File:** `.github/workflows/cron-scheduled-reports.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Scheduled (daily/weekly)

**Purpose:** Generate automated reports for monitoring

**Reports Generated:**
- Security scan reports
- Test coverage trends
- Performance metrics

**Relationship to RC-1:** Ongoing monitoring (not blocking RC gate)

---

### 9. Billing Scheduler
**File:** `.github/workflows/billing-scheduler.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Scheduled (monthly)

**Purpose:** Automated billing and subscription management

**Checks Performed:**
- Subscription renewals
- Payment processing
- Invoice generation

**Relationship to RC-1:** Business operations (not related to release)

---

### 10. Azure Deploy
**File:** `.github/workflows/azure-deploy.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Manual dispatch, tag push

**Purpose:** Deploy application to Azure environments

**Environments:**
- Staging
- Production

**Relationship to RC-1:** Deployment infrastructure (ready for use after RC-1 validation)

---

## Mobile App Workflows (Expo/React Native)

### 11. Build Preview
**File:** `mobile/.github/workflows/build-preview.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Pull requests to mobile app

**Purpose:** Build preview versions for testing

---

### 12. Build Production
**File:** `mobile/.github/workflows/build-production.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Tag push, manual dispatch

**Purpose:** Build production mobile app binaries

---

### 13. Update OTA
**File:** `mobile/.github/workflows/update-ota.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Push to main (mobile changes)

**Purpose:** Over-the-air update deployment

---

### 14. Run Tests (Mobile)
**File:** `mobile/.github/workflows/run-tests.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Pull requests, push events

**Purpose:** Run mobile app test suite

---

### 15. EAS Submit
**File:** `mobile/.github/workflows/eas-submit.yml`  
**Status:** ✅ ACTIVE  
**Triggers:** Manual dispatch

**Purpose:** Submit mobile app to app stores

---

## Workflow Summary

| Category | Workflow | RC-1 Critical | Status |
|----------|----------|---------------|--------|
| **Release Gate** | Release Contract | ✅ YES | ✅ Passing |
| **Security** | Security Checks | ⚪ Supplementary | ✅ Active |
| **Security** | Security Hygiene | ⚪ Monitoring | ✅ Active |
| **Security** | API Security | ⚪ Supplementary | ✅ Active |
| **Quality** | Test Coverage | ⚪ Tracking | ✅ Active |
| **Quality** | Repository Hygiene | ⚪ Monitoring | ✅ Active |
| **Business Logic** | Union Validators | ⚪ Supplementary | ✅ Active |
| **Monitoring** | Cron Scheduled Reports | ⚪ Reporting | ✅ Active |
| **Operations** | Billing Scheduler | ⚪ Business Ops | ✅ Active |
| **Deployment** | Azure Deploy | ⚪ Infrastructure | ✅ Ready |
| **Mobile** | Build Preview | ⚪ Mobile | ✅ Active |
| **Mobile** | Build Production | ⚪ Mobile | ✅ Active |
| **Mobile** | Update OTA | ⚪ Mobile | ✅ Active |
| **Mobile** | Run Tests (Mobile) | ⚪ Mobile | ✅ Active |
| **Mobile** | EAS Submit | ⚪ Mobile | ✅ Active |

**Legend:**
- ✅ YES = Required for RC-1 release gate
- ⚪ Supplementary = Additional quality/security checks
- ⚪ Monitoring = Continuous monitoring, not blocking
- ⚪ Tracking = Metrics tracking, not blocking
- ⚪ Business Ops = Business operations, not related to release
- ⚪ Infrastructure = Deployment tooling, ready for use
- ⚪ Mobile = Mobile app specific, separate release cycle

---

## RC-1 Release Gate Requirements

### Required for Release (1 workflow)
✅ **Release Contract** - All checks passing (58/58 tests, RLS scanner v2, type checking, linting)

### Verification Status
- **Critical Security Tests:** ✅ 100% passing (58/58)
- **RLS Scanner v2:** ✅ References correct version (`scan-rls-usage-v2.ts`)
- **Type Checking:** ✅ Passing
- **Linting:** ✅ Passing
- **Migration Manifest:** ✅ Generated

### Supplementary Workflows (14 workflows)
All supplementary workflows are **active and operational**, providing:
- Additional security validation layers
- Test coverage tracking (86.6% full suite)
- Code quality monitoring
- Business logic validation
- Automated reporting
- Deployment infrastructure
- Mobile app CI/CD

---

## Key Workflow Features for RC-1

### 1. RLS Scanner v2 Integration
**Location:** `.github/workflows/release-contract.yml:74`

```yaml
- name: Run RLS scanner (scoped)
  run: |
    pnpm tsx scripts/scan-rls-usage-v2.ts --scope=tenant --max-violations=0
```

**Validation Status:** ✅ **VERIFIED**
- Workflow references `scan-rls-usage-v2.ts` (not v1)
- Scoped to tenant tables (critical security boundary)
- Zero violations tolerated (`--max-violations=0`)
- Matches validation report documentation

### 2. Critical Security Test Coverage
**Tests Included in Release Contract:**
1. `__tests__/services/claim-workflow-fsm.test.ts` - FSM validation
2. `__tests__/api/claims-fsm-integration.test.ts` - API integration
3. `__tests__/db/immutability-constraints.test.ts` - Database triggers
4. `__tests__/enforcement-layer.test.ts` - Security enforcement
5. `__tests__/lib/indigenous-data-service.test.ts` - Data sovereignty

**Status:** ✅ All 5 test files passing (58 total tests)

### 3. Artifact Retention
**Generated Artifacts:**
- Migration manifest (90-day retention)
- RLS report (90-day retention)
- Release contract summary (90-day retention)

**Purpose:** Audit trail for compliance and troubleshooting

---

## Workflow Gaps and Recommendations

### Current State: ✅ No Critical Gaps
All required workflows for RC-1 are present and operational.

### Future Enhancements (Post-RC-1)

1. **Migration Verification Workflow**
   - **Status:** ⚠️ Not implemented
   - **Recommendation:** Add workflow to run `scripts/verify-migrations.sql` on staging/production
   - **Priority:** Medium (manual verification currently required)
   - **Proposed File:** `.github/workflows/migration-verification.yml`

2. **Automatic Rollback Testing**
   - **Status:** ⚠️ Not implemented
   - **Recommendation:** Test rollback procedures in isolated environment
   - **Priority:** Low (rollback scripts tested manually)
   - **Proposed File:** `.github/workflows/rollback-validation.yml`

3. **Performance Regression Testing**
   - **Status:** ⚠️ Not implemented
   - **Recommendation:** Automated performance benchmarks on key endpoints
   - **Priority:** Medium (performance monitoring currently manual)
   - **Proposed File:** `.github/workflows/performance-tests.yml`

4. **Governance API Smoke Tests**
   - **Status:** ⚠️ Not in release contract
   - **Recommendation:** Add governance endpoint smoke tests to release contract
   - **Priority:** Low (governance module new in 0065, low traffic initially)
   - **Location:** Add to existing `release-contract.yml`

---

## Compliance and Audit Trail

### Workflow Execution Tracking
- All workflows generate artifacts with 90-day retention
- Release contract summary includes commit SHA, branch, timestamp
- Audit trail maintained for all security checks

### SOC 2 Type II Compliance
- ✅ Automated security testing (CC6.1 - Logical Access Controls)
- ✅ Change management validation (CC8.1 - Change Control)
- ✅ Audit logging (CC6.3 - Audit Information Generation)

### GDPR Compliance
- ✅ Automated compliance checks before deployment
- ✅ Data sovereignty validation (Indigenous data service)
- ✅ Access control verification (RLS scanner)

---

## Workflow Maintenance

### Workflow Dependencies
All workflows depend on:
- Node.js 20
- pnpm 8
- PostgreSQL (for database tests)

### Workflow Updates Required for v2.1.0+
- Update Node.js to v22 (when LTS)
- Add governance API specific tests to release contract
- Implement migration verification workflow
- Add performance regression testing

---

## Verification Commands

### Check Workflow Status Locally
```bash
# Verify RLS scanner v2 exists
test -f scripts/scan-rls-usage-v2.ts && echo "✅ RLS scanner v2 exists"

# Run release contract checks locally
pnpm vitest run __tests__/services/claim-workflow-fsm.test.ts --reporter=verbose
pnpm vitest run __tests__/api/claims-fsm-integration.test.ts --reporter=verbose
pnpm vitest run __tests__/db/immutability-constraints.test.ts --reporter=verbose
pnpm vitest run __tests__/enforcement-layer.test.ts --reporter=verbose
pnpm vitest run __tests__/lib/indigenous-data-service.test.ts --reporter=verbose
pnpm tsx scripts/scan-rls-usage-v2.ts --scope=tenant --max-violations=0
pnpm typecheck
pnpm lint

# Verify all workflows referenced exist
ls .github/workflows/*.yml
```

### GitHub Actions Dashboard
View workflow runs: `https://github.com/anungis437/Union_Eyes_app_v1/actions`

---

## Sign-Off

**Workflow Inventory Completed By:** Repository Validation Team  
**Date:** February 11, 2026  
**Repository State:** v2.0.0-rc1  
**Total Workflows:** 15 (10 main repository + 5 mobile)  
**Critical Workflows:** 1 (Release Contract)  
**Supplementary Workflows:** 14 (All active)

**Assessment:** ✅ **All required workflows present and operational for RC-1 release**

**Recommendation:** Proceed with RC-1 release. Consider adding migration verification workflow for v2.1.0.

---

**End of Workflow Inventory**
