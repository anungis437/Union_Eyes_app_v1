# Apply Consolidated Migration - Migrations 0060 and 0061
# Idempotent - Safe to re-run

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Applying Migrations 0060 and 0061" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Load DATABASE_URL from .env.local
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^DATABASE_URL=(.+)$') {
            $url = $matches[1]
            $url = $url.Trim().Trim('"').Trim("'")
            $env:DATABASE_URL = $url
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "[ERROR] DATABASE_URL not found in .env.local" -ForegroundColor Red
    exit 1
}

# Parse PostgreSQL URL
$url = $env:DATABASE_URL
# Remove query parameters like ?sslmode=require
$url = $url -replace '\?.*$', ''

if ($url -match 'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)') {
    $PGUSER = $matches[1]
    $PGPASSWORD = $matches[2]
    $PGHOST = $matches[3]
    $PGPORT = if ($matches[4]) { $matches[4] } else { "5432" }
    $PGDATABASE = $matches[5]
    
    Write-Host "Database: $PGDATABASE at $PGHOST" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[ERROR] Failed to parse DATABASE_URL" -ForegroundColor Red
    Write-Host "URL format: $url" -ForegroundColor Red
    exit 1
}

# Set password environment variable for psql
$env:PGPASSWORD = $PGPASSWORD

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "[ERROR] psql command not found. Install PostgreSQL client tools." -ForegroundColor Red
    Write-Host "        Download: https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

# Run migration
Write-Host "Executing SQL migration..." -ForegroundColor Yellow
Write-Host "File: db/migrations/manual/apply_0060_0061_consolidated.sql" -ForegroundColor Gray
Write-Host ""

$migrationFile = "db/migrations/manual/apply_0060_0061_consolidated.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "[ERROR] Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

# Execute migration using psql
$result = & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f $migrationFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Migration completed!" -ForegroundColor Green
    Write-Host ""
    
    # Show NOTICE output (migration status)
    $notices = $result | Select-String -Pattern "NOTICE:"
    if ($notices) {
        Write-Host "Migration Status:" -ForegroundColor Cyan
        foreach ($notice in $notices) {
            $line = $notice.Line -replace "^NOTICE:\s+", ""
            Write-Host "  $line" -ForegroundColor White
        }
        Write-Host ""
    }
    
    # Verify tables were created
    Write-Host "Verifying tables..." -ForegroundColor Gray
    $checkQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('defensibility_packs', 'pack_download_log', 'pack_verification_log') ORDER BY tablename;"
    $tables = & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c $checkQuery 2>&1
    
    if ($tables -and ($tables -notmatch "ERROR")) {
        Write-Host "Tables found:" -ForegroundColor Green
        foreach ($table in $tables) {
            $tbl = $table.Trim()
            if ($tbl) {
                Write-Host "  [OK] $tbl" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  [WARNING] Unable to verify tables" -ForegroundColor Yellow
    }
    
} else {
    Write-Host ""
    Write-Host "[FAILED] Migration failed" -ForegroundColor Red
    Write-Host ""
    
    # Show ERROR lines
    $errors = $result | Select-String -Pattern "ERROR:"
    if ($errors) {
        Write-Host "Errors:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  $error" -ForegroundColor Red
        }
    } else {
        # Show all output if no ERROR lines found
        Write-Host $result -ForegroundColor Red
    }
    
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
