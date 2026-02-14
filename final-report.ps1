# Final ESLint Error Report
$json = Get-Content eslint-final.json -Raw | ConvertFrom-Json
$allErrors = @()

foreach ($result in $json) {
    if ($result.messages) {
        foreach ($msg in $result.messages) {
            $allErrors += [PSCustomObject]@{
                File = $result.filePath -replace '.*\\app\\api\\', ''
                Line = $msg.line
                RuleId = $msg.ruleId
                Severity = if ($msg.severity -eq 2) { 'error' } else { 'warning' }
                Message = $msg.message
            }
        }
    }
}

$errors = $allErrors | Where-Object { $_.Severity -eq 'error' }
$warnings = $allErrors | Where-Object { $_.Severity -eq 'warning' }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ESLINT ERROR SUMMARY - app/api/**/*.ts" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Total Problems: $($allErrors.Count)" -ForegroundColor Yellow
Write-Host "  Errors: $($errors.Count)" -ForegroundColor Red
Write-Host "  Warnings: $($warnings.Count)" -ForegroundColor Yellow

Write-Host "`n=== ERROR BREAKDOWN ===" -ForegroundColor Red
$errors | Group-Object RuleId | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Count.ToString().PadLeft(4)) - $($_.Name)" -ForegroundColor Red
}

Write-Host "`n=== WARNING BREAKDOWN ===" -ForegroundColor Yellow
$warnings | Group-Object RuleId | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Count.ToString().PadLeft(4)) - $($_.Name)" -ForegroundColor Yellow
}

Write-Host "`n=== FILES WITH MOST ERRORS ===" -ForegroundColor Red
$errors | Group-Object File | Sort-Object Count -Descending | Select-Object -First 15 | ForEach-Object {
    Write-Host "  $($_.Count.ToString().PadLeft(3)) errors - $($_.Name)" -ForegroundColor Red
}

Write-Host "`n"
