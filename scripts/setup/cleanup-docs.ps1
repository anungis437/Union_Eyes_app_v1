# Repository Cleanup Script
# Moves outdated documentation files to archive

$archivePath = "archive\old-phase-docs"

# Create archive directory
if (!(Test-Path $archivePath)) {
    New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
    Write-Host "Created archive directory: $archivePath"
}

# Files to archive - outdated progress reports and status documents
$filesToArchive = @(
    "EXECUTIVE_STATUS_REPORT.md",
    "PLATFORM_READINESS_VALIDATION.md",
    "PHASE_1_COMPLETE.md",
    "PHASE_1_PROGRESS.md",
    "PHASE_1_NEXT_STEPS.md",
    "PHASE_1_3_VALIDATION_COMPLETE.md",
    "PHASE_1_3_VALIDATION_GUIDE.md",
    "PHASE_2_AREA_1_COMPLETE.md",
    "PHASE_2_ROADMAP.md",
    "PHASE_4_KICKOFF_STATUS.md",
    "PHASE_4_NEXT_STEPS.md",
    "PHASE_4_PROGRESS_UPDATE.md",
    "PHASE_4_ROADMAP.md",
    "PHASE_5A_BUILD_SUCCESS.md",
    "PHASE_5A_ORG_UI_COMPLETE.md",
    "PHASE_5A_PROGRESS.md",
    "PHASE_5A-B-C_VALIDATION.md",
    "PHASE_5B_COMPLETE.md",
    "PHASE_5B_PROGRESS.md",
    "PHASE_5B_ROADMAP.md",
    "PHASE_5B_SUMMARY.md",
    "PHASE_5B_TASK3_STATUS.md",
    "PHASE_5C_PROGRESS.md",
    "PHASE_5C_ROADMAP.md",
    "PHASE_5C_SESSION_3_PROGRESS.md",
    "PHASE_5C_SESSION_4_PROGRESS.md",
    "PHASE_5C_SESSION_5_COMPLETE.md",
    "PHASE_5D_COMPLETE.md",
    "PHASE_5D_PROGRESS.md",
    "PHASE_5D_SESSION_4_PROGRESS.md",
    "WEEK_7-8_PAYMENT_PROCESSING_COMPLETE.md",
    "WEEK_11_WORKFLOWS_COMPLETE.md",
    "WEEK_12_TEST_FIXES_NEEDED.md",
    "IMMEDIATE_ACTION_PLAN.md",
    "NEXT_STEPS.md",
    "WORKFLOW_TEST_PLAN.md"
)

$movedCount = 0
$notFoundCount = 0

foreach ($file in $filesToArchive) {
    if (Test-Path $file) {
        try {
            Move-Item -Path $file -Destination $archivePath -Force
            Write-Host "✓ Archived: $file" -ForegroundColor Green
            $movedCount++
        }
        catch {
            Write-Host "✗ Failed to archive: $file" -ForegroundColor Red
            Write-Host "  Error: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "- Not found: $file" -ForegroundColor Gray
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "=== Cleanup Summary ===" -ForegroundColor Cyan
Write-Host "Moved: $movedCount files" -ForegroundColor Green
Write-Host "Not found: $notFoundCount files" -ForegroundColor Gray
Write-Host ""
Write-Host "Remaining documentation files are current and should be kept."
Write-Host "Archived files can be found in: $archivePath"
