# Remove PowerShell code that was accidentally inserted into TypeScript files

$ErrorActionPreference = "Stop"
$files = Get-ChildItem -Path "lib" -Filter "*.ts" -Recurse | Where-Object { $_.FullName -notmatch "\\services\\" }

$fixedCount = 0
$pattern = '^\s*param\(\$match\)[\s\S]*?\);?\s*$'

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Remove the PowerShell script blocks that were accidentally inserted
    # They typically look like:
    #     param($match)
    #     $body = $match.Groups[1].Value
    #     ...
    #     );
    
    # Multi-line pattern to remove the PowerShell blocks
    $content = $content -replace '(?m)^\s*param\(\$match\)[\s\S]*?^\s*\}\s*else\s*\{\s*^\s*\$match\.Value\s*^\s*\}\s*^\s*\);?\s*', ''
    
    # Simpler pattern if the above doesn't work
    $lines = $content -split "`r?`n"
    $cleanedLines = @()
    $skipMode = $false
    
    foreach ($line in $lines) {
        if ($line -match '^\s*param\(\$match\)') {
            $skipMode = $true
            continue
        }
        if ($skipMode -and $line -match '^\s*\);?\s*$') {
            $skipMode = $false
            continue
        }
        if (-not $skipMode) {
            $cleanedLines += $line
        }
    }
    
    $content = $cleanedLines -join "`r`n"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $fixedCount++
        Write-Host "Cleaned: $($file.Name)"
    }
}

Write-Host "`nCleaned $fixedCount files"
