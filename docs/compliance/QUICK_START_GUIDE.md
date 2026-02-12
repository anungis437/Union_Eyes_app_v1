# Compliance Implementation - Quick Start Guide

## 📋 Overview

This guide provides step-by-step instructions to implement all compliance gap remediations in Union Eyes.

**Estimated Total Time:** 18-24 weeks  
**Team Required:** 2-3 developers, 1 compliance specialist  
**Breaking Changes:** None - all implementations are backward compatible

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites Check

```bash
# 1. Check Node.js version (18+ required)
node --version

# 2. Check pnpm
pnpm --version

# 3. Verify environment variables
cat .env.local | grep -E "(DATABASE_URL|SUPABASE|STRIPE)"

# 4. Install dependencies
pnpm install
```

### Phase 1: Foundation (Week 1-2)

**Impact:** None (background setup)

```bash
# DRY RUN first (recommended)
pwsh scripts/compliance/deploy-compliance-implementation.ps1 -Phase 1 -DryRun

# Execute for real
pwsh scripts/compliance/deploy-compliance-implementation.ps1 -Phase 1

# Verify
pnpm test __tests__/compliance/schema*.test.ts
```

**What happens:**
- ✅ Creates PCI-DSS, AML/KYC, ISO 27001 database tables
- ✅ Initializes compliance configurations
- ✅ No user-facing changes

---

## 📊 Phase-by-Phase Implementation

### Phase 1: Foundation Setup ⚙️

**Duration:** 2 weeks  
**Effort:** Low  
**Risk:** None

```bash
# Step 1: Run migrations
pnpm db:migrate:compliance

# Step 2: Initialize baseline data
pnpm compliance:init:pci
pnpm compliance:init:aml
pnpm compliance:init:iso

# Step 3: Verify
pnpm test:compliance:phase1
```

**Deliverables:**
- [x] Database schema for all compliance frameworks
- [x] Baseline configuration data
- [x] Test coverage for schema

---

### Phase 2: PCI-DSS Implementation 💳

**Duration:** 4 weeks  
**Effort:** Medium  
**Risk:** Low (background tracking)

```bash
# Step 1: Deploy PCI services
pnpm compliance:deploy:pci

# Step 2: Document cardholder data flow
# Manual: Review and sign docs/compliance/pci-cardholder-data-flow.md

# Step 3: Enable PCI tracking
pnpm compliance:enable:pci

# Step 4: Set up monitoring
pnpm compliance:setup:pci-monitoring

# Step 5: Generate first report
pnpm compliance:report:pci
```

**Manual Actions Required:**
1. **Schedule Quarterly Scan** (Required)
   - Choose approved ASV (Qualys, Trustwave, Rapid7, SecurityMetrics)
   - Schedule scan within 30 days
   - Cost: ~$200-500/quarter

2. **Complete SAQ-A** (Required)
   - Download: [PCI SSC SAQ-A](https://www.pcisecuritystandards.org/document_library)
   - Complete 22 requirements
   - Attest and sign
   - Store in `docs/compliance/pci/`

3. **Document Stripe Configuration**
   - Screenshot Stripe dashboard settings
   - Document API key storage
   - Evidence location: `s3://union-eyes-compliance/pci-dss/`

**Deliverables:**
- [x] PCI-DSS compliance tracking active
- [x] Cardholder data flow documented
- [x] Quarterly scan scheduled
- [x] SAQ-A completed and attested
- [x] Key rotation automated

---

### Phase 3: AML/KYC Implementation 🔍

**Duration:** 6 weeks  
**Effort:** High  
**Risk:** Medium (transaction screening)

```bash
# Step 1: Configure AML thresholds
pnpm compliance:config:aml

# Step 2: Deploy AML services
pnpm compliance:deploy:aml

# Step 3: Screen existing high-value members (phased rollout)
pnpm compliance:screen:high-value-members

# Step 4: Enable transaction monitoring (gradual)
pnpm compliance:enable:aml:phase1  # $10k+ only
# Wait 1 week, monitor
pnpm compliance:enable:aml:phase2  # $5k+ 
# Wait 1 week, monitor
pnpm compliance:enable:aml:full    # All transactions

# Step 5: Test SAR workflow
pnpm compliance:test:sar-workflow
```

**API Keys Required:**
1. **Sanctions Screening** (Choose one):
   - ComplyAdvantage: `COMPLYADVANTAGE_API_KEY`
   - Refinitiv: `REFINITIV_API_KEY`
   - Cost: ~$500-2000/month

2. **PEP Screening** (Choose one):
   - Dow Jones Watchlist: `DOW_JONES_API_KEY`
   - LexisNexis: `LEXISNEXIS_API_KEY`
   - Cost: ~$300-1500/month

**Configuration:**

```bash
# .env.local
ENABLE_AML_MONITORING=true
AML_MONITORING_THRESHOLD=10000  # Start with $10k+
COMPLYADVANTAGE_API_KEY=your_key_here
DOW_JONES_API_KEY=your_key_here

# Thresholds (Canada/FINTRAC)
AML_LARGE_TRANSACTION_THRESHOLD=10000  # CAD - FINTRAC reporting
AML_DAILY_LIMIT=5000
AML_MONTHLY_LIMIT=50000
```

**Manual Actions Required:**
1. **Register with FINTRAC**
   - Register as Reporting Entity
   - Obtain FINTRAC account
   - Configure electronic filing

2. **Compliance Officer Training**
   - AML/KYC fundamentals
   - SAR filing procedures
   - Tools and dashboards

3. **Policies & Procedures**
   - Update AML policy
   - SAR filing workflow
   - Escalation procedures

**Deliverables:**
- [x] Transaction monitoring active
- [x] Sanctions screening operational
- [x] PEP screening operational
- [x] SAR workflow tested
- [x] FINTRAC integration ready

---

### Phase 4: ISO 27001 Implementation 🔒

**Duration:** 8 weeks  
**Effort:** High  
**Risk:** None (internal process)

```bash
# Step 1: Initialize ISMS
pnpm compliance:init:iso-isms

# Step 2: Map controls
pnpm compliance:map:iso-controls

# Step 3: Risk assessment
pnpm compliance:risk:assess

# Step 4: Deploy ISO services
pnpm compliance:deploy:iso

# Step 5: Generate reports
pnpm compliance:report:iso
```

**Manual Actions Required:**

1. **ISMS Documentation** (Weeks 1-3)
   - [ ] Information Security Policy
   - [ ] Risk Assessment Methodology
   - [ ] Statement of Applicability (SoA)
   - [ ] Acceptable Use Policy
   - [ ] Incident Response Plan
   - [ ] Business Continuity Plan

2. **Risk Assessment** (Weeks 3-5)
   - [ ] Identify assets
   - [ ] Identify threats & vulnerabilities
   - [ ] Assess inherent risk
   - [ ] Plan risk treatment
   - [ ] Calculate residual risk

3. **Control Implementation** (Weeks 5-7)
   - [ ] Gap analysis (114 ISO 27001:2022 controls)
   - [ ] Implement missing controls
   - [ ] Collect evidence
   - [ ] Effectiveness testing

4. **Internal Audit** (Week 7)
   - [ ] Schedule internal audit
   - [ ] Conduct audit
   - [ ] Document findings
   - [ ] Corrective actions

5. **Management Review** (Week 8)
   - [ ] Present ISMS to management
   - [ ] Review and approve
   - [ ] Authorize certification

6. **External Certification** (Optional - Future)
   - [ ] Contact certification body (BSI, DNV, SGS)
   - [ ] Schedule Stage 1 audit
   - [ ] Remediate findings
   - [ ] Schedule Stage 2 audit
   - [ ] Certificate issued (3-year validity)

**Deliverables:**
- [x] ISMS documented
- [x] Risk register complete
- [x] 90%+ controls implemented
- [x] Internal audit completed
- [x] Ready for certification audit

---

## 🧪 Testing Strategy

### Run All Compliance Tests

```bash
# Unit tests
pnpm test __tests__/compliance/

# Integration tests
pnpm test:integration:compliance

# E2E compliance workflows
pnpm test:e2e:compliance
```

### Specific Test Suites

```bash
# PCI-DSS
pnpm test __tests__/compliance/pci*.test.ts

# AML/KYC
pnpm test __tests__/compliance/aml*.test.ts

# ISO 27001
pnpm test __tests__/compliance/iso*.test.ts

# Transaction monitoring
pnpm test __tests__/compliance/transaction-monitoring.test.ts
```

---

## 📈 Monitoring & Alerts

### Compliance Dashboard

```bash
# Access at: /admin/compliance
# Requires role: compliance_admin or security_admin
```

**Dashboard Sections:**
1. **PCI-DSS Status**
   - SAQ completion %
   - Last quarterly scan
   - Key rotation status
   - Overdue items

2. **AML/KYC Metrics**
   - Transactions monitored (24h)
   - High-risk transactions
   - Pending reviews
   - SARs filed

3. **ISO 27001 Progress**
   - Controls implemented
   - Open audit findings
   - Risk register summary
   - Next internal audit

### Cron Jobs (Automated)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-key-rotations",
      "schedule": "0 9 * * *"  // Daily at 9am
    },
    {
      "path": "/api/cron/check-pci-compliance",
      "schedule": "0 10 * * 1"  // Weekly Mondays 10am
    },
    {
      "path": "/api/cron/aml-daily-screening",
      "schedule": "0 2 * * *"   // Daily at 2am
    }
  ]
}
```

---

## 🔄 Rollback Procedures

### Emergency Rollback (< 5 minutes)

```bash
# 1. Disable feature flags
pnpm compliance:disable:all

# 2. Revert deployment
vercel rollback

# 3. Restore database (if needed)
pnpm db:restore --backup=<backup_file>
```

### Selective Rollback

```bash
# Disable specific phases
pnpm compliance:disable:pci
pnpm compliance:disable:aml
pnpm compliance:disable:iso

# Database rollback
psql $DATABASE_URL -f db/migrations/compliance/rollback_0001.sql
```

---

## 📊 Cost Breakdown

| Item | Provider | Annual Cost |
|------|----------|-------------|
| **PCI-DSS Quarterly Scans** | Qualys/Trustwave | $800 - $2,000 |
| **Sanctions Screening API** | ComplyAdvantage | $6,000 - $24,000 |
| **PEP Screening API** | Dow Jones | $3,600 - $18,000 |
| **ISO 27001 Certification** | BSI/DNV/SGS | $5,000 - $15,000 (one-time) |
| **ISO 27001 Surveillance** | BSI/DNV/SGS | $2,000 - $5,000/year |
| **Development Time** | Internal | ~$50,000 - $100,000 |

**Total First Year:** ~$67,400 - $164,000  
**Ongoing Annual:** ~$12,400 - $49,000

---

## 🎯 Success Criteria

### Phase 1: Foundation
- [x] All migrations applied successfully
- [x] Schema validation tests pass
- [x] RLS policies verified
- [x] No production impact

### Phase 2: PCI-DSS
- [x] SAQ-A completed (22/22 requirements)
- [x] Quarterly scan scheduled
- [x] Key rotation automated
- [x] Cardholder data flow documented
- [x] PCI report generated

### Phase 3: AML/KYC
- [x] 100% of members screened
- [x] Transaction monitoring active (all transactions)
- [x] 0 false positive alerts
- [x] SAR workflow tested and documented
- [x] FINTRAC integration functional

### Phase 4: ISO 27001
- [x] ISMS fully documented
- [x] 90%+ controls implemented
- [x] Risk register complete and approved
- [x] Internal audit passed
- [x] Ready for external certification

---

## 🆘 Troubleshooting

### Migration Failures

```bash
# Check migration status
pnpm drizzle-kit check

# View migration history
psql $DATABASE_URL -c "SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 10;"

# Rerun migration
pnpm db:migrate:compliance --force
```

### Service Not Starting

```bash
# Check logs
vercel logs

# Check environment variables
vercel env ls

# Restart services
vercel --prod
```

### Test Failures

```bash
# Run with verbose output
pnpm vitest run --reporter=verbose

# Run specific test
pnpm vitest run __tests__/compliance/pci-report.test.ts

# Debug mode
node --inspect-brk ./node_modules/.bin/vitest run
```

---

## 📞 Support & Resources

### Internal Documentation
- `/docs/compliance/` - All compliance documentation
- `/docs/compliance/COMPLIANCE_IMPLEMENTATION_ROADMAP.md` - Full roadmap
- `/docs/compliance/pci-cardholder-data-flow.md` - PCI data flow

### External Resources
- [PCI SSC](https://www.pcisecuritystandards.org/) - PCI-DSS standards
- [FINTRAC](https://www.fintrac-canafe.gc.ca/) - Canadian AML guidance
- [ISO 27001:2022](https://www.iso.org/standard/27001) - ISO standard
- [Stripe PCI Guide](https://stripe.com/docs/security) - Stripe security

### Compliance Team
- **Compliance Officer:** [compliance@unioneyes.ca](mailto:compliance@unioneyes.ca)
- **Security Team:** [security@unioneyes.ca](mailto:security@unioneyes.ca)
- **On-call:** Slack #compliance-alerts

---

## ✅ Pre-Flight Checklist

Before starting implementation:

- [ ] Backup database
- [ ] Notify team of implementation schedule
- [ ] Review and approve budget
- [ ] Obtain API keys (sanctions, PEP screening)
- [ ] Register with FINTRAC (if not already)
- [ ] Schedule compliance training
- [ ] Set up monitoring alerts
- [ ] Configure Slack notifications
- [ ] Test rollback procedures
- [ ] Staging environment ready

---

## 🎉 Next Steps After Implementation

1. **Continuous Monitoring**
   - Daily review of AML alerts
   - Weekly compliance dashboard review
   - Monthly management reports

2. **Ongoing Maintenance**
   - Quarterly PCI scans
   - Annual SAQ-A reassessment
   - Quarterly risk assessment reviews
   - Annual ISO internal audits

3. **Enhancements**
   - Machine learning for transaction anomaly detection
   - Automated evidence collection
   - Advanced reporting and analytics
   - Integration with additional screening databases

---

**Start Date:** 2026-02-19  
**Target Completion:** 2026-07-15 (20 weeks)

**Good luck! 🚀**
