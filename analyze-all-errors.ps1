# Analyze ALL errors by rule
$json = Get-Content eslint-results3.json -Raw | ConvertFrom-Json
$allErrors = @()

foreach ($result in $json) {
    if ($result.messages) {
        foreach ($msg in $result.messages) {
            $allErrors += [PSCustomObject]@{
                File = $result.filePath -replace '.*\\app\\api\\', 'app/api/'
                Line = $msg.line
                RuleId = $msg.ruleId
                Severity = if ($msg.severity -eq 2) { 'error' } else { 'warning' }
                Message = $msg.message
            }
        }
    }
}

Write-Host "`nTotal problems: $($allErrors.Count)" -ForegroundColor Yellow
Write-Host "Errors: $(($allErrors | Where-Object { $_.Severity -eq 'error' }).Count)" -ForegroundColor Red
Write-Host "Warnings: $(($allErrors | Where-Object { $_.Severity -eq 'warning' }).Count)" -ForegroundColor Yellow

Write-Host "`n=== ERROR Rules (top 10) ===" -ForegroundColor Red
$allErrors | Where-Object { $_.Severity -eq 'error' } | Group-Object RuleId | Sort-Object Count -Descending | Select-Object -First 10 | Format-Table Count, Name -AutoSize

Write-Host "`n=== WARNING Rules (top 15) ===" -ForegroundColor Yellow
$allErrors | Where-Object { $_.Severity -eq 'warning' } | Group-Object RuleId | Sort-Object Count -Descending | Select-Object -First 15 | Format-Table Count, Name -AutoSize
