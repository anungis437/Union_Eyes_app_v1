# Independent Security Review and Audit Schedule

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Security & Compliance Team  
**Review Schedule:** Annual  
**ISO 27001 Control:** A.5.35

## 1. Purpose

This document establishes schedule and requirements for independent reviews of the Union Eyes ISMS to provide objective assurance of security control effectiveness.

## 2. Types of Independent Reviews

### 2.1 Internal Audits

**Frequency:** Bi-annual (every 6 months)  
**Scope:** Review compliance with ISO 27001:2022 and SOC 2 Trust Services Criteria  
**Auditor:** Internal audit team or designated security personnel (not responsible for audited area)

**Coverage:**
- Access control implementation
- Incident response procedures
- Backup and recovery execution
- Change management practices
- Vendor management
- Physical and environmental security

**Process:**
1. Develop audit plan (scope, schedule, checklist)
2. Document review (policies, procedures, logs)
3. Interviews with control owners
4. Sample testing (random selection)
5. Findings documented in audit report
6. Management response and corrective action plan
7. Follow-up audit for critical findings

**Deliverable:** Internal Audit Report submitted to CTO and Executive Management

### 2.2 External Audits

#### 2.2.1 SOC 2 Type II Audit

**Frequency:** Annual  
**Auditor:** Independent CPA firm (e.g., Deloitte, PwC, RSM)  
**Standard:** AICPA SOC 2 Trust Services Criteria  
**Scope:** Security, Availability, Confidentiality Trust Service Criteria

**Timeline:**
- **Q1 (Jan-Mar):** Readiness assessment, select auditor, define scope
- **Q2-Q4 (Apr-Dec):** Observation period (minimum 6 months for Type II)
- **Q4 (Oct-Dec):** Fieldwork, control testing, evidence collection
- **Q1 Next Year:** Draft report review, management responses, final report

**Deliverable:** SOC 2 Type II Report (for customers and prospects)

#### 2.2.2 ISO 27001:2022 Certification Audit

**Frequency:** Annual surveillance (after initial certification); recertification every 3 years  
**Auditor:** Accredited certification body (e.g., BSI, SGS, Schellman)  
**Standard:** ISO 27001:2022

**Initial Certification (First Year):**
- **Stage 1 Audit (Documentation Review):** Review ISMS policies, procedures, risk assessment
- **Stage 2 Audit (Implementation Review):** On-site assessment, control testing, interviews
- **Certification Decision:** Certification body grants ISO 27001 certificate

**Annual Surveillance Audits (Years 2-3):**
- Verify continued compliance with ISO 27001
- Review corrective actions from previous audit
- Sample testing of modified controls or new risks

**Recertification Audit (Year 3):**
- Comprehensive re-audit similar to Stage 2
- ISMS maturity and continual improvement assessed

**Deliverable:** ISO 27001 Certificate (valid for 3 years with annual surveillance)

#### 2.2.3 Penetration Testing

**Frequency:** Quarterly (or after major releases)  
**Provider:** Independent security firm (e.g., Bishop Fox, NCC Group, Synack)  
**Scope:** Web application, APIs, infrastructure, authentication mechanisms

**Testing Types:**
- **External Black Box:** Simulated attacker with no insider knowledge
- **Internal Gray Box:** Simulated malicious insider or compromised account
- **API Security:** Focused testing on API endpoints and authorization
- **Social Engineering:** Phishing simulations (separate from pen test)

**Methodology:**
- OWASP Testing Guide
- PTES (Penetration Testing Execution Standard)
- NIST SP 800-115

**Process:**
1. Scope definition and rules of engagement
2. Reconnaissance and information gathering
3. Vulnerability scanning and manual testing
4. Exploitation (with approval, non-destructive)
5. Reporting: findings, severity, remediation recommendations
6. Retest after fixes (within 30 days)

**Deliverable:** Penetration Test Report (confidential, limited distribution)

**Schedule:**
- **Q1 (March):** External pen test (web app + APIs)
- **Q2 (June):** Internal pen test (simulated insider)
- **Q3 (September):** API security-focused pen test
- **Q4 (December):** Retest of critical findings + infrastructure pen test

### 2.3 Vulnerability Assessments

**Frequency:** Monthly (automated), Quarterly (manual review)  
**Tools:** Dependabot (dependencies), npm audit, Azure Security Center, Nessus/Qualys (planned)  
**Scope:** Application dependencies, infrastructure, OS, network

**Process:**
1. Automated scans run continuously (Dependabot, Azure Security Center)
2. Monthly vulnerability report generated
3. Critical/High vulnerabilities triaged within 48 hours
4. Quarterly manual review of scan findings by Security Team

**Deliverable:** Monthly Vulnerability Report

### 2.4 Code Security Review

**Frequency:** Continuous (peer review) + Quarterly (deep dive)  
**Reviewers:** Internal security engineers or external security consultants  
**Scope:** High-risk features, authentication/authorization, payment processing, data handling

**Quarterly Deep Dive:**
- Select 3-5 high-risk modules for in-depth review
- Manual code review for security anti-patterns
- Static analysis (ESLint security rules, SonarQube planned)
- Findings tracked and remediated

**Deliverable:** Quarterly Code Security Review Report

## 3. Audit Schedule (2026)

| Month | Audit/Review Type | Auditor/Provider | Scope | Status |
|-------|-------------------|------------------|-------|--------|
| **January** | Internal Audit (H1) | Internal Security Team | A.6 People Controls | Planned |
| **February** | SOC 2 Readiness Assessment | Internal preparation | All TSC | In Progress |
| **March** | Penetration Test (Q1) | External firm (TBD) | Web app + APIs | Planned |
| **April** | ISO 27001 Stage 1 | Certification body (TBD) | ISMS documentation | Planned |
| **May** | Vulnerability Assessment (Manual) | Security Team | Infrastructure + app | Planned |
| **June** | Penetration Test (Q2) | External firm | Internal/insider simulation | Planned |
| **July** | Internal Audit (H2) | Internal Security Team | A.8 Technical Controls | Planned |
| **August** | ISO 27001 Stage 2 | Certification body | Control implementation | Planned |
| **September** | Penetration Test (Q3) | External firm | API security focus | Planned |
| **October** | SOC 2 Type II Fieldwork | External CPA firm | 6-month observation period | Planned |
| **November** | Code Security Review | External consultant | Authentication & RLS | Planned |
| **December** | Penetration Test (Q4) | External firm | Retest + infrastructure | Planned |

## 4. Audit Criteria and Standards

- **ISO 27001:2022:** Annex A controls implementation
- **SOC 2:** Trust Services Criteria (Security, Availability, Confidentiality)
- **OWASP ASVS:** Application Security Verification Standard (Level 2 target)
- **NIST CSF:** Cybersecurity Framework alignment
- **PIPEDA / GDPR:** Privacy compliance

## 5. Audit Evidence Collection

### 5.1 Evidence Repository

Centralized location for audit evidence:
- **Location:** `docs/compliance/evidence/` (version-controlled)
- **Structure:** Organized by audit type and date
- **Access:** Restricted to Security Team, auditors (NDA)

### 5.2 Evidence Types

- **Policies and Procedures:** All current versions
- **Risk Assessments:** Risk register, treatment plans
- **Logs:** Audit logs, access logs, change logs (samples)
- **Configurations:** Screenshots, export files, IaC configs
- **Training Records:** Completion certificates, attendance sheets
- **Incident Reports:** Past incidents, lessons learned
- **Vendor Documentation:** SOC 2 reports, security questionnaires
- **Test Results:** Vulnerability scans, pen test reports, DR test results

### 5.3 Evidence Retention

- **Audit reports:** 7 years
- **Supporting evidence:** 3 years (or until next audit cycle)
- **Incident reports:** 7 years
- **Training records:** Duration of employment + 1 year

## 6. Findings Management

### 6.1 Finding Severity Levels

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | Control failure with immediate risk of material harm | 7 days |
| **High** | Control deficiency with significant risk | 30 days |
| **Medium** | Control weakness requiring improvement | 90 days |
| **Low** | Observation or minor gap | Next audit cycle |

### 6.2 Corrective Action Process

1. **Document Finding:** Auditor describes issue, evidence, impact
2. **Management Response:** Control owner proposes corrective action
3. **Approval:** Security Team and CTO approve action plan
4. **Implementation:** Control owner executes corrective action
5. **Verification:** Security Team verifies implementation
6. **Close:** Finding closed with evidence of remediation

### 6.3 Tracking

- All findings tracked in Jira or Linear
- Monthly status review by Security Team
- Overdue findings escalated to CTO

## 7. Auditor Selection Criteria

### 7.1 SOC 2 / ISO 27001 Auditors

**Required Qualifications:**
- AICPA registered CPA firm (for SOC 2)
- ISO 27001 accredited certification body (for ISO)
- Experience with SaaS and multi-tenant platforms
- References from similar-sized clients
- No conflicts of interest

**Selection Process:**
1. RFP issued to 3-5 firms
2. Proposals evaluated (cost, experience, timeline)
3. Reference checks
4. Engagement letter signed

### 7.2 Penetration Testing Providers

**Required Qualifications:**
- Certified ethical hackers (CEH, OSCP, GPEN)
- E&O insurance coverage (minimum $2M)
- NDA and confidentiality agreement
- Experience with Node.js, Next.js, PostgreSQL, Azure
- Positive references

**Selection Process:**
1. RFP or direct procurement (if known provider)
2. Scope and rules of engagement defined
3. SOW signed with liability and data protection clauses

## 8. Budget

| Audit/Review Type | Estimated Annual Cost | Notes |
|-------------------|----------------------|-------|
| **SOC 2 Type II** | $40,000 - $80,000 | First-year (higher); ongoing $30K-$50K |
| **ISO 27001 (Initial + Surveillance)** | $30,000 - $60,000 | Initial certification higher |
| **Penetration Testing (4x/year)** | $40,000 - $80,000 | $10K-$20K per test |
| **Vulnerability Scanning Tools** | $5,000 - $10,000 | SaaS subscriptions (if commercial) |
| **Code Security Review** | $10,000 - $20,000 | Quarterly or as-needed |
| **Internal Audit (labor)** | Internal cost | Security Team time |
| **Total Estimated** | $125,000 - $250,000 | Varies by scope and firm |

**Budget Approval:** CTO + CFO annual budget planning

## 9. Continuous Improvement

- Annual review of audit findings trends
- Update policies and procedures based on audit recommendations
- Share lessons learned with engineering and operations teams
- Adjust audit scope based on risk changes and business growth

## 10. Communication Plan

### 10.1 Internal Communication

- **Audit scheduled:** Notification to impacted teams (2 weeks prior)
- **Audit in progress:** Daily standup with auditors and control owners
- **Draft findings:** Review with control owners (5 business days to respond)
- **Final report:** CTO and Executive Management briefing
- **Corrective actions:** Monthly updates to stakeholders

### 10.2 External Communication

- **SOC 2 Reports:** Shared with customers and prospects under NDA
- **ISO 27001 Certificate:** Posted on website and shared with prospects
- **Pen Test Reports:** Confidential (internal only), summary for board if requested

## Document Control

- **Next Review Date:** February 2027 (or after first audit cycle)
- **Approval:** CTO + CFO (budget) + Executive Management
- **Change History:**
  - v1.0 (February 2026): Initial audit schedule

---

## Appendix A: Internal Audit Checklist Template

*(To be maintained separately)*

**ISO 27001 Control Areas:**
- A.5 Organizational Controls
- A.6 People Controls
- A.7 Physical Controls
- A.8 Technological Controls

**SOC 2 Trust Service Criteria:**
- CC1-CC9 (Common Criteria)
- A1 (Availability)
- C1 (Confidentiality)

**Sample Testing:**
- 25+ samples across key controls
- Random selection or risk-based

## Appendix B: Auditor Contact List

*(To be maintained separately)*

- SOC 2 Auditor: [Firm Name, Contact, Email, Phone]
- ISO 27001 Certification Body: [Name, Contact, Email, Phone]
- Penetration Testing Firm: [Name, Contact, Email, Phone]
- Internal Audit Lead: [Name, Email, Phone]
