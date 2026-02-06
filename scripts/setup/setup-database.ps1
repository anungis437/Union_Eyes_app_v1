#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup and seed the Union Eyes database
.DESCRIPTION
    This script:
    1. Pushes the database schema using Drizzle Kit
    2. Seeds the database with test data
    3. Verifies user access to organizations
.PARAMETER SkipSchema
    Skip the schema push step (if schema already exists)
.PARAMETER Tenants
    Number of tenants to create (default: 3)
.PARAMETER Users
    Number of users per tenant (default: 20)
.PARAMETER Claims
    Number of claims per tenant (default: 50)
#>

param(
    [switch]$SkipSchema,
    [int]$Tenants = 3,
    [int]$Users = 20,
    [int]$Claims = 50
)

$ErrorActionPreference = "Stop"

Write-Host "Union Eyes Database Setup Script" -ForegroundColor Cyan
Write-Host "===================================`n" -ForegroundColor Cyan

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "[ERROR] .env.local file not found" -ForegroundColor Red
    Write-Host "   Please create .env.local with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Check if DATABASE_URL is set
$envContent = Get-Content ".env.local" -Raw
if ($envContent -notmatch "DATABASE_URL=") {
    Write-Host "[ERROR] DATABASE_URL not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Environment configuration found`n" -ForegroundColor Green

# Step 1: Push database schema
if (-not $SkipSchema) {
    Write-Host "[STEP 1] Pushing database schema..." -ForegroundColor Cyan
    Write-Host "   This will create all tables, indexes, and constraints`n" -ForegroundColor Gray
    
    try {
        npx drizzle-kit push
        Write-Host "`n[OK] Database schema created successfully`n" -ForegroundColor Green
    } catch {
        Write-Host "`n[ERROR] Failed to push database schema" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ">> Skipping schema push (-SkipSchema flag set)`n" -ForegroundColor Yellow
}

# Step 2: Seed the database
Write-Host "[STEP 2] Seeding database..." -ForegroundColor Cyan
Write-Host "   Configuration:" -ForegroundColor Gray
Write-Host "   - Tenants: $Tenants" -ForegroundColor Gray
Write-Host "   - Users per tenant: $Users" -ForegroundColor Gray
Write-Host "   - Claims per tenant: $Claims`n" -ForegroundColor Gray

try {
    npx tsx scripts/seed-full-platform.ts --reset --tenants $Tenants --users $Users --claims $Claims
    Write-Host "`n[OK] Database seeded successfully`n" -ForegroundColor Green
} catch {
    Write-Host "`n[ERROR] Failed to seed database" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Verify user access
Write-Host "[STEP 3] Verifying organization access..." -ForegroundColor Cyan
Write-Host "   Checking organizationMembers table`n" -ForegroundColor Gray

try {
    npx tsx scripts/verify-user-access.ts
    Write-Host "`n[OK] User access verified`n" -ForegroundColor Green
} catch {
    Write-Host "`n[WARNING] Verification script encountered an issue" -ForegroundColor Yellow
    Write-Host "   You can manually verify later using:" -ForegroundColor Gray
    Write-Host "   npx tsx scripts/verify-user-access.ts`n" -ForegroundColor Gray
}

# Summary
Write-Host "Database Setup Complete!" -ForegroundColor Green
Write-Host "===================================`n" -ForegroundColor Green

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start the development server:" -ForegroundColor White
Write-Host "   pnpm dev`n" -ForegroundColor Gray

Write-Host "2. Login with a test user (check seed script output for credentials)`n" -ForegroundColor White

Write-Host "3. Verify organization access in the application`n" -ForegroundColor White

Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "- Re-seed data:        npx tsx scripts/seed-full-platform.ts --reset" -ForegroundColor Gray
Write-Host "- Verify access:       npx tsx scripts/verify-user-access.ts" -ForegroundColor Gray
Write-Host "- Check specific user: npx tsx scripts/verify-user-access.ts <userId>`n" -ForegroundColor Gray
