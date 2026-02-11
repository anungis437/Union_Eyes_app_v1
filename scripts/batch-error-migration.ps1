# Batch migrate remaining error patterns by domain

$replacements = @(
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*"No organization context"\s*\},\s*\{\s*status:\s*400\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, "No organization context");'
        Name = "No organization context (400)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*"No active organization"\s*\},\s*\{\s*status:\s*400\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.MISSING_REQUIRED_FIELD, "No active organization");'
        Name = "No active organization (400)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''Organization context required''\s*\},\s*\{\s*status:\s*403\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.FORBIDDEN, ''Organization context required'');'
        Name = "Organization context required (403)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''Tenant context required''\s*\},\s*\{\s*status:\s*403\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.FORBIDDEN, ''Tenant context required'');'
        Name = "Tenant context required (403)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''Admin access required''\s*\},\s*\{\s*status:\s*403\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.FORBIDDEN, ''Admin access required'');'
        Name = "Admin access required (403)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''Forbidden''\s*\},\s*\{\s*status:\s*403\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.FORBIDDEN, ''Forbidden'');'
        Name = "Forbidden (403)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''Invalid JSON in request body''\s*\},\s*\{\s*status:\s*400\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.VALIDATION_ERROR, ''Invalid JSON in request body'');'
        Name = "Invalid JSON (400)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''Invalid request body''\s*\},\s*\{\s*status:\s*400\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.VALIDATION_ERROR, ''Invalid request body'');'
        Name = "Invalid request body (400)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''No file uploaded''\s*\},\s*\{\s*status:\s*400\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.VALIDATION_ERROR, ''No file uploaded'');'
        Name = "No file uploaded (400)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''No files provided''\s*\},\s*\{\s*status:\s*400\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.VALIDATION_ERROR, ''No files provided'');'
        Name = "No files provided (400)"
    },
    @{
        Pattern = 'NextResponse\.json\(\s*\{\s*error:\s*''No file provided''\s*\},\s*\{\s*status:\s*400\s*\}\s*\);'
        Replacement = 'standardErrorResponse(ErrorCode.VALIDATION_ERROR, ''No file provided'');'
        Name = "No file provided (400)"
    }
)

$files = Get-ChildItem -Path "app\api" -Filter "*.ts" -Recurse | Where-Object { $_.FullName -notmatch 'node_modules' }

$totalChanges = 0
$filesModified = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fileChanges = 0
    
    foreach ($replacement in $replacements) {
        $matches = [regex]::Matches($content, $replacement.Pattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $replacement.Pattern, $replacement.Replacement
            $fileChanges += $matches.Count
            Write-Host "  $($file.Name): Fixed $($matches.Count) x $($replacement.Name)" -ForegroundColor Gray
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName -Value $content -NoNewline
        $totalChanges += $fileChanges
        $filesModified++
        Write-Host "[UPDATED] $($file.FullName) - $fileChanges changes" -ForegroundColor Green
    }
}

Write-Host "`nMigration complete:" -ForegroundColor Cyan
Write-Host "  Files modified: $filesModified" -ForegroundColor Yellow
Write-Host "  Total changes: $totalChanges" -ForegroundColor Yellow
