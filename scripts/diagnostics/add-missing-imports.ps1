<#
.SYNOPSIS
    Adds missing imports to fix TS2304 errors

.DESCRIPTION
    Analyzes TypeScript compilation errors for TS2304 (Cannot find name)
    and automatically adds the appropriate import statements.
    
    Strategy:
    1. Parse all TS2304 errors from tsc output
    2. Identify common missing names (logger, utilities, etc.)
    3. Match names to known export locations
    4. Add import statements to file headers
    5. Validate fix with tsc after each file
    6. Auto-rollback if errors increase

.PARAMETER DryRun
    Show what would be fixed without making changes

.PARAMETER MaxErrorIncrease
    Maximum allowable error increase per file (default: 5)

.PARAMETER TargetName
    Fix only this specific missing name (for testing)

.EXAMPLE
    .\add-missing-imports.ps1 -DryRun
    
.EXAMPLE
    .\add-missing-imports.ps1 -TargetName "logger"
    
.EXAMPLE
    .\add-missing-imports.ps1
#>

param(
    [switch]$DryRun,
    [int]$MaxErrorIncrease = 5,
    [string]$TargetName = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Missing Import Addition Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Define known exports and their import paths
$knownImports = @{
    "logger" = "import { logger } from '@/lib/logger';"
    "db" = "import { db } from '@/db/db';"
    "eq" = "import { eq } from 'drizzle-orm';"
    "and" = "import { and } from 'drizzle-orm';"
    "or" = "import { or } from 'drizzle-orm';"
    "desc" = "import { desc } from 'drizzle-orm';"
    "asc" = "import { asc } from 'drizzle-orm';"
    "like" = "import { like } from 'drizzle-orm';"
    "sql" = "import { sql } from 'drizzle-orm';"
    "gte" = "import { gte } from 'drizzle-orm';"
    "lte" = "import { lte } from 'drizzle-orm';"
    "isNull" = "import { isNull } from 'drizzle-orm';"
    "isNotNull" = "import { isNotNull } from 'drizzle-orm';"
    "z" = "import { z } from 'zod';"
    "toast" = "import { toast } from '@/lib/hooks/use-toast';"
    "useToast" = "import { useToast } from '@/lib/hooks/use-toast';"
}

Write-Host "Known import mappings: $($knownImports.Count)" -ForegroundColor Gray
Write-Host ""

# Get initial error count
Write-Host "[1/6] Getting initial error count..." -ForegroundColor Yellow
$initialErrorCount = & pnpm exec tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count
Write-Host "Initial errors: $initialErrorCount" -ForegroundColor White
Write-Host ""

# Parse TS2304 errors
Write-Host "[2/6] Parsing TS2304 errors..." -ForegroundColor Yellow
$ts2304Errors = & pnpm exec tsc --noEmit 2>&1 | Select-String "error TS2304"

if ($ts2304Errors.Count -eq 0) {
    Write-Host "No TS2304 errors found. Exiting." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($ts2304Errors.Count) TS2304 'Cannot find name' errors" -ForegroundColor White
Write-Host ""

# Group errors by missing name
Write-Host "[3/6] Grouping errors by missing name..." -ForegroundColor Yellow
$errorsByName = @{}
$errorsByFile = @{}

foreach ($error in $ts2304Errors) {
    if ($error -match '(.*?)\((\d+),(\d+)\): error TS2304: Cannot find name ''(.+?)''') {
        $file = $matches[1]
        $line = [int]$matches[2]
        $missingName = $matches[4]
        
        # Track by name
        if (-not $errorsByName.ContainsKey($missingName)) {
            $errorsByName[$missingName] = @{
                Count = 0
                Files = @()
            }
        }
        $errorsByName[$missingName].Count++
        if ($errorsByName[$missingName].Files -notcontains $file) {
            $errorsByName[$missingName].Files += $file
        }
        
        # Track by file
        if (-not $errorsByFile.ContainsKey($file)) {
            $errorsByFile[$file] = @{}
        }
        if (-not $errorsByFile[$file].ContainsKey($missingName)) {
            $errorsByFile[$file][$missingName] = 0
        }
        $errorsByFile[$file][$missingName]++
    }
}

Write-Host "Unique missing names: $($errorsByName.Count)" -ForegroundColor White
Write-Host ""
Write-Host "Top 20 missing names:" -ForegroundColor Cyan
$errorsByName.GetEnumerator() | 
    Sort-Object { $_.Value.Count } -Descending | 
    Select-Object -First 20 | 
    ForEach-Object {
        $known = if ($knownImports.ContainsKey($_.Name)) { " [KNOWN]" } else { "" }
        Write-Host "  $($_.Name): $($_.Value.Count) occurrences in $($_.Value.Files.Count) files$known" -ForegroundColor $(if ($known) { "Green" } else { "Gray" })
    }
Write-Host ""

# Filter to fixable names (known imports)
$fixableErrors = @{}
foreach ($file in $errorsByFile.Keys) {
    $missingNames = $errorsByFile[$file]
    $fixableNames = $missingNames.Keys | Where-Object { $knownImports.ContainsKey($_) }
    
    if ($fixableNames.Count -gt 0) {
        $fixableErrors[$file] = @{}
        foreach ($name in $fixableNames) {
            $fixableErrors[$file][$name] = $missingNames[$name]
        }
    }
}

$fixableFileCount = $fixableErrors.Count
Write-Host "Files with fixable TS2304 errors: $fixableFileCount" -ForegroundColor White
Write-Host ""

if ($fixableFileCount -eq 0) {
    Write-Host "No fixable errors found. Exiting." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Missing names not in known imports:" -ForegroundColor Yellow
    $errorsByName.Keys | Where-Object { -not $knownImports.ContainsKey($_) } | Sort-Object | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Gray
    }
    exit 0
}

# Filter to target name if specified
if ($TargetName) {
    $fixableErrors = $fixableErrors.GetEnumerator() | Where-Object {
        $_.Value.ContainsKey($TargetName)
    } | ForEach-Object {
        @{ $_.Key = @{ $TargetName = $_.Value[$TargetName] } }
    }
    
    if ($fixableErrors.Count -eq 0) {
        Write-Host "Target name '$TargetName' not found in fixable errors. Exiting." -ForegroundColor Red
        exit 1
    }
    Write-Host "Targeting specific name: $TargetName" -ForegroundColor Yellow
    Write-Host ""
}

if ($DryRun) {
    Write-Host "[DRY RUN MODE - No changes will be made]" -ForegroundColor Magenta
    Write-Host ""
}

# Process each file
Write-Host "[4/6] Adding imports to files..." -ForegroundColor Yellow
$filesProcessed = 0
$filesFixed = 0
$filesSkipped = 0
$importsAdded = 0

foreach ($fileEntry in $fixableErrors.GetEnumerator()) {
    $file = $fileEntry.Key
    $missingNames = $fileEntry.Value.Keys
    $filesProcessed++
    
    $relativePath = $file -replace [regex]::Escape($projectRoot), "" -replace "^[\\/]", ""
    Write-Host ""
    Write-Host "[$filesProcessed/$fixableFileCount] Processing: $relativePath" -ForegroundColor Cyan
    Write-Host "  Missing names to fix: $($missingNames -join ', ')" -ForegroundColor Gray
    
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
        
        # Find the last import line
        $lastImportIndex = -1
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^\s*import\s+') {
                $lastImportIndex = $i
            }
            # Stop searching after first non-import, non-comment line
            if ($lines[$i] -match '^\s*[^/\s]' -and $lines[$i] -notmatch '^\s*import\s+') {
                break
            }
        }
        
        if ($lastImportIndex -eq -1) {
            # No imports found, add at the beginning (after any initial comments)
            $insertIndex = 0
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match '^\s*/[/*]' -or $lines[$i] -match '^\s*$') {
                    $insertIndex = $i + 1
                } else {
                    break
                }
            }
            $lastImportIndex = $insertIndex - 1
        }
        
        Write-Host "  Insert position: Line $($lastImportIndex + 2)" -ForegroundColor Gray
        
        # Build list of imports to add
        $importsToAdd = @()
        $existingImports = $lines | Where-Object { $_ -match '^\s*import\s+' }
        
        foreach ($name in $missingNames) {
            $importStatement = $knownImports[$name]
            
            # Check if import already exists
            $alreadyExists = $false
            foreach ($existing in $existingImports) {
                if ($existing -like "*from '$($importStatement -replace '.*from ''(.*)''.*', '$1')'*") {
                    Write-Host "  [SKIP] Import for '$name' already exists" -ForegroundColor Yellow
                    $alreadyExists = $true
                    break
                }
            }
            
            if (-not $alreadyExists) {
                $importsToAdd += $importStatement
                Write-Host "  [ADD] $importStatement" -ForegroundColor Green
            }
        }
        
        if ($importsToAdd.Count -eq 0) {
            Write-Host "  [SKIP] No new imports to add" -ForegroundColor Yellow
            $filesSkipped++
            continue
        }
        
        # Insert imports
        $newLines = @()
        for ($i = 0; $i -le $lastImportIndex; $i++) {
            $newLines += $lines[$i]
        }
        foreach ($import in $importsToAdd) {
            $newLines += $import
            $importsAdded++
        }
        for ($i = $lastImportIndex + 1; $i -lt $lines.Count; $i++) {
            $newLines += $lines[$i]
        }
        
        $content = $newLines -join "`n"
        
        # If in dry run mode, show preview
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would save changes to file" -ForegroundColor Magenta
            continue
        }
        
        # Save modified content
        $content | Set-Content $fullPath -Encoding UTF8 -NoNewline
        Write-Host "  [SAVED] File updated" -ForegroundColor Green
        
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
            $importsAdded -= $importsToAdd.Count
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
Write-Host "[5/6] Summary" -ForegroundColor Yellow
Write-Host "Files processed: $filesProcessed" -ForegroundColor White
Write-Host "Files fixed: $filesFixed" -ForegroundColor Green
Write-Host "Files skipped: $filesSkipped" -ForegroundColor Yellow
Write-Host "Imports added: $importsAdded" -ForegroundColor Green
Write-Host ""

# Final error count
Write-Host "[6/6] Final validation..." -ForegroundColor Yellow
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

if ($DryRun) {
    Write-Host "[DRY RUN COMPLETE - No actual changes were made]" -ForegroundColor Magenta
}
