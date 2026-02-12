# PCI-DSS Security Architecture Documentation
## Union Eyes v2 - Payment Processing Security Design

**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**Classification:** Internal - Confidential  
**Owner:** Chief Technology Officer

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Security Boundaries](#security-boundaries)
4. [Data Flow Analysis](#data-flow-analysis)
5. [Technical Controls](#technical-controls)
6. [Third-Party Services](#third-party-services)
7. [Threat Model](#threat-model)
8. [Compliance Mapping](#compliance-mapping)

---

## 1. Executive Summary

### 1.1 Security Posture

Union Eyes v2 implements a **Zero Touch Cardholder Data** architecture that ensures:

- **0%** cardholder data exposure (no PAN, CVV, or expiry dates ever touch Union Eyes servers)
- **100%** tokenized payment references
- **SAQ-A compliant** (simplest PCI-DSS assessment - 22 requirements vs 300+)

### 1.2 Security Principle

> **"Data You Don't Have Can't Be Stolen"**

By architecting the system to **never** receive cardholder data, Union Eyes eliminates the primary attack surface for payment fraud.

---

## 2. Architecture Overview

### 2.1 High-Level System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└────────────┬────────────────────────────────────────────────┘
             │
   ┌─────────┴─────────┐
   │    TLS 1.3        │
   │  HTTPS Only       │
   └─────────┬─────────┘
             │
┌────────────┴───────────────────────────────────────────────┐
│                Union Eyes v2 Platform                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Next.js App Router (Vercel)                │  │
│  │  • Server-side rendering                              │  │
│  │  • API routes (authenticated)                         │  │
│  │  • Rate limiting (20/hour on payment endpoints)       │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                              │
│  ┌────────────┴─────────────────┬──────────────────────┐   │
│  │                               │                      │   │
│  ▼                               ▼                      ▼   │
│ ┌─────────────────┐   ┌──────────────────┐   ┌─────────┐  │
│ │  Auth Service   │   │  Business Logic  │   │  Admin  │  │
│ │    (Clerk)      │   │   (API Routes)   │   │   UI    │  │
│ └────────┬────────┘   └────────┬─────────┘   └─────────┘  │
│          │                     │                            │
│          └─────────┬───────────┘                            │
│                    │                                        │
│         ┌──────────┴───────────┐                           │
│         │                       │                           │
│         ▼                       ▼                           │
│  ┌──────────────┐      ┌───────────────┐                  │
│  │   Database   │      │  Audit Logs   │                  │
│  │  (Supabase)  │      │   (Sentry)    │                  │
│  │              │      │               │                  │
│  │ TOKENS ONLY  │      │ All payment   │                  │
│  │ No card data │      │ events logged │                  │
│  └──────────────┘      └───────────────┘                  │
└────────────────────────────────────────────────────────────┘
        │                                       ▲
        │ Token references only                 │
        │ (pm_xxx, pi_xxx, cus_xxx)             │ Result only
        ▼                                       │
┌───────────────────────────────────────────────┴─────────────┐
│                     Stripe API                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        PCI-DSS Level 1 Certified Environment         │   │
│  │                                                        │   │
│  │  • Card data validation                                │   │
│  │  • Tokenization (card → payment_method)                │   │
│  │  • Payment processing                                   │   │
│  │  • Fraud detection                                      │   │
│  │  • 3D Secure / SCA                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Payment Processing Flow

```
┌─────────────┐
│   Member    │  1. Initiates payment
│   Browser   │
└──────┬──────┘
       │ 2. Loads payment form
       ▼
┌─────────────────────────────┐
│  Union Eyes Frontend        │
│  (React/Next.js)            │  3. Loads Stripe.js SDK
└──────┬──────────────────────┘
       │ 4. Initializes Stripe Elements
       ▼
┌─────────────────────────────┐
│  Stripe Elements (iframe)   │
│  ┌───────────────────────┐  │  ← SECURITY BOUNDARY
│  │  Card Number   [____] │  │    Card data NEVER leaves
│  │  Expiry        [____] │  │    this iframe
│  │  CVV           [____] │  │
│  └───────────────────────┘  │
└──────┬──────────────────────┘
       │ 5. Direct HTTPS to Stripe
       │    (bypasses Union Eyes servers)
       ▼
┌──────────────────────────────┐
│     Stripe Tokenization      │
│  card_xxx → payment_method   │  6. Creates payment method
└──────┬───────────────────────┘     Returns pm_xxx token
       │
       ▼
┌──────────────────────────────┐
│  Union Eyes Backend          │
│  POST /api/dues/create-      │  7. Receives token only
│       payment-intent         │     Creates payment intent
└──────┬───────────────────────┘
       │ 8. Stores: pi_xxx, amount, status
       ▼
┌──────────────────────────────┐
│  PostgreSQL Database         │
│  payment_transactions:       │  ✅ COMPLIANT STORAGE
│   - stripePaymentIntentId    │
│   - amount                   │
│   - status                   │
│   - memberId                 │
│   ❌ NO card numbers          │
│   ❌ NO CVV                   │
│   ❌ NO expiry dates          │
└──────────────────────────────┘
```

---

## 3. Security Boundaries

### 3.1 Trust Zones

| Zone | Components | Trust Level | Cardholder Data? |
|------|------------|-------------|------------------|
| **Untrusted** | Public internet, member browsers | LOW | ❌ No |
| **DMZ** | Vercel edge network, CDN | MEDIUM | ❌ No |
| **Application** | Next.js API routes, business logic | HIGH | ❌ No |
| **Data** | Supabase PostgreSQL database | HIGH | ❌ No (tokens only) |
| **External Trusted** | Stripe PCI-certified environment | HIGHEST | ✅ Yes (managed by Stripe) |

### 3.2 Security Perimeter

**What's Inside Union Eyes Perimeter:**
- ✅ User authentication (Clerk)
- ✅ Member data (names, emails, membership status)
- ✅ Payment metadata (amounts, dates, statuses)
- ✅ Payment tokens (pm_xxx, pi_xxx, cus_xxx)
- ✅ Business logic (dues calculations, receipts)

**What's OUTSIDE Union Eyes Perimeter (Stripe-managed):**
- ❌ Credit card numbers (PAN)
- ❌ CVV/CVC codes
- ❌ Card expiry dates (full MM/YYYY)
- ❌ Cardholder names (as entered on card)
- ❌ Billing addresses (Stripe verifies for AVS)

### 3.3 Critical Security Boundary: Stripe Elements

**Stripe Elements** is the key architectural component that ensures PCI compliance:

```typescript
// components/dues/dues-payment-form.tsx
import { CardElement } from '@stripe/react-stripe-js';

// CardElement is an IFRAME hosted by Stripe
// Card data NEVER passes through Union Eyes JavaScript
<CardElement
  options={{
    style: {
      base: { fontSize: '16px' },
    },
  }}
  onChange={(event) => {
    // event.complete = true/false
    // event.error = string (if any)
    // NO ACCESS to actual card number
  }}
/>
```

**Security Properties:**
- ✅ **Isolated iframe:** Card data trapped in Stripe-controlled iframe
- ✅ **Direct HTTPS:** Payment data sent directly to Stripe (bypass Union Eyes)
- ✅ **Token return only:** Stripe returns `pm_xxx` token, not card data
- ✅ **CSP compliant:** Content Security Policy enforced
- ✅ **TLS 1.3:** Encrypted in transit

---

## 4. Data Flow Analysis

### 4.1 Cardholder Data Flow (ZERO Touch)

```
Member Card Data Flow (PCI-Compliant):

┌─────────────┐
│   Member    │  Types: 4242 4242 4242 4242
│  Browser    │         Exp: 12/25, CVV: 123
└──────┬──────┘
       │ ❌ DOES NOT go to Union Eyes servers
       │ ✅ GOES DIRECTLY to Stripe iframe
       ▼
┌─────────────────────────┐
│   Stripe Elements       │
│   (Stripe-hosted)       │
└──────┬──────────────────┘
       │ HTTPS to stripe.com
       ▼
┌─────────────────────────┐
│  Stripe Tokenization    │  Converts:
│  Service                │  4242 4242 4242 4242
└──────┬──────────────────┘  → pm_1Abc2Def3Ghi4Jkl

       │ Returns token only
       ▼
┌─────────────────────────┐
│  Union Eyes Backend     │
│  Receives:              │
│   {                     │
│     paymentMethodId:    │
│       "pm_1Abc2Def",    │  ✅ Safe to store
│     last4: "4242",      │  ✅ Not full PAN
│     brand: "visa"       │  ✅ Public info
│   }                     │
└─────────────────────────┘
```

### 4.2 Token Storage (Safe)

**Database Schema:**

```sql
-- db/schema/domains/finance/payments.ts
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  
  -- Safe Stripe references (NOT cardholder data)
  stripe_payment_intent_id TEXT,  -- e.g., pi_3OqNEw2eZv
  stripe_customer_id TEXT,        -- e.g., cus_abc123xyz
  stripe_payment_method_id TEXT,  -- e.g., pm_def456uvw
  
  -- Payment metadata (safe)
  amount DECIMAL(10,2),
  currency TEXT,
  status TEXT,
  
  -- Business context
  member_id UUID REFERENCES members(id),
  organization_id UUID,
  
  -- Compliance
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  -- ❌ FORBIDDEN COLUMNS (never created):
  -- card_number        -- VIOLATION
  -- cvv                -- VIOLATION
  -- card_expiry        -- VIOLATION
  -- cardholder_name    -- VIOLATION
);
```

**Automated Enforcement:**

```typescript
// __tests__/compliance/pci-compliance.test.ts
describe('PCI-DSS Compliance', () => {
  it('should never store PAN in any table', async () => {
    const tables = await getAllTables();
    
    for (const table of tables) {
      const columns = await getTableColumns(table);
      
      const forbiddenColumns = [
        'card_number', 'pan', 'credit_card',
        'cvv', 'cvc', 'cvv2',
        'card_expiry', 'expiration_date',
        'magnetic_stripe', 'track_data'
      ];
      
      const violations = columns.filter(col =>
        forbiddenColumns.some(forbidden =>
          col.toLowerCase().includes(forbidden)
        )
      );
      
      expect(violations).toEqual([]);
    });
  });
});
```

---

## 5. Technical Controls

### 5.1 Transport Layer Security (TLS)

**Configuration:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Enforce HTTPS
  if (
    request.nextUrl.protocol === 'http:' &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.redirect(
      `https://${request.nextUrl.host}${request.nextUrl.pathname}`,
      301
    );
  }

  // Strict-Transport-Security header
  const headers = new Headers(request.headers);
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  return NextResponse.next({ headers });
}
```

**TLS Parameters:**
- **Protocol:** TLS 1.3 (minimum TLS 1.2)
- **Ciphers:** Strong ciphers only (PFS required)
- **HSTS:** Enabled with preload
- **Certificate:** Automated renewal (Vercel/Let's Encrypt)

### 5.2 Authentication & Authorization

**Multi-Layered Access Control:**

```typescript
// lib/api-auth-guard.ts
export async function apiAuthGuard(
  request: NextRequest
): Promise<AuthResult> {
  // Layer 1: JWT token validation
  const token = request.headers.get('Authorization');
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Layer 2: Clerk session validation
  const session = await verifyClerkSession(token);
  if (!session) {
    return { error: 'Invalid session', status: 401 };
  }

  // Layer 3: Role-based authorization
  const requiredRole = getRequiredRole(request.nextUrl.pathname);
  if (!hasRole(session.user, requiredRole)) {
    return { error: 'Forbidden', status: 403 };
  }

  // Layer 4: Organization context validation
  const orgId = request.headers.get('X-Organization-Id');
  if (!userBelongsToOrg(session.user, orgId)) {
    return { error: 'Invalid organization', status: 403 };
  }

  return { user: session.user, orgId };
}
```

**Role-Based Access Control (RBAC):**

| Role | Payment Permissions |
|------|---------------------|
| Member | View own payments, pay dues |
| Treasurer | View all org payments, refunds |
| Finance Admin | Full payment management |
| System Admin | All payment data + logs |

### 5.3 Rate Limiting

**Payment Endpoint Protection:**

```typescript
// app/api/dues/create-payment-intent/route.ts
import { rateLimit } from '@/lib/middleware/rate-limiter';

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,          // 20 requests per hour
  message: 'Too many payment attempts',
});

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResult = await limiter.check(request);
  if (rateLimitResult.blocked) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ... payment processing
}
```

**Rate Limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/dues/create-payment-intent` | 20 req | 1 hour |
| `/api/dues/confirm-payment` | 50 req | 1 hour |
| `/api/webhooks/stripe` | 1000 req | 1 hour |

### 5.4 Webhook Security

**Stripe Webhook Signature Verification:**

```typescript
// app/api/webhooks/stripe/route.ts
import { buffer } from 'stream/consumers';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  // Get raw body for signature verification
  const rawBody = await buffer(request.body);
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Verify webhook signature using HMAC-SHA256
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logSecurityEvent({
      type: 'webhook_verification_failure',
      severity: 'high',
      details: { error: err.message },
    });
    
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // Process verified event
  await handleStripeEvent(event);
}
```

**Security Properties:**
- ✅ **HMAC signature:** Prevents replay attacks
- ✅ **Timestamp validation:** Prevents old webhook replay
- ✅ **Secret rotation:** Webhook secrets rotated quarterly
- ✅ **Failed attempt logging:** All verification failures logged

---

## 6. Third-Party Services

### 6.1 Stripe Payment Processor

**Certification:**
- **PCI-DSS Level:** Level 1 (highest)
- **SAQ Type:** SAQ-D (most comprehensive)
- **Last Audit:** December 2025
- **Certification Authority:** Coalfire (Approved Assessor)
- **Certificate:** [Stripe PCI Compliance](https://stripe.com/docs/security/stripe)

**Stripe Security Features Used:**

| Feature | Description | Status |
|---------|-------------|--------|
| Stripe Elements | Isolated iframe for card entry | ✅ Implemented |
| Payment Intents API | 3D Secure / SCA support | ✅ Implemented |
| Webhook Signatures | HMAC verification | ✅ Implemented |
| Idempotency Keys | Prevent duplicate charges | ✅ Implemented |
| Radar (Fraud Detection) | ML-based fraud prevention | ✅ Enabled |
| TLS 1.3 | Encrypted API communication | ✅ Enforced |

**Stripe SDK Version:**
```json
{
  "stripe": "^16.12.0",          // Server SDK
  "@stripe/stripe-js": "^4.8.0",  // Client SDK
  "@stripe/react-stripe-js": "^2.8.1"
}
```

### 6.2 Vercel Hosting Platform

**Security Certifications:**
- SOC 2 Type II
- ISO 27001
- GDPR compliant

**Built-in Security:**
- Edge network with DDoS protection
- Automatic HTTPS/TLS certificate management
- Web Application Firewall (WAF)
- Rate limiting at edge layer

### 6.3 Supabase Database

**Security Certifications:**
- SOC 2 Type II
- ISO 27018 (Cloud Privacy)
- HIPAA compliant infrastructure

**Database Security:**
- Row-Level Security (RLS) enabled
- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.3)
- Automatic backups (7-day retention)
- Point-in-time recovery

---

## 7. Threat Model

### 7.1 STRIDE Analysis

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| **Spoofing** | Fake payment requests | JWT authentication, Clerk session validation | LOW |
| **Tampering** | Modify payment amounts | Server-side validation, audit logs | LOW |
| **Repudiation** | Deny payment | Comprehensive audit trail, Stripe records | LOW |
| **Information Disclosure** | Card data leak | NO card data stored (tokens only) | MINIMAL |
| **Denial of Service** | Payment endpoint flooding | Rate limiting (20/hour), Vercel DDoS protection | LOW |
| **Elevation of Privilege** | Role bypass | RBAC enforcement, organization context validation | LOW |

### 7.2 Attack Scenarios & Defenses

#### Scenario 1: Database Breach

**Attack:** Adversary gains SQL access to PostgreSQL database

**Impact:** **MINIMAL** ✅
- No cardholder data stored
- Only tokens (pm_xxx, pi_xxx, cus_xxx) exposed
- Tokens cannot be used to retrieve card data (Stripe API requires authentication)
- Member PII exposed (names, emails) - standard breach protocol applies

**Defense Layers:**
1. Row-Level Security (RLS) prevents cross-organization access
2. Encrypted at rest (AES-256)
3. Database credentials in secrets manager (not in code)
4. Read-only replicas for reporting queries

#### Scenario 2: Man-in-the-Middle Attack

**Attack:** Adversary intercepts network traffic between member and Union Eyes

**Impact:** **MINIMAL** ✅
- TLS 1.3 encryption prevents eavesdropping
- HSTS prevents protocol downgrade
- Card data never in Union Eyes traffic (goes directly to Stripe)

**Defense Layers:**
1. Strict-Transport-Security header (force HTTPS)
2. TLS 1.3 with perfect forward secrecy
3. Certificate pinning (Stripe Elements)
4. Content Security Policy (CSP)

#### Scenario 3: Webhook Forgery

**Attack:** Adversary sends fake Stripe webhooks to trigger fraudulent refunds

**Impact:** **LOW** ✅
- HMAC signature verification prevents forgery
- Timestamp validation prevents replay attacks

**Defense Layers:**
```typescript
// Webhook security
1. Verify HMAC-SHA256 signature
2. Check timestamp (reject > 5 minutes old)
3. Log all verification failures
4. Alert on suspicious patterns (10+ failures in 1 hour)
```

#### Scenario 4: API Key Compromise

**Attack:** Stripe secret key leaked (e.g., GitHub commit, logs)

**Impact:** **MEDIUM** ⚠️
- Adversary could create payment intents
- Adversary could issue refunds
- **NO ACCESS to full card numbers** (Stripe never exposes PAN even with API key)

**Defense Layers:**
1. API keys in environment variables (never in code)
2. Secret rotation every 90 days
3. Restricted API key permissions (no customer data export)
4. GitHub secret scanning (auto-alerts on leaks)
5. Stripe dashboard monitoring (unusual activity alerts)

**Incident Response:**
- **Detection:** GitHub alerts, Stripe usage anomalies
- **Response Time:** < 1 hour (emergency key rotation)
- **Recovery:** Rotate key, audit all API calls since compromise

---

## 8. Compliance Mapping

### 8.1 PCI-DSS Requirements Mapping

| PCI Requirement | Union Eyes Implementation | Evidence |
|-----------------|---------------------------|----------|
| **1. Firewall** | Cloud provider (Vercel) | N/A (no cardholder data) |
| **2. Vendor defaults** | All default credentials changed | Supabase config, Clerk setup |
| **3. Stored data protection** | NO cardholder data stored | Database schema, tests |
| **4. Encryption in transit** | TLS 1.3 enforced | middleware.ts (HSTS) |
| **5. Antivirus** | N/A (cloud serverless) | N/A |
| **6. Secure systems** | Dependency audits, security patches | pnpm audit (weekly) |
| **7. Access control** | RBAC with 26 roles | api-auth-guard.ts |
| **8. Unique IDs** | Clerk user IDs (UUID) | auth.ts |
| **9. Physical access** | Cloud provider (datacenter security) | Vercel/Supabase compliance docs |
| **10. Logging** | All payment events logged (7 years) | api-security.ts |
| **11. Security testing** | Quarterly scans, annual pentest | Security testing schedule |
| **12. Security policy** | Comprehensive policies maintained | docs/compliance/policies/ |

### 8.2 SAQ-A Qualification Checklist

✅ **All payment processing outsourced to PCI-validated provider** (Stripe Level 1)  
✅ **No electronic storage of cardholder data**  
✅ **No electronic processing of cardholder data**  
✅ **No electronic transmission of cardholder data**  
✅ **Only redirect/iframe payment method used** (Stripe Elements)  
✅ **HTTPS/TLS for all customer-facing pages**  
✅ **Payment provider is PCI-DSS compliant**  
✅ **Annual SAQ-A attestation completed**

---

## 9. Monitoring & Incident Response

### 9.1 Real-Time Monitoring

**Sentry Integration:**
```typescript
// instrumentation.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  
  // Payment error tracking
  beforeSend(event, hint) {
    // Scrub any potential card data from logs
    if (event.message && /\b\d{13,19}\b/.test(event.message)) {
      event.message = event.message.replace(/\b\d{13,19}\b/g, '[CARD_REDACTED]');
    }
    return event;
  },
});
```

**Alert Rules:**

| Alert | Threshold | Action |
|-------|-----------|--------|
| Payment failure spike | > 10 in 10 min | Page on-call engineer |
| Webhook verification failure | > 5 in 1 hour | Investigate + rotate secret |
| Unusual refund volume | > $5,000 in 1 hour | Finance review + freeze |
| Database query anomaly | Regex for "card_number" | IMMEDIATE ALERT (potential leak attempt) |

### 9.2 Incident Response Plan

**Payment Security Incident Classification:**

| Severity | Definition | Response Time | Escalation |
|----------|------------|---------------|------------|
| **Critical** | Confirmed card data leak | < 15 min | CEO + Legal + Payment processor |
| **High** | API key compromise | < 1 hour | CTO + Security team + Stripe contact |
| **Medium** | Webhook forgery attempt | < 4 hours | Security team |
| **Low** | Failed payment spike (legitimate) | < 24 hours | Dev team |

**Incident Response Steps (Card Data Leak):**

1. **Containment (0-15 min):**
   - Isolate affected systems
   - Rotate all Stripe API keys
   - Disable affected payment methods
   - Notify Stripe security team

2. **Assessment (15-60 min):**
   - Determine scope: How many cards affected?
   - Identify root cause: How did breach occur?
   - Check logs: When did breach start?

3. **Notification (1-24 hours):**
   - **Payment card brands:** Visa, Mastercard, Amex
   - **Acquiring bank:** Per PCI-DSS breach notification requirements
   - **Affected members:** Per PIPEDA/GDPR requirements
   - **Regulators:** Provincial privacy commissioners

4. **Forensics (24-72 hours):**
   - Engage PCI Forensic Investigator (PFI)
   - Preserve evidence (logs, database snapshots)
   - Root cause analysis

5. **Remediation (1-4 weeks):**
   - Implement fixes
   - Re-audit security controls
   - Penetration testing
   - Update policies

**Contact Information:**

| Role | Contact | Response Time |
|------|---------|---------------|
| CTO | cto@unioneyes.io | 24/7 |
| Security Team | security@unioneyes.io | 24/7 |
| Stripe Support | https://support.stripe.com | 24/7 |
| PCI Forensic Investigator | [External firm TBD] | < 24 hours |

---

## 10. Appendices

### Appendix A: Stripe Token Examples

**Safe to Store:**
```typescript
{
  // Payment Intent ID (starts with pi_)
  stripePaymentIntentId: "pi_3OqNEw2eZvKYlo2C1VXy4wEr",
  
  // Customer ID (starts with cus_)
  stripeCustomerId: "cus_PqNEw2eZvKYlo2",
  
  // Payment Method ID (starts with pm_)
  stripePaymentMethodId: "pm_1OqNEw2eZvKYlo2C",
  
  // Partial card info (safe)
  last4: "4242",            // Last 4 digits only
  brand: "visa",            // Card brand
  expMonth: 12,             // Expiry month (number only, safe with other data absent)
  expYear: 2025            // Expiry year
}
```

**FORBIDDEN to Store:**
```typescript
{
  cardNumber: "4242424242424242",  // ❌ VIOLATION
  cvv: "123",                      // ❌ VIOLATION
  cardholderName: "John Doe",      // ❌ VIOLATION (as entered on card)
  magneticStripeData: "...",       // ❌ VIOLATION
}
```

### Appendix B: Compliance Test Suite

**Automated Tests:** 18 PCI-DSS compliance tests

```bash
# Run compliance test suite
pnpm test:compliance:pci

# Tests:
✓ Database schema cannot contain forbidden columns
✓ No PAN storage in any table
✓ No CVV/CVC storage
✓ No full magnetic stripe data
✓ HTTPS enforced on all payment endpoints
✓ Stripe webhook signatures verified
✓ Payment transactions audited
✓ Rate limiting on payment endpoints
✓ Authentication required for payment APIs
✓ Role-based access for refunds
✓ Stripe Elements properly implemented
✓ No card data in logs
✓ No card data in error messages
✓ TLS 1.3 configuration validated
✓ API keys not in source code
✓ Payment tokens properly formatted
✓ Idempotency keys used
✓ Card data scrubbing in Sentry
```

### Appendix C: Architecture Decision Records

**ADR-001: Use Stripe Elements instead of Direct API**

**Decision:** Use Stripe Elements (iframe) for all card data entry

**Rationale:**
- Eliminates PCI scope (card data never touches Union Eyes)
- Automatic PCI compliance (Stripe handles validation)
- Reduces SAQ from SAQ-D (300+ requirements) to SAQ-A (22 requirements)
- Lower insurance costs
- Simpler development (no card validation logic needed)

**Trade-offs:**
- ✅ Pros: Massive reduction in compliance burden
- ⚠️ Cons: Less UI customization (limited iframe styling)

**Status:** Accepted (2025-01-15)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-12 | CTO | Initial security architecture documentation |

**Distribution:** Internal - Confidential  
**Review Schedule:** Annually (next review: February 2027)  
**Owner:** Chief Technology Officer

