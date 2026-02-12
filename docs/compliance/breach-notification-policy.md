# Security Breach Notification Policy

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Security Officer / Data Protection Officer  
**Review Schedule:** Annual  
**ISO Standard:** ISO/IEC 27035 (Incident Management)
**Regulatory Compliance:** GDPR, PIPEDA, CCPA, state breach notification laws

## Executive Summary

This policy establishes procedures for identifying, containing, investigating, and notifying affected parties of security breaches involving personal information. The organization commits to transparent communication within legally required timeframes while balancing investigative needs and member protection.

### Key Requirements

- **Detection:** Continuous monitoring with automated alerting
- **Assessment:** <4 hours for initial classification
- **Containment:** Immediate action to limit exposure
- **Investigation:** <72 hours for full scope determination
- **Notification:** Within regulatory timelines (GDPR 72 hours, PIPEDA 72 hours, state laws vary)
- **Documentation:** Comprehensive incident records for regulatory review

---

## Table of Contents

1. [Definitions and Scope](#1-definitions-and-scope)
2. [Breach Classification](#2-breach-classification)
3. [Detection and Identification](#3-detection-and-identification)
4. [Assessment and Triage](#4-assessment-and-triage)
5. [Containment Procedures](#5-containment-procedures)
6. [Investigation and Forensics](#6-investigation-and-forensics)
7. [Notification Requirements](#7-notification-requirements)
8. [Communication Templates](#8-communication-templates)
9. [Post-Incident Activities](#9-post-incident-activities)
10. [Roles and Responsibilities](#10-roles-and-responsibilities)
11. [Legal and Regulatory Compliance](#11-legal-and-regulatory-compliance)

---

## 1. Definitions and Scope

### 1.1 What Constitutes a "Breach"

A security breach under this policy includes any of the following:

**Confidentiality Breach:**
- Unauthorized access to personal information (PII)
- Unauthorized disclosure or exposure of sensitive data
- Data theft or exfiltration
- Accidental publication of private data

**Integrity Breach:**
- Unauthorized modification of member records
- Data corruption or destruction
- Tampering with financial transactions
- Alteration of audit logs (attempted or successful)

**Availability Breach:**
- Ransomware attack preventing data access
- Denial of service (DoS/DDoS) affecting operations
- System outage caused by malicious activity

### 1.2 Scope of Coverage

**Covered Data:**
- Member personal information (names, addresses, contact info)
- Sensitive identifiers (SIN, SSN, driver's license numbers)
- Financial information (banking details, payment card data)
- Health information (if collected)
- Biometric data (if collected)
- Authentication credentials (passwords, tokens)
- Any data classified as CONFIDENTIAL or RESTRICTED

**Covered Systems:**
- Production databases (Azure PostgreSQL)
- Application servers (web and API)
- File storage (Azure Blob Storage)
- Employee workstations with access to member data
- Vendor systems processing member data
- Backup and archive systems

**Out of Scope:**
- Publicly available information (published CBAs, public meeting notices)
- Performance issues not caused by malicious activity
- User error without data exposure (e.g., forgotten passwords)

---

## 2. Breach Classification

### 2.1 Severity Levels

#### **CRITICAL (Level 1)**

**Characteristics:**
- Confirmed exposure of sensitive PII (SIN, SSN, financial accounts)
- Large-scale breach affecting >5,000 members or >10% of organization
- Exfiltration of data with evidence of malicious intent
- Ransomware with data theft (double extortion)
- Insider threat with significant data access
- Regulatory reporting required immediately

**Example Scenarios:**
- Database dump containing encrypted_sin values stolen by attacker
- SQL injection attack exposing member financial data
- Compromised admin account used to export member list
- Ransomware group threatens to publish member data

**Response Timeline:**
- Immediate escalation to executive team
- Containment within 1 hour
- Initial notification to regulators within 24 hours (prep for 72-hour formal notification)

---

#### **HIGH (Level 2)**

**Characteristics:**
- Exposure of personal information without sensitive identifiers
- Medium-scale breach affecting 500-5,000 members
- Unauthorized access with unclear intent
- Email or communication system compromise
- Attempted exfiltration (blocked but attempted)

**Example Scenarios:**
- Phishing attack compromises staff email account
- Web application vulnerability exposes member names and emails
- Cloud storage misconfiguration allows public access (quickly corrected)
- Backup media lost in transit with encrypted data

**Response Timeline:**
- Escalation to Security Officer and DPO
- Containment within 4 hours
- Notification to affected members within 72 hours

---

#### **MEDIUM (Level 3)**

**Characteristics:**
- Limited exposure of non-sensitive personal information
- Small-scale breach affecting <500 members
- Unauthorized access without exfiltration
- Security control failure with no confirmed data access
- Vendor incident with minimal impact

**Example Scenarios:**
- Single member account compromised (password reuse)
- Employee views records outside their authorization (quickly detected)
- Failed intrusion attempt (blocked by firewall)
- Third-party service temporary outage due to attack

**Response Timeline:**
- Security team investigation
- Containment within 24 hours
- Notification if risk of harm exists

---

#### **LOW (Level 4)**

**Characteristics:**
- No confirmed data exposure
- Security event with detection but no breach
- Isolated incident with effective controls
- Minimal or no member impact

**Example Scenarios:**
- Attempted brute force login (rate limiting effective)
- Malware detected and removed before data access
- Suspicious activity flagged by monitoring (false positive)
- Policy violation without data compromise

**Response Timeline:**
- Standard incident review
- Monitoring for escalation
- Internal reporting only

---

### 2.2 Impact Assessment Factors

**Data Sensitivity:**
- RESTRICTED data (SIN, SSN, banking) → Automatically HIGH or CRITICAL
- CONFIDENTIAL data (grievance details, health info) → MEDIUM or HIGH
- INTERNAL data (membership roster, non-sensitive contacts) → LOW or MEDIUM
- PUBLIC data → Generally no breach notification required

**Volume:**
- 1-10 records → LOW to MEDIUM
- 11-500 records → MEDIUM
- 501-5,000 records → HIGH
- 5,001+ records → CRITICAL

**Duration of Exposure:**
- <1 hour → Reduces severity by one level
- 1-24 hours → No adjustment
- >24 hours → Increases severity by one level
- Unknown duration → Treat as maximum possible

**Likelihood of Harm:**
- Financial harm (identity theft, fraud risk) → Increases severity
- Reputational harm (embarrassing information) → Consider in notification decision
- Physical harm (domestic violence risk from address exposure) → CRITICAL
- No reasonable harm expected → May not require notification

---

## 3. Detection and Identification

### 3.1 Detection Mechanisms

**Automated Monitoring:**
- Database intrusion detection (Azure PostgreSQL logs)
- Application log monitoring (Winston logs + pattern matching)
- Failed login attempt tracking (`failed_login_attempts` table)
- Unusual data access patterns (RLS policy violations)
- Security event alerting (`audit_security.security_events` table)

**Manual Identification:**
- User reports suspicious activity
- Employee discovers unauthorized access
- Vendor notification of incident
- Regulatory inquiry
- Media reports of credential dumps

### 3.2 Initial Reporting

**Internal Reporting Channels:**
- Security Hotline: security@unioneyes.com (monitored 24/7)
- Incident Report Form: https://unioneyes.com/report-incident
- On-call Security Officer: (phone number in internal directory)

**Mandatory Reporting:**
All employees, contractors, and vendors MUST report suspected breaches immediately. No exceptions.

**Non-Retaliation:**
Employees reporting security incidents in good faith will not face disciplinary action, even if the incident resulted from their mistake.

### 3.3 Incident Logging

**Initial Log Entry:**
```
Incident ID: INC-2026-0001
Date/Time Detected: 2026-02-12 14:35:00 UTC
Reported By: John Doe (IT Staff)
Detection Method: Automated alert (unusual database query)
Initial Classification: MEDIUM (pending investigation)
Systems Affected: Production database (members table)
Estimated Records: Unknown
Status: Under investigation
```

**Logging Requirements:**
- Unique incident ID
- Timestamp (UTC)
- Reporter information
- Detection method
- Preliminary classification
- Affected systems/data
- Initial actions taken

---

## 4. Assessment and Triage

### 4.1 Preliminary Assessment (<1 Hour)

**Immediate Questions:**
1. What data was potentially accessed or disclosed?
2. How many records are affected?
3. Is the breach still ongoing?
4. What is the sensitivity level of the data?
5. Is there evidence of malicious intent?

**Initial Classification:**
- Assign severity level (CRITICAL, HIGH, MEDIUM, LOW)
- Identify immediate containment actions needed
- Determine if executive/board notification required
- Assess if law enforcement involvement needed

### 4.2 Detailed Assessment (<4 Hours)

**Data Inventory:**
- Identify all affected data fields
- Determine encryption status of data
- Classify data sensitivity (RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC)
- Estimate number of affected individuals

**Timeline Reconstruction:**
- When did unauthorized access begin?
- How long was data exposed?
- When was breach detected?
- When was breach contained?

**Attack Vector Analysis:**
- How did the breach occur?
- What vulnerability was exploited?
- Were existing controls bypassed?
- Is there evidence of persistence (backdoors)?

**Scope Determination:**
- Which systems were compromised?
- What data was accessed vs. exfiltrated?
- Are backups affected?
- Are other organizations/tenants affected?

### 4.3 Risk Assessment

**Harm Likelihood Factors:**

| Factor | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| **Data Type** | Contact info only | Member details | SIN/SSN, financial |
| **Encryption** | Encrypted at rest | Encrypted in transit only | Plaintext exposure |
| **Actor Intent** | Accidental | Unknown | Malicious |
| **Exfiltration** | No evidence | Attempted | Confirmed |
| **Dark Web** | No listings | Possible | Confirmed sale |

**Harm Severity Factors:**
- Financial fraud likelihood
- Identity theft risk
- Safety/security concerns (domestic violence victims, witness protection)
- Reputational damage to individuals
- Discrimination risk (health conditions, protected characteristics)

---

## 5. Containment Procedures

### 5.1 Immediate Actions (Within 1 Hour for CRITICAL)

**Stop the Bleeding:**
1. Isolate affected systems (disconnect from network if necessary)
2. Disable compromised accounts immediately
3. Block malicious IP addresses at firewall
4. Revoke exposed API keys/tokens
5. Suspend affected services if needed to prevent further exposure

**Evidence Preservation:**
- Do NOT shut down systems abruptly (may destroy forensic evidence)
- Take memory dumps before shutdown if possible
- Preserve logs before rotation
- Document all actions taken with timestamps

**Communication Lockdown:**
- Activate internal incident response team
- Place gag order on speculation/premature disclosure
- Prepare holding statement for external inquiries
- Notify insurance carrier (cyber insurance)

### 5.2 Technical Containment

**Database Security:**
```sql
-- Revoke compromised account access
REVOKE ALL PRIVILEGES ON DATABASE unioneyes FROM compromised_user;

-- Lock down affected tables temporarily
REVOKE SELECT ON members FROM public;

-- Enable additional audit logging
ALTER DATABASE unioneyes SET log_statement = 'all';

-- Review RLS policies for bypass attempts
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

**Application Security:**
- Force password reset for affected users
- Invalidate all active sessions
- Enable additional authentication (temporary MFA requirement)
- Deploy emergency patches if vulnerability identified

**Infrastructure Security:**
- Snapshot affected VMs before remediation
- Enable Azure Network Watcher packet capture if ongoing
- Check for lateral movement to other systems
- Review Azure Entra ID (AD) sign-in logs for compromised accounts

### 5.3 Vendor Containment

If breach originates from vendor/supplier:

1. **Immediate Notification:** Contact vendor security team
2. **Access Revocation:** Disable vendor API keys, VPN access
3. **Data Inventory:** Identify all data vendor has access to
4. **Breach Assessment:** Request vendor incident report
5. **Contractual Obligations:** Review Security Addendum requirements

---

## 6. Investigation and Forensics

### 6.1 Investigation Team

**Core Team:**
- Security Officer (lead investigator)
- Database Administrator (data forensics)
- DevOps Engineer (infrastructure analysis)
- Legal Counsel (regulatory guidance)
- Data Protection Officer (privacy impact assessment)

**External Resources (if needed):**
- Digital forensics firm
- Cyber insurance investigator
- Legal counsel (external breach specialists)
- Law enforcement (RCMP, FBI)

### 6.2 Forensic Analysis

**Log Analysis:**
```bash
# Database access logs
psql $DATABASE_URL -c "
  SELECT 
    user_id,
    action,
    resource_type,
    ip_address,
    created_at
  FROM audit_security.audit_logs
  WHERE created_at BETWEEN '2026-02-10' AND '2026-02-12'
  AND action IN ('data.export', 'data.access')
  ORDER BY created_at DESC;
"

# Failed login attempts
psql $DATABASE_URL -c "
  SELECT 
    email,
    result,
    ip_address,
    attempted_at,
    failure_reason
  FROM failed_login_attempts
  WHERE attempted_at > NOW() - INTERVAL '7 days'
  AND result = 'failed'
  ORDER BY attempted_at DESC;
"

# RLS policy violations (anomalies)
psql $DATABASE_URL -c "
  SELECT 
    user_id,
    action,
    resource_id,
    ip_address,
    created_at
  FROM audit_security.security_events
  WHERE event_type = 'rls_violation'
  AND created_at > NOW() - INTERVAL '7 days';
"
```

**File System Analysis:**
- Review application logs: `logs/application-*.log`
- Check Docker container logs: `docker logs union-eyes-app`
- Azure App Service logs: Review in Azure Portal
- Web server logs (nginx/Apache): Check for unusual requests

**Network Analysis:**
- Review firewall logs for unusual connections
- Check VPN logs for unauthorized remote access
- Network packet captures (if available)
- DNS query logs (exfiltration detection)

### 6.3 Root Cause Analysis

**Common Breach Causes:**
1. **Phishing/Social Engineering:** Employee credentials compromised
2. **SQL Injection:** Application vulnerability exploited
3. **Misconfiguration:** Public S3 bucket, disabled RLS policy
4. **Insider Threat:** Authorized user exceeds permissions
5. **Supply Chain:** Vendor compromise leads to access
6. **Ransomware:** Credential stuffing → lateral movement → encryption

**Determine:**
- Initial access vector
- Privilege escalation method (if applicable)
- Persistence mechanisms (backdoors, scheduled tasks)
- Data exfiltration method (if occurred)
- Duration of attacker access
- Other systems/customers affected

---

## 7. Notification Requirements

### 7.1 Regulatory Notification

#### **GDPR (European Members)**

**Trigger:** Breach likely to result in risk to rights and freedoms of individuals

**Timeline:**
- **72 hours** from breach awareness to supervisory authority notification
- Extension possible if justified (ongoing investigation)

**Authority:** Applicable EU Data Protection Authority (DPA)

**Content Requirements:**
1. Nature of breach (categories and approximate number of individuals/records)
2. Name and contact details of DPO
3. Likely consequences of breach
4. Measures taken or proposed to address breach
5. Measures to mitigate adverse effects

**Notification Template:**
```
To: [Data Protection Authority Contact]
Subject: Personal Data Breach Notification - Union Eyes

Date of Notification: [Date]
Date of Breach Discovery: [Date]

1. Nature of Breach:
- Type: [Confidentiality/Integrity/Availability]
- Categories of data: [e.g., names, email addresses, SIN/SSN]
- Approximate number of affected individuals: [Number]
- Approximate number of records: [Number]

2. Data Protection Officer:
- Name: [DPO Name]
- Email: dpo@unioneyes.com
- Phone: [Phone Number]

3. Likely Consequences:
[Description of potential impact: identity theft, financial fraud, etc.]

4. Measures Taken:
- Containment: [Actions taken to stop breach]
- Investigation: [Forensic analysis conducted]
- Remediation: [Patches applied, accounts secured]

5. Mitigation Measures:
- Member notification: [Planned notification date]
- Credit monitoring offered: [Yes/No]
- Additional security controls: [Enhanced monitoring, MFA enforcement]

Contact: [Security Officer Name], security@unioneyes.com
```

---

#### **PIPEDA (Canadian Members)**

**Trigger:** Breach of security safeguards involving personal information that poses "real risk of significant harm"

**Timeline:**
- **As soon as feasible** to Office of the Privacy Commissioner of Canada (OPC)
- Maintain record of ALL breaches (even if below notification threshold)

**Authority:** Office of the Privacy Commissioner of Canada (OPC)

**Content Requirements:**
1. Circumstances of breach
2. Date or time period of breach
3. Personal information involved
4. Number of affected individuals
5. Steps taken to reduce harm
6. Steps taken to notify affected individuals
7. Contact information for organization

**"Real Risk of Significant Harm" Factors:**
- Sensitivity of personal information (SIN = automatic yes)
- Probability information will be misused
- Individuals vulnerable to harm (children, seniors, domestic violence victims)
- Potential consequences (financial, identity theft, safety)

---

#### **CCPA (California Residents)**

**Trigger:** Breach of unencrypted personal information

**Timeline:**
- **Without unreasonable delay** (interpret as <30 days)
- If affecting >500 California residents, notify California Attorney General

**Authority:**
- California Attorney General
- Affected individuals

**Special Note:**
- Encrypted data breach does NOT require notification (if encryption key not compromised)
- Must provide 12 months of free credit monitoring if SIN/Driver's License/Financial account compromised

---

#### **State Breach Notification Laws (U.S.)**

All 50 U.S. states have breach notification laws with varying requirements:

**General Timeline:** Most states = "without unreasonable delay" or specific days (30-90 days)

**Common Requirements:**
- Notify state Attorney General if exceeds threshold (varies: 500-1,000 residents)
- Notify consumer reporting agencies if >1,000 residents (Equifax, Experian, TransUnion)
- Notify individuals via mail, email, or substitute notice (website + press release if contact info unavailable)

**States with Unique Requirements:**
- **New York:** 5,000+ residents = notify Attorney General, Department of State, Consumer Protection Board
- **Massachusetts:** Written notice to Attorney General + credit reporting agencies
- **Florida:** 500+ residents = notify Department of Legal Affairs

---

### 7.2 Member Notification

#### **Timing:**

| Severity | Timeline | Method |
|----------|----------|--------|
| **CRITICAL** | Within 72 hours | Email + mail + website notice |
| **HIGH** | Within 7 days | Email + website notice |
| **MEDIUM** | Within 30 days (if harm risk exists) | Email or mail |
| **LOW** | May not require notification | N/A |

#### **Content Requirements:**

**What to Include:**
1. ✅ Description of incident (what happened, when discovered)
2. ✅ Types of information involved (names, SIN, etc.)
3. ✅ Steps taken to contain breach and prevent recurrence
4. ✅ Potential risks to individuals
5. ✅ Steps individuals can take to protect themselves
6. ✅ Resources offered (credit monitoring, identity theft protection)
7. ✅ Contact information for questions
8. ✅ Apology and statement of commitment to security

**What to Avoid:**
- ❌ Technical jargon (use plain language)
- ❌ Minimizing or downplaying the incident
- ❌ Blaming users or third parties
- ❌ Overly legalistic language
- ❌ Speculation about attribution (unless confirmed)

#### **Notification Methods:**

**Primary:** Email notification to member's registered email address

**Secondary (if email fails):**
- Postal mail to address on file
- Phone call (for CRITICAL incidents with safety concerns)

**Substitute Notice (if contact info unavailable):**
- Conspicuous notice on website homepage
- Press release to major media outlets
- Social media notification

---

### 7.3 Regulatory Authorities

**Privacy Commissioners:**

| Jurisdiction | Authority | Contact | Timeline |
|--------------|-----------|---------|----------|
| **Canada** | Office of the Privacy Commissioner of Canada (OPC) | info@priv.gc.ca | As soon as feasible |
| **European Union** | Relevant EU Data Protection Authority | [Country-specific] | 72 hours |
| **California** | California Attorney General | oag.ca.gov/privacy | When 500+ residents affected |

**Other Authorities:**

- **Labor Boards:** If breach affects union members' status or activities
- **Financial Regulators:** If payment card data or banking information exposed
- **Law Enforcement:** RCMP (Canada), FBI (U.S.) if criminal activity suspected

---

### 7.4 Board and Executive Notification

**When to Notify:**
- Any CRITICAL or HIGH severity breach
- Any breach requiring regulatory notification
- Any breach likely to attract media attention
- Any breach with potential legal liability

**Notification Format:**
- Initial notification: Within 4 hours (email + phone call to CEO)
- Detailed briefing: Within 24 hours (executive team meeting)
- Board notification: Within 48 hours (written report + emergency board meeting if CRITICAL)

**Content:**
- Executive summary (1-page)
- Timeline of events
- Scope and impact assessment
- Containment and remediation status
- Notification plan and timeline
- Media/PR strategy
- Legal and financial implications
- Lessons learned and prevention measures

---

## 8. Communication Templates

### 8.1 Member Notification Template (CRITICAL Breach)

**Subject:** Important Security Update - Action Required

---

Dear [Member Name],

We are writing to inform you of a security incident that may have affected your personal information. We take this matter very seriously and want to provide you with information about the incident, our response, and steps you can take to protect yourself.

**What Happened**

On [Date], we discovered unauthorized access to our database containing member information. Our investigation, with assistance from cybersecurity experts, determined that an unauthorized party accessed records between [Date Range].

**Information Involved**

The accessed information may have included:
- Full name
- Address
- Email address
- Phone number
- Social Insurance Number (SIN)
- [Other specific data types]

**What We Are Doing**

Upon discovering this incident, we immediately:
1. Secured our systems and stopped the unauthorized access
2. Launched a forensic investigation to determine the full scope
3. Notified law enforcement and regulatory authorities
4. Implemented additional security measures to prevent future incidents

**What You Can Do**

We recommend you take the following steps to protect yourself:

1. **Monitor Your Accounts:** Regularly review your bank and credit card statements for unauthorized activity.

2. **Place a Fraud Alert:** Contact one of the three credit bureaus (Equifax, Experian, or TransUnion) to place a fraud alert on your credit file.

3. **Consider a Credit Freeze:** You may request a security freeze on your credit file, which prevents new creditors from accessing your credit report.

4. **Report Suspicious Activity:** If you notice unauthorized transactions, report them immediately to your financial institution and local law enforcement.

5. **Free Credit Monitoring:** We are offering [12 months] of free credit monitoring and identity theft protection services through [Provider]. Enrollment instructions are enclosed.

**Resources**

- **Federal Trade Commission (FTC):** IdentityTheft.gov or 1-877-ID-THEFT
- **Office of the Privacy Commissioner of Canada:** 1-800-282-1376
- **Equifax:** 1-800-465-7166
- **TransUnion:** 1-877-713-3393

**Contact Us**

If you have questions, please contact our dedicated incident response line:

- **Email:** incident-support@unioneyes.com
- **Phone:** [Toll-free number] (Monday-Friday, 8 AM - 8 PM ET)
- **Website:** https://unioneyes.com/security-incident

We sincerely apologize for this incident and any inconvenience or concern it may cause you. Protecting your personal information is one of our highest priorities, and we are committed to strengthening our security measures to prevent such incidents in the future.

Sincerely,

[Name]  
[Title]  
Union Eyes

---

### 8.2 Member Notification Template (HIGH Breach - Limited Data)

**Subject:** Security Incident Notification

---

Dear [Member Name],

We are writing to inform you of a security incident that may have affected your account information.

**What Happened**

On [Date], we identified unauthorized access to a portion of our systems. Upon discovery, we immediately investigated and secured the affected systems.

**Information Involved**

The accessed information was limited to:
- Name
- Email address
- Membership number

**Important:** The incident did NOT involve Social Insurance Numbers, financial information, or passwords.

**What We Are Doing**

We have:
- Contained the incident and strengthened our security controls
- Completed a thorough investigation
- Reported the incident to regulatory authorities as required

**What You Can Do**

As a precaution, we recommend:
1. Be alert to phishing emails claiming to be from Union Eyes
2. Do not click on suspicious links or provide personal information via email
3. Verify any requests for information by contacting us directly

**Contact Us**

If you have questions or observe suspicious activity, please contact us:
- **Email:** security@unioneyes.com
- **Phone:** [Phone number]

We apologize for this incident and appreciate your understanding.

Sincerely,

[Name]  
[Title]

---

### 8.3 Regulatory Notification Template (PIPEDA)

**To:** Office of the Privacy Commissioner of Canada  
**Email:** info@priv.gc.ca

**Subject:** Mandatory Breach Notification - Union Eyes

---

**Notification Date:** [Date]  
**Organization:** Union Eyes  
**Contact:** [Name], Data Protection Officer  
**Email:** dpo@unioneyes.com  
**Phone:** [Phone]

**1. Description of Circumstances**

On [Date], Union Eyes discovered unauthorized access to its member database. An attacker exploited [vulnerability description] to gain access to personal information of [number] Canadian members.

**2. Date/Time Period of Breach**

- **Breach Occurred:** Estimated between [Start Date] and [End Date]
- **Breach Discovered:** [Discovery Date]
- **Breach Contained:** [Containment Date]

**3. Personal Information Involved**

Categories of personal information affected:
- [ ] Names
- [ ] Addresses
- [ ] Email addresses
- [ ] Phone numbers
- [ ] Social Insurance Numbers (SIN)
- [ ] Date of birth
- [ ] Financial account information
- [ ] Other: [Specify]

**4. Number of Affected Individuals**

- **Total individuals affected:** [Number]
- **Canadian residents:** [Number]
- **Provincial breakdown:**
  - Ontario: [Number]
  - Quebec: [Number]
  - British Columbia: [Number]
  - Alberta: [Number]
  - [Other provinces as applicable]

**5. Steps Taken to Reduce Harm**

Immediate Actions:
- Isolated affected systems at [Time]
- Disabled compromised accounts
- Implemented enhanced monitoring

Remediation:
- Applied security patches to close vulnerability
- Enhanced logging and alerting
- Conducted full security audit

**6. Steps Taken to Notify Individuals**

- **Notification Method:** Email notification sent to all affected individuals
- **Notification Date:** [Date]
- **Follow-up:** Postal mail for undelivered emails
- **Resources Offered:** 12 months of free credit monitoring through [Provider]

**7. Organizational Contact**

[Name]  
Data Protection Officer  
Union Eyes  
[Address]  
Email: dpo@unioneyes.com  
Phone: [Phone]

**Attachments:**
- Sample member notification letter
- Incident investigation report (executive summary)
- Forensic analysis report (if completed)

---

### 8.4 Media Statement Template

**FOR IMMEDIATE RELEASE**

**Union Eyes Notifies Members of Data Security Incident**

[CITY, DATE] – Union Eyes is notifying current and former members of a data security incident that may have affected their personal information.

On [Date], Union Eyes discovered unauthorized access to its database containing member information. Upon discovery, we immediately launched an investigation with leading cybersecurity experts, contained the incident, and notified law enforcement and regulatory authorities.

The investigation determined that an unauthorized party accessed records containing [description of data types]. At this time, we have no evidence of misuse of member information.

Member trust is paramount to Union Eyes. We sincerely apologize for this incident and are committed to preventing future occurrences. We have implemented additional security measures, including [enhanced monitoring, strengthened access controls, etc.].

Affected members are being notified by email and postal mail. We are offering complimentary credit monitoring and identity theft protection services to affected individuals.

For more information, members can visit https://unioneyes.com/security-incident or call our dedicated support line at [toll-free number] (Monday-Friday, 8 AM - 8 PM ET).

**About Union Eyes**  
Union Eyes provides technology solutions for labor organizations across North America.

**Media Contact:**  
[Name]  
[Title]  
[Phone]  
[Email]

---

### 8.5 Internal Staff Communication

**To:** All Staff  
**From:** Security Officer  
**Subject:** Security Incident - Confidential Communication

---

**CONFIDENTIAL - DO NOT FORWARD**

Team,

I am writing to inform you of a security incident affecting our systems. This email contains sensitive information that must be kept confidential.

**Situation:**
We have identified unauthorized access to [system]. The incident is contained, and an investigation is underway.

**Your Role:**
1. **Do not discuss this incident** with anyone outside the incident response team unless specifically authorized.
2. **Do not speculate** about the cause or impact of the incident.
3. **Refer all media inquiries** to [Spokesperson] at [email/phone].
4. **Refer member inquiries** to our incident support line: [phone].
5. **Report any suspicious activity** to security@unioneyes.com immediately.

**What We're Doing:**
- Investigation and forensics in progress
- Member notification underway
- Regulatory authorities have been notified
- Additional security measures implemented

**What's Next:**
- Mandatory all-staff security briefing: [Date/Time]
- Security training refresher (online): Due by [Date]
- Updated security procedures to be released

Your cooperation and discretion are essential. Thank you for your professionalism during this challenging time.

If you have questions, contact me directly.

[Name]  
Security Officer

---

## 9. Post-Incident Activities

### 9.1 Post-Incident Review Meeting

**Timing:** Within 7 days of incident resolution

**Attendees:**
- Security Officer (facilitator)
- Incident response team members
- Executive sponsor
- Legal counsel (if applicable)
- External investigators (if involved)

**Agenda:**
1. Timeline review (minute-by-minute reconstruction)
2. Root cause analysis (5 Whys technique)
3. Response effectiveness evaluation
4. What went well / What went wrong
5. Lessons learned
6. Action items for improvement

**Deliverable:** Post-Incident Review Report

---

### 9.2 Remediation and Prevention

**Immediate Remediation (0-30 days):**
- Patch exploited vulnerability
- Implement compensating controls
- Enhance monitoring for similar attacks
- Update incident response procedures

**Strategic Prevention (30-90 days):**
- Security architecture review
- Third-party penetration test
- Security training for all staff
- Update security policies
- Vendor due diligence (if supply chain involved)

**Long-Term Improvements (90-365 days):**
- Security roadmap updates
- Technology investments (SIEM, EDR, etc.)
- Process improvements (DevSecOps integration)
- Compliance certifications (SOC 2, ISO 27001)

---

### 9.3 Documentation Requirements

**Incident File Contents:**
1. Initial incident report
2. Assessment and triage documentation
3. Forensic investigation report
4. Containment and remediation logs
5. All internal communications
6. Regulatory notifications (copies)
7. Member notifications (sample + distribution list)
8. Media statements (if applicable)
9. Legal correspondence
10. Post-incident review report
11. Action item tracking (with completion status)

**Retention:** 7 years minimum (per audit log retention policy)

**Location:** Secure document management system with restricted access

---

### 9.4 Financial Impact Tracking

**Direct Costs:**
- Forensic investigation: $[Amount]
- Legal fees: $[Amount]
- Credit monitoring services: $[Amount]
- Notification costs (printing, postage): $[Amount]
- Public relations/crisis management: $[Amount]
- Technology remediation: $[Amount]

**Indirect Costs:**
- Staff time (incident response): [Hours] × [Rate]
- Productivity loss: [Estimate]
- Customer churn: [Number] × [Lifetime Value]
- Reputational damage: [Estimate]

**Insurance Recovery:**
- Cyber insurance claim filed: [Date]
- Deductible: $[Amount]
- Coverage limit: $[Amount]
- Expected recovery: $[Amount]

---

## 10. Roles and Responsibilities

### 10.1 Security Officer

**Primary Responsibilities:**
- Lead incident response team
- Coordinate investigation and forensics
- Make breach classification decisions
- Authorize containment actions
- Interface with legal counsel and regulators
- Approve all external communications
- Chair post-incident review

**Authority:**
- Shut down systems to contain breach
- Engage external forensic experts
- Authorize emergency security spending (up to $50,000)
- Escalate to CEO/Board as needed

**Backup:** DevOps Lead

---

### 10.2 Data Protection Officer (DPO)

**Primary Responsibilities:**
- Privacy impact assessment
- Regulatory notification (GDPR, PIPEDA)
- Member notification oversight
- Ensure compliance with privacy laws
- Liaise with privacy commissioners
- Document data subject rights fulfillment

**Authority:**
- Determine regulatory notification requirements
- Approve member notification content
- Authorize data subject remediation (credit monitoring, etc.)

**Backup:** Legal Counsel

---

### 10.3 Legal Counsel

**Primary Responsibilities:**
- Assess legal liability and risk
- Coordinate with external breach counsel (if needed)
- Review all external communications for legal risk
- Advise on regulatory compliance
- Interface with law enforcement
- Manage litigation (if breach leads to lawsuits)

**Authority:**
- Invoke attorney-client privilege as needed
- Approve/edit external communications
- Recommend notification strategies

---

### 10.4 Database Administrator (DBA)

**Primary Responsibilities:**
- Database forensic analysis
- Identify accessed/exfiltrated records
- Preserve database logs and backups
- Provide technical briefings to investigation team
- Implement database security patches

**Authority:**
- Lock down database access during investigation
- Create forensic copies of database
- Query sensitive data for investigation purposes

---

### 10.5 DevOps Lead

**Primary Responsibilities:**
- Infrastructure forensics (servers, networks)
- System containment and isolation
- Log analysis and correlation
- Implement infrastructure remediation
- Coordinate with cloud providers (Azure support)

**Authority:**
- Shut down or isolate systems
- Engage Azure support for incident assistance
- Deploy emergency patches

---

### 10.6 Communications Lead / PR

**Primary Responsibilities:**
- Draft external communications (member notice, media statement)
- Manage media inquiries
- Monitor public perception and sentiment
- Coordinate member support response
- Update website with incident information

**Authority:**
- Issue media statements (approved by Security Officer)
- Schedule press conferences (if needed)
- Engage external PR firm (for CRITICAL incidents)

---

### 10.7 Executive Sponsor (CTO or CEO)

**Primary Responsibilities:**
- Executive oversight of incident response
- Resource allocation (budget, personnel)
- Board communication
- Strategic decision-making (e.g., whether to pay ransom)
- Member/stakeholder reassurance

**Authority:**
- Authorize unlimited spending for incident response
- Engage external legal or PR firms
- Notify board of directors
- Make final decision on ransom payment (NOT RECOMMENDED)

---

## 11. Legal and Regulatory Compliance

### 11.1 Regulatory Mapping

| Regulation | Applicability | Notification Trigger | Timeline | Penalty for Non-Compliance |
|------------|---------------|----------------------|----------|----------------------------|
| **GDPR** | EU members + Canadian members in EU | Risk to rights & freedoms | 72 hours | Up to €20M or 4% global revenue |
| **PIPEDA** | Canadian members | Real risk of significant harm | As soon as feasible | Up to $100,000 per violation |
| **CCPA** | California residents | Unencrypted PI breach | Without unreasonable delay | $2,500-$7,500 per violation |
| **State Laws** | U.S. residents | Varies by state | Varies (30-90 days typical) | Varies by state |
| **Labor Law** | Union members | Affects collective bargaining | 10 days (notify union) | Legal action by union |

---

### 11.2 Breach Notification Law Exceptions

**When Notification May NOT Be Required:**

1. **Encrypted Data (with secure key):**
   - Data encrypted at rest using AES-256
   - Encryption key NOT compromised
   - Exception: Some states still require notification

2. **Risk Assessment Determines No Harm:**
   - Data is non-sensitive (e.g., email addresses only)
   - No reasonable likelihood of harm
   - Document risk assessment thoroughly

3. **Safe Harbor - Rapid Remediation:**
   - Breach contained within minutes
   - No evidence of data access or exfiltration
   - Enhanced monitoring confirms no misuse
   - Exception: GDPR still requires regulator notification

**Documentation Required:**
Even if notification not required, document:
- Why notification was not required
- Risk assessment justification
- Evidence supporting decision
- Management approval

---

### 11.3 Litigation Considerations

**Potential Legal Actions:**
- Class action lawsuit by affected members
- Regulatory enforcement action
- Shareholder lawsuit (if publicly traded)
- Union grievance or arbititration

**Legal Strategies:**
- **Attorney-Client Privilege:** Engage external counsel early, route investigation through counsel
- **Evidence Preservation:** Litigation hold on all incident-related records
- **Settlement:** Assess early settlement vs. litigation
- **Insurance:** File cyber insurance claim immediately (notify within 30 days typically)

**Common Legal Defenses:**
- Reasonable security measures in place
- Timely detection and response
- Transparent communication
- No evidence of actual harm (damages hard to prove)

---

### 11.4 Regulatory Audit Preparedness

**If Regulator Initiates Audit:**

1. **Cooperation:** Provide requested information promptly
2. **Documentation:** Organize incident file for easy access
3. **Legal Review:** Have counsel review submissions before sending
4. **Consistency:** Ensure all documents tell same story (no contradictions)
5. **Remediation Evidence:** Show concrete steps taken to prevent recurrence

**Audit Questions to Prepare For:**
- "When did you first become aware of the breach?"
- "What security controls were in place prior to the breach?"
- "Why did those controls fail to prevent the breach?"
- "How many individuals were affected and how did you determine that?"
- "What steps have you taken to prevent future breaches?"
- "Do you have cyber insurance?"

---

## 12. Testing and Training

### 12.1 Breach Response Drills

**Frequency:** Semi-annual (every 6 months)

**Drill Scenarios:**
1. **Phishing Attack → Credential Compromise:** Staff member clicks malicious link, attacker gains access to admin account
2. **SQL Injection → Data Exfiltration:** Vulnerability in web app allows attacker to dump member database
3. **Ransomware → Business Interruption:** Encrypted systems, ransom demand, data leak threat

**Drill Format:**
- Tabletop exercise (2-3 hours)
- Simulated incident with time pressure
- Test decision-making, communication, technical response

**Metrics to Evaluate:**
- Time to detection
- Time to containment
- Notification timeline adherence
- Communication effectiveness
- Documentation quality

---

### 12.2 Staff Security Training

**Mandatory Training (All Staff):**
- Security awareness training: Annual refresher
- Phishing simulation: Quarterly
- Incident reporting procedures: At onboarding + annual

**Incident Response Team Training:**
- Breach response procedures: Annual
- Forensics basics: As needed
- Regulatory requirements: Annual update

---

## 13. Appendices

### Appendix A: Incident Severity Decision Tree

```
START: Security event detected
↓
Is PII/PHI/Financial data involved?
├─ NO → Is system availability affected?
│  ├─ NO → LOW severity (monitoring only)
│  └─ YES → Is service critical?
│     ├─ NO → MEDIUM (standard response)
│     └─ YES → HIGH (escalate to Security Officer)
└─ YES → What type of data?
   ├─ Contact info only → MEDIUM
   ├─ Member details (non-sensitive) → HIGH
   └─ SIN/SSN/Financial → CRITICAL
      ↓
      How many records?
      ├─ <100 → HIGH
      ├─ 100-5,000 → CRITICAL
      └─ >5,000 → CRITICAL (executive notification)
```

---

### Appendix B: Regulatory Authority Contact List

**Canada:**
- Office of the Privacy Commissioner of Canada (OPC)
  - Website: priv.gc.ca
  - Email: info@priv.gc.ca
  - Phone: 1-800-282-1376

**United States:**
- Federal Trade Commission (FTC)
  - Website: ftc.gov/enforcement/data-security
  - Phone: 1-877-FTC-HELP

- California Attorney General (Data Breach Reporting)
  - Website: oag.ca.gov/privacy/databreach/reporting
  - Email: Privacy Enforcement and Protection Unit

**European Union:**
- Irish Data Protection Commission (if EU members exist)
  - Website: dataprotection.ie
  - Email: info@dataprotection.ie

---

### Appendix C: Credit Monitoring Provider Contact

**Recommended Provider:** [To be selected]

**Services Offered:**
- Credit monitoring (3 bureaus)
- Identity theft insurance ($1M coverage)
- Dark web monitoring
- Lost wallet assistance
- 24/7 fraud resolution specialists

**Enrollment Process:**
1. Member receives enrollment code via notification letter
2. Visits provider website and creates account
3. Enters enrollment code to activate free 12-month service
4. No credit card required

---

### Appendix D: Quick Reference - Response Checklist

**Upon Discovering Breach:**

- [ ] Contain the breach (isolate systems, disable accounts)
- [ ] Preserve evidence (logs, memory dumps, screenshots)
- [ ] Notify Security Officer immediately
- [ ] Document initial findings (who, what, when, where)
- [ ] Activate incident response team

**Initial Assessment (Within 4 Hours):**

- [ ] Classify severity (CRITICAL, HIGH, MEDIUM, LOW)
- [ ] Identify affected systems and data
- [ ] Estimate number of affected individuals
- [ ] Determine if regulatory notification required
- [ ] Notify executive team (if CRITICAL or HIGH)

**Investigation (Within 72 Hours):**

- [ ] Complete forensic analysis
- [ ] Determine root cause
- [ ] Confirm affected individuals (specific list)
- [ ] Assess harm likelihood
- [ ] Prepare incident report

**Notification (Within Regulatory Timelines):**

- [ ] Notify regulators (72 hours for GDPR, as soon as feasible for PIPEDA)
- [ ] Notify affected individuals (per timeline matrix)
- [ ] Notify board/executives (written report)
- [ ] Prepare media statement (if needed)
- [ ] Update website with incident info

**Post-Incident (Within 30 Days):**

- [ ] Conduct post-incident review meeting
- [ ] Document lessons learned
- [ ] Implement remediation actions
- [ ] Update incident response procedures
- [ ] File cyber insurance claim
- [ ] Complete regulatory audit requests

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-12 | Security & Legal Team | Initial breach notification policy |

**Next Review Date:** February 2027

**Approval:**
- Security Officer: ____________________ Date: ____
- Data Protection Officer: ____________________ Date: ____
- Legal Counsel: ____________________ Date: ____
- CEO: ____________________ Date: ____

**Distribution:**
- Executive team
- Incident response team
- All staff (accessible via internal wiki)
- External breach counsel (on retainer)
