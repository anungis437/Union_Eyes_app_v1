# PowerShell script to run route migrations in batches
# Usage: .\scripts\migration\migrate-all.ps1

Write-Host "🚀 Batch Route Migration" -ForegroundColor Cyan
Write-Host ""

# Check if tsx is installed
if (-not (Get-Command tsx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ tsx not found. Installing..." -ForegroundColor Red
    pnpm add -D tsx
}

# Step 1: Scan for files needing migration
Write-Host "📊 Scanning for files needing migration..." -ForegroundColor Yellow
tsx scripts/migration/migrate-routes.ts --scan

Write-Host ""
Write-Host "⚠️  Before proceeding, please review the files above." -ForegroundColor Yellow
$confirm = Read-Host "Continue with migration? (y/n)"

if ($confirm -ne "y") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📝 Running dry-run first..." -ForegroundColor Yellow
tsx scripts/migration/migrate-routes.ts --dry-run app/api

Write-Host ""
$confirm2 = Read-Host "Dry-run complete. Apply changes? (y/n)"

if ($confirm2 -ne "y") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "✍️  Applying migrations..." -ForegroundColor Green
tsx scripts/migration/migrate-routes.ts app/api

Write-Host ""
Write-Host "🔍 Checking for TypeScript errors..." -ForegroundColor Yellow
pnpm tsc --noEmit

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ All migrations successful! No TypeScript errors." -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review changes with: git diff" -ForegroundColor White
    Write-Host "  2. Test critical routes manually" -ForegroundColor White
    Write-Host "  3. Backup files are saved as *.backup" -ForegroundColor White
    Write-Host "  4. Run: pnpm test" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️  TypeScript errors detected. Please review and fix manually." -ForegroundColor Red
    Write-Host "   Backup files saved as *.backup - you can restore if needed" -ForegroundColor Yellow
}

exit $exitCode
