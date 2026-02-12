#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Add Jaeger distributed tracing to docker-compose

.DESCRIPTION
    Adds Jaeger all-in-one container for distributed tracing
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
    $backupFile = "docker-compose.yml.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item "docker-compose.yml" $backupFile
    Write-Step "Backup created: $backupFile" -Status "Success"
    
    # Read current compose file
    $composeContent = Get-Content "docker-compose.yml" -Raw
    
    # Check if Jaeger already exists
    if ($composeContent -match "jaeger") {
        Write-Step "Jaeger already exists" -Status "Warning"
        exit 0
    }
    
    # Find volumes section
    $volumesMatch = [regex]::Match($composeContent, '(?m)^volumes:')
    
    if (-not $volumesMatch.Success) {
        Write-Step "Could not find volumes section" -Status "Error"
        exit 1
    }
    
    # Jaeger service to add
    $jaegerService = @'

  # Distributed Tracing
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: unioneyes-jaeger
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "5775:5775/udp"   # zipkin thrift
      - "6831:6831/udp"   # jaeger thrift
      - "6832:6832/udp"   # jaeger thrift
      - "5778:5778"       # serve configs
      - "16686:16686"     # web UI
      - "14268:14268"     # jaeger.thrift
      - "14250:14250"     # model.proto
      - "9411:9411"       # zipkin
      - "4317:4317"       # OTLP gRPC
      - "4318:4318"       # OTLP HTTP
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1g
        reservations:
          cpus: '0.5'
          memory: 512m
    networks:
      - monitoring

'@
    
    # Insert before volumes
    $beforeVolumes = $composeContent.Substring(0, $volumesMatch.Index)
    $afterVolumes = $composeContent.Substring($volumesMatch.Index)
    
    $newContent = $beforeVolumes + $jaegerService + $afterVolumes
    
    # Write file
    $newContent | Out-File -FilePath "docker-compose.yml" -Encoding UTF8
    Write-Step "Added Jaeger tracing" -Status "Success"
    
    # Validate
    Write-Step "Validating..." -Status "Info"
    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $validation = docker-compose config 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevErrorAction
    
    if ($validation -match "\berror\b" -and $validation -notmatch "level=warning") {
        Write-Step "Validation failed!" -Status "Error"
        Write-Host $validation -ForegroundColor Red
        Copy-Item $backupFile "docker-compose.yml" -Force
        Write-Step "Restored from backup" -Status "Success"
        exit 1
    }
    
    Write-Step "[OK] Configuration is valid" -Status "Success"
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    exit 1
}
