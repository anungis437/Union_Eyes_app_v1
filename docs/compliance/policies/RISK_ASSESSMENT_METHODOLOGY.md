# Risk Assessment and Treatment Methodology

**Union Eyes Information Security Management System (ISMS)**  
**Document Type:** ISMS Policy  
**Classification:** Internal  
**Version:** 1.0  
**Effective Date:** February 12, 2026  
**Review Date:** August 12, 2026  
**Owner:** Chief Information Security Officer (CISO)  
**Approved By:** Executive Management

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-12 | CISO | Initial release |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Regulatory and Standards Framework](#2-regulatory-and-standards-framework)
3. [Risk Assessment Framework](#3-risk-assessment-framework)
4. [Risk Identification Process](#4-risk-identification-process)
5. [Risk Analysis Methodology](#5-risk-analysis-methodology)
6. [Risk Evaluation and Prioritization](#6-risk-evaluation-and-prioritization)
7. [Risk Treatment Options](#7-risk-treatment-options)
8. [Risk Register and Documentation](#8-risk-register-and-documentation)
9. [Union Eyes Risk Inventory](#9-union-eyes-risk-inventory)
10. [Risk Treatment Plans](#10-risk-treatment-plans)
11. [Risk Monitoring and Review](#11-risk-monitoring-and-review)
12. [Roles and Responsibilities](#12-roles-and-responsibilities)
13. [Appendices](#13-appendices)

---

## 1. Purpose and Scope

### 1.1 Purpose

This Risk Assessment and Treatment Methodology document establishes the systematic approach for identifying, analyzing, evaluating, treating, and monitoring information security risks within Union Eyes' Information Security Management System (ISMS). This methodology ensures compliance with ISO 27001:2022 and ISO 27005:2022 standards.

### 1.2 Scope

This methodology applies to:

- **Union Eyes Platform**: Multi-tenant SaaS application for union management
- **Infrastructure**: Azure PostgreSQL database, Vercel hosting environment
- **Third-Party Services**: Clerk (authentication), Stripe (payments), Azure services, Vercel platform
- **Data Assets**: 200+ database tables with Row-Level Security (RLS)
- **API Surface**: 373 secured API endpoints
- **Access Control**: 26 RBAC roles with hierarchical access control
- **Compliance Obligations**: PIPEDA, GDPR, SOC 2 Type II, ISO 27001:2022

### 1.3 Objectives

1. Provide a consistent, repeatable framework for risk assessment
2. Align risk management with business objectives and compliance requirements
3. Enable informed decision-making on risk treatment
4. Establish clear accountability for risk ownership
5. Ensure continuous monitoring and improvement of risk posture

---

## 2. Regulatory and Standards Framework

### 2.1 Applicable Standards

| Standard | Relevance | Key Requirements |
|----------|-----------|------------------|
| **ISO 27001:2022** | ISMS certification | Clauses 6.1.2 (Risk Assessment), 6.1.3 (Risk Treatment), 8.2 (Information Security Risk Assessment), 8.3 (Information Security Risk Treatment) |
| **ISO 27005:2022** | Risk management guidance | Comprehensive risk management process framework |
| **ISO 31000:2018** | Risk management principles | General risk management guidelines |
| **NIST SP 800-30** | Risk assessment guide | US federal risk assessment methodology |

### 2.2 Regulatory Compliance

| Regulation | Jurisdiction | Risk Implications |
|------------|--------------|-------------------|
| **PIPEDA** | Canada | Personal information breach notification, consent management |
| **GDPR** | EU/EEA | Data subject rights, cross-border transfers, breach notification |
| **SOC 2 Type II** | Industry standard | Trust service principles (Security, Availability, Confidentiality, Privacy) |
| **CASL** | Canada | Anti-spam requirements for notifications |

### 2.3 Risk Assessment Frequency

- **Annual**: Full comprehensive risk assessment
- **Quarterly**: Risk register review and update
- **Ad-hoc**: Triggered by significant changes:
  - Major system changes or upgrades
  - New third-party integrations
  - Security incidents or near-misses
  - Changes in regulatory environment
  - Organizational restructuring
  - New business processes or services

---

## 3. Risk Assessment Framework

### 3.1 Risk Management Process Overview

Union Eyes follows the ISO 27005:2022 risk management process:

```
┌─────────────────────────────────────────────────────────────┐
│                     CONTEXT ESTABLISHMENT                    │
│  • Define scope, boundaries, and criteria                   │
│  • Identify stakeholders and compliance requirements        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RISK IDENTIFICATION                      │
│  • Identify assets                                          │
│  • Identify threats                                         │
│  • Identify existing controls                               │
│  • Identify vulnerabilities                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      RISK ANALYSIS                          │
│  • Assess likelihood                                        │
│  • Assess impact/consequences                               │
│  • Calculate risk level                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RISK EVALUATION                         │
│  • Compare against risk criteria                            │
│  • Prioritize risks                                         │
│  • Determine risk treatment necessity                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RISK TREATMENT                          │
│  • Select treatment options                                 │
│  • Develop treatment plans                                  │
│  • Implement controls                                       │
│  • Accept residual risk                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              RISK MONITORING AND REVIEW                     │
│  • Monitor risk indicators                                  │
│  • Review control effectiveness                             │
│  • Update risk register                                     │
│  • Report to management                                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Risk Assessment Criteria

#### 3.2.1 Risk Appetite Statement

Union Eyes' risk appetite defines the level of risk the organization is willing to accept:

- **ZERO TOLERANCE**: Data breaches exposing member personal information, complete system unavailability >4 hours, regulatory non-compliance
- **LOW TOLERANCE**: Isolated tenant data leakage, privileged access abuse, critical third-party failures
- **MODERATE TOLERANCE**: Performance degradation, minor security misconfigurations, limited data exposure
- **ACCEPTABLE**: Low-impact operational risks, minimal security findings, non-critical feature bugs

#### 3.2.2 Risk Acceptance Criteria

Risks are acceptable when:

1. **Inherent Risk Level**: Low (1-4) after initial assessment
2. **Residual Risk Level**: Low to Medium (1-8) after treatment implementation
3. **Cost-Benefit Analysis**: Treatment cost exceeds potential impact
4. **Regulatory Compliance**: All compliance requirements are met
5. **Management Approval**: Executive management formally approves acceptance

---

## 4. Risk Identification Process

### 4.1 Asset Identification

#### 4.1.1 Information Assets

| Asset Category | Examples | Owner |
|----------------|----------|-------|
| **Member Data** | Personal information, financial records, employment history | Data Protection Officer |
| **Financial Data** | Accounting records, payment transactions, dues, strike fund | CFO |
| **Intellectual Property** | Source code, proprietary algorithms, business processes | CTO |
| **System Assets** | Databases (200+ tables), API infrastructure (373 endpoints), authentication system | CTO |
| **Third-Party Services** | Clerk, Stripe, Azure, Vercel | CTO |

#### 4.1.2 Physical Assets

- Development workstations and laptops
- Network infrastructure
- Backup storage devices
- Mobile devices accessing the system

#### 4.1.3 Human Assets

- Development team (source code access)
- Operations team (production access)
- Support personnel (member data access)
- Contractors and vendors
- 26 RBAC roles with varying privilege levels

### 4.2 Threat Identification

#### 4.2.1 Threat Categories (ISO 27005)

| Category | Threat Examples |
|----------|----------------|
| **Natural Disasters** | Fire, flood, earthquake, power outage |
| **Technical Failures** | Hardware failure, software bugs, network outage |
| **Human Errors** | Misconfiguration, accidental deletion, privilege misuse |
| **Malicious Actions** | Hacking, malware, ransomware, DDoS, insider threats |
| **Third-Party Failures** | Clerk outage, Stripe API failure, Azure service disruption |
| **Legal/Regulatory** | Compliance violations, contractual breaches |

#### 4.2.2 Threat Actors

| Actor Type | Motivation | Capability | Targeting |
|------------|------------|------------|-----------|
| **Cybercriminals** | Financial gain | Medium-High | Financial data, ransom opportunities |
| **Hacktivists** | Ideological | Low-Medium | Public-facing services, data exposure |
| **Insider (Malicious)** | Financial, revenge | High | Privileged access, sensitive data |
| **Insider (Negligent)** | Unintentional | Low-Medium | Any accessible data |
| **Nation-State** | Espionage | Very High | Intellectual property, member data |
| **Competitors** | Business advantage | Low-Medium | Trade secrets, member information |

### 4.3 Vulnerability Identification

#### 4.3.1 Vulnerability Assessment Methods

1. **Automated Scanning**
   - Infrastructure vulnerability scanning (weekly)
   - Dependency scanning (Dependabot, Snyk)
   - SAST (Static Application Security Testing)
   - DAST (Dynamic Application Security Testing)

2. **Manual Reviews**
   - Code reviews (all PRs)
   - Architecture security reviews (quarterly)
   - Configuration audits (monthly)
   - Penetration testing (annual)

3. **Threat Intelligence**
   - CVE monitoring
   - Security advisories (Azure, Vercel, Clerk, Stripe)
   - Industry threat reports

#### 4.3.2 Common Vulnerability Categories

| Category | Union Eyes Specific Examples |
|----------|------------------------------|
| **Authentication** | Clerk configuration weaknesses, session management flaws |
| **Authorization** | RLS bypass vulnerabilities, RBAC misconfigurations |
| **Multi-tenancy** | Tenant isolation failures, cross-tenant data leakage |
| **API Security** | Injection flaws, broken object level authorization (BOLA) |
| **Data Protection** | Encryption weaknesses, inadequate key management |
| **Infrastructure** | Misconfigured Azure resources, exposed endpoints |
| **Third-Party** | Vulnerable dependencies, insecure integrations |
| **Cryptography** | Weak algorithms, improper implementation |

### 4.4 Control Identification

#### 4.4.1 Existing Control Categories

| Control Type | Description | Examples |
|--------------|-------------|----------|
| **Preventive** | Stop security incidents before they occur | Firewall rules, authentication, input validation |
| **Detective** | Identify security incidents in progress or after occurrence | Logging, monitoring, IDS/IPS |
| **Corrective** | Restore systems after incidents | Backup restoration, incident response |
| **Deterrent** | Discourage threat actors | Security policies, legal agreements, audit logs |
| **Recovery** | Return to normal operations | Disaster recovery plans, business continuity |

#### 4.4.2 Union Eyes Control Inventory (Key Controls)

1. **Access Control (A.5, A.8)**
   - Clerk authentication with MFA
   - 26 hierarchical RBAC roles
   - Row-Level Security (RLS) on 200+ tables
   - Session management and timeout policies

2. **Cryptography (A.8.24)**
   - TLS 1.3 for data in transit
   - AES-256 encryption for data at rest (Azure)
   - Proper key management and rotation

3. **Network Security (A.8.20-A.8.22)**
   - Vercel edge network with DDoS protection
   - Azure Private Link for database connections
   - API rate limiting and throttling

4. **Monitoring and Logging (A.8.15-A.8.16)**
   - Comprehensive audit logging
   - Real-time security monitoring
   - Incident detection and alerting

5. **Vulnerability Management (A.8.8)**
   - Automated dependency scanning
   - Regular security patching
   - Annual penetration testing

6. **Backup and Recovery (A.8.13)**
   - Automated daily backups
   - 30-day retention period
   - Tested recovery procedures

---

## 5. Risk Analysis Methodology

### 5.1 Analysis Approach

Union Eyes employs a **hybrid risk analysis approach**:

- **Qualitative Analysis**: Default method for most risks (faster, suitable for most scenarios)
- **Quantitative Analysis**: Used for high-impact financial risks and business-critical systems

### 5.2 Qualitative Risk Analysis

#### 5.2.1 Likelihood Assessment

**Likelihood Scale** (Probability of occurrence within 12 months):

| Level | Rating | Description | Frequency |
|-------|--------|-------------|-----------|
| **Very High** | 5 | Almost certain to occur | > 90% (Multiple times per year) |
| **High** | 4 | Likely to occur | 60-90% (Once per year) |
| **Medium** | 3 | Possible | 30-60% (Once every 2-3 years) |
| **Low** | 2 | Unlikely | 10-30% (Once every 5 years) |
| **Very Low** | 1 | Rare | < 10% (Once every 10+ years) |

**Likelihood Factors**:
- Threat actor capability and motivation
- Vulnerability exploitability
- Existing control effectiveness
- Historical incident data
- Industry trends and threat intelligence

#### 5.2.2 Impact Assessment

**Impact Scale** (Consequence severity across multiple dimensions):

| Level | Rating | Financial | Operational | Reputational | Legal/Compliance |
|-------|--------|-----------|-------------|--------------|------------------|
| **Critical** | 5 | > $500K | Complete system failure >24h | National media, mass member exodus | Major regulatory penalties, criminal charges |
| **High** | 4 | $100K-$500K | Core services unavailable 4-24h | Regional media, significant member loss | Regulatory investigation, major fines |
| **Medium** | 3 | $20K-$100K | Degraded performance 1-4h | Local media, minor member complaints | Compliance breach, moderate fines |
| **Low** | 2 | $5K-$20K | Minor disruption <1h | Internal complaints only | Minor compliance issue |
| **Very Low** | 1 | < $5K | Negligible | No external impact | No compliance impact |

**Impact Categories**:

1. **Financial Impact**
   - Direct costs (incident response, legal, fines)
   - Indirect costs (lost revenue, productivity loss)
   - Recovery costs

2. **Operational Impact**
   - Service availability and performance
   - Business process disruption
   - Data loss or corruption

3. **Reputational Impact**
   - Member trust and satisfaction
   - Media coverage and public perception
   - Competitive positioning

4. **Legal and Compliance Impact**
   - Regulatory fines and penalties
   - Legal liability and lawsuits
   - Contractual breaches

5. **Strategic Impact**
   - Market position
   - Business objectives achievement
   - Long-term viability

#### 5.2.3 Risk Level Calculation

**Risk Matrix** (Likelihood × Impact):

```
                              IMPACT
                 │ Very Low │  Low  │ Medium │  High  │ Critical
      ──────────┼──────────┼───────┼────────┼────────┼──────────
      Very High │    5     │  10   │   15   │   20   │    25
         (5)    │  MEDIUM  │  HIGH │  HIGH  │CRITICAL│ CRITICAL
      ──────────┼──────────┼───────┼────────┼────────┼──────────
         High   │    4     │   8   │   12   │   16   │    20
         (4)    │   LOW    │MEDIUM │  HIGH  │  HIGH  │ CRITICAL
L     ──────────┼──────────┼───────┼────────┼────────┼──────────
I       Medium  │    3     │   6   │    9   │   12   │    15
K       (3)     │   LOW    │MEDIUM │ MEDIUM │  HIGH  │  HIGH
E     ──────────┼──────────┼───────┼────────┼────────┼──────────
L        Low    │    2     │   4   │    6   │    8   │    10
I       (2)     │   LOW    │  LOW  │ MEDIUM │ MEDIUM │  HIGH
H     ──────────┼──────────┼───────┼────────┼────────┼──────────
O     Very Low  │    1     │   2   │    3   │    4   │     5
O       (1)     │   LOW    │  LOW  │  LOW   │  LOW   │  MEDIUM
D     ──────────┴──────────┴───────┴────────┴────────┴──────────
```

**Risk Rating Categories**:

| Risk Score | Risk Level | Color Code | Description |
|------------|-----------|------------|-------------|
| **20-25** | CRITICAL | 🔴 Red | Immediate action required, escalate to executive management |
| **12-19** | HIGH | 🟠 Orange | Priority treatment, implement within 30 days |
| **6-11** | MEDIUM | 🟡 Yellow | Planned treatment, implement within 90 days |
| **3-5** | LOW | 🟢 Green | Monitor, treat if resources available |
| **1-2** | VERY LOW | 🔵 Blue | Accept, periodic review |

### 5.3 Quantitative Risk Analysis

#### 5.3.1 When to Use Quantitative Analysis

Apply quantitative methods for:
- Risks with financial impact > $100K
- Business-critical systems (authentication, payment processing)
- ROI analysis for major security investments
- Cyber insurance requirements
- Regulatory capital allocation

#### 5.3.2 Quantitative Metrics

**Annual Loss Expectancy (ALE) Formula**:

```
ALE = SLE × ARO

Where:
- SLE (Single Loss Expectancy) = Asset Value × Exposure Factor
- ARO (Annualized Rate of Occurrence) = Expected frequency per year
```

**Example Calculation**: Database Ransomware Attack

```
Asset Value: $2,000,000 (database value + associated data)
Exposure Factor: 0.8 (80% data loss/unavailability)
SLE = $2,000,000 × 0.8 = $1,600,000

ARO: 0.05 (5% chance per year based on industry data)
ALE = $1,600,000 × 0.05 = $80,000

Cost of Mitigation: $30,000/year (enhanced backup + EDR solution)
ROI = ($80,000 - $30,000) / $30,000 = 167% (Favorable)
```

#### 5.3.3 FAIR (Factor Analysis of Information Risk) Model

For complex risks, Union Eyes may employ FAIR methodology:

1. **Loss Event Frequency (LEF)** = Threat Event Frequency × Vulnerability
2. **Probable Loss Magnitude (PLM)** = Primary Loss + Secondary Loss
3. **Risk** = LEF × PLM (Monte Carlo simulation for range estimation)

---

## 6. Risk Evaluation and Prioritization

### 6.1 Risk Evaluation Process

**Step 1: Compare Against Risk Criteria**
- Map each risk against risk appetite statement
- Identify risks exceeding acceptable thresholds
- Consider cumulative risk exposure

**Step 2: Prioritization Factors**

| Factor | Weight | Considerations |
|--------|--------|---------------|
| **Risk Score** | 40% | Calculated from likelihood × impact |
| **Compliance Impact** | 25% | ISO 27001, PIPEDA, GDPR, SOC 2 requirements |
| **Business Criticality** | 20% | Impact on core business operations |
| **Stakeholder Concern** | 10% | Member, board, or regulatory concerns |
| **Treatment Feasibility** | 5% | Ease and cost of implementation |

**Step 3: Risk Ranking**

Risks are ranked using a weighted scoring model:

```
Priority Score = (Risk Score × 0.4) + (Compliance Impact × 0.25) + 
                 (Business Criticality × 0.2) + (Stakeholder Concern × 0.1) + 
                 (Treatment Feasibility × 0.05)
```

### 6.2 Risk Prioritization Matrix

| Priority Tier | Risk Level | Treatment Timeline | Resource Allocation |
|---------------|-----------|-------------------|---------------------|
| **P0 - Critical** | Critical (20-25) | 0-14 days | Dedicated resources, emergency budget |
| **P1 - High** | High (12-19) | 15-30 days | Priority resources, planned budget |
| **P2 - Medium** | Medium (6-11) | 31-90 days | Standard resources, quarterly budget |
| **P3 - Low** | Low (3-5) | 91-180 days | Opportunistic, available resources |
| **P4 - Very Low** | Very Low (1-2) | As needed | Minimal resources |

### 6.3 Risk Aggregation

**Cumulative Risk Exposure**:

Union Eyes tracks cumulative exposure across:
- **Domain**: Authentication, authorization, data storage, API security, third-party, infrastructure
- **Asset Category**: Member data, financial data, system infrastructure
- **Threat Actor**: External attackers, insiders, third-party failures

**Example Aggregation Alert**: If 3+ HIGH risks are identified in the "Authentication" domain, escalate for architectural review.

---

## 7. Risk Treatment Options

### 7.1 Treatment Strategy Selection

#### 7.1.1 Risk Mitigation (Reduce)

**Definition**: Implement controls to reduce likelihood and/or impact

**When to Apply**:
- Risk exceeds appetite (MEDIUM to CRITICAL)
- Feasible and cost-effective controls exist
- Required for regulatory compliance

**Union Eyes Examples**:
- Implement WAF (Web Application Firewall) to reduce attack likelihood
- Deploy EDR (Endpoint Detection and Response) to reduce malware impact
- Introduce RLS (Row-Level Security) to reduce data exposure impact

**Control Types**:
- **Technical**: Firewalls, encryption, access controls, monitoring
- **Administrative**: Policies, procedures, training, audits
- **Physical**: Locks, badges, surveillance (limited for SaaS)

#### 7.1.2 Risk Avoidance (Eliminate)

**Definition**: Remove the risk source or cease the risky activity

**When to Apply**:
- Risk is CRITICAL and cannot be adequately mitigated
- Activity provides minimal business value
- Alternative approaches exist with lower risk

**Union Eyes Examples**:
- Avoid storing payment card data (PCI DSS avoidance via Stripe)
- Discontinue legacy authentication methods (remove password-only auth)
- Retire risky features or integrations

#### 7.1.3 Risk Transfer (Share)

**Definition**: Share risk with third parties through insurance or contracts

**When to Apply**:
- Financial impact is high but likelihood is low
- Specialized third-party can manage risk more effectively
- Cost of transfer is less than cost of mitigation

**Union Eyes Examples**:
- **Cyber Insurance**: $2M coverage for data breach costs
- **Contractual Transfer**: SLAs with Azure (99.99% uptime guarantee)
- **Vendor Warranties**: Clerk security certifications and indemnification
- **Outsourcing**: Use managed services for specialized security functions

**Key Considerations**:
- Transfer reduces financial impact but not likelihood
- Residual risk and reputational impact remain
- Insurance may not cover all scenarios (e.g., willful negligence)

#### 7.1.4 Risk Acceptance (Retain)

**Definition**: Acknowledge risk and accept consequences without further treatment

**When to Apply**:
- Risk level is LOW or VERY LOW (within appetite)
- Cost of treatment exceeds potential impact
- No feasible treatment options exist
- Management explicitly approves acceptance

**Union Eyes Examples**:
- Accept risk of theoretical DDoS attacks <1 hour (Vercel handles)
- Accept minor UI/UX defects with no security impact
- Accept low-likelihood, low-impact operational risks

**Formal Acceptance Requirements**:
1. **Documentation**: Clearly document risk, rationale, and residual exposure
2. **Approval**: Executive management or Risk Committee sign-off
3. **Review**: Periodic reassessment (quarterly minimum)
4. **Monitoring**: Track risk indicators to detect changes

### 7.2 Treatment Plan Requirements

Each risk treatment plan must include:

1. **Risk Identification**
   - Risk ID, title, description
   - Current risk level and score

2. **Treatment Objectives**
   - Target residual risk level
   - Success criteria and KPIs

3. **Treatment Actions**
   - Specific controls to implement
   - Control type (preventive, detective, corrective)
   - ISO 27001 Annex A control mapping

4. **Implementation Details**
   - Responsible owner
   - Required resources and budget
   - Implementation timeline and milestones

5. **Residual Risk**
   - Expected residual risk level after treatment
   - Residual risk acceptance authority

6. **Monitoring and Review**
   - Control effectiveness metrics
   - Review frequency
   - Escalation criteria

---

## 8. Risk Register and Documentation

### 8.1 Risk Register Structure

The Union Eyes Risk Register is maintained in the ISMS document repository with the following structure:

| Field | Description | Example |
|-------|-------------|---------|
| **Risk ID** | Unique identifier | RISK-2026-001 |
| **Risk Title** | Short descriptive name | "Multi-Tenant Data Isolation Failure" |
| **Category** | Risk domain | Data Security, Authentication, Infrastructure |
| **Description** | Detailed risk scenario | "Failure of RLS policies could expose tenant A data to tenant B..." |
| **Threat** | Threat actor or event | Malicious insider, software bug, SQL injection |
| **Vulnerability** | Exploitable weakness | Insufficient RLS testing, complex query patterns |
| **Asset(s)** | Affected assets | Member database, financial records |
| **Existing Controls** | Current mitigations | RLS policies, integration tests, code review |
| **Likelihood** | Probability rating (1-5) | 2 (Low) |
| **Impact** | Consequence severity (1-5) | 5 (Critical) |
| **Inherent Risk** | Risk before treatment | 10 (HIGH - 2×5) |
| **Treatment Strategy** | Mitigate/Avoid/Transfer/Accept | Mitigate |
| **Planned Controls** | Additional mitigations | Enhanced RLS testing, chaos engineering |
| **Residual Likelihood** | After treatment | 1 (Very Low) |
| **Residual Impact** | After treatment | 5 (Critical) |
| **Residual Risk** | Risk after treatment | 5 (MEDIUM - 1×5) |
| **Risk Owner** | Accountable person | CTO |
| **Treatment Owner** | Implementation lead | Senior Backend Engineer |
| **Status** | Current state | Identified / In Treatment / Monitored / Closed |
| **Due Date** | Treatment completion | 2026-03-15 |
| **Last Review** | Last assessment date | 2026-02-12 |
| **Next Review** | Scheduled review | 2026-05-12 |

### 8.2 Risk Documentation Requirements

#### 8.2.1 Risk Assessment Report

Generated after each full risk assessment, including:

1. **Executive Summary**
   - Key findings and overall risk posture
   - Critical and high risks requiring immediate attention
   - Changes from previous assessment

2. **Methodology Overview**
   - Process followed, criteria used
   - Participants and stakeholders

3. **Risk Inventory**
   - Complete list of identified risks
   - Risk heat map and distribution

4. **Treatment Recommendations**
   - Prioritized treatment plans
   - Resource requirements and budget

5. **Compliance Status**
   - Mapping to ISO 27001, PIPEDA, GDPR, SOC 2
   - Outstanding compliance gaps

#### 8.2.2 Risk Treatment Plan Document

For each MEDIUM or higher risk, document:

1. Detailed treatment approach and controls
2. Implementation roadmap and milestones
3. Resource allocation and budget
4. Success metrics and validation approach
5. Residual risk acceptance statement

#### 8.2.3 Risk Acceptance Form

For accepted risks, formal documentation including:

- Risk details and justification for acceptance
- Residual risk level and exposure
- Compensating controls (if any)
- Review schedule
- Executive approval signature and date

### 8.3 Risk Register Maintenance

- **Quarterly**: Full risk register review and update
- **Monthly**: Status updates for risks in treatment
- **Continuous**: New risk identification and logging
- **Annual**: Comprehensive risk assessment and register refresh

---

## 9. Union Eyes Risk Inventory

### 9.1 Critical and High Risks

#### RISK-2026-001: Multi-Tenant Data Isolation Failure

| Attribute | Value |
|-----------|-------|
| **Category** | Data Security / Multi-Tenancy |
| **Description** | Failure of Row-Level Security (RLS) policies or application logic could expose one union's data to another union, resulting in confidentiality breach and compliance violations. |
| **Threat** | SQL injection, RLS bypass vulnerability, application logic error, privilege escalation |
| **Vulnerability** | Complex RLS policies (200+ tables), query pattern edge cases, insufficient testing coverage |
| **Asset** | Member personal data, financial records, all 200+ database tables |
| **Existing Controls** | - RLS policies on all tables<br>- Integration tests for tenant isolation<br>- Code review process<br>- Clerk organizational ID enforcement |
| **Likelihood** | 2 (Low) - Strong controls but complexity creates risk |
| **Impact** | 5 (Critical) - PIPEDA/GDPR breach, complete loss of trust, regulatory penalties |
| **Inherent Risk** | **10 (HIGH)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Enhanced chaos engineering tests<br>- Automated RLS policy validation<br>- Tenant isolation smoke tests in CI/CD<br>- Third-party penetration testing (tenant isolation focus) |
| **Residual Risk** | **5 (MEDIUM)** - Likelihood reduced to 1 (Very Low) |
| **Owner** | CTO |
| **Priority** | P1 (0-30 days) |

---

#### RISK-2026-002: Authentication Provider (Clerk) Single Point of Failure

| Attribute | Value |
|-----------|-------|
| **Category** | Authentication / Third-Party Dependency |
| **Description** | Complete outage or compromise of Clerk authentication service would prevent all users from logging in, resulting in total system unavailability. |
| **Threat** | Clerk service outage, DDoS attack on Clerk, insider threat at Clerk, business continuity failure |
| **Vulnerability** | Single authentication provider, no fallback mechanism, complete dependency on external service |
| **Asset** | User authentication, all 373 API endpoints, entire platform access |
| **Existing Controls** | - Clerk SLA (99.99% uptime)<br>- Clerk SOC 2 Type II certification<br>- Multi-region Clerk deployment<br>- Session token caching (limited grace period) |
| **Likelihood** | 3 (Medium) - Third-party SLAs not under our control |
| **Impact** | 5 (Critical) - Complete service unavailability, revenue loss, reputation damage |
| **Inherent Risk** | **15 (HIGH)** |
| **Treatment Strategy** | Mitigate + Transfer |
| **Planned Controls** | - Implement long-lived session tokens (12-hour grace period)<br>- Develop read-only emergency mode (no auth required for critical ops)<br>- Contractual SLA penalties with Clerk<br>- Cyber insurance covering third-party outages<br>- Disaster recovery runbook for Clerk outage |
| **Residual Risk** | **9 (MEDIUM)** - Likelihood reduced to 2 (Low), Impact to 4 (High) |
| **Owner** | CTO |
| **Priority** | P1 (0-30 days) |

---

#### RISK-2026-003: Database Breach via SQL Injection or Credential Compromise

| Attribute | Value |
|-----------|-------|
| **Category** | Data Security / Database Security |
| **Description** | Attacker gains direct access to Azure PostgreSQL database through SQL injection vulnerability, compromised credentials, or database misconfiguration, exposing all tenant data. |
| **Threat** | External attacker, SQL injection, stolen credentials, privilege escalation, insider threat |
| **Vulnerability** | 373 API endpoints with database queries, database credentials in environment variables, complex ORM queries |
| **Asset** | Entire database (200+ tables), all member PII, financial records, authentication data |
| **Existing Controls** | - Parameterized queries (ORM)<br>- Azure Private Link (no public internet access)<br>- Database credentials rotation (90 days)<br>- Least privilege database roles<br>- Azure DDoS Protection<br>- Connection string encryption |
| **Likelihood** | 2 (Low) - Strong controls but high-value target |
| **Impact** | 5 (Critical) - Catastrophic data breach, regulatory fines, class-action lawsuits |
| **Inherent Risk** | **10 (HIGH)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Implement database activity monitoring (Azure SQL Auditing)<br>- Deploy Azure Defender for SQL<br>- Introduce database firewall rules (IP allowlisting)<br>- Automated SQL injection scanning (SAST/DAST)<br>- Database encryption at rest verification<br>- Quarterly credential rotation (vs. 90 days) |
| **Residual Risk** | **5 (MEDIUM)** - Likelihood reduced to 1 (Very Low) |
| **Owner** | CTO |
| **Priority** | P1 (0-30 days) |

---

#### RISK-2026-004: Ransomware Attack on Database

| Attribute | Value |
|-----------|-------|
| **Category** | Business Continuity / Data Security |
| **Description** | Ransomware encrypts or deletes database contents, rendering system unusable and requiring restoration from backups with potential data loss. |
| **Threat** | Ransomware malware, phishing attack, supply chain compromise, insider threat |
| **Vulnerability** | Database accessible from application servers, backup restoration not regularly tested, potential backup encryption |
| **Asset** | Database (all 200+ tables), business continuity, operational availability |
| **Existing Controls** | - Daily automated backups (Azure)<br>- 30-day backup retention<br>- Point-in-time recovery (PITR)<br>- Azure Private Link (network isolation)<br>- Principle of least privilege |
| **Likelihood** | 2 (Low) - Industry trend upward, but strong isolation |
| **Impact** | 4 (High) - Service outage 4-24 hours, potential data loss, member disruption |
| **Inherent Risk** | **8 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Immutable backup storage (Azure Backup Vault)<br>- Quarterly backup restoration drills<br>- Implement geo-redundant backups<br>- Deploy EDR on application servers<br>- Ransomware-specific detection rules<br>- Air-gapped backup strategy |
| **Residual Risk** | **4 (LOW)** - Likelihood reduced to 1 (Very Low) |
| **Owner** | CTO |
| **Priority** | P2 (30-90 days) |

---

#### RISK-2026-005: Privileged User Abuse (Insider Threat)

| Attribute | Value |
|-----------|-------|
| **Category** | Access Control / Human Resources |
| **Description** | Employee or contractor with privileged access (Admin, Super Admin, System roles) abuses access to steal data, sabotage systems, or cause unauthorized changes. |
| **Threat** | Malicious insider, disgruntled employee, compromised privileged account |
| **Vulnerability** | 26 RBAC roles with varying privilege, production access for operations team, limited privileged access monitoring |
| **Asset** | Member PII, financial data, system configuration, source code |
| **Existing Controls** | - RBAC with least privilege principle<br>- Audit logging of all API actions<br>- Background checks for employees<br>- Code review for all changes<br>- Separation of duties |
| **Likelihood** | 2 (Low) - Rare but high-impact events |
| **Impact** | 4 (High) - Data theft, system sabotage, compliance violations |
| **Inherent Risk** | **8 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Implement Privileged Access Management (PAM) solution<br>- Just-in-time (JIT) privileged access<br>- Enhanced monitoring for privileged actions<br>- Mandatory two-person rule for critical operations<br>- Annual background re-checks<br>- User Behavior Analytics (UBA) |
| **Residual Risk** | **4 (LOW)** - Likelihood reduced to 1 (Very Low) |
| **Owner** | CISO |
| **Priority** | P2 (30-90 days) |

---

#### RISK-2026-006: Supply Chain Attack via Third-Party Dependency

| Attribute | Value |
|-----------|-------|
| **Category** | Third-Party / Software Supply Chain |
| **Description** | Compromise of npm package, GitHub Action, or other software dependency injects malicious code into Union Eyes application, leading to backdoor access or data exfiltration. |
| **Threat** | Nation-state attacker, cybercriminals, compromised maintainer account |
| **Vulnerability** | 200+ npm dependencies, automated dependency updates, GitHub Actions from third parties |
| **Asset** | Source code integrity, production systems, member data |
| **Existing Controls** | - Dependabot automated scanning<br>- npm audit on every build<br>- Package-lock pinning<br>- Code review for dependency updates<br>- GitHub Actions from verified publishers |
| **Likelihood** | 3 (Medium) - Increasing industry trend (Log4Shell, SolarWinds) |
| **Impact** | 4 (High) - Backdoor access, data theft, supply chain compromise |
| **Inherent Risk** | **12 (HIGH)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Implement Software Bill of Materials (SBOM)<br>- Snyk or Sonatype for deep dependency scanning<br>- Package provenance verification<br>- Private npm registry with vetted packages<br>- Restrict GitHub Actions to explicit allow-list<br>- Runtime Application Self-Protection (RASP) |
| **Residual Risk** | **6 (MEDIUM)** - Likelihood reduced to 2 (Low) |
| **Owner** | CTO |
| **Priority** | P1 (0-30 days) |

---

#### RISK-2026-007: DDoS Attack on Platform

| Attribute | Value |
|-----------|-------|
| **Category** | Availability / Network Security |
| **Description** | Distributed Denial-of-Service (DDoS) attack overwhelms Vercel infrastructure or application resources, causing service unavailability for union members. |
| **Threat** | Hacktivists, competitors, extortion attempt, nation-state |
| **Vulnerability** | Public-facing web application, API endpoints, DNS infrastructure |
| **Asset** | Platform availability, reputation, union operations |
| **Existing Controls** | - Vercel Edge Network with built-in DDoS protection<br>- Cloudflare DNS with DDoS mitigation<br>- API rate limiting (per user, per endpoint)<br>- Geographic traffic distribution |
| **Likelihood** | 3 (Medium) - Common attack type, publically accessible service |
| **Impact** | 3 (Medium) - Service degradation 1-4 hours (Vercel typically handles) |
| **Inherent Risk** | **9 (MEDIUM)** |
| **Treatment Strategy** | Mitigate + Transfer |
| **Planned Controls** | - Enhanced API rate limiting (adaptive throttling)<br>- Implement WAF (Web Application Firewall)<br>- Bot detection and CAPTCHA for suspicious traffic<br>- DDoS response playbook<br>- Cyber insurance with DDoS coverage |
| **Residual Risk** | **4 (LOW)** - Impact reduced to 2 (Low) |
| **Owner** | CTO |
| **Priority** | P2 (30-90 days) |

---

#### RISK-2026-008: API Security Vulnerabilities (BOLA, Mass Assignment, Injection)

| Attribute | Value |
|-----------|-------|
| **Category** | Application Security / API Security |
| **Description** | API vulnerabilities such as Broken Object Level Authorization (BOLA), mass assignment, or injection flaws allow unauthorized access or manipulation of data. |
| **Threat** | External attacker, automated scanners, script kiddies |
| **Vulnerability** | 373 API endpoints, complex authorization logic, rapid feature development |
| **Asset** | Member data, financial records, all database tables, API infrastructure |
| **Existing Controls** | - RBAC authorization on all endpoints<br>- Input validation and sanitization<br>- Parameterized queries (ORM)<br>- API testing in CI/CD<br>- Code review process |
| **Likelihood** | 3 (Medium) - Large API surface, complexity introduces risk |
| **Impact** | 4 (High) - Unauthorized data access, data manipulation, compliance breach |
| **Inherent Risk** | **12 (HIGH)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Implement API security testing (OWASP API Top 10)<br>- Deploy API gateway with advanced authorization<br>- Automated BOLA detection testing<br>- API schema validation (OpenAPI/Swagger)<br>- Security training on API vulnerabilities<br>- Annual penetration testing (API focus) |
| **Residual Risk** | **6 (MEDIUM)** - Likelihood reduced to 2 (Low) |
| **Owner** | CTO |
| **Priority** | P1 (0-30 days) |

---

### 9.2 Medium Risks

#### RISK-2026-009: Stripe Payment Integration Compromise

| Attribute | Value |
|-----------|-------|
| **Category** | Third-Party / Payment Security |
| **Description** | Stripe API key compromise or integration vulnerability leads to unauthorized payment processing or financial data exposure. |
| **Threat** | Stolen API keys, integration misconfiguration, Stripe API vulnerability |
| **Vulnerability** | API keys in environment variables, webhook validation |
| **Asset** | Payment processing, union financial data, member payment methods |
| **Existing Controls** | - Stripe API keys in encrypted secrets<br>- Webhook signature verification<br>- PCI DSS SAQ-A compliance (no card data storage)<br>- Stripe security best practices |
| **Likelihood** | 2 (Low) - Good security practices, no card data storage |
| **Impact** | 3 (Medium) - Financial loss, payment disruption, limited exposure (Stripe handles PCI) |
| **Inherent Risk** | **6 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Quarterly API key rotation<br>- Restrict Stripe API key permissions (principle of least privilege)<br>- Implement anomaly detection for payment patterns<br>- Enhanced audit logging for payment events |
| **Residual Risk** | **3 (LOW)** |
| **Owner** | CFO / CTO |
| **Priority** | P2 (30-90 days) |

---

#### RISK-2026-010: Data Loss Due to Accidental Deletion

| Attribute | Value |
|-----------|-------|
| **Category** | Data Integrity / Human Error |
| **Description** | Administrator or developer accidentally deletes production data through application UI, database access, or automation script. |
| **Threat** | Human error, misconfigured automation, testing in production |
| **Vulnerability** | Product access to production, insufficient soft-delete implementation |
| **Asset** | Member records, financial data, operational data |
| **Existing Controls** | - Soft delete for critical tables<br>- Daily automated backups<br>- Point-in-time recovery (7 days)<br>- Confirmation prompts for delete operations |
| **Likelihood** | 2 (Low) - Human error is inevitable but controls limit |
| **Impact** | 3 (Medium) - Data loss, recovery time, member disruption |
| **Inherent Risk** | **6 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Extend soft-delete to all tables<br>- Implement "restore" functionality in admin UI<br>- Production environment restrictions (no direct DB access)<br>- Mandatory approval workflow for bulk deletes |
| **Residual Risk** | **3 (LOW)** |
| **Owner** | CTO |
| **Priority** | P3 (90-180 days) |

---

#### RISK-2026-011: Inadequate Incident Response Capability

| Attribute | Value |
|-----------|-------|
| **Category** | Security Operations / Incident Management |
| **Description** | Lack of mature incident response capability leads to delayed detection, inadequate containment, and prolonged recovery from security incidents. |
| **Threat** | Any security incident (breach, outage, attack) |
| **Vulnerability** | Small security team, limited 24/7 coverage, untested incident response plan |
| **Asset** | All assets (incident response is cross-cutting) |
| **Existing Controls** | - Incident response plan documented<br>- Monitoring and alerting in place<br>- Defined escalation procedures<br>- Cyber insurance for incident response support |
| **Likelihood** | 3 (Medium) - Incidents will occur, response capability is key |
| **Impact** | 3 (Medium) - Delayed response amplifies impact of incidents |
| **Inherent Risk** | **9 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Tabletop exercises (quarterly)<br>- Incident response retainer with third-party (e.g., Mandiant)<br>- Security Information and Event Management (SIEM) implementation<br>- 24/7 on-call rotation<br>- Incident response playbooks (by scenario) |
| **Residual Risk** | **6 (MEDIUM)** |
| **Owner** | CISO |
| **Priority** | P2 (30-90 days) |

---

#### RISK-2026-012: Session Hijacking or Fixation

| Attribute | Value |
|-----------|-------|
| **Category** | Authentication / Session Management |
| **Description** | Attacker steals or fixes user session tokens, gaining unauthorized access to user accounts without credential compromise. |
| **Threat** | Man-in-the-middle, XSS, stolen cookies, compromised device |
| **Vulnerability** | Session token storage, session timeout policies, token rotation |
| **Asset** | User sessions, account access, member data accessible via account |
| **Existing Controls** | - Clerk session management<br>- HTTPOnly cookies<br>- Secure flag on cookies<br>- TLS 1.3 for all connections<br>- 24-hour session timeout |
| **Likelihood** | 2 (Low) - Strong controls but residual risk |
| **Impact** | 3 (Medium) - Unauthorized account access, limited scope per session |
| **Inherent Risk** | **6 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Implement device fingerprinting<br>- Bind sessions to IP address (optional, may impact mobile)<br>- Suspicious activity detection (impossible travel)<br>- Forced re-authentication for sensitive operations |
| **Residual Risk** | **3 (LOW)** |
| **Owner** | CTO |
| **Priority** | P3 (90-180 days) |

---

#### RISK-2026-013: Insufficient Security Awareness and Training

| Attribute | Value |
|-----------|-------|
| **Category** | Human Resources / Security Culture |
| **Description** | Employees and contractors lack adequate security awareness, leading to phishing success, poor security practices, and increased human-error risks. |
| **Threat** | Phishing, social engineering, insider negligence |
| **Vulnerability** | Limited formal security training, no phishing simulations, awareness not measured |
| **Asset** | Credentials, sensitive data, system access, reputation |
| **Existing Controls** | - Onboarding security orientation<br>- Security policies documented and accessible<br>- Ad-hoc security reminders |
| **Likelihood** | 3 (Medium) - Human factor is consistently exploited |
| **Impact** | 3 (Medium) - Credential compromise, data leakage, compliance issues |
| **Inherent Risk** | **9 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Annual mandatory security awareness training<br>- Quarterly phishing simulation exercises<br>- Security champions program<br>- Security updates in monthly all-hands<br>- Metrics tracking (training completion, phishing click rates) |
| **Residual Risk** | **4 (LOW)** |
| **Owner** | CISO / HR |
| **Priority** | P2 (30-90 days) |

---

#### RISK-2026-014: Inadequate Vendor Security Assessments

| Attribute | Value |
|-----------|-------|
| **Category** | Third-Party / Vendor Management |
| **Description** | Third-party vendors (beyond critical Clerk, Stripe, Azure, Vercel) are not adequately assessed for security practices, potentially introducing risks. |
| **Threat** | Vendor compromise, data sharing violations, compliance gaps |
| **Vulnerability** | No formal vendor security assessment process, limited ongoing monitoring |
| **Asset** | Data shared with vendors, integrated systems, vendor access to systems |
| **Existing Controls** | - Contracts with confidentiality clauses<br>- Due diligence on critical vendors (Clerk, Stripe)<br>- Limited data sharing |
| **Likelihood** | 2 (Low) - Limited vendor ecosystem, but increasing |
| **Impact** | 3 (Medium) - Data breach via vendor, compliance violations |
| **Inherent Risk** | **6 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Vendor security assessment questionnaire (VSAQ)<br>- Risk-based vendor tiering (critical, high, medium, low)<br>- Annual security reviews for high-risk vendors<br>- SOC 2 / ISO 27001 certification requirements in contracts<br>- Vendor risk register |
| **Residual Risk** | **3 (LOW)** |
| **Owner** | CISO / Procurement |
| **Priority** | P3 (90-180 days) |

---

#### RISK-2026-015: Cryptographic Implementation Weaknesses

| Attribute | Value |
|-----------|-------|
| **Category** | Cryptography / Technical Security |
| **Description** | Improper use of cryptography (weak algorithms, poor key management, implementation flaws) weakens data protection controls. |
| **Threat** | Cryptographic attacks, algorithm weaknesses, key compromise |
| **Vulnerability** | Custom cryptographic code, outdated libraries, key management practices |
| **Asset** | Encrypted data (PII, financial), authentication tokens, communication channels |
| **Existing Controls** | - TLS 1.3 for data in transit<br>- Azure-managed encryption at rest (AES-256)<br>- Bcrypt for password hashing (Clerk-managed)<br>- Standard libraries for crypto operations |
| **Likelihood** | 2 (Low) - Following best practices, using managed services |
| **Impact** | 3 (Medium) - Encrypted data exposure, authentication bypass |
| **Inherent Risk** | **6 (MEDIUM)** |
| **Treatment Strategy** | Mitigate |
| **Planned Controls** | - Cryptographic code review by security expert<br>- Eliminate custom crypto implementations<br>- Centralized key management (Azure Key Vault)<br>- Automated scanning for weak crypto usage<br>- Regular crypto library updates |
| **Residual Risk** | **2 (VERY LOW)** |
| **Owner** | CTO |
| **Priority** | P3 (90-180 days) |

---

### 9.3 Low Risks (Summary)

| Risk ID | Risk Title | Inherent Risk | Residual Risk | Treatment |
|---------|-----------|---------------|---------------|-----------|
| RISK-2026-016 | Outdated Dependencies with Moderate Vulnerabilities | 4 (LOW) | 2 (VERY LOW) | Mitigate (Automated patching) |
| RISK-2026-017 | Insufficient Code Comments and Documentation | 3 (LOW) | 2 (VERY LOW) | Mitigate (Documentation standards) |
| RISK-2026-018 | Minor UI/UX Security Indicators Missing | 3 (LOW) | 2 (VERY LOW) | Mitigate (UI security enhancements) |
| RISK-2026-019 | Limited Password Complexity Enforcement (Clerk-Managed) | 4 (LOW) | 2 (VERY LOW) | Accept (Clerk handles, MFA enforced) |
| RISK-2026-020 | Timezone Handling Vulnerabilities | 3 (LOW) | 2 (VERY LOW) | Mitigate (UTC standardization) |

---

## 10. Risk Treatment Plans

### 10.1 Treatment Plan Template

```markdown
# Risk Treatment Plan: [Risk ID] - [Risk Title]

**Risk Owner:** [Name, Title]
**Treatment Owner:** [Name, Title]
**Treatment Strategy:** Mitigate / Avoid / Transfer / Accept
**Priority:** P0 / P1 / P2 / P3
**Target Completion:** [Date]

## 1. Risk Summary
- **Current Risk Level:** [CRITICAL/HIGH/MEDIUM/LOW]
- **Current Risk Score:** [1-25]
- **Target Risk Level:** [MEDIUM/LOW/VERY LOW]
- **Target Risk Score:** [1-25]

## 2. Treatment Objectives
- Reduce likelihood from [X] to [Y]
- Reduce impact from [X] to [Y]
- Meet compliance requirement: [ISO 27001 control, PIPEDA, etc.]

## 3. Treatment Actions

### Control 1: [Control Name]
- **Type:** Preventive / Detective / Corrective
- **ISO 27001 Mapping:** A.X.XX
- **Description:** [Detailed description]
- **Implementation Steps:**
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Responsible:** [Name]
- **Timeline:** [Dates]
- **Resources:** [Budget, tools, personnel]

### Control 2: [Control Name]
[Same structure as Control 1]

## 4. Implementation Schedule

| Milestone | Description | Owner | Due Date | Status |
|-----------|-------------|-------|----------|--------|
| M1 | [Milestone 1] | [Name] | [Date] | Not Started |
| M2 | [Milestone 2] | [Name] | [Date] | Not Started |

## 5. Success Metrics
- **KPI 1:** [e.g., Zero tenant isolation failures in 90 days]
- **KPI 2:** [e.g., 100% RLS test coverage]
- **KPI 3:** [e.g., Penetration test pass rate >95%]

## 6. Residual Risk
- **Residual Likelihood:** [1-5]
- **Residual Impact:** [1-5]
- **Residual Risk Score:** [1-25]
- **Residual Risk Level:** [MEDIUM/LOW/VERY LOW]
- **Acceptance Authority:** [Executive role]

## 7. Monitoring and Review
- **Control Effectiveness Metrics:** [How to measure control is working]
- **Review Frequency:** [Monthly, Quarterly, Annually]
- **Escalation Criteria:** [When to escalate to management]

## 8. Dependencies and Constraints
- **Dependency 1:** [e.g., Budget approval required]
- **Dependency 2:** [e.g., Third-party tool procurement]
- **Constraint 1:** [e.g., Limited engineering resources]

## 9. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Risk Owner | | | |
| Treatment Owner | | | |
| CISO | | | |
| Executive Sponsor | | | |
```

---

### 10.2 Sample Treatment Plan: RISK-2026-001 (Multi-Tenant Data Isolation Failure)

# Risk Treatment Plan: RISK-2026-001 - Multi-Tenant Data Isolation Failure

**Risk Owner:** CTO  
**Treatment Owner:** Senior Backend Engineer  
**Treatment Strategy:** Mitigate  
**Priority:** P1 (0-30 days)  
**Target Completion:** March 15, 2026

## 1. Risk Summary
- **Current Risk Level:** HIGH
- **Current Risk Score:** 10 (Likelihood: 2, Impact: 5)
- **Target Risk Level:** MEDIUM (Acceptable with oversight)
- **Target Risk Score:** 5 (Likelihood: 1, Impact: 5)

## 2. Treatment Objectives
- Reduce likelihood of tenant isolation failure from 2 (Low) to 1 (Very Low)
- Maintain impact at 5 (Critical) - inherent to multi-tenancy
- Achieve 100% RLS policy coverage with validation
- Pass third-party penetration test with zero tenant isolation findings

## 3. Treatment Actions

### Control 1: Automated RLS Policy Validation Framework
- **Type:** Detective / Preventive
- **ISO 27001 Mapping:** A.8.3 (Technical vulnerability management), A.14.2.8 (System security testing)
- **Description:** Develop automated testing framework that validates RLS policies on every table, ensuring no queries can bypass tenant isolation.
- **Implementation Steps:**
  1. Audit all 200+ tables to confirm RLS policy existence
  2. Develop automated test suite using Vitest with multi-tenant test data
  3. Create test scenarios for each table: cross-tenant SELECT, INSERT, UPDATE, DELETE
  4. Integrate tests into CI/CD pipeline (mandatory passing for deployment)
  5. Document any exceptions (if tables are deliberately shared)
- **Responsible:** Senior Backend Engineer
- **Timeline:** Feb 13 - Feb 28, 2026
- **Resources:** 40 engineering hours, Vitest framework (existing)

### Control 2: Chaos Engineering for Tenant Isolation
- **Type:** Detective
- **ISO 27001 Mapping:** A.8.8 (Technical vulnerability management)
- **Description:** Implement chaos engineering tests that deliberately attempt to bypass tenant isolation through complex query patterns, edge cases, and adversarial inputs.
- **Implementation Steps:**
  1. Define chaos scenarios (complex JOINs, nested queries, UNION operations, etc.)
  2. Develop automated chaos test suite targeting tenant boundaries
  3. Run chaos tests weekly in staging environment
  4. Log and review all chaos test results
  5. Remediate any identified weaknesses
- **Responsible:** Security Engineer
- **Timeline:** Mar 1 - Mar 10, 2026
- **Resources:** 30 engineering hours, staging environment

### Control 3: Third-Party Penetration Testing (Tenant Isolation Focus)
- **Type:** Detective
- **ISO 27001 Mapping:** A.8.8 (Technical vulnerability management)
- **Description:** Engage external penetration testing firm to specifically test multi-tenant isolation, attempting to access other tenants' data through all attack vectors.
- **Implementation Steps:**
  1. Issue RFP for penetration testing services (CREST or OSCP certified)
  2. Define scope: all 373 API endpoints, database layer, authentication
  3. Provide test accounts for multiple mock tenants
  4. Review findings and prioritize remediation
  5. Re-test after remediation
- **Responsible:** CISO (procurement), CTO (coordination)
- **Timeline:** Mar 1 - Mar 31, 2026 (ongoing beyond treatment period)
- **Resources:** $15,000 - $25,000 budget

### Control 4: Tenant Isolation Smoke Tests in CI/CD
- **Type:** Preventive / Detective
- **ISO 27001 Mapping:** A.8.32 (Change management)
- **Description:** Add mandatory smoke tests to CI/CD pipeline that run a subset of critical tenant isolation tests on every deployment, blocking release if failures detected.
- **Implementation Steps:**
  1. Identify top 20 critical tenant isolation scenarios
  2. Develop fast-running smoke test suite (<5 minutes)
  3. Integrate into GitHub Actions CI/CD workflow
  4. Configure deployment blocker on test failure
  5. Set up alerts for test failures
- **Responsible:** DevOps Engineer
- **Timeline:** Feb 15 - Feb 25, 2026
- **Resources:** 20 engineering hours

## 4. Implementation Schedule

| Milestone | Description | Owner | Due Date | Status |
|-----------|-------------|-------|----------|--------|
| M1 | RLS audit complete (all 200+ tables) | Backend Eng | Feb 18 | Not Started |
| M2 | Automated RLS validation suite deployed | Backend Eng | Feb 28 | Not Started |
| M3 | CI/CD smoke tests integrated | DevOps Eng | Feb 25 | Not Started |
| M4 | Chaos engineering framework operational | Security Eng | Mar 10 | Not Started |
| M5 | Penetration test completed | CISO | Mar 31 | Not Started |

## 5. Success Metrics
- **KPI 1:** 100% of tables have validated RLS policies (target: 200/200 tables)
- **KPI 2:** Zero tenant isolation failures detected in chaos tests (90-day period)
- **KPI 3:** Zero CRITICAL or HIGH tenant isolation findings in penetration test
- **KPI 4:** 100% CI/CD smoke test pass rate (no blocked deployments due to test failures)

## 6. Residual Risk
- **Residual Likelihood:** 1 (Very Low) - Comprehensive testing and monitoring reduce probability
- **Residual Impact:** 5 (Critical) - Inherent to multi-tenancy; impact remains catastrophic if occurs
- **Residual Risk Score:** 5 (MEDIUM)
- **Residual Risk Level:** MEDIUM (Within acceptable range with continuous monitoring)
- **Acceptance Authority:** CTO, CEO

**Residual Risk Statement:** After implementation of all controls, the likelihood of tenant isolation failure is reduced to Very Low (1), resulting in a residual risk level of MEDIUM (5). This is acceptable given the comprehensive defense-in-depth approach and continuous monitoring. Executive management acknowledges that multi-tenancy inherently carries critical impact risk, but the business model requires this architecture.

## 7. Monitoring and Review
- **Control Effectiveness Metrics:**
  - RLS validation test pass rate (Target: 100%)
  - Number of tenant isolation violations detected (Target: 0)
  - Chaos test coverage (Target: 200+ tables)
  - Penetration test findings (Target: 0 CRITICAL/HIGH)
- **Review Frequency:** Quarterly
- **Escalation Criteria:**
  - Any tenant isolation failure detected in production → Immediate executive escalation
  - Penetration test identifies CRITICAL finding → 24-hour executive notification
  - RLS test coverage drops below 95% → CTO notification

## 8. Dependencies and Constraints
- **Dependency 1:** Budget approval for penetration testing ($15K-$25K) - **Approved Feb 12**
- **Dependency 2:** Availability of external penetration testing firm (4-6 week lead time)
- **Dependency 3:** Engineering sprint capacity (90 hours total across team)
- **Constraint 1:** Must maintain development velocity; cannot dedicate full team to this single risk

## 9. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Risk Owner | [CTO Name] | _______________ | __________ |
| Treatment Owner | [Senior Backend Engineer Name] | _______________ | __________ |
| CISO | [CISO Name] | _______________ | __________ |
| Executive Sponsor | [CEO Name] | _______________ | __________ |

---

### 10.3 Additional Treatment Plans

**Note:** Full treatment plans following the above template should be developed for all HIGH and CRITICAL risks. The following provides abbreviated treatment summaries for remaining high-priority risks:

#### RISK-2026-002: Clerk SPOF

**Key Controls:**
- Extended session token grace period (12 hours)
- Read-only emergency mode implementation
- Enhanced contractual SLAs with Clerk
- Disaster recovery runbook for Clerk outage scenarios

**Timeline:** 0-30 days  
**Budget:** $10,000 (engineering time + infrastructure)

#### RISK-2026-003: Database Breach

**Key Controls:**
- Azure Defender for SQL deployment
- Database activity monitoring
- Quarterly credential rotation
- Enhanced firewall rules and IP allow-listing

**Timeline:** 0-30 days  
**Budget:** $5,000/year (Azure Defender)

#### RISK-2026-006: Supply Chain Attack

**Key Controls:**
- Software Bill of Materials (SBOM) generation
- Snyk/Sonatype advanced scanning
- Private npm registry with vetted packages
- GitHub Actions allow-listing

**Timeline:** 0-30 days  
**Budget:** $8,000/year (Snyk Professional)

#### RISK-2026-008: API Security Vulnerabilities

**Key Controls:**
- OWASP API Top 10 automated testing
- API gateway with advanced authorization
- Annual penetration testing (API focus)
- Schema validation (OpenAPI/Swagger)

**Timeline:** 0-30 days  
**Budget:** $20,000 (penetration test + tooling)

---

## 11. Risk Monitoring and Review

### 11.1 Continuous Monitoring

#### 11.1.1 Risk Indicators and Metrics

Union Eyes tracks Key Risk Indicators (KRIs) to provide early warning of changing risk levels:

| Risk Category | KRI | Target Threshold | Alert Level |
|---------------|-----|------------------|-------------|
| **Multi-Tenancy** | Tenant isolation test failures | 0 failures/month | Yellow: 1, Red: 2+ |
| **Authentication** | Clerk uptime | >99.9% | Yellow: 99.5%, Red: <99% |
| **Database Security** | Unauthorized access attempts | <10/month | Yellow: 10-50, Red: >50 |
| **API Security** | Failed authorization attempts | <100/day | Yellow: 100-500, Red: >500 |
| **Third-Party** | Critical vulnerabilities in dependencies | 0 open >7 days | Yellow: 1-2, Red: 3+ |
| **Availability** | Platform uptime | >99.9% | Yellow: 99.5%, Red: <99% |
| **Incident Response** | Mean time to detect (MTTD) | <1 hour | Yellow: 1-4h, Red: >4h |
| **Incident Response** | Mean time to respond (MTTR) | <4 hours | Yellow: 4-8h, Red: >8h |

#### 11.1.2 Automated Monitoring Tools

- **Security Information and Event Management (SIEM)**: Aggregate logs from all sources, detect anomalies
- **Vulnerability Scanning**: Continuous infrastructure and application scanning
- **Dependency Monitoring**: Real-time alerts for new CVEs in dependencies (Dependabot, Snyk)
- **API Monitoring**: Track API error rates, latency, authorization failures
- **Database Activity Monitoring**: Azure SQL Auditing for suspicious queries
- **Third-Party Status Monitoring**: Uptime tracking for Clerk, Stripe, Azure, Vercel

### 11.2 Periodic Risk Reviews

#### 11.2.1 Monthly Security Review

**Attendees:** CISO, CTO, Security Engineer, DevOps Lead  
**Duration:** 60 minutes

**Agenda:**
1. Review KRIs: identify trends and anomalies
2. In-treatment risks: status updates from treatment owners
3. New vulnerabilities: triage and prioritize
4. Incident review: any security events or near-misses
5. Action items: assign follow-ups

**Output:** Monthly Security Status Report

#### 11.2.2 Quarterly Risk Register Review

**Attendees:** CISO, CTO, CFO, CEO, Risk Committee (if applicable)  
**Duration:** 90-120 minutes

**Agenda:**
1. Risk register walk-through: review all open risks
2. Risk level changes: identify risks with changed likelihood/impact
3. Treatment progress: review milestone completion
4. New risks: add newly identified risks
5. Closed risks: formally close treated risks meeting acceptance criteria
6. Compliance status: PIPEDA, GDPR, SOC 2, ISO 27001 alignment
7. Budget review: security spending vs. plan

**Output:**
- Updated risk register
- Quarterly Risk Status Report
- Action items for executive management

#### 11.2.3 Annual Comprehensive Risk Assessment

**Timing:** Q1 each year (aligns with ISO 27001 certification cycle)  
**Attendees:** All stakeholders (executive, engineering, operations, compliance)  
**Duration:** 2-3 days (facilitated workshop)

**Process:**
1. **Context Update**: Review organizational changes, new services, regulatory updates
2. **Asset Review**: Update asset inventory (new systems, data, processes)
3. **Threat Landscape**: Review external threat intelligence, industry trends
4. **Full Risk Assessment**: Re-assess all existing risks, identify new risks
5. **Control Effectiveness**: Evaluate implemented controls
6. **Treatment Plan Update**: Revise treatment plans based on current context
7. **Risk Appetite Review**: Confirm or update organizational risk appetite

**Output:**
- Annual Risk Assessment Report
- Updated risk register
- Updated treatment plans
- Recommendations for executive management

### 11.3 Ad-Hoc Risk Assessments

Trigger ad-hoc risk assessments for:

1. **Major System Changes**
   - New product features with significant functionality
   - Architecture changes (e.g., new database, authentication method)
   - Infrastructure migrations

2. **Security Incidents**
   - Any security incident (post-incident review)
   - Near-misses with potential for significant impact

3. **Regulatory Changes**
   - New privacy laws (e.g., provincial privacy legislation)
   - Changes to existing regulations (PIPEDA amendments)

4. **Organizational Changes**
   - Acquisitions or mergers
   - Significant headcount changes
   - Outsourcing arrangements

5. **External Events**
   - Major industry security incidents (e.g., Log4Shell)
   - New threat intelligence (zero-day vulnerabilities)
   - Third-party breaches affecting our vendors

### 11.4 Risk Reporting

#### 11.4.1 Monthly Executive Dashboard

Concise 1-page dashboard for executive management:

- **Risk Heat Map**: Visual representation of risk distribution
- **Top 5 Risks**: Current top risks by priority score
- **Risk Trend**: Overall risk posture trend (improving, stable, deteriorating)
- **Treatment Progress**: % completion of in-progress treatment plans
- **KRI Summary**: Key risk indicators with RAG (Red/Amber/Green) status
- **Action Required**: Any decisions needed from executive management

#### 11.4.2 Quarterly Board Report

Comprehensive report for Board of Directors:

- **Executive Summary**: 1-page overview of risk posture
- **Risk Register Summary**: High and critical risks
- **Significant Changes**: Major risk level changes or new critical risks
- **Compliance Status**: ISO 27001, PIPEDA, GDPR, SOC 2
- **Incident Summary**: Any security incidents or near-misses
- **Budget Status**: Security spending and ROI
- **Strategic Recommendations**: Board-level decisions or investments

#### 11.4.3 Annual Risk Assessment Report

Comprehensive report for certification audit and stakeholder review:

- Full risk assessment methodology and process
- Complete risk register
- Treatment plans for all significant risks
- Control effectiveness evaluation
- Compliance mapping
- Year-over-year risk posture comparison
- Recommendations for next year

###11.5 Risk Register Lifecycle Management

#### 11.5.1 Risk States

| Status | Description | Next Action |
|--------|-------------|-------------|
| **Identified** | New risk logged, awaiting analysis | Conduct risk analysis |
| **Analyzed** | Likelihood and impact assessed | Evaluate and prioritize |
| **Evaluated** | Priority assigned, treatment decision made | Develop treatment plan (if needed) |
| **In Treatment** | Treatment plan in progress | Monitor implementation progress |
| **Monitored** | Treatment complete, residual risk accepted | Continuous monitoring, periodic review |
| **Closed** | Risk no longer applicable or fully mitigated below threshold | Archive, retain for historical reference |

#### 11.5.2 Risk Closure Criteria

A risk can be closed when:

1. **Risk Eliminated**: The threat or vulnerability no longer exists (e.g., legacy system retired)
2. **Residual Risk Below Threshold**: Treatment reduces risk to VERY LOW (1-2) AND executive management accepts
3. **Risk Transferred**: Risk fully transferred to third party with appropriate insurance/contracts
4. **No Longer Relevant**: Organizational or environmental changes make risk obsolete

**Closure Process:**
1. Risk owner proposes closure with justification
2. CISO reviews and approves/rejects
3. Document closure rationale in risk register
4. Archive risk record (retain for audit trail)

---

## 12. Roles and Responsibilities

### 12.1 Risk Management Roles

| Role | Responsibilities | Authority |
|------|-----------------|-----------|
| **Executive Management (CEO, Board)** | - Establish risk appetite and tolerance<br>- Approve significant risk acceptance<br>- Allocate resources for risk treatment<br>- Review quarterly risk reports | - Final approval for risk acceptance<br>- Budget authorization<br>- Strategic direction |
| **Chief Information Security Officer (CISO)** | - Oversee ISMS and risk management process<br>- Facilitate risk assessments<br>- Maintain risk register<br>- Report to executive management<br>- Coordinate incident response | - Approve risk assessment methodology<br>- Approve residual risk acceptance (MEDIUM and below)<br>- Authorize security investments |
| **Chief Technology Officer (CTO)** | - Own technical risks<br>- Approve architectural decisions<br>- Allocate engineering resources<br>- Review and approve treatment plans | - Technical risk acceptance (LOW only)<br>- Engineering resource allocation<br>- Technical control implementation |
| **Chief Financial Officer (CFO)** | - Own financial and payment risks<br>- Budget approval for security<br>- Cyber insurance management<br>- Financial impact assessment | - Financial risk acceptance (LOW only)<br>- Security budget approval<br>- Insurance coverage decisions |
| **Risk Owners** | - Own specific risks in their domain<br>- Ensure risk is accurately assessed<br>- Approve treatment plans<br>- Monitor risk indicators | - Request risk treatment resources<br>- Escalate risk level changes<br>- Accept LOW residual risk in their domain |
| **Treatment Owners** | - Develop treatment plans<br>- Implement controls<br>- Report progress to risk owner<br>- Validate control effectiveness | - Execute approved treatment plans<br>- Escalate implementation issues<br>- Request necessary resources |
| **All Employees** | - Report security concerns and incidents<br>- Follow security policies<br>- Complete security training<br>- Participate in risk assessments | - Stop work if security risk identified<br>- Escalate security concerns |

### 12.2 Risk Committee (Optional)

For organizations with mature risk programs, a Risk Committee may be established:

**Composition:**
- CISO (Chair)
- CTO
- CFO
- Legal Counsel
- Board Representative (optional)

**Responsibilities:**
- Review and challenge risk assessments
- Approve risk treatment plans for HIGH risks
- Escalate CRITICAL risks to Board
- Oversee risk management process effectiveness

**Meeting Frequency:** Quarterly (minimum)

### 12.3 Communication and Escalation

#### 12.3.1 Escalation Thresholds

| Risk Level | Notification | Approval Required |
|-----------|--------------|-------------------|
| **CRITICAL (20-25)** | Immediate: CEO, Board Chair, CISO, CTO | Board of Directors |
| **HIGH (12-19)** | 24 hours: CEO, CISO, CTO, CFO | Executive Management |
| **MEDIUM (6-11)** | Weekly: CISO, CTO, Risk Owner | CISO or Risk Owner |
| **LOW (3-5)** | Monthly: CISO, Risk Owner | Risk Owner |
| **VERY LOW (1-2)** | Quarterly: Risk Owner | Risk Owner |

#### 12.3.2 Incident Escalation

Any security incident triggers immediate risk reassessment:

1. **Incident Detected**: Security team initiates incident response
2. **Immediate Notification**: CISO, CTO, affected Risk Owners (within 1 hour)
3. **Impact Assessment**: Evaluate if incident changes existing risk levels
4. **Executive Briefing**: CEO notification for any MAJOR incident (within 4 hours)
5. **Board Notification**: CRITICAL incidents requiring Board notification (within 24 hours)
6. **Post-Incident Review**: Risk register update within 1 week of incident closure

---

## 13. Appendices

### Appendix A: Risk Assessment Worksheets

#### A.1 Risk Identification Worksheet

```
Risk Identification Workshop

Date: _________________
Facilitator: _________________
Participants: _________________

Asset: ___________________________________
Asset Owner: ___________________________________
Asset Value: $_______________

Threats (What could go wrong?):
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

Vulnerabilities (What weaknesses exist?):
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

Existing Controls:
1. ___________________________________________
2. ___________________________________________ 
3. ___________________________________________

Potential Impact:
[ ] Financial: $____________
[ ] Operational: ____________
[ ] Reputational: ____________
[ ] Legal/Compliance: ____________

Risk Scenario (Narrative):
_________________________________________________
_________________________________________________
_________________________________________________
```

#### A.2 Risk Analysis Worksheet

```
Risk Analysis

Risk ID: _________________
Risk Title: _____________________________________

Likelihood Assessment:
[ ] Very High (5) - >90% probability
[ ] High (4) - 60-90% probability
[ ] Medium (3) - 30-60% probability
[ ] Low (2) - 10-30% probability
[ ] Very Low (1) - <10% probability

Justification: ___________________________________
________________________________________________

Impact Assessment:
[ ] Critical (5) - Catastrophic consequences
[ ] High (4) - Severe consequences
[ ] Medium (3) - Moderate consequences
[ ] Low (2) - Minor consequences
[ ] Very Low (1) - Negligible consequences

Impact Categories:
- Financial: $____________ (Direct + Indirect)
- Operational: ______________________________
- Reputational: _____________________________
- Legal/Compliance: _________________________

Risk Score Calculation:
Likelihood (___) × Impact (___) = Risk Score: ___

Risk Level:
[ ] CRITICAL (20-25)
[ ] HIGH (12-19)
[ ] MEDIUM (6-11)
[ ] LOW (3-5)
[ ] VERY LOW (1-2)
```

---

### Appendix B: Risk Treatment Decision Tree

```
                    Risk Identified
                          │
                          ▼
             ┌────────────────────────┐
             │   Analyze Risk         │
             │   (Likelihood × Impact)│
             └────────────────────────┘
                          │
                          ▼
             ┌────────────────────────┐
             │   Risk Level?          │
             └────────────────────────┘
                    │
         ┌──────────┼──────────┬──────────┐
         │          │          │          │
         ▼          ▼          ▼          ▼
    CRITICAL    HIGH      MEDIUM      LOW/VERY LOW
         │          │          │          │
         │          │          │          ▼
         │          │          │     ┌─────────────┐
         │          │          │     │   Accept    │
         │          │          │     │    Risk?    │
         │          │          │     └─────────────┘
         │          │          │          │
         │          │          │      Yes │ No
         │          │          │          │  │
         │          │          │          │  └─→ Mitigate
         │          │          │          ▼
         │          │          │      [Accept & Monitor]
         │          │          │
         │          │          ▼
         │          │    ┌──────────────────┐
         │          │    │  Cost-Effective  │
         │          │    │  Mitigation      │
         │          │    │  Available?      │
         │          │    └──────────────────┘
         │          │           │
         │          │       Yes │ No
         │          │           │  │
         │          │           │  └─→ Transfer or Accept
         │          │           ▼
         │          │      [Mitigate]
         │          │
         │          ▼
         │    ┌──────────────────┐
         │    │  Can Eliminate   │
         │    │  Risk Source?    │
         │    └──────────────────┘
         │           │
         │       Yes │ No
         │           │  │
         │           │  └─→ Mitigate + Transfer
         │           ▼
         │      [Avoid Risk]
         │
         ▼
  ┌──────────────────┐
  │  Immediate       │
  │  Mitigation +    │
  │  Transfer        │
  └──────────────────┘
         │
         ▼
  [Escalate to Board]
```

---

### Appendix C: ISO 27001:2022 Annex A Control Mapping

**Key Controls Mapped to Union Eyes Risks:**

| ISO 27001 Control | Control Title | Union Eyes Implementation | Mapped Risks |
|-------------------|---------------|---------------------------|--------------|
| **A.5.1** | Policies for information security | ISMS policies documented | All |
| **A.5.7** | Threat intelligence | CVE monitoring, advisories | RISK-006, RISK-008 |
| **A.5.23** | Information security for use of cloud services | Azure, Vercel security reviews | RISK-002, RISK-003 |
| **A.8.1** | User endpoint devices | Laptop security, MFA | RISK-005, RISK-012 |
| **A.8.2** | Privileged access rights | 26 RBAC roles, least privilege | RISK-001, RISK-005 |
| **A.8.3** | Information access restriction | RLS policies, API authorization | RISK-001, RISK-008 |
| **A.8.8** | Management of technical vulnerabilities | Dependabot, Snyk, patching | RISK-006, RISK-008 |
| **A.8.9** | Configuration management | Infrastructure as Code, reviews | RISK-003, RISK-007 |
| **A.8.10** | Information deletion | Soft delete, retention policies | RISK-010 |
| **A.8.12** | Data leakage prevention | RLS, encryption, monitoring | RISK-001, RISK-003 |
| **A.8.13** | Information backup | Daily Azure backups, PITR | RISK-004, RISK-010 |
| **A.8.15** | Logging | Comprehensive audit logs | All |
| **A.8.16** | Monitoring activities | SIEM, alerting, KRIs | All |
| **A.8.20** | Networks security | Vercel Edge, Azure Private Link | RISK-003, RISK-007 |
| **A.8.23** | Web filtering | Vercel edge filtering | RISK-007 |
| **A.8.24** | Use of cryptography | TLS 1.3, AES-256, Bcrypt | RISK-003, RISK-015 |
| **A.8.26** | Application security requirements | Secure SDLC, code review | RISK-008 |
| **A.8.28** | Secure coding | OWASP, code review, SAST | RISK-001, RISK-008 |
| **A.8.32** | Change management | CI/CD, testing, approvals | All |

---

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **ALE** | Annual Loss Expectancy - Expected annual financial loss from a risk |
| **ARO** | Annualized Rate of Occurrence - Expected frequency of risk event per year |
| **BOLA** | Broken Object Level Authorization - API vulnerability allowing unauthorized access to objects |
| **CISO** | Chief Information Security Officer |
| **CTO** | Chief Technology Officer |
| **CVE** | Common Vulnerabilities and Exposures - Public database of security vulnerabilities |
| **DAST** | Dynamic Application Security Testing - Testing running applications for vulnerabilities |
| **EDR** | Endpoint Detection and Response - Security solution for endpoint protection |
| **FAIR** | Factor Analysis of Information Risk - Quantitative risk analysis methodology |
| **GDPR** | General Data Protection Regulation - EU privacy regulation |
| **Inherent Risk** | Risk level before treatment (existing controls only) |
| **ISMS** | Information Security Management System |
| **ISO 27001** | International standard for information security management |
| **ISO 27005** | International standard for information security risk management |
| **KPI** | Key Performance Indicator |
| **KRI** | Key Risk Indicator - Metric providing early warning of risk level changes |
| **MTTR** | Mean Time To Respond - Average time to respond to security incidents |
| **MTTD** | Mean Time To Detect - Average time to detect security incidents |
| **PAM** | Privileged Access Management - System for controlling privileged account access |
| **PII** | Personally Identifiable Information |
| **PIPEDA** | Personal Information Protection and Electronic Documents Act (Canada) |
| **RASP** | Runtime Application Self-Protection - Application security technology |
| **RBAC** | Role-Based Access Control |
| **Residual Risk** | Risk level after treatment implementation |
| **RLS** | Row-Level Security - Database security feature for multi-tenant isolation |
| **SBOM** | Software Bill of Materials - Inventory of software components |
| **SIEM** | Security Information and Event Management - Log aggregation and analysis |
| **SLE** | Single Loss Expectancy - Expected loss from a single risk event |
| **SOC 2** | Service Organization Control 2 - Audit standard for service providers |
| **WAF** | Web Application Firewall |

---

### Appendix E: References

1. **ISO/IEC 27001:2022** - Information security, cybersecurity and privacy protection — Information security management systems — Requirements

2. **ISO/IEC 27002:2022** - Information security, cybersecurity and privacy protection — Information security controls

3. **ISO/IEC 27005:2022** - Information security, cybersecurity and privacy protection — Guidance on managing information security risks

4. **ISO 31000:2018** - Risk management — Guidelines

5. **NIST SP 800-30 Rev. 1** - Guide for Conducting Risk Assessments

6. **NIST Cybersecurity Framework (CSF)** - Framework for Improving Critical Infrastructure Cybersecurity

7. **OWASP Top 10** - Top 10 Web Application Security Risks

8. **OWASP API Security Top 10** - Top 10 API Security Risks

9. **ENISA Threat Landscape** - European Union Agency for Cybersecurity threat reports

10. **FAIR Institute** - Factor Analysis of Information Risk methodology

---

## Document Approval

This Risk Assessment and Treatment Methodology is approved by:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Chief Information Security Officer (CISO)** | | _______________ | __________ |
| **Chief Technology Officer (CTO)** | | _______________ | __________ |
| **Chief Executive Officer (CEO)** | | _______________ | __________ |
| **Board Chair** (for critical risks) | | _______________ | __________ |

---

## Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 0.1 | 2026-01-15 | CISO | Initial draft |
| 0.2 | 2026-01-28 | CISO | Incorporated feedback from executive review |
| 1.0 | 2026-02-12 | CISO | **APPROVED VERSION** - Production release |

---

**Next Scheduled Review:** August 12, 2026

**Document Classification:** Internal  
**Distribution:** Executive Management, ISMS Stakeholders, Risk Owners, ISO 27001 Auditors

---

*This document is a controlled document under the Union Eyes ISMS. Any modifications must be approved by the CISO and documented in the revision history.*
