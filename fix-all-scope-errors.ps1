# Fix all logger.error scope issues in API routes
# Removes userId, organizationId, clauseId, etc. from logger.error calls in catch blocks

$files = @(
    "app\api\ai\search\route.ts",
    "app\api\analytics\claims\categories\route.ts",
    "app\api\analytics\claims\stewards\route.ts",
    "app\api\analytics\claims\trends\route.ts",
    "app\api\analytics\deadlines-metrics\route.ts",
    "app\api\analytics\executive\route.ts",
    "app\api\analytics\financial\categories\route.ts",
    "app\api\analytics\financial\costs\route.ts",
    "app\api\analytics\financial\outcomes\route.ts",
    "app\api\analytics\financial\route.ts",
    "app\api\analytics\financial\trends\route.ts",
    "app\api\analytics\heatmap\route.ts",
    "app\api\analytics\members\churn-risk\route.ts",
    "app\api\analytics\members\cohorts\route.ts",
    "app\api\analytics\members\route.ts",
    "app\api\analytics\members\trends\route.ts",
    "app\api\analytics\refresh\route.ts",
    "app\api\calendar-sync\google\callback\route.ts",
    "app\api\calendar-sync\microsoft\callback\route.ts",
    "app\api\claims\[id]\route.ts",
    "app\api\claims\[id]\status\route.ts",
    "app\api\claims\[id]\updates\route.ts",
    "app\api\claims\[id]\workflow\history\route.ts",
    "app\api\claims\[id]\workflow\route.ts",
    "app\api\claims\route.ts",
    "app\api\clause-library\[id]\route.ts",
    "app\api\clause-library\[id]\share\route.ts",
    "app\api\clause-library\[id]\tags\route.ts",
    "app\api\clause-library\compare\route.ts",
    "app\api\clause-library\route.ts",
    "app\api\clause-library\search\route.ts",
    "app\api\deadlines\compliance\route.ts",
    "app\api\deadlines\overdue\route.ts",
    "app\api\deadlines\route.ts",
    "app\api\exports\[id]\route.ts",
    "app\api\exports\csv\route.ts",
    "app\api\exports\excel\route.ts",
    "app\api\exports\pdf\route.ts",
    "app\api\extensions\[id]\route.ts",
    "app\api\jurisdiction\clc-compliance\route.ts",
    "app\api\jurisdiction\validate-deadline\route.ts",
    "app\api\meeting-rooms\[id]\bookings\route.ts",
    "app\api\meeting-rooms\route.ts",
    "app\api\members\[id]\claims\route.ts",
    "app\api\members\[id]\route.ts",
    "app\api\members\me\route.ts",
    "app\api\ml\predictions\claim-outcome\route.ts",
    "app\api\ml\predictions\timeline\route.ts",
    "app\api\ml\query\route.ts",
    "app\api\ml\recommendations\route.ts",
    "app\api\notifications\[id]\route.ts",
    "app\api\notifications\mark-all-read\route.ts",
    "app\api\notifications\preferences\route.ts",
    "app\api\notifications\route.ts",
    "app\api\notifications\test\route.ts",
    "app\api\organizations\[id]\access-logs\route.ts",
    "app\api\organizations\[id]\analytics\route.ts",
    "app\api\organizations\[id]\ancestors\route.ts",
    "app\api\organizations\[id]\children\route.ts",
    "app\api\organizations\[id]\descendants\route.ts",
    "app\api\organizations\[id]\members\route.ts",
    "app\api\organizations\[id]\path\route.ts",
    "app\api\organizations\[id]\route.ts",
    "app\api\organizations\[id]\sharing-settings\route.ts",
    "app\api\organizations\route.ts",
    "app\api\organizations\search\route.ts",
    "app\api\organizations\tree\route.ts",
    "app\api\organizing\campaigns\route.ts",
    "app\api\organizing\card-check\route.ts",
    "app\api\organizing\support-percentage\route.ts",
    "app\api\pension\benefits\route.ts",
    "app\api\pension\plans\[id]\route.ts",
    "app\api\pension\plans\route.ts",
    "app\api\pension\retirement-eligibility\route.ts",
    "app\api\portal\dues\balance\route.ts",
    "app\api\portal\dues\pay\route.ts",
    "app\api\reports\[id]\route.ts",
    "app\api\reports\[id]\run\route.ts",
    "app\api\reports\builder\route.ts",
    "app\api\reports\datasources\route.ts",
    "app\api\reports\execute\route.ts",
    "app\api\reports\route.ts",
    "app\api\reports\templates\route.ts",
    "app\api\strike\eligibility\route.ts",
    "app\api\strike\funds\route.ts",
    "app\api\strike\stipends\route.ts",
    "app\api\tax\slips\route.ts",
    "app\api\tax\t4a\route.ts",
    "app\api\tenant\current\route.ts",
    "app\api\tenant\switch\route.ts",
    "app\api\upload\route.ts",
    "app\api\user\status\route.ts",
    "app\api\voice\transcribe\route.ts",
    "app\api\voice\upload\route.ts",
    "app\api\workflow\overdue\route.ts"
)

$fixed = 0
$skipped = 0
$errors = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP: $file (not found)" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    try {
        $content = Get-Content $fullPath | Out-String
        $originalContent = $content
        
        # Pattern 1: Remove userId,
        $content = $content -replace '(\s+)userId,\s*\r?\n', ''
        
        # Pattern 2: Remove organizationId,
        $content = $content -replace '(\s+)organizationId,\s*\r?\n', ''
        
        # Pattern 3: Remove clauseId,
        $content = $content -replace '(\s+)clauseId,\s*\r?\n', ''
        
        # Pattern 4: Remove precedentId,
        $content = $content -replace '(\s+)precedentId,\s*\r?\n', ''
        
        # Pattern 5: Remove claimId,
        $content = $content -replace '(\s+)claimId,\s*\r?\n', ''
        
        # Pattern 6: Remove userOrgId,
        $content = $content -replace '(\s+)userOrgId,\s*\r?\n', ''
        
        # Pattern 7: Remove memberIds,
        $content = $content -replace '(\s+)memberIds,\s*\r?\n', ''
        
        # Pattern 8: Remove campaignId,
        $content = $content -replace '(\s+)campaignId,\s*\r?\n', ''
        
        # Pattern 9: Remove reportId,
        $content = $content -replace '(\s+)reportId,\s*\r?\n', ''
        
        # Pattern 10: Remove body reference
        $content = $content -replace '(\s+)updates:\s*body\s*\?\s*Object\.keys\(body\)\s*:\s*\[\],?\s*\r?\n', ''
        
        if ($content -ne $originalContent) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            Write-Host "FIXED: $file" -ForegroundColor Green
            $fixed++
        } else {
            Write-Host "SKIP: $file (no changes needed)" -ForegroundColor Gray
            $skipped++
        }
    } catch {
        Write-Host "ERROR: $file - $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Fixed: $fixed files" -ForegroundColor Green
Write-Host "  Skipped: $skipped files" -ForegroundColor Yellow
Write-Host "  Errors: $errors files" -ForegroundColor Red
Write-Host "==================================" -ForegroundColor Cyan
