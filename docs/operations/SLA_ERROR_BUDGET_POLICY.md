# Service Level Agreement (SLA) & Error Budget Policy

**Version:** 1.0  
**Date:** February 14, 2026  
**Status:** Active  
**Review Cycle:** Quarterly  
**Next Review:** May 14, 2026  
**Owner:** Platform Engineering Team

---

## Executive Summary

This document establishes formal Service Level Agreements (SLAs), Service Level Objectives (SLOs), Service Level Indicators (SLIs), and Error Budget policies for the Union Eyes platform. Designed for enterprise procurement, SOC 2 compliance, and operational excellence.

**Commitment Level:** Production-grade multi-tenant SaaS  
**Target Audience:** Union CIOs, Procurement Teams, Executive Boards  
**Enforced Through:** Prometheus alerting, incident response, postmortems

---

## Service Tiers

### Tier 1: Critical Services (99.9% Uptime)

**Definition:** Services whose failure blocks core union operations

**Included Services:**
- Web Application (Next.js)
- API Gateway
- Authentication (Clerk)
- Database (Primary PostgreSQL)
- Payment Processing (Stripe integration)

**Excluded from SLA:**
- Scheduled maintenance windows (communicated 72h advance)
- Third-party provider outages (Clerk, Stripe, Cloudflare)
- Force majeure events

**Downtime Budget:**
- **Monthly:** 43.8 minutes
- **Quarterly:** 2.19 hours
- **Annually:** 8.76 hours

---

### Tier 2: Standard Services (99.5% Uptime)

**Definition:** Services whose degradation impacts user experience but not critical operations

**Included Services:**
- Analytics Dashboard
- Document/CBA Management
- Email Notifications
- Mobile Application
- Reporting Engine

**Downtime Budget:**
- **Monthly:** 3.65 hours
- **Quarterly:** 10.95 hours
- **Annually:** 43.8 hours

---

### Tier 3: Best-Effort Services (99.0% Uptime)

**Definition:** Non-critical features and experimental functionality

**Included Services:**
- AI-powered CBA search
- Advanced analytics (predictive models)
- Integration with experimental partners
- Developer sandbox environment

**Downtime Budget:**
- **Monthly:** 7.3 hours
- **Quarterly:** 21.9 hours
- **Annually:** 87.6 hours

---

## Service Level Indicators (SLIs)

### 1. Availability SLI

**Definition:** Percentage of successful HTTP requests (non-5xx) over measurement window

**Measurement:**
```
Availability = (Successful Requests / Total Requests) × 100
```

**Thresholds:**
- **Healthy:** ≥ 99.95%
- **Warning:** 99.9% - 99.95%
- **Critical:** < 99.9%

**Data Source:** Prometheus `http_request_duration_seconds` histogram
**Calculation Window:** Rolling 4-week period
**Exclusions:**
- Health check endpoints (skew success rate)
- Known client errors (4xx)
- Rate-limited requests (429)

---

### 2. Latency SLI

**Definition:** Percentage of requests completed within target latency

**Thresholds by Tier:**

| Service Tier | P50 Target | P95 Target | P99 Target |
|--------------|------------|------------|------------|
| Critical (API) | < 200ms | < 800ms | < 2s |
| Standard (Dashboard) | < 500ms | < 2s | < 5s |
| Best-Effort (Analytics) | < 1s | < 5s | < 10s |

**Measurement:**
```
Latency SLI = (Requests < Target Latency / Total Requests) × 100
```

**Data Source:** Prometheus `http_request_duration_seconds` quantiles
**Calculation Window:** Rolling 7-day period
**Exclusions:**
- First request after deployment (cold start)
- Admin export operations (known slow queries)

---

### 3. Error Rate SLI

**Definition:** Percentage of requests returning errors

**Thresholds:**
- **Healthy:** < 0.1% error rate
- **Warning:** 0.1% - 0.5%
- **Critical:** > 0.5%

**Measurement:**
```
Error Rate = (5xx Responses / Total Requests) × 100
```

**Data Source:** Prometheus `http_requests_total{status=~"5.."}` counter
**Calculation Window:** Rolling 1-hour period
**Exclusions:**
- 429 (rate limiting) - counted separately
- 503 during known maintenance

---

### 4. Data Durability SLI

**Definition:** Percentage of data write operations successfully persisted

**Target:** 99.999% (Five nines)

**Measurement:**
```
Durability = (Successful Commits / Total Writes) × 100
```

**Data Source:** PostgreSQL commit logs, WAL monitoring
**Calculation Window:** Daily
**Failure Scenarios:**
- Database crash before commit
- Replication lag > 10 seconds
- Data loss during backup/restore

**Recovery Point Objective (RPO):** 15 minutes (via WAL archiving)

---

### 5. Backup Success SLI

**Definition:** Percentage of scheduled backups completing successfully

**Target:** 100% (Zero tolerance for failures)

**Measurement:**
- Database backups: Every 6 hours
- Blob storage backups: Daily
- Backup verification: Weekly restore test

**Data Source:** Backup logs, `backup-drill.yml` workflow
**Alert Threshold:** Single backup failure triggers page

---

## Service Level Objectives (SLOs)

### Critical Tier SLOs

| SLO | Target | Measurement Window | Consequence |
|-----|--------|-------------------|-------------|
| Availability | 99.9% | Monthly | Error budget consumed |
| API Latency (P95) | < 800ms | Weekly | Performance incident |
| Error Rate | < 0.1% | Hourly | Immediate investigation |
| Database Write Durability | 99.999% | Daily | Data integrity incident |
| Mean Time to Recovery (MTTR) | < 1 hour | Per incident | Incident review |

### Standard Tier SLOs

| SLO | Target | Measurement Window | Consequence |
|-----|--------|-------------------|-------------|
| Availability | 99.5% | Monthly | Error budget consumed |
| Dashboard Load Time (P95) | < 2s | Daily | UX degradation notice |
| Email Delivery Rate | 99% | Daily | Notification backlog alert |

### Best-Effort SLOs

| SLO | Target | Measurement Window | Consequence |
|-----|--------|-------------------|-------------|
| Availability | 99.0% | Monthly | Review in postmortem |
| Feature Latency (P95) | < 5s | Weekly | Optimization backlog |

---

## Error Budget Policy

### Error Budget Definition

**Formula:**
```
Error Budget = (1 - SLO Target) × Measurement Window

Example (Critical Tier, Monthly):
Error Budget = (1 - 0.999) × 30 days × 24 hours × 60 minutes
             = 0.001 × 43,200 minutes
             = 43.2 minutes of allowed downtime per month
```

### Error Budget Consumption

**What Consumes Budget:**
- Unplanned outages
- Degraded performance (latency above threshold)
- Elevated error rates
- Failed deployments causing rollback

**What Does NOT Consume Budget:**
- Scheduled maintenance (announced 72h prior)
- Third-party outages (Clerk, Stripe, AWS)
- Client-side errors (4xx)
- Rate limiting (429)

---

### Error Budget States

#### 🟢 Healthy (> 50% budget remaining)

**Actions Permitted:**
- Deploy new features weekly
- Aggressive performance optimizations
- Experimental feature rollouts
- Database schema migrations

**Deployment Policy:** Standard CI/CD pipeline

**Monitoring:** Routine

---

#### 🟡 Warning (25% - 50% budget remaining)

**Actions Required:**
- Increase deployment review (require 2 approvals)
- Pause non-critical feature work
- Focus on reliability improvements
- Enhanced monitoring (5-minute alert windows)

**Deployment Policy:** 
- Deploy only critical bugs/security fixes
- Require manual approval from on-call engineer
- Canary deployments mandatory (10% traffic for 30 minutes)

**Communication:** Weekly SLO report to leadership

---

#### 🔴 Critical (< 25% budget remaining)

**Actions Required:**
- **FREEZE:** No feature deployments
- All engineering effort on reliability
- Daily SLO war room
- Root cause analysis for all incidents
- Defer product roadmap items

**Deployment Policy:**
- Only SEV-1 incidents and security patches
- Require CTO approval
- 4-hour canary deployment minimum
- Rollback plan documented before deploy

**Communication:**
- Daily executive summary
- Transparency report to affected customers
- Postmortem published to status page

**Exit Criteria:**
- Error budget replenished above 50% (next measurement window)
- All root causes remediated
- Incident review completed

---

#### ❌ Budget Exhausted (0% remaining)

**Actions Required:**
- **FULL FREEZE:** No deployments except emergency fixes
- Incident Commander assigned
- 24/7 on-call rotation activated
- External customer notification within 4 hours

**Financial Impact:**
- SLA credit consideration for affected customers
- Potential contract penalties (if applicable)

**Recovery Plan:**
- Focus solely on stability
- Cancel or postpone feature releases
- Wait for measurement window rollover
- Publish detailed postmortem

---

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)

### Critical Services

| Service | RTO (Target) | RPO (Max Data Loss) | Recovery Strategy |
|---------|--------------|---------------------|-------------------|
| Web Application | 15 minutes | 0 (stateless) | Blue/green deployment rollback |
| API Gateway | 10 minutes | 0 (stateless) | Auto-scaling + failover |
| Database (Primary) | 30 minutes | 15 minutes | WAL-based PITR (point-in-time recovery) |
| Database (Read Replica) | 5 minutes | 5 minutes | Promote replica to primary |
| Authentication | N/A (external) | N/A | Clerk's SLA (99.99%) |
| Payment Processing | N/A (external) | N/A | Stripe's SLA (99.99%) |

### Standard Services

| Service | RTO (Target) | RPO (Max Data Loss) | Recovery Strategy |
|---------|--------------|---------------------|-------------------|
| Document Storage | 1 hour | 24 hours | Restore from daily backup |
| Email Queue | 2 hours | 1 hour | Redis persistence replay |
| Analytics Database | 4 hours | 24 hours | Rebuild from source data |

---

## Incident Severity Classification

### SEV-1: CRITICAL 🔴

**Definition:** Complete service outage or critical data loss

**Examples:**
- Application down for all users
- Database corruption
- Payment processing failure
- Security breach

**Response Time:** 15 minutes  
**Communication:** Executive leadership + affected customers (hourly updates)  
**On-Call:** Page entire team  
**Error Budget:** Consumes 1 minute per 1 minute of downtime

---

### SEV-2: HIGH 🟠

**Definition:** Major feature degraded or subset of users affected

**Examples:**
- API latency > 5s (P95)
- Mobile app down (web still functional)
- One region down (multi-region setup)
- Data export failing

**Response Time:** 30 minutes  
**Communication:** Status page update  
**On-Call:** Page primary responder  
**Error Budget:** Consumes 0.5 minutes per 1 minute of degradation

---

### SEV-3: MODERATE 🟡

**Definition:** Minor feature degraded, workaround available

**Examples:**
- Dashboard slow but functional
- Non-critical API endpoint error rate > 1%
- Email delays (< 30 minutes)
- Analytics stale data (> 1 hour lag)

**Response Time:** 2 hours (business hours)  
**Communication:** Internal Slack notification  
**On-Call:** Not paged (unless after-hours)  
**Error Budget:** Consumes 0.1 minutes per 1 minute

---

### SEV-4: LOW 🟢

**Definition:** Cosmetic issue, no functional impact

**Examples:**
- UI alignment bug
- Broken icon
- Typo in notification
- Non-functional help link

**Response Time:** Next business day  
**Communication:** Ticket created  
**On-Call:** None  
**Error Budget:** No consumption

---

## Monitoring & Alerting

### Real-Time Monitoring

**Tools:**
- Prometheus (metrics collection)
- Grafana (visualization)
- Sentry (error tracking)
- Loki (log aggregation)
- AlertManager (alert routing)

**Key Dashboards:**
- SLA Compliance Dashboard (current vs. target)
- Error Budget Burn Rate (projected exhaustion date)
- Latency Heatmaps (P50/P95/P99)
- Deployment Impact (before/after charts)

---

### Alert Routing

| Alert Type | Severity | Notification Channel | Response Time |
|------------|----------|---------------------|---------------|
| SLO Breach | Critical | PagerDuty (page all) | 15 min |
| Error Budget Warning (50%) | High | Slack #on-call | 30 min |
| Deployment Failure | High | PagerDuty (primary) | 30 min |
| Backup Failure | High | PagerDuty + Email | 1 hour |
| Performance Degradation | Moderate | Slack #engineering | 2 hours |
| Low Traffic Anomaly | Low | Email (daily digest) | Next day |

---

### SLA Recording Rules

**Prometheus Recording Rules:** `monitoring/prometheus/alerts/sla-recording-rules.yml`

```yaml
groups:
  - name: sla_calculations
    interval: 1m
    rules:
      - record: sla:availability:4w
        expr: |
          (
            sum(rate(http_requests_total{status!~"5.."}[4w]))
            /
            sum(rate(http_requests_total[4w]))
          ) * 100

      - record: sla:error_budget_remaining:4w
        expr: |
          (43.8 - (43200 - sum(up[4w]) / 60)) / 43.8 * 100
```

**Alert Rules:** `monitoring/prometheus/alerts/sla-alerts.yml`

```yaml
groups:
  - name: sla_alerts
    rules:
      - alert: SLOBreach
        expr: sla:availability:4w < 99.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SLA breached ({{ $value }}%)"

      - alert: ErrorBudgetCritical
        expr: sla:error_budget_remaining:4w < 25
        for: 15m
        labels:
          severity: high
        annotations:
          summary: "Error budget critical ({{ $value }}% remaining)"
```

---

## Deployment Impact on SLAs

### Pre-Deployment Requirements

**Checklist (Critical Tier):**
- [ ] Error budget > 25%
- [ ] Load test passed (no latency regression)
- [ ] Rollback plan documented
- [ ] Canary deployment strategy defined
- [ ] On-call engineer confirmed available
- [ ] Database migration tested on staging
- [ ] Feature flags enabled (gradual rollout)

**If Error Budget < 25%:** Require CTO approval + justification

---

### Deployment Windows

**Preferred Times (Lowest Traffic):**
- Tuesday - Thursday, 10:00 AM - 2:00 PM ET
- Avoid: Monday mornings, Friday afternoons, weekends

**Blackout Windows (No Deployments):**
- First week of month (union board meetings)
- Last week of quarter (financial close)
- Major holidays (US/Canada)

---

### Post-Deployment Monitoring

**Mandatory Observation Period:** 30 minutes

**Metrics to Monitor:**
- Error rate (< 0.1% increase)
- Latency P95 (< 10% increase)
- Database query time (< 20% increase)
- Memory utilization (< 80% of capacity)

**Automatic Rollback Triggers:**
- Error rate > 1% for 5 minutes
- Latency P95 > 2x baseline for 10 minutes
- 3+ critical errors in Sentry within 15 minutes

---

## Customer Communication

### Status Page

**URL:** `status.unioneyes.com` (recommended)

**Published Metrics:**
- Current status (operational / degraded / outage)
- Uptime percentage (last 90 days)
- Incident history (last 6 months)
- Scheduled maintenance calendar

**Update Frequency (During Incident):**
- SEV-1: Every 30 minutes
- SEV-2: Every 2 hours
- SEV-3: Initial + resolution

---

### SLA Credit Policy (Enterprise Tier)

**Eligibility:**
- Customer on annual enterprise contract
- Downtime > monthly error budget (43.8 minutes)
- Customer must request credit within 30 days

**Credit Calculation:**
```
Credit = (Monthly Fee × Downtime Percentage) × Credit Multiplier

Credit Multipliers:
- 99.9% - 99.0% availability: 10% of monthly fee
- 99.0% - 95.0% availability: 25% of monthly fee
- < 95.0% availability: 50% of monthly fee
```

**Maximum Credit:** 50% of monthly fees

**Example:**
- Monthly Fee: $5,000
- Availability: 99.7% (downtime: 2.16 hours)
- Exceeds budget by: 2.16h - 0.73h = 1.43 hours
- Credit Multiplier: 10%
- Credit: $5,000 × 0.001 × 10 = $500

---

## On-Call Rotation

### Responsibilities

**Primary On-Call:**
- Respond to pages within 15 minutes
- Triage incidents (assign severity)
- Initiate incident response
- Update status page
- Lead postmortem

**Secondary On-Call:**
- Respond to escalations within 30 minutes
- Support primary during SEV-1
- Take over if primary unavailable

**Coverage:**
- 24/7/365 rotation
- 1-week shifts (Monday-Monday)
- Minimum 2 engineers per shift

---

### Escalation Path

```
1. Primary On-Call (0-15 min)
   ↓
2. Secondary On-Call (15-30 min)
   ↓
3. Engineering Manager (30-60 min)
   ↓
4. CTO (1+ hour, SEV-1 only)
```

---

## Disaster Recovery

### Disaster Scenarios

| Scenario | Likelihood | Impact | Recovery Strategy |
|----------|------------|--------|-------------------|
| Database corruption | Low | Critical | PITR restore from WAL (< 30 min) |
| Region failure (AWS) | Low | Critical | Failover to secondary region (< 1 hour) |
| Ransomware attack | Very Low | Critical | Restore from offline backups (< 4 hours) |
| Complete AWS outage | Very Low | Critical | Migrate to Azure (disaster recovery datacenter) |
| GitHub/Vercel outage | Low | High | Deploy from local artifacts to Azure |

---

### Business Continuity Plan

**Critical Functions:**
- Member authentication
- Claims submission
- Voting (during active elections)
- Payment processing

**Minimum Viable Service:**
- Web app (read-only mode)
- Member login (cached auth)
- View existing claims (no new submissions)
- Emergency notifications (SMS/email)

**Activation Trigger:**
- Expected downtime > 4 hours
- Critical service unavailable with no ETA

---

## Postmortem Process

### When Required

- All SEV-1 incidents
- SEV-2 incidents lasting > 2 hours
- Any incident consuming > 10% of error budget
- Near-misses (avoided outage by luck)

---

### Postmortem Template

**Document Structure:**
1. **Incident Summary** (2-3 sentences)
2. **Timeline of Events** (chronological)
3. **Root Cause Analysis** (5 Whys)
4. **Impact Assessment** (affected users, error budget)
5. **What Went Well** (positive observations)
6. **What Went Wrong** (honest reflection)
7. **Action Items** (SMART goals with owners)

**Distribution:**
- Published to internal wiki within 5 business days
- Executive summary to leadership
- External version for enterprise customers (if applicable)

---

### Blameless Culture

**Principles:**
- Focus on systems, not individuals
- Assume good intentions
- Learn from failures
- No punishment for honest mistakes
- Celebrate transparency

**Forbidden Terms:**
- "Human error" (without systemic analysis)
- "Should have known better"
- Personal blame

---

## SLA Review Process

### Quarterly Review

**Participants:**
- Engineering team
- Product management
- Customer success
- Executive leadership

**Agenda:**
1. Review SLO performance (vs. targets)
2. Assess error budget consumption patterns
3. Analyze incident trends
4. Review customer feedback
5. Propose SLA/SLO adjustments

**Output:**
- Updated SLA targets (if needed)
- Engineering priorities (reliability work)
- Process improvements

---

### Annual Review

**Scope:**
- Full audit of all SLIs/SLOs
- Review deployment impact on reliability
- Assess RTO/RPO alignment with business needs
- Update disaster recovery plan
- Benchmark against industry standards

---

## Appendix A: Industry Benchmarks

| Provider | Service | SLA Target | Actual (Public Data) |
|----------|---------|------------|----------------------|
| Stripe | Payment API | 99.99% | 99.997% (2025) |
| Clerk | Authentication | 99.99% | 99.98% (2025) |
| AWS RDS | PostgreSQL | 99.95% (multi-AZ) | 99.97% (2025) |
| Vercel | Edge Network | 99.99% | 99.995% (2025) |
| Union Eyes | Platform | 99.9% (target) | TBD (new baseline) |

---

## Appendix B: Calculation Examples

### Example 1: Monthly Availability

**Data:**
- Total minutes in month: 43,200
- Downtime: 25 minutes (2 incidents)

**Calculation:**
```
Availability = (43,200 - 25) / 43,200 × 100
             = 43,175 / 43,200 × 100
             = 99.942%
```

**Result:** ✅ Within 99.9% SLA (18.8 minutes of budget remaining)

---

### Example 2: Error Budget Burn Rate

**Scenario:** Current month (15 days in)
- Downtime so far: 30 minutes
- Error budget: 43.8 minutes/month

**Burn Rate:**
```
Current Burn = 30 / 43.8 = 68.5% of budget consumed
Days Remaining = 15
Projected Total = (30 / 15) × 30 = 60 minutes
```

**Forecast:** ❌ Will exceed budget by ~16 minutes (deploy freeze triggered)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-14 | Platform Engineering | Initial SLA policy |

---

## Approval

**Prepared by:** Platform Engineering Team  
**Reviewed by:** CTO, VP Engineering, Product Lead  
**Approved for:** Enterprise Contracts, SOC 2 Audit, Union Procurement  

**Next Review:** May 14, 2026 (Quarterly)

---

## Contact

**SLA Questions:** sre-team@unioneyes.com  
**Incident Escalation:** +1-XXX-XXX-XXXX (PagerDuty)  
**Customer Support:** support@unioneyes.com
