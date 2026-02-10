# Release Contract Testing Guide

**Version:** 1.0.0  
**Last Updated:** February 9, 2026  
**Commit:** `bcf0aee8`

---

## Overview

The Release Contract is a machine-verifiable CI workflow that ensures code quality and security before production deployment. This guide explains how to run it against staging and production-like environments.

---

## Prerequisites

### Required Infrastructure

1. **Staging Database**
   - PostgreSQL 15+ with all migrations applied
   - Seeded with test data
   - Connection string: `DATABASE_URL` environment variable

2. **Staging Environment**
   - Deployed application accessible via HTTPS
   - URL: `STAGING_API_BASE_URL` environment variable
   - API authentication configured

3. **CI/CD Pipeline**
   - GitHub Actions runner with Node.js 20+
   - Access to secrets: `STAGING_DATABASE_URL`, `STAGING_API_URL`

---

## Release Contract Components

### 1. Critical Security Tests

**Tests to Run:**
```bash
# FSM Transition Validation
pnpm vitest run __tests__/services/claim-workflow-fsm.test.ts --reporter=verbose

# Claims API FSM Integration
pnpm vitest run __tests__/api/claims-fsm-integration.test.ts --reporter=verbose

# Database Immutability Constraints
pnpm vitest run __tests__/db/immutability-constraints.test.ts --reporter=verbose

# Security Enforcement Layer
pnpm vitest run __tests__/enforcement-layer.test.ts --reporter=verbose

# Indigenous Data Service (Data Sovereignty)
pnpm vitest run __tests__/lib/indigenous-data-service.test.ts --reporter=verbose
```

**Success Criteria:**
- All tests pass (0 failures)
- No timeout errors
- Duration < 5 minutes

**Failure Handling:**
- Block deployment
- Create GitHub issue automatically
- Notify #platform-alerts Slack channel

---

### 2. RLS Scanner (Scoped)

**Command:**
```bash
pnpm tsx scripts/scan-rls-usage-v2.ts --scope=tenant --max-violations=0
```

**What It Checks:**
- Critical table queries (claims, grievances, members, votes, elections, notifications, messages)
- Tenant context enforcement via `withRLSContext()`
- No unknown context queries
- Allowlist compliance

**Success Criteria:**
```json
{
  "tenantCriticalTableViolations": 0,
  "unknownContextQueries": 0
}
```

**Failure Handling:**
- Exit code 1 → CI pipeline fails
- Generate `rls-report.json` artifact
- Upload report to GitHub Actions artifacts

---

### 3. Type Checking

**Command:**
```bash
pnpm typecheck
```

**Success Criteria:**
- 0 TypeScript errors
- All types resolved
- No `any` usage in critical paths (if enabled)

---

### 4. Linting

**Command:**
```bash
pnpm lint
```

**Success Criteria:**
- 0 ESLint errors
- Warnings allowed (configurable threshold)

---

## Running Against Staging

### Local Staging Test

**Setup:**
```bash
# Export staging credentials
export DATABASE_URL="postgresql://staging_user:password@staging-db.example.com:5432/unioneyes_staging"
export STAGING_API_BASE_URL="https://staging.unioneyes.app"
export NEXT_PUBLIC_SUPABASE_URL="https://staging-supabase.example.com"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Install dependencies
pnpm install --frozen-lockfile
```

**Run Release Contract:**
```bash
# Full contract
./scripts/run-release-contract.sh

# Or step-by-step
pnpm vitest run __tests__/services/claim-workflow-fsm.test.ts
pnpm vitest run __tests__/api/claims-fsm-integration.test.ts
pnpm vitest run __tests__/db/immutability-constraints.test.ts
pnpm vitest run __tests__/enforcement-layer.test.ts
pnpm vitest run __tests__/lib/indigenous-data-service.test.ts
pnpm tsx scripts/scan-rls-usage-v2.ts --scope=tenant --max-violations=0
pnpm typecheck
pnpm lint
```

**Verify Output:**
```bash
# Check exit codes
echo $?  # Should be 0

# View artifacts
ls -lh rls-report.json migration-manifest.json release-contract-summary.txt
```

---

### CI/CD Integration (GitHub Actions)

**Trigger:**
- On pull request to `main`
- On push to `main`
- Manual workflow dispatch

**Workflow File:** `.github/workflows/release-contract.yml`

**Secrets Required:**
```yaml
secrets:
  STAGING_DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
  STAGING_API_URL: ${{ secrets.STAGING_API_URL }}
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
```

**Monitor Execution:**
```bash
# View GitHub Actions run
gh run list --workflow=release-contract.yml

# View logs
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>
```

---

## Staging Database Setup

### 1. Create Staging Database

```bash
# Create database
psql -h staging-db.example.com -U postgres <<EOF
CREATE DATABASE unioneyes_staging;
CREATE USER staging_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE unioneyes_staging TO staging_user;
EOF
```

### 2. Apply Migrations

```bash
# Set database URL
export DATABASE_URL="postgresql://staging_user:password@staging-db.example.com:5432/unioneyes_staging"

# Run migrations
pnpm drizzle-kit push:pg

# Verify migrations
psql $DATABASE_URL -c "SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

### 3. Seed Test Data

```bash
# Seed script
pnpm tsx scripts/seed-staging-database.ts

# Verify seeding
psql $DATABASE_URL -c "SELECT COUNT(*) FROM claims;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM organization_members;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM organizations;"
```

**Seed Data Requirements:**
- 3+ organizations with different tiers
- 10+ organization members across orgs
- 20+ claims in various states
- 5+ grievances
- Sample elections and votes
- Notification templates

---

## Immutability Verification in Staging

### Test Immutability Triggers

**Script:** `scripts/verify-immutability-staging.ts`

```typescript
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function testImmutability() {
  console.log('Testing immutability on staging...');
  
  try {
    // Attempt to modify immutable record
    await db.execute(sql`
      UPDATE grievance_transitions 
      SET status = 'modified_illegally' 
      WHERE id = (SELECT id FROM grievance_transitions LIMIT 1)
    `);
    
    console.error('❌ FAIL: Immutability NOT enforced');
    process.exit(1);
  } catch (error) {
    if (error.message.includes('immutable') || error.message.includes('cannot update')) {
      console.log('✅ PASS: Immutability enforced correctly');
      process.exit(0);
    } else {
      console.error('❌ FAIL: Unexpected error:', error.message);
      process.exit(1);
    }
  }
}

testImmutability();
```

**Run Test:**
```bash
export DATABASE_URL="postgresql://staging_user:password@staging-db.example.com:5432/unioneyes_staging"
pnpm tsx scripts/verify-immutability-staging.ts
```

---

## Integration Test Suite (Staging)

### Prerequisites

- Staging environment deployed
- Test user accounts created
- API keys configured

### Run Integration Tests

```bash
# Set environment
export RUN_INTEGRATION_TESTS=true
export INTEGRATION_API_BASE_URL="https://staging.unioneyes.app"
export INTEGRATION_API_KEY="test_key_xxx"

# Run integration suite
pnpm vitest run __tests__/integration/ --reporter=verbose

# Run specific integration tests
pnpm vitest run __tests__/integration/api/ --reporter=verbose
pnpm vitest run __tests__/integration/e2e/ --reporter=verbose
```

### Test Categories

1. **API Integration Tests**
   - Authentication flows
   - CRUD operations
   - FSM transitions
   - Cross-organization isolation

2. **Webhook Integration Tests**
   - Stripe webhook processing
   - Clerk webhook handling
   - External data sync

3. **E2E User Flows**
   - Claim submission → approval → resolution
   - Election creation → voting → results
   - Message thread creation → replies

---

## Artifacts and Reports

### Generated Artifacts

1. **Migration Manifest** (`migration-manifest.json`)
   ```json
   {
     "commit": "bcf0aee8",
     "totalMigrations": 65,
     "migrations": [...]
   }
   ```

2. **RLS Scanner Report** (`rls-report.json`)
   ```json
   {
     "summary": {
       "tenantCriticalTableViolations": 0,
       "unknownContextQueries": 0
     }
   }
   ```

3. **Release Contract Summary** (`release-contract-summary.txt`)
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 RELEASE CONTRACT SUMMARY
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Commit: bcf0aee8
   Branch: main
   Date: 2026-02-09 14:30:00 UTC
   
   ✅ Critical Security Tests: PASSED
   ✅ RLS Coverage (Scoped): PASSED
   ✅ Type Checking: PASSED
   ✅ Linting: PASSED
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 RELEASE CONTRACT VERIFIED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

### Artifact Retention

- **GitHub Actions:** 90 days
- **S3 Archive:** 1 year
- **Compliance Archive:** 7 years (for audit purposes)

---

## Troubleshooting

### Common Issues

#### 1. **Database Connection Timeout**

**Symptoms:**
```
Error: connect ETIMEDOUT
```

**Solutions:**
- Verify DATABASE_URL is correct
- Check firewall rules allow CI runner IP
- Increase connection timeout in workflow

#### 2. **RLS Scanner False Positives**

**Symptoms:**
```
Critical Table Violations: 2
```

**Solutions:**
- Review violations in `rls-report.json`
- Add to allowlist if legitimate (with justification)
- Fix actual RLS violations with `withRLSContext()`

#### 3. **Test Flakiness in Staging**

**Symptoms:**
```
Test failed: Timeout waiting for state transition
```

**Solutions:**
- Increase test timeouts
- Add retry logic for external dependencies
- Ensure staging database has clean state

---

## Production Gate Checklist

Before deploying to production, verify:

- [ ] Release contract passed in CI
- [ ] All artifacts generated and uploaded
- [ ] Manual review of RLS scanner report
- [ ] Security team sign-off
- [ ] Staging deployment successful for 24+ hours
- [ ] No critical Sentry errors in staging
- [ ] Load testing completed (see [Load Testing Guide](./LOAD_TESTING_GUIDE.md))
- [ ] Rollback plan documented
- [ ] On-call engineer briefed

---

**Document Owner:** Platform Engineering Team  
**Review Frequency:** Per release  
**Last Review:** February 9, 2026
