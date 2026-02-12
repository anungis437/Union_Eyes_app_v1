#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Apply Phase 4 - Advanced Features & Excellence

.DESCRIPTION
    Implements advanced monitoring and optimization:
    - Jaeger distributed tracing
    - Advanced Grafana dashboards (system, application, SLA)
    - SLA/SLO monitoring and alerting
    - Cost optimization tools and reports
    - Performance profiling integration
    - Blue-green deployment automation
    
.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER SkipBackup
    Skip backup creation (not recommended)

.EXAMPLE
    .\apply-phase4.ps1
    Apply Phase 4 with backup

.EXAMPLE
    .\apply-phase4.ps1 -DryRun
    Preview Phase 4 changes
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $colors[$Status]
}

function Write-Section {
    param([string]$Title)
    Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
    Write-Host "  $Title" -ForegroundColor Magenta
    Write-Host ("=" * 80) + "`n" -ForegroundColor Magenta
}

# Main execution
try {
    Write-Section "PHASE 4: ADVANCED FEATURES & EXCELLENCE"
    
    if ($DryRun) {
        Write-Step "DRY-RUN MODE - No changes will be applied" -Status "Warning"
    }
    
    # Step 1: Prerequisites check
    Write-Step "Checking prerequisites..." -Status "Info"
    
    $prereqs = @(
        @{ Name = "Docker"; Command = "docker --version" }
        @{ Name = "Docker Compose"; Command = "docker-compose --version" }
        @{ Name = "Git"; Command = "git --version" }
    )
    
    foreach ($prereq in $prereqs) {
        try {
            $null = Invoke-Expression $prereq.Command 2>&1
            Write-Step "[OK] $($prereq.Name) available" -Status "Success"
        } catch {
            Write-Step "[X]  $($prereq.Name) not found" -Status "Error"
            exit 1
        }
    }
    
    # Step 2: Backup current state
    if (-not $SkipBackup -and -not $DryRun) {
        Write-Host ""
        Write-Step "Creating backup..." -Status "Info"
        & ".\scripts\docker\backup-current-state.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Backup failed!" -Status "Error"
            exit 1
        }
    }
    
    # Step 3: Add Jaeger tracing
    Write-Host ""
    Write-Step "Configuring distributed tracing..." -Status "Info"
    
    if ($DryRun) {
        Write-Step "  [Preview] Adding Jaeger to docker-compose" -Status "Warning"
    } else {
        & ".\scripts\docker\add-jaeger-tracing.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to add Jaeger!" -Status "Error"
            exit 1
        }
    }
    
    # Step 4: Create advanced dashboards
    Write-Host ""
    Write-Step "Creating advanced Grafana dashboards..." -Status "Info"
    
    if ($DryRun) {
        Write-Step "  [Preview] Generate advanced dashboards" -Status "Warning"
    } else {
        & ".\scripts\docker\create-advanced-dashboards.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to create dashboards!" -Status "Error"
            exit 1
        }
    }
    
    # Step 5: Configure SLA/SLO monitoring
    Write-Host ""
    Write-Step "Configuring SLA/SLO monitoring..." -Status "Info"
    
    if ($DryRun) {
        Write-Step "  [Preview] Create SLA monitoring rules" -Status "Warning"
    } else {
        & ".\scripts\docker\setup-sla-monitoring.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to setup SLA monitoring!" -Status "Error"
            exit 1
        }
    }
    
    # Step 6: Add cost optimization tools
    Write-Host ""
    Write-Step "Adding cost optimization tools..." -Status "Info"
    
    if ($DryRun) {
        Write-Step "  [Preview] Create cost monitoring scripts" -Status "Warning"
    } else {
        & ".\scripts\docker\setup-cost-monitoring.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to setup cost monitoring!" -Status "Error"
            exit 1
        }
    }
    
    # Step 7: Configure blue-green deployment
    Write-Host ""
    Write-Step "Configuring blue-green deployment..." -Status "Info"
    
    if ($DryRun) {
        Write-Step "  [Preview] Create deployment automation" -Status "Warning"
    } else {
        & ".\scripts\docker\setup-blue-green.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to setup blue-green deployment!" -Status "Error"
            exit 1
        }
    }
    
    # Step 8: Summary
    Write-Section "PHASE 4 SUMMARY"
    
    if ($DryRun) {
        Write-Host "[Preview] Phase 4 changes:" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Phase 4 applied successfully!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Advanced Features:" -ForegroundColor Cyan
    Write-Host "  [*] Jaeger distributed tracing (http://localhost:16686)" -ForegroundColor White
    Write-Host "  [*] Advanced Grafana dashboards" -ForegroundColor White
    Write-Host "  [*] SLA/SLO monitoring and alerting" -ForegroundColor White
    Write-Host "  [*] Cost optimization tools" -ForegroundColor White
    Write-Host "  [*] Blue-green deployment automation" -ForegroundColor White
    
    Write-Host ""
    Write-Host "Dashboards Created:" -ForegroundColor Cyan
    Write-Host "  [*] Application Performance (APM)" -ForegroundColor White
    Write-Host "  [*] Infrastructure Overview" -ForegroundColor White
    Write-Host "  [*] Database Performance" -ForegroundColor White
    Write-Host "  [*] SLA Compliance" -ForegroundColor White
    Write-Host "  [*] Cost Analysis" -ForegroundColor White
    
    Write-Host ""
    Write-Host "SLA Targets:" -ForegroundColor Cyan
    Write-Host "  [*] Availability: 99.9% (43.2min downtime/month)" -ForegroundColor White
    Write-Host "  [*] Response Time: p95 < 1s, p99 < 3s" -ForegroundColor White
    Write-Host "  [*] Error Rate: < 0.1%" -ForegroundColor White
    Write-Host "  [*] Database Queries: p95 < 100ms" -ForegroundColor White
    
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Validate: .\scripts\docker\validate-phase4.ps1" -ForegroundColor Gray
        Write-Host "  2. Start services: docker-compose up -d" -ForegroundColor Gray
        Write-Host "  3. Access Jaeger: http://localhost:16686" -ForegroundColor Gray
        Write-Host "  4. View dashboards: http://localhost:3001" -ForegroundColor Gray
        Write-Host "  5. Test blue-green: .\scripts\docker\deploy-blue-green.ps1" -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    Write-Step $_.ScriptStackTrace -Status "Error"
    exit 1
}
