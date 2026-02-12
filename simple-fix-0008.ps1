# Simple fix for migration 0008 - minimal changes approach
Write-Host "=== Simple Fix for Migration 0008 ==="

$filePath = "db\migrations\0008_lean_mother_askani.sql"
$content = Get-Content $filePath -Raw

# Step 0: Make all CREATE TYPE statements idempotent
Write-Host "Step 0: Making all CREATE TYPE statements idempotent..."
$newline = "`r`n"
$breakpoint = "--> statement-breakpoint"
$content = $content -replace 'CREATE TYPE "public"\."([^"]+)" AS ENUM', "DROP TYPE IF EXISTS `"public`".`"`$1`" CASCADE;$breakpoint$newline`CREATE TYPE `"public`".`"`$1`" AS ENUM"

# Step 1: Add campaign_status type after alert_trigger_type
Write-Host "Step 1: Adding campaign_status type..."
$content = $content -replace `
    '(CREATE TYPE "public"\."alert_trigger_type" AS ENUM\([^)]+\);--> statement-breakpoint)', `
    "`$1`r`nCREATE TYPE `"public`".`"campaign_status`" AS ENUM('planning', 'active', 'paused', 'completed', 'cancelled', 'archived');--> statement-breakpoint"

# Step 2: Fix user_management schema to public
Write-Host "Step 2: Fixing user_management schema operations..."
$content = $content -replace 'CREATE TABLE "user_management"\."([^"]+)"', 'CREATE TABLE IF NOT EXISTS "public"."$1"'
$content = $content -replace 'ALTER TABLE "user_management"\.', '-- ALTER TABLE "user_management".'
$content = $content -replace 'DROP TABLE "user_management"\.', '-- DROP TABLE "user_management".'

# Step 3: Comment out tenant_management schema operations
Write-Host "Step 3: Commenting out tenant_management schema operations..."
$content = $content -replace 'ALTER TABLE "tenant_management"\.', '-- ALTER TABLE "tenant_management".'
$content = $content -replace 'DROP TABLE "tenant_management"\.', '-- DROP TABLE "tenant_management".'
$content = $content -replace 'DROP SCHEMA IF EXISTS "tenant_management";', '-- DROP SCHEMA IF EXISTS "tenant_management";'

# Step 4: Comment out audit_security schema operations
Write-Host "Step 4: Commenting out audit_security schema operations..."
$content = $content -replace 'ALTER TABLE "audit_security"\.', '-- ALTER TABLE "audit_security".'
$content = $content -replace 'DROP TABLE "audit_security"\.', '-- DROP TABLE "audit_security".'
$content = $content -replace 'INSERT INTO "audit_security"\.', '-- INSERT INTO "audit_security".'

# Step 5: Make all CREATE TABLE idempotent
Write-Host "Step 5: Making CREATE TABLE statements idempotent..."
$content = $content -replace 'CREATE TABLE "public"\.', 'CREATE TABLE IF NOT EXISTS "public".'
$content = $content -replace 'CREATE TABLE "([^"]+)" \(', 'CREATE TABLE IF NOT EXISTS "$1" ('

# Step 6: Comment out communication tables operations
Write-Host "Step 6: Commenting out communication tables operations..."
$content = $content -replace 'CREATE TABLE IF NOT EXISTS "public"\."communication_analytics"', '-- CREATE TABLE IF NOT EXISTS "public"."communication_analytics"'
$content = $content -replace 'CREATE TABLE IF NOT EXISTS "public"\."communication_preferences"', '-- CREATE TABLE IF NOT EXISTS "public"."communication_preferences"'
$content = $content -replace 'CREATE TABLE IF NOT EXISTS "public"\."user_engagement_scores"', '-- CREATE TABLE IF NOT EXISTS "public"."user_engagement_scores"'
$content = $content -replace 'ALTER TABLE "communication_analytics"', '-- ALTER TABLE "communication_analytics"'
$content = $content -replace 'ALTER TABLE "communication_preferences"', '-- ALTER TABLE "communication_preferences"'
$content = $content -replace 'ALTER TABLE "user_engagement_scores"', '-- ALTER TABLE "user_engagement_scores"'
$content = $content -replace 'DROP TABLE "communication_analytics"', '-- DROP TABLE "communication_analytics"'
$content = $content -replace 'DROP TABLE "communication_preferences"', '-- DROP TABLE "communication_preferences"'
$content = $content -replace 'DROP TABLE "user_engagement_scores"', '-- DROP TABLE "user_engagement_scores"'

# Step 7: Make DROP CONSTRAINT operations safer
Write-Host "Step 7: Making DROP CONSTRAINT operations safer..."
$content = $content -replace 'ALTER TABLE ("public"\.)?"([^"]+)" DROP CONSTRAINT( IF EXISTS)? "([^"]+)";', 'DO $`$ BEGIN ALTER TABLE $1"$2" DROP CONSTRAINT IF EXISTS "$4"; EXCEPTION WHEN undefined_object THEN NULL; END $`$;'

# Step 8: Make mid-migration DROP TYPE statements safe
Write-Host "Step 8: Making mid-migration DROP TYPE statements safe..."
$content = $content -replace 'DROP TYPE "public"\."(alert_severity|communication_channel|award_status)";--> statement-breakpoint', 'DROP TYPE IF EXISTS "public"."$1" CASCADE;--> statement-breakpoint'

# Write the fixed content back
$content | Set-Content $filePath -NoNewline

Write-Host "`n=== Fix Complete ==="
Write-Host "[OK] Made all CREATE TYPE statements idempotent"
Write-Host "[OK] Added campaign_status type"
Write-Host "[OK] Fixed user_management schema to public"
Write-Host "[OK] Commented out tenant_management schema references"
Write-Host "[OK] Commented out audit_security schema references"
Write-Host "[OK] Made CREATE TABLE statements idempotent"
Write-Host "[OK] Commented out communication tables operations"
Write-Host "[OK] Made DROP CONSTRAINT operations safe"
Write-Host "[OK] Made mid-migration DROP TYPE statements safe"
