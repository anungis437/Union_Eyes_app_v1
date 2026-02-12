# ISMS Scope Statement

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Security & Compliance Team  
**Approver:** Executive Management  
**Review Schedule:** Annual (or upon significant organizational change)  
**ISO 27001:2022 Control:** A.4.1, A.5.1

---

## 1. Scope of the Information Security Management System

### 1.1 Purpose

This document defines the scope of the Information Security Management System (ISMS) for Union Eyes, establishing clear boundaries for all security controls, processes, and certification activities.

### 1.2 Organization Overview

**Organization Name:** Union Eyes / One Lab Technologies Corp.  
**Legal Entity:** One Lab Technologies Corp. (onelabtech.com)  
**Industry:** SaaS Platform for Union Claims Management  
**Service Type:** Multi-tenant cloud-based union management system

### 1.3 Business Context

Union Eyes provides a comprehensive digital platform for Canadian labour unions to manage:
- Member claims and grievances
- Financial transactions and per-capita remittances
- Collective bargaining agreements
- Arbitration cases and legal proceedings
- Health and wellness benefits
- Organizational hierarchy (Congress → Federation → Union → Local)
- Democratic governance and elections

---

## 2. ISMS Scope Definition

### 2.1 Organizational Scope

The ISMS applies to:

- **Primary Organization:** One Lab Technologies Corp.
- **Operating Brand:** Union Eyes
- **Business Units:**
  - Product Development & Engineering
  - Platform Operations & DevOps
  - Security & Compliance
  - Customer Success & Support
- **Geographic Coverage:** Canada (primary), with cloud infrastructure in Canada Central and East US Azure regions
- **Organizational Levels:** All employees, contractors, and authorized third parties

### 2.2 Technical Scope

#### 2.2.1 Information Systems

**Production Platform:**
- Next.js 14 web application (TypeScript)
- Azure PostgreSQL Flexible Server (v16) with Drizzle ORM
- Azure Blob Storage for documents
- Vercel Edge Network for CDN and hosting
- Azure OpenAI (GPT-4o) for AI features
- Pinecone vector database for semantic search

**Development & Staging Environments:**
- Staging environment hosted on Azure Web Apps
- Development environments (local developer machines)
- CI/CD pipelines (GitHub Actions)

#### 2.2.2 Third-Party Services (Critical Dependencies)

| Service | Purpose | Classification |
|---------|---------|----------------|
| **Clerk** | User authentication & identity management | Critical |
| **Stripe** | Payment processing (PCI-DSS SAQ A compliant) | Critical |
| **Azure (Microsoft)** | Infrastructure (compute, database, storage, AI) | Critical |
| **Vercel** | Application hosting and CDN | Critical |
| **Sentry** | Error monitoring and performance tracking | High |
| **GitHub** | Source code repository and CI/CD | High |
| **DocuSign** | Digital signature verification | Medium |
| **Resend** | Transactional email delivery | Medium |

#### 2.2.3 Data Assets

**Data Classification Levels:**

| Level | Examples | RLS Protected |
|-------|----------|---------------|
| **Critical** | Member PII, financial transactions, collective agreements, digital signatures | Yes (70+ tables) |
| **High** | Organizational hierarchy, role assignments, audit logs | Yes |
| **Medium** | Training materials, public announcements, metadata | Partial |
| **Public** | Marketing content, documentation, public facing pages | No |

**Data Types In Scope:**
- Personal Identifiable Information (PII) - member profiles, contact info
- Financial data - transactions, per-capita remittances, dues
- Legal documents - collective agreements, grievances, arbitration records
- Health information - wellness claims (PIPEDA compliant)
- Authentication credentials - JWT tokens, API keys, passwords (hashed)
- Audit logs - tamper-proof security event records

#### 2.2.4 Network Infrastructure

**In Scope:**
- Azure Virtual Networks and subnets
- Azure App Service Plans (P1V3)
- Azure Database for PostgreSQL private endpoints (planned)
- TLS 1.3 encrypted connections
- Vercel Edge Network with DDoS protection
- API gateways and rate limiting (373 secured routes)

**Network Boundaries:**
- Internet-facing: Web application via Vercel Edge
- Cloud-hosted: Azure infrastructure (Canada Central, East US)
- Internal services: Database, storage, AI services
- External integrations: Clerk, Stripe, DocuSign APIs

---

## 3. Physical and Environmental Scope

### 3.1 Physical Locations

Union Eyes operates as a **cloud-native SaaS platform** with no owned data centers. Physical security is delegated to cloud providers under shared responsibility model:

| Provider | Facilities | Certifications |
|----------|-----------|----------------|
| **Microsoft Azure** | Canada Central, East US data centers | ISO 27001, SOC 2 Type II, FedRAMP |
| **Vercel (AWS)** | Global Edge Network | SOC 2 Type II, ISO 27001 |
| **GitHub** | Source code hosting | SOC 2 Type II, ISO 27001 |

**Office Locations (if applicable):**
- Remote-first organization
- Home office security guidance provided to employees
- No physical on-premise servers or infrastructure

### 3.2 Environmental Boundaries

**Cloud Regions:**
- Primary: Azure Canada Central (database, storage)
- Secondary: Azure East US (OpenAI services)
- Edge: Vercel global CDN (nearest user location)

**Data Residency:**
- Customer data stored in Canada (Azure Canada Central)
- Backups stored in geo-redundant Azure Storage (Canada)
- EU users' data complies with GDPR cross-border transfer requirements

---

## 4. Functional and Process Scope

### 4.1 Services and Functions

**In Scope:**
- User authentication and authorization (RBAC with 26 roles)
- Multi-tenant data isolation (Row-Level Security on 70+ tables)
- Claims and grievance management
- Financial transaction processing
- Document storage and retrieval
- Digital signature verification
- AI-assisted legal research (OpenAI GPT-4o)
- Reporting and analytics
- Democratic elections and governance
- Member communications
- API integrations with external systems

**Out of Scope:**
- Third-party payment card processing (delegated to Stripe - PCI-DSS SAQ A)
- Email delivery infrastructure (delegated to Resend)
- Cloud infrastructure physical security (delegated to Azure/Vercel)

### 4.2 Business Processes

**In Scope:**
- Software development lifecycle (SDLC)
- Change management and release processes
- Incident response and security operations
- Access control and identity management
- Backup and disaster recovery
- Vulnerability management and patching
- Security monitoring and logging
- Supplier security management
- Business continuity planning

**Out of Scope:**
- HR payroll processing (no employees yet - founder-stage)
- Physical office management (remote-first)
- Manufacturing or physical goods (SaaS only)

---

## 5. Stakeholder and Interested Parties

### 5.1 Internal Stakeholders

- Executive Management (founder/CTO)
- Engineering and development teams
- Security and compliance team
- Customer success and support (future)

### 5.2 External Stakeholders

**Customers:**
- Canadian Labour Congress (CLC) affiliates
- Provincial federations
- Individual unions and locals
- Union members (end-users)

**Regulators and Standards Bodies:**
- Office of the Privacy Commissioner of Canada (PIPEDA)
- Provincial privacy commissioners
- ISO 27001 certification auditors
- SOC 2 audit firms (planned)

**Suppliers and Partners:**
- Cloud infrastructure providers (Azure, Vercel)
- Authentication provider (Clerk)
- Payment processor (Stripe)
- AI service provider (OpenAI via Azure)

---

## 6. Applicable Legal, Regulatory, and Contractual Requirements

### 6.1 Privacy and Data Protection

- **PIPEDA** (Personal Information Protection and Electronic Documents Act) - Federal Canada
- **Provincial Privacy Laws:**
  - Alberta PIPA (Personal Information Protection Act)
  - British Columbia PIPA
  - Quebec Law 25 (Bill 64)
- **GDPR** (General Data Protection Regulation) - for EU users
- **CCPA** (California Consumer Privacy Act) - if US expansion occurs

### 6.2 Security and Compliance Standards

- **ISO 27001:2022** - Information Security Management (target certification)
- **SOC 2 Type II** - Security, Availability, Confidentiality (in progress)
- **PCI-DSS SAQ A** - Payment security (via Stripe)
- **WCAG 2.1 Level AA** - Accessibility standards
- **CAN-SPAM Act** - Email marketing compliance

### 6.3 Industry-Specific Requirements

- Labour relations best practices (transparency, democratic governance)
- Collective bargaining confidentiality requirements
- Union financial transparency regulations
- Legal hold and e-discovery requirements for arbitration cases

### 6.4 Contractual Obligations

- Customer Data Processing Agreements (DPAs)
- Supplier security requirements
- Service Level Agreements (SLAs):
  - 99.9% uptime commitment
  - 4-hour RTO (Recovery Time Objective)
  - 24-hour RPO (Recovery Point Objective)
  - 72-hour breach notification per PIPEDA

---

## 7. Exclusions and Limitations

### 7.1 Explicit Exclusions

The following are **explicitly excluded** from ISMS scope:

| Exclusion | Justification |
|-----------|---------------|
| **Payment card data processing** | Delegated to Stripe (PCI-DSS Level 1 Service Provider). Union Eyes uses SAQ A - card data never touches our systems. |
| **Email infrastructure** | Delegated to Resend (transactional email SaaS). We control email content/templates only. |
| **Cloud physical security** | Azure and Vercel data centers. Covered by provider SOC 2/ISO 27001 certifications. |
| **Mobile app development** | Not currently in scope. Future mobile apps will require ISMS scope expansion. |
| **On-premise deployments** | Union Eyes is SaaS-only. No on-premise installations supported. |
| **Legacy systems** | No legacy systems. Platform built from scratch in 2024-2026. |

### 7.2 Planned Expansions (Future Scope)

- Mobile applications (iOS/Android) - Q3 2026
- Public API for third-party integrations - Q4 2026
- Advanced AI features (contract review, predictive analytics) - 2027
- International expansion (US unions) - 2027

**Note:** Scope expansions require formal risk assessment and management approval before inclusion in ISMS.

---

## 8. ISMS Boundaries and Interfaces

### 8.1 Internal Boundaries

```
┌──────────────────────────────────────────────────────┐
│  ISMS Boundary                                       │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Development │  │  Production  │  │  Staging   │ │
│  │ Environment │  │  Platform    │  │  Env       │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Azure Infrastructure (Database, Storage, AI) │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Vercel Edge Network (Hosting, CDN)          │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
         │                    │                   │
         ▼                    ▼                   ▼
   ┌──────────┐        ┌──────────┐       ┌──────────┐
   │  Clerk   │        │  Stripe  │       │ Sentry   │
   │  (Auth)  │        │ (Payment)│       │(Monitor) │
   └──────────┘        └──────────┘       └──────────┘
   
   External Services (Outside ISMS Boundary)
```

### 8.2 External Interfaces

**Controlled Integrations:**
- REST APIs with OAuth 2.0 / API key authentication
- Webhook endpoints with signature verification
- TLS 1.3 encrypted connections only
- Rate limiting and DDoS protection at edge

**Data Flows:**
- Inbound: User authentication (Clerk), payment webhooks (Stripe), email status (Resend)
- Outbound: Payment processing (Stripe), error tracking (Sentry), AI queries (Azure OpenAI)
- Internal: Database queries (RLS-protected), blob storage, audit logging

---

## 9. Risk Assessment Context

### 9.1 Business Criticality

**Critical Assets:**
1. Production database (member data, financial records)
2. Authentication system (Clerk integration)
3. Payment processing (Stripe integration)
4. Collective agreements and legal documents
5. Audit logs and security monitoring

**Impact of Security Breach:**
- **Confidentiality:** Unauthorized access to member PII, financial data, or union strategy documents
- **Integrity:** Tampering with financial transactions, election results, or collective agreements
- **Availability:** Platform downtime affecting union operations, member services, and time-sensitive grievances

### 9.2 Threat Landscape

**Primary Threats:**
- Data breaches targeting member PII or financial data
- Ransomware attacks on database or backups
- Insider threats (unauthorized access by users with elevated privileges)
- Supply chain attacks via third-party dependencies
- DDoS attacks disrupting platform availability
- Social engineering targeting union administrators

**Vulnerability Areas:**
- Complex multi-tenant architecture (26 roles, hierarchical RLS)
- Third-party service dependencies (Clerk, Stripe, Azure)
- Developer workstations and remote access
- API security and rate limiting

---

## 10. ISMS Objectives and Metrics

### 10.1 Security Objectives

1. **Confidentiality:** Protect member PII and sensitive union data from unauthorized access
2. **Integrity:** Prevent unauthorized modification of financial transactions, legal documents, and election results
3. **Availability:** Maintain 99.9% uptime for critical platform services
4. **Compliance:** Achieve ISO 27001:2022 and SOC 2 Type II certification
5. **Resilience:** Recover from security incidents within defined RTO/RPO targets

### 10.2 Key Performance Indicators (KPIs)

| Metric | Target | Measurement Frequency |
|--------|--------|----------------------|
| **Security Incidents** | <2 per quarter (non-critical) | Monthly |
| **Mean Time to Detect (MTTD)** | <15 minutes | Per incident |
| **Mean Time to Respond (MTTR)** | <4 hours (critical), <24 hours (high) | Per incident |
| **Vulnerability Remediation** | <7 days (critical), <30 days (high) | Monthly |
| **Failed Login Rate** | <0.5% of total authentication attempts | Weekly |
| **RLS Policy Effectiveness** | 100% enforcement (0 bypasses) | Continuous |
| **Backup Success Rate** | 100% daily backups | Daily |
| **Access Review Completion** | 100% quarterly reviews on time | Quarterly |
| **Security Training Completion** | 100% of personnel annually | Annual |
| **Audit Findings (Major)** | 0 major findings in external audits | Per audit |

---

## 11. Document Control and Maintenance

### 11.1 Review and Approval

- **Document Owner:** Security & Compliance Team
- **Approver:** Executive Management / CTO
- **Effective Date:** February 12, 2026
- **Next Scheduled Review:** February 2027 (annual)
- **Unscheduled Review Triggers:**
  - Major organizational changes (acquisitions, new business units)
  - New services or geographic expansions
  - Significant regulatory changes
  - External audit recommendations

### 11.2 Change History

| Version | Date | Changes | Approver |
|---------|------|---------|----------|
| 1.0 | February 12, 2026 | Initial ISMS scope definition | CTO |

### 11.3 Distribution

This document is distributed to:
- Executive management
- Engineering leadership
- Security and compliance team
- External auditors (ISO 27001, SOC 2)
- Upon request: customers, regulators, certification bodies

### 11.4 Related Documents

- Information Security Policy
- Risk Assessment and Treatment Methodology
- Asset Management Register
- Access Control Policy
- Incident Response Plan
- Business Continuity Plan
- Supplier Security Policy

---

## 12. Signatures and Approval

**Prepared By:**  
Security & Compliance Team  
Date: February 12, 2026

**Reviewed By:**  
Engineering Leadership  
Date: _______________

**Approved By:**  
Executive Management / CTO  
Date: _______________  
Signature: _______________

---

**Document Status:** APPROVED  
**Certification Readiness:** ISO 27001:2022 Stage 1 Audit Ready

