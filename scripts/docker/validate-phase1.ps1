#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validate Phase 1 implementation

.DESCRIPTION
    Runs comprehensive checks to ensure Phase 1 was applied correctly
    - Validates docker-compose syntax
    - Checks resource limits are set
    - Verifies CI/CD workflow
    - Tests backup automation

.EXAMPLE
    .\validate-phase1.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$script:TestsPassed = 0
$script:TestsFailed = 0

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = ""
    )
    
    if ($Passed) {
        Write-Host "  [OK] " -NoNewline -ForegroundColor Green
        Write-Host "$TestName" -ForegroundColor White
        if ($Message) {
            Write-Host "    $Message" -ForegroundColor Gray
        }
        $script:TestsPassed++
    } else {
        Write-Host "  [X]  " -NoNewline -ForegroundColor Red
        Write-Host "$TestName" -ForegroundColor White
        if ($Message) {
            Write-Host "    $Message" -ForegroundColor Yellow
        }
        $script:TestsFailed++
    }
}

Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
Write-Host "  PHASE 1 VALIDATION" -ForegroundColor Magenta
Write-Host ("=" * 80) + "`n" -ForegroundColor Magenta

# Test 1: Docker Compose Syntax
Write-Host "`nTesting Docker Compose Configuration..." -ForegroundColor Cyan

# Temporarily allow errors to continue so we can check the output
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# Run docker-compose config and capture output and exit code
$composeOutput = docker-compose config 2>&1 | Out-String
$composeExitCode = $LASTEXITCODE

# Restore error action
$ErrorActionPreference = $prevErrorAction

# Check if there are actual errors (not just warnings about env vars)
$hasRealError = $composeOutput -match "\berror\b" -or $composeOutput -match "Error:" -or $composeOutput -match "ERROR:"
$hasOnlyWarnings = $composeOutput -match "level=warning" -and -not $hasRealError

if ($hasOnlyWarnings -or ($composeExitCode -eq 0)) {
    Write-TestResult "docker-compose.yml syntax" $true "Valid YAML (env var warnings are expected)"
} elseif ($hasRealError) {
    Write-TestResult "docker-compose.yml syntax" $false "YAML has errors: $composeOutput"
} else {
    Write-TestResult "docker-compose.yml syntax" $false "Unexpected output: $composeOutput"
}

# Test 2: Resource Limits
Write-Host "`nChecking Resource Limits..." -ForegroundColor Cyan

$composeContent = Get-Content docker-compose.yml -Raw
$hasMemLimit = $composeContent -match "mem_limit|memory:"
$hasCpuLimit = $composeContent -match "cpus|cpu_shares:"

Write-TestResult "Memory limits configured" $hasMemLimit
Write-TestResult "CPU limits configured" $hasCpuLimit

# Test 3: Health Checks
Write-Host "`nVerifying Health Checks..." -ForegroundColor Cyan

$hasAppHealthCheck = $composeContent -match "healthcheck:" -and $composeContent -match "app:"
$hasDbHealthCheck = $composeContent -match "pg_isready"

Write-TestResult "App service health check" $hasAppHealthCheck
Write-TestResult "Database health check" $hasDbHealthCheck

# Test 4: Restart Policies
Write-Host "`nChecking Restart Policies..." -ForegroundColor Cyan

$hasRestartPolicy = $composeContent -match "restart:"
Write-TestResult "Restart policies configured" $hasRestartPolicy

# Test 5: CI/CD Workflow
Write-Host "`nValidating CI/CD Workflow..." -ForegroundColor Cyan

$workflowPath = ".github/workflows/docker-ci.yml"
$workflowExists = Test-Path $workflowPath

if ($workflowExists) {
    $workflowContent = Get-Content $workflowPath -Raw
    $hasTrivy = $workflowContent -match "trivy"
    $hasMultiArch = $workflowContent -match "linux/amd64,linux/arm64"
    $hasBuildx = $workflowContent -match "docker/setup-buildx-action"
    
    Write-TestResult "Workflow file exists" $true
    Write-TestResult "Trivy scanning configured" $hasTrivy
    Write-TestResult "Multi-arch build configured" $hasMultiArch
    Write-TestResult "Docker Buildx configured" $hasBuildx
} else {
    Write-TestResult "Workflow file exists" $false "File not found: $workflowPath"
}

# Test 6: Backup Automation
Write-Host "`nChecking Backup Automation..." -ForegroundColor Cyan

$backupScriptPath = "scripts/docker/backup-automation.ps1"
$backupScriptExists = Test-Path $backupScriptPath

Write-TestResult "Backup script exists" $backupScriptExists

if ($backupScriptExists) {
    # Test if backup directory can be created
    $testBackupDir = "backups/docker"
    try {
        New-Item -ItemType Directory -Path $testBackupDir -Force | Out-Null
        Write-TestResult "Backup directory writable" $true
    } catch {
        Write-TestResult "Backup directory writable" $false $_
    }
}

# Test 7: Docker Commands
Write-Host "`nTesting Docker Functionality..." -ForegroundColor Cyan

try {
    $dockerVersion = docker --version
    Write-TestResult "Docker available" $true $dockerVersion
} catch {
    Write-TestResult "Docker available" $false "Docker not found in PATH"
}

try {
    $composeVersion = docker-compose --version
    Write-TestResult "Docker Compose available" $true $composeVersion
} catch {
    Write-TestResult "Docker Compose available" $false "Docker Compose not found"
}

# Test 8: File Permissions (Linux/Mac only)
$isUnix = $false
if ((Test-Path variable:IsLinux) -and $IsLinux) {
    $isUnix = $true
} elseif ((Test-Path variable:IsMacOS) -and $IsMacOS) {
    $isUnix = $true
}

if ($isUnix) {
    Write-Host "`nChecking File Permissions..." -ForegroundColor Cyan
    
    $scripts = @(
        "scripts/docker/dry-run-all.ps1",
        "scripts/docker/apply-phase1.ps1",
        "scripts/docker/backup-current-state.ps1"
    )
    
    foreach ($script in $scripts) {
        if (Test-Path $script) {
            $isExecutable = (Get-Item $script).UnixMode -match "x"
            Write-TestResult "$script executable" $isExecutable
        }
    }
}

# Summary
Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
Write-Host "  VALIDATION SUMMARY" -ForegroundColor Magenta
Write-Host ("=" * 80) -ForegroundColor Magenta

$total = $script:TestsPassed + $script:TestsFailed
$percentage = if ($total -gt 0) { [math]::Round(($script:TestsPassed / $total) * 100, 1) } else { 0 }

Write-Host "`n  Tests Passed: " -NoNewline
Write-Host "$script:TestsPassed" -ForegroundColor Green
Write-Host "  Tests Failed: " -NoNewline
Write-Host "$script:TestsFailed" -ForegroundColor $(if ($script:TestsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "  Success Rate: " -NoNewline
Write-Host "$percentage%" -ForegroundColor $(if ($percentage -ge 80) { "Green" } elseif ($percentage -ge 60) { "Yellow" } else { "Red" })

Write-Host ""

if ($script:TestsFailed -eq 0) {
    Write-Host "[OK] Phase 1 validation PASSED!" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "[WARN] Phase 1 validation FAILED" -ForegroundColor Red
    Write-Host "   Please review failed tests above" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
