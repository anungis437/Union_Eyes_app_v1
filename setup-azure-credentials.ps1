# Azure Credentials Setup Script for GitHub Actions
# Run this script to collect all necessary credentials

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure GitHub Actions Credentials Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged in to Azure
Write-Host "Checking Azure CLI login status..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "❌ Not logged in to Azure. Running 'az login'..." -ForegroundColor Red
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
Write-Host "   Subscription ID: $($account.id)" -ForegroundColor Gray
Write-Host ""

# Variables
$subscriptionId = $account.id
$resourceGroup = "unioneyes-staging-rg"
$acrName = "unioneyesstagingacr"
$appName = "unioneyes-staging-app"
$spName = "unioneyes-github-actions-staging"

$credentials = @{}

# Step 1: Create Service Principal
Write-Host "Step 1: Creating Service Principal..." -ForegroundColor Yellow
Write-Host "   Name: $spName" -ForegroundColor Gray
Write-Host "   Scope: /subscriptions/$subscriptionId/resourceGroups/$resourceGroup" -ForegroundColor Gray

try {
    $sp = az ad sp create-for-rbac `
        --name $spName `
        --role contributor `
        --scopes "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup" `
        --sdk-auth | ConvertFrom-Json
    
    Write-Host "✅ Service Principal created successfully" -ForegroundColor Green
    $credentials['AZURE_CREDENTIALS_STAGING'] = ($sp | ConvertTo-Json -Compress)
} catch {
    Write-Host "❌ Failed to create Service Principal" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Get ACR Credentials
Write-Host "Step 2: Retrieving ACR credentials..." -ForegroundColor Yellow
Write-Host "   ACR Name: $acrName" -ForegroundColor Gray

try {
    $acrLoginServer = az acr show --name $acrName --resource-group $resourceGroup --query loginServer -o tsv
    $acrUsername = az acr show --name $acrName --resource-group $resourceGroup --query name -o tsv
    $acrPassword = az acr credential show --name $acrName --resource-group $resourceGroup --query "passwords[0].value" -o tsv
    
    if ($acrLoginServer -and $acrUsername -and $acrPassword) {
        Write-Host "✅ ACR credentials retrieved" -ForegroundColor Green
        $credentials['STAGING_ACR_LOGIN_SERVER'] = $acrLoginServer
        $credentials['STAGING_ACR_USERNAME'] = $acrUsername
        $credentials['STAGING_ACR_PASSWORD'] = $acrPassword
    } else {
        Write-Host "⚠️  ACR not found. Will need to create ACR or skip Docker deployment" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not retrieve ACR credentials (ACR may not exist)" -ForegroundColor Yellow
    Write-Host "   You can skip Docker deployment or create ACR later" -ForegroundColor Gray
}

Write-Host ""

# Step 3: Database URL
Write-Host "Step 3: Database URL" -ForegroundColor Yellow
$databaseUrl = "postgresql://unionadmin:UnionEyes2025!Staging@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"
$credentials['STAGING_DATABASE_URL'] = $databaseUrl
Write-Host "✅ Database URL configured" -ForegroundColor Green

Write-Host ""

# Step 4: App URL
Write-Host "Step 4: App URL" -ForegroundColor Yellow
$credentials['STAGING_APP_URL'] = "https://$appName.azurewebsites.net"
Write-Host "✅ App URL configured" -ForegroundColor Green

Write-Host ""

# Step 5: Manual Inputs Needed
Write-Host "Step 5: Manual configuration needed" -ForegroundColor Yellow
Write-Host "   The following secrets need to be added manually from your Clerk dashboard:" -ForegroundColor Gray
Write-Host "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (starts with pk_test_ or pk_live_)" -ForegroundColor Gray
Write-Host "   - CLERK_SECRET_KEY (starts with sk_test_ or sk_live_)" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY: GitHub Secrets to Add" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Go to: https://github.com/anungis437/Union_Eyes_app_v1/settings/secrets/actions" -ForegroundColor White
Write-Host ""

foreach ($key in $credentials.Keys | Sort-Object) {
    $value = $credentials[$key]
    $displayValue = if ($value.Length -gt 50) { 
        $value.Substring(0, 47) + "..." 
    } else { 
        $value 
    }
    
    Write-Host "Secret Name: " -NoNewline -ForegroundColor Yellow
    Write-Host $key -ForegroundColor White
    Write-Host "Value: " -NoNewline -ForegroundColor Gray
    Write-Host $displayValue -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "⚠️  REQUIRED: Add these manually from Clerk Dashboard:" -ForegroundColor Yellow
Write-Host "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" -ForegroundColor White
Write-Host "   - CLERK_SECRET_KEY" -ForegroundColor White
Write-Host ""

# Save to file
$outputFile = "azure-credentials-output.txt"
Write-Host "Saving credentials to: $outputFile" -ForegroundColor Yellow

$output = @"
========================================
Azure GitHub Actions Credentials
Generated: $(Get-Date)
========================================

Copy these secrets to GitHub:
https://github.com/anungis437/Union_Eyes_app_v1/settings/secrets/actions

"@

foreach ($key in $credentials.Keys | Sort-Object) {
    $output += "`n---`n`nSecret Name: $key`n`nValue:`n$($credentials[$key])`n"
}

$output += @"

---

MANUAL CONFIGURATION REQUIRED:

Get these from your Clerk Dashboard (https://dashboard.clerk.com):

Secret Name: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Value: pk_test_... or pk_live_...

Secret Name: CLERK_SECRET_KEY
Value: sk_test_... or sk_live_...

========================================
"@

$output | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "✅ Credentials saved to: $outputFile" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Open: $outputFile" -ForegroundColor White
Write-Host "2. Go to: https://github.com/anungis437/Union_Eyes_app_v1/settings/secrets/actions" -ForegroundColor White
Write-Host "3. Add each secret listed in the file" -ForegroundColor White
Write-Host "4. Get Clerk credentials from: https://dashboard.clerk.com" -ForegroundColor White
Write-Host "5. Re-run failed workflow: https://github.com/anungis437/Union_Eyes_app_v1/actions" -ForegroundColor White
Write-Host ""
