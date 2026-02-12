# Offboarding Security Checklist

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** HR & IT Security Teams  
**ISO 27001 Control:** A.6.5

## Purpose

This checklist ensures secure and complete termination of access rights when employees, contractors, or vendors terminate their relationship with Union Eyes.

---

## Pre-Termination (Planned Departures - 7 Days Before)

- [ ] **Manager notified** of termination date by HR
- [ ] **Knowledge transfer** scheduled and assigned
- [ ] **Data ownership** transferred to manager or designated successor
- [ ] **Pending tasks** documented and reassigned
- [ ] **Equipment return** arranged (laptop, tokens, badges)

---

## Last Day Activities

### Human Resources

- [ ] **Exit interview** conducted (includes security topics)
- [ ] **Confidentiality reminder** provided (NDA obligations continue)
- [ ] **Property return** verified (all company assets)
- [ ] **Personal data removal** confirmed from company systems
- [ ] **Final paycheck** and benefits coordination

### IT and Security (Within 1 Hour of Termination)

**Critical Access Revocation:**
- [ ] **Clerk account disabled** (prevents new logins)
- [ ] **Active sessions terminated** (all devices logged out)
- [ ] **MFA tokens revoked** (TOTP, hardware keys)
- [ ] **API keys disabled** (personal and service account keys)
- [ ] **GitHub access removed** (organization membership, repos)
- [ ] **Azure IAM roles removed** (all subscriptions and resource groups)
- [ ] **Vercel team membership removed**
- [ ] **Database credentials revoked** (if direct access granted)

---

## Post-Termination (Within 24 Hours)

### Application and Service Access

- [ ] **Email access revoked** (Microsoft 365, Google Workspace)
- [ ] **Slack/Teams access removed**
- [ ] **Shared drives access removed** (Google Drive, OneDrive, SharePoint)
- [ ] **VPN access removed** (if implemented)
- [ ] **Third-party SaaS access audited:**
  - [ ] Sentry
  - [ ] Stripe dashboard (if applicable)
  - [ ] DocuSign
  - [ ] Whop admin panel
  - [ ] Linear/Jira
  - [ ] Figma
  - [ ] Other tools: ___________________

### Physical and Device Security

- [ ] **Company laptop returned** and wiped (or remote wipe initiated)
- [ ] **Hardware security keys returned** (YubiKey, etc.)
- [ ] **Physical access badges returned** (if office access)
- [ ] **Mobile device management (MDM) removed** (if BYOD enrolled)
- [ ] **Personal device remote wipe** (for enrolled BYOD)

---

## Post-Termination (Within 7 Days)

### Verification and Audit

- [ ] **Manager confirmation** that all access revoked
- [ ] **Security Team audit** of access logs (last 30 days activity)
- [ ] **Data exfiltration check** (unusual downloads, database queries, API usage)
- [ ] **Equipment return verified** (IT confirms receipt and condition)
- [ ] **Shared credential rotation** (if user had shared accounts/passwords)

### Documentation and Cleanup

- [ ] **Data ownership fully transferred** to successor
- [ ] **Documentation updated** (remove user from team pages, wikis)
- [ ] **Role-based access control (RBAC) updated** (remove from distribution lists, groups)
- [ ] **Monitoring alerts updated** (PagerDuty, Slack alerts, escalation chains)

---

## Emergency / For-Cause Termination

**Immediate Actions (Within 15 Minutes):**

- [ ] **Legal counsel consulted** before notification (if applicable)
- [ ] **All access revoked immediately** (no waiting period)
  - [ ] Clerk account disabled
  - [ ] Sessions terminated
  - [ ] GitHub, Azure, Vercel, all SaaS access removed
- [ ] **Manager and HR notified** of immediate termination
- [ ] **Equipment remote lock/wipe** initiated (if not returned)
- [ ] **Incident response procedures** activated (if security incident)

**Forensic Actions (If Security Incident):**
- [ ] **Forensic imaging** of user devices (before wipe)
- [ ] **Access log export** (all systems, last 90 days)
- [ ] **Data exfiltration investigation** (S3, Blob Storage, database queries, API calls)
- [ ] **Incident report** documented in security incident log
- [ ] **Legal and law enforcement notification** (if warranted)

---

## Special Cases

### High-Privilege Users (Admins, DBAs, Security Team)

- [ ] **Privileged access audit** (superuser, break-glass accounts)
- [ ] **Secret rotation** (API keys, database passwords, Key Vault secrets)
- [ ] **Cryptographic key management** (revoke personal keys if used for signing/encryption)
- [ ] **Enhanced monitoring** (30-day post-termination log review)

### Contractors and Vendors

- [ ] **Contract termination notice** sent
- [ ] **Vendor account closure** (if dedicated vendor account)
- [ ] **Data return or destruction** certification requested (NDA/contract terms)
- [ ] **Subcontractor access removed** (if contractor had subcontractors)
- [ ] **Remove from supplier risk register** (if no longer engaged)

### Remote Workers

- [ ] **Shipped equipment return kit** provided (prepaid label)
- [ ] **Device encryption verified** before shipping
- [ ] **Home office security audit** waived (no physical access to secure)

---

## Post-Termination Monitoring (30 Days)

- [ ] **Access attempt monitoring** (failed login attempts, unauthorized access)
- [ ] **Anomaly detection** (unusual API calls, database queries under old user context)
- [ ] **Credential breach monitoring** (HaveIBeenPwned check for user email)
- [ ] **Final security review** completed (no outstanding risks)

---

## Offboarding Completion Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Manager** | | | |
| **HR** | | | |
| **IT/Security** | | | |
| **CTO (High-Privilege Users)** | | | |

**Termination Date:** ___________________  
**Final Access Revocation Confirmed:** ___________________  
**Equipment Return Verified:** ___________________  

---

## Related Documents

- HR Security Policy
- Access Control Policy
- Incident Response Plan
- Data Retention and Destruction Policy

## Document Control

- **Next Review Date:** February 2027
- **Change History:**
  - v1.0 (February 2026): Initial checklist
