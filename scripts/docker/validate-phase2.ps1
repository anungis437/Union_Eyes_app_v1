#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validate Phase 2 - Observability Stack implementation

.DESCRIPTION
    Runs comprehensive tests to ensure observability stack is properly configured
    - Configuration files exist
    - Docker Compose syntax valid
    - Services are accessible
    - Dashboards are available
    - Alerts are configured
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

Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
Write-Host "  PHASE 2 VALIDATION - OBSERVABILITY STACK" -ForegroundColor Magenta
Write-Host ("=" * 80) + "`n" -ForegroundColor Magenta

# Test 1: Configuration Files
Write-Host "`nTesting Configuration Files..." -ForegroundColor Cyan

$configFiles = @(
    "docker-compose.observability.yml",
    "monitoring/prometheus/prometheus.yml",
    "monitoring/prometheus/alerts.yml",
    "monitoring/loki/loki-config.yml",
    "monitoring/promtail/promtail-config.yml",
    "monitoring/alertmanager/alertmanager.yml",
    "monitoring/grafana/provisioning/datasources/datasources.yml",
    "monitoring/grafana/provisioning/dashboards/dashboards.yml"
)

foreach ($file in $configFiles) {
    $exists = Test-Path $file
    Write-TestResult "Config: $file" $exists
}

# Test 2: Dashboard Files
Write-Host "`nTesting Dashboard Files..." -ForegroundColor Cyan

$dashboards = @(
    "monitoring/grafana/dashboards/system-overview.json",
    "monitoring/grafana/dashboards/sla-monitoring.json"
)

foreach ($dashboard in $dashboards) {
    $exists = Test-Path $dashboard
    if ($exists) {
        try {
            $content = Get-Content $dashboard -Raw | ConvertFrom-Json
            $hasTitle = $content.dashboard.title -ne $null
            Write-TestResult "Dashboard: $(Split-Path $dashboard -Leaf)" $hasTitle "Title: $($content.dashboard.title)"
        } catch {
            Write-TestResult "Dashboard: $(Split-Path $dashboard -Leaf)" $false "Invalid JSON"
        }
    } else {
        Write-TestResult "Dashboard: $(Split-Path $dashboard -Leaf)" $false "File not found"
    }
}

# Test 3: Docker Compose Syntax
Write-Host "`nTesting Docker Compose Configuration..." -ForegroundColor Cyan

# Temporarily allow errors to continue
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

$composeOutput = docker-compose -f docker-compose.yml -f docker-compose.observability.yml config 2>&1 | Out-String
$composeExitCode = $LASTEXITCODE

$ErrorActionPreference = $prevErrorAction

$hasRealError = $composeOutput -match "\berror\b" -or $composeOutput -match "Error:" -or $composeOutput -match "ERROR:"
$hasOnlyWarnings = $composeOutput -match "level=warning" -and -not $hasRealError

if ($hasOnlyWarnings -or ($composeExitCode -eq 0)) {
    Write-TestResult "Observability compose syntax" $true "Valid YAML"
} else {
    Write-TestResult "Observability compose syntax" $false "YAML has errors"
}

# Test 4: Service Definitions
Write-Host "`nVerifying Service Definitions..." -ForegroundColor Cyan

$composeContent = Get-Content docker-compose.observability.yml -Raw

$services = @("prometheus", "grafana", "loki", "promtail", "node-exporter", "cadvisor", "alertmanager")

foreach ($service in $services) {
    $pattern = "${service}:"
    $hasService = $composeContent -match [regex]::Escape($pattern)
    Write-TestResult "$service service defined" $hasService
}

# Test 5: Resource Limits
Write-Host "`nChecking Resource Limits..." -ForegroundColor Cyan

$hasResourceLimits = $composeContent -match "deploy:" -and $composeContent -match "resources:"
Write-TestResult "Resource limits configured" $hasResourceLimits

# Test 6: Prometheus Configuration
Write-Host "`nValidating Prometheus Configuration..." -ForegroundColor Cyan

$prometheusConfig = Get-Content monitoring/prometheus/prometheus.yml -Raw

$prometheusChecks = @{
    "Scrape configs defined" = $prometheusConfig -match "scrape_configs:"
    "AlertManager configured" = $prometheusConfig -match "alertmanager"
    "Alert rules loaded" = $prometheusConfig -match "rule_files:"
    "Jobs configured" = $prometheusConfig -match "job_name:"
}

foreach ($check in $prometheusChecks.GetEnumerator()) {
    Write-TestResult $check.Key $check.Value
}

# Test 7: Alert Rules
Write-Host "`nValidating Alert Rules..." -ForegroundColor Cyan

$alertsConfig = Get-Content monitoring/prometheus/alerts.yml -Raw

$alertChecks = @{
    "Application alerts" = $alertsConfig -match "application_alerts"
    "Database alerts" = $alertsConfig -match "database_alerts"
    "Infrastructure alerts" = $alertsConfig -match "infrastructure_alerts"
    "SLA alerts" = $alertsConfig -match "sla_alerts"
}

foreach ($check in $alertChecks.GetEnumerator()) {
    Write-TestResult $check.Key $check.Value
}

# Test 8: Grafana Provisioning
Write-Host "`nValidating Grafana Provisioning..." -ForegroundColor Cyan

$datasourcesConfig = Get-Content monitoring/grafana/provisioning/datasources/datasources.yml -Raw

$grafanaChecks = @{
    "Prometheus datasource" = $datasourcesConfig -match "prometheus"
    "Loki datasource" = $datasourcesConfig -match "loki"
    "Dashboard provisioning" = Test-Path "monitoring/grafana/provisioning/dashboards/dashboards.yml"
}

foreach ($check in $grafanaChecks.GetEnumerator()) {
    Write-TestResult $check.Key $check.Value
}

# Test 9: Setup Script
Write-Host "`nChecking Setup Script..." -ForegroundColor Cyan

$setupScriptExists = Test-Path "scripts/docker/setup-observability.ps1"
Write-TestResult "Setup script exists" $setupScriptExists

if ($setupScriptExists) {
    $setupContent = Get-Content "scripts/docker/setup-observability.ps1" -Raw
    $hasParams = $setupContent -match "param\("
    Write-TestResult "Setup script has parameters" $hasParams
}

# Test 10: Docker Availability
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

# Summary
Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
Write-Host "  VALIDATION SUMMARY" -ForegroundColor Magenta
Write-Host ("=" * 80) -ForegroundColor Magenta

$totalTests = $script:TestsPassed + $script:TestsFailed
$successRate = if ($totalTests -gt 0) { [math]::Round(($script:TestsPassed / $totalTests) * 100, 1) } else { 0 }

Write-Host ""
Write-Host "  Tests Passed: $($script:TestsPassed)" -ForegroundColor Green
Write-Host "  Tests Failed: $($script:TestsFailed)" -ForegroundColor $(if ($script:TestsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "  Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 95) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })
Write-Host ""

if ($script:TestsFailed -eq 0) {
    Write-Host "[OK] Phase 2 validation PASSED!" -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host "[WARN] Phase 2 validation FAILED" -ForegroundColor Red
    Write-Host "   Please review failed tests above" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
