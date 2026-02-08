#!/usr/bin/env pwsh
# Setup security tooling for local development

$ErrorActionPreference = "Stop"

Write-Host "🔒 Setting up security tooling..." -ForegroundColor Cyan

# 1. Install pre-commit hook
Write-Host "`n1. Installing pre-commit hook..." -ForegroundColor Yellow
$hookSource = Join-Path $PSScriptRoot "pre-commit"
$hookDest = Join-Path (Get-Location) ".git\hooks\pre-commit"

if (Test-Path $hookDest) {
    Write-Host "   Pre-commit hook already exists. Backing up..." -ForegroundColor Yellow
    Copy-Item $hookDest "$hookDest.bak" -Force
}

Copy-Item $hookSource $hookDest -Force
Write-Host "✅ Pre-commit hook installed" -ForegroundColor Green

# 2. Verify .gitignore is up to date
Write-Host "`n2. Verifying .gitignore..." -ForegroundColor Yellow
$gitignore = Get-Content .gitignore -Raw
$requiredPatterns = @(
    '\.env$',
    '\.env\.production',
    '\.env\.staging',
    'node_modules/',
    'CREDENTIALS'
)

$missing = @()
foreach ($pattern in $requiredPatterns) {
    if ($gitignore -notmatch [regex]::Escape($pattern)) {
        $missing += $pattern
    }
}

if ($missing.Count -gt 0) {
    Write-Host "⚠️  WARNING: .gitignore may be missing patterns:" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
} else {
    Write-Host "✅ .gitignore covers critical patterns" -ForegroundColor Green
}

# 3. Check for existing secrets in repo
Write-Host "`n3. Scanning for existing secrets..." -ForegroundColor Yellow
$trackedEnv = git ls-files | Select-String -Pattern '\.env($|\.production|\.staging)'
if ($trackedEnv) {
    Write-Host "❌ WARNING: .env files are tracked in git!" -ForegroundColor Red
    $trackedEnv | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    Write-Host "`nRun: git rm --cached <file>" -ForegroundColor Yellow
    Write-Host "Then: ROTATE ALL EXPOSED CREDENTIALS" -ForegroundColor Red
} else {
    Write-Host "✅ No .env files tracked" -ForegroundColor Green
}

# 4. Check for node_modules
Write-Host "`n4. Checking for committed node_modules..." -ForegroundColor Yellow
$nodeModulesCount = (git ls-files | Select-String -Pattern 'node_modules/' | Measure-Object).Count
if ($nodeModulesCount -gt 0) {
    Write-Host "❌ WARNING: $nodeModulesCount files in node_modules are tracked!" -ForegroundColor Red
    Write-Host "This bloats the repository. Run cleanup script to remove." -ForegroundColor Yellow
} else {
    Write-Host "✅ No node_modules tracked" -ForegroundColor Green
}

# 5. Test API auth scanner
Write-Host "`n5. Testing API auth scanner..." -ForegroundColor Yellow
try {
    pnpm tsx scripts/scan-api-auth.ts > $null 2>&1
    Write-Host "✅ API auth scanner is functional" -ForegroundColor Green
} catch {
    Write-Host "⚠️  API auth scanner test failed (may need dependencies)" -ForegroundColor Yellow
}

# 6. Recommendations
Write-Host "`n📋 Security Setup Complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run 'pnpm tsx scripts/scan-api-auth.ts' to check API auth coverage" -ForegroundColor White
Write-Host "  2. Review .env files and ensure they're not tracked in git" -ForegroundColor White
Write-Host "  3. If secrets were exposed, ROTATE THEM IMMEDIATELY" -ForegroundColor White
Write-Host "  4. Run 'git log --all --full-history -- .env*' to check history" -ForegroundColor White
Write-Host "  5. Consider using BFG Repo-Cleaner or git-filter-repo for history cleanup" -ForegroundColor White
Write-Host "`nPre-commit hook will now prevent:" -ForegroundColor Yellow
Write-Host "  ❌ Committing .env files" -ForegroundColor White
Write-Host "  ❌ Committing node_modules" -ForegroundColor White
Write-Host "  ❌ Committing files with secret patterns" -ForegroundColor White
Write-Host ""
