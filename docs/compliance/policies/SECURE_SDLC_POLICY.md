# Secure Software Development Lifecycle (SSDLC) Policy

**Document Version:** 1.0  
**Effective Date:** February 2026  
**Owner:** Engineering & Security Teams  
**Review Schedule:** Annual  
**ISO 27001 Control:** A.5.8, A.8.25-A.8.31

## 1. Purpose

This policy defines security requirements integrated throughout the software development lifecycle to ensure secure design, implementation, testing, and deployment of Union Eyes platform features.

## 2. SSDLC Phases

### 2.1 Phase 1: Requirements and Planning

**Security Activities:**
- Define security requirements alongside functional requirements
- Identify sensitive data handling needs
- Determine authentication/authorization requirements
- Assess regulatory compliance impact (PIPEDA, GDPR, provincial laws)
- Initial risk assessment for new features

**Artifacts:**
- Security requirements document (part of RFC/design doc)
- Data flow diagram
- Threat model (for high-risk features)

**Approval:** Engineering Lead + Security Team (for high-risk features)

### 2.2 Phase 2: Architecture and Design

**Security Activities:**
- Threat modeling using STRIDE framework
- Review data classification and encryption needs
- Design secure APIs with proper auth middleware
- Plan RLS (Row-Level Security) policies for data access
- Review third-party integrations and dependencies

**Design Principles:**
- Least privilege access
- Defense in depth
- Secure by default
- Fail securely
- Separation of concerns

**Artifacts:**
- Architecture diagram with trust boundaries
- Threat model document (for critical features)
- API security specifications
- Database schema with RLS policies

**Review:** Architecture review with Security Team for major features

### 2.3 Phase 3: Implementation (Secure Coding)

**Security Practices:**

**A. Input Validation:**
- Validate all user inputs (whitelist preferred)
- Sanitize inputs to prevent injection attacks
- Use parameterized queries (Drizzle ORM prevents SQL injection)
- Implement rate limiting on API endpoints

**B. Authentication & Authorization:**
- Use Clerk for authentication (never build custom auth)
- Implement withRoleAuth middleware on all protected routes
- Verify session tokens on every request
- Enforce MFA for privileged operations

**C. Data Protection:**
- Encrypt sensitive data at rest (Azure Key Vault for secrets)
- Use HTTPS/TLS 1.3 for all data in transit
- Never log sensitive data (passwords, tokens, PII)
- Implement RLS policies in database schema

**D. Error Handling:**
- Use generic error messages to users
- Log detailed errors server-side only (Sentry)
- Never expose stack traces or system info to users

**E. Dependency Management:**
- Use npm lock files to pin dependency versions
- Review dependencies before adding (license, maintainer, security history)
- Minimize dependencies (avoid unnecessary libraries)

**Code Review Requirements:**
- All code requires peer review (GitHub PR)
- Security-sensitive code reviewed by Security Team
- Automated checks must pass (linting, tests, type-check)

### 2.4 Phase 4: Testing

**Security Testing:**

**A. Automated Testing (CI/CD):**
- Unit tests with security test cases
- Integration tests for auth flows
- ESLint security rules (no-eval, no-unsafe-regex)
- TypeScript strict mode (type safety)
- Dependency vulnerability scanning (npm audit, Dependabot)

**B. Manual Testing:**
- Security test cases for new features
- Privilege escalation testing
- Input validation and boundary testing
- Session management testing

**C. Pre-Production Testing (Staging):**
- Penetration testing for major releases (quarterly or on-demand)
- Security regression testing
- RLS policy verification

**D. Code Analysis:**
- Static analysis: ESLint with security plugins
- Dynamic analysis: Runtime error monitoring (Sentry)
- Secrets scanning: GitHub secret scanning enabled

**Test Coverage Target:** 80%+ (measured in CI/CD)

### 2.5 Phase 5: Deployment

**Secure Deployment Practices:**

**A. Deployment Checklist:**
- [ ] Security review completed and approved
- [ ] All tests passing (unit, integration, E2E)
- [ ] No high/critical vulnerabilities in dependencies
- [ ] Secrets stored in Azure Key Vault (not code/env files)
- [ ] Database migrations tested in staging
- [ ] RLS policies validated
- [ ] Monitoring and alerts configured
- [ ] Rollback plan documented

**B. Production Deployment:**
- Blue-green or canary deployments (zero-downtime)
- Automated rollback on errors (Vercel)
- Post-deployment smoke tests
- Security monitoring enabled (Sentry alerts)

**C. Configuration Management:**
- Infrastructure as Code (Terraform or Azure Bicep) - planned
- Immutable infrastructure (no manual changes)
- Version-controlled configurations
- Secrets rotation on deployment (where applicable)

### 2.6 Phase 6: Maintenance and Monitoring

**Ongoing Security Activities:**

**A. Monitoring:**
- Real-time error monitoring (Sentry)
- Audit log monitoring for suspicious activity
- Performance monitoring (database query analysis)
- Security event alerting (failed auth, RLS violations)

**B. Patch Management:**
- Critical dependency patches: within 48 hours
- High-severity patches: within 7 days
- Regular dependency updates: monthly
- OS and infrastructure patches: automated (Azure)

**C. Vulnerability Management:**
- Weekly review of Dependabot alerts
- Monthly review of OWASP Top 10 applicability
- Quarterly penetration testing (as budget allows)
- Annual application security assessment

**D. Incident Response:**
- Security incidents logged and investigated
- Post-incident reviews with lessons learned
- Security control improvements implemented

### 2.7 Phase 7: Decommissioning

**Secure Decommissioning:**
- Data retention policy followed (purge after retention period)
- Secrets and credentials revoked
- API endpoints disabled
- Database tables archived or deleted
- Documentation updated
- Access logs retained per policy

## 3. Secure Coding Standards

### 3.1 OWASP Top 10 Protection

| Risk | Protection Mechanism |
|------|---------------------|
| **A01: Broken Access Control** | RLS policies, withRoleAuth middleware, least privilege |
| **A02: Cryptographic Failures** | TLS 1.3, AES-256-GCM, Azure Key Vault, no hardcoded secrets |
| **A03: Injection** | Parameterized queries (Drizzle ORM), input validation, CSP headers |
| **A04: Insecure Design** | Threat modeling, security requirements, architecture reviews |
| **A05: Security Misconfiguration** | Security headers, secure defaults, configuration scanning |
| **A06: Vulnerable Components** | Dependabot, npm audit, SBOM, timely patching |
| **A07: Auth Failures** | Clerk (best-in-class auth), MFA, rate limiting, session management |
| **A08: Data Integrity Failures** | Digital signatures, audit logs, checksums, immutable backups |
| **A09: Logging Failures** | Comprehensive logging (winston + Sentry), audit trails, tamper-proof logs |
| **A10: SSRF** | Input validation, allowlist for external requests, network policies |

### 3.2 Code Review Checklist

Security reviewers check for:

- [ ] All inputs validated and sanitized
- [ ] Authentication required on protected routes
- [ ] Authorization checks using withRoleAuth or RLS
- [ ] No sensitive data in logs or error messages
- [ ] Secrets stored in Key Vault, not code
- [ ] SQL queries parameterized (no string concatenation)
- [ ] Rate limiting on API endpoints
- [ ] HTTPS enforced (no HTTP)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Tests cover security scenarios

## 4. Third-Party Code and Dependencies

### 4.1 Dependency Review Process

**Before Adding Dependency:**
- Check npm download count (prefer popular, well-maintained)
- Review GitHub stars, last commit date, open issues
- Check for known vulnerabilities (npm audit, Snyk)
- Review license compatibility
- Assess maintainer reputation

**Approval Required For:**
- Dependencies with < 10K weekly downloads
- Dependencies with no updates in > 6 months
- Dependencies with open security issues
- Proprietary or restrictive licenses

### 4.2 Dependency Management

- Lock file committed (package-lock.json)
- Automated updates via Dependabot (security only)
- Manual review for major version updates
- Regular dependency audits (monthly)

### 4.3 Open Source Contribution

Employees may contribute to open source with:
- Manager approval
- No proprietary code or secrets disclosed
- Contributions during personal time (or company-sponsored projects)
- CLA signing when required

## 5. Security Testing Schedule

| Test Type | Frequency | Owner | Tools |
|-----------|-----------|-------|-------|
| **Automated unit/integration tests** | Every commit | Engineering | Vitest, Playwright |
| **Static code analysis** | Every commit | Engineering | ESLint, TypeScript |
| **Dependency scanning** | Every commit + weekly | DevOps | npm audit, Dependabot |
| **Secret scanning** | Every commit | GitHub | GitHub Secret Scanning |
| **Manual security testing** | Every release | QA + Security | Manual test cases |
| **Penetration testing** | Quarterly | Security Team | External firm (planned) |
| **Security code review** | High-risk features | Security Team | Manual review |

## 6. Security Champions Program

### 6.1 Objectives

- Embed security expertise in engineering teams
- Facilitate communication between Security and Engineering
- Promote secure coding culture

### 6.2 Security Champion Responsibilities

- Participate in security training and briefings
- Review PRs for security issues
- Escalate security concerns to Security Team
- Champion security initiatives within team

### 6.3 Selection

- Volunteer basis (1-2 per engineering squad)
- Security training provided (monthly sessions)
- Recognized in performance reviews

## 7. Pre-Production Environments

### 7.1 Environment Security

| Environment | Purpose | Data | Access |
|-------------|---------|------|--------|
| **Development (Local)** | Developer laptops | Synthetic test data only | Developers |
| **Staging** | Pre-production testing | Anonymized production subset | Developers, QA, limited admin |
| **Production** | Live customer data | Real member PII | Privileged access only, MFA required |

### 7.2 Data Masking

Staging database (future):
- PII fields masked or anonymized
- Member names: replaced with synthetic names
- Emails: replaced with @example.com addresses
- Phone numbers: randomized
- Financial data: scaled by random factor

## 8. Incident Response Integration

Security vulnerabilities discovered:
- Report via security@unioneyes.com or GitHub private security advisory
- Triage by Security Team (within 24 hours)
- Severity rating: Critical, High, Medium, Low
- Fix prioritized in sprint backlog
- Disclosure policy: Responsible disclosure (90-day window)

## 9. Compliance and Audit

- SSDLC practices audited during SOC 2 / ISO 27001 assessments
- Code review records retained (GitHub PRs)
- Security test results retained (CI/CD logs)
- Architecture and threat model docs version-controlled

## 10. Training

**All Engineers:**
- Secure coding training (onboarding + annual refresher)
- OWASP Top 10 awareness
- Threat modeling basics

**Senior Engineers / Security Champions:**
- Advanced threat modeling
- Security code review techniques
- Secure architecture design

## 11. Metrics

| Metric | Target | Current | Tracking |
|--------|--------|---------|----------|
| **Code review coverage** | 100% | TBD | GitHub PRs |
| **Test coverage** | > 80% | TBD | Vitest coverage |
| **Mean time to fix (critical vuln)** | < 48 hours | TBD | Security Team tracking |
| **Security issues per release** | < 2 | TBD | Issue tracking |
| **Dependabot alerts open > 7 days** | 0 | TBD | GitHub dashboard |

## 12. Related Documents

- Threat Intelligence Program
- Incident Response Plan
- Access Control Policy
- Encryption Standards
- Code Review Guidelines (internal wiki)
- API Security Standards (internal wiki)

## Document Control

- **Next Review Date:** February 2027
- **Approval:** CTO + Security Team Lead
- **Change History:**
  - v1.0 (February 2026): Initial SSDLC policy
