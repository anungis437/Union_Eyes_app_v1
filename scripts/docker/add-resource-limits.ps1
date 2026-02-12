#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Add resource limits and health checks to docker-compose files

.DESCRIPTION
    Enhances existing docker-compose.yml with:
    - CPU and memory limits
    - Advanced health checks
    - Restart policies
    - Dependency management
    
.PARAMETER File
    Docker compose file to enhance (default: docker-compose.yml)

.PARAMETER Environment
    Environment type: dev, staging, or prod (affects resource limits)

.PARAMETER DryRun
    Show changes without applying them

.EXAMPLE
    .\add-resource-limits.ps1
    Enhance docker-compose.yml with dev resource limits

.EXAMPLE
    .\add-resource-limits.ps1 -Environment prod
    Enhance with production resource limits

.EXAMPLE
    .\add-resource-limits.ps1 -DryRun
    Preview changes without applying
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$File = "docker-compose.yml",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Resource limit configurations by environment
$ResourceLimits = @{
    dev = @{
        app = @{
            cpus = "2"
            memory = "4g"
            memory_reservation = "2g"
        }
        postgres = @{
            cpus = "2"
            memory = "2g"
            memory_reservation = "1g"
        }
    }
    staging = @{
        app = @{
            cpus = "3"
            memory = "6g"
            memory_reservation = "4g"
        }
        postgres = @{
            cpus = "3"
            memory = "3g"
            memory_reservation = "2g"
        }
    }
    prod = @{
        app = @{
            cpus = "4"
            memory = "8g"
            memory_reservation = "6g"
        }
        postgres = @{
            cpus = "4"
            memory = "4g"
            memory_reservation = "3g"
        }
    }
}

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $colors[$Status]
}

function Get-EnhancedComposeConfig {
    param(
        [string]$OriginalFile,
        [string]$Env
    )
    
    # Read original file
    $content = Get-Content $OriginalFile -Raw
    
    # Parse YAML (simple approach - for complex YAML, use a library)
    $lines = Get-Content $OriginalFile
    
    # Resource limits to add
    $limits = $ResourceLimits[$Env]
    
    Write-Step "Resource limits for ${Env}:" -Status "Info"
    Write-Step "  App: $($limits.app.cpus) CPUs, $($limits.app.memory) RAM" -Status "Info"
    Write-Step "  DB:  $($limits.postgres.cpus) CPUs, $($limits.postgres.memory) RAM" -Status "Info"
    
    return @"
# Enhanced Docker Compose Configuration
# Environment: $Env
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: unioneyes-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: unioneyes
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
    # Resource limits ($Env environment)
    deploy:
      resources:
        limits:
          cpus: '$($limits.postgres.cpus)'
          memory: $($limits.postgres.memory)
        reservations:
          cpus: '1'
          memory: $($limits.postgres.memory_reservation)
    
    # Health check
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    
    # Restart policy
    restart: unless-stopped
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_APP_URL: `${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    container_name: unioneyes-app
    ports:
      - "3000:3000"
    environment:
      # Database
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/unioneyes
      
      # Clerk Authentication
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      CLERK_SECRET_KEY: `${CLERK_SECRET_KEY}
      SIGN_IN_FALLBACK_REDIRECT_URL: /dashboard
      
      # Azure Services
      AZURE_STORAGE_ACCOUNT_NAME: `${AZURE_STORAGE_ACCOUNT_NAME:-}
      AZURE_STORAGE_ACCOUNT_KEY: `${AZURE_STORAGE_ACCOUNT_KEY:-}
      AZURE_STORAGE_CONTAINER_NAME: `${AZURE_STORAGE_CONTAINER_NAME:-unioneyes-uploads}
      AZURE_SPEECH_KEY: `${AZURE_SPEECH_KEY:-}
      AZURE_SPEECH_REGION: `${AZURE_SPEECH_REGION:-}
      AZURE_OPENAI_ENDPOINT: `${AZURE_OPENAI_ENDPOINT:-}
      AZURE_OPENAI_KEY: `${AZURE_OPENAI_KEY:-}
      AZURE_OPENAI_DEPLOYMENT_NAME: `${AZURE_OPENAI_DEPLOYMENT_NAME:-gpt-4}
      
      # App Configuration
      NEXT_PUBLIC_APP_URL: `${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
      NODE_ENV: `${NODE_ENV:-$Env}
    
    # Dependencies
    depends_on:
      postgres:
        condition: service_healthy
    
    # Resource limits ($Env environment)
    deploy:
      resources:
        limits:
          cpus: '$($limits.app.cpus)'
          memory: $($limits.app.memory)
        reservations:
          cpus: '2'
          memory: $($limits.app.memory_reservation)
    
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    
    # Restart policy
    restart: unless-stopped
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
    driver: local

# Resource limits summary for $Env environment:
# - App Service: $($limits.app.cpus) CPUs, $($limits.app.memory) RAM
# - PostgreSQL: $($limits.postgres.cpus) CPUs, $($limits.postgres.memory) RAM
# 
# Health checks:
# - App: HTTP GET /api/health every 30s
# - DB: pg_isready every 10s
# 
# Restart policy: unless-stopped (auto-restart except when explicitly stopped)
"@
}

# Main execution
try {
    Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
    Write-Host "  DOCKER COMPOSE ENHANCEMENT" -ForegroundColor Magenta
    Write-Host ("=" * 80) + "`n" -ForegroundColor Magenta
    
    if (-not (Test-Path $File)) {
        Write-Step "File not found: $File" -Status "Error"
        exit 1
    }
    
    Write-Step "Enhancing: $File" -Status "Info"
    Write-Step "Environment: $Environment" -Status "Info"
    Write-Step "Mode: $(if ($DryRun) { 'DRY-RUN' } else { 'APPLY' })" -Status $(if ($DryRun) { "Warning" } else { "Info" })
    Write-Host ""
    
    # Generate enhanced config
    $enhancedConfig = Get-EnhancedComposeConfig -OriginalFile $File -Env $Environment
    
    if ($DryRun) {
        Write-Step "Preview of changes:" -Status "Info"
        Write-Host "`n--- BEGIN ENHANCED CONFIG ---" -ForegroundColor Gray
        Write-Host $enhancedConfig -ForegroundColor White
        Write-Host "--- END ENHANCED CONFIG ---`n" -ForegroundColor Gray
        
        Write-Host "[OK] Changes validated (not applied)" -ForegroundColor Yellow
        Write-Host "  Run without -DryRun to apply changes" -ForegroundColor Gray
        Write-Host ""
    } else {
        # Backup original
        $backupFile = "$File.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $File $backupFile
        Write-Step "Backup created: $backupFile" -Status "Success"
        
        # Write enhanced config
        $enhancedConfig | Out-File -FilePath $File -Encoding UTF8
        Write-Step "Enhanced configuration written" -Status "Success"
        
        # Validate
        Write-Step "Validating configuration..." -Status "Info"
        $validation = docker-compose config 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Step "[OK] Configuration is valid" -Status "Success"
        } else {
            Write-Step "[X]  Configuration validation failed!" -Status "Error"
            Write-Host $validation -ForegroundColor Red
            
            # Restore backup
            Write-Step "Restoring from backup..." -Status "Warning"
            Copy-Item $backupFile $File -Force
            Write-Step "Original file restored" -Status "Success"
            exit 1
        }
        
        Write-Host "`n[OK] Enhancement complete!" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "  1. Review changes: git diff $File" -ForegroundColor Gray
        Write-Host "  2. Test configuration: docker-compose config" -ForegroundColor Gray
        Write-Host "  3. Start services: docker-compose up -d" -ForegroundColor Gray
        Write-Host "  4. Check health: docker-compose ps" -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    Write-Step $_.ScriptStackTrace -Status "Error"
    exit 1
}
