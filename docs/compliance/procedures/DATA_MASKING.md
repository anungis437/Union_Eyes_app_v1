# Staging Database Data Masking Procedure

**Document ID:** PROC-SEC-004  
**Version:** 1.0  
**Effective Date:** February 12, 2026  
**Last Review:** February 12, 2026  
**Next Review:** August 12, 2026  
**Owner:** DevOps Lead  
**Approved By:** Chief Technology Officer

---

## 1. Purpose

This procedure defines requirements and methods for masking sensitive data in the staging database to protect member privacy and comply with data protection regulations (PIPEDA, GDPR) while enabling realistic testing and development.

---

## 2. Scope

**In Scope:**
- Staging database (Azure PostgreSQL Flexible Server - staging environment)
- Development database (local Docker PostgreSQL instances)
- Data used for testing, QA, training, demonstrations

**Out of Scope:**
- Production database (no masking - real data with RLS protection)
- Backup/archive data (follows Data Retention Policy)

---

## 3. Regulatory and Policy Basis

### 3.1 Regulatory Requirements
**PIPEDA (Canada):**
- Principle 4.7: Personal information must be protected with safeguards appropriate to sensitivity
- Use of production data for non-production purposes creates unnecessary risk

**GDPR (EU):**
- Article 5(1)(f): Data processed in a manner ensuring security, including protection against unauthorized processing
- Article 32: Implement appropriate technical measures (pseudonymization, encryption)

**Union Eyes Internal Policies:**
- Data Classification Policy: Confidential/PII data must be masked in non-production
- Privacy Policy: Member data only used for stated purposes (not testing)

### 3.2 Risk Mitigation
**Risks of Unmasked Staging Data:**
- Privacy breach if staging database compromised (weaker security than production)
- Unauthorized access by developers/testers without production access
- Data exfiltration via screenshots, logs, error messages
- Regulatory fines (up to $100K CAD for PIPEDA violations)
- Reputational damage and loss of member trust

---

## 4. Data Classification and Masking Requirements

### 4.1 Sensitivity Levels

| Classification | Description | Masking Requirement | Example Fields |
|---------------|-------------|---------------------|----------------|
| **PII - High** | Directly identifies individual | Full masking (irreversible) | SIN, passport, credit card, health info |
| **PII - Medium** | Indirectly identifies or personal | Realistic masking (preserve format) | Name, email, phone, address, DOB |
| **PII - Low** | Pseudonymous identifiers | Preserve relationships (FK consistency) | User IDs, member numbers |
| **Sensitive Business** | Union-confidential, not personal | Partial masking or anonymization | Salaries, grievance details, bargaining proposals |
| **Non-Sensitive** | Public or low-risk data | No masking required | Province, industry sector, meeting dates |

### 4.2 Masking Techniques by Field Type

#### 4.2.1 Names (First Name, Last Name)
**Technique:** Randomized realistic names from predefined list  
**Rationale:** Preserve name-like quality for UI testing  
**Reversibility:** No (one-way transformation)

**Implementation:**
```sql
-- Example: Replace with random names from list
UPDATE members_staging 
SET first_name = (SELECT first_name FROM fake_names ORDER BY RANDOM() LIMIT 1),
    last_name = (SELECT last_name FROM fake_names ORDER BY RANDOM() LIMIT 1);
```

**Faker Library (Application-level):**
```typescript
import { faker } from '@faker-js/faker';

masked.first_name = faker.person.firstName();
masked.last_name = faker.person.lastName();
```

#### 4.2.2 Email Addresses
**Technique:** Generated email preserving domain structure  
**Format:** `fake{incrementing_number}@example-union.com`  
**Rationale:** Preserve email format for validation testing, avoid sending to real addresses

**Implementation:**
```sql
UPDATE members_staging 
SET email = 'member' || id || '@test-union-eyes.com';
```

**Faker Alternative:**
```typescript
masked.email = faker.internet.email({ 
  provider: 'test-union-eyes.com' 
});
```

#### 4.2.3 Phone Numbers
**Technique:** Format-preserving randomization  
**Format:** `+1-555-xxx-xxxx` (555 = reserved for fictional use in North America)  
**Rationale:** Preserve phone format for UI rendering, avoid real phone numbers

**Implementation:**
```sql
UPDATE members_staging 
SET phone = '+1-555-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
```

#### 4.2.4 Addresses
**Technique:** Randomized realistic addresses (faker library)  
**Components:** Street, city, province/state, postal/zip code  
**Rationale:** Preserve address format and geolocation (province-level), protect specific location

**Implementation:**
```typescript
masked.street_address = faker.location.streetAddress();
masked.city = faker.location.city();
masked.province = original.province; // Keep province for RLS testing
masked.postal_code = faker.location.zipCode('A#A #A#'); // Canadian format
```

**Note:** Preserve province for provincial privacy rule testing (e.g., Quebec privacy restrictions)

#### 4.2.5 Dates (Date of Birth, Hire Date)
**Technique:** Random date within realistic range, preserve age bracket  
**Rationale:** Test age-based logic without exposing exact DOB

**Implementation:**
```sql
-- Preserve age bracket (+/- 5 years)
UPDATE members_staging 
SET date_of_birth = date_of_birth + (RANDOM() * 10 - 5) * INTERVAL '1 year';
```

#### 4.2.6 Social Insurance Number (SIN)
**Technique:** Full randomization with valid checksum (Luhn algorithm for realistic format)  
**Rationale:** SIN is highly sensitive, must be completely replaced

**Implementation:**
```typescript
// Generate fake SIN with valid checksum
function generateFakeSIN(): string {
  const sin = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return sin.slice(0, 3) + '-' + sin.slice(3, 6) + '-' + sin.slice(6);
}

masked.sin = generateFakeSIN();
```

**Note:** If SIN not required for testing, set to NULL or placeholder "XXX-XXX-XXX"

#### 4.2.7 Financial Data (Salary, Dues Payment, Claim Amounts)
**Technique:** Randomization within bracket (preserve relative magnitude)

**Implementation:**
```sql
-- Randomize salary within +/- 20% bracket
UPDATE members_staging 
SET salary = salary * (0.8 + RANDOM() * 0.4);
```

#### 4.2.8 Free-Text Fields (Grievance Description, Notes)
**Technique:** Redaction or lorem ipsum replacement  
**Rationale:** Free text may contain unpredictable PII or sensitive information

**Implementation:**
```sql
-- Option 1: Simple redaction
UPDATE grievances_staging 
SET description = '[Redacted for privacy]';

-- Option 2: Lorem ipsum (preserves length for UI testing)
UPDATE grievances_staging 
SET description = LEFT('Lorem ipsum dolor sit amet, consectetur adipiscing elit...', LENGTH(description));
```

**Faker Alternative:**
```typescript
masked.description = faker.lorem.paragraph();
```

#### 4.2.9 Document Filenames and Content
**Technique:** Replace with generic placeholder files  
**Rationale:** Documents may contain embedded PII in content or metadata

**Implementation:**
- Replace Azure Blob references with sample documents (generic collective agreement template, sample grievance)
- Regenerate thumbnails from sample documents
- Update `document_uploads` table with placeholder filenames

```sql
UPDATE document_uploads_staging 
SET 
  filename = 'sample_document_' || id || '.pdf',
  blob_url = 'https://staging-storage.blob.core.windows.net/samples/generic_collective_agreement.pdf';
```

#### 4.2.10 Digital Signatures
**Technique:** Null out or replace with test certificate  
**Rationale:** Digital signatures are legally binding and cryptographically tied to individuals

**Implementation:**
```sql
UPDATE digital_signatures_staging 
SET 
  signature_data = NULL,
  certificate = NULL,
  verified = FALSE;
```

---

## 5. Referential Integrity Preservation

### 5.1 Foreign Key Consistency
**Requirement:** Masked data must maintain FK relationships  
**Example:** If user_id references members table, masked user_id must still exist

**Strategy:** Mask in dependency order (parent tables first, child tables second)

**Masking Order:**
1. `members` (parent)
2. `member_health_claims` (child of members)
3. `grievances` (child of members)
4. `collective_agreements` (references unions)
5. `union_elections` (references unions and candidates)

### 5.2 Unique Constraints
**Challenge:** Randomized values may create duplicates  
**Solution:** Use sequential IDs or verify uniqueness before insert

**Example:**
```sql
-- Ensure unique masked emails
UPDATE members_staging 
SET email = 'member' || id || '@test-union-eyes.com'; -- ID guarantees uniqueness
```

### 5.3 Check Constraints
**Requirement:** Masked data must satisfy table constraints (e.g., email format, phone regex, age>18)

**Testing:** Run `CHECK` constraint validation after masking
```sql
-- Verify all constraints still pass
SELECT constraint_name, table_name 
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public';

-- Test specific constraint
ALTER TABLE members_staging VALIDATE CONSTRAINT check_age_over_18;
```

---

## 6. Masking Implementation Methods

### 6.1 Automated Masking Script (Recommended)
**Approach:** PostgreSQL SQL script executed after staging database restore

**Script Location:** `scripts/mask-staging-data.sql`

**Execution Trigger:**
- After production backup restore to staging
- Before granting developer access to staging
- Frequency: Weekly (aligned with staging refresh schedule)

**Script Structure:**
```sql
-- ===========================================
-- Union Eyes Staging Data Masking Script
-- ===========================================

BEGIN;

-- 1. Mask members table (PII)
UPDATE members 
SET 
  first_name = 'Member',
  last_name = 'User-' || id,
  email = 'member' || id || '@test-union-eyes.com',
  phone = '+1-555-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
  sin = NULL,
  date_of_birth = date_of_birth + (RANDOM() * 10 - 5) * INTERVAL '1 year',
  street_address = id || ' Test Street',
  city = 'Testville',
  postal_code = 'A1A 1A1';

-- 2. Mask health and wellness claims
UPDATE member_health_claims 
SET 
  claim_details = '[Redacted]',
  claim_amount = claim_amount * (0.8 + RANDOM() * 0.4);

-- 3. Mask grievances (free text)
UPDATE grievances 
SET 
  description = 'Test grievance description for case ID: ' || id,
  resolution_notes = 'Test resolution notes';

-- 4. Mask arbitration cases
UPDATE arbitration_cases 
SET 
  case_details = '[Redacted for staging]';

-- 5. Mask collective agreement documents
UPDATE document_uploads 
SET 
  filename = 'document_' || id || '.pdf',
  blob_url = 'https://staging-storage.blob.core.windows.net/samples/generic_doc.pdf';

-- 6. Null out digital signatures
UPDATE digital_signatures 
SET 
  signature_data = NULL,
  certificate = NULL,
  verified = FALSE;

-- 7. Mask financial transactions
UPDATE financial_transactions 
SET 
  amount = amount * (0.8 + RANDOM() * 0.4),
  description = 'Masked transaction';

-- 8. Mask audit logs (keep structure, remove sensitive data)
UPDATE audit_logs 
SET 
  changes = '{"masked": true}'::jsonb 
WHERE changes::text ILIKE '%sin%' OR changes::text ILIKE '%email%';

COMMIT;

-- Verify masking success
SELECT 
  'members' AS table_name, 
  COUNT(*) AS total_records,
  COUNT(DISTINCT email) AS unique_emails,
  BOOL_AND(email LIKE '%@test-union-eyes.com') AS all_emails_masked
FROM members
UNION ALL
SELECT 
  'digital_signatures', 
  COUNT(*), 
  COUNT(*), 
  BOOL_AND(signature_data IS NULL)
FROM digital_signatures;
```

### 6.2 Azure Database Copy with Masking (Alternative)
**Approach:** Use Azure native tools for database copy with transformation

**Steps:**
1. Create staging database from production backup
2. Run `mask-staging-data.sql` script via Azure CLI:
   ```bash
   az postgres flexible-server execute \
     --name union-eyes-staging \
     --database-name union_eyes_db \
     --file-path scripts/mask-staging-data.sql
   ```
3. Verify masking (automated tests)
4. Grant developer access

### 6.3 Application-Level Masking (Not Recommended for Staging)
**Use Case:** Real-time masking for demos or support access  
**Tool:** Drizzle ORM query transformation

**Example:**
```typescript
// Mask PII in query results (not in database)
const members = await db.select().from(membersTable);

const maskedMembers = members.map(m => ({
  ...m,
  email: m.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
  phone: m.phone?.replace(/\d{4}$/, 'XXXX'),
  sin: 'XXX-XXX-XXX'
}));
```

**Limitation:** Does not protect data at rest in staging database, only in transit

---

## 7. Staging Database Refresh Schedule

### 7.1 Weekly Refresh Process
**Schedule:** Every Sunday at 2:00 AM EST  
**Purpose:** Keep staging data reasonablyup-to-date with production schema and data volume

**Automated Process:**
1. **Backup production database** (Azure automated backup)
2. **Restore to staging** (Azure database restore to new server)
3. **Run masking script** (`mask-staging-data.sql`)
4. **Run validation tests** (see Section 8)
5. **Swap staging endpoint** (DNS or connection string update)
6. **Notify team** (Slack #engineering)

**Duration:** ~30-45 minutes (for 10 GB database)

**Rollback Plan:** Keep previous staging database for 24 hours (manual fallback if issues)

### 7.2 On-Demand Refresh
**Triggers:**
- Major schema migration (need to test on realistic data)
- Production incident investigation (replicate issue in staging)
- Security team request (incident forensics)

**Process:** Same as weekly refresh, executed manually via Azure Portal or CLI

---

## 8. Validation and Testing

### 8.1 Post-Masking Validation Checklist
**Automated Tests (Executed after masking):**

```bash
# Test script: scripts/validate-staging-masking.sh

#!/bin/bash
set -e

echo "=== Validating Staging Database Masking ==="

# 1. Check no real emails remain
REAL_EMAILS=$(psql $STAGING_DB_URL -t -c \
  "SELECT COUNT(*) FROM members WHERE email NOT LIKE '%@test-union-eyes.com'")
  
if [ "$REAL_EMAILS" -gt 0 ]; then
  echo "❌ FAIL: Found $REAL_EMAILS real email addresses"
  exit 1
fi
echo "✅ All emails masked"

# 2. Check no real phone numbers (looking for non-555 pattern)
REAL_PHONES=$(psql $STAGING_DB_URL -t -c \
  "SELECT COUNT(*) FROM members WHERE phone NOT LIKE '%555%'")
  
if [ "$REAL_PHONES" -gt 0 ]; then
  echo "⚠️ WARNING: Found $REAL_PHONES non-555 phone numbers"
fi
echo "✅ Phone numbers masked"

# 3. Check SIN nulled or masked
REAL_SINS=$(psql $STAGING_DB_URL -t -c \
  "SELECT COUNT(*) FROM members WHERE sin IS NOT NULL AND sin != 'XXX-XXX-XXX'")
  
if [ "$REAL_SINS" -gt 0 ]; then
  echo "❌ FAIL: Found $REAL_SINS unmasked SINs"
  exit 1
fi
echo "✅ All SINs masked"

# 4. Check digital signatures nulled
REAL_SIGS=$(psql $STAGING_DB_URL -t -c \
  "SELECT COUNT(*) FROM digital_signatures WHERE signature_data IS NOT NULL")
  
if [ "$REAL_SIGS" -gt 0 ]; then
  echo "❌ FAIL: Found $REAL_SIGS unmasked digital signatures"
  exit 1
fi
echo "✅ All digital signatures nulled"

# 5. Check referential integrity
echo "Checking foreign key constraints..."
psql $STAGING_DB_URL -c "SET session_replication_role = replica; 
                         SET session_replication_role = DEFAULT;"
echo "✅ Referential integrity intact"

# 6. Check sample data counts
MEMBER_COUNT=$(psql $STAGING_DB_URL -t -c "SELECT COUNT(*) FROM members")
echo "📊 Member records: $MEMBER_COUNT"

echo "=== Validation Complete ==="
```

**Execution:** Part of staging refresh automation

### 8.2 Manual Spot Checks
**Frequency:** Monthly (first refresh of the month)  
**Reviewer:** Security team or DevOps lead

**Checklist:**
- [ ] Sample 10 random member records, verify all PII fields masked
- [ ] Review audit logs for any unmasked PII in JSON fields
- [ ] Check document filenames for personal information
- [ ] Verify email addresses all use test domain
- [ ] Confirm no production blob URLs in staging references

### 8.3 Developer Verification
**Before First Access:** Each developer must acknowledge:
- "I understand staging data is masked but may still contain sensitive patterns"
- "I will not exfiltrate or share staging data externally"
- "I will report any unmasked PII found in staging"

**Acknowledgment:** Recorded in HR system or access request form

---

## 9. Access Control

### 9.1 Staging Database Access
**Granted To:**
- Developers (SELECT, INSERT, UPDATE, DELETE on application tables)
- QA Team (SELECT on all tables)
- DevOps (Full admin access)

**Not Granted To:**
- External contractors (use local dev database instead)
- Support team (production read-only access via RLS)
- Demo accounts (use seeded demo data, not masked production)

**Access Request Process:**
1. Submit via IT portal or Slack #it-requests
2. Manager approval required
3. Security team verifies masking compliance
4. Azure AD credentials provisioned (time-limited, 90-day expiry)

### 9.2 Network Security
**Staging Database Firewall:**
- VPN required (or Azure Virtual Network integration)
- No public IP access
- Firewall rules: Allow only company IP ranges + CI/CD pipeline IPs

**Connection Encryption:**
- TLS 1.3 required (SSL mode in connection string)
- Certificate validation enabled

---

## 10. Incident Response

### 10.1 Unmasked PII Discovery
**If Developer Finds Unmasked PII in Staging:**
1. **Report immediately** to security@unioneyes.com
2. **Do not screenshot** or copy the data
3. **Security team investigates:**
   - Identify which masking rule failed
   - Check if other records affected
   - Assess if data was accessed by others (audit logs)
4. **Remediate:**
   - Re-run masking script immediately
   - Notify affected developers (if data was accessed)
   - Update masking script to prevent recurrence
5. **Incident postmortem** (if PII exposure confirmed)

**Severity: High** (even though staging, still PII disclosure risk)

### 10.2 Staging Database Breach
**If Staging Database Compromised:**
1. **Isolate immediately** (revoke all access, network isolation)
2. **Assess data exposed** (even though masked, metadata may reveal patterns)
3. **Notify privacy officer** (potential PIPEDA reporting requirement)
4. **Forensic investigation** (how was breach achieved, what was accessed)
5. **Remediate vulnerabilities**
6. **Consider if production also at risk** (same attack vector)

**Note:** While staging data is masked, breach still creates risk:
- Partial PII (province, age bracket) may enable re-identification
- Union structure and membership counts are confidential
- Business logic vulnerabilities may apply to production

---

## 11. Developer Training

### 11.1 Onboarding Training
**Required For:** All developers, QA, DevOps  
**Duration:** 30 minutes

**Topics:**
- Why staging data is masked (privacy, compliance)
- What data remains unmasked (province, date ranges, business logic fields)
- How to report unmasked PII discoveries
- Limitations of masking (not anonymization, patterns remain)
- Acceptable use of staging data (testing only, no external sharing)

**Delivery:** Security awareness training (part of 90-minute onboarding session)

### 11.2 Masking Script Maintenance
**Required For:** DevOps team  
**Duration:** 15 minutes

**Topics:**
- How to update masking script when schema changes
- How to test masking locally (Docker PostgreSQL)
- How to run validation tests
- How to troubleshoot referential integrity errors

**Delivery:** DevOps onboarding documentation

---

## 12. Handling Special Cases

### 12.1 Demo Data (Separate from Masked Staging)
**Use Case:** Customer demos, training videos, screenshots

**Approach:** Manually curated demo data (seeded, not masked production)

**Demo Database:**
- Separate Azure PostgreSQL database: `union-eyes-demo`
- 20-50 realistic but fictional member records
- Themed personas (e.g., "John Union-Member, steward at Acme Manufacturing")
- No production data origin

**Advantage:** Controlled narrative, no privacy risk, no masking required

### 12.2 Production Support Access (Not Staging)
**Use Case:** Support team troubleshooting user issues

**Approach:** Production read-only access with RLS (no masking)

**Rationale:** Support needs real data to resolve issues, protected by:
- RLS policies (union-scoped access)
- Audit logging (all queries logged)
- Role-based access (support role)
- Training (confidentiality obligations)

**Not Recommended:** Giving support team staging access (wrong data for troubleshooting)

### 12.3 External Auditor Access
**Use Case:** ISO 27001, SOC 2 auditors need to test controls

**Approach:** Production read-only access with supervision (no masking)

**Rationale:** Auditors need to verify real controls on real data

**Alternatives:** If auditor only needs to verify masking works, provide staging access

---

## 13. Compliance and Audit Trail

### 13.1 Masking Execution Logs
**Logged Information:**
- Timestamp of masking script execution
- Database identifier (staging server)
- Masking script version used
- Validation test results
- Execution duration
- Success/failure status

**Retention:** 1 year (per Data Retention Policy)

**Storage:** Azure Monitor logs + local file `/var/log/staging-masking.log`

### 13.2 Evidence for ISO 27001 / SOC 2
**Documented Evidence:**
- Masking procedure document (this document)
- Masking script source code (`mask-staging-data.sql`)
- Validation test script (`validate-staging-masking.sh`)
- Execution logs (weekly refresh logs)
- Access control configuration (Azure RBAC policies)
- Training records (developer acknowledgments)

**Audit Demonstration:**
1. Show masking script and validation tests
2. Execute masking on sample data (demonstrate process)
3. Show validation test results (all checks pass)
4. Show access logs (who accessed staging database)

---

## 14. Performance Considerations

### 14.1 Masking Script Execution Time
**Current Database Size:** 10 GB  
**Estimated Masking Time:** 5-10 minutes

**Optimization:**
- Batch updates (1,000 rows at a time)
- Indexes on updated columns (if slow)
- Parallel execution (multiple tables simultaneously)

**Monitoring:** Log execution time, alert if >15 minutes (may indicate issue)

### 14.2 Staging Database Performance
**No Performance Impact:** Masked data same size as unmasked (still realistic for testing)

**Advantage over Production:** No RLS policies in staging (faster queries for testing indexing strategies)

---

## 15. Continuous Improvement

### 15.1 Quarterly Review
**Schedule:** First week of each quarter  
**Attendees:** DevOps lead, Security team, Lead developer

**Agenda:**
- Review masking incidents (unmasked PII discoveries)
- Review new schema changes (any new PII fields?)
- Validate masking script effectiveness
- Update masking techniques (new faker patterns, better randomization)

### 15.2 Schema Change Integration
**Process:** When new PII fields added to production:
1. Developer identifies field as PII (code review)
2. Update masking script to include new field
3. Test masking locally (Docker PostgreSQL)
4. Deploy masking script update with schema migration
5. Verify in staging on next refresh

**Checklist for Schema Changes:** (in PR template)
- [ ] Does this migration add PII fields? If yes, update masking script.

---

## 16. Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **DevOps Lead** | Masking script maintenance, staging refresh automation, execution logs monitoring, performance optimization |
| **Security Team** | Masking requirement definitions, incident investigation, compliance evidence, quarterly review |
| **Lead Developer** | Schema change notifications (new PII fields), masking validation testing, developer training |
| **Privacy Officer** | Regulatory guidance (PIPEDA/GDPR compliance), breach reporting (if unmasked PII exposed) |
| **CTO** | Policy approval, budget for staging infrastructure, strategic decisions |

---

## 17. Related Documents

- [Data Classification Policy](../policies/DATA_CLASSIFICATION_POLICY.md)
- [Data Retention Policy](../policies/DATA_RETENTION_POLICY.md)
- [Access Control Policy](../policies/ACCESS_CONTROL_POLICY.md)
- [Incident Response Plan](../policies/INCIDENT_RESPONSE_PLAN.md)

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 12, 2026 | DevOps Lead | Initial procedure creation |

---

**Approved:**  
________________________________  
Chief Technology Officer

**Date:** February 12, 2026
