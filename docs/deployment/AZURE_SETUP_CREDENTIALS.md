# Azure GitHub Actions Credentials Setup

## Issue

The GitHub Actions workflow is failing with:

```
Error: Login failed with Error: Using auth-type: SERVICE_PRINCIPAL. Not all values are present.
```

## Solution: Create Azure Service Principal

### Step 1: Login to Azure CLI (PowerShell)

```powershell
az login
```

### Step 2: Get Your Subscription ID

```powershell
az account show --query id --output tsv
```

Copy the subscription ID - you'll need it for the next step.

### Step 3: Create Service Principal for Staging

Replace `<subscription-id>` with your actual subscription ID:

```powershell
az ad sp create-for-rbac `
  --name "unioneyes-github-actions-staging" `
  --role contributor `
  --scopes /subscriptions/<subscription-id>/resourceGroups/unioneyes-staging-rg `
  --sdk-auth
```

**IMPORTANT:** Copy the entire JSON output. It looks like this:

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### Step 4: Add to GitHub Secrets

1. Go to your GitHub repository: <https://github.com/anungis437/Union_Eyes_app_v1>
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add this secret:
   - **Name:** `AZURE_CREDENTIALS_STAGING`
   - **Value:** (paste the entire JSON output from Step 3)

### Step 5: Add Additional Secrets

You also need these secrets (check your Azure Portal for values):

#### Azure Container Registry (ACR)

```powershell
# Get ACR login server
az acr show --name unioneyesstagingacr --resource-group unioneyes-staging-rg --query loginServer --output tsv

# Get ACR username (should be the ACR name)
az acr show --name unioneyesstagingacr --resource-group unioneyes-staging-rg --query name --output tsv

# Get ACR password
az acr credential show --name unioneyesstagingacr --resource-group unioneyes-staging-rg --query "passwords[0].value" --output tsv
```

Add these GitHub Secrets:

- **STAGING_ACR_LOGIN_SERVER:** `unioneyesstagingacr.azurecr.io` (or output from first command)
- **STAGING_ACR_USERNAME:** `unioneyesstagingacr` (or output from second command)
- **STAGING_ACR_PASSWORD:** (output from third command)

#### Database Connection

```powershell
# Your staging database URL (already have this)
```

Add this GitHub Secret:

- **STAGING_DATABASE_URL:** `postgresql://unionadmin:UnionEyes2025!Staging@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require`

#### Clerk Authentication

Add these GitHub Secrets (get from Clerk Dashboard):

- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:** `pk_test_...` or `pk_live_...`
- **CLERK_SECRET_KEY:** `sk_test_...` or `sk_live_...`

#### Azure Storage (if you're using it)

```powershell
az storage account show-connection-string --name unioneyesstaging --resource-group unioneyes-staging-rg --query connectionString --output tsv
```

Add these GitHub Secrets:

- **STAGING_AZURE_STORAGE_ACCOUNT_NAME:** `unioneyesstaging`
- **STAGING_AZURE_STORAGE_ACCOUNT_KEY:** (get from Azure Portal → Storage Account → Access Keys)

#### Azure OpenAI & Speech (if you're using them)

- **STAGING_AZURE_OPENAI_ENDPOINT:** `https://your-openai-resource.openai.azure.com/`
- **STAGING_AZURE_OPENAI_KEY:** (from Azure Portal)
- **STAGING_AZURE_SPEECH_KEY:** (from Azure Portal)
- **STAGING_AZURE_SPEECH_REGION:** `eastus` or your region

#### App URL

- **STAGING_APP_URL:** `https://unioneyes-staging-app.azurewebsites.net`

### Step 6: Verify Setup

After adding all secrets, re-run the failed GitHub Actions workflow:

1. Go to <https://github.com/anungis437/Union_Eyes_app_v1/actions>
2. Find the failed workflow run
3. Click **Re-run failed jobs**

---

## Quick Reference: Required GitHub Secrets

### Must Have (Critical)

- ✅ `AZURE_CREDENTIALS_STAGING` (entire JSON from service principal)
- ✅ `STAGING_ACR_LOGIN_SERVER`
- ✅ `STAGING_ACR_USERNAME`
- ✅ `STAGING_ACR_PASSWORD`
- ✅ `STAGING_DATABASE_URL`
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- ✅ `CLERK_SECRET_KEY`
- ✅ `STAGING_APP_URL`

### Optional (if using features)

- `STAGING_AZURE_STORAGE_ACCOUNT_NAME`
- `STAGING_AZURE_STORAGE_ACCOUNT_KEY`
- `STAGING_AZURE_OPENAI_ENDPOINT`
- `STAGING_AZURE_OPENAI_KEY`
- `STAGING_AZURE_SPEECH_KEY`
- `STAGING_AZURE_SPEECH_REGION`

### Already Added

- ✅ `APP_URL` (for cron workflow)
- ✅ `CRON_SECRET`

---

## Troubleshooting

### Error: "Resource group not found"

Make sure the resource group name matches exactly: `unioneyes-staging-rg`

### Error: "Insufficient permissions"

Your Azure account needs Contributor or Owner role on the resource group.

### Error: "ACR not found"

Check if you have an Azure Container Registry created. If not, create one:

```powershell
az acr create `
  --name unioneyesstagingacr `
  --resource-group unioneyes-staging-rg `
  --sku Basic `
  --admin-enabled true
```

### Error: "App Service not found"

Verify your App Service name: `unioneyes-staging-app`

```powershell
az webapp show --name unioneyes-staging-app --resource-group unioneyes-staging-rg
```

---

## Alternative: Simplified Workflow (No Docker)

If you don't have ACR set up yet, you can simplify the deployment to use built-in App Service deployment without Docker. Let me know if you'd like this option.
