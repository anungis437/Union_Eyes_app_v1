# PCI-DSS Cardholder Data Flow Documentation

**Organization:** Union Eyes  
**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**SAQ Level:** SAQ-A (Stripe Elements - Tokenization Only)  
**Scope:** Payment card data handling via Stripe

---

## Executive Summary

Union Eyes qualifies for **PCI-DSS SAQ-A** compliance, the simplest compliance level requiring only **22 requirements** (vs 300+ for SAQ-D). This is possible because:

1. **No cardholder data touches our servers** - All card input happens in Stripe-hosted iframes
2. **Tokenization only** - We only store Stripe payment method tokens
3. **No card storage** - Zero PAN, CVV, expiry dates, or cardholder data in our database

---

## Cardholder Data Flow Diagram

```
┌─────────────────┐
│   Member/User   │
│   (Browser)     │
└────────┬────────┘
         │
         │ 1. User enters card info
         ▼
┌─────────────────────────────┐
│   Stripe Elements UI        │
│   (Hosted by Stripe)        │
│   - iframe, off our servers │
│   - PCI-compliant zone      │
└────────┬────────────────────┘
         │
         │ 2. Direct to Stripe (HTTPS)
         ▼
┌─────────────────────────────┐
│   Stripe API                │
│   - Tokenization            │
│   - Returns: pm_xxxxx       │
└────────┬────────────────────┘
         │
         │ 3. Token only (no card data)
         ▼
┌─────────────────────────────┐
│   Union Eyes Backend        │
│   - Receives: pm_token only │
│   - NO card data ever       │
└────────┬────────────────────┘
         │
         │ 4. Store token only
         ▼
┌─────────────────────────────┐
│   PostgreSQL Database       │
│   - stripe_payment_method_id│
│   - bank_account_last4      │
│   - NO PAN, CVV, expiry     │
└─────────────────────────────┘
```

---

## Data Flow Stages

### Stage 1: Card Data Entry
- **Where:** Browser (member's device)
- **Component:** Stripe Elements `<CardElement>` iframe
- **Data:** Full credit card details (PAN, CVV, expiry)
- **PCI Scope:** Stripe-managed (out of Union Eyes scope)
- **Security:** 
  - Stripe-hosted iframe
  - Direct HTTPS to Stripe PCI vault
  - Zero contact with Union Eyes servers

### Stage 2: Tokenization
- **Where:** Stripe API servers
- **Process:** Card → Token conversion
- **Data In:** Full card details
- **Data Out:** Payment Method Token (`pm_xxxxxxxxxxxxx`)
- **PCI Scope:** Stripe-managed
- **Security:**
  - PCI Level 1 Service Provider
  - Encrypted at rest and in transit
  - Compliant with all PCI-DSS requirements

### Stage 3: Token Transmission
- **Where:** Stripe API → Union Eyes Backend
- **Data:** Payment method token only
- **Transport:** HTTPS (TLS 1.2+)
- **PCI Scope:** Union Eyes (minimal - token only)
- **Security:**
  - Token cannot be reverse-engineered to card data
  - Token rotatable/revokable
  - Rate-limited API access

### Stage 4: Token Storage
- **Where:** Union Eyes PostgreSQL database
- **Table:** `finance.dues_transactions`
- **Fields Stored:**
  - `stripe_payment_method_id` (token: `pm_xxxxx`)
  - `bank_account_last4` (last 4 digits only)
  - `stripe_billing_details` (name, email, address - NO card data)
- **PCI Scope:** Non-sensitive - tokens only
- **Security:**
  - Encrypted at rest (PostgreSQL encryption)
  - RLS policies (organization-scoped)
  - Audit logging enabled

---

## What We Store vs DO NOT Store

### ✅ We Store (PCI-Compliant)
| Field | Example | Why Safe |
|-------|---------|----------|
| `stripe_payment_method_id` | `pm_1A2B3C4D5E` | Token - not reversible to card |
| `bank_account_last4` | `4242` | Last 4 digits only (PCI allows) |
| `stripe_billing_details.name` | `John Doe` | Cardholder name (not sensitive per PCI) |
| `stripe_billing_details.email` | `john@union.ca` | Not card data |

### ❌ We DO NOT Store (Would Require SAQ-D)
| Field | Why Not Stored |
|-------|----------------|
| **PAN (Primary Account Number)** | Never touches our servers |
| **CVV/CVC** | Never touches our servers |
| **Expiry Date** | Never touches our servers |
| **Magnetic Stripe Data** | N/A - no physical cards |
| **CAV2/CVC2/CVV2** | Never touches our servers |

---

## Payment Flow Code References

### Frontend: Card Input
**File:** `packages/multi-tenant/src/components/PaymentMethodManager.tsx`

```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Stripe Elements handles card input
<CardElement
  options={{
    style: {
      base: { fontSize: '16px' }
    }
  }}
/>
```

**PCI Impact:** SAQ-A qualified - card data never reaches our JavaScript

### Backend: Token Handling
**File:** `lib/payment-processor/processors/stripe-processor.ts`

```typescript
async createPaymentIntent(params: CreatePaymentIntentParams) {
  // We only work with tokens, never raw card data
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency,
    payment_method: params.paymentMethodToken, // Token only!
    customer: params.customerId,
  });
  
  return paymentIntent;
}
```

**PCI Impact:** Token-only handling = SAQ-A eligible

### Database: Token Storage
**File:** `db/schema/domains/finance/payments.ts`

```typescript
export const duesTransactions = pgTable('dues_transactions', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  
  // SAFE: Token storage only
  stripePaymentMethodId: text('stripe_payment_method_id'),
  bankAccountLast4: text('bank_account_last4'), // Last 4 only
  
  // SAFE: Billing details (no card data)
  stripeBillingDetails: jsonb('stripe_billing_details'), // name, email, address
  
  // NO STORAGE OF: PAN, CVV, expiry - these never exist in our system
});
```

**PCI Impact:** No cardholder data = minimal PCI scope

---

## PCI-DSS SAQ-A Requirements (22 Total)

### Control Objective 1: Maintain Network Security
- **1.1** Firewall configuration (Vercel/Supabase managed)
- **1.2** Vendor default passwords changed ✓

### Control Objective 2: Protect Cardholder Data
- **2.1** N/A - No cardholder data stored
- **2.2** Encryption in transit (HTTPS) ✓

### Control Objective 3: Maintain Vulnerability Management
- **3.1** Quarterly vulnerability scans (ASV)
- **3.2** Security patches applied ✓

### Control Objective 9: Restrict Physical Access
- **9.1** N/A - Cloud-hosted (no physical access)

### Control Objective 12: Maintain Information Security Policy
- **12.1** Security policy documented ✓
- **12.2** Risk assessment performed ✓
- **12.3** Acceptable use policy ✓

[Full requirements tracked in `pci_dss_requirements` table]

---

## Third-Party Service Providers

### Stripe (PCI Level 1 Service Provider)
- **Role:** Payment processor, tokenization, PCI vault
- **Certification:** PCI DSS Level 1 certified
- **Scope:** All cardholder data handling
- **Contract:** Includes PCI compliance attestation

### Vercel (Hosting)
- **Role:** Application hosting
- **PCI Impact:** None - no cardholder data on servers
- **Security:** HTTPS, DDoS protection, rate limiting

### Supabase (Database)
- **Role:** PostgreSQL database hosting
- **PCI Impact:** Low - tokens only, no card data
- **Security:** Encryption at rest, RLS policies, SOC 2 Type II

---

## Compliance Verification

### Quarterly Scans
- **Frequency:** Every 90 days
- **Vendor:** [Choose ASV: Qualys, Trustwave, Rapid7]
- **Scope:** Public-facing web application
- **Tracked In:** `pci_dss_quarterly_scans` table

### Annual Assessment
- **Frequency:** Annually
- **Activity:** Complete SAQ-A questionnaire (22 requirements)
- **Attestation:** Signed by compliance officer
- **Tracked In:** `pci_dss_saq_assessments` table

### Continuous Monitoring
- **Key Rotation:** 90-day cycle for API keys
- **Log Review:** Weekly security log analysis
- **Incident Response:** 24-hour detection window

---

## Incident Response

### Suspected Data Breach
1. **Immediate:** Disable affected payment methods
2. **Within 1 hour:** Notify Stripe
3. **Within 24 hours:** Notify affected members
4. **Within 72 hours:** File incident report with payment brands
5. **Ongoing:** Forensic investigation

### Token Compromise
1. **Immediate:** Revoke compromised tokens via Stripe API
2. **Within 1 hour:** Force password reset for affected users
3. **Within 24 hours:** Review access logs
4. **Ongoing:** Monitor for unauthorized charges

---

## Audit Trail

All payment-related activities are logged in:
- `audit_log` table (user actions)
- Stripe dashboard (payment processing)
- `pci_dss_encryption_keys` (key rotation)
- `pci_dss_quarterly_scans` (vulnerability scans)

**Retention:** 7 years per PCI requirements

---

## Attestation

**We attest that:**
1. ✅ No cardholder data is stored, processed, or transmitted by Union Eyes systems
2. ✅ All card data entry occurs in Stripe-hosted, PCI-compliant interfaces
3. ✅ Only payment method tokens are stored in our database
4. ✅ HTTPS (TLS 1.2+) is enforced for all communication
5. ✅ Quarterly vulnerability scans are scheduled and tracked
6. ✅ Security policies and procedures are documented and followed

**Compliance Officer:** [Name]  
**Signature:** [Signature]  
**Date:** February 12, 2026

---

## References

- PCI Security Standards Council: https://www.pcisecuritystandards.org/
- SAQ-A Questionnaire: https://www.pcisecuritystandards.org/document_library
- Stripe PCI Compliance: https://stripe.com/docs/security/guide
- Union Eyes Security Policy: `docs/security/SECURITY_POLICY.md`

---

**Document Control:**
- **Classification:** Internal Use
- **Distribution:** Compliance team, executive leadership
- **Review Cycle:** Quarterly
- **Next Review:** May 12, 2026
