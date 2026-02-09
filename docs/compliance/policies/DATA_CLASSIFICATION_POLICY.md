# Data Classification Policy

**Document Version:** 1.0  
**Effective Date:** January 2025  
**Owner:** Security Team  
**Review Schedule:** Annual  
**SOC-2 Controls:** CC6.1, A1.2

## 1. Purpose and Scope

### 1.1 Purpose

This Data Classification Policy establishes a framework for categorizing data based on sensitivity, confidentiality, and regulatory requirements. Proper classification ensures appropriate security controls are applied to protect union member data, financial information, and operational records.

### 1.2 Scope

This policy applies to:

- All data created, stored, processed, or transmitted by the system
- All data formats (electronic, paper, verbal)
- All organizational levels (CLC, federations, unions, locals)
- All users (employees, contractors, partners)
- All lifecycle stages (creation, storage, use, sharing, destruction)

## 2. Classification Levels

### 2.1 Classification Framework

```
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC                                                     │
│  ↓ No harm from disclosure                                 │
│  Examples: Marketing materials, public CBAs                │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  INTERNAL                                                   │
│  ↓ Minimal harm from disclosure                            │
│  Examples: Org policies, training materials                │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  CONFIDENTIAL                                               │
│  ↓ Significant harm from disclosure                        │
│  Examples: Member data, draft CBAs, financial data         │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  RESTRICTED                                                 │
│  ↓ Severe harm from disclosure (legal/regulatory impact)   │
│  Examples: SIN, health records, grievance details          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 PUBLIC Data

**Definition**: Information intended for public disclosure or that poses no risk if disclosed.

**Examples**:

- Public website content
- Marketing materials and brochures
- Press releases and announcements
- Ratified collective agreements (after publication)
- Public event schedules
- Job postings
- Educational resources (publicly available)
- Organization directory (public contacts)

**Handling Requirements**:

- No encryption required
- No access controls required
- Can be shared with anyone
- Standard backup retention

**Marking**: "PUBLIC" or no marking required

### 2.3 INTERNAL Data

**Definition**: Information intended for internal use that could cause minimal harm if disclosed.

**Examples**:

- Internal policies and procedures
- Organization charts (non-sensitive)
- Meeting minutes (general)
- Training materials (internal use)
- Internal communications (non-confidential)
- Vendor contracts (non-financial terms)
- Operational metrics (non-sensitive)

**Handling Requirements**:

- Encryption in transit (HTTPS)
- Access limited to authenticated users
- Standard backup retention (7 years)
- Can be shared with organization members

**Marking**: "INTERNAL USE ONLY"

### 2.4 CONFIDENTIAL Data

**Definition**: Sensitive information that could cause significant harm to individuals or the organization if disclosed.

**Examples**:

- **Member Personal Information**:
  - Full names and contact details
  - Employment information (employer, job title, seniority)
  - Union membership status and history
  - Dues payment records
  - Benefit enrollment information
  - Emergency contacts
- **Financial Information**:
  - Per-capita remittance amounts
  - Organization financial statements
  - Budget forecasts
  - Payment processing records
  - Bank account details (masked)
  - Dues collection records
- **Operational Data**:
  - Draft collective agreements (pre-ratification)
  - Bargaining strategies
  - Organizing campaign plans
  - Internal election results (before publication)
  - Grievance summaries (anonymized)
  - Arbitration strategies
- **Administrative Data**:
  - Employee performance reviews
  - Salary information
  - Vendor pricing (competitive)
  - Legal opinions (non-privileged)

**Handling Requirements**:

- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Access limited by role and organization hierarchy (RLS)
- MFA required for remote access
- Audit logging mandatory
- 7-year retention
- Secure deletion when no longer needed
- Data loss prevention (DLP) monitoring
- Cannot be shared externally without encryption

**Marking**: "CONFIDENTIAL - [Organization Name]"

### 2.5 RESTRICTED Data

**Definition**: Highly sensitive information that could cause severe harm (legal, financial, reputational) if disclosed. Subject to regulatory protection.

**Examples**:

- **Protected Personal Information (PII)**:
  - Social Insurance Numbers (SIN)
  - Driver's license numbers
  - Passport numbers
  - Date of birth combined with SIN
  - Banking information (unmasked)
  - Credit card numbers
- **Health Information (PHI)**:
  - Medical records
  - Disability information
  - Health and wellness claims
  - Drug prescriptions
  - Mental health records
  - Workers' compensation claims (detailed)
- **Legal/Sensitive Records**:
  - Individual grievance files (detailed)
  - Disciplinary records
  - Harassment/discrimination complaints
  - Arbitration evidence (pre-hearing)
  - Legal privilege communications
  - Investigation files
  - Settlement agreements (confidential)
- **Security Information**:
  - Passwords and encryption keys
  - Security audit findings
  - Penetration test reports
  - Vulnerability assessments
  - Incident response plans (detailed)

**Handling Requirements**:

- Encryption in transit (TLS 1.3 with certificate pinning)
- Encryption at rest (AES-256 with HSM-managed keys)
- Access limited to specific individuals (need-to-know basis)
- MFA mandatory (hardware token preferred)
- All access logged and monitored
- Data masking when displayed
- Cannot be exported without approval
- Minimum 10-year retention (or per legal requirement)
- Secure destruction (cryptographic erasure)
- DLP blocking external sharing
- Watermarking on printed documents
- Separate database schemas with enhanced RLS

**Marking**: "RESTRICTED - AUTHORIZED PERSONNEL ONLY"

## 3. Data Classification by System Component

### 3.1 Database Tables

| Table Name | Classification | Rationale |
|------------|---------------|-----------|
| `profiles` | RESTRICTED | Contains SIN, DOB, health info |
| `claims` | CONFIDENTIAL | Member grievances, personal issues |
| `organizations` | INTERNAL | Org structure (public info) |
| `collective_agreements` | CONFIDENTIAL | Draft CBAs, bargaining strategies |
| `financial_transactions` | CONFIDENTIAL | Payment records, dues |
| `digital_signatures` | CONFIDENTIAL | Signature records with audit trails |
| `health_wellness_claims` | RESTRICTED | PHI, medical records |
| `arbitration_cases` | CONFIDENTIAL | Case details, strategies |
| `disciplinary_records` | RESTRICTED | Employee discipline, investigations |
| `per_capita_remittances` | CONFIDENTIAL | Financial amounts, member counts |
| `election_results` | INTERNAL | Public after certification |
| `training_materials` | INTERNAL | Educational content |

### 3.2 File Storage

| Storage Location | Default Classification |
|-----------------|----------------------|
| `/public` | PUBLIC |
| `/documents/internal` | INTERNAL |
| `/documents/cbas` | CONFIDENTIAL |
| `/documents/grievances` | CONFIDENTIAL |
| `/documents/medical` | RESTRICTED |
| `/backups` | Inherits from source data |
| `/logs` | CONFIDENTIAL (may contain PII) |
| `/exports` | Inherits from source data |

### 3.3 API Endpoints

| Endpoint Pattern | Typical Data Classification |
|-----------------|----------------------------|
| `/api/public/*` | PUBLIC |
| `/api/auth/*` | RESTRICTED (credentials) |
| `/api/members/*` | CONFIDENTIAL |
| `/api/claims/*` | CONFIDENTIAL |
| `/api/financial/*` | CONFIDENTIAL |
| `/api/admin/*` | CONFIDENTIAL |
| `/api/health/*` | RESTRICTED |
| `/api/reports/*` | CONFIDENTIAL |

## 4. Data Handling Requirements by Classification

### 4.1 Storage Requirements

| Classification | Encryption at Rest | Access Controls | Backup Frequency | Retention Period |
|----------------|-------------------|-----------------|------------------|------------------|
| PUBLIC | No | Open | Daily | 7 years |
| INTERNAL | Yes (provider-managed) | Authenticated users | Daily | 7 years |
| CONFIDENTIAL | Yes (AES-256) | RBAC + RLS | Hourly | 7-10 years |
| RESTRICTED | Yes (AES-256 + HSM) | ABAC + RLS + MFA | Hourly | 10+ years |

### 4.2 Transmission Requirements

| Classification | Encryption in Transit | Allowed Channels | External Sharing |
|----------------|----------------------|------------------|------------------|
| PUBLIC | Optional | Any | Allowed |
| INTERNAL | TLS 1.2+ | Email, HTTPS | With NDA |
| CONFIDENTIAL | TLS 1.3 | Secure email, HTTPS, SFTP | Encrypted only |
| RESTRICTED | TLS 1.3 + Cert Pinning | Secure portal only | Approval required |

### 4.3 Display and Printing

| Classification | Screen Display | Printing | Watermarking |
|----------------|---------------|----------|--------------|
| PUBLIC | Unrestricted | Unrestricted | No |
| INTERNAL | Authenticated users | Unrestricted | No |
| CONFIDENTIAL | Role-based | Logged | Optional |
| RESTRICTED | Masked by default | Requires approval | Mandatory |

**Masking Requirements (RESTRICTED)**:

- SIN: Show last 3 digits only (XXX-XXX-123)
- Credit card: Show last 4 digits (XXXX-XXXX-XXXX-1234)
- Bank account: Show last 4 digits (XXXXXX1234)
- Date of birth: Show year only (XXXX-XX-01)
- Full name: Show initials when listing (J. D.)

### 4.4 Sharing and Collaboration

| Classification | Internal Sharing | External Sharing | Email Allowed |
|----------------|-----------------|------------------|---------------|
| PUBLIC | Yes | Yes | Yes |
| INTERNAL | Yes (org members) | With NDA | Yes |
| CONFIDENTIAL | Yes (role-based) | Encrypted only | Encrypted email only |
| RESTRICTED | Approval required | Exceptional, encrypted | No (portal only) |

**External Sharing Procedures**:

1. **CONFIDENTIAL Data**:
   - Encrypt with AES-256 (password-protected)
   - Share password via separate channel
   - NDA required from recipient
   - Log all external shares
2. **RESTRICTED Data**:
   - Privacy officer approval required
   - Legal review for compliance (PIPEDA, provincial privacy laws)
   - Secure portal sharing only (no email)
   - Time-limited access (auto-expire)
   - Watermarked documents
   - Log all accesses

### 4.5 Disposal and Destruction

| Classification | Digital Destruction | Paper Destruction | Verification |
|----------------|---------------------|-------------------|--------------|
| PUBLIC | Standard deletion | Recycle | No |
| INTERNAL | Overwrite once | Shred | No |
| CONFIDENTIAL | Cryptographic erasure | Cross-cut shred | Log destruction |
| RESTRICTED | Cryptographic erasure + verify | Cross-cut shred + certificate | Certificate required |

**Cryptographic Erasure**: Delete encryption keys, making data unrecoverable.

## 5. Personal Information (PIPEDA Compliance)

### 5.1 PIPEDA Principles

The system complies with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA):

1. **Accountability**: Organization responsible for all PII under its control
2. **Identifying Purposes**: Purpose for collection identified before or at time of collection
3. **Consent**: User consent obtained for collection, use, or disclosure
4. **Limiting Collection**: Only data necessary for identified purposes collected
5. **Limiting Use, Disclosure, Retention**: Used only for purposes consented to
6. **Accuracy**: PII accurate, complete, and up-to-date
7. **Safeguards**: Protected with security appropriate to sensitivity
8. **Openness**: Privacy practices documented and accessible
9. **Individual Access**: Individuals can access and correct their data
10. **Challenging Compliance**: Individuals can challenge compliance

### 5.2 PII Categories

**Basic PII** (CONFIDENTIAL):

- Name, address, phone, email
- Employment information
- Union membership status

**Sensitive PII** (RESTRICTED):

- SIN, driver's license, passport
- Date of birth (when combined with other PII)
- Banking/financial information
- Health information (PHI)
- Biometric data
- Indigenous status
- Sexual orientation, gender identity
- Disability information
- Genetic information

### 5.3 Consent Management

- **Explicit Consent**: Required for RESTRICTED PII (opt-in)
- **Implied Consent**: Acceptable for CONFIDENTIAL PII in employment context
- **Withdrawal**: Users can withdraw consent anytime (system provides self-service)
- **Record Keeping**: All consent records retained for 7 years

### 5.4 Data Subject Rights

Users have the right to:

1. **Access**: Request copy of their personal data (within 30 days)
2. **Correction**: Request correction of inaccurate data (within 14 days)
3. **Deletion**: Request deletion of data (exceptions for legal retention)
4. **Portability**: Receive data in machine-readable format (JSON/CSV)
5. **Object**: Object to processing for marketing purposes

**Implementation**:

- Self-service data download portal
- Privacy request ticketing system
- 30-day SLA for access requests
- 14-day SLA for correction requests

## 6. Special Data Types

### 6.1 Financial Data

- **Per-Capita Remittances**: CONFIDENTIAL
  - Organization-level aggregates (member counts, amounts)
  - Cannot be traced to individual members
  - 10-year retention for audit purposes
- **Dues Payments**: CONFIDENTIAL
  - Individual payment records
  - Linked to member profiles
  - 7-year retention per CRA requirements
- **Credit Card Data**: RESTRICTED (PCI-DSS Scope)
  - Never stored in full (tokenized by Stripe)
  - Last 4 digits stored for display
  - CVV never stored

### 6.2 Health Information (PHI)

- **Classification**: RESTRICTED
- **Regulatory Compliance**: Subject to provincial health information acts (e.g., PHIPA in Ontario)
- **Handling**:
  - Separate database schema (`health_wellness_claims`)
  - Enhanced RLS policies (individual-level access only)
  - Audit logging mandatory
  - Minimum 10-year retention (per provincial requirements)
  - Cannot be disclosed without consent (except as required by law)

### 6.3 Grievance and Disciplinary Records

- **Grievances**: CONFIDENTIAL (member identity protected)
  - Can be anonymized for precedent database
  - 7-year retention per arbitration standards
- **Disciplinary Records**: RESTRICTED
  - Access limited to HR and management
  - 10-year retention per labour relations standards
  - Subject to disclosure obligations in arbitration

### 6.4 Legal Documents

- **Collective Agreements**:
  - Draft: CONFIDENTIAL (bargaining strategy)
  - Ratified: INTERNAL (shared with members)
  - Public (archived): PUBLIC
- **Legal Opinions**: CONFIDENTIAL (solicitor-client privilege)
- **Arbitration Materials**:
  - Pre-hearing: CONFIDENTIAL
  - Post-award: INTERNAL (shared with parties)

### 6.5 Audit Logs

- **Classification**: CONFIDENTIAL (may contain PII in activity logs)
- **Contents**:
  - User IDs, IP addresses, user agents
  - Actions performed, timestamps
  - Data accessed (table/row IDs)
  - Query patterns (may reveal sensitive info)
- **Retention**: 7 years (immutable)
- **Access**: Security team, auditors, compliance officers only

## 7. Classification Process

### 7.1 Data Owner Responsibilities

Every dataset must have a designated **Data Owner**:

- **Executives**: Organization-wide datasets
- **Department Heads**: Department-specific datasets
- **Product Managers**: Application datasets

**Data Owner Duties**:

1. **Classify Data**: Determine initial classification level
2. **Review Classification**: Annual review or when data changes
3. **Approve Access**: Approve access requests for RESTRICTED data
4. **Incident Response**: Lead response for data breaches
5. **Training**: Ensure team understands classification

### 7.2 Classification Workflow

```
┌─────────────────────────────────────────┐
│  1. Data Creator/Owner Identifies Data  │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  2. Apply Classification Criteria       │
│     - Regulatory requirements           │
│     - Sensitivity assessment            │
│     - Business impact analysis          │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  3. Assign Classification Level         │
│     PUBLIC → INTERNAL → CONFIDENTIAL    │
│     → RESTRICTED                        │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  4. Apply Security Controls             │
│     - Encryption                        │
│     - Access controls                   │
│     - Audit logging                     │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  5. Mark Data with Classification       │
│     - Database tags                     │
│     - File metadata                     │
│     - Document headers/footers          │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  6. Monitor and Review Annually         │
└─────────────────────────────────────────┘
```

### 7.3 Classification Decision Tree

```
Is this data subject to regulatory protection (PIPEDA, PHIPA, etc.)?
├─ YES → RESTRICTED (minimum)
└─ NO → Continue

Does disclosure pose legal/financial risk?
├─ YES → RESTRICTED
└─ NO → Continue

Does this data contain member PII or financial details?
├─ YES → CONFIDENTIAL
└─ NO → Continue

Is this data intended for organization-wide use only?
├─ YES → INTERNAL
└─ NO → PUBLIC
```

### 7.4 Reclassification

Data classification may be upgraded or downgraded:

**Upgrade Scenarios** (more restrictive):

- Regulatory change (new privacy law)
- Security incident (breach of similar data)
- Business impact reassessment

**Downgrade Scenarios** (less restrictive):

- Public disclosure (CBA ratification)
- Anonymization (grievance precedents)
- Expiration of confidentiality period

**Reclassification Process**:

1. Data owner proposes reclassification
2. Security team reviews and approves
3. Controls updated within 48 hours
4. All users notified of change

## 8. Implementation

### 8.1 Technical Controls

**Database-Level Classification**:

```sql
-- Classification tags stored in metadata
CREATE TABLE data_classifications (
  table_name TEXT PRIMARY KEY,
  classification_level TEXT NOT NULL CHECK (
    classification_level IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')
  ),
  data_owner TEXT NOT NULL,
  review_date DATE NOT NULL,
  notes TEXT
);

-- Column-level classification for mixed tables
CREATE TABLE column_classifications (
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  classification_level TEXT NOT NULL,
  pii_type TEXT, -- 'basic_pii', 'sensitive_pii', 'phi', etc.
  PRIMARY KEY (table_name, column_name)
);
```

**Application-Level Enforcement**:

- Data classification checked before rendering
- RESTRICTED fields masked by default
- Export functionality respects classification
- DLP rules block external sharing of CONFIDENTIAL/RESTRICTED data

### 8.2 User Training

All users receive classification training:

- **General Staff**: 1-hour annual training
  - Classification levels explained
  - Handling requirements
  - Incident reporting
- **Developers/Admins**: 2-hour training
  - Technical controls
  - Classification implementation
  - Secure coding practices
- **Data Owners**: 4-hour training
  - Classification criteria
  - Risk assessment
  - Approval processes

## 9. Compliance and Enforcement

### 9.1 Violations

Classification violations result in:

- **First Offense**: Retraining and written warning
- **Second Offense**: Access suspension (30 days)
- **Third Offense**: Termination

**Severe Violations** (immediate termination):

- Intentional misclassification to evade controls
- Unauthorized disclosure of RESTRICTED data
- Disabling classification controls

### 9.2 Audit and Monitoring

- **Quarterly Audits**: Sample 10% of datasets for correct classification
- **Annual Certification**: Data owners certify all classifications
- **Continuous Monitoring**: DLP alerts for classification violations

## 10. Related Policies

- **Access Control Policy**: Enforces classification-based access
- **Encryption Standards**: Implements required encryption
- **Incident Response Plan**: Handles data breaches
- **Backup and Recovery Policy**: Protects classified data

## 11. Policy Review

Reviewed annually or when:

- New privacy regulations enacted
- Significant data breach occurs
- New data types introduced

**Next Review Date**: January 2026

---

**Document Control**

- **Document ID**: POL-CLS-002
- **Version**: 1.0
- **Classification**: INTERNAL USE ONLY
- **Location**: docs/compliance/policies/DATA_CLASSIFICATION_POLICY.md
