# UnionEyes Azure Deployment - Quick Start Script
# Run this script after Azure infrastructure is provisioned

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UnionEyes Azure Deployment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI login
Write-Host "Checking Azure CLI authentication..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if ($null -eq $account) {
    Write-Host "❌ Not logged in to Azure CLI" -ForegroundColor Red
    Write-Host "Run: az login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
Write-Host ""

# Check Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Verify Azure resources exist
Write-Host "Verifying Azure resources..." -ForegroundColor Yellow
$stagingRg = az group exists --name unioneyes-staging-rg
$prodRg = az group exists --name unioneyes-prod-rg

if ($stagingRg -eq "false" -or $prodRg -eq "false") {
    Write-Host "❌ Azure resource groups not found" -ForegroundColor Red
    Write-Host "Run: .\scripts\azure-setup.ps1 first" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Resource groups verified" -ForegroundColor Green
Write-Host ""

# Deployment Steps
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Deploy GPT-4 Models via Azure Portal" -ForegroundColor Yellow
Write-Host "   ⚠️  Action Required (Manual):" -ForegroundColor Magenta
Write-Host "   1. Open: https://portal.azure.com" -ForegroundColor Gray
Write-Host "   2. Search: unioneyes-staging-openai" -ForegroundColor Gray
Write-Host "   3. Go to: Model deployments" -ForegroundColor Gray
Write-Host "   4. Create deployment: gpt-4o-mini, name it 'gpt-4'" -ForegroundColor Gray
Write-Host "   5. Repeat for: unioneyes-prod-openai (use gpt-4o)" -ForegroundColor Gray
Write-Host "   See: docs/AZURE_OPENAI_DEPLOYMENT.md for details" -ForegroundColor Gray
Write-Host ""
$openaiReady = Read-Host "Have you deployed the GPT-4 models? (y/N)"
if ($openaiReady -ne "y") {
    Write-Host "Please deploy models before continuing" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

Write-Host "Step 2: Build Docker Image" -ForegroundColor Yellow
Write-Host "   Building unioneyes:latest..." -ForegroundColor Gray
$clerkKey = $env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
if ([string]::IsNullOrEmpty($clerkKey)) {
    Write-Host "   ⚠️  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set in environment" -ForegroundColor Magenta
    $clerkKey = "pk_test_placeholder"
}

docker build `
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$clerkKey `
    --build-arg DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/unioneyes" `
    -t unioneyes:latest `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker image built successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Push to Azure Container Registry (Staging)" -ForegroundColor Yellow
Write-Host "   Logging in to unioneyesstagingacr..." -ForegroundColor Gray
az acr login --name unioneyesstagingacr
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ACR login failed" -ForegroundColor Red
    exit 1
}

Write-Host "   Tagging image..." -ForegroundColor Gray
docker tag unioneyes:latest unioneyesstagingacr.azurecr.io/unioneyes:latest
docker tag unioneyes:latest unioneyesstagingacr.azurecr.io/unioneyes:$(Get-Date -Format "yyyyMMdd-HHmmss")

Write-Host "   Pushing to staging ACR..." -ForegroundColor Gray
docker push unioneyesstagingacr.azurecr.io/unioneyes:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push to staging ACR failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Pushed to staging ACR" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Push to Azure Container Registry (Production)" -ForegroundColor Yellow
Write-Host "   Logging in to unioneyesprodacr..." -ForegroundColor Gray
az acr login --name unioneyesprodacr
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ACR login failed" -ForegroundColor Red
    exit 1
}

Write-Host "   Tagging image..." -ForegroundColor Gray
docker tag unioneyes:latest unioneyesprodacr.azurecr.io/unioneyes:latest
docker tag unioneyes:latest unioneyesprodacr.azurecr.io/unioneyes:$(Get-Date -Format "yyyyMMdd-HHmmss")

Write-Host "   Pushing to production ACR..." -ForegroundColor Gray
docker push unioneyesprodacr.azurecr.io/unioneyes:latest
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push to production ACR failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Pushed to production ACR" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Configure Web Apps" -ForegroundColor Yellow
Write-Host "   Configuring staging Web App..." -ForegroundColor Gray

# Get ACR credentials for staging
$stagingAcrCreds = az acr credential show --name unioneyesstagingacr --resource-group unioneyes-staging-rg | ConvertFrom-Json

# Configure staging web app
az webapp config container set `
    --name unioneyes-staging-app `
    --resource-group unioneyes-staging-rg `
    --docker-custom-image-name unioneyesstagingacr.azurecr.io/unioneyes:latest `
    --docker-registry-server-url https://unioneyesstagingacr.azurecr.io `
    --docker-registry-server-user $stagingAcrCreds.username `
    --docker-registry-server-password $stagingAcrCreds.passwords[0].value

Write-Host "   Setting staging app settings..." -ForegroundColor Gray
# Note: You need to add all environment variables here
Write-Host "   ⚠️  Remember to set environment variables in Azure Portal" -ForegroundColor Magenta
Write-Host "   Go to: unioneyes-staging-app → Configuration → Application settings" -ForegroundColor Gray
Write-Host ""

Write-Host "   Configuring production Web App..." -ForegroundColor Gray
$prodAcrCreds = az acr credential show --name unioneyesprodacr --resource-group unioneyes-prod-rg | ConvertFrom-Json

az webapp config container set `
    --name unioneyes-prod-app `
    --resource-group unioneyes-prod-rg `
    --docker-custom-image-name unioneyesprodacr.azurecr.io/unioneyes:latest `
    --docker-registry-server-url https://unioneyesprodacr.azurecr.io `
    --docker-registry-server-user $prodAcrCreds.username `
    --docker-registry-server-password $prodAcrCreds.passwords[0].value

Write-Host "   ⚠️  Remember to set environment variables in Azure Portal" -ForegroundColor Magenta
Write-Host "   Go to: unioneyes-prod-app → Configuration → Application settings" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Web Apps configured" -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Restart Web Apps" -ForegroundColor Yellow
Write-Host "   Restarting staging..." -ForegroundColor Gray
az webapp restart --name unioneyes-staging-app --resource-group unioneyes-staging-rg
Write-Host "   Restarting production..." -ForegroundColor Gray
az webapp restart --name unioneyes-prod-app --resource-group unioneyes-prod-rg
Write-Host "✅ Web Apps restarted" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Staging URL:    https://unioneyes-staging-app.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Production URL: https://unioneyes-prod-app.azurewebsites.net" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set environment variables in Azure Portal" -ForegroundColor Gray
Write-Host "2. Run database migrations: pnpm db:push" -ForegroundColor Gray
Write-Host "3. Test the deployments" -ForegroundColor Gray
Write-Host "4. Setup GitHub Actions for CI/CD" -ForegroundColor Gray
Write-Host "5. Integrate Azure services (Blob, Speech, OpenAI)" -ForegroundColor Gray
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "az webapp log tail --name unioneyes-staging-app --resource-group unioneyes-staging-rg" -ForegroundColor Gray
Write-Host ""
Write-Host "See DEPLOYMENT_STATUS.md for detailed next steps" -ForegroundColor Cyan
