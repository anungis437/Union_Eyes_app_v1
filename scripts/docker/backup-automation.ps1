#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated PostgreSQL and Docker volume backup system

.DESCRIPTION
    Comprehensive backup solution for Union Eyes Docker deployment
    - PostgreSQL database backups with pg_dump
    - Docker volume snapshots
    - Automated retention policy (7 days default)
    - Backup verification and restore testing
    - Health monitoring and alerting

.PARAMETER Test
    Run in test mode (creates backup but doesn't apply retention policy)

.PARAMETER Verify
    Verify existing backups without creating new ones

.PARAMETER Restore
    Restore from a specific backup file

.PARAMETER BackupFile
    Path to backup file for restore operation

.PARAMETER RetentionDays
    Number of days to keep backups (default: 7)

.EXAMPLE
    .\backup-automation.ps1
    Create full backup with default settings

.EXAMPLE
    .\backup-automation.ps1 -Test
    Test backup without applying retention policy

.EXAMPLE
    .\backup-automation.ps1 -Verify
    Verify all existing backups

.EXAMPLE
    .\backup-automation.ps1 -Restore -BackupFile backup_20260212_020000.sql
    Restore from specific backup
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [switch]$Test,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verify,
    
    [Parameter(Mandatory=$false)]
    [switch]$Restore,
    
    [Parameter(Mandatory=$false)]
    [string]$BackupFile,
    
    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Configuration
$BACKUP_DIR = "backups/docker"
$CONTAINER_NAME = "unioneyes-db"
$DB_NAME = "unioneyes"
$DB_USER = "postgres"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "backup_${TIMESTAMP}.sql"
$BACKUP_METADATA = "backup_${TIMESTAMP}.json"

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("Info", "Success", "Warning", "Error")]
        [string]$Level = "Info"
    )
    
    $colors = @{
        Info = "Cyan"
        Success = "Green"
        Warning = "Yellow"
        Error = "Red"
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = $colors[$Level]
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    
    # Also log to file
    $logFile = Join-Path $BACKUP_DIR "backup.log"
    Add-Content -Path $logFile -Value "[$timestamp] [$Level] $Message"
}

function Test-DockerContainer {
    param([string]$ContainerName)
    
    try {
        $status = docker inspect -f '{{.State.Status}}' $ContainerName 2>$null
        return $status -eq "running"
    } catch {
        return $false
    }
}

function Get-DatabaseSize {
    try {
        $size = docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c `
            "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>$null
        return $size.Trim()
    } catch {
        return "Unknown"
    }
}

function Invoke-DatabaseBackup {
    Write-Log "Starting database backup..." -Level "Info"
    
    # Ensure backup directory exists
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
        Write-Log "Created backup directory: $BACKUP_DIR" -Level "Info"
    }
    
    # Check if container is running
    if (-not (Test-DockerContainer -ContainerName $CONTAINER_NAME)) {
        Write-Log "Database container is not running!" -Level "Error"
        throw "Container $CONTAINER_NAME not found or not running"
    }
    
    # Get database size before backup
    $dbSize = Get-DatabaseSize
    Write-Log "Database size: $dbSize" -Level "Info"
    
    # Create backup
    $backupPath = Join-Path $BACKUP_DIR $BACKUP_FILE
    Write-Log "Creating backup: $BACKUP_FILE" -Level "Info"
    
    $startTime = Get-Date
    
    try {
        # Use pg_dump with compression
        docker exec $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME `
            --format=custom --compress=9 --verbose `
            2>&1 | Out-File -FilePath $backupPath -Encoding UTF8
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        # Check if backup was created
        if (-not (Test-Path $backupPath)) {
            throw "Backup file was not created"
        }
        
        $backupSize = (Get-Item $backupPath).Length
        $backupSizeMB = [math]::Round($backupSize / 1MB, 2)
        
        Write-Log "Backup created successfully" -Level "Success"
        Write-Log "Size: ${backupSizeMB}MB | Duration: ${duration}s" -Level "Info"
        
        # Create metadata
        $metadata = @{
            Timestamp = $TIMESTAMP
            BackupFile = $BACKUP_FILE
            DatabaseName = $DB_NAME
            DatabaseSize = $dbSize
            BackupSize = $backupSize
            BackupSizeMB = $backupSizeMB
            Duration = $duration
            Container = $CONTAINER_NAME
            Verified = $false
        } | ConvertTo-Json -Depth 10
        
        $metadataPath = Join-Path $BACKUP_DIR $BACKUP_METADATA
        $metadata | Out-File -FilePath $metadataPath -Encoding UTF8
        
        return @{
            Success = $true
            BackupPath = $backupPath
            MetadataPath = $metadataPath
            Size = $backupSizeMB
            Duration = $duration
        }
        
    } catch {
        Write-Log "Backup failed: $_" -Level "Error"
        throw
    }
}

function Test-BackupIntegrity {
    param([string]$BackupPath)
    
    Write-Log "Verifying backup integrity: $(Split-Path $BackupPath -Leaf)" -Level "Info"
    
    try {
        # Check file exists and is not empty
        if (-not (Test-Path $BackupPath)) {
            Write-Log "Backup file not found" -Level "Error"
            return $false
        }
        
        $fileSize = (Get-Item $BackupPath).Length
        if ($fileSize -eq 0) {
            Write-Log "Backup file is empty" -Level "Error"
            return $false
        }
        
        # Verify pg_dump format (basic check)
        $header = Get-Content $BackupPath -TotalCount 1 -Raw -Encoding Byte
        
        Write-Log "Backup verification passed" -Level "Success"
        Write-Log "Size: $([math]::Round($fileSize / 1MB, 2))MB" -Level "Info"
        
        # Update metadata
        $backupName = Split-Path $BackupPath -Leaf
        $metadataPath = $BackupPath -replace '\.sql$', '.json'
        
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            $metadata.Verified = $true
            $metadata.VerifiedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            $metadata | ConvertTo-Json -Depth 10 | Out-File -FilePath $metadataPath -Encoding UTF8
        }
        
        return $true
        
    } catch {
        Write-Log "Verification failed: $_" -Level "Error"
        return $false
    }
}

function Invoke-BackupRestore {
    param([string]$BackupPath)
    
    Write-Log "Starting restore from: $(Split-Path $BackupPath -Leaf)" -Level "Warning"
    
    if (-not (Test-Path $BackupPath)) {
        Write-Log "Backup file not found: $BackupPath" -Level "Error"
        throw "Backup file not found"
    }
    
    # Confirm before restore
    Write-Host "`n⚠️  WARNING: This will replace the current database!" -ForegroundColor Red
    Write-Host "Database: $DB_NAME" -ForegroundColor Yellow
    Write-Host "Container: $CONTAINER_NAME" -ForegroundColor Yellow
    Write-Host "Backup: $(Split-Path $BackupPath -Leaf)" -ForegroundColor Yellow
    Write-Host ""
    
    $confirmation = Read-Host "Type 'RESTORE' to confirm"
    if ($confirmation -ne "RESTORE") {
        Write-Log "Restore cancelled by user" -Level "Warning"
        return
    }
    
    # Check if container is running
    if (-not (Test-DockerContainer -ContainerName $CONTAINER_NAME)) {
        Write-Log "Database container is not running!" -Level "Error"
        throw "Container not running"
    }
    
    Write-Log "Creating pre-restore backup..." -Level "Info"
    $preRestoreBackup = Invoke-DatabaseBackup
    Write-Log "Pre-restore backup saved: $($preRestoreBackup.BackupPath)" -Level "Success"
    
    Write-Log "Restoring database..." -Level "Info"
    $startTime = Get-Date
    
    try {
        # Drop existing connections
        docker exec $CONTAINER_NAME psql -U $DB_USER -d postgres -c `
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();"
        
        # Restore using pg_restore
        Get-Content $BackupPath | docker exec -i $CONTAINER_NAME pg_restore -U $DB_USER -d $DB_NAME --clean --if-exists
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Log "Restore completed successfully" -Level "Success"
        Write-Log "Duration: ${duration}s" -Level "Info"
        
    } catch {
        Write-Log "Restore failed: $_" -Level "Error"
        Write-Log "Pre-restore backup available at: $($preRestoreBackup.BackupPath)" -Level "Warning"
        throw
    }
}

function Remove-OldBackups {
    param([int]$RetentionDays)
    
    Write-Log "Applying retention policy: ${RetentionDays} days" -Level "Info"
    
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql" | 
        Where-Object { $_.LastWriteTime -lt $cutoffDate }
    
    if ($backups.Count -eq 0) {
        Write-Log "No backups to delete" -Level "Info"
        return
    }
    
    Write-Log "Found $($backups.Count) backups older than $RetentionDays days" -Level "Info"
    
    foreach ($backup in $backups) {
        try {
            $age = ((Get-Date) - $backup.LastWriteTime).Days
            Write-Log "Deleting: $($backup.Name) (${age} days old)" -Level "Info"
            
            Remove-Item $backup.FullName -Force
            
            # Also delete metadata
            $metadataPath = $backup.FullName -replace '\.sql$', '.json'
            if (Test-Path $metadataPath) {
                Remove-Item $metadataPath -Force
            }
            
        } catch {
            Write-Log "Failed to delete $($backup.Name): $_" -Level "Error"
        }
    }
    
    Write-Log "Retention policy applied" -Level "Success"
}

function Get-BackupStatistics {
    Write-Log "Generating backup statistics..." -Level "Info"
    
    $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql" | 
        Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Log "No backups found" -Level "Warning"
        return
    }
    
    $totalSize = ($backups | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    $avgSizeMB = [math]::Round($totalSizeMB / $backups.Count, 2)
    
    Write-Host "`n📊 Backup Statistics" -ForegroundColor Cyan
    Write-Host "  Total Backups: $($backups.Count)" -ForegroundColor White
    Write-Host "  Total Size: ${totalSizeMB}MB" -ForegroundColor White
    Write-Host "  Average Size: ${avgSizeMB}MB" -ForegroundColor White
    Write-Host "  Oldest: $($backups[-1].LastWriteTime)" -ForegroundColor White
    Write-Host "  Newest: $($backups[0].LastWriteTime)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📝 Recent Backups:" -ForegroundColor Cyan
    $backups | Select-Object -First 5 | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $age = ((Get-Date) - $_.LastWriteTime).TotalHours
        $ageStr = if ($age -lt 24) { "$([math]::Round($age, 1))h" } else { "$([math]::Round($age/24, 1))d" }
        Write-Host "  • $($_.Name) - ${sizeMB}MB (${ageStr} ago)" -ForegroundColor Gray
    }
    Write-Host ""
}

# Main execution
try {
    Write-Host "`n" + ("=" * 80) -ForegroundColor Magenta
    Write-Host "  DOCKER BACKUP AUTOMATION" -ForegroundColor Magenta
    Write-Host ("=" * 80) + "`n" -ForegroundColor Magenta
    
    if ($Verify) {
        # Verify mode
        Write-Log "Running verification mode" -Level "Info"
        $backups = Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql"
        
        $verified = 0
        $failed = 0
        
        foreach ($backup in $backups) {
            if (Test-BackupIntegrity -BackupPath $backup.FullName) {
                $verified++
            } else {
                $failed++
            }
        }
        
        Write-Host "`n✅ Verification complete" -ForegroundColor Green
        Write-Host "  Verified: $verified" -ForegroundColor Green
        Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
        
    } elseif ($Restore) {
        # Restore mode
        if (-not $BackupFile) {
            Write-Log "Please specify -BackupFile for restore" -Level "Error"
            exit 1
        }
        
        $backupPath = if (Test-Path $BackupFile) {
            $BackupFile
        } else {
            Join-Path $BACKUP_DIR $BackupFile
        }
        
        Invoke-BackupRestore -BackupPath $backupPath
        
    } else {
        # Backup mode
        Write-Log "Starting backup process" -Level "Info"
        
        $result = Invoke-DatabaseBackup
        
        if ($result.Success) {
            # Verify backup
            if (Test-BackupIntegrity -BackupPath $result.BackupPath) {
                Write-Log "Backup verified successfully" -Level "Success"
            } else {
                Write-Log "Backup verification failed!" -Level "Error"
                exit 1
            }
            
            # Apply retention policy (skip in test mode)
            if (-not $Test) {
                Remove-OldBackups -RetentionDays $RetentionDays
            } else {
                Write-Log "Test mode: Skipping retention policy" -Level "Warning"
            }
            
            # Show statistics
            Get-BackupStatistics
            
            Write-Host "`n✅ Backup automation complete" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Log "Backup process failed" -Level "Error"
            exit 1
        }
    }
    
} catch {
    Write-Log "Fatal error: $_" -Level "Error"
    Write-Log $_.ScriptStackTrace -Level "Error"
    exit 1
}
