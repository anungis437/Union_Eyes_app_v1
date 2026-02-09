# Migration Guide: GDPR & E-Signatures

## Database Migration

Run these commands to create the new tables:

```bash
# Generate migration
pnpm drizzle-kit generate

# Review migration in drizzle/migrations/

# Apply migration
pnpm drizzle-kit push
```

## Manual Migration SQL (if needed)

The following tables will be created:

### GDPR Tables

- `user_consents` - User consent records
- `cookie_consents` - Cookie preferences
- `gdpr_data_requests` - Data access/erasure requests
- `data_processing_records` - Article 30 compliance
- `data_retention_policies` - Automated data lifecycle
- `data_anonymization_log` - Audit of anonymization

### E-Signature Tables

- `signature_documents` - Document records
- `document_signers` - Signer information
- `signature_audit_trail` - Complete event log
- `signature_templates` - Reusable templates
- `signature_webhooks_log` - Provider webhooks

## Post-Migration Steps

### 1. Verify Tables Created

```sql
-- Check GDPR tables
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%consent%' OR table_name LIKE '%gdpr%';

-- Check signature tables
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%signature%';
```

### 2. Create Initial Data Processing Records

```sql
-- Example: Add processing record for member data
INSERT INTO data_processing_records (
  tenant_id,
  activity_name,
  processing_purpose,
  legal_basis,
  data_categories,
  data_subjects,
  retention_period,
  security_measures,
  last_reviewed,
  next_review_due
) VALUES (
  'your-tenant-id',
  'Member Profile Management',
  'service_delivery',
  'Contract performance - Membership agreement',
  '["name", "email", "phone", "address", "membership_number"]',
  '["union_members", "prospective_members"]',
  '7 years after membership ends',
  '["encryption_at_rest", "encryption_in_transit", "access_control", "audit_logging"]',
  NOW(),
  NOW() + INTERVAL '1 year'
);
```

### 3. Create Default Retention Policies

```sql
-- Example: Delete inactive members after 7 years
INSERT INTO data_retention_policies (
  tenant_id,
  policy_name,
  data_type,
  retention_period_days,
  action_on_expiry,
  is_active,
  legal_requirement,
  next_execution
) VALUES (
  'your-tenant-id',
  'Inactive Member Data Retention',
  'profiles',
  '2555', -- 7 years
  'anonymize',
  true,
  'Canadian labor law requires 7-year retention minimum',
  NOW() + INTERVAL '1 day'
);
```

### 4. Test Cookie Consent

1. Clear browser cookies
2. Visit your app
3. Cookie banner should appear
4. Accept/customize cookies
5. Check `cookie_consents` table:

```sql
SELECT * FROM cookie_consents 
WHERE tenant_id = 'your-tenant-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 5. Test Data Export

1. Make API request:

```bash
curl -X POST http://localhost:3000/api/gdpr/data-export \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "preferredFormat": "json"
  }'
```

1. Check request created:

```sql
SELECT * FROM gdpr_data_requests 
WHERE request_type = 'access' 
ORDER BY requested_at DESC;
```

### 6. Test E-Signature Request

1. Upload a test PDF
2. Add signers
3. Submit request
4. Check tables:

```sql
-- Check document created
SELECT * FROM signature_documents 
ORDER BY created_at DESC LIMIT 5;

-- Check signers
SELECT * FROM document_signers 
WHERE document_id = 'doc-id';

-- Check audit trail
SELECT * FROM signature_audit_trail 
WHERE document_id = 'doc-id' 
ORDER BY timestamp;
```

## Rollback (if needed)

```sql
-- GDPR tables
DROP TABLE IF EXISTS data_anonymization_log;
DROP TABLE IF EXISTS data_retention_policies;
DROP TABLE IF EXISTS data_processing_records;
DROP TABLE IF EXISTS gdpr_data_requests;
DROP TABLE IF EXISTS cookie_consents;
DROP TABLE IF EXISTS user_consents;

-- E-Signature tables
DROP TABLE IF EXISTS signature_webhooks_log;
DROP TABLE IF EXISTS signature_templates;
DROP TABLE IF EXISTS signature_audit_trail;
DROP TABLE IF EXISTS document_signers;
DROP TABLE IF EXISTS signature_documents;

-- Drop enums
DROP TYPE IF EXISTS consent_type;
DROP TYPE IF EXISTS consent_status;
DROP TYPE IF EXISTS processing_purpose;
DROP TYPE IF EXISTS gdpr_request_type;
DROP TYPE IF EXISTS gdpr_request_status;
DROP TYPE IF EXISTS signature_provider;
DROP TYPE IF EXISTS signature_document_status;
DROP TYPE IF EXISTS signer_status;
DROP TYPE IF EXISTS signature_type;
DROP TYPE IF EXISTS authentication_method;
```

## Data Migration (Existing Users)

If you have existing users, create initial consent records:

```sql
-- Create implied consent for existing users
INSERT INTO user_consents (
  user_id,
  tenant_id,
  consent_type,
  status,
  legal_basis,
  processing_purpose,
  consent_version,
  consent_text,
  granted_at
)
SELECT 
  user_id,
  tenant_id,
  'essential',
  'granted',
  'Contract performance',
  'service_delivery',
  '1.0.0',
  'Implied consent for existing members based on membership agreement',
  created_at
FROM profiles
WHERE created_at < NOW();
```

## Monitoring

### Set up cron jobs for

1. **Expired consent cleanup** (daily)

```bash
0 2 * * * curl -X POST http://localhost:3000/api/gdpr/cleanup-expired
```

1. **Pending GDPR request alerts** (daily)

```bash
0 9 * * * curl -X GET http://localhost:3000/api/gdpr/pending-requests-alert
```

1. **Document expiration reminders** (daily)

```bash
0 10 * * * curl -X POST http://localhost:3000/api/signatures/check-expirations
```

## Troubleshooting

### Issue: Cookie banner not appearing

- Check `NEXT_PUBLIC_GDPR_ENABLED=true` in `.env.local`
- Clear localStorage: `localStorage.removeItem('cookie_consent')`
- Check browser console for errors

### Issue: Data export fails

- Check all related tables exist (profiles, claims, votes, etc.)
- Verify database connection
- Check logs for specific errors

### Issue: Signature request fails

- Verify environment variables set
- Check provider credentials
- Test provider connection separately
- Review webhook logs in `signature_webhooks_log`

## Performance Optimization

### Add indexes for common queries

```sql
-- GDPR indexes
CREATE INDEX IF NOT EXISTS idx_user_consents_lookup 
ON user_consents(user_id, tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_pending 
ON gdpr_data_requests(status, deadline) 
WHERE status = 'pending';

-- Signature indexes
CREATE INDEX IF NOT EXISTS idx_signatures_user_tenant 
ON signature_documents(sent_by, tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_signers_pending 
ON document_signers(email, status) 
WHERE status IN ('pending', 'sent');
```

## Support

For migration issues:

1. Check [`docs/gdpr-and-signatures.md`](gdpr-and-signatures.md)
2. Review database logs
3. Test API endpoints individually
4. Contact development team

---

**Migration Version:** 1.0  
**Compatible with:** Union Eyes v2.0+  
**Last Updated:** February 6, 2026
