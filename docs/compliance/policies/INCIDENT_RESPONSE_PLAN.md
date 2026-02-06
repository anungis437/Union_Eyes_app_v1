# Incident Response Plan

**Document Version:** 1.0  
**Effective Date:** January 2025  
**Owner:** Security Team  
**Review Schedule:** Annual  
**SOC-2 Controls:** CC7.2, CC7.3, CC7.4

## 1. Purpose and Scope

### 1.1 Purpose
This Incident Response Plan establishes procedures for detecting, responding to, and recovering from security incidents that affect the union claims management system. The plan ensures timely containment, investigation, and remediation of security events while minimizing business impact.

### 1.2 Scope
This plan applies to:
- All security incidents affecting the system
- All incident types (data breach, malware, DDoS, unauthorized access, etc.)
- All organizational levels (CLC, federations, unions, locals)
- All personnel (incident response team, management, users)
- All phases (preparation, detection, containment, eradication, recovery, lessons learned)

## 2. Incident Classification

### 2.1 Severity Levels

#### CRITICAL (P1)
**Impact**: Severe business disruption, major data breach, system-wide compromise

**Examples**:
- Ransomware infection affecting production systems
- Breach of RESTRICTED data (SIN, PHI) affecting >1,000 users
- Complete system outage (>4 hours)
- Unauthorized access to production database with data exfiltration
- Compromise of privileged administrator accounts
- DDoS attack rendering system inaccessible

**Response Time**: Immediate (within 15 minutes)
**Escalation**: Executive team, legal, PR
**Notification**: Affected users, regulators (if PII breach), insurance

#### HIGH (P2)
**Impact**: Significant business impact, limited data breach, partial service disruption

**Examples**:
- Breach of CONFIDENTIAL data affecting <1,000 users
- Malware infection isolated to single server
- Partial system outage affecting critical features (1-4 hours)
- Unauthorized access to non-production environment
- Phishing campaign targeting organization users
- SQL injection vulnerability discovered in production

**Response Time**: Within 1 hour
**Escalation**: Security manager, CTO
**Notification**: Affected users (if PII involved)

#### MEDIUM (P3)
**Impact**: Moderate business impact, no data breach, limited service degradation

**Examples**:
- Breach of INTERNAL data (no PII)
- Malware detected and quarantined on single workstation
- Performance degradation (slow response times)
- Failed login attempts (potential brute force)
- Suspicious network traffic (port scanning)
- Misconfigured access control discovered

**Response Time**: Within 4 hours
**Escalation**: Security team
**Notification**: Internal IT team only

#### LOW (P4)
**Impact**: Minimal impact, no data breach, no service disruption

**Examples**:
- Policy violation (password sharing)
- Suspicious email reported (not clicked)
- Unsuccessful vulnerability scan attempt
- Outdated software detected (non-critical)
- Minor security configuration issue

**Response Time**: Within 24 hours
**Escalation**: None required
**Notification**: Tracked in ticketing system

### 2.2 Incident Types

**Data Breach**:
- Unauthorized access, use, or disclosure of data
- Classification: Typically P1 (RESTRICTED) or P2 (CONFIDENTIAL)

**Malware/Ransomware**:
- Malicious software infection
- Classification: P1 (ransomware) or P2-P3 (malware)

**Unauthorized Access**:
- Compromised credentials, privilege escalation
- Classification: P1-P2 depending on data accessed

**Denial of Service (DoS/DDoS)**:
- Attacks rendering services unavailable
- Classification: P1 (system-wide) or P2 (partial)

**Phishing/Social Engineering**:
- Attempts to trick users into revealing credentials
- Classification: P2 (successful) or P3 (attempted)

**Insider Threat**:
- Malicious or negligent actions by authorized users
- Classification: P1-P2 depending on impact

**Vulnerability Exploitation**:
- Attacks exploiting known or zero-day vulnerabilities
- Classification: P1-P3 depending on severity

**Physical Security**:
- Unauthorized physical access to facilities
- Classification: P2-P3 depending on assets accessed

## 3. Incident Response Team (IRT)

### 3.1 Team Structure

**Incident Commander (IC)**:
- **Role**: Lead incident response, coordinate team, make critical decisions
- **Authority**: Can authorize emergency changes, escalate to executives
- **Primary**: Chief Information Security Officer (CISO)
- **Backup**: Security Manager

**Security Analyst**:
- **Role**: Investigate incidents, analyze logs, identify indicators of compromise
- **Primary**: Security Operations Center (SOC) Analyst
- **Backup**: IT Security Specialist

**System Administrator**:
- **Role**: Implement containment, perform forensics, restore systems
- **Primary**: Senior System Administrator
- **Backup**: DevOps Engineer

**Communications Lead**:
- **Role**: Internal/external communications, user notifications, PR coordination
- **Primary**: Communications Director
- **Backup**: HR Manager

**Legal Counsel**:
- **Role**: Advise on legal obligations, regulatory notifications, litigation hold
- **Primary**: General Counsel
- **Backup**: External Law Firm

**Business Liaison**:
- **Role**: Assess business impact, coordinate with affected departments, manage stakeholders
- **Primary**: Operations Manager
- **Backup**: Department Heads

### 3.2 Contact Information

| Role | Name | Phone | Email | After-Hours |
|------|------|-------|-------|-------------|
| Incident Commander | [Name] | [Phone] | [Email] | [Phone] |
| Security Analyst | [Name] | [Phone] | [Email] | [Phone] |
| System Administrator | [Name] | [Phone] | [Email] | [Phone] |
| Communications Lead | [Name] | [Phone] | [Email] | [Phone] |
| Legal Counsel | [Name] | [Phone] | [Email] | [Phone] |
| Business Liaison | [Name] | [Phone] | [Email] | [Phone] |

**Emergency Hotline**: 1-800-XXX-XXXX (24/7 monitoring)

### 3.3 Escalation Matrix

```
┌─────────────────────────────────────────────┐
│  P4 (LOW)                                   │
│  ↓ Security Analyst handles independently  │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  P3 (MEDIUM)                                │
│  ↓ Security Manager notified               │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  P2 (HIGH)                                  │
│  ↓ Incident Commander activated            │
│  ↓ CTO notified                            │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  P1 (CRITICAL)                              │
│  ↓ Full IRT activated                      │
│  ↓ Executive team notified                 │
│  ↓ Legal/PR engaged                        │
│  ↓ Regulators notified (if PII breach)     │
└─────────────────────────────────────────────┘
```

## 4. Incident Response Phases

### Phase 1: PREPARATION

**Objective**: Establish capabilities and readiness before incidents occur.

**Activities**:
1. **Team Formation**:
   - Designate IRT members and backups
   - Define roles and responsibilities
   - Establish on-call rotation
2. **Tools and Resources**:
   - Incident ticketing system (Jira Service Management)
   - Forensics tools (Wireshark, Volatility, FTK)
   - Secure communication channel (Signal, encrypted email)
   - War room (physical and virtual)
3. **Documentation**:
   - Incident response playbooks (by incident type)
   - Contact lists (internal and external)
   - System diagrams and inventories
   - Legal/regulatory requirements
4. **Training**:
   - Quarterly tabletop exercises
   - Annual full-scale simulations
   - Security awareness training for all users
5. **Monitoring and Detection**:
   - SIEM deployment (Azure Sentinel)
   - IDS/IPS configuration
   - Log aggregation and analysis
   - Threat intelligence feeds
   - Anomaly detection rules

**Success Metrics**:
- IRT responds to 100% of P1 incidents within 15 minutes
- 90% of team members complete annual training
- Quarterly tabletop exercises conducted

### Phase 2: DETECTION AND ANALYSIS

**Objective**: Identify security incidents and assess their scope and impact.

**Detection Sources**:
- **Automated Alerts**: SIEM, IDS, DLP, antivirus
- **Manual Reports**: Users, help desk, security team
- **Threat Intelligence**: Vendor alerts, CISA advisories
- **Audits**: Log reviews, compliance audits

**Analysis Process**:
1. **Triage** (within SLA):
   - Receive incident report
   - Validate it's a true incident (not false positive)
   - Assign severity level (P1-P4)
   - Create incident ticket
2. **Initial Assessment** (within 30 minutes for P1/P2):
   - Identify affected systems and data
   - Determine attack vector and indicators of compromise (IoCs)
   - Assess current and potential impact
   - Document timeline of events
3. **Scope Determination** (within 2 hours for P1/P2):
   - How many systems/users affected?
   - What data was accessed or exfiltrated?
   - Is attacker still active in environment?
   - Are there lateral movement attempts?
4. **Classification** (within 4 hours for P1/P2):
   - Confirm incident type
   - Finalize severity level
   - Determine if regulatory notification required
   - Assess legal/PR implications

**Tools**:
- SIEM: Azure Sentinel for log correlation
- EDR: Endpoint detection and response
- Network Traffic Analysis: Wireshark, NetFlow
- Forensics: FTK, Volatility (memory analysis)

**Documentation** (maintain incident log):
- Incident ID and classification
- Detection timestamp
- Affected systems/users
- IoCs (IP addresses, hashes, URLs)
- Evidence collected (preserve chain of custody)
- Actions taken

### Phase 3: CONTAINMENT

**Objective**: Limit the spread and impact of the incident.

**Short-Term Containment** (Immediate):
- **Network Isolation**: Disconnect affected systems from network
- **Account Lockout**: Disable compromised user accounts
- **Firewall Rules**: Block malicious IP addresses
- **Service Shutdown**: Stop affected services (if necessary)
- **Snapshot/Backup**: Take forensic images before remediation

**Long-Term Containment** (Within 24 hours):
- **Patch Vulnerabilities**: Apply emergency patches
- **Strengthen Access Controls**: Enforce MFA, restrict access
- **Deploy Countermeasures**: Update firewall rules, IDS signatures
- **Monitor Closely**: Enhanced logging and alerting

**Containment Strategies by Incident Type**:

**Data Breach**:
1. Identify breach scope (what data, how many records)
2. Revoke access for compromised accounts
3. Rotate encryption keys if database compromised
4. Block exfiltration channels (email, FTP, etc.)
5. Preserve evidence (log files, database snapshots)

**Malware/Ransomware**:
1. Isolate infected systems (network disconnect)
2. Identify malware variant (hash, behavior analysis)
3. Check for lateral movement (scan other systems)
4. Restore from clean backups (if available)
5. Do NOT pay ransom (company policy)

**Unauthorized Access**:
1. Revoke compromised credentials
2. Force password reset for all users in affected org
3. Review access logs (what did attacker access?)
4. Check for persistence mechanisms (backdoors, scheduled tasks)
5. Enhanced monitoring for re-entry attempts

**DDoS Attack**:
1. Enable DDoS mitigation (Cloudflare, Azure DDoS Protection)
2. Rate limiting and IP blocking
3. Scale infrastructure (auto-scaling groups)
4. Failover to backup region if necessary
5. Contact ISP for upstream filtering

**Phishing**:
1. Disable malicious email relay (block sender)
2. Quarantine phishing emails (O365 admin center)
3. Force password reset for users who clicked
4. Scan systems for malware (if payload delivered)
5. User re-education (phishing awareness)

**Decisions**:
- **Continue Operations?** Can business continue or must system shut down?
- **Evidence Preservation**: Law enforcement involvement? Litigation expected?

### Phase 4: ERADICATION

**Objective**: Remove the threat from the environment.

**Activities**:
1. **Malware Removal**:
   - Run antivirus/anti-malware scans
   - Manually remove malicious files, registry entries, scheduled tasks
   - Rebuild compromised systems from clean images
2. **Close Attack Vectors**:
   - Patch vulnerabilities exploited
   - Harden configurations (disable unnecessary services)
   - Update firewall rules, IDS signatures
3. **Account Cleanup**:
   - Delete unauthorized accounts
   - Remove unauthorized SSH keys, certificates
   - Revoke compromised API keys
4. **Verify Eradication**:
   - Rescan systems for malware
   - Review logs for attacker activity
   - Test attack vector (ensure it's closed)

**Verification**:
- Independent scan by external party (for P1 incidents)
- 48-hour monitoring period (ensure no re-infection)
- Penetration test of patched vulnerability

### Phase 5: RECOVERY

**Objective**: Restore systems to normal operations.

**Activities**:
1. **System Restoration**:
   - Restore from backups (if systems rebuilt)
   - Verify data integrity (checksums, spot checks)
   - Reconfigure systems (apply security baseline)
2. **Service Resumption**:
   - Gradual restoration (staged rollout)
   - Monitor closely for anomalies
   - User communication (service restored)
3. **Enhanced Monitoring**:
   - Elevated logging (30-day period)
   - Threat hunting (proactive search for IoCs)
   - User activity monitoring
4. **Validation**:
   - Functional testing (ensure services work)
   - Performance testing (no degradation)
   - Security testing (vulnerability scan, pen test)

**Recovery Timeline**:
- **P1 Incidents**: Target 24-48 hours for full restoration
- **P2 Incidents**: Target 48-72 hours
- **P3/P4 Incidents**: Target 1-2 weeks

**Criteria for Full Recovery**:
- All services operational
- No residual attacker presence
- Security controls validated
- Business confirms acceptable state

### Phase 6: POST-INCIDENT REVIEW (Lessons Learned)

**Objective**: Improve processes and prevent recurrence.

**Activities**:
1. **Post-Incident Report** (within 7 days):
   - **Executive Summary**: High-level overview for management
   - **Timeline**: Detailed timeline of events
   - **Root Cause**: What allowed incident to occur?
   - **Impact**: Systems/data affected, downtime, costs
   - **Response Evaluation**: What went well? What didn't?
   - **Recommendations**: Preventive and detective controls to implement
2. **Lessons Learned Meeting** (within 14 days):
   - IRT retrospective
   - Invite all stakeholders
   - Blame-free discussion
   - Action items assigned
3. **Improvement Implementation**:
   - Update incident response plan
   - Implement new security controls
   - Enhance monitoring/alerting
   - Additional training if needed
4. **Metrics and KPIs**:
   - Mean Time to Detect (MTTD)
   - Mean Time to Respond (MTTR)
   - Mean Time to Recover (MTTR)
   - Cost of incident (downtime, remediation, legal)

**Post-Incident Report Template**:
```markdown
# Incident Report: [Incident ID]

## Executive Summary
- Incident Type: [Type]
- Severity: [P1-P4]
- Detection Date: [Date]
- Resolution Date: [Date]
- Impact: [Brief description]

## Timeline
| Time | Event |
|------|-------|
| [Timestamp] | Initial detection |
| [Timestamp] | Containment initiated |
| [Timestamp] | Full recovery |

## Root Cause
[Detailed analysis]

## Response Evaluation
**What Went Well:**
- [Item 1]
- [Item 2]

**What Didn't Go Well:**
- [Item 1]
- [Item 2]

## Recommendations
1. [Recommendation 1] - Owner: [Name], Due: [Date]
2. [Recommendation 2] - Owner: [Name], Due: [Date]

## Metrics
- MTTD: [Time]
- MTTR: [Time]
- Cost: [Amount]
```

## 5. Communication Plan

### 5.1 Internal Communications

**Incident Response Team**:
- **Channel**: Secure Slack channel (#incident-response)
- **Frequency**: Real-time during incident, hourly updates for P1/P2
- **Content**: Technical details, actions taken, next steps

**Executive Team**:
- **Channel**: Email, phone (for P1)
- **Frequency**: Initial notification + every 4 hours for P1, daily for P2
- **Content**: Business impact, timeline, resource needs

**All Staff**:
- **Channel**: Company-wide email, intranet announcement
- **Frequency**: Initial notification + final resolution
- **Content**: General awareness, user actions required (e.g., password reset)

### 5.2 External Communications

**Affected Users/Members**:
- **Trigger**: Data breach affecting PII (RESTRICTED or CONFIDENTIAL)
- **Timeline**: Within 72 hours of discovery (per PIPEDA)
- **Channel**: Email, in-app notification
- **Content**: 
  - What happened (incident overview)
  - What data was affected
  - Steps taken to address
  - User actions recommended (password reset, fraud monitoring)
  - Contact information for questions

**Regulatory Notifications**:
- **Office of the Privacy Commissioner of Canada (OPC)**:
  - Required for breaches of RESTRICTED data (real risk of significant harm)
  - Timeline: As soon as feasible (within 72 hours)
  - Method: Online reporting form
- **Provincial Privacy Commissioners**:
  - Alberta, British Columbia, Quebec (if applicable)
- **Canadian Centre for Cyber Security (Cyber Centre)**:
  - Voluntary notification for significant incidents

**Media/Public Relations**:
- **Trigger**: P1 incidents, data breaches
- **Approval**: Executive team, legal counsel
- **Spokesperson**: CEO or Communications Director only
- **Messaging**: Transparent but measured, avoid speculation

**Partners/Vendors**:
- **Trigger**: Incident affects shared systems or data
- **Timeline**: Within 24 hours
- **Contact**: Account managers, security contacts

### 5.3 Communication Templates

**User Notification (Data Breach)**:
```
Subject: Important Security Notification - Action Required

Dear [Name],

We are writing to inform you of a security incident that may have affected your personal information.

WHAT HAPPENED
On [Date], we discovered that [brief description of incident]. We took immediate action to contain the incident and engaged cybersecurity experts to investigate.

WHAT INFORMATION WAS AFFECTED
The incident may have involved access to [list of data types: name, email, SIN, etc.]. We have no evidence that your information has been misused.

WHAT WE'RE DOING
- Contained and resolved the incident
- Notified law enforcement and regulators
- Enhanced security controls
- Engaged external cybersecurity firm for forensic review

WHAT YOU SHOULD DO
- Reset your password immediately: [Link]
- Enable multi-factor authentication: [Link]
- Monitor your accounts for suspicious activity
- Contact us with questions: security@unionclaims.ca or 1-800-XXX-XXXX

We sincerely apologize for this incident and the concern it may cause.

[Name]
[Title]
```

## 6. Regulatory and Legal Requirements

### 6.1 Canadian Privacy Laws

**PIPEDA (Personal Information Protection and Electronic Documents Act)**:
- **Notification Required**: If breach creates "real risk of significant harm"
- **Timeline**: As soon as feasible (within 72 hours)
- **Who to Notify**: 
  - Affected individuals
  - Office of the Privacy Commissioner (OPC)
  - Other organizations if they can reduce harm
- **Record Keeping**: Maintain breach register for 24 months

**Provincial Privacy Laws**:
- **Alberta PIPA**: Similar to PIPEDA, notify affected individuals and commissioner
- **BC PIPA**: Similar to PIPEDA
- **Quebec Law 25**: Stricter requirements, notify Commission d'accès à l'information

### 6.2 Breach Notification Criteria

**Real Risk of Significant Harm** (PIPEDA definition):
Consider:
- Sensitivity of information (SIN, health info = high risk)
- Probability of misuse (credential exposure = high risk)
- Context (safeguards in place, like encryption)

**Examples Requiring Notification**:
- Unencrypted SIN or health records exposed
- Login credentials compromised (likely misuse)
- Financial information accessed by unauthorized party

**Examples NOT Requiring Notification**:
- Encrypted data accessed (keys not compromised)
- Internal data viewed by unauthorized employee (immediately contained)
- Accidental disclosure to single individual (no malicious intent)

### 6.3 Documentation Requirements

**Breach Register** (24-month retention):
- Date of breach
- Description of circumstances
- Personal information involved
- Number of individuals affected
- Assessment of real risk of significant harm
- Steps taken to notify and reduce harm

**Litigation Hold**:
- If litigation expected, preserve all evidence
- Suspend routine data deletion
- Notify all custodians (IT, legal, users)

## 7. Third-Party and Vendor Management

### 7.1 Vendor Incident Notification
Vendors must notify us within 24 hours of security incidents affecting our data.

**Key Vendors**:
- **Clerk** (authentication): security@clerk.dev
- **Stripe** (payments): security@stripe.com
- **Azure** (infrastructure): Azure Security Center
- **Vercel** (hosting): security@vercel.com

### 7.2 Cyber Insurance
**Policy**: [Insurance Company Name]
**Policy Number**: [Number]
**Contact**: [Phone/Email]
**Coverage**: $X million per incident

**Reporting Requirements**: Notify within 72 hours for covered incidents

### 7.3 External Support
**Incident Response Retainer**: [IR Firm Name]
**Forensics Partner**: [Forensics Firm]
**Legal Counsel**: [Law Firm specializing in privacy/cyber]

## 8. Incident Response Playbooks

### 8.1 Ransomware Playbook
1. **Isolate** affected systems immediately (network disconnect)
2. **Identify** ransomware variant (hash, ransom note)
3. **Assess** scope (how many systems encrypted?)
4. **Do NOT pay** ransom (company policy)
5. **Restore** from backups (test integrity first)
6. **Investigate** entry point (phishing email? RDP exposure?)
7. **Eradicate** malware from all systems
8. **Harden** environment (patch, disable RDP, etc.)

### 8.2 Phishing Playbook
1. **Verify** it's phishing (check sender, links)
2. **Report** to email admin (quarantine similar emails)
3. **Identify** who clicked/entered credentials
4. **Reset passwords** for affected users
5. **Scan** systems for malware (if payload delivered)
6. **Block** sender domain/IP
7. **Educate** users (company-wide awareness email)

### 8.3 SQL Injection Playbook
1. **Identify** vulnerable endpoint (review logs, WAF alerts)
2. **Assess** data accessed (query logs, database audit logs)
3. **Patch** vulnerability (code fix, deploy immediately)
4. **Review** other endpoints (similar vulnerabilities?)
5. **Check** for backdoors (web shells, unauthorized accounts)
6. **Notify** if PII accessed
7. **Implement** WAF rules, parameterized queries

### 8.4 Insider Threat Playbook
1. **Confirm** malicious intent vs. accidental
2. **Suspend** user access immediately
3. **Preserve** evidence (emails, logs, files)
4. **Interview** user (if appropriate, with HR/legal present)
5. **Assess** data accessed/exfiltrated
6. **Recover** stolen data (legal demand letter if necessary)
7. **Disciplinary action** (termination, legal action)

## 9. Testing and Exercises

### 9.1 Tabletop Exercises
**Frequency**: Quarterly
**Duration**: 2 hours
**Participants**: IRT, executives
**Scenarios**: 
- Data breach (Q1)
- Ransomware (Q2)
- DDoS (Q3)
- Insider threat (Q4)

### 9.2 Full-Scale Simulation
**Frequency**: Annual
**Duration**: 4 hours
**Participants**: All staff
**Scope**: Realistic scenario with live response

### 9.3 Penetration Testing
**Frequency**: Semi-annual
**Scope**: External and internal
**Provider**: [Third-party firm]

## 10. Metrics and KPIs

### 10.1 Performance Metrics
- **Mean Time to Detect (MTTD)**: Target <15 minutes for P1
- **Mean Time to Respond (MTTR)**: Target <15 minutes for P1
- **Mean Time to Recover**: Target <24 hours for P1
- **Incident Volume**: Track trends (increasing? decreasing?)

### 10.2 Compliance Metrics
- **Notification Compliance**: 100% within regulatory timelines
- **Post-Incident Reports**: 100% completed within 7 days
- **Training Completion**: 90% of staff annually

## 11. Related Policies
- **Access Control Policy**: User provisioning, MFA
- **Data Classification Policy**: Data sensitivity, handling requirements
- **Encryption Standards**: Protecting data in breach scenarios
- **Backup and Recovery Policy**: System restoration

## 12. Policy Review
Reviewed annually or after major incidents.

**Next Review Date**: January 2026

---

**Document Control**
- **Document ID**: POL-IRP-003
- **Version**: 1.0
- **Classification**: CONFIDENTIAL
- **Location**: docs/compliance/policies/INCIDENT_RESPONSE_PLAN.md
