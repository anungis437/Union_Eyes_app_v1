# Azure Deployment Status

**Last Updated:** November 11, 2025

## Infrastructure Status

### ✅ Completed

#### Azure Resources Created
- **Staging Resource Group:** unioneyes-staging-rg (Canada Central)
- **Production Resource Group:** unioneyes-prod-rg (Canada Central)
- **Azure Container Registries:** unioneyesstagingacr, unioneyesprodacr (Basic SKU)
- **App Service Plans:** B1 (staging), P1V3 (production)
- **Web Apps:** unioneyes-staging-app, unioneyes-prod-app
- **PostgreSQL Servers:** unioneyes-staging-db, unioneyes-prod-db (v16, Standard_B2s)
- **Storage Accounts:** unioneyesstagingstorage, unioneyesprodstorage (with unioneyes-uploads containers)
- **Speech Services:** unioneyes-staging-speech, unioneyes-prod-speech (Canada Central, S0)
- **OpenAI Services:** unioneyes-staging-openai, unioneyes-prod-openai (Canada Central, S0)

#### Configuration Files
- ✅ `.env.staging` - All Azure credentials configured
- ✅ `.env.production` - All Azure credentials configured
- ✅ `AZURE_CREDENTIALS.md` - Complete credential documentation
- ✅ `Dockerfile` - Multi-stage build optimized for Next.js
- ✅ `.dockerignore` - Updated for monorepo structure
- ✅ `docker-compose.yml` - Local dev environment with PostgreSQL
- ✅ `docker-compose.staging.yml` - Staging overrides
- ✅ `docker-compose.prod.yml` - Production overrides
- ✅ `.github/workflows/azure-deploy.yml` - CI/CD pipeline
- ✅ `AZURE_DEPLOYMENT.md` - Complete deployment guide
- ✅ `docs/AZURE_OPENAI_DEPLOYMENT.md` - GPT-4 deployment instructions

### 🔄 In Progress

#### Azure OpenAI Model Deployments
- **Status:** Models must be deployed via Azure Portal (CLI not supported in Canada Central)
- **Action Required:** Follow `docs/AZURE_OPENAI_DEPLOYMENT.md` to deploy:
  - Staging: gpt-4o-mini with 50K TPM
  - Production: gpt-4o with 100K TPM
- **Deployment Name:** `gpt-4` (matches env var)

#### Docker Image Build
- **Status:** Building locally for testing
- **Command:** `docker build -t unioneyes:latest .`
- **Next:** Test with `docker-compose up`, then push to ACR

### ⏳ Pending

#### Database Setup
- [ ] Run Drizzle migrations on staging PostgreSQL
- [ ] Run Drizzle migrations on production PostgreSQL
- [ ] Verify all 22 tables created
- [ ] Seed initial admin users
- [ ] Test database connectivity from Web Apps

#### ACR Push
- [ ] Login to unioneyesstagingacr
- [ ] Tag and push staging image
- [ ] Login to unioneyesprodacr
- [ ] Tag and push production image
- [ ] Verify images in ACR

#### Web App Configuration
- [ ] Configure staging Web App to pull from ACR
- [ ] Set all staging environment variables
- [ ] Enable always-on and HTTPS-only for staging
- [ ] Configure production Web App to pull from ACR
- [ ] Set all production environment variables
- [ ] Enable always-on and HTTPS-only for production
- [ ] Test deployments at azurewebsites.net URLs

#### GitHub Actions Setup
- [ ] Create Azure service principals (staging & prod)
- [ ] Add all GitHub secrets (see AZURE_CREDENTIALS.md)
- [ ] Create `staging` branch
- [ ] Test staging deployment pipeline
- [ ] Test production deployment pipeline

#### Application Integration
- [ ] Integrate Azure Blob Storage for file uploads
- [ ] Integrate Azure Speech-to-Text for voice claims
- [ ] Integrate Azure OpenAI for claim scoring
- [ ] Create file upload UI components
- [ ] Create voice recording UI components
- [ ] Test end-to-end workflows

---

## Quick Reference

### Staging URLs
- **Web App:** https://unioneyes-staging-app.azurewebsites.net
- **Database:** unioneyes-staging-db.postgres.database.azure.com:5432
- **ACR:** unioneyesstagingacr.azurecr.io

### Production URLs
- **Web App:** https://unioneyes-prod-app.azurewebsites.net
- **Database:** unioneyes-prod-db.postgres.database.azure.com:5432
- **ACR:** unioneyesprodacr.azurecr.io

### Database Passwords
⚠️ **IMPORTANT:** PostgreSQL admin passwords were generated during setup script execution. If you didn't save them:

```bash
# Reset staging password
az postgres flexible-server update \
  --resource-group unioneyes-staging-rg \
  --name unioneyes-staging-db \
  --admin-password "YourNewSecurePassword123!"

# Reset production password
az postgres flexible-server update \
  --resource-group unioneyes-prod-rg \
  --name unioneyes-prod-db \
  --admin-password "YourNewSecurePassword123!"
```

Then update .env.staging and .env.production with new passwords.

---

## Next Steps (Priority Order)

1. **Deploy GPT-4 Models** (10-15 min)
   - Open Azure Portal
   - Navigate to OpenAI services
   - Follow `docs/AZURE_OPENAI_DEPLOYMENT.md`

2. **Complete Docker Build and Test** (15-20 min)
   - Wait for current build to complete
   - Test locally: `docker-compose up`
   - Verify app runs and connects to local PostgreSQL

3. **Push to Azure Container Registry** (10-15 min)
   ```bash
   # Staging
   az acr login --name unioneyesstagingacr
   docker tag unioneyes:latest unioneyesstagingacr.azurecr.io/unioneyes:latest
   docker push unioneyesstagingacr.azurecr.io/unioneyes:latest
   
   # Production
   az acr login --name unioneyesprodacr
   docker tag unioneyes:latest unioneyesprodacr.azurecr.io/unioneyes:latest
   docker push unioneyesprodacr.azurecr.io/unioneyes:latest
   ```

4. **Configure Web Apps** (30-45 min per environment)
   - See AZURE_DEPLOYMENT.md for detailed steps
   - Configure ACR integration
   - Set all environment variables
   - Enable security settings
   - Restart and verify

5. **Run Database Migrations** (15-20 min per environment)
   ```bash
   # Connect to staging
   DATABASE_URL="postgresql://unionadmin:PASSWORD@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"
   pnpm db:push
   
   # Connect to production
   DATABASE_URL="postgresql://unionadmin:PASSWORD@unioneyes-prod-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"
   pnpm db:push
   ```

6. **Setup GitHub Actions** (30-60 min)
   - Create service principals
   - Add 30+ GitHub secrets
   - Create staging branch
   - Test automated deployments

7. **Integrate Azure Services** (4-6 hours)
   - Install SDKs (@azure/storage-blob, @azure/openai, microsoft-cognitiveservices-speech-sdk)
   - Create utility libraries
   - Build API endpoints
   - Create UI components
   - End-to-end testing

---

## Rollback Plan

If deployment issues occur:

### Rollback Docker Image
```bash
# List previous images
az acr repository show-tags --name unioneyesstagingacr --repository unioneyes

# Deploy specific version
az webapp config container set \
  --name unioneyes-staging-app \
  --resource-group unioneyes-staging-rg \
  --docker-custom-image-name unioneyesstagingacr.azurecr.io/unioneyes:PREVIOUS_TAG
```

### Rollback Database
```bash
# Restore from automatic backup
az postgres flexible-server backup create \
  --resource-group unioneyes-staging-rg \
  --name unioneyes-staging-db

# Restore to point in time
az postgres flexible-server restore \
  --resource-group unioneyes-staging-rg \
  --name unioneyes-staging-db-restored \
  --source-server unioneyes-staging-db \
  --restore-time "2025-11-11T00:00:00Z"
```

---

## Monitoring

### View Application Logs
```bash
az webapp log tail --name unioneyes-staging-app --resource-group unioneyes-staging-rg
```

### Check Resource Status
```bash
az resource list --resource-group unioneyes-staging-rg --output table
```

### Monitor Costs
- Navigate to Cost Management + Billing in Azure Portal
- Set up budget alerts for $100/month staging, $300/month production
- Review daily spend

---

## Support & Documentation

- **Azure Deployment Guide:** `AZURE_DEPLOYMENT.md`
- **OpenAI Setup:** `docs/AZURE_OPENAI_DEPLOYMENT.md`
- **Credentials:** `AZURE_CREDENTIALS.md` (DO NOT COMMIT)
- **CI/CD Workflow:** `.github/workflows/azure-deploy.yml`
- **Docker Compose:** `docker-compose.yml`, `docker-compose.staging.yml`, `docker-compose.prod.yml`

For issues, check logs first:
```bash
# App logs
az webapp log tail --name unioneyes-staging-app --resource-group unioneyes-staging-rg

# Database logs
az postgres flexible-server server-logs list \
  --resource-group unioneyes-staging-rg \
  --server-name unioneyes-staging-db

# Container logs (local)
docker-compose logs -f app
```
