# Recognition & Rewards - Implementation Decisions

## Decision Log

### Decision 1: Credits vs. Monetary Values

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Use integer **credits** as the primary unit, not monetary amounts.  
**Rationale**:

- Simplifies accounting (no decimal/rounding issues)
- Clearer separation between recognition system and actual currency
- Easier to implement multi-currency support later (1 credit can map to different currencies)
- Avoids tax/regulatory complications of handling "real money" in the ledger

**Conversion**: 1 credit = $1 CAD (for MVP). Configurable per org in future.

---

### Decision 2: Shopify Redemption Model

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Use **Shopify discount codes** for redemptions, not gift cards or payment apps.  
**Rationale**:

- Discount codes can be auto-generated via Admin API
- Simpler webhook handling (orders/paid, orders/fulfilled)
- No need for Shopify Plus plan (gift cards require Plus)
- Union Eyes retains full control over credit lifecycle (no external balance tracking)

**Flow**:

1. Member initiates redemption → Union Eyes deducts credits immediately
2. Create single-use discount code = redemption amount
3. Redirect member to Shopify checkout with discount pre-applied
4. Webhook confirms order → mark redemption as ordered/fulfilled
5. Refund webhook → return credits to wallet

---

### Decision 3: Ledger Immutability

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Ledger is **append-only**; no UPDATEs or DELETEs allowed.  
**Rationale**:

- Audit compliance (full transaction history preserved)
- Easier to debug issues (no missing data)
- Simplifies concurrency (no update conflicts)
- Corrections handled via offsetting entries (e.g., revoke = negative earn)

**Implementation**: Database-level restriction (no UPDATE/DELETE grants on `reward_wallet_ledger`).

---

### Decision 4: Balance Denormalization

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Store `balance_after` in each ledger entry instead of calculating via SUM().  
**Rationale**:

- Performance: O(1) balance lookup instead of O(n) aggregation
- Consistency: Balance calculated transactionally with entry insertion
- Simplicity: No need for materialized views or triggers

**Trade-off**: Requires transactional updates (lock previous balance, calculate new, insert).

---

### Decision 5: Budget Enforcement Timing

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Check budget availability **before** issuing award, not during approval.  
**Rationale**:

- Approval is a human decision (doesn't consume budget)
- Issuance is the financial event (when credits enter circulation)
- Allows for "approved but unfunded" awards (can be resolved by adding budget)

**Flow**: `approve_award()` → success; `issue_award()` → check budget → fail if exhausted.

---

### Decision 6: Webhook Idempotency

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Use Shopify's `X-Shopify-Webhook-Id` header for idempotency, not custom keys.  
**Rationale**:

- Shopify guarantees uniqueness of webhook IDs
- Simpler than generating our own UUIDs
- Aligns with Shopify best practices

**Storage**: `webhook_receipts` table with `(provider, webhook_id)` unique constraint.

---

### Decision 7: Service Role for Webhooks

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Webhook processing uses **service role** (bypasses RLS), not user credentials.  
**Rationale**:

- Webhooks arrive asynchronously (no user session context)
- Service role ensures operations succeed regardless of user permissions
- Matches existing pattern in repo for system-initiated actions

**Security**: HMAC signature verification + idempotency checks provide safety.

---

### Decision 8: MVP Approval Workflow

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Single-tier approval (one approver), no multi-level workflows.  
**Rationale**:

- Simplifies MVP implementation
- Most unions have flat approval structures for recognition
- Can be extended in Phase 8+ if needed

**Auto-Approval**: Award types can set `requires_approval = false` to skip approval step.

---

### Decision 9: Shopify Token Storage

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Store **token references** in DB, actual tokens in Azure Key Vault or env vars.  
**Rationale**:

- Never store secrets in database (security best practice)
- Existing repo patterns use Key Vault for sensitive config
- Supports per-org Shopify configs (multiple shops)

**Format**: `shopify_config.storefront_token_secret_ref = "SHOPIFY_TOKEN_ORG_{org_id}"`

---

### Decision 10: Award Status Flow

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Use explicit status enum, not boolean flags.  
**Rationale**:

- Clear state machine: `pending → approved → issued` (or `rejected`/`revoked`)
- Easier to query (e.g., "all pending awards")
- Extensible for future states (e.g., `expired`, `appealed`)

**States**: `pending`, `approved`, `issued`, `rejected`, `revoked`

---

### Decision 11: Redemption Provider Abstraction

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Use `provider` enum in `reward_redemptions`, but only implement Shopify for MVP.  
**Rationale**:

- Future-proofs for Amazon, custom fulfillment, etc.
- Minimal overhead (single column)
- Provider-specific logic isolated in services layer

**MVP Providers**: `shopify` only.

---

### Decision 12: Budget Scope Extensibility

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Use `scope_type` + `scope_ref_id` for budget envelopes, even though MVP only supports `org` scope.  
**Rationale**:

- Future enhancements: department, manager, local union budgets
- Minimal schema change needed later
- Queries can filter by `scope_type = 'org'` for MVP

**MVP Scopes**: `org` only.

---

### Decision 13: Testing Strategy

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Unit tests for services; integration tests for critical flows; E2E tests for UI (follow existing repo patterns).  
**Rationale**:

- Repo already has Vitest setup
- RLS testing requires DB access (integration tests)
- UI tests can use existing component testing patterns

**Coverage Goals**:

- Services: 80%+
- API routes: 70%+
- Critical flows (award issuance, redemption): 100%

---

### Decision 14: Feature Flags

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Use env vars for feature flags, not runtime toggles.  
**Rationale**:

- Simple MVP approach (no complex feature flag service)
- Flags can be per-environment (staging vs. prod)
- Sufficient for controlled rollout

**Flags**:

- `REWARDS_ENABLED=true|false` (global feature toggle)
- `SHOPIFY_ENABLED=true|false` (per-org in future; global for MVP)

---

### Decision 15: i18n Approach

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Follow existing `messages/en.json` and `messages/fr.json` pattern; no new i18n system.  
**Rationale**:

- Consistency with repo
- Repo already has `next-intl` setup
- Bilingual (EN/FR) is non-negotiable requirement

**New Keys**: Add under `rewards` and `recognition` namespaces in message files.

---

### Decision 16: Analytics Event Schema

**Date**: 2026-02-05  
**Status**: ✅ Decided  
**Decision**: Emit structured events to existing `audit_security.audit_logs` table, not a separate analytics DB.  
**Rationale**:

- Reuse existing infrastructure
- Audit logs already have `action`, `resource_type`, `metadata` fields
- Can be exported to analytics warehouse later if needed

**Event Types**: `award_requested`, `award_approved`, `award_issued`, `redemption_initiated`, `redemption_fulfilled`, etc.

---

## Open Questions (To Be Resolved)

### Q1: Credit Expiration

**Question**: Should credits expire after a certain period?  
**Status**: 🤔 Deferred to Phase 8  
**Temporary Decision**: No expiration in MVP. Add `expires_at` column to ledger if needed later.

---

### Q2: Negative Balance Override

**Question**: Can admins issue awards that push a user's balance negative?  
**Status**: 🤔 Deferred  
**Temporary Decision**: Disallow negative balances for MVP. Add admin override flag if needed.

---

### Q3: Multi-Org Shopify Accounts

**Question**: Can one Shopify shop serve multiple orgs, or is it 1:1?  
**Status**: 🤔 Deferred  
**Temporary Decision**: 1:1 mapping (each org has its own `shopify_config`). Can share shop via same domain but different allowed collections.

---

## Deferred Features (Not in MVP)

1. **Leaderboards**: Rank members by credits earned
2. **Badges/Achievements**: Gamification elements
3. **Email Notifications**: Triggered on award issuance/redemption (can use existing email service)
4. **Mobile App**: Web-first, mobile later
5. **Advanced Budget Forecasting**: Predict envelope depletion
6. **Manager Self-Service**: Managers issue awards without admin approval
7. **Peer-to-Peer Recognition**: Members nominate each other
8. **Gift Card Providers**: Stripe, Amazon, etc.

---

## Versioning

This document will be updated as implementation progresses and new decisions are made. Each decision includes a date and status.

**Legend**:

- ✅ Decided: Implemented or ready to implement
- 🤔 Deferred: Not blocking MVP
- ❌ Rejected: Considered but not pursuing
