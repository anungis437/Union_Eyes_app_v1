# External Data Integration - Deployment Checklist

**Date:** February 9, 2026  
**Version:** 1.0.0

---

## Pre-Deployment Checklist

### 1. Environment Variables

Verify all required environment variables are set:

```bash
# Statistics Canada API (Required for Phase 1)
STATCAN_API_KEY=your_api_key_here
STATCAN_API_URL=https://api.statcan.gc.ca

# BC LRB API (Required for Phase 2)
BC_LRB_API_KEY=your_bc_lrb_api_key

# CLC Partnership OAuth (Required for Phase 3 - after partnership)
CLC_CLIENT_ID=your_clc_client_id
CLC_CLIENT_SECRET=your_clc_client_secret
CLC_TOKEN_URL=https://api.clc.ca/oauth/token
CLC_API_URL=https://api.clc.ca/v1

# Cron Job Authentication
CRON_SECRET=your_secure_cron_secret_min_32_chars

# Database (existing)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis Cache (recommended)
REDIS_URL=redis://...
```

### 2. Database Migrations

Run migrations for new schemas:

```bash
# Generate migration
npx drizzle-kit generate

# Push schema changes
npx drizzle-kit push

# Or run migrations
npx drizzle-kit migrate
```

### 3. Required Schema Extensions

The following tables are created:

- `wage_benchmarks` - Statistics Canada wage data
- `union_density` - Union density statistics
- `cost_of_living_data` - CPI and inflation data
- `contribution_rates` - EI and CPP rates
- `external_data_sync_log` - Sync operation logs
- `lrb_agreements` - Provincial LRB agreements
- `lrb_employers` - LRB employer registry
- `lrb_unions` - LRB union registry
- `lrb_sync_log` - LRB sync history
- `clc_per_capita_benchmarks` - CLC per-capita data
- `clc_union_density` - CLC union density
- `clc_bargaining_trends` - CLC bargaining trends
- `clc_sync_log` - CLC sync history
- `clc_oauth_tokens` - OAuth tokens storage

### 4. API Access Registration

#### Statistics Canada

1. Register at: <https://www.statcan.gc.ca/eng/api>
2. Select "Labour market" data products
3. Note API key for environment variable

#### BC Labour Relations Board

1. Apply at: <https://www.lrb.bc.ca/api-registration>
2. Await approval (typically 1-2 weeks)
3. Receive API credentials

#### CLC Partnership (Future)

1. Contact: <partnerships@canadianlabour.ca>
2. Sign data processing agreement
3. Receive OAuth credentials

---

## Deployment Steps

### Step 1: Database Setup

```bash
# Connect to database
psql $DATABASE_URL

# Verify new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%benchmark%' 
OR table_name LIKE '%lrb%' 
OR table_name LIKE '%clc%';
```

### Step 2: Environment Configuration

```bash
# Copy environment template
cp .env.example .env.production

# Edit with actual values
nano .env.production

# Verify variables
grep -E "^(STATCAN|BC_LRB|CLC|CRON)" .env.production
```

### Step 3: Build Verification

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run unit tests
pnpm test -- --testPathPattern="statcan|lrb|clc"

# Build application
pnpm build
```

### Step 4: Vercel Configuration

Add cron jobs to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/external-data-sync",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/lrb-sync",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

### Step 5: Initial Data Sync

Run initial sync manually:

```bash
# Sync Statistics Canada data
curl -X POST https://your-domain.com/api/external-data \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action": "full-sync"}'

# Sync LRB agreements
curl -X POST https://your-domain.com/api/external-data/lrb \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync-all"}'
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Check sync status
curl https://your-domain.com/api/external-data?action=sync-status

# Check LRB statistics
curl https://your-domain.com/api/external-data/lrb?action=statistics
```

### 2. Verify Data

```sql
-- Check wage benchmarks
SELECT COUNT(*) FROM wage_benchmarks;
SELECT COUNT(*) FROM union_density;

-- Check LRB agreements
SELECT source, COUNT(*) FROM lrb_agreements GROUP BY source;

-- Check sync logs
SELECT source, status, records_processed 
FROM external_data_sync_log 
ORDER BY started_at DESC 
LIMIT 10;
```

### 3. Monitor Errors

```sql
-- Check for failed syncs
SELECT * FROM external_data_sync_log 
WHERE status = 'failed' 
ORDER BY started_at DESC 
LIMIT 10;
```

---

## Rollback Plan

### If Issues Occur

1. **Database Rollback:**

```bash
# Restore from backup
psql $DATABASE_URL < backup_before_deployment.sql
```

1. **Environment Revert:**

```bash
# Revert environment variables
git checkout .env.production
```

1. **Vercel Redeploy:**

```bash
# Redeploy previous version
vercel deploy --prod --prebuilt
```

---

## Monitoring & Alerts

### Recommended Alerts

1. **Sync Failures** - Alert when sync status is 'failed'
2. **Data Staleness** - Alert if no sync in 48 hours
3. **API Errors** - Alert on API endpoint errors
4. **Rate Limiting** - Alert on API rate limit warnings

### Log Locations

- Sync logs: `external_data_sync_log` table
- Application logs: `/latest-logs/` directory
- Cron execution: Vercel Function Logs

---

## Security Checklist

- [ ] API keys stored in environment variables (not in code)
- [ ] CRON_SECRET is at least 32 characters
- [ ] Database connection uses SSL
- [ ] OAuth tokens encrypted at rest
- [ ] Rate limiting configured on API routes
- [ ] Audit logging enabled for data access

---

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Sync Duration | < 5 minutes | > 10 minutes |
| API Response | < 200ms | > 500ms |
| Data Freshness | < 24 hours | > 48 hours |
| Sync Success Rate | > 99% | < 95% |

---

## Support & Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify key hasn't expired
   - Check API endpoint URLs
   - Review rate limits

2. **Sync Timing Out**
   - Reduce batch sizes
   - Increase timeout limits
   - Use pagination

3. **Missing Data**
   - Check sync logs for errors
   - Verify source APIs are operational
   - Review data validation rules

### Contact

- Statistics Canada API Support: <api@statcan.gc.ca>
- BC LRB Support: <api-support@lrb.bc.ca>
