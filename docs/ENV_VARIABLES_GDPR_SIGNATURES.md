# Environment Variables for GDPR & E-Signatures

## Required Variables

```bash
# Add these to your .env.local file

# ==============================================
# GDPR COMPLIANCE
# ==============================================

# Enable/disable GDPR features
NEXT_PUBLIC_GDPR_ENABLED=true

# Cookie consent banner settings
NEXT_PUBLIC_COOKIE_POLICY_URL=/cookie-policy
NEXT_PUBLIC_PRIVACY_POLICY_URL=/privacy-policy

# Data Protection Officer contact
GDPR_DPO_EMAIL=dpo@yourunion.com
GDPR_DPO_NAME="Data Protection Officer"

# ==============================================
# E-SIGNATURE: DocuSign
# ==============================================

# DocuSign Integration Key (from DocuSign Developer Account)
DOCUSIGN_API_KEY=your_integration_key_here

# DocuSign Account ID (from Admin > API and Keys)
DOCUSIGN_ACCOUNT_ID=your_account_id_here

# Environment: 'sandbox' or 'production'
DOCUSIGN_ENVIRONMENT=sandbox

# Webhook secret for verifying DocuSign callbacks
DOCUSIGN_WEBHOOK_SECRET=your_webhook_secret_here

# OAuth settings (if using JWT)
DOCUSIGN_USER_ID=your_user_id
DOCUSIGN_PRIVATE_KEY_PATH=/path/to/private.key

# ==============================================
# E-SIGNATURE: HelloSign (Dropbox Sign)
# ==============================================

# HelloSign API Key (from Account Settings > API)
HELLOSIGN_API_KEY=your_api_key_here

# HelloSign Client ID (for OAuth)
HELLOSIGN_CLIENT_ID=your_client_id_here

# ==============================================
# E-SIGNATURE: Adobe Sign (Optional)
# ==============================================

# Adobe Sign Integration Key
ADOBE_SIGN_API_KEY=your_api_key_here
ADOBE_SIGN_BASE_URI=https://api.na1.adobesign.com/api/rest/v6

# ==============================================
# STORAGE (for signed documents)
# ==============================================

# AWS S3 (recommended for production)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_SIGNATURES_BUCKET=union-eyes-signatures

# OR Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET=union-eyes-signatures
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# OR Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER=signatures

# ==============================================
# WEBHOOKS
# ==============================================

# Your webhook URLs (configure in provider dashboards)
# DocuSign: https://yourdomain.com/api/signatures/webhooks/docusign
# HelloSign: https://yourdomain.com/api/signatures/webhooks/hellosign

# Base URL for webhook callbacks
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# ==============================================
# SECURITY
# ==============================================

# Secret for signing internal tokens
SIGNATURE_TOKEN_SECRET=your_random_secret_here

# Maximum file upload size (bytes)
MAX_DOCUMENT_SIZE_BYTES=10485760  # 10MB

# Allowed file types
ALLOWED_DOCUMENT_TYPES=pdf,doc,docx

# ==============================================
# RATE LIMITING (optional)
# ==============================================

# Max signature requests per user per day
SIGNATURE_RATE_LIMIT_DAILY=100

# Max data export requests per user per month
GDPR_EXPORT_RATE_LIMIT_MONTHLY=5
```

---

## Development vs Production

### Development (`.env.local`)
```bash
DOCUSIGN_ENVIRONMENT=sandbox
HELLOSIGN_API_KEY=test_key_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Production (Vercel/Platform)
```bash
DOCUSIGN_ENVIRONMENT=production
HELLOSIGN_API_KEY=live_key_here
NEXT_PUBLIC_BASE_URL=https://yourunion.com
```

---

## Getting API Keys

### DocuSign
1. Create account at https://developers.docusign.com/
2. Go to Apps & Keys
3. Create new Integration Key
4. Note down:
   - Integration Key → `DOCUSIGN_API_KEY`
   - Account ID → `DOCUSIGN_ACCOUNT_ID`
5. Generate RSA keypair for JWT
6. Configure webhook URL in Connect settings

### HelloSign
1. Create account at https://www.hellosign.com/
2. Go to Settings > API
3. Create API key → `HELLOSIGN_API_KEY`
4. Configure webhook URL in API settings

### Adobe Sign
1. Create account at https://acrobat.adobe.com/us/en/sign.html
2. Go to Account > Adobe Sign API
3. Create Integration Key → `ADOBE_SIGN_API_KEY`
4. Note your API access point (e.g., api.na1.adobesign.com)

---

## Storage Configuration

### AWS S3 (Recommended)
```bash
# Create bucket: union-eyes-signatures
# Enable encryption at rest
# Configure CORS for uploads
# Set lifecycle policy: delete after 7 years
```

### Cloudflare R2 (Cost-effective)
```bash
# Create R2 bucket
# Generate API tokens
# No egress fees!
```

---

## Testing

### Test API Keys

```bash
# Test DocuSign connection
curl -X GET "https://demo.docusign.net/restapi/v2.1/accounts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test HelloSign connection
curl -X GET "https://api.hellosign.com/v3/account" \
  -u "YOUR_API_KEY:"
```

### Test Webhooks

Use ngrok for local testing:
```bash
ngrok http 3000
# Use HTTPS URL as webhook endpoint
```

---

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Rotate API keys** every 90 days
3. **Use separate keys** for dev/staging/production
4. **Enable webhook signature verification**
5. **Store documents encrypted** at rest
6. **Delete expired documents** automatically
7. **Audit API key usage** monthly

---

## Vercel Deployment

Add environment variables in Vercel Dashboard:
1. Go to Project Settings
2. Navigate to Environment Variables
3. Add all variables from above
4. Separate values for Production/Preview/Development

---

## Support

Missing an API key? Check:
- DocuSign: https://developers.docusign.com/
- HelloSign: https://www.hellosign.com/api
- Adobe Sign: https://www.adobe.io/apis/documentcloud/sign.html
