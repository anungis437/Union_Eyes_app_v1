# Clean up outdated documentation files
$archivePath = "archive\old-phase-docs"

# Create archive directory
Write-Host "Creating archive directory..."
New-Item -ItemType Directory -Path $archivePath -Force | Out-Null

# Files to archive
$filesToArchive = @(
    "EXECUTIVE_STATUS_REPORT.md",
    "PLATFORM_READINESS_VALIDATION.md",
    "PHASE_1_COMPLETE.md",
    "PHASE_1_NEXT_STEPS.md",
    "PHASE_1_PROGRESS.md",
    "PHASE_2_AREA_1_COMPLETE.md",
    "PHASE_2_ROADMAP.md",
    "PHASE_4_KICKOFF_STATUS.md",
    "PHASE_4_NEXT_STEPS.md",
    "PHASE_4_PROGRESS_UPDATE.md",
    "PHASE_4_ROADMAP.md",
    "PHASE_5A_BUILD_SUCCESS.md",
    "PHASE_5A_ORG_UI_COMPLETE.md",
    "PHASE_5A_PROGRESS.md",
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
    "WEEK_7-8_PAYMENT_PROCESSING_COMPLETE.md",
    "WEEK_11_WORKFLOWS_COMPLETE.md",
    "WEEK_12_TEST_FIXES_NEEDED.md",
    "IMMEDIATE_ACTION_PLAN.md",
    "NEXT_STEPS.md",
    "WORKFLOW_TEST_PLAN.md",
    "FRONTEND_PROGRESS.md",
    "INTEGRATION_VALIDATION.md",
    "MIGRATION_PROGRESS.md",
    "test-workflow-manual.ps1",
    "test-workflow-manual-simple.ps1",
    "test-workflow.js"
)

$movedCount = 0
$notFoundCount = 0

# Move files
foreach ($file in $filesToArchive) {
    if (Test-Path $file) {
        Write-Host "Moving: $file"
        Move-Item -Path $file -Destination $archivePath -Force
        $movedCount++
    } else {
        Write-Host "Not found: $file"
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "Cleanup Summary"
Write-Host "Moved: $movedCount files"
Write-Host "Not found: $notFoundCount files"
Write-Host ""
Write-Host "Archived files are in: $archivePath"
