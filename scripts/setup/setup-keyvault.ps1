# Azure Key Vault Setup for PII Encryption
# ==========================================

param(
    [string]$ResourceGroup = "unioneyes-staging-rg",
    [string]$Location = "canadacentral",
    [string]$KeyVaultName = "unioneyes-keyvault",
    [string]$PostgresServerName = "unioneyes-staging-db",
    [string]$SecretName = "pii-master-key"
)

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Azure Key Vault Setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Azure connection
Write-Host "[1/5] Verifying Azure connection..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "ERROR: Not logged into Azure. Run: az login" -ForegroundColor Red
    exit 1
}
Write-Host "Connected as: $($account.user.name)" -ForegroundColor Green
Write-Host ""

# Step 2: Create Key Vault
Write-Host "[2/5] Creating Key Vault..." -ForegroundColor Yellow
$kv = az keyvault show --name $KeyVaultName --resource-group $ResourceGroup 2>$null
if ($kv) {
    Write-Host "Key Vault already exists" -ForegroundColor Green
}
else {
    az keyvault create --name $KeyVaultName --resource-group $ResourceGroup --location $Location --sku premium --enable-rbac-authorization true --enable-purge-protection true | Out-Null
    Write-Host "Key Vault created" -ForegroundColor Green
}

# Grant ourselves access to manage secrets
$currentUser = $account.user.name
Write-Host "Granting Key Vault Administrator role to current user..." -ForegroundColor Gray
$kvId = az keyvault show --name $KeyVaultName --resource-group $ResourceGroup --query "id" -o tsv
az role assignment create --assignee $currentUser --role "Key Vault Administrator" --scope $kvId 2>$null | Out-Null
Start-Sleep -Seconds 10  # Wait for RBAC propagation
Write-Host ""

# Step 3: Generate encryption key
Write-Host "[3/5] Generating encryption key..." -ForegroundColor Yellow
$secret = az keyvault secret show --vault-name $KeyVaultName --name $SecretName 2>$null
if ($secret) {
    Write-Host "Secret already exists" -ForegroundColor Green
}
else {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $key = [Convert]::ToBase64String($bytes)
    az keyvault secret set --vault-name $KeyVaultName --name $SecretName --value $key | Out-Null
    Write-Host "Encryption key generated and stored" -ForegroundColor Green
}
Write-Host ""

# Step 4: Enable managed identity
Write-Host "[4/5] Enabling managed identity..." -ForegroundColor Yellow
$result = az postgres flexible-server identity assign --resource-group $ResourceGroup --server-name $PostgresServerName --identity-type SystemAssigned --query "principalId" -o tsv 2>&1
if ($LASTEXITCODE -eq 0 -and $result -match "^[a-f0-9\-]+$") {
    $principalId = $result.Trim()
    Write-Host "Managed identity enabled: $principalId" -ForegroundColor Green
}
else {
    # Try to get existing identity
    $identity = az postgres flexible-server show --resource-group $ResourceGroup --name $PostgresServerName --query "identity.principalId" -o tsv 2>$null
    if ($identity) {
        $principalId = $identity.Trim()
        Write-Host "Managed identity already exists: $principalId" -ForegroundColor Green
    }
    else {
        Write-Host "WARNING: Could not get managed identity principal ID" -ForegroundColor Yellow
        Write-Host "You may need to manually grant Key Vault permissions" -ForegroundColor Yellow
        $principalId = $null
    }
}
Write-Host ""

# Step 5: Grant permissions
Write-Host "[5/5] Granting Key Vault permissions..." -ForegroundColor Yellow
if ($principalId) {
    $kvId = az keyvault show --name $KeyVaultName --resource-group $ResourceGroup --query "id" -o tsv
    az role assignment create --assignee $principalId --role "Key Vault Secrets User" --scope $kvId 2>$null | Out-Null
    Write-Host "Permissions granted to managed identity" -ForegroundColor Green
}
else {
    Write-Host "Skipping permission grant (no principal ID)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Key Vault: https://$KeyVaultName.vault.azure.net" -ForegroundColor White
Write-Host "Secret Name: $SecretName" -ForegroundColor White
Write-Host ""
Write-Host "Next: Run migration 066 and update application code" -ForegroundColor Yellow
Write-Host ""
