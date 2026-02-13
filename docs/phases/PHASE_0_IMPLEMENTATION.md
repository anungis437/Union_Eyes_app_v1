# Phase 0: RC → Enterprise Production

**Timeline:** 2–4 weeks  
**Status:** 🔄 In Planning  
**Priority:** ⚠️ NON-NEGOTIABLE  
**Goal:** Convert "security-complete" into "deployable at a union"

---

## Overview

Phase 0 is the foundation that makes Union Eyes deployable in enterprise union environments. This phase focuses on:
1. **Provable controls** via automated evidence generation
2. **Admin productivity** via console and permission management
3. **Operational readiness** via observability and incident response

---

## 0.1 Release Contract + Evidence Pack

**Priority:** ⚠️ CRITICAL - BLOCKS ALL DEPLOYMENTS  
**Estimated Effort:** 1–2 weeks

### Acceptance Criteria

✅ **Primary:** One command generates complete "audit evidence bundle" (PDF/zip) containing:
- Control matrix with status
- Automated evidence links
- Test execution results
- Security scanner outputs
- Migration verification results
- Version manifest + SBOM

### Deliverables

#### 1. Controls & Evidence Appendix

**Files to Create:**
- [ ] `docs/compliance/CONTROL_MATRIX.md` - Master control listing
- [ ] `scripts/compliance/generate-control-matrix.ts` - Automation script
- [ ] `scripts/compliance/evidence-collector.ts` - Evidence aggregation

**Control Categories:**
1. **Access Control**
   - RLS verification tests
   - Permission boundary tests
   - Break-glass access logs
   - Session management

2. **Data Integrity**
   - Immutability trigger verification
   - FSM state transition validation
   - Audit log completeness
   - Cryptographic checksums

3. **Retention & Privacy**
   - Retention policy enforcement
   - Data classification coverage
   - PII handling verification
   - Legal hold capability

4. **Operational Security**
   - Deployment checksums
   - Configuration drift detection
   - Secret rotation verification
   - Backup restoration tests

**Implementation Tasks:**
- [ ] Define control taxonomy (NIST/SOC2/ISO27001 mapping)
- [ ] Link each control to automated test or evidence source
- [ ] Create evidence collection automation
- [ ] Generate matrix in human-readable + machine-readable formats

#### 2. Release Contract CI

**Files to Create/Modify:**
- [ ] `.github/workflows/release-contract.yml` - CI workflow
- [ ] `scripts/ci/verify-release-contract.ts` - Verification script
- [ ] `scripts/ci/migration-safety-check.ts` - Migration validator
- [ ] `docs/processes/RELEASE_CHECKLIST.md` - Human checklist

**Required Checks (All Must Pass):**

**A. Test Coverage Gates**
- [ ] Unit test coverage ≥ 80%
- [ ] Integration test coverage ≥ 70%
- [ ] E2E critical path coverage = 100%
- [ ] Security test suite = PASS
- [ ] RLS enforcement tests = PASS
- [ ] Immutability tests = PASS

**B. Security Scanners**
- [ ] SAST: Semgrep/CodeQL = no critical issues
- [ ] Dependency scan: npm audit/Snyk = no critical vulnerabilities
- [ ] Secret scanning = no leaks
- [ ] Container scan: Trivy/Grype = no critical CVEs
- [ ] IaC scan: Checkov/tfsec = PASS

**C. Migration Verification**
- [ ] All migrations idempotent (can run multiple times)
- [ ] Rollback scripts exist for all schema changes
- [ ] Migration test on production-like dataset
- [ ] No breaking changes without deprecation period
- [ ] Data loss prevention checks

**D. Build Quality**
- [ ] TypeScript strict mode = PASS
- [ ] ESLint = no errors
- [ ] Type coverage ≥ 95%
- [ ] Build reproducibility verified

**Implementation Tasks:**
- [ ] Create GitHub Actions workflow
- [ ] Implement each gate as reusable action
- [ ] Add failure notification (Slack/email)
- [ ] Create override mechanism (with audit log) for emergencies
- [ ] Document bypass procedures (requires 2-person approval)

#### 3. Signed Build Provenance

**Files to Create:**
- [ ] `scripts/build/generate-sbom.ts` - SBOM generator
- [ ] `scripts/build/sign-artifacts.ts` - Artifact signing
- [ ] `scripts/build/verify-provenance.ts` - Verification script
- [ ] `.github/workflows/sign-release.yml` - Signing automation

**Standards Compliance:**
- [ ] SBOM format: CycloneDX (primary), SPDX (secondary)
- [ ] Signing: Sigstore/cosign or GPG
- [ ] Provenance: SLSA Level 2 minimum

**SBOM Contents:**
- [ ] All npm dependencies (direct + transitive)
- [ ] Licenses (with compliance check)
- [ ] Known vulnerabilities (CVE references)
- [ ] Component hashes
- [ ] Build timestamp + Git commit SHA

**Artifact Signing:**
- [ ] Docker images signed
- [ ] npm packages signed (if publishing)
- [ ] Release bundles signed
- [ ] Signature verification in deployment pipeline

**Implementation Tasks:**
- [ ] Choose signing tool (recommend: cosign)
- [ ] Set up signing keys (stored in GitHub Secrets/Vault)
- [ ] Integrate SBOM generation into build
- [ ] Add signature verification to deployment
- [ ] Document verification procedures

#### 4. Evidence Bundle Generator

**CLI Command:**
```bash
pnpm generate:evidence-bundle --output ./evidence-bundle.zip
```

**Bundle Structure:**
```
evidence-bundle-{version}-{timestamp}/
├── README.md                           # Overview + instructions
├── CONTROL_MATRIX.pdf                  # Human-readable control listing
├── control-matrix.json                 # Machine-readable
├── test-results/
│   ├── unit-tests.xml                  # JUnit format
│   ├── integration-tests.xml
│   ├── e2e-tests.xml
│   ├── security-tests.xml
│   └── coverage-report.html
├── security-scans/
│   ├── sast-results.sarif              # SARIF format
│   ├── dependency-scan.json
│   ├── container-scan.json
│   └── secret-scan.json
├── migrations/
│   ├── migration-log.json              # Applied migrations
│   ├── rollback-scripts/
│   └── verification-results.json
├── sbom/
│   ├── sbom.cyclonedx.json
│   ├── sbom.spdx.json
│   └── license-compliance.json
├── provenance/
│   ├── build-manifest.json             # Git SHA, build time, builder
│   ├── signatures/
│   └── verification-hashes.json
└── audit-logs/
    ├── deployment-log.json
    └── control-execution-log.json
```

**Implementation Tasks:**
- [ ] Create bundle generator script
- [ ] Add PDF generation (Puppeteer or similar)
- [ ] Implement archiving (zip with integrity check)
- [ ] Add timestamp + signature to bundle
- [ ] Test end-to-end bundle generation

---

## 0.2 Admin Console v1

**Priority:** 🔴 HIGH - REQUIRED FOR OPERATIONS  
**Estimated Effort:** 1–2 weeks

### Acceptance Criteria

✅ **Primary:** Admin can provision tenant, assign roles, and audit permissions without database access

### Deliverables

#### 1. Tenant Provisioning + Config

**UI Routes:**
- [ ] `/admin/tenants` - List all tenants
- [ ] `/admin/tenants/new` - Create new tenant
- [ ] `/admin/tenants/[id]` - Tenant configuration

**Configuration Options:**
- [ ] Tenant metadata:
  - Name, slug (URL-safe identifier)
  - Primary contact
  - Subscription tier
- [ ] Localization:
  - Default timezone (with member override)
  - Default locale (en-CA, en-US, fr-CA, etc.)
  - Date/time format preferences
- [ ] Retention policies:
  - Default retention period per data class
  - Legal hold capability toggle
  - Audit log retention (recommend: 7 years minimum)
- [ ] Feature flags:
  - Enable/disable modules per tenant
  - Beta feature access
  - Integration toggles

**Database Schema:**
```sql
-- Already exists? Verify in db/schema/
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_configs (
  tenant_id UUID REFERENCES tenants(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tenant_id, key)
);
```

**Implementation Tasks:**
- [ ] Check existing tenant schema in `db/schema/`
- [ ] Create admin console layout (if not exists)
- [ ] Build tenant provisioning form
- [ ] Implement config management UI
- [ ] Add validation for config changes
- [ ] Create audit log for tenant changes

#### 2. Role Assignment

**UI Routes:**
- [ ] `/admin/roles` - Role management
- [ ] `/admin/roles/[roleId]/permissions` - Permission details
- [ ] `/admin/users/[userId]/roles` - User role assignment

**Role Taxonomy (must support):**
- **Member:** Basic access to own data
- **Steward:** Case management for assigned unit
- **Chief Steward:** Multi-unit oversight
- **Rep/Organizer:** Member outreach + campaign management
- **Officer:** Board-level access
- **Admin:** Tenant configuration + user management
- **Auditor:** Read-only + export for compliance
- **External Counsel:** Limited case access + confidential data

**Role Features:**
- [ ] Hierarchical roles (inheritance)
- [ ] Time-bounded assignments (effective_from, effective_to)
- [ ] Audit trail (who assigned, when, why)
- [ ] Bulk assignment (CSV upload)
- [ ] Conditional roles (e.g., "Steward IF unit = X")

**Database Schema:**
```sql
-- Verify existing auth schema
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,  -- Permission matrix
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  assignment_reason TEXT,
  UNIQUE(user_id, role_id, effective_from)
);
```

**Implementation Tasks:**
- [ ] Audit existing role system
- [ ] Implement role assignment UI
- [ ] Add time-bounded role support
- [ ] Create bulk assignment tool
- [ ] Build role history viewer

#### 3. Permission Audit

**UI Routes:**
- [ ] `/admin/permissions/audit` - Permission audit dashboard
- [ ] `/admin/permissions/user/[userId]` - User permission view
- [ ] `/admin/permissions/export` - Export for compliance

**Audit Capabilities:**
- [ ] "Who can access X?" queries
- [ ] "What can user Y do?" queries
- [ ] Permission changes over time
- [ ] Anomaly detection (unusual permission grants)
- [ ] Export to CSV/JSON/PDF

**Reports:**
- [ ] User-Role Matrix
- [ ] Role-Permission Matrix
- [ ] Recent Permission Changes
- [ ] High-Risk Permission Holders
- [ ] Permission Expiry Report (time-bounded roles)

**Implementation Tasks:**
- [ ] Create permission audit queries
- [ ] Build audit dashboard
- [ ] Implement export functionality
- [ ] Add watermarking to exports
- [ ] Create scheduled report emailer

---

## 0.3 Observability & Incident Ops

**Priority:** 🔴 HIGH - REQUIRED FOR PRODUCTION  
**Estimated Effort:** 1 week

### Acceptance Criteria

✅ **Primary:** Operator can diagnose incident and execute runbook within 5 minutes

### Deliverables

#### 1. Structured Audit Log Viewer

**UI Routes:**
- [ ] `/admin/audit-logs` - Main viewer
- [ ] `/admin/audit-logs/[eventId]` - Event details

**Filtering Capabilities:**
- [ ] Time range
- [ ] Event type (auth, data access, config change, etc.)
- [ ] User/actor
- [ ] Resource/entity affected
- [ ] Severity level
- [ ] Tenant (for multi-tenant admins)

**Display:**
- [ ] Timeline view (chronological)
- [ ] Correlation view (related events)
- [ ] Detailed event inspector (JSON + human-readable)

**Export:**
- [ ] CSV (for spreadsheet analysis)
- [ ] JSON (for SIEM ingestion)
- [ ] PDF (for audit submission)

**Implementation Tasks:**
- [ ] Verify audit log schema (should exist)
- [ ] Create search/filter UI
- [ ] Implement export functionality
- [ ] Add event correlation logic
- [ ] Build event detail views

#### 2. Alerting for Critical Signals

**Alert Types:**

**A. SLA Breach**
- [ ] Grievance step deadline approaching (24h warning)
- [ ] Grievance step deadline missed (immediate)
- [ ] Case assignment unresolved (configurable threshold)

**B. Data Access Anomalies**
- [ ] Export volume spike (>10x normal)
- [ ] Off-hours admin access
- [ ] Break-glass access used
- [ ] Bulk delete attempts
- [ ] RLS policy violation (should be impossible, but alert if detected)

**C. System Health**
- [ ] Database connection pool exhaustion
- [ ] High error rate (>1% of requests)
- [ ] Slow query detected (>5s)
- [ ] Deployment failed
- [ ] Backup failed

**Delivery Channels:**
- [ ] Email (for non-urgent)
- [ ] SMS (for urgent)
- [ ] Slack/Teams webhook
- [ ] PagerDuty integration (for on-call)

**Implementation Tasks:**
- [ ] Define alert thresholds in config
- [ ] Implement alert evaluation logic
- [ ] Create notification system (email, SMS, webhook)
- [ ] Build alert dashboard
- [ ] Add alert acknowledgment + escalation
- [ ] Set up test alert capability

#### 3. Runbooks

**Runbook Library:**

**Incident Response:**
- [ ] `RUNBOOK_INCIDENT_RESPONSE.md` - General incident process
- [ ] `RUNBOOK_DATA_BREACH.md` - Suspected data breach
- [ ] `RUNBOOK_UNAUTHORIZED_ACCESS.md` - Unauthorized access detected
- [ ] `RUNBOOK_DOS_ATTACK.md` - Service disruption/DoS

**Operational:**
- [ ] `RUNBOOK_ROLLBACK.md` - Deployment rollback procedures
- [ ] `RUNBOOK_RESTORE.md` - Database restore procedures
- [ ] `RUNBOOK_BACKUP_VERIFICATION.md` - Verify backup integrity
- [ ] `RUNBOOK_TENANT_PROVISIONING.md` - New tenant setup
- [ ] `RUNBOOK_USER_LOCKOUT.md` - Account lockout recovery

**Compliance:**
- [ ] `RUNBOOK_BREACH_NOTIFICATION.md` - Breach notification (legal requirements)
- [ ] `RUNBOOK_DATA_REQUEST.md` - GDPR/Law 25 data subject request
- [ ] `RUNBOOK_LEGAL_HOLD.md` - Activate legal hold
- [ ] `RUNBOOK_AUDIT_PREPARATION.md` - Prepare for external audit

**Database:**
- [ ] `RUNBOOK_MIGRATION_ROLLBACK.md` - Rollback migration
- [ ] `RUNBOOK_PERFORMANCE_DEGRADATION.md` - Diagnose slow queries
- [ ] `RUNBOOK_CONNECTION_POOL.md` - Connection pool exhaustion

**Runbook Format (Template):**
```markdown
# Runbook: [Title]

**Severity:** [Critical/High/Medium/Low]
**Estimated Time:** [X minutes]
**Requires:** [Permissions/access needed]

## Symptoms
- [Observable symptoms that trigger this runbook]

## Diagnosis
1. Check [specific metric/log]
2. Verify [specific condition]
3. ...

## Resolution Steps
1. [Step-by-step resolution]
2. ...

## Verification
- [ ] [How to confirm issue is resolved]

## Post-Incident
- [ ] [Follow-up tasks]
- [ ] Update incident log
- [ ] Notify stakeholders

## Escalation
If resolution fails after [X minutes], escalate to [role/person]
```

**Implementation Tasks:**
- [ ] Create runbook templates
- [ ] Write initial runbook set (10-12 runbooks)
- [ ] Add runbook quick-access to admin console
- [ ] Create runbook testing procedures (tabletop exercises)
- [ ] Set up runbook version control + review process

---

## Implementation Sequence

### Week 1-2: Evidence Automation
1. Define control matrix
2. Set up CI pipeline gates
3. Implement SBOM generation
4. Create evidence bundle generator
5. Test end-to-end

### Week 2-3: Admin Console
1. Audit existing tenant/role schema
2. Build admin console UI foundation
3. Implement tenant provisioning
4. Build role assignment UI
5. Create permission audit dashboard

### Week 3-4: Observability
1. Build audit log viewer
2. Implement alerting system
3. Write runbooks
4. Set up monitoring dashboards
5. End-to-end testing

---

## Success Metrics

- [ ] **Evidence bundle generation:** < 2 minutes
- [ ] **Release contract CI:** < 15 minutes
- [ ] **Tenant provisioning:** < 5 minutes (manual), < 30 seconds (API)
- [ ] **Permission audit query:** < 2 seconds
- [ ] **Alert delivery:** < 30 seconds from trigger
- [ ] **Runbook execution:** 90% success rate on first attempt

---

## Dependencies

**External:**
- GitHub Actions (CI/CD)
- Cosign or GPG (artifact signing)
- Email/SMS provider (alerts)
- SBOM tools: CycloneDX, SPDX (npm packages available)

**Internal:**
- Existing audit log infrastructure
- Existing RLS/permission system
- Existing tenant schema
- Test infrastructure

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CI gates too strict (block valid releases) | High | Implement override with 2-person approval + audit |
| Evidence bundle too large (>100MB) | Medium | Compress + archive, exclude raw test artifacts |
| Runbooks become stale | High | Quarterly review + tabletop testing |
| Alert fatigue | Medium | Tune thresholds based on first 2 weeks of production |
| SBOM generation slow | Low | Run in parallel with build, cache results |

---

## Completion Checklist

### 0.1 Release Contract + Evidence Pack
- [ ] Control matrix defined + linked to evidence
- [ ] CI pipeline with all gates implemented
- [ ] SBOM generation working
- [ ] Artifact signing working
- [ ] Evidence bundle generator tested
- [ ] Documentation complete

### 0.2 Admin Console v1
- [ ] Tenant provisioning UI
- [ ] Tenant config management
- [ ] Role assignment UI
- [ ] Permission audit dashboard
- [ ] Export functionality
- [ ] Admin console tested end-to-end

### 0.3 Observability & Incident Ops
- [ ] Audit log viewer built
- [ ] Filtering + export working
- [ ] Alert system implemented
- [ ] Alert delivery channels configured
- [ ] 10+ runbooks written
- [ ] Runbooks tested (tabletop)
- [ ] Monitoring dashboards deployed

### Integration Testing
- [ ] End-to-end evidence bundle generation
- [ ] Simulated incident response
- [ ] Tenant provisioning → role assignment → permission audit flow
- [ ] Alert trigger → notification → runbook execution

### Documentation
- [ ] Control matrix documented
- [ ] Admin console user guide
- [ ] Runbook library published
- [ ] Release process documented
- [ ] Training materials created

---

## Next Steps

1. ✅ Phase 0 plan documented
2. 🔄 Assess current implementation (what exists today?)
3. 📋 Create sprints/milestones
4. 📋 Assign implementation tasks
5. 📋 Begin development

