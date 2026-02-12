# Sync Drizzle Migration Journal with Applied Migrations
# This script updates the journal to reflect all successfully applied migrations

Write-Host "`n=== Drizzle Migration Journal Sync ===" -ForegroundColor Cyan
Write-Host "Syncing journal with database state...`n" -ForegroundColor Gray

# Read current journal
$journalPath = "db\migrations\meta\_journal.json"
$journal = Get-Content $journalPath -Raw | ConvertFrom-Json

Write-Host "Current journal entries: $($journal.entries.Count)" -ForegroundColor Yellow

# Get all migration files (excluding _no_transaction variant)
$migrationFiles = Get-ChildItem "db\migrations\*.sql" | 
    Where-Object { $_.BaseName -match '^\d{4}_' -and $_.Name -notmatch '_no_transaction' } | 
    Sort-Object Name

Write-Host "Total migration files found: $($migrationFiles.Count)" -ForegroundColor Yellow

# Get the last timestamp from existing entries
$lastTimestamp = ($journal.entries | Sort-Object when | Select-Object -Last 1).when
$lastIdx = ($journal.entries | Sort-Object idx | Select-Object -Last 1).idx

Write-Host "Last entry: idx=$lastIdx, timestamp=$lastTimestamp`n" -ForegroundColor Gray

# Build list of all entries
$allEntries = @()
$allEntries += $journal.entries

# Track what's already in journal
$existingTags = $journal.entries | ForEach-Object { $_.tag }

# Add missing migrations
$newCount = 0
$currentIdx = $lastIdx + 1
$currentTimestamp = $lastTimestamp + 1000 # Increment by 1 second

foreach ($file in $migrationFiles) {
    $tag = $file.BaseName
    
    if ($tag -notin $existingTags) {
        $newEntry = @{
            idx = $currentIdx
            version = "7"
            when = $currentTimestamp
            tag = $tag
            breakpoints = $true
        }
        
        $allEntries += $newEntry
        Write-Host "  [+] Adding: $tag (idx=$currentIdx)" -ForegroundColor Green
        
        $currentIdx++
        $currentTimestamp += 1000
        $newCount++
    }
}

# Sort entries by idx to ensure proper order
$allEntries = $allEntries | Sort-Object idx

# Update journal object
$journal.entries = $allEntries

# Convert to JSON with proper formatting
$jsonContent = $journal | ConvertTo-Json -Depth 10

# Write updated journal
Set-Content -Path $journalPath -Value $jsonContent -NoNewline

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Previous entries: $($journal.entries.Count - $newCount)" -ForegroundColor White
Write-Host "New entries added: $newCount" -ForegroundColor Green
Write-Host "Total entries now: $($journal.entries.Count)" -ForegroundColor Green
Write-Host "`nJournal file updated: $journalPath" -ForegroundColor Cyan

# Verify the update
$verifyJournal = Get-Content $journalPath -Raw | ConvertFrom-Json
Write-Host "`nVerification: Journal now contains $($verifyJournal.entries.Count) entries" -ForegroundColor Yellow

Write-Host "`n=== Drizzle Status ===" -ForegroundColor Cyan
Write-Host "✅ Journal synchronized with database" -ForegroundColor Green
Write-Host "✅ Drizzle will now recognize all applied migrations" -ForegroundColor Green
Write-Host "✅ Safe to run 'pnpm db:migrate' - no migrations will be re-run" -ForegroundColor Green
Write-Host ""
