#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Create backup of current Docker configuration

.DESCRIPTION
    Backs up all Docker-related files before making changes
    Creates timestamped backup for safe rollback

.EXAMPLE
    .\backup-current-state.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups/docker_backup_$timestamp"

Write-Host "`n[*] Creating backup..." -ForegroundColor Cyan

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Files to backup
$filesToBackup = @(
    "Dockerfile",
    "Dockerfile.simple",
    "Dockerfile.staging",
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "docker-compose.staging.yml",
    "docker-compose.blue-green.yml",
    ".dockerignore"
)

# Directories to backup
$dirsToBackup = @(
    ".github/workflows"
)

# Backup files
foreach ($file in $filesToBackup) {
    if (Test-Path $file) {
        $destDir = Join-Path $backupDir (Split-Path $file -Parent)
        if ($destDir -and $destDir -ne ".") {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $file -Destination (Join-Path $backupDir $file) -Force
        Write-Host "  [OK] Backed up: $file" -ForegroundColor Green
    }
}

# Backup directories
foreach ($dir in $dirsToBackup) {
    if (Test-Path $dir) {
        $destDir = Join-Path $backupDir $dir
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Copy-Item -Path "$dir\*" -Destination $destDir -Recurse -Force
        Write-Host "  [OK] Backed up: $dir/" -ForegroundColor Green
    }
}

# Create manifest
$manifest = @{
    Timestamp = $timestamp
    BackupDir = $backupDir
    Files = $filesToBackup
    Directories = $dirsToBackup
    GitCommit = (git rev-parse HEAD 2>$null)
    GitBranch = (git rev-parse --abbrev-ref HEAD 2>$null)
} | ConvertTo-Json

$manifest | Out-File -FilePath (Join-Path $backupDir "manifest.json") -Encoding UTF8

Write-Host "`n[OK] Backup complete!" -ForegroundColor Green
Write-Host "   Location: $backupDir" -ForegroundColor Gray
Write-Host "`n[TIP] To restore: Copy files from $backupDir back to project root" -ForegroundColor Yellow
Write-Host ""
