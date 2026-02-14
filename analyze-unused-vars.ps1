# Analyze remaining unused vars
$json = Get-Content eslint-results2.json -Raw | ConvertFrom-Json
$unusedVars = @()

foreach ($result in $json) {
    if ($result.messages) {
        foreach ($msg in $result.messages) {
            if ($msg.ruleId -eq '@typescript-eslint/no-unused-vars') {
                $unusedVars += [PSCustomObject]@{
                    File = $result.filePath -replace '.*\\app\\api\\', 'app/api/'
                    Line = $msg.line
                    Message = $msg.message
                }
            }
        }
    }
}

Write-Host "`nTotal unused vars: $($unusedVars.Count)" -ForegroundColor Yellow

# Group by message pattern
Write-Host "`nUnused var patterns:" -ForegroundColor Cyan
$patterns = $unusedVars | ForEach-Object {
    if ($_.Message -match "'(\w+)' is assigned a value but never used") {
        "Variable: $($matches[1])"
    } elseif ($_.Message -match "'(\w+)' is defined but never used") {
        "Definition: $($matches[1])"
    } else {
        $_.Message
    }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 20

$patterns | Format-Table Count, Name -AutoSize

# Sample first 10
Write-Host "`nSample unused vars:" -ForegroundColor Cyan
$unusedVars | Select-Object -First 10 | Format-Table -AutoSize
