#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validate Phase 3 - Production Hardening implementation

.DESCRIPTION
    Runs comprehensive validation tests for production hardening:
    - Multi-stage Dockerfile exists
    - Security configurations present
    - Secrets management setup
    - Production compose enhancements
    - Image optimization checks
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$script:TestsPassed = 0
$script:TestsFailed = 0

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    if ($Passed) {
        Write-Host "  [OK] $TestName" -ForegroundColor Green
        if ($Details) {
            Write-Host "    $Details" -ForegroundColor Gray
        }
        $script:TestsPassed++
    } else {
        Write-Host "  [X]  $TestName" -ForegroundColor Red
        if ($Details) {
            Write-Host "    $Details" -ForegroundColor Yellow
        }
        $script:TestsFailed++
    }
}

Write-Host ""
Write-Host (" " + ("=" * 80)) -ForegroundColor Magenta
Write-Host "  PHASE 3 VALIDATION - PRODUCTION HARDENING" -ForegroundColor Magenta
Write-Host (("=" * 80) + " ") -ForegroundColor Magenta
Write-Host ""

# Test 1: Multi-stage Dockerfile
Write-Host "`nChecking Multi-stage Dockerfile..." -ForegroundColor Cyan

$optimizedDockerfileExists = Test-Path "Dockerfile.optimized"
Write-TestResult "Dockerfile.optimized exists" $optimizedDockerfileExists

if ($optimizedDockerfileExists) {
    $dockerfileContent = Get-Content "Dockerfile.optimized" -Raw
    
    $hasMultiStage = $dockerfileContent -match "FROM.*AS deps" -and $dockerfileContent -match "FROM.*AS builder" -and $dockerfileContent -match "FROM.*AS runner"
    Write-TestResult "Multi-stage build configured" $hasMultiStage
    
    $hasNonRootUser = $dockerfileContent -match "adduser.*nextjs"
    Write-TestResult "Non-root user created" $hasNonRootUser
    
    $hasHealthCheck = $dockerfileContent -match "HEALTHCHECK"
    Write-TestResult "Health check configured" $hasHealthCheck
    
    $usesAlpine = $dockerfileContent -match "alpine"
    Write-TestResult "Alpine base image used" $usesAlpine
}

# Test 2: Security Configurations
Write-Host "`nChecking Security Configurations..." -ForegroundColor Cyan

$seccompExists = Test-Path "security/seccomp-profile.json"
Write-TestResult "Seccomp profile exists" $seccompExists

if ($seccompExists) {
    try {
        $seccomp = Get-Content "security/seccomp-profile.json" -Raw | ConvertFrom-Json
        
        $hasDefaultAction = $null -ne $seccomp.defaultAction
        Write-TestResult "Seccomp default action defined" $hasDefaultAction
        
        $hasSyscalls = ($null -ne $seccomp.syscalls) -and ($seccomp.syscalls.Count -gt 0)
        Write-TestResult "Syscalls whitelist configured" $hasSyscalls
    } catch {
        Write-TestResult "Seccomp profile valid JSON" $false "Parse error: $_"
    }
}

# Test 3: Docker Ignore Optimization
Write-Host "`nChecking .dockerignore Optimization..." -ForegroundColor Cyan

$dockerignoreExists = Test-Path ".dockerignore"
Write-TestResult ".dockerignore exists" $dockerignoreExists

if ($dockerignoreExists) {
    $dockerignoreContent = Get-Content ".dockerignore" -Raw
    
    $ignoresNodeModules = $dockerignoreContent -match "node_modules"
    Write-TestResult "Ignores node_modules" $ignoresNodeModules
    
    $ignoresTests = $dockerignoreContent -match "coverage|__tests__"
    Write-TestResult "Ignores test files" $ignoresTests
    
    $ignoresDocs = $dockerignoreContent -match "\.md|docs"
    Write-TestResult "Ignores documentation" $ignoresDocs
    
    $ignoresGit = $dockerignoreContent -match "\.git"
    Write-TestResult "Ignores .git directory" $ignoresGit
}

# Test 4: Secrets Management
Write-Host "`nChecking Secrets Management..." -ForegroundColor Cyan

$secretsGuideExists = Test-Path "docs/docker-secrets-guide.md"
Write-TestResult "Secrets guide exists" $secretsGuideExists

$secretsScriptExists = Test-Path "scripts/docker/create-secrets-from-env.ps1"
Write-TestResult "Secrets creation script exists" $secretsScriptExists

# Test 5: Production Docker Compose
Write-Host "`nChecking Production Docker Compose..." -ForegroundColor Cyan

$prodComposeExists = Test-Path "docker-compose.prod.yml"
Write-TestResult "docker-compose.prod.yml exists" $prodComposeExists

if ($prodComposeExists) {
    $prodComposeContent = Get-Content "docker-compose.prod.yml" -Raw
    
    $hasSecrets = $prodComposeContent -match "secrets:"
    Write-TestResult "Secrets configured" $hasSecrets
    
    $hasSecurityOpt = $prodComposeContent -match "security_opt:"
    Write-TestResult "Security options configured" $hasSecurityOpt
    
    $hasReadOnly = $prodComposeContent -match "read_only: true"
    Write-TestResult "Read-only filesystem configured" $hasReadOnly
    
    $hasCapDrop = $prodComposeContent -match "cap_drop:"
    Write-TestResult "Capability restrictions configured" $hasCapDrop
    
    $hasResourceLimits = $prodComposeContent -match "resources:" -and $prodComposeContent -match "limits:"
    Write-TestResult "Resource limits configured" $hasResourceLimits
    
    $hasHealthChecks = $prodComposeContent -match "healthcheck:"
    Write-TestResult "Health checks configured" $hasHealthChecks
}

# Test 6: Production Resource Limits
Write-Host "`nChecking Production Resource Allocation..." -ForegroundColor Cyan

if ($prodComposeExists) {
    $prodComposeContent = Get-Content "docker-compose.prod.yml" -Raw
    
    $hasProdCPUs = $prodComposeContent -match "cpus:.*[3-4]"
    Write-TestResult "Production CPU limits (3-4 CPUs)" $hasProdCPUs
    
    $hasProdMemory = $prodComposeContent -match "memory:.*[4-8]g"
    Write-TestResult "Production memory limits (4-8GB)" $hasProdMemory
}

# Test 7: Automation Scripts
Write-Host "`nChecking Automation Scripts..." -ForegroundColor Cyan

$applyScript = Test-Path "scripts/docker/apply-phase3.ps1"
Write-TestResult "apply-phase3.ps1 exists" $applyScript

$enhanceScript = Test-Path "scripts/docker/enhance-prod-compose.ps1"
Write-TestResult "enhance-prod-compose.ps1 exists" $enhanceScript

# Test 8: Docker Functionality
Write-Host "`nTesting Docker Functionality..." -ForegroundColor Cyan

try {
    $dockerVersion = docker --version 2>&1
    Write-TestResult "Docker available" $true $dockerVersion
} catch {
    Write-TestResult "Docker available" $false "Docker not found"
}

try {
    $composeVersion = docker-compose --version 2>&1
    Write-TestResult "Docker Compose available" $true $composeVersion
} catch {
    Write-TestResult "Docker Compose available" $false "Docker Compose not found"
}

# Test 9: Image Optimization Features
Write-Host "`nChecking Image Optimization Features..." -ForegroundColor Cyan

if ($optimizedDockerfileExists) {
    $dockerfileContent = Get-Content "Dockerfile.optimized" -Raw
    
    $hasCaching = $dockerfileContent -match "COPY package\.json"
    Write-TestResult "Layer caching optimized" $hasCaching
    
    $hasProdDeps = $dockerfileContent -match "--prod|--frozen-lockfile"
    Write-TestResult "Production dependencies only" $hasProdDeps
    
    $copiesOnlyNecessary = $dockerfileContent -match "COPY.*public" -and $dockerfileContent -match "COPY.*\.next"
    Write-TestResult "Copies only necessary files" $copiesOnlyNecessary
}

# Summary
Write-Host ""
Write-Host (" " + ("=" * 80)) -ForegroundColor Magenta
Write-Host "  VALIDATION SUMMARY" -ForegroundColor Magenta
Write-Host ("=" * 80) -ForegroundColor Magenta
Write-Host ""

$total = $script:TestsPassed + $script:TestsFailed
$successRate = if ($total -gt 0) { [math]::Round(($script:TestsPassed / $total) * 100, 1) } else { 0 }

Write-Host "  Tests Passed: $script:TestsPassed" -ForegroundColor Green
Write-Host "  Tests Failed: $script:TestsFailed" -ForegroundColor $(if ($script:TestsFailed -gt 0) { "Red" } else { "Gray" })
Write-Host "  Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })
Write-Host ""

if ($script:TestsFailed -eq 0) {
    Write-Host "[OK] Phase 3 validation PASSED!" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "[WARN] Phase 3 validation FAILED" -ForegroundColor Red
    Write-Host "   Please review failed tests above" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
