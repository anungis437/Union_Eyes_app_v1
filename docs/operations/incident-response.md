# Incident Response Runbook

**Version:** 2.0  
**Last Updated:** February 12, 2026  
**Owner:** DevOps Team  
**Review Frequency:** Quarterly

---

## Purpose

This runbook provides comprehensive procedures for detecting, triaging, responding to, and resolving production incidents in the Union Eyes platform. Designed for 3 AM on-call scenarios.

---

## Table of Contents

1. [Incident Severity Classification](#incident-severity-classification)
2. [Response Team Roles](#response-team-roles)
3. [Detection and Alerting](#detection-and-alerting)
4. [Initial Response Procedures](#initial-response-procedures)
5. [Triage Procedures](#triage-procedures)
6. [Communication Templates](#communication-templates)
7. [Incident Response Playbooks](#incident-response-playbooks)
8. [Post-Incident Review](#post-incident-review)

---

## Incident Severity Classification

### SEV-1: CRITICAL 🔴
**Definition:** Complete service outage affecting all users or critical data loss

**Response Time:** Immediate (< 15 minutes)  
**Communication:** Hourly updates  
**Escalation:** Immediate to all on-call engineers and management

**Examples:**
- Application completely down (all environments)
- Database corruption or complete failure
- Security breach or data leak
- Payment processing down
- Multi-region failure

**Actions:**
- Page entire on-call team immediately
- Create war room (Teams/Slack emergency channel)
- Notify stakeholders within 15 minutes
- Activate incident commander

---

### SEV-2: HIGH 🟠
**Definition:** Significant service degradation affecting multiple users or critical features

**Response Time:** < 30 minutes  
**Communication:** Updates every 2 hours  
**Escalation:** On-call engineer + backup

**Examples:**
- Single region/environment down
- Major feature unavailable (auth, claims processing)
- Performance degradation (>50% slower)
- Intermittent 500 errors (>5% error rate)
- Database replication lag > 5 minutes

**Actions:**
- Page primary on-call engineer
- Notify backup engineer
- Create incident channel
- Begin investigation

---

### SEV-3: MEDIUM 🟡
**Definition:** Partial degradation affecting subset of users or non-critical features

**Response Time:** < 2 hours  
**Communication:** Daily updates  
**Escalation:** On-call engineer

**Examples:**
- Single API endpoint failing
- Slow queries (2-5s response time)
- Non-critical feature broken (reporting, exports)
- Elevated error rates (1-5%)
- High resource utilization (>80% CPU/memory)

**Actions:**
- On-call engineer investigates
- Document findings
- Create ticket for tracking

---

### SEV-4: LOW 🟢
**Definition:** Minor issues with workarounds, or cosmetic problems

**Response Time:** < 1 business day  
**Communication:** As needed  
**Escalation:** None required

**Examples:**
- UI/UX bugs
- Non-critical alerts
- Documentation issues
- Monitoring gaps

**Actions:**
- Create ticket
- Schedule for next sprint

---

## Response Team Roles

### 🚨 Incident Commander (IC)
**Responsibility:** Overall incident coordination and decision-making

**Duties:**
- Declare incident severity
- Coordinate response team
- Make rollback/escalation decisions
- Communicate with stakeholders
- Drive post-incident review

**Who:** Senior engineer or on-call lead

---

### 🔧 Technical Lead
**Responsibility:** Technical investigation and remediation

**Duties:**
- Diagnose root cause
- Implement fixes or workarounds
- Coordinate with other engineers
- Document technical findings
- Execute rollback if needed

**Who:** Primary on-call engineer

---

### 📢 Communications Lead
**Responsibility:** Internal and external communications

**Duties:**
- Post status updates
- Notify stakeholders
- Update status page
- Coordinate with customer support
- Document incident timeline

**Who:** Designated team member (can be IC for smaller incidents)

---

### 📊 Observer/Scribe
**Responsibility:** Documentation and timeline tracking

**Duties:**
- Document all actions taken
- Track timeline with timestamps
- Log decisions made
- Collect metrics during incident
- Prepare initial PIR draft

**Who:** Available team member

---

## Detection and Alerting

### Existing Monitoring Stack

Our monitoring infrastructure (reference: [`docker-compose.observability.yml`](../../docker-compose.observability.yml)):

```yaml
Stack Components:
- Prometheus: http://localhost:9090 (Metrics collection)
- Grafana: http://localhost:3001 (Dashboards)
- Loki: Centralized logging
- AlertManager: Alert routing and grouping
```

### Alert Channels

**Primary Channels:**
1. **PagerDuty/OnCall System** - SEV-1, SEV-2 alerts
2. **Slack #incidents** - All severity levels
3. **Email** - SEV-3, SEV-4 (non-urgent)
4. **SMS** - SEV-1 only

### Prometheus Alert Rules

Reference: [`monitoring/prometheus/alerts.yml`](../../monitoring/prometheus/alerts.yml)

**Critical Alerts (Immediate Response Required):**

| Alert Name | Condition | Severity | Response |
|------------|-----------|----------|----------|
| `APIEndpointDown` | API unreachable for 2+ min | SEV-1 | [Application Down Playbook](#playbook-1-application-down) |
| `DatabaseDown` | PostgreSQL unreachable for 1+ min | SEV-1 | [Database Failure Playbook](#playbook-2-database-failure) |
| `HighErrorRate` | >5% 5xx errors for 5+ min | SEV-2 | [High Error Rate Playbook](#playbook-3-high-error-rate) |
| `DatabaseConnectionPoolExhausted` | >90% connections used | SEV-2 | [Database Connection Playbook](#playbook-4-database-connection-pool) |

**Warning Alerts (Investigate Within 30 min):**

| Alert Name | Condition | Severity | Response |
|------------|-----------|----------|----------|
| `SlowResponseTime` | P95 > 2s for 10+ min | SEV-3 | Check query performance |
| `HighCPUUsage` | >80% CPU for 10+ min | SEV-3 | Scale or investigate |
| `HighMemoryUsage` | >85% memory for 10+ min | SEV-3 | Check for memory leaks |
| `DiskSpaceLow` | <15% free space | SEV-3 | Clean up or expand |
| `DatabaseReplicationLag` | >30s lag for 5+ min | SEV-3 | Check replication |

### Accessing Monitoring Tools

```bash
# View current alerts
curl http://localhost:9090/api/v1/alerts

# Check Prometheus targets health
curl http://localhost:9090/api/v1/targets

# Grafana dashboards
open http://localhost:3001
# Login: admin (check vault for password)

# View application logs (last 1 hour)
docker logs --since 1h unioneyes-app-prod

# View database logs
docker logs --since 1h unioneyes-postgres
```

---

## Initial Response Procedures

### Step 1: Alert Received (0-5 minutes)

```bash
# 1. ACKNOWLEDGE THE ALERT
# Acknowledge in PagerDuty/OnCall system to stop paging

# 2. VERIFY THE INCIDENT
# Check if it's a real incident (not false positive)

# Quick health checks:
curl https://unioneyes.azurewebsites.net/api/health
curl https://unioneyes.azurewebsites.net/api/health/db

# Check Grafana dashboard:
open http://localhost:3001/d/main-dashboard

# 3. CHECK STATUS
# Is the service actually down or degraded?
# How many users affected?
# What environment? (production/staging/both)
```

### Step 2: Assess Severity (5-10 minutes)

Use the [Severity Classification](#incident-severity-classification) matrix above.

**Decision Tree:**
```
┌─────────────────────────────────────┐
│ All users unable to access service? │
└──────────┬──────────────┬───────────┘
           │ YES          │ NO
           ↓              ↓
        SEV-1      ┌─────────────────────┐
                   │ >50% users affected? │
                   └──────┬──────┬───────┘
                          │ YES  │ NO
                          ↓      ↓
                       SEV-2   SEV-3/4
```

### Step 3: Escalate (10-15 minutes)

**SEV-1 Escalation:**
```bash
# 1. Page entire on-call team
# Use PagerDuty escalation policy

# 2. Create incident war room
# Slack: /incident create sev1 "Brief description"
# Teams: Create emergency meeting

# 3. Notify stakeholders
subject: "[SEV-1] Production Incident - [Brief Title]"
```

**SEV-2 Escalation:**
```bash
# 1. Page backup on-call engineer
# 2. Create incident channel
# Slack: /incident create sev2 "Brief description"
# 3. Notify team leads
```

### Step 4: Begin Investigation (15+ minutes)

See [Triage Procedures](#triage-procedures) below.

---

## Triage Procedures

### Investigation Checklist

Use this systematic approach:

#### 1. **What Changed Recently?**

```bash
# Check recent deployments (last 24 hours)
cd c:\APPS\Union_Eyes_app_v1
git log --since="24 hours ago" --oneline --all

# Check Azure deployment history
az webapp log deployment list \
  --name unioneyes-prod-app \
  --resource-group unioneyes-prod-rg

# Check recent database migrations
psql $DATABASE_URL -c "SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 10;"
```

#### 2. **Check Application Status**

```bash
# Container status
docker ps -a
docker stats --no-stream

# Application logs (last 500 lines, errors only)
docker logs --tail 500 unioneyes-app-prod 2>&1 | grep -i "error\|exception\|fatal"

# Health endpoint
curl -v https://unioneyes.azurewebsites.net/api/health
```

#### 3. **Check Database Health**

```powershell
# Connection test
psql $env:DATABASE_URL -c "SELECT version();"

# Connection count
psql $env:DATABASE_URL -c "
  SELECT count(*) as active_connections, 
         max_conn.setting::int as max_connections,
         count(*)::float / max_conn.setting::float * 100 as pct_used
  FROM pg_stat_activity
  CROSS JOIN (SELECT setting FROM pg_settings WHERE name = 'max_connections') max_conn;"

# Long-running queries
psql $env:DATABASE_URL -c "
  SELECT pid, usename, age(clock_timestamp(), query_start) as age, state, query
  FROM pg_stat_activity
  WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
  ORDER BY age DESC
  LIMIT 10;"

# Database size and growth
psql $env:DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;"
```

#### 4. **Check System Resources**

```bash
# If using Docker:
docker stats --no-stream

# Azure App Service:
az webapp show \
  --name unioneyes-prod-app \
  --resource-group unioneyes-prod-rg \
  --query "{state: state, usage: usageState}"

# Disk space
df -h  # Linux/Mac
Get-PSDrive C | Select-Object Used,Free  # Windows

# Memory usage
free -h  # Linux
Get-Process | Sort-Object WS -Descending | Select-Object -First 10 # Windows
```

#### 5. **Check Dependencies**

```bash
# Redis (if used)
redis-cli ping

# External APIs
curl -I https://api.stripe.com/healthcheck
curl -I https://api.clerk.dev/v1/health

# DNS resolution
nslookup unioneyes.azurewebsites.net
```

### Log Analysis Commands

```bash
# Application errors (last hour)
docker logs --since 1h unioneyes-app-prod 2>&1 | grep -i "error" | tail -100

# Database errors
docker logs --since 1h unioneyes-postgres | grep -i "error\|fatal"

# HTTP 500 errors
docker logs --since 1h unioneyes-app-prod | grep "500"

# Group errors by type
docker logs --since 1h unioneyes-app-prod 2>&1 | grep -i "error" | \
  sed 's/.*Error: \([^:]*\).*/\1/' | sort | uniq -c | sort -rn

# Tail live logs
docker logs -f unioneyes-app-prod
```

---

## Communication Templates

### SEV-1 Initial Notification (Within 15 minutes)

```
Subject: [SEV-1] Production Incident - [Brief Title]

Status: INVESTIGATING
Incident ID: INC-YYYYMMDD-####
Started: [Timestamp]
Impact: [Complete/Major] service disruption
Affected Users: [All/Estimated percentage]

SITUATION:
[1-2 sentence description of what's broken]

ACTIONS TAKEN:
- Alert received at [time]
- Investigation started at [time]
- [Any immediate actions taken]

NEXT STEPS:
- [Planned investigation/remediation]
- Next update: Within 1 hour

Incident Commander: [Name]
War Room: [Teams/Slack link]
```

### Hourly Update (SEV-1/2)

```
Subject: [SEV-1] Production Incident - [Title] - UPDATE #[N]

Status: INVESTIGATING / IDENTIFIED / MONITORING
Incident ID: INC-YYYYMMDD-####
Duration: [X hours Y minutes]

UPDATE:
[What's been discovered/fixed/attempted]

CURRENT STATUS:
[Current state of the service]

NEXT STEPS:
[What's being done next]

Next Update: [Time]
```

### Resolution Notification

```
Subject: [RESOLVED] [SEV-1] Production Incident - [Title]

Status: RESOLVED
Incident ID: INC-YYYYMMDD-####
Duration: [X hours Y minutes]
Root Cause: [Brief 1-sentence summary]

RESOLUTION:
[What was done to fix the issue]

IMPACT SUMMARY:
- Duration: [time]
- Affected users: [number/percentage]
- Service availability: [percentage]

POST-INCIDENT REVIEW:
- Scheduled for: [Date/Time]
- PIR document: [Link when ready]

Thank you to the response team for the quick resolution.
```

### Status Page Update Template

```markdown
## [Current Status] - [Title]

**Last Updated:** 2026-02-12 03:45 UTC

**Impact:** [Investigating / Partial Outage / Major Outage / Resolved]

### Timeline
- **03:12 UTC** - Issue detected: [description]
- **03:15 UTC** - Investigation started
- **03:30 UTC** - Root cause identified: [brief description]
- **03:40 UTC** - Fix deployed
- **03:45 UTC** - Service restored, monitoring

### Affected Services
- [X] Core Application
- [X] API
- [ ] Reporting (Not affected)

### Next Update
Within 1 hour or when resolved.
```

---

## Incident Response Playbooks

### Playbook 1: Application Down

**Trigger:** `APIEndpointDown` alert or complete application unavailability

**Severity:** SEV-1

**Steps:**

```powershell
# 1. VERIFY - Is it really down?
curl https://unioneyes.azurewebsites.net/api/health
curl https://unioneyes-staging.azurewebsites.net/api/health

# 2. CHECK CONTAINER STATUS
docker ps -a | grep unioneyes

# If container stopped:
docker-compose -f docker-compose.prod.yml ps

# Check logs for crash reason:
docker logs --tail 200 unioneyes-app-prod

# 3. QUICK RESTART ATTEMPT
docker-compose -f docker-compose.prod.yml restart app

# 4. IF RESTART FAILS - Check for:
# a) Database connection issues
psql $env:DATABASE_URL -c "SELECT 1;"

# b) Port conflicts
netstat -ano | findstr ":3000"

# c) Environment variables
docker exec unioneyes-app-prod env | grep DATABASE_URL

# 5. IF RECENT DEPLOYMENT - ROLLBACK
# See: rollback.md for complete procedures
.\scripts\deploy-blue-green.ps1 -Action rollback

# 6. IF PERSISTENT - Deploy from known good state
git checkout [last-known-good-commit]
docker-compose -f docker-compose.prod.yml up -d --build

# 7. VERIFY RECOVERY
for ($i = 1; $i -le 10; $i++) {
    curl https://unioneyes.azurewebsites.net/api/health
    Start-Sleep -Seconds 5
}

# 8. COLLECT FORENSICS (after recovery)
docker logs unioneyes-app-prod > "incident-logs-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
```

**Rollback Decision Tree:**
```
Was there a deployment in the last 2 hours?
│
├─ YES → Check health before deployment
│        └─ Was it healthy? 
│           └─ YES → ROLLBACK (see rollback.md)
│           └─ NO → Investigate deeper
│
└─ NO → Check for infrastructure changes
       └─ Database migration? → Check rollback options
       └─ Config change? → Revert
       └─ External dependency? → Investigate
```

---

### Playbook 2: Database Failure

**Trigger:** `DatabaseDown` alert or database connection errors

**Severity:** SEV-1

**Steps:**

```powershell
# 1. VERIFY - Can we connect?
psql $env:DATABASE_URL -c "SELECT version();"

# If connection fails:
# Error samples and meanings:
# "could not connect" → Network/firewall issue
# "password authentication failed" → Credential issue
# "database does not exist" → Database deleted/corrupted
# "too many connections" → Connection pool exhausted (see Playbook 4)

# 2. CHECK DATABASE STATUS (Azure PostgreSQL)
az postgres server show \
  --resource-group unioneyes-prod-rg \
  --name unioneyes-prod-postgres \
  --query "{state: state, replicationRole: replicationRole}"

# 3. CHECK RECENT CHANGES
psql $env:DATABASE_URL -c "
  SELECT * FROM drizzle_migrations 
  ORDER BY created_at DESC LIMIT 5;"

# 4. IF MIGRATION JUST RAN - Consider rollback
# See: rollback.md - Database Migration Rollback

# 5. CHECK DISK SPACE (Azure)
az postgres server show \
  --resource-group unioneyes-prod-rg \
  --name unioneyes-prod-postgres \
  --query "storageProfile"

# 6. CHECK FOR BLOCKING QUERIES
psql $env:DATABASE_URL -c "
  SELECT pid, usename, pg_blocking_pids(pid) as blocked_by,
         query as current_query
  FROM pg_stat_activity
  WHERE cardinality(pg_blocking_pids(pid)) > 0;"

# 7. EMERGENCY ACTIONS (if database unresponsive)
# a) Kill long-running queries
psql $env:DATABASE_URL -c "SELECT pg_terminate_backend([pid]);"

# b) Restart database (LAST RESORT - causes downtime)
az postgres server restart \
  --resource-group unioneyes-prod-rg \
  --name unioneyes-prod-postgres

# 8. IF DATA CORRUPTION SUSPECTED
# See: backup-restore.md for restore procedures
# Contact DBA immediately
# Do NOT attempt manual fixes without backup

# 9. VERIFY RECOVERY
psql $env:DATABASE_URL -c "
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
  LIMIT 10;"
```

**Critical Database Commands:**
```sql
-- Check replication status
SELECT * FROM pg_stat_replication;

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Connection pool status
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;

-- Recent errors in logs
SELECT * FROM pg_stat_database WHERE datname = 'union_eyes';
```

---

### Playbook 3: High Error Rate

**Trigger:** `HighErrorRate` alert (>5% 5xx errors)

**Severity:** SEV-2

**Steps:**

```powershell
# 1. IDENTIFY ERROR PATTERN
docker logs --since 15m unioneyes-app-prod 2>&1 | grep "500\|502\|503" | tail -50

# Group errors by endpoint
docker logs --since 15m unioneyes-app-prod 2>&1 | 
  grep "500" | 
  awk '{print $7}' | 
  sort | uniq -c | sort -rn

# 2. CHECK IF SPECIFIC ENDPOINT
# If one endpoint → Disable/circuit breaker if possible
# If all endpoints → System-wide issue

# 3. CHECK DATABASE CONNECTIONS
psql $env:DATABASE_URL -c "
  SELECT count(*) as active, state 
  FROM pg_stat_activity 
  GROUP BY state;"

# 4. CHECK SLOW QUERIES
psql $env:DATABASE_URL -c "
  SELECT pid, age(clock_timestamp(), query_start), state, query
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND age(clock_timestamp(), query_start) > interval '5 seconds'
  ORDER BY age DESC;"

# 5. CHECK EXTERNAL DEPENDENCIES
# Stripe API
curl -I https://api.stripe.com/healthcheck

# Clerk API
curl -I https://api.clerk.dev/v1/health

# 6. CHECK RESOURCE UTILIZATION
docker stats --no-stream unioneyes-app-prod

# 7. MITIGATION OPTIONS
# Option A: Scale horizontally (if resource constrained)
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Option B: Restart app (clears memory leaks, resets connections)
docker-compose -f docker-compose.prod.yml restart app

# Option C: Enable rate limiting (emergency brake)
# Add to environment:
docker-compose -f docker-compose.prod.yml up -d \
  -e RATE_LIMIT_ENABLED=true \
  -e RATE_LIMIT_MAX=100

# Option D: Rollback if recent deployment
.\scripts\deploy-blue-green.ps1 -Action rollback

# 8. MONITOR RECOVERY
watch -n 5 'curl -s https://unioneyes.azurewebsites.net/api/health'
```

**Error Rate Decision Matrix:**
```
Error Rate > 5%
│
├─ Sudden spike? → Recent deployment? → Rollback
│                 └─ No deployment → Check dependencies
│
└─ Gradual increase? → Resource exhaustion? → Scale
                      └─ Memory leak? → Restart
```

---

### Playbook 4: Database Connection Pool Exhausted

**Trigger:** `DatabaseConnectionPoolExhausted` alert (>90% connections used)

**Severity:** SEV-2

**Steps:**

```powershell
# 1. VERIFY CONNECTION USAGE
psql $env:DATABASE_URL -c "
  SELECT count(*) as used_connections,
         (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_connections,
         round(count(*)::numeric / (SELECT setting::int FROM pg_settings WHERE name='max_connections')::numeric * 100, 2) as percent_used
  FROM pg_stat_activity;"

# 2. IDENTIFY CONNECTION SOURCES
psql $env:DATABASE_URL -c "
  SELECT application_name, state, count(*)
  FROM pg_stat_activity
  GROUP BY application_name, state
  ORDER BY count(*) DESC;"

# 3. FIND IDLE CONNECTIONS
psql $env:DATABASE_URL -c "
  SELECT pid, usename, application_name,
         age(clock_timestamp(), state_change) as idle_time,
         state, query
  FROM pg_stat_activity
  WHERE state = 'idle'
  ORDER BY idle_time DESC
  LIMIT 20;"

# 4. KILL IDLE CONNECTIONS (>10 minutes idle)
psql $env:DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND age(clock_timestamp(), state_change) > interval '10 minutes'
    AND pid != pg_backend_pid();"

# 5. CHECK FOR CONNECTION LEAKS IN APP
docker logs --since 30m unioneyes-app-prod | grep -i "connection\|pool"

# 6. RESTART APP (forces connection pool reset)
docker-compose -f docker-compose.prod.yml restart app

# 7. TEMPORARY INCREASE MAX CONNECTIONS (if Azure PostgreSQL)
az postgres server configuration set \
  --resource-group unioneyes-prod-rg \
  --server-name unioneyes-prod-postgres \
  --name max_connections \
  --value 200

# Note: Requires restart, plan during maintenance window

# 8. VERIFY RECOVERY
psql $env:DATABASE_URL -c "
  SELECT count(*) as current_connections
  FROM pg_stat_activity;"
```

**Connection Leak Detection:**
```sql
-- Find apps with too many connections
SELECT application_name, count(*) as conn_count
FROM pg_stat_activity
WHERE state = 'idle'
GROUP BY application_name
HAVING count(*) > 20
ORDER BY conn_count DESC;

-- Check for long transactions
SELECT pid, age(clock_timestamp(), xact_start), state, query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY age DESC;
```

---

### Playbook 5: Disk Space Critical

**Trigger:** `DiskSpaceLow` alert (<15% free space)

**Severity:** SEV-3 (can escalate to SEV-1 if database affected)

**Steps:**

```powershell
# 1. CHECK DISK USAGE
df -h  # Linux/Mac
Get-PSDrive | Select-Object Name, Used, Free  # Windows

# 2. IDENTIFY LARGE DIRECTORIES
du -sh /* | sort -h  # Linux/Mac
Get-ChildItem C:\ | ForEach-Object {
    [PSCustomObject]@{
        Path = $_.FullName
        Size = "{0:N2} GB" -f ((Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum).Sum / 1GB)
    }
} | Sort-Object Size -Descending  # Windows

# 3. CHECK DOCKER DISK USAGE
docker system df

# 4. CLEAN UP OPTIONS
# Option A: Remove old Docker images/containers
docker system prune -a --volumes --force

# Option B: Clean up logs
find /var/log -type f -name "*.log" -mtime +30 -delete  # Linux
Get-ChildItem C:\Logs -Filter *.log | 
  Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | 
  Remove-Item  # Windows

# Option C: Clean up old backups (keep last 7)
cd ./backups
ls -t | tail -n +8 | xargs rm  # Linux
Get-ChildItem | Sort-Object CreationTime -Descending | 
  Select-Object -Skip 7 | Remove-Item  # Windows

# Option D: Compress old logs
find /var/log -name "*.log" -exec gzip {} \;  # Linux

# 5. CHECK DATABASE SIZE
psql $env:DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
         pg_size_pretty(pg_total_relation_size('public.logs')) as logs_table_size;"

# 6. IF DATABASE CAUSING ISSUE
# Archive old data (example: logs table)
psql $env:DATABASE_URL -c "
  DELETE FROM logs WHERE created_at < NOW() - INTERVAL '90 days';"

# Vacuum to reclaim space
psql $env:DATABASE_URL -c "VACUUM FULL ANALYZE logs;"

# 7. EMERGENCY: Expand disk (Azure)
az postgres server update \
  --resource-group unioneyes-prod-rg \
  --name unioneyes-prod-postgres \
  --storage-size [NEW_SIZE_GB]

# 8. VERIFY SPACE RECOVERED
df -h
```

---

### Playbook 6: Memory Leak / High Memory Usage

**Trigger:** `HighMemoryUsage` alert or OOM kills

**Severity:** SEV-3 (can escalate to SEV-2 if causing crashes)

**Steps:**

```powershell
# 1. CHECK MEMORY USAGE
docker stats --no-stream

free -h  # Linux
Get-Process | Sort-Object WS -Descending | 
  Select-Object -First 20 Name, WS  # Windows

# 2. CHECK NODE.JS HEAP (if applicable)
# Add to Docker container:
docker exec unioneyes-app-prod node --expose-gc -e "
  console.log('Heap Used:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');
  console.log('Heap Total:', process.memoryUsage().heapTotal / 1024 / 1024, 'MB');
  console.log('RSS:', process.memoryUsage().rss / 1024 / 1024, 'MB');
"

# 3. CHECK FOR MEMORY LEAK PATTERN
# If memory grows linearly over time → likely leak
# If memory spikes and drops → normal GC behavior

# 4. COLLECT HEAP DUMP (for analysis)
docker exec unioneyes-app-prod node -e "
  const heapdump = require('heapdump');
  heapdump.writeSnapshot('/tmp/heap-' + Date.now() + '.heapsnapshot');
"

# Copy heap dump out
docker cp unioneyes-app-prod:/tmp/ ./heap-dumps/

# 5. IMMEDIATE MITIGATION - Restart app
docker-compose -f docker-compose.prod.yml restart app

# 6. TEMPORARY INCREASE MEMORY LIMIT
docker-compose -f docker-compose.prod.yml up -d \
  --memory="4g" \
  --memory-swap="4g"

# 7. MONITOR FOR RECURRENCE
watch -n 30 'docker stats --no-stream unioneyes-app-prod'

# 8. LONG-TERM INVESTIGATION
# Analyze heap dump with Chrome DevTools
# Identify objects not being garbage collected
# Create ticket with findings for development team
```

---

## Post-Incident Review (PIR)

### When to Conduct PIR

- **SEV-1:** Within 48 hours (mandatory)
- **SEV-2:** Within 1 week (mandatory)
- **SEV-3:** Optional, but recommended for complex issues

### PIR Meeting Attendees

- Incident Commander
- Technical Lead(s)
- Communications Lead
- Engineering Manager
- Product Owner (for SEV-1/2)
- Any team members who participated

### PIR Template

**File:** `docs/incidents/PIR-YYYYMMDD-[title].md`

```markdown
# Post-Incident Review: [Incident Title]

**Incident ID:** INC-YYYYMMDD-####  
**Severity:** [SEV-X]  
**Date:** 2026-02-12  
**Duration:** [X hours Y minutes]  
**Facilitator:** [Name]  

---

## Executive Summary

[2-3 sentence summary of what happened, impact, and resolution]

---

## Impact

- **Users Affected:** [number/percentage]
- **Downtime:** [duration]
- **Revenue Impact:** $[amount] (if applicable)
- **Reputation Impact:** [customer complaints, social media, etc.]

---

## Timeline

| Time (UTC) | Event | Actor |
|------------|-------|-------|
| 03:12 | Alert triggered: APIEndpointDown | Prometheus |
| 03:15 | On-call engineer paged | PagerDuty |
| 03:18 | Investigation started | John Doe |
| 03:22 | Root cause identified: Database connection pool exhausted | John Doe |
| 03:25 | Mitigation: Killed idle connections | John Doe |
| 03:30 | Service restored | System |
| 03:35 | Monitoring confirmed recovery | John Doe |
| 04:00 | Incident closed | John Doe |

---

## Root Cause Analysis

### What Happened?

[Detailed technical explanation of the issue]

### Why Did It Happen?

**Direct Cause:**  
[Immediate trigger: e.g., code bug, config error, capacity limit]

**Contributing Factors:**
1. [Factor 1: e.g., lack of monitoring]
2. [Factor 2: e.g., insufficient testing]
3. [Factor 3: e.g., manual process]

### Why Didn't We Detect It Earlier?

[Gaps in monitoring, alerting, or testing]

---

## What Went Well?

1. [e.g., Fast incident detection (2 minutes)]
2. [e.g., Clear runbook procedures followed]
3. [e.g., Effective team communication]

---

## What Went Poorly?

1. [e.g., Detection alert threshold too high]
2. [e.g., Rollback took longer than expected]
3. [e.g., Lack of automated mitigation]

---

## Action Items

| # | Action | Owner | Due Date | Priority | Status |
|---|--------|-------|----------|----------|--------|
| 1 | Add monitoring for connection pool usage | DevOps | 2026-02-15 | P0 | 🔴 Open |
| 2 | Implement auto-scaling for database connections | Backend | 2026-02-20 | P1 | 🔴 Open |
| 3 | Update incident runbook with new findings | DevOps | 2026-02-13 | P1 | 🔴 Open |
| 4 | Conduct load testing for connection pool limits | QA | 2026-02-25 | P2 | 🔴 Open |
| 5 | Add automated mitigation for connection pool exhaustion | Backend | 2026-03-01 | P2 | 🔴 Open |

**Priority Levels:**
- **P0:** Prevent recurrence (critical)
- **P1:** Improve detection/mitigation (high)
- **P2:** Process improvement (medium)
- **P3:** Nice-to-have (low)

---

## Lessons Learned

### Technical Lessons

1. [e.g., Connection pooling configuration was inadequate for peak load]
2. [e.g., Idle connection timeout not configured]
3. [e.g., Monitoring threshold was set too late]

### Process Lessons

1. [e.g., Need better escalation path for database issues]
2. [e.g., Runbook procedures were clear and helpful]
3. [e.g., Communication could be more proactive]

---

## Follow-Up Review

**Date:** [1 month after incident]  
**Status:** [Track action item completion]

---

## References

- Incident Log: [link]
- Chat Transcript: [link]
- Metrics During Incident: [Grafana snapshot link]
- Related Documentation: [links]
```

### PIR Meeting Agenda (1 hour)

**0-5 min:** Review timeline and impact  
**5-15 min:** Discuss what happened (technical details)  
**15-25 min:** Discuss why it happened (root cause)  
**25-35 min:** Discuss what went well / poorly  
**35-50 min:** Brainstorm action items  
**50-60 min:** Prioritize action items and assign owners

### PIR Best Practices

1. **Blameless Culture** - Focus on systems and processes, not individuals
2. **Assume Good Intent** - Everyone was doing their best with available information
3. **Focus on Learning** - Not punishment
4. **Actionable Items** - Every action item must have owner and due date
5. **Follow Through** - Review action items in 30 days
6. **Share Widely** - Distribute PIR to entire team (not just responders)

---

## Incident Metrics and KPIs

Track these metrics over time to improve incident response:

### Detection Metrics
- **MTTD (Mean Time To Detect):** Time from incident start to alert
- **Target:** < 5 minutes for SEV-1, < 15 minutes for SEV-2

### Response Metrics
- **MTTA (Mean Time To Acknowledge):** Time from alert to acknowledgment
- **Target:** < 5 minutes for SEV-1, < 15 minutes for SEV-2

### Resolution Metrics
- **MTTR (Mean Time To Resolve):** Time from incident start to resolution
- **Target:** < 1 hour for SEV-1, < 4 hours for SEV-2

### Impact Metrics
- **Availability:** Target 99.9% uptime (≈43 minutes downtime/month)
- **Error Budget:** Track against SLOs

### Process Metrics
- **PIR Completion Rate:** 100% for SEV-1/2 within deadlines
- **Action Item Completion Rate:** >80% within 30 days

---

## Related Documentation

- **Rollback Procedures:** [`rollback.md`](./rollback.md)
- **Backup & Restore:** [`backup-restore.md`](./backup-restore.md)
- **Disaster Recovery:** [`../disaster-recovery/force-majeure-plan.md`](../disaster-recovery/force-majeure-plan.md)
- **Deployment Scripts:** [`../../scripts/deploy-blue-green.ps1`](../../scripts/deploy-blue-green.ps1)
- **Monitoring Configuration:** [`../../monitoring/prometheus/alerts.yml`](../../monitoring/prometheus/alerts.yml)
- **GitHub Actions:** [`../../.github/workflows/`](../../.github/workflows/)

---

## Appendix: Quick Reference Cards

### Quick Commands Card (Print and Post)

```
🚨 INCIDENT RESPONSE QUICK REFERENCE CARD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 SEV-1: ALL USERS DOWN - PAGE EVERYONE
🟠 SEV-2: MAJOR DEGRADATION - PAGE BACKUP
🟡 SEV-3: PARTIAL ISSUE - INVESTIGATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DASHBOARDS:
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090

🔍 QUICK CHECKS:
curl https://unioneyes.azurewebsites.net/api/health
docker ps -a
docker logs --tail 100 unioneyes-app-prod

💾 DATABASE:
psql $DATABASE_URL -c "SELECT 1;"
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

🔄 ROLLBACK:
.\scripts\deploy-blue-green.ps1 -Action rollback

📞 ESCALATION:
- On-Call: [Phone]
- Manager: [Phone]
- DBA: [Phone]

📋 RUNBOOK: docs/operations/incident-response.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**END OF RUNBOOK**

*This is a living document. Update after every major incident.*

**Last Review:** February 12, 2026  
**Next Review:** May 12, 2026  
**Document Owner:** DevOps Team
