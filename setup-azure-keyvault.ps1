# ============================================================================
# AZURE KEY VAULT SETUP FOR PII ENCRYPTION
# ============================================================================
# This script sets up Azure Key Vault for secure PII encryption key management
#
# Features:
# - Creates Azure Key Vault with premium security features
# - Generates and stores encryption master key
# - Configures managed identity for PostgreSQL
# - Sets up RBAC permissions
# - Creates monitoring and logging
#
# Prerequisites:
# - Azure CLI installed and authenticated (az login)
# - Contributor or Owner role on subscription
# - PostgreSQL flexible server already created
# ============================================================================

param(
    [string]$SubscriptionId = "5d819f33-d16f-429c-a3c0-5b0e94740ba3",
    [string]$ResourceGroup = "unioneyes-staging-rg",
    [string]$Location = "canadacentral",
    [string]$KeyVaultName = "unioneyes-keyvault",
    [string]$PostgresServerName = "unioneyes-staging-db",
    [string]$SecretName = "pii-master-key"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "AZURE KEY VAULT SETUP FOR PII ENCRYPTION" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: VERIFY AZURE CLI AND SUBSCRIPTION
# ============================================================================

Write-Host "[1/8] Verifying Azure CLI connection..." -ForegroundColor Yellow

try {
    $account = az account show --query "{ subscription: id, user: user.name }" -o json | ConvertFrom-Json
    Write-Host "  ✓ Connected as: $($account.user)" -ForegroundColor Green
    Write-Host "  ✓ Subscription: $($account.subscription)" -ForegroundColor Green
    
    if ($account.subscription -ne $SubscriptionId) {
        Write-Host "  ! Setting subscription to $SubscriptionId" -ForegroundColor Yellow
        az account set --subscription $SubscriptionId
    }
}
catch {
    Write-Host "  ✗ Azure CLI not authenticated. Please run: az login" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 2: CREATE KEY VAULT
# ============================================================================

Write-Host "[2/8] Creating Azure Key Vault..." -ForegroundColor Yellow

# Check if Key Vault exists
$kvExists = az keyvault show --name $KeyVaultName --resource-group $ResourceGroup 2>$null

if ($kvExists) {
    Write-Host "  ✓ Key Vault '$KeyVaultName' already exists" -ForegroundColor Green
}
else {
    Write-Host "  Creating Key Vault with premium security features..." -ForegroundColor Gray
    
    az keyvault create `
        --name $KeyVaultName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku premium `
        --enable-rbac-authorization true `
        --enable-purge-protection true `
        --retention-days 90 `
        --no-wait false
    
    Write-Host "  ✓ Key Vault created successfully" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 3: GENERATE AND STORE ENCRYPTION KEY
# ============================================================================

Write-Host "[3/8] Generating and storing encryption master key..." -ForegroundColor Yellow

# Check if secret already exists
$secretExists = az keyvault secret show --vault-name $KeyVaultName --name $SecretName 2>$null

if ($secretExists) {
    Write-Host "  ⚠ Secret '$SecretName' already exists" -ForegroundColor Yellow
    Write-Host "  Using existing encryption key" -ForegroundColor Green
} else {
    # Generate 256-bit encryption key
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $encryptionKey = [Convert]::ToBase64String($bytes)
    
    # Store in Key Vault
    az keyvault secret set `
        --vault-name $KeyVaultName `
        --name $SecretName `
        --value $encryptionKey `
        --description "PII encryption master key (AES-256)" `
        --tags "Purpose=PII-Encryption" "Environment=Staging" | Out-Null
    
    Write-Host "  ✓ Encryption key generated and stored" -ForegroundColor Green
    Write-Host "  Key Length: 256 bits" -ForegroundColor Gray
    Write-Host "  Algorithm: AES-256-CBC" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# STEP 4: ENABLE MANAGED IDENTITY ON POSTGRESQL
# ============================================================================

Write-Host "[4/8] Enabling managed identity on PostgreSQL server..." -ForegroundColor Yellow

try {
    $identityResult = az postgres flexible-server identity assign `
        --resource-group $ResourceGroup `
        --server-name $PostgresServerName `
        --identity-type SystemAssigned `
        --query "principalId" -o tsv 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $principalId = $identityResult.Trim()
        Write-Host "  ✓ Managed identity enabled" -ForegroundColor Green
        Write-Host "  Principal ID: $principalId" -ForegroundColor Gray
    }
    else {
        # Identity might already exist
        $identity = az postgres flexible-server identity show `
            --resource-group $ResourceGroup `
            --server-name $PostgresServerName `
            --query "principalId" -o tsv
        
        $principalId = $identity.Trim()
        Write-Host "  ✓ Managed identity already exists" -ForegroundColor Green
        Write-Host "  Principal ID: $principalId" -ForegroundColor Gray
    }
}
catch {
    Write-Host "  ✗ Failed to enable managed identity: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 5: GRANT KEY VAULT PERMISSIONS
# ============================================================================

Write-Host "[5/8] Granting Key Vault permissions to PostgreSQL..." -ForegroundColor Yellow

# Get Key Vault resource ID
$keyVaultId = az keyvault show `
    --name $KeyVaultName `
    --resource-group $ResourceGroup `
    --query "id" -o tsv

# Grant "Key Vault Secrets User" role
Write-Host "  Granting 'Key Vault Secrets User' role..." -ForegroundColor Gray

az role assignment create `
    --assignee $principalId `
    --role "Key Vault Secrets User" `
    --scope $keyVaultId | Out-Null

Write-Host "  ✓ Permissions granted successfully" -ForegroundColor Green
Write-Host "  PostgreSQL can now read secrets from Key Vault" -ForegroundColor Gray

Write-Host ""

# ============================================================================
# STEP 6: CONFIGURE AUDIT LOGGING
# ============================================================================

Write-Host "[6/8] Configuring Key Vault audit logging..." -ForegroundColor Yellow

# Create Log Analytics workspace if it doesn't exist
$workspaceName = "unioneyes-security-logs"
$workspaceExists = az monitor log-analytics workspace show `
    --resource-group $ResourceGroup `
    --workspace-name $workspaceName 2>$null

if (-not $workspaceExists) {
    Write-Host "  Creating Log Analytics workspace..." -ForegroundColor Gray
    
    az monitor log-analytics workspace create `
        --resource-group $ResourceGroup `
        --workspace-name $workspaceName `
        --location $Location | Out-Null
    
    Write-Host "  ✓ Log Analytics workspace created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Log Analytics workspace already exists" -ForegroundColor Green
}

# Get workspace ID
$workspaceId = az monitor log-analytics workspace show `
    --resource-group $ResourceGroup `
    --workspace-name $workspaceName `
    --query "id" -o tsv

# Enable diagnostic settings on Key Vault
Write-Host "  Enabling diagnostic settings..." -ForegroundColor Gray

az monitor diagnostic-settings create `
    --name "key-vault-audit-logs" `
    --resource $keyVaultId `
    --workspace $workspaceId `
    --logs '[{"category":"AuditEvent","enabled":true}]' `
    --metrics '[{"category":"AllMetrics","enabled":true}]' 2>$null | Out-Null

Write-Host "  ✓ Audit logging configured" -ForegroundColor Green
Write-Host "  All Key Vault access will be logged to Log Analytics" -ForegroundColor Gray

Write-Host ""

# ============================================================================
# STEP 7: RUN DATABASE MIGRATION
# ============================================================================

Write-Host "[7/8] Running database migration for Key Vault integration..." -ForegroundColor Yellow

# Get PostgreSQL connection details from environment
$dbHost = "$PostgresServerName.postgres.database.azure.com"
$dbName = $env:PGDATABASE
$dbUser = $env:PGUSER
$dbPassword = $env:PGPASSWORD

if (-not $dbPassword) {
    Write-Host "  ⚠ PGPASSWORD not set in environment" -ForegroundColor Yellow
    $securePassword = Read-Host "  Enter PostgreSQL password" -AsSecureString
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
}

# Set PGPASSWORD for psql
$env:PGPASSWORD = $dbPassword

Write-Host "  Applying migration 066_azure_key_vault_integration.sql..." -ForegroundColor Gray

$migrationFile = Join-Path $PSScriptRoot "database\migrations\066_azure_key_vault_integration.sql"

if (Test-Path $migrationFile) {
    psql -h $dbHost -U $dbUser -d $dbName -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database migration completed successfully" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ Database migration failed" -ForegroundColor Red
        Write-Host "  Run manually: psql -h $dbHost -U $dbUser -d $dbName -f $migrationFile" -ForegroundColor Yellow
    }
}
else {
    Write-Host "  ⚠ Migration file not found: $migrationFile" -ForegroundColor Yellow
    Write-Host "  Please run the migration manually" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 8: VERIFY SETUP
# ============================================================================

Write-Host "[8/8] Verifying Key Vault setup..." -ForegroundColor Yellow

# Test Key Vault access
Write-Host "  Testing secret access..." -ForegroundColor Gray

$testSecret = az keyvault secret show `
    --vault-name $KeyVaultName `
    --name $SecretName `
    --query "{ name: name, version: id, enabled: attributes.enabled }" -o json | ConvertFrom-Json

if ($testSecret) {
    Write-Host "  ✓ Secret accessible: $($testSecret.name)" -ForegroundColor Green
    Write-Host "  Version: $($testSecret.version.Split('/')[-1])" -ForegroundColor Gray
    Write-Host "  Enabled: $($testSecret.enabled)" -ForegroundColor Gray
}
else {
    Write-Host "  ✗ Unable to access secret" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "✓ AZURE KEY VAULT SETUP COMPLETE" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update application code to retrieve key from Key Vault" -ForegroundColor White
Write-Host "  2. Set session variable: SET LOCAL app.encryption_key = '...'" -ForegroundColor White
Write-Host "  3. Test encryption/decryption with new key management" -ForegroundColor White
Write-Host "  4. Run security tests to verify integration" -ForegroundColor White
Write-Host ""
Write-Host "Key Vault Details:" -ForegroundColor Yellow
Write-Host "  Name: $KeyVaultName" -ForegroundColor White
Write-Host "  URL: https://$KeyVaultName.vault.azure.net" -ForegroundColor White
Write-Host "  Secret: $SecretName" -ForegroundColor White
Write-Host "  Workspace: $workspaceName" -ForegroundColor White
Write-Host ""
Write-Host "To retrieve key in Node.js:" -ForegroundColor Yellow
Write-Host "  const { SecretClient } = require('@azure/keyvault-secrets');" -ForegroundColor Gray
Write-Host "  const { DefaultAzureCredential } = require('@azure/identity');" -ForegroundColor Gray
Write-Host "  const client = new SecretClient('https://$KeyVaultName.vault.azure.net', new DefaultAzureCredential());" -ForegroundColor Gray
Write-Host "  const secret = await client.getSecret('$SecretName');" -ForegroundColor Gray
Write-Host ""
