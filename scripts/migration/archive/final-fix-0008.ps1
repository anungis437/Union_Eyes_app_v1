$migrationFile = "db/migrations/0008_lean_mother_askani.sql"
Write-Host "Processing migration 0008..."

# Read all lines
$lines = Get-Content $migrationFile

# Track what we've done
$typesSeen = @{}
$result = @()
$lineNum = 0

foreach ($line in $lines) {
    $lineNum++
    
    # Handle CREATE TYPE - add DROP before if not already there
    if ($line -match '^CREATE TYPE "public"\."([^"]+)" AS ENUM') {
        $typeName = $matches[1]
        if (-not $typesSeen.ContainsKey($typeName)) {
            $result += "DROP TYPE IF EXISTS `"public`".`"$typeName`" CASCADE;"
            $typesSeen[$typeName] = $true
        }
        $result += $line
    }
    # Make CREATE TABLE idempotent and fix user_management schema
    elseif ($line -match '^CREATE TABLE "user_management"\."([^"]+)" \(') {
        $tableName = $matches[1]
        $result += "CREATE TABLE IF NOT EXISTS `"public`".`"$tableName`" ("
    }
    elseif ($line -match '^CREATE TABLE "([^"]+)" \(') {
        $tableName = $matches[1]
        $result += "CREATE TABLE IF NOT EXISTS `"$tableName`" ("
    }
    # Comment out schema-qualified operations
    elseif ($line -match '(user_management|tenant_management|audit_security)\.') {
        $result += "-- $line"
    }
    # Comment out DROP SCHEMA
    elseif ($line -match '^DROP SCHEMA') {
        $result += "-- $line"
    }
    # Add missing types after alert_trigger_type
    elseif ($line -match 'alert_trigger_type.*manual.*statement-breakpoint') {
        $result += $line
        # Add campaign_status
        $result += "DROP TYPE IF EXISTS `"public`".`"campaign_status`" CASCADE;"
        $result += "CREATE TYPE `"public`".`"campaign_status`" AS ENUM('planning', 'active', 'paused', 'completed', 'cancelled', 'archived');--> statement-breakpointer"
        # Add engagement_type  
        $result += "DROP TYPE IF EXISTS `"public`".`"engagement_type`" CASCADE;"
        $result += "CREATE TYPE `"public`".`"engagement_type`" AS ENUM('like', 'comment', 'share', 'repost', 'mention', 'click', 'view', 'save');--> statement-breakpointer"
        $typesSeen['campaign_status'] = $true
        $typesSeen['engagement_type'] = $true
    }
    # Pass through everything else
    else {
        $result += $line
    }
}

# Write result
$result | Set-Content $migrationFile
Write-Host "Migration 0008 processing complete. Applied $($typesSeen.Count) type fixes."
