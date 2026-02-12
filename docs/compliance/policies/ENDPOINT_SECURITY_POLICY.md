# Endpoint Security Policy

**Document ID:** POL-SEC-008  
**Version:** 1.0  
**Effective Date:** February 12, 2026  
**Last Review:** February 12, 2026  
**Next Review:** August 12, 2026  
**Owner:** Chief Technology Officer  
**Approved By:** Executive Director

---

## 1. Purpose

This policy establishes minimum security requirements for all endpoint devices accessing Union Eyes systems and data to protect organizational assets from unauthorized access, malware, data loss, and other security threats.

---

## 2. Scope

This policy applies to:
- All devices accessing Union Eyes systems (laptops, desktops, tablets, mobile devices)
- Company-owned and BYOD (Bring Your Own Device) endpoints
- All employees, contractors, vendors, and third parties
- Remote and on-premises devices

---

## 3. Endpoint Classification

### 3.1 Company-Owned Devices
**Definition:** Devices purchased and managed by Union Eyes  
**Risk Level:** Medium  
**Security Requirements:** Full compliance with all controls

### 3.2 BYOD (Personal Devices)
**Definition:** Personal devices used for work purposes  
**Risk Level:** High  
**Security Requirements:** Limited access, enhanced controls  
**Allowed Use:** Email, calendar, communication tools only (NO production database access)

### 3.3 High-Privilege Devices
**Definition:** Devices used by administrators, developers, security team  
**Risk Level:** Critical  
**Security Requirements:** Maximum security controls + enhanced monitoring

---

## 4. Operating System Requirements

### 4.1 Supported Operating Systems
**Windows:**
- Windows 10 Pro/Enterprise (version 22H2 or later)
- Windows 11 Pro/Enterprise
- Security update policy: Install within 7 days of release

**macOS:**
- macOS 12 Monterey or later
- Security update policy: Install within 7 days of release

**Linux (Developers Only):**
- Ubuntu 22.04 LTS or later
- Fedora 38 or later
- Security update policy: Install within 7 days of release

**Mobile (BYOD Only):**
- iOS 16 or later
- Android 13 or later

### 4.2 Unsupported/Prohibited
- Windows 7, 8, 8.1 (end-of-life)
- macOS 10.x (unsupported)
- Jailbroken/rooted mobile devices

---

## 5. Mandatory Security Controls

### 5.1 Full Disk Encryption
**Requirement:** FIPS 140-2 compliant encryption on all devices  
**Implementation:**
- **Windows:** BitLocker with TPM 2.0
- **macOS:** FileVault 2
- **Linux:** LUKS (dm-crypt)
- **Mobile:** Native iOS/Android encryption (enabled by default on modern devices)

**Verification:** IT to audit quarterly

### 5.2 Screen Lock / Auto-Lock
**Settings:**
- Idle timeout: 10 minutes maximum
- Password/PIN required to unlock
- Lock on suspend/sleep
- **Mobile:** 5-minute auto-lock

**Password Requirements:**
- Minimum 12 characters (desktop/laptop)
- Minimum 6 digits (mobile PIN)
- Biometric authentication allowed (Face ID, Touch ID, Windows Hello, fingerprint)

### 5.3 Anti-Malware Protection
**Company-Owned Devices:**
- Enterprise anti-malware solution (Microsoft Defender for Endpoint, CrowdStrike, SentinelOne)
- Real-time scanning enabled
- Full scan: weekly
- Definitions update: daily automatic

**BYOD:**
- Reputable anti-virus software required
- Must be up-to-date (definitions within 7 days)
- Proof of installation required for access approval

**Exclusions:** None allowed without security team approval

### 5.4 Firewall
**Company-Owned:**
- Host-based firewall enabled (Windows Defender Firewall, macOS firewall, ufw/firewalld for Linux)
- Default deny inbound, allow outbound
- Only approved applications allowed inbound access

**BYOD:**
- Operating system firewall enabled
- Self-attestation required

### 5.5 Automatic Updates
**Operating System:**
- Critical security patches: within 7 days
- Feature updates: within 30 days (after testing)
- Reboot required: overnight/weekend maintenance windows

**Applications:**
- Critical security updates: within 7 days
- Browsers (Chrome, Edge, Firefox, Safari): Auto-update enabled
- PDF readers, media players: within 14 days

**Exceptions:** Production systems require change management approval

### 5.6 Endpoint Detection and Response (EDR)
**High-Privilege Devices:**
- EDR agent required (Microsoft Defender for Endpoint, CrowdStrike Falcon, SentinelOne)
- 24/7 monitoring and alerting
- Behavioral analysis and threat hunting
- Automatic isolation on critical alerts

**Standard Devices:**
- EDR recommended (to be deployed 2026 Q2)

---

## 6. Application Security

### 6.1 Approved Software List
**Productivity:**
- Microsoft Office 365 / Google Workspace
- Visual Studio Code (developers)
- Slack, Microsoft Teams (communication)
- Zoom, Google Meet (video conferencing)

**Development Tools (Developers Only):**
- Node.js, Python, Git
- Docker Desktop
- Database clients (approved versions only)

**Prohibited Software:**
- Peer-to-peer file sharing (BitTorrent, etc.)
- Remote desktop tools not approved (TeamViewer for personal use, etc.)
- Unlicensed software

### 6.2 Software Installation
**Company-Owned:**
- Standard users: No admin rights (IT installs via MDM)
- Developers: Local admin with self-service portal for approved tools
- All installations logged

**BYOD:**
- Users responsible for maintaining secure software
- No access to production systems from BYOD

### 6.3 Browser Security
**Required:**
- Modern browsers only (Chrome, Edge, Firefox, Safari - latest 2 versions)
- Pop-up blockers enabled
- Phishing/malware protection enabled
- Password managers allowed (1Password, Bitwarden, LastPass Enterprise)

**Prohibited:**
- Browser extensions not approved by IT (see approved list)
- Saving passwords in browser (use password manager instead)

---

## 7. Data Protection

### 7.1 Data Storage
**Allowed:**
- Company-approved cloud storage (OneDrive, Google Drive, SharePoint)
- Encrypted local storage (temporary only)
- Azure Blob Storage via application

**Prohibited:**
- Personal cloud storage (Dropbox personal, iCloud Drive, etc.) for work data
- Unencrypted USB drives
- Public file-sharing sites (WeTransfer, etc.)

### 7.2 Data at Rest
**Requirement:** All sensitive data must be encrypted
- PII, financial data, union documents: AES-256 minimum
- Database backups on endpoints: Prohibited (use Azure Blob only)

### 7.3 Data in Transit
**Requirement:** All data transmission must use encryption
- HTTPS/TLS 1.3 for web traffic
- VPN for remote access (if implemented)
- Encrypted email for external communications (S/MIME, PGP, or secure portal)

### 7.4 Removable Media
**Company-Owned Devices:**
- USB drives: Encrypted only (hardware-encrypted or BitLocker To Go)
- CD/DVD: Prohibited for data transfer
- SD cards: Case-by-case approval

**BYOD:**
- Removable media prohibited for work data

---

## 8. Network Security

### 8.1 Wireless Networks
**Allowed:**
- Home WiFi: WPA2 or WPA3 with strong password (12+ characters)
- Corporate WiFi: 802.1X authentication (if implemented)
- Trusted WiFi: Family/friends with verified security

**Prohibited:**
- Public WiFi without VPN (coffee shops, airports, hotels)
- Open/unencrypted networks
- WiFi with default credentials (Linksys, NETGEAR-XX, etc.)

### 8.2 VPN (When Required)
**Use Cases:** 
- Accessing production databases remotely (when implemented)
- Public WiFi usage
- International travel

**Requirements:**
- Company-approved VPN client
- Split tunneling disabled
- Always-on VPN for high-privilege users

### 8.3 Bluetooth
**Allowed:**
- Keyboards, mice, headsets (trusted devices only)
- Disabled when not in use (encouraged)

**Prohibited:**
- File transfer via Bluetooth
- Pairing with unknown/public devices

---

## 9. Physical Security

### 9.1 Device Custody
**Requirements:**
- Never leave device unattended in public (airports, cafes)
- Lock screen when leaving desk (even at home office)
- Store securely when not in use (locked drawer, safe, cable lock)

### 9.2 Theft/Loss Reporting
**Immediate Actions (within 1 hour):**
1. Report to IT Security: security@unioneyes.com
2. Report to Manager
3. File police report (if stolen)

**IT Security Actions:**
- Remote wipe device (if MDM enrolled)
- Revoke access credentials (Clerk, AWS, GitHub, etc.)
- Monitor for suspicious account activity
- Generate incident report

### 9.3 Travel Security
**Domestic Travel:**
- Keep device with you (do not check in luggage)
- Use privacy screen in public areas
- Lock in hotel safe when not in use

**International Travel:**
- Notify IT Security 48 hours in advance
- Use travel-specific device (loaner laptop if available)
- Assume device compromised upon return (malware scan required)
- Border crossing: Be aware of device search possibilities (use encrypted volumes)

---

## 10. High-Privilege Device Requirements (Enhanced Controls)

### 10.1 Applicability
**Users:**
- Database Administrators
- System Administrators
- DevOps Engineers
- Security Team
- Developers with production access

### 10.2 Additional Requirements
**Mandatory:**
- ✅ EDR agent installed and monitored
- ✅ Privileged Access Workstation (PAW) for production changes
- ✅ Hardware security key for MFA (YubiKey, Titan, etc.)
- ✅ No personal use of high-privilege devices
- ✅ Separate device for email/browsing (recommended)

**Enhanced Monitoring:**
- All privileged commands logged
- Session recording for production access
- Quarterly security audit of device

---

## 11. BYOD Policy

### 11.1 Enrollment Requirements
**Prerequisites:**
- Complete BYOD enrollment form
- Accept Mobile Device Management (MDM) profile (limited)
- Consent to remote wipe of work data (containerized)

**Allowed Access:**
- Email (Outlook, Gmail)
- Calendar and contacts
- Slack, Teams (communication)
- Zoom, Google Meet (video)

**Prohibited Access:**
- Production databases
- Source code repositories
- Cloud consoles (Azure, Vercel, AWS)
- Administrative tools

### 11.2 MDM Enrollment
**Required Features:**
- Work profile containerization (Android Work Profile, iOS Managed Apps)
- Remote wipe of work data only (personal data unaffected)
- Password/PIN enforcement
- Device encryption verification

**User Privacy:**
- Personal data not accessible by IT
- Personal app installation not restricted
- Location tracking disabled
- Only work container monitored

### 11.3 BYOD Termination
**Upon Offboarding:**
- Work profile/apps removed (automatic via MDM)
- Personal data remains intact
- User confirmation required

---

## 12. Compliance and Monitoring

### 12.1 Endpoint Inventory
**Maintained By:** IT Department  
**Contents:**
- Device make/model, serial number, MAC address
- Assigned user, department
- Operating system and version
- Security software versions
- Last security scan date

**Review Frequency:** Monthly

### 12.2 Security Audits
**Quarterly Automated Scans:**
- Disk encryption status
- Anti-malware installation and update status
- Firewall status
- Pending security updates
- Unauthorized software detection

**Annual Manual Audits:**
- Sample inspection of 20% of devices
- Configuration compliance verification
- Physical security inspection (for on-site devices)

### 12.3 Non-Compliance Remediation
**Warning (First Offense):**
- Email notification with remediation steps
- 7-day window to comply

**Access Suspension (Second Offense/Critical Issues):**
- Network access disabled until compliant
- Manager notification

**Device Confiscation (Severe Cases):**
- Immediate removal for investigation
- Suspected malware infection
- Policy violation (rooted/jailbroken device, prohibited software)

---

## 13. Incident Response

### 13.1 Malware Detection
**User Actions:**
1. Disconnect from network (unplug Ethernet, disable WiFi)
2. Do NOT power off device (may destroy forensic evidence)
3. Contact IT Security immediately: security@unioneyes.com

**IT Security Actions:**
- Isolate device (EDR quarantine or network block)
- Preserve forensic image
- Malware analysis and eradication
- Credential reset for affected user
- Incident report to management

### 13.2 Data Breach
**Indicators:**
- Unauthorized access alerts
- Unusual file activity
- Suspicious credentials in dumps

**Response:**
- Activate Data Breach Response Plan
- Preserve evidence
- Notify legal and privacy officer
- Regulatory notification (if PII affected - within 72 hours for PIPEDA)

---

## 14. Exceptions

**Approval Required From:**
- CTO (for policy exceptions)
- Security Team (for technical exceptions)

**Documentation Required:**
- Business justification
- Compensating controls
- Risk acceptance signature
- Expiration date (maximum 90 days)

**Exception Review:** Monthly

---

## 15. Training and Awareness

**Onboarding (All Users):**
- Endpoint security policy review (30 minutes)
- Secure device setup guide
- How to report incidents

**Annual Refresher:**
- Policy updates
- Emerging threats (phishing, ransomware)
- Best practices

**Role-Specific (High-Privilege Users):**
- Advanced threat detection
- Forensic preservation
- Incident response procedures

---

## 16. Policy Review and Maintenance

**Review Frequency:** Bi-annual (February, August)  
**Triggers for Interim Review:**
- Major security incident
- New threat landscape (zero-day vulnerabilities)
- Technology changes (new device types, OS updates)
- Regulatory changes

**Approval:** CTO and Security Committee

---

## 17. Related Documents

- [Information Security Policy](./INFORMATION_SECURITY_POLICY.md)
- [HR Security Policy](./HR_SECURITY_POLICY.md) - Remote Work Security
- [Data Classification Policy](./DATA_CLASSIFICATION_POLICY.md)
- [Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md)
- [BYOD Enrollment Form](../procedures/BYOD_ENROLLMENT.md)

---

## 18. Definitions

**EDR (Endpoint Detection and Response):** Advanced security solution that monitors endpoint activities, detects threats, and enables rapid response.

**FIPS 140-2:** U.S. government standard for cryptographic module security.

**MDM (Mobile Device Management):** Software that manages, monitors, and secures mobile devices.

**PAW (Privileged Access Workstation):** Hardened device dedicated to performing privileged tasks.

**TPM (Trusted Platform Module):** Hardware chip for cryptographic operations and secure boot.

---

**Document Control:**  
- Version 1.0: Initial policy creation (February 12, 2026)

**Approved:**  
________________________________  
Chief Technology Officer

**Date:** February 12, 2026
