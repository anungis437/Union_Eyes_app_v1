#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Add monitoring stack to docker-compose.yml

.DESCRIPTION
    Adds Prometheus, Grafana, Loki, AlertManager, and exporters to docker-compose
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
    
    # Check if monitoring services already exist
    if ($composeContent -match "unioneyes-prometheus") {
        Write-Step "Monitoring stack already exists" -Status "Warning"
        exit 0
    }
    
    # Find volumes section
    $volumesMatch = [regex]::Match($composeContent, '(?m)^volumes:')
    
    if (-not $volumesMatch.Success) {
        Write-Step "Could not find volumes section" -Status "Error"
        exit 1
    }
    
    # Monitoring services to add
    $monitoringServices = @'

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: unioneyes-prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alerts:/etc/prometheus/alerts:ro
      - prometheus_data:/prometheus
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

  grafana:
    image: grafana/grafana:latest
    container_name: unioneyes-grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1g
        reservations:
          cpus: '0.5'
          memory: 512m
    depends_on:
      - prometheus
    networks:
      - monitoring

  loki:
    image: grafana/loki:latest
    container_name: unioneyes-loki
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
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

  alertmanager:
    image: prom/alertmanager:latest
    container_name: unioneyes-alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512m
        reservations:
          cpus: '0.25'
          memory: 256m
    networks:
      - monitoring

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: unioneyes-cadvisor
    ports:
      - "8081:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512m
        reservations:
          cpus: '0.25'
          memory: 256m
    networks:
      - monitoring
    privileged: true

  node-exporter:
    image: prom/node-exporter:latest
    container_name: unioneyes-node-exporter
    command:
      - '--path.rootfs=/host'
    ports:
      - "9100:9100"
    volumes:
      - /:/host:ro,rslave
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256m
        reservations:
          cpus: '0.25'
          memory: 128m
    networks:
      - monitoring

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: unioneyes-postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://postgres:postgres@postgres:5432/unioneyes?sslmode=disable"
    ports:
      - "9187:9187"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256m
        reservations:
          cpus: '0.25'
          memory: 128m
    depends_on:
      - postgres
    networks:
      - default
      - monitoring

'@
    
    # Insert before volumes
    $beforeVolumes = $composeContent.Substring(0, $volumesMatch.Index)
    $afterVolumes = $composeContent.Substring($volumesMatch.Index)
    
    $newContent = $beforeVolumes + $monitoringServices + $afterVolumes
    
    # Add monitoring volumes
    $newContent += @'

  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  loki_data:
    driver: local
  alertmanager_data:
    driver: local
'@
    
    # Add networks section
    $newContent += @'


networks:
  monitoring:
    driver: bridge
'@
    
    # Write file
    $newContent | Out-File -FilePath "docker-compose.yml" -Encoding UTF8
    Write-Step "Added monitoring stack" -Status "Success"
    
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
