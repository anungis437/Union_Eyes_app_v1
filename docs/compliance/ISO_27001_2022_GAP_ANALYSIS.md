# ISO 27001:2022 ISMS Gap Analysis Report
# Union Eyes v2 Platform

**Document Version:** 1.0  
**Analysis Date:** February 2026  
**Prepared By:** Security & Compliance Team  
**Review Date:** Quarterly  
**Platform Version:** v2.0.0-rc1

---

## Executive Summary

### Assessment Overview

This comprehensive gap analysis evaluates the Union Eyes v2 platform against ISO 27001:2022 Information Security Management System (ISMS) requirements, focusing on the 93 controls in Annex A across four categories:

- **A.5 Organizational Controls** (37 controls)
- **A.6 People Controls** (8 controls)
- **A.7 Physical Controls** (14 controls)
- **A.8 Technological Controls** (34 controls)

### Implementation Status Summary

```
Total Controls Assessed:    93
Fully Implemented:          58 (62%)
Partially Implemented:      23 (25%)
Not Implemented:            7  (8%)
Not Applicable (SaaS):      5  (5%)
```

### Security Posture

Union Eyes v2 demonstrates **strong technical security implementations** with mature controls in:

✅ **Authentication & Authorization** - Clerk JWT + 26-role RBAC hierarchy  
✅ **Data Protection** - RLS on 70+ tables, AES-256-GCM encryption, Azure Key Vault  
✅ **Access Control** - 373/373 API routes secured, withEnhancedRoleAuth middleware  
✅ **Audit Logging** - Dual-tier logging (winston + Sentry), tamper-proof audit_logs table  
✅ **Backup & Recovery** - Documented policy, RTO 4hrs/RPO 24hrs, quarterly DR testing  
✅ **Encryption Standards** - TLS 1.3, key rotation, FIPS 140-2 HSM  
✅ **Compliance** - PIPEDA, GDPR, SOC 2 Type II (in progress), provincial privacy laws  

### Primary Gaps

The main gaps are **organizational/policy** rather than technical:

🔴 **P0 - Critical for Certification:**
- Information Security Policy (overarching ISMS policy document)
- Risk Assessment & Treatment methodology
- Asset Management register
- Supplier Security assessment process
- ISMS Scope Statement

🟡 **P1 - Important for Maturity:**
- Consolidated Access Control Policy
- Operations Security procedures consolidation
- Business Continuity Plan expansion
- HR Security policies (onboarding/offboarding)

🟢 **P2 - Quick Wins (90%+ complete):**
- 15 controls have full implementation but need formal policy documentation
- Most gaps can be closed through document consolidation

### Certification Timeline

**Estimated path to ISO 27001:2022 certification:**

- **Phase 1 (1-2 months):** Documentation P0 gaps, risk assessment framework
- **Phase 2 (2-3 months):** Policy consolidation, procedure documentation
- **Phase 3 (1 month):** Pre-audit readiness, evidence collection
- **Phase 4 (2-3 months):** Stage 1 audit (documentation), Stage 2 audit (implementation)

**Total Timeline:** 6-9 months to certification

---

## A.5 Organizational Controls (37 controls)

### A.5.1 Policies for Information Security

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P0**)

**Current State:**
- Multiple domain-specific policies exist (BACKUP_RECOVERY_POLICY.md, ENCRYPTION_STANDARDS.md, INCIDENT_RESPONSE_PLAN.md, ACCESS_CONTROL_POLICY.md)
- Policies demonstrate strong technical implementation understanding
- No overarching Information Security Policy document

**Evidence:**
- `docs/compliance/policies/BACKUP_RECOVERY_POLICY.md` (850+ lines, SOC 2 compliant)
- `docs/compliance/policies/INCIDENT_RESPONSE_PLAN.md` (750+ lines, P1-P4 severity)
- `docs/compliance/policies/ENCRYPTION_STANDARDS.md`
- `docs/compliance/policies/ACCESS_CONTROL_POLICY.md`

**Gap:**
- Missing: Consolidated Information Security Policy signed by executive management
- Missing: Security policy review and approval process
- Missing: Policy communication and acknowledgment process

**Recommendation:**
Create overarching Information Security Policy that references domain policies, includes management commitment, scope, objectives, and responsibilities.

---

### A.5.2 Information Security Roles and Responsibilities

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- 26 RBAC roles defined with hierarchical levels (0-100)
- Clear role hierarchy: member (10) → steward (20) → officer (30) → admin (50+) → system (100)
- Role-based API access control implemented across 373 API routes

**Evidence:**
- `lib/auth/roles.ts` - All 26 roles with clear descriptions
- `lib/api-auth-guard.ts` - withRoleAuth() enforces minimum role levels
- `lib/middleware/auth-middleware.ts` - Standardized auth enforcement

**Gap:** None (fully implemented)

---

### A.5.3 Segregation of Duties

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Database RLS policies enforce organization-based segregation
- Break-glass emergency access system requires justification
- Privileged operations require elevated roles (50+ for admin, 90+ for super admin)
- Employer/union data firewall prevents unauthorized cross-access

**Evidence:**
- `lib/db/with-rls-context.ts` - Automatic tenant isolation
- `services/employer-non-interference-service.ts` - Union-only data protection
- `db/schema/domains/compliance/employer-interference.ts` - Firewall architecture
- 238 RLS policies across critical tables

**Gap:** None (fully implemented)

---

### A.5.4 Management Responsibilities

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Security controls implemented and operational
- Audit logging tracks security decisions
- No formal management review process documented

**Evidence:**
- `docs/audit/SOC2_CONTROLS_EVIDENCE.md` - Control evidence
- Automated security testing via GitHub workflows

**Gap:**
- Missing: Formal management review schedule (quarterly security reviews)
- Missing: Management security metrics dashboard
- Missing: Security objectives and performance tracking

**Recommendation:**
Document quarterly security review process, define security KPIs, implement management dashboard.

---

### A.5.5 Contact with Authorities

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Incident Response Plan includes regulatory notification timelines
- 72-hour PIPEDA breach notification documented
- External contact list maintained

**Evidence:**
- `docs/compliance/policies/INCIDENT_RESPONSE_PLAN.md` (lines 663-700)
- Vendor contacts: Clerk, Stripe, Azure, Vercel
- Legal counsel and forensics partners identified

**Gap:** None (fully implemented)

---

### A.5.6 Contact with Special Interest Groups

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Union governance structure includes stakeholder engagement
- CLC partnership schema for congress-level collaboration
- Member feedback mechanisms

**Evidence:**
- `db/schema/domains/infrastructure/clc-partnership-schema.ts`
- Governance module with democratic elections
- Member communication channels

**Gap:** None (fully implemented)

---

### A.5.7 Threat Intelligence

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Sentry monitoring for application errors and security events
- Azure Security Center for infrastructure threats
- No formal threat intelligence subscription

**Evidence:**
- Sentry integration for real-time monitoring
- Security event classification in audit logs
- `docs/ai/AI_RISK_MANAGEMENT.md` - AI-specific threat analysis

**Gap:**
- Missing: Formal threat intelligence subscription (e.g., CISA alerts)
- Missing: Threat modeling framework
- Missing: Regular threat landscape reviews

**Recommendation:**
Subscribe to CISA alerts, implement quarterly threat landscape reviews, document threat modeling methodology.

---

### A.5.8 Information Security in Project Management

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- GitHub workflows enforce security gates (release contract)
- Code review process includes security considerations
- No formal security-in-SDLC documentation

**Evidence:**
- `.github/workflows/release-contract.yml` - Automated security gates
- 58/58 required security tests must pass before deployment
- Type checking and linting enforced

**Gap:**
- Missing: Secure SDLC policy document
- Missing: Security requirements in project planning template
- Missing: Security sign-off checklist

**Recommendation:**
Document secure SDLC policy, create project security checklist, formalize security review gates.

---

### A.5.9 Inventory of Information and Other Associated Assets

**Status:** 🔴 **NOT IMPLEMENTED** (Priority: **P0**)

**Current State:**
- No formal asset inventory
- Infrastructure documented in code (IaC)
- Database schema provides data asset understanding

**Evidence:**
- `docs/migration/MIGRATION_INVENTORY.md` - API route inventory
- Infrastructure as Code (IaC) in deployment files
- Database schema as implicit data inventory

**Gap:**
- Missing: Complete asset inventory (hardware, software, data, services)
- Missing: Asset classification and ownership
- Missing: Asset lifecycle management process
- Missing: Regular asset reviews

**Recommendation:**
Create comprehensive asset inventory including:
- Infrastructure assets (Azure resources, Vercel, Supabase)
- Software assets (SaaS services, libraries, APIs)
- Data assets (databases, storage accounts, backups)
- Information assets (documentation, contracts, IP)

Priority assets to document:
1. Azure PostgreSQL database (production/staging)
2. Azure Blob Storage (documents, backups)
3. Clerk authentication service
4. Stripe payment processor
5. Sentry monitoring
6. Third-party APIs (DocuSign, Whop, CLC)

---

### A.5.10 Acceptable Use of Information and Other Associated Assets

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- API rate limiting enforces usage boundaries
- RBAC controls define authorization boundaries
- No formal Acceptable Use Policy

**Evidence:**
- `lib/rate-limiter.ts` - 23 predefined rate limit configurations
- Access Control Policy defines role boundaries
- `docs/compliance/policies/ACCESS_CONTROL_POLICY.md`

**Gap:**
- Missing: Acceptable Use Policy (AUP) document
- Missing: Social media policy
- Missing: Personal use of systems policy
- Missing: User acknowledgment process

**Recommendation:**
Create Acceptable Use Policy covering:
- Authorized use of union systems
- Prohibited activities (data exfiltration, unauthorized access)
- Personal use boundaries
- Monitoring and enforcement

---

### A.5.11 Return of Assets

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- User deactivation process in access control policy
- No formal asset return checklist

**Evidence:**
- Access Control Policy mentions account deactivation
- Clerk provides account lifecycle management

**Gap:**
- Missing: Asset return checklist (laptops, credentials, documents)
- Missing: Exit interview security component
- Missing: Account closure validation process

**Recommendation:**
Document offboarding checklist including credential revocation, device return, data handover.

---

### A.5.12 Classification of Information

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Data classification policy implemented
- Four-tier classification: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
- Union-only data firewall enforces classification boundaries

**Evidence:**
- `docs/compliance/policies/DATA_CLASSIFICATION_POLICY.md`
- `db/schema/domains/compliance/employer-interference.ts` - Union-only classification
- Encryption enforced for CONFIDENTIAL/RESTRICTED data

**Gap:** None (fully implemented)

---

### A.5.13 Labelling of Information

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- Database-level classification via schema
- No visual labelling on documents/emails

**Evidence:**
- Data classification in database schema
- Document metadata includes sensitivity flags

**Gap:**
- Missing: Document header/footer labelling
- Missing: Email classification markers
- Missing: Screen watermarks for sensitive data

**Recommendation:**
Implement visual classification markers for documents and emails. Consider auto-labelling based on data sensitivity.

---

### A.5.14 Information Transfer

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- TLS 1.3 for all data in transit
- API authentication with JWT tokens
- Webhook signature verification

**Evidence:**
- TLS 1.3 enforced via Azure App Service
- `lib/middleware/auth-middleware.ts` - Bearer token validation
- Webhook signature verification (Stripe, DocuSign)

**Gap:** None (fully implemented)

---

### A.5.15 Access Control

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Comprehensive access control policy
- 373/373 API routes secured (100% coverage)
- RLS policies on 70+ critical tables

**Evidence:**
- `docs/compliance/policies/ACCESS_CONTROL_POLICY.md` (500+ lines)
- `lib/api-auth-guard.ts` - Canonical authentication module
- 238 database-level RLS policies

**Gap:** None (fully implemented)

---

### A.5.16 Identity Management

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Clerk authentication with JWT tokens
- User lifecycle management (creation, modification, deactivation)
- MFA support for privileged accounts

**Evidence:**
- Clerk v5.3.7 integration
- User management APIs
- MFA requirements in Access Control Policy

**Gap:** None (fully implemented)

---

### A.5.17 Authentication Information

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Clerk manages password policies (min 8 chars, complexity requirements)
- JWT tokens with expiration
- Session management with secure cookies

**Evidence:**
- Clerk authentication configuration
- Session timeout policies
- Token rotation on refresh

**Gap:** None (fully implemented)

---

### A.5.18 Access Rights

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Role-based access provisioning
- Automatic access via organization membership
- Access documented in role definitions

**Evidence:**
- `lib/auth/roles.ts` - 26 roles with hierarchical levels
- Organization-based provisioning
- RLS enforces least privilege at database level

**Gap:** None (fully implemented)

---

### A.5.19 Information Security in Supplier Relationships

**Status:** 🔴 **NOT IMPLEMENTED** (Priority: **P0**)

**Current State:**
- Key suppliers identified (Clerk, Stripe, Azure, Vercel, Sentry)
- No formal vendor risk assessment process
- No supplier security agreements beyond standard ToS

**Evidence:**
- `docs/compliance/policies/INCIDENT_RESPONSE_PLAN.md` (lines 663-700) - Vendor contact list
- Runbooks reference external vendor contacts
- `docs/union-blind-spot-validator/runbooks/PRODUCTION_RUNBOOKS.md`

**Gap:**
- Missing: Vendor risk assessment framework
- Missing: Supplier security questionnaires
- Missing: Third-party risk register
- Missing: Supplier contract security requirements
- Missing: Annual supplier reviews

**Recommendation:**
Create Supplier Security Management program including:

**Priority 1 - Critical Suppliers:**
1. **Clerk** (Authentication) - SOC 2, security assessment
2. **Stripe** (Payments) - PCI-DSS validated
3. **Azure** (Infrastructure) - Rely on Microsoft SOC 2/ISO 27001
4. **Vercel** (Hosting) - Security questionnaire
5. **Supabase** (Database) - Security documentation review

**Framework:**
- Vendor risk assessment template
- Security questionnaire (based on SOC 2/ISO 27001)
- Contract security clauses (data protection, breach notification, audit rights)
- Annual review schedule

---

### A.5.20 Addressing Information Security Within Supplier Agreements

**Status:** 🔴 **NOT IMPLEMENTED** (Priority: **P0**)

**Current State:**
- Standard vendor ToS/MSAs in place
- No custom security clauses

**Evidence:**
- Vendor agreements via standard procurement

**Gap:**
- Missing: Security requirements in contracts
- Missing: SLA definitions for security
- Missing: Breach notification clauses
- Missing: Right-to-audit clauses

**Recommendation:**
Amend critical supplier contracts to include:
- Data protection requirements (encryption, access controls)
- Security incident notification (24-hour SLA)
- Annual security attestation (SOC 2 reports)
- Right to audit security controls
- Liability and indemnification for breaches

---

### A.5.21 Managing Information Security in ICT Supply Chain

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Dependabot alerts for vulnerable dependencies
- GitHub security scanning enabled
- No formal supply chain risk process

**Evidence:**
- `.github/dependabot.yml` - Automated dependency updates
- GitHub security alerts enabled

**Gap:**
- Missing: Software Bill of Materials (SBOM)
- Missing: Third-party library approval process
- Missing: Regular dependency security reviews

**Recommendation:**
Implement supply chain security program:
- Generate SBOM for all releases
- Document dependency approval criteria
- Quarterly dependency security reviews
- License compliance scanning

---

### A.5.22 Monitoring, Review and Change Management of Supplier Services

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Sentry monitors third-party API errors
- No formal supplier performance reviews

**Evidence:**
- Error monitoring for vendor integrations (Stripe, DocuSign, Clerk)
- API rate limiting prevents abuse

**Gap:**
- Missing: Supplier performance metrics (uptime, response time)
- Missing: Annual supplier review meetings
- Missing: Supplier change notification process

**Recommendation:**
Create supplier monitoring dashboard with SLA tracking, implement annual supplier reviews.

---

### A.5.23 Information Security for Use of Cloud Services

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Cloud infrastructure fully documented
- Azure Canada Central/East for data residency
- Shared responsibility model understood

**Evidence:**
- Azure PostgreSQL with geo-replication
- Azure Blob Storage for backups
- Vercel Edge for compute
- Data residency requirements met (Canada-only storage)

**Gap:** None (cloud architecture well-documented and secured)

---

### A.5.24 Information Security Incident Management Planning and Preparation

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Comprehensive Incident Response Plan
- P1-P4 severity classification
- Incident response team defined

**Evidence:**
- `docs/compliance/policies/INCIDENT_RESPONSE_PLAN.md` (750+ lines)
- 72-hour PIPEDA breach notification
- Forensics partner and legal counsel identified

**Gap:** None (fully implemented)

---

### A.5.25 Assessment and Decision on Information Security Events

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Security event classification in audit logs
- Severity levels defined (info, low, medium, high, critical)
- Automated alerting via Sentry

**Evidence:**
- Audit log severity classification
- Sentry real-time alerts
- Security event categorization

**Gap:** None (fully implemented)

---

### A.5.26 Response to Information Security Incidents

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- 6-phase incident response (preparation → lessons learned)
- Containment strategies by incident type
- Post-incident review process

**Evidence:**
- `docs/compliance/policies/INCIDENT_RESPONSE_PLAN.md`
- Break-glass emergency access system
- Incident escalation procedures

**Gap:** None (fully implemented)

---

### A.5.27 Learning from Information Security Incidents

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- Post-incident review mentioned in IRP
- No formal lessons learned repository

**Evidence:**
- Incident Response Plan includes post-mortem process

**Gap:**
- Missing: Incident database with lessons learned
- Missing: Trending analysis of incidents
- Missing: Quarterly incident review meetings

**Recommendation:**
Create incident database, implement quarterly security incident reviews.

---

### A.5.28 Collection of Evidence

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Tamper-proof audit logs
- Immutability constraints on audit_logs table
- Comprehensive logging with correlation IDs

**Evidence:**
- `db/schema/domains/infrastructure/audit.ts`
- `0064_add_immutability_triggers.sql` - Prevents log modification
- Audit log retention (7 years for financial records)

**Gap:** None (fully implemented)

---

### A.5.29 Information Security During Disruption

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Business Continuity integrated with Backup/Recovery Policy
- Force majeure disaster scenarios documented
- Quarterly DR testing schedule

**Evidence:**
- `docs/compliance/policies/BACKUP_RECOVERY_POLICY.md` (lines 700-800)
- RTO 4 hours for critical systems
- Geo-replication (Canada Central → Canada East)

**Gap:** None (fully implemented)

---

### A.5.30 ICT Readiness for Business Continuity

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Documented backup architecture
- RPO 24 hours
- Automated backup testing

**Evidence:**
- Azure automated backups with 35-day retention
- Quarterly restoration testing
- Backup validation procedures

**Gap:** None (fully implemented)

---

### A.5.31 Legal, Statutory, Regulatory and Contractual Requirements

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- PIPEDA compliance (Canadian federal privacy)
- Provincial privacy laws (AB/BC PIPA, QC Law 25, ON PHIPA)
- GDPR compliance for EU members
- SOC 2 Type II controls implemented

**Evidence:**
- `lib/services/provincial-privacy-service.ts` - Multi-jurisdiction compliance
- GDPR modules (cookie consent, data export, right to be forgotten)
- SOC 2 controls evidence documented

**Gap:** None (comprehensive compliance framework implemented)

---

### A.5.32 Intellectual Property Rights

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Open source license compliance via dependency scanning
- Proprietary code protected under repo license

**Evidence:**
- `license` file in repository
- Dependency license scanning via npm audit
- Third-party library documentation

**Gap:** None (fully implemented)

---

### A.5.33 Protection of Records

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- 7-year retention for financial records
- Immutable audit logs
- WORM storage for critical backups

**Evidence:**
- Retention policy documented in Backup/Recovery Policy
- Immutability triggers on audit_logs table
- Azure immutable blob storage configuration

**Gap:** None (fully implemented)

---

### A.5.34 Privacy and Protection of PII

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- AES-256-GCM encryption for PII (SIN, SSN, banking)
- Column-level encryption with Azure Key Vault
- Privacy consent management system

**Evidence:**
- `lib/encryption.ts` (890 lines) - Comprehensive encryption service
- `components/compliance/privacy-consent-manager.tsx`
- PII access tracked in audit logs

**Gap:** None (fully implemented)

---

### A.5.35 Independent Review of Information Security

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Multiple security audit reports exist
- No formal independent audit schedule

**Evidence:**
- `docs/audit/INVESTOR_AUDIT_REPORT_2026-02-09.md`
- `docs/security/SECURITY_AUDIT_RLS.md`
- Internal security assessments completed

**Gap:**
- Missing: Annual independent security audit commitment
- Missing: Penetration testing schedule
- Missing: Third-party audit firm engagement

**Recommendation:**
Engage independent security auditor for annual reviews, schedule penetration testing (at least annually).

---

### A.5.36 Compliance with Policies, Rules and Standards for Information Security

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Automated compliance checks in CI/CD
- Release contract enforces security standards
- Policy compliance tracked in audit logs

**Evidence:**
- `.github/workflows/release-contract.yml` - 58/58 required tests
- Automated security scanning
- Policy violations logged

**Gap:** None (fully implemented)

---

### A.5.37 Documented Operating Procedures

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Multiple runbooks and operational guides exist
- No centralized operations manual

**Evidence:**
- `docs/union-blind-spot-validator/runbooks/PRODUCTION_RUNBOOKS.md`
- Deployment guides and migration procedures
- Security implementation guides

**Gap:**
- Missing: Consolidated Operations Manual
- Missing: Procedure versioning and change control
- Missing: Regular procedure reviews

**Recommendation:**
Create centralized Operations Manual with index to all procedures, implement procedure review schedule.

---

## A.6 People Controls (8 controls)

### A.6.1 Screening

**Status:** 🔴 **NOT IMPLEMENTED** (Priority: **P1**)

**Current State:**
- No formal background screening policy
- Union environment may limit screening scope

**Gap:**
- Missing: Background check requirements
- Missing: Reference check procedures
- Missing: Screening for privileged access roles

**Recommendation:**
Define appropriate screening process considering union context. Minimum: reference checks for admin roles, criminal record checks for financial role.

---

### A.6.2 Terms and Conditions of Employment

**Status:** 🔴 **NOT IMPLEMENTED** (Priority: **P1**)

**Current State:**
- No documented HR security requirements
- No confidentiality agreements in place

**Gap:**
- Missing: Confidentiality/NDA templates
- Missing: Acceptable use acknowledgment
- Missing: Security responsibilities in job descriptions

**Recommendation:**
Create security clauses for employment contracts, NDA templates, security acknowledgment forms.

---

### A.6.3 Information Security Awareness, Education and Training

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Training coordinator role defined
- Content manager role for training materials
- No formal security training program

**Evidence:**
- `lib/auth/roles.ts` - TRAINING_COORDINATOR role
- Content management module exists

**Gap:**
- Missing: Security awareness training program
- Missing: Required training for new users
- Missing: Annual security refresher training
- Missing: Phishing simulation exercises

**Recommendation:**
Develop security awareness program:
- Onboarding security training (30 minutes)
- Annual refresher training
- Phishing simulation campaign (quarterly)
- Role-specific training (admin, financial)

---

### A.6.4 Disciplinary Process

**Status:** 🔴 **NOT IMPLEMENTED** (Priority: **P2**)

**Current State:**
- No formal security violation disciplinary process

**Gap:**
- Missing: Security violation categories
- Missing: Disciplinary action matrix
- Missing: Escalation procedures

**Recommendation:**
Document disciplinary process for security violations (warning → suspension → termination based on severity).

---

### A.6.5 Responsibilities After Termination or Change of Employment

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Access Control Policy mentions account deactivation
- No comprehensive offboarding checklist

**Evidence:**
- User deactivation procedures in access control policy

**Gap:**
- Missing: Offboarding security checklist
- Missing: Knowledge transfer requirements
- Missing: Post-employment confidentiality obligations

**Recommendation:**
Create comprehensive offboarding procedure including credential revocation, asset return, confidentiality reminder.

---

### A.6.6 Confidentiality or Non-Disclosure Agreements

**Status:** 🔴 **NOT IMPLEMENTED** (Priority: **P1**)

**Current State:**
- No formal NDA template or process

**Gap:**
- Missing: Employee NDA template
- Missing: Contractor NDA template
- Missing: Third-party NDA template

**Recommendation:**
Create NDA templates for employees, contractors, vendors. Implement signing workflow.

---

### A.6.7 Remote Working

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P1**)

**Current State:**
- Access Control Policy includes remote work section
- VPN not mentioned (cloud SaaS architecture)

**Evidence:**
- `docs/compliance/policies/ACCESS_CONTROL_POLICY.md` - Remote work policy
- MFA required for sensitive data access

**Gap:**
- Missing: Detailed remote work security requirements
- Missing: Home office security standards
- Missing: Device security requirements

**Recommendation:**
Expand remote work policy with home security requirements, encrypted device policies, screen privacy.

---

### A.6.8 Information Security Event Reporting

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Security event reporting via Sentry
- Audit logging captures suspicious activities
- Incident reporting process documented

**Evidence:**
- Real-time security alerts via Sentry
- Audit log review procedures
- Incident Response Plan includes reporting channels

**Gap:** None (fully implemented)

---

## A.7 Physical Controls (14 controls)

### Physical Security Context

Union Eyes operates as a **cloud SaaS platform** leveraging:
- **Azure** - Database and storage infrastructure
- **Vercel** - Compute and edge functions
- **Supabase** - Additional database services

Physical security controls are **delegated to cloud providers** per shared responsibility model:
- **Azure:** Microsoft SOC 2/ISO 27001 certified data centers
- **Vercel:** AWS infrastructure with physical security
- **Supabase:** AWS infrastructure with physical security

The platform has **no on-premise infrastructure** requiring direct physical security controls.

---

### A.7.1 Physical Security Perimeters

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
Physical security managed by Azure/AWS data centers (SOC 2/ISO 27001 certified).

**Evidence:**
- Azure Canada Central/East regions
- Microsoft physical security controls inherited
- Multi-factor authentication for logical access

**Compliance Approach:**
Reference Azure/AWS security certifications in ISMS documentation.

---

### A.7.2 Physical Entry

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
No Union Eyes-managed facilities requiring physical entry controls.

**Compliance Approach:**
Rely on cloud provider certifications. Document office security if Union Eyes has physical offices.

---

### A.7.3 Securing Offices, Rooms and Facilities

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Context:**
If Union Eyes has office space, need to document office security measures.

**Gap:**
- Unknown: Union Eyes office locations and security
- Missing: Office access control documentation
- Missing: Visitor management procedures

**Recommendation:**
If Union Eyes has offices, document:
- Badge access or key management
- Visitor registration procedures
- Clean desk policy
- Equipment security (laptop locks)

---

### A.7.4 Physical Security Monitoring

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
Cloud provider manages data center monitoring.

**Compliance Approach:**
Reference Azure Security Center monitoring capabilities.

---

### A.7.5 Protecting Against Physical and Environmental Threats

**Status:** ✅ **FULLY IMPLEMENTED** (Inherited)

**Context:**
Azure data centers provide environmental controls (fire suppression, cooling, power redundancy).

**Evidence:**
- Azure geo-replication for disaster recovery
- UPS and generator backup power
- Fire suppression systems

**Compliance Approach:**
Reference Azure Compliance documentation (SOC 2 reports).

---

### A.7.6 Working in Secure Areas

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
No secure areas under Union Eyes control.

---

### A.7.7 Clear Desk and Clear Screen

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Context:**
Relevant for remote workers and any office staff.

**Current State:**
- Access Control Policy mentions clean desk for remote work
- Screen lock timeouts enforced by Clerk session expiration

**Evidence:**
- Remote work security guidelines exist
- Automatic session timeout (configurable)

**Gap:**
- Missing: Formal clear desk/clear screen policy
- Missing: Screen lock requirements for endpoints
- Missing: Document handling procedures

**Recommendation:**
Formalize clear desk/screen policy, require screen locks on workstations.

---

### A.7.8 Equipment Siting and Protection

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
No Union Eyes-managed equipment in data centers.

---

### A.7.9 Security of Assets Off-Premises

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Context:**
Relevant for employee laptops and mobile devices.

**Current State:**
- MFA required for sensitive access
- No formal device security policy

**Gap:**
- Missing: Device encryption requirements
- Missing: Lost device reporting procedures
- Missing: Anti-theft measures (cable locks for laptops)

**Recommendation:**
Create mobile device security policy requiring full-disk encryption, remote wipe capability, theft reporting.

---

### A.7.10 Storage Media

**Status:** ✅ **FULLY IMPLEMENTED**

**Context:**
All storage is cloud-based with encryption.

**Evidence:**
- Azure Blob Storage with encryption at rest
- Database encryption enabled
- No physical media used

**Gap:** None (cloud storage secured)

---

### A.7.11 Supporting Utilities

**Status:** ✅ **FULLY IMPLEMENTED** (Inherited)

**Context:**
Azure data centers provide redundant power, cooling, networking.

**Evidence:**
- Azure regional SLA 99.99% uptime
- Redundant power and cooling systems
- Multiple network paths

**Compliance Approach:**
Reference Azure SLA documentation.

---

### A.7.12 Cabling Security

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
No Union Eyes-managed cabling infrastructure.

---

### A.7.13 Equipment Maintenance

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
Cloud provider manages hardware maintenance.

**Compliance Approach:**
Reference Azure maintenance windows and patch management.

---

### A.7.14 Secure Disposal or Re-use of Equipment

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
Cloud provider handles hardware disposal per SOC 2 requirements.

**Compliance Approach:**
Reference Azure secure disposal and sanitization procedures in SOC 2 reports.

---

## A.8 Technological Controls (34 controls)

### A.8.1 User Endpoint Devices

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Context:**
SaaS platform - Union Eyes does not manage user endpoints, but can provide security guidance.

**Current State:**
- Browser-based access (no endpoint control)
- MFA recommended for sensitive roles

**Gap:**
- Missing: Endpoint security recommendations for users
- Missing: Supported browser versions policy
- Missing: Mobile device management guidance

**Recommendation:**
Publish endpoint security guidelines:
- Supported browsers (Chrome, Firefox, Safari - latest 2 versions)
- Anti-virus recommendations
- Operating system patch requirements
- Mobile device security (iOS/Android)

---

### A.8.2 Privileged Access Rights

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- 26-role RBAC with hierarchical levels
- Admin actions require level 50+
- Super admin requires level 90+
- Privileged actions logged in audit trail

**Evidence:**
- `lib/api-auth-guard.ts` - withRoleAuth() enforces minimum levels
- `lib/auth/roles.ts` - Hierarchical role definitions
- Break-glass emergency access with justification

**Gap:** None (fully implemented)

---

### A.8.3 Information Access Restriction

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- RLS on 70+ critical tables
- Organization-based data isolation
- 238 database policies enforce access boundaries

**Evidence:**
- `lib/db/with-rls-context.ts` - Automatic tenant isolation
- `docs/security/SECURITY_AUDIT_RLS.md` - Security level 7/10
- Employer/union firewall prevents unauthorized access

**Gap:** None (fully implemented)

---

### A.8.4 Access to Source Code

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- GitHub repository access controlled
- Branch protection rules enforce code review
- Commit signing recommended

**Evidence:**
- GitHub team access controls
- Pull request approval requirements
- Release contract workflow

**Gap:** None (fully implemented)

---

### A.8.5 Secure Authentication

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Clerk authentication with JWT tokens
- MFA support for privileged accounts
- Password complexity requirements enforced
- Session management with secure cookies

**Evidence:**
- Clerk v5.3.7 integration
- JWT token validation on every request
- Session timeout policies
- `docs/compliance/policies/ACCESS_CONTROL_POLICY.md` - MFA requirements

**Gap:** None (fully implemented)

---

### A.8.6 Capacity Management

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- Azure auto-scaling for database
- Vercel auto-scaling for compute
- No formal capacity planning process

**Evidence:**
- Azure Database elastic pools
- Vercel serverless architecture

**Gap:**
- Missing: Capacity monitoring dashboard
- Missing: Growth forecasting process
- Missing: Capacity threshold alerts

**Recommendation:**
Implement capacity monitoring dashboard, define growth forecasting based on member additions.

---

### A.8.7 Protection Against Malware

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Context:**
SaaS architecture reduces malware risk, but file uploads are a vector.

**Current State:**
- File upload validation (size, type)
- No anti-malware scanning on uploads

**Evidence:**
- Input validation on file uploads
- Azure Blob Storage threat detection

**Gap:**
- Missing: File upload malware scanning
- Missing: Anti-malware for uploaded documents

**Recommendation:**
Integrate file scanning service (e.g., ClamAV, Azure Defender for Storage) for document uploads.

---

### A.8.8 Management of Technical Vulnerabilities

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Dependabot alerts for vulnerable dependencies
- GitHub security scanning enabled
- Automated dependency updates

**Evidence:**
- `.github/dependabot.yml` - Weekly dependency scans
- GitHub security alerts
- Patch management via automated PRs

**Gap:** None (fully implemented)

---

### A.8.9 Configuration Management

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Infrastructure as Code (IaC) via deployment scripts
- Environment variables for configuration
- Configuration changes tracked in Git

**Evidence:**
- `deploy-v2.ps1` - Deployment automation
- `.env.example` - Configuration template
- Version controlled infrastructure

**Gap:** None (fully implemented)

---

### A.8.10 Information Deletion

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- GDPR "right to be forgotten" API implemented
- Soft deletes used in most tables
- No formal data retention enforcement

**Evidence:**
- GDPR compliance endpoints
- Cascade delete policies in database
- Backup retention policy documented

**Gap:**
- Missing: Automated data retention enforcement
- Missing: Scheduled purge of expired data
- Missing: Secure deletion verification

**Recommendation:**
Implement automated retention policy enforcement, scheduled purge jobs, secure deletion logging.

---

### A.8.11 Data Masking

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- PII encrypted at rest
- No data masking in non-production environments

**Evidence:**
- AES-256-GCM encryption for PII fields
- Column-level encryption

**Gap:**
- Missing: Data masking for development/staging
- Missing: Anonymization for reporting/analytics

**Recommendation:**
Implement data masking pipeline for non-production environments, anonymize PII in analytics exports.

---

### A.8.12 Data Leakage Prevention

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- RLS prevents cross-tenant data leakage
- Encryption prevents data exposure at rest
- TLS prevents data exposure in transit
- Rate limiting prevents bulk data extraction

**Evidence:**
- RLS on 70+ tables
- Export rate limits (max 10/hour for bulk exports)
- Audit logging tracks data access

**Gap:** None (fully implemented)

---

### A.8.13 Information Backup

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Automated Azure database backups (35-day retention)
- Geo-replicated backups (Canada Central → Canada East)
- Quarterly backup restoration testing
- RPO 24 hours

**Evidence:**
- `docs/compliance/policies/BACKUP_RECOVERY_POLICY.md` (850+ lines)
- Automated backup schedule
- Restoration test schedule

**Gap:** None (fully implemented)

---

### A.8.14 Redundancy of Information Processing Facilities

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Azure geo-replication (primary: Canada Central, secondary: Canada East)
- Vercel global edge network
- Database read replicas

**Evidence:**
- Backup/Recovery Policy documents redundancy
- Azure availability zones
- Multi-region deployment capability

**Gap:** None (fully implemented)

---

### A.8.15 Logging

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Dual-tier logging (application logs + audit logs)
- Winston structured logging
- Sentry for error tracking
- Audit logs with correlation IDs

**Evidence:**
- `lib/audit-logger.ts` - Comprehensive audit logging
- `db/schema/domains/infrastructure/audit.ts` - Audit log schema
- Tamper-proof audit logs (immutability constraints)

**Gap:** None (fully implemented)

---

### A.8.16 Monitoring Activities

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Sentry real-time monitoring
- Azure Security Center for infrastructure
- Automated alerts for critical events
- Security event categorization

**Evidence:**
- Sentry integration across application
- Security event classification (info, low, medium, high, critical)
- Automated alert routing

**Gap:** None (fully implemented)

---

### A.8.17 Clock Synchronisation

**Status:** ✅ **FULLY IMPLEMENTED** (Inherited)

**Context:**
Azure and Vercel infrastructure use NTP for time synchronization.

**Evidence:**
- Azure infrastructure NTP servers
- UTC timestamps in database
- Consistent timezone handling

**Gap:** None (cloud infrastructure provides accurate time)

---

### A.8.18 Use of Privileged Utility Programs

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Database admin tools require super admin role (level 90+)
- Break-glass access logged and audited
- System role (level 100) reserved for automation

**Evidence:**
- Admin-only API routes protected by withAdminOnly()
- Database migration scripts require privileged access
- Audit logging for all privileged operations

**Gap:** None (fully implemented)

---

### A.8.19 Installation of Software on Operational Systems

**Status:** ✅ **FULLY IMPLEMENTED**

**Context:**
PaaS/SaaS architecture - no manual software installation.

**Evidence:**
- Vercel manages runtime environment
- Azure manages database software
- Dependency management via package.json

**Gap:** None (cloud platform controls software installation)

---

### A.8.20 Networks Security

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- TLS 1.3 for all communications
- Azure Virtual Networks with NSG rules
- API authentication on all endpoints

**Evidence:**
- Enforced TLS 1.3 via Azure App Service
- Network segmentation via Azure VNet
- No public database endpoints (private VNet only)

**Gap:** None (fully implemented)

---

### A.8.21 Security of Network Services

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Third-party service integrations authenticated
- Webhook signature verification
- API key rotation capability

**Evidence:**
- Stripe webhook signature verification
- DocuSign webhook authentication
- API key management for integrations

**Gap:** None (fully implemented)

---

### A.8.22 Segregation of Networks

**Status:** ✅ **FULLY IMPLEMENTED**

**Context:**
Cloud architecture provides network segregation.

**Evidence:**
- Azure production/staging environment separation
- Separate database instances per environment
- Environment-specific API keys

**Gap:** None (fully implemented)

---

### A.8.23 Web Filtering

**Status:** ⚪ **NOT APPLICABLE** (SaaS Platform)

**Context:**
Union Eyes does not manage user endpoints or outbound web traffic.

**Compliance Approach:**
Document that web filtering is end-user responsibility (union IT departments).

---

### A.8.24 Use of Cryptography

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- AES-256-GCM for data at rest
- TLS 1.3 for data in transit
- Azure Key Vault for key management
- 90-day key rotation
- FIPS 140-2 Level 2 HSM

**Evidence:**
- `lib/encryption.ts` (890 lines) - Comprehensive encryption service
- `docs/compliance/policies/ENCRYPTION_STANDARDS.md`
- Azure Key Vault integration
- Automated key rotation

**Gap:** None (world-class encryption implementation)

---

### A.8.25 Secure Development Life Cycle

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- GitHub workflows enforce security gates
- Release contract requires 58/58 tests passing
- Automated security scanning
- Code review required for all changes

**Evidence:**
- `.github/workflows/release-contract.yml` - Deployment gates
- Branch protection rules
- Security-focused test suite
- `docs/security/API_SECURITY_MIGRATION_GUIDE.md`

**Gap:** None (fully implemented)

---

### A.8.26 Application Security Requirements

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Input validation via Zod schemas
- SQL injection prevention (ORM + runtime scanning)
- XSS prevention via React (auto-escaping)
- CSRF protection via SameSite cookies

**Evidence:**
- Zod validation on all API endpoints
- Drizzle ORM prevents SQL injection
- `__tests__/lib/middleware/sql-injection-prevention.test.ts`
- 100 SQL injection test cases (100% blocked)

**Gap:** None (fully implemented)

---

### A.8.27 Secure System Architecture and Engineering Principles

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Defense-in-depth architecture
- Least privilege enforcement
- Secure-by-default configuration
- Fail-secure design (RLS fail-closed)

**Evidence:**
- Multi-layer security (API → RLS → Encryption → Audit)
- RLS fail-closed (no access without valid context)
- Environment variable validation at startup
- `docs/security/RLS_AUTH_RBAC_ALIGNMENT.md`

**Gap:** None (fully implemented)

---

### A.8.28 Secure Coding

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- TypeScript for type safety
- ESLint for code quality
- SQL injection detection
- Secret scanning in CI/CD

**Evidence:**
- TypeScript strict mode enabled
- ESLint rules enforced in CI
- `eslint-sql-injection-rules.js` - Custom SQL injection rules
- GitHub secret scanning enabled

**Gap:** None (fully implemented)

---

### A.8.29 Security Testing in Development and Acceptance

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- 58 required security tests (100% passing)
- 2793/3224 total tests (86.6% coverage)
- Automated security scanning in CI
- RLS scanner for tenant isolation

**Evidence:**
- `__tests__/security/auth-authorization.test.ts` - Authentication tests
- `__tests__/lib/db/rls-usage.test.ts` - RLS validation
- `scripts/scan-rls-usage-v2.ts` - RLS scanner
- Release contract blocks deployment on test failure

**Gap:** None (comprehensive security testing)

---

### A.8.30 Outsourced Development

**Status:** ⚪ **NOT APPLICABLE**

**Context:**
No outsourced development currently.

**Recommendation:**
If outsourcing in future, require:
- Signed NDA and IP assignment
- Code review by Union Eyes team
- Security testing before acceptance
- Background checks for contractors

---

### A.8.31 Separation of Development, Test and Production Environments

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Separate Azure database instances (dev, staging, production)
- Environment-specific API keys
- Production data never used in development

**Evidence:**
- `.env.example` - Environment configuration template
- Separate Vercel deployments per environment
- Database connection strings environment-specific

**Gap:** None (fully implemented)

---

### A.8.32 Change Management

**Status:** ✅ **FULLY IMPLEMENTED**

**Current State:**
- Git-based change tracking
- Pull request approval required
- Release contract enforces validation
- Rollback procedures documented

**Evidence:**
- GitHub branch protection rules
- Release contract workflow
- Deployment automation with rollback capability

**Gap:** None (fully implemented)

---

### A.8.33 Test Information

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- Test data uses synthetic information
- No formal test data management policy

**Evidence:**
- Test suites use mock data
- Seed scripts generate synthetic data

**Gap:**
- Missing: Test data policy document
- Missing: Production data sanitization process for testing
- Missing: Test data deletion after use

**Recommendation:**
Document test data policy prohibiting production data in testing, formalize data sanitization procedures.

---

### A.8.34 Protection of Information Systems During Audit Testing

**Status:** 🟡 **PARTIALLY IMPLEMENTED** (Priority: **P2**)

**Current State:**
- Read-only audit queries where possible
- No formal audit testing guidelines

**Gap:**
- Missing: Audit access controls documentation
- Missing: Audit testing approval process
- Missing: Post-audit evidence retention

**Recommendation:**
Create audit testing policy with approval workflow, read-only access guidelines, evidence handling procedures.

---

## Summary of Implementation Status

### By Category

| Category | Fully Implemented | Partially Implemented | Not Implemented | Not Applicable |
|----------|-------------------|-----------------------|-----------------|----------------|
| **A.5 - Organizational (37)** | 23 (62%) | 11 (30%) | 3 (8%) | 0 (0%) |
| **A.6 - People (8)** | 1 (12%) | 3 (38%) | 4 (50%) | 0 (0%) |
| **A.7 - Physical (14)** | 4 (29%) | 3 (21%) | 0 (0%) | 7 (50%) |
| **A.8 - Technological (34)** | 27 (79%) | 6 (18%) | 0 (0%) | 1 (3%) |
| **TOTAL (93)** | **55 (59%)** | **23 (25%)** | **7 (8%)** | **8 (9%)** |

### By Priority

| Priority | Count | Description | Timeline |
|----------|-------|-------------|----------|
| **P0 - Critical** | 5 | Required for certification | Weeks 1-8 |
| **P1 - High** | 14 | Important for maturity | Weeks 9-16 |
| **P2 - Medium** | 11 | Nice-to-have improvements | Weeks 17-24 |
| **P3 - Low** | 0 | Long-term enhancements | As resources allow |

---

## Quick Wins (Controls 90%+ Complete)

These 15 controls have full technical implementation but need formal policy documentation:

### Priority 1 - Documentation Only (No New Implementation)

1. **A.5.3 Segregation of Duties** - Document break-glass procedures formally
2. **A.8.5 Secure Authentication** - Consolidate MFA requirements into policy
3. **A.8.24 Use of Cryptography** - Formalize ENCRYPTION_STANDARDS.md as Cryptography Policy
4. **A.5.15 Access Control** - Already have ACCESS_CONTROL_POLICY.md, just needs review
5. **A.5.24-28 Incident Management** - Already have INCIDENT_RESPONSE_PLAN.md, formalize

### Priority 2 - Minor Enhancements + Documentation

6. **A.5.37 Documented Operating Procedures** - Consolidate runbooks into Operations Manual
7. **A.6.3 Security Awareness** - Create training program using existing roles
8. **A.6.5 Offboarding** - Expand access control policy with checklist
9. **A.7.7 Clear Desk/Screen** - Formalize existing remote work guidelines
10. **A.8.6 Capacity Management** - Document Azure auto-scaling configuration
11. **A.8.10 Information Deletion** - Document GDPR deletion as retention policy
12. **A.8.11 Data Masking** - Document development data practices
13. **A.8.33 Test Information** - Formalize synthetic test data policy
14. **A.8.34 Audit Testing** - Create audit access guidelines
15. **A.7.9 Assets Off-Premises** - Create device security guidelines

**Total Effort:** 2-3 weeks for documentation

---

## Critical Gaps Requiring Implementation (P0)

### 1. Information Security Policy (A.5.1) - WEEK 1-2

**Status:** 🔴 Missing  
**Effort:** 3-5 days  
**Dependencies:** None

**What to Create:**

**Document:** `docs/compliance/policies/INFORMATION_SECURITY_POLICY.md`

**Content:**
```markdown
# Information Security Policy
**Version:** 1.0
**Effective Date:** [Date]
**Review Schedule:** Annual
**Approved By:** [Executive Management]

## 1. Purpose
To protect Union Eyes information assets from all threats, internal and external, deliberate or accidental.

## 2. Scope
Applies to all information, systems, users, and third parties accessing Union Eyes resources.

## 3. Security Objectives
- Confidentiality: Protect sensitive union and member data
- Integrity: Ensure accuracy and completeness of information
- Availability: Ensure authorized access when needed

## 4. Management Commitment
[Executive statement supporting information security]

## 5. Policy Framework
This policy is supported by domain-specific policies:
- Access Control Policy
- Encryption Standards
- Backup and Recovery Policy
- Incident Response Plan
- Data Classification Policy

## 6. Responsibilities
- Executive Management: Overall accountability
- Security Team: Policy implementation and monitoring
- All Users: Compliance with policies

## 7. Compliance
Non-compliance may result in disciplinary action.

## 8. Policy Review
This policy will be reviewed annually and updated as needed.
```

**References:**
- ISO 27001:2022 Section 5.2
- Existing policies in `docs/compliance/policies/`

---

### 2. Asset Management Register (A.5.9) - WEEK 1-2

**Status:** 🔴 Missing  
**Effort:** 5-7 days  
**Dependencies:** None

**What to Create:**

**Document:** `docs/compliance/ASSET_INVENTORY.md`

**Content Structure:**
```markdown
# Information Asset Inventory

## 1. Infrastructure Assets

### Cloud Services
| Asset | Type | Provider | Owner | Classification | Location |
|-------|------|----------|-------|----------------|----------|
| Production Database | PostgreSQL | Azure | CTO | CRITICAL | Canada Central |
| Staging Database | PostgreSQL | Azure | CTO | HIGH | Canada Central |
| Blob Storage (Prod) | Object Storage | Azure | CTO | CRITICAL | Canada Central |
| Backup Storage | Object Storage | Azure | CTO | CRITICAL | Canada East |
| Application Hosting | Edge Functions | Vercel | CTO | CRITICAL | Global |
| Authentication Service | SaaS | Clerk | CTO | CRITICAL | US/EU |
| Payment Processing | SaaS | Stripe | CFO | CRITICAL | US/EU |
| Monitoring | SaaS | Sentry | CTO | HIGH | US |
| Email Service | SaaS | Resend | CTO | MEDIUM | US |

### Repositories
| Asset | Type | Hosting | Owner | Classification |
|-------|------|---------|-------|----------------|
| Union Eyes App | Git Repo | GitHub | CTO | CONFIDENTIAL |
| Documentation | Git Repo | GitHub | CTO | INTERNAL |

## 2. Software Assets

### Third-Party Services
| Service | Purpose | Vendor | Contract End Date | Security Assessment Date |
|---------|---------|--------|-------------------|-------------------------|
| Clerk | Authentication | Clerk.com | [Date] | [Date] |
| Stripe | Payments | Stripe Inc | [Date] | [Date] |
| DocuSign | E-Signatures | DocuSign | [Date] | [Date] |
| Azure | Infrastructure | Microsoft | [Date] | [Date] |

### Dependencies
(Refer to package.json for software dependencies)

## 3. Data Assets

### Databases
| Database | Purpose | Records | Classification | Backup Frequency |
|----------|---------|---------|----------------|------------------|
| union_eyes_prod | Production Data | [Count] | RESTRICTED | Daily |
| union_eyes_staging | Staging/Testing | [Count] | INTERNAL | Weekly |

### Critical Tables
(See database schema documentation)

## 4. Information Assets

### Policies and Procedures
| Document | Owner | Last Review | Next Review |
|----------|-------|-------------|-------------|
| Information Security Policy | Security Team | [Date] | [Date] |
| Incident Response Plan | Security Team | [Date] | [Date] |
| Backup Recovery Policy | Ops Team | [Date] | [Date] |

## 5. Asset Lifecycle

### Acquisition
- New assets require security review before deployment
- Asset owner assigned during procurement

### Operation
- Regular security assessments
- Configuration management
- Patch management

### Disposal
- Data sanitization before disposal
- Certificate of destruction for critical assets
- Asset decommissioning checklist

## 6. Asset Review Schedule

- **Quarterly:** Review critical asset inventory
- **Annually:** Full asset inventory audit
- **As-Needed:** When assets added/removed
```

**Process:**
1. Inventory all Azure resources (via Azure Resource Manager API)
2. Inventory all SaaS services (from billing/procurement)
3. Assign asset owners
4. Classify assets per Data Classification Policy
5. Document asset dependencies
6. Schedule quarterly reviews

---

### 3. Risk Assessment & Treatment (A.5.1, implied) - WEEK 3-4

**Status:** 🔴 Missing  
**Effort:** 7-10 days  
**Dependencies:** Asset inventory

**What to Create:**

**Document:** `docs/compliance/RISK_MANAGEMENT_FRAMEWORK.md`

**Content Structure:**
```markdown
# Risk Management Framework

## 1. Risk Assessment Methodology

### Risk Identification
- Annual comprehensive risk assessment
- Quarterly targeted assessments
- Incident-driven assessments
- Threat intelligence review

### Risk Analysis
**Risk = Likelihood × Impact**

#### Likelihood Scale (1-5)
1. Very Unlikely (<10% probability)
2. Unlikely (10-30%)
3. Possible (30-50%)
4. Likely (50-70%)
5. Very Likely (>70%)

#### Impact Scale (1-5)
1. Negligible: Minor inconvenience
2. Minor: Limited business impact
3. Moderate: Significant business impact
4. Major: Severe business impact
5. Critical: Catastrophic impact

#### Risk Matrix
```
| Impact → | 1 | 2 | 3 | 4 | 5 |
|----------|---|---|---|---|---|
| Likelihood 5 | 5 | 10 | 15 | 20 | 25 |
| 4 | 4 | 8 | 12 | 16 | 20 |
| 3 | 3 | 6 | 9 | 12 | 15 |
| 2 | 2 | 4 | 6 | 8 | 10 |
| 1 | 1 | 2 | 3 | 4 | 5 |
```

**Risk Levels:**
- 1-5: Low (Accept)
- 6-11: Medium (Mitigate)
- 12-19: High (Mitigate urgently)
- 20-25: Critical (Immediate action)

## 2. Risk Register Template

| Risk ID | Risk Description | Asset | Likelihood | Impact | Risk Score | Treatment | Owner | Status |
|---------|-----------------|-------|------------|--------|------------|-----------|-------|--------|
| R001 | Unauthorized database access | Production DB | 2 | 5 | 10 | Mitigate (RLS implemented) | CTO | Closed |
| R002 | Vendor data breach | Clerk | 2 | 4 | 8 | Accept (SOC 2 certified) | CTO | Open |

## 3. Risk Treatment Options

1. **Avoid:** Eliminate the risk (stop the activity)
2. **Mitigate:** Reduce likelihood or impact (implement controls)
3. **Transfer:** Share the risk (insurance, vendor contracts)
4. **Accept:** Acknowledge and monitor (residual risk acceptable)

## 4. Initial Risk Assessment (Production Deployment)

### Critical Risks Identified

#### R001: Cross-Tenant Data Leakage
- **Description:** User from Organization A accesses Organization B's data
- **Likelihood:** 2 (RLS implemented, tested)
- **Impact:** 5 (Privacy breach, legal liability)
- **Risk Score:** 10 (Medium)
- **Treatment:** Mitigate
- **Controls:**
  - ✅ RLS on 70+ tables
  - ✅ withRLSContext wrapper enforced
  - ✅ Quarterly RLS scanner validation
  - ✅ Security testing in CI/CD
- **Residual Risk:** 2×3 = 6 (Low)

#### R002: PII Data Breach
- **Description:** Encrypted PII exposed due to key compromise
- **Likelihood:** 2 (Azure Key Vault HSM, access controls)
- **Impact:** 5 (PIPEDA breach notification, reputational damage)
- **Risk Score:** 10 (Medium)
- **Treatment:** Mitigate + Transfer
- **Controls:**
  - ✅ AES-256-GCM encryption
  - ✅ Azure Key Vault HSM
  - ✅ 90-day key rotation
  - ✅ Access logging
  - ⚠️ Cyber insurance (recommended)
- **Residual Risk:** 1×4 = 4 (Low)

#### R003: Backup Failure (Data Loss)
- **Description:** Backup corruption, cannot restore critical data
- **Likelihood:** 2 (Azure managed backups, tested quarterly)
- **Impact:** 4 (Data loss, operational disruption)
- **Risk Score:** 8 (Medium)
- **Treatment:** Mitigate
- **Controls:**
  - ✅ Automated backups (35-day retention)
  - ✅ Geo-replication (Canada East)
  - ✅ Quarterly restoration tests
  - ✅ Immutable backup storage
- **Residual Risk:** 1×3 = 3 (Low)

#### R004: Vendor Service Disruption
- **Description:** Critical vendor outage (Clerk, Azure, Stripe)
- **Likelihood:** 2 (SLA 99.9+%, redundancy)
- **Impact:** 4 (Service unavailable)
- **Risk Score:** 8 (Medium)
- **Treatment:** Accept + Mitigate
- **Controls:**
  - ✅ Multi-region deployment capability
  - ✅ Graceful degradation
  - ✅ Status monitoring
  - ⚠️ Failover procedures documented
- **Residual Risk:** 2×3 = 6 (Low)

#### R005: Insider Threat (Privileged Abuse)
- **Description:** Admin user exfiltrates member data
- **Likelihood:** 1 (Background checks, audit logging)
- **Impact:** 5 (Privacy breach, trust erosion)
- **Risk Score:** 5 (Low)
- **Treatment:** Mitigate
- **Controls:**
  - ✅ Audit logging on all privileged actions
  - ✅ Break-glass access requires justification
  - ⚠️ UEBA anomaly detection (future)
  - ⚠️ Background checks for admins (policy needed)
- **Residual Risk:** 1×4 = 4 (Low)

## 5. Risk Review Schedule

- **Monthly:** Review critical risks (R001-R005)
- **Quarterly:** Comprehensive risk register review
- **Annually:** Full risk assessment with external audit
- **Ad-Hoc:** After security incidents or major changes

## 6. Risk Acceptance Process

**Low Risks (1-5):** Accepted by Security Team  
**Medium Risks (6-11):** Accepted by CTO  
**High Risks (12-19):** Accepted by Executive Management  
**Critical Risks (20-25):** Escalation to Board

## 7. Risk Reporting

**Quarterly Report to Management:**
- Risk register summary
- New risks identified
- Risk treatment progress
- Residual risk levels

**Annual Report to Board:**
- Comprehensive risk landscape
- Compliance posture
- Incident summary
- Risk appetite recommendations
```

**Deliverables:**
1. Risk Management Framework document
2. Initial Risk Register (R001-R010 minimum)
3. Risk treatment plan for Medium+ risks
4. Risk acceptance sign-offs

---

### 4. Supplier Security Management (A.5.19, A.5.20) - WEEK 3-4

**Status:** 🔴 Missing  
**Effort:** 5-7 days  
**Dependencies:** Asset inventory (supplier list)

**What to Create:**

**Document:** `docs/compliance/SUPPLIER_SECURITY_PROGRAM.md`

**Content:**
```markdown
# Supplier Security Management Program

## 1. Supplier Classification

### Tier 1 - Critical Suppliers
**Criteria:** Access to sensitive data, mission-critical services, high risk

**Union Eyes Tier 1 Suppliers:**
1. **Clerk** (Authentication) - Access to user credentials
2. **Stripe** (Payments) - Access to financial data
3. **Azure** (Infrastructure) - Hosts all data
4. **Vercel** (Hosting) - Application runtime
5. **Supabase** (Database) - Secondary database services

**Requirements:**
- SOC 2 Type II attestation or equivalent (ISO 27001)
- Annual security assessment
- Contract security clauses
- Incident notification within 24 hours

### Tier 2 - Important Suppliers
**Criteria:** Limited sensitive data access, important but not critical

**Union Eyes Tier 2 Suppliers:**
1. **Sentry** (Monitoring) - Application logs
2. **DocuSign** (E-Signatures) - Document signing
3. **Resend** (Email) - Transactional emails

**Requirements:**
- Security questionnaire review
- Standard contract terms
- Annual compliance review

### Tier 3 - Low-Risk Suppliers
**Criteria:** No sensitive data access, easily replaceable

**Requirements:**
- Standard vendor onboarding
- Contract review only

## 2. Vendor Risk Assessment

### Security Questionnaire (Tier 1 Suppliers)

**Section 1: Certifications & Compliance**
1. Do you hold SOC 2 Type II certification? (Required: Yes)
2. ISO 27001 or other security certifications?
3. GDPR/PIPEDA compliance attestation?
4. Compliance report availability?

**Section 2: Data Protection**
5. Data encryption at rest? (Required: Yes, AES-256+)
6. Data encryption in transit? (Required: Yes, TLS 1.2+)
7. Data residency options? (Preferred: Canada)
8. Data segregation between customers?

**Section 3: Access Controls**
9. MFA enforced for all users? (Required: Yes)
10. Role-based access control?
11. Privileged access management?
12. Access logging and monitoring?

**Section 4: Incident Response**
13. Security incident notification policy? (Required: <24 hours)
14. Breach notification timeline?
15. Incident response plan documented?
16. Insurance coverage for breaches?

**Section 5: Business Continuity**
17. Backup frequency? (Required: Daily minimum)
18. Disaster recovery plan?
19. RTO/RPO commitments?
20. Uptime SLA? (Required: 99.9%+)

### Scoring Matrix
- **Pass:** All "Required" questions meet criteria
- **Fail:** Any "Required" question fails

**Risk Assessment:**
- **Low Risk:** SOC 2 certified, pass all required questions
- **Medium Risk:** No SOC 2 but pass required questions
- **High Risk:** Fail any required question → Requires mitigation plan or alternative vendor

## 3. Supplier Onboarding

### Tier 1 Supplier Onboarding Process

1. **Initial Assessment (Week 1)**
   - Send security questionnaire
   - Request SOC 2 reports
   - Review privacy policy
   
2. **Security Review (Week 2-3)**
   - Analyze questionnaire responses
   - Review certifications
   - Assess risk level
   
3. **Contract Negotiation (Week 4)**
   - Include security clauses (see Section 4)
   - Define SLAs
   - Establish incident notification process
   
4. **Approval (Week 5)**
   - CTO approval for Tier 1
   - Security Team approval for Tier 2/3
   
5. **Annual Review**
   - Renew security assessment annually
   - Update risk register
   - Review incident history

## 4. Required Contract Security Clauses

### Data Protection
```
Vendor shall:
- Encrypt all data at rest using AES-256 or stronger
- Encrypt all data in transit using TLS 1.2 or stronger
- Segregate customer data with logical access controls
- Allow data deletion upon request (GDPR Article 17)
- Comply with PIPEDA, GDPR, and applicable data protection laws
```

### Security Incident Notification
```
Vendor shall notify Union Eyes within 24 hours of:
- Any security incident affecting Union Eyes data
- Any data breach or unauthorized access
- Any regulatory investigation or audit
- Any material change to security controls

Notification shall include:
- Nature of the incident
- Data affected
- Remediation actions taken
- Timeline of events
```

### Audit Rights
```
Union Eyes reserves the right to:
- Review vendor SOC 2 reports annually
- Request security documentation on 30 days' notice
- Conduct on-site audits (for critical suppliers)
- Engage third-party auditors at vendor's expense (if cause exists)
```

### Liability & Indemnification
```
Vendor shall indemnify Union Eyes for:
- Data breaches caused by vendor negligence
- Regulatory fines resulting from vendor non-compliance
- Legal costs associated with vendor security incidents

Liability cap: [Negotiated amount, suggest 12 months service fees minimum]
```

### Termination
```
Union Eyes may terminate for cause if:
- Vendor suffers material security breach
- Vendor fails to meet security SLAs
- Vendor loses required certifications (e.g., SOC 2)

Vendor shall:
- Return or securely delete all Union Eyes data within 30 days
- Provide certification of data deletion
```

## 5. Current Supplier Status (Initial Assessment)

| Supplier | Tier | SOC 2? | Risk Level | Action Required |
|----------|------|--------|------------|-----------------|
| Clerk | 1 | ✅ Yes | Low | Annual review only |
| Stripe | 1 | ✅ Yes | Low | Annual review only |
| Azure | 1 | ✅ Yes (Microsoft) | Low | Rely on Microsoft certs |
| Vercel | 1 | ⚠️ Unknown | Medium | Request SOC 2 or questionnaire |
| Supabase | 1 | ⚠️ Unknown | Medium | Request SOC 2 or questionnaire |
| Sentry | 2 | ⚠️ Unknown | Medium | Questionnaire |
| DocuSign | 2 | ✅ Yes | Low | Annual review only |

**Immediate Actions:**
1. Request SOC 2 Type II reports from Vercel, Supabase
2. Send security questionnaires to Tier 2 suppliers
3. Review existing MSAs for security clause gaps
4. Schedule contract renewals to include security clauses

## 6. Ongoing Supplier Management

### Monthly
- Monitor vendor status pages
- Review vendor security alerts
- Track vendor incidents

### Quarterly
- Review vendor performance metrics
- Update supplier risk register
- Conduct supplier risk meetings (Tier 1)

### Annually
- Request updated SOC 2 reports
- Conduct comprehensive security review
- Reassess supplier risk classification
- Renew/renegotiate contracts

## 7. Supplier Incident Response

**If Vendor Reports Security Incident:**

1. **Assessment (0-4 hours)**
   - Determine Union Eyes data exposure
   - Classify incident severity (P1-P4)
   - Activate Incident Response Plan if P1/P2

2. **Containment (4-24 hours)**
   - Disable vendor access if necessary
   - Rotate API keys/credentials
   - Notify affected users if required

3. **Recovery (1-7 days)**
   - Verify vendor remediation
   - Restore services with enhanced monitoring
   - Document lessons learned

4. **Follow-Up (30 days)**
   - Request vendor root cause analysis
   - Assess need for contract amendment
   - Reassess vendor risk classification

## 8. Supplier Exit Strategy

For each Tier 1 supplier, document:

- **Clerk Exit:** Migrate to Auth0 or Supabase Auth (4-6 weeks)
- **Stripe Exit:** Migrate to PayPal or Square (6-8 weeks)
- **Azure Exit:** Migrate to AWS Canada (12-16 weeks, high complexity)
- **Vercel Exit:** Migrate to Netlify, AWS Amplify (2-4 weeks)

**Exit Criteria:**
- Data exportability validated
- Alternative vendor pre-qualified
- Migration runbook documented
```

**Deliverables:**
1. Supplier Security Program document
2. Security questionnaire template
3. Contract security clauses template
4. Initial supplier risk assessments (Tier 1)
5. Supplier exit strategies

---

### 5. ISMS Scope Statement (Clause 4.3) - WEEK 1

**Status:** 🔴 Missing  
**Effort:** 1-2 days  
**Dependencies:** None

**What to Create:**

**Document:** `docs/compliance/ISMS_SCOPE_STATEMENT.md`

**Content:**
```markdown
# Information Security Management System (ISMS) Scope Statement
**Version:** 1.0  
**Effective Date:** [Date]  
**Approved By:** [Executive Management]

## 1. Organization Context

**Organization:** Union Eyes Platform  
**Industry:** Labor Relations Technology (SaaS)  
**Headquarters:** [City, Province, Canada]  
**Employees:** [Count] full-time, [Count] contractors

**Mission:** Provide secure, comprehensive union management technology empowering labor organizations with claims management, member services, collective bargaining intelligence, and inter-union collaboration.

## 2. ISMS Scope

### In Scope

**Services:**
- Union claims management platform
- Member management and dues tracking
- CBA intelligence and clause library
- Financial management (strike funds, payments)
- Cross-organization collaboration features
- AI-powered union workbench
- Document management and e-signatures
- API integrations (ERP, payment processors, e-signature)

**Infrastructure:**
- Azure PostgreSQL databases (Production, Staging)
- Azure Blob Storage (documents, backups)
- Vercel Edge compute platform
- Third-party SaaS services (Clerk, Stripe, Sentry)

**Locations:**
- **Physical:** [Union Eyes office locations if any], Remote workforce
- **Logical:** Azure Canada Central (primary), Azure Canada East (DR)

**Users:**
- Union members, stewards, officers, administrators
- Support staff, developers, operations team

**Data:**
- Member PII (names, contact info, SIN encrypted)
- Union financial data (dues, strike funds, payments)
- CBA documents and legal agreements
- Grievance and claims records
- Inter-organizational collaboration data

### Out of Scope

**Excluded:**
- Union client on-premise systems (out of Union Eyes control)
- End-user devices (BYOD) - covered by guidance only
- Physical security of cloud provider data centers (inherited from Azure/Vercel SOC 2)
- Union member personal email accounts

**Justification:**
- Union Eyes operates as a cloud SaaS platform with no managed on-premise infrastructure
- Physical security delegated to certified cloud providers (Microsoft Azure, Vercel/AWS)
- End-user device management is union client responsibility

## 3. Boundaries and Interfaces

### Internal Boundaries
- **Production Environment:** Azure Canada Central, Vercel production
- **Staging Environment:** Azure Canada Central, Vercel preview
- **Development Environment:** Local machines, GitHub repositories

### External Interfaces
- **Authentication:** Clerk (third-party identity provider)
- **Payments:** Stripe (PCI-DSS compliant processor)
- **Monitoring:** Sentry (application monitoring)
- **Email:** Resend (transactional email service)
- **E-Signatures:** DocuSign, Dropbox Sign
- **AI Services:** Azure OpenAI, Anthropic Claude, Google Gemini

### Data Flows
- **Inbound:** User authentication (Clerk), payment webhooks (Stripe), e-signature callbacks (DocuSign)
- **Outbound:** Email notifications (Resend), payment initiation (Stripe), AI requests (OpenAI/Anthropic)
- **Internal:** Application ↔ Database, Application ↔ Blob Storage

## 4. Applicable Requirements

### Legal and Regulatory
- **PIPEDA** (Personal Information Protection and Electronic Documents Act) - Canadian federal
- **Provincial Privacy Laws:** AB PIPA, BC PIPA, QC Law 25, ON PHIPA
- **GDPR** (General Data Protection Regulation) - EU members
- **PCI-DSS** (Payment Card Industry Data Security Standard) - via Stripe

### Contractual
- SOC 2 Type II (target certification)
- Customer data protection agreements
- Vendor security requirements

### Standards
- ISO 27001:2022 (ISMS)
- ISO 27002:2022 (Security controls)
- NIST Cybersecurity Framework (guidance)

## 5. Risk Appetite Statement

Union Eyes operates with a **LOW risk appetite** for:
- Member PII exposure (PIPEDA breach)
- Financial data loss or corruption
- Cross-tenant data leakage
- Service availability disruptions

Union Eyes operates with a **MEDIUM risk appetite** for:
- Vendor service disruptions (mitigated by redundancy)
- Non-critical feature bugs (addressed in sprint cycles)

**Risk Tolerance:**
- Zero tolerance for unencrypted PII storage
- Zero tolerance for cross-tenant data access
- Minimal tolerance for service downtime (99.9% uptime target)

## 6. Critical Assets

### Information Assets
1. **Production Database** (member data, financial records, grievances)
2. **Encryption Keys** (Azure Key Vault HSM)
3. **Authentication Credentials** (Clerk JWT signing keys)
4. **Source Code** (GitHub private repositories)

### Service Assets
1. **Union Eyes Web Application** (primary service)
2. **API Integrations** (ERP connectors, payment processing)
3. **Backup Systems** (Azure geo-replicated backups)

## 7. Interested Parties

### Internal Stakeholders
- **Executive Management:** Oversight and accountability
- **Security Team:** ISMS implementation and monitoring
- **Development Team:** Secure coding and deployment
- **Support Team:** User assistance and incident triage

### External Stakeholders
- **Union Clients:** Data protection and service availability
- **Union Members:** Privacy and confidentiality
- **Regulators:** PIPEDA compliance (Office of the Privacy Commissioner)
- **Auditors:** SOC 2, ISO 27001 certification bodies
- **Vendors:** Shared security responsibilities

## 8. ISMS Objectives

### Security Objectives
1. **Confidentiality:** Protect member PII and union financial data
2. **Integrity:** Ensure accuracy of grievance records and CBA documents
3. **Availability:** Maintain 99.9% uptime for critical services

### Compliance Objectives
1. Achieve SOC 2 Type II attestation by [Target Date]
2. Achieve ISO 27001:2022 certification by [Target Date]
3. Maintain PIPEDA/GDPR compliance (ongoing)

### Operational Objectives
1. Detect and respond to security incidents within 15 minutes
2. Complete security patches within 7 days of release (critical vulnerabilities)
3. Conduct quarterly disaster recovery testing

## 9. ISMS Review and Updates

**Review Frequency:** Annually, or when:
- Major system changes
- New services launched
- Regulatory changes
- Security incidents

**Approval Authority:** CTO (scope changes) + CEO (major scope expansions)

## 10. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CEO | [Name] | | |
| CTO | [Name] | | |
| Security Lead | [Name] | | |

---

**Document Control:**
- **Version:** 1.0
- **Classification:** Internal
- **Owner:** Security Team
- **Location:** `docs/compliance/ISMS_SCOPE_STATEMENT.md`
```

**Deliverables:**
1. ISMS Scope Statement document
2. Management approval signatures
3. Communication to all staff

---

## Implementation Roadmap

### Phase 1: Critical Documentation (Weeks 1-4)

**Week 1-2: P0 Documentation**
- [ ] Information Security Policy (A.5.1)
- [ ] ISMS Scope Statement (Clause 4.3)
- [ ] Asset Inventory initiation (A.5.9)

**Week 3-4: P0 Completion**
- [ ] Asset Inventory completion (A.5.9)
- [ ] Risk Management Framework (Implied)
- [ ] Initial Risk Assessment (R001-R010)
- [ ] Supplier Security Program (A.5.19, A.5.20)

**Deliverables:** 5 policy documents, executive approvals

---

### Phase 2: Policy Consolidation (Weeks 5-12)

**Week 5-6: People Security**
- [ ] HR Security Policy (A.6.1, A.6.2, A.6.6)
- [ ] Security Awareness Training Program (A.6.3)
- [ ] Offboarding Procedures (A.6.5)

**Week 7-8: Operations Security**
- [ ] Operations Manual (consolidate runbooks) (A.5.37)
- [ ] Capacity Management documentation (A.8.6)
- [ ] Test Data Policy (A.8.33)

**Week 9-10: Physical Security**
- [ ] Office Security Policy (A.7.3) [if applicable]
- [ ] Remote Work Security Policy expansion (A.6.7)
- [ ] Device Security Guidelines (A.7.9, A.8.1)

**Week 11-12: Review & Gap Closure**
- [ ] Data Masking Policy (A.8.11)
- [ ] Audit Testing Guidelines (A.8.34)
- [ ] Policy cross-references and consolidation

**Deliverables:** 10+ policy documents, training materials

---

### Phase 3: Pre-Audit Readiness (Weeks 13-16)

**Week 13: Evidence Collection**
- [ ] Compile control evidence (logs, reports, certificates)
- [ ] Screenshot/record control implementations
- [ ] Organize documentation repository

**Week 14: Gap Remediation**
- [ ] Address any remaining P1 gaps
- [ ] Implement missing quick wins
- [ ] Conduct internal audit simulation

**Week 15: Management Review**
- [ ] Present ISMS to executive management
- [ ] Conduct management security review
- [ ] Obtain formal ISMS approval

**Week 16: External Pre-Assessment**
- [ ] Engage ISO 27001 certification body
- [ ] Conduct readiness assessment (optional gap analysis)
- [ ] Address pre-assessment findings

**Deliverables:** Evidence repository, management sign-off, pre-assessment report

---

### Phase 4: Certification (Weeks 17-24+)

**Week 17-18: Stage 1 Audit (Documentation)**
- [ ] Auditor reviews ISMS documentation
- [ ] Auditor validates scope and objectives
- [ ] Address Stage 1 findings

**Week 19-24: Stage 2 Audit (Implementation)**
- [ ] Auditor conducts on-site (or remote) audit
- [ ] Interviews with staff
- [ ] Technical control testing
- [ ] Review evidence

**Week 24+: Certification**
- [ ] Address non-conformities (if any)
- [ ] Receive ISO 27001:2022 certificate
- [ ] Celebrate! 🎉

**Deliverables:** ISO 270012022 certification

---

## ISMS Documentation Structure

### Level 1: ISMS Manual (Strategic)

```
docs/compliance/
├── ISMS_SCOPE_STATEMENT.md
├── INFORMATION_SECURITY_POLICY.md (overarching)
├── RISK_MANAGEMENT_FRAMEWORK.md
├── ASSET_INVENTORY.md
├── RISK_REGISTER.md (living document)
└── STATEMENT_OF_APPLICABILITY.md (Annex A control status)
```

### Level 2: Domain Policies (Tactical)

```
docs/compliance/policies/
├── ACCESS_CONTROL_POLICY.md ✅ (exists)
├── ENCRYPTION_STANDARDS.md ✅ (exists)
├── BACKUP_RECOVERY_POLICY.md ✅ (exists)
├── INCIDENT_RESPONSE_PLAN.md ✅ (exists)
├── DATA_CLASSIFICATION_POLICY.md ✅ (exists)
├── SUPPLIER_SECURITY_PROGRAM.md (to create)
├── HR_SECURITY_POLICY.md (to create)
├── OPERATIONS_SECURITY_POLICY.md (to create)
├── CHANGE_MANAGEMENT_POLICY.md (to create)
├── ACCEPTABLE_USE_POLICY.md (to create)
└── SECURITY_AWARENESS_PROGRAM.md (to create)
```

### Level 3: Procedures & Work Instructions (Operational)

```
docs/procedures/
├── incident-response-procedures/ (expand from IRP)
├── backup-restoration-procedures/ (expand from B/R policy)
├── access-provisioning-procedures/
├── offboarding-procedures/
├── vulnerability-management-procedures/
├── patch-management-procedures/
└── dr-testing-procedures/
```

### Level 4: Records & Evidence (Compliance)

```
docs/evidence/
├── audit-logs/ (system-generated)
├── risk-assessments/
│   ├── 2026-Q1-risk-assessment.md
│   └── 2026-Q2-risk-assessment.md
├── training-records/
│   └── security-awareness-certificates/
├── incident-reports/
│   └── 2026-incidents/
├── vendor-assessments/
│   ├── clerk-assessment-2026.md
│   ├── stripe-assessment-2026.md
│   └── azure-assessment-2026.md
├── management-reviews/
│   └── 2026-Q1-management-review.md
└── certifications/
    ├── soc2-report-2026.pdf
    └── azure-compliance-certs/
```

### Supporting Documentation (Technical)

```
docs/security/ (existing)
├── SECURITY_AUDIT_RLS.md ✅
├── SECURITY_VERIFICATION_REPORT.md ✅
├── RLS_AUTH_RBAC_ALIGNMENT.md ✅
└── API_SECURITY_MIGRATION_GUIDE.md ✅

docs/audit/ (existing)
├── SOC2_CONTROLS_EVIDENCE.md ✅
├── REPOSITORY_VALIDATION_REPORT.md ✅
└── INVESTOR_AUDIT_REPORT_2026-02-09.md ✅
```

---

## Key Metrics & KPIs

### Security Metrics (Monthly Reporting)

**Access Control:**
- Failed login attempts (target: <1% of total logins)
- MFA adoption rate (target: 100% for admin/financial roles)
- Privileged access requests (track justifications)

**Incident Management:**
- Mean time to detect (MTTD) (target: <15 minutes)
- Mean time to respond (MTTR) (target: <4 hours)
- Security incidents by severity (track P1-P4)

**Vulnerability Management:**
- Open critical vulnerabilities (target: 0)
- Open high vulnerabilities (target: <3)
- Time to patch critical vulns (target: <7 days)

**Backup & Recovery:**
- Backup success rate (target: 100%)
- Restoration test success (target: 100% quarterly)

**Compliance:**
- Audit findings open (target: 0 critical)
- Policy review status (target: 100% annual review)
- Training completion rate (target: 100% for required training)

### Certification Progress

**ISO 27001:2022 Readiness:**
- Controls implemented: 58/93 (62%) → Target: 90/93 (97%)
- Documentation complete: 40% → Target: 100%
- Evidence collected: 60% → Target: 100%
- Risk register: 5 risks documented → Target: 20+ risks

**Timeline:**
- 📍 **Today:** Gap analysis complete
- 🎯 **Month 2:** P0 documentation complete
- 🎯 **Month 4:** P1 policies complete
- 🎯 **Month 6:** Pre-audit readiness
- 🎯 **Month 9:** ISO 27001 certification achieved

---

## Conclusion

Union Eyes v2 demonstrates **strong technical security maturity** with world-class implementations in:

✅ Authentication (Clerk + 26-role RBAC)  
✅ Data Protection (RLS + AES-256-GCM)  
✅ Access Control (373/373 API routes secured)  
✅ Audit Logging (tamper-proof, comprehensive)  
✅ Encryption (Azure Key Vault HSM, FIPS 140-2)  
✅ Backup/Recovery (RTO 4hrs, tested quarterly)  
✅ Compliance (PIPEDA, GDPR, SOC 2 controls)

**Primary gaps are organizational/policy documents** rather than technical controls. The platform is 62% ready for ISO 27001:2022 certification, with most remaining work being documentation and formalization of existing practices.

**Recommended Path:**
1. **Months 1-2:** Complete P0 critical documentation (ISMS policy, asset inventory, risk assessment, supplier security)
2. **Months 3-4:** Complete P1 policies (HR security, operations procedures, training program)
3. **Months 5-6:** Pre-audit preparation (evidence collection, internal audit, management review)
4. **Months 7-9:** Certification audit (Stage 1 + Stage 2)

**Total investment:** 6-9 months, primarily security team effort for documentation with executive management participation for approvals.

**Estimated Effort:**
- Documentation: 120-160 hours (spread over 6 months)
- Evidence collection: 40 hours
- Training development: 40 hours
- External audit: 80 hours (auditor time, billable)
- **Total:** ~300 hours + audit fees

---

**Document Control**
- **Version:** 1.0
- **Classification:** Internal/Confidential
- **Owner:** Security Team
- **Review Schedule:** Quarterly
- **Next Review:** [Date + 3 months]
- **Approved By:** [Security Lead signature]
