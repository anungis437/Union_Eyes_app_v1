# Backup and Restore Runbook

**Version:** 2.0  
**Last Updated:** February 12, 2026  
**Owner:** DevOps Team  
**Review Frequency:** Quarterly

---

## Purpose

This runbook provides comprehensive procedures for backing up, verifying, and restoring the Union Eyes database and application state. Designed to ensure data durability and rapid recovery from disasters.

---

## Table of Contents

1. [Backup Strategy Overview](#backup-strategy-overview)
2. [Backup Schedule and Retention](#backup-schedule-and-retention)
3. [Backup Procedures](#backup-procedures)
4. [Backup Verification](#backup-verification)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery Scenarios](#disaster-recovery-scenarios)
7. [Testing and Drill Schedule](#testing-and-drill-schedule)
8. [Monitoring and Alerting](#monitoring-and-alerting)

---

## Backup Strategy Overview

### Backup Types

Union Eyes implements a **3-2-1 backup strategy**:
- **3** copies of data (production + 2 backups)
- **2** different media types (local disk + cloud storage)
- **1** off-site backup (Azure Blob Storage)

### What Gets Backed Up

| Component | Method | Frequency | Retention | Location |
|-----------|--------|-----------|-----------|----------|
| PostgreSQL Database | pg_dump (full) | Daily | 30 days | Azure Blob Storage |
| PostgreSQL Database | pg_dump (incremental) | Every 6 hours | 7 days | Azure Blob Storage |
| PostgreSQL WAL | Continuous archiving | Continuous | 7 days | Azure Blob Storage |
| Application Config | File backup | Weekly | 90 days | Azure Blob Storage |
| Docker Volumes | Volume snapshot | Weekly | 30 days | Local + Azure |
| Environment Files | Encrypted backup | Weekly | 90 days | Azure Key Vault |
| Backup Logs | Log files | Daily | 365 days | Local + Azure Monitor |

### Recovery Point Objective (RPO)

- **Target RPO:** ≤ 6 hours (maximum acceptable data loss)
- **Achieved RPO:** ≤ 1 hour (with WAL archiving)

### Recovery Time Objective (RTO)

- **Target RTO:** ≤ 4 hours (maximum acceptable downtime)
- **Achieved RTO:** ≤ 1 hour for database restore
- **Achieved RTO:** ≤ 30 minutes for application restore

---

## Backup Schedule and Retention

### Automated Backup Schedule

Managed via GitHub Actions workflow: [`.github/workflows/backup-drill.yml`](../../.github/workflows/backup-drill.yml)

```yaml
Schedule:
  - Full Database Backup: Every day at 4:00 AM UTC
  - Incremental Backup: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
  - Backup Verification Drill: Every Sunday at 4:00 AM UTC
  - WAL Archiving: Continuous (automated by PostgreSQL)
```

### Retention Policy

| Backup Type | Retention | Reason |
|-------------|-----------|--------|
| **Full Daily** | 30 days | Regulatory compliance, monthly reports |
| **Incremental (6-hour)** | 7 days | Quick recovery for recent data |
| **Weekly Full** | 90 days | Quarter-end reporting |
| **Monthly Full** | 12 months | Annual audits, compliance |
| **Year-End Full** | 7 years | Legal/compliance requirements |

### Storage Costs Estimate

```
Azure Blob Storage (Cool tier):
- Daily backups (30 days): ~30 GB × $0.01/GB = $0.30/day
- Weekly backups (90 days): ~13 GB × $0.01/GB = $0.13/day
- Monthly backups (12 months): ~12 GB × $0.01/GB = $0.12/day
Total monthly cost: ~$16.50/month
```

---

## Backup Procedures

### Automated Daily Backup

**Primary Script:** [`scripts/backup-restore-drill.ps1`](../../scripts/backup-restore-drill.ps1)

This script is executed automatically via GitHub Actions but can also be run manually.

#### Running Manual Backup

```powershell
# Standard backup (production)
.\scripts\backup-restore-drill.ps1 `
    -BackupDir ".\backups" `
    -KeepBackup $true `
    -Verbose

# Backup with custom settings
.\scripts\backup-restore-drill.ps1 `
    -BackupDir "C:\Backups\Union_Eyes" `
    -TestDbName "union_eyes_verify_test" `
    -KeepBackup $true `
    -Verbose
```

**What This Script Does:**
1. Creates full PostgreSQL backup using `pg_dump`
2. Verifies backup integrity by restoring to test database
3. Validates schema matches production
4. Tests critical queries on restored data
5. Cleans up test database
6. Uploads backup to Azure Blob Storage (if configured)
7. Generates backup verification report

#### Manual Database Backup (Alternative)

If the automated script is unavailable:

```powershell
# 1. SET ENVIRONMENT VARIABLES
# Ensure DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL not set. Load from .env.local"
    exit 1
}

# 2. CREATE BACKUP DIRECTORY
$backupDir = ".\backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "manual_backup_$timestamp.sql"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 3. PERFORM BACKUP (Full database dump)
Write-Host "Creating backup: $backupFile"

# Parse connection string
$dbUrl = $env:DATABASE_URL
if ($dbUrl -match 'postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):?(\d+)?/([^\?]+)') {
    $env:PGPASSWORD = $matches[2]
    $dbUser = $matches[1]
    $dbHost = $matches[3]
    $dbPort = if ($matches[4]) { $matches[4] } else { "5432" }
    $dbName = $matches[5]
}

# Create backup
pg_dump `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --format=plain `
    --no-owner `
    --no-acl `
    --verbose `
    --file=$backupFile `
    2>&1 | Tee-Object -FilePath "$backupDir\backup_$timestamp.log"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green
    
    # Get backup size
    $size = (Get-Item $backupFile).Length / 1MB
    Write-Host "Backup size: $([math]::Round($size, 2)) MB"
    
    # Compress backup
    Write-Host "Compressing backup..."
    Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip" -Force
    Write-Host "✅ Compressed backup created: $backupFile.zip"
} else {
    Write-Error "❌ Backup failed! Check log: $backupDir\backup_$timestamp.log"
    exit 1
}

# 4. VERIFY BACKUP FILE
Write-Host "`nVerifying backup file integrity..."
$content = Get-Content $backupFile -First 10
if ($content -match "PostgreSQL database dump") {
    Write-Host "✅ Backup file appears valid" -ForegroundColor Green
} else {
    Write-Error "❌ Backup file may be corrupted"
}

# 5. UPLOAD TO AZURE (if configured)
# See "Upload to Azure Blob Storage" section below
```

### Custom Backup Variants

#### Schema-Only Backup

```powershell
# Backup only database schema (no data)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --schema-only `
    --file=".\backups\schema_only_$timestamp.sql"

Write-Host "✅ Schema-only backup created"
```

#### Data-Only Backup

```powershell
# Backup only data (no schema)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --data-only `
    --file=".\backups\data_only_$timestamp.sql"

Write-Host "✅ Data-only backup created"
```

#### Specific Table Backup

```powershell
# Backup specific tables only
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tables = @("users", "organizations", "claims")

foreach ($table in $tables) {
    pg_dump `
        --host=$dbHost `
        --port=$dbPort `
        --username=$dbUser `
        --dbname=$dbName `
        --table=$table `
        --file=".\backups\${table}_$timestamp.sql"
    
    Write-Host "✅ Backup created for table: $table"
}
```

#### Binary Format Backup (Faster restore)

```powershell
# Custom format backup (faster restore, compressed)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --format=custom `
    --compress=9 `
    --file=".\backups\compressed_$timestamp.dump"

Write-Host "✅ Compressed binary backup created"
```

### Upload to Azure Blob Storage

```powershell
# Prerequisites: Install Azure CLI
# az login

# Configuration
$resourceGroup = "unioneyes-prod-rg"
$storageAccount = "unioneyesbackups"
$containerName = "database-backups"
$backupFile = ".\backups\backup_20260212_040000.sql.zip"

# 1. CREATE STORAGE CONTAINER (first time only)
az storage container create `
    --name $containerName `
    --account-name $storageAccount `
    --resource-group $resourceGroup `
    --public-access off

# 2. UPLOAD BACKUP
Write-Host "Uploading to Azure Blob Storage..."
az storage blob upload `
    --account-name $storageAccount `
    --container-name $containerName `
    --name "$(Split-Path $backupFile -Leaf)" `
    --file $backupFile `
    --overwrite

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup uploaded to Azure" -ForegroundColor Green
    
    # Get blob URL
    $blobUrl = az storage blob url `
        --account-name $storageAccount `
        --container-name $containerName `
        --name "$(Split-Path $backupFile -Leaf)" `
        --output tsv
    
    Write-Host "Backup URL: $blobUrl"
} else {
    Write-Error "❌ Upload to Azure failed"
}

# 3. VERIFY UPLOAD
$blobSize = az storage blob show `
    --account-name $storageAccount `
    --container-name $containerName `
    --name "$(Split-Path $backupFile -Leaf)" `
    --query "properties.contentLength" `
    --output tsv

$localSize = (Get-Item $backupFile).Length

if ($blobSize -eq $localSize) {
    Write-Host "✅ Upload verified (size matches)" -ForegroundColor Green
} else {
    Write-Warning "⚠️  Size mismatch! Local: $localSize, Azure: $blobSize"
}
```

### Backup Application Configuration

```powershell
# Backup configuration files and Docker volumes
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backups\config_$timestamp"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# 1. DOCKER COMPOSE FILES
Copy-Item "docker-compose*.yml" -Destination $backupDir

# 2. ENVIRONMENT FILES (encrypted!)
# DO NOT backup plain .env files to cloud!
# Encrypt before uploading

$envFiles = Get-ChildItem ".env*" -File
foreach ($file in $envFiles) {
    # Encrypt with openssl or gpg
    $encryptedFile = Join-Path $backupDir "$($file.Name).enc"
    
    # Example with openssl (requires password)
    openssl enc -aes-256-cbc -salt -in $file.FullName -out $encryptedFile -k $env:BACKUP_ENCRYPTION_KEY
    
    Write-Host "✅ Encrypted: $($file.Name)"
}

# 3. MONITORING CONFIGURATION
Copy-Item "monitoring\" -Destination $backupDir -Recurse

# 4. SCRIPTS
Copy-Item "scripts\*.ps1" -Destination $backupDir

# 5. COMPRESS
Compress-Archive -Path $backupDir -DestinationPath "$backupDir.zip" -Force
Write-Host "✅ Configuration backup created: $backupDir.zip"

# 6. UPLOAD TO AZURE
az storage blob upload `
    --account-name $storageAccount `
    --container-name "config-backups" `
    --name "config_$timestamp.zip" `
    --file "$backupDir.zip"
```

---

## Backup Verification

### Why Verify Backups?

**"Untested backups are Schrödinger's backups - simultaneously working and broken until you need them."**

### Automated Verification (Weekly Drill)

**Script:** [`scripts/backup-restore-drill.ps1`](../../scripts/backup-restore-drill.ps1)  
**GitHub Action:** [`.github/workflows/backup-drill.yml`](../../.github/workflows/backup-drill.yml)

**Runs every Sunday at 4:00 AM UTC**

**What It Tests:**
1. ✅ Backup file can be created
2. ✅ Backup file can be restored to test database
3. ✅ Schema matches production schema
4. ✅ Data integrity (row counts, foreign keys)
5. ✅ Critical queries execute successfully
6. ✅ Test database can be cleaned up

**Review Weekly Drill Results:**
```powershell
# Check latest GitHub Actions run
# Go to: https://github.com/[org]/[repo]/actions/workflows/backup-drill.yml

# Or via CLI:
gh run list --workflow=backup-drill.yml --limit 5

# View specific run:
gh run view [RUN_ID] --log
```

### Manual Verification Procedure

```powershell
# 1. SELECT BACKUP TO VERIFY
$backupFile = ".\backups\backup_20260212_040000.sql"

# 2. CREATE TEST DATABASE
$testDbName = "union_eyes_verify_test_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "Creating test database: $testDbName"
psql $env:DATABASE_URL -c "CREATE DATABASE $testDbName;"

# 3. RESTORE BACKUP TO TEST DATABASE
Write-Host "Restoring backup to test database..."

# Modify connection string to use test database
$testDbUrl = $env:DATABASE_URL -replace "/[^/]+(\?|$)", "/$testDbName`$1"

psql $testDbUrl -f $backupFile 2>&1 | Tee-Object -FilePath ".\verify_restore.log"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Restore completed" -ForegroundColor Green
} else {
    Write-Error "❌ Restore failed. Check verify_restore.log"
    exit 1
}

# 4. VERIFY SCHEMA
Write-Host "`nVerifying schema..."

# Get table count
$testTableCount = psql $testDbUrl -t -c "
    SELECT count(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public';"

$prodTableCount = psql $env:DATABASE_URL -t -c "
    SELECT count(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public';"

if ($testTableCount -eq $prodTableCount) {
    Write-Host "✅ Table count matches: $testTableCount tables" -ForegroundColor Green
} else {
    Write-Warning "⚠️  Table count mismatch! Prod: $prodTableCount, Test: $testTableCount"
}

# 5. VERIFY DATA INTEGRITY
Write-Host "`nVerifying data integrity..."

$tables = @("users", "organizations", "claims", "org_members")
foreach ($table in $tables) {
    $testCount = psql $testDbUrl -t -c "SELECT count(*) FROM $table;"
    $prodCount = psql $env:DATABASE_URL -t -c "SELECT count(*) FROM $table;"
    
    if ($testCount -eq $prodCount) {
        Write-Host "✅ $table: $testCount rows (matches production)" -ForegroundColor Green
    } else {
        Write-Warning "⚠️  $table: Prod=$prodCount, Test=$testCount"
    }
}

# 6. TEST CRITICAL QUERIES
Write-Host "`nTesting critical queries..."

$queries = @{
    "User Authentication" = "SELECT count(*) FROM users WHERE email IS NOT NULL;"
    "Organization Memberships" = "SELECT count(*) FROM org_members WHERE deleted_at IS NULL;"
    "Active Claims" = "SELECT count(*) FROM claims WHERE status != 'draft';"
}

foreach ($queryName in $queries.Keys) {
    $query = $queries[$queryName]
    $result = psql $testDbUrl -t -c $query 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $queryName : $result rows" -ForegroundColor Green
    } else {
        Write-Error "❌ $queryName failed: $result"
    }
}

# 7. CLEANUP TEST DATABASE
Write-Host "`nCleaning up test database..."
psql $env:DATABASE_URL -c "DROP DATABASE $testDbName;"
Write-Host "✅ Test database removed" -ForegroundColor Green

Write-Host "`n" + ("="*60)
Write-Host "✅ BACKUP VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host ("="*60)
```

### Verification Checklist

Run this checklist monthly:

- [ ] Automated weekly drill passes successfully
- [ ] Backup files exist in Azure Blob Storage
- [ ] Backup file sizes are reasonable (not 0 KB, not unexpectedly large)
- [ ] Backup file dates are current (last 24 hours)
- [ ] Restore to test database succeeds
- [ ] Schema matches production
- [ ] Row counts match production (or close)
- [ ] Critical queries execute on restored database
- [ ] WAL archiving is active
- [ ] Backup retention policy is being enforced
- [ ] Backup monitoring alerts are working
- [ ] Team knows how to access and restore backups
- [ ] Documentation is up to date

---

## Restore Procedures

### Pre-Restore Checklist

**⚠️ CRITICAL: Always complete this checklist before restore**

```powershell
# 1. IDENTIFY WHAT TO RESTORE
# - Specific point in time?
# - Last known good backup?
# - Specific table?

# 2. DETERMINE RESTORE SCOPE
# - Full database restore?
# - Single table restore?
# - Partial data restore?

# 3. BACKUP CURRENT STATE (if database is still accessible)
# Even if corrupted, backup for forensics
.\scripts\backup-restore-drill.ps1 -BackupDir ".\pre-restore-backup"

# 4. NOTIFY STAKEHOLDERS
# Put application in maintenance mode
# Notify users of downtime

# 5. STOP APPLICATION
docker-compose -f docker-compose.prod.yml down

# 6. VERIFY BACKUP FILE
$backupFile = ".\backups\backup_20260212_040000.sql"
Test-Path $backupFile  # Should return True

Get-Content $backupFile -First 20 | Select-String "PostgreSQL"
# Should see PostgreSQL dump header

# 7. ESTIMATE RESTORE TIME
$backupSize = (Get-Item $backupFile).Length / 1GB
$estimatedMinutes = $backupSize * 10  # Rough estimate: 10 min per GB
Write-Host "Estimated restore time: $estimatedMinutes minutes"

# 8. PREPARE RESTORE DATABASE
# Will we restore to existing DB (drop/recreate) or new DB?
```

### Full Database Restore

**Scenario:** Complete database failure, restore from last good backup

```powershell
# STEP 1: DOWNLOAD BACKUP FROM AZURE (if needed)
$storageAccount = "unioneyesbackups"
$containerName = "database-backups"
$backupFileName = "backup_20260212_040000.sql.zip"
$localBackupDir = ".\restore-backups"

Write-Host "Downloading backup from Azure..."
az storage blob download `
    --account-name $storageAccount `
    --container-name $containerName `
    --name $backupFileName `
    --file "$localBackupDir\$backupFileName"

# Decompress if needed
if ($backupFileName -like "*.zip") {
    Expand-Archive -Path "$localBackupDir\$backupFileName" -DestinationPath $localBackupDir -Force
    $backupFile = Get-ChildItem $localBackupDir -Filter "*.sql" | Select-Object -First 1 -ExpandProperty FullName
} else {
    $backupFile = "$localBackupDir\$backupFileName"
}

Write-Host "✅ Backup downloaded: $backupFile"

# STEP 2: TERMINATE EXISTING CONNECTIONS
Write-Host "`nTerminating existing database connections..."
psql $env:DATABASE_URL -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = current_database() 
    AND pid != pg_backend_pid();"

# STEP 3: DROP AND RECREATE DATABASE (DESTRUCTIVE!)
Write-Host "`n⚠️  WARNING: About to drop and recreate database!"
$confirm = Read-Host "Type 'YES' to confirm"

if ($confirm -ne "YES") {
    Write-Host "Restore aborted."
    exit 1
}

# Parse database name from connection string
if ($env:DATABASE_URL -match '/([^/\?]+)(\?|$)') {
    $dbName = $matches[1]
} else {
    Write-Error "Could not parse database name from DATABASE_URL"
    exit 1
}

# Drop database
Write-Host "Dropping database: $dbName"
psql $env:DATABASE_URL -c "DROP DATABASE IF EXISTS $dbName;"

# Recreate database
Write-Host "Creating fresh database: $dbName"
psql $env:DATABASE_URL -c "CREATE DATABASE $dbName;"

# STEP 4: RESTORE BACKUP
Write-Host "`nRestoring backup to database..."
Write-Host "This may take several minutes..."

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

psql $env:DATABASE_URL -f $backupFile 2>&1 | Tee-Object -FilePath ".\restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

$stopwatch.Stop()

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Restore completed in $($stopwatch.Elapsed.TotalMinutes) minutes" -ForegroundColor Green
} else {
    Write-Error "❌ Restore failed! Check log file."
    exit 1
}

# STEP 5: VERIFY RESTORATION
Write-Host "`nVerifying restoration..."

# Check table counts
psql $env:DATABASE_URL -c "
  SELECT schemaname, count(*) as table_count 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  GROUP BY schemaname;"

# Check critical tables have data
$criticalTables = @("users", "organizations", "claims")
foreach ($table in $criticalTables) {
    $count = psql $env:DATABASE_URL -t -c "SELECT count(*) FROM $table;"
    Write-Host "$table : $count rows"
}

# Test critical query
Write-Host "`nTesting critical queries..."
psql $env:DATABASE_URL -c "
  SELECT u.email, o.name 
  FROM users u 
  JOIN organizations o ON u.organization_id = o.id 
  LIMIT 5;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Critical queries working" -ForegroundColor Green
} else {
    Write-Warning "⚠️  Queries failed. Database may need repair."
}

# STEP 6: RESTART APPLICATION
Write-Host "`nRestarting application..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health check
Start-Sleep -Seconds 30
$health = curl -s https://unioneyes.azurewebsites.net/api/health | ConvertFrom-Json

if ($health.status -eq "ok") {
    Write-Host "✅ Application restored and healthy!" -ForegroundColor Green
} else {
    Write-Warning "⚠️  Application may not be healthy. Check logs."
}

Write-Host "`n" + ("="*60)
Write-Host "✅ FULL DATABASE RESTORE COMPLETE" -ForegroundColor Green
Write-Host ("="*60)
Write-Host "`nNext steps:"
Write-Host "1. Test application functionality"
Write-Host "2. Notify stakeholders of restoration"
Write-Host "3. Monitor for issues"
Write-Host "4. Update incident timeline"
```

### Point-in-Time Restore (PITR)

**Scenario:** Restore database to specific timestamp (requires WAL archiving)

```powershell
# PREREQUISITES: WAL (Write-Ahead Log) archiving must be enabled

# STEP 1: IDENTIFY TARGET POINT IN TIME
$targetTime = "2026-02-12 14:30:00"  # Format: YYYY-MM-DD HH:MM:SS
Write-Host "Target restore point: $targetTime"

# STEP 2: FIND BASE BACKUP BEFORE TARGET TIME
# List backups
az storage blob list `
    --account-name unioneyesbackups `
    --container-name database-backups `
    --output table

# Select backup taken BEFORE target time
$baseBackup = "backup_20260212_040000.sql"

# STEP 3: DOWNLOAD BASE BACKUP AND WAL FILES
$walContainer = "wal-archive"
$restoreDir = ".\pitr-restore"
New-Item -ItemType Directory -Force -Path $restoreDir | Out-Null

# Download base backup
az storage blob download `
    --account-name unioneyesbackups `
    --container-name database-backups `
    --name $baseBackup `
    --file "$restoreDir\$baseBackup"

# Download WAL files (from base backup time to target time)
az storage blob list `
    --account-name unioneyesbackups `
    --container-name $walContainer `
    --output tsv | Out-File "$restoreDir\wal-files.txt"

# STEP 4: RESTORE BASE BACKUP
Write-Host "Restoring base backup..."
$pitrDbName = "union_eyes_pitr_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

psql $env:DATABASE_URL -c "CREATE DATABASE $pitrDbName;"

$pitrDbUrl = $env:DATABASE_URL -replace "/[^/]+(\?|$)", "/$pitrDbName`$1"
psql $pitrDbUrl -f "$restoreDir\$baseBackup"

# STEP 5: CONFIGURE RECOVERY TO TARGET TIME
# Create recovery.conf (PostgreSQL < 12) or recovery.signal (PostgreSQL >= 12)

$recoveryConf = @"
restore_command = 'cp $restoreDir/wal/%f %p'
recovery_target_time = '$targetTime'
recovery_target_action = 'promote'
"@

Set-Content -Path "$pitrDbName\recovery.signal" -Value $recoveryConf

# STEP 6: APPLY WAL FILES
# PostgreSQL will automatically replay WAL files up to target time
Write-Host "Applying WAL files to target time..."

# Restart PostgreSQL to trigger recovery mode
# This process is automatic in managed PostgreSQL (Azure)

# For Docker:
docker-compose -f docker-compose.prod.yml restart postgres

# STEP 7: VERIFY RECOVERY
Write-Host "Verifying recovery to point in time..."

# Check recovery status
psql $pitrDbUrl -c "SELECT pg_is_in_recovery();"

# Query data to verify correct point in time
psql $pitrDbUrl -c "
  SELECT max(created_at) as latest_record 
  FROM claims;"

# Should be <= target time

Write-Host "✅ Point-in-time restore complete to: $targetTime"
```

### Single Table Restore

**Scenario:** Restore only specific tables (e.g., accidentally deleted data)

```powershell
# STEP 1: IDENTIFY TABLE TO RESTORE
$tableName = "claims"
$backupFile = ".\backups\backup_20260212_040000.sql"

# STEP 2: EXTRACT TABLE DATA FROM BACKUP
Write-Host "Extracting $tableName from backup..."

$tableBackup = ".\temp_table_restore_$tableName.sql"

# Extract only the specific table
pg_restore --table=$tableName $backupFile > $tableBackup

# Or if plain text backup:
Select-String -Path $backupFile -Pattern "CREATE TABLE $tableName" -Context 0,1000 | 
    Out-File $tableBackup

# STEP 3: BACKUP CURRENT TABLE STATE (if exists)
Write-Host "Backing up current state of $tableName..."
pg_dump `
    --host=$dbHost `
    --port=$dbPort `
    --username=$dbUser `
    --dbname=$dbName `
    --table=$tableName `
    --file=".\pre-restore-$tableName-$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# STEP 4: RESTORE OPTIONS

# OPTION A: DROP AND RECREATE TABLE (complete replacement)
Write-Host "Option A: Drop and recreate table"
psql $env:DATABASE_URL << 'EOF'
BEGIN;
DROP TABLE IF EXISTS claims CASCADE;
\i $tableBackup
COMMIT;
EOF

# OPTION B: RESTORE TO TEMPORARY TABLE, THEN MERGE
Write-Host "Option B: Merge restore"
psql $env:DATABASE_URL << 'EOF'
BEGIN;

-- Restore to temporary table
CREATE TABLE claims_restore AS SELECT * FROM claims LIMIT 0;
\i $tableBackup

-- Merge missing records (based on primary key)
INSERT INTO claims
SELECT * FROM claims_restore
WHERE id NOT IN (SELECT id FROM claims);

-- Cleanup
DROP TABLE claims_restore;

COMMIT;
EOF

# OPTION C: SELECTIVE RESTORE (specific rows)
Write-Host "Option C: Restore specific rows"
# Requires manual SQL to identify and restore specific rows
# Example: restore deleted rows from specific date
psql $env:DATABASE_URL << 'EOF'
BEGIN;

CREATE TEMP TABLE claims_backup AS 
SELECT * FROM claims_restore_temp
WHERE created_at >= '2026-02-01' AND created_at <= '2026-02-12';

-- Review before committing
SELECT count(*) FROM claims_backup;

-- If OK, insert
INSERT INTO claims SELECT * FROM claims_backup;

COMMIT;
EOF

# STEP 5: VERIFY RESTORATION
Write-Host "`nVerifying table restoration..."
psql $env:DATABASE_URL -c "
  SELECT count(*) as total_rows,
         min(created_at) as earliest,
         max(created_at) as latest
  FROM $tableName;"

Write-Host "✅ Table restore complete: $tableName"
```

### Partial Data Restore (Specific Records)

**Scenario:** Restore specific deleted or corrupted records

```powershell
# STEP 1: IDENTIFY RECORDS TO RESTORE
# Example: Restore claims deleted on 2026-02-12
$deleteDate = "2026-02-12"
$tableName = "claims"

# STEP 2: RESTORE BACKUP TO TEMPORARY DATABASE
$tempDbName = "temp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$backupFile = ".\backups\backup_20260211_040000.sql"  # Backup from before deletion

Write-Host "Restoring backup to temporary database..."
psql $env:DATABASE_URL -c "CREATE DATABASE $tempDbName;"

$tempDbUrl = $env:DATABASE_URL -replace "/[^/]+(\?|$)", "/$tempDbName`$1"
psql $tempDbUrl -f $backupFile

# STEP 3: IDENTIFY RECORDS TO RESTORE
Write-Host "Identifying records to restore..."
psql $tempDbUrl -c "
  SELECT id, title, created_at 
  FROM $tableName 
  WHERE user_id = 123  -- Example criteria
  ORDER BY created_at DESC 
  LIMIT 20;"

# STEP 4: EXPORT SPECIFIC RECORDS
$recordIds = @(1001, 1002, 1003)  # IDs to restore
$exportFile = ".\restore-specific-records.sql"

Write-Host "Exporting specific records..."
$recordIdList = $recordIds -join ","
psql $tempDbUrl << EOF | Out-File $exportFile
SELECT 'INSERT INTO $tableName VALUES (' ||
       string_agg(quote_literal(column_name::text), ', ') || ');'
FROM $tableName
WHERE id IN ($recordIdList);
EOF

# STEP 5: IMPORT TO PRODUCTION
Write-Host "Importing records to production..."
psql $env:DATABASE_URL -f $exportFile

# STEP 6: VERIFY
Write-Host "Verifying import..."
foreach ($id in $recordIds) {
    $exists = psql $env:DATABASE_URL -t -c "SELECT exists(SELECT 1 FROM $tableName WHERE id = $id);"
    if ($exists -eq "t") {
        Write-Host "✅ Record $id restored" -ForegroundColor Green
    } else {
        Write-Warning "⚠️  Record $id NOT found"
    }
}

# STEP 7: CLEANUP
Write-Host "Cleaning up temporary database..."
psql $env:DATABASE_URL -c "DROP DATABASE $tempDbName;"

Write-Host "✅ Partial data restore complete"
```

---

## Disaster Recovery Scenarios

### Scenario 1: Complete Data Center Failure

**Impact:** All primary infrastructure down (database, application, storage)

**Recovery Procedure:**

```powershell
# STEP 1: ACTIVATE DISASTER RECOVERY PLAN
# See: docs/disaster-recovery/force-majeure-plan.md

# STEP 2: PROVISION NEW INFRASTRUCTURE
# Azure Portal or CLI:
az group create --name unioneyes-dr-rg --location westus2

az postgres server create `
    --resource-group unioneyes-dr-rg `
    --name unioneyes-dr-postgres `
    --sku-name GP_Gen5_4 `
    --storage-size 512000 `
    --backup-retention 30

# STEP 3: DOWNLOAD LATEST BACKUP FROM AZURE BLOB
$storageAccount = "unioneyesbackups"  # This should be geo-replicated!
$latestBackup = az storage blob list `
    --account-name $storageAccount `
    --container-name database-backups `
    --query "sort_by([?contains(name, 'backup')], &properties.lastModified)[-1].name" `
    --output tsv

az storage blob download `
    --account-name $storageAccount `
    --container-name database-backups `
    --name $latestBackup `
    --file ".\dr-restore-$latestBackup"

# STEP 4: RESTORE TO NEW DATABASE
$drDbUrl = "postgresql://admin:password@unioneyes-dr-postgres.postgres.database.azure.com:5432/unioneyes"

psql $drDbUrl -f ".\dr-restore-$latestBackup"

# STEP 5: DEPLOY APPLICATION TO NEW INFRASTRUCTURE
# Update DNS or use Traffic Manager to point to DR environment

# STEP 6: VERIFY SERVICES
curl https://unioneyes-dr.azurewebsites.net/api/health

# STEP 7: NOTIFY STAKEHOLDERS
# Services restored, possible data loss = [minutes between backup and failure]
```

**RTO Target:** 4 hours  
**RPO Target:** 6 hours (or less with WAL archiving)

### Scenario 2: Database Corruption

**Impact:** Database accessible but data corrupted or inconsistent

**Recovery Procedure:**

```powershell
# STEP 1: IMMEDIATE ACTIONS
# Stop application to prevent further corruption
docker-compose -f docker-compose.prod.yml down

# STEP 2: BACKUP CORRUPTED STATE (for forensics)
.\scripts\backup-restore-drill.ps1 -BackupDir ".\corrupted-db-backup"

# STEP 3: ASSESS CORRUPTION SCOPE
psql $env:DATABASE_URL << 'EOF'
-- Check for corrupted indexes
SELECT * FROM pg_stat_database WHERE datname = current_database();

-- Check for corrupted tables
SELECT * FROM pg_class WHERE relkind = 'r';

-- Try to identify specific affected tables
\dt+
EOF

# STEP 4: ATTEMPT REPAIR (if corruption is minor)
# Reindex all tables
psql $env:DATABASE_URL -c "REINDEX DATABASE $(current_database());"

# Vacuum full
psql $env:DATABASE_URL -c "VACUUM FULL ANALYZE;"

# STEP 5: IF REPAIR FAILS - Full Restore
# See "Full Database Restore" section above

# STEP 6: VERIFY DATA INTEGRITY
# See "Backup Verification" section
```

### Scenario 3: Ransomware / Malicious Deletion

**Impact:** Data encrypted or deleted by malicious actor

**Recovery Procedure:**

```powershell
# STEP 1: ISOLATE SYSTEMS IMMEDIATELY
# Disconnect from network, stop all services
docker-compose -f docker-compose.prod.yml down

# STEP 2: ASSESS DAMAGE
# DO NOT modify anything - preserve evidence
# Take snapshot of current state

# STEP 3: NOTIFY SECURITY TEAM & AUTHORITIES
# This is a security incident, not just a restore

# STEP 4: IDENTIFY LAST KNOWN GOOD BACKUP (before compromise)
# Review backup timeline and identify point before attack
az storage blob list `
    --account-name unioneyesbackups `
    --container-name database-backups `
    --output table

# STEP 5: RESTORE FROM KNOWN GOOD BACKUP
# Use backup from BEFORE compromise occurred
# May lose data, but ensures no malicious code/data

# STEP 6: REBUILD INFRASTRUCTURE FROM SCRATCH
# Do not restore to compromised infrastructure
# Provision new, clean infrastructure

# STEP 7: CONDUCT SECURITY REVIEW
# Identify breach vector
# Patch vulnerabilities
# Implement additional security measures

# STEP 8: RESTORE TO NEW CLEAN INFRASTRUCTURE
# Follow "Complete Data Center Failure" procedure
```

---

## Testing and Drill Schedule

### Weekly Automated Drill

**Schedule:** Every Sunday at 4:00 AM UTC  
**Duration:** ~30 minutes  
**Automated:** Yes (GitHub Actions)  
**Workflow:** [`.github/workflows/backup-drill.yml`](../../.github/workflows/backup-drill.yml)

**What It Tests:**
- Backup creation
- Backup restore to test database
- Schema verification
- Data integrity
- Query functionality
- Cleanup

**Review Results:**
```powershell
# View latest drill results
gh run list --workflow=backup-drill.yml --limit 1

# View detailed log
gh run view [RUN_ID] --log
```

### Monthly Full Restore Drill

**Schedule:** First Sunday of each month  
**Duration:** 2-4 hours  
**Automated:** No (manual procedure)  
**Owner:** DevOps On-Call Engineer

**Procedure:**
1. Schedule maintenance window (off-peak hours)
2. Notify stakeholders of drill
3. Perform full database restore to staging environment
4. Verify application functionality on staging
5. Document any issues encountered
6. Update runbooks with lessons learned
7. Report results to team

**Checklist:**
- [ ] Latest backup downloaded from Azure
- [ ] Staging database restored successfully
- [ ] Schema matches production
- [ ] Row counts verified
- [ ] Application deployed to staging
- [ ] Health checks pass
- [ ] User login test passes
- [ ] Critical features tested
- [ ] Performance within acceptable range
- [ ] Issues documented
- [ ] Runbook updated
- [ ] Results reported

### Quarterly Disaster Recovery Exercise

**Schedule:** Quarterly (Q1, Q2, Q3, Q4)  
**Duration:** 4-8 hours  
**Automated:** No (full team exercise)  
**Owner:** Engineering Manager

**Scenarios to Test:**
1. Q1: Complete data center failure
2. Q2: Database corruption
3. Q3: Accidental data deletion
4. Q4: Ransomware attack simulation

**Exercise Format:**
1. Scenario announcement (surprise or scheduled)
2. Activate incident response team
3. Execute disaster recovery procedures
4. Time all recovery steps
5. Verify services restored
6. Conduct post-exercise review (PIR)
7. Update disaster recovery plans

---

## Monitoring and Alerting

### Backup Health Monitoring

```yaml
# monitoring/prometheus/alerts.yml (add these rules)

- alert: BackupFailed
  expr: backup_last_success_timestamp < (time() - 86400*2)
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Backup has not succeeded in 2 days"
    description: "Last successful backup: {{ $value | humanizeDuration }}"

- alert: BackupVerificationFailed
  expr: backup_verification_last_success < (time() - 86400*7)
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Backup verification drill has not succeeded in 7 days"
    description: "Review GitHub Actions: backup-drill.yml"

- alert: BackupSizeAnomaly
  expr: abs(backup_size_bytes - avg_over_time(backup_size_bytes[7d])) / avg_over_time(backup_size_bytes[7d]) > 0.5
  for: 30m
  labels:
    name: warning
  annotations:
    summary: "Backup size significantly different from average"
    description: "Current: {{ $value }}, Average: {{ $avg }}"
```

### Backup Metrics to Track

```powershell
# Collect these metrics for monitoring dashboard

@{
    "backup_last_execution_timestamp" = (Get-Date).ToFileTimeUtc()
    "backup_duration_seconds" = 1234
    "backup_size_bytes" = 5000000000
    "backup_verification_last_success" = (Get-Date).ToFileTimeUtc()
    "backup_restoration_test_count" = 52  # Annual count
    "backup_failures_total" = 0
    "backup_retention_days" = 30
    "backup_storage_usage_bytes" = 150000000000
}
```

### Monitoring Dashboard

**Grafana Dashboard:** "Backup Health"

**Panels:**
1. Last Backup Time (should be < 24 hours)
2. Backup Size Trend (should be stable or growing slowly)
3. Backup Duration (should be stable)
4. Failed Backups (should be 0)
5. Verification Test Results (weekly, should pass)
6. Storage Usage (track against budget)
7. Retention Policy Compliance (backups older than policy should be deleted)

---

## Related Documentation

- **Incident Response:** [`incident-response.md`](./incident-response.md)
- **Rollback Procedures:** [`rollback.md`](./rollback.md)
- **Disaster Recovery Plan:** [`../disaster-recovery/force-majeure-plan.md`](../disaster-recovery/force-majeure-plan.md)
- **Backup Script:** [`../../scripts/backup-restore-drill.ps1`](../../scripts/backup-restore-drill.ps1)
- **GitHub Actions:** [`../../.github/workflows/backup-drill.yml`](../../.github/workflows/backup-drill.yml)

---

## Appendix: Quick Reference

### Emergency Restore Commands

```powershell
# Full database restore (most common)
.\scripts\backup-restore-drill.ps1 -BackupDir ".\backups"
psql $env:DATABASE_URL -f ".\backups\[latest_backup].sql"

# Download from Azure
az storage blob download --account-name unioneyesbackups --container-name database-backups --name [backup] --file [local_path]

# Point-in-time restore
# Requires WAL archiving setup

# Single table restore
pg_restore --table=[table_name] [backup_file] | psql $env:DATABASE_URL

# Verify restore
psql $env:DATABASE_URL -c "SELECT count(*) FROM users;"
```

### Backup Retention Quick Reference

| Frequency | Retention | Storage |
|-----------|-----------|---------|
| Hourly (WAL) | 7 days | Azure Blob (Hot) |
| Daily | 30 days | Azure Blob (Cool) |
| Weekly | 90 days | Azure Blob (Cool) |
| Monthly | 12 months | Azure Blob (Archive) |
| Annual | 7 years | Azure Blob (Archive) |

### Contact Information for Emergencies

```
DBA On-Call: [Phone/PagerDuty]
DevOps Lead: [Phone/PagerDuty]
Azure Support: [Support Contract #]
Backup Storage Account: unioneyesbackups
Resource Group: unioneyes-prod-rg
```

---

**END OF RUNBOOK**

*"In God we trust. All others must test their backups."*

**Last Review:** February 12, 2026  
**Next Review:** May 12, 2026  
**Last Drill:** February 12, 2026 (Weekly automated)  
**Last Full Restore Test:** February 1, 2026  
**Document Owner:** DevOps Team
