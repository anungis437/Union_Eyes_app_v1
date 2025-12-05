# Fix scope errors in dynamic [id] routes

$files = Get-ChildItem -Path "app\api" -Recurse -Filter "*route.ts" | Where-Object { $_.DirectoryName -like "*[[]id[]]*" }

$fixed = 0
$skipped = 0

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName | Out-String
        $originalContent = $content
        
        # Remove all out-of-scope variables from logger.error calls
        $content = $content -replace '(\s+)userId,\s*\r?\n', ''
        $content = $content -replace '(\s+)organizationId,\s*\r?\n', ''
        $content = $content -replace '(\s+)clauseId,\s*\r?\n', ''
        $content = $content -replace '(\s+)precedentId,\s*\r?\n', ''
        $content = $content -replace '(\s+)claimId,\s*\r?\n', ''
        $content = $content -replace '(\s+)userOrgId,\s*\r?\n', ''
        $content = $content -replace '(\s+)memberIds,\s*\r?\n', ''
        $content = $content -replace '(\s+)campaignId,\s*\r?\n', ''
        $content = $content -replace '(\s+)reportId,\s*\r?\n', ''
        $content = $content -replace '(\s+)eventId,\s*\r?\n', ''
        $content = $content -replace '(\s+)sessionId,\s*\r?\n', ''
        $content = $content -replace '(\s+)bookingId,\s*\r?\n', ''
        $content = $content -replace '(\s+)updates:\s*body\s*\?\s*Object\.keys\(body\)\s*:\s*\[\],?\s*\r?\n', ''
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "FIXED: $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Green
            $fixed++
        } else {
            $skipped++
        }
    } catch {
        Write-Host "ERROR: $($file.Name) - $_" -ForegroundColor Red
    }
}

Write-Host "`nFixed: $fixed files, Skipped: $skipped files" -ForegroundColor Cyan
