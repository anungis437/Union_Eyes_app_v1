# Data Processing Agreement (DPA) Template

**TEMPLATE VERSION 1.0** - Adapt for each supplier

---

## DATA PROCESSING AGREEMENT

**Between:**

**Union Eyes / One Lab Technologies Corp.** ("Data Controller" or "Customer")  
Address: [To be completed]  
Email: security@unioneyes.com

**AND**

**[SUPPLIER NAME]** ("Data Processor" or "Supplier")  
Address: [Supplier address]  
Email: [Supplier email]

**Effective Date:** [Date]  
**Master Service Agreement Reference:** [MSA Contract Number]

---

## 1. DEFINITIONS

**1.1 General Definitions**

- **"Personal Data"** means any information relating to an identified or identifiable natural person as defined by applicable Data Protection Laws.
- **"Processing"** means any operation performed on Personal Data, including collection, storage, use, disclosure, or deletion.
- **"Data Subject"** means an individual to whom Personal Data relates (e.g., union members, users, employees).
- **"Data Protection Laws"** means all applicable laws and regulations relating to privacy and data protection, including PIPEDA (Canada), GDPR (EU), CCPA (California), and provincial privacy laws.
- **"Subprocessor"** means any third party engaged by Supplier to process Personal Data on behalf of Customer.
- **"Security Incident"** means any unauthorized or unlawful access, use, disclosure, or loss of Personal Data.

**1.2 Scope of Processing**

**Categories of Data Subjects:**
- Union members
- Union officers and stewards
- Organization administrators
- Website visitors (limited metadata)

**Types of Personal Data Processed:**
- Names, email addresses, phone numbers
- Government IDs (for identity verification)
- Financial information (transaction metadata, no card numbers)
- Employment information (union membership, seniority)
- Health information (wellness claims - if applicable)
- IP addresses, device identifiers (logs)

**Purpose of Processing:**
- Provide SaaS services under the Master Service Agreement
- [Specific service description:___________________]

**Duration of Processing:**
- For the term of the Master Service Agreement
- Data retention period: [90 days / 7 years for audit data]

---

## 2. SUPPLIER OBLIGATIONS

**2.1 Compliance with Instructions**

Supplier shall:
- Process Personal Data only on documented instructions from Customer, including transfers of Personal Data to third countries or international organizations
- Immediately inform Customer if, in Supplier's opinion, an instruction infringes Data Protection Laws
- Not use Personal Data for any purpose other than providing Services under the MSA

**2.2 Confidentiality**

Supplier shall:
- Ensure that all personnel authorized to process Personal Data have committed to confidentiality or are under appropriate statutory obligation of confidentiality
- Provide data protection training to all personnel handling Personal Data
- Limit access to Personal Data on a need-to-know basis

**2.3 Security Measures**

Supplier shall implement and maintain appropriate technical and organizational measures to protect Personal Data, including:

**Technical Measures:**
- Encryption at rest (AES-256 or equivalent)
- Encryption in transit (TLS 1.2 or higher)
- Multi-factor authentication for administrative access
- Access logging and monitoring
- Anti-malware and intrusion detection
- Secure backup and disaster recovery
- Regular vulnerability scanning and penetration testing

**Organizational Measures:**
- Information security policy and procedures
- Access control and privileged access management
- Employee background checks and security training
- Incident response and breach notification procedures
- Business continuity and disaster recovery plans
- Annual security audits (SOC 2, ISO 27001, or equivalent)

**2.4 Subprocessors**

Supplier shall:
- Obtain prior written consent from Customer before engaging new Subprocessors
- Maintain a current list of Subprocessors at [URL/location]
- Notify Customer of any intended changes to Subprocessors at least 30 days in advance
- Customer may object to new Subprocessors within 15 days; if Customer objects, Supplier must either not use that Subprocessor or allow Customer to terminate relevant Services without penalty

- Ensure Subprocessors are bound by data protection obligations equivalent to this DPA
- Remain fully liable to Customer for Subprocessor performance

**Current Approved Subprocessors:**

| Subprocessor Name | Service | Data Processed | Location | Security Certifications |
|-------------------|---------|----------------|----------|------------------------|
| [AWS / Azure / GCP] | Infrastructure hosting | All data types | [Region] | SOC 2, ISO 27001 |
| [If applicable] | [Service] | [Data types] | [Region] | [Certs] |

**2.5 Data Subject Rights**

Supplier shall:
- Assist Customer in responding to Data Subject requests (access, rectification, erasure, data portability, restriction, objection)
- Provide Customer with ability to export Personal Data in machine-readable format
- Respond to Customer requests regarding Data Subject rights within 5 business days
- Not directly respond to Data Subjects unless explicitly authorized by Customer

**2.6 Assistance with Compliance**

Supplier shall assist Customer with:
- Data protection impact assessments (DPIAs)
- Consultations with supervisory authorities
- Compliance with Customer obligations under Data Protection Laws
- Documentation of Supplier security practices and certifications

---

## 3. SECURITY INCIDENTS AND BREACH NOTIFICATION

**3.1 Notification Requirements**

In the event of a Security Incident, Supplier shall:

**Immediate Notification (Within 24 hours):**
- Notify Customer by email to: security@unioneyes.com and [backup contact]
- Provide preliminary details of the incident (nature, approximate scope)
- Confirm incident response team is engaged

**Detailed Report (Within 72 hours):**
- Description of the Security Incident (who, what, when, where, how)
- Types and volumes of Personal Data affected
- Types and numbers of Data Subjects affected
- Likely consequences of the Security Incident
- Measures taken or proposed to address the Security Incident and mitigate harm
- Measures to prevent recurrence

**Ongoing Updates:**
- Provide weekly status updates until incident is resolved
- Final incident report within 30 days of resolution

**3.2 Investigation and Remediation**

Supplier shall:
- Conduct root cause analysis and forensic investigation
- Implement remediation measures to prevent recurrence
- Cooperate with Customer's incident response team and forensic investigators
- Preserve evidence and logs for regulatory or legal purposes
- Bear costs of breach notification, credit monitoring, or other remediation (if Supplier is at fault)

**3.3 Customer Rights**

Following a Security Incident, Customer may:
- Conduct on-site security audit or engage third-party auditor
- Request immediate termination of Services without penalty (if breach is material)
- Seek indemnification for regulatory fines, legal fees, and remediation costs

---

## 4. AUDITS AND INSPECTIONS

**4.1 Audit Rights**

Customer (or independent third-party auditor) has the right to:
- Audit Supplier's compliance with this DPA
- Review security policies, procedures, and documentation
- Inspect data processing facilities (on-site or virtually)
- Review security certifications (SOC 2, ISO 27001)

**Audit Frequency:**
- Annual audits at no cost to Customer
- Additional audits permitted following Security Incidents or with reasonable cause

**Audit Notice:**
- 30 days' advance notice for routine audits
- No advance notice for emergency audits (following Security Incident)

**4.2 Audit Cooperation**

Supplier shall:
- Provide requested documentation within 15 business days
- Allow access to personnel, systems, and facilities
- Remediate findings within agreed timelines (30 days for critical, 90 days for high)

**4.3 Certifications in Lieu of Audit**

Customer may accept current SOC 2 Type II or ISO 27001 audit report in lieu of Customer-conducted audit, provided:
- Report is less than 12 months old
- Audit scope covers relevant controls
- No material weaknesses or exceptions relevant to data protection

---

## 5. DATA LOCATION AND TRANSFERS

**5.1 Data Residency**

Supplier shall:
- Store and process Personal Data in the following approved jurisdictions: **Canada**, **United States** (with adequacy protections)
- Obtain prior written consent before transferring Personal Data to any other jurisdiction
- Not transfer Personal Data to jurisdictions without adequate data protection (as determined by PIPEDA or GDPR)

**5.2 Cross-Border Transfers**

For transfers outside Canada/EEA, Supplier shall:
- Implement Standard Contractual Clauses (SCCs) approved by EU Commission or Canadian authorities
- Conduct Transfer Impact Assessment (TIA) for high-risk jurisdictions
- Implement supplementary measures (encryption, access controls) to protect data in transit and at rest

**5.3 Government Access Requests**

If Supplier receives a government or law enforcement request for Customer Personal Data, Supplier shall:
- Immediately notify Customer (unless legally prohibited)
- Challenge overbroad or unlawful requests
- Provide minimum data necessary to comply with lawful orders
- Document all government access requests for Customer review

---

## 6. DATA RETENTION AND DELETION

**6.1 Retention Period**

Supplier shall retain Personal Data only for as long as necessary to provide Services or as required by law:
- Active data: For duration of Service agreement
- Backup data: [30 days / 90 days]
- Audit logs: [7 years] (compliance requirement)

**6.2 Data Deletion**

Upon termination of Services or Customer request, Supplier shall:
- Delete or return all Personal Data within **30 days**
- Provide Data Deletion Certificate confirming:
  - Date of deletion
  - Data types deleted
  - Deletion method (secure wipe, cryptographic erasure)
  - Confirmation that all backups are deleted or rendered inaccessible

**Exception:** Supplier may retain Personal Data to the extent required by applicable law. Customer must be notified of such retention, and data must remain subject to this DPA.

---

## 7. LIABILITY AND INDEMNIFICATION

**7.1 Supplier Liability**

Supplier is liable for:
- Security Incidents caused by Supplier negligence or breach of this DPA
- Unauthorized processing or disclosure of Personal Data
- Failure to implement required security measures
- Non-compliance with Data Protection Laws

**Liability Cap:**
- [Greater of: 12 months' fees OR $[X] million] per incident
- No cap for gross negligence or willful misconduct
- No cap for regulatory fines (PIPEDA, GDPR, CCPA)

**7.2 Indemnification**

Supplier shall indemnify and hold Customer harmless from:
- Regulatory fines and penalties resulting from Supplier non-compliance
- Legal fees and costs of breach notification
- Customer liability to Data Subjects (e.g., GDPR Article 82 damages)
- Costs of credit monitoring, identity theft protection, or remediation services

**7.3 Insurance**

Supplier shall maintain:
- Cyber liability insurance of at least $[2 million] per occurrence
- Errors and omissions (E&O) insurance
- Provide certificate of insurance upon request

---

## 8. TERM AND TERMINATION

**8.1 Term**

This DPA is effective as of the Effective Date and continues for the term of the Master Service Agreement.

**8.2 Termination Rights**

Customer may terminate this DPA (and underlying Services) immediately if:
- Material Security Incident occurs
- Supplier fails to remediate critical security findings within 30 days
- Supplier loses required security certifications (SOC 2, ISO 27001)
- Supplier violates Data Protection Laws

**8.3 Effects of Termination**

Upon termination:
- Supplier shall immediately cease processing Personal Data
- Supplier shall delete or return all Personal Data within 30 days
- Supplier shall provide Data Deletion Certificate
- Customer payment obligations cease (no refund of prepaid fees unless Supplier is at fault)

---

## 9. GENERAL PROVISIONS

**9.1 Governing Law**

This DPA is governed by the laws of **[Province/State, Country]**, consistent with the Master Service Agreement.

**9.2 Dispute Resolution**

Disputes shall be resolved through:
- 1. Good faith negotiation (30 days)
- 2. Mediation (if negotiation fails)
- 3. Arbitration or litigation (as specified in MSA)

**9.3 Amendments**

This DPA may only be amended by written agreement signed by both parties. Customer may require amendments to ensure compliance with changes in Data Protection Laws.

**9.4 Precedence**

In case of conflict:
1. This DPA takes precedence over MSA for data protection matters
2. Data Protection Laws take precedence over this DPA

**9.5 Severability**

If any provision is invalid or unenforceable, the remaining provisions remain in full force and effect.

---

## SIGNATURES

**CUSTOMER (Data Controller):**

Union Eyes / One Lab Technologies Corp.

By: ___________________________________  
Name:  
Title:  
Date:

**SUPPLIER (Data Processor):**

[Supplier Legal Name]

By: ___________________________________  
Name:  
Title:  
Date:

---

## APPENDIX A: SECURITY CONTROLS (SOC 2 / ISO 27001 Mapping)

| Control Domain | Required Controls | Verification Method |
|----------------|-------------------|---------------------|
| **Access Control** | MFA for admin access, RBAC, least privilege | SOC 2 report, audit |
| **Encryption** | AES-256 at rest, TLS 1.2+ in transit | Technical review, cert |
| **Logging** | Security event logging, 1-year retention | SOC 2 report |
| **Incident Response** | 24-hour breach notification, forensics | Incident report template |
| **Business Continuity** | Backup and DR plan, annual testing | DR test report |
| **Vulnerability Management** | Quarterly scans, annual pen testing | Pen test report |

---

## APPENDIX B: DATA PROCESSING DETAILS

**Customer Data Inputs:**
- Member PII (name, email, phone)
- Financial metadata (no card numbers)
- Documents (collective agreements, grievances)

**Processing Activities:**
- Storage in database/file system
- Data analysis and reporting
- Email delivery (if transactional email service)
- [Service-specific processing]

**Data Outputs:**
- Reports and analytics (aggregated, de-identified)
- Backups (encrypted)
- Audit logs

**Data Flows:**
```
Customer → Supplier (data upload via API)
Supplier → Subprocessor (infrastructure hosting)
Supplier → Customer (data export via API)
```

---

**END OF DATA PROCESSING AGREEMENT**

