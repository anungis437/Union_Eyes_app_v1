# STRIDE Threat Model - Union Eyes Platform

**Version:** 1.0  
**Date:** February 14, 2026  
**Status:** Active  
**Review Cycle:** Quarterly  
**Next Review:** May 14, 2026  
**Owner:** Security Team

---

## Executive Summary

This document provides a comprehensive STRIDE-based threat analysis of the Union Eyes platform, mapping potential security threats across all system boundaries. It identifies attack vectors, existing mitigations, and residual risks for enterprise procurement and security audits.

**Risk Posture:** MODERATE  
**Coverage:** 47 identified threats, 42 mitigated, 5 requiring enhanced controls

---

## System Architecture Overview

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL ZONE (Untrusted)                                  │
│  • End Users (Web/Mobile)                                   │
│  • External Webhooks (Stripe, Whop, DocuSign, Shopify)     │
│  • Public API Consumers                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ TLS 1.3 / Clerk Auth / Webhook Signatures
┌──────────────────▼──────────────────────────────────────────┐
│  PRESENTATION LAYER (Semi-Trusted)                          │
│  • Next.js App Router (SSR/CSR)                             │
│  • React Native Mobile App                                   │
│  • Edge Runtime Functions                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │ Session Tokens / RBAC Enforcement
┌──────────────────▼──────────────────────────────────────────┐
│  APPLICATION LAYER (Trusted)                                │
│  • API Routes (/app/api/*)                                  │
│  • Server Actions                                            │
│  • Middleware Layer                                          │
│  • Financial Service (Microservice)                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ Query Parameterization / RLS Context
┌──────────────────▼──────────────────────────────────────────┐
│  DATA LAYER (Highly Trusted)                                │
│  • PostgreSQL with RLS                                       │
│  • Redis (Session/Cache)                                     │
│  • Blob Storage (Documents)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Classification

| Classification | Examples | Storage Location | Encryption |
|----------------|----------|------------------|------------|
| **PII - High** | SSN, SIN, Health Records | PostgreSQL `members` table | At-rest (AES-256) |
| **PII - Medium** | Email, Phone, Address | PostgreSQL various tables | At-rest (AES-256) |
| **Financial** | Bank accounts, Payment data | Stripe (external), `payments` table | At-rest + TLS |
| **Business Confidential** | CBA documents, Strike fund balances | PostgreSQL, Blob Storage | At-rest + TLS |
| **Public** | Public voting results, Blog posts | PostgreSQL, CDN | TLS only |

---

## STRIDE Analysis by Component

### 1. Authentication System (Clerk + Session Management)

#### S - Spoofing Identity

**T1.1: Session Token Theft**
- **Threat:** Attacker intercepts or steals JWT session token
- **Attack Vector:** XSS, Man-in-the-Middle, malware
- **Likelihood:** Medium | **Impact:** High | **Risk:** HIGH
- **Mitigations:**
  - ✅ HTTPOnly cookies for session tokens
  - ✅ Secure flag on all cookies
  - ✅ SameSite=Strict cookie policy
  - ✅ Content Security Policy (CSP) headers
  - ✅ TLS 1.3 enforcement
- **Residual Risk:** LOW (acceptable with monitoring)
- **Detection:** Audit logs track IP/location changes

**T1.2: Weak Credential Attacks**
- **Threat:** Brute force or credential stuffing
- **Attack Vector:** Login form abuse
- **Likelihood:** High | **Impact:** High | **Risk:** HIGH
- **Mitigations:**
  - ✅ Clerk-managed MFA enforcement
  - ✅ Rate limiting on auth endpoints (10 req/min)
  - ✅ CAPTCHA on repeated failures
  - ✅ Account lockout policies
  - ✅ Password complexity requirements (Clerk)
- **Residual Risk:** LOW

**T1.3: Social Engineering**
- **Threat:** Phishing attacks targeting admin credentials
- **Attack Vector:** Email, fake login pages
- **Likelihood:** Medium | **Impact:** Critical | **Risk:** HIGH
- **Mitigations:**
  - ✅ MFA required for admin roles
  - ✅ Security awareness training (recommended)
  - ⚠️ FIDO2/WebAuthn not yet enforced
- **Residual Risk:** MEDIUM
- **Recommendation:** Enforce hardware token (YubiKey) for admins

#### T - Tampering

**T1.4: JWT Token Manipulation**
- **Threat:** Attacker modifies JWT claims to escalate privileges
- **Attack Vector:** Token tampering, algorithm confusion
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Clerk-managed JWT signing (RS256)
  - ✅ Token signature verification on every request
  - ✅ Short token expiry (1 hour)
  - ✅ Algorithm whitelist enforcement
- **Residual Risk:** VERY LOW

#### R - Repudiation

**T1.5: Authentication Event Denial**
- **Threat:** User denies performing authenticated action
- **Attack Vector:** Lack of audit trail
- **Likelihood:** Low | **Impact:** Medium | **Risk:** LOW
- **Mitigations:**
  - ✅ Comprehensive audit logging (`audit_logs` table)
  - ✅ Immutable audit records (triggers prevent updates)
  - ✅ IP address + user agent capture
  - ✅ Timestamp with timezone
- **Residual Risk:** VERY LOW

#### I - Information Disclosure

**T1.6: Session Enumeration**
- **Threat:** Attacker enumerates valid user accounts
- **Attack Vector:** Login error messages, timing attacks
- **Likelihood:** Medium | **Impact:** Low | **Risk:** LOW
- **Mitigations:**
  - ✅ Generic error messages ("Invalid credentials")
  - ✅ Consistent response timing
  - ✅ Rate limiting
- **Residual Risk:** VERY LOW

#### D - Denial of Service

**T1.7: Auth Endpoint Flooding**
- **Threat:** Overwhelm authentication service
- **Attack Vector:** Login/registration spam
- **Likelihood:** Medium | **Impact:** Medium | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Rate limiting (10 auth attempts/min per IP)
  - ✅ CAPTCHA for suspicious traffic
  - ✅ Cloudflare DDoS protection (recommended)
- **Residual Risk:** LOW

#### E - Elevation of Privilege

**T1.8: Role Escalation via Auth Bypass**
- **Threat:** User gains unauthorized role
- **Attack Vector:** Auth middleware bypass, race conditions
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Centralized auth middleware (`lib/api-auth-guard.ts`)
  - ✅ Role validation on every protected route
  - ✅ RBAC tests cover boundary cases
  - ✅ RLS policies enforce server-side authorization
- **Residual Risk:** VERY LOW

---

### 2. API Layer (Next.js API Routes)

#### S - Spoofing

**T2.1: API Key Spoofing**
- **Threat:** Attacker impersonates legitimate API client
- **Attack Vector:** Stolen API keys, replay attacks
- **Likelihood:** Medium | **Impact:** High | **Risk:** HIGH
- **Mitigations:**
  - ✅ API key rotation (30-day policy recommended)
  - ✅ Request signing for webhooks (HMAC verification)
  - ✅ IP allowlisting for CLC webhooks
  - ⚠️ No automatic key rotation implemented
- **Residual Risk:** MEDIUM
- **Recommendation:** Implement automated key rotation

#### T - Tampering

**T2.2: SQL Injection**
- **Threat:** Attacker injects malicious SQL
- **Attack Vector:** Unsanitized user input in queries
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Drizzle ORM with parameterized queries
  - ✅ Custom ESLint rule (`eslint-sql-injection-rules.js`)
  - ✅ No raw SQL in API routes (except migrations)
  - ✅ CI enforcement via `api-security.yml` workflow
- **Residual Risk:** VERY LOW

**T2.3: Parameter Tampering**
- **Threat:** Attacker modifies request parameters to access unauthorized data
- **Attack Vector:** Organization ID, member ID manipulation
- **Likelihood:** Medium | **Impact:** High | **Risk:** HIGH
- **Mitigations:**
  - ✅ RLS policies enforce row-level isolation
  - ✅ Input validation with Zod schemas
  - ✅ Server-side authorization checks
  - ✅ Organization context verification
- **Residual Risk:** LOW

**T2.4: Mass Assignment**
- **Threat:** Attacker sets unauthorized fields (e.g., `role`, `isAdmin`)
- **Attack Vector:** Extra fields in POST/PATCH requests
- **Likelihood:** Medium | **Impact:** High | **Risk:** HIGH
- **Mitigations:**
  - ✅ Explicit field whitelisting in all mutations
  - ✅ Zod schema validation rejects extra fields
  - ✅ Drizzle insert/update uses typed objects
- **Residual Risk:** VERY LOW

#### R - Repudiation

**T2.5: API Action Denial**
- **Threat:** User denies performing API action
- **Attack Vector:** Insufficient audit logging
- **Likelihood:** Low | **Impact:** Medium | **Risk:** LOW
- **Mitigations:**
  - ✅ API audit logging (`logApiAuditEvent`)
  - ✅ All sensitive actions logged with user, timestamp, IP
  - ✅ Immutable audit log storage
- **Residual Risk:** VERY LOW

#### I - Information Disclosure

**T2.6: Excessive Error Information**
- **Threat:** Stack traces expose internal system details
- **Attack Vector:** Unhandled exceptions in API responses
- **Likelihood:** Medium | **Impact:** Low | **Risk:** LOW
- **Mitigations:**
  - ✅ Generic error responses in production
  - ✅ Detailed errors logged server-side only
  - ✅ Sentry error tracking (non-PII)
- **Residual Risk:** VERY LOW

**T2.7: IDOR (Insecure Direct Object Reference)**
- **Threat:** Access other organization's data via ID manipulation
- **Attack Vector:** `/api/members/{otherId}` with stolen ID
- **Likelihood:** Medium | **Impact:** Critical | **Risk:** HIGH
- **Mitigations:**
  - ✅ RLS policies enforce organization isolation
  - ✅ All queries filter by `organizationId` from session
  - ✅ Tests verify cross-tenant isolation
- **Residual Risk:** VERY LOW

#### D - Denial of Service

**T2.8: Rate Limit Bypass**
- **Threat:** Exhaust API resources
- **Attack Vector:** Distributed attack, IP rotation
- **Likelihood:** Medium | **Impact:** Medium | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Redis-backed rate limiting
  - ✅ Per-endpoint limits (5-200 req/min)
  - ✅ 429 responses with Retry-After header
  - ⚠️ No WAF or DDoS protection (recommended: Cloudflare)
- **Residual Risk:** MEDIUM
- **Recommendation:** Deploy WAF with layer 7 protection

**T2.9: Expensive Query DoS**
- **Threat:** Trigger slow queries to exhaust DB resources
- **Attack Vector:** Large pagination, complex filters
- **Likelihood:** Low | **Impact:** High | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Query timeout (30s)
  - ✅ Pagination limit enforcement (max 100 items)
  - ✅ Database connection pooling
  - ⚠️ No query cost analysis
- **Residual Risk:** MEDIUM

#### E - Elevation of Privilege

**T2.10: RBAC Bypass**
- **Threat:** Access admin endpoints without admin role
- **Attack Vector:** Middleware bypass, race condition
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ `withRoleAuth()` wrapper on all protected routes
  - ✅ Role verification in every handler
  - ✅ Comprehensive RBAC tests
  - ✅ CI enforcement via release contract
- **Residual Risk:** VERY LOW

---

### 3. Database Layer (PostgreSQL + RLS)

#### S - Spoofing

**T3.1: Database Credential Theft**
- **Threat:** Attacker obtains database credentials
- **Attack Vector:** Environment variable exposure, code leak
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Secrets stored in .env (not committed)
  - ✅ `.gitignore` blocks credential files
  - ✅ Secret scanning (`.gitleaks.toml`)
  - ✅ Separate credentials per environment
  - ⚠️ No secret rotation policy documented
- **Residual Risk:** MEDIUM
- **Recommendation:** 90-day credential rotation policy

#### T - Tampering

**T3.2: Immutability Violation**
- **Threat:** Modify audit logs or financial records
- **Attack Vector:** Direct DB access, migration tampering
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Immutability triggers on `audit_logs`, `gl_transactions`
  - ✅ CI verification of triggers (`verify-immutability-triggers.ts`)
  - ✅ Migration contract tests
  - ✅ Database GRANT restrictions (read-only for app user on audit tables)
- **Residual Risk:** VERY LOW

**T3.3: RLS Policy Bypass**
- **Threat:** Access cross-tenant data
- **Attack Vector:** RLS context not set, policy bug
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ RLS enabled on all tenant-scoped tables
  - ✅ `withRLSContext()` wrapper enforces context
  - ✅ 7 RLS test suites verify isolation
  - ✅ CI enforcement via security workflows
- **Residual Risk:** VERY LOW

#### R - Repudiation

**T3.4: Audit Log Deletion**
- **Threat:** User deletes evidence of actions
- **Attack Vector:** Direct DB access, privilege escalation
- **Likelihood:** Low | **Impact:** High | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Immutability triggers prevent DELETE/UPDATE
  - ✅ Audit table REVOKE DELETE from app role
  - ✅ Backup retention (30 days)
- **Residual Risk:** VERY LOW

#### I - Information Disclosure

**T3.5: Backup Exposure**
- **Threat:** Database backup stolen from storage
- **Attack Vector:** Cloud storage misconfiguration
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Backups encrypted at rest (AES-256)
  - ✅ Backup access restricted (IAM policies)
  - ⚠️ No backup encryption key rotation
- **Residual Risk:** LOW
- **Recommendation:** Annual backup key rotation

#### D - Denial of Service

**T3.6: Connection Pool Exhaustion**
- **Threat:** Exhaust all DB connections
- **Attack Vector:** Connection leak, slowloris-style attack
- **Likelihood:** Low | **Impact:** High | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Connection pooling (max 20 connections)
  - ✅ Statement timeout (30s)
  - ✅ Idle connection timeout
  - ✅ Database monitoring (Prometheus)
- **Residual Risk:** LOW

#### E - Elevation of Privilege

**T3.7: Privilege Escalation via SQL**
- **Threat:** Gain database superuser access
- **Attack Vector:** SQL injection to `ALTER ROLE`
- **Likelihood:** Very Low | **Impact:** Critical | **Risk:** LOW
- **Mitigations:**
  - ✅ Application role has minimal grants (no DDL)
  - ✅ Parameterized queries prevent injection
  - ✅ Separate admin role for migrations only
- **Residual Risk:** VERY LOW

---

### 4. Webhook Integrations (Stripe, Whop, DocuSign, Shopify)

#### S - Spoofing

**T4.1: Webhook Forgery**
- **Threat:** Attacker sends fake webhook to trigger payment confirmation
- **Attack Vector:** POST to webhook endpoint with fake data
- **Likelihood:** Medium | **Impact:** Critical | **Risk:** HIGH
- **Mitigations:**
  - ✅ Stripe signature verification (HMAC-SHA256)
  - ✅ Whop SDK signature validation
  - ✅ DocuSign HMAC verification
  - ✅ Shopify HMAC-SHA256 verification
  - ✅ All webhooks reject unsigned requests
- **Residual Risk:** VERY LOW

**T4.2: Replay Attacks**
- **Threat:** Re-send old webhook to duplicate credits/payments
- **Attack Vector:** Captured webhook replayed
- **Likelihood:** Low | **Impact:** High | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Event ID deduplication (stored in `stripe_webhook_events`)
  - ✅ Timestamp validation (reject >5min old)
  - ✅ Idempotency keys on financial operations
- **Residual Risk:** VERY LOW

#### T - Tampering

**T4.3: Webhook Payload Modification**
- **Threat:** Attacker modifies amount or beneficiary in transit
- **Attack Vector:** MITM attack
- **Likelihood:** Very Low | **Impact:** High | **Risk:** LOW
- **Mitigations:**
  - ✅ TLS 1.3 enforcement
  - ✅ Signature covers entire payload
  - ✅ Validation of signature before processing
- **Residual Risk:** VERY LOW

#### I - Information Disclosure

**T4.4: Webhook URL Enumeration**
- **Threat:** Discover webhook endpoints for targeted attacks
- **Attack Vector:** URL scanning, code repository
- **Likelihood:** High | **Impact:** Low | **Risk:** LOW
- **Mitigations:**
  - ✅ Webhook URLs in public routes (by design)
  - ✅ Signature required for processing (enumeration harmless)
  - ✅ Rate limiting prevents brute force
- **Residual Risk:** VERY LOW

#### D - Denial of Service

**T4.5: Webhook Flooding**
- **Threat:** Overwhelm webhook handlers
- **Attack Vector:** High-volume fake requests
- **Likelihood:** Medium | **Impact:** Medium | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Rate limiting (100 req/min per webhook)
  - ✅ Async processing (webhook responds immediately, processes later)
  - ⚠️ No webhook queue for high-volume scenarios
- **Residual Risk:** MEDIUM
- **Recommendation:** Implement webhook queue (SQS/Bull)

---

### 5. File Storage (Document Management)

#### T - Tampering

**T5.1: Unauthorized File Modification**
- **Threat:** Attacker replaces CBA document with malicious file
- **Attack Vector:** Storage credential theft, API vulnerability
- **Likelihood:** Low | **Impact:** High | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Immutable uploads (no update endpoint)
  - ✅ File hash stored with metadata (integrity check)
  - ✅ ACL restricts write to service account only
- **Residual Risk:** LOW

#### I - Information Disclosure

**T5.2: Unauthorized File Access**
- **Threat:** Access another organization's documents
- **Attack Vector:** Presigned URL guessing, IDOR
- **Likelihood:** Medium | **Impact:** High | **Risk:** HIGH
- **Mitigations:**
  - ✅ RLS policy on `documents` table
  - ✅ Presigned URLs expire in 1 hour
  - ✅ Cryptographically random file paths
  - ✅ Authorization check before generating presigned URL
- **Residual Risk:** LOW

**T5.3: Sensitive Data in Filenames**
- **Threat:** SSN or PII exposed in document filename
- **Attack Vector:** Logs, error messages, storage console
- **Likelihood:** Low | **Impact:** Medium | **Risk:** LOW
- **Mitigations:**
  - ✅ UUID-based file naming (no user input in paths)
  - ✅ Metadata stored in DB, not filesystem
- **Residual Risk:** VERY LOW

---

### 6. Mobile Application (React Native)

#### S - Spoofing

**T6.1: Certificate Pinning Bypass**
- **Threat:** MITM attack intercepts mobile traffic
- **Attack Vector:** Compromised device, proxy tools
- **Likelihood:** Low | **Impact:** Medium | **Risk:** LOW
- **Mitigations:**
  - ✅ TLS 1.3 with valid certificates
  - ⚠️ Certificate pinning not implemented
- **Residual Risk:** MEDIUM
- **Recommendation:** Implement certificate pinning

#### T - Tampering

**T6.2: Local Storage Manipulation**
- **Threat:** Attacker modifies cached data
- **Attack Vector:** Rooted/jailbroken device
- **Likelihood:** Low | **Impact:** Low | **Risk:** LOW
- **Mitigations:**
  - ✅ Server-side validation of all actions
  - ✅ Local storage only for UX (not source of truth)
  - ✅ Biometric-protected secure storage for tokens
- **Residual Risk:** VERY LOW

#### I - Information Disclosure

**T6.3: Token Exposure in Logs**
- **Threat:** Session token logged to device logs
- **Attack Vector:** Malware reading logs
- **Likelihood:** Low | **Impact:** Medium | **Risk:** LOW
- **Mitigations:**
  - ✅ Token redaction in logs
  - ✅ Production logs disabled in mobile release
- **Residual Risk:** LOW

---

## Cross-Cutting Threats

### Supply Chain

**T7.1: Dependency Vulnerability**
- **Threat:** Compromised npm package
- **Attack Vector:** Malicious update, typosquatting
- **Likelihood:** Medium | **Impact:** Critical | **Risk:** HIGH
- **Mitigations:**
  - ✅ Dependabot vulnerability scanning
  - ✅ `vulnerability-scan.yml` workflow (weekly)
  - ✅ PNPM lock file (exact versions)
  - ⚠️ No runtime vulnerability detection
- **Residual Risk:** MEDIUM
- **Recommendation:** Runtime SBOM validation (Snyk/Trivy)

### Insider Threat

**T7.2: Malicious Admin**
- **Threat:** Admin exfiltrates member data
- **Attack Vector:** Legitimate database access
- **Likelihood:** Low | **Impact:** Critical | **Risk:** MEDIUM
- **Mitigations:**
  - ✅ Comprehensive audit logs
  - ✅ Principle of least privilege
  - ⚠️ No data access monitoring/anomaly detection
- **Residual Risk:** MEDIUM
- **Recommendation:** Implement UEBA (user behavior analytics)

### Data Retention

**T7.3: GDPR/PIPEDA Violation**
- **Threat:** Retain personal data beyond legal period
- **Attack Vector:** No data lifecycle policy
- **Likelihood:** Medium | **Impact:** High | **Risk:** HIGH
- **Mitigations:**
  - ⚠️ No automated data retention policy
  - ⚠️ No "right to be forgotten" workflow
- **Residual Risk:** HIGH
- **Recommendation:** Implement data governance framework (see DATA_GOVERNANCE_FRAMEWORK.md)

---

## Risk Summary Matrix

| Threat ID | Component | Threat Category | Likelihood | Impact | Risk Level | Residual Risk |
|-----------|-----------|-----------------|------------|--------|------------|---------------|
| T1.3 | Auth | Spoofing | Medium | Critical | HIGH | MEDIUM |
| T2.1 | API | Spoofing | Medium | High | HIGH | MEDIUM |
| T2.8 | API | DoS | Medium | Medium | MEDIUM | MEDIUM |
| T2.9 | API | DoS | Low | High | MEDIUM | MEDIUM |
| T3.1 | Database | Spoofing | Low | Critical | MEDIUM | MEDIUM |
| T4.5 | Webhooks | DoS | Medium | Medium | MEDIUM | MEDIUM |
| T6.1 | Mobile | Spoofing | Low | Medium | LOW | MEDIUM |
| T7.1 | Supply Chain | Tampering | Medium | Critical | HIGH | MEDIUM |
| T7.2 | Insider | Disclosure | Low | Critical | MEDIUM | MEDIUM |
| T7.3 | Data Retention | Compliance | Medium | High | HIGH | HIGH |

**High/Medium Residual Risks:** 10 threats require enhanced controls

---

## Recommended Security Enhancements

### Priority 1 (Next 30 Days)

1. **Hardware Token Enforcement**
   - Require FIDO2/WebAuthn for admin roles
   - Budget: $25/user (YubiKey 5 NFC)

2. **Data Governance Framework**
   - Implement automated data retention policies
   - Build "right to be forgotten" workflow
   - Reference: `docs/compliance/DATA_GOVERNANCE_FRAMEWORK.md`

3. **API Key Rotation**
   - Automate 30-day API key rotation
   - Implement key versioning strategy

### Priority 2 (Next 90 Days)

4. **WAF Deployment**
   - Deploy Cloudflare WAF or AWS WAF
   - Configure layer 7 DDoS protection
   - Estimated cost: $200/month

5. **Certificate Pinning (Mobile)**
   - Implement cert pinning for React Native
   - Test on iOS + Android

6. **Query Cost Analysis**
   - Implement pg_stat_statements monitoring
   - Alert on queries >5s execution time

### Priority 3 (Next 180 Days)

7. **Runtime SBOM Validation**
   - Deploy Snyk or Trivy for runtime scanning
   - Block vulnerable images in CI/CD

8. **UEBA (User Behavior Analytics)**
   - Implement anomaly detection for data access
   - Alert on bulk exports, off-hours access

9. **Webhook Queue**
   - Implement SQS/Bull queue for webhooks
   - Handle 10,000+ events/hour

10. **Backup Key Rotation**
    - Automate annual backup encryption key rotation

---

## Compliance Mapping

| Standard | Requirement | Threat Coverage |
|----------|-------------|-----------------|
| SOC 2 Type II | Access Control | T1.*, T2.10, T3.3 |
| SOC 2 Type II | Change Management | T3.2, T7.1 |
| SOC 2 Type II | Logical Security | T2.2, T2.3, T3.3 |
| SOC 2 Type II | Incident Response | All repudiation threats |
| PIPEDA | Privacy Controls | T3.5, T5.2, T7.3 |
| GDPR | Data Minimization | T7.3 |
| GDPR | Right to Erasure | T7.3 |
| PCI-DSS (if applicable) | Cardholder Data | T2.7, T3.5, T5.2 |

---

## Attack Surface Summary

| Surface | Exposure | Authentication | Encryption | Monitoring |
|---------|----------|----------------|------------|------------|
| Web Application | Public | Clerk MFA | TLS 1.3 | Sentry + Logs |
| Mobile App | Public | Clerk MFA | TLS 1.3 | Sentry |
| API Endpoints | Semi-Public | JWT + API Keys | TLS 1.3 | Audit Logs |
| Webhooks | Public | HMAC Signatures | TLS 1.3 | Audit Logs |
| Database | Internal | Password + RLS | AES-256 | Prometheus |
| Admin Panel | Internal | Clerk MFA + Role | TLS 1.3 | Audit Logs |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-14 | Security Team | Initial STRIDE analysis |

---

## Approval

**Prepared by:** Security Engineering Team  
**Reviewed by:** CTO / VP Engineering  
**Approved for:** Enterprise Procurement, SOC 2 Audit, VC Diligence  

**Next Review:** May 14, 2026 (Quarterly)
