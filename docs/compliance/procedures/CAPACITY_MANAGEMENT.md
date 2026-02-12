# Capacity Management and Monitoring Procedures

**Document ID:** PROC-OPS-002  
**Version:** 1.0  
**Effective Date:** February 12, 2026  
**Last Review:** February 12, 2026  
**Next Review:** August 12, 2026  
**Owner:** DevOps Lead  
**Approved By:** Chief Technology Officer

---

## 1. Purpose

This document defines procedures for monitoring, analyzing, and managing system capacity to ensure Union Eyes infrastructure can meet current and future demand while maintaining performance, availability, and cost-efficiency.

---

## 2. Scope

**In Scope:**
- Azure PostgreSQL Flexible Server (production and staging)
- Azure Blob Storage (documents and backups)
- Vercel hosting (Next.js application)
- Application performance and response times
- Database connection pools
- API request throughput

**Out of Scope:**
- Third-party SaaS capacity (Clerk, Stripe, Sentry) - managed by vendors

---

## 3. Capacity Metrics and Thresholds

### 3.1 Azure PostgreSQL Database

| Metric | Yellow Threshold | Red Threshold | Action Trigger |
|--------|-----------------|---------------|----------------|
| CPU Utilization | 70% sustained (5 min) | 85% sustained (5 min) | Scale up compute tier |
| Memory Utilization | 75% sustained (5 min) | 90% sustained (5 min) | Scale up compute tier or optimize queries |
| Storage Used | 75% of allocated | 85% of allocated | Increase storage capacity |
| IOPS Utilization | 70% of tier limit | 85% of tier limit | Scale to higher tier or enable read replicas |
| Connection Count | 70% of max connections | 90% of max connections | Optimize connection pooling or scale up |
| Replication Lag | 30 seconds | 60 seconds | Investigate replica performance |

**Current Configuration (Production):**
- Tier: General Purpose
- Compute: 4 vCores, 16 GB RAM
- Storage: 128 GB (auto-grow enabled)
- Max Connections: 859
- IOPS: 3,500 baseline

**Monitoring Frequency:** Real-time (1-minute intervals)

### 3.2 Azure Blob Storage

| Metric | Yellow Threshold | Red Threshold | Action Trigger |
|--------|-----------------|---------------|----------------|
| Total Storage | 75% of plan limit | 90% of plan limit | Implement retention purge or upgrade plan |
| Ingress Bandwidth | 70% of throttle limit | 85% of throttle limit | Optimize upload sizes or request quota increase |
| Egress Bandwidth | 70% of throttle limit | 85% of throttle limit | Implement CDN or request quota increase |
| Request Rate | 15,000 req/sec | 18,000 req/sec | Optimize access patterns or scale out |

**Current Configuration:**
- Account Type: General Purpose v2
- Replication: GRS (Geo-Redundant)
- Performance Tier: Standard
- Access Tier: Hot (frequently accessed), Cool (backups)

**Monitoring Frequency:** Hourly aggregates

### 3.3 Vercel Hosting (Next.js Application)

| Metric | Yellow Threshold | Red Threshold | Action Trigger |
|--------|-----------------|---------------|----------------|
| Build Minutes | 80% of plan limit | 95% of plan limit | Optimize build process or upgrade plan |
| Bandwidth | 70% of monthly allowance | 85% of monthly allowance | Optimize assets or upgrade plan |
| Serverless Function Execution Time | Avg >8 seconds | Avg >10 seconds | Optimize code or timeout settings |
| Serverless Function Invocations | 70% of plan limit | 90% of plan limit | Optimize caching or upgrade plan |
| Edge Requests | 70% of monthly limit | 90% of monthly limit | Review traffic patterns and upgrade plan |

**Current Plan:**
- Tier: Pro
- Build Minutes: 6,000/month
- Bandwidth: 1 TB/month
- Serverless Execution: 1,000 GB-hours/month

**Monitoring Frequency:** Daily aggregates and real-time for function execution

### 3.4 Application Performance

| Metric | Yellow Threshold | Red Threshold | Action Trigger |
|--------|-----------------|---------------|----------------|
| API Response Time (p95) | 800 ms | 1,200 ms | Optimize queries or add caching |
| API Response Time (p99) | 1,500 ms | 2,500 ms | Investigate slow queries |
| Page Load Time (p95) | 2.5 seconds | 4 seconds | Optimize bundle size or CDN |
| Error Rate | 0.5% of requests | 1% of requests | Investigate errors in Sentry |
| Database Query Time (p95) | 300 ms | 500 ms | Add indexes or optimize queries |

**Monitoring Tool:** Sentry Performance Monitoring  
**Monitoring Frequency:** Real-time (1-minute rolling averages)

### 3.5 User and Transaction Growth

| Metric | Measurement Period | Review Trigger |
|--------|-------------------|----------------|
| Active Users (MAU) | Month-over-month | >20% growth |
| Database Transactions | Daily | >30% increase week-over-week |
| API Request Volume | Daily | >40% increase week-over-week |
| Storage Growth | Weekly | >15% increase month-over-month |

**Monitoring Frequency:** Weekly trend analysis

---

## 4. Monitoring Tools and Dashboards

### 4.1 Azure Monitor
**Purpose:** Infrastructure and resource monitoring  
**Metrics Collected:**
- PostgreSQL: CPU, memory, storage, IOPS, connections, replication lag
- Blob Storage: capacity, transactions, ingress/egress bandwidth
- Alerts configured for yellow/red thresholds

**Access:** Azure Portal → Monitor → Metrics  
**Dashboard:** [Production Resource Dashboard](https://portal.azure.com/#dashboard/unioneyes-prod)

### 4.2 Azure Database Insights
**Purpose:** Deep database performance analysis  
**Metrics Collected:**
- Query performance statistics
- Wait statistics
- Index usage and recommendations
- Blocking queries

**Access:** Azure Portal → PostgreSQL Server → Intelligent Performance  
**Review Frequency:** Weekly (or upon performance alerts)

### 4.3 Vercel Analytics
**Purpose:** Application performance and edge network monitoring  
**Metrics Collected:**
- Build times and success rates
- Bandwidth usage
- Function invocations and execution time
- Edge request counts and latency

**Access:** Vercel Dashboard → Analytics  
**Review Frequency:** Daily (automated dashboard)

### 4.4 Sentry Performance Monitoring
**Purpose:** Application-level performance and error tracking  
**Metrics Collected:**
- API endpoint response times (p50, p95, p99)
- Transaction traces
- Error rates and stack traces
- User impact analysis

**Access:** Sentry.io → Performance  
**Review Frequency:** Real-time alerts + weekly trend analysis

### 4.5 Application Logs (Vercel Logs)
**Purpose:** Application behavior and error analysis  
**Retention:** 14 days (hot), 90 days (archived)  
**Access:** Vercel Dashboard → Logs  
**Use Cases:** Debugging capacity-related issues, user behavior analysis

---

## 5. Capacity Planning Process

### 5.1 Quarterly Capacity Review
**Schedule:** First week of each quarter (Q1: January, Q2: April, Q3: July, Q4: October)  
**Attendees:**
- DevOps Lead (chair)
- CTO
- Lead Developer
- Finance (budget approval)

**Agenda:**
1. **Trend Analysis (30 min)**
   - Review growth metrics (users, transactions, storage)
   - Identify usage patterns (peak hours, seasonal trends)
   - Analyze cost trends

2. **Capacity Forecasting (30 min)**
   - Project resource needs for next 6-12 months
   - Scenario planning (baseline, high-growth, crisis)
   - Identify bottlenecks and constraints

3. **Optimization Opportunities (20 min)**
   - Query optimization findings
   - Inefficient resource usage
   - Cost reduction opportunities (rightsizing, reserved instances)

4. **Action Planning (20 min)**
   - Prioritize capacity improvements
   - Assign owners and timelines
   - Budget requests for upgrades

**Deliverables:**
- Capacity Planning Report
- Resource upgrade/downgrade recommendations
- Budget forecast for next 2 quarters

### 5.2 Monthly Performance Review
**Schedule:** First Monday of each month  
**Attendees:** DevOps Lead, Lead Developer

**Checklist:**
- ✅ Review all alerts from previous month (yellow/red thresholds)
- ✅ Analyze performance trends (degradation or improvement)
- ✅ Check cost vs. budget
- ✅ Verify alert thresholds are still appropriate
- ✅ Update capacity forecast if needed

**Output:** Monthly Performance Summary (Slack post to #engineering)

### 5.3 Weekly Healthcheck
**Schedule:** Every Monday 10:00 AM  
**Owner:** DevOps Lead (automated report)

**Automated Report Contents:**
- Resource utilization summary (traffic light system)
-异常 usage patterns (spikes, drops)
- Open capacity-related alerts
- Upcoming thresholds (projected to reach yellow/red within 30 days)

**Distribution:** #ops-alerts Slack channel

---

## 6. Alerting and Escalation

### 6.1 Alert Severity Levels

**Level 1 - Informational (Green)**
- Resource usage within normal ranges
- No action required
- Logged for trend analysis

**Level 2 - Warning (Yellow)**
- Yellow threshold breached
- Action required within 5 business days
- Assigned to: DevOps team
- Notification: Slack #ops-alerts

**Level 3 - Critical (Red)**
- Red threshold breached
- Immediate action required (within 4 hours during business hours, 12 hours off-hours)
- Assigned to: DevOps Lead + CTO
- Notification: Slack #incidents + PagerDuty (if implemented)

**Level 4 - Emergency (Outage Imminent)**
- Service degradation or outage risk
- Immediate response required (within 30 minutes)
- Assigned to: Incident Response Team
- Notification: PagerDuty page + SMS to CTO and DevOps Lead

### 6.2 Alert Configuration

**Azure Monitor Alerts:**
```
Alert Rules:
- postgresql-cpu-high (>85% for 5 min) → Critical
- postgresql-storage-high (>85%) → Warning
- postgresql-connections-high (>90%) → Critical
- blob-storage-capacity-high (>75%) → Warning
- blob-request-throttling → Critical
```

**Sentry Performance Alerts:**
```
Alert Rules:
- api-response-time-high (p95 >1.2s for 10 min) → Warning
- api-error-rate-high (>1% for 5 min) → Critical
- database-query-slow (p99 >500ms for 10 min) → Warning
```

### 6.3 Escalation Matrix

| Time Since Alert | Yellow Threshold | Red Threshold |
|------------------|-----------------|---------------|
| 0-4 hours | DevOps team Slack | DevOps Lead + CTO Slack + SMS |
| 4-8 hours | DevOps Lead notified | CTO escalation, Incident Commander assigned |
| 8-24 hours | CTO briefing required | Executive team notification |
| >24 hours | Incident postmortem | External audit of capacity planning |

---

## 7. Capacity Incident Response

### 7.1 Immediate Actions (Red Alert)

**Database CPU/Memory High:**
1. Identify expensive queries (Azure Database Insights → Query Performance)
2. Kill long-running queries if blocking critical operations
   ```sql
   SELECT pid, usename, query, state, query_start 
   FROM pg_stat_activity 
   WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
   
   -- Kill specific query
   SELECT pg_terminate_backend(pid);
   ```
3. Scale up compute tier (vertical scaling - takes ~5 minutes)
4. If persistent: Enable read replica for read-heavy queries
5. Document incident in Slack #incidents

**Database Storage Full:**
1. Identify largest tables and indexes
   ```sql
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 20;
   ```
2. Purge old data per Data Retention Policy (audit logs >90 days, backups >30 days)
3. Enable storage auto-grow if not already enabled
4. Increase storage allocation (takes ~10-15 minutes)
5. Review and implement data archival strategy

**Database Connections Exhausted:**
1. Identify idle connections
   ```sql
   SELECT COUNT(*), state FROM pg_stat_activity GROUP BY state;
   ```
2. Terminate idle connections older than 30 minutes
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'idle' AND state_change < NOW() - INTERVAL '30 minutes';
   ```
3. Review application connection pool settings (Drizzle connection limit)
4. Scale up compute tier (increases max_connections)

**Blob Storage Throttling:**
1. Identify high-volume operations (Azure Monitor → Blob Metrics → Transactions)
2. Implement throttling/backoff in application code
3. Enable CDN for frequently accessed files
4. Request quota increase from Azure Support (if necessary)

**Vercel Function Timeouts:**
1. Identify slow functions (Vercel Analytics → Functions → Execution Time)
2. Review function logs for errors
3. Optimize code (reduce database queries, enable caching)
4. Increase function timeout limit (if appropriate)
5. Consider moving long-running operations to background jobs

### 7.2 Postmortem Process
**Required For:**
- All red-level capacity alerts
- Any user-facing degradation
- Unplanned scaling operations

**Postmortem Template:**
```markdown
# Capacity Incident Postmortem: [Brief Title]

**Date:** [Incident Date]
**Duration:** [Start Time] - [End Time] ([Duration])
**Severity:** [Warning/Critical/Emergency]
**Incident Commander:** [Name]

## Summary
[1-2 sentence summary of what happened]

## Impact
- Users affected: [Estimate]
- Degradation: [Response time increase, error rate, etc.]
- Revenue impact: [If applicable]

## Timeline
- [Time] - Alert triggered
- [Time] - Investigation began
- [Time] - Root cause identified
- [Time] - Mitigation applied
- [Time] - Incident resolved

## Root Cause
[Detailed analysis of what caused the capacity issue]

## Resolution
[Steps taken to resolve the incident]

## Lessons Learned
- What went well:
- What could be improved:

## Action Items
- [ ] Task 1 [Owner] [Due Date]
- [ ] Task 2 [Owner] [Due Date]
```

**Distribution:** #incidents Slack channel + DevOps wiki

---

## 8. Optimization Procedures

### 8.1 Database Query Optimization
**Frequency:** Weekly review  
**Process:**
1. Identify slow queries (Azure Database Insights → Query Performance → Top 10 by duration)
2. Analyze execution plans
   ```sql
   EXPLAIN ANALYZE [query];
   ```
3. Check for missing indexes
   ```sql
   SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
   ORDER BY n_distinct DESC, correlation ASC;
   ```
4. Add indexes if beneficial (test on staging first)
5. Refactor queries (reduce JOINs, use WITH clauses, paginate results)
6. Document changes in PR and Slack #engineering

### 8.2 Storage Optimization
**Frequency:** Monthly  
**Process:**
1. Review Azure Blob Storage by tier (Hot vs. Cool)
2. Move infrequently accessed files to Cool tier (access logs, old backups)
   - Criteria: Not accessed in 60 days
   - Savings: ~50% storage cost
3. Purge expired data per Data Retention Policy
   - Audit logs: >90 days
   - Backups: >30 days (daily), >90 days (weekly), >1 year (monthly)
4. Compress large documents (if not already compressed)
5. Review database bloat and run VACUUM
   ```sql
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          n_dead_tup, n_live_tup
   FROM pg_stat_user_tables
   WHERE n_dead_tup > 10000
   ORDER BY n_dead_tup DESC;
   
   VACUUM ANALYZE [tablename];
   ```

### 8.3 Application Performance Optimization
**Frequency:** Bi-weekly  
**Process:**
1. Review Sentry Performance → Slow Transactions (p95 >800ms)
2. Identify N+1 query problems (multiple sequential DB calls)
3. Implement caching where appropriate (React Query, Redis if needed in future)
4. Optimize bundle size (Vercel Analytics → Build Analysis)
   - Code splitting
   - Remove unused dependencies
   - Compress images (WebP, next/image)
5. Enable Incremental Static Regeneration (ISR) for static content

---

## 9. Scaling Procedures

### 9.1 Database Vertical Scaling (Compute Tier)
**When:** CPU/Memory sustained >85% or connections >90%  
**Downtime:** None (automatic failover, ~1-3 minute disruption)

**Procedure:**
1. Review current tier and next tier options
2. Estimate cost increase (check Azure Pricing Calculator)
3. Get approval from CTO if >$500/month increase
4. Schedule scaling during maintenance window (if possible) or execute immediately if critical
5. Execute in Azure Portal:
   - Navigate to PostgreSQL Server → Compute + Storage
   - Select new tier
   - Apply changes (takes ~5-10 minutes)
6. Verify metrics return to green thresholds
7. Update capacity documentation

**Rollback:** Scale down if issue persists (may indicate application bug, not capacity)

### 9.2 Database Horizontal Scaling (Read Replicas)
**When:** Read-heavy workload, CPU high but write performance acceptable  
**Use Cases:** Reporting queries, analytics, read-only API endpoints

**Procedure:**
1. Create read replica in Azure Portal (same region or geo-replica)
2. Update application connection strings (read replica endpoint)
3. Modify Drizzle ORM connection pool (separate read pool)
4. Route read-only queries to replica
5. Monitor replication lag (<10 seconds acceptable, <30 seconds for analytics)
6. Update infrastructure documentation

**Cost:** ~100% of primary server cost per replica

### 9.3 Storage Scaling
**When:** Storage >75% used  
**Downtime:** None

**Procedure:**
1. Enable auto-grow if not already (Azure Portal → Storage → Auto-grow)
2. Manually increase allocation if immediate expansion needed
3. Scale in 32 GB increments (or as needed)
4. Verify storage freed up in metrics

**Note:** Storage can only be scaled up, never down (Azure limitation)

### 9.4 Vercel Plan Upgrade
**When:** Bandwidth/Build-time limits approaching  
**Downtime:** None

**Procedure:**
1. Review usage trends (Vercel Dashboard → Usage)
2. Compare plan tiers (Pro → Enterprise)
3. Get budget approval from CTO
4. Upgrade in Vercel Dashboard → Settings → Billing
5. Verify increased limits reflected
6. Update budget tracking

---

## 10. Cost Management

### 10.1 Monthly Cost Review
**Schedule:** First business day of each month  
**Owner:** DevOps Lead

**Checklist:**
- ✅ Review Azure bill (vs. budget and forecast)
- ✅ Review Vercel bill
- ✅ Identify cost anomalies (>20% unexpected increase)
- ✅ Verify reserved instances/savings plans are active
- ✅ Identify optimization opportunities (idle resources, over-provisioned compute)

**Thresholds:**
- 10% over budget: Notify CTO
- 25% over budget: Immediate investigation and cost reduction plan required

### 10.2 Cost Optimization Strategies
**Azure Cost Savings:**
- Reserved Instances (1-year or 3-year) for production database (up to 60% savings)
- Blob Storage lifecycle policies (auto-move to Cool tier after 60 days)
- Geo-redundant storage only for critical data (use LRS for non-critical)

**Vercel Cost Savings:**
- Optimize build times (cache dependencies, incremental builds)
- Enable caching headers for static assets (reduce bandwidth)
- Use Edge Config for dynamic data (reduce function invocations)

**Application Optimizations:**
- Reduce database round-trips (batch queries, use CTEs)
- Implement query result caching (React Query, API route caching)
- Compress API responses (gzip)

---

## 11. Capacity Testing

### 11.1 Load Testing
**Frequency:** Before major releases + quarterly  
**Tool:** k6 (open-source load testing)

**Test Scenarios:**
1. **Baseline Load:** 100 concurrent users, 15-minute duration
2. **Peak Load:** 500 concurrent users, 30-minute duration (expected peak traffic)
3. **Stress Test:** Ramp up to 1,000 users over 10 minutes (identify breaking point)
4. **Spike Test:** Sudden increase from 100 to 800 users (simulate viral traffic)

**Acceptance Criteria:**
- API response time (p95) <800ms under peak load
- Error rate <0.1% under peak load
- Database CPU <70% under peak load
- No memory leaks over 30-minute duration

**Test Environment:** Staging (separate from production)

**Procedure:**
1. Prepare test script (API endpoints, user flows)
2. Execute load test
3. Monitor metrics (Sentry, Azure Monitor, Vercel)
4. Document results and bottlenecks
5. Implement optimizations if thresholds exceeded
6. Retest after optimizations

### 11.2 Chaos Engineering (Future)
**Status:** Planned for Q3 2026  
**Purpose:** Validate system resilience under failure conditions

**Scenarios:**
- Database failover simulation
- Network latency injection
- Blob Storage throttling
- Compute resource exhaustion

**Tool:** Azure Chaos Studio

---

## 12. Documentation and Reporting

### 12.1 Capacity Dashboard (To Be Implemented)
**Status:** Planned for Q2 2026  
**Platform:** Azure Dashboard or Grafana

**Widgets:**
- Real-time resource utilization (CPU, memory, storage, IOPS)
- Current vs. threshold indicators (traffic lights)
- 30-day trend charts
- Cost tracking (current month vs. budget)
- Alert history

**Access:** DevOps team, CTO, Executive team (read-only)

### 12.2 Quarterly Capacity Report
**Audience:** CTO, Executive Team, Board (if requested)

**Contents:**
1. Executive Summary (1 page)
   - Capacity status (green/yellow/red)
   - User growth and transaction trends
   - Cost summary and forecast
   - Key actions taken

2. Detailed Metrics (2-3 pages)
   - Resource utilization trends
   - Performance metrics
   - Incident summary (capacity-related)
   - Cost breakdown

3. Capacity Forecast (1 page)
   - 6-month projection
   - Expected resource needs
   - Budget request for scaling

4. Recommendations (1 page)
   - Performance optimizations
   - Infrastructure changes
   - Cost reduction opportunities

**Template:** `docs/compliance/reports/capacity-report-YYYY-QX.md`

---

## 13. Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **DevOps Lead** | Monitoring configuration, alert response, capacity planning, cost management, quarterly reports |
| **Lead Developer** | Query optimization, application performance, code reviews for performance |
| **CTO** | Budget approval, strategic capacity decisions, escalation point |
| **Incident Commander** (on-call rotation) | Respond to critical capacity incidents, coordinate resolution, postmortem facilitation |

---

## 14. Related Documents

- [Information Security Policy](../policies/INFORMATION_SECURITY_POLICY.md)
- [Backup and Recovery Policy](../policies/BACKUP_RECOVERY_POLICY.md)
- [Incident Response Plan](../policies/INCIDENT_RESPONSE_PLAN.md)
- [Data Retention Policy](../policies/DATA_RETENTION_POLICY.md)

---

## 15. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 12, 2026 | DevOps Lead | Initial document creation |

---

**Approved:**  
________________________________  
Chief Technology Officer

**Date:** February 12, 2026
