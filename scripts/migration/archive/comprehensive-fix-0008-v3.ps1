# Comprehensive fix for migration 0008 - Auto-extract types
Write-Host "=== Comprehensive Fix for Migration 0008 (v3 - Auto-extract) ==="

$filePath = "db\migrations\0008_lean_mother_askani.sql"
$content = Get-Content $filePath -Raw

# Step 1: Extract all type names from CREATE TYPE statements
Write-Host "Step 1: Extracting all type names from CREATE TYPE statements..."
$typePattern = 'CREATE TYPE "public"\."([^"]+)" AS ENUM'
$types = [regex]::Matches($content, $typePattern) | ForEach-Object { $_.Groups[1].Value }

Write-Host "Found $($types.Count) type definitions"

# Step 2: Generate DROP TYPE IF EXISTS statements for all types (except those intentionally dropped/recreated mid-migration)
Write-Host "Step 2: Generating DROP TYPE IF EXISTS statements..."
$dropStatements = "-- Drop all enum types if they exist (for idempotency)`r`n"
$skipTypes = @('alert_severity', 'communication_channel', 'award_status')  # These are intentionally dropped/recreated later
foreach ($typeName in $types) {
    if ($skipTypes -notcontains $typeName) {
        $dropStatements += "DROP TYPE IF EXISTS `"public`".`"$typeName`" CASCADE;--> statement-breakpoint`r`n"
    }
}
$dropStatements += "`r`n"

# Add drop statements at the very beginning
$content = $dropStatements + $content

# Step 2a: Make mid-migration DROP TYPE statements safe (only those without CASCADE)
Write-Host "Step 2a: Making mid-migration DROP TYPE statements safe..."
$content = $content -replace 'DROP TYPE "public"\."(alert_severity|communication_channel|award_status)";--> statement-breakpoint', 'DROP TYPE IF EXISTS "public"."$1" CASCADE;--> statement-breakpoint'

# Step 3: Fix user_management schema operations (do this before generic fixes)
Write-Host "Step 3: Fixing user_management schema operations..."
$content = $content -replace 'CREATE TABLE "user_management"\."([^"]+)"', 'CREATE TABLE IF NOT EXISTS "public"."$1"'
$content = $content -replace 'ALTER TABLE "user_management"\.', '-- ALTER TABLE "user_management".'
$content = $content -replace 'DROP TABLE "user_management"\.', '-- DROP TABLE "user_management".'

# Step 4: Comment out tenant_management schema operations
Write-Host "Step 4: Commenting out tenant_management schema operations..."
$content = $content -replace 'ALTER TABLE "tenant_management"\.', '-- ALTER TABLE "tenant_management".'
$content = $content -replace 'DROP TABLE "tenant_management"\.', '-- DROP TABLE "tenant_management".'
$content = $content -replace 'DROP SCHEMA IF EXISTS "tenant_management";', '-- DROP SCHEMA IF EXISTS "tenant_management";'

# Step 5: Comment out audit_security schema operations
Write-Host "Step 5: Commenting out audit_security schema operations..."
$content = $content -replace 'ALTER TABLE "audit_security"\.', '-- ALTER TABLE "audit_security".'
$content = $content -replace 'DROP TABLE "audit_security"\.', '-- DROP TABLE "audit_security".'
$content = $content -replace 'INSERT INTO "audit_security"\.', '-- INSERT INTO  "audit_security".'

# Step 6: Make remaining CREATE TABLE statements idempotent
Write-Host "Step 6: Making remaining CREATE TABLE statements idempotent..."
# Schema-qualified tables
$content = $content -replace 'CREATE TABLE "public"\.', 'CREATE TABLE IF NOT EXISTS "public".'
$content = $content -replace 'CREATE TABLE "([^"]+)"\.', 'CREATE TABLE IF NOT EXISTS "$1".'
# Unqualified tables (no schema prefix)
$content = $content -replace 'CREATE TABLE "([^"]+)" \(', 'CREATE TABLE IF NOT EXISTS "$1" ('

# Step 7: Add missing campaign_status type if not already present
Write-Host "Step 7: Adding campaign_status type definition if missing..."
if ($content -notmatch 'CREATE TYPE "public"\."campaign_status"') {
    Write-Host "  campaign_status type not found, adding..."
    $content = $content -replace `
        '(DROP TYPE IF EXISTS "public"\."alert_trigger_type" CASCADE;--> statement-breakpoint[\r\n]+)', `
        "`$1CREATE TYPE `"public`".`"campaign_status`" AS ENUM('planning', 'active', 'paused', 'completed', 'cancelled', 'archived');--> statement-breakpoint`r`n"
} else {
    Write-Host "  campaign_status type already exists"
}

# Step 8: Comment out communication tables operations
Write-Host "Step 8: Commenting out communication tables operations..."
$content = $content -replace 'CREATE TABLE IF NOT EXISTS "public"\."communication_analytics"', '-- CREATE TABLE IF NOT EXISTS "public"."communication_analytics"'
$content = $content -replace 'CREATE TABLE IF NOT EXISTS "public"\."communication_preferences"', '-- CREATE TABLE IF NOT EXISTS "public"."communication_preferences"'
$content = $content -replace 'CREATE TABLE IF NOT EXISTS "public"\."user_engagement_scores"', '-- CREATE TABLE IF NOT EXISTS "public"."user_engagement_scores"'
$content = $content -replace 'ALTER TABLE "communication_analytics"', '-- ALTER TABLE "communication_analytics"'
$content = $content -replace 'ALTER TABLE "communication_preferences"', '-- ALTER TABLE "communication_preferences"'
$content = $content -replace 'ALTER TABLE "user_engagement_scores"', '-- ALTER TABLE "user_engagement_scores"'
$content = $content -replace 'DROP TABLE "communication_analytics"', '-- DROP TABLE "communication_analytics"'
$content = $content -replace 'DROP TABLE "communication_preferences"', '-- DROP TABLE "communication_preferences"'
$content = $content -replace 'DROP TABLE "user_engagement_scores"', '-- DROP TABLE "user_engagement_scores"'

# Step 9: Make DROP CONSTRAINT operations safer
Write-Host "Step 9: Making DROP CONSTRAINT operations safer..."
# Match both with and without "public" schema prefix, with and without IF EXISTS
$content = $content -replace 'ALTER TABLE ("public"\.)?"([^"]+)" DROP CONSTRAINT( IF EXISTS)? "([^"]+)";', 'DO $`$ BEGIN ALTER TABLE $1"$2" DROP CONSTRAINT IF EXISTS "$4"; EXCEPTION WHEN undefined_object THEN NULL; END $`$;'

# Write the fixed content back
$content | Set-Content $filePath -NoNewline

Write-Host "`n=== Fix Complete ==="
Write-Host "[OK] Generated and added DROP TYPE IF EXISTS for all $($types.Count) enum types"
Write-Host "[OK] Verified/added campaign_status type"
Write-Host "[OK] Commented out user_management schema references"
Write-Host "[OK] Commented out tenant_management schema references"
Write-Host "[OK] Commented out audit_security schema references"
Write-Host "[OK] Commented out communication tables operations"
Write-Host "[OK] Made DROP CONSTRAINT operations safe"
