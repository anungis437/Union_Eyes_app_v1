#!/usr/bin/env pwsh
<#
Test Coverage Analysis Script
Generates a comprehensive report of untested modules and creates stub test files
#>

$ErrorActionPreference = "Continue"

$SourceDirs = @(
    "lib",
    "app/api",
    "lib/services",
    "lib/jobs",
    "lib/middleware",
    "lib/integrations"
)

$TestDir = "__tests__"
$ReportFile = "TEST_COVERAGE_REPORT.md"

# Extensions to check
$SourceExtensions = @(".ts", ".tsx")

# Directories to exclude from testing
$ExcludeDirs = @(
    "node_modules",
    ".next",
    "dist",
    "build",
    "__tests__",
    "coverage",
    ".git"
)

function Get-Files {
    param([string[]]$Dirs, [string[]]$Extensions, [string[]]$Exclude)
    
    $files = @()
    foreach ($dir in $Dirs) {
        if (Test-Path $dir) {
            Get-ChildItem -Path $dir -Recurse -File | Where-Object { 
                $ext = $_.Extension.ToLower()
                $excluded = $false
                foreach ($e in $Exclude) {
                    if ($_.FullName -match "[\\/]$e[\\/]") {
                        $excluded = $true
                        break
                    }
                }
                $Extensions -contains $ext -and -not $excluded
            } | ForEach-Object { $files += $_.FullName }
        }
    }
    return $files
}

function Get-TestFiles {
    $testFiles = @()
    if (Test-Path $TestDir) {
        Get-ChildItem -Path $TestDir -Recurse -File -Filter "*.test.ts" | ForEach-Object { 
            $testFiles += $_.FullName 
        }
    }
    return $testFiles
}

function Get-ModuleName {
    param([string]$FilePath)
    
    $relPath = $FilePath.Replace("\", "/")
    
    # Extract module name from path
    # e.g., lib/date-utils.ts -> date-utils
    # e.g., lib/services/billing-cycle-service.ts -> billing-cycle-service
    
    $moduleName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    
    # Handle .test.ts suffix for test files
    if ($moduleName -match "\.test$") {
        $moduleName = $moduleName -replace "\.test$", ""
    }
    
    return $moduleName
}

function Get-TestForModule {
    param([string]$ModuleName, [string[]]$TestFiles)
    
    foreach ($testFile in $TestFiles) {
        $testName = Get-ModuleName -FilePath $testFile
        if ($testName -eq $ModuleName -or $testFile -match $ModuleName) {
            return $testFile
        }
    }
    return $null
}

function Get-TestStubTemplate {
    param([string]$ModulePath, [string]$ModuleName)
    
    # Determine the appropriate test directory based on module path
    $testPath = ""
    
    if ($ModulePath -match "lib/services/") {
        $subPath = $ModulePath -replace "lib/services/", ""
        $serviceName = [System.IO.Path]::GetFileNameWithoutExtension($ModulePath)
        $testPath = "__tests__/lib/services/$serviceName.test.ts"
    }
    elseif ($ModulePath -match "lib/ai/") {
        $testPath = "__tests__/lib/ai/$ModuleName.test.ts"
    }
    elseif ($ModulePath -match "lib/jobs/") {
        $jobName = [System.IO.Path]::GetFileNameWithoutExtension($ModulePath)
        $testPath = "__tests__/lib/jobs/$jobName.test.ts"
    }
    elseif ($ModulePath -match "lib/middleware/") {
        $middlewareName = [System.IO.Path]::GetFileNameWithoutExtension($ModulePath)
        $testPath = "__tests__/lib/middleware/$middlewareName.test.ts"
    }
    elseif ($ModulePath -match "app/api/") {
        # Convert app/api/foo/route.ts -> __tests__/api/foo.test.ts
        $apiPath = $ModulePath -replace "app/api/", ""
        $apiParts = $apiPath -split "/"
        $testPath = "__tests__/api/$($apiParts[0]).test.ts"
    }
    else {
        $testPath = "__tests__/lib/$ModuleName.test.ts"
    }
    
    $template = @"
import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue([])
        })
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([])
        })
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([])
      })
    })
  }
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Import the module under test
// import { $ModuleName } from '@/lib/$ModuleName';

describe('$ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('placeholder', () => {
    it('should pass placeholder test', () => {
      expect(true).toBe(true);
    });
  });
});
"@
    return @{
        Template = $template
        TestPath = $testPath
    }
}

# Main execution
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UnionEyes Test Coverage Analysis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get all source files
Write-Host "[1/4] Scanning source files..." -ForegroundColor Yellow
$sourceFiles = Get-Files -Dirs $SourceDirs -Extensions $SourceExtensions -Exclude $ExcludeDirs
Write-Host "      Found $($sourceFiles.Count) source files" -ForegroundColor Green

# Get all test files
Write-Host "[2/4] Scanning existing test files..." -ForegroundColor Yellow
$testFiles = Get-TestFiles
Write-Host "      Found $($testFiles.Count) test files" -ForegroundColor Green

# Analyze coverage
Write-Host "[3/4] Analyzing coverage..." -ForegroundColor Yellow
$untested = @()
$tested = @()

foreach ($file in $sourceFiles) {
    $moduleName = Get-ModuleName -FilePath $file
    $existingTest = Get-TestForModule -ModuleName $moduleName -TestFiles $testFiles
    
    if ($existingTest) {
        $tested += @{
            Source = $file
            Test = $existingTest
        }
    } else {
        $untested += @{
            Source = $file
            ModuleName = $moduleName
        }
    }
}

Write-Host "      Tested: $($tested.Count) modules" -ForegroundColor Green
Write-Host "      Untested: $($untested.Count) modules" -ForegroundColor Red

# Create stub tests
Write-Host "[4/4] Creating stub test files..." -ForegroundColor Yellow

$created = 0
$skipped = 0
$errors = @()

foreach ($item in $untested) {
    $file = $item.Source
    $moduleName = $item.ModuleName
    
    $stubInfo = Get-TestStubTemplate -ModulePath $file -ModuleName $moduleName
    $testPath = $stubInfo.TestPath
    
    # Check if test already exists
    if (Test-Path $testPath) {
        $skipped++
        continue
    }
    
    # Create directory if needed
    $dir = [System.IO.Path]::GetDirectoryName($testPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    try {
        $stubInfo.Template | Out-File -FilePath $testPath -Encoding UTF8
        $created++
    } catch {
        $errors += "Failed to create $testPath : $_"
    }
}

Write-Host "      Created: $created stub files" -ForegroundColor Green
Write-Host "      Skipped: $skipped (already exist)" -ForegroundColor Yellow

if ($errors.Count -gt 0) {
    Write-Host "      Errors: $($errors.Count)" -ForegroundColor Red
}

# Generate report
$report = @"
# Test Coverage Report

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Summary

- **Total Source Files**: $($sourceFiles.Count)
- **Tested Modules**: $($tested.Count)
- **Untested Modules**: $($untested.Count)
- **Test Coverage**: $([math]::Round(($tested.Count / $sourceFiles.Count) * 100, 1))%

## Untested Modules

| # | Module | Path |
|---|--------|------|
"@

$counter = 1
foreach ($item in $untested) {
    $relPath = $item.Source.Replace((Get-Location).Path + "/", "")
    $report += "`n| $counter | $($item.ModuleName) | `$relPath |"
    $counter++
}

$report += @"

## Tested Modules

| # | Module | Test File |
|---|--------|-----------|
"@

$counter = 1
foreach ($item in $tested) {
    $relTestPath = $item.Test.Replace((Get-Location).Path + "/", "")
    $moduleName = [System.IO.Path]::GetFileNameWithoutExtension($item.Source)
    $report += "`n| $counter | $moduleName | `$relTestPath |"
    $counter++
}

$report | Out-File -FilePath $ReportFile -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Report saved to: $ReportFile" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
