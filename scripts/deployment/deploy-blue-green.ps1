#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Blue-green deployment automation

.DESCRIPTION
    Deploys new version with zero downtime
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("blue", "green")]
    [string]$TargetColor,
    
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $colors[$Status]
}

function Get-CurrentColor {
    $upstream = Get-Content "config/nginx/upstream.conf" -Raw
    if ($upstream -match "app-blue") { return "blue" }
    if ($upstream -match "app-green") { return "green" }
    return $null
}

function Switch-Traffic {
    param([string]$Color)
    
    $upstream = "server app-${Color}:3000 max_fails=3 fail_timeout=30s;`n"
    $upstream | Out-File -FilePath "config/nginx/upstream.conf" -Encoding UTF8 -NoNewline
    
    # Reload nginx
    docker exec unioneyes-loadbalancer nginx -s reload
    Write-Step "Traffic switched to $Color" -Status "Success"
}

function Test-HealthCheck {
    param([string]$Color, [int]$Port)
    
    Write-Step "Running health checks on $Color environment..." -Status "Info"
    
    $maxAttempts = 30
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Step "Health check passed" -Status "Success"
                return $true
            }
        } catch {
            $attempt++
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Step "Health check failed after $maxAttempts attempts" -Status "Error"
    return $false
}

function Run-SmokeTests {
    param([int]$Port)
    
    Write-Step "Running smoke tests..." -Status "Info"
    
    $tests = @(
        @{ Url = "http://localhost:$Port/"; Name = "Homepage" }
        @{ Url = "http://localhost:$Port/api/health"; Name = "Health endpoint" }
    )
    
    foreach ($test in $tests) {
        try {
            $response = Invoke-WebRequest -Uri $test.Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Step "[OK] $($test.Name)" -Status "Success"
            } else {
                Write-Step "[FAIL] $($test.Name)" -Status "Error"
                return $false
            }
        } catch {
            Write-Step "[FAIL] $($test.Name): $_" -Status "Error"
            return $false
        }
    }
    
    return $true
}

try {
    Write-Host "`n=== BLUE-GREEN DEPLOYMENT ===" -ForegroundColor Cyan
    
    # Determine current and target colors
    $currentColor = Get-CurrentColor
    Write-Step "Current active: $currentColor" -Status "Info"
    
    if (-not $TargetColor) {
        $TargetColor = if ($currentColor -eq "blue") { "green" } else { "blue" }
    }
    
    Write-Step "Target environment: $TargetColor" -Status "Info"
    
    if ($Rollback) {
        Write-Step "Performing rollback..." -Status "Warning"
        Switch-Traffic $currentColor
        exit 0
    }
    
    $targetPort = if ($TargetColor -eq "blue") { 3000 } else { 3001 }
    $serviceName = "app-$TargetColor"
    
    # Step 1: Build and start target environment
    Write-Step "Building and starting $TargetColor environment..." -Status "Info"
    docker-compose -f docker-compose.blue-green.yml up -d $serviceName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Step "Failed to start $TargetColor environment" -Status "Error"
        exit 1
    }
    
    # Step 2: Wait for healthy status
    Write-Step "Waiting for container to be healthy..." -Status "Info"
    Start-Sleep -Seconds 10
    
    $healthy = Test-HealthCheck -Color $TargetColor -Port $targetPort
    if (-not $healthy) {
        Write-Step "Deployment aborted - health checks failed" -Status "Error"
        docker-compose -f docker-compose.blue-green.yml stop $serviceName
        exit 1
    }
    
    # Step 3: Run smoke tests
    $smokeTestsPassed = Run-SmokeTests -Port $targetPort
    if (-not $smokeTestsPassed) {
        Write-Step "Deployment aborted - smoke tests failed" -Status "Error"
        docker-compose -f docker-compose.blue-green.yml stop $serviceName
        exit 1
    }
    
    # Step 4: Switch traffic
    Write-Step "Switching traffic to $TargetColor..." -Status "Warning"
    Switch-Traffic $TargetColor
    
    # Step 5: Monitor for 30 seconds
    Write-Step "Monitoring for 30 seconds..." -Status "Info"
    Start-Sleep -Seconds 30
    
    $finalHealth = Test-HealthCheck -Color $TargetColor -Port $targetPort
    if (-not $finalHealth) {
        Write-Step "Post-deployment check failed, rolling back..." -Status "Error"
        Switch-Traffic $currentColor
        exit 1
    }
    
    # Step 6: Stop old environment
    Write-Step "Stopping $currentColor environment..." -Status "Info"
    docker-compose -f docker-compose.blue-green.yml stop "app-$currentColor"
    
    Write-Step "Deployment complete!" -Status "Success"
    Write-Step "Active environment: $TargetColor" -Status "Success"
    Write-Host "`nTo rollback, run: pwsh scripts/deploy-blue-green.ps1 -Rollback`n" -ForegroundColor Gray
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    Write-Step "Rolling back..." -Status "Warning"
    if ($currentColor) {
        Switch-Traffic $currentColor
    }
    exit 1
}

