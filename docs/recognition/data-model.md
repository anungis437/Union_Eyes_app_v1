# Recognition & Rewards - Data Model

## Database Schema

### Table: `recognition_programs`
Container for recognition initiatives within an organization.

```typescript
{
  id: uuid (PK)
  org_id: uuid (FK → organizations.id) [indexed]
  name: string(255)
  description: text?
  status: enum('draft', 'active', 'archived')
  currency: string(3) [default: 'CAD']
  created_at: timestamp
  updated_at: timestamp
}
```

**RLS Policy**: User must be member of `org_id`

---

### Table: `recognition_award_types`
Templates for different types of recognition.

```typescript
{
  id: uuid (PK)
  org_id: uuid (FK → organizations.id) [indexed]
  program_id: uuid (FK → recognition_programs.id) [indexed]
  name: string(255)
  kind: enum('milestone', 'peer', 'admin', 'automated')
  default_credit_amount: integer
  requires_approval: boolean [default: false]
  rules_json: jsonb? // Future: eligibility criteria, auto-trigger conditions
  created_at: timestamp
  updated_at: timestamp
}
```

**RLS Policy**: User must be member of `org_id`

---

### Table: `recognition_awards`
Individual award instances (requests, approvals, issuances).

```typescript
{
  id: uuid (PK)
  org_id: uuid (FK → organizations.id) [indexed]
  program_id: uuid (FK → recognition_programs.id) [indexed]
  award_type_id: uuid (FK → recognition_award_types.id)
  recipient_user_id: string(255) // Clerk user ID [indexed]
  issuer_user_id: string(255)? // Clerk user ID (nullable for automated)
  reason: text
  status: enum('pending', 'approved', 'issued', 'rejected', 'revoked')
  approved_by_user_id: string(255)?
  approved_at: timestamp?
  issued_at: timestamp?
  metadata_json: jsonb? // Extensible data (e.g., milestone details)
  created_at: timestamp
  updated_at: timestamp
}
```

**RLS Policy**: 
- Members can read awards where `recipient_user_id = current_user_id`
- Admins can read all awards within `org_id`
- Insert/update restricted to admins

---

### Table: `reward_wallet_ledger`
Append-only ledger for all credit transactions.

```typescript
{
  id: uuid (PK)
  org_id: uuid (FK → organizations.id) [indexed]
  user_id: string(255) // Clerk user ID [indexed]
  event_type: enum('earn', 'spend', 'expire', 'revoke', 'adjust', 'refund')
  amount_credits: integer // Can be negative for spends/revokes
  balance_after: integer // Denormalized running balance
  source_type: enum('award', 'redemption', 'admin_adjustment', 'system')
  source_id: uuid? // FK to recognition_awards or reward_redemptions
  memo: text?
  created_at: timestamp [default: now()]
}
```

**RLS Policy**:
- Users can read only their own ledger (`user_id = current_user_id`)
- Admins can read all ledger entries within `org_id`
- Insert via service layer only (no direct INSERT grants)

**Index**: `(org_id, user_id, created_at DESC)` for fast balance lookups

---

### Table: `reward_budget_envelopes`
Time-bound credit pools for controlling recognition spending.

```typescript
{
  id: uuid (PK)
  org_id: uuid (FK → organizations.id) [indexed]
  program_id: uuid (FK → recognition_programs.id) [indexed]
  name: string(255)
  scope_type: enum('org', 'local', 'department', 'manager')
  scope_ref_id: string(255)? // Future: references departments, managers, etc.
  period: enum('monthly', 'quarterly', 'annual')
  amount_limit: integer // Total credits available
  amount_used: integer [default: 0] // Denormalized usage
  starts_at: timestamp
  ends_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

**RLS Policy**: User must be member of `org_id` (admin-only access for CRUD)

**Check Constraint**: `amount_used <= amount_limit`

---

### Table: `reward_redemptions`
Tracks member redemption requests and Shopify order lifecycle.

```typescript
{
  id: uuid (PK)
  org_id: uuid (FK → organizations.id) [indexed]
  user_id: string(255) // Clerk user ID [indexed]
  program_id: uuid (FK → recognition_programs.id)
  credits_spent: integer
  status: enum('initiated', 'pending_payment', 'ordered', 'fulfilled', 'cancelled', 'refunded')
  provider: enum('shopify') // Future: 'amazon', 'custom', etc.
  provider_order_id: string(255)? [indexed]
  provider_checkout_id: string(255)?
  provider_payload_json: jsonb? // Full webhook payloads for audit
  created_at: timestamp
  updated_at: timestamp
}
```

**RLS Policy**:
- Users can read only their own redemptions (`user_id = current_user_id`)
- Admins can read all redemptions within `org_id`

---

### Table: `shopify_config`
Per-organization Shopify integration settings.

```typescript
{
  org_id: uuid (PK, FK → organizations.id)
  shop_domain: string(255) // e.g., 'shop-moi-ca.myshopify.com'
  storefront_token_secret_ref: string(255) // Reference to env var or Key Vault
  admin_token_secret_ref: string(255)?
  allowed_collections: jsonb // Array of collection IDs/handles
  webhook_secret_ref: string(255)
  created_at: timestamp
  updated_at: timestamp
}
```

**RLS Policy**: Admin-only access within `org_id`

**Security Note**: Never store raw tokens in DB. Use references to secrets in Azure Key Vault or env vars like `SHOPIFY_TOKEN_ORG_{org_id}`.

---

### Table: `webhook_receipts`
Idempotency tracking for external webhooks (Shopify, etc.).

```typescript
{
  id: uuid (PK)
  provider: enum('shopify')
  webhook_id: string(255) [unique] // Shopify's X-Shopify-Webhook-Id header
  event_type: string(100) // 'orders/paid', 'orders/fulfilled', 'refunds/create'
  payload_json: jsonb
  processed_at: timestamp [default: now()]
  created_at: timestamp [default: now()]
}
```

**Index**: `(provider, webhook_id)` for fast duplicate detection

**RLS**: Service role only (no user-level access)

---

## Relationships

```
organizations (existing)
  ↓ 1:N
recognition_programs
  ↓ 1:N
recognition_award_types
  ↓ 1:N
recognition_awards → reward_wallet_ledger (source_id)
                  → reward_budget_envelopes (affects amount_used)

organization_members (existing)
  ↓ 1:N
reward_wallet_ledger (user_id)
  ↑ N:1
reward_redemptions → reward_wallet_ledger (source_id)

organizations
  ↓ 1:1
shopify_config
```

---

## Denormalization Strategy

### Wallet Balance
- **Calculated field**: `balance_after` in `reward_wallet_ledger`
- **Rationale**: Avoid SUM() queries on every wallet view
- **Consistency**: Updated transactionally with each ledger entry

### Budget Usage
- **Calculated field**: `amount_used` in `reward_budget_envelopes`
- **Rationale**: Fast budget checks without aggregating ledger
- **Consistency**: Incremented on award issuance, decremented on revocation/refund

---

## Migration Strategy

1. Create all tables in single migration file
2. Enable RLS on all tables
3. Create RLS policies using existing helper functions
4. Add indexes for common query patterns
5. Create check constraints for data integrity
6. Seed default programs/award types (optional, per organization)

---

## Data Integrity Rules

1. **Ledger Immutability**: No UPDATE or DELETE on `reward_wallet_ledger` (append-only)
2. **Balance Non-Negative**: Service layer enforces `balance_after >= 0` (except admin overrides)
3. **Budget Limits**: Check envelope availability before issuing awards
4. **Award Status Flow**: `pending → approved → issued` (or `rejected`)
5. **Redemption Status Flow**: `initiated → pending_payment → ordered → fulfilled` (or `cancelled`/`refunded`)

---

## Query Patterns

### Get User Wallet Balance
```sql
SELECT balance_after
FROM reward_wallet_ledger
WHERE org_id = $1 AND user_id = $2
ORDER BY created_at DESC
LIMIT 1;
```

### List User Ledger Entries (Paginated)
```sql
SELECT *
FROM reward_wallet_ledger
WHERE org_id = $1 AND user_id = $2
ORDER BY created_at DESC
LIMIT 20 OFFSET $3;
```

### Check Budget Availability
```sql
SELECT (amount_limit - amount_used) AS available
FROM reward_budget_envelopes
WHERE org_id = $1 
  AND program_id = $2
  AND NOW() BETWEEN starts_at AND ends_at
  AND scope_type = $3;
```

### Pending Awards for Approval
```sql
SELECT a.*, at.name AS award_type_name, u.name AS recipient_name
FROM recognition_awards a
JOIN recognition_award_types at ON a.award_type_id = at.id
JOIN users u ON a.recipient_user_id = u.user_id
WHERE a.org_id = $1 AND a.status = 'pending'
ORDER BY a.created_at ASC;
```
