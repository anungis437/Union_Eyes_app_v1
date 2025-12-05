# Access Control Policy

**Document Version:** 1.0  
**Effective Date:** January 2025  
**Owner:** Security Team  
**Review Schedule:** Annual  
**SOC-2 Controls:** CC6.1, CC6.2, CC6.3

## 1. Purpose and Scope

### 1.1 Purpose
This Access Control Policy establishes the requirements and procedures for managing logical and physical access to the union claims management system and its data. The policy ensures that only authorized users can access system resources appropriate to their role and organizational level within the hierarchical multi-tenant structure.

### 1.2 Scope
This policy applies to:
- All system users (members, stewards, officers, administrators)
- All organizational levels (Congress, Federation, Union, Local)
- All system resources (applications, databases, APIs, administrative tools)
- All access methods (web portal, mobile app, API integrations)
- All authentication mechanisms (password, MFA, SSO)

## 2. Policy Overview

### 2.1 Core Principles
1. **Least Privilege**: Users receive minimum access rights necessary for their role
2. **Hierarchical Access**: Parent organizations can access child organization data
3. **Role-Based Access Control (RBAC)**: Permissions assigned based on organizational role
4. **Separation of Duties**: Critical operations require multiple approvers
5. **Need-to-Know**: Access limited to data required for legitimate business purposes
6. **Defense in Depth**: Multiple layers of access controls (authentication, authorization, RLS)

### 2.2 Access Control Model
The system implements a hierarchical RBAC model:

```
┌─────────────────────────────────────────────────────┐
│  Organizational Hierarchy                           │
│  CLC (Congress) → Federation → Union → Local       │
│  ↓ Parent orgs can access child org data           │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│  Role-Based Permissions                             │
│  Super Admin > Org Admin > Manager > Member         │
│  ↓ Roles determine available operations             │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│  Row-Level Security (RLS) Policies                  │
│  Database enforces hierarchical access              │
│  ↓ No application code can bypass                   │
└─────────────────────────────────────────────────────┘
```

## 3. Roles and Permissions

### 3.1 System Roles

#### 3.1.1 Super Administrator
- **Scope**: Full system access across all organizations
- **Granted To**: Platform operators, CLC IT staff
- **Permissions**:
  - Create/modify/delete any organization
  - Manage user accounts across all organizations
  - Configure system-wide settings
  - Access all audit logs and reports
  - Manage security policies
  - Execute database migrations
  - Override RLS policies (with audit logging)

#### 3.1.2 Organization Administrator
- **Scope**: Full access within own organization and descendants
- **Granted To**: Union presidents, executive directors, IT managers
- **Permissions**:
  - Manage users within own organization hierarchy
  - Configure organization settings
  - Access financial data for own organization
  - Generate reports for own organization
  - Manage per-capita remittances (if applicable)
  - View audit logs for own organization
  - Create/approve digital signatures
  - Manage organizational relationships

#### 3.1.3 Manager
- **Scope**: Departmental access within organization
- **Granted To**: Department heads, senior stewards, financial officers
- **Permissions**:
  - View and manage claims assigned to department
  - Generate departmental reports
  - Approve financial transactions (below threshold)
  - View member data within department
  - Manage grievances and arbitrations
  - Access training and compliance materials
  - Co-sign documents requiring dual approval

#### 3.1.4 Member
- **Scope**: Individual access to own data and public resources
- **Granted To**: Union members, basic users
- **Permissions**:
  - View own profile and membership status
  - Submit claims and grievances
  - Access own financial transactions
  - View public collective agreements
  - Access training materials
  - Participate in elections and votes
  - View organization announcements

#### 3.1.5 Free User
- **Scope**: Limited trial/demo access
- **Granted To**: Prospective members, evaluation users
- **Permissions**:
  - View public resources
  - Access demo features
  - Submit contact forms
  - Limited to 3 claims per month
  - No access to financial data

### 3.2 Specialized Roles

#### 3.2.1 Steward
- **Inherits**: Member permissions
- **Additional Permissions**:
  - Represent members in grievances
  - Access workplace safety reports
  - View member issues (with consent)
  - Attend arbitration hearings
  - Access steward training materials

#### 3.2.2 Financial Officer
- **Inherits**: Manager permissions
- **Additional Permissions**:
  - Approve financial transactions (within limits)
  - Generate financial reports
  - Manage per-capita remittances
  - Access banking integrations
  - Export financial data for audits
  - Configure payment settings

#### 3.2.3 Auditor (External/Internal)
- **Scope**: Read-only access to audit data
- **Granted To**: Compliance officers, external auditors
- **Permissions**:
  - View all audit logs (no modification)
  - Generate compliance reports
  - Access signature verification logs
  - View access control logs
  - Export evidence for audits
  - No access to modify any data

## 4. Authentication Requirements

### 4.1 Password Policy
All user passwords must meet the following requirements:
- **Minimum Length**: 12 characters
- **Complexity**: Must contain:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*)
- **History**: Cannot reuse last 5 passwords
- **Expiration**: 90 days for privileged accounts, 180 days for standard users
- **Lockout**: Account locked after 5 failed login attempts within 15 minutes
- **Unlock**: Self-service unlock via email/SMS after 30 minutes, or admin unlock

### 4.2 Multi-Factor Authentication (MFA)
MFA is **mandatory** for:
- Super Administrators
- Organization Administrators
- Financial Officers
- Auditors
- Any user accessing financial data
- Remote access from untrusted networks

MFA is **recommended** for:
- Managers
- Stewards
- Members with sensitive data access

**Supported MFA Methods**:
1. Time-based One-Time Passwords (TOTP) - Google Authenticator, Authy
2. SMS verification codes (backup only)
3. Hardware security keys (YubiKey, FIDO2)
4. Push notifications (mobile app)

### 4.3 Single Sign-On (SSO)
SSO integration is supported via:
- **SAML 2.0**: For enterprise identity providers (Okta, Azure AD, Google Workspace)
- **OAuth 2.0/OIDC**: For federated authentication
- **Configuration**: Organization administrators can configure SSO for their organization
- **Fallback**: Password authentication available if SSO fails

### 4.4 Session Management
- **Session Timeout**: 
  - 30 minutes idle timeout for privileged accounts
  - 2 hours idle timeout for standard users
  - 12 hours maximum session duration (force re-authentication)
- **Concurrent Sessions**: Maximum 3 active sessions per user
- **Session Termination**: 
  - User logout invalidates all tokens
  - Admin can force-terminate user sessions
  - Password change terminates all existing sessions

## 5. Authorization and Access Control

### 5.1 Row-Level Security (RLS) Policies
Database-enforced access control:
- **Hierarchical Access**: Parent organizations can query child organization data
- **Horizontal Isolation**: Sibling organizations cannot access each other's data
- **No Bypass**: Application code cannot override RLS policies
- **Performance**: Materialized path arrays for efficient hierarchy queries
- **Audit**: All RLS policy evaluations logged

**RLS-Protected Tables**:
- `claims` - Claim submissions and grievances
- `profiles` - User personal information
- `organizations` - Organization hierarchy
- `financial_transactions` - Payment and remittance data
- `digital_signatures` - PKI signature records
- `collective_agreements` - CBA documents
- `arbitration_cases` - Arbitration proceedings
- `health_wellness_claims` - Health benefit claims

### 5.2 API Authorization
All API endpoints enforce authorization:
- **Bearer Tokens**: JWT tokens with user_id and organization_id claims
- **Scope Validation**: Endpoints validate required scopes
- **Rate Limiting**: 
  - 1000 requests/hour for authenticated users
  - 100 requests/hour for unauthenticated users
  - 10,000 requests/hour for service accounts
- **IP Allowlisting**: Optional for administrative APIs

### 5.3 Attribute-Based Access Control (ABAC)
Fine-grained access based on attributes:
- **User Attributes**: role, department, seniority, certification
- **Resource Attributes**: classification level, owner, age
- **Environmental Attributes**: time, location, device trust level
- **Policy Examples**:
  - Financial data requires `role=financial_officer` AND `mfa_verified=true`
  - Confidential CBAs require `clearance_level=high` OR `role=org_admin`
  - Remote access from unknown IPs requires MFA step-up

## 6. User Lifecycle Management

### 6.1 Provisioning (Onboarding)
1. **Request Submission**: 
   - New hire form submitted by HR or manager
   - Includes: name, email, department, role, start date
2. **Approval Workflow**: 
   - Manager approves access request
   - Organization admin reviews and grants permissions
3. **Account Creation**: 
   - Unique username assigned (email-based)
   - Temporary password generated (expires in 24 hours)
   - MFA enrollment required on first login
4. **Access Assignment**: 
   - Role-based permissions applied
   - Organization membership recorded
   - RLS policies automatically enforce access
5. **Welcome Email**: 
   - Login instructions sent
   - Links to training materials
   - Password reset instructions

**Timeline**: Account provisioned within 24 hours of approval

### 6.2 Modification (Changes)
1. **Access Review**: 
   - Quarterly review of user permissions by manager
   - Annual certification by organization admin
2. **Role Changes**: 
   - Promotion/demotion requests submitted via HR portal
   - Manager approval required
   - Permissions updated within 24 hours
3. **Department Transfers**: 
   - New manager approves transfer
   - Old access revoked, new access granted atomically
4. **Temporary Access**: 
   - Time-limited access for contractors/auditors
   - Automatic expiration (no manual cleanup required)
   - Extension requires re-approval

### 6.3 De-provisioning (Offboarding)
1. **Termination Trigger**: 
   - Termination date entered in HR system
   - Automated workflow initiated 7 days before termination
2. **Pre-termination**: 
   - Knowledge transfer scheduled
   - Data ownership transferred to manager
3. **Termination Day**: 
   - Account disabled immediately (no login)
   - Active sessions terminated
   - API keys revoked
   - MFA tokens invalidated
4. **Post-termination**: 
   - Account archived (not deleted) for audit purposes
   - Data ownership transferred
   - Access logs retained for 7 years
5. **Rehire Process**: 
   - Archived account reactivated (if within 2 years)
   - Access review and re-approval required

**Timeline**: Access revoked within 1 hour of termination

### 6.4 Emergency Access Revocation
Immediate access termination for:
- Security incidents (compromised account)
- Policy violations (unauthorized access)
- Disciplinary action
- Lost/stolen devices

**Procedure**:
1. Security team or org admin initiates emergency revocation
2. All sessions terminated immediately
3. Password reset required for re-access
4. Incident logged and reviewed

## 7. Privileged Access Management

### 7.1 Administrative Access
- **Just-in-Time (JIT) Access**: 
  - Elevated privileges granted for limited time (4 hours)
  - Approval required from two administrators
  - All actions logged with video recording (optional)
- **Break-Glass Access**: 
  - Emergency super-admin access for critical incidents
  - Requires physical security key
  - Alerts sent to all super-admins
  - Detailed justification required
- **Service Accounts**: 
  - Used for system integrations and cron jobs
  - API key-based authentication (no password)
  - Scoped to minimum required permissions
  - Rotated every 90 days

### 7.2 Database Access
- **Production Database**: 
  - No direct SQL access for developers
  - Read-only access for analysts (via approved tool)
  - Write access only for DBAs during maintenance windows
- **Database Credentials**: 
  - Stored in secrets manager (Azure Key Vault)
  - Rotated automatically every 30 days
  - Individual accounts (no shared credentials)
- **Query Logging**: 
  - All SQL queries logged with user attribution
  - Sensitive data queries flagged for review

### 7.3 Infrastructure Access
- **Server Access**: 
  - SSH access via bastion host only
  - SSH keys rotated every 90 days
  - No root login (sudo with logging)
- **Cloud Console Access**: 
  - MFA required for Azure/AWS console
  - Role-based IAM policies
  - CloudTrail/Azure Monitor logging enabled

## 8. Access Monitoring and Audit

### 8.1 Audit Logging
All access events logged:
- **Authentication Events**: Login, logout, MFA challenges, SSO, password changes
- **Authorization Events**: Permission checks, RLS policy evaluations, access denials
- **Data Access**: Queries, API calls, file downloads, report generation
- **Administrative Actions**: User provisioning, role changes, policy updates

**Log Retention**: 7 years for compliance

### 8.2 Real-Time Monitoring
Alerts triggered for:
- **Failed Login Attempts**: 5+ failures within 15 minutes
- **Privilege Escalation**: Unauthorized role change attempts
- **Bulk Data Export**: Large data downloads (>10,000 records)
- **Off-Hours Access**: Access from privileged accounts outside business hours
- **Geographic Anomalies**: Login from unexpected country/IP
- **API Abuse**: Rate limit violations

### 8.3 Access Reviews
- **Quarterly Reviews**: Managers review team member access
- **Annual Certification**: Organization admins certify all users
- **Orphaned Accounts**: Accounts with no activity for 180 days flagged for review
- **Excessive Permissions**: Users with >3 roles flagged for review

### 8.4 Compliance Reporting
Automated reports generated monthly:
- User access summary (by role, organization)
- Privileged account activity
- MFA enrollment status
- Access violations and incidents
- Stale account report

## 9. Physical Access Controls

### 9.1 Data Center Access
- **Authorization**: Only approved personnel with business need
- **Badge System**: RFID badges for entry/exit logging
- **Escort Policy**: Visitors must be escorted at all times
- **Surveillance**: 24/7 video monitoring with 90-day retention

### 9.2 Office Security
- **Badge Access**: Employees must badge in/out
- **Visitor Log**: All visitors registered with sponsor name
- **Clean Desk Policy**: Sensitive documents secured when unattended
- **Device Security**: Laptops locked with cable locks

### 9.3 Remote Work
- **VPN Required**: Remote access requires VPN connection
- **Trusted Devices**: Device compliance check before access
- **Public Wi-Fi**: Prohibited for accessing sensitive data
- **Physical Security**: Workstation must be in secure location (not public spaces)

## 10. Exceptions and Waivers

### 10.1 Exception Process
Exceptions to this policy may be granted:
1. **Request Submission**: Business justification and compensating controls documented
2. **Risk Assessment**: Security team evaluates risk
3. **Approval Required**: 
   - Manager approval for temporary exceptions (<30 days)
   - Security officer approval for extended exceptions (<1 year)
   - Executive approval for permanent exceptions
4. **Documentation**: Exception logged in compliance system
5. **Review**: Exceptions reviewed quarterly

### 10.2 Compensating Controls
If policy requirements cannot be met, compensating controls required:
- Enhanced monitoring and alerting
- Additional approval workflows
- Reduced access scope
- Time-limited access

## 11. Policy Enforcement

### 11.1 Compliance Monitoring
- **Automated Checks**: Daily scans for policy violations
- **Manual Reviews**: Quarterly access reviews by security team
- **Audits**: Annual third-party security audit

### 11.2 Violations
Policy violations result in:
- **First Offense**: Warning and mandatory security training
- **Second Offense**: Temporary access suspension (7 days)
- **Third Offense**: Permanent access revocation and disciplinary action
- **Severe Violations**: Immediate termination and legal action

### 11.3 Incident Response
Access-related incidents (unauthorized access, compromised credentials):
1. **Detection**: Alert triggered or manual report
2. **Containment**: Access revoked, sessions terminated
3. **Investigation**: Forensic analysis, log review
4. **Remediation**: Vulnerabilities patched, controls strengthened
5. **Post-Incident Review**: Lessons learned, policy updates

## 12. Training and Awareness

### 12.1 Mandatory Training
All users must complete:
- **Security Awareness Training**: Annual (2 hours)
- **Access Control Policy**: Annual review and acknowledgment
- **Role-Specific Training**: 
  - Administrators: Privileged access training (4 hours)
  - Financial officers: Data handling training (2 hours)
  - Managers: Access review procedures (1 hour)

### 12.2 Training Topics
- Password best practices
- Phishing recognition
- MFA enrollment
- Social engineering awareness
- Data classification
- Incident reporting

## 13. Related Policies

- **Data Classification Policy**: Defines data sensitivity levels
- **Incident Response Plan**: Procedures for security incidents
- **Encryption Standards**: Cryptographic requirements
- **Backup and Recovery Policy**: Data protection requirements
- **Acceptable Use Policy**: User behavior expectations

## 14. Policy Review and Updates

This policy is reviewed annually or when:
- Significant system changes occur
- New compliance requirements arise
- Security incidents reveal policy gaps
- Technology changes impact access control

**Next Review Date**: January 2026

## 15. Approval and Acknowledgment

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Chief Information Security Officer | [Name] | [Signature] | [Date] |
| Chief Technology Officer | [Name] | [Signature] | [Date] |
| Legal Counsel | [Name] | [Signature] | [Date] |

**Acknowledgment**: All users must acknowledge receipt and understanding of this policy upon hire and annually thereafter.

---

**Document Control**
- **Document ID**: POL-ACC-001
- **Version**: 1.0
- **Classification**: Internal Use Only
- **Location**: docs/compliance/policies/ACCESS_CONTROL_POLICY.md
- **Contact**: security@unionclaims.ca
