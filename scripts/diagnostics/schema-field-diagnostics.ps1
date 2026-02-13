#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Diagnostic script to find schema field mismatches in TypeScript code
.DESCRIPTION
    Scans codebase for references to fields that don't exist in actual database schemas
    Focuses on profiles table which only has: userId, email, membership, organizationId
#>

param(
    [string]$WorkspacePath = "C:\APPS\Union_Eyes_app_v1",
    [switch]$Detailed
)

Write-Host "Running Schema Field Diagnostics..." -ForegroundColor Cyan
Write-Host ""

# Define known problematic field references
$profilesProblematicFields = @(
    'fullName',
    'displayName', 
    'phoneNumber',
    'memberNumber',
    'province',
    'address',
    'city',
    'postalCode',
    'unionLocal',
    'joinDate'
)

$grievanceDeadlineProblematicFields = @(
    'claimId',        # Should be grievanceId
    'deadlineDate',   # Should be dueDate
    'isMet',          # Should be status
    'escalateOnMiss', # Doesn't exist
    'escalatedAt',    # Doesn't exist
    'escalateTo',     # Doesn't exist
    'assignedTo'      # Doesn't exist
)

$signatureWorkflowProblematicFields = @(
    'externalId',     # Should be externalEnvelopeId
    'documentName',   # Should be name
    'subject',        # Store in workflowData
    'message',        # Store in workflowData
    'documentHash',   # Store in workflowData
    'signature'       # Should be signatureImage
)

# Files to exclude from search
$excludePatterns = @(
    '__tests__/**',
    'node_modules/**',
    '.next/**',
    'archive/**',
    'packages/**',
    'mobile/**',
    'cba-intelligence/**'
)

function Search-ProblematicFields {
    param(
        [string]$Pattern,
        [string]$Description,
        [string[]]$Fields
    )
    
    Write-Host "Checking: $Description" -ForegroundColor Yellow
    $issues = @()
    
    foreach ($field in $Fields) {
        # Search for field access patterns
        $searchPatterns = @(
            "\.${field}\s*[=:]",       # Object property access
            "\.${field}\)",            # Method parameter
            "'${field}'",              # String literal
            "`"${field}`"",            # String literal
            "\['${field}'\]",          # Bracket notation
            "\[`"${field}`"\]"         # Bracket notation
        )
        
        foreach ($searchPattern in $searchPatterns) {
            $results = Get-ChildItem -Path $WorkspacePath -Include *.ts,*.tsx -Recurse -File -ErrorAction SilentlyContinue |
                Where-Object { 
                    $relativePath = $_.FullName.Replace($WorkspacePath, '').TrimStart('\')
                    $excluded = $false
                    foreach ($excludePattern in $excludePatterns) {
                        if ($relativePath -like $excludePattern) {
                            $excluded = $true
                            break
                        }
                    }
                    -not $excluded
                } |
                Select-String -Pattern $searchPattern -SimpleMatch:$false -ErrorAction SilentlyContinue
            
            if ($results) {
                foreach ($result in $results) {
                    $issues += [PSCustomObject]@{
                        File = $result.Path.Replace($WorkspacePath, '').TrimStart('\')
                        Line = $result.LineNumber
                        Field = $field
                        Context = $result.Line.Trim()
                    }
                }
            }
        }
    }
    
    if ($issues.Count -gt 0) {
        Write-Host "  [ERROR] Found $($issues.Count) potential issues" -ForegroundColor Red
        
        # Group by file
        $grouped = $issues | Group-Object -Property File
        foreach ($group in $grouped) {
            Write-Host "    FILE: $($group.Name) ($($group.Count) issues)" -ForegroundColor Gray
            if ($Detailed) {
                foreach ($issue in $group.Group) {
                    Write-Host "       Line $($issue.Line): $($issue.Field)" -ForegroundColor DarkGray
                    Write-Host "         $($issue.Context)" -ForegroundColor DarkGray
                }
            }
        }
    } else {
        Write-Host "  [OK] No issues found" -ForegroundColor Green
    }
    
    Write-Host ""
    return $issues
}

# Run diagnostics
$allIssues = @()

$allIssues += Search-ProblematicFields -Pattern "profiles" -Description "Profiles table (should only have: userId, email, membership, organizationId)" -Fields $profilesProblematicFields

$allIssues += Search-ProblematicFields -Pattern "grievanceDeadlines" -Description "Grievance Deadlines table field mismatches" -Fields $grievanceDeadlineProblematicFields

$allIssues += Search-ProblematicFields -Pattern "signatureWorkflows" -Description "Signature Workflows table field mismatches" -Fields $signatureWorkflowProblematicFields

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total issues found: $($allIssues.Count)" -ForegroundColor $(if ($allIssues.Count -gt 0) { 'Yellow' } else { 'Green' })

if ($allIssues.Count -gt 0) {
    # Group by file and show top offenders
    $topFiles = $allIssues | Group-Object -Property File | Sort-Object -Property Count -Descending | Select-Object -First 10
    
    Write-Host ""
    Write-Host "Top 10 files with most issues:" -ForegroundColor Yellow
    foreach ($file in $topFiles) {
        Write-Host "  $($file.Count.ToString().PadLeft(3)) issues - $($file.Name)" -ForegroundColor Gray
    }
    
    # Export to JSON for programmatic use
    $reportPath = Join-Path $WorkspacePath "scripts\diagnostics\schema-diagnostics-report.json"
    $report = @{
        timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        totalIssues = $allIssues.Count
        issues = $allIssues
        topFiles = $topFiles | ForEach-Object { @{ file = $_.Name; count = $_.Count } }
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host ""
    Write-Host "Detailed report saved to: scripts\diagnostics\schema-diagnostics-report.json" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[DONE] Diagnostics complete" -ForegroundColor Green
