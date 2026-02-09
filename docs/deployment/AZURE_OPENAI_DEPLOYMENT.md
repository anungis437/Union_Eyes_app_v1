# Azure OpenAI Model Deployment Guide

Since Azure OpenAI model deployments cannot be automated via CLI in Canada Central region, you'll need to deploy models through the Azure Portal.

## Deploy GPT-4 Models via Azure Portal

### Staging Environment

1. **Navigate to Azure OpenAI Service**
   - Go to [Azure Portal](https://portal.azure.com)
   - Search for "unioneyes-staging-openai"
   - Click on the OpenAI resource

2. **Create Model Deployment**
   - In the left menu, click "Model deployments" or "Deployments"
   - Click "+ Create new deployment"
   - Select model: **gpt-4o-mini** (recommended for cost-effective staging) or **gpt-4o**
   - Deployment name: **gpt-4** (this matches the env var AZURE_OPENAI_DEPLOYMENT_NAME)
   - Model version: Latest available (2024-07-18 for gpt-4o-mini)
   - Deployment type: Standard
   - Tokens per minute rate limit: **50K** (adjust based on expected usage)
   - Click "Create"

3. **Verify Deployment**
   - Wait for deployment to complete (usually 1-2 minutes)
   - You should see "gpt-4" in the deployments list
   - Status should show "Succeeded"

### Production Environment

1. **Navigate to Production OpenAI Service**
   - Search for "unioneyes-prod-openai"
   - Click on the resource

2. **Create Model Deployment**
   - Click "Model deployments"
   - Click "+ Create new deployment"
   - Select model: **gpt-4o** (recommended for production quality)
   - Deployment name: **gpt-4**
   - Model version: Latest available (2024-11-20 or 2024-08-06)
   - Deployment type: Standard
   - Tokens per minute rate limit: **100K** (higher for production traffic)
   - Click "Create"

3. **Verify Deployment**
   - Confirm "gpt-4" deployment is listed and succeeded

## Alternative: Using Azure CLI with Different Region

If you prefer CLI deployment, you can create the OpenAI service in a supported region like **East US** or **West Europe**:

### Check Supported Regions

```bash
az cognitiveservices account list-skus \
  --kind OpenAI \
  --location eastus \
  --query "[?name=='S0'].locations" --output table
```

### Redeploy in Supported Region (Optional)

```bash
# Delete existing (if needed)
az cognitiveservices account delete \
  --name unioneyes-staging-openai \
  --resource-group unioneyes-staging-rg

# Create in East US
az cognitiveservices account create \
  --name unioneyes-staging-openai \
  --resource-group unioneyes-staging-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus

# Deploy model
az cognitiveservices account deployment create \
  --name unioneyes-staging-openai \
  --resource-group unioneyes-staging-rg \
  --deployment-name gpt-4 \
  --model-name gpt-4o \
  --model-version "2024-11-20" \
  --model-format OpenAI \
  --sku-name "Standard" \
  --sku-capacity 50
```

**Note:** If you change regions, update the environment variables:

- `AZURE_OPENAI_ENDPOINT` will change to the new region
- `AZURE_SPEECH_REGION` should match for consistency (or keep canadacentral if Speech Service stays there)

## Test Your Deployment

After deploying the model, test it using Azure OpenAI Studio:

1. Go to [Azure OpenAI Studio](https://oai.azure.com)
2. Select your subscription and resource
3. Click "Playground" → "Chat"
4. Select your "gpt-4" deployment
5. Send a test message: "Hello, can you help analyze union grievances?"
6. Verify you get a response

## Model Recommendations

| Environment | Model | Reason |
|------------|-------|--------|
| **Staging** | gpt-4o-mini | Cost-effective for testing, good performance |
| **Production** | gpt-4o | Best quality, latest features |
| **Alternative** | gpt-4 (0613) | More stable, well-tested |

## Cost Estimates

### gpt-4o-mini

- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- **Example:** 1M requests with 500 tokens each ≈ $375

### gpt-4o

- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- **Example:** 1M requests with 500 tokens each ≈ $6,250

### gpt-4 (0613)

- Input: $30.00 per 1M tokens
- Output: $60.00 per 1M tokens
- **Example:** 1M requests with 500 tokens each ≈ $45,000

## Update Environment Variables

After deployment, ensure your .env files have:

```env
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

The deployment name must match exactly what you entered in the Azure Portal.

## Troubleshooting

### "Deployment not found" error

- Verify deployment name is exactly "gpt-4"
- Check the OpenAI resource name matches your environment variables
- Ensure the API key and endpoint are correct

### "Quota exceeded" error

- Check your subscription's quota in Azure Portal
- Request quota increase: Azure Portal → Quotas → Cognitive Services
- May take 24-48 hours for approval

### "Model not available" error

- Model may not be available in your region yet
- Try a different model (gpt-4o-mini is most widely available)
- Consider switching to a supported region (East US, West Europe)

## Next Steps After Deployment

1. ✅ Models deployed via Azure Portal
2. Update .env.staging and .env.production with correct deployment names
3. Test local Docker build with correct credentials
4. Push Docker image to Azure Container Registry
5. Deploy to Azure Web Apps
6. Run integration tests
