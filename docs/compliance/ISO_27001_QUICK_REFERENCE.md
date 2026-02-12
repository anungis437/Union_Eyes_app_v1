# ISO 27001:2022 Quick Reference
# Union Eyes v2 - Gap Analysis Summary

**Last Updated:** February 2026  
**Full Report:** [ISO_27001_2022_GAP_ANALYSIS.md](./ISO_27001_2022_GAP_ANALYSIS.md)

---

## 🎯 At a Glance

```
Implementation Status:  62% Ready for Certification
Timeline to Certification:  6-9 months
Primary Gaps:  Organizational policies (not technical)
Security Rating:  A-Level (9.5/10)
```

---

## 📊 Control Implementation Status

| Category | Total | Implemented | Partial | Missing | N/A |
|----------|-------|-------------|---------|---------|-----|
| **A.5 Organizational** | 37 | 23 (62%) | 11 (30%) | 3 (8%) | 0 |
| **A.6 People** | 8 | 1 (12%) | 3 (38%) | 4 (50%) | 0 |
| **A.7 Physical** | 14 | 4 (29%) | 3 (21%) | 0 | 7 (50%) |
| **A.8 Technological** | 34 | 27 (79%) | 6 (18%) | 0 | 1 (3%) |
| **TOTAL** | **93** | **55 (59%)** | **23 (25%)** | **7 (8%)** | **8 (9%)** |

---

## 🔴 Critical Gaps (Priority P0)

**Must Complete Before Certification (Weeks 1-8)**

1. **Information Security Policy** (A.5.1)
   - Status: Missing overarching ISMS policy
   - Effort: 3-5 days
   - Owner: Security Team + Executive approval

2. **Asset Management Register** (A.5.9)
   - Status: No formal asset inventory
   - Effort: 5-7 days
   - Owner: CTO + Security Team

3. **Risk Assessment & Treatment Framework** (implied)
   - Status: No formal risk management process
   - Effort: 7-10 days
   - Owner: Security Team + Risk Committee

4. **Supplier Security Management** (A.5.19, A.5.20)
   - Status: No vendor risk assessment process
   - Effort: 5-7 days
   - Owner: Procurement + Security Team

5. **ISMS Scope Statement** (Clause 4.3)
   - Status: Missing scope definition
   - Effort: 1-2 days
   - Owner: Executive Management

**Total P0 Effort:** ~4-5 weeks

---

## 🟡 High Priority Gaps (Priority P1)

**Important for Maturity (Weeks 9-16)**

### People Security
- HR Security Policy (screening, NDAs, offboarding) - A.6.1, A.6.2, A.6.5, A.6.6
- Security Awareness Training Program - A.6.3
- Remote Work Security expansion - A.6.7

### Organizational
- Management Responsibilities (formal review process) - A.5.4
- Threat Intelligence subscription - A.5.7
- Secure SDLC documentation - A.5.8
- Operations Manual (consolidate runbooks) - A.5.37
- Independent Security Review schedule - A.5.35
- Supplier monitoring processes - A.5.22

**Total P1 Effort:** ~6-8 weeks

---

## 🟢 Quick Wins (90%+ Complete)

**Implementation Exists, Documentation Needed (Weeks 1-3)**

1. **Access Control Policy** - Already exists, needs review (A.5.15)
2. **Cryptography Policy** - Formalize ENCRYPTION_STANDARDS.md (A.8.24)
3. **Incident Response** - Already have IR plan, formalize procedures (A.5.24-28)
4. **Backup/Recovery** - Already documented, link to ISMS (A.5.29, A.5.30)
5. **Segregation of Duties** - RLS implemented, document policies (A.5.3)
6. **Authentication** - Clerk + MFA, document requirements (A.8.5)
7. **Logging & Monitoring** - Sentry + audit logs, create monitoring policy (A.8.15, A.8.16)
8. **Secure Coding** - TypeScript + ESLint, document standards (A.8.28)
9. **Security Testing** - 58/58 tests, document test strategy (A.8.29)
10. **Data Classification** - Already classified, formalize labeling (A.5.12, A.5.13)

**Quick Win Effort:** 2-3 weeks total

---

## ✅ Strengths (Fully Implemented)

### Technological Excellence
✅ **A.8.2 Privileged Access Rights** - 26-role RBAC, hierarchical  
✅ **A.8.3 Information Access Restriction** - RLS on 70+ tables  
✅ **A.8.5 Secure Authentication** - Clerk JWT + MFA  
✅ **A.8.8 Vulnerability Management** - Dependabot + GitHub scanning  
✅ **A.8.12 Data Leakage Prevention** - RLS + encryption + rate limiting  
✅ **A.8.13 Information Backup** - Azure 35-day retention, geo-replicated  
✅ **A.8.15 Logging** - Dual-tier (application + audit)  
✅ **A.8.16 Monitoring** - Sentry real-time alerts  
✅ **A.8.20 Networks Security** - TLS 1.3, Azure VNet  
✅ **A.8.24 Cryptography** - AES-256-GCM, Azure Key Vault HSM  
✅ **A.8.25 Secure SDLC** - GitHub workflows, release contract  
✅ **A.8.26 Application Security** - Input validation, SQL injection prevention  
✅ **A.8.27 Secure Architecture** - Defense-in-depth, fail-secure  

### Organizational Excellence
✅ **A.5.2 Security Roles** - 26 defined roles  
✅ **A.5.3 Segregation** - RLS + employer firewall  
✅ **A.5.5 Contact with Authorities** - PIPEDA 72-hour notification  
✅ **A.5.12 Data Classification** - 4-tier system (PUBLIC→RESTRICTED)  
✅ **A.5.14 Information Transfer** - TLS 1.3 + webhook verification  
✅ **A.5.15-18 Access Control Suite** - Comprehensive policies + RBAC  
✅ **A.5.23 Cloud Services** - Azure Canada Central/East  
✅ **A.5.24-28 Incident Management Suite** - Comprehensive IR plan  
✅ **A.5.29-30 BC/DR** - RTO 4hrs, quarterly testing  
✅ **A.5.31 Regulatory Compliance** - PIPEDA, GDPR, provincial laws  
✅ **A.5.33 Records Protection** - 7-year retention, immutable logs  
✅ **A.5.34 PII Protection** - AES-256-GCM + privacy consent  

---

## 📋 6-Month Implementation Roadmap

### Month 1-2: Critical Documentation (P0)
- [ ] Week 1: Information Security Policy + ISMS Scope
- [ ] Week 2: Asset Inventory initiation
- [ ] Week 3: Asset Inventory completion + Risk Framework
- [ ] Week 4: Risk Assessment + Supplier Security Program

**Milestone:** P0 gaps closed, executive approval obtained

---

### Month 3-4: Policy Consolidation (P1)
- [ ] Week 5-6: HR Security policies (screening, training, NDAs)
- [ ] Week 7-8: Operations Manual (consolidate runbooks)
- [ ] Week 9-10: Physical/Remote Work security expansion
- [ ] Week 11-12: Policy cross-references + gap closure

**Milestone:** P1 policies complete, training materials developed

---

### Month 5-6: Pre-Audit Readiness
- [ ] Week 13: Evidence collection (logs, reports, certificates)
- [ ] Week 14: Internal audit simulation + remediation
- [ ] Week 15: Management review + ISMS approval
- [ ] Week 16: External pre-assessment (optional)

**Milestone:** Audit-ready, management sign-off

---

### Month 7-9: Certification Audit
- [ ] Week 17-18: Stage 1 Audit (documentation review)
- [ ] Week 19-24: Stage 2 Audit (implementation testing)
- [ ] Week 24+: Non-conformity resolution
- [ ] **Certification Achieved** 🎉

---

## 💰 Estimated Investment

### Internal Effort
- **Documentation:** 120-160 hours (Security Team)
- **Evidence Collection:** 40 hours
- **Training Development:** 40 hours
- **Management Participation:** 20 hours
- **Internal Audit:** 40 hours
- **Total:** ~300 hours (~2 months FTE)

### External Costs
- **ISO 27001 Certification Body:** $15,000-$25,000 CAD
- **Pre-Assessment (optional):** $5,000-$8,000 CAD
- **Training Materials:** $2,000-$5,000 CAD
- **Consultant Support (optional):** $10,000-$20,000 CAD

**Total Investment:** $32,000-$58,000 CAD + 300 hours internal

---

## 🗂️ Required Documentation

### Level 1: ISMS Manual (Strategic)
- [x] ISMS Scope Statement - **TO CREATE**
- [x] Information Security Policy - **TO CREATE**
- [x] Risk Management Framework - **TO CREATE**
- [x] Asset Inventory - **TO CREATE**
- [ ] Risk Register (living document)
- [ ] Statement of Applicability (control status)

### Level 2: Domain Policies (Tactical)
- [x] Access Control Policy ✅ **EXISTS**
- [x] Encryption Standards ✅ **EXISTS**
- [x] Backup/Recovery Policy ✅ **EXISTS**
- [x] Incident Response Plan ✅ **EXISTS**
- [x] Data Classification Policy ✅ **EXISTS**
- [ ] Supplier Security Program - **TO CREATE**
- [ ] HR Security Policy - **TO CREATE**
- [ ] Operations Security Policy - **TO CREATE**
- [ ] Acceptable Use Policy - **TO CREATE**

### Level 3: Procedures (Operational)
- [ ] Access Provisioning Procedures
- [ ] Offboarding Procedures
- [ ] Vulnerability Management Procedures
- [ ] DR Testing Procedures
- [ ] Incident Response Runbooks (expand existing)

### Level 4: Records (Evidence)
- [x] Audit logs (system-generated) ✅
- [ ] Risk assessments (quarterly)
- [ ] Training records
- [ ] Incident reports
- [ ] Vendor assessments
- [ ] Management reviews

---

## 📞 Key Contacts

**ISMS Implementation:**
- **Security Lead:** [Name] - Policy development
- **CTO:** [Name] - Technical controls, asset inventory
- **HR Manager:** [Name] - People security policies
- **Procurement:** [Name] - Supplier security

**Certification:**
- **Certification Body:** [To be selected]
- **Pre-Assessment Consultant:** [Optional]

---

## 🔗 Related Documentation

### Security & Compliance (Existing)
- [Security Verification Report](../security/SECURITY_VERIFICATION_REPORT.md) - 9.5/10 rating
- [Security Audit RLS](../security/SECURITY_AUDIT_RLS.md) - RLS implementation details
- [SOC 2 Controls Evidence](../audit/SOC2_CONTROLS_EVIDENCE.md) - Control mapping
- [RLS Auth RBAC Alignment](../security/RLS_AUTH_RBAC_ALIGNMENT.md)

### Policies (Existing)
- [Access Control Policy](./policies/ACCESS_CONTROL_POLICY.md)
- [Encryption Standards](./policies/ENCRYPTION_STANDARDS.md)
- [Backup Recovery Policy](./policies/BACKUP_RECOVERY_POLICY.md)
- [Incident Response Plan](./policies/INCIDENT_RESPONSE_PLAN.md)
- [Data Classification Policy](./policies/DATA_CLASSIFICATION_POLICY.md)

### Operations
- [Production Runbooks](../union-blind-spot-validator/runbooks/PRODUCTION_RUNBOOKS.md)
- [Migration Verification Guide](../operations/MIGRATION_VERIFICATION_GUIDE.md)
- [GitHub Workflows Inventory](../operations/GITHUB_WORKFLOWS_INVENTORY.md)

---

## 🎯 Next Steps

### Week 1 Actions
1. [ ] Review gap analysis with executive team
2. [ ] Assign ISMS implementation lead
3. [ ] Schedule weekly ISMS working sessions
4. [ ] Begin Information Security Policy draft
5. [ ] Initiate asset inventory (Azure resources)

### Week 2 Actions
1. [ ] Complete Information Security Policy
2. [ ] Obtain executive approval on ISMS Scope
3. [ ] Complete asset inventory
4. [ ] Begin risk assessment workshops

### Week 3-4 Actions
1. [ ] Complete risk assessment (minimum 10 risks)
2. [ ] Develop supplier security program
3. [ ] Conduct initial vendor assessments (Clerk, Stripe, Vercel)
4. [ ] Create risk treatment plans

---

## 📈 Success Metrics

**Certification Readiness:**
- [ ] 90%+ controls implemented (currently 62%)
- [ ] 100% P0 documentation complete (currently 0%)
- [ ] 100% P1 policies complete (currently 40%)
- [ ] Risk register with 20+ documented risks (currently 0)
- [ ] Management review completed

**Operational Metrics:**
- [ ] Zero critical vulnerabilities open
- [ ] 100% MFA adoption for admin/financial roles
- [ ] <15 min mean time to detect security events
- [ ] 100% backup success rate
- [ ] 100% quarterly DR test success

---

## 📚 Resources

### ISO 27001:2022 References
- **ISO 27001:2022 Standard:** Information security management systems - Requirements
- **ISO 27002:2022 Standard:** Code of practice for information security controls
- **ISO 27017:2015:** Cloud security supplement
- **ISO 27018:2019:** PII protection in public clouds

### Training Resources
- **ISO 27001 Lead Implementer Course:** 5-day certification
- **ISO 27001 Internal Auditor Course:** 2-day certification
- **ISMS Documentation Templates:** Available from certification bodies

### Useful Links
- Office of the Privacy Commissioner of Canada (PIPEDA guidance)
- Canadian Centre for Cyber Security (CCCS) resources
- NIST Cybersecurity Framework
- CIS Controls v8

---

**Document Version:** 1.0  
**Owner:** Security Team  
**Review Schedule:** Monthly during implementation, quarterly after certification  
**Next Review:** [Date + 1 month]
