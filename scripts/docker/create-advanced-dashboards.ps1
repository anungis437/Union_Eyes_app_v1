#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Create advanced Grafana dashboards

.DESCRIPTION
    Creates 5 comprehensive dashboards for monitoring
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

# Ensure directory exists
$dashboardDir = "monitoring/grafana/dashboards"
if (-not (Test-Path $dashboardDir)) {
    New-Item -ItemType Directory -Path $dashboardDir -Force | Out-Null
}

# Dashboard 1: Application Performance (APM)
$apmDashboard = @'
{
  "dashboard": {
    "title": "Application Performance Monitoring",
    "tags": ["apm", "performance"],
    "timezone": "browser",
    "schemaVersion": 16,
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{handler}}"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 2,
        "title": "Response Time (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "{{handler}}"
          }
        ],
        "gridPos": {"x": 0, "y": 8, "w": 12, "h": 8}
      },
      {
        "id": 4,
        "title": "Throughput",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "gridPos": {"x": 12, "y": 8, "w": 12, "h": 8}
      }
    ]
  }
}
'@

# Dashboard 2: Infrastructure Overview
$infraDashboard = @'
{
  "dashboard": {
    "title": "Infrastructure Overview",
    "tags": ["infrastructure", "resources"],
    "timezone": "browser",
    "schemaVersion": 16,
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage by Container",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total[5m]) * 100",
            "legendFormat": "{{name}}"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 2,
        "title": "Memory Usage by Container",
        "type": "graph",
        "targets": [
          {
            "expr": "container_memory_usage_bytes / 1024 / 1024",
            "legendFormat": "{{name}}"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 3,
        "title": "Network I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(container_network_receive_bytes_total[5m])",
            "legendFormat": "{{name}} RX"
          },
          {
            "expr": "rate(container_network_transmit_bytes_total[5m])",
            "legendFormat": "{{name}} TX"
          }
        ],
        "gridPos": {"x": 0, "y": 8, "w": 12, "h": 8}
      },
      {
        "id": 4,
        "title": "Disk I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(container_fs_reads_bytes_total[5m])",
            "legendFormat": "{{name}} Read"
          },
          {
            "expr": "rate(container_fs_writes_bytes_total[5m])",
            "legendFormat": "{{name}} Write"
          }
        ],
        "gridPos": {"x": 12, "y": 8, "w": 12, "h": 8}
      }
    ]
  }
}
'@

# Dashboard 3: Database Performance
$dbDashboard = @'
{
  "dashboard": {
    "title": "Database Performance",
    "tags": ["database", "postgresql"],
    "timezone": "browser",
    "schemaVersion": 16,
    "panels": [
      {
        "id": 1,
        "title": "Query Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_database_xact_commit[5m]) + rate(pg_stat_database_xact_rollback[5m])",
            "legendFormat": "{{datname}}"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 2,
        "title": "Connection Pool",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "{{datname}}"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 3,
        "title": "Cache Hit Ratio",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(pg_stat_database_blks_hit[5m]) / (rate(pg_stat_database_blks_hit[5m]) + rate(pg_stat_database_blks_read[5m])) * 100",
            "legendFormat": "{{datname}}"
          }
        ],
        "gridPos": {"x": 0, "y": 8, "w": 12, "h": 8}
      },
      {
        "id": 4,
        "title": "Transaction Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_database_xact_commit[5m])",
            "legendFormat": "Commits"
          },
          {
            "expr": "rate(pg_stat_database_xact_rollback[5m])",
            "legendFormat": "Rollbacks"
          }
        ],
        "gridPos": {"x": 12, "y": 8, "w": 12, "h": 8}
      }
    ]
  }
}
'@

# Dashboard 4: SLA Compliance
$slaDashboard = @'
{
  "dashboard": {
    "title": "SLA Compliance",
    "tags": ["sla", "slo"],
    "timezone": "browser",
    "schemaVersion": 16,
    "panels": [
      {
        "id": 1,
        "title": "Availability (Target: 99.9%)",
        "type": "stat",
        "targets": [
          {
            "expr": "(1 - (rate(http_requests_total{status=~\"5..\"}[30d]) / rate(http_requests_total[30d]))) * 100",
            "legendFormat": "Availability"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 6, "h": 6}
      },
      {
        "id": 2,
        "title": "P95 Response Time (Target: <1s)",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P95"
          }
        ],
        "gridPos": {"x": 6, "y": 0, "w": 6, "h": 6}
      },
      {
        "id": 3,
        "title": "P99 Response Time (Target: <3s)",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "P99"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 6, "h": 6}
      },
      {
        "id": 4,
        "title": "Error Rate (Target: <0.1%)",
        "type": "stat",
        "targets": [
          {
            "expr": "(rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])) * 100",
            "legendFormat": "Error Rate"
          }
        ],
        "gridPos": {"x": 18, "y": 0, "w": 6, "h": 6}
      },
      {
        "id": 5,
        "title": "Error Budget Remaining",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - ((rate(http_requests_total{status=~\"5..\"}[30d]) / rate(http_requests_total[30d])) * 100 / 0.1)",
            "legendFormat": "Error Budget %"
          }
        ],
        "gridPos": {"x": 0, "y": 6, "w": 24, "h": 8}
      }
    ]
  }
}
'@

# Dashboard 5: Cost Analysis
$costDashboard = @'
{
  "dashboard": {
    "title": "Cost Analysis",
    "tags": ["cost", "optimization"],
    "timezone": "browser",
    "schemaVersion": 16,
    "panels": [
      {
        "id": 1,
        "title": "CPU Allocation vs Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(container_spec_cpu_quota / container_spec_cpu_period) by (name)",
            "legendFormat": "{{name}} Allocated"
          },
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total[5m])) by (name)",
            "legendFormat": "{{name}} Used"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 2,
        "title": "Memory Allocation vs Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "container_spec_memory_limit_bytes / 1024 / 1024",
            "legendFormat": "{{name}} Allocated"
          },
          {
            "expr": "container_memory_usage_bytes / 1024 / 1024",
            "legendFormat": "{{name}} Used"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 3,
        "title": "Over-Provisioned Services",
        "type": "table",
        "targets": [
          {
            "expr": "((container_spec_memory_limit_bytes - container_memory_usage_bytes) / container_spec_memory_limit_bytes) * 100 > 50",
            "legendFormat": "{{name}}"
          }
        ],
        "gridPos": {"x": 0, "y": 8, "w": 24, "h": 8}
      }
    ]
  }
}
'@

try {
    # Write all dashboards
    $dashboards = @{
        "apm-dashboard.json" = $apmDashboard
        "infrastructure-dashboard.json" = $infraDashboard
        "database-dashboard.json" = $dbDashboard
        "sla-dashboard.json" = $slaDashboard
        "cost-dashboard.json" = $costDashboard
    }
    
    foreach ($entry in $dashboards.GetEnumerator()) {
        $file = Join-Path $dashboardDir $entry.Key
        $entry.Value | Out-File -FilePath $file -Encoding UTF8
        Write-Step "Created $($entry.Key)" -Status "Success"
    }
    
    Write-Step "All dashboards created successfully" -Status "Success"
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    exit 1
}
