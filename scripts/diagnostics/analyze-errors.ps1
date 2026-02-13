# Analyze TypeScript Errors to Identify Fixable Patterns
# Groups errors by type and suggests automated fixes

param(
    [int]$TopErrors = 20,
    [switch]$ExportJson
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   TypeScript Error Pattern Analysis                           " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "`nCollecting TypeScript errors..." -ForegroundColor Cyan

# Get all errors with full output
$tscOutput = pnpm exec tsc --noEmit 2>&1 | Out-String
$errorLines = $tscOutput -split "`n" | Where-Object { $_ -match "error TS\d+" }

Write-Host "Found $($errorLines.Count) errors" -ForegroundColor Yellow

# Parse errors into structured data
$errors = @()
foreach ($line in $errorLines) {
    if ($line -match "^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)`$") {
        $errors += [PSCustomObject]@{
            File = $Matches[1]
            Line = [int]$Matches[2]
            Column = [int]$Matches[3]
            Code = $Matches[4]
            Message = $Matches[5]
        }
    }
}

Write-Host "Parsed $($errors.Count) structured errors`n" -ForegroundColor Green

# Group by error code
$byCode = $errors | Group-Object Code | Sort-Object Count -Descending

Write-Host "=== Top Error Codes ===" -ForegroundColor Cyan
foreach ($group in $byCode | Select-Object -First 10) {
    Write-Host "`n$($group.Name): $($group.Count) occurrences" -ForegroundColor White
    
    # Show sample messages
    $uniqueMessages = $group.Group | Select-Object -ExpandProperty Message -Unique | Select-Object -First 3
    foreach ($msg in $uniqueMessages) {
        Write-Host "  * $msg" -ForegroundColor Gray
    }
}

# Group by file
Write-Host "`n`n=== Files with Most Errors ===" -ForegroundColor Cyan
$byFile = $errors | Group-Object File | Sort-Object Count -Descending | Select-Object -First $TopErrors

foreach ($group in $byFile) {
    $fileName = Split-Path $group.Name -Leaf
    Write-Host "`n$fileName : $($group.Count) errors" -ForegroundColor Yellow
    
    # Show error code breakdown for this file
    $fileCodes = $group.Group | Group-Object Code | Sort-Object Count -Descending | Select-Object -First 5
    foreach ($code in $fileCodes) {
        Write-Host "  $($code.Name): $($code.Count)" -ForegroundColor Gray
    }
}

# Identify fixable patterns
Write-Host "`n`n=== Fixable Patterns Detected ===" -ForegroundColor Cyan

$fixablePatterns = @()

# Pattern 1: Property does not exist
$propErrors = $errors | Where-Object { $_.Message -match "Property '(.+?)' does not exist on type '(.+?)'" }
if ($propErrors) {
    $grouped = $propErrors | Group-Object { 
        if ($_.Message -match "Property '(.+?)' does not exist") { $Matches[1] } 
    } | Sort-Object Count -Descending | Select-Object -First 10
    
    Write-Host "`n[Property does not exist - $($propErrors.Count) errors]" -ForegroundColor Red
    foreach ($g in $grouped) {
        Write-Host "  * Property '$($g.Name)': $($g.Count) occurrences" -ForegroundColor Gray
        
        # Try to suggest fix
        if ($g.Name -in @('displayName', 'phoneNumber', 'memberNumber', 'fullName')) {
            Write-Host "    >> Likely needs profile schema update" -ForegroundColor Yellow
        }
        elseif ($g.Name -eq 'timestamp') {
            Write-Host "    >> Replace with 'createdAt' in auditLogs" -ForegroundColor Green
            $fixablePatterns += @{
                Type = "FieldRename"
                From = "timestamp"
                To = "createdAt"
                Context = "auditLogs"
                Count = $g.Count
            }
        }
        elseif ($g.Name -eq 'id' -and ($g.Group.File -match "users")) {
            Write-Host "    >> Replace with 'userId' in users table" -ForegroundColor Green
            $fixablePatterns += @{
                Type = "FieldRename"
                From = ".id"
                To = ".userId"
                Context = "users"
                Count = $g.Count
            }
        }
    }
}

# Pattern 2: Cannot find module
$moduleErrors = $errors | Where-Object { $_.Message -match "Cannot find module '(.+?)'" }
if ($moduleErrors) {
    $grouped = $moduleErrors | Group-Object { 
        if ($_.Message -match "Cannot find module '(.+?)'") { $Matches[1] } 
    } | Sort-Object Count -Descending
    
    Write-Host "`n[Cannot find module - $($moduleErrors.Count) errors]" -ForegroundColor Red
    foreach ($g in $grouped) {
        Write-Host "  * Module '$($g.Name)': $($g.Count) occurrences" -ForegroundColor Gray
        
        # Suggest fixes
        if ($g.Name -match 'tenant-management-schema') {
            Write-Host "    >> Schema file removed - update imports to '@/db/schema'" -ForegroundColor Yellow
        }
    }
}

# Pattern 3: Type mismatch
$typeErrors = $errors | Where-Object { $_.Message -match "Type .+ is not assignable to type" }
if ($typeErrors) {
    Write-Host "`n[Type mismatch errors: $($typeErrors.Count)]" -ForegroundColor Red
    $sample = $typeErrors | Select-Object -First 5
    foreach ($err in $sample) {
        Write-Host "  * $($err.Message)" -ForegroundColor Gray
    }
}

# Pattern 4: Argument type errors
$argErrors = $errors | Where-Object { $_.Message -match "Argument of type" }
if ($argErrors) {
    Write-Host "`n[Argument type errors: $($argErrors.Count)]" -ForegroundColor Red
}

# Export fixable patterns
if ($fixablePatterns) {
    Write-Host "`n`n=== Recommended Automated Fixes ===" -ForegroundColor Green
    $fixablePatterns | ForEach-Object {
        Write-Host "`n$($_.Type): $($_.From) -> $($_.To)" -ForegroundColor Green
        Write-Host "  Context: $($_.Context)" -ForegroundColor Gray
        Write-Host "  Affects: $($_.Count) errors" -ForegroundColor Gray
    }
}

# Generate fix script suggestions
Write-Host "`n`n=== Suggested Fix Script Patterns ===" -ForegroundColor Cyan

$suggestions = @()

# Check for common fieldnames in profile errors
$profileFieldErrors = $errors | Where-Object { 
    $_.Message -match "Property '(displayName|phoneNumber|memberNumber|fullName|firstName|lastName)' does not exist on type.*profile" 
}
if ($profileFieldErrors) {
    Write-Host "`nProfile field mismatches: $($profileFieldErrors.Count) errors" -ForegroundColor Yellow
    Write-Host "   Add to fix script:" -ForegroundColor Gray
    Write-Host "   - Check for profile.displayName -> profile.email or users.displayName" -ForegroundColor Gray
    Write-Host "   - Check for profile.phoneNumber -> null (doesn't exist on profiles)" -ForegroundColor Gray
}

# Check for auditLogs timestamp
$auditTimestampErrors = $errors | Where-Object { 
    $_.Message -match "Property 'timestamp' does not exist.*audit" 
}
if ($auditTimestampErrors) {
    Write-Host "`nAuditLogs timestamp field: $($auditTimestampErrors.Count) errors" -ForegroundColor Yellow
    Write-Host "   Add to fix script:" -ForegroundColor Gray
    Write-Host "   - Replace auditLogs.timestamp -> auditLogs.createdAt" -ForegroundColor Gray
    Write-Host "   - Replace audit_logs.timestamp -> audit_logs.createdAt" -ForegroundColor Gray
}

# Check for users.id vs userId
$userIdErrors = $errors | Where-Object { 
    $_.File -match "users" -and $_.Message -match "Property 'id' does not exist"
}
if ($userIdErrors) {
    Write-Host "`nUsers table 'id' field: $($userIdErrors.Count) errors" -ForegroundColor Yellow
    Write-Host "   Add to fix script:" -ForegroundColor Gray
    Write-Host "   - Replace users.id -> users.userId" -ForegroundColor Gray
}

# Export JSON if requested
if ($ExportJson) {
    $outputPath = Join-Path $PSScriptRoot "error-analysis.json"
    $analysisData = @{
        TotalErrors = $errors.Count
        ByCode = $byCode | Select-Object Name, Count
        ByFile = $byFile | Select-Object Name, Count
        FixablePatterns = $fixablePatterns
        TopErrors = $errors | Select-Object -First 100
    }
    $analysisData | ConvertTo-Json -Depth 10 | Set-Content $outputPath
    Write-Host "`nExported analysis to: $outputPath" -ForegroundColor Green
}

Write-Host "`n`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Review fixable patterns above" -ForegroundColor White
Write-Host "2. Add patterns to safe-incremental-fixes.ps1" -ForegroundColor White
Write-Host "3. Run with -DryRun first to preview" -ForegroundColor White
Write-Host "4. Apply fixes incrementally with validation" -ForegroundColor White
