# Immediate Action Plan: Phase 0 Implementation

**Created:** February 12, 2026  
**Timeline:** 3-5 weeks  
**Goal:** Make Union Eyes deployment-ready for enterprise union environments

---

## Critical Path to Deployment

```
Week 1-2: Evidence & Admin UI (Parallel)
    ├─ Evidence Bundle Generator (3-5 days)
    └─ Admin Console UI Foundation (7-10 days)

Week 2-3: Admin Console Completion
    ├─ Tenant Management UI
    ├─ Role Assignment UI
    └─ Permission Audit Dashboard

Week 3-4: Observability & Alerting
    ├─ Alert Rule Engine (3-4 days)
    ├─ Notification Delivery (2-3 days)
    └─ Runbook Library (2-3 days)

Week 4-5: Integration & Testing
    ├─ End-to-end testing
    ├─ Documentation
    └─ Training materials
```

---

## Sprint 1: Evidence Automation (Week 1)

### Goal
One command generates complete audit evidence bundle (PDF/zip)

### Tasks

#### Day 1-2: Control Matrix
- [ ] Create `docs/compliance/CONTROL_MATRIX.md`
- [ ] Map controls to NIST/SOC2/ISO27001
- [ ] Link each control to:
  - Automated test
  - Evidence source
  - Documentation

#### Day 2-3: SBOM Generation
- [ ] Install CycloneDX npm package: `pnpm add -D @cyclonedx/cyclonedx-npm`
- [ ] Create `scripts/compliance/generate-sbom.ts`
- [ ] Integrate into build pipeline (`.github/workflows/release-contract.yml`)
- [ ] Test SBOM generation

#### Day 3-4: Artifact Signing
- [ ] Set up cosign (https://github.com/sigstore/cosign)
- [ ] Create GitHub secret for signing key
- [ ] Create `scripts/build/sign-artifacts.ts`
- [ ] Update release workflow to sign:
  - Docker images
  - Build artifacts

#### Day 4-5: Evidence Bundle Generator
- [ ] Create `scripts/compliance/generate-evidence-bundle.ts`
- [ ] Implement collectors:
  - Test results (JUnit XML)
  - Security scans (SARIF)
  - Migration logs
  - SBOM
  - Signatures
- [ ] Generate PDF report (use Puppeteer or similar)
- [ ] Create zip archive with integrity checksum
- [ ] Test end-to-end

**Acceptance Criteria:**
```bash
pnpm generate:evidence-bundle --output ./evidence.zip
# Generates evidence-bundle-{version}-{timestamp}.zip in <2 minutes
```

---

## Sprint 2: Admin Console UI (Week 1-2)

### Goal
Admin can provision tenant, assign roles, audit permissions without database access

### Tasks

#### Day 1-2: Admin Console Layout
- [ ] Create `/app/admin/layout.tsx` (if not exists)
- [ ] Create admin navigation:
  - Dashboard
  - Tenants
  - Users & Roles
  - Audit Logs
  - System Settings
- [ ] Add role guard (min role: ADMIN)

#### Day 3-4: Tenant Management
- [ ] Create `/app/admin/tenants/page.tsx` - List all tenants
- [ ] Create `/app/admin/tenants/new/page.tsx` - Provisioning wizard
- [ ] Create `/app/admin/tenants/[id]/page.tsx` - Tenant config
- [ ] Build tenant configuration form:
  - Metadata (name, slug, contact)
  - Localization (timezone, locale, formats)
  - Retention policies
  - Feature flags
- [ ] Integrate with `actions/admin-actions.ts`

#### Day 5-7: Role Management
- [ ] Create `/app/admin/roles/page.tsx` - Role definitions list
- [ ] Create `/app/admin/users/[userId]/roles/page.tsx` - User role assignment
- [ ] Build role assignment form:
  - Select role(s)
  - Set effective dates (from/to)
  - Assignment reason
  - Approval workflow (if required)
- [ ] Bulk assignment UI (CSV upload)
- [ ] Integrate with `db/queries/enhanced-rbac-queries.ts`

#### Day 8-10: Permission Audit
- [ ] Create `/app/admin/permissions/audit/page.tsx`
- [ ] Build query interfaces:
  - "Who can access X?" query
  - "What can user Y do?" query
  - Permission changes over time
- [ ] Create reports:
  - User-Role Matrix (table view)
  - Role-Permission Matrix (heatmap)
  - Recent Permission Changes (timeline)
  - High-Risk Permission Holders (list)
- [ ] Add export functionality (CSV, JSON, PDF)
- [ ] Add watermarking to exports

**Acceptance Criteria:**
- Admin can create tenant in <5 minutes
- Admin can assign role with effective dates
- Admin can answer "who are stewards for Local 123?" in <30 seconds

---

## Sprint 3: Observability (Week 2-3)

### Goal
Operator can diagnose incident and execute runbook within 5 minutes

### Tasks

#### Day 1-2: Audit Log Integration
- [ ] Create `/app/admin/audit-logs/page.tsx`
- [ ] Integrate existing `components/compliance/audit-log-viewer.tsx`
- [ ] Add route to admin console navigation
- [ ] Test filtering, export, detail views

#### Day 3-5: Alerting System
- [ ] Create `lib/alerting/alert-engine.ts`
- [ ] Define alert rules:
  ```typescript
  interface AlertRule {
    id: string;
    name: string;
    condition: (context: Context) => boolean;
    severity: 'info' | 'warning' | 'critical';
    channels: ('email' | 'sms' | 'slack' | 'pagerduty')[];
    throttle: number; // minutes
  }
  ```
- [ ] Implement alert types:
  - SLA breach (grievance deadlines)
  - Export volume spike
  - Off-hours admin access
  - Break-glass usage
  - System health (DB connections, error rate)
- [ ] Create notification service:
  - [ ] Email (use existing email infrastructure)
  - [ ] SMS (Twilio integration)
  - [ ] Slack webhook
- [ ] Create alert dashboard `/app/admin/alerts/page.tsx`
- [ ] Test alert delivery

#### Day 6-8: Runbook Library
- [ ] Create `docs/runbooks/` directory
- [ ] Write runbooks (use template):
  - [ ] `INCIDENT_RESPONSE.md`
  - [ ] `DATA_BREACH.md`
  - [ ] `UNAUTHORIZED_ACCESS.md`
  - [ ] `ROLLBACK.md`
  - [ ] `RESTORE.md`
  - [ ] `BACKUP_VERIFICATION.md`
  - [ ] `TENANT_PROVISIONING.md`
  - [ ] `USER_LOCKOUT.md`
  - [ ] `BREACH_NOTIFICATION.md`
  - [ ] `LEGAL_HOLD.md`
  - [ ] `MIGRATION_ROLLBACK.md`
  - [ ] `PERFORMANCE_DEGRADATION.md`
- [ ] Create runbook index `/app/admin/runbooks/page.tsx`
- [ ] Add quick-access links in admin console
- [ ] Schedule tabletop exercise

**Runbook Template:**
```markdown
# Runbook: [Title]

**Severity:** [Critical/High/Medium/Low]
**Estimated Time:** [X minutes]
**Requires:** [Permissions/access needed]

## Symptoms
- [Observable symptoms]

## Diagnosis
1. Check X
2. Verify Y

## Resolution Steps
1. Step-by-step guide

## Verification
- [ ] Confirm issue resolved

## Post-Incident
- [ ] Update incident log
- [ ] Notify stakeholders

## Escalation
If not resolved in X minutes, escalate to Y
```

**Acceptance Criteria:**
- Alert fires within 30 seconds of trigger
- Operator can access runbook in <1 minute
- 90% of runbooks execute successfully on first attempt

---

## Sprint 4: Integration & Testing (Week 4)

### Tasks

#### Day 1-3: End-to-End Testing
- [ ] Test evidence bundle generation
- [ ] Test tenant provisioning flow
- [ ] Test role assignment → permission audit flow
- [ ] Test alert trigger → notification → runbook execution
- [ ] Test simulated incident response

#### Day 4-5: Documentation
- [ ] Admin console user guide
- [ ] Evidence bundle guide
- [ ] Alert configuration guide
- [ ] Runbook execution guide
- [ ] Training video (optional)

#### Day 5: Release Prep
- [ ] Final QA
- [ ] Security review
- [ ] Performance testing
- [ ] Create release notes

**Acceptance Criteria:**
- ✅ One-command evidence bundle generation (<2 min)
- ✅ Admin console functional (tenant, roles, audit)
- ✅ Alerting system operational
- ✅ 12+ runbooks documented
- ✅ End-to-end tests passing
- ✅ Documentation complete

---

## Resource Requirements

### Development
- **1-2 Full-Stack Developers** (preferred)
  - React/Next.js proficiency
  - TypeScript strong
  - Postgres/Drizzle experience
  - CI/CD knowledge

### DevOps
- **0.5 DevOps Engineer**
  - GitHub Actions
  - Artifact signing
  - SBOM generation
  - Alert integration (Slack/PagerDuty)

### Design (Optional)
- **0.25 UI/UX Designer**
  - Admin console layouts
  - Dashboard design
  - Consistent with existing design system

---

## Success Metrics

### Technical
- [ ] Evidence bundle generation: <2 minutes
- [ ] Release contract CI: <15 minutes
- [ ] Tenant provisioning: <5 minutes (manual), <30 seconds (API)
- [ ] Permission audit query: <2 seconds
- [ ] Alert delivery: <30 seconds

### Business
- [ ] CIO can prove controls in <5 minutes
- [ ] Admin can provision tenant without dev support
- [ ] Operator can respond to incident using runbook
- [ ] 100% of critical controls have automated evidence
- [ ] 0 manual steps in release process

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CI gates too strict | Medium | High | Implement override with 2-person approval |
| Evidence bundle too large | Medium | Medium | Compress + archive, exclude raw artifacts |
| Alert fatigue | High | Medium | Tune thresholds in first 2 weeks |
| Runbooks become stale | Medium | High | Quarterly review + tabletop testing |
| Resource contention | Medium | High | Prioritize Phase 0 over new features |

---

## Dependencies

### External Services
- GitHub Actions (CI/CD)
- Cosign or GPG (artifact signing)
- Email provider (alerts)
- SMS provider (Twilio for alerts)
- Slack webhook (optional)

### Internal
- Existing audit log infrastructure ✅
- Existing RLS/permission system ✅
- Existing tenant schema ✅
- Existing test infrastructure ✅

---

## Go/No-Go Criteria (Week 5)

### Go ✅
- [ ] Evidence bundle generates successfully
- [ ] Admin console deployed and functional
- [ ] At least 10 runbooks documented
- [ ] Alerting system tested (at least email channel)
- [ ] End-to-end tests passing
- [ ] Documentation complete

### No-Go 🛑 (Requires Extension)
- Evidence bundle fails
- Admin console major bugs
- No runbooks documented
- Alerting system not functional
- Critical tests failing

---

## Post-Phase 0 Handoff

### Deliverables
1. ✅ Evidence bundle generator (CLI + automation)
2. ✅ Admin console (tenant, roles, permissions, audit logs)
3. ✅ Alerting system (rule engine + notifications)
4. ✅ Runbook library (12+ runbooks)
5. ✅ Documentation (user guides + training materials)

### Next Phase Readiness
- **Phase 1 (Membership + Structure):** Ready to start
- **Phase 2 (Dues + Finance):** Requires planning
- **Phase 3 (Case Lifecycle):** Can leverage existing grievance schema

---

## Daily Standup Template

### Questions
1. What did you complete yesterday?
2. What will you complete today?
3. Any blockers?

### Focus Areas
- **Week 1:** Evidence automation
- **Week 2:** Admin console UI
- **Week 3:** Observability + alerting
- **Week 4:** Testing + documentation

---

## Getting Started (Day 1 Checklist)

### Developer Setup
- [ ] Clone repo
- [ ] Install dependencies: `pnpm install`
- [ ] Run database migrations
- [ ] Start dev server: `pnpm dev`
- [ ] Review roadmap docs

### First Tasks
- [ ] Create control matrix draft
- [ ] Set up CycloneDX npm package
- [ ] Create admin console layout skeleton
- [ ] Review existing audit log viewer component

---

## Questions for Leadership

1. **Budget approval?** Any external services needed (Twilio, PagerDuty)?
2. **Design resources?** Can we get UI/UX support for admin console?
3. **DevOps support?** Who can help with artifact signing setup?
4. **First customer?** Which union/local will be the pilot for Phase 0?
5. **Timeline flexibility?** Can we extend to 5 weeks if needed?

---

## Contact & Support

- **Project Lead:** [Name]
- **Tech Lead:** [Name]
- **DevOps:** [Name]
- **Slack Channel:** #phase-0-implementation

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-12 | 1.0 | Initial action plan | AI Assistant |

