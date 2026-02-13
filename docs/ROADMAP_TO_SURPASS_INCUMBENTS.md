# Union Eyes: Roadmap to Surpass UnionWare-Class Incumbents

**Last Updated:** February 12, 2026  
**Status:** Active Development  
**Goal:** Deliver governance-native, audit-defensible system-of-record while achieving operational parity + superiority over UnionWare-tier incumbents

---

## Strategic Objectives

To surpass UnionWare-tier incumbents, Union Eyes must deliver **six hard requirements**:

1. **Membership & structure** (locals, units, employers, stewards, committees)
2. **Dues & finance rails** (ingest, reconcile, arrears, employer remittance)
3. **Case lifecycle completeness** (grievances → arbitration → settlement → enforcement)
4. **Comms & mobilization** (segmented outreach + proofs + engagement)
5. **Reporting & compliance** (board packets, audit exports, retention, legal holds)
6. **Implementation at scale** (migration tools, admin console, permissions, training)

---

## Current Strengths (Baseline)

Union Eyes is already strong on:
- ✅ FSM enforcement
- ✅ Immutability triggers
- ✅ RLS scaffolding
- ✅ Governance module primitives
- ✅ Release contract discipline

**Differentiator:** Governance-native, audit-defensible system-of-record

---

## Win Condition vs UnionWare

We surpass incumbents when we can credibly demonstrate:

- **Parity**: membership + dues + case tracking + reporting fully operational
- **Superiority**: immutable audit + governance-native controls + evidence bundles
- **Adoption**: organizer workflows + communications reduce tool sprawl  
- **Procurement**: SSO/SCIM + policies + runbooks + audit pack

---

## Phase 0: RC → Enterprise Production (2–4 weeks)

**Goal:** Convert "security-complete" into "deployable at a union"

### 0.1 Release Contract + Evidence Pack ⚠️ NON-NEGOTIABLE

**Deliverables:**
- [ ] Controls & Evidence Appendix (control matrix + automated evidence links)
- [ ] Release Contract CI (required tests + scanners + migration verification)
- [ ] Signed build provenance (artifact signing + SBOM: CycloneDX/SPDX)

**Acceptance Criteria:**
- One command generates "audit evidence bundle" (PDF/zip: controls, tests, migration checks, scanner outputs, versions)

### 0.2 Admin Console v1

**Deliverables:**
- [ ] Tenant provisioning + config (timezones, locales, retention)
- [ ] Role assignment (member/steward/rep/admin/auditor/external counsel)
- [ ] Permission audit (who can do what + export)

### 0.3 Observability & Incident Ops

**Deliverables:**
- [ ] Structured audit log viewer (filter/export)
- [ ] Alerting for critical signals (SLA breach, data access anomalies)
- [ ] Runbooks: rollback, restore, incident response, breach notification templates

**KPI:** CIO can ask "prove controls are working" and get answer in minutes

---

## Phase 1: Core AMS Parity (Membership + Structure) (6–10 weeks)

**Goal:** Match baseline operational model incumbents have

### 1.1 Union Structure Model (Org Graph)

**Data Model:**
- [ ] Union → locals → units → worksites → employers hierarchy
- [ ] Member statuses (active, retired, laid off, apprentice, etc.)
- [ ] Roles: steward, chief steward, rep, officer, committee member
- [ ] Committees: bargaining, grievance, safety, political, equity

**Features:**
- [ ] Org graph admin UI
- [ ] Bulk import (CSV templates + validation + previews)
- [ ] Role tenure + effective dates (audit + elections)

**Acceptance Criteria:**
- Can represent 80% of union structures without "custom fields"

### 1.2 Member Profile v2

**Deliverables:**
- [ ] Contact channels + preference center
- [ ] Employment attributes (classification, seniority date, site, shift)
- [ ] Member history timeline (status, employer changes)
- [ ] Identity & consent tracking

**KPI:** Admin can answer "who are our stewards for Site X?" instantly

### 1.3 Search + Segmentation

**Deliverables:**
- [ ] Full-text + faceted search on members
- [ ] Segments saved as lists (dynamic queries)
- [ ] Export controls (who can export, watermark, event logging)

---

## Phase 2: Dues & Finance Rails (Incumbent Moat) (8–12 weeks)

**Goal:** Credible finance workflows (finance is sticky - this retains customers)

### 2.1 Employer Remittance Ingestion

**Deliverables:**
- [ ] Import employer remittance files (CSV/Excel) + mapping templates
- [ ] Reconcile remittance vs expected dues
- [ ] Exceptions queue (missing members, mismatched amounts)

### 2.2 Member Dues Ledger

**Deliverables:**
- [ ] Per-member ledger (charges, credits, adjustments)
- [ ] Arrears logic + grace periods + reinstatement workflows
- [ ] Receipts and statements (PDF)

### 2.3 Payment Rails

**Options:**
- **Lane A:** Stripe/Moneris for member direct pay
- **Lane B:** Employer-only remittance (simpler, more common)

**Critical:**
- [ ] Immutable financial event log (append-only)
- [ ] Refund/chargeback handling as events, not edits

**Acceptance Criteria:**
- Finance admin can close a month and produce: dues summary, arrears list, reconciliation report

---

## Phase 3: Case Management "Union-Grade" (10–14 weeks)

**Goal:** Make grievances defensible end-to-end (beyond ticketing tools)

### 3.1 Full Case Lifecycle

**Deliverables:**
- [ ] Grievance intake → investigation → step meetings → arbitration → settlement → enforcement
- [ ] Multi-respondent cases (employer + supervisor)
- [ ] Outcome taxonomy (withdrawn, settled, upheld, denied, referred)

### 3.2 Evidence & Document Management

**Deliverables:**
- [ ] Case evidence locker (files + metadata)
- [ ] Redaction workflow (export-safe)
- [ ] Legal holds + retention rules per case type

### 3.3 Scheduling & Meeting Workflow

**Deliverables:**
- [ ] Step meeting scheduling (participants, agenda, minutes)
- [ ] Attendance + notes + action items
- [ ] Calendar integration (ICS export minimum)

### 3.4 Templates & Automation

**Deliverables:**
- [ ] Letter templates (intake acknowledgment, step notices, arbitration demand)
- [ ] Timeline auto-generation (from FSM transitions + events)

**KPI:** Reduce rep/admin time per grievance by 30–50% vs spreadsheet + email

---

## Phase 4: Communications & Organizing (Adoption + Value) (8–12 weeks)

**Goal:** Credible baseline where incumbents are weak

### 4.1 Messaging Core

**Deliverables:**
- [ ] Email + SMS (pluggable providers)
- [ ] Segmented campaigns (use saved segments)
- [ ] Opt-in/opt-out + consent compliance
- [ ] Delivery logs + click tracking (with privacy controls)

### 4.2 Organizer Workflows (Win Hearts Here)

**Deliverables:**
- [ ] Steward assignment + follow-up tasks
- [ ] Member outreach sequences (case-based or campaign-based)
- [ ] Field notes + relationship tracking (minimal CRM)

### 4.3 Push Notifications (Mobile)

**Deliverables:**
- [ ] PWA push or native wrapper
- [ ] Critical alerts: bargaining updates, strike votes, urgent notices

**Acceptance Criteria:**
- Local can run compliant campaign in <15 minutes without external tools

---

## Phase 5: Governance "Category Win" (10–16 weeks)

**Goal:** Turn differentiator into moat (what incumbents don't do)

### 5.1 Elections & Voting

**Scope Decision Required:**
- **Governance decisions** (reserved matters, golden share) ✅ already leaning here
- **Formal elections** (officers, constitutional votes) — higher requirements

**Features for Elections:**
- [ ] Voter roll generation (from membership + eligibility rules)
- [ ] Secret ballot + anti double-vote
- [ ] Observers/auditors access mode
- [ ] Results certification + immutable audit pack

### 5.2 Board Packet Automation

**Deliverables:**
- [ ] Monthly governance pack:
  - Open cases by SLA risk
  - Financial summary
  - Motions + votes + resolutions
  - Audit exceptions report
- [ ] Export as PDF + signed checksum

### 5.3 Policy Engine

**Deliverables:**
- [ ] Encode bylaws/policies as rules:
  - Eligibility rules
  - Cooling off periods
  - Quorum requirements
  - Retention requirements

**KPI:** "We can pass compliance audit with system evidence, not testimony"

---

## Phase 6: Enterprise Readiness (Institutional Buyers) (6–10 weeks)

**Goal:** CIO procurement + security review pass

### 6.1 Identity & Access

**Deliverables:**
- [ ] SSO (SAML/OIDC), SCIM provisioning
- [ ] Break-glass admin
- [ ] MFA policies + device session controls

### 6.2 Data Governance

**Deliverables:**
- [ ] Retention schedules per data class
- [ ] Data residency options (Canada/EU)
- [ ] DSR workflows (GDPR/Quebec Law 25)
- [ ] Export controls (role-based + purpose logging)

### 6.3 Integration Surface

**Deliverables:**
- [ ] Webhooks
- [ ] Read-only reporting API
- [ ] HR/Payroll integration adapters (file-based v1)

---

## 18 Concrete Deliverables (Epic-Level)

1. **Org graph** (locals/units/worksites/employers)
2. **Member profile v2** + status history
3. **Role & committee management** (tenure-based)
4. **Bulk import** + mapping UI + validation reports
5. **Segmentation engine** + saved lists
6. **Dues ledger** + arrears policy engine
7. **Employer remittance ingestion** + reconciliation queue
8. **Payments lane** (Stripe/Moneris) + immutable financial log
9. **Case lifecycle expansion** (investigation → arbitration)
10. **Evidence locker** + redaction + export packs
11. **Meeting scheduler** + minutes + action items
12. **Template engine** for letters + notices
13. **Messaging** (email/SMS) + consent center + delivery logs
14. **Organizer workflows** (assignments + sequences + field notes)
15. **Election module** (voter roll + ballot + results certification)
16. **Board packet generator** + signed reports
17. **Enterprise IAM** (SSO/SCIM/break-glass)
18. **Data governance suite** (retention, legal holds, DSR)

---

## Timeline Overview

| Phase | Duration | Focus Area | Status |
|-------|----------|------------|--------|
| Phase 0 | 2–4 weeks | Enterprise Production Readiness | 🔄 Planning |
| Phase 1 | 6–10 weeks | Core AMS Parity | 📋 Queued |
| Phase 2 | 8–12 weeks | Dues & Finance Rails | 📋 Queued |
| Phase 3 | 10–14 weeks | Case Management Union-Grade | 📋 Queued |
| Phase 4 | 8–12 weeks | Communications & Organizing | 📋 Queued |
| Phase 5 | 10–16 weeks | Governance Category Win | 📋 Queued |
| Phase 6 | 6–10 weeks | Enterprise Readiness | 📋 Queued |

**Total Timeline:** ~50-78 weeks (12-18 months) for complete delivery

---

## Next Actions

1. ✅ Document roadmap
2. 🔄 Assess current implementation state
3. 📋 Create Phase 0 detailed implementation plan
4. 📋 Set up sprint/milestone tracking
5. 📋 Begin Phase 0.1 (Release Contract + Evidence Pack)

---

## Success Metrics

### Operational Metrics
- Time to close grievance (target: -30-50% vs spreadsheet)
- Campaign setup time (target: <15 minutes)
- Finance month-end close time (target: <2 hours)
- Admin "who are stewards for Site X" query time (target: <30 seconds)

### Procurement Metrics
- CIO proof-of-controls time (target: <5 minutes)
- Security review pass rate (target: 100%)
- SSO/SCIM integration time (target: <1 day)

### Audit Metrics
- Audit evidence bundle generation time (target: <1 minute)
- Controls coverage (target: 100% of critical controls)
- Immutable event log completeness (target: 100%)

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Finance module complexity | High | Start with Lane B (employer-only), defer direct payments |
| Elections legal requirements vary | Medium | Build flexible policy engine, defer formal officer elections |
| Integration surface sprawl | Medium | Start with webhooks + read-only API, add adapters incrementally |
| Timeline slippage | High | Phase 0 is non-negotiable, other phases can be resequenced |

