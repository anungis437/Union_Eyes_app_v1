# Legacy Auth Imports Migration Script
# Migrates files from @/lib/auth/unified-auth and @/lib/auth to @/lib/api-auth-guard

Write-Host "================================"
Write-Host "Legacy Auth Migration Script"
Write-Host "================================"
Write-Host ""

$files = Get-ChildItem -Path "app\api" -Recurse -Filter "*.ts" -File
$migratedCount = 0
$errors = @()

Write-Host "Phase 1: Migrating from @/lib/auth/unified-auth..."
Write-Host ""

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        
        if ($content -match "@/lib/auth/unified-auth") {
            $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
            Write-Host "[Migrating] $relativePath"
            
            $newContent = $content -replace "from ['`"]@/lib/auth/unified-auth['`"]", "from '@/lib/api-auth-guard'"
            
            if ($newContent -ne $content) {
                Set-Content -Path $file.FullName -Value $newContent -NoNewline
                $migratedCount++
                Write-Host "  [OK] Migrated from unified-auth"
            }
        }
    }
    catch {
        $errors += @{
            File = $file.FullName
            Error = $_.Exception.Message
        }
    }
}

Write-Host ""
Write-Host "Phase 1 Complete: $migratedCount files migrated from unified-auth"
Write-Host ""

$phase2Count = 0
Write-Host "Phase 2: Migrating from @/lib/auth (direct imports)..."
Write-Host ""

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        
        # Match @/lib/auth but NOT @/lib/auth/unified-auth or @/lib/api-auth-guard
        if ($content -match "from ['`"]@/lib/auth['`"]" -and $content -notmatch "@/lib/auth/unified-auth" -and $content -notmatch "@/lib/api-auth-guard") {
            $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
            Write-Host "[Migrating] $relativePath"
            
            # Replace getUserFromRequest with getCurrentUser
            $newContent = $content -replace "getUserFromRequest", "getCurrentUser"
            
            # Replace the import path
            $newContent = $newContent -replace "from ['`"]@/lib/auth['`"]", "from '@/lib/api-auth-guard'"
            
            if ($newContent -ne $content) {
                Set-Content -Path $file.FullName -Value $newContent -NoNewline
                $phase2Count++
                Write-Host "  [OK] Migrated from lib/auth"
            }
        }
    }
    catch {
        $errors += @{
            File = $file.FullName
            Error = $_.Exception.Message
        }
    }
}

$totalMigrated = $migratedCount + $phase2Count

Write-Host ""
Write-Host "================================"
Write-Host "Migration Complete!"
Write-Host "================================"
Write-Host ""
Write-Host "Statistics:"
Write-Host "  Phase 1 (unified-auth): $migratedCount files"
Write-Host "  Phase 2 (lib/auth):     $phase2Count files"
Write-Host "  Total migrated:         $totalMigrated files"
Write-Host "  Errors:                 $($errors.Count)"
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "Errors encountered:"
    foreach ($error in $errors) {
        $relativePath = $error.File.Replace((Get-Location).Path + '\', '')
        Write-Host "  File: $relativePath"
        Write-Host "  Error: $($error.Error)"
    }
    Write-Host ""
}

if ($totalMigrated -gt 0) {
    Write-Host "Next Steps:"
    Write-Host "1. Run type check: pnpm tsc --noEmit"
    Write-Host "2. Run tests: pnpm test"
    Write-Host ""
    
    $response = Read-Host "Run TypeScript type check now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "Running type check..."
        pnpm tsc --noEmit
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Type check passed!"
        }
        else {
            Write-Host "[ERROR] Type check failed."
        }
    }
}
