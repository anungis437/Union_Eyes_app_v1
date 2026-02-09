# Azure Credentials and Configuration

**⚠️ CONFIDENTIAL - Do not commit this file to version control**

Generated: November 11, 2025

## Staging Environment

### Resource Group

- **Name:** unioneyes-staging-rg
- **Location:** canadacentral

### PostgreSQL Database

- **Server:** unioneyes-staging-db.postgres.database.azure.com
- **Admin User:** unionadmin
- **Admin Password:** [SAVE FROM SETUP SCRIPT OUTPUT]
- **Database:** unioneyes
- **Version:** 16
- **Connection String:**

  ```
  postgresql://unionadmin:YOUR_PASSWORD@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require
  ```

### Azure Container Registry

- **Name:** unioneyesstagingacr
- **Login Server:** unioneyesstagingacr.azurecr.io
- **Username:** unioneyesstagingacr
- **Password:** /9ddxCJg+d8WCm1sU16h2WL1WozPUuFlx6wnLrwf/a+ACRDufvoH
- **Password2:** dYI+4LCj81/17y96pXe/YsGBgLUbsY94bVXHWmUCwN+ACRBNu/ef

### Storage Account

- **Name:** unioneyesstagingstorage
- **Key:** MXAT0sIYMyYcQHcUwTWY1rs3PckQphpKgAAcyRjOddI/UqBA809nur6MQYCgNttspOLG5z3p5EBV+AStRz6NKA==
- **Container:** unioneyes-uploads
- **Connection String:**

  ```
  DefaultEndpointsProtocol=https;AccountName=unioneyesstagingstorage;AccountKey=MXAT0sIYMyYcQHcUwTWY1rs3PckQphpKgAAcyRjOddI/UqBA809nur6MQYCgNttspOLG5z3p5EBV+AStRz6NKA==;EndpointSuffix=core.windows.net
  ```

### Speech Service

- **Name:** unioneyes-staging-speech
- **Region:** canadacentral
- **Key1:** 65ZhH61AHTcZNFbbo0mq8VoFkOfz1ixhZEm3pGBO467ve4x7b0y1JQQJ99BKACBsN54XJ3w3AAAYACOGQYik
- **Key2:** 50mLTNm0iPEQyARCXUGQcEnrQNIhab0kLTuZWrQWkB6Xc7cBwCy1JQQJ99BKACBsN54XJ3w3AAAYACOG61BT

### Azure OpenAI (East US - WITH DEPLOYED MODELS)

- **Name:** unioneyes-staging-openai-eastus
- **Endpoint:** <https://eastus.api.cognitive.microsoft.com/>
- **Key1:** CFbfKCRpEXfj5ZSqEMyfevhyoZ3PN2nJTMYqzJM5MZeS0ahuiZGzJQQJ99BKACYeBjFXJ3w3AAABACOGz9hr
- **Key2:** 5Muz8Uhx8YAIln0RxZF2iIRPFA8bCrX9r7wwaoqFHBm1wtYUgTYJJQQJ99BKACYeBjFXJ3w3AAABACOGpsUz
- **API Version:** 2024-02-15-preview
- **Deployment Name:** gpt-4
- **Model Deployed:** gpt-4o-mini (2024-07-18)
- **Capacity:** 50K tokens/min, 500 requests/min

### Azure OpenAI (Canada Central - NO MODEL DEPLOYMENT SUPPORT)

- **Name:** unioneyes-staging-openai
- **Endpoint:** <https://canadacentral.api.cognitive.microsoft.com/>
- **Key1:** 7bo9T5PFEhv9PDkQeBJ9Bl9gvwdZiYSu4RLWVZWsRcLeddjKjc8xJQQJ99BKACBsN54XJ3w3AAABACOG5vY4
- **Key2:** 4UWSR64pejTd5en5ZvzgA6BoBPhBa5cclu8yDqWa5bv0hMp5oxoOJQQJ99BKACBsN54XJ3w3AAABACOGphEd
- **Status:** NOT USED (region doesn't support model deployments)

### Web App

- **Name:** unioneyes-staging-app
- **URL:** <https://unioneyes-staging-app.azurewebsites.net>

---

## Production Environment

### Resource Group

- **Name:** unioneyes-prod-rg
- **Location:** canadacentral

### PostgreSQL Database

- **Server:** unioneyes-prod-db.postgres.database.azure.com
- **Admin User:** unionadmin
- **Admin Password:** [SAVE FROM SETUP SCRIPT OUTPUT]
- **Database:** unioneyes
- **Version:** 16
- **Connection String:**

  ```
  postgresql://unionadmin:YOUR_PASSWORD@unioneyes-prod-db.postgres.database.azure.com:5432/unioneyes?sslmode=require
  ```

### Azure Container Registry

- **Name:** unioneyesprodacr
- **Login Server:** unioneyesprodacr.azurecr.io
- **Username:** unioneyesprodacr
- **Password:** EIi9YT6CEmKCmU4t3pDM3v3b3KIbo7hcPkZXVrLrG1+ACRAtwy8C
- **Password2:** 9EwOgNrM8y7zMnrBOLMQFsbGB9BAPkLlwEL2AI9V1J+ACRA6+qcf

### Storage Account

- **Name:** unioneyesprodstorage
- **Key:** fdT/TDPOBs+U4EmYXgfwyr1EnqXa4CTTy/kXtNzWnBD+HQaT993LSpbdjRI2l2dvjE/HG2T5oyOw+AStekn8cw==
- **Container:** unioneyes-uploads
- **Connection String:**

  ```
  DefaultEndpointsProtocol=https;AccountName=unioneyesprodstorage;AccountKey=fdT/TDPOBs+U4EmYXgfwyr1EnqXa4CTTy/kXtNzWnBD+HQaT993LSpbdjRI2l2dvjE/HG2T5oyOw+AStekn8cw==;EndpointSuffix=core.windows.net
  ```

### Speech Service

- **Name:** unioneyes-prod-speech
- **Region:** canadacentral
- **Key1:** AnupH20JacXqZmVirT4ZKobkqSHc46b9ntJp8GsQ4HlNyh3kJX30JQQJ99BKACBsN54XJ3w3AAAYACOGNxvt
- **Key2:** 2dwBeRGL5FYsHPAPFbs5bHGDIjX8Bvo7iOp9FbvDE75EpzF4Jl86JQQJ99BKACBsN54XJ3w3AAAYACOGz0F0

### Azure OpenAI (East US - WITH DEPLOYED MODELS)

- **Name:** unioneyes-prod-openai-eastus
- **Endpoint:** <https://eastus.api.cognitive.microsoft.com/>
- **Key1:** 7pLpc7nOmpgEJkR5QIiZgazt1T0pl17vQpJ1MezHcjXZPrx1ag4SJQQJ99BKACYeBjFXJ3w3AAABACOGr5Fk
- **Key2:** 9g4W4BO3EwfM7RJ2LJqdxCuA9G0bvEqbKYPQ3PHMHp6Illc3jJBmJQQJ99BKACYeBjFXJ3w3AAABACOGY8j5
- **API Version:** 2024-02-15-preview
- **Deployment Name:** gpt-4
- **Model Deployed:** gpt-4o (2024-08-06)
- **Capacity:** 40K tokens/min, 40 requests/10sec

### Azure OpenAI (Canada Central - NO MODEL DEPLOYMENT SUPPORT)

- **Name:** unioneyes-prod-openai
- **Endpoint:** <https://canadacentral.api.cognitive.microsoft.com/>
- **Key1:** 4FVVo0ryCIazqFx5aZxSf6q5cLn9GmFqpB8cBSHSLAr2stbCS8BDJQQJ99BKACBsN54XJ3w3AAABACOGc1ij
- **Key2:** CBRrCOigepka872JJHVfgwB1SFnq62YqFKEWYMl2JAz0E6aTmZT9JQQJ99BKACBsN54XJ3w3AAABACOGgOfb
- **Status:** NOT USED (region doesn't support model deployments)

### Web App

- **Name:** unioneyes-prod-app
- **URL:** <https://unioneyes-prod-app.azurewebsites.net>

---

## Authentication Keys

### Clerk

**Status**: ✅ CONFIGURED (Added to both Web Apps on 2025-11-12)

- **Publishable Key:** `pk_test_a25vd24taGFnZmlzaC02Ny5jbGVyay5hY2NvdW50cy5kZXYk`
- **Secret Key:** `sk_test_CgTyrzrO1CazAU5AGQvOkq7OyybHaWwzMS4g3DUoQA`

---

## GitHub Actions Secrets Required

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Shared

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_a25vd24taGFnZmlzaC02Ny5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_CgTyrzrO1CazAU5AGQvOkq7OyybHaWwzMS4g3DUoQA
```

### Staging

```
STAGING_ACR_LOGIN_SERVER=unioneyesstagingacr.azurecr.io
STAGING_ACR_USERNAME=unioneyesstagingacr
STAGING_ACR_PASSWORD=/9ddxCJg+d8WCm1sU16h2WL1WozPUuFlx6wnLrwf/a+ACRDufvoH
STAGING_APP_URL=https://unioneyes-staging-app.azurewebsites.net
STAGING_DATABASE_URL=postgresql://unionadmin:YOUR_PASSWORD@unioneyes-staging-db.postgres.database.azure.com:5432/unioneyes?sslmode=require
STAGING_AZURE_STORAGE_ACCOUNT_NAME=unioneyesstagingstorage
STAGING_AZURE_STORAGE_ACCOUNT_KEY=MXAT0sIYMyYcQHcUwTWY1rs3PckQphpKgAAcyRjOddI/UqBA809nur6MQYCgNttspOLG5z3p5EBV+AStRz6NKA==
STAGING_AZURE_SPEECH_KEY=65ZhH61AHTcZNFbbo0mq8VoFkOfz1ixhZEm3pGBO467ve4x7b0y1JQQJ99BKACBsN54XJ3w3AAAYACOGQYik
STAGING_AZURE_SPEECH_REGION=canadacentral
STAGING_AZURE_OPENAI_ENDPOINT=https://canadacentral.api.cognitive.microsoft.com/
STAGING_AZURE_OPENAI_KEY=7bo9T5PFEhv9PDkQeBJ9Bl9gvwdZiYSu4RLWVZWsRcLeddjKjc8xJQQJ99BKACBsN54XJ3w3AAABACOG5vY4
```

### Production

```
PROD_ACR_LOGIN_SERVER=unioneyesprodacr.azurecr.io
PROD_ACR_USERNAME=unioneyesprodacr
PROD_ACR_PASSWORD=EIi9YT6CEmKCmU4t3pDM3v3b3KIbo7hcPkZXVrLrG1+ACRAtwy8C
PROD_APP_URL=https://unioneyes-prod-app.azurewebsites.net
PROD_DATABASE_URL=postgresql://unionadmin:YOUR_PASSWORD@unioneyes-prod-db.postgres.database.azure.com:5432/unioneyes?sslmode=require
PROD_AZURE_STORAGE_ACCOUNT_NAME=unioneyesprodstorage
PROD_AZURE_STORAGE_ACCOUNT_KEY=fdT/TDPOBs+U4EmYXgfwyr1EnqXa4CTTy/kXtNzWnBD+HQaT993LSpbdjRI2l2dvjE/HG2T5oyOw+AStekn8cw==
PROD_AZURE_SPEECH_KEY=AnupH20JacXqZmVirT4ZKobkqSHc46b9ntJp8GsQ4HlNyh3kJX30JQQJ99BKACBsN54XJ3w3AAAYACOGNxvt
PROD_AZURE_SPEECH_REGION=canadacentral
PROD_AZURE_OPENAI_ENDPOINT=https://canadacentral.api.cognitive.microsoft.com/
PROD_AZURE_OPENAI_KEY=4FVVo0ryCIazqFx5aZxSf6q5cLn9GmFqpB8cBSHSLAr2stbCS8BDJQQJ99BKACBsN54XJ3w3AAABACOGc1ij
```

### Azure Service Principal (for deployments)

Create service principals with:

```bash
# Staging
az ad sp create-for-rbac --name "unioneyes-staging-github" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/unioneyes-staging-rg \
  --sdk-auth

# Production
az ad sp create-for-rbac --name "unioneyes-prod-github" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/unioneyes-prod-rg \
  --sdk-auth
```

Add the JSON output as:

- `AZURE_CREDENTIALS_STAGING`
- `AZURE_CREDENTIALS_PROD`

---

## Next Steps

1. **Update PostgreSQL passwords** in .env files (check setup script output)
2. **Add Clerk keys** to .env files (from Clerk dashboard)
3. **Deploy GPT-4 model** to Azure OpenAI services
4. **Create GitHub secrets** for CI/CD
5. **Build and test Docker image locally**
6. **Push to staging** for testing
7. **Deploy to production** after validation
