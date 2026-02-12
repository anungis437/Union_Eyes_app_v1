# Data Retention and Destruction Policy

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Data Protection Officer / Security Team  
**Review Schedule:** Annual  
**ISO 27001 Control:** A.8.10, A.5.33

## 1. Purpose

This policy defines retention periods and secure deletion procedures for data to comply with legal, regulatory, and business requirements while minimizing data storage risks.

## 2. Retention Schedule

### 2.1 Member Personal Information (PII)

| Data Type | Retention Period | Justification | Deletion Method |
|-----------|------------------|---------------|-----------------|
| **Member profile** | Active membership + 7 years | PIPEDA, labour relations statute of limitations | Hard delete from database |
| **Contact information** | Active membership + 1 year | Business continuity | Anonymize or delete |
| **SIN / Tax IDs** | As required by law (7 years post-termination) | Canadian tax law | Encrypted archive, then purge |
| **Health information** | 10 years | Provincial health record retention laws | Hard delete + backup purge |

### 2.2 Financial Records

| Data Type | Retention Period | Justification | Deletion Method |
|-----------|------------------|---------------|-----------------|
| **Payment transactions** | 7 years | CRA tax audit requirements | Archive to cold storage, then purge |
| **Per-capita remittances** | 7 years | Union financial audits | Archive, then delete |
| **Invoices and receipts** | 7 years | Tax and accounting requirements | Encrypted archive |
| **Stripe payment metadata** | 7 years or per Stripe policy | PCI-DSS, financial compliance | Managed by Stripe; Union Eyes deletes references |

### 2.3 Legal and Compliance Records

| Data Type | Retention Period | Justification | Deletion Method |
|-----------|------------------|---------------|-----------------|
| **Collective agreements** | Permanent (or superseded + 10 years) | Labour law requirements | Long-term archive |
| **Grievance records** | 10 years after resolution | Legal statute of limitations | Hard delete after period |
| **Arbitration awards** | Permanent | Legal precedent value | Long-term archive |
| **Incident reports** | 7 years | Internal audit, compliance | Archive, then delete |
| **Audit logs** | 7 years | SOC 2, ISO 27001, forensic needs | Immutable storage, then purge |

### 2.4 Operational Data

| Data Type | Retention Period | Justification | Deletion Method |
|-----------|------------------|---------------|-----------------|
| **Application logs** | 90 days (hot storage); 1 year (cold storage) | Troubleshooting, security monitoring | Rolling deletion |
| **Error logs (Sentry)** | 90 days | Debugging | Managed by Sentry retention policy |
| **Backups** | 30 days (daily); 90 days (weekly); 1 year (monthly) | Disaster recovery | Automated purge |
| **Session data** | 30 days after session expiration | Security, user experience | Automated cleanup |
| **Email logs** | 1 year | Compliance, auditing | Rolling deletion |

### 2.5 HR and Employment Records

| Data Type | Retention Period | Justification | Deletion Method |
|-----------|------------------|---------------|-----------------|
| **Employee records** | 7 years post-termination | Canadian employment law | Archive, then delete |
| **Background checks** | Duration of employment + 1 year | HR best practices | Secure deletion |
| **Security training records** | Duration of employment + 1 year | Compliance evidence | Secure deletion |
| **Termination records** | 7 years | Legal defense, unemployment claims | Archive, then delete |

### 2.6 Development and Test Data

| Data Type | Retention Period | Justification | Deletion Method |
|-----------|------------------|---------------|-----------------|
| **Test data (synthetic)** | No retention requirement | No PII, freely disposable | Overwrite or delete |
| **Staging database backups** | 7 days | Short-term recovery only | Automated purge |
| **CI/CD logs** | 90 days | Troubleshooting, auditing | Rolling deletion |
| **Code repository history** | Permanent | Version control, intellectual property | Retained in GitHub |

## 3. Deletion and Destruction Methods

### 3.1 Database Records (Hard Delete)

**Method:** SQL DELETE statement (hard delete, not soft delete)  
**Process:**
1. Identify records past retention period (automated query)
2. Export for archival if required (encrypted backup)
3. Execute DELETE query
4. Verify deletion (row count check)
5. Vacuum/optimize database to reclaim space

**Automation:** Scheduled cron job (monthly) for automated deletion

### 3.2 Blob Storage / File Deletion

**Method:** Azure Blob Storage deletion (permanent removal)  
**Process:**
1. Identify files past retention period (metadata query)
2. Archive if required (move to archive tier)
3. Delete blob using Azure API
4. Enable soft delete (30-day recovery window for accidental deletion)
5. After soft delete expiration, blobs are permanently purged

**Automation:** Azure Blob Lifecycle Management policies

### 3.3 Backup Purging

**Method:** Automated backup retention policies  
**Process:**
- Daily backups: Retained for 30 days, then deleted
- Weekly backups: Retained for 90 days, then deleted
- Monthly backups: Retained for 1 year, then deleted

**Platform:** Azure PostgreSQL automated backup retention settings

### 3.4 Log Data Deletion

**Method:** Rolling retention (time-based expiration)  
**Process:**
- Application logs: Winston log rotation with automatic purge
- Sentry logs: Managed by Sentry retention settings (90-day default)
- Audit logs: Immutable table with scheduled archival after 7 years

### 3.5 Physical Media Destruction

**Method:** NIST SP 800-88 compliant destruction  
**Process:**
- SSDs: ATA Secure Erase or cryptographic erase (if encrypted)
- HDDs: Degaussing or physical destruction (shredding)
- USB drives: Physical destruction (preferred) or overwriting (3+ passes)

**Vendor:** Certified e-waste disposal vendor (certificate of destruction required)

## 4. Data Minimization Principles

**Collect Only What's Needed:**
- Do not collect data without a defined business purpose
- Review data collection fields annually (remove unnecessary fields)

**Anonymize Where Possible:**
- Replace direct identifiers with pseudonyms for analytics
- Use aggregated data for reporting (no individual records)

**Purge Inactive Accounts:**
- Member accounts inactive for 3+ years: Notify and archive/delete after 90 days
- Free trial accounts expired for 1+ year: Delete automatically

## 5. Data Subject Requests (Right to Erasure)

### 5.1 PIPEDA / GDPR Right to Deletion

**Process:**
1. Verify identity of requestor (multi-factor verification)
2. Confirm no legal hold or retention requirement
3. Identify all data associated with individual (user_id search across databases)
4. Delete data within 30 days of verified request
5. Notify individual of completion
6. Log deletion request and execution

**Exceptions (Deletion Not Required):**
- Legal hold or litigation
- Regulatory retention requirement (7-year tax records)
- Contract fulfillment not yet complete

### 5.2 Hard Delete vs. Soft Delete

**Hard Delete (Preferred for GDPR/PIPEDA):**
- Permanent removal from database
- No recovery possible
- Required for right to erasure

**Soft Delete (Limited Use):**
- Acceptable for operational data with short recovery needs
- Must be hard deleted after 90 days
- Not acceptable for long-term retention of PII

## 6. Archival Procedures

### 6.1 Archive Criteria

Data moved to archive when:
- Retention period requires long-term storage (7+ years)
- Data no longer actively used
- Legal or compliance requirement for preservation

### 6.2 Archive Storage

**Location:** Azure Blob Archive Tier (cold storage, encrypted)  
**Format:** Encrypted ZIP or encrypted database dump  
**Encryption:** AES-256-GCM (keys in Azure Key Vault)  
**Access:** Restricted (Security Team + Legal Counsel only)

### 6.3 Archive Retrieval

- Requested via formal process (Legal Counsel or CTO approval)
- Retrieval SLA: 24 hours (archive tier rehydration time)
- Access logged in audit trail

## 7. Automation Scripts

### 7.1 Automated Deletion Jobs

**Cron Jobs (Planned):**

**Monthly Data Retention Job:**
```typescript
// Pseudo-code
// File: scripts/data-retention/monthly-purge.ts

// 1. Delete expired session data (> 30 days old)
// 2. Delete expired audit logs (> 7 years old) - archive first
// 3. Purge inactive free trial accounts (> 1 year inactive)
// 4. Delete test/staging data (> 7 days old)
// 5. Log deletion summary to audit log
```

**Quarterly Data Review:**
- Review retention schedule compliance
- Generate report of upcoming expirations
- Notify data owners of pending deletions

### 7.2 Backup Retention Automation

**Azure PostgreSQL Settings:**
- Automated backup retention: 30 days (daily), 90 days (weekly), 365 days (monthly)
- Point-in-time restore: 7 days

**Blob Storage Lifecycle Management:**
```json
{
  "rules": [
    {
      "name": "DeleteOldBackups",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"],
          "prefixMatch": ["backups/"]
        },
        "actions": {
          "baseBlob": {
            "delete": {"daysAfterModificationGreaterThan": 365}
          }
        }
      }
    }
  ]
}
```

## 8. Compliance and Auditing

**Annual Review:**
- Review retention schedule for legal/regulatory changes
- Audit deletion logs (verify policies enforced)
- Test restoration from archives (verify integrity)

**Quarterly Audits:**
- Sample data against retention policy
- Verify automated deletion jobs executed
- Review data subject deletion requests

**SOC 2 / ISO 27001 Evidence:**
- Retention policy documented
- Deletion logs available
- Data subject request logs
- Archive integrity verification

## 9. Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| **Data Protection Officer** | Maintain policy, approve exceptions, handle data subject requests |
| **Security Team** | Execute deletions, manage archives, audit compliance |
| **DevOps** | Implement automated deletion scripts, manage backup retention |
| **Legal Counsel** | Advise on regulatory retention requirements, approve archival |
| **System Owners** | Identify data to retain/delete, notify Security Team of changes |

## 10. Related Documents

- Data Classification Policy
- Incident Response Plan (legal hold procedures)
- Backup and Recovery Policy
- Privacy Policy (external-facing)

## Document Control

- **Next Review Date:** February 2027
- **Approval:** Data Protection Officer + Legal Counsel
- **Change History:**
  - v1.0 (February 2026): Initial policy
