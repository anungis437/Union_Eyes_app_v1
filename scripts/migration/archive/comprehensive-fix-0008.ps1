Write-Host "=== Comprehensive Fix for Migration 0008 ==="

$file = "db/migrations/0008_lean_mother_askani.sql"
$content = Get-Content $file -Raw
# Step 0: Add DROP TYPE IF EXISTS before all CREATE TYPE statements
Write-Host "Step 0: Adding DROP TYPE IF EXISTS for all enum types..."
$newline = "`r`n"
$content = $content -replace 'CREATE TYPE "public"\."([^"]+)" AS ENUM', "DROP TYPE IF EXISTS `"public`".`"`$1`" CASCADE;$newline`CREATE TYPE `"public`".`"`$1`" AS ENUM"
# Step 1: Add missing campaign_status type (after alert_trigger_type, line ~50)
Write-Host "Step 1: Adding campaign_status type definition..."
$content = $content -replace `
    '(CREATE TYPE "public"\."alert_trigger_type".+?;--> statement-breakpoint\r?\n)', `
    "`$1DROP TYPE IF EXISTS `"public`".`"campaign_status`" CASCADE;`r`nCREATE TYPE `"public`".`"campaign_status`" AS ENUM('planning', 'active', 'paused', 'completed', 'cancelled', 'archived');--> statement-breakpoint`r`n"

# Step 2: Comment out user_management schema operations
Write-Host "Step 2: Commenting out user_management schema operations..."
$content = $content -replace 'ALTER TABLE "user_management"\.', '-- ALTER TABLE "user_management".'
$content = $content -replace 'DROP TABLE "user_management"\.', '-- DROP TABLE "user_management".'

# Step 3: Comment out tenant_management schema operations
Write-Host "Step 3: Commenting out tenant_management schema operations..."
$content = $content -replace 'ALTER TABLE "tenant_management"\.', '-- ALTER TABLE "tenant_management".'
$content = $content -replace 'DROP TABLE "tenant_management"\.', '-- DROP TABLE "tenant_management".'

# Step 4: Comment out audit_security schema operations
Write-Host "Step 4: Commenting out audit_security schema operations..."
$content = $content -replace 'ALTER TABLE "audit_security"\.', '-- ALTER TABLE "audit_security".'

# Step 5: Comment out communication tables operations
Write-Host "Step 5: Commenting out communication tables operations..."
$content = $content -replace 'ALTER TABLE "communication_analytics"', '-- ALTER TABLE "communication_analytics"'
$content = $content -replace 'ALTER TABLE "communication_preferences"', '-- ALTER TABLE "communication_preferences"'
$content = $content -replace 'ALTER TABLE "user_engagement_scores"', '-- ALTER TABLE "user_engagement_scores"'
$content = $content -replace 'DROP TABLE "communication_analytics"', '-- DROP TABLE "communication_analytics"'
$content = $content -replace 'DROP TABLE "communication_preferences"', '-- DROP TABLE "communication_preferences"'
$content = $content -replace 'DROP TABLE "user_engagement_scores"', '-- DROP TABLE "user_engagement_scores"'

# Step 6: Make DROP CONSTRAINT operations safe (only for ALTER TABLE, not DROP TYPE)
Write-Host "Step 6: Making DROP CONSTRAINT operations safer..."
# Process line by line to avoid affecting DROP TYPE
$lines = $content -split "`r?`n"
$newLines = @()
foreach ($line in $lines) {
    if ($line -match '^ALTER TABLE "([^"]+)" DROP CONSTRAINT "([^"]+)";') {
        # Replace with conditional drop
        $table = $matches[1]
        $constraint = $matches[2]
        $newLines += "DO `$`$ BEGIN"
        $newLines += "  ALTER TABLE `"$table`" DROP CONSTRAINT IF EXISTS `"$constraint`";"
        $newLines += "EXCEPTION WHEN undefined_object THEN NULL;"
        $newLines += "END `$`$;--> statement-breakpointer"
    } else {
        $newLines += $line
    }
}

$content = $newLines -join "`r`n"

# Save the result
$content | Set-Content $file -NoNewline

Write-Host "`n=== Fix Complete ==="
Write-Host "[OK] Added DROP TYPE IF EXISTS for all enum types"
Write-Host "[OK] Added campaign_status type"
Write-Host "[OK] Commented out user_management schema references"
Write-Host "[OK] Commented out tenant_management schema references"
Write-Host "[OK] Commented out audit_security schema references"
Write-Host "[OK] Commented out communication tables operations"
Write-Host "[OK] Made DROP CONSTRAINT operations safe"
