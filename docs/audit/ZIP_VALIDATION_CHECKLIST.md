# POST-AUDIT ZIP VALIDATION CHECKLIST

**Date:** February 9, 2026  
**Reviewer:** Investor Due Diligence Team  
**Package:** `post-audit-validation-2026-02-09.zip`

---

## A) CLAIMS API FSM ENFORCEMENT

### ✅ Verified in Implementation

- [x] **PATCH /api/claims/[id]** enforces FSM via `updateClaimStatus()`
  - File: `app/api/claims/[id]/route.ts` (lines ~200-250)
  - Code: Status extracted, validated via workflow engine, safe fields updated separately
  
- [x] **DELETE /api/claims/[id]** enforces FSM cooling-off period
  - File: `app/api/claims/[id]/route.ts` (lines ~270-290)
  - Code: Calls `updateClaimStatus(claimNumber, 'closed', ...)` before setting `closedAt`

- [x] **Integration tests** verify bypass prevention
  - File: `__tests__/api/claims-fsm-integration.test.ts`
  - Coverage: 9 test scenarios, all passing

### ⏳ TO VALIDATE IN ZIP REVIEW

**Check 1: No Hidden Route Variants**

- [ ] Search entire `app/api/claims/` directory for other handlers:

  ```bash
  # Check for alternative routes
  grep -r "claims/" app/api/ | grep "route.ts"
  
  # Should only find:
  # - app/api/claims/route.ts (list/create)
  # - app/api/claims/[id]/route.ts (get/update/delete)
  ```

- [ ] Verify no `/api/claims/update`, `/api/claims/status`, `/api/claims/transition` endpoints exist
- [ ] Confirm all HTTP methods (GET/POST/PATCH/PUT/DELETE) route through same validation

**Check 2: No Direct Database Mutations**

- [ ] Grep for `update(claims).set({ status:` patterns:

  ```typescript
  // FORBIDDEN (bypass):
  tx.update(claims).set({ status: newStatus })
  
  // REQUIRED (FSM-enforced):
  updateClaimStatus(claimNumber, newStatus, userId, notes, tx)
  ```

- [ ] Verify no Drizzle `.set()` calls include status field except via workflow engine

**Check 3: Integration Tests Run in CI**

- [ ] File `.github/workflows/???.yml` includes:

  ```yaml
  - name: Run FSM integration tests
    run: pnpm vitest run __tests__/api/claims-fsm-integration.test.ts
  ```

- [ ] Tests assert expected failures (400 errors, specific error messages)
- [ ] CI fails if any test fails (not soft-warn)

**Expected Outcome:**

- ✅ **PASS:** Zero bypass paths found, tests in CI, assertions valid
- ⚠️ **FAIL:** Any alternative route, any direct status mutation, or tests not in CI

---

## B) REPO HYGIENE GATE (MONOREPO-SAFE)

### ✅ Verified in Implementation

- [x] **CI workflow** exists at `.github/workflows/repo-hygiene.yml`
- [x] **Script passes** current validation (`node scripts/check-repo-hygiene.js`)
- [x] **Enhanced error messages** guide developers to fix commands

### ⏳ TO VALIDATE IN ZIP REVIEW

**Check 1: Monorepo-Safe .gitignore Patterns**

- [ ] File `.gitignore` uses globstar patterns:

  ```gitignore
  # GOOD (matches nested):
  **/.next/
  **/node_modules/
  **/dist/
  **/build/
  **/.turbo/
  
  # BAD (only root):
  /.next/
  /node_modules/
  ```

- [ ] Patterns cover all monorepo packages (`cba-intelligence/`, `packages/*/`, `mobile/`)

**Check 2: Script Uses Regex for Nested Paths**

- [ ] File `scripts/check-repo-hygiene.js` patterns like:

  ```javascript
  const FORBIDDEN_PATTERNS = [
    /(^|\/)\.next\//,      // Matches .next/ anywhere
    /(^|\/)node_modules\//, // Matches node_modules/ anywhere
    /(^|\/)dist\//,
    /(^|\/)build\//
  ];
  ```

- [ ] NOT simple string prefix match (would miss `packages/foo/.next/`)

**Check 3: CI Workflow Calls Correct Script**

- [ ] File `.github/workflows/repo-hygiene.yml` step:

  ```yaml
  - name: Run hygiene check
    run: |
      bash scripts/check-repo-hygiene.sh || {
        echo "::error::❌ Repository hygiene check FAILED!"
        echo "::error::To fix, run:"
        echo "::error::  git rm --cached -r .next/ dist/ build/"
        exit 1
      }
  ```

- [ ] Script exits with code 1 on failure (not 0)
- [ ] CI workflow has `fail-fast: true` or equivalent

**Check 4: Verify Shell Script Exists**

- [ ] File `scripts/check-repo-hygiene.sh` exists and is executable
- [ ] OR workflow correctly calls Node variant: `node scripts/check-repo-hygiene.js`

**Expected Outcome:**

- ✅ **PASS:** Globstar patterns, regex matching, proper exit codes, CI enforcement
- ⚠️ **FAIL:** Root-only patterns, string-prefix matching, or soft CI warnings

---

## C) GUARD COVERAGE MONITORING

### ✅ Verified in Audit Report

- [x] **94% coverage** reported (360/384 routes guarded)
- [x] **Canonical guards** defined in `lib/api-auth-guard.ts`
- [x] **Scanner tool** exists (referenced in audit subagent reports)

### ⏳ TO VALIDATE IN ZIP REVIEW

**Check 1: Scanner is Deterministic**

- [ ] Find guard scanner tool (likely in `scripts/` or `tools/`)
- [ ] Run scanner twice, confirm identical output:

  ```bash
  node scripts/guard-coverage-scanner.js > run1.txt
  node scripts/guard-coverage-scanner.js > run2.txt
  diff run1.txt run2.txt  # Should be empty
  ```

- [ ] Scanner uses AST parsing (not regex) for reliability

**Check 2: Allowlist is Explicit**

- [ ] Scanner config/code includes allowlist of routes without guards:

  ```javascript
  const ALLOWED_UNGUARDED = [
    'app/api/webhooks/clerk/route.ts',  // Public webhook
    'app/api/webhooks/stripe/route.ts', // Public webhook
    'app/api/health/route.ts'           // Public healthcheck
  ];
  ```

- [ ] Each entry has justification comment
- [ ] Allowlist is <10% of total routes (approx 24/384 = 6%)

**Check 3: Failing Conditions Are Real**

- [ ] Scanner outputs specific failures (not just count):

  ```
  ❌ UNGUARDED: app/api/claims/[id]/route.ts
     Missing one of: withRoleAuth, withEnhancedRoleAuth, withApiAuth
  ```

- [ ] Not fragile string matching like `if (file.includes('withRole'))`
- [ ] Actually parses imports and function wrappers

**Check 4: CI Enforcement (if applicable)**

- [ ] Check if `.github/workflows/api-security.yml` runs scanner
- [ ] If yes: verify exit code 1 on coverage drop
- [ ] If no: note as "monitoring only, not enforced" (acceptable for now)

**Expected Outcome:**

- ✅ **PASS:** Deterministic, explicit allowlist, real parsing, proper failures
- ⚠️ **FAIL:** Non-deterministic, overly permissive allowlist, or fragile string matching

---

## VALIDATION SUMMARY TEMPLATE

After completing all checks above, fill out:

### A) Claims API FSM Enforcement

- [ ] ✅ PASS - Zero bypass paths
- [ ] ⚠️ PARTIAL - Issues found: _______________
- [ ] ❌ FAIL - Critical bypass exists: _______________

### B) Repo Hygiene Gate

- [ ] ✅ PASS - Monorepo-safe patterns
- [ ] ⚠️ PARTIAL - Issues found: _______________
- [ ] ❌ FAIL - Root-only patterns or missing CI enforcement: _______________

### C) Guard Coverage Monitoring

- [ ] ✅ PASS - Deterministic and explicit
- [ ] ⚠️ PARTIAL - Issues found: _______________
- [ ] ❌ FAIL - Non-deterministic or overly permissive: _______________

### Overall Certification

- [ ] ✅ **CERTIFIED PASS** - Staging-ready, security A- confirmed
- [ ] 🟡 **CONDITIONAL PASS** - Staging-ready with minor fixes needed (list):
  - `_______________`
  - `_______________`
- [ ] ⚠️ **DOWNGRADE TO B+** - Issues require remediation before staging deployment

---

## KNOWN LIMITATIONS (NOT BLOCKERS)

These are acknowledged gaps for the next sprint (PRs #10, #11, #3):

1. **Mutable Transition History** - Can still UPDATE transition records (PR #10 will fix)
2. **Deletable Audit Logs** - Can still DELETE audit logs (PR #11 will fix)
3. **No Auth Guard Tests** - Guard coverage scanner exists but lacks test suite (PR #3 will add)

These do NOT block staging deployment but ARE system-of-record blockers for production.

---

## NEXT STEPS BASED ON VALIDATION

**If PASS:**

1. Approve staging deployment
2. Monitor claims API for 24-48 hours
3. Begin Week 2 work (PRs #10, #11, #3)

**If CONDITIONAL PASS:**

1. Document specific issues in GitHub issue
2. Provide exact fix (1-line changes preferred)
3. Re-run affected tests
4. Approve conditional staging deployment

**If FAIL:**

1. Create detailed failure report
2. Downgrade security score to B+
3. Block staging deployment until critical issues resolved

---

**Validation Date:** _______________  
**Reviewer Name:** _______________  
**Outcome:** _______________  
**Notes:**
