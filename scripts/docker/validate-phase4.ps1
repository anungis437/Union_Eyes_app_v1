#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Validate Phase 4 - Advanced Features

.DESCRIPTION
    Validates Jaeger tracing, dashboards, SLA monitoring, cost optimization, and blue-green deployment
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$script:PassedTests = 0
$script:FailedTests = 0

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    if ($Passed) {
        Write-Host "[OK] $TestName" -ForegroundColor Green
        if ($Details) { Write-Host "     $Details" -ForegroundColor Gray }
        $script:PassedTests++
    } else {
        Write-Host "[X] $TestName" -ForegroundColor Red
        if ($Details) { Write-Host "     $Details" -ForegroundColor Yellow }
        $script:FailedTests++
    }
}

function Test-FileExists {
    param([string]$Path, [string]$Description)
    $exists = Test-Path $Path
    Write-TestResult -TestName $Description -Passed $exists -Details $Path
    return $exists
}

function Test-ValidJson {
    param([string]$Path, [string]$Description)
    if (-not (Test-Path $Path)) {
        Write-TestResult -TestName $Description -Passed $false -Details "File not found: $Path"
        return $false
    }
    
    try {
        $content = Get-Content $Path -Raw
        $json = $content | ConvertFrom-Json
        Write-TestResult -TestName $Description -Passed $true -Details $Path
        return $true
    } catch {
        Write-TestResult -TestName $Description -Passed $false -Details "Invalid JSON: $_"
        return $false
    }
}

function Test-ValidYaml {
    param([string]$Path, [string]$Description)
    if (-not (Test-Path $Path)) {
        Write-TestResult -TestName $Description -Passed $false -Details "File not found: $Path"
        return $false
    }
    
    $content = Get-Content $Path -Raw
    $hasGroups = $content -match "groups:"
    $hasRules = $content -match "rules:"
    $valid = $hasGroups -and $hasRules
    
    Write-TestResult -TestName $Description -Passed $valid -Details $Path
    return $valid
}

Write-Host "`n=== PHASE 4 VALIDATION ===" -ForegroundColor Cyan
Write-Host "Advanced Features Validation`n" -ForegroundColor Gray

# Test 1-5: Jaeger Tracing
Write-Host "`n--- Jaeger Tracing ---" -ForegroundColor Yellow

Test-FileExists "docker-compose.yml" "Docker compose file exists"

$composeContent = Get-Content "docker-compose.yml" -Raw
$hasJaeger = $composeContent -match "jaeger:"
Write-TestResult "Jaeger service defined" $hasJaeger

$hasJaegerImage = $composeContent -match "jaegertracing/all-in-one"
Write-TestResult "Jaeger image configured" $hasJaegerImage

$hasJaegerUI = $composeContent -match "16686:16686"
Write-TestResult "Jaeger UI port exposed" $hasJaegerUI

$hasOTLP = $composeContent -match "4317:4317"
Write-TestResult "OTLP protocol configured" $hasOTLP

# Test 6-10: Advanced Dashboards
Write-Host "`n--- Advanced Dashboards ---" -ForegroundColor Yellow

$dashboardDir = "monitoring/grafana/dashboards"
Test-FileExists $dashboardDir "Dashboard directory exists"

Test-ValidJson (Join-Path $dashboardDir "apm-dashboard.json") "APM dashboard valid"
Test-ValidJson (Join-Path $dashboardDir "infrastructure-dashboard.json") "Infrastructure dashboard valid"
Test-ValidJson (Join-Path $dashboardDir "database-dashboard.json") "Database dashboard valid"
Test-ValidJson (Join-Path $dashboardDir "sla-dashboard.json") "SLA dashboard valid"
Test-ValidJson (Join-Path $dashboardDir "cost-dashboard.json") "Cost dashboard valid"

# Test 11-15: SLA Monitoring
Write-Host "`n--- SLA Monitoring ---" -ForegroundColor Yellow

$alertDir = "monitoring/prometheus/alerts"
Test-ValidYaml (Join-Path $alertDir "sla-recording-rules.yml") "SLA recording rules valid"
Test-ValidYaml (Join-Path $alertDir "sla-alerts.yml") "SLA alert rules valid"

$slaRecording = Get-Content (Join-Path $alertDir "sla-recording-rules.yml") -Raw -ErrorAction SilentlyContinue
if ($slaRecording) {
    $hasAvailability = $slaRecording -match "sla:availability:ratio"
    Write-TestResult "Availability SLI defined" $hasAvailability
    
    $hasLatency = $slaRecording -match "sla:latency:p95"
    Write-TestResult "Latency SLI defined" $hasLatency
    
    $hasErrorBudget = $slaRecording -match "sla:error_budget"
    Write-TestResult "Error budget defined" $hasErrorBudget
}

# Test 16-20: Cost Monitoring
Write-Host "`n--- Cost Monitoring ---" -ForegroundColor Yellow

Test-ValidYaml (Join-Path $alertDir "cost-rules.yml") "Cost recording rules valid"
Test-ValidYaml (Join-Path $alertDir "cost-alerts.yml") "Cost alert rules valid"

$costRules = Get-Content (Join-Path $alertDir "cost-rules.yml") -Raw -ErrorAction SilentlyContinue
if ($costRules) {
    $hasCPUWaste = $costRules -match "cost:cpu_waste"
    Write-TestResult "CPU waste metric defined" $hasCPUWaste
    
    $hasMemWaste = $costRules -match "cost:memory_waste"
    Write-TestResult "Memory waste metric defined" $hasMemWaste
    
    $hasUtilization = $costRules -match "cost:.*utilization"
    Write-TestResult "Utilization metrics defined" $hasUtilization
}

# Test 21-25: Blue-Green Deployment
Write-Host "`n--- Blue-Green Deployment ---" -ForegroundColor Yellow

Test-FileExists "docker-compose.blue-green.yml" "Blue-green compose exists"

$bgCompose = Get-Content "docker-compose.blue-green.yml" -Raw -ErrorAction SilentlyContinue
if ($bgCompose) {
    $hasBlue = $bgCompose -match "app-blue:"
    Write-TestResult "Blue environment defined" $hasBlue
    
    $hasGreen = $bgCompose -match "app-green:"
    Write-TestResult "Green environment defined" $hasGreen
    
    $hasLoadBalancer = $bgCompose -match "loadbalancer:"
    Write-TestResult "Load balancer defined" $hasLoadBalancer
    
    $hasHealthCheck = $bgCompose -match "healthcheck:"
    Write-TestResult "Health checks configured" $hasHealthCheck
}

# Test 26-30: Configuration Files
Write-Host "`n--- Configuration Files ---" -ForegroundColor Yellow

Test-FileExists "config/nginx/nginx.conf" "Nginx config exists"
Test-FileExists "config/nginx/upstream.conf" "Upstream config exists"

$nginxConf = Get-Content "config/nginx/nginx.conf" -Raw -ErrorAction SilentlyContinue
if ($nginxConf) {
    $hasUpstream = $nginxConf -match "upstream backend"
    Write-TestResult "Upstream backend configured" $hasUpstream
    
    $hasProxyPass = $nginxConf -match "proxy_pass"
    Write-TestResult "Proxy configuration valid" $hasProxyPass
}

Test-FileExists "scripts/deployment/deploy-blue-green.ps1" "Deployment script exists"

# Test 31-33: Prometheus Integration
Write-Host "`n--- Prometheus Integration ---" -ForegroundColor Yellow

$promConfig = "monitoring/prometheus/prometheus.yml"
if (Test-Path $promConfig) {
    $promContent = Get-Content $promConfig -Raw
    
    $hasSLARules = $promContent -match "sla-recording-rules.yml"
    Write-TestResult "SLA rules in prometheus.yml" $hasSLARules
    
    $hasCostRules = $promContent -match "cost-rules.yml"
    Write-TestResult "Cost rules in prometheus.yml" $hasCostRules
    
    $hasAlertRules = $promContent -match "alerts.yml"
    Write-TestResult "Alert rules in prometheus.yml" $hasAlertRules
}

# Test 34-35: Scripts
Write-Host "`n--- Automation Scripts ---" -ForegroundColor Yellow

Test-FileExists "scripts/monitoring/cost-analysis.ps1" "Cost analysis script exists"
Test-FileExists "scripts/docker/apply-phase4.ps1" "Phase 4 orchestration script exists"

# Summary
Write-Host "`n=== VALIDATION SUMMARY ===" -ForegroundColor Cyan
Write-Host "Passed: $script:PassedTests" -ForegroundColor Green
Write-Host "Failed: $script:FailedTests" -ForegroundColor Red
$total = $script:PassedTests + $script:FailedTests
$percentage = if ($total -gt 0) { [math]::Round(($script:PassedTests / $total) * 100, 1) } else { 0 }
Write-Host "Success Rate: $percentage%" -ForegroundColor $(if ($percentage -eq 100) { "Green" } elseif ($percentage -ge 80) { "Yellow" } else { "Red" })

if ($script:FailedTests -gt 0) {
    Write-Host "`nSome tests failed. Review the output above for details." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
    exit 0
}
