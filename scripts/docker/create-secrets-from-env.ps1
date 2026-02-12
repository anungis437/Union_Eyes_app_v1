#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Create Docker secrets from .env file

.DESCRIPTION
    Reads .env.local and creates Docker secrets for production deployment
#>

param()

$ErrorActionPreference = "Stop"

Write-Host "Creating Docker secrets from .env.local..." -ForegroundColor Cyan

if (-not (Test-Path ".env.local")) {
    Write-Host "Error: .env.local not found" -ForegroundColor Red
    exit 1
}

# Check if swarm is initialized
$swarmStatus = docker info --format '{{.Swarm.LocalNodeState}}' 2>&1
if ($swarmStatus -ne "active") {
    Write-Host "Docker Swarm not initialized. Initializing..." -ForegroundColor Yellow
    docker swarm init
}

# Read .env.local
$envVars = Get-Content ".env.local" | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }

foreach ($line in $envVars) {
    $parts = $line -split '=', 2
    $name = $parts[0].Trim().ToLower() -replace '_', '-'
    $value = $parts[1].Trim()
    
    # Skip empty values
    if ([string]::IsNullOrEmpty($value)) {
        continue
    }
    
    # Create secret
    try {
        $existingSecret = docker secret ls --filter "name=$name" --format '{{.Name}}' 2>&1
        
        if ($existingSecret -eq $name) {
            Write-Host "  [Skip] $name (already exists)" -ForegroundColor Yellow
        } else {
            echo $value | docker secret create $name - 2>&1 | Out-Null
            Write-Host "  [OK] Created secret: $name" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [Fail] $name : $_" -ForegroundColor Red
    }
}

Write-Host "`nSecrets created successfully!" -ForegroundColor Green
Write-Host "View with: docker secret ls" -ForegroundColor Gray
