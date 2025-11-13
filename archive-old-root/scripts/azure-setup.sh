#!/bin/bash

# UnionEyes Azure Infrastructure Setup Script
# This script creates all necessary Azure resources for staging and production environments

set -e  # Exit on error

# Configuration
PROJECT_NAME="unioneyes"
LOCATION="canadacentral"  # or eastus, westus2, etc.
RESOURCE_GROUP_STAGING="${PROJECT_NAME}-staging-rg"
RESOURCE_GROUP_PROD="${PROJECT_NAME}-prod-rg"

echo "================================================"
echo "UnionEyes Azure Infrastructure Setup"
echo "================================================"
echo "Project: $PROJECT_NAME"
echo "Location: $LOCATION"
echo ""

# Function to create resource group
create_resource_group() {
    local rg_name=$1
    local env=$2
    
    echo "Creating resource group: $rg_name..."
    az group create \
        --name "$rg_name" \
        --location "$LOCATION" \
        --tags Environment="$env" Project="$PROJECT_NAME"
    echo "✓ Resource group created"
    echo ""
}

# Function to create Azure Container Registry
create_container_registry() {
    local rg_name=$1
    local env=$2
    local acr_name="${PROJECT_NAME}${env}acr"
    
    echo "Creating Azure Container Registry: $acr_name..."
    az acr create \
        --resource-group "$rg_name" \
        --name "$acr_name" \
        --sku Basic \
        --admin-enabled true \
        --location "$LOCATION"
    echo "✓ Container Registry created"
    echo ""
}

# Function to create App Service Plan
create_app_service_plan() {
    local rg_name=$1
    local env=$2
    local plan_name="${PROJECT_NAME}-${env}-plan"
    local sku=$3  # B1 for staging, P1V3 for prod
    
    echo "Creating App Service Plan: $plan_name..."
    az appservice plan create \
        --name "$plan_name" \
        --resource-group "$rg_name" \
        --location "$LOCATION" \
        --is-linux \
        --sku "$sku"
    echo "✓ App Service Plan created"
    echo ""
}

# Function to create Web App
create_web_app() {
    local rg_name=$1
    local env=$2
    local app_name="${PROJECT_NAME}-${env}-app"
    local plan_name="${PROJECT_NAME}-${env}-plan"
    local acr_name="${PROJECT_NAME}${env}acr"
    
    echo "Creating Web App: $app_name..."
    az webapp create \
        --name "$app_name" \
        --resource-group "$rg_name" \
        --plan "$plan_name" \
        --deployment-container-image-name "nginx:latest"  # Placeholder, will be updated by CI/CD
    
    # Configure container settings
    az webapp config container set \
        --name "$app_name" \
        --resource-group "$rg_name" \
        --docker-registry-server-url "https://${acr_name}.azurecr.io"
    
    echo "✓ Web App created"
    echo ""
}

# Function to create PostgreSQL Flexible Server
create_postgres() {
    local rg_name=$1
    local env=$2
    local server_name="${PROJECT_NAME}-${env}-db"
    local admin_user="unionadmin"
    local admin_password=$(openssl rand -base64 32)  # Generate secure password
    
    echo "Creating PostgreSQL Flexible Server: $server_name..."
    az postgres flexible-server create \
        --name "$server_name" \
        --resource-group "$rg_name" \
        --location "$LOCATION" \
        --admin-user "$admin_user" \
        --admin-password "$admin_password" \
        --sku-name Standard_B2s \
        --tier Burstable \
        --storage-size 32 \
        --version 16 \
        --public-access All
    
    # Create database
    az postgres flexible-server db create \
        --resource-group "$rg_name" \
        --server-name "$server_name" \
        --database-name "unioneyes"
    
    # Store password in Key Vault (to be created)
    echo "Database Admin Password: $admin_password"
    echo "⚠️  SAVE THIS PASSWORD! It will be needed for DATABASE_URL"
    echo ""
    
    # Create connection string
    local connection_string="postgresql://${admin_user}:${admin_password}@${server_name}.postgres.database.azure.com:5432/unioneyes?sslmode=require"
    echo "DATABASE_URL=$connection_string"
    echo ""
    
    echo "✓ PostgreSQL Server created"
    echo ""
}

# Function to create Storage Account for Blob Storage
create_storage() {
    local rg_name=$1
    local env=$2
    local storage_name="${PROJECT_NAME}${env}storage"
    
    echo "Creating Storage Account: $storage_name..."
    az storage account create \
        --name "$storage_name" \
        --resource-group "$rg_name" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --access-tier Hot
    
    # Create blob container
    local account_key=$(az storage account keys list \
        --resource-group "$rg_name" \
        --account-name "$storage_name" \
        --query '[0].value' -o tsv)
    
    az storage container create \
        --name "unioneyes-uploads" \
        --account-name "$storage_name" \
        --account-key "$account_key" \
        --public-access off
    
    echo "Storage Account Name: $storage_name"
    echo "Storage Account Key: $account_key"
    echo ""
    echo "✓ Storage Account created"
    echo ""
}

# Function to create Cognitive Services
create_cognitive_services() {
    local rg_name=$1
    local env=$2
    
    # Speech Services
    local speech_name="${PROJECT_NAME}-${env}-speech"
    echo "Creating Speech Service: $speech_name..."
    az cognitiveservices account create \
        --name "$speech_name" \
        --resource-group "$rg_name" \
        --kind SpeechServices \
        --sku S0 \
        --location "$LOCATION" \
        --yes
    
    local speech_key=$(az cognitiveservices account keys list \
        --name "$speech_name" \
        --resource-group "$rg_name" \
        --query 'key1' -o tsv)
    
    echo "Speech Service Key: $speech_key"
    echo "Speech Service Region: $LOCATION"
    echo ""
    
    # Azure OpenAI
    local openai_name="${PROJECT_NAME}-${env}-openai"
    echo "Creating Azure OpenAI Service: $openai_name..."
    az cognitiveservices account create \
        --name "$openai_name" \
        --resource-group "$rg_name" \
        --kind OpenAI \
        --sku S0 \
        --location "$LOCATION" \
        --yes
    
    local openai_key=$(az cognitiveservices account keys list \
        --name "$openai_name" \
        --resource-group "$rg_name" \
        --query 'key1' -o tsv)
    
    local openai_endpoint=$(az cognitiveservices account show \
        --name "$openai_name" \
        --resource-group "$rg_name" \
        --query 'properties.endpoint' -o tsv)
    
    echo "Azure OpenAI Key: $openai_key"
    echo "Azure OpenAI Endpoint: $openai_endpoint"
    echo ""
    echo "✓ Cognitive Services created"
    echo ""
}

# Function to create Key Vault
create_key_vault() {
    local rg_name=$1
    local env=$2
    local vault_name="${PROJECT_NAME}-${env}-kv"
    
    echo "Creating Key Vault: $vault_name..."
    az keyvault create \
        --name "$vault_name" \
        --resource-group "$rg_name" \
        --location "$LOCATION" \
        --sku standard
    
    echo "✓ Key Vault created"
    echo ""
}

# Main execution
echo "Starting infrastructure setup..."
echo ""

# Prompt for confirmation
read -p "This will create Azure resources in $LOCATION. Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# STAGING ENVIRONMENT
echo "================================================"
echo "Setting up STAGING environment..."
echo "================================================"
create_resource_group "$RESOURCE_GROUP_STAGING" "staging"
create_container_registry "$RESOURCE_GROUP_STAGING" "staging"
create_app_service_plan "$RESOURCE_GROUP_STAGING" "staging" "B1"
create_web_app "$RESOURCE_GROUP_STAGING" "staging"
create_postgres "$RESOURCE_GROUP_STAGING" "staging"
create_storage "$RESOURCE_GROUP_STAGING" "staging"
create_cognitive_services "$RESOURCE_GROUP_STAGING" "staging"
create_key_vault "$RESOURCE_GROUP_STAGING" "staging"

echo "================================================"
echo "STAGING environment setup complete!"
echo "================================================"
echo ""

# PRODUCTION ENVIRONMENT
echo "================================================"
echo "Setting up PRODUCTION environment..."
echo "================================================"
create_resource_group "$RESOURCE_GROUP_PROD" "prod"
create_container_registry "$RESOURCE_GROUP_PROD" "prod"
create_app_service_plan "$RESOURCE_GROUP_PROD" "prod" "P1V3"
create_web_app "$RESOURCE_GROUP_PROD" "prod"
create_postgres "$RESOURCE_GROUP_PROD" "prod"
create_storage "$RESOURCE_GROUP_PROD" "prod"
create_cognitive_services "$RESOURCE_GROUP_PROD" "prod"
create_key_vault "$RESOURCE_GROUP_PROD" "prod"

echo "================================================"
echo "PRODUCTION environment setup complete!"
echo "================================================"
echo ""

echo "================================================"
echo "Azure Infrastructure Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Save all credentials shown above in a secure location"
echo "2. Update your .env files with the connection strings"
echo "3. Configure GitHub Actions secrets for CI/CD"
echo "4. Deploy GPT-4 model to Azure OpenAI services"
echo ""
echo "To view your resources:"
echo "  Staging:    az resource list --resource-group $RESOURCE_GROUP_STAGING --output table"
echo "  Production: az resource list --resource-group $RESOURCE_GROUP_PROD --output table"
