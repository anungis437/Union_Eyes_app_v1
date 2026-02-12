#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup SLA/SLO monitoring rules

.DESCRIPTION
    Creates Prometheus recording rules and alerts for SLA compliance
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

# SLA Recording Rules
$recordingRules = @'
groups:
  - name: sla_recording_rules
    interval: 30s
    rules:
      # SLI: Availability (success rate)
      - record: sla:availability:ratio
        expr: |
          (
            sum(rate(http_requests_total{status!~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          )
      
      # SLI: Request success rate per service
      - record: sla:success_rate:ratio
        expr: |
          (
            sum(rate(http_requests_total{status!~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total[5m])) by (service)
          )
      
      # SLI: P95 latency
      - record: sla:latency:p95
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          )
      
      # SLI: P99 latency
      - record: sla:latency:p99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          )
      
      # Error budget: 30-day window
      - record: sla:error_budget:30d
        expr: |
          1 - (
            sum(rate(http_requests_total{status=~"5.."}[30d]))
            /
            sum(rate(http_requests_total[30d]))
          )
      
      # Error budget burn rate (1h window)
      - record: sla:error_budget_burn_rate:1h
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) / 0.001

'@

# SLA Alert Rules
$slaAlerts = @'
groups:
  - name: sla_alerts
    interval: 30s
    rules:
      # Alert: Availability below target (99.9%)
      - alert: SLAAvailabilityBreach
        expr: sla:availability:ratio < 0.999
        for: 5m
        labels:
          severity: critical
          sla: availability
        annotations:
          summary: "SLA Availability breach detected"
          description: "Current availability is {{ $value | humanizePercentage }}, below 99.9% target"
      
      # Alert: P95 latency exceeds target (1s)
      - alert: SLAP95LatencyBreach
        expr: sla:latency:p95 > 1
        for: 5m
        labels:
          severity: warning
          sla: latency
        annotations:
          summary: "P95 latency exceeds target"
          description: "P95 latency is {{ $value }}s for {{ $labels.service }}, exceeds 1s target"
      
      # Alert: P99 latency exceeds target (3s)
      - alert: SLAP99LatencyBreach
        expr: sla:latency:p99 > 3
        for: 5m
        labels:
          severity: warning
          sla: latency
        annotations:
          summary: "P99 latency exceeds target"
          description: "P99 latency is {{ $value }}s for {{ $labels.service }}, exceeds 3s target"
      
      # Alert: Error rate exceeds target (0.1%)
      - alert: SLAErrorRateBreach
        expr: (1 - sla:success_rate:ratio) > 0.001
        for: 5m
        labels:
          severity: critical
          sla: error_rate
        annotations:
          summary: "Error rate exceeds target"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.service }}, exceeds 0.1% target"
      
      # Alert: Fast error budget burn (2% consumed in 1h)
      - alert: SLAErrorBudgetFastBurn
        expr: sla:error_budget_burn_rate:1h > 10
        for: 2m
        labels:
          severity: critical
          sla: error_budget
        annotations:
          summary: "Error budget burning too fast"
          description: "Error budget is burning at {{ $value }}x normal rate, will exhaust in {{ 720 | div $value }}h"
      
      # Alert: Error budget exhaustion warning
      - alert: SLAErrorBudgetLow
        expr: sla:error_budget:30d < 0.2
        for: 5m
        labels:
          severity: warning
          sla: error_budget
        annotations:
          summary: "Error budget below 20%"
          description: "Only {{ $value | humanizePercentage }} of error budget remains for this month"

'@

try {
    # Write recording rules
    $recordingFile = Join-Path $alertDir "sla-recording-rules.yml"
    $recordingRules | Out-File -FilePath $recordingFile -Encoding UTF8
    Write-Step "Created SLA recording rules" -Status "Success"
    
    # Write alert rules
    $alertFile = Join-Path $alertDir "sla-alerts.yml"
    $slaAlerts | Out-File -FilePath $alertFile -Encoding UTF8
    Write-Step "Created SLA alert rules" -Status "Success"
    
    # Update prometheus.yml to include new rules
    $prometheusConfig = "monitoring/prometheus/prometheus.yml"
    if (Test-Path $prometheusConfig) {
        $content = Get-Content $prometheusConfig -Raw
        
        # Check if rules already configured
        if ($content -notmatch "sla-recording-rules.yml") {
            # Find rule_files section
            if ($content -match "(?ms)rule_files:(.*?)(?=\n\w|\z)") {
                $ruleSection = $matches[1]
                
                # Add new rules if not present
                $newRules = @"
  - '/etc/prometheus/alerts/sla-recording-rules.yml'
  - '/etc/prometheus/alerts/sla-alerts.yml'
"@
                
                $updatedRuleSection = $ruleSection + $newRules
                $content = $content -replace "(?ms)(rule_files:)(.*?)(?=\n\w|\z)", "`$1$updatedRuleSection"
                
                $content | Out-File -FilePath $prometheusConfig -Encoding UTF8
                Write-Step "Updated prometheus.yml with SLA rules" -Status "Success"
            }
        } else {
            Write-Step "SLA rules already configured in prometheus.yml" -Status "Warning"
        }
    }
    
    Write-Step "SLA monitoring setup complete" -Status "Success"
    Write-Step "Defined SLA targets:" -Status "Info"
    Write-Step "  - Availability: 99.9% (43.2 min downtime/month)" -Status "Info"
    Write-Step "  - P95 Latency: < 1 second" -Status "Info"
    Write-Step "  - P99 Latency: < 3 seconds" -Status "Info"
    Write-Step "  - Error Rate: < 0.1%" -Status "Info"
    
} catch {
    Write-Step "Error: $_" -Status "Error"
    exit 1
}
