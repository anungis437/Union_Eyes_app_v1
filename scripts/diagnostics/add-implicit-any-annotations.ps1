<#
.SYNOPSIS
    Adds explicit ': any' type annotations to fix TS7006 errors

.DESCRIPTION
    Analyzes TypeScript compilation errors for TS7006 (Parameter implicitly has 'any' type)
    and adds explicit ': any' type annotations to make technical debt visible.
    
    This is a strategic fix that:
    1. Eliminates TS7006 compilation errors
    2. Makes implicit 'any' types explicit (visible technical debt)
    3. Allows gradual refinement to proper types over time
    4. Enables tracking of type safety improvements
    
    Strategy:
    1. Parse TS7006 errors from tsc output
    2. Locate parameter declarations in source files
    3. Add ': any' annotation after parameter name
    4. Generate report of all ': any' additions for future refinement
    5. Validate fix with tsc after each file
    6. Auto-rollback if errors increase

.PARAMETER DryRun
    Show what would be fixed without making changes

.PARAMETER MaxErrorIncrease
    Maximum allowable error increase per file (default: 5)

.PARAMETER GenerateReport
    Generate a report of all ': any' annotations added (for tracking technical debt)

.PARAMETER TargetFile
    Fix only this specific file (for testing)

.EXAMPLE
    .\add-implicit-any-annotations.ps1 -DryRun
    
.EXAMPLE
    .\add-implicit-any-annotations.ps1 -GenerateReport
    
.EXAMPLE
    .\add-implicit-any-annotations.ps1 -TargetFile "actions/analytics-actions.ts"
#>

param(
    [switch]$DryRun,
    [int]$MaxErrorIncrease = 5,
    [switch]$GenerateReport,
    [string]$TargetFile = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Implicit 'any' Type Annotation Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script adds explicit ': any' annotations to parameters" -ForegroundColor Yellow
Write-Host "that currently have implicit 'any' types." -ForegroundColor Yellow
Write-Host ""
Write-Host "Purpose: Make technical debt visible and trackable" -ForegroundColor Yellow
Write-Host ""

# Get initial error count
Write-Host "[1/7] Getting initial error count..." -ForegroundColor Yellow
$initialErrorCount = & pnpm exec tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "Initial errors: $initialErrorCount" -ForegroundColor White
Write-Host ""

# Parse TS7006 errors
Write-Host "[2/7] Parsing TS7006 errors..." -ForegroundColor Yellow
$ts7006Errors = & pnpm exec tsc --noEmit 2>&1 | Select-String "error TS7006"

if ($ts7006Errors.Count -eq 0) {
    Write-Host "No TS7006 errors found. Exiting." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($ts7006Errors.Count) TS7006 implicit 'any' type errors" -ForegroundColor White
Write-Host ""

# Parse error details
Write-Host "[3/7] Grouping errors by file..." -ForegroundColor Yellow
$errorsByFile = @{}
$technicalDebtReport = @()

foreach ($error in $ts7006Errors) {
    if ($error -match '(.*?)\((\d+),(\d+)\): error TS7006: Parameter ''(.+?)'' implicitly has an ''any'' type') {
        $file = $matches[1]
        $line = [int]$matches[2]
        $col = [int]$matches[3]
        $paramName = $matches[4]
        
        if (-not $errorsByFile.ContainsKey($file)) {
            $errorsByFile[$file] = @()
        }
        
        $errorsByFile[$file] += @{
            Line = $line
            Column = $col
            Parameter = $paramName
        }
        
        $technicalDebtReport += @{
            File = $file
            Line = $line
            Parameter = $paramName
        }
    }
}

$fileCount = $errorsByFile.Count
Write-Host "Files with TS7006 errors: $fileCount" -ForegroundColor White
Write-Host ""

Write-Host "Top 15 files by TS7006 error count:" -ForegroundColor Cyan
$errorsByFile.GetEnumerator() | 
    Sort-Object { $_.Value.Count } -Descending | 
    Select-Object -First 15 | 
    ForEach-Object {
        $relativePath = $_.Name -replace [regex]::Escape($projectRoot), "" -replace "^[\\/]", ""
        Write-Host "  $relativePath`: $($_.Value.Count) errors" -ForegroundColor Gray
    }
Write-Host ""

# Filter to target file if specified
if ($TargetFile) {
    $errorsByFile = $errorsByFile.GetEnumerator() | Where-Object { $_.Name -like "*$TargetFile*" }
    if ($errorsByFile.Count -eq 0) {
        Write-Host "Target file '$TargetFile' not found in errors. Exiting." -ForegroundColor Red
        exit 1
    }
    Write-Host "Targeting specific file: $($errorsByFile[0].Name)" -ForegroundColor Yellow
    Write-Host ""
}

if ($DryRun) {
    Write-Host "[DRY RUN MODE - No changes will be made]" -ForegroundColor Magenta
    Write-Host ""
}

# Process each file
Write-Host "[4/7] Adding ': any' annotations to files..." -ForegroundColor Yellow
$filesProcessed = 0
$filesFixed = 0
$filesSkipped = 0
$annotationsAdded = 0

foreach ($fileEntry in $errorsByFile.GetEnumerator()) {
    $file = $fileEntry.Name
    $errors = $fileEntry.Value
    $filesProcessed++
    
    $relativePath = $file -replace [regex]::Escape($projectRoot), "" -replace "^[\\/]", ""
    Write-Host ""
    Write-Host "[$filesProcessed/$fileCount] Processing: $relativePath" -ForegroundColor Cyan
    Write-Host "  Parameters needing annotation: $($errors.Count)" -ForegroundColor Gray
    
    # Read file content
    $fullPath = Join-Path $projectRoot $file
    if (-not (Test-Path $fullPath)) {
        Write-Host "  [SKIP] File not found: $fullPath" -ForegroundColor Yellow
        $filesSkipped++
        continue
    }
    
    try {
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        $originalContent = $content
        $lines = $content -split "`r?`n"
        
        # Sort errors by line number (descending) to avoid offset issues
        $sortedErrors = $errors | Sort-Object Line -Descending
        
        # Track modifications
        $modificationsCount = 0
        
        foreach ($errorInfo in $sortedErrors) {
            $lineIndex = $errorInfo.Line - 1
            $paramName = $errorInfo.Parameter
            
            if ($lineIndex -lt 0 -or $lineIndex -ge $lines.Count) {
                Write-Host "  [SKIP] Invalid line number: $($errorInfo.Line)" -ForegroundColor Yellow
                continue
            }
            
            $line = $lines[$lineIndex]
            
            # Pattern matching for parameter with implicit any
            # Look for: paramName followed by ) , = or :
            # Avoid: paramName: (already has type annotation)
            
            # Check if already has type annotation
            if ($line -match "$paramName\s*:") {
                Write-Host "  [SKIP] Line $($errorInfo.Line): '$paramName' already has type annotation" -ForegroundColor Yellow
                continue
            }
            
            # Add ': any' annotation
            # Patterns to match:
            # 1. paramName) -> paramName: any)
            # 2. paramName, -> paramName: any,
            # 3. paramName = -> paramName: any =
            # 4. paramName {  -> paramName: any {
            # 5. paramName => -> paramName: any =>
            
            $modified = $false
            $newLine = $line
            
            # Try each pattern
            $patterns = @(
                @{ Pattern = "($paramName)(\s*)(\))"; Replacement = "`$1: any`$2`$3" }
                @{ Pattern = "($paramName)(\s*)(,)"; Replacement = "`$1: any`$2`$3" }
                @{ Pattern = "($paramName)(\s*)(=)"; Replacement = "`$1: any`$2`$3" }
                @{ Pattern = "($paramName)(\s*)(\{)"; Replacement = "`$1: any`$2`$3" }
                @{ Pattern = "($paramName)(\s*)(=>)"; Replacement = "`$1: any`$2`$3" }
            )
            
            foreach ($patternInfo in $patterns) {
                if ($newLine -match $patternInfo.Pattern) {
                    $newLine = $newLine -replace $patternInfo.Pattern, $patternInfo.Replacement
                    $modified = $true
                    break
                }
            }
            
            if ($modified) {
                $lines[$lineIndex] = $newLine
                $modificationsCount++
                Write-Host "  [MODIFY] Line $($errorInfo.Line): '$paramName' -> '${paramName}: any'" -ForegroundColor Green
            } else {
                Write-Host "  [SKIP] Line $($errorInfo.Line): Could not find pattern for '$paramName'" -ForegroundColor Yellow
                Write-Host "         Line content: $(($line.Trim().Substring(0, [Math]::Min(80, $line.Trim().Length))))" -ForegroundColor DarkGray
            }
        }
        
        if ($modificationsCount -eq 0) {
            Write-Host "  [SKIP] No modifications made" -ForegroundColor Yellow
            $filesSkipped++
            continue
        }
        
        $content = $lines -join "`n"
        
        # If in dry run mode, show preview
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would save $modificationsCount changes to file" -ForegroundColor Magenta
            $annotationsAdded += $modificationsCount
            continue
        }
        
        # Save modified content
        $content | Set-Content $fullPath -Encoding UTF8 -NoNewline
        Write-Host "  [SAVED] File updated with $modificationsCount annotations" -ForegroundColor Green
        $annotationsAdded += $modificationsCount
        
        # Validate fix
        Write-Host "  [VALIDATING] Running tsc..." -ForegroundColor Yellow
        $newErrorCount = & pnpm exec tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count
        $errorChange = $newErrorCount - $initialErrorCount
        
        Write-Host "  Error change: $errorChange (was: $initialErrorCount, now: $newErrorCount)" -ForegroundColor $(if ($errorChange -le 0) { "Green" } else { "Red" })
        
        if ($errorChange -gt $MaxErrorIncrease) {
            Write-Host "  [ROLLBACK] Error increase ($errorChange) exceeds threshold ($MaxErrorIncrease)" -ForegroundColor Red
            $originalContent | Set-Content $fullPath -Encoding UTF8 -NoNewline
            Write-Host "  [REVERTED] File restored to original state" -ForegroundColor Yellow
            $filesSkipped++
            $annotationsAdded -= $modificationsCount
        } else {
            $initialErrorCount = $newErrorCount
            $filesFixed++
            Write-Host "  [SUCCESS] Fix accepted" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        $filesSkipped++
    }
}

Write-Host ""
Write-Host "[5/7] Summary" -ForegroundColor Yellow
Write-Host "Files processed: $filesProcessed" -ForegroundColor White
Write-Host "Files fixed: $filesFixed" -ForegroundColor Green
Write-Host "Files skipped: $filesSkipped" -ForegroundColor Yellow
Write-Host "': any' annotations added: $annotationsAdded" -ForegroundColor Green
Write-Host ""

# Final error count
Write-Host "[6/7] Final validation..." -ForegroundColor Yellow
$finalErrorCount = & pnpm exec tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count
$totalErrorsFixed = $initialErrorCount - $finalErrorCount

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  FINAL RESULTS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Initial errors: $initialErrorCount" -ForegroundColor White
Write-Host "Final errors: $finalErrorCount" -ForegroundColor White
Write-Host "Net change: $totalErrorsFixed" -ForegroundColor $(if ($totalErrorsFixed -gt 0) { "Green" } elseif ($totalErrorsFixed -lt 0) { "Red" } else { "Yellow" })
Write-Host ""

# Generate technical debt report
if ($GenerateReport -and $annotationsAdded -gt 0 -and -not $DryRun) {
    Write-Host "[7/7] Generating technical debt report..." -ForegroundColor Yellow
    
    $reportPath = Join-Path $projectRoot "TECHNICAL_DEBT_ANY_ANNOTATIONS.md"
    $reportContent = @"
# Technical Debt: Explicit 'any' Type Annotations

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Annotations Added:** $annotationsAdded  
**Purpose:** Track implicit 'any' types that were made explicit

---

## Summary

This document tracks all locations where ': any' type annotations were added to parameters
that previously had implicit 'any' types. These represent technical debt that should be
gradually refined to proper TypeScript types.

### Quick Stats
- Total annotations: $annotationsAdded
- Files affected: $filesFixed
- Remaining TS7006 errors: $($finalErrorCount - $totalErrorsFixed)

---

## Annotations by File

"@

    $fileGroups = $technicalDebtReport | Group-Object File | Sort-Object Count -Descending
    
    foreach ($fileGroup in $fileGroups) {
        $relativePath = $fileGroup.Name -replace [regex]::Escape($projectRoot), "" -replace "^[\\/]", ""
        $reportContent += "`n### [$relativePath]($relativePath)`n`n"
        $reportContent += "**Parameters annotated:** $($fileGroup.Count)`n`n"
        
        $fileGroup.Group | Sort-Object Line | ForEach-Object {
            $reportContent += "- Line $($_.Line): ``$($_.Parameter)```n"
        }
    }
    
    $reportContent += @"

---

## Next Steps

1. **Prioritize refinement** by frequency of use and criticality
2. **Group similar parameters** and create shared types
3. **Use TypeScript utilities** (Record, Pick, Omit) for complex types
4. **Add JSDoc comments** for parameters that need context
5. **Track progress** by searching for ': any' in codebase

## Guidelines for Refinement

### Priority Levels
- **High:** Public API parameters, exported functions
- **Medium:** Internal service methods, utility functions
- **Low:** Private helpers, one-off utilities

### Replacement Strategies
"``typescript
// Before: Implicit any (error)
function process(data) { ... }

// Step 1: Explicit any (this script)
function process(data: any) { ... }

// Step 2: Union type (initial refinement)
function process(data: string | number | object) { ... }

// Step 3: Proper type (final goal)
interface ProcessData {
  id: string;
  value: number;
}
function process(data: ProcessData) { ... }
"``

---

*This file is auto-generated. Do not edit manually.*  
*Regenerate with: ``.\add-implicit-any-annotations.ps1 -GenerateReport``*
"@

    $reportContent | Set-Content $reportPath -Encoding UTF8
    Write-Host "Report generated: $reportPath" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[7/7] Skipping report generation" -ForegroundColor Gray
    Write-Host ""
}

if ($DryRun) {
    Write-Host "[DRY RUN COMPLETE - No actual changes were made]" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review the changes made" -ForegroundColor White
Write-Host "  2. Run tests to ensure no regressions" -ForegroundColor White
Write-Host "  3. Gradually refine ': any' to proper types" -ForegroundColor White
if ($GenerateReport) {
    Write-Host "  4. Use TECHNICAL_DEBT_ANY_ANNOTATIONS.md to track progress" -ForegroundColor White
}
Write-Host ""
