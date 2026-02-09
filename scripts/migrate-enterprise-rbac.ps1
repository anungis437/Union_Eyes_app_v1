# Enterprise RBAC to Canonical Auth Migration Script
# Migrates all files from @/lib/enterprise-role-middleware to @/lib/api-auth-guard

Write-Host "================================"
Write-Host "Enterprise RBAC Migration Script"
Write-Host "================================"
Write-Host ""

# Get all TypeScript files in app/api
Write-Host "Scanning for files..."
$files = Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" -File

$migratedCount = 0
$skippedCount = 0
$errors = @()

Write-Host "Found $($files.Count) total files"
Write-Host ""

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        # Check if file uses enterprise-role-middleware
        if ($content -match "@/lib/enterprise-role-middleware") {
            $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
            Write-Host "[Migrating] $relativePath"
            
            # Replace import path
            $newContent = $content -replace "from ['`"]@/lib/enterprise-role-middleware['`"]", "from '@/lib/api-auth-guard'"
            
            # Verify that the replacement actually changed something
            if ($newContent -ne $content) {
                # Write back to file
                Set-Content -Path $file.FullName -Value $newContent -NoNewline
                
                $migratedCount++
                Write-Host "  [OK] Migrated successfully"
            }
            else {
                Write-Host "  [SKIP] No changes made (pattern not found)"
                $skippedCount++
            }
        }
    }
    catch {
        $errors += @{
            File = $file.FullName
            Error = $_.Exception.Message
        }
        Write-Host "  [ERROR] $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "================================"
Write-Host "Migration Complete!"
Write-Host "================================"
Write-Host ""
Write-Host "Statistics:"
Write-Host "  Files scanned:  $($files.Count)"
Write-Host "  Files migrated: $migratedCount"
Write-Host "  Skipped:        $skippedCount"
Write-Host "  Errors:         $($errors.Count)"
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "Errors encountered:"
    Write-Host ""
    foreach ($error in $errors) {
        $relativePath = $error.File.Replace((Get-Location).Path + '\', '')
        Write-Host "  File: $relativePath"
        Write-Host "  Error: $($error.Error)"
        Write-Host ""
    }
}

if ($migratedCount -gt 0) {
    Write-Host "Next Steps:"
    Write-Host ""
    Write-Host "1. Run type check:"
    Write-Host "   pnpm tsc --noEmit"
    Write-Host ""
    Write-Host "2. Run tests:"
    Write-Host "   pnpm test"
    Write-Host ""
    Write-Host "3. Manual testing:"
    Write-Host "   Test a few migrated API routes manually"
    Write-Host ""
    Write-Host "4. Commit changes:"
    Write-Host "   git add ."
    Write-Host '   git commit -m "Migrate enterprise RBAC to canonical api-auth-guard"'
    Write-Host ""
    
    # Ask if user wants to run type check
    Write-Host ""
    $response = Read-Host "Would you like to run TypeScript type check now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "Running type check..."
        pnpm tsc --noEmit
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Type check passed!"
        }
        else {
            Write-Host "[ERROR] Type check failed. Please review the errors above."
        }
    }
}
else {
    Write-Host "No files needed migration"
    Write-Host ""
    Write-Host "This could mean:"
    Write-Host "  - Migration was already completed"
    Write-Host "  - No files use enterprise-role-middleware"
    Write-Host ""
}
