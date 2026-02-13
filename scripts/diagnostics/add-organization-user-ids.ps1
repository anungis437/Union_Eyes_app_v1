# PowerShell Script: Add organizationId and userId to Type Definitions
# Created: 2025 - Phase 2 TypeScript Automation
# Purpose: Automatically add organizationId and userId properties to types/interfaces
#          where TS2339 errors indicate they're missing
# Impact: Targets 502 out of 1,189 TS2339 errors (42%)

param(
    [switch]$DryRun = $false,
    [int]$MaxErrorIncrease = 5
)

$ErrorActionPreference = "Stop"
$totalFilesModified = 0
$totalPropertiesAdded = 0

Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Phase 2: Add organizationId/userId to Type Definitions" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
    Write-Host ""
}

# Get baseline error count
Write-Host "Getting baseline error count..." -ForegroundColor Gray
$baselineErrors = (pnpm tsc --noEmit 2>&1 | Select-String "error TS").Count
Write-Host "Baseline: $baselineErrors errors`n" -ForegroundColor White

# Find all TS2339 errors for organizationId and userId
Write-Host "Analyzing TS2339 errors for organizationId and userId..." -ForegroundColor Cyan
$ts2339OrgId = pnpm tsc --noEmit 2>&1 | Select-String "error TS2339.*Property 'organizationId' does not exist"
$ts2339UserId = pnpm tsc --noEmit 2>&1 | Select-String "error TS2339.*Property 'userId' does not exist"

Write-Host "Found $($ts2339OrgId.Count) organizationId errors" -ForegroundColor White
Write-Host "Found $($ts2339UserId.Count) userId errors`n" -ForegroundColor White

# Extract unique files with these errors
$filesWithOrgId = $ts2339OrgId | ForEach-Object {
    if ($_ -match '([^(]+)\(\d+,\d+\)') { $matches[1] }
} | Select-Object -Unique

$filesWithUserId = $ts2339UserId | ForEach-Object {
    if ($_ -match '([^(]+)\(\d+,\d+\)') { $matches[1] }
} | Select-Object -Unique

$allFiles = ($filesWithOrgId + $filesWithUserId) | Select-Object -Unique
Write-Host "Files affected: $($allFiles.Count)" -ForegroundColor White

# Strategy: For each file, check if there's a context type/interface that needs these properties
# Common patterns:
# 1. Context objects: { userId, organizationId, ... }
# 2. API response types: interface XResponse { ... }
# 3. Request types: interface XRequest { ... }

$processedFiles = 0
foreach ($file in $allFiles) {
    $processedFiles++
    Write-Host "`n[$processedFiles/$($allFiles.Count)] $file" -ForegroundColor Yellow
    
    if (-not (Test-Path $file)) {
        Write-Host "  ⚠️  File doesn't exist - skipping" -ForegroundColor Gray
        continue
    }
    
    # Read file content
    $content = Get-Content $file -Raw
    $lines = Get-Content $file
    $modified = $false
    $newLines = @()
    $propertiesAdded = @()
    
    # Check which property is missing
    $needsOrgId = $filesWithOrgId -contains $file
    $needsUserId = $filesWithUserId -contains $file
    
    Write-Host "  Missing: $(if($needsOrgId){'organizationId '})$(if($needsUserId){'userId'})" -ForegroundColor Gray
    
    # Look for context destructuring patterns that need these properties
    $inContext = $false
    $contextStartLine = -1
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $newLine = $line
        
        # Pattern 1: Context destructuring { userId } = context
        # Add missing properties to the destructuring
        if ($line -match '^\s*const\s*{\s*([^}]+)\s*}\s*=\s*context\s*;?\s*$') {
            $existingProps = $matches[1]
            $propsArray = $existingProps -split ',' | ForEach-Object { $_.Trim() }
            
            $addedProps = @()
            if ($needsOrgId -and $propsArray -notcontains 'organizationId') {
                $addedProps += 'organizationId'
            }
            if ($needsUserId -and $propsArray -notcontains 'userId') {
                $addedProps += 'userId'
            }
            
            if ($addedProps.Count -gt 0) {
                $allProps = $propsArray + $addedProps
                $newPropsStr = $allProps -join ', '
                $indent = ($line -match '^(\s*)') ? $matches[1] : ''
                $newLine = "${indent}const { $newPropsStr } = context;"
                $modified = $true
                $propertiesAdded += $addedProps
                Write-Host "  ✓ Added $($addedProps -join ', ') to context destructuring (line $($i+1))" -ForegroundColor Green
            }
        }
        
        # Pattern 2: Multi-line context destructuring
        # const {
        #   userId,
        #   ...
        # } = context;
        if ($line -match '^\s*const\s*{\s*$') {
            if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -match '^\s*\w+') {
                # This looks like a multi-line destructuring, scan for 'context'
                $j = $i + 1
                $foundContext = $false
                $closingBraceIndex = -1
                
                while ($j -lt $lines.Count -and $j -lt $i + 30) {
                    if ($lines[$j] -match '}\s*=\s*context') {
                        $foundContext = $true
                        $closingBraceIndex = $j
                        break
                    }
                    $j++
                }
                
                if ($foundContext) {
                    # Check if organizationId/userId are already in the destructuring
                    $destructuringBlock = $lines[$i..$closingBraceIndex] -join "`n"
                    
                    $missingProps = @()
                    if ($needsOrgId -and $destructuringBlock -notmatch '\borganizationId\b') {
                        $missingProps += 'organizationId'
                    }
                    if ($needsUserId -and $destructuringBlock -notmatch '\buserId\b') {
                        $missingProps += 'userId'
                    }
                    
                    if ($missingProps.Count -gt 0) {
                        # Find the line before the closing brace to insert new properties
                        $insertIndex = $closingBraceIndex - 1
                        
                        # Get indentation from existing properties
                        $indent = ''
                        if ($lines[$i + 1] -match '^(\s+)') {
                            $indent = $matches[1]
                        }
                        
                        # Add new lines for missing properties
                        $newLines += $line
                        for ($k = $i + 1; $k -lt $closingBraceIndex; $k++) {
                            $newLines += $lines[$k]
                        }
                        
                        # Insert missing properties before closing brace
                        foreach ($prop in $missingProps) {
                            $newLines += "${indent}${prop},"
                            $propertiesAdded += $prop
                            Write-Host "  ✓ Added $prop to multi-line context destructuring (line $($closingBraceIndex))" -ForegroundColor Green
                        }
                        
                        # Add closing brace line
                        $newLines += $lines[$closingBraceIndex]
                        
                        $modified = $true
                        $i = $closingBraceIndex  # Skip to after the destructuring block
                        continue
                    }
                }
            }
        }
        
        $newLines += $newLine
    }
    
    if (-not $modified) {
        Write-Host "  ℹ️  No applicable patterns found - manual fix needed" -ForegroundColor Gray
        continue
    }
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would add: $($propertiesAdded -join ', ')" -ForegroundColor Yellow
        continue
    }
    
    # Write modified content
    $newContent = $newLines -join "`n"
    Set-Content -Path $file -Value $newContent -NoNewline
    
    # Validate the change
    Write-Host "  Validating..." -ForegroundColor Gray
    $newErrorCount = (pnpm tsc --noEmit 2>&1 | Select-String "error TS").Count
    $errorChange = $newErrorCount - $baselineErrors
    
    if ($errorChange -gt $MaxErrorIncrease) {
        Write-Host "  ❌ Validation failed! Errors increased by $errorChange (max: $MaxErrorIncrease)" -ForegroundColor Red
        Write-Host "  Rolling back..." -ForegroundColor Yellow
        Set-Content -Path $file -Value $content -NoNewline
        continue
    }
    
    Write-Host "  ✅ Validated (errors: $baselineErrors → $newErrorCount, change: $errorChange)" -ForegroundColor Green
    $baselineErrors = $newErrorCount
    $totalFilesModified++
    $totalPropertiesAdded += $propertiesAdded.Count
}

# Final summary
Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PHASE 2: Add Organization/User IDs - COMPLETE" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

$finalErrorCount = (pnpm tsc --noEmit 2>&1 | Select-String "error TS").Count
$errorsFixed = $baselineErrors - $finalErrorCount

Write-Host "Results:" -ForegroundColor White
Write-Host "  Files Modified: $totalFilesModified" -ForegroundColor Green
Write-Host "  Properties Added: $totalPropertiesAdded" -ForegroundColor Green
Write-Host "  Errors Fixed: $errorsFixed" -ForegroundColor Green
Write-Host ""
Write-Host "Before: $baselineErrors errors" -ForegroundColor Gray
Write-Host "After:  $finalErrorCount errors" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "This was a DRY RUN - no changes were made" -ForegroundColor Yellow
}

Write-Host "Script complete!" -ForegroundColor Green
Write-Host ""
