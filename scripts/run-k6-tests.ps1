#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run k6 performance tests for UnionEyes platform

.DESCRIPTION
    Executes various k6 performance test suites with different load profiles

.PARAMETER TestType
    Type of test to run: load, stress, spike, soak, or all

.PARAMETER BaseUrl
    Base URL of the API to test (default: http://localhost:3000)

.PARAMETER AuthToken
    JWT authentication token for API requests

.PARAMETER Output
    Output format: json, csv, or cloud (default: console)

.PARAMETER Duration
    Override test duration (e.g., 5m, 10m, 1h)

.PARAMETER VirtualUsers
    Override number of virtual users (VUs)

.EXAMPLE
    .\run-k6-tests.ps1 -TestType load
    
.EXAMPLE
    .\run-k6-tests.ps1 -TestType stress -BaseUrl https://api.unioneyes.com -AuthToken "your-token"
    
.EXAMPLE
    .\run-k6-tests.ps1 -TestType all -Output json
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('load', 'stress', 'spike', 'soak', 'all')]
    [string]$TestType = 'load',
    
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = 'http://localhost:3000',
    
    [Parameter(Mandatory=$false)]
    [string]$AuthToken = '',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('console', 'json', 'csv', 'cloud')]
    [string]$Output = 'console',
    
    [Parameter(Mandatory=$false)]
    [string]$Duration = '',
    
    [Parameter(Mandatory=$false)]
    [int]$VirtualUsers = 0
)

# Color output functions
function Write-Header {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Check if k6 is installed
function Test-K6Installed {
    try {
        $null = Get-Command k6 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Run k6 test
function Invoke-K6Test {
    param(
        [string]$TestFile,
        [string]$TestName
    )
    
    Write-Header "Running $TestName"
    Write-Info "Test file: $TestFile"
    Write-Info "Base URL: $BaseUrl"
    
    $testPath = Join-Path $PSScriptRoot "__tests__/performance/$TestFile"
    
    if (-not (Test-Path $testPath)) {
        Write-Error "Test file not found: $testPath"
        return $false
    }
    
    # Build k6 command
    $k6Args = @('run')
    
    # Add output format
    if ($Output -ne 'console') {
        $outputFile = "k6-results-$TestName-$(Get-Date -Format 'yyyyMMdd-HHmmss').$Output"
        $k6Args += @('--out', "$Output=$outputFile")
        Write-Info "Output file: $outputFile"
    }
    
    # Add custom duration if specified
    if ($Duration) {
        $k6Args += @('--duration', $Duration)
        Write-Info "Custom duration: $Duration"
    }
    
    # Add custom VUs if specified
    if ($VirtualUsers -gt 0) {
        $k6Args += @('--vus', $VirtualUsers)
        Write-Info "Custom VUs: $VirtualUsers"
    }
    
    # Add environment variables
    $k6Args += @('--env', "BASE_URL=$BaseUrl")
    
    if ($AuthToken) {
        $k6Args += @('--env', "AUTH_TOKEN=$AuthToken")
    }
    
    # Add test file
    $k6Args += $testPath
    
    Write-Info "Command: k6 $($k6Args -join ' ')`n"
    
    # Run k6
    try {
        & k6 @k6Args
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$TestName completed successfully"
            return $true
        } else {
            Write-Error "$TestName failed with exit code $LASTEXITCODE"
            return $false
        }
    } catch {
        Write-Error "Failed to run $TestName : $_"
        return $false
    }
}

# Main execution
Write-Header "UnionEyes k6 Performance Test Suite"

# Check if k6 is installed
if (-not (Test-K6Installed)) {
    Write-Error "k6 is not installed"
    Write-Info "Install k6:"
    Write-Host "  Windows: choco install k6" -ForegroundColor White
    Write-Host "  macOS:   brew install k6" -ForegroundColor White
    Write-Host "  Linux:   See https://k6.io/docs/get-started/installation/" -ForegroundColor White
    exit 1
}

Write-Success "k6 is installed"

# Run tests based on type
$results = @{}

switch ($TestType) {
    'load' {
        $results['load'] = Invoke-K6Test -TestFile 'k6-load-tests.js' -TestName 'Load Test'
    }
    'stress' {
        $results['stress'] = Invoke-K6Test -TestFile 'k6-stress-tests.js' -TestName 'Stress Test'
    }
    'spike' {
        $results['spike'] = Invoke-K6Test -TestFile 'k6-spike-tests.js' -TestName 'Spike Test'
    }
    'soak' {
        $results['soak'] = Invoke-K6Test -TestFile 'k6-soak-tests.js' -TestName 'Soak Test'
    }
    'all' {
        Write-Info "Running all test suites...`n"
        $results['load'] = Invoke-K6Test -TestFile 'k6-load-tests.js' -TestName 'Load Test'
        $results['stress'] = Invoke-K6Test -TestFile 'k6-stress-tests.js' -TestName 'Stress Test'
        $results['spike'] = Invoke-K6Test -TestFile 'k6-spike-tests.js' -TestName 'Spike Test'
        
        Write-Info "`nSkipping Soak Test (1+ hour duration) - run separately with: -TestType soak"
    }
}

# Summary
Write-Header "Test Summary"

$passCount = 0
$failCount = 0

foreach ($test in $results.Keys) {
    if ($results[$test]) {
        Write-Success "$test test: PASSED"
        $passCount++
    } else {
        Write-Error "$test test: FAILED"
        $failCount++
    }
}

Write-Host "`nTotal: $($results.Count) tests" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

# Exit with appropriate code
if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}
