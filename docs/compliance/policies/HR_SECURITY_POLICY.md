# Human Resources Security Policy

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** HR & Security Teams  
**Review Schedule:** Annual  
**ISO 27001 Controls:** A.6.1, A.6.2, A.6.3, A.6.4, A.6.5, A.6.6, A.6.7

## 1. Purpose

This policy establishes security requirements for personnel throughout the employment lifecycle: screening, onboarding, ongoing awareness, and offboarding.

## 2. Pre-Employment Screening (A.6.1)

### 2.1 Background Checks

**All Employees and Contractors:**
- Identity verification (government-issued ID)
- Employment history verification (past 5 years)
- Education/credential verification (for technical roles)
- Professional reference checks (minimum 2)

**Privileged Roles (Admins, DBAs, Security):**
- Enhanced background check including credit check
- Criminal record check (where permitted by law)
- Social media and online presence review (public only)

**Timeline:** Completed before start date or within 10 days of conditional offer

### 2.2 Screening Exceptions

- Waiver by CTO or Executive Management for urgent hires
- Documented compensating controls (enhanced supervision, limited access)
- Complete screening within 30 days

## 3. Terms and Conditions of Employment (A.6.2)

### 3.1 Employment Agreements

All employment contracts must include:

**Security Clauses:**
- Confidentiality obligations (during and post-employment)
- Acceptable use of systems and data
- Intellectual property assignment
- Code of conduct acknowledgment
- Security incident reporting obligation
- Social media and public communication guidelines

**For Privileged Roles:**
- Enhanced confidentiality obligations
- Non-compete clauses (where enforceable)
- Mandatory security training requirements
- Separation of duties acknowledgment

### 3.2 Contractor Agreements

All contractor/consultant agreements must include:
- Same security clauses as employees
- Data protection and PIPEDA compliance
- Subcontractor restrictions
- Right to audit
- Immediate termination for security violations
- Data return/destruction upon contract end

### 3.3 Non-Disclosure Agreements (A.6.6)

**When Required:**
- All employees (included in employment agreement)
- All contractors (standalone NDA before access)
- Vendors with system/data access (before engagement)
- Partners and auditors (before disclosure)

**NDA Terms:**
- Definition of confidential information
- Permitted uses and restrictions
- Duration (typically 2-5 years post-termination)
- Return of information obligations
- Legal remedies for breach

## 4. Information Security Awareness and Training (A.6.3)

### 4.1 Onboarding Security Training

**All Personnel - Day 1:**
- Information Security Policy overview (30 minutes)
- Access Control and Password Policy (15 minutes)
- Acceptable Use Policy (15 minutes)
- Incident Reporting Process (15 minutes)
- Data Classification and Handling (20 minutes)
- Phishing Awareness (20 minutes)

**Privileged Roles - Week 1:**
- Secure Development Lifecycle (Engineers)
- Database Security and RLS (DBAs)
- Incident Response Procedures (Security Team)
- Secure Configuration Management (DevOps)

### 4.2 Annual Refresher Training

**All Personnel:**
- Annual security awareness training (60 minutes)
- Phishing simulation exercises (quarterly)
- Policy acknowledgment (annual)
- Emerging threat briefings (as needed)

**Specialized Training:**
- Role-specific training (annual)
- Compliance training (SOC 2, ISO 27001) for relevant teams
- Privacy and data protection (PIPEDA, GDPR) for customer-facing roles

### 4.3 Training Tracking

- Training completion tracked in HR system
- Non-completion escalated to manager and HR
- Access restrictions for overdue training (>30 days)

## 5. Disciplinary Process (A.6.4)

### 5.1 Security Violations

**Minor Violations (warning):**
- Accidental policy violation with no impact
- Late completion of security training
- Weak password on first offense

**Moderate Violations (written warning, access review):**
- Repeated minor violations
- Unauthorized software installation
- Sharing credentials (unintentional)
- Failure to report security incident

**Severe Violations (suspension, termination):**
- Intentional data exfiltration
- Intentional credential sharing
- Tampering with security controls
- Unauthorized system access
- Malicious activity

### 5.2 Process

1. **Investigation:** Security Team investigates alleged violation
2. **Documentation:** Incident report created with evidence
3. **Consultation:** HR and Legal consulted on action
4. **Action:** Manager and HR execute disciplinary action
5. **Appeal:** Employee may appeal per HR policy

## 6. Offboarding Process (A.6.5)

### 6.1 Planned Termination

**7 Days Before Last Day:**
- Manager notified by HR
- Knowledge transfer scheduled
- Data ownership transferred
- Pending work items documented

**Last Day:**
- Exit interview (includes security topics)
- Return all company property (laptops, tokens, access cards)
- Confirm personal data removed from company systems
- Remind of ongoing confidentiality obligations

**Within 1 Hour of Termination:**
- Clerk account disabled (no new logins)
- Active sessions terminated
- MFA tokens revoked
- API keys disabled
- GitHub access removed
- Azure IAM roles removed
- Vercel team membership removed

**Within 24 Hours:**
- Email access revoked
- Slack/Teams access revoked
- VPN access removed
- Shared drive access removed
- Third-party SaaS access audited and removed

**Within 7 Days:**
- Manager confirms all access revoked
- Security Team audits access logs
- Data ownership fully transferred
- Equipment returned and wiped

### 6.2 Emergency Termination

**For Cause / Security Incident:**
- Immediate access revocation (all systems, within 15 minutes)
- Legal counsel consulted before notification
- Forensic imaging of devices (if warranted)
- Incident response procedures activated

### 6.3 Offboarding Checklist

Maintained in `docs/compliance/procedures/OFFBOARDING_CHECKLIST.md`:

- [ ] Manager notified (7 days prior for planned)
- [ ] Knowledge transfer completed
- [ ] Clerk account disabled
- [ ] MFA devices revoked
- [ ] GitHub access removed
- [ ] Azure IAM removed
- [ ] API keys rotated
- [ ] Equipment returned
- [ ] Exit interview completed
- [ ] Confidentiality reminder sent
- [ ] Access audit completed

## 7. Remote Working Security (A.6.7)

### 7.1 Remote Work Policy

Union Eyes is a remote-first organization. All remote workers must:

**Device Requirements:**
- Company-provided or approved devices only for production access
- Full disk encryption enabled (BitLocker, FileVault)
- Automatic screen lock (5 minutes idle)
- Anti-malware software installed and updated
- Operating system patches applied within 7 days
- Firewall enabled

**Network Requirements:**
- Secure home Wi-Fi (WPA3 or WPA2, strong password)
- No use of public Wi-Fi for production access
- VPN required for database or administrative access (if implemented)
- Multi-factor authentication enforced

**Physical Security:**
- Private workspace (no shared computer)
- Clear desk policy when not working
- Cable locks for laptops in semi-public spaces (coffee shops, libraries)
- No sensitive data on public displays (planes, trains)

**Data Handling:**
- No printing of sensitive data at home
- No storage of production data on local devices (cloud-based access only)
- Encrypted file transfer only (no email attachments)

### 7.2 Bring Your Own Device (BYOD)

**Not Permitted For:**
- Production system access
- Customer data access
- Administrative functions

**Permitted For:**
- Email and calendar access (via mobile app with device enrollment)
- Slack/Teams communication
- Non-sensitive documentation (read-only)

**BYOD Requirements (if allowed):**
- Device passcode/biometric (6+ digits)
- Remote wipe capability enrolled
- Auto-lock (2 minutes or less)
- No jailbroken/rooted devices

### 7.3 Travel Security

**Domestic Travel:**
- Keep devices with you (no checked luggage)
- Use privacy screen on planes/trains
- Disable Bluetooth/Wi-Fi when not in use
- No production access from hotel Wi-Fi (use mobile hotspot)

**International Travel:**
- Notify Security Team 5 days in advance
- Use travel-specific device (no production access)
- Encrypt sensitive data (7-Zip AES-256)
- Be aware of border device searches

## 8. Confidential Reporting

### 8.1 Whistleblower Protection

Employees can report security concerns anonymously via:
- security@unioneyes.com (monitored by Security Team only)
- Direct message to CTO or Executive Management
- Third-party hotline (to be established)

Protection from retaliation for good-faith reporting.

## 9. Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| **HR Team** | Execute hiring, screening, onboarding, offboarding |
| **Security Team** | Define security requirements, conduct training, audit access |
| **Managers** | Ensure team compliance, initiate access requests, conduct knowledge transfer |
| **IT/DevOps** | Execute access provisioning/revocation, audit technical access |
| **All Personnel** | Complete training, follow policies, report incidents |

## 10. Related Documents

- Information Security Policy
- Access Control Policy
- Acceptable Use Policy
- Data Classification Policy
- Incident Response Plan
- Offboarding Checklist (procedure)
- NDA Template
- Employment Agreement Template (security clauses)

## Document Control

- **Next Review Date:** February 2027
- **Approval:** HR Director + CTO
- **Change History:**
  - v1.0 (February 2026): Initial policy
