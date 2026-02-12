#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup observability stack for Union Eyes application

.DESCRIPTION
    Deploys Prometheus, Grafana, Loki, AlertManager and exporters
    
.PARAMETER Environment
    Environment type: dev, staging, or prod

.PARAMETER DryRun
    Show changes without applying them

.PARAMETER Stop
    Stop the observability stack

.EXAMPLE
    .\setup-observability.ps1
    Deploy observability stack for development

.EXAMPLE
    .\setup-observability.ps1 -DryRun
    Preview deployment without applying

.EXAMPLE
    .\setup-observability.ps1 -Stop
    Stop all observability containers
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    $symbol = @{ Success = "[OK]"; Warning = "[WARN]"; Error = "[X]"; Info = "[*]" }
    Write-Host "$($symbol[$Status]) $Message" -ForegroundColor $colors[$Status]
}

function Test-Prerequisites {
    Write-Host "`n=== Prerequisites Check ===" -ForegroundColor Cyan
    
    $checks = @{
        "Docker" = { docker --version }
        "Docker Compose" = { docker-compose --version }
        "Main Compose File" = { Test-Path "docker-compose.yml" }
        "Observability Compose File" = { Test-Path "docker-compose.observability.yml" }
    }
    
    $allPassed = $true
    foreach ($check in $checks.GetEnumerator()) {
        try {
            $result = & $check.Value 2>&1
            if ($LASTEXITCODE -eq 0 -or $result -eq $true) {
                Write-Step "$($check.Key): Available" -Status "Success"
            } else {
                Write-Step "$($check.Key): Not found" -Status "Error"
                $allPassed = $false
            }
        } catch {
            Write-Step "$($check.Key): Not found" -Status "Error"
            $allPassed = $false
        }
    }
    
    if (-not $allPassed) {
        throw "Prerequisites check failed"
    }
    
    Write-Step "All prerequisites met" -Status "Success"
}

function Show-Services {
    Write-Host "`n=== Observability Services ===" -ForegroundColor Cyan
    Write-Host "  - Prometheus:    http://localhost:9090" -ForegroundColor Gray
    Write-Host "  - Grafana:       http://localhost:3001 (admin/admin)" -ForegroundColor Gray
    Write-Host "  - Loki:          http://localhost:3100" -ForegroundColor Gray
    Write-Host "  - AlertManager:  http://localhost:9093" -ForegroundColor Gray
    Write-Host "  - Node Exporter: http://localhost:9100/metrics" -ForegroundColor Gray
    Write-Host "  - cAdvisor:      http://localhost:8080" -ForegroundColor Gray
}

function Start-ObservabilityStack {
    Write-Host "`n=== Starting Observability Stack ===" -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Step "DRY-RUN: Would start observability stack" -Status "Warning"
        docker-compose -f docker-compose.yml -f docker-compose.observability.yml config
        return
    }
    
    # Create volumes if they don't exist
    Write-Step "Creating volumes..." -Status "Info"
    docker volume create prometheus_data
    docker volume create grafana_data
    docker volume create loki_data
    docker volume create alertmanager_data
    
    # Pull images
    Write-Step "Pulling images..." -Status "Info"
    docker-compose -f docker-compose.yml -f docker-compose.observability.yml pull
    
    # Start services
    Write-Step "Starting services..." -Status "Info"
    docker-compose -f docker-compose.yml -f docker-compose.observability.yml up -d
    
    # Wait for services to be healthy
    Write-Host "`n=== Waiting for Services ===" -ForegroundColor Cyan
    $services = @("prometheus", "grafana", "loki", "alertmanager")
    $maxWait = 120
    $waited = 0
    
    foreach ($service in $services) {
        Write-Host "  Waiting for $service..." -NoNewline
        $attempts = 0
        while ($waited -lt $maxWait) {
            $status = docker inspect -f '{{.State.Health.Status}}' "unioneyes-$service" 2>$null
            if ($status -eq "healthy" -or $status -eq "") {
                Write-Host " [OK]" -ForegroundColor Green
                break
            }
            Start-Sleep -Seconds 5
            $waited += 5
            $attempts++
            if ($attempts % 6 -eq 0) {
                Write-Host "." -NoNewline
            }
        }
    }
    
    if ($waited -ge $maxWait) {
        Write-Step "Some services may not be ready yet" -Status "Warning"
    } else {
        Write-Step "All services are running" -Status "Success"
    }
    
    # Verify services are up
    Write-Host "`n=== Service Status ===" -ForegroundColor Cyan
    docker-compose -f docker-compose.yml -f docker-compose.observability.yml ps
}

function Stop-ObservabilityStack {
    Write-Host "`n=== Stopping Observability Stack ===" -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Step "DRY-RUN: Would stop observability stack" -Status "Warning"
        return
    }
    
    docker-compose -f docker-compose.yml -f docker-compose.observability.yml down
    Write-Step "Observability stack stopped" -Status "Success"
    Write-Host "Note: Data volumes preserved. Use 'docker-compose down -v' to remove volumes" -ForegroundColor Yellow
}

# Main execution
try {
    Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
    Write-Host "  OBSERVABILITY STACK SETUP" -ForegroundColor Magenta
    Write-Host ("=" * 80) + "`n" -ForegroundColor Magenta
    
    Write-Step "Environment: $Environment" -Status "Info"
    Write-Step "Mode: $(if ($DryRun) { 'DRY-RUN' } else { 'APPLY' })" -Status $(if ($DryRun) { "Warning" } else { "Info" })
    
    Test-Prerequisites
    
    if ($Stop) {
        Stop-ObservabilityStack
    } else {
        Start-ObservabilityStack
        Show-Services
        
        Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
        Write-Host "  1. Open Grafana: http://localhost:3001" -ForegroundColor Gray
        Write-Host "  2. Login with: admin / admin" -ForegroundColor Gray
        Write-Host "  3. Navigate to Dashboards > Union Eyes - System Overview" -ForegroundColor Gray
        Write-Host "  4. Check Prometheus targets: http://localhost:9090/targets" -ForegroundColor Gray
        Write-Host "  5. View logs in Loki: Grafana > Explore > Loki" -ForegroundColor Gray
        Write-Host ""
        
        Write-Step "Observability stack is ready!" -Status "Success"
    }
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    Write-Step $_.ScriptStackTrace -Status "Error"
    exit 1
}
