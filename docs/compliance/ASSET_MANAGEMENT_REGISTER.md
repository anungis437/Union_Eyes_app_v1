# Asset Management Register

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Security & Compliance Team  
**Review Schedule:** Quarterly  
**ISO 27001 Control:** A.5.9

## 1. Purpose

This register maintains a comprehensive inventory of all information assets within the ISMS scope, including ownership, classification, and lifecycle status.

## 2. Asset Classification Levels

- **Critical:** Loss would cause severe business impact (RTO < 4 hours)
- **High:** Loss would cause significant impact (RTO < 24 hours)
- **Medium:** Loss would cause moderate impact (RTO < 72 hours)
- **Low:** Loss would cause minimal impact (RTO < 1 week)

## 3. Information Assets

### 3.1 Data Assets

| Asset ID | Asset Name | Owner | Classification | Location | Backup Status |
|----------|------------|-------|----------------|----------|---------------|
| DATA-001 | Member PII Database | Data Protection Officer | Critical | Azure PostgreSQL (Canada Central) | Daily automated |
| DATA-002 | Financial Transactions | CFO | Critical | Azure PostgreSQL (Canada Central) | Daily automated |
| DATA-003 | Digital Signatures (PKI) | Security Team | Critical | Azure PostgreSQL + Blob | Daily automated |
| DATA-004 | Collective Agreements | Legal Counsel | High | Azure Blob Storage | Daily automated |
| DATA-005 | Grievance Records | Operations Manager | High | Azure PostgreSQL | Daily automated |
| DATA-006 | Arbitration Cases | Legal Counsel | High | Azure PostgreSQL + Blob | Daily automated |
| DATA-007 | Audit Logs | Security Team | Critical | Azure PostgreSQL (immutable) | Continuous replication |
| DATA-008 | Health & Wellness Claims | Privacy Officer | Critical | Azure PostgreSQL (encrypted) | Daily automated |
| DATA-009 | Strike Fund Data | CFO | High | Azure PostgreSQL | Daily automated |
| DATA-010 | Training Materials | HR Manager | Low | Azure Blob Storage | Weekly |

### 3.2 Software Assets

| Asset ID | Asset Name | Owner | Classification | Version | License |
|----------|------------|-------|----------------|---------|---------|
| SW-001 | Union Eyes Web App | CTO | Critical | v2.0.0 | Proprietary |
| SW-002 | API Services | CTO | Critical | v2.0.0 | Proprietary |
| SW-003 | Admin Dashboard | CTO | High | v2.0.0 | Proprietary |
| SW-004 | Database (PostgreSQL) | Database Admin | Critical | 15.x | PostgreSQL License |
| SW-005 | Next.js Framework | CTO | Critical | 14.x | MIT |
| SW-006 | React | CTO | Critical | 18.x | MIT |
| SW-007 | Drizzle ORM | CTO | High | Latest | MIT |
| SW-008 | Monitoring (Sentry) | DevOps | High | SaaS | Commercial |

### 3.3 Infrastructure Assets

| Asset ID | Asset Name | Owner | Classification | Provider | Region |
|----------|------------|-------|----------------|----------|--------|
| INFRA-001 | Production Database | Database Admin | Critical | Azure PostgreSQL Flexible | Canada Central |
| INFRA-002 | Staging Database | Database Admin | Medium | Azure PostgreSQL Flexible | Canada East |
| INFRA-003 | Production Blob Storage | DevOps | Critical | Azure Storage | Canada Central |
| INFRA-004 | Backup Blob Storage | DevOps | Critical | Azure Storage (GRS) | Canada East (replica) |
| INFRA-005 | Azure Key Vault | Security Team | Critical | Azure Key Vault | Canada Central |
| INFRA-006 | Vercel Production | DevOps | Critical | Vercel Enterprise | Global CDN |
| INFRA-007 | Vercel Staging | DevOps | Medium | Vercel | Global CDN |
| INFRA-008 | GitHub Repository | CTO | Critical | GitHub Enterprise | Global |
| INFRA-009 | CI/CD Pipelines | DevOps | High | GitHub Actions | Global |

### 3.4 Third-Party Service Assets

| Asset ID | Service Name | Owner | Classification | Vendor | Security Doc Status |
|----------|--------------|-------|----------------|--------|---------------------|
| 3P-001 | Clerk Authentication | Security Team | Critical | Clerk.dev | SOC 2 Type II verified |
| 3P-002 | Stripe Payments | CFO | Critical | Stripe Inc | PCI-DSS Level 1 |
| 3P-003 | Sentry Monitoring | DevOps | High | Sentry.io | SOC 2 Type II verified |
| 3P-004 | DocuSign | Legal Counsel | High | DocuSign | SOC 2 Type II verified |
| 3P-005 | Whop Licensing | Product Manager | Medium | Whop Inc | Security review pending |
| 3P-006 | CLC API | CTO | High | Canadian Labour Congress | Government entity |
| 3P-007 | SendGrid Email | Marketing | Medium | Twilio SendGrid | Security review pending |
| 3P-008 | Azure Cloud Platform | DevOps | Critical | Microsoft Azure | ISO 27001, SOC 2, SOC 3 |

### 3.5 Documentation Assets

| Asset ID | Document Name | Owner | Classification | Location | Last Review |
|----------|---------------|-------|----------------|----------|-------------|
| DOC-001 | Information Security Policy | Security Team | High | GitHub /docs/compliance | Feb 2026 |
| DOC-002 | Access Control Policy | Security Team | High | GitHub /docs/compliance | Jan 2025 |
| DOC-003 | Incident Response Plan | Security Team | Critical | GitHub /docs/compliance | Jan 2025 |
| DOC-004 | Backup Recovery Policy | DevOps | Critical | GitHub /docs/compliance | Jan 2025 |
| DOC-005 | Encryption Standards | Security Team | Critical | GitHub /docs/compliance | Jan 2025 |
| DOC-006 | Data Classification Policy | Privacy Officer | High | GitHub /docs/compliance | Jan 2025 |
| DOC-007 | Source Code | CTO | Critical | GitHub (private) | Continuous |
| DOC-008 | System Architecture Docs | CTO | High | GitHub /docs | Continuous |

## 4. Asset Lifecycle Management

### 4.1 Asset Registration
- New assets registered within 48 hours of deployment
- Owner assigned and classification determined
- Security requirements documented

### 4.2 Asset Review
- Quarterly review of all assets
- Annual deep-dive with ownership confirmation
- Classification adjustments as needed

### 4.3 Asset Decommissioning
- Secure disposal procedures followed
- Data sanitization verified
- Decommission logged and approved

## 5. Asset Protection Responsibilities

### 5.1 Asset Owners
- Maintain accurate asset information
- Define access controls
- Approve disposal/modification
- Review access quarterly

### 5.2 Security Team
- Maintain asset register
- Assess security controls
- Coordinate vulnerability management
- Audit asset compliance

## 6. Integration with Risk Management

Critical and High classification assets are included in annual risk assessments. Risk treatment plans reference specific asset IDs.

## 7. Document Control

- **Next Review Date:** May 2026 (Quarterly)
- **Review Process:** Security Team reviews, CTO approves
- **Change History:**
  - v1.0 (February 2026): Initial asset register created

## 8. Automation Notes

**Future Enhancement:** Automated asset discovery via:
- Azure Resource Graph queries
- GitHub API inventory
- Dependency scanning (npm, terraform)
- CMDB integration
