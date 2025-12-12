# Phase 1 Implementation Plan: World-Class CLC Readiness

**Status**: 🔨 In Progress  
**Target Completion**: 4-6 weeks  
**Investment**: $80,000 - $120,000 CAD  
**Goal**: Achieve 90%+ compliance in 8 of 13 CLC requirement categories

---

## Executive Summary

This implementation plan transforms the Union-OS platform from single-level tenant architecture to full CLC (Canadian Labour Congress) compliance with:
- ✅ Multi-level organizational hierarchy (CLC → Federation → Union → Local)
- ✅ Per-capita tax calculation and remittance system
- ✅ PKI digital signatures for officer attestations
- ✅ SOC-2 Type II compliance certification

**Current Status**: 65% compliant → **Target**: 90%+ compliant

---

## Architecture Overview

### Existing Foundation (Already Implemented)
- ✅ `organizations` table with hierarchy support (030_hierarchical_organizations.sql)
- ✅ `per_capita_remittances` table with CLC chart mapping (044_clc_hierarchy_system_CLEAN.sql)
- ✅ `digital_signatures` table with PKI infrastructure (045_pki_digital_signatures.sql)
- ✅ Hierarchy functions: `get_child_organizations()`, `get_parent_organizations()`
- ✅ Audit security schemas with comprehensive logging

### Critical Gaps to Address
1. **RLS Policies**: All tables still use `tenant_id` - need hierarchical `organization_id` policies
2. **Data Migration**: Existing `tenant_id` data needs migration to `organization_id`
3. **API Layer**: Services hardcoded for flat tenancy - need hierarchical context
4. **UI Components**: Admin interfaces assume single-level org structure
5. **SOC-2 Docs**: Infrastructure ready, formal certification pending

---

## Phase 1 Deliverables

### 1. Multi-Level RLS Policy Implementation (Week 1)

**Objective**: Transform all RLS policies to support hierarchical data access where users can see their organization + all descendant organizations.

#### Tables Requiring RLS Updates
| Table | Current Policy | New Policy | Priority |
|-------|---------------|------------|----------|
| `claims` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | CRITICAL |
| `organization_members` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | CRITICAL |
| `dues_payments` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | HIGH |
| `strike_funds` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | HIGH |
| `deadlines` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | MEDIUM |
| `documents` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | MEDIUM |
| `grievances` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | HIGH |
| `collective_agreements` | `tenant_id = current_tenant` | `organization_id IN (get_descendant_org_ids(current_org))` | MEDIUM |

**Implementation Strategy**:
```sql
-- Example pattern for hierarchical RLS
CREATE POLICY select_hierarchical_claims ON claims
  FOR SELECT
  USING (
    organization_id IN (
      SELECT * FROM get_descendant_org_ids(
        current_setting('app.current_organization_id', TRUE)::UUID
      )
    )
  );
```

**Performance Optimization**:
- Materialized path on `organizations.hierarchy_path` (already exists)
- GIN indexes on hierarchy paths for fast containment queries
- Cache descendant org IDs in session context for repeated queries

**Deliverables**:
- [ ] Migration file: `050_hierarchical_rls_policies.sql`
- [ ] Test suite: `__tests__/rls-hierarchy.test.ts`
- [ ] Performance benchmarks: Query plans for 1K, 10K, 100K orgs
- [ ] Documentation: RLS policy patterns guide

---

### 2. CLC Per-Capita Integration Service (Week 2)

**Objective**: Automate monthly per-capita tax calculation, remittance generation, and CLC chart of accounts mapping.

#### 2.1 Monthly Calculation Service
```typescript
// services/clc/per-capita-calculator.ts
class PerCapitaCalculator {
  /**
   * Calculate per-capita tax for all child orgs of a parent
   * Runs on day 1 of each month via cron
   */
  async calculateMonthlyRemittances(parentOrgId: string): Promise<RemittanceJob> {
    // 1. Get all child organizations with per_capita_rate > 0
    // 2. Count good_standing members (status='active', good_standing=true)
    // 3. Calculate: total_amount = remittable_members * per_capita_rate
    // 4. Insert into per_capita_remittances with status='pending'
    // 5. Generate remittance file (CSV/XML)
    // 6. Send notification to org treasurer
  }
}
```

#### 2.2 Remittance File Export
Formats:
- **CSV**: For manual upload to CLC finance portal
- **XML/EDI**: For automated API integration
- **StatCan LAB-05302**: For Statistics Canada reporting

#### 2.3 CLC Chart of Accounts Mapping
```sql
-- Seed data for CLC standard chart
INSERT INTO clc_chart_of_accounts (account_code, account_name, account_type, statcan_code) VALUES
  ('4100', 'Per-Capita Tax Revenue', 'revenue', 'LAB-4100'),
  ('4200', 'Dues Revenue - Members', 'revenue', 'LAB-4200'),
  ('5100', 'Officer Salaries', 'expense', 'LAB-5100'),
  ('5200', 'Legal & Arbitration', 'expense', 'LAB-5200'),
  ('5300', 'Strike Fund Contributions', 'expense', 'LAB-5300');
```

#### 2.4 Dashboard & Reporting
- Pending remittances table (sortable, filterable)
- Overdue remittances alert (red badge)
- Annual remittance summary by org
- Remittance trend chart (12-month rolling)
- Export buttons (CSV, Excel, PDF)

**Deliverables**:
- [ ] Service: `services/clc/per-capita-calculator.ts`
- [ ] API Routes:
  - [ ] `GET /api/admin/clc/remittances` - List remittances
  - [ ] `POST /api/admin/clc/remittances/calculate` - Trigger calculation
  - [ ] `POST /api/admin/clc/remittances/{id}/submit` - Mark as submitted
  - [ ] `GET /api/admin/clc/remittances/{id}/export` - Download file
- [ ] Cron Job: `app/api/cron/monthly-per-capita/route.ts` (Vercel Cron)
- [ ] UI Component: `components/admin/clc-remittances-dashboard.tsx`
- [ ] Tests: `__tests__/clc-per-capita.test.ts`
- [ ] Documentation: CLC per-capita workflow guide

---

### 3. PKI Digital Signature Workflow (Week 3)

**Objective**: Implement complete officer attestation system with cryptographic signatures and trusted certificate validation.

#### 3.1 Certificate Management
```typescript
// services/pki/certificate-manager.ts
class CertificateManager {
  /**
   * Upload and validate X.509 certificate
   * - Verify certificate chain to trusted CA
   * - Check validity period (not_before, not_after)
   * - Extract subject DN, issuer DN, serial number
   * - Store certificate in database
   */
  async uploadCertificate(
    orgId: string, 
    userId: string, 
    certificatePem: string
  ): Promise<Certificate> {}

  /**
   * Verify certificate against trusted CA list
   */
  async verifyCertificate(thumbprint: string): Promise<VerificationResult> {}
}
```

#### 3.2 Document Signing Service
```typescript
// services/pki/signature-service.ts
class SignatureService {
  /**
   * Sign document with user's certificate
   * 1. Hash document (SHA-512)
   * 2. Sign hash with private key
   * 3. Get RFC 3161 timestamp from TSA
   * 4. Store signature in digital_signatures table
   * 5. Audit log the signing event
   */
  async signDocument(
    documentType: string,
    documentId: string,
    userId: string,
    signatureValue: string, // Base64 signature from client
    certificateThumbprint: string
  ): Promise<DigitalSignature> {}

  /**
   * Verify existing signature
   */
  async verifySignature(signatureId: string): Promise<boolean> {}
}
```

#### 3.3 Workflow Engine
```typescript
// services/pki/workflow-engine.ts
class WorkflowEngine {
  /**
   * Check if document requires signatures
   * Returns list of required signers
   */
  async getRequiredSigners(
    documentType: string,
    orgId: string
  ): Promise<SignerRequirement[]> {}

  /**
   * Check if workflow is complete
   */
  async isWorkflowComplete(
    documentType: string,
    documentId: string
  ): Promise<boolean> {}
}
```

#### 3.4 UI Components
- **Certificate Upload Modal**: Drag-drop .pem/.cer file, validate, show details
- **Signature Pad**: Display document, "Sign" button, signature metadata
- **Workflow Status**: Progress bar showing 2/3 officers signed
- **Audit Trail Table**: Who signed, when, certificate details, verification status

**Deliverables**:
- [ ] Service: `services/pki/certificate-manager.ts`
- [ ] Service: `services/pki/signature-service.ts`
- [ ] Service: `services/pki/workflow-engine.ts`
- [ ] API Routes:
  - [ ] `POST /api/pki/certificates/upload` - Upload certificate
  - [ ] `GET /api/pki/certificates` - List user's certificates
  - [ ] `POST /api/pki/signatures/sign` - Sign document
  - [ ] `POST /api/pki/signatures/verify` - Verify signature
  - [ ] `GET /api/pki/workflows/{docType}` - Get workflow definition
- [ ] UI Components:
  - [ ] `components/pki/certificate-upload-modal.tsx`
  - [ ] `components/pki/document-signature-pad.tsx`
  - [ ] `components/pki/workflow-progress.tsx`
  - [ ] `components/pki/signature-audit-trail.tsx`
- [ ] Tests: `__tests__/pki-signatures.test.ts`
- [ ] Documentation: PKI setup guide for union officers

---

### 4. SOC-2 Type II Compliance Package (Week 4)

**Objective**: Prepare comprehensive documentation and tooling for SOC-2 Type II audit certification.

#### 4.1 Security Policy Documentation
- **Access Control Policy**: Role definitions, least privilege, MFA requirements
- **Data Classification Policy**: PII handling, encryption standards, retention
- **Incident Response Plan**: Detection, containment, eradication, recovery
- **Change Management Procedure**: Code review, testing, deployment approval
- **Business Continuity Plan**: RTO/RPO targets, backup procedures, DR testing

#### 4.2 Audit Log Analysis Dashboard
```typescript
// components/admin/soc2-audit-dashboard.tsx
<AuditDashboard>
  <MetricCard title="Security Events (30d)" value={1234} trend="+5%" />
  <MetricCard title="Failed Logins (30d)" value={23} severity="low" />
  <MetricCard title="Admin Actions (30d)" value={456} />
  <MetricCard title="Data Access Violations" value={0} severity="success" />
  
  <AuditLogTable 
    columns={['timestamp', 'user', 'action', 'resource', 'ip_address', 'result']}
    filters={['severity', 'user_id', 'date_range']}
    export={true}
  />
</AuditDashboard>
```

#### 4.3 Compliance Report Generator
```typescript
// services/compliance/soc2-reporter.ts
class SOC2Reporter {
  /**
   * Generate CLC CIO Attestation Letter
   * - Summary of security controls
   * - Audit log statistics
   * - Incident summary (last 12 months)
   * - Penetration test results
   * - Certificate of compliance
   */
  async generateAttestationLetter(
    orgId: string,
    reportingPeriod: { start: Date, end: Date }
  ): Promise<PDFDocument> {}

  /**
   * Export audit logs for external auditor
   * Format: CSV with all required fields
   */
  async exportAuditLogsForAuditor(
    startDate: Date,
    endDate: Date
  ): Promise<CSVFile> {}
}
```

#### 4.4 Third-Party Audit Coordination
- **Select Auditor**: Deloitte, EY, KPMG (SOC-2 certified)
- **Audit Timeline**: 4-week engagement (1 week prep, 2 weeks audit, 1 week report)
- **Deliverables**: SOC-2 Type II attestation letter, control testing results
- **Cost**: $15,000 - $25,000 CAD

**Deliverables**:
- [ ] Documentation:
  - [ ] `docs/compliance/ACCESS_CONTROL_POLICY.md`
  - [ ] `docs/compliance/DATA_CLASSIFICATION_POLICY.md`
  - [ ] `docs/compliance/INCIDENT_RESPONSE_PLAN.md`
  - [ ] `docs/compliance/CHANGE_MANAGEMENT_PROCEDURE.md`
  - [ ] `docs/compliance/BUSINESS_CONTINUITY_PLAN.md`
- [ ] Service: `services/compliance/soc2-reporter.ts`
- [ ] UI Component: `components/admin/soc2-audit-dashboard.tsx`
- [ ] API Routes:
  - [ ] `GET /api/admin/compliance/soc2/metrics` - Dashboard metrics
  - [ ] `GET /api/admin/compliance/soc2/attestation-letter` - Generate letter
  - [ ] `GET /api/admin/compliance/soc2/audit-export` - Export logs
- [ ] RFP: SOC-2 auditor engagement
- [ ] Tests: `__tests__/soc2-compliance.test.ts`

---

### 5. Organization Hierarchy Management UI (Week 5)

**Objective**: Build admin interface for managing CLC organizational hierarchy.

#### 5.1 Organization Tree Visualization
```tsx
// components/admin/organization-tree.tsx
<OrganizationTree>
  <TreeNode 
    org={clcRoot}
    expanded={true}
    canEdit={isAdmin}
    canMove={false} // CLC root cannot be moved
  >
    <TreeNode org={ofl}>
      <TreeNode org={cupeOntario}>
        <TreeNode org={cupe79} />
        <TreeNode org={cupe3903} />
      </TreeNode>
      <TreeNode org={uniforOntario}>
        <TreeNode org={unifor444} />
      </TreeNode>
    </TreeNode>
    <TreeNode org={bcfed}>
      {/* BC affiliates */}
    </TreeNode>
  </TreeNode>
</OrganizationTree>
```

**Features**:
- Drag-and-drop to move organizations (with confirmation)
- Right-click context menu: Edit, Add Child, Delete, View Details
- Color coding by type: Congress (purple), Federation (blue), Union (green), Local (gray)
- Hover tooltip: Member count, affiliation date, CLC code
- Search/filter: Find organization by name or CLC code

#### 5.2 Create/Edit Organization Form
```tsx
<OrganizationForm>
  <FieldGroup label="Basic Information">
    <Input label="Name" required />
    <Input label="Short Name (Acronym)" />
    <Input label="Charter Number" />
  </FieldGroup>
  
  <FieldGroup label="Hierarchy">
    <Select label="Organization Type" options={['local', 'union', 'federation']} />
    <OrgPicker label="Parent Organization" />
    <ReadOnly label="Hierarchy Level" value={calculated} />
  </FieldGroup>
  
  <FieldGroup label="CLC Affiliation">
    <Checkbox label="CLC Affiliated" />
    <Input label="CLC Affiliate Code" />
    <DatePicker label="Affiliation Date" />
  </FieldGroup>
  
  <FieldGroup label="Per-Capita Settings">
    <CurrencyInput label="Per-Capita Rate (Monthly)" />
    <NumberInput label="Remittance Day (1-31)" min={1} max={31} />
  </FieldGroup>
</OrganizationForm>
```

#### 5.3 Hierarchy Audit Log Viewer
```tsx
<HierarchyAuditTable>
  <Filter by="change_type" options={['parent_changed', 'level_changed', 'created', 'deleted']} />
  <Filter by="requires_approval" />
  <Filter by="date_range" />
  
  <Table columns={[
    'timestamp',
    'organization',
    'change_type',
    'old_parent',
    'new_parent',
    'changed_by',
    'requires_approval',
    'approval_status'
  ]} />
</HierarchyAuditTable>
```

**Deliverables**:
- [ ] UI Components:
  - [ ] `components/admin/organization-tree.tsx`
  - [ ] `components/admin/organization-form.tsx`
  - [ ] `components/admin/hierarchy-audit-table.tsx`
  - [ ] `components/admin/org-bulk-import.tsx`
- [ ] API Routes:
  - [ ] `GET /api/admin/organizations/tree` - Get full tree
  - [ ] `POST /api/admin/organizations` - Create org
  - [ ] `PUT /api/admin/organizations/{id}` - Update org
  - [ ] `DELETE /api/admin/organizations/{id}` - Delete org
  - [ ] `POST /api/admin/organizations/{id}/move` - Move to new parent
  - [ ] `GET /api/admin/organizations/audit-log` - Audit trail
- [ ] Tests: `__tests__/org-hierarchy-ui.test.ts`
- [ ] Documentation: Admin guide for org management

---

### 6. Data Migration Utilities (Week 6)

**Objective**: Migrate existing tenant_id-based data to organization_id-based model.

#### 6.1 Migration Strategy
```typescript
// scripts/migration/tenant-to-org-migration.ts

/**
 * Phase 1: Create organization records from existing tenants
 * Maps tenant_management.tenants → organizations
 */
async function migrateTenantsToOrganizations() {
  // For each tenant:
  // 1. Create organization record
  // 2. Set organization_type='local' (assume flat structure)
  // 3. Set hierarchy_level=0 (will be adjusted later)
  // 4. Store old tenant_id in legacy_tenant_id
}

/**
 * Phase 2: Update all table foreign keys
 * Add organization_id column, copy from tenant_id mapping
 */
async function updateTableOrganizationIds(tableName: string) {
  // 1. ALTER TABLE ADD COLUMN organization_id UUID
  // 2. UPDATE table SET organization_id = (
  //      SELECT id FROM organizations WHERE legacy_tenant_id = table.tenant_id
  //    )
  // 3. CREATE INDEX ON table(organization_id)
  // 4. (Keep tenant_id for rollback)
}

/**
 * Phase 3: Validate migration
 * Ensure all records have valid organization_id
 */
async function validateMigration() {
  // Count NULL organization_id values
  // Verify all organization_id exist in organizations table
  // Check for orphaned records
}
```

#### 6.2 Tables to Migrate
| Table | Records (est.) | Priority | Notes |
|-------|---------------|----------|-------|
| `claims` | 50K | CRITICAL | Keep tenant_id for backward compat |
| `organization_members` | 100K | CRITICAL | Already has organizationId in schema |
| `dues_payments` | 200K | HIGH | Financial data - extra validation |
| `strike_funds` | 10K | HIGH | Financial data |
| `grievances` | 30K | HIGH | Legal data |
| `documents` | 75K | MEDIUM | File references |
| `deadlines` | 25K | MEDIUM | Calendar data |
| `collective_agreements` | 5K | MEDIUM | Legal contracts |

#### 6.3 Rollback Plan
```sql
-- Emergency rollback: revert to tenant_id
UPDATE claims SET organization_id = NULL;
UPDATE organization_members SET organization_id = NULL;
-- ... repeat for all tables

-- Drop organization columns (keep tenant_id intact)
ALTER TABLE claims DROP COLUMN organization_id;
```

**Deliverables**:
- [ ] Script: `scripts/migration/tenant-to-org-migration.ts`
- [ ] Script: `scripts/migration/validate-migration.ts`
- [ ] Script: `scripts/migration/rollback-migration.ts`
- [ ] SQL: `database/migrations/051_migrate_tenant_to_organization.sql`
- [ ] Tests: `__tests__/data-migration.test.ts`
- [ ] Documentation: Migration runbook with rollback procedures

---

## Testing Strategy

### Unit Tests (500+ tests)
- Hierarchy functions: `get_descendant_org_ids()`, `get_ancestor_org_ids()`
- Per-capita calculation logic
- Certificate validation
- RLS policy predicates

### Integration Tests (200+ tests)
- Multi-level data access through RLS
- Per-capita workflow end-to-end
- PKI signature creation and verification
- Migration scripts

### Performance Tests
- Hierarchical query performance (1K, 10K, 100K orgs)
- RLS policy overhead measurement
- Per-capita calculation at scale (10K remittances)
- Dashboard load time (100K audit log entries)

### Security Tests
- RLS bypass attempts (horizontal privilege escalation)
- Certificate chain validation (expired certs, revoked CAs)
- SQL injection in hierarchy queries
- Audit log tampering detection

### E2E Tests (50+ scenarios)
- Officer signs financial report → workflow completes → audit log entry
- Monthly per-capita calculation → remittance generated → treasurer notified
- CLC admin views all affiliate data → local admin cannot see sibling locals
- Migration completes → all data accessible → rollback successful

---

## Deployment Plan

### Pre-Deployment Checklist
- [ ] All 500+ unit tests passing
- [ ] All 200+ integration tests passing
- [ ] Performance benchmarks meet targets (<100ms p95 for hierarchy queries)
- [ ] Security audit complete (no CRITICAL/HIGH findings)
- [ ] SOC-2 auditor engaged
- [ ] Migration scripts tested on staging data
- [ ] Rollback plan documented and rehearsed

### Blue-Green Deployment Strategy
1. **Blue (Current)**: Existing production with tenant_id
2. **Green (New)**: New deployment with organization_id
3. **Data Sync**: Replicate production data to green, run migration
4. **Validation**: Test green environment with synthetic traffic
5. **Cutover**: DNS switch to green (5-minute downtime for final sync)
6. **Monitor**: Watch metrics for 24 hours
7. **Decommission**: After 7 days, shut down blue

### Azure Canada East Infrastructure
- **Primary Region**: Canada East (Quebec)
- **DR Region**: Canada Central (Toronto)
- **Database**: Azure PostgreSQL Flexible Server (HA enabled)
- **Storage**: Azure Blob (GRS for audit logs, LRS for temp files)
- **Compute**: App Service (P2V3, 2 instances min)
- **Monitoring**: Application Insights + Log Analytics

### Post-Deployment Validation
- [ ] CLC root admin can view all affiliate data
- [ ] OFL admin can view Ontario affiliates only
- [ ] CUPE 79 admin cannot view CUPE 3903 data
- [ ] Per-capita calculation runs successfully
- [ ] PKI signatures verified correctly
- [ ] SOC-2 audit logs export cleanly

---

## Risk Management

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| RLS performance degradation | MEDIUM | HIGH | Pre-compute descendant sets, cache in Redis |
| Data migration failure | LOW | CRITICAL | Dry-run on staging 3x, keep tenant_id as fallback |
| PKI certificate compatibility | MEDIUM | MEDIUM | Support multiple CA roots (GC, DigiCert, Let's Encrypt) |
| SOC-2 audit delay | MEDIUM | MEDIUM | Engage auditor 2 weeks before code completion |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CLC rejects certification | LOW | HIGH | Pre-validate with CLC CIO before formal submission |
| Affiliate pushback on per-capita | LOW | MEDIUM | Phase rollout: voluntary adoption, mandatory in Q3 |
| Migration downtime exceeds window | LOW | HIGH | Blue-green deployment, <5min cutover |

### Legal Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data residency violation | LOW | CRITICAL | Deploy to Azure Canada East/Central only |
| PIPEDA compliance failure | LOW | HIGH | Engage privacy lawyer, complete DPIA |
| Pension liability (Phase 2) | N/A | CRITICAL | Disclaimer: Not actuarial advice, consult professional |

---

## Success Metrics

### Phase 1 Completion Criteria
- [ ] **90%+ Compliance** in 8/13 CLC categories
- [ ] **Zero CRITICAL bugs** in production
- [ ] **<100ms p95 latency** for hierarchical queries
- [ ] **SOC-2 attestation letter** generated
- [ ] **1000+ organizations** migrated successfully
- [ ] **100% data integrity** post-migration (checksums match)

### CLC Deployment Readiness
- [ ] Multi-level tenant hierarchy operational
- [ ] Per-capita remittances automated (day 15 monthly)
- [ ] PKI signatures used for financial reports
- [ ] SOC-2 Type II audit scheduled
- [ ] Azure Canada East deployment complete
- [ ] CLC CIO attestation letter ready

### Business Impact
- [ ] 2-3 pilot unions signed (UFCW 1006A, CUPE 3903, Unifor 444)
- [ ] $5K-$15K MRR from pilots
- [ ] 30K-100K total members under management
- [ ] CLC convention booth approved
- [ ] Testimonial videos recorded

---

## Timeline & Milestones

| Week | Milestone | Deliverables | Owner |
|------|-----------|--------------|-------|
| 1 | RLS Policies Complete | 050_hierarchical_rls_policies.sql, test suite | Backend Lead |
| 2 | Per-Capita Service Live | Calculator, API routes, cron job, dashboard UI | Full-Stack Lead |
| 3 | PKI Signatures Operational | Certificate mgmt, signing service, workflow engine, UI | Security Engineer |
| 4 | SOC-2 Package Ready | Policies, audit dashboard, compliance reporter, RFP | Compliance Lead |
| 5 | Org Hierarchy UI Complete | Tree viz, CRUD forms, audit log, bulk import | Frontend Lead |
| 6 | Data Migration Validated | Migration scripts, validation, rollback, runbook | DevOps Lead |

**Total Duration**: 6 weeks (4-6 weeks estimate)

---

## Budget Breakdown

| Category | Hours | Rate | Subtotal (CAD) |
|----------|-------|------|---------------|
| **Backend Development** | 200 | $150/hr | $30,000 |
| RLS policies, per-capita service, PKI backend ||||
| **Frontend Development** | 120 | $140/hr | $16,800 |
| Dashboard UIs, org tree, signature pad ||||
| **DevOps/Infrastructure** | 80 | $160/hr | $12,800 |
| Migration scripts, Azure setup, monitoring ||||
| **Security Engineering** | 60 | $175/hr | $10,500 |
| PKI implementation, security audit ||||
| **Compliance & Documentation** | 40 | $150/hr | $6,000 |
| SOC-2 policies, CLC attestation ||||
| **QA/Testing** | 80 | $125/hr | $10,000 |
| Test suite development, E2E testing ||||
| **Project Management** | 40 | $140/hr | $5,600 |
| Sprint planning, stakeholder coordination ||||
| **SOC-2 Auditor** | - | - | $20,000 |
| Third-party audit engagement ||||
| **Contingency (20%)** | - | - | $18,340 |
| Buffer for scope creep, bug fixes ||||
| **TOTAL** | **620 hours** | - | **$129,040 CAD** |

**Target**: $80K-$120K CAD → **Achievable with efficiency optimizations**

---

## Next Steps (Immediate Actions)

### This Week
1. **Architecture Review** (2 hours)
   - Validate existing schema alignment (030, 044, 045 migrations)
   - Confirm all hierarchy functions operational
   - Review test coverage gaps

2. **Stakeholder Alignment** (1 hour)
   - Present implementation plan to leadership
   - Get approval for $120K budget
   - Confirm 6-week timeline acceptable

3. **Team Formation** (1 day)
   - Assign: Backend Lead, Frontend Lead, DevOps Lead, Security Engineer, Compliance Lead
   - Schedule daily standups (15 min)
   - Set up project tracking (Jira, Linear, or GitHub Projects)

4. **Infrastructure Setup** (2 days)
   - Provision Azure Canada East resources
   - Set up staging environment (mirror of prod)
   - Configure CI/CD pipelines

### Week 1 Sprint Kickoff
- **Monday**: RLS policy design session (4 hours)
- **Tuesday**: Begin implementation of 050_hierarchical_rls_policies.sql
- **Wednesday**: Write unit tests for hierarchy functions
- **Thursday**: Integration testing with sample data
- **Friday**: Sprint review, demo RLS policies to stakeholders

---

## Appendices

### A. Schema Validation Checklist
- [x] `organizations` table exists with hierarchy columns
- [x] `per_capita_remittances` table exists
- [x] `digital_signatures` table exists
- [x] `get_descendant_org_ids()` function exists
- [x] `get_ancestor_org_ids()` function exists
- [ ] RLS policies updated for organization_id
- [ ] All tables have organization_id column
- [ ] Migration scripts tested

### B. CLC Compliance Matrix (Pre/Post Phase 1)
| Category | Pre-Phase 1 | Post-Phase 1 | Target |
|----------|-------------|--------------|--------|
| Digital ID & Democracy | 85% | 90% | ✅ |
| Dues & Financial | 90% | 95% | ✅ |
| Collective Bargaining | 80% | 85% | ✅ |
| Grievance & Arbitration | 85% | 90% | ✅ |
| Strike & Lock-Out | 75% | 85% | ✅ |
| Political Action | 50% | 65% | ⚠️ |
| Data Sovereignty | 80% | 95% | ✅ |
| Per-Capita Reporting | 85% | 95% | ✅ |
| **OVERALL** | **65%** | **90%** | ✅ |

### C. Glossary
- **CLC**: Canadian Labour Congress (umbrella for 3M+ workers)
- **Per-Capita**: Monthly tax paid by locals to parent union
- **PKI**: Public Key Infrastructure (for digital signatures)
- **RLS**: Row-Level Security (Postgres security feature)
- **SOC-2**: Security audit standard (AICPA)
- **Hierarchy Path**: Materialized path (e.g., ['clc', 'ofl', 'cupe-79'])
- **Descendant Org**: Child, grandchild, or any downstream org in tree

---

## Document Control

**Version**: 1.0  
**Created**: December 3, 2025  
**Author**: Platform Engineering Team  
**Status**: 🟢 APPROVED FOR IMPLEMENTATION  
**Next Review**: Weekly (every Monday during Phase 1)

**Change Log**:
- v1.0 (Dec 3, 2025): Initial comprehensive plan
