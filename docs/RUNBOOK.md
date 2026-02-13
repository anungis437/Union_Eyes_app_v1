# Union Eyes - Operations Runbook

## Table of Contents

1. [Getting Started](#getting-started)
2. [Common Operations](#common-operations)
3. [Troubleshooting](#troubleshooting)
4. [Emergency Procedures](#emergency-procedures)
5. [Maintenance](#maintenance)

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+
- Clerk account for auth

### Environment Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

---

## Common Operations

### 1. Deploy to Production

```bash
# Build the application
npm run build

# Run database migrations
npm run db:migrate:prod

# Deploy to Vercel
vercel --prod
```

### 2. Rollback Deployment

```bash
# List recent deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### 3. Database Operations

```bash
# Generate migration
npm run db:generate migration_name

# Run migrations
npm run db:migrate

# Reset database (dev only!)
npm run db:reset
```

### 4. Clear Cache

```bash
# Redis cache
redis-cli FLUSHALL

# Application cache
curl -X POST /api/admin/cache/clear
```

---

## Troubleshooting

### High CPU Usage

1. Check running processes:
   ```bash
   top -c
   ```

2. Identify slow queries:
   ```sql
   SELECT * FROM pg_stat_activity 
   WHERE state = 'active' 
   ORDER BY query_start DESC;
   ```

3. Restart affected services:
   ```bash
   npm run restart:workers
   ```

### Database Connection Issues

1. Verify database is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check connection string in `.env.local`

3. Test connection:
   ```bash
   npx tsx -e "import { db } from './lib/db'; db.execute('SELECT 1')"
   ```

### Authentication Errors

1. Verify Clerk keys:
   ```bash
   echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   ```

2. Check Clerk dashboard for API key status

3. Clear session cookies and retry

### API Rate Limiting

1. Check current rate limits:
   ```bash
   curl /api/admin/rate-limits
   ```

2. Whitelist IP if needed:
   ```bash
   curl -X POST /api/admin/rate-limits/whitelist \
     -d '{"ip": "1.2.3.4"}'
   ```

---

## Emergency Procedures

### Database Outage

1. **Immediate Actions:**
   - Check database server status
   - Verify connection string
   - Check for locks

2. **Communication:**
   - Notify team via Slack #incidents
   - Update status page

3. **Recovery:**
   ```bash
   # Attempt reconnection
   npm run db:reconnect
   
   # If needed, promote replica
   npm run db:promote-replica
   ```

### Service Down

1. **Immediate Actions:**
   ```bash
   # Check service health
   curl https://unioneyes.app/api/health
   
   # Check logs
   npm run logs:service -- --follow
   ```

2. **Rollback if needed:**
   ```bash
   vercel rollback
   ```

3. **Contact:**
   - On-call: PagerDuty
   - Escalation: CTO

### Data Breach

1. **Immediate Actions:**
   - Disable affected accounts
   - Preserve logs
   - Notify security team

2. **Communication:**
   - Legal notification requirements
   - Customer communication plan

3. **Recovery:**
   - Audit affected data
   - Implement fixes
   - Report to authorities if required

---

## Maintenance

### Scheduled Maintenance Window

**Every Sunday 2:00 AM - 4:00 AM UTC**

1. Notify users 48 hours in advance
2. Put app in maintenance mode:
   ```bash
   npm run maintenance:enable
   ```

3. Run migrations
4. Deploy updates
5. Verify functionality
6. Disable maintenance mode:
   ```bash
   npm run maintenance:disable
   ```

### Database Backup

- **Automated:** Daily at 3:00 AM UTC
- **Retention:** 30 days
- **Location:** AWS S3 `union-eyes-backups`

Restore command:
```bash
npm run db:restore 2024-01-15
```

### Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application | 30 days | CloudWatch |
| Access Logs | 90 days | S3 |
| Audit Logs | 1 year | S3 |

---

## Monitoring

### Key Metrics

- Response time: < 200ms p95
- Error rate: < 0.1%
- Uptime: 99.9%

### Dashboards

- **Production:** https://unioneyes.app/api/admin/metrics
- **Datadog:** https://app.datadoghq.com/dashboard/union-eyes
- **PagerDuty:** https://unioneyes.pagerduty.com

### Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| High Error Rate | > 1% | Page on-call |
| Slow Response | > 500ms | Create ticket |
| Disk Usage | > 80% | Create ticket |
| Failed Jobs | > 10 | Page on-call |

---

## Contact Information

- **On-call:** PagerDuty +1-555-0199
- **Engineering Lead:** @engineering-lead
- **Security:** security@unioneyes.app
- **Emergency:** 911 (life safety)
