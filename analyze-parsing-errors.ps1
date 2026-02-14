# Analyze parsing errors
$json = Get-Content eslint-results3.json -Raw | ConvertFrom-Json
$parsingErrors = @()

foreach ($result in $json) {
    if ($result.messages) {
        foreach ($msg in $result.messages) {
            if (-not $msg.ruleId -and $msg.severity -eq 2) {
                $parsingErrors += [PSCustomObject]@{
                    File = $result.filePath -replace '.*\\app\\api\\', 'app/api/'
                    Line = $msg.line
                    Column = $msg.column
                    Message = $msg.message
                }
            }
        }
    }
}

Write-Host "`nTotal parsing errors: $($parsingErrors.Count)" -ForegroundColor Red

# Group by message pattern
Write-Host "`nParsing error patterns:" -ForegroundColor Cyan
$parsingErrors | Group-Object Message | Sort-Object Count -Descending | Select-Object -First 10 | Format-Table Count, Name -AutoSize -Wrap

Write-Host "`nSample parsing errors (first 10):" -ForegroundColor Cyan
$parsingErrors | Select-Object -First 10 | Format-Table File, Line, Message -AutoSize -Wrap
