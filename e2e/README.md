# E2E Testing Guide

**Framework:** Playwright  
**Version:** Latest  
**Coverage:** Critical user journeys  
**CI Integration:** Pending  
**Last Updated:** February 14, 2026

---

## Overview

This directory contains end-to-end (E2E) tests for the Union Eyes platform using Playwright. These tests validate critical user flows across browsers and devices, ensuring production readiness and institutional confidence.

**Purpose:**
- Validate complete user journeys (authentication → transaction → confirmation)
- Catch integration bugs before production
- Support SOC 2 / ISO 27001 testing requirements
- Provide confidence for enterprise demos

---

## Test Coverage

### Critical Flows (Must Pass for Production)

| Test Suite | File | Business Impact | SLA Impact |
|------------|------|-----------------|------------|
| Member Onboarding | `01-member-onboarding.spec.ts` | High - Blocks new member access | SEV-1 |
| Admin Approval Pipeline | `02-admin-approval-pipeline.spec.ts` | Critical - Core union service | SEV-1 |
| Rewards Redemption | `03-rewards-redemption.spec.ts` | High - Financial transaction | SEV-2 |

### Planned Coverage (Priority Order)

1. **Voting Flow** (Q2 2026)
   - Member casts vote
   - Admin creates election
   - Results published

2. **Dues Payment** (Q2 2026)
   - Member updates payment method
   - Recurring payment processed
   - Failure handling

3. **Claims Management** (Q2 2026)
   - Member creates claim
   - Steward assignment
   - Status tracking

4. **CBA Document Access** (Q3 2026)
   - Search CBA library
   - Download document
   - Confidential access control

---

## Installation

### Prerequisites

```bash
# Install Playwright
pnpm add -D @playwright/test

# Install Playwright browsers
pnpm exec playwright install
```

### Environment Setup

Create `.env.test` file:

```env
# E2E Test Configuration
E2E_BASE_URL=http://localhost:3000
E2E_SKIP_BUILD=false

# Test User Credentials
E2E_ADMIN_EMAIL=admin@test.local
E2E_ADMIN_PASSWORD=SecureAdminPass123!@#

E2E_OFFICER_EMAIL=officer@test.local
E2E_OFFICER_PASSWORD=SecureOfficerPass123!@#

E2E_MEMBER_EMAIL=member@test.local
E2E_MEMBER_PASSWORD=SecureMemberPass123!@#

# Test Organization
E2E_INVITE_CODE=TEST-INVITE-2026
E2E_ORG_ID=test-org-uuid
```

**⚠️ Security Note:** Never commit real credentials. Use test accounts only.

---

## Running Tests

### Local Development

```bash
# Run all E2E tests
pnpm e2e

# Run with UI (interactive mode)
pnpm e2e:ui

# Run specific test file
pnpm e2e critical-flows/01-member-onboarding

# Run in headed mode (see browser)
pnpm e2e:headed

# Run on specific browser
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=webkit
```

### CI/CD Pipeline

```bash
# CI mode (no web server, retries enabled)
CI=true pnpm e2e

# Generate HTML report
pnpm e2e:report
```

### Debugging

```bash
# Debug mode (step through test)
pnpm exec playwright test --debug

# Show trace viewer for last run
pnpm exec playwright show-trace

# Record trace for debugging
pnpm exec playwright test --trace on
```

---

## Test Structure

### Anatomy of a Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  // Use authenticated session
  test.use({ storageState: '.auth/member.json' });
  
  test('should complete user flow', async ({ page }) => {
    // Step 1: Navigate
    await page.goto('/feature');
    
    // Step 2: Interact
    await page.click('button:has-text("Action")');
    
    // Step 3: Assert
    await expect(page.locator('text="Success"')).toBeVisible();
  });
});
```

### Best Practices

**DO:**
- ✅ Use data-testid attributes for stable selectors
- ✅ Wait for elements with `expect(...).toBeVisible()`
- ✅ Test both success and failure paths
- ✅ Clean up test data after runs
- ✅ Use descriptive test names (should...)

**DON'T:**
- ❌ Use brittle CSS selectors (`.class-123`)
- ❌ Hard-code wait times (`page.waitForTimeout(5000)`)
- ❌ Test implementation details (internal state)
- ❌ Share state between tests
- ❌ Commit authentication tokens

---

## Authentication

### Storage State Pattern

Playwright uses "storage state" to preserve authentication across tests. This avoids logging in for every test.

**How it Works:**
1. `global-setup.ts` authenticates users once
2. Saves cookies/localStorage to `.auth/*.json`
3. Tests load saved state with `test.use({ storageState: '.auth/admin.json' })`

**Roles Available:**
- `admin.json` - Full system access
- `officer.json` - Departmental leadership
- `member.json` - Standard member

**Refresh Authentication:**
```bash
# Delete cached auth and re-authenticate
rm -rf .auth/
pnpm e2e
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main, staging]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
        
      - name: Run E2E tests
        run: CI=true pnpm e2e
        env:
          E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
          E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
          E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Deployment Gates

**Pre-Production Checklist:**
- [ ] All critical flows passing (3/3)
- [ ] No flaky tests (>95% pass rate)
- [ ] Trace files under 100MB
- [ ] Load time < 5s (P95)

**Production Gate:**
- Require E2E tests pass before merge to `main`
- Manual approval for E2E failures (emergency fixes only)

---

## Debugging Failed Tests

### Common Issues

**Issue:** "Timeout waiting for element"
**Solution:** Element may load slowly. Increase timeout or add explicit wait.
```typescript
await expect(element).toBeVisible({ timeout: 30000 }); // 30s
```

**Issue:** "Element is not clickable"
**Solution:** Element may be covered or outside viewport. Scroll into view.
```typescript
await element.scrollIntoViewIfNeeded();
await element.click();
```

**Issue:** "Authentication failed"
**Solution:** Test credentials expired or invalid.
```bash
# Check environment variables
echo $E2E_ADMIN_EMAIL

# Re-run global setup
rm -rf .auth/
pnpm e2e
```

### Trace Viewer

Playwright records full traces for failed tests:

```bash
# Open trace for last failed test
pnpm exec playwright show-trace

# View HTML report with traces
pnpm e2e:report
```

**Trace Features:**
- Timeline of actions
- Screenshots at each step
- Network requests
- Console logs
- DOM snapshots

---

## Performance Benchmarks

### Target Metrics

| Flow | P50 Latency | P95 Latency | Max Duration |
|------|-------------|-------------|--------------|
| Member Onboarding | < 3s | < 8s | 15s |
| Admin Approval | < 2s | < 5s | 10s |
| Rewards Redemption | < 5s | < 12s | 30s (incl. Stripe) |

### Monitoring

```bash
# Run tests with performance metrics
pnpm exec playwright test --reporter=html,json

# Analyze JSON report
cat test-results/results.json | jq '.suites[].specs[].results[].duration'
```

---

## Test Data Management

### Test Organization

**Recommended:** Create dedicated test organization in staging environment.

```sql
INSERT INTO organizations (id, name, slug) 
VALUES ('test-org-e2e', 'E2E Test Organization', 'e2e-test');
```

### Data Cleanup

**After Each Test:**
```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data via API
  await page.request.delete(`/api/test-data/cleanup`);
});
```

**Weekly Cleanup:**
```bash
# Purge test data older than 7 days
pnpm exec tsx scripts/cleanup-e2e-data.ts
```

---

## Mobile Testing

### Device Emulation

```bash
# Run on mobile viewport
pnpm exec playwright test --project="Mobile Chrome"
pnpm exec playwright test --project="Mobile Safari"
```

### Responsive Validation

```typescript
test('should work on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  
  // Test mobile-specific UI
  await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
});
```

---

## Visual Regression Testing

### Screenshot Comparison

```typescript
test('should match baseline screenshot', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Compare against baseline
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100, // Allow minor differences
  });
});
```

### Update Baselines

```bash
# Update all screenshot baselines
pnpm exec playwright test --update-snapshots
```

---

## Accessibility Testing

### Automated A11y Checks

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  
  const results = await new AxeBuilder({ page }).analyze();
  
  expect(results.violations).toEqual([]);
});
```

---

## Advanced Patterns

### API Mocking

```typescript
test('should handle API errors gracefully', async ({ page, context }) => {
  // Mock API response
  await context.route('**/api/claims', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });
  
  // Verify error handling
  await page.goto('/dashboard/claims');
  await expect(page.locator('text="Error loading claims"')).toBeVisible();
});
```

### Multi-User Scenarios

```typescript
test('should support real-time collaboration', async ({ browser }) => {
  // Open two contexts (different users)
  const adminContext = await browser.newContext({ storageState: '.auth/admin.json' });
  const memberContext = await browser.newContext({ storageState: '.auth/member.json' });
  
  const adminPage = await adminContext.newPage();
  const memberPage = await memberContext.newPage();
  
  // Admin creates vote
  await adminPage.goto('/dashboard/votes/new');
  await adminPage.fill('input[name="title"]', 'Test Vote');
  await adminPage.click('button:has-text("Publish")');
  
  // Member sees vote immediately
  await memberPage.goto('/dashboard/votes');
  await expect(memberPage.locator('text="Test Vote"')).toBeVisible();
});
```

---

## Troubleshooting

### Flaky Tests

**Symptoms:** Tests pass sometimes, fail randomly

**Common Causes:**
1. Race conditions (async operations)
2. Timing-dependent assertions
3. Shared state between tests
4. External API instability

**Solutions:**
```typescript
// ❌ BAD: Fixed timeout
await page.waitForTimeout(3000);

// ✅ GOOD: Wait for condition
await expect(element).toBeVisible();

// ✅ GOOD: Retry logic
await expect(async () => {
  const count = await page.locator('.item').count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 10000 });
```

### CI vs. Local Differences

**Issue:** Tests pass locally, fail in CI

**Checklist:**
- [ ] Environment variables set in CI?
- [ ] Database seeded with test data?
- [ ] Sufficient timeout for slower CI machines?
- [ ] Network latency differences?

---

## Contribution Guidelines

### Adding New Tests

1. Identify critical user flow
2. Write test in `e2e/critical-flows/`
3. Use descriptive file names (`04-feature-name.spec.ts`)
4. Document business impact in header comment
5. Test both success and failure paths
6. Add to coverage table in this README

### Review Checklist

- [ ] Test passes consistently (3/3 local runs)
- [ ] No hard-coded waits (`waitForTimeout`)
- [ ] Uses data-testid for selectors
- [ ] Handles loading states
- [ ] Cleans up test data
- [ ] Documented in README

---

## Resources

**Official Docs:** https://playwright.dev/docs/intro  
**Best Practices:** https://playwright.dev/docs/best-practices  
**CI/CD:** https://playwright.dev/docs/ci  
**Trace Viewer:** https://trace.playwright.dev/

**Internal Resources:**
- Test Data Seeding: `scripts/seed-e2e-data.ts`
- API Mocks: `e2e/mocks/`
- Page Objects: `e2e/page-objects/` (future)

---

## Metrics & Goals

### Current State (Feb 2026)

- **Coverage:** 3 critical flows
- **Pass Rate:** TBD (new baseline)
- **Execution Time:** ~5 min (all tests)
- **Browsers:** Chrome, Firefox, Safari

### Target State (Q2 2026)

- **Coverage:** 10+ critical flows
- **Pass Rate:** >98% (allow 2% flake)
- **Execution Time:** <10 min
- **Browsers:** Chrome, Firefox, Safari + Mobile

---

## Contact

**E2E Test Owner:** QA Engineering Team  
**Questions:** qa-team@unioneyes.com  
**Slack Channel:** #e2e-testing  
**Incident Escalation:** Create issue with `e2e-test-failure` label
