# Azure Staging Deployment Configuration

## Required Environment Variables

### Core Application

- `NODE_ENV=production`
- `PORT=3000`
- `NEXT_PUBLIC_APP_URL` - Staging app URL (<https://unioneyes-staging-app.azurewebsites.net>)
- `NEXT_TELEMETRY_DISABLED=1`

### ⚠️ IMPORTANT: Production Keys Required

**DO NOT use development keys (pk_test_*) in staging/production environments!**

- Development keys have strict usage limits and will cause warnings
- Get production keys from [Clerk Dashboard](https://dashboard.clerk.com/)
- Production keys start with `pk_live_` (publishable) and `sk_live_` (secret)

### Database

- `DATABASE_URL` - PostgreSQL connection string (Azure Database for PostgreSQL)

### Authentication (Clerk)

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Public key for Clerk
- `CLERK_SECRET_KEY` - Secret key for Clerk

### Azure Services

- `AZURE_STORAGE_ACCOUNT_NAME` - Azure Storage account name
- `AZURE_STORAGE_ACCOUNT_KEY` - Azure Storage account key
- `AZURE_SPEECH_KEY` - Azure Speech Service key
- `AZURE_SPEECH_REGION` - Azure Speech Service region (e.g., canadacentral)
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL
- `AZURE_OPENAI_KEY` - Azure OpenAI API key

### Azure Key Vault (for PII encryption)

- `AZURE_KEY_VAULT_NAME` - Key Vault name (default: unioneyes-keyvault)
- `AZURE_KEY_VAULT_SECRET_NAME` - Secret name for PII master key (default: pii-master-key)
- `AZURE_TENANT_ID` - Azure AD tenant ID
- `AZURE_CLIENT_ID` - Service principal client ID
- `AZURE_CLIENT_SECRET` - Service principal client secret

### Sentry (Error Tracking) - Optional

- `SENTRY_DSN` - Sentry DSN for error tracking
- `SENTRY_ORG` - Sentry organization
- `SENTRY_PROJECT` - Sentry project name
- `SENTRY_AUTH_TOKEN` - Sentry auth token for source maps

### Optional Services

- `REDIS_URL` - Redis connection string (optional, for caching)
- `TWILIO_ACCOUNT_SID` - Twilio account SID (optional, for SMS)
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `RESEND_API_KEY` - Resend email API key (optional)
- `STRIPE_SECRET_KEY` - Stripe secret key (optional, for payments)
- `WHOP_WEBHOOK_KEY` - Whop webhook key (optional)

## Azure Web App Configuration

### Docker Container Settings

1. Registry: unioneyesstagingacr.azurecr.io
2. Image: unioneyes:latest
3. Port: 3000

### App Service Plan

- Tier: Basic B1 or higher (recommended: Standard S1 for production workloads)
- Always On: Enabled
- ARR Affinity: Enabled (for sticky sessions)

### Health Check

- Health check path: `/api/health/liveness`
- Health check interval: 30 seconds

### Startup Commands

None required (handled by Docker CMD)

## Deployment Steps

### 1. Verify Azure Resources

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription <subscription-id>

# Verify resource group exists
az group show --name unioneyes-staging-rg

# Verify container registry
az acr show --name unioneyesstagingacr --resource-group unioneyes-staging-rg

# Verify web app
az webapp show --name unioneyes-staging-app --resource-group unioneyes-staging-rg
```

### 2. Configure Environment Variables

```bash
# Set all required environment variables
az webapp config appsettings set \
  --name unioneyes-staging-app \
  --resource-group unioneyes-staging-rg \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="<postgresql-connection-string>" \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="<clerk-public-key>" \
    CLERK_SECRET_KEY="<clerk-secret-key>" \
    AZURE_KEY_VAULT_NAME="<keyvault-name>" \
    AZURE_TENANT_ID="<tenant-id>" \
    AZURE_CLIENT_ID="<client-id>" \
    AZURE_CLIENT_SECRET="<client-secret>" \
    AZURE_STORAGE_ACCOUNT_NAME="<storage-name>" \
    AZURE_STORAGE_ACCOUNT_KEY="<storage-key>" \
    AZURE_SPEECH_KEY="<speech-key>" \
    AZURE_SPEECH_REGION="canadacentral" \
    AZURE_OPENAI_ENDPOINT="<openai-endpoint>" \
    AZURE_OPENAI_KEY="<openai-key>"
```

### 3. Manual Deployment (if workflow fails)

```bash
# Build Docker image locally
docker build --file Dockerfile.staging \
  --build-arg NEXT_PUBLIC_APP_URL="https://unioneyes-staging-app.azurewebsites.net" \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="<clerk-key>" \
  --build-arg DATABASE_URL="<db-url>" \
  -t unioneyesstagingacr.azurecr.io/unioneyes:latest .

# Login to ACR
az acr login --name unioneyesstagingacr

# Push image
docker push unioneyesstagingacr.azurecr.io/unioneyes:latest

# Restart web app to pull new image
az webapp restart --name unioneyes-staging-app --resource-group unioneyes-staging-rg
```

### 4. Verify Deployment

```bash
# Check deployment logs
az webapp log tail --name unioneyes-staging-app --resource-group unioneyes-staging-rg

# Check health endpoint
curl https://unioneyes-staging-app.azurewebsites.net/api/health/liveness

# Check detailed health
curl https://unioneyes-staging-app.azurewebsites.net/api/health
```

## Troubleshooting

### Container fails to start (exit code 1)

1. Check application logs: `az webapp log tail`
2. Verify all required environment variables are set
3. Check database connectivity from Azure portal
4. Verify Key Vault permissions for the service principal
5. Review Docker build logs in GitHub Actions

### Health check fails

1. Ensure `/api/health/liveness` returns 200
2. Check if port 3000 is exposed and accessible
3. Verify startup time doesn't exceed health check start period (60s)
4. Check for startup errors in application logs

### Database connection errors

1. Verify DATABASE_URL is correct
2. Check Azure Database for PostgreSQL firewall rules
3. Ensure Azure Web App IP is whitelisted
4. Test connection from Azure Cloud Shell

### Key Vault access denied

1. Verify service principal has correct permissions
2. Check AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET are set
3. Ensure Key Vault access policy includes the service principal
4. Verify network rules allow Azure services

## Monitoring

### Application Insights

- Enable Application Insights for the Web App
- Monitor request performance and failures
- Set up alerts for critical errors

### Log Stream

```bash
# Real-time log streaming
az webapp log tail --name unioneyes-staging-app --resource-group unioneyes-staging-rg
```

### Metrics

- CPU usage
- Memory usage
- Request count and response time
- HTTP 5xx errors
