# UnionEyes Azure Deployment - Next Steps

## 🎯 Current Status: 65% Complete

### ✅ Completed
- [x] Azure infrastructure provisioned (16 resources across staging & production)
- [x] All Azure credentials retrieved and documented
- [x] Environment files created (.env.staging, .env.production)
- [x] Comprehensive deployment documentation
- [x] Docker configuration optimized
- [x] Docker build in progress (421MB context)

### 🔄 In Progress
- [ ] **Docker build** - Currently building with optimized context (~10-15 min remaining)

### ⏳ Next Actions (Priority Order)

#### 1️⃣ Deploy GPT-4 Models ✅ COMPLETED
**Solution**: Created new OpenAI services in East US region (Canada Central doesn't support deployments)

**What Was Done**:
1. Created **unioneyes-staging-openai-eastus** with gpt-4o-mini deployed (50K tokens/min)
2. Created **unioneyes-prod-openai-eastus** with gpt-4o deployed (40K tokens/min)
3. Updated both Web Apps with new endpoints: https://eastus.api.cognitive.microsoft.com/
4. Restarted apps to apply changes

📖 **Full Details**: `GPT4_DEPLOYMENT_COMPLETE.md` (root directory)

#### 2️⃣ Add Clerk Authentication Keys ✅ COMPLETED
**Keys Added**: 2025-11-12

**What Was Done**:
1. Added keys to both staging and production Web Apps
   - Publishable Key: `pk_test_a25vd24taGFnZmlzaC02Ny5jbGVyay5hY2NvdW50cy5kZXYk`
   - Secret Key: `sk_test_CgTyrzrO1CazAU5AGQvOkq7OyybHaWwzMS4g3DUoQA`
2. Restarted both apps to apply changes
3. Updated AZURE_CREDENTIALS.md with keys

📖 **Keys stored in**: `AZURE_CREDENTIALS.md` (Authentication Keys section)

---

#### 3️⃣ Test & Push Docker Image (30 minutes) - SKIPPED (Already Done)

**After Docker build completes**:

```powershell
# Verify image built
docker images | Select-String unioneyes

# Test locally
cd d:\APPS\union-claims-standalone\UnionEyes
docker-compose up

# In another terminal, verify app responds
curl http://localhost:3000

# Stop test
docker-compose down
```

**Push to Azure Container Registries**:

```powershell
# Staging
az acr login --name unioneyesstagingacr
docker tag unioneyes:latest unioneyesstagingacr.azurecr.io/unioneyes:latest
docker tag unioneyes:latest unioneyesstagingacr.azurecr.io/unioneyes:v1.0.0
docker push unioneyesstagingacr.azurecr.io/unioneyes:latest
docker push unioneyesstagingacr.azurecr.io/unioneyes:v1.0.0

# Production
az acr login --name unioneyesprodacr
docker tag unioneyes:latest unioneyesprodacr.azurecr.io/unioneyes:latest
docker tag unioneyes:latest unioneyesprodacr.azurecr.io/unioneyes:v1.0.0
docker push unioneyesprodacr.azurecr.io/unioneyes:latest
docker push unioneyesprodacr.azurecr.io/unioneyes:v1.0.0

# Verify
az acr repository list --name unioneyesstagingacr
az acr repository list --name unioneyesprodacr
```

**Or use automated script**:
```powershell
.\scripts\deploy-to-azure.ps1
```

---

#### 3️⃣ Configure Web Apps (45 minutes per environment)

**Get ACR credentials**:
```powershell
az acr credential show --name unioneyesstagingacr
# Copy username and password
```

**Configure Staging Web App**:
```powershell
az webapp config container set \
  --name unioneyes-staging-app \
  --resource-group unioneyes-staging-rg \
  --docker-custom-image-name unioneyesstagingacr.azurecr.io/unioneyes:latest \
  --docker-registry-server-url https://unioneyesstagingacr.azurecr.io \
  --docker-registry-server-user unioneyesstagingacr \
  --docker-registry-server-password <FROM_ABOVE>
```

**Set Environment Variables** (Azure Portal):
1. Go to **unioneyes-staging-app** → **Configuration**
2. Click **New application setting** for each from `.env.staging`:
   - `DATABASE_URL` (with real password)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - All `AZURE_*` variables
3. Enable **Always On**: Configuration → General settings
4. Enable **HTTPS Only**: Configuration → General settings
5. Click **Save**

**Restart**:
```powershell
az webapp restart --name unioneyes-staging-app --resource-group unioneyes-staging-rg
```

**Repeat for production** using `unioneyes-prod-app` and `.env.production`

---

#### 4️⃣ Setup Database Access (10 minutes)

**Add firewall rules for Azure services**:
```powershell
# Staging
az postgres flexible-server firewall-rule create \
  --resource-group unioneyes-staging-rg \
  --name unioneyes-staging-db \
  --rule-name AllowAllAzureIps \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Production
az postgres flexible-server firewall-rule create \
  --resource-group unioneyes-prod-rg \
  --name unioneyes-prod-db \
  --rule-name AllowAllAzureIps \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Get/Reset PostgreSQL passwords** (if needed):
```powershell
# Staging
az postgres flexible-server update \
  --resource-group unioneyes-staging-rg \
  --name unioneyes-staging-db \
  --admin-password <NEW_SECURE_PASSWORD>

# Production
az postgres flexible-server update \
  --resource-group unioneyes-prod-rg \
  --name unioneyes-prod-db \
  --admin-password <NEW_SECURE_PASSWORD>
```

---

#### 5️⃣ Run Database Migrations (20 minutes per environment)

**Staging**:
```powershell
# Set connection string (use password from step 4)
$env:DATABASE_URL="postgresql://unionadmin:<PASSWORD>@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"

# Run migrations
pnpm db:push

# Verify tables
psql $env:DATABASE_URL -c "\dt"
# Should show 22 tables
```

**Production** - Repeat with production credentials

---

#### 6️⃣ Verify Deployments (20 minutes)

**Staging**:
```powershell
# Check deployment status
az webapp show --name unioneyes-staging-app --resource-group unioneyes-staging-rg --query state

# View logs
az webapp log tail --name unioneyes-staging-app --resource-group unioneyes-staging-rg

# Test in browser
start https://unioneyes-staging-app.azurewebsites.net
```

**Test checklist**:
- [ ] App loads without errors
- [ ] User registration works (Clerk)
- [ ] User login works
- [ ] Claims list loads
- [ ] Can create new claim
- [ ] Database connection verified

**Production** - Repeat tests

---

#### 7️⃣ Setup GitHub Actions (60 minutes)

**Create service principals**:
```powershell
# Staging
az ad sp create-for-rbac --name "unioneyes-staging-github" \
  --role contributor \
  --scopes /subscriptions/5d819f33-d16f-429c-a3c0-5b0e94740ba3/resourceGroups/unioneyes-staging-rg \
  --sdk-auth

# Copy entire JSON output

# Production
az ad sp create-for-rbac --name "unioneyes-prod-github" \
  --role contributor \
  --scopes /subscriptions/5d819f33-d16f-429c-a3c0-5b0e94740ba3/resourceGroups/unioneyes-prod-rg \
  --sdk-auth
```

**Add GitHub secrets**:
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add secrets from `AZURE_CREDENTIALS.md` (30+ secrets)
3. Key secrets:
   - `AZURE_CREDENTIALS_STAGING` (JSON from above)
   - `AZURE_CREDENTIALS_PRODUCTION` (JSON from above)
   - `DATABASE_URL_STAGING`
   - `DATABASE_URL_PRODUCTION`
   - All ACR credentials
   - Clerk keys

**Create branches**:
```bash
git checkout -b staging
git push origin staging

git checkout -b production
git push origin production
```

**Test automated deployment**:
```bash
git checkout staging
git commit --allow-empty -m "Test CI/CD"
git push origin staging
# Watch GitHub Actions tab
```

---

#### 8️⃣ Integrate Azure Services (4-6 hours)

**Install SDKs**:
```powershell
pnpm add @azure/storage-blob @azure/openai microsoft-cognitiveservices-speech-sdk
```

**Create utility libraries**:
- `lib/azure-storage.ts` - File upload/download to Blob Storage
- `lib/azure-speech.ts` - Speech-to-Text transcription
- `lib/azure-openai.ts` - AI analysis and recommendations

**API endpoints**:
- `POST /api/claims/[id]/attachments` - Upload claim attachments
- `POST /api/speech/transcribe` - Transcribe voice recordings
- `POST /api/claims/analyze` - AI analysis of claims

**UI components**:
- File upload dropzone
- Voice recorder
- AI insights panel

---

## 📊 Estimated Timeline

- [x] Infrastructure & Config: **2 hours** (DONE)
- [x] Documentation: **1 hour** (DONE)
- [ ] GPT-4 Deployment: **15 minutes** (NEXT)
- [ ] Docker Build: **15 minutes** (IN PROGRESS)
- [ ] ACR Push: **15 minutes**
- [ ] Web App Config: **90 minutes** (both environments)
- [ ] Database Setup: **40 minutes** (both environments)
- [ ] Verification: **40 minutes** (both environments)
- [ ] GitHub Actions: **60 minutes**
- [ ] Service Integration: **4-6 hours**

**Total Remaining**: ~8-10 hours

---

## 💰 Monthly Cost Estimate

### Staging: ~$50-60/month
- App Service Plan (B1): $13.14
- PostgreSQL (Standard_B2s): $15-20
- Storage: $5
- Speech Service: Pay-per-use
- OpenAI (gpt-4o-mini): $5-10 estimated
- Container Registry: $5

### Production: ~$140-150/month
- App Service Plan (P1V3): $80.30
- PostgreSQL (Standard_B2s): $15-20
- Storage: $10
- Speech Service: Pay-per-use
- OpenAI (gpt-4o): $20-30 estimated
- Container Registry: $5

---

## 🔗 Quick Reference

### URLs
- **Staging App**: https://unioneyes-staging-app.azurewebsites.net
- **Production App**: https://unioneyes-prod-app.azurewebsites.net
- **Azure Portal**: https://portal.azure.com
- **GitHub Repo**: (your repository URL)

### Resource Names
- **Staging RG**: unioneyes-staging-rg
- **Production RG**: unioneyes-prod-rg
- **Staging DB**: unioneyes-staging-db.postgres.database.azure.com
- **Production DB**: unioneyes-prod-db.postgres.database.azure.com
- **Staging ACR**: unioneyesstagingacr.azurecr.io
- **Production ACR**: unioneyesprodacr.azurecr.io

### Documentation
- Full credentials: `AZURE_CREDENTIALS.md`
- GPT-4 deployment: `docs/AZURE_OPENAI_DEPLOYMENT.md`
- Deployment status: `DEPLOYMENT_STATUS.md`
- Session summary: `SESSION_SUMMARY.md`
- Automation script: `scripts/deploy-to-azure.ps1`

---

## 🚨 Troubleshooting

### Docker build fails
```powershell
# Clean up and rebuild
docker system prune -a
docker build --no-cache -t unioneyes:latest .
```

### Web App not pulling image
```powershell
# Check ACR credentials in Web App config
az webapp config show --name unioneyes-staging-app --resource-group unioneyes-staging-rg
```

### Database connection fails
```powershell
# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group unioneyes-staging-rg \
  --name unioneyes-staging-db

# Test connection
psql "postgresql://unionadmin:<PASSWORD>@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require"
```

### OpenAI deployment not found
- Ensure deployment name is exactly "gpt-4" (matches env var)
- Check deployment status in Azure Portal
- Wait 2-3 minutes after creation for propagation

---

## ✅ Success Criteria

- [ ] Docker image builds successfully
- [ ] GPT-4 models deployed in both environments
- [ ] Web Apps running and accessible via URLs
- [ ] Database tables created (22 tables)
- [ ] User registration/login works
- [ ] Claims can be created and viewed
- [ ] GitHub Actions deploys automatically
- [ ] Monitoring shows healthy status
- [ ] Costs within expected range

---

**Last Updated**: 2025-06-08 (Deployment in progress)
