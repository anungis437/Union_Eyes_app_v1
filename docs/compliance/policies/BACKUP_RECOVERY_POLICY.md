# Backup and Recovery Policy

**Document Version:** 1.0  
**Effective Date:** January 2025  
**Owner:** IT Operations Team  
**Review Schedule:** Annual  
**SOC-2 Controls:** A1.2, A1.3

## 1. Purpose and Scope

### 1.1 Purpose
This policy establishes comprehensive backup and disaster recovery procedures to ensure business continuity, protect against data loss, and maintain operational resilience. The policy defines backup schedules, retention periods, recovery objectives, and testing requirements.

### 1.2 Scope
This policy applies to:
- **All production systems**: Databases, applications, file storage
- **All data classifications**: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
- **All organizational levels**: Congress, federations, unions, locals
- **All environments**: Production (mandatory), staging (recommended), development (optional)

### 1.3 Objectives
- **Minimize data loss**: Recovery Point Objective (RPO) ≤ 24 hours
- **Minimize downtime**: Recovery Time Objective (RTO) ≤ 4 hours for critical systems
- **Ensure compliance**: Meet SOC-2, PIPEDA, and industry requirements
- **Maintain integrity**: Verify backup completeness and recoverability

## 2. Recovery Objectives

### 2.1 Recovery Time Objective (RTO)

**Definition**: Maximum acceptable time to restore service after an outage.

| System Tier | RTO | Business Impact |
|-------------|-----|-----------------|
| **Critical** (Production DB, Authentication) | 4 hours | Major financial/operational impact |
| **High** (API, Web App, File Storage) | 8 hours | Significant user disruption |
| **Medium** (Reporting, Analytics) | 24 hours | Moderate impact, workarounds exist |
| **Low** (Archival, Development) | 72 hours | Minimal impact |

### 2.2 Recovery Point Objective (RPO)

**Definition**: Maximum acceptable data loss measured in time.

| Data Type | RPO | Backup Frequency |
|-----------|-----|------------------|
| **Transactional Data** (Claims, Payments) | 24 hours | Daily incremental |
| **Member Data** (PII, Profiles) | 24 hours | Daily incremental |
| **Documents** (CBAs, Grievances) | 24 hours | Continuous (blob storage) |
| **Configuration** (App settings, Secrets) | 1 hour | Version-controlled + Azure Key Vault |
| **Audit Logs** | 1 hour | Real-time replication |

### 2.3 RTO/RPO by Disaster Scenario

| Scenario | Data Loss (RPO) | Recovery Time (RTO) | Probability |
|----------|----------------|---------------------|-------------|
| **Accidental deletion** | <1 hour (point-in-time restore) | 1 hour | Medium |
| **Database corruption** | 24 hours (last daily backup) | 4 hours | Low |
| **Ransomware attack** | 24-48 hours (clean backup) | 8 hours | Medium |
| **Azure region outage** | <1 hour (geo-replication) | 4 hours (failover) | Very low |
| **Complete infrastructure loss** | 24 hours (offsite backup) | 24 hours (rebuild) | Very low |

## 3. Backup Strategy

### 3.1 Backup Types

**Full Backup**:
- **Frequency**: Weekly (Sunday 2:00 AM ET)
- **Scope**: Complete snapshot of all databases, files, configurations
- **Duration**: ~4-6 hours (150 GB database, 500 GB file storage)
- **Retention**: 4 weekly backups (28 days)

**Incremental Backup**:
- **Frequency**: Daily (11:00 PM ET, Mon-Sat)
- **Scope**: Changes since last backup (full or incremental)
- **Duration**: ~30-60 minutes (typical 5-10 GB daily changes)
- **Retention**: 7 daily backups (1 week)

**Transaction Log Backup** (databases only):
- **Frequency**: Every 15 minutes
- **Scope**: Database transaction logs (point-in-time recovery)
- **Duration**: <5 minutes per backup
- **Retention**: 7 days

**Continuous Backup** (Azure Blob Storage):
- **Frequency**: Real-time (object versioning)
- **Scope**: Document uploads, file attachments
- **Retention**: 30 days of versions

### 3.2 Backup Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Production Environment (Azure Canada Central)             │
│  ├─ PostgreSQL Database (Flexible Server)                  │
│  ├─ Azure Blob Storage (Documents)                         │
│  ├─ Azure Key Vault (Secrets)                              │
│  └─ Application Servers (Containerized)                    │
└─────────────────────────────────────────────────────────────┘
           ↓ Daily Backups
┌─────────────────────────────────────────────────────────────┐
│  Primary Backup Storage (Azure Backup - Canada Central)    │
│  ├─ Daily incremental backups (7 days)                     │
│  ├─ Weekly full backups (28 days)                          │
│  └─ Encrypted with customer-managed keys                   │
└─────────────────────────────────────────────────────────────┘
           ↓ Geo-Replication
┌─────────────────────────────────────────────────────────────┐
│  Secondary Backup Storage (Azure Canada East)              │
│  ├─ Real-time replication (async, ~15 min lag)            │
│  ├─ 30-day retention                                        │
│  └─ Used for geo-redundancy and disaster recovery          │
└─────────────────────────────────────────────────────────────┘
           ↓ Monthly Archive
┌─────────────────────────────────────────────────────────────┐
│  Long-Term Archive (Azure Cool/Archive Tier)               │
│  ├─ Monthly full backups (7 years - financial compliance) │
│  ├─ Immutable (WORM - Write Once, Read Many)              │
│  └─ Low-cost storage (~$0.01/GB/month)                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Backup Schedule (Weekly Calendar)

| Day | Time (ET) | Backup Type | Scope | Expected Duration |
|-----|-----------|-------------|-------|-------------------|
| **Sunday** | 2:00 AM | Full Backup | All systems | 4-6 hours |
| **Monday** | 11:00 PM | Incremental | Changes since Sunday | 30-60 min |
| **Tuesday** | 11:00 PM | Incremental | Changes since Monday | 30-60 min |
| **Wednesday** | 11:00 PM | Incremental | Changes since Tuesday | 30-60 min |
| **Thursday** | 11:00 PM | Incremental | Changes since Wednesday | 30-60 min |
| **Friday** | 11:00 PM | Incremental | Changes since Thursday | 30-60 min |
| **Saturday** | 11:00 PM | Incremental | Changes since Friday | 30-60 min |
| **Continuous** | Every 15 min | Transaction Logs | Database changes | <5 min |

**Rationale for Timing**:
- **Sunday 2 AM**: Lowest usage period, minimal impact on performance
- **11 PM daily**: After business hours, before midnight (day boundary)
- **15-minute logs**: Balance between RPO (1 hour) and overhead

## 4. Data Retention

### 4.1 Retention Schedule

| Backup Type | Retention Period | Rationale | Storage Tier |
|-------------|------------------|-----------|--------------|
| **Daily Incremental** | 7 days | Quick restore, operational needs | Hot (online) |
| **Weekly Full** | 28 days (4 weeks) | Monthly recovery, user requests | Hot (online) |
| **Monthly Full** | 1 year | Compliance, audits, annual reviews | Cool (nearline) |
| **Annual Full** | 7 years | Financial records, legal holds, CBA retention | Archive (offline) |

### 4.2 Data-Specific Retention

**Financial Records** (dues, per-capita, remittances):
- **Regulatory Requirement**: 7 years (CRA, PIPEDA)
- **Retention**: 7 years in immutable archive
- **Disposal**: Secure deletion (crypto shred + data wipe)

**Collective Agreements**:
- **Regulatory Requirement**: 10 years (labour law)
- **Retention**: 10 years in immutable archive
- **Disposal**: After 10 years + contract expiry, secure deletion

**Member PII**:
- **Regulatory Requirement**: Reasonable period (PIPEDA)
- **Retention**: While member active + 7 years after separation
- **Disposal**: Member right to erasure (GDPR-style), secure deletion

**Grievances and Arbitrations**:
- **Regulatory Requirement**: Varies by province (typically 7-10 years)
- **Retention**: 10 years in archive
- **Disposal**: Secure deletion after retention period

**Audit Logs**:
- **Regulatory Requirement**: 7 years (SOC-2, financial audits)
- **Retention**: 7 years in immutable archive
- **Disposal**: Secure deletion (cannot be altered retroactively)

**System Logs** (application, security):
- **Regulatory Requirement**: 90 days (SOC-2)
- **Retention**: 1 year (operational best practice)
- **Disposal**: Rolling deletion after 1 year

### 4.3 Legal Holds

When litigation or investigation occurs:
1. **Immediate Action**: Suspend automated deletion for affected data
2. **Scope**: Identify all relevant backups (by date range, data type)
3. **Preservation**: Copy to separate immutable storage
4. **Documentation**: Log hold start date, reason, custodian
5. **Release**: Only after legal counsel approval

## 5. Backup Components

### 5.1 Database Backups (PostgreSQL)

**Backup Method**: Azure Database for PostgreSQL Flexible Server (native backup)

**Configuration**:
- **Backup Redundancy**: Geo-redundant (Canada Central → Canada East)
- **Point-in-Time Restore (PITR)**: 7 days
- **Full Backup Frequency**: Daily (automated)
- **Transaction Log Backup**: Every 5-15 minutes (automated)

**What's Backed Up**:
- All database schemas and tables
- Indexes, constraints, triggers, stored procedures
- User roles and permissions (pg_roles, pg_authid)
- Database configuration (postgresql.conf)

**Encryption**:
- **At Rest**: AES-256 (Azure Storage Service Encryption)
- **In Transit**: TLS 1.2+ (backup transfer to geo-redundant storage)
- **Keys**: Customer-managed keys in Azure Key Vault

**Restore Procedure**:
1. Identify restore point (date/time)
2. Initiate PITR from Azure Portal or CLI
3. Restore to new server instance (avoid overwriting production)
4. Validate data integrity (row counts, checksums)
5. Switch application connection string
6. Total time: ~2-3 hours for 150 GB database

### 5.2 File Storage Backups (Azure Blob Storage)

**Backup Method**: Azure Blob versioning + soft delete

**Configuration**:
- **Versioning**: Enabled (tracks all versions of each blob)
- **Soft Delete**: 30 days (deleted blobs retained for recovery)
- **Geo-Replication**: RA-GRS (Read-Access Geo-Redundant Storage)
- **Immutable Storage**: Enabled for archival containers (WORM policy)

**What's Backed Up**:
- Member document uploads (grievances, contracts, evidence)
- CBA documents (PDF, DOCX)
- Financial reports (CSV, Excel)
- System-generated reports

**Encryption**:
- **At Rest**: AES-256 (SSE-C with customer-managed keys)
- **In Transit**: HTTPS only (enforced at storage account level)

**Restore Procedure**:
1. Identify deleted or corrupted file
2. Retrieve specific version or soft-deleted blob
3. Copy to production container
4. Total time: <30 minutes for individual files

### 5.3 Application Configuration Backups

**Backup Method**: Git version control + Azure Key Vault versioning

**What's Backed Up**:
- **Application Code**: GitHub repository (main branch + tags)
- **Infrastructure as Code**: Terraform/Bicep files (Azure resources)
- **Environment Variables**: Azure Key Vault (secrets, connection strings)
- **Container Images**: Azure Container Registry (tagged images)

**Retention**:
- **Git**: Unlimited (all commits preserved)
- **Key Vault Secrets**: 90 days of versions (soft delete enabled)
- **Container Images**: Last 30 tagged versions

**Restore Procedure**:
1. Checkout specific Git commit or tag
2. Retrieve specific secret version from Key Vault
3. Pull container image by tag
4. Redeploy application (Azure Container Apps)
5. Total time: ~30 minutes for application restore

### 5.4 Audit Log Backups

**Backup Method**: Continuous export to Azure Log Analytics + long-term archive

**Configuration**:
- **Hot Retention**: 90 days in Log Analytics (queryable)
- **Archive Retention**: 7 years in Azure Storage (immutable)
- **Export Frequency**: Real-time streaming (diagnostic settings)

**What's Backed Up**:
- **Signature Audit Log**: All PKI signature events (from Task 4)
- **Organization Audit Log**: All organization changes (create, update, delete)
- **Access Logs**: Authentication events (Clerk logs)
- **System Logs**: Application errors, performance metrics (Sentry, Azure Monitor)

**Immutability**: Archive storage uses WORM policy (no modifications/deletions)

**Restore Procedure**:
1. Query Log Analytics for recent logs (<90 days)
2. Retrieve from archive storage for older logs (>90 days)
3. Restore to database table or export to CSV
4. Total time: <1 hour for log retrieval

## 6. Disaster Recovery Plan

### 6.1 Disaster Scenarios

**Scenario 1: Database Corruption**
- **Trigger**: Application bug causes invalid data writes
- **Detection**: Automated data integrity checks, user reports
- **Response**:
  1. Identify corruption scope (affected tables, time range)
  2. Stop writes to affected tables (read-only mode)
  3. Restore database to last known good backup (PITR)
  4. Replay transaction logs up to corruption point
  5. Validate data integrity
  6. Resume normal operations
- **RTO**: 4 hours
- **RPO**: <1 hour (transaction log replay)

**Scenario 2: Ransomware Attack**
- **Trigger**: Malware encrypts database or file storage
- **Detection**: Anomaly detection (mass file changes, failed decryptions)
- **Response**:
  1. Isolate infected systems (network segmentation)
  2. Identify last clean backup (before infection)
  3. Restore from immutable backup (WORM storage)
  4. Scan restored data for malware
  5. Strengthen access controls (revoke compromised credentials)
  6. Notify members and authorities (PIPEDA breach notification)
- **RTO**: 8 hours
- **RPO**: 24-48 hours (last clean backup)

**Scenario 3: Azure Region Outage**
- **Trigger**: Azure Canada Central region failure (power, network, etc.)
- **Detection**: Azure status dashboard, application health checks
- **Response**:
  1. Confirm outage scope and estimated restoration time
  2. Initiate geo-failover to Canada East region
  3. Update DNS records (CNAME to Canada East endpoint)
  4. Restore from geo-replicated backup
  5. Monitor application performance in secondary region
  6. Failback to primary region after restoration
- **RTO**: 4 hours (automated failover + DNS propagation)
- **RPO**: <1 hour (geo-replication lag)

**Scenario 4: Accidental Data Deletion**
- **Trigger**: User or admin mistakenly deletes records
- **Detection**: User reports missing data
- **Response**:
  1. Identify deleted data (user ID, entity type, timestamp)
  2. Check soft delete retention (blob storage, database logical delete)
  3. Restore from daily incremental backup if outside soft delete window
  4. Merge restored data into production (avoid duplicates)
  5. Audit user permissions (prevent future accidents)
- **RTO**: 1 hour
- **RPO**: <1 hour (soft delete) or 24 hours (daily backup)

**Scenario 5: Complete Infrastructure Loss**
- **Trigger**: Catastrophic event (natural disaster, cyberattack, provider bankruptcy)
- **Detection**: Total service unavailability
- **Response**:
  1. Activate Disaster Recovery Team (DRT)
  2. Provision new Azure subscription or migrate to AWS/GCP
  3. Deploy infrastructure from Terraform/Bicep templates
  4. Restore database from geo-redundant or offline backup
  5. Restore file storage from geo-redundant or offline backup
  6. Retrieve secrets from offline key escrow
  7. Update DNS to point to new infrastructure
  8. Notify members of service restoration
- **RTO**: 24 hours
- **RPO**: 24 hours (last daily backup)

### 6.2 Disaster Recovery Team (DRT)

**Roles and Responsibilities**:

| Role | Primary Contact | Backup Contact | Responsibilities |
|------|----------------|----------------|------------------|
| **DR Coordinator** | CTO | VP Engineering | Overall recovery coordination, communication |
| **Database Admin** | Senior DBA | DevOps Lead | Database restore, integrity checks |
| **Infrastructure Lead** | Cloud Architect | DevOps Lead | Azure resource provisioning, network config |
| **Application Lead** | Lead Developer | Senior Developer | Application deployment, testing |
| **Security Lead** | Security Officer | CISO | Access control, encryption keys, audit logging |
| **Communications Lead** | Customer Success Manager | CEO | Member communication, status updates |

**Escalation Path**:
1. **Incident Detected** → On-call engineer (PagerDuty alert)
2. **Severity Assessment** → DR Coordinator (within 15 minutes)
3. **DR Plan Activation** → Activate DRT (Critical/High severity)
4. **Executive Notification** → CEO/COO (within 1 hour for Critical incidents)
5. **Member Notification** → Communications Lead (within 2 hours for user-impacting outages)

### 6.3 Communication Plan

**Internal Communication** (DRT):
- **Platform**: Microsoft Teams (dedicated "DR-Incident" channel)
- **Frequency**: Status updates every 30 minutes during active recovery
- **Artifacts**: Shared recovery checklist (Microsoft Loop)

**Member Communication**:
- **Platform**: Email (mass notification), website banner, Twitter/X
- **Initial Notification**: Within 2 hours of service disruption
- **Status Updates**: Every 4 hours until resolution
- **Post-Incident Report**: Within 48 hours of resolution

**Regulatory Communication** (PIPEDA breach notification):
- **Privacy Commissioner**: Within 72 hours of breach discovery
- **Affected Members**: Without unreasonable delay (ideally <24 hours)
- **Content**: Nature of breach, data involved, mitigation steps, contact info

## 7. Backup Testing and Validation

### 7.1 Automated Validation

**Daily Backup Verification**:
- **Backup Completion Check**: Monitor Azure Backup job status (via Azure Monitor alerts)
- **File Size Validation**: Compare backup size to expected range (flag if >±20% deviation)
- **Checksum Verification**: Calculate SHA-256 hash of backup files (detect corruption)
- **Log Review**: Automated scan for backup errors/warnings (alert to on-call)

**Weekly Integrity Check**:
- **Random Sample Restore**: Restore 10 random database tables to test environment
- **Row Count Verification**: Compare row counts between production and restored data
- **Schema Validation**: Verify all tables, indexes, constraints present

### 7.2 Restore Testing Schedule

| Test Type | Frequency | Scope | Success Criteria |
|-----------|-----------|-------|------------------|
| **Individual File Restore** | Monthly | 10 random files from blob storage | Files intact, correct versions |
| **Database Table Restore** | Monthly | 5 random tables (non-critical) | Data matches production, no corruption |
| **Full Database Restore** | Quarterly | Complete database restore to test environment | All data present, application functional |
| **Disaster Recovery Drill** | Semi-annually | Full infrastructure rebuild + restore | Meet RTO (4 hours), RPO (24 hours) |
| **Geo-Failover Test** | Annually | Failover to Canada East region | Service restored in secondary region |

### 7.3 Disaster Recovery Drills

**Drill Scenarios** (rotate semi-annually):
1. **Scenario A**: Database corruption → Restore from PITR (4-hour RTO)
2. **Scenario B**: Ransomware attack → Restore from immutable backup (8-hour RTO)
3. **Scenario C**: Azure region outage → Geo-failover to secondary region (4-hour RTO)

**Drill Procedure**:
1. **Pre-Drill**: Schedule maintenance window (Saturday 2-6 AM)
2. **Kickoff**: DR Coordinator briefs DRT on scenario
3. **Execution**: DRT follows DR plan, simulates recovery steps
4. **Validation**: Verify restored data, test application functionality
5. **Debrief**: Identify gaps, update DR plan, document lessons learned
6. **Report**: Submit drill report to management (completion time, issues, improvements)

**Drill Success Criteria**:
- [ ] RTO met (restored within target timeframe)
- [ ] RPO met (data loss within acceptable limit)
- [ ] All DRT members participated
- [ ] Communication plan followed
- [ ] Application functional after restore
- [ ] No data corruption detected

### 7.4 Monitoring and Alerting

**Backup Job Monitoring**:
- **Azure Backup Alerts**: Email + PagerDuty for failed backups
- **Log Analytics Queries**: Daily backup duration trends (flag outliers)
- **Azure Monitor Metrics**: Backup storage usage (alert if >80% capacity)

**Alert Thresholds**:
- **Backup Failure**: Immediate PagerDuty alert (P1 - Critical)
- **Backup Duration >2x Baseline**: Email alert (P3 - Medium)
- **Backup Storage >80% Capacity**: Email alert (P3 - Medium)
- **Geo-Replication Lag >1 Hour**: PagerDuty alert (P2 - High)

## 8. Security and Access Control

### 8.1 Backup Access Control

**Azure RBAC (Role-Based Access Control)**:

| Role | Permissions | Assigned To |
|------|-------------|-------------|
| **Backup Contributor** | Create/manage backup jobs, restore data | DBA, DevOps Lead |
| **Backup Reader** | View backup jobs, download backups (read-only) | Security auditor, Compliance officer |
| **No Access** | Cannot view or access backups | Developers, non-IT staff |

**Azure Key Vault Access** (encryption keys):
- **Key Officers**: Can create/rotate backup encryption keys
- **Backup Service**: Can encrypt/decrypt backups (managed identity)
- **No User Access**: Users cannot access backup encryption keys

### 8.2 Backup Encryption

**Encryption in Transit**:
- **TLS 1.2+**: All backup transfers encrypted (Azure to Azure, Azure to offsite)
- **VPN Tunnel**: For backups to non-Azure locations (if applicable)

**Encryption at Rest**:
- **Algorithm**: AES-256-GCM (customer-managed keys)
- **Key Storage**: Azure Key Vault (Premium tier, HSM-backed)
- **Key Rotation**: Every 90 days (automated)

**Offsite Backup Encryption** (if applicable):
- **Method**: Encrypt before transfer (AES-256-GCM)
- **Key Storage**: Key split across two physical safes (Shamir's Secret Sharing)
- **Passphrase**: 20+ character random passphrase (stored separately)

### 8.3 Audit Logging

**Backup Operations Logged**:
- Backup job start/completion
- Restore operations (who, what, when)
- Backup deletion (who, when, reason)
- Access to backup storage (read, download)
- Encryption key usage (encrypt, decrypt, rotate)

**Log Retention**: 7 years (immutable archive)

**Audit Review**: Quarterly review by Security Officer (check for unauthorized access)

## 9. Backup Storage Management

### 9.1 Storage Capacity Planning

**Current Storage Usage** (as of Jan 2025):
- **Database Backups**: 150 GB (weekly full) × 4 weeks = 600 GB
- **Incremental Backups**: 10 GB/day × 7 days = 70 GB
- **Transaction Logs**: 2 GB/day × 7 days = 14 GB
- **File Storage Backups**: 500 GB (geo-replicated) = 1000 GB
- **Long-Term Archives**: 50 GB/month × 12 months = 600 GB
- **Total**: ~2.3 TB (with 20% buffer = 2.8 TB provisioned)

**Growth Projections**:
- **Database**: 15% annual growth → 173 GB by 2026
- **File Storage**: 25% annual growth → 625 GB by 2026
- **Total 2026**: ~3.2 TB

**Capacity Alerts**:
- **Warning**: 80% capacity (2.2 TB) → Plan expansion
- **Critical**: 90% capacity (2.5 TB) → Immediate expansion

### 9.2 Cost Optimization

**Azure Storage Tiers**:

| Tier | Use Case | Cost/GB/Month | Retrieval Cost |
|------|----------|---------------|----------------|
| **Hot** | Daily/weekly backups (7-28 days) | $0.0208 | Free |
| **Cool** | Monthly backups (1 year) | $0.0115 | $0.01/GB |
| **Archive** | Annual backups (7 years) | $0.00099 | $0.02/GB + high latency |

**Lifecycle Management** (automated policies):
- Day 0-28: Hot tier (daily/weekly backups)
- Day 29-365: Cool tier (monthly backups)
- Day 366+: Archive tier (annual backups for compliance)

**Estimated Costs** (monthly):
- Hot tier (670 GB): $14/month
- Cool tier (600 GB): $7/month
- Archive tier (600 GB): $0.60/month
- **Total**: ~$22/month for backups (excluding geo-replication)

### 9.3 Backup Cleanup

**Automated Deletion** (via Azure Backup retention policies):
- Daily backups: Delete after 7 days
- Weekly backups: Delete after 28 days
- Monthly backups: Delete after 1 year
- Annual backups: Retain 7 years, then delete

**Manual Deletion** (requires approval):
- **Reason**: Legal hold released, retention policy change
- **Approval**: Security Officer + DBA
- **Audit**: Log deletion event (who, what, when, why)

## 10. Compliance and Regulatory Requirements

### 10.1 SOC-2 Requirements

**Control A1.2** (Backup and Recovery):
- [x] Documented backup policy (this document)
- [x] Regular backup schedule (daily/weekly/monthly)
- [x] Backup testing (quarterly full restore)
- [x] Off-site backup storage (geo-replication)
- [x] Backup monitoring and alerting
- [x] RTO/RPO defined and tested

**Control A1.3** (Business Continuity):
- [x] Disaster recovery plan (section 6)
- [x] DR team and communication plan (section 6.2-6.3)
- [x] Annual DR drill (section 7.3)
- [x] Incident response integration (see Incident Response Plan)

### 10.2 PIPEDA Requirements

**Safeguarding Personal Information**:
- [x] Backups encrypted (AES-256, customer-managed keys)
- [x] Access controls (Azure RBAC, least privilege)
- [x] Audit logging (all backup access logged)
- [x] Breach notification (72 hours, see DR plan)

**Retention Limits**:
- [x] Member data retained only as long as necessary (7 years post-separation)
- [x] Automated deletion after retention period
- [x] Member right to erasure (delete from backups upon request)

### 10.3 Financial Record Retention

**CRA (Canada Revenue Agency)**:
- **Requirement**: 7 years for financial records (dues, remittances, payroll)
- **Compliance**: Annual backups retained 7 years in immutable archive

**Labour Relations Acts** (federal/provincial):
- **Requirement**: 10 years for collective agreements, grievances
- **Compliance**: Annual backups retained 10 years in immutable archive

## 11. Roles and Responsibilities

### 11.1 Backup Administration

**Database Administrator (DBA)**:
- Configure and monitor database backups
- Perform restore testing (monthly)
- Respond to backup failures (within 1 hour)
- Maintain backup documentation

**DevOps Lead**:
- Configure and monitor file storage backups
- Manage backup retention policies
- Optimize backup costs (storage tiers)
- Automate backup validation

**Security Officer**:
- Manage backup encryption keys
- Audit backup access (quarterly)
- Enforce access controls (Azure RBAC)
- Coordinate security incidents (ransomware)

### 11.2 Disaster Recovery

**DR Coordinator (CTO)**:
- Maintain disaster recovery plan
- Coordinate DR drills (semi-annually)
- Activate DR team during incidents
- Report DR status to executive team

**Disaster Recovery Team (DRT)**:
- Participate in DR drills
- Execute recovery procedures during incidents
- Document lessons learned
- Update DR plan based on findings

## 12. Training and Awareness

### 12.1 Mandatory Training

**IT Operations Team**:
- **Backup Procedures**: Creating backups, monitoring jobs, troubleshooting failures
- **Restore Procedures**: Point-in-time recovery, geo-failover, data validation
- **DR Plan**: Roles, communication, escalation
- **Frequency**: Annual (4 hours) + quarterly refreshers

**Developers**:
- **Backup Awareness**: What's backed up, retention periods, restore requests
- **Data Classification**: Impact on backup requirements (see Data Classification Policy)
- **Frequency**: Annual (1 hour)

**All Staff**:
- **Business Continuity**: What to do during outages, communication channels
- **Frequency**: Annual (30 minutes)

### 12.2 Documentation

**Runbooks** (detailed step-by-step procedures):
- Restore database from backup
- Restore file from blob storage
- Initiate geo-failover to secondary region
- Restore application configuration
- Validate data integrity after restore

**Location**: Internal wiki (Confluence/Notion), version-controlled (Git)

## 13. Backup Policy Exceptions

### 13.1 Exception Process

Exceptions to backup policy may be granted:
1. **Non-Production Environments**: Development/test may have relaxed backup schedules
2. **Temporary Data**: Ephemeral data with <7 day lifespan (e.g., temp caches)
3. **Low-Value Data**: Data easily regenerated (e.g., calculated reports)

**Approval Required**:
- DBA (for temporary exceptions <30 days)
- CTO (for extended exceptions <1 year)
- Executive Team (for permanent exceptions)

**Compensating Controls**:
- Enhanced data regeneration procedures
- Documented recovery steps
- Acceptance of higher RPO/RTO

### 13.2 Development Environment

**Backup Policy**:
- **Database**: Weekly full backup (7-day retention)
- **File Storage**: No backups (regenerate from seed data)
- **RTO**: 24 hours (rebuild from scratch acceptable)
- **RPO**: 7 days

## 14. Continuous Improvement

### 14.1 Policy Review

**Review Triggers**:
- Annual review (January)
- After major incident (within 30 days)
- Regulatory changes
- Technology changes (new backup tools, Azure features)

**Review Process**:
1. DRT reviews policy for gaps and improvements
2. Incorporate lessons learned from DR drills and incidents
3. Update RTO/RPO based on business needs
4. Obtain executive approval
5. Communicate changes to all staff

### 14.2 Metrics and KPIs

**Backup Performance**:
- **Backup Success Rate**: Target 99.5% (max 1-2 failures per month)
- **Backup Duration**: Daily backups <1 hour, weekly backups <6 hours
- **Restore Success Rate**: Target 100% (all restore tests successful)
- **RTO Compliance**: 95% of incidents meet RTO targets
- **RPO Compliance**: 100% of recoveries meet RPO targets

**Quarterly Reports**:
- Backup success/failure trends
- Restore test results
- DR drill outcomes
- Capacity usage and costs
- Action items and improvements

## 15. Related Policies

**Internal Policies**:
- **Incident Response Plan**: Coordinates with DR plan for security incidents
- **Data Classification Policy**: Determines backup encryption requirements
- **Access Control Policy**: Governs backup access permissions
- **Encryption Standards**: Defines backup encryption algorithms and key management

**External Standards**:
- **SOC-2 Trust Services Criteria**: A1.2 (Backup), A1.3 (Business Continuity)
- **NIST SP 800-34**: Contingency Planning Guide for Federal Information Systems
- **ISO 22301**: Business Continuity Management

## 16. Glossary

- **Backup**: Copy of data for recovery purposes
- **DR (Disaster Recovery)**: Process of restoring services after catastrophic event
- **Failover**: Switching to standby system/region
- **Full Backup**: Complete copy of all data
- **Geo-Replication**: Copying data to geographically distant location
- **Immutable Storage**: WORM (Write Once, Read Many) - cannot be modified/deleted
- **Incremental Backup**: Copy of data changed since last backup
- **PITR (Point-in-Time Recovery)**: Restore to specific moment in time
- **RPO (Recovery Point Objective)**: Maximum acceptable data loss (in time)
- **RTO (Recovery Time Objective)**: Maximum acceptable downtime
- **Soft Delete**: Temporary deletion with recovery period

## 17. Appendices

### Appendix A: Backup Job Configuration (Azure CLI)

**Database Backup**:
```bash
# Enable automated backup (Flexible Server)
az postgres flexible-server update \
  --resource-group union-claims-prod \
  --name union-claims-db \
  --backup-retention 7 \
  --geo-redundant-backup Enabled

# Perform manual backup
az postgres flexible-server backup create \
  --resource-group union-claims-prod \
  --name union-claims-db \
  --backup-name manual-backup-$(date +%Y%m%d)
```

**Blob Storage Backup**:
```bash
# Enable versioning and soft delete
az storage account blob-service-properties update \
  --account-name unionclaimsstorage \
  --resource-group union-claims-prod \
  --enable-versioning true \
  --enable-delete-retention true \
  --delete-retention-days 30
```

### Appendix B: Restore Procedures (Quick Reference)

**Database PITR**:
```bash
# Restore to specific timestamp
az postgres flexible-server restore \
  --resource-group union-claims-prod \
  --name union-claims-db-restored \
  --source-server union-claims-db \
  --restore-time "2025-01-15T14:30:00Z"
```

**Blob Storage Restore**:
```bash
# Restore deleted blob
az storage blob undelete \
  --account-name unionclaimsstorage \
  --container-name documents \
  --name grievance-12345.pdf

# Restore specific version
az storage blob copy start \
  --account-name unionclaimsstorage \
  --destination-container documents \
  --destination-blob grievance-12345.pdf \
  --source-blob grievance-12345.pdf \
  --source-version-id "2025-01-15T14:30:00.123Z"
```

### Appendix C: Contact Information

**Primary Contacts**:
- **DR Coordinator (CTO)**: dr-coordinator@union-claims.ca, +1-XXX-XXX-XXXX
- **DBA**: dba-oncall@union-claims.ca, +1-XXX-XXX-XXXX (PagerDuty)
- **DevOps Lead**: devops-oncall@union-claims.ca, +1-XXX-XXX-XXXX (PagerDuty)
- **Security Officer**: security@union-claims.ca, +1-XXX-XXX-XXXX

**Vendor Contacts**:
- **Azure Support**: +1-800-642-7676 (Premier Support, 24/7)
- **Backup Vendor** (if applicable): TBD

---

**Document Control**
- **Document ID**: POL-BKP-005
- **Version**: 1.0
- **Classification**: INTERNAL USE ONLY
- **Next Review**: January 2026
- **Location**: docs/compliance/policies/BACKUP_RECOVERY_POLICY.md
