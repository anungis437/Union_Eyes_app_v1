# Phase 4 - Financial Service Setup Script
# Run this script to install dependencies and prepare the service

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 4 - Financial Service Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install packages/financial dependencies
Write-Host "[1/5] Installing financial calculation engine dependencies..." -ForegroundColor Yellow
cd packages/financial
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install financial package dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Financial package dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Build financial package
Write-Host "[2/5] Building financial calculation engine..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build financial package" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Financial package built successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Install financial-service dependencies
Write-Host "[3/5] Installing financial microservice dependencies..." -ForegroundColor Yellow
cd ../../services/financial-service
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install financial-service dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Financial service dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 4: Create .env file if it doesn't exist
Write-Host "[4/5] Checking environment configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please edit .env file with your actual credentials" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}
Write-Host ""

# Step 5: Check database connection
Write-Host "[5/5] Next steps..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Before starting the service, you need to:" -ForegroundColor White
Write-Host "  1. Update .env with your Supabase credentials (DATABASE_URL, SUPABASE_URL, etc.)" -ForegroundColor White
Write-Host "  2. Run database migrations:" -ForegroundColor White
Write-Host "     psql `$DATABASE_URL -f database/migrations/013_dues_management_system.sql" -ForegroundColor Gray
Write-Host "     psql `$DATABASE_URL -f database/migrations/014_strike_fund_system.sql" -ForegroundColor Gray
Write-Host "  3. Start the development server:" -ForegroundColor White
Write-Host "     pnpm dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Service will be available at: http://localhost:3007" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
