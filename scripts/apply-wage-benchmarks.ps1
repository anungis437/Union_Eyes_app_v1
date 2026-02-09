# Apply Wage Benchmarks Migration (0062)
# Creates 5 tables for external data integration

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Applying Migration 0062: Wage Benchmarks" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Load DATABASE_URL
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^DATABASE_URL=(.+)$') {
            $url = $matches[1].Trim().Trim('"').Trim("'")
            $env:DATABASE_URL = $url
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "[ERROR] DATABASE_URL not found" -ForegroundColor Red
    exit 1
}

# Parse connection string (strip query params)
$url = $env:DATABASE_URL -replace '\?.*$', ''
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
    exit 1
}

$env:PGPASSWORD = $PGPASSWORD

# Check psql
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] psql not found" -ForegroundColor Red
    exit 1
}

# Apply migration
Write-Host "Executing migration..." -ForegroundColor Yellow
Write-Host "File: db/migrations/manual/0062_add_wage_benchmarks_only.sql" -ForegroundColor Gray
Write-Host ""

$migrationFile = "db/migrations/manual/0062_add_wage_benchmarks_only.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "[ERROR] Migration file not found" -ForegroundColor Red
    exit 1
}

$result = & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f $migrationFile 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Migration completed!" -ForegroundColor Green
    Write-Host ""
    
    # Show NOTICE output
    $notices = $result | Select-String -Pattern "NOTICE:"
    if ($notices) {
        Write-Host "Migration Status:" -ForegroundColor Cyan
        foreach ($notice in $notices) {
            $line = $notice.Line -replace "^NOTICE:\s+", ""
            Write-Host "  $line" -ForegroundColor White
        }
        Write-Host ""
    }
    
    # Verify tables
    Write-Host "Verifying tables..." -ForegroundColor Gray
    $checkQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('wage_benchmarks', 'union_density', 'cost_of_living_data', 'contribution_rates', 'external_data_sync_log') ORDER BY tablename;"
    $tables = & psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c $checkQuery 2>&1
    
    if ($tables -and ($tables -notmatch "ERROR")) {
        Write-Host "Tables found:" -ForegroundColor Green
        foreach ($table in $tables) {
            $tbl = $table.Trim()
            if ($tbl) {
                Write-Host "  [OK] $tbl" -ForegroundColor Green
            }
        }
    }
    
} else {
    Write-Host ""
    Write-Host "[FAILED] Migration failed" -ForegroundColor Red
    Write-Host ""
    
    $errors = $result | Select-String -Pattern "ERROR:"
    if ($errors) {
        Write-Host "Errors:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  $error" -ForegroundColor Red
        }
    } else {
        Write-Host $result -ForegroundColor Red
    }
    
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Complete!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
