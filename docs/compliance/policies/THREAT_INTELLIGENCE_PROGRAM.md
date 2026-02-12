# Threat Intelligence Program

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Security Team  
**Review Schedule:** Quarterly  
**ISO 27001 Control:** A.5.7

## 1. Purpose

This program establishes processes for collecting, analyzing, and acting on cybersecurity threat intelligence to proactively defend Union Eyes systems and data.

## 2. Threat Intelligence Sources

### 2.1 Government and Industry Sources

**CISA (Cybersecurity and Infrastructure Security Agency):**
- Subscribe to alert mailing list: https://www.cisa.gov/subscribe-updates-cisa
- Monitor ICS advisories and known exploited vulnerabilities
- Review weekly briefings

**Canadian Centre for Cyber Security (CCCS):**
- Subscribe to alerts: https://cyber.gc.ca/en/alerts-advisories
- Monitor advisories specific to critical infrastructure
- Review threat bulletins

**CVE (Common Vulnerabilities and Exposures):**
- Monitor CVE feeds for technologies in use (PostgreSQL, Next.js, Azure, etc.)
- Subscribe to NVD (National Vulnerability Database) updates
- Use GitHub Dependabot for dependency vulnerabilities

**OWASP:**
- Monitor OWASP Top 10 updates
- Review OWASP threat modeling guidance
- Participate in OWASP mailing lists

### 2.2 Vendor Security Bulletins

- **Clerk:** Security advisories (auto-subscribed)
- **Stripe:** Security changelog monitoring
- **Azure:** Azure Security Center alerts, Service Health notifications
- **Vercel:** Security and changelog monitoring
- **GitHub:** GitHub Security Advisories
- **PostgreSQL:** PostgreSQL Security mailing list

### 2.3 Commercial Threat Intelligence (Future)

- Recorded Future (under evaluation)
- CrowdStrike Threat Intelligence (under evaluation)
- MISP (Malware Information Sharing Platform) - open-source

### 2.4 Security Communities

- Reddit: r/netsec, r/cybersecurity
- Twitter/X: Follow key security researchers
- Security conferences: DEF CON, Black Hat, RSA (recordings)
- Local: SecTor (Toronto), NorthSec (Montreal)

## 3. Threat Intelligence Process

### 3.1 Collection

**Daily Tasks:**
- Review CISA/CCCS alerts (automated via RSS/email)
- Check vendor security bulletins
- Review Dependabot alerts (GitHub)
- Monitor Sentry error patterns for anomalies

**Weekly Tasks:**
- Review CVE database for relevant vulnerabilities
- Scan security news aggregators (Hacker News, The Record, BleepingComputer)
- Review Azure Security Center recommendations

**Monthly Tasks:**
- Security Team threat intelligence briefing (1 hour)
- Update threat model based on emerging threats
- Review incident trends (internal and industry)

### 3.2 Analysis

**Relevance Assessment:**
- Does it affect our technology stack?
- Does it target our industry (SaaS, unions, labor organizations)?
- Does it exploit vulnerabilities we have?
- Is it actively exploited in the wild?

**Impact Assessment:**
- What assets could be affected?
- What is the potential business impact?
- Are existing controls effective?
- What is the likelihood of exploitation?

**Priority Rating:**
- **P0 - Critical:** Actively exploited, no patch, affects production (respond within 4 hours)
- **P1 - High:** Patch available, affects production, high severity (respond within 48 hours)
- **P2 - Medium:** Affects non-production or low-severity exploitability (respond within 7 days)
- **P3 - Low:** Informational, no immediate action (monitor)

### 3.3 Dissemination

**Internal Communication:**
- Critical threats: Immediate Slack alert (#security-alerts) + email to engineering
- High threats: Weekly security digest email
- Medium/Low: Monthly security newsletter

**Stakeholder Briefings:**
- CTO: Weekly executive summary (top 3 threats)
- Engineering: Bi-weekly tech lead briefing
- Executive Management: Quarterly board-level threat briefing

### 3.4 Action

**Immediate Actions (P0/P1):**
- Create incident ticket (Jira/Linear)
- Assign owner (Security Team or DevOps)
- Implement temporary mitigations (WAF rules, disable feature)
- Plan and deploy patch
- Verify remediation
- Document lessons learned

**Planned Actions (P2/P3):**
- Add to sprint backlog
- Schedule patching window
- Update security controls
- Enhance monitoring/detection

### 3.5 Feedback Loop

- Track action items to closure
- Measure time-to-patch metrics
- Review false positives to improve relevance filtering
- Update threat model based on realized threats

## 4. Threat Modeling

### 4.1 Annual Threat Model Review

**Process:**
- Identify critical business processes and assets
- Enumerate threat actors (nation-state, cybercriminals, hacktivists, insiders)
- Map attack vectors (STRIDE framework)
  - **S**poofing of identity
  - **T**ampering with data
  - **R**epudiation
  - **I**nformation disclosure
  - **D**enial of service
  - **E**levation of privilege
- Assess likelihood and impact
- Document in `docs/security/THREAT_MODEL.md`

### 4.2 Threat Actors

**Nation-State (Low Likelihood, High Impact):**
- APT groups targeting critical infrastructure
- Supply chain attacks
- Zero-day exploits

**Cybercriminals (Medium Likelihood, High Impact):**
- Ransomware gangs
- Data extortion
- Payment card fraud
- Credential theft for access sales

**Hacktivists (Low Likelihood, Medium Impact):**
- DDoS attacks against labor organizations
- Data leaks for political motives

**Insiders (Low Likelihood, Critical Impact):**
- Malicious insiders exfiltrating data
- Negligent insiders causing breaches
- Privileged account abuse

**Script Kiddies (High Likelihood, Low Impact):**
- Automated scanning for known vulnerabilities
- Credential stuffing with breached password lists

### 4.3 Attack Scenarios (Top 5)

**Scenario 1: Ransomware via Phishing**
- Phishing email with malicious attachment or link
- Credential theft or malware installation
- Lateral movement to production systems
- Data encryption and ransom demand

**Mitigations:**
- MFA enforced (reduces credential theft impact)
- Email filtering (Microsoft Defender / Proofpoint)
- Security awareness training + phishing simulations
- Immutable backups (prevents ransom effectiveness)
- Network segmentation (limits lateral movement)

**Scenario 2: Supply Chain Attack (npm package)**
- Compromised npm package in dependencies
- Malicious code executes in CI/CD or production
- Data exfiltration or backdoor installation

**Mitigations:**
- Dependabot vulnerability scanning
- npm audit in CI/CD pipeline
- Package lock files (prevent unauthorized updates)
- Code review for dependency updates
- SBOM (Software Bill of Materials) generation

**Scenario 3: Cloud Misconfiguration (Azure)**
- Publicly exposed storage bucket or database
- Weak access controls or credentials
- Data breach via direct internet access

**Mitigations:**
- Azure Security Center continuous compliance scanning
- Private endpoints for PostgreSQL and Blob Storage
- Network security groups (NSGs) with deny-by-default
- Regular IAM access reviews
- Automated misconfiguration detection (Azure Policy)

**Scenario 4: Credential Stuffing Attack**
- Breached credentials from third-party site
- Automated login attempts against Clerk auth
- Account takeover and data access

**Mitigations:**
- MFA enforced for privileged accounts (Critical)
- Rate limiting on login endpoints
- CAPTCHA after failed attempts
- Breach monitoring (HaveIBeenPwned API integration)
- Anomalous login detection (Clerk features)

**Scenario 5: Insider Threat (DBA Exfiltration)**
- DBA with elevated privileges
- Exports member PII database to personal storage
- Data sold or leaked

**Mitigations:**
- RLS policies enforced even for superusers
- Database query logging (all superuser queries)
- Data exfiltration detection (unusual query volume/patterns)
- Background checks and NDAs
- Separation of duties (no single DBA has full access)
- Break-glass access with justification

## 5. Metrics and KPIs

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| **Mean Time to Patch (Critical)** | < 48 hours | TBD | — |
| **Mean Time to Patch (High)** | < 7 days | TBD | — |
| **Threat Intelligence Alerts Reviewed** | 100% within 24 hours | TBD | — |
| **False Positive Rate** | < 30% | TBD | — |
| **Security Briefings Delivered** | 12 per year | 0 | — |

## 6. Tools and Automation

### 6.1 Current Tools

- **GitHub Dependabot:** Automated dependency vulnerability scanning
- **npm audit:** CI/CD pipeline integration
- **Azure Security Center:** Cloud security posture management
- **Sentry:** Error monitoring (can detect exploitation attempts)
- **Manual:** CISA/CCCS alerts via email

### 6.2 Planned Tools (Future)

- **MISP (Malware Information Sharing Platform):** Open-source threat intelligence platform
- **TheHive:** Incident response platform with threat intel integration
- **HaveIBeenPwned API:** Breach monitoring for employee and member credentials
- **SIEM (Security Information and Event Management):** Centralized log analysis (Azure Sentinel or Splunk)

## 7. Threat Intelligence Sharing

### 7.1 Outbound Sharing

- Participate in industry ISACs (Information Sharing and Analysis Centers)
- Share anonymized threat indicators with security community
- Report incidents to CCCS (voluntary)

### 7.2 Confidentiality

- Do not disclose customer-specific threats publicly
- Sanitize data before sharing externally
- Follow TLP (Traffic Light Protocol) when sharing intelligence

## 8. Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| **Security Team Lead** | Oversee threat intel program, deliver executive briefings |
| **Security Analysts** | Monitor feeds, analyze threats, create action items |
| **DevOps/SRE** | Execute remediation actions, deploy patches |
| **Engineering Leads** | Prioritize security fixes in sprints |
| **CTO** | Approve resource allocation for critical threats |

## 9. Training

- Security Team: Threat intelligence analysis training (annual)
- Engineering: Threat modeling workshop (annual)
- All Staff: Threat landscape awareness (quarterly briefings)

## Document Control

- **Next Review Date:** May 2026 (Quarterly)
- **Approval:** Security Team Lead + CTO
- **Change History:**
  - v1.0 (February 2026): Initial program document
