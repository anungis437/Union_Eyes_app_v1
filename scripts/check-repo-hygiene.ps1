# Repo Hygiene Check (PowerShell)
# Ensures no build artifacts are tracked in git
# 
# This script fails if any build artifacts are found tracked in git.
# Run before committing to ensure clean source-only repository.

$ErrorActionPreference = "Stop"

Write-Host "🔍 Checking repository hygiene..." -ForegroundColor Cyan
Write-Host ""

# Define patterns for artifacts that should NEVER be tracked
$ForbiddenPatterns = @(
    "^\.next/",
    "^node_modules/",
    "^dist/",
    "^build/",
    "^\.turbo/",
    "^\.cache/",
    "^coverage/",
    "^out/",
    "\.tsbuildinfo$",
    "^\.pnpm-cache/"
)

# Track findings
$ViolationsFound = 0
$TotalViolations = 0

# Check each pattern
foreach ($pattern in $ForbiddenPatterns) {
    Write-Host "Checking pattern: $pattern"
    
    # Use git ls-files to find tracked files matching pattern
    $matches = git ls-files | Select-String -Pattern $pattern
    
    if ($matches) {
        Write-Host "❌ VIOLATION: Found tracked artifacts matching '$pattern':" -ForegroundColor Red
        $matches | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" }
        $count = ($matches | Measure-Object).Count
        Write-Host "   ($count files total)" -ForegroundColor Red
        Write-Host ""
        $ViolationsFound++
        $TotalViolations += $count
    } else {
        Write-Host "✅ No violations for '$pattern'" -ForegroundColor Green
    }
    Write-Host ""
}

# Report results
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($ViolationsFound -eq 0) {
    Write-Host "✅ PASS: Repository hygiene check passed!" -ForegroundColor Green
    Write-Host "   No build artifacts are tracked in git." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ FAIL: Repository hygiene check failed!" -ForegroundColor Red
    Write-Host "   Found $ViolationsFound pattern violations ($TotalViolations files)" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix, run:" -ForegroundColor Yellow
    Write-Host "  git rm --cached -r .turbo/ .next/ dist/ build/ coverage/ out/" -ForegroundColor Yellow
    Write-Host "  git commit -m 'chore: remove tracked build artifacts'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Then ensure .gitignore includes these patterns." -ForegroundColor Yellow
    exit 1
}
