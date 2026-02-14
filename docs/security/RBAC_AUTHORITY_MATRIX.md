# RBAC Authority Matrix

**Version:** 1.0  
**Date:** February 14, 2026  
**Status:** Active  
**Review Cycle:** Quarterly  
**Next Review:** May 14, 2026  
**Owner:** Security Team

---

## Executive Summary

This document provides a comprehensive **Role-Based Access Control (RBAC) authority matrix** for the Union Eyes platform, defining permissions, privilege boundaries, and cross-role access patterns for enterprise security audits and compliance validation.

**Purpose:**
- Define formal permission boundaries for each role
- Document privilege escalation paths and controls
- Support SOC 2, ISO 27001, and union security requirements
- Provide test scenarios for boundary validation

**Role Hierarchy:**
```
admin (Level 4) - Full Control
  ↓
officer (Level 3) - Departmental Leadership
  ↓
steward (Level 2) - Member Management + Advocacy
  ↓
member (Level 1) - Self-Service Access
  ↓
viewer (Level 0) - Read-Only
```

---

## Role Definitions

### 1. Admin (Level 4)

**Description:** Highest privilege level with full system access. Reserved for union executive board, system administrators, and IT staff.

**Key Characteristics:**
- Full CRUD on all resources
- User role management
- System configuration access
- Financial oversight
- Cannot be restricted by department/jurisdiction boundaries

**Risk Classification:** CRITICAL  
**MFA Requirement:** ✅ Mandatory (FIDO2/WebAuthn recommended)  
**Session Timeout:** 15 minutes idle  
**Audit Requirements:** All actions logged with IP/location

---

### 2. Officer (Level 3)

**Description:** Departmental leadership with broad operational access. Union representatives, labor relations officers.

**Key Characteristics:**
- Department-scoped authority
- Cannot manage system settings
- Cannot modify admin users
- Can delegate to stewards
- May cross jurisdictions within organization

**Risk Classification:** HIGH  
**MFA Requirement:** ✅ Mandatory  
**Session Timeout:** 30 minutes idle  
**Audit Requirements:** Sensitive actions logged

---

### 3. Steward (Level 2)

**Description:** Member-facing representatives with advocacy and case management authority. Shop stewards, committee members.

**Key Characteristics:**
- Jurisdiction-scoped authority
- Member onboarding/management
- Case advocacy (claims, grievances)
- Limited financial visibility
- Cannot approve high-value transactions

**Risk Classification:** MEDIUM  
**MFA Requirement:** ⚠️ Recommended  
**Session Timeout:** 60 minutes idle  
**Audit Requirements:** Member data access logged

---

### 4. Member (Level 1)

**Description:** Standard union member with self-service access.

**Key Characteristics:**
- Self-service only (own profile, claims, votes)
- Cannot see other members
- Limited to active membership features
- Cannot access analytics

**Risk Classification:** LOW  
**MFA Requirement:** Optional (recommended for mobile)  
**Session Timeout:** 24 hours idle  
**Audit Requirements:** Login events only

---

### 5. Viewer (Level 0)

**Description:** Minimal read-only access for temporary or pending accounts.

**Key Characteristics:**
- Profile view only
- No functional access
- Used for account setup state
- Cannot view organization data

**Risk Classification:** VERY LOW  
**MFA Requirement:** None  
**Session Timeout:** 30 minutes idle  
**Audit Requirements:** Login events only

---

## Permission Matrix

### Legend
- ✅ **Full Access** (Create, Read, Update, Delete)
- 📖 **Read Only**
- 🔒 **Own Resource Only**
- ❌ **No Access**
- 🔐 **Restricted** (conditional access with approval)

---

### A. Member Management

| Permission | Admin | Officer | Steward | Member | Viewer |
|------------|-------|---------|---------|--------|--------|
| View all members | ✅ | ✅ | ✅ (jurisdiction) | ❌ | ❌ |
| View member profile | ✅ | ✅ | ✅ (jurisdiction) | 🔒 Self | 🔒 Self |
| Create member account | ✅ | ✅ | ✅ (invite only) | ❌ | ❌ |
| Edit member profile | ✅ | ✅ | 🔐 Require approval | 🔒 Self | ❌ |
| Deactivate member | ✅ | ✅ | 🔐 Request only | ❌ | ❌ |
| Delete member (hard) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | 🔐 Officer/Steward only | ❌ | ❌ | ❌ |
| View member dues history | ✅ | ✅ | 📖 Own jurisdiction | 🔒 Self | ❌ |
| Export member list | ✅ | ✅ (audit logged) | 📖 Own jurisdiction | ❌ | ❌ |
| Bulk import members | ✅ | ❌ | ❌ | ❌ | ❌ |

**Privilege Escalation Tests:**
- ❌ Steward cannot view members in other jurisdictions
- ❌ Member cannot enumerate other member IDs
- ❌ Officer cannot promote to admin

---

### B. Claims Management

| Permission | Admin | Officer | Steward | Member | Viewer |
|------------|-------|---------|---------|--------|--------|
| View all claims | ✅ | ✅ | ✅ (jurisdiction) | 🔒 Own | ❌ |
| Create claim | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit claim (before submission) | ✅ | ✅ | ✅ (if assigned) | 🔒 Own | ❌ |
| Edit claim (after submission) | ✅ | ✅ | 🔐 With justification | ❌ | ❌ |
| Delete claim | ✅ | ✅ | ❌ | 🔒 Own (draft only) | ❌ |
| Approve/Reject claim | ✅ | ✅ | 🔐 < $500 only | ❌ | ❌ |
| Assign claim to steward | ✅ | ✅ | ✅ (in jurisdiction) | ❌ | ❌ |
| View claim history/audit | ✅ | ✅ | 📖 Assigned claims | 🔒 Own | ❌ |
| Override claim decision | ✅ | 🔐 With admin approval | ❌ | ❌ | ❌ |
| Export claims report | ✅ | ✅ (audit logged) | 📖 Own jurisdiction | ❌ | ❌ |

**Privilege Escalation Tests:**
- ❌ Steward cannot approve claims > $500 without officer approval
- ❌ Member cannot modify claim after submission
- ❌ Officer cannot override admin rejection without second admin approval

---

### C. Voting / Governance

| Permission | Admin | Officer | Steward | Member | Viewer |
|------------|-------|---------|---------|--------|--------|
| Create vote | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit vote (before publish) | ✅ | ✅ (own votes) | ❌ | ❌ | ❌ |
| Publish vote | ✅ | 🔐 Require admin approval | ❌ | ❌ | ❌ |
| Close vote early | ✅ | ❌ | ❌ | ❌ | ❌ |
| View vote results (active) | ✅ | ✅ | 📖 No identifiable votes | 📖 Summary only | ❌ |
| View vote results (final) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export voter list | ✅ | 🔐 Anonymous only | ❌ | ❌ | ❌ |
| Cast vote | ✅ | ✅ | ✅ | ✅ | ❌ |
| Modify own vote | ✅ (before close) | ✅ (before close) | ✅ (before close) | ✅ (before close) | ❌ |
| View who voted (names) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit vote integrity | ✅ | 🔐 Request only | ❌ | ❌ | ❌ |

**Privilege Escalation Tests:**
- ❌ Officer cannot see individual member votes during active voting
- ❌ Admin cannot modify votes after casting (immutability enforced)
- ❌ Member cannot vote multiple times (DB unique constraint)

---

### D. Financial Management

| Permission | Admin | Officer | Steward | Member | Viewer |
|------------|-------|---------|---------|--------|--------|
| View GL accounts | ✅ | 📖 Summary only | ❌ | ❌ | ❌ |
| Post GL transaction | ✅ | 🔐 Require approval | ❌ | ❌ | ❌ |
| View strike fund balances | ✅ | ✅ | 📖 Aggregated only | ❌ | ❌ |
| Create strike fund | ✅ | 🔐 Require admin approval | ❌ | ❌ | ❌ |
| Approve strike fund disbursement | ✅ | 🔐 < $5,000 only | ❌ | ❌ | ❌ |
| Process refunds | ✅ | ❌ | ❌ | ❌ | ❌ |
| View member dues status | ✅ | ✅ | 📖 Own jurisdiction | 🔒 Self | ❌ |
| Modify payment records | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export financial reports | ✅ | 🔐 Aggregated only | ❌ | ❌ | ❌ |
| Configure payment methods | ✅ | ❌ | ❌ | 🔒 Self | ❌ |

**Privilege Escalation Tests:**
- ❌ Officer cannot approve disbursements > $5,000 without admin
- ❌ Steward cannot view individual member payment amounts
- ❌ No role can modify completed GL transactions (immutability)

---

### E. CBA / Document Management

| Permission | Admin | Officer | Steward | Member | Viewer |
|------------|-------|---------|---------|--------|--------|
| View CBA library | ✅ | ✅ | ✅ | 📖 Public docs only | ❌ |
| Upload CBA document | ✅ | ✅ | 🔐 Require approval | ❌ | ❌ |
| Edit CBA metadata | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete CBA document | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mark document confidential | ✅ | ✅ | ❌ | ❌ | ❌ |
| Share document externally | ✅ | 🔐 Public docs only | ❌ | ❌ | ❌ |
| View document access logs | ✅ | 📖 Own uploads | ❌ | ❌ | ❌ |

**Privilege Escalation Tests:**
- ❌ Steward cannot mark documents as public
- ❌ Officer cannot delete documents uploaded by admin
- ❌ Member cannot access confidential documents via direct URL

---

### F. Analytics / Reporting

| Permission | Admin | Officer | Steward | Member | Viewer |
|------------|-------|---------|---------|--------|--------|
| View dashboard (all metrics) | ✅ | ✅ | 📖 Jurisdiction only | ❌ | ❌ |
| View member demographics | ✅ | ✅ (anonymized) | 📖 Aggregated | ❌ | ❌ |
| View claim analytics | ✅ | ✅ | 📖 Own jurisdiction | 🔒 Self | ❌ |
| View financial analytics | ✅ | 📖 Summary only | ❌ | ❌ | ❌ |
| Export analytics data | ✅ (audit logged) | 🔐 Require justification | ❌ | ❌ | ❌ |
| Configure dashboard widgets | ✅ | 🔒 Own dashboard | 🔒 Own | ❌ | ❌ |
| View predictive analytics | ✅ | ✅ | ❌ | ❌ | ❌ |

**Privilege Escalation Tests:**
- ❌ Officer cannot export raw member data
- ❌ Steward cannot view financial trend data
- ❌ Member cannot access organizational analytics

---

### G. System Administration

| Permission | Admin | Officer | Steward | Member | Viewer |
|------------|-------|---------|---------|--------|--------|
| Manage organization settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure integrations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage API keys | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit logs (all) | ✅ | 📖 Own actions | 📖 Own actions | 📖 Own actions | ❌ |
| Configure email templates | ✅ | 🔐 Preview only | ❌ | ❌ | ❌ |
| Manage webhooks | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure SSO | ✅ | ❌ | ❌ | ❌ | ❌ |
| Impersonate user (support) | ✅ (audit logged) | ❌ | ❌ | ❌ | ❌ |

**Privilege Escalation Tests:**
- ❌ Officer cannot access API keys
- ❌ No role can delete audit logs
- ❌ Admin impersonation requires second admin approval

---

## Cross-Role Access Patterns

### Delegation Workflows

**Officer → Steward Delegation:**
- Officer assigns claim to steward
- Steward inherits case context (not full officer rights)
- Steward can request officer approval for actions outside scope
- Delegation logged in audit trail

**Admin → Officer Support Access:**
- Admin can temporarily grant officer-level access for troubleshooting
- Temporary access auto-expires in 60 minutes
- All actions taken during elevated access logged separately

---

## Privilege Escalation Controls

### Vertical Escalation Prevention

**Controls:**
- Role stored in `organization_members` table (not user-modifiable)
- RLS policies filter queries by `current_user_role()`
- Role verification on every protected API route
- JWT claims signed by Clerk (tamper-proof)

**Attack Scenarios Tested:**
1. ❌ Member modifies JWT role claim → Signature verification fails
2. ❌ Steward calls `/api/admin/*` endpoint → 403 Forbidden
3. ❌ Officer updates own role in DB → RLS prevents UPDATE

### Horizontal Escalation Prevention

**Controls:**
- Organization ID scoping on all queries
- Jurisdiction filtering for steward role
- IDOR protection via RLS policies

**Attack Scenarios Tested:**
1. ❌ Steward accesses member in different jurisdiction → RLS filters row
2. ❌ Member queries `/api/members?userId=otherUserId` → Returns 404
3. ❌ Officer accesses different organization's data → RLS filters all rows

---

## Compliance Mapping

### SOC 2 Requirements

| Control | Matrix Section | Implementation |
|---------|----------------|----------------|
| CC6.1 - Least Privilege | All sections | Role hierarchy enforced |
| CC6.2 - Segregation of Duties | Financial Management | Multi-approval for high-value |
| CC6.3 - Access Reviews | Admin section | Quarterly role audits |
| CC7.2 - System Monitoring | System Administration | All admin actions logged |

### ISO 27001:2022 Requirements

| Control | Annex Reference | Matrix Section |
|---------|----------------|----------------|
| A.5.15 - Access Control | 9.1 | All permission tables |
| A.5.18 - Access Rights | 9.2 | Privilege escalation section |
| A.8.2 - Privileged Access | 9.4 | Admin permission restrictions |

### Union-Specific Requirements

| Requirement | Source | Implementation |
|-------------|--------|----------------|
| Election Integrity | LMRDA §401 | Voting permissions - Admin cannot modify votes |
| Financial Transparency | LMRDA §201 | Officer/Steward cannot export member-level financial data |
| Member Privacy | Provincial laws | Member role cannot see other members |

---

## Testing Requirements

### Automated Tests

**RBAC Test Suite:** `__tests__/lib/auth/rbac-server.test.ts`

**Coverage:**
- ✅ Role hierarchy enforcement (36 tests)
- ✅ Permission boundary validation
- ✅ Cross-organization isolation
- ✅ Privilege escalation prevention
- ⚠️ Delegation workflow tests (recommended)
- ⚠️ Temporary access expiry (recommended)

### Manual Verification (Annual)

**Checklist:**
1. Attempt admin action as officer → Expect 403
2. Attempt to view another org's data → Expect 404
3. Attempt to modify immutable records → Expect DB error
4. Bulk export as non-admin → Verify no PII exposed
5. Token replay attack → Verify expiration honored

---

## Role Assignment Workflow

### Initial Assignment

**Admin Creation:**
- Requires manual approval from platform owner
- Email verification + government ID check
- MFA mandatory from first login

**Officer Creation:**
- Admin assigns role via admin panel
- Automatic email invitation
- Require password change on first login

**Steward Creation:**
- Admin or Officer assigns role
- Jurisdiction must be specified
- MFA recommended notification sent

**Member Creation:**
- Self-registration enabled (with org invite code)
- Auto-assigned member role
- Email verification required before access

### Role Changes

**Promotion:**
- Admin-only action
- Requires justification (audit logged)
- Previous role retained in audit history

**Demotion:**
- Admin-only action
- Requires confirmation (prevent accidental click)
- Notification sent to affected user

**Role Removal:**
- Soft-delete (user marked inactive)
- Access immediately revoked
- Data retained for audit (per retention policy)

---

## Emergency Procedures

### Compromised Admin Account

**Response:**
1. Platform owner revokes admin role (via direct DB access)
2. Force logout all sessions for user
3. Review audit logs for unauthorized actions
4. Reset credentials + require new MFA enrollment
5. Incident report filed

### Mass Privilege Escalation Attack

**Detection:**
- Monitoring alerts on rapid role changes
- Audit log anomaly detection (>10 role changes in 5 minutes)

**Response:**
1. Freeze all role modifications
2. Review last 24 hours of role changes
3. Rollback unauthorized changes
4. Force re-authentication for all admins
5. Security review of auth pipeline

---

## Appendix A: API Route Authorization Map

| Endpoint Pattern | Required Role | Additional Checks |
|------------------|---------------|-------------------|
| `/api/admin/*` | admin | None |
| `/api/members` | officer+ | Jurisdiction filter for steward |
| `/api/claims/[id]` | member+ | Ownership or assignment check |
| `/api/votes/[id]/results` | member+ (after close) | Public votes only for member |
| `/api/analytics/*` | officer+ | Data anonymization for officer |
| `/api/financials/*` | admin | None |
| `/api/profile` | member+ | Self-service only |

---

## Appendix B: RLS Policy Summary

| Table | RLS Enabled | Policy Logic |
|-------|-------------|--------------|
| `members` | ✅ | Filter by organizationId + jurisdiction (for steward) |
| `claims` | ✅ | Ownership or assigned steward/officer |
| `votes` | ✅ | Organization membership |
| `vote_ballots` | ✅ | Own ballot only (memberId = current_user()) |
| `gl_transactions` | ✅ | Admin only |
| `audit_logs` | ✅ | Admin sees all, others see own actions |
| `organizations` | ✅ | Current organization only |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-14 | Security Team | Initial authority matrix |

---

## Approval

**Prepared by:** Security Engineering Team  
**Reviewed by:** CTO / VP Engineering  
**Approved for:** SOC 2 Audit, ISO 27001 Certification, Union Security Compliance  

**Next Review:** May 14, 2026 (Quarterly)
