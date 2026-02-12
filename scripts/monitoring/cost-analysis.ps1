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

