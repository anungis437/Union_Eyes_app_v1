#!/usr/bin/env pwsh
# Git History Purge Script - REMOVES SECRETS FROM ENTIRE GIT HISTORY
# ⚠️ WARNING: This rewrites git history permanently!

param(
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Red
Write-Host "   GIT HISTORY PURGE - SECRETS REMOVAL" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red
Write-Host ""

# Files to purge from history
$FilesToPurge = @(
    ".env",
    ".env.production",
    ".env.staging",
    ".env.10-10-excellence",
    "docs/deployment/AZURE_CREDENTIALS.md"
)

Write-Host "🗑️  Files to be purged from ALL git history:" -ForegroundColor Yellow
$FilesToPurge | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
Write-Host ""

# Safety checks
Write-Host "🔍 Pre-flight safety checks..." -ForegroundColor Cyan
Write-Host ""

# 1. Check if in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ ERROR: Not in a git repository root!" -ForegroundColor Red
    Write-Host "   Run this script from: C:\APPS\Union_Eyes_app_v1" -ForegroundColor Yellow
    exit 1
}

# 2. Check for uncommitted changes
$status = git status --porcelain
if ($status -and -not $Force) {
    Write-Host "❌ ERROR: You have uncommitted changes!" -ForegroundColor Red
    Write-Host ""
    git status --short
    Write-Host ""
    Write-Host "⚠️  Commit or stash your changes before purging history." -ForegroundColor Yellow
    Write-Host "   Or use -Force to proceed anyway (not recommended)" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ No uncommitted changes" -ForegroundColor Green

# 3. Check current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "✅ Current branch: $currentBranch" -ForegroundColor Green

# 4. Check for remotes
$remotes = git remote
if ($remotes) {
    Write-Host "✅ Remotes found:" -ForegroundColor Green
    $remotes | ForEach-Object { 
        $url = git remote get-url $_
        Write-Host "   - $_ : $url" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  No remotes configured (local repo only)" -ForegroundColor Yellow
}

Write-Host ""

# 5. Check which files currently exist in history
Write-Host "🔍 Checking which files exist in git history..." -ForegroundColor Cyan
$foundFiles = @()
foreach ($file in $FilesToPurge) {
    $exists = git log --all --full-history --oneline -- $file 2>$null
    if ($exists) {
        $foundFiles += $file
        $commitCount = ($exists | Measure-Object).Count
        Write-Host "   ❌ FOUND: $file (in $commitCount commits)" -ForegroundColor Red
    } else {
        Write-Host "   ✅ NOT IN HISTORY: $file" -ForegroundColor Green
    }
}

Write-Host ""

if ($foundFiles.Count -eq 0) {
    Write-Host "✅ SUCCESS: None of the target files are in git history!" -ForegroundColor Green
    Write-Host "   No purging needed. You're clean!" -ForegroundColor Green
    exit 0
}

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "   FOUND $($foundFiles.Count) FILE(S) IN HISTORY" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Display sample commits containing secrets
Write-Host "📋 Sample commits containing secrets:" -ForegroundColor Cyan
foreach ($file in $foundFiles | Select-Object -First 3) {
    Write-Host ""
    Write-Host "   File: $file" -ForegroundColor White
    git log --all --oneline --max-count=5 -- $file | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }
}
Write-Host ""

# Check for git-filter-repo
Write-Host "🔍 Checking for git-filter-repo..." -ForegroundColor Cyan
$hasFilterRepo = $null -ne (Get-Command git-filter-repo -ErrorAction SilentlyContinue)
if ($hasFilterRepo) {
    Write-Host "✅ git-filter-repo is installed" -ForegroundColor Green
} else {
    Write-Host "❌ git-filter-repo is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 Installation options:" -ForegroundColor Yellow
    Write-Host "   Option 1 (pip):" -ForegroundColor White
    Write-Host "      pip install git-filter-repo" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Option 2 (scoop):" -ForegroundColor White
    Write-Host "      scoop install git-filter-repo" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Option 3 (manual):" -ForegroundColor White
    Write-Host "      Download from https://github.com/newren/git-filter-repo" -ForegroundColor Gray
    Write-Host "      Place in PATH" -ForegroundColor Gray
    Write-Host ""
    
    if (-not $Force) {
        Write-Host "❌ Cannot proceed without git-filter-repo" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Red
Write-Host "   ⚠️  CRITICAL WARNING ⚠️" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red
Write-Host ""
Write-Host "This operation will:" -ForegroundColor Yellow
Write-Host "  1. REWRITE ALL GIT HISTORY (permanent, cannot undo)" -ForegroundColor White
Write-Host "  2. Remove secrets from all branches and commits" -ForegroundColor White
Write-Host "  3. Change all commit SHAs" -ForegroundColor White
Write-Host "  4. Require force-push to remote" -ForegroundColor White
Write-Host "  5. Require all team members to re-clone the repo" -ForegroundColor White
Write-Host ""
Write-Host "Before proceeding:" -ForegroundColor Red
Write-Host "  ✅ Create a backup: git clone --mirror . ../Union_Eyes_backup" -ForegroundColor White
Write-Host "  ✅ Notify all team members (they'll need to re-clone)" -ForegroundColor White
Write-Host "  ✅ Ensure you have admin access to force-push" -ForegroundColor White
Write-Host "  ✅ Consider doing this during off-hours" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Would execute:" -ForegroundColor Yellow
    Write-Host "   git-filter-repo --invert-paths \" -ForegroundColor Gray
    foreach ($file in $FilesToPurge) {
        Write-Host "      --path $file \" -ForegroundColor Gray
    }
    Write-Host "      --force" -ForegroundColor Gray
    Write-Host ""
    
    # Show size savings estimate
    $totalSize = 0
    foreach ($file in $foundFiles) {
        $fileHistory = git log --all --pretty=format: --name-only -- $file | Sort-Object -Unique
        if ($fileHistory -and (Test-Path $file)) {
            $size = (Get-Item $file).Length
            $totalSize += $size
        }
    }
    if ($totalSize -gt 0) {
        $sizeMB = [math]::Round($totalSize / 1MB, 2)
        Write-Host "📊 Estimated size reduction: ~$sizeMB MB" -ForegroundColor Cyan
    }
    
    exit 0
}

# Final confirmation
Write-Host "Type 'PURGE' to proceed (or Ctrl+C to cancel): " -ForegroundColor Red -NoNewline
$confirmation = Read-Host
Write-Host ""

if ($confirmation -ne "PURGE") {
    Write-Host "❌ Aborted by user" -ForegroundColor Yellow
    exit 0
}

# Create backup first
Write-Host "📦 Creating backup..." -ForegroundColor Cyan
$backupPath = "../Union_Eyes_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
try {
    git clone --mirror . $backupPath 2>&1 | Out-Null
    Write-Host "✅ Backup created at: $backupPath" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backup failed, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔥 PURGING GIT HISTORY..." -ForegroundColor Red
Write-Host ""

# Build git-filter-repo command
$filterRepoArgs = @("--force", "--invert-paths")
foreach ($file in $FilesToPurge) {
    $filterRepoArgs += "--path"
    $filterRepoArgs += $file
}

# Execute purge
try {
    Write-Host "Executing: git-filter-repo $($filterRepoArgs -join ' ')" -ForegroundColor Gray
    & git-filter-repo $filterRepoArgs
    
    Write-Host ""
    Write-Host "✅ Git history purged successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Verify removal
    Write-Host "🔍 Verifying removal..." -ForegroundColor Cyan
    $stillExists = @()
    foreach ($file in $foundFiles) {
        $check = git log --all --full-history --oneline -- $file 2>$null
        if ($check) {
            $stillExists += $file
            Write-Host "   ❌ STILL EXISTS: $file" -ForegroundColor Red
        } else {
            Write-Host "   ✅ REMOVED: $file" -ForegroundColor Green
        }
    }
    
    if ($stillExists.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  WARNING: Some files still present in history!" -ForegroundColor Red
        Write-Host "   Manual investigation required" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ VERIFICATION PASSED - All secrets removed from history" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ ERROR during purge: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Restore from backup if needed:" -ForegroundColor Yellow
    Write-Host "   rm -Recurse -Force .git" -ForegroundColor Gray
    Write-Host "   git clone $backupPath ." -ForegroundColor Gray
    exit 1
}

# Show next steps
Write-Host "================================================" -ForegroundColor Green
Write-Host "   NEXT STEPS - CRITICAL" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Review the changes:" -ForegroundColor Yellow
Write-Host "   git log --oneline | Select-Object -First 20" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Force-push to remote:" -ForegroundColor Yellow
Write-Host "   git push --force --all" -ForegroundColor Gray
Write-Host "   git push --force --tags" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Notify team members to re-clone:" -ForegroundColor Yellow
Write-Host "   rm -Recurse -Force Union_Eyes_app_v1" -ForegroundColor Gray
Write-Host "   git clone <repo-url>" -ForegroundColor Gray
Write-Host ""
Write-Host "4. IMMEDIATELY rotate all exposed credentials:" -ForegroundColor Red
Write-Host "   - PostgreSQL DATABASE_URL passwords" -ForegroundColor White
Write-Host "   - Azure Container Registry passwords" -ForegroundColor White
Write-Host "   - Azure OpenAI API keys (4 endpoints)" -ForegroundColor White
Write-Host "   - Azure Storage account keys (2 accounts)" -ForegroundColor White
Write-Host "   - Azure Speech Service keys" -ForegroundColor White
Write-Host "   - Stripe secret keys" -ForegroundColor White
Write-Host "   - Clerk secret keys" -ForegroundColor White
Write-Host "   - Whop API keys" -ForegroundColor White
Write-Host ""
Write-Host "5. Verify on GitHub/remote:" -ForegroundColor Yellow
Write-Host "   - Check commit history is rewritten" -ForegroundColor White
Write-Host "   - Search for secrets in GitHub UI" -ForegroundColor White
Write-Host "   - Check all branches are updated" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Garbage collect to recover space
Write-Host "🗑️  Running garbage collection to recover disk space..." -ForegroundColor Cyan
git reflog expire --expire=now --all 2>&1 | Out-Null
git gc --prune=now --aggressive 2>&1 | Out-Null
Write-Host "✅ Garbage collection complete" -ForegroundColor Green
Write-Host ""

$repoSize = (Get-ChildItem .git -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📊 Current .git size: $([math]::Round($repoSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎉 Purge complete! Follow the next steps above." -ForegroundColor Green
