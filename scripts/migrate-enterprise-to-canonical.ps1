# Enterprise RBAC to Canonical Auth Migration Script
# Migrates all files from @/lib/enterprise-role-middleware to @/lib/api-auth-guard

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Enterprise RBAC Migration Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get all TypeScript files in app/api
Write-Host "Scanning for files..." -ForegroundColor Yellow
$files = Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" -File

$migratedCount = 0
$skippedCount = 0
$errors = @()

Write-Host "Found $($files.Count) total files" -ForegroundColor Green
Write-Host ""

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        # Check if file uses enterprise-role-middleware
        if ($content -match "@/lib/enterprise-role-middleware") {
            $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
            Write-Host "📝 Migrating: $relativePath" -ForegroundColor Cyan
            
            # Replace import path
            $newContent = $content -replace `
                "from ['`"]@/lib/enterprise-role-middleware['`"]", `
                "from '@/lib/api-auth-guard'"
            
            # Verify that the replacement actually changed something
            if ($newContent -ne $content) {
                # Write back to file
                Set-Content -Path $file.FullName -Value $newContent -NoNewline
                
                $migratedCount++
                Write-Host "   ✅ Migrated successfully" -ForegroundColor Green
            }
            else {
                Write-Host "   ⚠️  No changes made (pattern not found)" -ForegroundColor Yellow
                $skippedCount++
            }
        }
    }
    catch {
        $errors += @{
            File = $file.FullName
            Error = $_.Exception.Message
        }
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Statistics:" -ForegroundColor Cyan
Write-Host "   Files scanned:  $($files.Count)"
Write-Host "   Files migrated: $migratedCount" -ForegroundColor Green
Write-Host "   Skipped:        $skippedCount" -ForegroundColor Yellow
Write-Host "   Errors:         $($errors.Count)" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "❌ Errors encountered:" -ForegroundColor Red
    Write-Host ""
    foreach ($error in $errors) {
        $relativePath = $error.File.Replace((Get-Location).Path + '\', '')
        Write-Host "   📄 $relativePath" -ForegroundColor Yellow
        Write-Host "      Error: $($error.Error)" -ForegroundColor Red
        Write-Host ""
    }
}

if ($migratedCount -gt 0) {
    Write-Host "✅ Next Steps:" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Run type check:" -ForegroundColor Cyan
    Write-Host "   pnpm tsc --noEmit" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Run tests:" -ForegroundColor Cyan
    Write-Host "   pnpm test" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Manual testing:" -ForegroundColor Cyan
    Write-Host "   Test a few migrated API routes manually" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Commit changes:" -ForegroundColor Cyan
    Write-Host "   git add ." -ForegroundColor White
    Write-Host '   git commit -m "Migrate enterprise-role-middleware to canonical api-auth-guard"' -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host "ℹ️  No files needed migration" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This could mean:" -ForegroundColor Cyan
    Write-Host "   - Migration was already completed" -ForegroundColor White
    Write-Host "   - No files use enterprise-role-middleware" -ForegroundColor White
    Write-Host ""
}

# Ask if user wants to run type check
if ($migratedCount -gt 0) {
    Write-Host ""
    $response = Read-Host "Would you like to run TypeScript type check now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "Running type check..." -ForegroundColor Yellow
        pnpm tsc --noEmit
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Type check passed!" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Type check failed. Please review the errors above." -ForegroundColor Red
        }
    }
}
