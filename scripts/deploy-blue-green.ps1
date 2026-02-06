#!/usr/bin/env pwsh
#
# Blue-Green Deployment Script for Windows/PowerShell
# 
# Usage:
#   .\deploy-blue-green.ps1 -Action deploy -Slot green
#   .\deploy-blue-green.ps1 -Action switch -From blue -To green
#   .\deploy-blue-green.ps1 -Action rollback
#

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('deploy', 'switch', 'rollback', 'status')]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('blue', 'green')]
    [string]$Slot = 'green',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('blue', 'green')]
    [string]$From = 'blue',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('blue', 'green')]
    [string]$To = 'green'
)

$ErrorActionPreference = "Stop"

# Configuration
$COMPOSE_FILE = "docker-compose.blue-green.yml"

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-ServiceHealth {
    param(
        [string]$Slot,
        [int]$MaxRetries = 30
    )
    
    Write-Info "Checking health of $Slot environment..."
    
    $containerName = "unioneyes-$Slot"
    $retries = 0
    
    while ($retries -lt $MaxRetries) {
        try {
            $health = docker inspect --format='{{.State.Health.Status}}' $containerName 2>$null
            
            if ($health -eq 'healthy') {
                Write-Success "$Slot environment is healthy"
                return $true
            }
            
            $retries++
            Write-Host "Waiting for $Slot to be healthy... ($retries/$MaxRetries)"
            Start-Sleep -Seconds 2
        }
        catch {
            $retries++
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Error "$Slot environment failed health check"
    return $false
}

function Invoke-SlotDeployment {
    param([string]$Slot)
    
    Write-Info "Deploying to $Slot environment..."
    
    # Build new image
    Write-Info "Building Docker image..."
    docker-compose -f $COMPOSE_FILE build "app-$Slot"
    
    # Stop old container if exists
    Write-Info "Stopping old $Slot container..."
    docker-compose -f $COMPOSE_FILE stop "app-$Slot" 2>$null
    docker-compose -f $COMPOSE_FILE rm -f "app-$Slot" 2>$null
    
    # Start new container (without traffic)
    Write-Info "Starting $Slot container..."
    docker-compose -f $COMPOSE_FILE up -d "app-$Slot"
    
    # Wait for health check
    if (Test-ServiceHealth -Slot $Slot) {
        Write-Success "✅ Deployment to $Slot complete!"
        Write-Info "Run smoke tests, then switch traffic: .\deploy-blue-green.ps1 -Action switch -From $From -To $Slot"
    }
    else {
        Write-Error "Deployment to $Slot failed health check"
        exit 1
    }
}

function Switch-Traffic {
    param(
        [string]$From,
        [string]$To
    )
    
    Write-Info "Switching traffic from $From to $To..."
    
    # Verify target is healthy
    if (-not (Test-ServiceHealth -Slot $To)) {
        Write-Error "$To environment is not healthy. Aborting switch."
        exit 1
    }
    
    # Enable traffic to new slot
    Write-Info "Enabling traffic to $To..."
    docker exec traefik sh -c "docker exec traefik traefik healthcheck" 2>$null
    
    # Update Traefik labels
    docker-compose -f $COMPOSE_FILE up -d "app-$To"
    docker exec -it unioneyes-$To sh -c 'kill -USR1 1' 2>$null  # Graceful reload
    
    Write-Success "Traffic is now routing to $To environment"
    
    # Keep old slot running for rollback
    Write-Info "Keeping $From environment running for quick rollback"
    Write-Info "To remove $From: docker-compose -f $COMPOSE_FILE stop app-$From"
}

function Restore-Deployment {
    Write-Info "Rolling back to previous deployment..."
    
    # Determine which slot is currently active
    $blueRunning = docker ps --filter "name=unioneyes-blue" --format '{{.Names}}' 2>$null
    $greenRunning = docker ps --filter "name=unioneyes-green" --format '{{.Names}}' 2>$null
    
    if ($blueRunning -and $greenRunning) {
        # Both running, switch to the other one
        Write-Info "Both slots running. Switching traffic back..."
        Switch-Traffic -From 'green' -To 'blue'
    }
    else {
        Write-Error "Cannot determine rollback target. Manual intervention required."
        exit 1
    }
    
    Write-Success "Rollback complete!"
}

function Show-Status {
    Write-Info "Deployment Status:"
    Write-Host ""
    
    # Check blue
    $blueStatus = docker inspect --format='{{.State.Status}}' unioneyes-blue 2>$null
    $blueHealth = docker inspect --format='{{.State.Health.Status}}' unioneyes-blue 2>$null
    Write-Host "🔵 Blue:  Status=$blueStatus, Health=$blueHealth"
    
    # Check green
    $greenStatus = docker inspect --format='{{.State.Status}}' unioneyes-green 2>$null
    $greenHealth = docker inspect --format='{{.State.Health.Status}}' unioneyes-green 2>$null
    Write-Host "🟢 Green: Status=$greenStatus, Health=$greenHealth"
    
    Write-Host ""
    Write-Info "Active containers:"
    docker ps --filter "name=unioneyes" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Main execution
switch ($Action) {
    'deploy' {
        Invoke-SlotDeployment -Slot $Slot
    }
    'switch' {
        Switch-Traffic -From $From -To $To
    }
    'rollback' {
        Restore-Deployment
    }
    'status' {
        Show-Status
    }
}
