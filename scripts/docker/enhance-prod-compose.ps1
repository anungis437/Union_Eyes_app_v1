#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Enhance production docker-compose with security and secrets

.DESCRIPTION
    Adds production hardening to docker-compose.prod.yml
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{ Success = "Green"; Warning = "Yellow"; Error = "Red"; Info = "Cyan" }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $colors[$Status]
}

try {
    # Backup original
    if (Test-Path "docker-compose.prod.yml") {
        $backupFile = "docker-compose.prod.yml.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item "docker-compose.prod.yml" $backupFile
        Write-Step "Backup created: $backupFile" -Status "Success"
    }
    
    # Create enhanced production compose
    $enhancedProdCompose = @'
# Production Docker Compose Configuration
# Enhanced with security hardening and secrets management

version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: unioneyes-db-prod
    secrets:
      - postgres_password
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
      POSTGRES_DB: unioneyes
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
    # Security hardening
    security_opt:
      - no-new-privileges:true
    read_only: false  # PostgreSQL needs write access
    tmpfs:
      - /tmp
      - /var/run/postgresql
    
    # Resource limits (production)
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4g
        reservations:
          cpus: '2'
          memory: 3g
      restart_policy:
        condition: unless-stopped
        delay: 5s
        max_attempts: 3
    
    # Health check
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=postgres,environment=production"
    
    networks:
      - backend

  app:
    image: unioneyes:optimized
    build:
      context: .
      dockerfile: Dockerfile.optimized
      args:
        NODE_ENV: production
    container_name: unioneyes-app-prod
    
    # Secrets
    secrets:
      - clerk_publishable_key
      - clerk_secret_key
      - azure_storage_key
      - azure_openai_key
    
    environment:
      # Database
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/unioneyes
      
      # Clerk Authentication (using secrets)
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_FILE: /run/secrets/clerk_publishable_key
      CLERK_SECRET_KEY_FILE: /run/secrets/clerk_secret_key
      
      # Azure Services (using secrets)
      AZURE_STORAGE_ACCOUNT_NAME: ${AZURE_STORAGE_ACCOUNT_NAME}
      AZURE_STORAGE_KEY_FILE: /run/secrets/azure_storage_key
      AZURE_OPENAI_KEY_FILE: /run/secrets/azure_openai_key
      
      # App Configuration
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-https://unioneyes.app}
      NODE_ENV: production
    
    ports:
      - "3000:3000"
    
    depends_on:
      postgres:
        condition: service_healthy
    
    # Security hardening
    security_opt:
      - no-new-privileges:true
      - seccomp=./security/seccomp-profile.json
    read_only: true
    tmpfs:
      - /tmp:mode=1777,size=512M
      - /app/.next/cache:mode=0755,size=1G
    user: "1001:1001"  # nextjs user
    
    # Capability restrictions
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    
    # Resource limits (production)
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8g
        reservations:
          cpus: '3'
          memory: 6g
      restart_policy:
        condition: unless-stopped
        delay: 5s
        max_attempts: 3
    
    # Health check
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=app,environment=production"
    
    networks:
      - backend
      - monitoring

volumes:
  postgres_data:
    driver: local

networks:
  backend:
    driver: bridge
  monitoring:
    driver: bridge

secrets:
  postgres_password:
    external: true
  clerk_publishable_key:
    external: true
  clerk_secret_key:
    external: true
  azure_storage_key:
    external: true
  azure_openai_key:
    external: true
'@
    
    # Write enhanced compose file
    $enhancedProdCompose | Out-File -FilePath "docker-compose.prod.yml" -Encoding UTF8
    Write-Step "Enhanced docker-compose.prod.yml" -Status "Success"
    
    # Validate
    Write-Step "Validating configuration..." -Status "Info"
    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $validation = docker-compose -f docker-compose.prod.yml config 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevErrorAction
    
    if ($validation -match "\berror\b" -and $validation -notmatch "level=warning") {
        Write-Step "Validation failed!" -Status "Error"
        Write-Host $validation -ForegroundColor Red
        
        if (Test-Path $backupFile) {
            Copy-Item $backupFile "docker-compose.prod.yml" -Force
            Write-Step "Restored from backup" -Status "Success"
        }
        exit 1
    }
    
    Write-Step "[OK] Configuration is valid" -Status "Success"
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    exit 1
}
