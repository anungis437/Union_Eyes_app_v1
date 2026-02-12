# Phase 2 Operations Runbooks - Index

**Created:** February 12, 2026  
**Version:** 2.0  
**Status:** ✅ Complete

---

## Overview

This directory contains institutional-grade operational runbooks for Union Eyes platform operations. These runbooks are designed to be actionable at 3 AM during incidents and reference existing infrastructure.

---

## Runbooks

### 1. [Incident Response](./incident-response.md) 🚨

**Purpose:** Detect, triage, respond to, and resolve production incidents

**When to Use:**
- Production alert received
- Service degradation detected
- User-reported outages
- Security incidents
- Any abnormal system behavior

**Key Sections:**
- Incident severity classification (SEV-1 through SEV-4)
- Response team roles and responsibilities
- Detection using Prometheus/Grafana/Loki
- Triage procedures with decision trees
- 6 detailed incident playbooks
- Communication templates
- Post-incident review process

**Quick Access:**
- [Severity Classification](./incident-response.md#incident-severity-classification)
- [Playbook 1: Application Down](./incident-response.md#playbook-1-application-down)
- [Playbook 2: Database Failure](./incident-response.md#playbook-2-database-failure)
- [Communication Templates](./incident-response.md#communication-templates)

---

### 2. [Rollback Procedures](./rollback.md) ⏪

**Purpose:** Safely rollback deployments and database migrations

**When to Use:**
- Deployment caused production incident
- Critical bug discovered post-deployment
- Database migration caused issues
- Performance degradation after release
- Forward fix not available quickly

**Key Sections:**
- Rollback decision framework and risk assessment
- Database migration rollback (references `db/migrations/rollback/`)
- Application deployment rollback (blue-green, Azure, Docker)
- Known rollback scenarios with playbooks
- Emergency procedures
- Verification steps

**Quick Access:**
- [Rollback Decision Tree](./rollback.md#rollback-decision-framework)
- [Database Migration Rollback](./rollback.md#database-migration-rollback)
- [Blue-Green Deployment Rollback](./rollback.md#blue-green-deployment-rollback)
- [Verification Procedures](./rollback.md#verification-procedures)

---

### 3. [Backup & Restore](./backup-restore.md) 💾

**Purpose:** Ensure data durability and rapid recovery from disasters

**When to Use:**
- Disaster recovery (data center failure)
- Database corruption detected
- Accidental data deletion
- Ransomware incident
- Data restoration needs
- Backup verification (weekly drills)

**Key Sections:**
- 3-2-1 backup strategy (30-day retention)
- Automated backup procedures (references `scripts/backup-restore-drill.ps1`)
- Backup verification (weekly drills via GitHub Actions)
- Full database restore procedures
- Point-in-time restore (PITR)
- Disaster recovery scenarios

**Quick Access:**
- [Backup Schedule](./backup-restore.md#backup-schedule-and-retention)
- [Full Database Restore](./backup-restore.md#full-database-restore)
- [Disaster Recovery Scenarios](./backup-restore.md#disaster-recovery-scenarios)
- [Weekly Verification Drill](./backup-restore.md#automated-verification-weekly-drill)

---

## Quick Start Guide

### During an Incident

```powershell
# 1. ASSESS SEVERITY
# SEV-1: All users down → Page everyone immediately
# SEV-2: Major degradation → Page on-call + backup
# SEV-3: Partial issue → On-call investigates

# 2. CHECK DASHBOARDS
open http://localhost:3001  # Grafana
open http://localhost:9090  # Prometheus

# 3. CHECK APPLICATION
curl https://unioneyes.azurewebsites.net/api/health
docker ps -a
docker logs --tail 100 unioneyes-app-prod

# 4. IF RECENT DEPLOYMENT - CONSIDER ROLLBACK
.\scripts\deploy-blue-green.ps1 -Action rollback

# 5. FOLLOW APPROPRIATE PLAYBOOK
# See: incident-response.md
```

### During Rollback

```powershell
# APPLICATION ROLLBACK (Blue-Green)
.\scripts\deploy-blue-green.ps1 -Action rollback

# DATABASE MIGRATION ROLLBACK
psql $env:DATABASE_URL -f "db\migrations\rollback\[number]_rollback.sql"

# VERIFY ROLLBACK
.\scripts\verify-rollback.ps1 -Environment production
```

### During Restore

```powershell
# DOWNLOAD BACKUP
az storage blob download `
    --account-name unioneyesbackups `
    --container-name database-backups `
    --name [backup_file] `
    --file ./restore-backup.sql

# RESTORE DATABASE
psql $env:DATABASE_URL -f ./restore-backup.sql

# VERIFY RESTORATION
psql $env:DATABASE_URL -c "SELECT count(*) FROM users;"
```

---

## Infrastructure References

### Existing Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `backup-restore-drill.ps1` | Automated backup/verify/restore | [`scripts/`](../../scripts/backup-restore-drill.ps1) |
| `deploy-blue-green.ps1` | Blue-green deployment/rollback | [`scripts/`](../../scripts/deploy-blue-green.ps1) |
| `verify-rollback.ps1` | Post-rollback verification | `scripts/` (created) |

### Existing Configuration

| File | Purpose | Location |
|------|---------|----------|
| `docker-compose.observability.yml` | Monitoring stack config | [Root](../../docker-compose.observability.yml) |
| `docker-compose.blue-green.yml` | Blue-green deployment config | [Root](../../docker-compose.blue-green.yml) |
| `docker-compose.prod.yml` | Production deployment config | [Root](../../docker-compose.prod.yml) |
| `prometheus/alerts.yml` | Alert rules | [`monitoring/prometheus/`](../../monitoring/prometheus/alerts.yml) |

### Monitoring Stack

| Service | URL | Purpose |
|---------|-----|---------|
| Prometheus | http://localhost:9090 | Metrics collection |
| Grafana | http://localhost:3001 | Dashboards |
| Loki | - | Log aggregation |
| AlertManager | - | Alert routing |

### GitHub Actions

| Workflow | Purpose | Location |
|----------|---------|----------|
| `azure-deploy.yml` | Production deployments | [`.github/workflows/`](../../.github/workflows/azure-deploy.yml) |
| `backup-drill.yml` | Weekly backup verification | [`.github/workflows/`](../../.github/workflows/backup-drill.yml) |

### Database Migrations

| Component | Location | Purpose |
|-----------|----------|---------|
| Forward migrations | `db/migrations/` | Database schema changes |
| Rollback scripts | `db/migrations/rollback/` | Reverse schema changes |

---

## Emergency Contacts

```
On-Call Engineer: [PagerDuty/Phone]
Backup Engineer: [PagerDuty/Phone]
Engineering Manager: [Phone]
DBA: [Phone/Email]

Azure Support: [Support Contract]
GitHub Support: [Enterprise Support if applicable]

Status Page: [URL]
Incident Channel: #incidents (Slack/Teams)
War Room: [Teams/Zoom link]
```

---

## Runbook Maintenance

### Review Schedule

- **Quarterly Review:** Update procedures, validate commands
- **Post-Incident:** Update relevant runbook with lessons learned
- **After Infrastructure Changes:** Update commands and references
- **Annual Audit:** Complete review and test all procedures

### Next Review Dates

- **Incident Response:** May 12, 2026
- **Rollback Procedures:** May 12, 2026
- **Backup & Restore:** May 12, 2026

### Maintenance Checklist

- [ ] All commands tested and working
- [ ] Links to files/scripts are valid
- [ ] Contact information is current
- [ ] Integration with monitoring stack verified
- [ ] GitHub Actions workflows validated
- [ ] Scripts referenced exist and work
- [ ] Emergency procedures tested in drill
- [ ] Team has reviewed and trained on procedures

---

## Training and Drills

### Required Training

| Runbook | Frequency | Audience | Method |
|---------|-----------|----------|--------|
| Incident Response | Quarterly | All engineers | Tabletop exercise |
| Rollback Procedures | Monthly | On-call rotation | Live drill (staging) |
| Backup & Restore | Weekly | DevOps team | Automated + monthly manual |

### Drill Schedule

| Drill Type | Frequency | Last Completed | Next Scheduled |
|------------|-----------|----------------|----------------|
| **Weekly Backup Verification** | Every Sunday 4 AM | Auto (GitHub Actions) | Next Sunday |
| **Monthly Rollback Drill** | First Monday | TBD | TBD |
| **Quarterly DR Exercise** | Q1, Q2, Q3, Q4 | TBD | Q2 2026 |
| **Annual Chaos Engineering** | Annually | TBD | TBD |

---

## Success Metrics

### Operational Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **MTTD** (Mean Time To Detect) | < 5 min | - | 🔵 Track |
| **MTTA** (Mean Time To Acknowledge) | < 5 min | - | 🔵 Track |
| **MTTR** (Mean Time To Resolve) | < 1 hour (SEV-1) | - | 🔵 Track |
| **Backup Success Rate** | 100% | - | 🔵 Track |
| **Backup Verification Pass Rate** | 100% | - | 🔵 Track |
| **RTO** (Recovery Time Objective) | < 4 hours | - | 🔵 Track |
| **RPO** (Recovery Point Objective) | < 6 hours | - | 🔵 Track |
| **Runbook Usage During Incidents** | 100% | - | 🔵 Track |

---

## Related Documentation

- **Disaster Recovery:** [`../disaster-recovery/force-majeure-plan.md`](../disaster-recovery/force-majeure-plan.md)
- **Security:** [`../security/`](../security/)
- **Architecture:** [`../architecture/`](../architecture/)
- **API Documentation:** [`../api/`](../api/)

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | 2026-02-12 | Complete Phase 2 runbooks created | DevOps Team |
| 1.0 | 2025-XX-XX | Initial drafts | DevOps Team |

---

## Feedback and Improvements

These runbooks are living documents. If you:
- Find errors or outdated information
- Encounter scenarios not covered
- Have suggestions for improvements
- Complete a drill with lessons learned

Please:
1. Create issue in repository with label `runbook-improvement`
2. Or submit PR with proposed changes
3. Or notify DevOps team in #devops channel

**Remember:** These runbooks save time in emergencies. Keep them updated!

---

**"Hope is not a strategy. Preparation is."**

*Practice makes perfect. Drill these procedures regularly.*
