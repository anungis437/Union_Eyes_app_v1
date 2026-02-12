# Master Service Agreement (MSA) - Security Addendum Template

**TEMPLATE VERSION 1.0** - Attach to all supplier contracts

---

## INFORMATION SECURITY ADDENDUM

**To Master Service Agreement Between:**

**Union Eyes / One Lab Technologies Corp.** ("Customer")  
**AND**  
**[SUPPLIER NAME]** ("Supplier")

**Effective Date:** [Date]

---

## 1. PURPOSE

This Security Addendum establishes mandatory security requirements for Supplier's provision of services to Customer. These requirements are binding and take precedence over conflicting provisions in the Master Service Agreement.

---

## 2. SECURITY CERTIFICATIONS AND STANDARDS

**2.1 Required Certifications**

Supplier shall obtain and maintain:

**Tier 1 (Critical) Suppliers:**
- SOC 2 Type II audit report (annual)
- ISO 27001 certification OR equivalent security standard
- PCI-DSS compliance (if processing payment card data)
- Annual penetration testing by qualified third party

**Tier 2 (Important) Suppliers:**
- At least ONE of: SOC 2 Type II, ISO 27001, or comparable security audit
- Bi-annual vulnerability assessments

**Tier 3 (Standard) Suppliers:**
- Published security whitepaper or self-assessment
- Commitment to industry best practices

**2.2 Audit Report Sharing**

Supplier shall provide Customer with:
- SOC 2 Type II report within 30 days of issuance
- ISO 27001 certificate and statement of applicability
- Penetration test executive summary (redacted as necessary)
- Immediate notification if certification is suspended, withdrawn, or modified

**2.3 Loss of Certification**

If Supplier loses required certification:
- Notify Customer within 5 business days
- Provide remediation plan within 15 business days
- Regain certification within 90 days OR Customer may terminate without penalty

---

## 3. DATA PROTECTION AND ENCRYPTION

**3.1 Encryption Requirements**

Supplier shall encrypt:

**Data at Rest:**
- AES-256 or equivalent for all Customer data
- Database encryption (transparent data encryption or equivalent)
- Encrypted backups with separate key management

**Data in Transit:**
- TLS 1.2 or higher for all data transmissions
- Certificate pinning for mobile apps (if applicable)
- VPN or private connectivity for admin access

**3.2 Key Management**

Supplier shall:
- Store encryption keys separately from encrypted data
- Use Hardware Security Module (HSM) for production keys
- Rotate encryption keys at least annually
- Provide Customer-managed encryption keys (CMEK) option if available

**3.3 Data Minimization**

Supplier shall:
- Collect and process only data necessary for agreed services
- Not use Customer data for own purposes (e.g., AI training, analytics, marketing)
- Anonymize or pseudonymize data where feasible
- Implement automated data retention and deletion

---

## 4. ACCESS CONTROLS

**4.1 Authentication**

Supplier shall implement:
- Multi-factor authentication (MFA) for all administrative access
- MFA for remote access to production systems
- Strong password requirements (12+ characters, complexity, 90-day expiration)
- Single Sign-On (SSO) integration if Customer requests

**4.2 Authorization**

Supplier shall:
- Implement role-based access control (RBAC)
- Follow principle of least privilege
- Review access permissions quarterly
- Revoke access within 1 hour of employee termination

**4.3 Privileged Access Management**

Supplier shall:
- Maintain separate accounts for privileged and regular access
- Log all privileged actions
- Require business justification for privileged access
- Implement "break-glass" emergency access with audit trail

---

## 5. SECURITY MONITORING AND LOGGING

**5.1 Logging Requirements**

Supplier shall log:
- Authentication attempts (success and failure)
- Authorization decisions (access granted/denied)
- Data access and modifications
- Administrative actions
- Security configuration changes
- System errors and exceptions

**5.2 Log Retention**

- Security logs: **1 year** minimum
- Audit logs: **7 years** (for financial/legal compliance)
- Logs must be tamper-proof and immutable

**5.3 Security Monitoring**

Supplier shall:
- Implement Security Information and Event Management (SIEM) or equivalent
- Monitor for unauthorized access attempts
- Alert on suspicious activity within 15 minutes
- Conduct quarterly log reviews

---

## 6. SECURITY INCIDENT MANAGEMENT

**6.1 Breach Notification SLA**

Supplier shall notify Customer within **24 hours** of becoming aware of:
- Unauthorized access to Customer data
- Data breach or exfiltration
- Ransomware or malware infection affecting Customer data
- Loss or theft of devices containing Customer data
- Any security incident that may affect confidentiality, integrity, or availability of Customer data

**Notification Method:**
- Email: security@unioneyes.com
- Phone: [Customer emergency contact]
- Encrypted communication if data details are sensitive

**6.2 Incident Response**

Supplier shall:
- Engage incident response team within 1 hour of detection
- Contain incident to prevent further damage
- Preserve evidence for forensic analysis Customer review and regulatory reporting
- Provide detailed incident report within 72 hours (preliminary) and 30 days (final)

**6.3 Root Cause Analysis and Remediation**

Supplier shall:
- Conduct root cause analysis
- Implement corrective and preventive actions
- Share lessons learned with Customer
- Retest security controls post-remediation

---

## 7. VULNERABILITY AND PATCH MANAGEMENT

**7.1 Vulnerability Scanning**

Supplier shall:
- Conduct automated vulnerability scans **monthly**
- Perform penetration testing **annually** (minimum)
- Use qualified third-party for penetration tests
- Share executive summary with Customer

**7.2 Patch Management**

Supplier shall apply security patches:
- **Critical vulnerabilities:** Within 7 days of vendor release
- **High vulnerabilities:** Within 30 days
- **Medium/low vulnerabilities:** Within 90 days

**Emergency Patches:**
- Apply emergency patches (e.g., zero-day exploits) within 24-48 hours
- Notify Customer of critical patches that may affect service availability

---

## 8. BUSINESS CONTINUITY AND DISASTER RECOVERY

**8.1 Backup Requirements**

Supplier shall:
- Perform daily backups of Customer data (minimum)
- Store backups in geographically separate location
- Encrypt all backups (AES-256 minimum)
- Test backup restoration **quarterly**
- Retain backups for **90 days** (or as agreed)

**8.2 Disaster Recovery**

Supplier shall maintain disaster recovery plan with:
- **Recovery Time Objective (RTO):** [4 hours / 24 hours] maximum
- **Recovery Point Objective (RPO):** [1 hour / 24 hours] maximum
- Annual DR test with documented results

**8.3 Business Continuity**

Supplier shall:
- Maintain business continuity plan (BCP)
- Test BCP annually (tabletop exercise minimum)
- Provide Customer with BCP summary upon request
- Notify Customer of significant DR/BCP changes

---

## 9. THIRD-PARTY AND SUBPROCESSOR MANAGEMENT

**9.1 Subprocessor Approval**

Supplier shall:
- Obtain Customer's prior written consent before engaging new subprocessors
- Provide 30 days' advance notice of subprocessor changes
- Maintain current list of subprocessors (publicly accessible or shared with Customer)

**9.2 Subprocessor Security Requirements**

Supplier shall ensure subprocessors:
- Meet equivalent security standards as Supplier
- Are bound by confidentiality and data protection obligations
- Are subject to Supplier's security audits

**9.3 Supplier Liability**

Supplier remains fully liable for subprocessor failures or security breaches.

---

## 10. PHYSICAL SECURITY

**10.1 Data Center Security**

If Supplier operates data centers, they must implement:
- 24/7 monitored physical access controls (badge, biometric)
- Video surveillance with 90-day retention
- Visitor logs and escort requirements
- Environmental controls (fire suppression, temperature monitoring)
- Annual physical security audits

**10.2 Cloud Providers**

If Supplier uses cloud infrastructure (AWS, Azure, GCP):
- Cloud provider must have SOC 2 and ISO 27001 certifications
- Data must be stored in approved regions: **Canada**, **USA**, or **EU**
- Customer notification required before changing cloud provider or region

---

## 11. REMOTE WORK AND ENDPOINT SECURITY

**11.1 Remote Access**

Supplier employees with access to Customer data shall:
- Use company-managed devices only (no personal devices)
- Connect via VPN or equivalent secure channel
- Use MFA for remote access
- Follow endpoint security standards (antivirus, firewall, encryption)

**11.2 Device Requirements**

Supplier shall enforce:
- Full-disk encryption on laptops and mobile devices
- Automatic screen lock after 5 minutes of inactivity
- Remote wipe capability for lost or stolen devices
- Quarterly device security audits

---

## 12. AUDIT AND COMPLIANCE

**12.1 Customer Audit Rights**

Customer (or third-party auditor) may:
- Audit Supplier security controls annually
- Conduct additional audits following Security Incidents or with reasonable cause
- Review Supplier policies, procedures, and documentation
- Inspect facilities upon 30 days' notice (routine) or immediately (emergency)

**12.2 Audit Cooperation**

Supplier shall:
- Provide requested documentation within 15 business days
- Allow interviews with relevant personnel
- Grant access to systems and facilities (subject to reasonable restrictions)
- Remediate audit findings within agreed timelines

**12.3 Regulatory Compliance**

Supplier shall comply with:
- **PIPEDA** (Personal Information Protection and Electronic Documents Act - Canada)
- **GDPR** (General Data Protection Regulation - EU)
- **CCPA** (California Consumer Privacy Act - USA, if applicable)
- **Provincial privacy laws** (Alberta PIPA, BC PIPA, Quebec Law 25)
- **PCI-DSS** (if processing payment card data)
- **WCAG 2.1 AA** (accessibility standards)

---

## 13. EMPLOYEE SECURITY

**13.1 Background Checks**

Supplier shall conduct:
- Criminal background checks for employees with access to Customer data
- Reference checks for new hires
- Re-screening every 3 years or upon role change

**13.2 Security Training**

Supplier shall provide:
- Security awareness training for all employees (annual minimum)
- Role-based training for privileged users (semi-annual)
- Phishing simulation tests (quarterly)
- Training completion tracking and reporting

**13.3 Confidentiality Agreements**

All Supplier employees and contractors with access to Customer data must sign:
- Non-Disclosure Agreement (NDA)
- Acceptable Use Policy (AUP)
- Security and privacy commitment

---

## 14. SECURE SOFTWARE DEVELOPMENT

**14.1 Secure Development Lifecycle (SDLC)**

Supplier shall implement:
- Security requirements in design phase
- Threat modeling for new features
- Secure code review and static analysis
- Dependency scanning for vulnerable components (OWASP Dependency-Check or equivalent)
- Dynamic application security testing (DAST)

**14.2 Code Security**

Supplier shall:
- Follow OWASP Top 10 protections
- Remediate critical code vulnerabilities within 7 days
- Use parameterized queries to prevent SQL injection
- Implement CSRF protection for web applications
- Sanitize user inputs and encode outputs

**14.3 Change Management**

Supplier shall:
- Require security review for code changes affecting authentication, authorization, or data handling
- Conduct regression testing after security patches
- Maintain audit trail of production deployments

---

## 15. DATA RETENTION AND DELETION

**15.1 Retention Period**

Supplier shall retain Customer data only for:
- Duration of service agreement
- [90 days] post-termination (unless Customer requests earlier deletion)
- Audit logs: [7 years] for compliance purposes

**15.2 Secure Deletion**

Upon contract termination or Customer request, Supplier shall:
- Delete all Customer data within **30 days**
- Use secure deletion methods (DoD 5220.22-M standard or cryptographic erasure)
- Provide **Data Deletion Certificate** confirming:
  - Date and method of deletion
  - Data types and volumes deleted
  - Confirmation that backups are deleted or overwritten

**15.3 Legal Hold Exception**

Supplier may retain data if required by law or valid legal process. Customer must be notified, and data remains subject to this agreement.

---

## 16. INSURANCE AND FINANCIAL PROTECTION

**16.1 Required Insurance**

Supplier shall maintain:
- **Cyber Liability Insurance:** Minimum **$2 million** per occurrence
- **Errors and Omissions (E&O) Insurance:** Minimum **$1 million**
- **General Liability Insurance:** As per MSA

**16.2 Certificate of Insurance**

Supplier shall:
- Provide certificate of insurance upon request
- Name Customer as additional insured (cyber liability policy)
- Notify Customer of policy cancellation or material changes (30 days' advance notice)

---

## 17. LIABILITY AND INDEMNIFICATION

**17.1 Supplier Liability for Security Breaches**

Supplier is liable for:
- Regulatory fines and penalties (PIPEDA, GDPR, CCPA) resulting from Supplier's failure
- Costs of breach notification to affected individuals
- Credit monitoring or identity theft protection services
- Legal fees and litigation costs
- Customer's reputational damages

**Liability Cap:** [Greater of: **12 months' fees** OR **$[X] million**] per incident

**No Cap for:**
- Gross negligence or willful misconduct
- Violation of Data Protection Laws
- Unauthorized use or disclosure of Customer data

**17.2 Indemnification**

Supplier shall indemnify, defend, and hold Customer harmless from claims arising from:
- Breach of this Security Addendum
- Security Incidents caused by Supplier negligence
- Subprocessor failures
- Non-compliance with Data Protection Laws

---

## 18. TERMINATION RIGHTS

**18.1 Termination for Security Breach**

Customer may terminate immediately (without penalty) if:
- Material Security Incident occurs
- Supplier fails to remediate critical security findings within 30 days
- Supplier loses required certifications (SOC 2, ISO 27001, PCI-DSS)
- Supplier violates Data Protection Laws or this Security Addendum

**18.2 Data Transition**

Upon termination:
- Supplier shall cooperate with data migration to new provider
- Provide data export in standard formats (CSV, JSON, SQL dump)
- Continue security protections during transition period
- Delete data per Section 15 after transition

---

## 19. REPORTING AND TRANSPARENCY

**19.1 Security Reporting**

Supplier shall provide Customer with:
- **Quarterly:** Security incident summary (anonymized if no Customer impact)
- **Annually:** SOC 2 report, penetration test results, security metrics dashboard
- **Ad Hoc:** Notification of critical vulnerabilities affecting Customer data

**19.2 Transparency Requirements**

Supplier shall disclose:
- Data storage locations (country, region)
- Subprocessor changes (30 days' advance notice)
- Security control changes that may affect Customer
- Government data requests (unless legally prohibited)

---

## 20. AMENDMENTS AND WAIVERS

**20.1 Amendments**

This Security Addendum may be amended only by written agreement signed by both parties.

**20.2 Customer-Driven Updates**

Customer may require amendments to comply with:
- Changes in Data Protection Laws
- New regulatory requirements
- Customer's internal security policies (if reasonable)

Supplier shall implement reasonable amendments within 90 days or allow Customer to terminate without penalty.

**20.3 No Waiver**

Failure to enforce any provision does not waive the right to enforce it later.

---

## 21. PRECEDENCE

In case of conflict:
1. This Security Addendum takes precedence over Master Service Agreement
2. Data Protection Laws take precedence over this Addendum
3. Most protective provision for Customer data applies

---

## 22. SIGNATURE AND ACCEPTANCE

By signing below, Supplier acknowledges and agrees to comply with all terms of this Information Security Addendum.

**CUSTOMER:**

Union Eyes / One Lab Technologies Corp.

By: ___________________________________  
Name:  
Title:  
Date:

**SUPPLIER:**

[Supplier Legal Name]

By: ___________________________________  
Name:  
Title:  
Date:

---

## APPENDIX: SECURITY CONTROL CHECKLIST

**Quick Compliance Verification (check all that apply):**

- [ ] SOC 2 Type II certification current
- [ ] ISO 27001 certification current (or equivalent)
- [ ] PCI-DSS compliant (if applicable)
- [ ] Annual penetration testing conducted
- [ ] Data encrypted at rest (AES-256+)
- [ ] Data encrypted in transit (TLS 1.2+)
- [ ] MFA required for administrative access
- [ ] 24-hour breach notification commitment
- [ ] Data Processing Agreement (DPA) signed
- [ ] Right-to-audit clause accepted
- [ ] Business continuity and DR plan in place
- [ ] Cyber liability insurance (≥$2M)
- [ ] Subprocessor list provided and approved
- [ ] Data deletion procedures documented

**Risk Level:** [Low / Medium / High / Critical]

**Approved By:** _______________________  
**Approval Date:** ______________________

---

**END OF INFORMATION SECURITY ADDENDUM**

