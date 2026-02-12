#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Cleanup and organize root repository markdown files and scripts
.DESCRIPTION
    This script organizes 60+ markdown files and scripts from the root directory
    into appropriate subdirectories for better maintainability.
.NOTES
    Created: 2026-02-12
    Purpose: Repository organization and cleanup
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Define colors
$txtSuccess = "Green"
$txtInfo = "Cyan"
$txtWarning = "Yellow"
$txtError = "Red"
$txtHeader = "Magenta"

function Write-StepHeader {
    param([string]$Message)
    Write-Host ""
    Write-Host "=" * 70 -ForegroundColor $txtHeader
    Write-Host "  $Message" -ForegroundColor $txtHeader
    Write-Host "=" * 70 -ForegroundColor $txtHeader
    Write-Host ""
}

# Track statistics
$stats = @{
    FilesKept = 0
    FilesMoved = 0
    FilesDeleted = 0
    DirectoriesCreated = 0
}

# Define directory structure
$targetDirs = @{
    Implementations = "docs/archive/implementations"
    Analysis = "docs/archive/analysis"
    Plans = "docs/archive/plans"
    Scripts = "scripts"
}

Write-StepHeader "Repository Cleanup Script"
Write-Host "Starting repository organization..." -ForegroundColor $txtInfo

# Step 1: Create directories
Write-StepHeader "Step 1: Creating Directory Structure"

foreach ($key in $targetDirs.Keys) {
    $dirPath = $targetDirs[$key]
    if (-not (Test-Path $dirPath)) {
        New-Item -Path $dirPath -ItemType Directory -Force | Out-Null
        Write-Host "[+] Created: $dirPath" -ForegroundColor $txtSuccess
        $stats.DirectoriesCreated++
    } else {
        Write-Host "[ ] Exists: $dirPath" -ForegroundColor $txtInfo
    }
}

# Step 2: Define files to keep in root
Write-StepHeader "Step 2: Files Kept in Root"

$keepInRoot = @(
    "README.md",
    "INSTITUTIONAL_READINESS_COMPLETE.md",
    "INSTITUTIONAL_READINESS_SUMMARY.md"
)

foreach ($file in $keepInRoot) {
    if (Test-Path $file) {
        Write-Host "[K] Keeping: $file" -ForegroundColor $txtSuccess
        $stats.FilesKept++
    }
}

# Step 3: Delete temporary files
Write-StepHeader "Step 3: Removing Temporary Files"

$filesToDelete = @(
    "VERIFY_INSTITUTIONAL_READINESS.md"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "[X] Deleted: $file" -ForegroundColor $txtWarning
        $stats.FilesDeleted++
    }
}

# Step 4: Move implementation files
Write-StepHeader "Step 4: Moving Implementation Files"

$implementationFiles = @(
    "A+_ACHIEVEMENT_IMPLEMENTATION_REPORT.md",
    "A+_EXECUTIVE_SUMMARY.md",
    "A+_QUICK_REFERENCE.md",
    "API_DOCUMENTATION_SPRINT_COMPLETE.md",
    "APP_OPERATIONS_DASHBOARDS_COMPLETE.md",
    "APP_OPERATIONS_ROLES_IMPLEMENTATION.md",
    "ASSET_INVENTORY_EXECUTIVE_SUMMARY.md",
    "ASSET_INVENTORY_QUICK_REFERENCE.md",
    "AUTOMATION_QUICKREF.md",
    "BARGAINING_MODULE_IMPLEMENTATION_COMPLETE.md",
    "COMPLETE_IMPLEMENTATION_TRACKER.md",
    "CORRECTED_VALIDATION_REPORT.md",
    "COVERAGE_GUIDE.md",
    "DEPLOYMENT_READY_SUMMARY.md",
    "DOCKER_EXCELLENCE_PHASE1_READY.md",
    "DOCKER_IMPLEMENTATION_COMPLETE.md",
    "DOCKER_PHASE1_QUICKREF.md",
    "DOCKER_PHASE2_QUICKREF.md",
    "IMPLEMENTATION_COMPLETE_SUMMARY.md",
    "IMPLEMENTATION_SESSION_SUMMARY.md",
    "LLM_EXCELLENCE_CONFIG.md",
    "LLM_EXCELLENCE_QUICKREF.md",
    "LLM_EXCELLENCE_ROADMAP.md",
    "LLM_EXCELLENCE_SUMMARY.md",
    "LLM_PHASE1_COMPLETE.md",
    "LLM_PHASE4_IMPLEMENTATION.md",
    "MIGRATION_0062-0066_TEST_SUMMARY.md",
    "MIGRATION_FIX_SUMMARY.md",
    "NAVIGATION_AUDIT_ALL_26_ROLES.md",
    "OPERATIONAL_FINANCE_IMPLEMENTATION.md",
    "PAYMENT_PROCESSOR_ABSTRACTION_SUMMARY.md",
    "PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md",
    "PERFORMANCE_QUICK_REFERENCE.md",
    "PHASE_2-4_APP_OPERATIONS_COMPLETE.md",
    "PHASE_5_ADVANCED_INTEGRATIONS_COMPLETE.md",
    "PRODUCTION_DEPLOYMENT_GUIDE.md",
    "QUICK_WINS_COMPLETE.md",
    "QUICK_WINS_IMPLEMENTATION.md",
    "QUICK_WINS_QUICKREF.md",
    "QUICK_WINS_SUCCESS_REPORT.md",
    "QUICK_WINS_SUMMARY.md",
    "REPOSITORY_EXCELLENCE_SPRINT_COMPLETE.md",
    "REPO_CLEANUP_COMPLETE.md",
    "REPO_CLEANUP_SUMMARY.md",
    "REPO_INDEX.md",
    "SCHEMA_CONSOLIDATION_COMPLETE.md",
    "SCHEMA_DRIFT_IMPLEMENTATION.md",
    "SCHEMA_DRIFT_PROTECTION.md",
    "SCHEMA_DRIFT_QUICKREF.md",
    "SCHEMA_REVIEW_2026-02-13.md",
    "STAGING_DEPLOYMENT_CHECKLIST.md",
    "WORLD_CLASS_AUTOMATION.md"
)

$targetDir = $targetDirs.Implementations
foreach ($file in $implementationFiles) {
    if (Test-Path $file) {
        $destination = Join-Path $targetDir (Split-Path $file -Leaf)
        Move-Item -Path $file -Destination $destination -Force
        Write-Host "[>] Moved: $file -> $destination" -ForegroundColor $txtSuccess
        $stats.FilesMoved++
    }
}

# Step 5: Move analysis files
Write-StepHeader "Step 5: Moving Analysis Files"

$analysisFiles = @(
    "CHART_OF_ACCOUNTS_DUPLICATION_ANALYSIS.md",
    "DATABASE_INDEX_ANALYSIS.md",
    "DATABASE_INDEX_QUICKREF.md",
    "FINAL_CRITICAL_ASSESSMENT.md",
    "PHASE1_CI_INFRASTRUCTURE_ANALYSIS.md",
    "PHASE1_QUICK_REFERENCE.md"
)

$targetDir = $targetDirs.Analysis
foreach ($file in $analysisFiles) {
    if (Test-Path $file) {
        $destination = Join-Path $targetDir (Split-Path $file -Leaf)
        Move-Item -Path $file -Destination $destination -Force
        Write-Host "[>] Moved: $file -> $destination" -ForegroundColor $txtSuccess
        $stats.FilesMoved++
    }
}

# Step 6: Move planning files
Write-StepHeader "Step 6: Moving Planning Files"

$planningFiles = @(
    "APP_OPERATIONS_DASHBOARDS_IMPLEMENTATION_PLAN.json",
    "CHART_OF_ACCOUNTS_ACTION_PLAN.md",
    "CHART_OF_ACCOUNTS_FIX_GUIDE.md",
    "CHART_OF_ACCOUNTS_QUICKREF.md",
    "REPO_CLEANUP_PLAN.md"
)

$targetDir = $targetDirs.Plans
foreach ($file in $planningFiles) {
    if (Test-Path $file) {
        $destination = Join-Path $targetDir (Split-Path $file -Leaf)
        Move-Item -Path $file -Destination $destination -Force
        Write-Host "[>] Moved: $file -> $destination" -ForegroundColor $txtSuccess
        $stats.FilesMoved++
    }
}

# Step 7: Handle scripts
Write-StepHeader "Step 7: Organizing Scripts"

Write-Host "`nScripts kept in root:" -ForegroundColor $txtInfo
$scriptsToKeep = @(
    "deploy-v2.ps1",
    "sync-drizzle-database.ps1",
    "sync-drizzle-journal.ps1"
)

foreach ($scriptFile in $scriptsToKeep) {
    if (Test-Path $scriptFile) {
        Write-Host "[K] Keeping: $scriptFile" -ForegroundColor $txtSuccess
        $stats.FilesKept++
    }
}

Write-Host "`nMoving scripts to scripts/ directory:" -ForegroundColor $txtInfo
$scriptsToMove = @(
    "create-enums.ps1",
    "run-k6-tests.ps1"
)

$targetDir = $targetDirs.Scripts
foreach ($scriptFile in $scriptsToMove) {
    if (Test-Path $scriptFile) {
        $destination = Join-Path $targetDir (Split-Path $scriptFile -Leaf)
        if (Test-Path $destination) {
            Write-Host "[!] Skipping (already exists): $scriptFile" -ForegroundColor $txtWarning
        } else {
            Move-Item -Path $scriptFile -Destination $destination -Force
            Write-Host "[>] Moved: $scriptFile -> $destination" -ForegroundColor $txtSuccess
            $stats.FilesMoved++
        }
    }
}

# Step 8: Generate summary
Write-StepHeader "Cleanup Complete - Summary"

Write-Host "Statistics:" -ForegroundColor $txtHeader
Write-Host "  Directories Created:  $($stats.DirectoriesCreated)" -ForegroundColor $txtInfo
Write-Host "  Files Kept in Root:   $($stats.FilesKept)" -ForegroundColor $txtSuccess
Write-Host "  Files Moved:          $($stats.FilesMoved)" -ForegroundColor $txtSuccess
Write-Host "  Files Deleted:        $($stats.FilesDeleted)" -ForegroundColor $txtWarning

Write-Host "`nNew Directory Structure:" -ForegroundColor $txtHeader
Write-Host "  docs/archive/implementations/ - Implementation and completion files" -ForegroundColor $txtInfo
Write-Host "  docs/archive/analysis/        - Analysis and assessment files" -ForegroundColor $txtInfo
Write-Host "  docs/archive/plans/           - Planning and tracking files" -ForegroundColor $txtInfo
Write-Host "  scripts/                      - Development and utility scripts" -ForegroundColor $txtInfo

Write-Host "`nFiles Remaining in Root:" -ForegroundColor $txtHeader
Write-Host "  README.md" -ForegroundColor $txtInfo
Write-Host "  INSTITUTIONAL_READINESS_COMPLETE.md" -ForegroundColor $txtInfo
Write-Host "  INSTITUTIONAL_READINESS_SUMMARY.md" -ForegroundColor $txtInfo
Write-Host "  deploy-v2.ps1" -ForegroundColor $txtInfo
Write-Host "  sync-drizzle-*.ps1" -ForegroundColor $txtInfo

Write-Host ""
Write-Host "[+] Repository cleanup completed successfully!" -ForegroundColor $txtSuccess
Write-Host ""

# Step 9: Create archive index files
Write-StepHeader "Step 9: Creating Archive Index Files"

$implIndex = Join-Path $targetDirs.Implementations "README.md"
if (-not (Test-Path $implIndex)) {
    $content = "# Implementation Archives`n`n"
    $content += "This directory contains all implementation completion reports, summaries, and quick references.`n`n"
    $content += "## Key Documents`n`n"
    
    $mdFiles = Get-ChildItem (Join-Path $targetDirs.Implementations "*.md") -ErrorAction SilentlyContinue
    foreach ($mdFile in $mdFiles) {
        $content += "- [$($mdFile.Name)]($($mdFile.Name))`n"
    }
    
    Set-Content -Path $implIndex -Value $content
    Write-Host "[+] Created: $implIndex" -ForegroundColor $txtSuccess
}

$analysisIdx = Join-Path $targetDirs.Analysis "README.md"
if (-not (Test-Path $analysisIdx)) {
    $content = "# Analysis Archives`n`n"
    $content += "This directory contains all analysis reports, assessments, and technical evaluations.`n`n"
    $content += "## Key Documents`n`n"
    
    $mdFiles = Get-ChildItem (Join-Path $targetDirs.Analysis "*.md") -ErrorAction SilentlyContinue
    foreach ($mdFile in $mdFiles) {
        $content += "- [$($mdFile.Name)]($($mdFile.Name))`n"
    }
    
    Set-Content -Path $analysisIdx -Value $content
    Write-Host "[+] Created: $analysisIdx" -ForegroundColor $txtSuccess
}

$plansIdx = Join-Path $targetDirs.Plans "README.md"
if (-not (Test-Path $plansIdx)) {
    $content = "# Planning Archives`n`n"
    $content += "This directory contains all project plans, action plans, and tracking documents.`n`n"
    $content += "## Key Documents`n`n"
    
    $mdFiles = Get-ChildItem (Join-Path $targetDirs.Plans "*.*") -ErrorAction SilentlyContinue
    foreach ($mdFile in $mdFiles) {
        $content += "- [$($mdFile.Name)]($($mdFile.Name))`n"
    }
    
    Set-Content -Path $plansIdx -Value $content
    Write-Host "[+] Created: $plansIdx" -ForegroundColor $txtSuccess
}

Write-Host "`n[+] Archive index files created" -ForegroundColor $txtSuccess
Write-Host ""
Write-Host "[+] Repository is now organized and ready!" -ForegroundColor $txtSuccess
Write-Host ""
