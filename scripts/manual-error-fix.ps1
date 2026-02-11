# Manual error pattern fixes for remaining unconverted errors
# Targets specific patterns that the TypeScript script couldn't match

$files = @(
    "app\api\social-media\analytics\route.ts",
    "app\api\social-media\accounts\route.ts",
    "app\api\social-media\campaigns\route.ts",
    "app\api\social-media\feed\route.ts"
)

foreach ($file in $files) {
    $path = Join-Path $PSScriptRoot "..\$file"
    if (Test-Path $path) {
        Write-Host "Processing: $file" -ForegroundColor Cyan
        $content = Get-Content $path -Raw
        $originalContent = $content
        
        # Pattern 1: 403 'No organization found'
        $content = $content -replace "return NextResponse\.json\(\s*\{\s*error:\s*'No organization found'\s*\},\s*\{\s*status:\s*403\s*\}\s*\);", "return standardErrorResponse(`n          ErrorCode.FORBIDDEN,`n          'No organization found'`n        );"
        
        # Pattern 2: 403 'Unauthorized'
        $content = $content -replace "return NextResponse\.json\(\s*\{\s*error:\s*'Unauthorized'\s*\},\s*\{\s*status:\s*403\s*\}\s*\);", "return standardErrorResponse(`n          ErrorCode.FORBIDDEN,`n          'Unauthorized'`n        );"
        
        # Pattern 3: 400 'Unsupported platform'
        $content = $content -replace "return NextResponse\.json\(\s*\{\s*error:\s*'Unsupported platform'\s*\},\s*\{\s*status:\s*400\s*\}\s*\);", "return standardErrorResponse(`n            ErrorCode.VALIDATION_ERROR,`n            'Unsupported platform'`n          );"
        
        if ($content -ne $originalContent) {
            Set-Content $path -Value $content -NoNewline
            Write-Host "  Updated" -ForegroundColor Green
        } else {
            Write-Host "  No changes needed" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nManual fix complete" -ForegroundColor Green
