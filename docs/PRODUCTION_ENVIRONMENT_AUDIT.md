# Production Environment Variables Audit Report 🔐

**Last Updated**: February 14, 2026  
**Total Variables Defined**: 100+  
**Environment**: Production Readiness Check

---

## Executive Summary

This document provides a comprehensive audit of all environment variables required for Union Eyes production deployment. Variables are categorized by **priority** and **service area** to guide configuration.

### Priority Levels
- 🔴 **CRITICAL**: Application will fail without these
- 🟡 **HIGH**: Major features disabled without these  
- 🟢 **MEDIUM**: Optional features, graceful degradation
- ⚪ **LOW**: Development/testing only

---

## 🔴 CRITICAL Variables (Production Blockers)

### App Configuration
```bash
# Environment identification
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.unioneyes.ca
NEXT_TELEMETRY_DISABLED=1
```

### Database
```bash
# PostgreSQL connection (Azure Flexible Server recommended)
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://admin:PASSWORD@unioneyes-prod.postgres.database.azure.com:5432/unioneyes?sslmode=require
DB_POOL_MAX=50  # Production: 50-100 recommended for Azure PostgreSQL
```

### Authentication (Clerk)
```bash
# Clerk production credentials
CLERK_SECRET_KEY=sk_live_YOUR_CLERK_SECRET_KEY_HERE
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_PUBLISHABLE_KEY_HERE
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Voting System Security
```bash
# Cryptographic secret for vote signing (min 32 chars, use crypto.randomBytes(32))
VOTING_SECRET=<64-character-hex-string-from-secure-random-generator>
```

### Canadian Compliance (REQUIRED)
```bash
# Provincial Privacy Laws (Quebec Law 25, BC PIPA)
PROVINCIAL_PRIVACY_ENABLED=true
QUEBEC_PRIVACY_LEVEL=strict
QUEBEC_DATA_RESIDENCY_REQUIRED=true
BC_PRIVACY_LEVEL=strict
ALBERTA_PRIVACY_LEVEL=moderate

# Indigenous Data Sovereignty (FNIGC OCAP® Principles)
INDIGENOUS_DATA_ENABLED=true
BAND_COUNCIL_CONSENT_REQUIRED=true
TRADITIONAL_KNOWLEDGE_PROTECTION=true
FNIGC_COMPLIANCE_ENABLED=true

# Strike Fund Tax Reporting (CRA T4A, Quebec RL-1)
STRIKE_FUND_TAX_REPORTING_ENABLED=true
T4A_REPORTING_ENABLED=true
T4A_THRESHOLD=500
RL1_REPORTING_ENABLED=true
TAX_YEAR_END=12-31
UNION_BN=123456789RC0001  # Format: 9-digit BN + RC + 4-digit program account

# Break Glass Emergency Access
BREAK_GLASS_ENABLED=true
BREAK_GLASS_MAX_DURATION=24
FORCE_MAJEURE_48H_COMMITMENT=true
```

---

## 🟡 HIGH Priority Variables (Major Features)

### Payments & Webhooks
```bash
# WHOP (Current Provider)
WHOP_WEBHOOK_SECRET=<webhook-secret-from-whop-dashboard>
WHOP_WEBHOOK_KEY=<webhook-key-from-whop-dashboard>
WHOP_API_KEY=<api-key-from-whop-dashboard>
WHOP_PLAN_ID_MONTHLY=plan_xxxxxxxxxxxx
WHOP_PLAN_ID_YEARLY=plan_xxxxxxxxxxxx
NEXT_PUBLIC_WHOP_REDIRECT_URL=https://app.unioneyes.ca/api/whop/callback
NEXT_PUBLIC_WHOP_PORTAL_LINK=https://whop.com/portal
ACTIVE_PAYMENT_PROVIDER=whop

# Stripe (Backup/Alternative)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
```

### Email Delivery (REQUIRED for Notifications)
```bash
# Resend (Recommended)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@unioneyes.ca
EMAIL_REPLY_TO=support@unioneyes.ca

# SendGrid (Alternative)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@unioneyes.ca
SENDGRID_FROM_NAME=Union Eyes
```

### Document Storage (AWS S3 or Cloudflare R2)
```bash
STORAGE_TYPE=r2  # Options: s3, r2, azure, disk

# Cloudflare R2 (Recommended for cost)
CLOUDFLARE_R2_BUCKET=unioneyes-documents-prod
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
CLOUDFLARE_ACCESS_KEY_ID=<r2-access-key-id>
CLOUDFLARE_SECRET_ACCESS_KEY=<r2-secret-key>

# OR AWS S3
# AWS_REGION=ca-central-1
# AWS_SIGNATURES_BUCKET=unioneyes-documents-prod
# AWS_ACCESS_KEY_ID=<aws-access-key>
# AWS_SECRET_ACCESS_KEY=<aws-secret-key>

# OR Azure Blob Storage
# AZURE_STORAGE_ACCOUNT_NAME=unioneyesstorage
# AZURE_STORAGE_ACCOUNT_KEY=<azure-storage-key>
# AZURE_STORAGE_CONTAINER=documents
```

### Document Signing (DocuSign Required)
```bash
DOCUSIGN_INTEGRATION_KEY=<integration-key-from-docusign>
DOCUSIGN_SECRET_KEY=<secret-key-from-docusign>
DOCUSIGN_API_ACCOUNT_ID=<docusign-account-id>
DOCUSIGN_USER_ID=<docusign-user-guid>
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n<key-content>\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_BASE_URL=https://na3.docusign.net  # Production URL (check your region)
```

### Redis Cache (Upstash for Production)
```bash
# Required for rate limiting and session management
UPSTASH_REDIS_REST_URL=https://xxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=<upstash-redis-token>
```

### Scheduled Jobs Security
```bash
# CRON job authentication (min 32 chars)
CRON_SECRET=<64-character-hex-string-from-secure-random-generator>
```

### Monitoring & Error Tracking (REQUIRED)
```bash
# Sentry (Error Tracking)
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/7654321
SENTRY_ORG=union-eyes
SENTRY_PROJECT=union-eyes-app
SENTRY_ENVIRONMENT=production

# OpenTelemetry (Distributed Tracing)
OTEL_ENABLED=true
OTEL_SERVICE_NAME=union-eyes-prod
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<honeycomb-api-key>
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces in production
OTEL_LOG_LEVEL=error
```

### AI Features (OpenAI Required)
```bash
# AI Provider Keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional
GOOGLE_AI_API_KEY=<google-ai-key>  # Optional

# AI Configuration
AI_CHATBOT_DEFAULT_PROVIDER=openai
AI_CHATBOT_DEFAULT_MODEL=gpt-4
AI_CHATBOT_TEMPERATURE=0.7
CHATBOT_RAG_ENABLED=true
CONTENT_SAFETY_ENABLED=true

# LLM Observability (Langfuse)
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_ENABLED=true
```

### Azure Services (Optional but Recommended)
```bash
# Azure Key Vault (Secrets Management)
AZURE_TENANT_ID=<azure-tenant-id>
AZURE_CLIENT_ID=<azure-client-id>
AZURE_CLIENT_SECRET=<azure-client-secret>
AZURE_KEY_VAULT_NAME=unioneyes-prod-kv
AZURE_KEY_VAULT_SECRET_NAME=app-secrets

# Azure AI Services (Optional)
AZURE_SPEECH_KEY=<azure-speech-key>
AZURE_SPEECH_REGION=canadacentral
AZURE_OPENAI_ENDPOINT=https://unioneyes.openai.azure.com/
AZURE_OPENAI_KEY=<azure-openai-key>
AZURE_COMPUTER_VISION_KEY=<azure-cv-key>
AZURE_COMPUTER_VISION_ENDPOINT=https://canadacentral.api.cognitive.microsoft.com/
```

---

## 🟢 MEDIUM Priority Variables (Enhanced Features)

### SMS Notifications (Twilio)
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567  # E.164 format
```

### Calendar Sync (Microsoft Graph)
```bash
GRAPH_API_ENDPOINT=https://graph.microsoft.com
GRAPH_API_CLIENT_ID=<azure-app-client-id>
GRAPH_API_CLIENT_SECRET=<azure-app-client-secret>
GRAPH_API_TENANT_ID=<azure-tenant-id>
```

### Firebase (Push Notifications)
```bash
FIREBASE_PROJECT_ID=unioneyes-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n<key>\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@unioneyes-prod.iam.gserviceaccount.com
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"unioneyes-prod",...}'
```

### Vercel Blob Storage (Alternative to S3/R2)
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxx
```

### Swiss Cold Storage (Force Majeure Backup)
```bash
SWISS_COLD_STORAGE_ENABLED=true
SWISS_COLD_STORAGE_BUCKET=unioneyes-force-majeure
SWISS_COLD_STORAGE_REGION=ch-gva-2
SWISS_COLD_STORAGE_ACCESS_KEY_ID=<access-key>
SWISS_COLD_STORAGE_SECRET_KEY=<secret-key>
```

### Feature Flags
```bash
# Geographic Privacy
GEOFENCE_PRIVACY_ENABLED=true
LOCATION_TRACKING_ENABLED=false  # Disabled by default for privacy
LOCATION_TRACKING_CONSENT_REQUIRED=true

# Currency Enforcement
CURRENCY_ENFORCEMENT_ENABLED=true
DEFAULT_CURRENCY=CAD

# GDPR Compliance
NEXT_PUBLIC_GDPR_ENABLED=true
NEXT_PUBLIC_COOKIE_POLICY_URL=/cookie-policy
NEXT_PUBLIC_PRIVACY_POLICY_URL=/privacy-policy
GDPR_DPO_EMAIL=dpo@unioneyes.ca
GDPR_DPO_NAME=Data Protection Officer

# Address Validation
GOOGLE_MAPS_API_KEY=<google-maps-api-key>
ADDRESS_VALIDATION_ENABLED=true

# Optional Features
REWARDS_ENABLED=false
SHOPIFY_ENABLED=false
```

### Accessibility Testing
```bash
ACCESSIBILITY_AXE_ENABLED=true
ACCESSIBILITY_LIGHTHOUSE_ENABLED=true
ACCESSIBILITY_MIN_SCORE=80
```

### Supabase (Alternative/Backup Auth)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
```

---

## ⚪ LOW Priority Variables (Development/Testing)

### Testing
```bash
TEST_ORGANIZATION_ID=<uuid>
TEST_COURSE_ID=<uuid>
TEST_MEMBER_ID=<uuid>
SKIP_DB_STARTUP_CHECK=false
```

### Reports Configuration
```bash
REPORTS_DIR=/var/app/reports
TEMP_DIR=/var/app/temp
ORGANIZATION_NAME=Union Eyes
```

---

## 📋 Production Deployment Checklist

### Pre-Deployment

- [ ] **All CRITICAL variables configured** (🔴 section)
- [ ] **Payment provider credentials verified** (WHOP or Stripe)
- [ ] **Email delivery tested** (Resend or SendGrid)
- [ ] **Document storage bucket created** (R2/S3/Azure)
- [ ] **DocuSign production keys obtained**
- [ ] **Redis cache configured** (Upstash)
- [ ] **Sentry project created** and DSN obtained
- [ ] **OpenTelemetry tracing configured** (Honeycomb)
- [ ] **Database connection pool set to 50+** (`DB_POOL_MAX=50`)
- [ ] **All secrets generated with crypto.randomBytes(32)**
- [ ] **Canadian compliance flags verified** (Quebec Law 25, FNIGC)
- [ ] **CRA Business Number configured** (`UNION_BN`)

### Security Checklist

- [ ] **No .env files committed to Git** (verify with `git ls-files .env*`)
- [ ] **All secrets stored in Azure Key Vault** (recommended)
- [ ] **Environment variables encrypted in CI/CD**
- [ ] **Clerk production domain configured**
- [ ] **CORS headers configured** for production domain
- [ ] **Webhook secrets rotated** (if using existing keys)
- [ ] **Database user has minimal privileges** (no superuser)
- [ ] **Redis secured with strong password**
- [ ] **S3/R2 bucket policies restrict public access**
- [ ] **Sentry rate limiting configured** (prevent quota exhaustion)
- [ ] **OpenTelemetry sampling configured** (10% in production)

### Post-Deployment Validation

- [ ] **Run health check:** `curl https://app.unioneyes.ca/api/health`
- [ ] **Check Sentry for errors:** https://sentry.io
- [ ] **Verify traces in Honeycomb:** https://ui.honeycomb.io
- [ ] **Test email delivery** (send test notification)
- [ ] **Test payment flow** (WHOP subscription)
- [ ] **Test document upload** (verify S3/R2 access)
- [ ] **Verify database connections:** Check connection pool in Prometheus
- [ ] **Test break-glass access** (emergency override)
- [ ] **Verify Canadian compliance logs** (Quebec, Indigenous data)

---

## 🔒 Secret Generation Commands

Use these commands to generate cryptographically secure secrets:

```bash
# VOTING_SECRET (64-char hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# CRON_SECRET (64-char hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# NEXTAUTH_SECRET (Base64, 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate UUID for test IDs
node -e "console.log(require('crypto').randomUUID())"
```

---

## 📊 Environment Variable Count by Category

| Category | Required | Optional | Total |
|----------|----------|----------|-------|
| App Configuration | 3 | 3 | 6 |
| Database | 2 | 1 | 3 |
| Authentication | 2 | 5 | 7 |
| Canadian Compliance | 15 | 0 | 15 |
| Payments | 2 | 9 | 11 |
| Email/SMS | 1 | 7 | 8 |
| Storage | 1 | 11 | 12 |
| Document Signing | 0 | 7 | 7 |
| Redis/Cache | 2 | 3 | 5 |
| Monitoring | 4 | 6 | 10 |
| AI Features | 1 | 10 | 11 |
| Azure Services | 0 | 13 | 13 |
| Feature Flags | 0 | 15 | 15 |
| **TOTAL** | **33** | **90** | **123** |

---

## 🚨 Common Pitfalls

### 1. Database Connection Pool Too Small
**Symptom**: `Error: Connection pool exhausted`  
**Fix**: Set `DB_POOL_MAX=50` (or higher for production)

### 2. Missing Email Configuration
**Symptom**: Notifications not sending  
**Fix**: Configure `RESEND_API_KEY` and `EMAIL_FROM`

### 3. Webhook Verification Failing
**Symptom**: `401 Unauthorized` on webhook endpoints  
**Fix**: Verify `WHOP_WEBHOOK_SECRET` matches Whop dashboard

### 4. OpenTelemetry Performance Impact
**Symptom**: Increased latency  
**Fix**: Reduce sampling: `OTEL_TRACES_SAMPLER_ARG=0.1` (10%)

### 5. Canadian Compliance Not Enforced
**Symptom**: Quebec data residency violations  
**Fix**: Ensure `QUEBEC_DATA_RESIDENCY_REQUIRED=true`

### 6. Indigenous Data Consent Bypass
**Symptom**: FNIGC OCAP® violations  
**Fix**: Verify `BAND_COUNCIL_CONSENT_REQUIRED=true`

### 7. Missing CRA Business Number
**Symptom**: Tax reporting failures  
**Fix**: Configure `UNION_BN=123456789RC0001` (format: 9-digit + RC + 4-digit)

---

## 📞 Support Contacts

- **Azure Support**: https://portal.azure.com
- **Clerk Support**: https://dashboard.clerk.com/support
- **Sentry Issues**: https://sentry.io/support
- **Honeycomb Help**: https://docs.honeycomb.io
- **WHOP Support**: https://whop.com/support
- **CRA Business Number**: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/registering-your-business/business-number-registration.html

---

## 📚 Related Documentation

- [Environment Validation Schema](../lib/config/env-validation.ts)
- [OpenTelemetry Setup Guide](./OPENTELEMETRY_QUICK_START.md)
- [Database Configuration](./DATABASE_CONFIGURATION.md)
- [Security Best Practices](../security/README.md)
- [Canadian Compliance Guide](../compliance/CANADIAN_COMPLIANCE.md)

---

**Last Reviewed**: February 14, 2026  
**Next Review**: March 14, 2026 (Monthly)
