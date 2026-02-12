#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup cost monitoring and optimization tracking

.DESCRIPTION
    Creates cost analysis queries and optimization recommendations
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
$alertDir = "monitoring/prometheus/alerts"
if (-not (Test-Path $alertDir)) {
    New-Item -ItemType Directory -Path $alertDir -Force | Out-Null
}

# Cost Recording Rules
$costRules = @'
groups:
  - name: cost_recording_rules
    interval: 1m
    rules:
      # CPU waste: allocated but unused
      - record: cost:cpu_waste:cores
        expr: |
          (
            container_spec_cpu_quota / container_spec_cpu_period
            -
            rate(container_cpu_usage_seconds_total[5m])
          )
      
      # Memory waste: allocated but unused
      - record: cost:memory_waste:bytes
        expr: |
          (
            container_spec_memory_limit_bytes
            -
            container_memory_usage_bytes
          )
      
      # CPU utilization percentage
      - record: cost:cpu_utilization:percent
        expr: |
          (
            rate(container_cpu_usage_seconds_total[5m])
            /
            (container_spec_cpu_quota / container_spec_cpu_period)
          ) * 100
      
      # Memory utilization percentage
      - record: cost:memory_utilization:percent
        expr: |
          (
            container_memory_usage_bytes
            /
            container_spec_memory_limit_bytes
          ) * 100
      
      # Total resource cost score (lower is better)
      - record: cost:resource_efficiency:score
        expr: |
          (
            (cost:cpu_utilization:percent + cost:memory_utilization:percent) / 2
          )

'@

# Cost Optimization Alerts
$costAlerts = @'
groups:
  - name: cost_optimization_alerts
    interval: 5m
    rules:
      # Alert: Severely over-provisioned CPU
      - alert: CostCPUOverProvisioned
        expr: cost:cpu_utilization:percent < 25
        for: 30m
        labels:
          severity: info
          category: cost
        annotations:
          summary: "Service over-provisioned (CPU)"
          description: "{{ $labels.name }} CPU usage is {{ $value | humanize }}%, consider reducing allocation"
      
      # Alert: Severely over-provisioned Memory
      - alert: CostMemoryOverProvisioned
        expr: cost:memory_utilization:percent < 25
        for: 30m
        labels:
          severity: info
          category: cost
        annotations:
          summary: "Service over-provisioned (Memory)"
          description: "{{ $labels.name }} memory usage is {{ $value | humanize }}%, consider reducing allocation"
      
      # Alert: High CPU waste
      - alert: CostHighCPUWaste
        expr: cost:cpu_waste:cores > 0.5
        for: 1h
        labels:
          severity: info
          category: cost
        annotations:
          summary: "High CPU waste detected"
          description: "{{ $labels.name }} has {{ $value | humanize }} unused CPU cores"
      
      # Alert: High memory waste (>1GB)
      - alert: CostHighMemoryWaste
        expr: cost:memory_waste:bytes > 1073741824
        for: 1h
        labels:
          severity: info
          category: cost
        annotations:
          summary: "High memory waste detected"
          description: "{{ $labels.name }} has {{ $value | humanize1024 }}B unused memory"
      
      # Alert: Container consistently idle
      - alert: CostContainerIdle
        expr: rate(container_cpu_usage_seconds_total[1h]) < 0.01 and container_memory_usage_bytes > 0
        for: 6h
        labels:
          severity: info
          category: cost
        annotations:
          summary: "Container appears idle"
          description: "{{ $labels.name }} has minimal activity, consider stopping when not needed"

'@

# Cost analysis script
$analysisScript = @'
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generate cost optimization report

.DESCRIPTION
    Analyzes resource usage and provides optimization recommendations
#>

param(
    [string]$PrometheusUrl = "http://localhost:9090"
)

function Query-Prometheus {
    param([string]$Query)
    $url = "$PrometheusUrl/api/v1/query?query=" + [System.Web.HttpUtility]::UrlEncode($Query)
    $response = Invoke-RestMethod -Uri $url -Method Get
    return $response.data.result
}

Write-Host "`n=== COST OPTIMIZATION REPORT ===" -ForegroundColor Cyan
Write-Host "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# CPU Analysis
Write-Host "CPU UTILIZATION:" -ForegroundColor Yellow
$cpuUtil = Query-Prometheus "cost:cpu_utilization:percent"
foreach ($metric in $cpuUtil) {
    $name = $metric.metric.name
    $value = [math]::Round($metric.value[1], 2)
    $color = if ($value -lt 25) { "Red" } elseif ($value -lt 50) { "Yellow" } else { "Green" }
    Write-Host "  $name`: $value%" -ForegroundColor $color
}

# Memory Analysis
Write-Host "`nMEMORY UTILIZATION:" -ForegroundColor Yellow
$memUtil = Query-Prometheus "cost:memory_utilization:percent"
foreach ($metric in $memUtil) {
    $name = $metric.metric.name
    $value = [math]::Round($metric.value[1], 2)
    $color = if ($value -lt 25) { "Red" } elseif ($value -lt 50) { "Yellow" } else { "Green" }
    Write-Host "  $name`: $value%" -ForegroundColor $color
}

# Waste Analysis
Write-Host "`nRESOURCE WASTE:" -ForegroundColor Yellow
$cpuWaste = Query-Prometheus "cost:cpu_waste:cores"
$totalCPUWaste = 0
foreach ($metric in $cpuWaste) {
    $name = $metric.metric.name
    $value = [math]::Round($metric.value[1], 2)
    $totalCPUWaste += $value
    if ($value -gt 0.5) {
        Write-Host "  $name`: $value unused CPU cores" -ForegroundColor Red
    }
}

$memWaste = Query-Prometheus "cost:memory_waste:bytes"
$totalMemWaste = 0
foreach ($metric in $memWaste) {
    $name = $metric.metric.name
    $value = [math]::Round($metric.value[1] / 1024 / 1024, 0)
    $totalMemWaste += $value
    if ($value -gt 512) {
        Write-Host "  $name`: $value MB unused memory" -ForegroundColor Red
    }
}

# Recommendations
Write-Host "`nRECOMMENDATIONS:" -ForegroundColor Green
if ($totalCPUWaste -gt 2) {
    Write-Host "  [1] Reduce overall CPU allocation by ~$([math]::Round($totalCPUWaste, 1)) cores" -ForegroundColor White
}
if ($totalMemWaste -gt 2048) {
    Write-Host "  [2] Reduce overall memory allocation by ~$([math]::Round($totalMemWaste / 1024, 1)) GB" -ForegroundColor White
}

Write-Host "`nFor detailed metrics, visit: http://localhost:3001/d/cost-dashboard`n" -ForegroundColor Gray

'@

try {
    # Write cost rules
    $rulesFile = Join-Path $alertDir "cost-rules.yml"
    $costRules | Out-File -FilePath $rulesFile -Encoding UTF8
    Write-Step "Created cost recording rules" -Status "Success"
    
    # Write cost alerts
    $alertFile = Join-Path $alertDir "cost-alerts.yml"
    $costAlerts | Out-File -FilePath $alertFile -Encoding UTF8
    Write-Step "Created cost optimization alerts" -Status "Success"
    
    # Write analysis script
    $scriptDir = "scripts/monitoring"
    if (-not (Test-Path $scriptDir)) {
        New-Item -ItemType Directory -Path $scriptDir -Force | Out-Null
    }
    $scriptFile = Join-Path $scriptDir "cost-analysis.ps1"
    $analysisScript | Out-File -FilePath $scriptFile -Encoding UTF8
    Write-Step "Created cost analysis script" -Status "Success"
    
    # Update prometheus.yml
    $prometheusConfig = "monitoring/prometheus/prometheus.yml"
    if (Test-Path $prometheusConfig) {
        $content = Get-Content $prometheusConfig -Raw
        
        if ($content -notmatch "cost-rules.yml") {
            if ($content -match "(?ms)rule_files:(.*?)(?=\n\w|\z)") {
                $ruleSection = $matches[1]
                $newRules = @"
  - '/etc/prometheus/alerts/cost-rules.yml'
  - '/etc/prometheus/alerts/cost-alerts.yml'
"@
                $updatedRuleSection = $ruleSection + $newRules
                $content = $content -replace "(?ms)(rule_files:)(.*?)(?=\n\w|\z)", "`$1$updatedRuleSection"
                $content | Out-File -FilePath $prometheusConfig -Encoding UTF8
                Write-Step "Updated prometheus.yml with cost rules" -Status "Success"
            }
        }
    }
    
    Write-Step "Cost monitoring setup complete" -Status "Success"
    Write-Step "Run 'pwsh scripts/monitoring/cost-analysis.ps1' for detailed report" -Status "Info"
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    exit 1
}
