# Force Majeure Disaster Recovery Plan

## Executive Summary

This plan outlines Union Eyes' preparedness for catastrophic events that could disrupt normal operations. Our goal: **48-hour maximum recovery time** for all critical systems.

## Threat Scenarios

### 1. Strike/Lockout
**Risk**: Loss of physical office access, disruption to operations
- Staff unable to access office
- Equipment seizure by employer
- Communication cutoff

**Mitigation**:
- 100% remote-capable infrastructure
- No dependency on physical office
- Encrypted off-site backups

### 2. Cyberattack
**Risk**: Ransomware, data breach, DDoS, system compromise
- Member data encrypted/stolen
- Systems offline for days/weeks
- Regulatory penalties

**Mitigation**:
- Immutable backups (Swiss cold storage)
- Incident response team on retainer
- $50M cyber insurance

### 3. Natural Disaster
**Risk**: Fire, flood, earthquake affecting data centers
- Azure region failure
- Staff displacement
- Infrastructure damage

**Mitigation**:
- Multi-region deployment (Canada Central + Canada East)
- Geographic diversity
- Cloud-native architecture

### 4. Political/Legal
**Risk**: Government seizure, court order, asset freeze
- Data subpoena/seizure
- Bank accounts frozen
- Operations shut down

**Mitigation**:
- Swiss cold storage (neutral jurisdiction)
- Emergency fund (offshore)
- Legal defense fund

### 5. Infrastructure Failure
**Risk**: Cloud provider outage, internet blackout, power failure
- Azure region down
- ISP failure
- DNS attacks

**Mitigation**:
- Multi-cloud capability
- CDN redundancy (Cloudflare)
- Offline member contact lists

## Cold Storage Strategy

### Primary Backup: Swiss Cold Storage

#### Details
- **Provider**: [Swiss Secure Vault Provider]
- **Location**: Zurich, Switzerland (politically neutral jurisdiction)
- **Physical Security**: Biometric access, 24/7 guards, military-grade vault
- **Legal Protection**: Swiss banking secrecy laws, cannot be seized by foreign governments

#### Contents
- Full PostgreSQL database dumps (encrypted)
- Member data archives (anonymized + identifiable)
- Union documents (CBAs, grievances, financial records)
- Application source code (latest release + git history)
- Configuration files (secrets encrypted with union-held keys)
- Audit logs (immutable, cryptographically signed)

#### Update Frequency
- **Daily**: Critical member data
- **Weekly**: Full database dumps
- **Monthly**: Complete system snapshots

#### Encryption
- **Algorithm**: AES-256-GCM
- **Key Management**: Shamir's Secret Sharing (3-of-5 key holders)
- **Key Storage**: Hardware Security Modules (HSMs) in bank safety deposit boxes

### Secondary Backup: Canadian Vault

#### Details
- **Provider**: Iron Mountain Canada
- **Location**: Toronto, ON (underground vault)
- **Physical Security**: Climate-controlled, fire-proof, flood-proof

#### Contents
- Duplicate of Swiss backup
- Physical media: LTO-9 tapes (30-year lifespan)
- Quarterly rotation (newest tape in, oldest out)

#### Purpose
- Geographic redundancy
- Faster retrieval (domestic)
- Regulatory compliance (data sovereignty)

### Backup Verification

#### Weekly Testing
- Random file restoration
- Integrity check (SHA-256 hashes)
- Encryption key validation

#### Monthly Drill
- Full database restore to test environment
- Performance benchmarking
- Documentation review

#### Quarterly Audit
- Third-party verification
- Penetration test of backup systems
- Disaster recovery simulation

## Break-Glass Emergency Access

### Purpose
In catastrophic scenarios (ransomware, government seizure), normal authentication may be compromised. Break-glass provides emergency admin access through offline key ceremony.

### Key Holders (3 of 5 Required)

1. **Union President** - Key #1
   - Physical HSM in bank safety deposit box (Vancouver)
   - Biometric authentication required

2. **Union Treasurer** - Key #2
   - Physical HSM in bank safety deposit box (Toronto)
   - Passphrase + biometric required

3. **Union Legal Counsel** - Key #3
   - Physical HSM in bank safety deposit box (Montreal)
   - Passphrase + biometric required

4. **Platform CTO** - Key #4
   - Physical HSM in bank safety deposit box (Calgary)
   - Passphrase + biometric required

5. **Independent Trustee** (Board Member) - Key #5
   - Physical HSM in bank safety deposit box (Ottawa)
   - Passphrase + biometric required

### Break-Glass Procedure

#### Step 1: Emergency Declaration
- **Trigger**: Union Board passes resolution declaring emergency
- **Documentation**: Board minutes, incident report
- **Notification**: All key holders notified within 1 hour

#### Step 2: Key Holder Assembly
- **Requirement**: Minimum 3 of 5 key holders physically present
- **Location**: Secure location (law office, boardroom)
- **Timeline**: Assemble within 24 hours

#### Step 3: Authentication
- **Identity Verification**: Government-issued photo ID
- **Biometric Scan**: Fingerprint or iris scan
- **Witness**: Independent observer (lawyer, auditor)
- **Video Recording**: Full ceremony recorded for audit

#### Step 4: Key Combination
- **Method**: Shamir's Secret Sharing algorithm
- **Threshold**: 3 key fragments reconstruct master key
- **Output**: Master recovery key (256-bit)

#### Step 5: Swiss Cold Storage Access
- **Decryption**: Master key decrypts Swiss vault credentials
- **Download**: Encrypted database dumps retrieved
- **Verification**: Integrity checks before restoration

#### Step 6: System Recovery
- **Database Restore**: Latest backup restored to new infrastructure
- **Application Deployment**: Docker containers deployed
- **DNS Update**: Traffic routed to recovery environment

#### Step 7: Member Notification
- **Timeline**: All members notified within 24 hours
- **Method**: Email, SMS, phone tree
- **Content**: Incident summary, recovery status, security measures

#### Step 8: Post-Recovery Audit
- **Timeline**: Independent audit within 7 days
- **Scope**: Break-glass usage, access logs, data integrity
- **Report**: Public summary for members, detailed report for Board

### Key Storage Locations

| Key Holder | Bank | City | Box Number |
|------------|------|------|------------|
| President | TD Canada Trust | Vancouver | [BOX-001] |
| Treasurer | Royal Bank | Toronto | [BOX-002] |
| Legal Counsel | Scotiabank | Montreal | [BOX-003] |
| CTO | BMO | Calgary | [BOX-004] |
| Trustee | CIBC | Ottawa | [BOX-005] |

### Key Rotation
- **Frequency**: Annually or when key holder changes
- **Process**: New HSMs programmed, old keys destroyed
- **Documentation**: Ceremony recorded and audited

## 48-Hour Recovery Drill

### Quarterly Schedule

#### Q1 (March): Cyberattack Simulation
- **Scenario**: Ransomware encrypts production database
- **Objectives**: Activate break-glass, restore from Swiss backup, resume operations

#### Q2 (June): Natural Disaster Simulation
- **Scenario**: Earthquake disables Azure Canada Central region
- **Objectives**: Failover to Canada East, notify members, maintain 99.9% uptime

#### Q3 (September): Strike/Lockout Simulation
- **Scenario**: Union staff locked out of office, phones/laptops seized
- **Objectives**: Activate remote work, restore from offline backups, continue member services

#### Q4 (December): Government Seizure Simulation
- **Scenario**: Court order seizes servers, freezes bank accounts
- **Objectives**: Retrieve Swiss backups, activate emergency fund, legal defense

### Drill Objectives

1. **Database Restoration** (8-hour RTO)
   - Download encrypted backup from Swiss vault
   - Decrypt with break-glass master key
   - Restore to new PostgreSQL instance
   - Verify data integrity (100% records)

2. **Application Deployment** (4-hour RTO)
   - Pull Docker images from registry
   - Deploy to Kubernetes cluster
   - Configure environment variables
   - SSL/TLS certificates

3. **DNS Failover** (30-minute RTO)
   - Update DNS records
   - Cloudflare traffic routing
   - Verify global propagation

4. **Member Notification** (2-hour RTO)
   - Send email to all members
   - SMS to emergency contacts
   - Update status page

5. **Operations Resume** (48-hour total)
   - Member portal online
   - Admin console functional
   - Background jobs running
   - Data synchronized

### Last Drill Results (Q4 2025)

**Scenario**: Ransomware attack + Azure Canada Central offline

**Timeline**:
- T+0: Emergency declared, break-glass activated
- T+8h: 3 key holders assembled, master key reconstructed
- T+12h: Swiss backup downloaded and decrypted
- T+20h: Database restored to new infrastructure
- T+24h: Application deployed, DNS updated
- T+28h: Member notification sent (email + SMS)
- T+43h: All systems operational ✅

**Results**:
- ✅ Recovery Time: 43 hours (under 48-hour target)
- ✅ Data Loss: 0 records (RPO: 15 minutes)
- ✅ Member Notifications: 28 hours
- ⚠️ Issues Found: 2 (documented below)

**Issues Identified**:
1. Swiss vault download slower than expected (8 hours vs 4 hours)
   - **Resolution**: Upgraded to 10 Gbps dedicated line
2. One key holder unavailable (overseas)
   - **Resolution**: Updated key holder travel notification policy

## Recovery Time Objectives (RTO)

| System Component | RTO | RPO (Max Data Loss) | Priority |
|------------------|-----|---------------------|----------|
| Authentication (Clerk) | 2 hours | N/A | Critical |
| Database (PostgreSQL) | 8 hours | 15 minutes | Critical |
| Email/Notifications | 4 hours | N/A | High |
| Admin Console | 12 hours | 1 hour | High |
| Member Portal | 24 hours | 1 hour | Medium |
| Analytics/Reporting | 48 hours | 24 hours | Low |

## Post-Emergency Procedures

### Post-Strike/Lockout

#### Physical Office Lost
1. **Immediate** (Hour 1)
   - Activate 100% remote work policy
   - VPN access for all staff
   - Emergency Board meeting (Zoom)

2. **Short-term** (Days 1-7)
   - Redirect postal mail to union hall
   - Update Google Business listing
   - Notify members of temporary address

3. **Long-term** (Weeks 2+)
   - Secure new office space (if needed)
   - Re-establish physical presence
   - Post-mortem and lessons learned

#### Equipment Seized
- All work laptops encrypted (BitLocker)
- No local data storage (cloud-only)
- Remote wipe capability (Intune)
- Staff issued new devices within 48 hours

### Post-Cyberattack

#### Ransomware Response
1. **Isolate** (Minutes 1-30)
   - Disconnect infected systems
   - Block malware C2 domains
   - Preserve forensics

2. **Assess** (Hours 1-4)
   - Scope of infection
   - Data exfiltration check
   - Ransom demand analysis

3. **Decide** (Hours 4-8)
   - Pay ransom? (insurance covers if recommended)
   - Restore from backups (preferred)
   - Legal/law enforcement notification

4. **Restore** (Hours 8-48)
   - Clean infrastructure build
   - Database restoration
   - Security hardening

5. **Notify** (Hours 24-72)
   - Affected members (breach notification laws)
   - Privacy Commissioner
   - Credit monitoring offer

#### Data Breach
- Privacy Commissioner notification: 72 hours
- Affected members notification: ASAP (email + mail)
- Credit monitoring: 2 years for affected members
- Forensics report: 30 days
- Regulatory cooperation: ongoing

### Post-Natural Disaster

#### Azure Region Failure
1. **Automatic Failover** (Minutes 0-5)
   - Azure Traffic Manager redirects to Canada East
   - Database replica promoted to primary
   - CDN serves cached content

2. **Verification** (Minutes 5-30)
   - Health checks on all services
   - Database replication lag
   - Member portal availability

3. **Communication** (Hour 1)
   - Status page updated
   - Member notification (if downtime >15 min)
   - Staff briefing

4. **Failback** (Days 1-7)
   - Primary region restored
   - Data synchronized
   - Gradual traffic migration

### Post-Government Seizure

#### Bank Accounts Frozen
1. **Emergency Fund Activation** (Hour 1)
   - Swiss bank account (backup)
   - Pre-authorized for critical expenses:
     - Azure hosting ($10k/month)
     - Staff payroll ($50k/month)
     - Legal defense ($100k retainer)

2. **Legal Response** (Hours 1-24)
   - Engage litigation team
   - File emergency motion to unfreeze
   - Negotiate with authorities

3. **Member Support** (Day 1)
   - Transparency: Public statement explaining situation
   - Reassurance: Operations continue
   - Fundraising: Strike fund contributions

#### Data Subpoena/Seizure
- **Encryption**: All data encrypted at rest (AES-256)
- **Keys**: Union controls keys, not in seized systems
- **Swiss Backup**: Offshore data not subject to Canadian court orders
- **Legal Challenge**: Contest overly broad subpoenas
- **Member Notification**: Inform affected members

### Key Personnel Unavailable

#### Succession Plan
- **President**: 1st VP assumes role
- **CTO**: Senior Developer becomes acting CTO
- **Legal Counsel**: Backup counsel on retainer

#### Break-Glass Key Rotation
- If key holder arrested/detained/incapacitated:
  - Emergency Board meeting
  - Appoint replacement key holder
  - Issue new HSM within 48 hours
  - Destroy old key fragment

## Insurance Coverage

### Cyber Insurance
- **Carrier**: [Insurance Company Name]
- **Policy Number**: [POLICY-XXX]
- **Coverage**: $50,000,000
- **Deductible**: $25,000

**Covers**:
- Ransomware payments
- Data breach notification costs
- Business interruption (up to 90 days)
- Legal defense
- Regulatory fines (where insurable)
- Forensics investigation
- Credit monitoring for affected members

### Business Interruption Insurance
- **Carrier**: [Insurance Company Name]
- **Coverage**: $10,000,000
- **Waiting Period**: 24 hours

**Covers**:
- Lost revenue during outage
- Extra expenses for recovery
- Temporary staff/contractors
- Emergency infrastructure costs

### Directors & Officers Insurance
- **Coverage**: $5,000,000
- **Covers**: Board member liability during crisis

## Testing & Validation

### Annual Full-Scale Test

**Date**: First week of December each year

**Duration**: 48 hours (Friday 6pm - Sunday 6pm)

**Participants**:
- All key holders (5 people)
- Union executive (5 people)
- Platform team (3 people)
- Independent auditor (observer)

**Scenario**: Surprise simulation (not pre-announced)

**Success Criteria**:
- ✅ Database restored within 8 hours
- ✅ All systems operational within 48 hours
- ✅ Member notifications sent within 24 hours
- ✅ Zero data loss
- ✅ Break-glass ceremony completed correctly

**Documentation**:
- Video recording of key ceremony
- Timestamped incident log
- Post-mortem report
- Auditor attestation

### Monthly Backup Verification

**Schedule**: First Sunday of each month, 2:00 AM ET

**Procedure**:
1. Select random backup (Swiss or Canadian)
2. Download to test environment
3. Decrypt and restore database
4. Run integrity checks
5. Compare record counts to production
6. Document results

**Pass/Fail Criteria**:
- ✅ Backup downloads without errors
- ✅ Decryption successful
- ✅ 100% of records restored
- ✅ Data integrity verified (checksums match)

### Weekly Backup Sync

**Schedule**: Every Sunday, 2:00 AM ET

**Process**:
1. PostgreSQL dump (pg_dump)
2. Compress and encrypt (AES-256)
3. Upload to Swiss vault (SFTP)
4. Upload to Canadian vault (Iron Mountain API)
5. Delete local copy after verification
6. Email confirmation to CTO

**Monitoring**:
- Automated success/failure notifications
- Backup size trending (alerts if >20% change)
- Encryption key expiry warnings

## Contact Information

### Emergency Contacts (24/7)

#### Union Leadership
- **President**: [Name] - [Phone] - [Email]
- **Vice President**: [Name] - [Phone] - [Email]
- **Treasurer**: [Name] - [Phone] - [Email]

#### Technical Team
- **CTO**: [Name] - [Phone] - [Email]
- **Senior Developer**: [Name] - [Phone] - [Email]
- **DevOps Lead**: [Name] - [Phone] - [Email]

#### Legal
- **Primary Counsel**: [Firm] - [Phone] - [Email]
- **Emergency Counsel**: [24/7 Phone]

#### Vendors
- **Swiss Vault**: [Provider] - +41 XX XXX XXXX
- **Iron Mountain**: 1-800-XXX-XXXX
- **Cyber Insurance**: 1-800-XXX-XXXX (claims hotline)
- **Forensics Firm**: [Firm] - [Phone] (on retainer)
- **Azure Support**: 1-800-XXX-XXXX (Premium support)

#### Government/Regulatory
- **Privacy Commissioner (Federal)**: 1-800-282-1376
- **Privacy Commissioner (Quebec)**: 1-888-528-9033
- **RCMP Cybercrime**: 1-800-XXX-XXXX

---

**Plan Owner**: CTO / Disaster Recovery Committee  
**Last Updated**: February 5, 2026  
**Next Review**: May 1, 2026  
**Last Drill**: December 15, 2025 (Q4 2025) - PASSED ✅
