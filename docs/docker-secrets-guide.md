# Docker Secrets Management Guide

## Overview
Docker secrets provide secure storage for sensitive data like passwords, API keys, and certificates.

## Setup

### 1. Initialize Docker Swarm (required for secrets)
```bash
docker swarm init
```

### 2. Create secrets from files
```bash
# Database password
echo "your-secure-password" | docker secret create db_password -

# Clerk keys
echo "pk_live_xxxxx" | docker secret create clerk_publishable_key -
echo "sk_live_xxxxx" | docker secret create clerk_secret_key -

# Azure credentials
echo "your-storage-key" | docker secret create azure_storage_key -
echo "your-openai-key" | docker secret create azure_openai_key -
```

### 3. Create secrets from existing .env (automated)
```bash
.\scripts\docker\create-secrets-from-env.ps1
```

## Usage in Docker Compose

```yaml
services:
  app:
    secrets:
      - db_password
      - clerk_secret_key
    environment:
      DATABASE_URL: postgresql://user:file:///run/secrets/db_password@host/db
      CLERK_SECRET_KEY_FILE: /run/secrets/clerk_secret_key

secrets:
  db_password:
    external: true
  clerk_secret_key:
    external: true
```

## Best Practices

1. **Never commit secrets to Git**
2. **Use environment-specific secrets** (dev, staging, prod)
3. **Rotate secrets regularly** (every 90 days)
4. **Limit secret access** via service permissions
5. **Encrypt secrets at rest** (enabled by default in Swarm)

## Viewing Secrets

```bash
# List all secrets
docker secret ls

# Inspect secret metadata (does NOT show value)
docker secret inspect clerk_secret_key
```

## Removing Secrets

```bash
docker secret rm secret_name
```

## Alternative: External Secrets Manager

For production, consider using:
- **HashiCorp Vault** - Enterprise-grade secrets management
- **AWS Secrets Manager** - Cloud-native solution
- **Azure Key Vault** - Azure integration
- **Sealed Secrets** - Kubernetes-native encrypted secrets
