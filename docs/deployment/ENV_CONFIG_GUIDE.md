# Environment Configuration Guide

This guide explains the purpose of each environment file and when to use them.

## File Structure

```
.
├── .env                        # Active secrets (DO NOT COMMIT)
├── .env.example                # Template for all environments
├── .env.database.example       # Database-specific configuration guide
├── .env.calendar-sync.example  # Calendar sync integration template
├── .env.production             # Production secrets (Azure Key Vault)
└── .env.staging                # Staging secrets (Azure Key Vault)
```

## 🔐 Primary Files

### `.env` (Local Development - **NEVER COMMIT**)
Your active local environment file. Copy from `.env.example` and fill in your credentials.

**Usage:**
```bash
cp .env.example .env
# Edit .env with your local credentials
```

### `.env.example` (Template - **COMMIT THIS**)
Complete template showing all required environment variables. Use this as the source of truth.

**Contains:**
- All required variables with empty values
- Comments explaining each variable
- Example values for non-sensitive settings

---

## 📋 Specialized Templates

### `.env.database.example`
Database-specific configuration guide covering:
- PostgreSQL (Supabase)
- Azure SQL Server
- Microsoft SQL Server
- Connection string formats
- Pool configuration

**Use when:** Setting up database connections for the first time.

### `.env.calendar-sync.example`
Microsoft Graph API configuration for calendar synchronization.

**Use when:** Integrating with Microsoft 365 calendar features.

---

## 🚀 Deployment Files

### `.env.production`
Production environment secrets stored in **Azure Key Vault**.

**Managed by:** Azure Key Vault references
**Access:** Limited to production deployments
**Never edit locally** - managed through Azure portal

### `.env.staging`
Staging environment secrets stored in **Azure Key Vault**.

**Managed by:** Azure Key Vault references
**Access:** Limited to staging deployments
**Use for:** Testing production-like configurations

---

## 🔧 Workspace Files

### `services/financial-service/.env`
Financial microservice local secrets.

### `services/financial-service/.env.example`
Template for financial service configuration.

### `packages/supabase/.env.template`
Supabase package configuration template.

---

## 📝 Setup Instructions

### First-Time Setup

1. **Copy main template:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in required values:**
   - Database URL (see `.env.database.example` for formats)
   - Clerk authentication keys
   - Supabase credentials
   - Payment provider keys (Whop/Stripe)

3. **Optional: Calendar sync:**
   ```bash
   # If using calendar features
   cat .env.calendar-sync.example >> .env
   # Edit calendar-specific variables
   ```

### Environment-Specific Setup

#### Local Development
```bash
# Use .env with localhost values
DATABASE_URL=postgresql://user:pass@localhost:5432/unioneyes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
CLERK_COOKIE_DOMAIN=localhost
```

#### Staging
Configured in Azure App Service using `.env.staging` values.

#### Production
Configured in Azure App Service using `.env.production` values + Azure Key Vault.

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep `.env` in `.gitignore`
- Use strong, unique passwords
- Rotate credentials regularly
- Use Azure Key Vault for production
- Document required variables in `.env.example`

### ❌ DON'T:
- Commit `.env` files with secrets
- Share credentials in plain text
- Use production credentials locally
- Store API keys in code

---

## 🧪 Testing Environments

### Unit Tests
Uses mock values from `__tests__/setup.ts`. No real credentials needed.

### Integration Tests
Requires:
- Local database
- Test Clerk account
- Test Supabase project

Set these in `.env` with `TEST_` prefix:
```bash
TEST_DATABASE_URL=postgresql://...
TEST_CLERK_SECRET_KEY=sk_test_...
```

---

## 📊 Required Variables by Feature

### Core (Always Required)
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Payment Processing
**Whop:**
- `WHOP_API_KEY`
- `WHOP_PLAN_ID_MONTHLY`
- `WHOP_PLAN_ID_YEARLY`
- `WHOP_WEBHOOK_KEY`

**Stripe (if enabled):**
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Redis Configuration (REQUIRED)
**Purpose:** Distributed caching, job queues, and real-time notifications

**Required Variables:**
- `REDIS_HOST` - Your Redis server hostname
- `REDIS_PORT` - Redis server port (typically 6379)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis authentication token

**Example:**
```bash
# Local Redis (development)
REDIS_HOST=localhost
REDIS_PORT=6379

# Upstash Redis (production/staging)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXb5ASQgYWRkNmY...
```

**Setup Options:**

1. **Local Development:**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   
   # Or install Redis locally
   # Windows: https://github.com/microsoftarchive/redis/releases
   # macOS: brew install redis
   # Linux: sudo apt-get install redis-server
   ```

2. **Upstash (Recommended for Production):**
   - Sign up at https://upstash.com
   - Create a new Redis database
   - Copy REST URL and Token
   - Add to environment variables

**Validation:**
The application will fail at startup if Redis variables are missing:
```
Error: REDIS_HOST is not configured. Set environment variable before starting notification worker.
```

### Azure Integration
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`
- `AZURE_KEY_VAULT_URL`

### Encryption (Tax Compliance)
- `ENCRYPTION_KEY_NAME` (Azure Key Vault)
- `FALLBACK_ENCRYPTION_KEY` (local dev only)

### Calendar Sync (Optional)
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`

---

## 🔍 Troubleshooting

### "Missing environment variable" errors

1. Check `.env.example` for required variable
2. Verify variable exists in your `.env`
3. Restart dev server (Next.js caches env vars)

### Database connection issues

Consult `.env.database.example` for correct connection string format.

### Azure Key Vault access denied

Ensure:
- Service principal has correct permissions
- `AZURE_TENANT_ID` matches your Azure AD tenant
- Managed Identity is configured (production only)

---

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Azure Key Vault Setup](./docs/AZURE_KEYVAULT_SETUP.md)
- [Encryption Guide](./docs/ENCRYPTION_GUIDE.md)
- [Database Setup](./setup-database.ps1)

---

## 🤝 Contributing

When adding new environment variables:

1. **Add to `.env.example`** with comments
2. **Update this README** under "Required Variables"
3. **Add validation** in `lib/env-validator.ts`
4. **Document** in relevant setup guides

---

**Last Updated:** February 6, 2026
**Maintained by:** UnionEyes Development Team
