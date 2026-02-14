# Analyze ESLint errors and group by error type
$jsonData = Get-Content "api-errors.json" -Raw | ConvertFrom-Json

$errorStats = @{}
$fileErrors = @{}

foreach ($file in $jsonData) {
    if ($file.messages.Count -gt 0) {
        $filePath = $file.filePath -replace '.*\\app\\api\\', 'app/api/'
        $fileErrors[$filePath] = @()
        
        foreach ($msg in $file.messages) {
            $ruleId = $msg.ruleId
            if (-not $errorStats.ContainsKey($ruleId)) {
                $errorStats[$ruleId] = 0
            }
            $errorStats[$ruleId]++
            
            $fileErrors[$filePath] += @{
                line = $msg.line
                column = $msg.column
                message = $msg.message
                ruleId = $ruleId
                severity = $msg.severity
            }
        }
    }
}

Write-Host "`n=== ERROR STATISTICS ===" -ForegroundColor Cyan
$errorStats.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object {
    Write-Host "$($_.Key): $($_.Value)" -ForegroundColor Yellow
}

Write-Host "`n=== FILES WITH MOST ERRORS ===" -ForegroundColor Cyan
$fileErrors.GetEnumerator() | Sort-Object -Property { $_.Value.Count } -Descending | Select-Object -First 20 | ForEach-Object {
    Write-Host "$($_.Key): $($_.Value.Count) errors" -ForegroundColor Red
}

Write-Host "`n=== TOTAL ===" -ForegroundColor Cyan
Write-Host "Total files with errors: $($fileErrors.Count)" -ForegroundColor Green
Write-Host "Total errors: $($errorStats.Values | Measure-Object -Sum | Select-Object -ExpandProperty Sum)" -ForegroundColor Green
