# UnionEyes Package Rebranding Script
# This script rebrands all @courtlens and @court-lens packages to @unioneyes

$packagesDir = "D:\APPS\union-claims-standalone\UnionEyes\packages"
$packages = @("auth", "multi-tenant", "types", "workflow", "ui", "supabase", "shared")

Write-Host "🔄 Starting package rebranding process..." -ForegroundColor Cyan
Write-Host ""

foreach ($package in $packages) {
    $packagePath = Join-Path $packagesDir $package
    
    if (Test-Path $packagePath) {
        Write-Host "📦 Processing package: $package" -ForegroundColor Yellow
        
        # Get all text files (excluding node_modules and dist)
        $files = Get-ChildItem -Path $packagePath -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.md |
                 Where-Object { $_.FullName -notmatch 'node_modules' -and $_.FullName -notmatch 'dist' }
        
        $fileCount = 0
        $replaceCount = 0
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            
            if ($content) {
                $originalContent = $content
                
                # Replace all variations
                $content = $content -replace '@courtlens/', '@unioneyes/'
                $content = $content -replace '@court-lens/', '@unioneyes/'
                $content = $content -replace 'courtlens', 'unioneyes'
                $content = $content -replace 'court-lens', 'unioneyes'
                $content = $content -replace 'CourtLens', 'UnionEyes'
                $content = $content -replace 'Court Lens', 'UnionEyes'
                
                # Only write if changes were made
                if ($content -ne $originalContent) {
                    Set-Content $file.FullName -Value $content -NoNewline
                    $fileCount++
                    
                    # Count replacements
                    $differences = Compare-Object ($originalContent -split "`n") ($content -split "`n")
                    $replaceCount += ($differences | Measure-Object).Count
                }
            }
        }
        
        Write-Host "   ✓ Updated $fileCount files with $replaceCount changes" -ForegroundColor Green
        Write-Host ""
    }
    else {
        Write-Host "   ⚠ Package not found: $packagePath" -ForegroundColor Red
    }
}

Write-Host "✅ Package rebranding complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create pnpm-workspace.yaml" -ForegroundColor White
Write-Host "2. Update tsconfig.json with path mappings" -ForegroundColor White
Write-Host "3. Run: pnpm install" -ForegroundColor White
