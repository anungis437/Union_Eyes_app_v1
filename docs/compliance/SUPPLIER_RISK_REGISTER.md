# Supplier Risk Register

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Security & Compliance Team  
**Review Schedule:** Quarterly  
**ISO 27001 Control:** A.5.19

## 1. Critical Suppliers

### 1.1 Clerk (Authentication & Authorization)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | Clerk.dev |
| **Service** | Authentication, authorization, user management |
| **Classification** | Critical |
| **Data Handled** | Member credentials, session tokens, MFA secrets, profile data |
| **Contract Start** | 2024 |
| **Contract Renewal** | Annual |
| **Annual Cost** | $15,000+ (usage-based) |
| **Security Certifications** | SOC 2 Type II (verified 2025) |
| **Last Security Review** | February 2026 |
| **Risk Score** | Low |
| **Key Risks** | Service outage blocks all authentication; credential breach exposes all users |
| **Mitigations** | 99.99% SLA, fault-tolerant architecture, session backups, breach notification 24hr SLA |
| **Breach Notification SLA** | 24 hours |
| **Business Continuity** | Disaster recovery tested quarterly, < 1 hour RTO |
| **Compliance** | GDPR, CCPA, PIPEDA compliant |
| **Next Review** | February 2027 |

### 1.2 Stripe (Payment Processing)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | Stripe Inc |
| **Service** | Payment processing, subscription billing, invoicing |
| **Classification** | Critical |
| **Data Handled** | Payment card data (tokenized), bank account info, transaction records |
| **Contract Start** | 2024 |
| **Contract Renewal** | Annual |
| **Annual Cost** | 2.9% + $0.30 per transaction |
| **Security Certifications** | PCI-DSS Level 1 Service Provider, SOC 2 Type II |
| **Last Security Review** | February 2026 |
| **Risk Score** | Low |
| **Key Risks** | Payment processing outage impacts revenue; card breach liability |
| **Mitigations** | PCI-DSS certified, tokenization (no card storage), 99.99% uptime SLA |
| **Breach Notification SLA** | 24 hours (contractual) |
| **Business Continuity** | Multi-region redundancy, instant failover |
| **Compliance** | PCI-DSS, GDPR, SOC 2 |
| **Next Review** | February 2027 |

### 1.3 Microsoft Azure (Cloud Infrastructure)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | Microsoft Corporation |
| **Service** | PostgreSQL databases, Blob Storage, Key Vault, networking |
| **Classification** | Critical |
| **Data Handled** | All application data (PII, financial, documents, backups) |
| **Contract Start** | 2024 |
| **Contract Renewal** | Pay-as-you-go (Enterprise Agreement option) |
| **Annual Cost** | $50,000+ (estimated) |
| **Security Certifications** | ISO 27001, ISO 27017, ISO 27018, SOC 2 Type II, SOC 3, FedRAMP High |
| **Last Security Review** | February 2026 |
| **Risk Score** | Low |
| **Key Risks** | Regional outage impacts availability; misconfiguration exposes data |
| **Mitigations** | Geo-redundant storage, Azure Security Center, private endpoints, Canada data residency |
| **Breach Notification SLA** | Per Microsoft SLA (typically 72 hours) |
| **Business Continuity** | 99.99% SLA (PostgreSQL Flexible), automated backups, geo-replication |
| **Compliance** | ISO 27001, SOC 2, PIPEDA, GDPR |
| **Next Review** | February 2027 |

### 1.4 Vercel (Application Hosting)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | Vercel Inc |
| **Service** | Next.js application hosting, CDN, edge functions |
| **Classification** | Critical |
| **Data Handled** | Application code, environment variables, deployment logs |
| **Contract Start** | 2024 |
| **Contract Renewal** | Annual (Enterprise) |
| **Annual Cost** | $20,000+ |
| **Security Certifications** | SOC 2 Type II (pending verification) |
| **Last Security Review** | February 2026 |
| **Risk Score** | Low-Medium |
| **Key Risks** | Deployment failure causes downtime; environment variable exposure |
| **Mitigations** | Automated rollbacks, preview deployments, secrets in Key Vault not Vercel env |
| **Breach Notification SLA** | 72 hours (under negotiation) |
| **Business Continuity** | Global CDN, instant rollback capability, 99.99% uptime |
| **Compliance** | GDPR compliant, SOC 2 in progress |
| **Next Review** | August 2026 |

## 2. High-Risk Suppliers

### 2.1 Sentry (Error Monitoring & Performance)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | Sentry.io (Functional Software Inc) |
| **Service** | Error tracking, performance monitoring, alerting |
| **Classification** | High |
| **Data Handled** | Error logs, stack traces, user context (email, user ID), performance metrics |
| **Contract Start** | 2024 |
| **Annual Cost** | $5,000+ |
| **Security Certifications** | SOC 2 Type II |
| **Last Security Review** | February 2026 |
| **Risk Score** | Low |
| **Key Risks** | Logs may contain PII in error messages; service outage limits debugging |
| **Mitigations** | PII scrubbing configured, data residency (US/EU), access controls |
| **Breach Notification SLA** | 72 hours |
| **Next Review** | August 2026 |

### 2.2 DocuSign (Digital Signatures)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | DocuSign Inc |
| **Service** | Digital signature workflows, document signing |
| **Classification** | High |
| **Data Handled** | Collective agreements, grievance documents, signature certificates |
| **Contract Start** | 2025 |
| **Annual Cost** | $3,000+ |
| **Security Certifications** | SOC 2 Type II, ISO 27001 |
| **Last Security Review** | Pending (Q1 2026) |
| **Risk Score** | Medium |
| **Key Risks** | Document tampering; service outage delays signings |
| **Mitigations** | SOC 2 certified, tamper-evident seals, audit trails |
| **Breach Notification SLA** | 72 hours (to verify in contract) |
| **Next Review** | August 2026 |

### 2.3 GitHub (Source Code Management)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | GitHub Inc (Microsoft) |
| **Service** | Source code repository, CI/CD, secrets management |
| **Classification** | Critical |
| **Data Handled** | Source code, secrets (limited), deployment credentials, issues/PRs |
| **Contract Start** | 2023 |
| **Annual Cost** | $2,000+ |
| **Security Certifications** | SOC 2 Type II |
| **Last Security Review** | February 2026 |
| **Risk Score** | Low |
| **Key Risks** | Code exposure; compromised credentials; supply chain attacks |
| **Mitigations** | Private repositories, branch protection, secret scanning, 2FA enforced |
| **Breach Notification SLA** | Per GitHub Security Policy |
| **Next Review** | February 2027 |

## 3. Moderate-Risk Suppliers

### 3.1 Whop (Licensing & Entitlements)

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | Whop Inc |
| **Service** | Software licensing, seat management, entitlements |
| **Classification** | Medium |
| **Data Handled** | Organization names, subscription tiers, usage metrics |
| **Contract Start** | 2025 |
| **Annual Cost** | $10,000+ |
| **Security Certifications** | Under review |
| **Last Security Review** | Pending (Q1 2026) |
| **Risk Score** | Medium |
| **Key Risks** | License verification failure impacts feature access |
| **Mitigations** | Cached license validation, graceful degradation |
| **Breach Notification SLA** | To be negotiated |
| **Next Review** | August 2026 |

### 3.2 Canadian Labour Congress (CLC) API

| Attribute | Details |
|-----------|---------|
| **Supplier Name** | Canadian Labour Congress |
| **Service** | Union membership verification, congress data integration |
| **Classification** | High |
| **Data Handled** | Union membership data, congress relationships |
| **Contract Start** | 2024 |
| **Annual Cost** | Partnership agreement (non-commercial) |
| **Security Certifications** | Government/NGO entity (no commercial certs) |
| **Last Security Review** | January 2026 |
| **Risk Score** | Medium |
| **Key Risks** | API availability impacts member verification; data sync issues |
| **Mitigations** | Local caching, manual verification fallback, TLS encryption |
| **Breach Notification SLA** | Partnership agreement terms |
| **Next Review** | July 2026 |

## 4. Third-Party Software Libraries

*(Risk managed through dependency scanning and vulnerability monitoring)*

### 4.1 npm Dependencies

- **Total Packages:** 500+ (direct + transitive)
- **Vulnerability Scanning:** GitHub Dependabot, npm audit (automated)
- **Update Policy:** Critical security patches within 48 hours, major updates quarterly
- **Known High-Risk Packages:** Monitored via OWASP Dependency-Check

### 4.2 Critical Dependencies

| Package | Version | License | Last Security Audit | Vulnerabilities |
|---------|---------|---------|---------------------|-----------------|
| Next.js | 14.x | MIT | January 2026 | 0 known |
| React | 18.x | MIT | January 2026 | 0 known |
| PostgreSQL Driver | Latest | MIT | January 2026 | 0 known |
| Drizzle ORM | Latest | MIT | January 2026 | 0 known |
| @clerk/nextjs | Latest | Commercial | January 2026 | 0 known |

## 5. Supplier Risk Summary

| Risk Level | Count | Percentage | Action Required |
|------------|-------|------------|-----------------|
| **Critical** | 4 | 50% | Quarterly reviews, 24hr breach SLA |
| **High** | 3 | 37% | Semi-annual reviews, SOC 2 required |
| **Medium** | 2 | 13% | Annual reviews, security questionnaire |
| **Low** | 0 | 0% | Monitoring only |

**Total Suppliers:** 9 (excluding open-source libraries)

## 6. Action Items

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| P0 | Verify Vercel SOC 2 Type II report | Security Team | March 15, 2026 | In Progress |
| P0 | Complete DocuSign security assessment | Security Team | March 31, 2026 | Not Started |
| P1 | Negotiate Whop breach notification SLA | Legal + Security | April 15, 2026 | Not Started |
| P1 | Update CLC partnership security terms | CTO | April 30, 2026 | Not Started |
| P2 | Implement supplier monitoring dashboard | DevOps | May 31, 2026 | Not Started |

## 7. Annual Review Schedule

- **Q1 (Jan-Mar):** Clerk, Stripe, Azure, GitHub
- **Q2 (Apr-Jun):** Vercel, Sentry, CLC
- **Q3 (Jul-Sep):** DocuSign, Whop
- **Q4 (Oct-Dec):** All critical suppliers (mini-review)

## Document Control

- **Next Review Date:** May 2026 (Quarterly)
- **Approval:** Security Team + CTO
- **Change History:**
  - v1.0 (February 2026): Initial supplier risk register
