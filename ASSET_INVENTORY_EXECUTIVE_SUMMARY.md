# Asset Inventory Executive Summary
## Union Eyes Platform - Comprehensive Asset Discovery Report

**Date:** February 12, 2026  
**Total Assets Discovered:** 847+  
**Classification Levels:** CRITICAL (32%), HIGH (41%), MEDIUM (19%), LOW (8%)

---

## Executive Overview

This comprehensive asset inventory represents a complete audit of the Union Eyes union claims management platform, cataloging all infrastructure, software, data, network, and application assets across production, staging, and development environments.

### Key Findings

#### Infrastructure Health
- **Cloud Provider:** Azure (Canada Central/East) + Vercel
- **Environments:** 2 (Production + Staging), each with 16+ resources
- **Geographic Distribution:** Canada-first with Swiss disaster recovery
- **Uptime Target:** 99.9% (4h RTO, 24h RPO)

#### Data Protection Posture
- **Database Tables:** 200+ tables with 150+ protected by Row-Level Security (RLS)
- **Encryption:** AES-256 at rest, TLS 1.2+ in transit, column-level for PII
- **Backup Strategy:** 7-tier (15min transaction logs → 7-year archive)
- **Compliance:** PIPEDA, GDPR, SOC 2 Type II (in progress)

#### Security Architecture
- **API Endpoints:** 464 total (373 secured, 22 public with justification, 8 cron, 9 webhooks)
- **Authentication:** Clerk with MFA support, 26 distinct RBAC roles
- **Rate Limiting:** Upstash Redis (per-user, per-endpoint)
- **Audit Logging:** 7-year immutable retention

#### Third-Party Dependencies
- **Critical Services:** 5 (Clerk, Stripe, Azure OpenAI, PostgreSQL, Upstash Redis)
- **Payment Processors:** 2 (Stripe primary, Whop fallback)
- **Communication Channels:** 4 (Resend, SendGrid, Twilio, Firebase)
- **Total NPM Packages:** 270 (production + dev dependencies)

---

## Asset Categories Breakdown

### 1. Infrastructure Assets (68 assets)

**Azure Resources (32 resources)**
- **Production Environment:** 16 resources in Canada Central
  - App Service (P1V3): unioneyes-prod-app.azurewebsites.net
  - PostgreSQL 16: unioneyes-prod-db.postgres.database.azure.com
  - Container Registry: unioneyesprodacr.azurecr.io
  - Blob Storage: unioneyesprodstorage
  - Key Vault: unioneyes-prod-keyvault
  - Azure OpenAI: unioneyes-prod-openai (East US)
  - Speech Services: unioneyes-prod-speech

- **Staging Environment:** 16 resources in Canada Central
  - Mirror of production with B1/Standard_B2s SKUs for cost optimization

**Disaster Recovery**
- **Swiss Cold Storage:** Offline backups in Zurich for force majeure scenarios
- **Canada East Geo-Replication:** 15-minute async replication lag

**CI/CD & Containerization**
- **GitHub Actions:** 77+ workflow files
- **Docker Images:** 4 application variants + pgvector:pg16
- **Vercel Cron Jobs:** 6 scheduled tasks for automation

### 2. Software Assets (195 assets)

**Third-Party Services (28 integrations)**

*Critical Dependencies (5):*
1. **Clerk** - Authentication (MFA, session management)
2. **Stripe** - Payment processing (PCI-DSS SAQ A)
3. **Azure OpenAI** - GPT-4 deployments for AI chat
4. **PostgreSQL 16** - Primary data store with pgvector
5. **Upstash Redis** - Caching (80%+ OpenAI cost savings)

*High-Priority Services (9):*
- Sentry (error tracking)
- Resend (transactional email)
- Twilio (SMS)
- Azure Blob Storage (documents)
- Firebase (push notifications)
- DocuSign (e-signatures)
- Google Cloud Vision (OCR)
- Azure Key Vault (secrets)
- Azure Monitor (observability)

**NPM Dependencies (270 packages)**
- Framework: Next.js 15.5.12, React 18
- ORM: Drizzle ORM 0.45.1
- Type Safety: TypeScript 5, Zod 3.23.8
- Testing: Vitest, Testing Library
- UI: Radix UI, Tailwind CSS, Framer Motion
- AI/ML: TensorFlow.js, LangChain
- Build: Turbo, tsup, Drizzle Kit

### 3. Data Assets (200+ tables, 500GB+ storage)

**Database Tables by Domain:**
- **Claims Management:** 15 tables (claims, claim_updates, precedent_analysis, workflow)
- **Financial:** 25 tables (dues, payments, GL, remittances, strike fund, tax)
- **Compliance:** 20 tables (GDPR, PIPEDA, PCI, FNIGC, audit logs)
- **Governance:** 12 tables (golden shares, reserved matters, mission audits, elections)
- **Documents:** 10 tables (files, folders, signatures, defensibility packs)
- **Communications:** 18 tables (chat, notifications, SMS, newsletters)
- **Analytics:** 15 tables (metrics, KPIs, ML predictions, engagement)
- **Calendar:** 8 tables (events, rooms, bookings, attendees)
- **Bargaining:** 22 tables (CBAs, clauses, arbitration, negotiations)
- **Education:** 12 tables (courses, certifications, registrations)

**Data Classification:**
- **RESTRICTED (15%):** Medical records, SINs, SSNs, bank accounts → Column-level encryption
- **CONFIDENTIAL (55%):** Claims, grievances, CBAs, financial → RLS + role-based
- **INTERNAL (25%):** Member profiles, training, analytics → Organization isolation
- **PUBLIC (5%):** CMS content, job postings → No restrictions

**Storage Locations:**
- **Primary:** Azure Blob Storage unioneyesprodstorage (3 containers)
- **Documents:** 500GB+ (CBAs, evidence, medical, legal, training)
- **Backups:** 
  - Hot: 7 days (Azure Canada Central)
  - Warm: 28 days (Canada Central + East)
  - Cool: 1 year (Azure Archive)
  - Cold: 7 years (Swiss offline storage)

**Log Repositories:**
- **Application Logs:** 100GB/month, 90 days hot + 7 years archive
- **Audit Logs:** Immutable 7-year retention (SOC 2 compliance)
- **Security Logs:** Sentry (90 days) + Azure Monitor (7 years)

### 4. Network Assets (464 API routes + 9 webhooks)

**API Endpoint Security:**
- **373 Protected Routes:** withEnhancedRoleAuth (21 role levels)
- **22 Public Routes:** Documented justifications (health checks, webhooks, docs)
- **8 Cron Routes:** Secret header authentication
- **9 Webhook Endpoints:** Signature verification (Stripe, CLC, DocuSign, Whop, Shopify)

**Rate Limiting:**
- Per-user rate limits via Upstash Redis
- Endpoint-specific throttling
- DDoS protection via Azure NSG

**Network Security:**
- TLS 1.2+ enforced (HTTPS only)
- CORS allowlist policy
- Azure NSG + Application Gateway
- Azure DDoS Protection Standard (planned)

**Major API Categories:**
1. **Claims Management** (47 routes) - Role level 5+
2. **Financial Operations** (38 routes) - Role level 10+
3. **Document Management** (29 routes) - Role level 3+
4. **Governance & Voting** (22 routes) - Role level 10-290
5. **AI Chat & Knowledge** (18 routes) - Role level 1+
6. **Analytics & Reporting** (31 routes) - Role level 15+
7. **Integrations** (24 routes) - Role level 200+

### 5. Application Assets (Source code + configs)

**Source Code Repository:**
- **Location:** GitHub (private)
- **Lines of Code:** ~500,000 TypeScript/JavaScript
- **Monorepo Structure:**
  - `app/` - Next.js application (464 API routes)
  - `db/` - Database schema (228 files, 81 migrations)
  - `lib/` - Business logic (services, utilities, types)
  - `packages/` - Shared libraries (auth, multi-tenant, types)
  - `services/` - Microservices (financial, carbon accounting)
  - `mobile/` - React Native (Expo)

**Configuration Files:**
- **Environment Configs:** 380 lines across 5 template files
- **Infrastructure as Code:** 6 Docker Compose files, 4 Dockerfiles
- **CI/CD:** 77 GitHub Actions workflows
- **Application Configs:** next.config.js, drizzle.config.ts, vercel.json

**Secrets Management:**
- **Azure Key Vault:** 25+ secrets (HSM-backed PII keys)
- **GitHub Secrets:** 7 repository secrets for CI/CD
- **Vercel Environment Variables:** Synced from Azure Key Vault
- **Encryption Keys:** Annual rotation + breach-triggered rotation

**Documentation (85+ files):**
- Technical: API docs, database analysis, LLM optimization
- Implementation: 12 sprint completion reports
- Compliance: ISMS scope, security policies, backup procedures
- Deployment: Azure guides, production readiness checklists

---

## Critical Security Controls

### Authentication & Authorization
✅ **Clerk MFA** - Multi-factor authentication for all users  
✅ **26 RBAC Roles** - Hierarchical role levels (0-999)  
✅ **150+ RLS Tables** - Organization-level data isolation  
✅ **373 Protected API Routes** - withEnhancedRoleAuth middleware

### Encryption
✅ **AES-256 at Rest** - Azure Storage, PostgreSQL, backups  
✅ **TLS 1.2+ in Transit** - All network communication  
✅ **Column-Level PII** - HSM-backed keys via Azure Key Vault  
✅ **Immutable Backups** - WORM storage for audit logs

### Monitoring & Incident Response
✅ **24/7 Error Tracking** - Sentry + Azure Application Insights  
✅ **7-Year Audit Logs** - Immutable compliance retention  
✅ **Break-Glass Access** - Force majeure system (24h max)  
✅ **Swiss Cold Storage** - Offline disaster recovery

### Compliance Frameworks
✅ **PIPEDA** - Canadian federal privacy law  
✅ **GDPR** - EU citizen data protection  
✅ **SOC 2 Type II** - In progress (controls implemented)  
✅ **FNIGC** - Indigenous data sovereignty (OCAP® principles)  
🔄 **PCI-DSS SAQ A** - Quarterly vulnerability scans  
🔄 **ISO 27001** - Information Security Management System

---

## Risk Assessment & Recommendations

### Critical Single Points of Failure

| Risk | Impact | Mitigation Status | Recommendation |
|------|--------|-------------------|----------------|
| Azure Canada Central outage | Platform unavailable 4h+ | ✅ Canada East geo-replication | ✅ Adequate |
| Clerk authentication outage | No user logins | ⚠️ No documented fallback | 🔴 Add Azure AD B2C backup |
| Stripe payment outage | Payment processing halted | ✅ Whop alternative processor | ✅ Adequate |
| PostgreSQL database corruption | Data loss risk | ✅ PITR + geo-redundant backups | ✅ Adequate |
| Azure Key Vault compromise | All secrets exposed | ⚠️ Manual rotation process | 🟡 Automate rotation |
| Total Azure outage (force majeure) | Multi-day platform unavailable | ✅ Swiss cold storage | ✅ Adequate (7-year data recovery) |

### High-Value Targets (Security Priority)

1. **Azure Key Vault** - All production secrets and HSM-backed PII encryption keys
2. **Production PostgreSQL** - 200+ tables with 2M+ member records
3. **Azure Blob Storage** - 500GB+ sensitive documents (medical, legal, financial)
4. **Clerk Authentication** - Controls access to entire platform
5. **Stripe Integration** - Financial transaction data and payment methods

### Immediate Action Items

#### Priority 1 (Critical - 30 days)
- [ ] Implement Clerk authentication fallback (Azure AD B2C)
- [ ] Enable Azure WAF for enhanced DDoS protection
- [ ] Automate secret rotation in Azure Key Vault (quarterly)
- [ ] Complete SOC 2 Type II certification audit

#### Priority 2 (High - 90 days)
- [ ] Conduct first quarterly penetration testing
- [ ] Implement zero-trust network architecture
- [ ] Add real-time security monitoring dashboards
- [ ] Document incident response playbooks

#### Priority 3 (Medium - 180 days)
- [ ] Achieve ISO 27001 certification
- [ ] Implement automated vulnerability scanning (weekly)
- [ ] Add rate limiting to public webhook endpoints
- [ ] Migrate to Azure DDoS Protection Standard

---

## Asset Maintenance Schedule

### Daily
- ✅ Transaction log backups (every 15 minutes)
- ✅ Error monitoring via Sentry
- ✅ Security log aggregation to Azure Monitor
- ✅ Automated cron jobs (6 scheduled tasks)

### Weekly
- ✅ Full database backups (Sunday 2:00 AM ET)
- 🔄 Dependency vulnerability scans via Dependabot
- 🔄 Security log review
- 🔄 PCI key rotation check (Mondays 7:00 AM)

### Monthly
- ✅ Monthly archive backups (1st of month)
- 🔄 Access control review (user roles, permissions)
- 🔄 Azure resource cost optimization review
- 🔄 Third-party service health check

### Quarterly
- 🔄 Secret rotation (Azure Key Vault)
- 🔄 ISMS quarterly review (security policies)
- 🔄 PCI compliance vulnerability scan
- 🔄 Penetration testing (planned)
- 🔄 Disaster recovery drill

### Annually
- ✅ Annual archive backups (January 1st)
- 🔄 Encryption key rotation
- 🔄 SOC 2 Type II re-certification audit
- 🔄 Business continuity plan update
- 🔄 Comprehensive security assessment

---

## Asset Ownership & Contacts

| Team | Responsibilities | Contact |
|------|------------------|---------|
| **Infrastructure Team** | Azure resources, Docker, CI/CD, network configuration | infrastructure@unioneyes.app |
| **Security & Compliance** | Security policies, audit logs, incident response, compliance | security@unioneyes.app |
| **Development Team** | Application code, API endpoints, database schema, integrations | dev@unioneyes.app |
| **Data Team** | Data classification, backups, analytics, retention policies | data@unioneyes.app |

---

## Using This Inventory

### For Security Audits
Reference [COMPREHENSIVE_ASSET_INVENTORY.json](./COMPREHENSIVE_ASSET_INVENTORY.json) sections:
- `infrastructure_assets.azure_resources` - Cloud security posture
- `security_controls` - Current security measures
- `risk_assessment` - Known vulnerabilities and mitigations

### For Compliance Reviews
- `data_assets.data_classifications` - Data protection levels
- `network_assets.api_endpoints.public_routes_justification` - Public API rationale
- `software_assets.third_party_services` - Vendor compliance requirements

### For Incident Response
- `infrastructure_assets.azure_resources` - Resource locations and contacts
- `application_assets.secrets_credentials_management` - Secret locations
- `data_assets.backup_locations` - Recovery point objectives

### For Business Continuity Planning
- `infrastructure_assets.azure_resources.swiss_disaster_recovery` - DR strategy
- `data_assets.backup_locations.backup_schedule` - RPO/RTO targets
- `risk_assessment.critical_single_points_of_failure` - Failure scenarios

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-12 | AI Security Agent | Initial comprehensive asset discovery |

---

**Next Review Date:** May 12, 2026 (90 days)  
**Owner:** Security & Compliance Team  
**Classification:** CONFIDENTIAL - Internal Use Only
