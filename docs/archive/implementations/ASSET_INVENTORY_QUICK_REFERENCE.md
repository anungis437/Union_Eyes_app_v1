# Asset Inventory Quick Reference Guide

## 🎯 How to Use This Asset Inventory

### Files Created
1. **[COMPREHENSIVE_ASSET_INVENTORY.json](./COMPREHENSIVE_ASSET_INVENTORY.json)** - Complete machine-readable asset catalog (847+ assets)
2. **[ASSET_INVENTORY_EXECUTIVE_SUMMARY.md](./ASSET_INVENTORY_EXECUTIVE_SUMMARY.md)** - Executive overview and analysis
3. **This Guide** - Quick reference for common use cases

---

## 📋 Common Use Cases

### 1. Security Incident Response
**Scenario:** A security alert is triggered for Azure Blob Storage  
**Action:** 
```json
// Look up in COMPREHENSIVE_ASSET_INVENTORY.json
infrastructure_assets.azure_resources.production_environment.storage_accounts
```
**Key Info:** 
- Name: unioneyesprodstorage
- Classification: CRITICAL
- Security Controls: HTTPS required, soft delete 30 days, WORM storage
- Owner: infrastructure@unioneyes.app

### 2. Compliance Audit (SOC 2, GDPR, PIPEDA)
**Scenario:** Auditor requests list of all CRITICAL data assets  
**Action:**
```bash
# Search for classification: "CRITICAL"
grep -r "CRITICAL" COMPREHENSIVE_ASSET_INVENTORY.json
```
**Key Sections:**
- `data_assets.data_classifications.RESTRICTED` - PII with column-level encryption
- `data_assets.log_repositories.audit_logs` - 7-year immutable retention
- `security_controls.compliance_frameworks` - Implemented standards

### 3. Third-Party Vendor Assessment
**Scenario:** Security team needs to review all external service dependencies  
**Action:**
```json
// Check in COMPREHENSIVE_ASSET_INVENTORY.json
software_assets.third_party_services
```
**Critical Vendors:**
- Clerk (authentication) - SOC 2, GDPR compliant
- Stripe (payments) - PCI-DSS Level 1
- Azure OpenAI - Data processing agreement required
- Upstash Redis - GDPR DPA signed

### 4. Disaster Recovery Planning
**Scenario:** Test recovery from total Azure Canada outage  
**Action:**
```json
// Recovery resources
infrastructure_assets.azure_resources.production_environment.databases.backup
infrastructure_assets.azure_resources.swiss_disaster_recovery.cold_storage
data_assets.backup_locations
```
**Recovery Steps:**
1. Activate Canada East geo-replica (15-min lag)
2. If total Azure failure, restore from Swiss cold storage (7-year retention)
3. RTO: 4 hours, RPO: 24 hours

### 5. API Security Review
**Scenario:** Review all public API endpoints for security justification  
**Action:**
```json
// Check in COMPREHENSIVE_ASSET_INVENTORY.json
network_assets.api_endpoints.public_routes_justification
```
**Public Routes (22 total):**
- `/api/health` - Load balancer health check
- `/api/webhooks/*` - External services (signature verified)
- All others have documented justifications

### 6. Data Subject Access Request (GDPR/PIPEDA)
**Scenario:** Member requests copy of all their personal data  
**Action:**
```json
// Identify tables with personal data
data_assets.database_tables.schema_domains
data_assets.data_classifications.RESTRICTED
data_assets.data_classifications.CONFIDENTIAL
```
**Tables to Query:**
- `claims`, `profiles`, `organization_members`
- `member_documents`, `chat_messages`
- `dues_transactions`, `payments`
- All with RLS filtering by user_id/organization_id

### 7. Cost Optimization Review
**Scenario:** CFO asks to identify opportunities to reduce cloud spend  
**Action:**
```json
// Review Azure resources by SKU
infrastructure_assets.azure_resources.production_environment
infrastructure_assets.azure_resources.staging_environment
```
**Optimization Opportunities:**
- Staging uses B1/Standard_B2s SKUs (cost-optimized)
- Production P1V3/Standard_B2s could scale down during off-peak
- Consider Azure Reserved Instances (1-3 year commit)
- Upstash Redis caching saves 80%+ on OpenAI API costs

### 8. Onboarding New Developer
**Scenario:** New engineer needs to understand the tech stack  
**Action:**
```json
// Review these sections
software_assets.npm_dependencies.critical_dependencies
application_assets.source_code_repositories
infrastructure_assets.docker_infrastructure
```
**Tech Stack Summary:**
- Next.js 15.5.12 + React 18
- PostgreSQL 16 + Drizzle ORM
- Clerk authentication + Stripe payments
- Docker containerized, deployed to Azure + Vercel

### 9. Secret Rotation Audit
**Scenario:** Quarterly audit of all credentials and API keys  
**Action:**
```json
// Check secrets locations
application_assets.secrets_credentials_management.azure_key_vault.secrets_stored
application_assets.secrets_credentials_management.github_secrets
infrastructure_assets.ci_cd_pipelines.github_actions.secrets_managed
```
**Secrets Inventory (50+ credentials):**
- Azure Key Vault: 25+ secrets (HSM-backed)
- GitHub Secrets: 7 repository secrets
- Vercel Environment Variables: Synced from Key Vault
- **Rotation Policy:** Annual + breach-triggered

### 10. Network Security Assessment
**Scenario:** Penetration tester requests attack surface mapping  
**Action:**
```json
// Review network assets
network_assets.api_endpoints (464 routes)
network_assets.webhook_endpoints.incoming_webhooks (9 endpoints)
network_assets.network_security
```
**Attack Surface:**
- 373 protected API routes (Clerk auth + RBAC)
- 22 public routes (health checks, webhooks with signature verification)
- 8 cron routes (secret header auth)
- Rate limiting: Upstash Redis (per-user, per-endpoint)
- Firewall: Azure NSG + Application Gateway

---

## 🔍 Quick Searches

### Find all CRITICAL assets
```bash
grep -n "CRITICAL" COMPREHENSIVE_ASSET_INVENTORY.json | wc -l
# Returns: 32+ critical assets
```

### List all Azure resources
```bash
jq '.infrastructure_assets.azure_resources | keys' COMPREHENSIVE_ASSET_INVENTORY.json
# Returns: staging_environment, production_environment, swiss_disaster_recovery
```

### Count database tables
```bash
jq '.data_assets.database_tables.count' COMPREHENSIVE_ASSET_INVENTORY.json
# Returns: 200
```

### Find all third-party services
```bash
jq '.software_assets.third_party_services | keys' COMPREHENSIVE_ASSET_INVENTORY.json
# Returns: authentication, payment_processing, monitoring_observability, ...
```

### List all API webhook endpoints
```bash
jq '.network_assets.webhook_endpoints.incoming_webhooks[] | .endpoint' COMPREHENSIVE_ASSET_INVENTORY.json
# Returns: /api/webhooks/stripe, /api/webhooks/clc, ...
```

### Get backup retention policy
```bash
jq '.data_assets.backup_locations.backup_schedule' COMPREHENSIVE_ASSET_INVENTORY.json
# Returns: Complete backup schedule details
```

---

## 📊 Asset Statistics

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| **Infrastructure** | 68 | 15 | 38 | 12 | 3 |
| **Software** | 195 | 5 | 28 | 122 | 40 |
| **Data** | 200+ | 80 | 90 | 25 | 5 |
| **Network** | 464 | 373 | 52 | 31 | 8 |
| **Application** | 120+ | 10 | 45 | 55 | 10 |
| **TOTAL** | **847+** | **270** | **253** | **245** | **66** |

### By Classification Level
- **CRITICAL (32%):** 270 assets - Core platform functionality, PII, financial data
- **HIGH (30%):** 253 assets - Important features, integrations, compliance
- **MEDIUM (29%):** 245 assets - Supporting functions, alternative providers
- **LOW (8%):** 66 assets - Optional features, development tools

---

## 🚨 Emergency Contacts

| Incident Type | Contact | Response Time |
|---------------|---------|---------------|
| **Platform Outage** | infrastructure@unioneyes.app | 15 min |
| **Security Breach** | security@unioneyes.app | 30 min |
| **Data Loss** | data@unioneyes.app | 1 hour |
| **Payment Issues** | dev@unioneyes.app | 1 hour |
| **API Downtime** | dev@unioneyes.app | 30 min |

### Escalation Path
1. **Primary Contact** → Team email above
2. **Secondary Contact** → CTO (if no response in 2x response time)
3. **Emergency Escalation** → CEO (for CRITICAL incidents only)

---

## 🔄 Maintenance Schedule

### This Inventory Document
- **Review Frequency:** Quarterly (every 90 days)
- **Next Review:** May 12, 2026
- **Owner:** Security & Compliance Team
- **Update Trigger:** Major infrastructure changes, new services, compliance requirements

### How to Update
1. **Add New Asset:**
   ```json
   // Add to appropriate section in COMPREHENSIVE_ASSET_INVENTORY.json
   "new_service_name": {
     "service": "Service Name",
     "purpose": "What it does",
     "classification": "CRITICAL|HIGH|MEDIUM|LOW",
     "owner": "team@unioneyes.app",
     "security_controls": []
   }
   ```

2. **Update Asset Classification:**
   - Review data sensitivity quarterly
   - Update if new regulations apply
   - Escalate classification if breach occurs

3. **Deprecate Asset:**
   - Move to `deprecated_assets` section
   - Add `deprecation_date` field
   - Remove after 1 year retention

---

## 📝 Compliance Checklists

### SOC 2 Type II Audit Prep
- [ ] Review `security_controls` section
- [ ] Verify audit log retention = 7 years
- [ ] Confirm encryption at rest for all CRITICAL assets
- [ ] Validate access controls on 150+ RLS tables
- [ ] Document incident response procedures

### GDPR Data Protection Impact Assessment (DPIA)
- [ ] Review `data_assets.data_classifications`
- [ ] Confirm lawful basis for processing PII
- [ ] Verify data subject rights implementation
- [ ] Check `data_assets.log_repositories.audit_logs`
- [ ] Validate encryption for RESTRICTED data

### PCI-DSS SAQ A Compliance
- [ ] Confirm Stripe handles card data (no on-premise storage)
- [ ] Verify `payment_processing.stripe.compliance`
- [ ] Check quarterly vulnerability scans scheduled
- [ ] Review `network_assets.network_security`
- [ ] Validate TLS 1.2+ enforcement

---

## 🛡️ Security Best Practices

### Asset Classification Guidelines
- **CRITICAL:** Outage causes platform unavailability or data loss
- **HIGH:** Outage causes major feature degradation or compliance risk
- **MEDIUM:** Outage causes minor inconvenience, has workaround
- **LOW:** Optional feature, minimal impact

### When to Escalate Asset Classification
- ✅ Asset processes PII or financial data → CRITICAL
- ✅ Asset is single point of failure → CRITICAL or HIGH
- ✅ Asset required for compliance → HIGH
- ✅ Asset handles authentication/authorization → CRITICAL

### Decommissioning Checklist
1. [ ] Export all data from asset
2. [ ] Revoke all access credentials
3. [ ] Update this inventory (move to deprecated)
4. [ ] Notify dependent teams/systems
5. [ ] Archive configuration for 7 years
6. [ ] Document lessons learned

---

## 📚 Related Documentation

- [COMPREHENSIVE_ASSET_INVENTORY.json](./COMPREHENSIVE_ASSET_INVENTORY.json) - Full machine-readable inventory
- [ASSET_INVENTORY_EXECUTIVE_SUMMARY.md](./ASSET_INVENTORY_EXECUTIVE_SUMMARY.md) - Executive-level overview
- [docs/compliance/ISMS_SCOPE_STATEMENT.md](./docs/compliance/ISMS_SCOPE_STATEMENT.md) - Security management scope
- [docs/compliance/policies/INFORMATION_SECURITY_POLICY.md](./docs/compliance/policies/INFORMATION_SECURITY_POLICY.md) - Security policies
- [docs/security/SECURITY_POSTURE.md](./docs/security/SECURITY_POSTURE.md) - Current security status
- [docs/deployment/PRODUCTION_READINESS.md](./docs/deployment/PRODUCTION_READINESS.md) - Deployment guidelines

---

**Version:** 1.0.0  
**Last Updated:** February 12, 2026  
**Maintained By:** Security & Compliance Team  
**Questions?** Email security@unioneyes.app
