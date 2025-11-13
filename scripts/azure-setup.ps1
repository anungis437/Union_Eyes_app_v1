# UnionEyes Azure Infrastructure Setup Script (PowerShell)
# Run this script to create all necessary Azure resources for staging and production

# Configuration
$PROJECT_NAME = "unioneyes"
$LOCATION = "canadacentral"
$RESOURCE_GROUP_STAGING = "$PROJECT_NAME-staging-rg"
$RESOURCE_GROUP_PROD = "$PROJECT_NAME-prod-rg"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "UnionEyes Azure Infrastructure Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_NAME"
Write-Host "Location: $LOCATION"
Write-Host ""

# Function to create resource group
function New-ResourceGroup {
    param($RgName, $Env)
    
    Write-Host "Creating resource group: $RgName..." -ForegroundColor Yellow
    az group create `
        --name $RgName `
        --location $LOCATION `
        --tags Environment=$Env Project=$PROJECT_NAME
    Write-Host "✓ Resource group created" -ForegroundColor Green
    Write-Host ""
}

# Function to create Azure Container Registry
function New-ContainerRegistry {
    param($RgName, $Env)
    
    $acrName = "$PROJECT_NAME$($Env)acr"
    Write-Host "Creating Azure Container Registry: $acrName..." -ForegroundColor Yellow
    az acr create `
        --resource-group $RgName `
        --name $acrName `
        --sku Basic `
        --admin-enabled true `
        --location $LOCATION
    Write-Host "✓ Container Registry created" -ForegroundColor Green
    Write-Host ""
}

# Function to create App Service Plan
function New-AppServicePlan {
    param($RgName, $Env, $Sku)
    
    $planName = "$PROJECT_NAME-$Env-plan"
    Write-Host "Creating App Service Plan: $planName..." -ForegroundColor Yellow
    az appservice plan create `
        --name $planName `
        --resource-group $RgName `
        --location $LOCATION `
        --is-linux `
        --sku $Sku
    Write-Host "✓ App Service Plan created" -ForegroundColor Green
    Write-Host ""
}

# Function to create Web App
function New-WebApp {
    param($RgName, $Env)
    
    $appName = "$PROJECT_NAME-$Env-app"
    $planName = "$PROJECT_NAME-$Env-plan"
    $acrName = "$PROJECT_NAME$($Env)acr"
    
    Write-Host "Creating Web App: $appName..." -ForegroundColor Yellow
    az webapp create `
        --name $appName `
        --resource-group $RgName `
        --plan $planName `
        --deployment-container-image-name "nginx:latest"
    
    az webapp config container set `
        --name $appName `
        --resource-group $RgName `
        --docker-registry-server-url "https://$acrName.azurecr.io"
    
    Write-Host "✓ Web App created" -ForegroundColor Green
    Write-Host ""
}

# Function to create PostgreSQL Flexible Server
function New-PostgreSQL {
    param($RgName, $Env)
    
    $serverName = "$PROJECT_NAME-$Env-db"
    $adminUser = "unionadmin"
    $adminPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    Write-Host "Creating PostgreSQL Flexible Server: $serverName..." -ForegroundColor Yellow
    az postgres flexible-server create `
        --name $serverName `
        --resource-group $RgName `
        --location $LOCATION `
        --admin-user $adminUser `
        --admin-password $adminPassword `
        --sku-name Standard_B2s `
        --tier Burstable `
        --storage-size 32 `
        --version 16 `
        --public-access All
    
    az postgres flexible-server db create `
        --resource-group $RgName `
        --server-name $serverName `
        --database-name "unioneyes"
    
    $connectionString = "postgresql://${adminUser}:${adminPassword}@${serverName}.postgres.database.azure.com:5432/unioneyes?sslmode=require"
    
    Write-Host "Database Admin Password: $adminPassword" -ForegroundColor Magenta
    Write-Host "⚠️  SAVE THIS PASSWORD!" -ForegroundColor Red
    Write-Host "DATABASE_URL=$connectionString" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✓ PostgreSQL Server created" -ForegroundColor Green
    Write-Host ""
}

# Function to create Storage Account
function New-StorageAccount {
    param($RgName, $Env)
    
    $storageName = "$PROJECT_NAME$($Env)storage"
    
    Write-Host "Creating Storage Account: $storageName..." -ForegroundColor Yellow
    az storage account create `
        --name $storageName `
        --resource-group $RgName `
        --location $LOCATION `
        --sku Standard_LRS `
        --kind StorageV2 `
        --access-tier Hot
    
    $accountKey = (az storage account keys list `
        --resource-group $RgName `
        --account-name $storageName `
        --query '[0].value' -o tsv)
    
    az storage container create `
        --name "unioneyes-uploads" `
        --account-name $storageName `
        --account-key $accountKey `
        --public-access off
    
    Write-Host "Storage Account Name: $storageName" -ForegroundColor Cyan
    Write-Host "Storage Account Key: $accountKey" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✓ Storage Account created" -ForegroundColor Green
    Write-Host ""
}

# Function to create Cognitive Services
function New-CognitiveServices {
    param($RgName, $Env)
    
    $speechName = "$PROJECT_NAME-$Env-speech"
    Write-Host "Creating Speech Service: $speechName..." -ForegroundColor Yellow
    az cognitiveservices account create `
        --name $speechName `
        --resource-group $RgName `
        --kind SpeechServices `
        --sku S0 `
        --location $LOCATION `
        --yes
    
    $speechKey = (az cognitiveservices account keys list `
        --name $speechName `
        --resource-group $RgName `
        --query 'key1' -o tsv)
    
    Write-Host "Speech Service Key: $speechKey" -ForegroundColor Cyan
    Write-Host "Speech Service Region: $LOCATION" -ForegroundColor Cyan
    Write-Host ""
    
    $openaiName = "$PROJECT_NAME-$Env-openai"
    Write-Host "Creating Azure OpenAI Service: $openaiName..." -ForegroundColor Yellow
    az cognitiveservices account create `
        --name $openaiName `
        --resource-group $RgName `
        --kind OpenAI `
        --sku S0 `
        --location $LOCATION `
        --yes
    
    $openaiKey = (az cognitiveservices account keys list `
        --name $openaiName `
        --resource-group $RgName `
        --query 'key1' -o tsv)
    
    $openaiEndpoint = (az cognitiveservices account show `
        --name $openaiName `
        --resource-group $RgName `
        --query 'properties.endpoint' -o tsv)
    
    Write-Host "Azure OpenAI Key: $openaiKey" -ForegroundColor Cyan
    Write-Host "Azure OpenAI Endpoint: $openaiEndpoint" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✓ Cognitive Services created" -ForegroundColor Green
    Write-Host ""
}

# Function to create Key Vault
function New-KeyVault {
    param($RgName, $Env)
    
    $vaultName = "$PROJECT_NAME-$Env-kv"
    Write-Host "Creating Key Vault: $vaultName..." -ForegroundColor Yellow
    az keyvault create `
        --name $vaultName `
        --resource-group $RgName `
        --location $LOCATION `
        --sku standard
    
    Write-Host "✓ Key Vault created" -ForegroundColor Green
    Write-Host ""
}

# Main execution
Write-Host "Starting infrastructure setup..." -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "This will create Azure resources in $LOCATION. Continue? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Setup cancelled." -ForegroundColor Red
    exit
}

# STAGING ENVIRONMENT
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setting up STAGING environment..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
New-ResourceGroup -RgName $RESOURCE_GROUP_STAGING -Env "staging"
New-ContainerRegistry -RgName $RESOURCE_GROUP_STAGING -Env "staging"
New-AppServicePlan -RgName $RESOURCE_GROUP_STAGING -Env "staging" -Sku "B1"
New-WebApp -RgName $RESOURCE_GROUP_STAGING -Env "staging"
New-PostgreSQL -RgName $RESOURCE_GROUP_STAGING -Env "staging"
New-StorageAccount -RgName $RESOURCE_GROUP_STAGING -Env "staging"
New-CognitiveServices -RgName $RESOURCE_GROUP_STAGING -Env "staging"
New-KeyVault -RgName $RESOURCE_GROUP_STAGING -Env "staging"

Write-Host "================================================" -ForegroundColor Green
Write-Host "STAGING environment setup complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# PRODUCTION ENVIRONMENT
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setting up PRODUCTION environment..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
New-ResourceGroup -RgName $RESOURCE_GROUP_PROD -Env "prod"
New-ContainerRegistry -RgName $RESOURCE_GROUP_PROD -Env "prod"
New-AppServicePlan -RgName $RESOURCE_GROUP_PROD -Env "prod" -Sku "P1V3"
New-WebApp -RgName $RESOURCE_GROUP_PROD -Env "prod"
New-PostgreSQL -RgName $RESOURCE_GROUP_PROD -Env "prod"
New-StorageAccount -RgName $RESOURCE_GROUP_PROD -Env "prod"
New-CognitiveServices -RgName $RESOURCE_GROUP_PROD -Env "prod"
New-KeyVault -RgName $RESOURCE_GROUP_PROD -Env "prod"

Write-Host "================================================" -ForegroundColor Green
Write-Host "PRODUCTION environment setup complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Azure Infrastructure Setup Complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Save all credentials shown above in a secure location"
Write-Host "2. Update your .env files with the connection strings"
Write-Host "3. Configure GitHub Actions secrets for CI/CD"
Write-Host "4. Deploy GPT-4 model to Azure OpenAI services"
Write-Host ""
Write-Host "To view your resources:" -ForegroundColor Yellow
Write-Host "  Staging:    az resource list --resource-group $RESOURCE_GROUP_STAGING --output table"
Write-Host "  Production: az resource list --resource-group $RESOURCE_GROUP_PROD --output table"
