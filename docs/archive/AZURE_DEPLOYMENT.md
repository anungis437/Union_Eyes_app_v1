# Azure Deployment Guide

## Prerequisites

1. **Azure CLI** installed and authenticated
2. **Docker** installed locally
3. **GitHub repository** set up
4. **Azure subscription** with appropriate permissions

## Initial Setup

### 1. Run Infrastructure Setup

Choose your operating system:

**Windows (PowerShell):**
```powershell
cd scripts
.\azure-setup.ps1
```

**Linux/Mac:**
```bash
cd scripts
chmod +x azure-setup.sh
./azure-setup.sh
```

This script will create:
- Resource Groups (staging & prod)
- Azure Container Registry
- App Service Plans
- Web Apps
- PostgreSQL Flexible Servers
- Storage Accounts (Blob Storage)
- Cognitive Services (Speech + OpenAI)
- Key Vaults

**Important:** Save all credentials and connection strings output by the script!

### 2. Deploy GPT-4 Model to Azure OpenAI

```bash
# For staging
az cognitiveservices account deployment create \
  --name unioneyes-staging-openai \
  --resource-group unioneyes-staging-rg \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 10

# For production
az cognitiveservices account deployment create \
  --name unioneyes-prod-openai \
  --resource-group unioneyes-prod-rg \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 20
```

### 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### Shared Secrets
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `CLERK_SECRET_KEY` - From Clerk dashboard

#### Staging Secrets
- `AZURE_CREDENTIALS_STAGING` - Azure service principal JSON
- `STAGING_ACR_LOGIN_SERVER` - `unioneyesstagingacr.azurecr.io`
- `STAGING_ACR_USERNAME` - From Azure Container Registry
- `STAGING_ACR_PASSWORD` - From Azure Container Registry
- `STAGING_APP_URL` - `https://unioneyes-staging-app.azurewebsites.net`
- `STAGING_DATABASE_URL` - PostgreSQL connection string from setup script
- `STAGING_AZURE_STORAGE_ACCOUNT_NAME` - From setup script
- `STAGING_AZURE_STORAGE_ACCOUNT_KEY` - From setup script
- `STAGING_AZURE_SPEECH_KEY` - From setup script
- `STAGING_AZURE_SPEECH_REGION` - `canadacentral`
- `STAGING_AZURE_OPENAI_ENDPOINT` - From setup script
- `STAGING_AZURE_OPENAI_KEY` - From setup script

#### Production Secrets
- `AZURE_CREDENTIALS_PROD` - Azure service principal JSON
- `PROD_ACR_LOGIN_SERVER` - `unioneyesprodacr.azurecr.io`
- `PROD_ACR_USERNAME` - From Azure Container Registry
- `PROD_ACR_PASSWORD` - From Azure Container Registry
- `PROD_APP_URL` - `https://unioneyes-prod-app.azurewebsites.net`
- `PROD_DATABASE_URL` - PostgreSQL connection string from setup script
- `PROD_AZURE_STORAGE_ACCOUNT_NAME` - From setup script
- `PROD_AZURE_STORAGE_ACCOUNT_KEY` - From setup script
- `PROD_AZURE_SPEECH_KEY` - From setup script
- `PROD_AZURE_SPEECH_REGION` - `canadacentral`
- `PROD_AZURE_OPENAI_ENDPOINT` - From setup script
- `PROD_AZURE_OPENAI_KEY` - From setup script

### 4. Create Azure Service Principal for GitHub Actions

```bash
# For staging
az ad sp create-for-rbac --name "unioneyes-staging-github" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/unioneyes-staging-rg \
  --sdk-auth

# For production
az ad sp create-for-rbac --name "unioneyes-prod-github" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/unioneyes-prod-rg \
  --sdk-auth
```

Save the JSON output as `AZURE_CREDENTIALS_STAGING` and `AZURE_CREDENTIALS_PROD` secrets.

## Local Development with Docker

### 1. Create `.env.local` file

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unioneyes

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

### 3. Run database migrations

```bash
# Inside the app container
docker-compose exec app pnpm db:push

# Or from host
pnpm db:push
```

## Deployment Workflow

### Staging Deployment
1. Push to `staging` branch
2. GitHub Actions automatically:
   - Builds the application
   - Creates Docker image
   - Pushes to Azure Container Registry
   - Deploys to Azure Web App (staging)

### Production Deployment
1. Merge to `main` branch
2. GitHub Actions automatically:
   - Builds the application
   - Creates Docker image
   - Pushes to Azure Container Registry
   - Deploys to Azure Web App (production)
   - Runs database migrations

## Manual Deployment

### Build and push Docker image manually

```bash
# Login to Azure Container Registry
az acr login --name unioneyesstagingacr

# Build image
docker build -t unioneyesstagingacr.azurecr.io/unioneyes:latest .

# Push image
docker push unioneyesstagingacr.azurecr.io/unioneyes:latest

# Deploy to Web App
az webapp config container set \
  --name unioneyes-staging-app \
  --resource-group unioneyes-staging-rg \
  --docker-custom-image-name unioneyesstagingacr.azurecr.io/unioneyes:latest \
  --docker-registry-server-url https://unioneyesstagingacr.azurecr.io
```

## Monitoring and Logs

### View application logs
```bash
# Staging
az webapp log tail --name unioneyes-staging-app --resource-group unioneyes-staging-rg

# Production
az webapp log tail --name unioneyes-prod-app --resource-group unioneyes-prod-rg
```

### View container logs
```bash
docker-compose logs -f app
```

### View resource list
```bash
# Staging
az resource list --resource-group unioneyes-staging-rg --output table

# Production
az resource list --resource-group unioneyes-prod-rg --output table
```

## Database Management

### Connect to Azure PostgreSQL
```bash
# Staging
psql "postgresql://unionadmin:<password>@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"

# Production
psql "postgresql://unionadmin:<password>@unioneyes-prod-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"
```

### Backup database
```bash
pg_dump "postgresql://unionadmin:<password>@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require" > backup.sql
```

### Restore database
```bash
psql "postgresql://unionadmin:<password>@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require" < backup.sql
```

## Troubleshooting

### Container won't start
1. Check logs: `docker-compose logs app`
2. Verify environment variables are set
3. Check database connectivity

### Build fails
1. Clear Docker cache: `docker system prune -a`
2. Rebuild: `docker-compose up --build --force-recreate`

### Database connection issues
1. Verify DATABASE_URL is correct
2. Check firewall rules in Azure PostgreSQL
3. Ensure IP is whitelisted

### Azure deployment fails
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Check Azure Web App logs

## Cost Estimation

### Staging Environment (Monthly)
- App Service Plan (B1): ~$13
- PostgreSQL (Standard_B2s): ~$30
- Storage Account: ~$1
- Speech Services (S0): ~$0 (free tier) + usage
- Azure OpenAI: Usage-based
- Container Registry (Basic): ~$5
**Total: ~$50/month** + usage

### Production Environment (Monthly)
- App Service Plan (P1V3): ~$100
- PostgreSQL (Standard_B2s): ~$30
- Storage Account: ~$2
- Speech Services (S0): Usage-based
- Azure OpenAI: Usage-based
- Container Registry (Basic): ~$5
**Total: ~$140/month** + usage

## Cleanup

To delete all resources:

```bash
# Delete staging
az group delete --name unioneyes-staging-rg --yes --no-wait

# Delete production
az group delete --name unioneyes-prod-rg --yes --no-wait
```

## Next Steps

1. ✅ Infrastructure created
2. ✅ Docker configuration ready
3. ✅ CI/CD pipeline configured
4. ⏳ Configure custom domain (optional)
5. ⏳ Set up Application Insights monitoring
6. ⏳ Configure Azure CDN (optional)
7. ⏳ Implement Azure services in application code
