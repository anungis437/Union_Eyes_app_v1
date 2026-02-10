# Production Runbooks - UnionEyes Platform

**Version:** 1.0.0  
**Last Updated:** February 9, 2026  
**Status:** RC-1 Ready  
**Commit:** `bcf0aee8`

---

## Table of Contents

1. [Deployment Procedures](#deployment-procedures)
2. [Rollback Procedures](#rollback-procedures)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Incident Response](#incident-response)
5. [Database Operations](#database-operations)
6. [Security Procedures](#security-procedures)
7. [Escalation Contacts](#escalation-contacts)

---

## Deployment Procedures

### Pre-Deployment Checklist

**Required Approvals:**
- [ ] Release Contract CI passing
- [ ] Security team sign-off
- [ ] Product owner approval
- [ ] Database migration reviewed (if applicable)
- [ ] Rollback plan documented

**Environment Verification:**
```bash
# Verify current version
git describe --tags

# Check release contract status
pnpm tsx scripts/generate-migration-manifest.ts
pnpm tsx scripts/scan-rls-usage-v2.ts --scope=tenant --max-violations=0

# Verify staging deployment
curl https://staging.unioneyes.app/api/health
```

---

### Production Deployment Steps

#### 1. **Pre-Deployment (15 minutes before)**

```bash
# Set maintenance mode
kubectl scale deployment unioneyes-web --replicas=0 -n production

# Backup database
pg_dump -h $PROD_DB_HOST -U $PROD_DB_USER unioneyes_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d unioneyes_prod -c "SELECT COUNT(*) FROM claims;"
```

#### 2. **Database Migration (if applicable)**

```bash
# Connect to production database
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d unioneyes_prod

# Apply migrations in transaction
BEGIN;
\i db/migrations/XXXX_new_migration.sql
COMMIT;

# Verify migration
SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;
```

#### 3. **Deploy Application**

**Blue-Green Deployment (Recommended):**

```bash
# Deploy to green environment
kubectl apply -f k8s/deployment-green.yaml -n production

# Wait for readiness
kubectl rollout status deployment/unioneyes-web-green -n production

# Run smoke tests
./scripts/smoke-tests.sh https://green.unioneyes.app

# Switch traffic (if smoke tests pass)
kubectl patch service unioneyes-web -p '{"spec":{"selector":{"version":"green"}}}' -n production

# Monitor for 10 minutes
watch kubectl get pods -n production
```

**Traditional Deployment:**

```bash
# Deploy new version
kubectl set image deployment/unioneyes-web unioneyes-web=unioneyes:$VERSION -n production

# Monitor rollout
kubectl rollout status deployment/unioneyes-web -n production

# Verify pods
kubectl get pods -n production -l app=unioneyes-web
```

#### 4. **Post-Deployment Verification (Critical)**

```bash
# Health check
curl https://api.unioneyes.app/api/health

# Verify release contract in production
pnpm tsx scripts/verify-production-deployment.ts

# Test critical user flows
pnpm tsx scripts/e2e-smoke-tests.ts --env=production

# Check error rates
kubectl logs -n production -l app=unioneyes-web --tail=100 | grep ERROR
```

#### 5. **Enable Monitoring**

- ✅ Verify Sentry error tracking
- ✅ Check Datadog/New Relic metrics
- ✅ Confirm log aggregation (CloudWatch/ELK)
- ✅ Test alert notifications (PagerDuty/Slack)

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback Triggers:**
- Error rate > 5% within 5 minutes
- Database corruption detected
- Security vulnerability exposed
- Critical feature completely broken
- User data integrity compromised

### Rollback Steps (< 5 minutes)

#### Option A: Blue-Green Rollback

```bash
# Switch traffic back to blue
kubectl patch service unioneyes-web -p '{"spec":{"selector":{"version":"blue"}}}' -n production

# Verify rollback
curl https://api.unioneyes.app/api/health
kubectl get pods -n production -l version=blue
```

#### Option B: Kubernetes Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/unioneyes-web -n production

# Monitor rollback
kubectl rollout status deployment/unioneyes-web -n production

# Verify previous version
kubectl describe deployment unioneyes-web -n production | grep Image
```

#### Option C: Database Rollback (if migration applied)

```bash
# Restore from backup
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d unioneyes_prod < backup_TIMESTAMP.sql

# Or apply down migration
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d unioneyes_prod <<EOF
BEGIN;
\i db/migrations/XXXX_rollback.sql
COMMIT;
EOF

# Verify rollback
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d unioneyes_prod -c "SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

### Post-Rollback Actions

1. **Notify stakeholders** (Slack #incidents channel)
2. **Create incident report** (docs/incidents/YYYY-MM-DD-incident.md)
3. **Schedule post-mortem** (within 24 hours)
4. **Update deployment status** (FAILED - ROLLED BACK)

---

## Monitoring and Alerting

### Key Metrics to Monitor

#### Application Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 2% | Page on-call engineer |
| Response Time (P99) | > 2000ms | Investigate performance |
| API Success Rate | < 95% | Check service health |
| Active Connections | > 1000 | Scale up pods |
| Memory Usage | > 85% | Scale up or investigate leaks |

#### Database Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Connection Pool Usage | > 80% | Scale up connections |
| Query Time (P95) | > 500ms | Investigate slow queries |
| Replication Lag | > 5 seconds | Check database health |
| Deadlocks | > 0 | Investigate transaction conflicts |
| Disk Usage | > 80% | Provision more storage |

#### Business Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Claims Submitted/hour | < 10 | Check for outage |
| Failed Logins | > 100/hour | Investigate bot attack |
| Webhook Failures | > 10% | Check external integrations |

### Alert Configuration

**PagerDuty Escalation:**
```yaml
# .pagerduty/escalation-policy.yaml
escalation_policy:
  - level: 1
    on_call: platform-team
    timeout: 5 minutes
  - level: 2
    on_call: engineering-lead
    timeout: 10 minutes
  - level: 3
    on_call: cto
```

**Slack Notifications:**
```bash
# Error spike alert
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚨 Production Error Rate: 5.2% (threshold: 2%)", "channel":"#incidents"}'
```

---

## Incident Response

### Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P0 - Critical** | Complete outage, data loss | Immediate | Database down, app unreachable |
| **P1 - High** | Major feature broken | 15 minutes | Claims submission failing |
| **P2 - Medium** | Degraded performance | 1 hour | Slow API responses |
| **P3 - Low** | Minor bug, workaround exists | Next business day | UI styling issue |

### Incident Response Workflow

#### 1. **Detection** (0-2 minutes)

- Alert received via PagerDuty/Slack
- On-call engineer acknowledges
- Create incident channel: `#incident-YYYY-MM-DD-HHmm`

#### 2. **Assessment** (2-5 minutes)

```bash
# Check application health
kubectl get pods -n production
kubectl logs -n production -l app=unioneyes-web --tail=500

# Check database
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d unioneyes_prod -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check external services
curl https://status.stripe.com
curl https://status.clerk.com
```

#### 3. **Communication** (ongoing)

**Status Page Update:**
```bash
# Update status page (e.g., status.unioneyes.app)
curl -X POST https://api.statuspage.io/v1/pages/$PAGE_ID/incidents \
  -H "Authorization: OAuth $TOKEN" \
  -d '{"incident":{"name":"Investigating Claims Submission Issues","status":"investigating"}}'
```

**Stakeholder Notification Template:**
```
🚨 Incident Alert - P1

Issue: Claims submission failing (500 errors)
Impact: Users unable to submit new claims
Status: Investigating
ETA: 15 minutes to resolution
Team: @platform-team
Updates: #incident-2026-02-09-1430
```

#### 4. **Mitigation** (5-30 minutes)

Follow appropriate runbook based on incident type:
- [Database Issues](#database-incidents)
- [Application Crashes](#application-incidents)
- [External Service Outages](#external-service-incidents)

#### 5. **Resolution** (variable)

- Verify fix in production
- Monitor metrics for 10 minutes
- Close incident
- Schedule post-mortem

#### 6. **Post-Mortem** (within 24 hours)

**Template:** `docs/incidents/YYYY-MM-DD-incident-postmortem.md`

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD
**Duration:** XX minutes
**Severity:** PX
**Responders:** [Names]

## Timeline
- HH:MM - Alert received
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
[Detailed explanation]

## Impact
- Users affected: XXX
- Revenue impact: $XXX
- SLA missed: Yes/No

## Action Items
- [ ] Fix XYZ (Owner: [@person], Due: YYYY-MM-DD)
- [ ] Add monitoring for ABC (Owner: [@person], Due: YYYY-MM-DD)
- [ ] Update runbook (Owner: [@person], Due: YYYY-MM-DD)
```

---

## Database Operations

### Common Database Incidents

#### High Connection Count

```sql
-- View active connections
SELECT datname, count(*) as connections 
FROM pg_stat_activity 
GROUP BY datname;

-- Kill idle connections (if needed)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND state_change < NOW() - INTERVAL '10 minutes';
```

#### Slow Query Investigation

```sql
-- Find slow queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
  AND now() - query_start > interval '5 seconds';

-- Explain query plan
EXPLAIN ANALYZE [query];
```

#### Replication Lag

```sql
-- Check replication lag (on replica)
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- If lag > 5 seconds, check primary
SELECT client_addr, state, sync_state 
FROM pg_stat_replication;
```

### Backup and Restore

**Daily Backup (Automated):**
```bash
# Backup script runs at 02:00 UTC
pg_dump -h $PROD_DB_HOST -U $PROD_DB_USER -F c -b -v -f /backups/unioneyes_$(date +%Y%m%d).dump unioneyes_prod

# Retention: 30 days
find /backups -name "unioneyes_*.dump" -mtime +30 -delete
```

**Point-in-Time Recovery:**
```bash
# Restore to specific timestamp
pg_restore -h $RESTORE_DB_HOST -U $RESTORE_DB_USER -d unioneyes_restore /backups/unioneyes_YYYYMMDD.dump

# Apply WAL logs to specific time
recovery_target_time = '2026-02-09 14:30:00 UTC'
```

---

## Security Procedures

### Security Incident Response

#### 1. **Data Breach Detection**

**Indicators:**
- Unusual data access patterns
- Spike in DSAR requests
- External security researcher report
- Sentry security alerts

**Immediate Actions:**
```bash
# 1. Isolate affected systems
kubectl scale deployment unioneyes-web --replicas=0 -n production

# 2. Preserve logs
kubectl logs -n production -l app=unioneyes-web > incident_logs_$(date +%Y%m%d_%H%M%S).txt

# 3. Rotate credentials
kubectl delete secret database-credentials -n production
kubectl create secret generic database-credentials --from-literal=password=$NEW_PASSWORD -n production

# 4. Notify security team
curl -X POST $SECURITY_SLACK_WEBHOOK -d '{"text":"🚨 SECURITY INCIDENT - Data breach suspected"}'
```

#### 2. **SQL Injection Attempt**

```bash
# Check for suspicious query patterns
grep -i "SELECT.*FROM.*WHERE.*OR.*1=1" /var/log/postgresql/*.log

# Block attacker IP
kubectl exec -it -n ingress nginx-ingress-controller -- \
  nginx -s reload -c /etc/nginx/nginx.conf
```

#### 3. **DDoS Attack**

```bash
# Enable rate limiting
kubectl apply -f k8s/rate-limit-strict.yaml -n production

# Scale up to absorb load
kubectl scale deployment unioneyes-web --replicas=20 -n production

# Contact CDN provider (Cloudflare)
# Enable "I'm Under Attack" mode
```

### Compliance Procedures

**GDPR Data Subject Access Request (DSAR):**
```bash
# Export user data
pnpm tsx scripts/gdpr/export-user-data.ts --userId=$USER_ID --email=$USER_EMAIL

# Verify export completeness
pnpm tsx scripts/gdpr/verify-export.ts --file=dsar_$USER_ID.json
```

**Right to Erasure:**
```bash
# Anonymize user data (irreversible)
pnpm tsx scripts/gdpr/anonymize-user.ts --userId=$USER_ID --reason="User request"

# Verify anonymization
psql -h $PROD_DB_HOST -c "SELECT * FROM organization_members WHERE userId='$USER_ID';"
# Should return: userId='ANONYMIZED-XXX', email='deleted@anonymized.local'
```

---

## Escalation Contacts

### On-Call Rotation

| Role | Primary | Backup | Phone | Slack |
|------|---------|--------|-------|-------|
| **Platform Engineer** | @engineer1 | @engineer2 | +1-XXX-XXX-XXXX | @engineer1 |
| **Database Admin** | @dba1 | @dba2 | +1-XXX-XXX-XXXX | @dba1 |
| **Security Lead** | @security1 | @security2 | +1-XXX-XXX-XXXX | @security1 |
| **Engineering Manager** | @manager1 | - | +1-XXX-XXX-XXXX | @manager1 |
| **CTO** | @cto | - | +1-XXX-XXX-XXXX | @cto |

### External Contacts

| Service | Contact | Emergency URL |
|---------|---------|---------------|
| **AWS Support** | Enterprise Support | https://console.aws.amazon.com/support |
| **Stripe** | stripe-support@stripe.com | https://support.stripe.com |
| **Clerk** | support@clerk.com | https://clerk.com/support |
| **Sentry** | support@sentry.io | https://sentry.io/support |
| **Cloudflare** | Enterprise Support | https://dash.cloudflare.com/support |

---

## Appendix: Emergency Commands

### Quick Reference

```bash
# View all pods
kubectl get pods -n production

# Restart all pods (rolling)
kubectl rollout restart deployment/unioneyes-web -n production

# Scale up immediately
kubectl scale deployment unioneyes-web --replicas=10 -n production

# View recent logs
kubectl logs -n production -l app=unioneyes-web --tail=100 -f

# Exec into pod
kubectl exec -it -n production <pod-name> -- /bin/bash

# Database connection
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d unioneyes_prod

# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('unioneyes_prod'));"

# View active queries
psql -c "SELECT pid, query_start, state, query FROM pg_stat_activity WHERE state = 'active';"
```

---

**Document Owner:** Platform Engineering Team  
**Review Frequency:** Monthly  
**Last Review:** February 9, 2026  
**Next Review:** March 9, 2026
