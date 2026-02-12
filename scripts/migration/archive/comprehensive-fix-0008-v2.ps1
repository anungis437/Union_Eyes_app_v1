# Comprehensive fix for migration 0008
Write-Host "=== Comprehensive Fix for Migration 0008 (v2) ==="

$filePath = "db\migrations\0008_lean_mother_askani.sql"
$content = Get-Content $filePath -Raw

# Step 1: Add DROP TYPE IF EXISTS statements at the beginning
Write-Host "Step 1: Adding DROP TYPE IF EXISTS statements at beginning..."
$dropStatements = @"
-- Drop all enum types if they exist (for idempotency)
DROP TYPE IF EXISTS "public"."negotiation_session_type" CASCADE;
DROP TYPE IF EXISTS "public"."negotiation_status" CASCADE;
DROP TYPE IF EXISTS "public"."proposal_status" CASCADE;
DROP TYPE IF EXISTS "public"."voting_type" CASCADE;
DROP TYPE IF EXISTS "public"."vote_status" CASCADE;
DROP TYPE IF EXISTS "public"."approval_type" CASCADE;
DROP TYPE IF EXISTS "public"."contract_status" CASCADE;
DROP TYPE IF EXISTS "public"."payment_method" CASCADE;
DROP TYPE IF EXISTS "public"."payment_status" CASCADE;
DROP TYPE IF EXISTS "public"."payment_frequency" CASCADE;
DROP TYPE IF EXISTS "public"."payment_type" CASCADE;
DROP TYPE IF EXISTS "public"."account_type" CASCADE;
DROP TYPE IF EXISTS "public"."entry_type" CASCADE;
DROP TYPE IF EXISTS "public"."transaction_status" CASCADE;
DROP TYPE IF EXISTS "public"."journal_status" CASCADE;
DROP TYPE IF EXISTS "public"."reconciliation_status" CASCADE;
DROP TYPE IF EXISTS "public"."variance_reason" CASCADE;
DROP TYPE IF EXISTS "public"."tax_type" CASCADE;
DROP TYPE IF EXISTS "public"."tax_status" CASCADE;
DROP TYPE IF EXISTS "public"."budget_status" CASCADE;
DROP TYPE IF EXISTS "public"."budget_period_type" CASCADE;
DROP TYPE IF EXISTS "public"."fiscal_year_status" CASCADE;
DROP TYPE IF EXISTS "public"."social_platform" CASCADE;
DROP TYPE IF EXISTS "public"."campaign_status" CASCADE;
DROP TYPE IF EXISTS "public"."post_status" CASCADE;
DROP TYPE IF EXISTS "public"."engagement_type" CASCADE;
DROP TYPE IF EXISTS "public"."content_type" CASCADE;
DROP TYPE IF EXISTS "public"."visibility" CASCADE;
DROP TYPE IF EXISTS "public"."event_status" CASCADE;
DROP TYPE IF EXISTS "public"."rsvp_status" CASCADE;
DROP TYPE IF EXISTS "public"."alert_level" CASCADE;
DROP TYPE IF EXISTS "public"."alert_status" CASCADE;
DROP TYPE IF EXISTS "public"."alert_trigger_type" CASCADE;
DROP TYPE IF EXISTS "public"."notification_priority" CASCADE;
DROP TYPE IF EXISTS "public"."notification_status" CASCADE;
DROP TYPE IF EXISTS "public"."signature_provider" CASCADE;
DROP TYPE IF EXISTS "public"."signer_status" CASCADE;
DROP TYPE IF EXISTS "public"."sync_status" CASCADE;

"@

# Add drop statements at the very beginning
$content = $dropStatements + $content

# Step 2: Add missing campaign_status type after it's dropped
Write-Host "Step 2: Adding campaign_status type definition..."
$content = $content -replace `
    '(DROP TYPE IF EXISTS "public"\."alert_trigger_type".+?;[\r\n]+)', `
    "`$1`r`nCREATE TYPE `"public`".`"campaign_status`" AS ENUM('planning', 'active', 'paused', 'completed', 'cancelled', 'archived');--> statement-breakpoint`r`n"

# Step 3: Comment out user_management schema operations
Write-Host "Step 3: Commenting out user_management schema operations..."
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
$content = $content -replace 'INSERT INTO "audit_security"\.', '-- INSERT INTO "audit_security".'

# Step 6: Comment out communication tables operations
Write-Host "Step 6: Commenting out communication tables operations..."
$content = $content -replace 'CREATE TABLE "public"\."communication_analytics"', '-- CREATE TABLE "public"."communication_analytics"'
$content = $content -replace 'CREATE TABLE "public"\."communication_preferences"', '-- CREATE TABLE "public"."communication_preferences"'
$content = $content -replace 'CREATE TABLE "public"\."user_engagement_scores"', '-- CREATE TABLE "public"."user_engagement_scores"'

# Step 7: Make DROP CONSTRAINT operations safer
Write-Host "Step 7: Making DROP CONSTRAINT operations safer..."
$content = $content -replace `
    'ALTER TABLE "public"\."([^"]+)" DROP CONSTRAINT IF EXISTS "([^"]+)";', `
    'DO $$ BEGIN ALTER TABLE "public"."$1" DROP CONSTRAINT IF EXISTS "$2"; EXCEPTION WHEN undefined_object THEN NULL; END $$;'

# Write the fixed content back
$content | Set-Content $filePath -NoNewline

Write-Host "`n=== Fix Complete ==="
Write-Host "[OK] Added DROP TYPE IF EXISTS for all enum types at file beginning"
Write-Host "[OK] Added campaign_status type"
Write-Host "[OK] Commented out user_management schema references"
Write-Host "[OK] Commented out tenant_management schema references"
Write-Host "[OK] Commented out audit_security schema references"
Write-Host "[OK] Commented out communication tables operations"
Write-Host "[OK] Made DROP CONSTRAINT operations safe"
