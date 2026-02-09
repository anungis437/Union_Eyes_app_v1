# Recognition & Rewards System - Overview

## Purpose

Enable unions to run comprehensive member/employee recognition programs where credits are earned in Union Eyes and redeemed via Shop Moi Ça (Shopify). Union Eyes owns identity, governance, budgets, auditing, and ledger; Shop Moi Ça owns commerce fulfillment.

## Architecture Decisions

### Technology Stack

- **Database**: PostgreSQL (Azure Citus) with Drizzle ORM
- **Auth**: Clerk with custom organization membership model
- **Security**: Row-Level Security (RLS) enforced at database level
- **Commerce**: Shopify Storefront API + Admin API (Shop Moi Ça)
- **Payments**: Credits-based system (no direct money exchange in redemptions)
- **Audit**: Existing `audit_security.audit_logs` schema

### Core Principles

1. **Org-Scoped Data**: All recognition and reward data is isolated by `org_id`
2. **Append-Only Ledger**: Wallet transactions are immutable for audit integrity
3. **Transactional Integrity**: Award issuance + ledger + budget updates are atomic
4. **Idempotency**: All webhooks and critical operations use idempotency keys
5. **Least Privilege**: Members see only their wallet; admins see org-wide data
6. **Provider Abstraction**: Shopify is the first provider, but architecture allows others

### Key Components

#### Recognition Engine

- **Programs**: Container for award types and budget envelopes
- **Award Types**: Templates for recognition (milestone, peer, admin, automated)
- **Awards**: Individual recognition instances with approval workflows
- **Wallet Ledger**: Append-only log of all credit transactions

#### Budget System

- **Envelopes**: Time-bound credit pools with scope (org, department, manager)
- **Usage Tracking**: Real-time budget consumption with denormalized totals
- **Enforcement**: Pre-flight checks before issuing awards or processing redemptions

#### Redemption Flow

- **Initiation**: Member requests redemption, credits deducted immediately
- **Checkout**: Shopify checkout created with discount equivalent to credits
- **Fulfillment**: Webhook updates redemption status, triggers notifications
- **Refunds**: Webhook returns credits to wallet, updates ledger

### Security Model

#### Row-Level Security (RLS)

Following existing patterns from `053_enable_rls_policies.sql`:

- Helper functions: `get_current_user_id()`, `get_current_tenant_id()` (reuse existing)
- Policies enforce `org_id` matching for all recognition tables
- Wallet ledger: users see only their own transactions (members), admins see all within org
- Service role bypasses RLS for webhook processing

#### Secrets Management

- Shopify tokens stored as **secret references** in `shopify_config` table
- Actual tokens in environment variables or Azure Key Vault (existing pattern)
- Webhook secrets verified via HMAC signature validation
- Never log sensitive data

#### Input Validation

- Zod schemas for all API endpoints and server actions
- Role-based access control using Clerk organization roles
- Rate limiting on redemption endpoints (existing Upstash Redis)

### Data Retention & Compliance

- Ledger entries are permanent (append-only)
- Award records retain full history (soft delete pattern for programs/types)
- Audit logs capture all administrative actions
- GDPR considerations: member data erasure requires special handling (future enhancement)

## Non-Goals (MVP)

- Multi-currency support (CAD only)
- Real-time balance calculations (use denormalized `balance_after`)
- Advanced budget forecasting (simple usage tracking only)
- Gamification features (leaderboards, badges, etc.)
- Mobile app integration (web-first)
- Complex approval workflows (single approver only)

## Future Enhancements

- Credit expiration policies
- Tiered reward catalogs
- Points-to-cash conversion
- Integration with payroll systems
- Advanced analytics (member engagement scoring)
- Gift card providers beyond Shopify

## Implementation Status

- **Phase 0**: ✅ Discovery & alignment (this document)
- **Phase 1**: 🚧 Data model + RLS + migrations
- **Phase 2**: ⏳ Services layer
- **Phase 3**: ⏳ API routes & server actions
- **Phase 4**: ⏳ UI implementation
- **Phase 5**: ⏳ Shopify integration
- **Phase 6**: ⏳ Analytics primitives
- **Phase 7**: ⏳ Tests & hardening

## References

- Shopify Storefront API: <https://shopify.dev/docs/api/storefront>
- Shopify Webhooks: <https://shopify.dev/docs/api/admin-rest/webhooks>
- Drizzle ORM: <https://orm.drizzle.team/docs/overview>
- Clerk Organizations: <https://clerk.com/docs/organizations>
