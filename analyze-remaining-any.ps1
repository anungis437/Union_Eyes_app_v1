# Analyze remaining explicit any errors
$json = Get-Content eslint-results2.json -Raw | ConvertFrom-Json
$anyErrors = @()

foreach ($result in $json) {
    if ($result.messages) {
        foreach ($msg in $result.messages) {
            if ($msg.ruleId -eq '@typescript-eslint/no-explicit-any') {
                $anyErrors += [PSCustomObject]@{
                    File = $result.filePath
                    Line = $msg.line
                    Column = $msg.column
                    Message = $msg.message
                }
            }
        }
    }
}

Write-Host "`nTotal explicit any errors: $($anyErrors.Count)" -ForegroundColor Yellow

# Sample first 30 errors
Write-Host "`nFirst 30 errors:" -ForegroundColor Cyan
$anyErrors | Select-Object -First 30 | Format-Table -AutoSize

# Group by message pattern
Write-Host "`nError patterns:" -ForegroundColor Cyan
$anyErrors | Group-Object Message | Sort-Object Count -Descending | Format-Table Count, Name -AutoSize
