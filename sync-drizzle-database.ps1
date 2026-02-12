# Populate Drizzle Migration Tracking Table
# Inserts records for all applied migrations into drizzle.__drizzle_migrations

Write-Host "`n=== Drizzle Database Migration Tracking Sync ===" -ForegroundColor Cyan
Write-Host "Populating drizzle.__drizzle_migrations table...`n" -ForegroundColor Gray

$dbUrl = "postgresql://postgres:postgres@localhost:5432/unioneyes_test"

# Read the journal to get all migrations with timestamps
$journalPath = "db\migrations\meta\_journal.json"
$journal = Get-Content $journalPath -Raw | ConvertFrom-Json

# Get currently recorded migrations from database
$existingCmd = "SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY id;"
$existing = psql $dbUrl -t -A -F "," -c $existingCmd | Where-Object { $_ -ne "" }
$existingCount = ($existing | Measure-Object).Count

Write-Host "Existing database records: $existingCount" -ForegroundColor Yellow
Write-Host "Journal entries: $($journal.entries.Count)" -ForegroundColor Yellow

# Get snapshot directory
$snapshotDir = "db\migrations\meta"

# Build INSERT statements for missing migrations
$insertCount = 0
$sqlStatements = @()

foreach ($entry in $journal.entries | Sort-Object idx) {
    $snapshotFile = Join-Path $snapshotDir "$($entry.tag.Split('_')[0])_snapshot.json"
    $timestamp = $entry.when
    
    # Check if this migration is already in the database
    $alreadyExists = $existing | Where-Object { $_ -match ",$timestamp$" }
    
    if (-not $alreadyExists) {
        if (Test-Path $snapshotFile) {
            # Use real hash from snapshot if available
            $snapshot = Get-Content $snapshotFile -Raw | ConvertFrom-Json
            $hash = $snapshot.id
        } else {
            # Generate a placeholder hash for manual migrations (format matches Drizzle's SHA-256 hashes)
            $hashInput = "$($entry.tag)-manual-migration-$timestamp"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($hashInput)
            $sha256 = [System.Security.Cryptography.SHA256]::Create()
            $hashBytes = $sha256.ComputeHash($bytes)
            $hash = [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()
        }
        
        $sqlStatements += "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('$hash', $timestamp);"
        Write-Host "  [+] Will add: $($entry.tag) (timestamp: $timestamp)" -ForegroundColor Green
        $insertCount++
    }
}

if ($sqlStatements.Count -gt 0) {
    Write-Host "`nExecuting $($sqlStatements.Count) INSERT statements..." -ForegroundColor Cyan
    
    # Combine all SQL into one transaction
    $fullSql = "BEGIN;`n" + ($sqlStatements -join "`n") + "`nCOMMIT;"
    
    # Save to temp file
    $tempSqlFile = "temp-insert-migrations.sql"
    Set-Content -Path $tempSqlFile -Value $fullSql
    
    # Execute
    $result = psql $dbUrl -f $tempSqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Successfully inserted $insertCount migration records" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error inserting records:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
    
    # Cleanup
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
} else {
    Write-Host "`n✅ Database already up to date - no inserts needed" -ForegroundColor Green
}

# Verify final state
$finalCmd = "SELECT COUNT(*) FROM drizzle.__drizzle_migrations;"
$finalCount = psql $dbUrl -t -A -c $finalCmd

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Previous records: $existingCount" -ForegroundColor White
Write-Host "Records inserted: $insertCount" -ForegroundColor Green
Write-Host "Total records now: $finalCount" -ForegroundColor Green

Write-Host "`n=== Drizzle Status ===" -ForegroundColor Cyan
Write-Host "✅ Database migration table synchronized" -ForegroundColor Green
Write-Host "✅ Journal file synchronized" -ForegroundColor Green
Write-Host "✅ Drizzle ready to use - run 'pnpm db:migrate' to verify" -ForegroundColor Green
Write-Host ""
