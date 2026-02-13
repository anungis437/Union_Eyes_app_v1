#!/usr/bin/env pwsh
<#
.SYNOPSIS
Phase 2 Schema Alignment - Additional systematic fixes

.DESCRIPTION
Applies additional schema field corrections based on error analysis:
1. tenants table -> organizations table references
2. tenants field names -> organizations field names (tenantName -> name, etc.)
3. Missing type annotations

.PARAMETER DryRun
Show what would be changed without making changes

.EXAMPLE
.\phase2-schema-fixes.ps1 -DryRun
.\phase2-schema-fixes.ps1
#>

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$workspaceRoot = "C:\APPS\Union_Eyes_app_v1"
Set-Location $workspaceRoot

Write-Host "================================" -ForegroundColor Cyan
Write-Host "PHASE 2 SCHEMA ALIGNMENT FIXES" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[DRY RUN MODE - No changes will be made]" -ForegroundColor Yellow
}
Write-Host ""

# Define Phase 2 replacement patterns
$replacements = @(
    # Tenant table references -> Organizations
    @{
        Pattern = '\btenants\.'
        Replacement = 'organizations.'
        Description = 'tenants table -> organizations table'
        Files = @("actions/*.ts", "lib/**/*.ts")
    },
    # Tenant field names to organizations field names
    @{
        Pattern = '\.tenantName\b'
        Replacement = '.name'
        Description = 'tenantName field -> name field'
        Files = @("actions/*.ts", "lib/**/*.ts", "components/**/*.tsx")
    },
    @{
        Pattern = '\.tenantSlug\b'
        Replacement = '.slug'
        Description = 'tenantSlug field -> slug field'
        Files = @("actions/*.ts", "lib/**/*.ts", "components/**/*.tsx")
    },
    # Interface/type definitions
    @{
        Pattern = '\btenantId:\s+string'
        Replacement = 'organizationId: string'
        Description = 'tenantId type -> organizationId type in interfaces'
        Files = @("actions/*.ts", "lib/**/*.ts", "types/*.ts")
    }
)

$totalChanges = 0
$fileChanges = @{}

foreach ($replacement in $replacements) {
    Write-Host "Processing: $($replacement.Description)" -ForegroundColor Yellow
    
    $pattern = $replacement.Pattern
    $allMatchedFiles = @()
    
    # Collect files from all specified patterns
    foreach ($filePath in $replacement.Files) {
        $files = Get-ChildItem -Path $filePath -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
            $_.FullName -notmatch '__tests__' -and
            $_.FullName -notmatch 'node_modules' -and
            $_.FullName -notmatch '\.next'
        }
        $allMatchedFiles += $files
    }
    
    foreach ($file in $allMatchedFiles) {
        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)
        } catch {
            continue
        }
        
        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -eq 0) { continue }
        
        if (-not $DryRun) {
            $newContent = $content -replace $pattern, $replacement.Replacement
            [System.IO.File]::WriteAllText($file.FullName, $newContent)
        }
        
        $relativePath = $file.FullName.Replace($workspaceRoot + "\", "").Replace("\", "/")
        if (-not $fileChanges.ContainsKey($relativePath)) {
            $fileChanges[$relativePath] = 0
        }
        $fileChanges[$relativePath] += $matches.Count
        $totalChanges += $matches.Count
        
        $matchCount = $matches.Count
        Write-Host "  ${relativePath}: ${matchCount} changes" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total changes: $totalChanges" -ForegroundColor $(if ($totalChanges -gt 0) { "Green" } else { "Gray" })
Write-Host "Files modified: $($fileChanges.Count)" -ForegroundColor $(if ($fileChanges.Count -gt 0) { "Green" } else { "Gray" })
Write-Host ""

if ($fileChanges.Count -gt 0) {
    Write-Host "Top 15 files with most changes:" -ForegroundColor Yellow
    $fileChanges.GetEnumerator() | 
        Sort-Object Value -Descending | 
        Select-Object -First 15 | 
        ForEach-Object {
            Write-Host "  $($_.Key): $($_.Value) changes" -ForegroundColor White
        }
    Write-Host ""
}

if ($DryRun) {
    Write-Host "[DRY RUN COMPLETE - Run without -DryRun to apply changes]" -ForegroundColor Yellow
} else {
    Write-Host "[COMPLETE - Changes applied]" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step: Run type check to verify: pnpm exec tsc --noEmit" -ForegroundColor Yellow
}
Write-Host ""
