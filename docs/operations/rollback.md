# Rollback Procedures Runbook

**Version:** 2.0  
**Last Updated:** February 12, 2026  
**Owner:** DevOps Team  
**Review Frequency:** Quarterly

---

## Purpose

This runbook provides comprehensive procedures for rolling back deployments and database migrations in the Union Eyes platform. Designed for rapid execution during incidents when forward fixes are not viable.

---

## Table of Contents

1. [Rollback Decision Framework](#rollback-decision-framework)
2. [Database Migration Rollback](#database-migration-rollback)
3. [Application Deployment Rollback](#application-deployment-rollback)
4. [Verification Procedures](#verification-procedures)
5. [Known Rollback Scenarios](#known-rollback-scenarios)
6. [Emergency Procedures](#emergency-procedures)
7. [Post-Rollback Actions](#post-rollback-actions)

---

## Rollback Decision Framework

### When to Roll Back

**✅ Roll Back When:**
- Critical bug causing SEV-1/SEV-2 incident
- No forward fix available within 30 minutes
- Service degradation affecting >50% users
- Data integrity issues detected
- Security vulnerability introduced
- Unknown root cause with high impact

**❌ Don't Roll Back When:**
- Forward fix available in < 15 minutes
- Issue affects <5% of users with workaround
- Rollback is more risky than forward fix
- Data has already been migrated (check carefully!)
- Root cause is external (upstream API, infrastructure)

### Rollback Risk Assessment Matrix

| Scenario | Risk Level | Proceed? | Notes |
|----------|------------|----------|-------|
| Application code change, no schema changes | 🟢 Low | Yes | Safe, quick rollback |
| Schema change with compatible migration | 🟡 Medium | Yes | Use rollback SQL scripts |
| Schema change with data transformation | 🟠 High | Careful | May lose data, verify first |
| Multiple migrations applied | 🔴 Critical | Consult DBA | Complex dependencies |
| Production data modified | 🔴 Critical | Consult DBA | May be irreversible |

### Emergency Rollback Decision Tree

```
┌───────────────────────────────────┐
│ Is service completely down?       │
└──────────┬────────────────────────┘
           │ YES
           ↓
┌───────────────────────────────────┐
│ Was there a deployment in         │
│ the last 2 hours?                 │
└──────────┬────────────┬───────────┘
           │ YES        │ NO
           ↓            ↓
      ROLLBACK    Investigate
      IMMEDIATELY  other causes
           │
           ↓
┌───────────────────────────────────┐
│ Did the deployment include        │
│ database schema changes?          │
└──────────┬────────────┬───────────┘
           │ YES        │ NO
           ↓            ↓
      Check         Simple
      Section 2     App Rollback
                    (Section 3)
```

---

## Database Migration Rollback

### Overview

Union Eyes uses **Drizzle ORM** for database migrations. Rollback scripts are maintained in:
- **Directory:** [`db/migrations/rollback/`](../../db/migrations/rollback/)
- **Format:** `[migration_number]_rollback.sql`

### Pre-Rollback Checklist

```powershell
# 1. BACKUP CURRENT STATE (CRITICAL!)
.\scripts\backup-restore-drill.ps1 -BackupDir ".\emergency-backups" -KeepBackup $true

# 2. VERIFY WHICH MIGRATION TO ROLLBACK
psql $env:DATABASE_URL -c "
  SELECT id, name, applied_at 
  FROM drizzle_migrations 
  ORDER BY applied_at DESC 
  LIMIT 10;"

# 3. CHECK IF ROLLBACK SCRIPT EXISTS
$migrationName = "0065"  # Replace with actual migration number
$rollbackScript = "db\migrations\rollback\${migrationName}_rollback.sql"
Test-Path $rollbackScript

# 4. REVIEW ROLLBACK SCRIPT
Get-Content $rollbackScript

# 5. CHECK FOR DATA DEPENDENCIES
psql $env:DATABASE_URL -c "
  SELECT table_name, column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public');"
```

### Database Rollback Procedure

#### Step 1: Identify Target Migration

```powershell
# List recent migrations
psql $env:DATABASE_URL -c "
  SELECT id, name, applied_at 
  FROM drizzle_migrations 
  ORDER BY applied_at DESC 
  LIMIT 10;"

# Example output:
# id | name                              | applied_at
# ---|-----------------------------------|-------------------
# 10 | 0066_add_claim_deadlines          | 2026-02-12 02:30:00
# 9  | 0065_add_organization_hierarchy   | 2026-02-12 02:15:00
# 8  | 0064_add_tenant_isolation         | 2026-02-11 14:00:00
```

#### Step 2: Locate Rollback Script

```powershell
# Check if rollback script exists
$migrationNumber = "0066"  # Migration to rollback
$rollbackScript = "db\migrations\rollback\${migrationNumber}_rollback.sql"

if (Test-Path $rollbackScript) {
    Write-Host "✅ Rollback script found: $rollbackScript"
    Get-Content $rollbackScript
} else {
    Write-Host "❌ No rollback script found! Manual rollback required."
    Write-Host "Check: db\migrations\rollback\ directory"
}
```

**Available Rollback Scripts:**
```
db/migrations/rollback/
├── 0062_rollback.sql
├── 0063_rollback.sql
├── 0064_rollback.sql
├── 0065_rollback.sql
├── rollback_0080_add_schema_drift_protection.sql
└── rollback_0081_add_missing_critical_indexes.sql
```

#### Step 3: Execute Rollback

**CRITICAL: Always in a transaction first!**

```powershell
# TEST ROLLBACK IN TRANSACTION (DRY RUN)
psql $env:DATABASE_URL << 'EOF'
BEGIN;

-- Execute rollback script
\i db/migrations/rollback/0066_rollback.sql

-- Verify changes (don't commit yet!)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- If everything looks good, user can COMMIT
-- If issues found, ROLLBACK
ROLLBACK;  -- Or COMMIT if verified
EOF

# ACTUAL ROLLBACK (after dry run verification)
psql $env:DATABASE_URL -f "db\migrations\rollback\0066_rollback.sql"

# Verify rollback was applied
psql $env:DATABASE_URL -c "
  SELECT id, name, applied_at 
  FROM drizzle_migrations 
  ORDER BY applied_at DESC 
  LIMIT 5;"
```

#### Step 4: Update Migration Tracking

```powershell
# Remove migration entry from tracking table
psql $env:DATABASE_URL << 'EOF'
DELETE FROM drizzle_migrations 
WHERE name = '0066_add_claim_deadlines';
EOF

# Verify removal
psql $env:DATABASE_URL -c "
  SELECT count(*) as remaining_migrations 
  FROM drizzle_migrations;"
```

### Common Rollback Scenarios

#### Scenario A: Rolling Back Additive Changes (Low Risk)

**Example:** New table, new column (nullable), new index

```sql
-- Rollback for: Added new table
DROP TABLE IF EXISTS new_table_name CASCADE;

-- Rollback for: Added nullable column
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

-- Rollback for: Added index
DROP INDEX IF EXISTS ix_table_column;
```

**Verification:**
```powershell
psql $env:DATABASE_URL -c "
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'existing_table';"
```

#### Scenario B: Rolling Back Schema Changes (Medium Risk)

**Example:** Column renamed, column type changed

```sql
-- Rollback for: Renamed column
ALTER TABLE users RENAME COLUMN new_name TO old_name;

-- Rollback for: Changed column type
ALTER TABLE users ALTER COLUMN age TYPE INTEGER USING age::INTEGER;

-- Rollback for: Added NOT NULL constraint
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
```

**Verification:**
```powershell
psql $env:DATABASE_URL -c "
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'users';"
```

#### Scenario C: Rolling Back Data Transformations (High Risk)

**Example:** Data migration, data normalization

```sql
-- CRITICAL: These may be irreversible if data was deleted!
-- Always backup before data transformations

-- Rollback for: Normalized data
-- If original data was preserved:
UPDATE organizations 
SET legacy_address_field = new_addresses.full_address
FROM new_addresses
WHERE organizations.id = new_addresses.org_id;

-- If original data was deleted:
-- RESTORE FROM BACKUP (see backup-restore.md)
```

**Verification:**
```powershell
# Check data integrity
psql $env:DATABASE_URL -c "
  SELECT count(*) as total_records,
         count(DISTINCT id) as unique_ids,
         count(*) - count(critical_field) as nulls_in_critical_field
  FROM affected_table;"

# Compare with pre-migration backup
# See: backup-restore.md for comparison procedures
```

#### Scenario D: Rolling Back Multiple Migrations (Critical Risk)

**When multiple migrations are deployed together:**

```powershell
# List all migrations to rollback (newest to oldest)
$migrationsToRollback = @("0066", "0065", "0064")

# CRITICAL: Execute in reverse order!
foreach ($migration in $migrationsToRollback) {
    Write-Host "Rolling back migration: $migration"
    
    $rollbackScript = "db\migrations\rollback\${migration}_rollback.sql"
    
    if (Test-Path $rollbackScript) {
        # Test in transaction first
        psql $env:DATABASE_URL << EOF
BEGIN;
\i $rollbackScript
-- MANUAL REVIEW REQUIRED HERE
-- Verify output, then decide to COMMIT or ROLLBACK
ROLLBACK;
EOF
        
        Write-Host "DRY RUN complete for $migration. Review output."
        $continue = Read-Host "Execute rollback for $migration? (yes/no)"
        
        if ($continue -eq "yes") {
            psql $env:DATABASE_URL -f $rollbackScript
            Write-Host "✅ Rolled back: $migration"
        } else {
            Write-Host "❌ Rollback aborted for: $migration"
            break
        }
    } else {
        Write-Host "⚠️  No rollback script for: $migration"
        Write-Host "Manual intervention required!"
        break
    }
}
```

### Manual Rollback (No Script Available)

If no rollback script exists:

```powershell
# 1. REVIEW MIGRATION CODE
Get-Content "db\migrations\0066_add_claim_deadlines.sql"

# 2. CREATE INVERSE SQL MANUALLY
# Example: If migration added a column, DROP that column
# Save to temporary file: rollback-manual-0066.sql

# 3. TEST IN TRANSACTION
psql $env:DATABASE_URL << 'EOF'
BEGIN;

-- Your manual rollback SQL here
DROP TABLE IF EXISTS claim_deadlines CASCADE;

-- Verify
\dt claim_deadlines

-- If OK, COMMIT. If issues, ROLLBACK
ROLLBACK;
EOF

# 4. APPLY IF VERIFIED
psql $env:DATABASE_URL -f "rollback-manual-0066.sql"

# 5. SAVE ROLLBACK SCRIPT FOR FUTURE
Copy-Item "rollback-manual-0066.sql" "db\migrations\rollback\0066_rollback.sql"
```

### Database Rollback Verification

```powershell
# 1. CHECK SCHEMA MATCHES PRE-MIGRATION STATE
psql $env:DATABASE_URL -c "
  SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  ORDER BY table_name, ordinal_position;"

# 2. CHECK DATA INTEGRITY
psql $env:DATABASE_URL -c "
  SELECT 
    (SELECT count(*) FROM users) as user_count,
    (SELECT count(*) FROM organizations) as org_count,
    (SELECT count(*) FROM claims) as claim_count;"

# Compare with pre-migration counts (from backup or monitoring)

# 3. CHECK FOR ORPHANED DATA
psql $env:DATABASE_URL -c "
  SELECT 'users without org', count(*) FROM users WHERE organization_id IS NULL
  UNION ALL
  SELECT 'claims without user', count(*) FROM claims WHERE user_id NOT IN (SELECT id FROM users);"

# 4. CHECK APPLICATION QUERIES STILL WORK
# Run critical queries from application
psql $env:DATABASE_URL -c "
  SELECT u.email, o.name 
  FROM users u 
  JOIN organizations o ON u.organization_id = o.id 
  LIMIT 10;"

# 5. VERIFY MIGRATION TRACKING
psql $env:DATABASE_URL -c "
  SELECT id, name, applied_at 
  FROM drizzle_migrations 
  ORDER BY applied_at DESC 
  LIMIT 10;"
```

---

## Application Deployment Rollback

### Blue-Green Deployment Rollback

Union Eyes uses **blue-green deployment** for zero-downtime releases.

**Script:** [`scripts/deploy-blue-green.ps1`](../../scripts/deploy-blue-green.ps1)  
**Configuration:** [`docker-compose.blue-green.yml`](../../docker-compose.blue-green.yml)

#### Quick Rollback (Active Rollback)

```powershell
# IMMEDIATE ROLLBACK - Switches back to previous environment
.\scripts\deploy-blue-green.ps1 -Action rollback

# This will:
# 1. Identify current active slot (blue or green)
# 2. Switch traffic back to the other slot
# 3. Verify health of target slot
# 4. Complete switch if healthy
```

**Rollback Process Explained:**

The blue-green deployment maintains two complete environments:
- **Blue Environment:** `unioneyes-blue` container
- **Green Environment:** `unioneyes-green` container

During normal deployment:
1. Deploy new version to inactive slot (e.g., green)
2. Verify health checks pass
3. Switch traffic from blue → green
4. Keep blue running for quick rollback

During rollback:
1. Script identifies current active slot
2. Switches traffic back to previous slot
3. Previous version becomes active again

#### Manual Blue-Green Rollback

If the automated script fails:

```powershell
# 1. CHECK CURRENT STATE
docker ps | grep unioneyes

# Identify which slot is running:
# unioneyes-blue    -> Blue slot
# unioneyes-green   -> Green slot

# 2. CHECK HEALTH OF TARGET SLOT (to rollback to)
$previousSlot = "blue"  # or "green"
docker inspect --format='{{.State.Health.Status}}' "unioneyes-$previousSlot"

# If not healthy, start it:
docker-compose -f docker-compose.blue-green.yml up -d "app-$previousSlot"

# Wait for health check (max 60 seconds)
$retries = 0
while ($retries -lt 30) {
    $health = docker inspect --format='{{.State.Health.Status}}' "unioneyes-$previousSlot"
    if ($health -eq "healthy") {
        Write-Host "✅ $previousSlot is healthy"
        break
    }
    Write-Host "Waiting for $previousSlot to be healthy... ($retries/30)"
    Start-Sleep -Seconds 2
    $retries++
}

# 3. SWITCH TRAFFIC (update Traefik or load balancer)
# This depends on your proxy configuration in docker-compose.blue-green.yml

# If using Traefik labels, recreate the target container with active labels:
docker-compose -f docker-compose.blue-green.yml up -d "app-$previousSlot"

# Or manually update nginx/reverse proxy configuration

# 4. VERIFY TRAFFIC SWITCHED
curl https://unioneyes.azurewebsites.net/api/health
# Check response to confirm previous version

# 5. STOP FAILED DEPLOYMENT SLOT (optional, can keep for investigation)
$failedSlot = "green"  # opposite of previousSlot
docker-compose -f docker-compose.blue-green.yml stop "app-$failedSlot"
```

### Azure App Service Rollback

For Azure-deployed instances:

```powershell
# 1. CHECK DEPLOYMENT HISTORY
az webapp log deployment list \
  --name unioneyes-prod-app \
  --resource-group unioneyes-prod-rg \
  --output table

# 2. IDENTIFY LAST KNOWN GOOD DEPLOYMENT
# Note the deployment ID of the last working version

# 3. ROLLBACK TO SPECIFIC DEPLOYMENT
az webapp deployment source show \
  --name unioneyes-prod-app \
  --resource-group unioneyes-prod-rg

# 4. REDEPLOY PREVIOUS IMAGE (if using containers)
$previousImageTag = "sha-abc123"  # Get from Docker registry or GitHub Actions

az webapp config container set \
  --name unioneyes-prod-app \
  --resource-group unioneyes-prod-rg \
  --docker-custom-image-name "unioneyesacr.azurecr.io/unioneyes:$previousImageTag"

# 5. RESTART APP SERVICE
az webapp restart \
  --name unioneyes-prod-app \
  --resource-group unioneyes-prod-rg

# 6. VERIFY
Start-Sleep -Seconds 30
curl https://unioneyes.azurewebsites.net/api/health
```

### Docker Compose Rollback (Non-Blue-Green)

For simpler Docker Compose deployments:

```powershell
# 1. IDENTIFY PREVIOUS WORKING COMMIT
git log --oneline --all -20

# Example output:
# abc123f Fix critical bug
# def456a Deploy new feature  <- FAILED DEPLOYMENT
# ghi789b Last known good     <- ROLLBACK TO THIS

# 2. CHECKOUT PREVIOUS COMMIT
$lastGoodCommit = "ghi789b"
git checkout $lastGoodCommit

# 3. REBUILD AND REDEPLOY
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 4. VERIFY
Start-Sleep -Seconds 20
docker ps | grep unioneyes
curl http://localhost:3000/api/health
```

### GitHub Actions Deployment Rollback

If deployment was via GitHub Actions:

**Workflow:** [`.github/workflows/azure-deploy.yml`](../../.github/workflows/azure-deploy.yml)

```powershell
# 1. FIND LAST SUCCESSFUL DEPLOYMENT
# Go to: https://github.com/[org]/[repo]/actions/workflows/azure-deploy.yml

# 2. IDENTIFY COMMIT SHA OF LAST GOOD DEPLOYMENT
# From GitHub Actions run, note the commit SHA

# 3. TRIGGER DEPLOYMENT OF THAT COMMIT
# Option A: Via GitHub UI
#   - Go to Actions → azure-deploy workflow
#   - Click "Run workflow"
#   - Select branch/tag of last good commit

# Option B: Via GitHub CLI
gh workflow run azure-deploy.yml --ref $lastGoodCommit

# Option C: Via API
$repo = "your-org/union-eyes"
$workflowId = "azure-deploy.yml"
$commitSha = "ghi789b"

curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$repo/actions/workflows/$workflowId/dispatches" \
  -d "{\"ref\":\"$commitSha\"}"

# 4. MONITOR DEPLOYMENT
# Watch GitHub Actions run to completion
# Verify health after deployment
```

### Application Rollback Verification

```powershell
# 1. CHECK APPLICATION VERSION
curl https://unioneyes.azurewebsites.net/api/version
# Or check in-app: Settings → About → Version

# 2. VERIFY HEALTH ENDPOINTS
curl https://unioneyes.azurewebsites.net/api/health
curl https://unioneyes.azurewebsites.net/api/health/db
curl https://unioneyes.azurewebsites.net/api/health/redis

# Expected response: {"status": "ok", "timestamp": "..."}

# 3. TEST CRITICAL USER FLOWS
# Manual testing checklist:
# [ ] Can users log in?
# [ ] Can users view dashboard?
# [ ] Can users create claims?
# [ ] Can users submit forms?
# [ ] Are notifications working?

# 4. CHECK ERROR RATES IN MONITORING
# Grafana: http://localhost:3001
# Look at dashboard: "Error Rates"
# Verify error rate < 1%

# 5. CHECK LOGS FOR ERRORS
docker logs --since 10m unioneyes-app-prod 2>&1 | grep -i "error" | wc -l
# Should see significant decrease after rollback

# 6. VERIFY DATABASE CONNECTIVITY
psql $env:DATABASE_URL -c "SELECT 1;"
# Should return: 1

# 7. CHECK PERFORMANCE METRICS
# P95 response time should be < 500ms
# Check Grafana: "Response Time" dashboard
```

---

## Verification Procedures

### Post-Rollback Health Check Matrix

| Check | Command | Expected Result | Severity if Failed |
|-------|---------|-----------------|-------------------|
| Application Health | `curl /api/health` | `{"status":"ok"}` | SEV-1 |
| Database Connection | `psql -c "SELECT 1;"` | `1` | SEV-1 |
| Error Rate | Check Grafana | < 1% | SEV-2 |
| Response Time P95 | Check Grafana | < 500ms | SEV-3 |
| User Login | Manual test | Success | SEV-1 |
| Critical Features | Manual test | Working | SEV-2 |

### Automated Verification Script

```powershell
# File: scripts/verify-rollback.ps1

param(
    [string]$Environment = "production"
)

$baseUrl = if ($Environment -eq "production") {
    "https://unioneyes.azurewebsites.net"
} else {
    "https://unioneyes-staging.azurewebsites.net"
}

Write-Host "🔍 Verifying rollback for $Environment environment..." -ForegroundColor Cyan

$allPassed = $true

# Test 1: Health endpoint
Write-Host "`n1. Testing health endpoint..."
try {
    $health = Invoke-RestMethod "$baseUrl/api/health" -TimeoutSec 10
    if ($health.status -eq "ok") {
        Write-Host "✅ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check failed: $($health.status)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ Health endpoint unreachable: $($_.Exception.Message)" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Database health
Write-Host "`n2. Testing database connection..."
try {
    $dbHealth = Invoke-RestMethod "$baseUrl/api/health/db" -TimeoutSec 10
    if ($dbHealth.status -eq "ok") {
        Write-Host "✅ Database connection healthy" -ForegroundColor Green
    } else {
        Write-Host "❌ Database connection failed" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ Database health check failed: $($_.Exception.Message)" -ForegroundColor Red
    $allPassed = $false
}

# Test 3: Check error logs (last 5 minutes)
Write-Host "`n3. Checking application error logs..."
$errorCount = (docker logs --since 5m unioneyes-app-prod 2>&1 | 
               Select-String -Pattern "ERROR|FATAL" | 
               Measure-Object).Count

if ($errorCount -lt 5) {
    Write-Host "✅ Error count acceptable: $errorCount errors in last 5 min" -ForegroundColor Green
} else {
    Write-Host "⚠️  High error count: $errorCount errors in last 5 min" -ForegroundColor Yellow
    Write-Host "Review logs: docker logs --since 5m unioneyes-app-prod"
}

# Test 4: Response time check
Write-Host "`n4. Testing response time..."
$start = Get-Date
try {
    Invoke-RestMethod "$baseUrl/api/health" -TimeoutSec 10 | Out-Null
    $elapsed = ((Get-Date) - $start).TotalMilliseconds
    
    if ($elapsed -lt 500) {
        Write-Host "✅ Response time acceptable: ${elapsed}ms" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Slow response time: ${elapsed}ms" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Response time test failed" -ForegroundColor Red
    $allPassed = $false
}

# Test 5: Critical endpoint sampling
Write-Host "`n5. Testing critical endpoints..."
$endpoints = @("/api/organizations", "/api/users/me")
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest "$baseUrl$endpoint" -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
            Write-Host "✅ $endpoint responding" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $endpoint returned: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
        $allPassed = $false
    }
}

# Summary
Write-Host "`n" + ("="*60)
if ($allPassed) {
    Write-Host "✅ ALL CHECKS PASSED - Rollback successful!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ SOME CHECKS FAILED - Investigate issues above" -ForegroundColor Red
    exit 1
}
```

**Usage:**
```powershell
.\scripts\verify-rollback.ps1 -Environment production
```

---

## Known Rollback Scenarios

### Scenario 1: Authentication Failure After Deployment

**Symptoms:**
- Users cannot log in
- 401 Unauthorized errors in logs
- Clerk integration errors

**Rollback Steps:**
```powershell
# 1. Quick rollback application
.\scripts\deploy-blue-green.ps1 -Action rollback

# 2. Verify Clerk configuration
# Check environment variables:
docker exec unioneyes-app-prod env | grep CLERK

# 3. Verify auth endpoint
curl https://unioneyes.azurewebsites.net/api/auth/session

# 4. Check Clerk dashboard
# https://dashboard.clerk.dev → Application → Settings
# Verify domain whitelist and API keys
```

### Scenario 2: Database Migration Breaking Queries

**Symptoms:**
- SQL errors in application logs
- Specific features broken
- "column does not exist" errors

**Rollback Steps:**
```powershell
# 1. Identify failing query from logs
docker logs --since 30m unioneyes-app-prod 2>&1 | grep "ERROR.*SQL"

# 2. Identify affected migration
psql $env:DATABASE_URL -c "
  SELECT name, applied_at 
  FROM drizzle_migrations 
  WHERE applied_at > NOW() - INTERVAL '2 hours';"

# 3. Backup before rollback (CRITICAL!)
.\scripts\backup-restore-drill.ps1 -BackupDir ".\pre-rollback-backup"

# 4. Execute database rollback
psql $env:DATABASE_URL -f "db\migrations\rollback\0066_rollback.sql"

# 5. Restart application to use old schema
docker-compose -f docker-compose.prod.yml restart app

# 6. Verify queries work
psql $env:DATABASE_URL -c "[paste failing query here]"
```

### Scenario 3: Performance Degradation After Deployment

**Symptoms:**
- Slow response times (>2s)
- High CPU/memory usage
- Database connection pool exhausted

**Rollback Steps:**
```powershell
# 1. Collect current metrics
docker stats --no-stream unioneyes-app-prod

psql $env:DATABASE_URL -c "
  SELECT count(*) as active_connections 
  FROM pg_stat_activity;"

# 2. Check for new slow queries (introduced in deployment)
psql $env:DATABASE_URL -c "
  SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;"

# 3. If specific query is slow, consider targeted rollback
# Otherwise, full application rollback:
.\scripts\deploy-blue-green.ps1 -Action rollback

# 4. Monitor improvement
watch -n 5 'docker stats --no-stream unioneyes-app-prod'

# 5. Verify P95 response time in Grafana
# Should drop back to < 500ms
```

### Scenario 4: Payment Processing Failure

**Symptoms:**
- Stripe webhook failures
- Payment transactions failing
- Error: "No such payment intent"

**Rollback Steps:**
```powershell
# 1. CRITICAL: Stop new payment processing
# Enable maintenance mode or disable payment features

# 2. Check Stripe webhook configuration
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  https://api.stripe.com/v1/webhook_endpoints

# 3. Rollback application
.\scripts\deploy-blue-green.ps1 -Action rollback

# 4. Verify Stripe integration
curl -X POST https://unioneyes.azurewebsites.net/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "test.event"}'

# 5. Re-enable payment processing

# 6. Manually reconcile any failed payments
# Check: Stripe dashboard → Events → Failed webhooks
```

### Scenario 5: Data Inconsistency After Migration

**Symptoms:**
- Incorrect data displayed
- Missing records
- Foreign key constraint violations

**Rollback Steps:**
```powershell
# 1. STOP APPLICATION IMMEDIATELY (prevent data corruption)
docker-compose -f docker-compose.prod.yml down

# 2. BACKUP CURRENT STATE (even if corrupted - for forensics)
.\scripts\backup-restore-drill.ps1 -BackupDir ".\corrupted-data-backup"

# 3. RESTORE FROM LAST KNOWN GOOD BACKUP
# See: backup-restore.md for complete procedures

# 4. VERIFY DATA INTEGRITY
psql $env:DATABASE_URL -c "
  SELECT 
    (SELECT count(*) FROM users) as users,
    (SELECT count(*) FROM organizations) as orgs,
    (SELECT count(*) FROM claims) as claims;"

# Compare with expected counts or previous metrics

# 5. CHECK FOR ORPHANED RECORDS
psql $env:DATABASE_URL -c "
  SELECT 'orphaned claims' as issue, count(*) 
  FROM claims 
  WHERE user_id NOT IN (SELECT id FROM users);"

# 6. START APPLICATION ONLY AFTER DATA VERIFIED
docker-compose -f docker-compose.prod.yml up -d
```

---

## Emergency Procedures

### Emergency Full Rollback (All Changes)

**When:** Complete system failure, multiple components affected

```powershell
# 1. STOP ALL SERVICES
docker-compose -f docker-compose.prod.yml down

# 2. RESTORE DATABASE FROM BACKUP
# See: backup-restore.md Section 4: "Emergency Full Restore"

# 3. ROLLBACK APPLICATION TO LAST KNOWN GOOD
$lastGoodCommit = "abc123"  # Get from incident timeline
git checkout $lastGoodCommit

# 4. REBUILD FROM KNOWN GOOD STATE
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 5. VERIFY EVERYTHING
.\scripts\verify-rollback.ps1 -Environment production

# 6. NOTIFY STAKEHOLDERS
# Use incident response communication templates
```

### Emergency Hotfix Without Full Rollback

**When:** Simple fix available, full rollback too risky

```powershell
# 1. CREATE HOTFIX BRANCH
git checkout -b hotfix/critical-fix main

# 2. APPLY MINIMAL FIX
# Edit affected files only
# Keep changes minimal and focused

# 3. TEST LOCALLY
docker-compose -f docker-compose.yml up --build

# 4. DEPLOY HOTFIX (bypass normal CI/CD)
docker build -t unioneyesacr.azurecr.io/unioneyes:hotfix .
docker push unioneyesacr.azurecr.io/unioneyes:hotfix

az webapp config container set \
  --name unioneyes-prod-app \
  --resource-group unioneyes-prod-rg \
  --docker-custom-image-name "unioneyesacr.azurecr.io/unioneyes:hotfix"

az webapp restart --name unioneyes-prod-app --resource-group unioneyes-prod-rg

# 5. VERIFY FIX
Start-Sleep -Seconds 30
curl https://unioneyes.azurewebsites.net/api/health

# 6. COMMIT AND MERGE HOTFIX
git commit -am "hotfix: [description]"
git push origin hotfix/critical-fix
# Create PR, merge to main after verification
```

---

## Post-Rollback Actions

### Immediate Actions (Within 1 Hour)

```powershell
# 1. UPDATE STATUS PAGE
# Mark incident as "Resolved"

# 2. NOTIFY STAKEHOLDERS
# Use resolution communication template from incident-response.md

# 3. CREATE TIMELINE DOCUMENT
# Document what happened, when, and what was rolled back

# 4. TAG ROLLED-BACK COMMIT
git tag -a "rollback/$(Get-Date -Format 'yyyyMMdd-HHmm')" -m "Rolled back due to: [reason]"
git push origin --tags

# 5. VERIFY MONITORING RECOVERY
# Check Grafana dashboards
# Error rate should be < 1%
# Response time should be < 500ms
```

### Analysis Actions (Within 24 Hours)

```powershell
# 1. COLLECT FORENSICS
# Save logs from failed deployment
docker logs unioneyes-app-prod > "logs/rollback-incident-$(Get-Date -Format 'yyyyMMdd').log"

# 2. CREATE POST-INCIDENT REVIEW (PIR)
# See: incident-response.md Section 8 for PIR template

# 3. ANALYZE ROOT CAUSE
# Why did the deployment fail?
# What was missed in testing?
# Are there gaps in monitoring?

# 4. IDENTIFY ACTION ITEMS
# What needs to be fixed before redeploying?
# What processes need improvement?
# What monitoring is missing?

# 5. PLAN FIX AND REDEPLOYMENT
# Create ticket with findings
# Schedule fix development
# Plan testing strategy for redeployment
```

### Long-Term Actions (Within 1 Week)

```powershell
# 1. COMPLETE PIR
# Schedule PIR meeting with team
# Document lessons learned

# 2. UPDATE RUNBOOKS
# Add new rollback scenario if applicable
# Update verification procedures

# 3. IMPROVE TESTING
# Add test cases that would have caught the issue
# Enhance staging environment testing

# 4. IMPROVE MONITORING
# Add alerts that would have detected the issue earlier
# Add new dashboards if needed

# 5. SCHEDULE SAFE REDEPLOYMENT
# Fix root cause
# Test thoroughly in staging
# Deploy during low-traffic period
# Have incident commander on standby
```

### Rollback Retrospective Checklist

- [ ] What caused the need for rollback?
- [ ] Was rollback executed smoothly?
- [ ] How long did rollback take?
- [ ] Were rollback scripts available and accurate?
- [ ] Was data integrity maintained?
- [ ] Were stakeholders notified appropriately?
- [ ] What could have prevented the need for rollback?
- [ ] What rollback procedures worked well?
- [ ] What rollback procedures need improvement?
- [ ] Are new monitoring/alerts needed?
- [ ] Is rollback script needed for this scenario?
- [ ] Should deployment process change?

---

## Related Documentation

- **Incident Response:** [`incident-response.md`](./incident-response.md)
- **Backup & Restore:** [`backup-restore.md`](./backup-restore.md)
- **Disaster Recovery:** [`../disaster-recovery/force-majeure-plan.md`](../disaster-recovery/force-majeure-plan.md)
- **Blue-Green Deployment:** [`../../scripts/deploy-blue-green.ps1`](../../scripts/deploy-blue-green.ps1)
- **Database Migrations:** [`../../db/migrations/`](../../db/migrations/)
- **Rollback Scripts:** [`../../db/migrations/rollback/`](../../db/migrations/rollback/)

---

## Appendix: Quick Reference

### One-Line Rollback Commands

```powershell
# Application rollback (blue-green)
.\scripts\deploy-blue-green.ps1 -Action rollback

# Database migration rollback (single migration)
psql $env:DATABASE_URL -f "db\migrations\rollback\[NUMBER]_rollback.sql"

# Azure App Service rollback
az webapp config container set --name [APP] --resource-group [RG] --docker-custom-image-name [PREVIOUS_IMAGE]

# Docker Compose rollback
git checkout [COMMIT] && docker-compose -f docker-compose.prod.yml up -d --build

# Verification
.\scripts\verify-rollback.ps1 -Environment production
```

### Rollback Decision Flowchart

```
Incident Detected
      ↓
Was deployment in last 2 hours?
  ┌───┴───┐
  NO      YES
  ↓       ↓
  Investigate    Is fix available in < 15 min?
  Other Causes   ┌────┴────┐
                 YES       NO
                 ↓         ↓
                 Forward   ROLLBACK
                 Fix       ↓
                          Schema changes?
                          ┌────┴────┐
                          YES       NO
                          ↓         ↓
                          Check     Simple
                          Rollback  App
                          Scripts   Rollback
```

---

**END OF RUNBOOK**

*Practice rollback procedures quarterly to maintain proficiency.*

**Last Review:** February 12, 2026  
**Next Review:** May 12, 2026  
**Document Owner:** DevOps Team
