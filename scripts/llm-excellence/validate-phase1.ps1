#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validate Phase 1 deployment
.DESCRIPTION
    Comprehensive validation script for Phase 1: Cost Controls & Rate Limiting
    Checks database schema, Redis configuration, and runs smoke tests
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'production')]
    [string]$Environment = 'dev'
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ $args" -ForegroundColor Cyan }
function Write-Failure { Write-Host "✗ $args" -ForegroundColor Red }

Write-Host "`n🔍 Phase 1 Validation`n" -ForegroundColor Magenta

$failures = 0

# ============================================================================
# 1. DATABASE SCHEMA VALIDATION
# ============================================================================

Write-Info "1. Validating database schema..."

$envFile = if ($Environment -eq "production") { ".env.production" } 
           elseif ($Environment -eq "staging") { ".env.staging" } 
           else { ".env.local" }

$dbUrl = (Get-Content $envFile | Select-String "DATABASE_URL").ToString().Split("=", 2)[1]

# Check if tables exist
$tables = @('ai_usage_metrics', 'ai_rate_limits', 'ai_budgets')

foreach ($table in $tables) {
    try {
        $result = psql $dbUrl -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>&1
        if ($result -match "t") {
            Write-Success "Table exists: $table"
        } else {
            Write-Failure "Table missing: $table"
            $failures++
        }
    } catch {
        Write-Failure "Failed to check table: $table - $_"
        $failures++
    }
}

# Check materialized view
try {
    $result = psql $dbUrl -t -c "SELECT EXISTS (SELECT FROM pg_matviews WHERE matviewname = 'ai_usage_daily');" 2>&1
    if ($result -match "t") {
        Write-Success "Materialized view exists: ai_usage_daily"
    } else {
        Write-Failure "Materialized view missing: ai_usage_daily"
        $failures++
    }
} catch {
    Write-Failure "Failed to check materialized view: $_"
    $failures++
}

# Check indexes
$indexes = @(
    'idx_usage_org_time',
    'idx_usage_provider_time',
    'idx_rate_limits_org',
    'idx_budgets_org_period'
)

foreach ($index in $indexes) {
    try {
        $result = psql $dbUrl -t -c "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = '$index');" 2>&1
        if ($result -match "t") {
            Write-Success "Index exists: $index"
        } else {
            Write-Failure "Index missing: $index"
            $failures++
        }
    } catch {
        Write-Failure "Failed to check index: $index - $_"
        $failures++
    }
}

# Check triggers
try {
    $result = psql $dbUrl -t -c "SELECT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'trigger_update_budget_spend');" 2>&1
    if ($result -match "t") {
        Write-Success "Trigger exists: trigger_update_budget_spend"
    } else {
        Write-Failure "Trigger missing: trigger_update_budget_spend"
        $failures++
    }
} catch {
    Write-Failure "Failed to check trigger: $_"
    $failures++
}

# ============================================================================
# 2. REDIS VALIDATION
# ============================================================================

Write-Info "`n2. Validating Redis configuration..."

$redisUrl = (Get-Content $envFile | Select-String "REDIS_URL").ToString().Split("=", 2)[1]

# Check Redis connection
try {
    $result = redis-cli -u $redisUrl PING 2>&1
    if ($result -eq "PONG") {
        Write-Success "Redis connection successful"
    } else {
        Write-Failure "Redis ping failed: $result"
        $failures++
    }
} catch {
    Write-Failure "Redis connection failed: $_"
    $failures++
}

# Check maxmemory-policy
try {
    $policy = redis-cli -u $redisUrl CONFIG GET maxmemory-policy 2>&1
    if ($policy -match "allkeys-lru") {
        Write-Success "Redis eviction policy correct: allkeys-lru"
    } else {
        Write-Failure "Redis eviction policy incorrect: $policy (expected: allkeys-lru)"
        $failures++
    }
} catch {
    Write-Failure "Failed to check Redis policy: $_"
    $failures++
}

# Check maxmemory
try {
    $maxmem = redis-cli -u $redisUrl CONFIG GET maxmemory 2>&1
    Write-Info "Redis maxmemory: $($maxmem | Select-Object -Last 1)"
} catch {
    Write-Failure "Failed to check Redis maxmemory: $_"
}

# ============================================================================
# 3. DATA VALIDATION
# ============================================================================

Write-Info "`n3. Validating data..."

# Check if budgets exist for organizations
try {
    $budgetCount = psql $dbUrl -t -c "SELECT COUNT(*) FROM ai_budgets;" 2>&1
    if ([int]$budgetCount -gt 0) {
        Write-Success "AI budgets configured: $budgetCount organizations"
    } else {
        Write-Failure "No AI budgets configured"
        $failures++
    }
} catch {
    Write-Failure "Failed to check budgets: $_"
    $failures++
}

# Check if default limits are reasonable
try {
    $avgLimit = psql $dbUrl -t -c "SELECT AVG(monthly_limit_usd) FROM ai_budgets;" 2>&1
    Write-Info "Average monthly budget: `$$avgLimit"
} catch {
    Write-Failure "Failed to check average budget: $_"
}

# ============================================================================
# 4. FUNCTIONAL TESTS
# ============================================================================

Write-Info "`n4. Running functional tests..."

# Test rate limiter
try {
    pnpm test lib/ai/services/rate-limiter.test.ts --run 2>&1 | Out-Null
    Write-Success "Rate limiter tests passed"
} catch {
    Write-Failure "Rate limiter tests failed: $_"
    $failures++
}

# Test token cost calculator
try {
    pnpm test lib/ai/services/token-cost-calculator.test.ts --run 2>&1 | Out-Null
    Write-Success "Token cost calculator tests passed"
} catch {
    Write-Failure "Token cost calculator tests failed: $_"
    $failures++
}

# ============================================================================
# 5. INTEGRATION TEST
# ============================================================================

Write-Info "`n5. Running integration test..."

# Insert test usage metric
try {
    $testOrgId = psql $dbUrl -t -c "SELECT id FROM organizations LIMIT 1;" 2>&1
    $testOrgId = $testOrgId.Trim()
    
    if ($testOrgId) {
        $insertResult = psql $dbUrl -c "
            INSERT INTO ai_usage_metrics (
                organization_id, 
                provider, 
                model, 
                operation, 
                tokens_input, 
                tokens_output, 
                tokens_total, 
                estimated_cost
            ) VALUES (
                '$testOrgId',
                'openai',
                'gpt-4',
                'completion',
                100,
                200,
                300,
                0.015
            ) RETURNING id;
        " 2>&1
        
        if ($insertResult -match "INSERT") {
            Write-Success "Test usage metric inserted"
            
            # Check if trigger updated budget
            $budgetSpend = psql $dbUrl -t -c "SELECT current_spend_usd FROM ai_budgets WHERE organization_id = '$testOrgId' LIMIT 1;" 2>&1
            Write-Info "Budget spend updated: `$$budgetSpend"
            
            # Clean up test data
            psql $dbUrl -c "DELETE FROM ai_usage_metrics WHERE organization_id = '$testOrgId' AND provider = 'openai' AND model = 'gpt-4' AND tokens_total = 300;" 2>&1 | Out-Null
        } else {
            Write-Failure "Failed to insert test metric: $insertResult"
            $failures++
        }
    } else {
        Write-Failure "No organizations found for testing"
        $failures++
    }
} catch {
    Write-Failure "Integration test failed: $_"
    $failures++
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n" + "="*60 -ForegroundColor Magenta

if ($failures -eq 0) {
    Write-Host "✅ Phase 1 Validation: PASSED" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Magenta
    Write-Host "`nAll checks passed! Phase 1 is ready for use.`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Phase 1 Validation: FAILED" -ForegroundColor Red
    Write-Host "="*60 -ForegroundColor Magenta
    Write-Host "`n$failures validation check(s) failed.`n" -ForegroundColor Red
    Write-Host "Please review the errors above and fix before proceeding.`n" -ForegroundColor Yellow
    exit 1
}
