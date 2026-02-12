#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Apply Phase 2 - Advanced Observability enhancements

.DESCRIPTION
    Implements comprehensive monitoring and logging:
    - Prometheus metrics collection
    - Grafana visualization dashboards
    - Loki log aggregation
    - AlertManager for alerting
    - Node Exporter for host metrics
    - cAdvisor for container metrics
    
.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER SkipBackup
    Skip backup creation (not recommended)

.EXAMPLE
    .\apply-phase2.ps1
    Apply Phase 2 with backup

.EXAMPLE
    .\apply-phase2.ps1 -DryRun
    Preview Phase 2 changes
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
    Write-Section "PHASE 2: ADVANCED OBSERVABILITY"
    
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
    
    # Step 3: Create directories
    Write-Host ""
    Write-Step "Creating configuration directories..." -Status "Info"
    
    $dirs = @(
        "monitoring/prometheus",
        "monitoring/grafana/dashboards",
        "monitoring/grafana/provisioning/datasources",
        "monitoring/grafana/provisioning/dashboards",
        "monitoring/loki",
        "monitoring/alertmanager"
    )
    
    foreach ($dir in $dirs) {
        if ($DryRun) {
            Write-Step "  [Preview] Create: $dir" -Status "Warning"
        } else {
            if (-not (Test-Path $dir)) {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                Write-Step "  Created: $dir" -Status "Success"
            } else {
                Write-Step "  Exists: $dir" -Status "Info"
            }
        }
    }
    
    # Step 4: Generate configuration files
    Write-Host ""
    Write-Step "Generating monitoring configurations..." -Status "Info"
    
    # Prometheus config
    $prometheusConfig = @"
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'unioneyes'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load rules once and periodically evaluate them
rule_files:
  - '/etc/prometheus/alerts/*.yml'

# Scrape configurations
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'prometheus'

  # Next.js application metrics
  - job_name: 'unioneyes-app'
    static_configs:
      - targets: ['app:3000']
        labels:
          service: 'app'
          role: 'backend'
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  # PostgreSQL metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
        labels:
          service: 'postgres'
          role: 'database'

  # Container metrics (cAdvisor)
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
        labels:
          service: 'cadvisor'
          role: 'monitoring'
    scrape_interval: 30s

  # Node exporter (host metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
        labels:
          service: 'node-exporter'
          role: 'system'
"@

    if ($DryRun) {
        Write-Step "  [Preview] Write: monitoring/prometheus/prometheus.yml" -Status "Warning"
    } else {
        $prometheusConfig | Out-File -FilePath "monitoring/prometheus/prometheus.yml" -Encoding UTF8
        Write-Step "  Created: monitoring/prometheus/prometheus.yml" -Status "Success"
    }
    
    # Prometheus alerts
    $alertsConfig = @'
groups:
  - name: application_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests/sec"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time (p95 > 1s)"
          description: "95th percentile response time: {{ $value }}s"

      # Application down
      - alert: ApplicationDown
        expr: up{job="unioneyes-app"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Application is down"
          description: "unioneyes-app has been down for 2+ minutes"

  - name: database_alerts
    interval: 30s
    rules:
      # Database down
      - alert: PostgreSQLDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
          description: "Database has been unreachable for 1+ minute"

      # High connection usage
      - alert: HighDatabaseConnections
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "Connection usage: {{ $value | humanizePercentage }}"

      # Slow queries
      - alert: SlowQueries
        expr: rate(pg_stat_statements_mean_time_seconds[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "Average query time: {{ $value }}s"

  - name: infrastructure_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: container_cpu_usage_seconds_total > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "Container {{ $labels.name }} CPU usage: {{ $value | humanizePercentage }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Container {{ $labels.name }} memory usage: {{ $value | humanizePercentage }}"

      # Disk space low
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk space available: {{ $value | humanizePercentage }}"
'@

    if ($DryRun) {
        Write-Step "  [Preview] Write: monitoring/prometheus/alerts.yml" -Status "Warning"
    } else {
        New-Item -ItemType Directory -Path "monitoring/prometheus/alerts" -Force | Out-Null
        $alertsConfig | Out-File -FilePath "monitoring/prometheus/alerts/alerts.yml" -Encoding UTF8
        Write-Step "  Created: monitoring/prometheus/alerts/alerts.yml" -Status "Success"
    }
    
    # Grafana datasource
    $grafanaDatasource = @"
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: 15s

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      maxLines: 1000
"@

    if ($DryRun) {
        Write-Step "  [Preview] Write: monitoring/grafana/provisioning/datasources/datasources.yml" -Status "Warning"
    } else {
        $grafanaDatasource | Out-File -FilePath "monitoring/grafana/provisioning/datasources/datasources.yml" -Encoding UTF8
        Write-Step "  Created: monitoring/grafana/provisioning/datasources/datasources.yml" -Status "Success"
    }
    
    # Grafana dashboard provisioning
    $grafanaDashboardProvisioning = @"
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
"@

    if ($DryRun) {
        Write-Step "  [Preview] Write: monitoring/grafana/provisioning/dashboards/dashboards.yml" -Status "Warning"
    } else {
        $grafanaDashboardProvisioning | Out-File -FilePath "monitoring/grafana/provisioning/dashboards/dashboards.yml" -Encoding UTF8
        Write-Step "  Created: monitoring/grafana/provisioning/dashboards/dashboards.yml" -Status "Success"
    }
    
    # Loki config
    $lokiConfig = @"
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 168h  # 7 days
  max_query_length: 0h
  max_streams_per_user: 10000
  max_query_parallelism: 32
"@

    if ($DryRun) {
        Write-Step "  [Preview] Write: monitoring/loki/loki-config.yml" -Status "Warning"
    } else {
        $lokiConfig | Out-File -FilePath "monitoring/loki/loki-config.yml" -Encoding UTF8
        Write-Step "  Created: monitoring/loki/loki-config.yml" -Status "Success"
    }
    
    # AlertManager config
    $alertmanagerConfig = @"
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://app:3000/api/alerts/webhook'
        send_resolved: true

  - name: 'critical'
    webhook_configs:
      - url: 'http://app:3000/api/alerts/critical'
        send_resolved: true

  - name: 'warning'
    webhook_configs:
      - url: 'http://app:3000/api/alerts/warning'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
"@

    if ($DryRun) {
        Write-Step "  [Preview] Write: monitoring/alertmanager/alertmanager.yml" -Status "Warning"
    } else {
        $alertmanagerConfig | Out-File -FilePath "monitoring/alertmanager/alertmanager.yml" -Encoding UTF8
        Write-Step "  Created: monitoring/alertmanager/alertmanager.yml" -Status "Success"
    }
    
    # Step 5: Update docker-compose.yml
    Write-Host ""
    Write-Step "Updating docker-compose.yml..." -Status "Info"
    
    if ($DryRun) {
        Write-Step "  [Preview] Adding monitoring services to docker-compose.yml" -Status "Warning"
        Write-Host "    - Prometheus (metrics)" -ForegroundColor Gray
        Write-Host "    - Grafana (dashboards)" -ForegroundColor Gray
        Write-Host "    - Loki (logging)" -ForegroundColor Gray
        Write-Host "    - AlertManager (alerts)" -ForegroundColor Gray
        Write-Host "    - cAdvisor (container metrics)" -ForegroundColor Gray
        Write-Host "    - Node Exporter (host metrics)" -ForegroundColor Gray
        Write-Host "    - Postgres Exporter (DB metrics)" -ForegroundColor Gray
    } else {
        & ".\scripts\docker\add-monitoring-stack.ps1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Step "Failed to add monitoring stack!" -Status "Error"
            exit 1
        }
    }
    
    # Step 6: Summary
    Write-Section "PHASE 2 SUMMARY"
    
    if ($DryRun) {
        Write-Host "[Preview] Phase 2 changes:" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Phase 2 applied successfully!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Observability Stack:" -ForegroundColor Cyan
    Write-Host "  [*] Prometheus - Metrics collection (http://localhost:9090)" -ForegroundColor White
    Write-Host "  [*] Grafana - Dashboards (http://localhost:3001)" -ForegroundColor White
    Write-Host "  [*] Loki - Log aggregation" -ForegroundColor White
    Write-Host "  [*] AlertManager - Alert routing (http://localhost:9093)" -ForegroundColor White
    Write-Host "  [*] cAdvisor - Container metrics (http://localhost:8081)" -ForegroundColor White
    Write-Host "  [*] Node Exporter - Host metrics" -ForegroundColor White
    Write-Host "  [*] Postgres Exporter - Database metrics" -ForegroundColor White
    
    Write-Host ""
    Write-Host "Configuration Files:" -ForegroundColor Cyan
    Write-Host "  [*] monitoring/prometheus/prometheus.yml" -ForegroundColor White
    Write-Host "  [*] monitoring/prometheus/alerts/alerts.yml" -ForegroundColor White
    Write-Host "  [*] monitoring/grafana/provisioning/datasources/datasources.yml" -ForegroundColor White
    Write-Host "  [*] monitoring/loki/loki-config.yml" -ForegroundColor White
    Write-Host "  [*] monitoring/alertmanager/alertmanager.yml" -ForegroundColor White
    
    if (-not $DryRun) {
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Validate: .\scripts\docker\validate-phase2.ps1" -ForegroundColor Gray
        Write-Host "  2. Start stack: docker-compose up -d" -ForegroundColor Gray
        Write-Host "  3. Access Grafana: http://localhost:3001 (admin/admin)" -ForegroundColor Gray
        Write-Host "  4. Import dashboards from monitoring/grafana/dashboards/" -ForegroundColor Gray
        Write-Host ""
    }
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    Write-Step $_.ScriptStackTrace -Status "Error"
    exit 1
}
