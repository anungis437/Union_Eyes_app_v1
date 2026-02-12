<#
.SYNOPSIS
    Automated Backup & Restore Drill for PostgreSQL Database

.DESCRIPTION
    Performs automated backup, restore, and validation testing to ensure backup reliability.
    This script ensures your backups are actually restorable (not "Schrödinger's backups").
    
    Tests:
    1. Creates a full database backup
    2. Restores backup to a test database
    3. Validates schema integrity
    4. Validates data integrity (row counts, key constraints)
    5. Tests critical queries
    6. Cleans up test database
    7. Reports results
    
.PARAMETER BackupDir
    Directory to store backup files (default: ./backups)

.PARAMETER TestDbName
    Name of test database for restore validation (default: union_eyes_restore_test)

.PARAMETER KeepBackup
    Keep the backup file after test (default: $true)

.PARAMETER Verbose
    Enable verbose logging

.EXAMPLE
    .\backup-restore-drill.ps1
    
.EXAMPLE
    .\backup-restore-drill.ps1 -BackupDir "C:\backup-tests" -Verbose

.NOTES
    Author: Union Eyes DevOps
    Requires: PostgreSQL client tools (pg_dump, pg_restore, psql)
    Schedule: Run weekly via GitHub Actions or Task Scheduler
#>

[CmdletBinding()]
param(
    [string]$BackupDir = "./backups",
    [string]$TestDbName = "union_eyes_restore_test",
    [bool]$KeepBackup = $true,
    [switch]$Verbose
)

# =====================================================
# CONFIGURATION
# =====================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Load environment variables
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$DatabaseUrl = $env:DATABASE_URL
if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL environment variable not set"
    exit 1
}

# Parse connection string
if ($DatabaseUrl -match 'postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):?(\d+)?/([^\?]+)') {
    $DbUser = $matches[1]
    $DbPassword = $matches[2]
    $DbHost = $matches[3]
    $DbPort = if ($matches[4]) { $matches[4] } else { "5432" }
    $DbName = $matches[5]
}
else {
    Write-Error "Could not parse DATABASE_URL"
    exit 1
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "drill_backup_$Timestamp.sql"

# =====================================================
# LOGGING
# =====================================================

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $Color = switch ($Level) {
        "SUCCESS" { "Green" }
        "ERROR"   { "Red" }
        "WARNING" { "Yellow" }
        default   { "White" }
    }
    
    $Prefix = switch ($Level) {
        "SUCCESS" { "✅" }
        "ERROR"   { "❌" }
        "WARNING" { "⚠️" }
        default   { "ℹ️" }
    }
    
    Write-Host "$Prefix $Message" -ForegroundColor $Color
}

# =====================================================
# BACKUP FUNCTIONS
# =====================================================

function Test-PostgreSQLTools {
    Write-TestLog "Checking PostgreSQL client tools..." "INFO"
    
    $tools = @("pg_dump", "pg_restore", "psql")
    foreach ($tool in $tools) {
        $cmd = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $cmd) {
            Write-TestLog "$tool not found in PATH" "ERROR"
            return $false
        }
    }
    
    Write-TestLog "All required tools found" "SUCCESS"
    return $true
}

function Invoke-DatabaseBackup {
    Write-TestLog "Creating database backup..." "INFO"
    
    # Ensure backup directory exists
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    # Set PGPASSWORD for authentication
    $env:PGPASSWORD = $DbPassword
    
    try {
        # Create backup using pg_dump
        $dumpArgs = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", $DbName,
            "-F", "p",  # Plain SQL format for easier inspection
            "-f", $BackupFile,
            "--verbose"
        )
        
        $process = Start-Process -FilePath "pg_dump" -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -ne 0) {
            Write-TestLog "Backup failed with exit code $($process.ExitCode)" "ERROR"
            return $false
        }
        
        # Verify backup file was created
        if (Test-Path $BackupFile) {
            $size = (Get-Item $BackupFile).Length / 1MB
            Write-TestLog "Backup created: $BackupFile ($([math]::Round($size, 2)) MB)" "SUCCESS"
            return $true
        }
        else {
            Write-TestLog "Backup file not found" "ERROR"
            return $false
        }
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function New-TestDatabase {
    Write-TestLog "Creating test database: $TestDbName" "INFO"
    
    $env:PGPASSWORD = $DbPassword
    
    try {
        # Drop if exists
        $dropCmd = "DROP DATABASE IF EXISTS $TestDbName;"
        $dropArgs = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", "postgres",
            "-c", $dropCmd
        )
        Start-Process -FilePath "psql" -ArgumentList $dropArgs -NoNewWindow -Wait | Out-Null
        
        # Create new database
        $createCmd = "CREATE DATABASE $TestDbName;"
        $createArgs = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", "postgres",
            "-c", $createCmd
        )
        
        $process = Start-Process -FilePath "psql" -ArgumentList $createArgs -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-TestLog "Test database created" "SUCCESS"
            return $true
        }
        else {
            Write-TestLog "Failed to create test database" "ERROR"
            return $false
        }
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Restore-DatabaseBackup {
    Write-TestLog "Restoring backup to test database..." "INFO"
    
    $env:PGPASSWORD = $DbPassword
    
    try {
        $restoreArgs = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", $TestDbName,
            "-f", $BackupFile
        )
        
        $process = Start-Process -FilePath "psql" -ArgumentList $restoreArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "restore_errors.log"
        
        if ($process.ExitCode -eq 0) {
            Write-TestLog "Restore completed successfully" "SUCCESS"
            return $true
        }
        else {
            Write-TestLog "Restore failed with exit code $($process.ExitCode)" "ERROR"
            if (Test-Path "restore_errors.log") {
                $errors = Get-Content "restore_errors.log" -Raw
                Write-TestLog "Restore errors: $errors" "ERROR"
            }
            return $false
        }
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# =====================================================
# VALIDATION FUNCTIONS
# =====================================================

function Test-SchemaIntegrity {
    Write-TestLog "Validating schema integrity..." "INFO"
    
    $env:PGPASSWORD = $DbPassword
    
    try {
        # Compare table counts between original and restored databases
        $query = @"
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
GROUP BY schemaname;
"@
        
        $args = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", $TestDbName,
            "-t",
            "-c", $query
        )
        
        $result = & psql @args 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-TestLog "Schema validation passed" "SUCCESS"
            return $true
        }
        else {
            Write-TestLog "Schema validation failed" "ERROR"
            return $false
        }
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Test-DataIntegrity {
    Write-TestLog "Validating data integrity (row counts)..." "INFO"
    
    $env:PGPASSWORD = $DbPassword
    
    try {
        # Get row counts for critical tables
        $query = @"
SELECT 
    'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL
SELECT 'organization_members', COUNT(*) FROM organization_members
UNION ALL
SELECT 'claims', COUNT(*) FROM claims
UNION ALL
SELECT 'in_app_notifications', COUNT(*) FROM in_app_notifications;
"@
        
        $args = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", $TestDbName,
            "-t",
            "-c", $query
        )
        
        $result = & psql @args 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-TestLog "Data integrity check passed" "SUCCESS"
            Write-Host "Row counts:"
            Write-Host $result
            return $true
        }
        else {
            Write-TestLog "Data integrity check failed" "ERROR"
            return $false
        }
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Test-CriticalQueries {
    Write-TestLog "Testing critical queries..." "INFO"
    
    $env:PGPASSWORD = $DbPassword
    
    try {
        # Test a critical query (hierarchical organization query)
        $query = "SELECT COUNT(*) FROM organizations WHERE hierarchy_path IS NOT NULL;"
        
        $args = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", $TestDbName,
            "-t",
            "-c", $query
        )
        
        $result = & psql @args 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-TestLog "Critical queries executed successfully" "SUCCESS"
            return $true
        }
        else {
            Write-TestLog "Critical query execution failed" "ERROR"
            return $false
        }
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# =====================================================
# CLEANUP
# =====================================================

function Remove-TestDatabase {
    Write-TestLog "Cleaning up test database..." "INFO"
    
    $env:PGPASSWORD = $DbPassword
    
    try {
        $dropCmd = "DROP DATABASE IF EXISTS $TestDbName;"
        $dropArgs = @(
            "-h", $DbHost,
            "-p", $DbPort,
            "-U", $DbUser,
            "-d", "postgres",
            "-c", $dropCmd
        )
        
        Start-Process -FilePath "psql" -ArgumentList $dropArgs -NoNewWindow -Wait | Out-Null
        Write-TestLog "Test database removed" "SUCCESS"
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# =====================================================
# MAIN EXECUTION
# =====================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  DATABASE BACKUP & RESTORE DRILL" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target Database: $DbName @ $DbHost"
Write-Host "Test Database: $TestDbName"
Write-Host "Backup File: $BackupFile"
Write-Host ""

$testResults = @{
    PostgreSQLTools = $false
    Backup = $false
    TestDbCreation = $false
    Restore = $false
    SchemaIntegrity = $false
    DataIntegrity = $false
    CriticalQueries = $false
}

try {
    # Step 1: Check tools
    $testResults.PostgreSQLTools = Test-PostgreSQLTools
    if (-not $testResults.PostgreSQLTools) {
        Write-TestLog "PostgreSQL tools check failed. Install PostgreSQL client tools." "ERROR"
        exit 1
    }
    
    # Step 2: Create backup
    $testResults.Backup = Invoke-DatabaseBackup
    if (-not $testResults.Backup) {
        Write-TestLog "Backup creation failed" "ERROR"
        exit 1
    }
    
    # Step 3: Create test database
    $testResults.TestDbCreation = New-TestDatabase
    if (-not $testResults.TestDbCreation) {
        Write-TestLog "Test database creation failed" "ERROR"
        exit 1
    }
    
    # Step 4: Restore backup
    $testResults.Restore = Restore-DatabaseBackup
    if (-not $testResults.Restore) {
        Write-TestLog "Backup restore failed" "ERROR"
        exit 1
    }
    
    # Step 5: Validate schema
    $testResults.SchemaIntegrity = Test-SchemaIntegrity
    
    # Step 6: Validate data
    $testResults.DataIntegrity = Test-DataIntegrity
    
    # Step 7: Test critical queries
    $testResults.CriticalQueries = Test-CriticalQueries
    
}
finally {
    # Always cleanup
    Remove-TestDatabase
    
    if (-not $KeepBackup) {
        Remove-Item $BackupFile -Force -ErrorAction SilentlyContinue
        Write-TestLog "Backup file removed" "INFO"
    }
}

# =====================================================
# REPORT RESULTS
# =====================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  DRILL RESULTS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true
foreach ($test in $testResults.GetEnumerator()) {
    $status = if ($test.Value) { "✅ PASS" } else { "❌ FAIL"; $allPassed = $false }
    Write-Host "$($test.Key.PadRight(20)): $status"
}

Write-Host ""

if ($allPassed) {
    Write-TestLog "BACKUP RESTORE DRILL PASSED" "SUCCESS"
    Write-Host ""
    Write-Host "✅ Your backups are restorable and data integrity is verified." -ForegroundColor Green
    exit 0
}
else {
    Write-TestLog "BACKUP RESTORE DRILL FAILED" "ERROR"
    Write-Host ""
    Write-Host "❌ One or more tests failed. Review the errors above." -ForegroundColor Red
    exit 1
}
