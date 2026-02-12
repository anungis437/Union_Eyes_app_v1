# Supplier Security Assessment Framework

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Security & Compliance Team  
**Review Schedule:** Annual (and upon new supplier onboarding)  
**ISO 27001:2022 Controls:** A.5.19, A.5.20, A.5.21, A.5.22

---

## 1. Purpose and Scope

### 1.1 Purpose

This framework establishes systematic processes for assessing, monitoring, and managing information security risks introduced by third-party suppliers, vendors, and service providers.

### 1.2 Scope

Applies to all suppliers that:
- Process, store, or transmit Union Eyes data
- Provide critical infrastructure or platform services
- Have access to production systems or networks
- Handle payment card data or sensitive personal information
- Provide security-sensitive services (authentication, encryption, monitoring)

---

## 2. Supplier Classification

### 2.1 Supplier Tiers

| Tier | Risk Level | Examples | Assessment Frequency |
|------|------------|----------|---------------------|
| **Tier 1 - Critical** | High | Clerk (auth), Stripe (payments), Azure (infrastructure), Vercel (hosting) | Annual + continuous monitoring |
| **Tier 2 - Important** | Medium | Sentry (monitoring), Resend (email), DocuSign (signatures) | Annual |
| **Tier 3 - Standard** | Low | Development tools, analytics, marketing SaaS | Biennial |
| **Tier 4 - Minimal** | Very Low | Office software, non-production utilities | On onboarding only |

### 2.2 Classification Criteria

**Tier 1 (Critical)** if ANY of:
- Processes payment card data
- Stores or processes member PII at scale
- Provides authentication or authorization services
- Hosts production infrastructure
- Single point of failure for core business functions
- Access to production databases or secrets

**Tier 2 (Important)** if ANY of:
- Processes limited PII or non-financial sensitive data
- Provides security monitoring or incident response
- Integrates with production APIs
- Handles email containing sensitive information

**Tier 3 (Standard)** if:
- Limited data exposure (metadata, logs, anonymized data)
- Non-critical business functions
- Contractual security requirements sufficient

**Tier 4 (Minimal)** if:
- No access to Union Eyes data
- Used only for internal operations
- Standard terms of service acceptable

---

## 3. Supplier Security Assessment Process

### 3.1 Stage 1: Pre-Engagement Assessment

**Trigger:** Before contract signature or production access

**Activities:**
1. **Supplier Identification**
   - Business case and service description
   - Data types and volumes to be processed
   - Integration points and access requirements

2. **Initial Risk Screening**
   - Classify supplier tier (1-4)
   - Identify regulatory requirements (PIPEDA, PCI-DSS, GDPR)
   - Determine assessment depth required

3. **Preliminary Security Review**
   - Review public security documentation
   - Check for SOC 2, ISO 27001, or equivalent certifications
   - Search for past security incidents or breaches
   - Review terms of service and privacy policy

**Deliverable:** Pre-Engagement Risk Assessment (template in Section 7)

### 3.2 Stage 2: Security Questionnaire

**Applicable To:** Tier 1, Tier 2, and Tier 3 suppliers

**Questionnaire Coverage:**

**A. Organization & Governance (10 questions)**
- Security organization structure
- Compliance certifications (SOC 2, ISO 27001, PCI-DSS)
- Security policy framework
- Third-party audits and penetration testing

**B. Access Control (15 questions)**
- Identity and access management
- Multi-factor authentication requirements
- Privileged access management
- Access review processes
- Account lifecycle management

**C. Data Protection (20 questions)**
- Encryption at rest and in transit
- Key management practices
- Data classification and handling
- Data residency and sovereignty
- Data retention and disposal

**D. Network and Infrastructure Security (12 questions)**
- Network segmentation and firewalls
- Intrusion detection/prevention
- DDoS protection
- Vulnerability management
- Patch management processes

**E. Application Security (15 questions)**
- Secure development lifecycle
- Code review and security testing
- OWASP Top 10 protections
- API security
- Third-party component management

**F. Incident Response (10 questions)**
- Incident response plan
- Breach notification procedures and SLAs
- Contact information for security incidents
- Forensics and root cause analysis

**G. Business Continuity (8 questions)**
- Backup and recovery procedures
- Disaster recovery plan and testing
- Service availability commitments (SLA)
- Redundancy and failover

**H. Compliance and Audit (10 questions)**
- Regulatory compliance (PIPEDA, GDPR, PCI-DSS)
- Right to audit clauses
- Subprocessor management
- Contractual security requirements

**Total Questions:** 100 questions for Tier 1/2, 50 questions for Tier 3

**Scoring:**
- **90-100%:** Low risk - Approve
- **75-89%:** Medium risk - Approve with conditions
- **60-74%:** High risk - Remediation plan required
- **<60%:** Critical risk - Do not onboard / terminate

**Deliverable:** Completed Security Questionnaire + Risk Score

### 3.3 Stage 3: Certification and Documentation Review

**Required Documentation:**

**Tier 1 Suppliers MUST provide:**
- SOC 2 Type II report (within last 12 months)
- ISO 27001 certificate (if applicable)
- PCI-DSS AOC (for payment processors)
- Penetration test results (within last 12 months)
- Incident history (past 24 months)
- Data Processing Agreement (DPA) or equivalent

**Tier 2 Suppliers MUST provide:**
- At least ONE of: SOC 2, ISO 27001, or equivalent security audit
- Privacy policy and data handling documentation
- Breach notification procedures

**Tier 3 Suppliers SHOULD provide:**
- Security whitepaper or public documentation
- Terms of service with security commitments

**Verification:**
- Validate certificate authenticity (contact issuing auditor if needed)
- Review audit scope covers relevant controls
- Check for qualifications or exceptions in reports

**Deliverable:** Certification Verification Checklist

### 3.4 Stage 4: Contract Negotiation

**Required Contract Clauses:**

#### 4.4.1 Security Requirements Clause

```
Supplier agrees to:
1. Maintain security controls consistent with industry standards (ISO 27001, SOC 2)
2. Encrypt data at rest (AES-256 or equivalent) and in transit (TLS 1.2+)
3. Implement role-based access control and least privilege
4. Perform annual penetration testing
5. Maintain security incident response plan
6. Comply with all applicable data protection laws (PIPEDA, GDPR)
```

#### 4.4.2 Breach Notification Clause

```
Supplier must notify Union Eyes within 24 hours of:
- Any security breach affecting Union Eyes data
- Any unauthorized access to Union Eyes systems
- Any security incident that may impact service availability

Notification must include:
- Nature and scope of incident
- Data types and volumes affected
- Root cause (if known)
- Remediation steps taken
- Timeline for resolution
```

#### 4.4.3 Right to Audit Clause

```
Union Eyes reserves the right to:
- Request security documentation and certifications annually
- Conduct on-site or virtual security audits with 30 days' notice
- Engage third-party auditors to assess Supplier security posture
- Review security questionnaire responses for accuracy

Supplier must respond to audit requests within 15 business days.
```

#### 4.4.4 Data Protection Clause

```
Supplier agrees to:
- Process data only as instructed by Union Eyes
- Not use Union Eyes data for own purposes (e.g., training AI models)
- Return or delete data upon contract termination
- Maintain data residency in approved jurisdictions (Canada preferred)
- Obtain prior written approval for subprocessors
```

#### 4.4.5 Liability and Indemnification

```
Supplier is liable for:
- Data breaches caused by Supplier negligence
- Regulatory fines resulting from Supplier non-compliance
- Costs of breach notification and remediation

Liability capped at [12 months of fees OR $X million] per incident.
```

#### 4.4.6 Termination for Cause

```
Union Eyes may terminate immediately if:
- Supplier experiences a material security breach
- Supplier fails to remediate critical security findings within 30 days
- Supplier loses required security certifications
- Supplier violates data protection obligations
```

**Deliverable:** Executed contracts with all required clauses

### 3.5 Stage 5: Ongoing Monitoring

**Tier 1 Suppliers (Critical):**

**Monthly:**
- Review security incident reports
- Monitor service availability (SLA compliance)
- Check for new CVEs affecting Supplier services

**Quarterly:**
- Request updated SOC 2 / ISO 27001 status
- Review Supplier security blog / advisories
- Test incident response contact procedures

**Annually:**
- Full security questionnaire refresh
- Review and renew SOC 2 Type II report
- Conduct risk re-assessment
- Update Data Processing Agreement

**Tier 2 Suppliers (Important):**
- Quarterly: Review security advisories and incident reports
- Annually: Security questionnaire refresh + certification review

**Tier 3 Suppliers (Standard):**
- Biannually: Security questionnaire check-in
- As needed: Review significant security incidents

**Automated Monitoring:**
- Subscribe to Supplier security mailing lists
- Monitor third-party risk platforms (e.g., SecurityScorecard, BitSight)
- Track CVE databases for Supplier vulnerabilities
- Set up Google Alerts for "[Supplier Name] breach"

**Deliverable:** Ongoing Monitoring Log + Annual Supplier Review Report

---

## 4. Supplier Risk Register

### 4.1 Risk Register Structure

| Supplier | Tier | Data Access | Current Risk | Last Assessment | Next Review | Status | Owner |
|----------|------|-------------|--------------|-----------------|-------------|--------|-------|
| Clerk | 1 | Member PII, auth tokens | Low | Jan 2026 | Jan 2027 | Active | Security Team |
| Stripe | 1 | Payment metadata | Low | Dec 2025 | Dec 2026 | Active | Finance |
| Azure | 1 | All production data | Low | Feb 2026 | Feb 2027 | Active | DevOps |

### 4.2 Risk Scoring Matrix

| Factor | Weight | Score Calculation |
|--------|--------|------------------|
| **Data Sensitivity** | 30% | Critical=5, High=4, Medium=3, Low=2, None=1 |
| **Data Volume** | 20% | Millions=5, Hundreds of thousands=4, Thousands=3, Hundreds=2, <100=1 |
| **Security Posture** | 25% | SOC2+ISO27001=1, SOC2 OR ISO27001=2, Other audit=3, Self-attestation=4, None=5 |
| **Incident History** | 15% | 0 incidents=1, 1-2 minor=2, 3+ minor=3, 1 major=4, 2+ major=5 |
| **Business Criticality** | 10% | Single point of failure=5, Critical with backup=3, Important=2, Nice to have=1 |

**Overall Risk = Weighted Average**

- **1.0-2.0:** Low Risk (Green)
- **2.1-3.0:** Medium Risk (Yellow) - Monitor closely
- **3.1-4.0:** High Risk (Orange) - Remediation plan required
- **4.1-5.0:** Critical Risk (Red) - Do not onboard / Exit plan

---

## 5. Current Supplier Assessments

### 5.1 Tier 1 (Critical) Suppliers

#### 5.1.1 Clerk (Authentication)

**Service:** User authentication, identity management, session management  
**Data Access:** Member PII, email addresses, authentication tokens  
**Classification:** Critical - Single point of failure  
**Status:** ✅ Approved

**Security Posture:**
- ✅ SOC 2 Type II certified (2025)
- ✅ ISO 27001 certified
- ✅ GDPR & CCPA compliant
- ✅ OWASP Top 10 protections
- ✅ MFA enforced for admin accounts
- ✅ 99.99% SLA

**Contractual Commitments:**
- ✅ 24-hour breach notification
- ✅ Data processing agreement signed
- ✅ Right to audit included
- ✅ Annual security review

**Risk Assessment:** **Low (1.8/5.0)**

**Next Review:** January 2027  
**Action Items:**
- Request 2026 SOC 2 report when available
- Implement failover authentication strategy (Azure AD B2C backup)

---

#### 5.1.2 Stripe (Payment Processing)

**Service:** Payment processing, subscription management  
**Data Access:** Payment metadata (no card data touches our systems - SAQ A)  
**Classification:** Critical - Financial transactions  
**Status:** ✅ Approved

**Security Posture:**
- ✅ PCI-DSS Level 1 Service Provider (highest level)
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 certified
- ✅ Annual penetration testing
- ✅ 99.99% SLA

**Contractual Commitments:**
- ✅ Immediate breach notification (per PCI-DSS)
- ✅ Liability protection up to $250K per incident
- ✅ Regular security updates provided

**Risk Assessment:** **Low (1.5/5.0)**

**Next Review:** December 2026  
**Action Items:** None - compliant

---

#### 5.1.3 Microsoft Azure (Infrastructure)

**Service:** Database (PostgreSQL), Blob Storage, OpenAI, Speech Services  
**Data Access:** All production data, backups, logs  
**Classification:** Critical - Infrastructure foundation  
**Status:** ✅ Approved

**Security Posture:**
- ✅ SOC 2 Type II certified
- ✅ ISO 27001, ISO 27017, ISO 27018 certified
- ✅ FedRAMP Authorized
- ✅ PIPEDA, GDPR, HIPAA compliant
- ✅ 99.99% SLA for database
- ✅ Encryption at rest (AES-256) and transit (TLS 1.2+)

**Contractual Commitments:**
- ✅ Microsoft Customer Agreement
- ✅ Data Processing Agreement (GDPR)
- ✅ Data residency commitment (Canada Central)
- ✅ Right to audit via third-party reports

**Risk Assessment:** **Low (1.3/5.0)**

**Next Review:** February 2027  
**Action Items:**
- Enable Azure Defender for Cloud (advanced threat protection)
- Implement Azure Private Link for database

---

#### 5.1.4 Vercel (Hosting & CDN)

**Service:** Application hosting, edge functions, CDN  
**Data Access:** Request logs, API traffic, environment variables  
**Classification:** Critical - Application layer  
**Status:** ✅ Approved

**Security Posture:**
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 certified
- ✅ GDPR compliant
- ✅ DDoS protection included
- ✅ WAF available (not yet enabled)
- ✅ 99.99% SLA

**Contractual Commitments:**
- ✅ Standard Vercel Enterprise Terms
- ✅ Data Processing Agreement
- ✅ Infrastructure security managed by AWS (underlying provider)

**Risk Assessment:** **Low (2.0/5.0)**

**Next Review:** February 2027  
**Action Items:**
- **Priority:** Enable Vercel WAF (Web Application Firewall)
- Implement Vercel Advanced Monitoring
- Review edge function security

---

### 5.2 Tier 2 (Important) Suppliers

#### 5.2.1 Sentry (Error Monitoring)

**Service:** Error tracking, performance monitoring  
**Data Access:** Error logs, stack traces, user IDs (no PII)  
**Classification:** Important - Security monitoring  
**Status:** ✅ Approved

**Security Posture:**
- ✅ SOC 2 Type II certified
- ✅ GDPR compliant
- ⚠️ ISO 27001 not disclosed
- ✅ Data scrubbing for PII

**Risk Assessment:** **Medium (2.3/5.0)**

**Next Review:** January 2027  
**Action Items:**
- Configure PII scrubbing rules
- Limit data retention to 30 days

---

#### 5.2.2 Resend (Email Delivery)

**Service:** Transactional email delivery  
**Data Access:** Email addresses, email content (may contain PII)  
**Classification:** Important - Communications  
**Status:** ✅ Approved

**Security Posture:**
- ✅ SOC 2 Type II in progress (expected Q2 2026)
- ✅ GDPR compliant
- ✅ TLS encryption for email transit
- ⚠️ No published SLA

**Risk Assessment:** **Medium (2.5/5.0)**

**Next Review:** July 2026  
**Action Items:**
- Request SOC 2 report once available
- Implement email content encryption for sensitive communications
- Define SLA expectations in contract renewal

---

#### 5.2.3 DocuSign (Digital Signatures)

**Service:** Digital signature verification and validation  
**Data Access:** Signature metadata, document hashes  
**Classification:** Important - Legal compliance  
**Status:** ✅ Approved

**Security Posture:**
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 certified
- ✅ eIDAS compliant (EU)
- ✅ PIPEDA, ESIGN Act compliant

**Risk Assessment:** **Low (1.9/5.0)**

**Next Review:** February 2027  
**Action Items:** None - compliant

---

### 5.3 Tier 3 (Standard) Suppliers

#### 5.3.1 GitHub (Source Code Repository)

**Service:** Source code hosting, CI/CD pipelines  
**Data Access:** Source code, secrets (encrypted), workflow logs  
**Classification:** Standard - Development infrastructure  
**Status:** ✅ Approved

**Security Posture:**
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 certified
- ✅ GDPR compliant
- ✅ Secret scanning enabled
- ✅ Dependabot security alerts

**Risk Assessment:** **Low (1.8/5.0)**

**Next Review:** February 2028 (biennial)  
**Action Items:**
- Enable GitHub Advanced Security (GHAS)
- Implement branch protection rules

---

#### 5.3.2 Upstash (Redis Cache)

**Service:** Rate limiting, session caching  
**Data Access:** Session tokens, rate limit counters (temporary)  
**Classification:** Standard - Performance optimization  
**Status:** ✅ Approved

**Security Posture:**
- ⚠️ SOC 2 certification not disclosed
- ✅ Hosted on AWS (inherits AWS security)
- ✅ TLS encryption
- ⚠️ No formal DPA

**Risk Assessment:** **Medium (2.8/5.0)**

**Next Review:** August 2026  
**Action Items:**
- Request security whitepaper
- Draft and sign DPA
- Evaluate alternatives with SOC 2 (e.g., Azure Redis)

---

## 6. Supplier Offboarding Process

### 6.1 Planned Offboarding

**Trigger:** Contract expiration, migration to new supplier, service discontinuation

**Timeline:** 90 days before termination

**Phase 1 (Days 1-30): Planning**
1. Document all integrations and dependencies
2. Identify data to be migrated or deleted
3. Select replacement supplier (if applicable)
4. Develop migration plan and rollback procedures
5. Notify stakeholders and obtain approvals

**Phase 2 (Days 31-60): Migration**
1. Export all Union Eyes data from supplier systems
2. Validate data integrity and completeness
3. Migrate to new supplier or internal systems
4. Test integrations and functionality
5. Run parallel systems for validation period

**Phase 3 (Days 61-90): Decommissioning**
1. Revoke API keys and access credentials
2. Request data deletion certification from supplier
3. Verify data deletion (audit logs, screenshots)
4. Close supplier accounts
5. Final invoice reconciliation
6. Archive supplier documentation for audit purposes

**Deliverable:** Offboarding Completion Report

### 6.2 Emergency Offboarding

**Trigger:** Security breach, contract violation, supplier insolvency, critical service failure

**Immediate Actions (0-24 hours):**
1. Revoke all API keys and access credentials
2. Disable integrations at firewall level
3. Activate backup supplier or fail-safe mode
4. Notify affected customers (if required)
5. Document incident for legal/audit purposes

**Short-term Actions (1-7 days):**
1. Export critical data (if safe to do so)
2. Redirect traffic to alternative services
3. Assess impact and develop recovery plan
4. Engage legal counsel for contract termination
5. Initiate vendor dispute resolution

**Long-term Actions (7-90 days):**
1. Complete data migration to replacement supplier
2. Seek data deletion certification
3. Pursue financial remedies (refunds, damages)
4. Update supplier security policies to prevent recurrence
5. Share lessons learned with security team

---

## 7. Assessment Templates and Tools

### 7.1 Pre-Engagement Risk Assessment Template

```markdown
# Supplier Pre-Engagement Risk Assessment

**Supplier Name:** _______________________
**Assessment Date:** _____________________
**Assessor:** ____________________________

## 1. Business Case
- **Service Description:**
- **Business Owner:**
- **Estimated Annual Spend:**

## 2. Data Classification
| Data Type | Volume | Sensitivity | Regulatory Requirements |
|-----------|--------|-------------|-------------------------|
| Member PII | | Critical | PIPEDA, GDPR |
| Financial | | Critical | PCI-DSS (if card data) |
| Health data | | High | PIPEDA |
| Operational | | Medium | |

## 3. Access Requirements
- [ ] Production database access
- [ ] API integration
- [ ] File storage access
- [ ] Administrative console access
- [ ] Network access

## 4. Integration Points
- **Systems:**
- **Data Flows:**
- **Authentication Method:**

## 5. Preliminary Security Assessment
- [ ] SOC 2 / ISO 27001 certified
- [ ] GDPR/PIPEDA compliant
- [ ] No recent security breaches
- [ ] Published security documentation
- [ ] Acceptable terms of service

## 6. Tier Classification
- [ ] Tier 1 (Critical)
- [ ] Tier 2 (Important)
- [ ] Tier 3 (Standard)
- [ ] Tier 4 (Minimal)

## 7. Recommendation
- [ ] Proceed to full assessment
- [ ] Approve with conditions
- [ ] Do not onboard

**Justification:**

**Approver Signature:** __________________  
**Date:** ________________
```

### 7.2 Security Questionnaire (Abbreviated)

**Full 100-question questionnaire available in: `SUPPLIER_SECURITY_QUESTIONNAIRE.xlsx`**

**Sample Questions:**

1. Does your organization maintain SOC 2 Type II or ISO 27001 certification?
2. How frequently do you conduct penetration testing?
3. Do you encrypt data at rest? (AES-256 or equivalent?)
4. Do you use MFA for administrative access?
5. What is your breach notification SLA?
6. Do you have subprocessors? If yes, how are they vetted?
7. Where is customer data stored geographically?
8. What is your data retention policy?
9. Do you have cyber insurance?
10. Have you had any security breaches in the past 24 months?

### 7.3 Annual Supplier Review Checklist

```markdown
# Annual Supplier Review - [Supplier Name]

**Review Date:** _______________
**Reviewer:** __________________
**Supplier Tier:** ______________

## Security Certifications
- [ ] SOC 2 Type II report reviewed (dated within 12 months)
- [ ] ISO 27001 certificate valid
- [ ] PCI-DSS AOC valid (if applicable)
- [ ] Penetration test results reviewed

## Contractual Compliance
- [ ] All security clauses in contract remain satisfied
- [ ] Breach notification procedures tested
- [ ] Data Processing Agreement current
- [ ] No contractual violations identified

## Incident Review
- [ ] No security incidents affecting Union Eyes data
- [ ] All incidents reported within SLA
- [ ] Root cause analysis provided for major incidents

## Performance Review
- [ ] SLA targets met (>99% if applicable)
- [ ] No unplanned outages exceeding threshold
- [ ] Response times within acceptable limits

## Risk Re-Assessment
- [ ] Security questionnaire refreshed
- [ ] Risk score recalculated
- [ ] No elevation in risk tier

## Action Items
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

## Recommendation
- [ ] Continue engagement - no changes
- [ ] Continue with remediation items
- [ ] Escalate to management - high risk
- [ ] Initiate offboarding

**Reviewed By:** _____________________  
**Date:** ____________________________

---

## 8. Automation and Tools

### 8.1 Recommended Third-Party Risk Management Tools

- **SecurityScorecard** - Continuous external security ratings
- **BitSight** - Vendor risk monitoring
- **OneTrust Vendorpedia** - Questionnaire automation
- **RiskRecon** - Digital supply chain risk
- **CyberGRX** - Vendor risk exchange

**Budget:** $5K-15K annually for monitoring tools

### 8.2 Automated Monitoring Script

Create PowerShell script: `scripts/compliance/monitor-suppliers.ps1`

```powershell
# Monitor Supplier Security - Daily Automated Check

$suppliers = @(
    @{ Name="Clerk"; URL="https://status.clerk.dev"; Cert="SOC2" },
    @{ Name="Stripe"; URL="https://status.stripe.com"; Cert="PCI-DSS" },
    @{ Name="Azure"; URL="https://status.azure.com"; Cert="SOC2" },
    @{ Name="Vercel"; URL="https://vercel-status.com"; Cert="SOC2" },
    @{ Name="Sentry"; URL="https://status.sentry.io"; Cert="SOC2" }
)

foreach ($supplier in $suppliers) {
    # Check status page
    $status = Invoke-WebRequest -Uri $supplier.URL -UseBasicParsing
    
    if ($status.StatusCode -ne 200) {
        Send-Alert "Supplier $($supplier.Name) status page unavailable"
    }
    
    # Check for security advisories (Google search automation)
    $query = "$($supplier.Name) security advisory breach"
    # Implement Google Alerts API or RSS feed monitoring
    
    # Log check
    Add-Content -Path "logs/supplier-monitoring.log" -Value "$(Get-Date) - $($supplier.Name) - OK"
}
```

### 8.3 Certificate Expiration Tracking

Maintain spreadsheet: `SUPPLIER_CERTIFICATIONS.xlsx`

| Supplier | Certification | Issue Date | Expiration Date | Renewal Status | Owner |
|----------|---------------|------------|-----------------|----------------|-------|
| Clerk | SOC 2 Type II | Jan 2025 | Jan 2026 | ⏳ Coming due | Security |
| Stripe | PCI-DSS AOC | quarterly | quarterly | ✅ Current | Finance |

Set calendar reminders 60 days before expiration to request renewed certificates.

---

## 9. Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| **Security & Compliance Team** | Own supplier assessment process, conduct reviews, maintain risk register |
| **Procurement / Finance** | Negotiate contracts, manage renewals, approve spend |
| **Legal** | Review and approve contract clauses, manage disputes |
| **Engineering** | Provide technical assessment, integration security review |
| **Business Owners** | Define service requirements, approve supplier decisions |

---

## 10. Document Control

**Effective Date:** February 12, 2026  
**Next Review:** February 2027 (annual)  
**Owner:** Security & Compliance Team  
**Approver:** Executive Management

**Change History:**
- v1.0 (Feb 2026): Initial framework

**Related Documents:**
- Information Security Policy
- ISMS Scope Statement
- Data Processing Agreement Template
- Supplier Security Questionnaire
- Asset Inventory

---

**ISO 27001:2022 Compliance:** A.5.19, A.5.20, A.5.21, A.5.22  
**SOC 2 Trust Services:** CC9.1, CC9.2

