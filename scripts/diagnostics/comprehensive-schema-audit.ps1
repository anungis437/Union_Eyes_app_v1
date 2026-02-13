#!/usr/bin/env pwsh
<#
.SYNOPSIS
Comprehensive Schema Field Audit - Extracts all tables/fields from schemas and finds mismatches

.DESCRIPTION
This script:
1. Parses all schema files to extract table names and their fields
2. Scans codebase for field references
3. Identifies mismatches where code references non-existent fields
4. Generates detailed report with fix priorities

.PARAMETER OutputJson
Path to output JSON report (default: schema-audit-report.json)

.PARAMETER Detailed
Show detailed findings in console

.EXAMPLE
.\comprehensive-schema-audit.ps1 -Detailed
#>

param(
    [string]$OutputJson = "schema-audit-report.json",
    [switch]$Detailed
)

$ErrorActionPreference = "Continue"
$workspaceRoot = "C:\APPS\Union_Eyes_app_v1"
Set-Location $workspaceRoot

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "COMPREHENSIVE SCHEMA AUDIT" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Extract all schema definitions
Write-Host "[1/4] Extracting schema definitions..." -ForegroundColor Yellow

$schemaFiles = Get-ChildItem -Path "db/schema" -Filter "*.ts" -Exclude "index.ts"
$schemaMap = @{}
$tablesList = @()

foreach ($file in $schemaFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Extract table definitions: export const tableName = pgTable(...)
    $tableMatches = [regex]::Matches($content, 'export const (\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)')
    
    foreach ($match in $tableMatches) {
        $tableName = $match.Groups[1].Value
        $tablesList += $tableName
        
        # Extract field definitions within this table
        # Look for patterns like: fieldName: varchar(...), fieldName: integer(...), etc.
        $tableDefStart = $match.Index
        $tableDefEnd = $content.IndexOf('});', $tableDefStart)
        if ($tableDefEnd -gt $tableDefStart) {
            $tableDef = $content.Substring($tableDefStart, $tableDefEnd - $tableDefStart)
            
            # Extract field names
            $fieldMatches = [regex]::Matches($tableDef, '^\s+(\w+):\s+(?:varchar|text|integer|bigint|boolean|timestamp|date|json|uuid|serial|real|doublePrecision|numeric)', [System.Text.RegularExpressions.RegexOptions]::Multiline)
            
            $fields = @()
            foreach ($fieldMatch in $fieldMatches) {
                $fieldName = $fieldMatch.Groups[1].Value
                $fields += $fieldName
            }
            
            $schemaMap[$tableName] = @{
                file = $file.Name
                fields = $fields
            }
        }
    }
}

Write-Host "  Found $($schemaMap.Count) tables with field definitions" -ForegroundColor Green
Write-Host ""

# Step 2: Scan for problematic patterns
Write-Host "[2/4] Scanning for schema mismatches..." -ForegroundColor Yellow

$problematicPatterns = @{
    # Common field names that often don't exist
    "fullName" = @()
    "displayName" = @()
    "phoneNumber" = @()
    "memberNumber" = @()
    "address" = @()
    "province" = @()
    "name" = @()
    "firstName" = @()
    "lastName" = @()
    "phone" = @()
}

$searchPaths = @(
    "lib/**/*.ts",
    "lib/**/*.tsx",
    "components/**/*.tsx",
    "app/**/*.ts",
    "app/**/*.tsx",
    "actions/**/*.ts"
)

foreach ($pattern in $problematicPatterns.Keys) {
    foreach ($searchPath in $searchPaths) {
        $matches = git grep -n "\.$pattern" -- $searchPath 2>$null
        if ($matches) {
            foreach ($match in $matches) {
                if ($match -match '^([^:]+):(\d+):(.+)$') {
                    $file = $Matches[1]
                    $line = $Matches[2]
                    $content = $Matches[3].Trim()
                    
                    $problematicPatterns[$pattern] += @{
                        file = $file
                        line = $line
                        content = $content
                    }
                }
            }
        }
    }
}

$totalIssues = ($problematicPatterns.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
Write-Host "  Found $totalIssues potential field mismatches" -ForegroundColor $(if ($totalIssues -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Step 3: Analyze table-specific issues
Write-Host "[3/4] Analyzing table-specific issues..." -ForegroundColor Yellow

$tableIssues = @{}

foreach ($tableName in $tablesList) {
    $schema = $schemaMap[$tableName]
    if (-not $schema) { continue }
    
    # Search for references to this table
    $tableRefs = git grep -n "\b$tableName\." -- "lib/**/*.ts" "components/**/*.tsx" "app/**/*.tsx" "actions/**/*.ts" 2>$null
    
    if ($tableRefs) {
        $issues = @()
        foreach ($ref in $tableRefs) {
            if ($ref -match '^([^:]+):(\d+):(.+)$') {
                $file = $Matches[1]
                $line = $Matches[2]
                $content = $Matches[3].Trim()
                
                # Check if reference is to a non-existent field
                foreach ($pattern in $problematicPatterns.Keys) {
                    if ($content -match "\b$tableName\.$pattern\b" -and $pattern -notin $schema.fields) {
                        $issues += @{
                            field = $pattern
                            file = $file
                            line = $line
                            content = $content
                        }
                    }
                }
            }
        }
        
        if ($issues.Count -gt 0) {
            $tableIssues[$tableName] = $issues
        }
    }
}

Write-Host "  Found issues in $($tableIssues.Count) tables" -ForegroundColor $(if ($tableIssues.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Step 4: Generate report
Write-Host "[4/4] Generating report..." -ForegroundColor Yellow

$report = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    summary = @{
        totalTables = $schemaMap.Count
        tablesWithIssues = $tableIssues.Count
        totalIssues = $totalIssues
    }
    schemaMap = $schemaMap
    problematicPatterns = $problematicPatterns
    tableIssues = $tableIssues
}

$report | ConvertTo-Json -Depth 10 | Out-File $OutputJson -Encoding UTF8

Write-Host "  Report saved to: $OutputJson" -ForegroundColor Green
Write-Host ""

# Display summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tables analyzed: $($schemaMap.Count)" -ForegroundColor White
Write-Host "Tables with issues: $($tableIssues.Count)" -ForegroundColor $(if ($tableIssues.Count -gt 0) { "Red" } else { "Green" })
Write-Host "Total field mismatches: $totalIssues" -ForegroundColor $(if ($totalIssues -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Show top offending tables
if ($tableIssues.Count -gt 0) {
    Write-Host "Top 10 tables with most issues:" -ForegroundColor Yellow
    $tableIssues.GetEnumerator() | 
        Sort-Object { $_.Value.Count } -Descending | 
        Select-Object -First 10 | 
        ForEach-Object {
            Write-Host "  $($_.Key): $($_.Value.Count) issues" -ForegroundColor Red
        }
    Write-Host ""
}

# Show top offending files
$fileIssues = @{}
foreach ($pattern in $problematicPatterns.Keys) {
    foreach ($issue in $problematicPatterns[$pattern]) {
        $file = $issue.file
        if (-not $fileIssues.ContainsKey($file)) {
            $fileIssues[$file] = 0
        }
        $fileIssues[$file]++
    }
}

if ($fileIssues.Count -gt 0) {
    Write-Host "Top 10 files with most issues:" -ForegroundColor Yellow
    $fileIssues.GetEnumerator() | 
        Sort-Object Value -Descending | 
        Select-Object -First 10 | 
        ForEach-Object {
            Write-Host "  $($_.Key): $($_.Value) issues" -ForegroundColor Red
        }
    Write-Host ""
}

# Show detailed findings if requested
if ($Detailed) {
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "DETAILED FINDINGS" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($tableName in ($tableIssues.Keys | Sort-Object)) {
        Write-Host "Table: $tableName" -ForegroundColor Yellow
        Write-Host "Schema file: $($schemaMap[$tableName].file)" -ForegroundColor Gray
        Write-Host "Valid fields: $($schemaMap[$tableName].fields -join ', ')" -ForegroundColor Gray
        Write-Host ""
        
        $issues = $tableIssues[$tableName]
        $issuesByField = $issues | Group-Object field
        
        foreach ($group in $issuesByField) {
            Write-Host "  Invalid field: $($group.Name) ($($group.Count) occurrences)" -ForegroundColor Red
            foreach ($issue in ($group.Group | Select-Object -First 3)) {
                Write-Host "    $($issue.file):$($issue.line)" -ForegroundColor Gray
                Write-Host "      $($issue.content)" -ForegroundColor DarkGray
            }
            if ($group.Count -gt 3) {
                Write-Host "    ... and $($group.Count - 3) more" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review $OutputJson for detailed findings" -ForegroundColor White
Write-Host "2. Fix high-priority issues in services and components" -ForegroundColor White
Write-Host "3. Run type check to verify fixes: pnpm exec tsc --noEmit" -ForegroundColor White
Write-Host ""
