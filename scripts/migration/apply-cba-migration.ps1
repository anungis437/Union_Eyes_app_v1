# Apply CBA Intelligence Manual Migration
# This script applies the CBA Intelligence database schema to Azure PostgreSQL

Write-Host "🚀 Starting CBA Intelligence Migration..." -ForegroundColor Green
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ ERROR: psql command not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "2. Or use Azure Portal Query Editor (instructions below)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "=== ALTERNATIVE: Use Azure Portal ===" -ForegroundColor Yellow
    Write-Host "1. Open: https://portal.azure.com" -ForegroundColor Cyan
    Write-Host "2. Navigate to: unioneyes-staging-db (PostgreSQL flexible server)" -ForegroundColor Cyan
    Write-Host "3. Click 'Query Editor' in left sidebar" -ForegroundColor Cyan
    Write-Host "4. Open file: db\migrations\cba_intelligence_manual.sql" -ForegroundColor Cyan
    Write-Host "5. Copy all 380 lines and paste into Query Editor" -ForegroundColor Cyan
    Write-Host "6. Click 'Run' button" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Read DATABASE_URL from .env.local
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ ERROR: .env.local file not found" -ForegroundColor Red
    exit 1
}

$databaseUrl = Get-Content $envFile | Select-String -Pattern 'DATABASE_URL="([^"]+)"' | ForEach-Object { $_.Matches.Groups[1].Value }

if (-not $databaseUrl) {
    Write-Host "❌ ERROR: DATABASE_URL not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "📊 Database: unioneyes-staging-db" -ForegroundColor Cyan
Write-Host "📂 Migration file: db\migrations\cba_intelligence_manual.sql" -ForegroundColor Cyan
Write-Host ""

# Confirm before proceeding
Write-Host "⚠️  This will create 11 new tables, 9 enums, and 47 indexes" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (y/n)"

if ($confirm -ne "y") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Applying migration..." -ForegroundColor Green

# Apply migration
$migrationFile = "db\migrations\cba_intelligence_manual.sql"
$env:PGPASSWORD = $databaseUrl -replace '.*:([^@]+)@.*', '$1'

try {
    psql $databaseUrl -f $migrationFile 2>&1 | Tee-Object -Variable output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Validate tables created
        Write-Host "Validating tables..." -ForegroundColor Cyan
        
        $query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE 'cba%' OR table_name LIKE '%arbitr%' OR table_name = 'bargaining_notes' OR table_name = 'claim_precedent_analysis') ORDER BY table_name;"
        
        $tables = psql $databaseUrl -t -c $query
        $tableCount = ($tables | Measure-Object -Line).Lines
        
        Write-Host ""
        Write-Host "Tables created:" -ForegroundColor Green
        $tables | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
        Write-Host ""
        Write-Host "Total: $tableCount tables (expected: 11)" -ForegroundColor Green
        
        if ($tableCount -eq 11) {
            Write-Host ""
            Write-Host "✨ All tables created successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Yellow
            Write-Host "1. Run: pnpm dev" -ForegroundColor Cyan
            Write-Host "2. Navigate to: http://localhost:3000/collective-agreements" -ForegroundColor Cyan
            Write-Host "3. Create API routes in: app/api/cba/" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "⚠️  Warning: Expected 11 tables, found $tableCount" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Yellow
        Write-Host $output -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error applying migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
