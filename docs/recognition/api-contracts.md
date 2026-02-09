# Recognition & Rewards - API Contracts

## Internal API Endpoints

### Admin Routes

#### `POST /api/recognition/programs`

Create a new recognition program.

**Auth**: Admin role required  
**Request**:

```typescript
{
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  currency?: string; // Default: 'CAD'
}
```

**Response**:

```typescript
{
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  currency: string;
  created_at: string;
  updated_at: string;
}
```

---

#### `POST /api/recognition/award-types`

Create a new award type template.

**Auth**: Admin role required  
**Request**:

```typescript
{
  program_id: string;
  name: string;
  kind: 'milestone' | 'peer' | 'admin' | 'automated';
  default_credit_amount: number;
  requires_approval: boolean;
  rules_json?: Record<string, any>;
}
```

**Response**: Award type object

---

#### `POST /api/recognition/awards`

Create a new award request.

**Auth**: Admin or designated issuer  
**Request**:

```typescript
{
  program_id: string;
  award_type_id: string;
  recipient_user_id: string; // Clerk user ID
  reason: string;
  metadata_json?: Record<string, any>;
}
```

**Response**: Award object with `status: 'pending'` or `'approved'` (if auto-approve)

---

#### `POST /api/recognition/awards/:id/approve`

Approve a pending award.

**Auth**: Admin role required  
**Response**: Updated award with `status: 'approved'`

---

#### `POST /api/recognition/awards/:id/issue`

Issue an approved award (writes to wallet ledger).

**Auth**: Admin role required  
**Response**:

```typescript
{
  award: AwardObject;
  ledger_entry: LedgerObject;
  new_balance: number;
}
```

---

#### `POST /api/recognition/awards/:id/revoke`

Revoke an issued award (negative ledger entry).

**Auth**: Admin role required  
**Request**:

```typescript
{
  reason: string;
}
```

**Response**: Updated award + ledger entry

---

#### `POST /api/rewards/budgets`

Create a budget envelope.

**Auth**: Admin role required  
**Request**:

```typescript
{
  program_id: string;
  name: string;
  scope_type: 'org' | 'local' | 'department' | 'manager';
  scope_ref_id?: string;
  period: 'monthly' | 'quarterly' | 'annual';
  amount_limit: number;
  starts_at: string; // ISO 8601
  ends_at: string; // ISO 8601
}
```

**Response**: Budget envelope object

---

#### `GET /api/rewards/reports/summary`

Get organization-wide recognition and redemption summary.

**Auth**: Admin role required  
**Query Params**:

- `start_date`: ISO 8601
- `end_date`: ISO 8601
- `program_id?`: Filter by program

**Response**:

```typescript
{
  total_credits_issued: number;
  total_credits_redeemed: number;
  total_credits_outstanding: number;
  active_members: number;
  awards_issued: number;
  redemptions_completed: number;
  budget_usage: {
    envelope_id: string;
    envelope_name: string;
    used: number;
    limit: number;
    percentage: number;
  }[];
}
```

---

### Member Routes

#### `GET /api/rewards/wallet`

Get current user's wallet balance and recent ledger entries.

**Auth**: Authenticated user  
**Query Params**:

- `limit?`: Number of ledger entries (default: 20)
- `offset?`: Pagination offset

**Response**:

```typescript
{
  balance: number;
  expiring_soon: number; // Future enhancement
  ledger: {
    id: string;
    event_type: string;
    amount_credits: number;
    balance_after: number;
    source_type: string;
    source_id: string | null;
    memo: string | null;
    created_at: string;
  }[];
  total_count: number;
}
```

---

#### `POST /api/rewards/redemptions/initiate`

Initiate a redemption request.

**Auth**: Authenticated user  
**Request**:

```typescript
{
  program_id: string;
  credits_to_spend: number;
  provider_details?: {
    collection_id?: string; // Shopify collection
    product_ids?: string[]; // Future: pre-selected products
  };
}
```

**Response**:

```typescript
{
  redemption_id: string;
  checkout_url?: string; // If Shopify enabled
  status: 'initiated' | 'pending_payment';
  credits_spent: number;
  new_balance: number;
}
```

**Errors**:

- `400`: Insufficient balance
- `400`: Invalid program or disabled Shopify integration
- `422`: Budget constraints violated

---

#### `GET /api/rewards/redemptions`

Get current user's redemption history.

**Auth**: Authenticated user  
**Query Params**:

- `limit?`: Default 20
- `offset?`: Pagination

**Response**:

```typescript
{
  redemptions: {
    id: string;
    credits_spent: number;
    status: string;
    provider: string;
    provider_order_id: string | null;
    created_at: string;
    updated_at: string;
  }[];
  total_count: number;
}
```

---

## Shopify Integration

### Outbound (Union Eyes → Shopify)

#### Storefront API: Fetch Curated Collections

**Endpoint**: `https://{shop_domain}/api/2024-01/graphql.json`  
**Auth**: `X-Shopify-Storefront-Access-Token: {storefront_token}`

**GraphQL Query**:

```graphql
query GetCuratedCollections($handles: [String!]!) {
  collections(first: 10, query: "handle IN [\"{handles}\"]") {
    edges {
      node {
        id
        handle
        title
        description
        image {
          url
          altText
        }
        products(first: 20) {
          edges {
            node {
              id
              handle
              title
              description
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Union Eyes Mapping**:

- `shopify_config.allowed_collections` → filter collections by handle/ID
- Display products with credit conversion (1 credit = $1 CAD)

---

#### Admin API: Create Discount Code (Checkout Method)

**Endpoint**: `POST https://{shop_domain}/admin/api/2024-01/price_rules.json`  
**Auth**: `X-Shopify-Access-Token: {admin_token}`

**Request**:

```json
{
  "price_rule": {
    "title": "UnionEyes_Redemption_{redemption_id}",
    "target_type": "line_item",
    "target_selection": "all",
    "allocation_method": "across",
    "value_type": "fixed_amount",
    "value": "-{credits_spent}.00",
    "customer_selection": "all",
    "once_per_customer": true,
    "usage_limit": 1,
    "starts_at": "2024-01-01T00:00:00Z"
  }
}
```

**Then Create Discount Code**:

```json
{
  "discount_code": {
    "code": "UE{redemption_id}",
    "price_rule_id": "{price_rule_id}"
  }
}
```

**Checkout URL**:
`https://{shop_domain}/discount/UE{redemption_id}`

---

### Inbound (Shopify → Union Eyes)

#### Webhook: `POST /api/integrations/shopify/webhooks/orders_paid`

**Headers**:

- `X-Shopify-Hmac-Sha256`: HMAC signature
- `X-Shopify-Topic`: `orders/paid`
- `X-Shopify-Shop-Domain`: `shop-moi-ca.myshopify.com`
- `X-Shopify-Webhook-Id`: Unique ID for idempotency

**Payload** (simplified):

```json
{
  "id": 123456789,
  "order_number": 1234,
  "email": "member@union.org",
  "total_price": "50.00",
  "discount_codes": [
    {
      "code": "UE{redemption_id}",
      "amount": "25.00"
    }
  ],
  "line_items": [...],
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Processing Logic**:

1. Verify HMAC signature
2. Check idempotency (`webhook_receipts.webhook_id`)
3. Extract `redemption_id` from discount code
4. Update `reward_redemptions.status = 'ordered'`
5. Store `provider_order_id = order.id`
6. Store full payload in `provider_payload_json`
7. Send notification to user

---

#### Webhook: `POST /api/integrations/shopify/webhooks/orders_fulfilled`

**Headers**: Same as above  
**Topic**: `orders/fulfilled`

**Processing Logic**:

1. Verify + idempotency check
2. Update `reward_redemptions.status = 'fulfilled'`
3. Emit analytics event

---

#### Webhook: `POST /api/integrations/shopify/webhooks/refunds_create`

**Headers**: Same as above  
**Topic**: `refunds/create`

**Payload**:

```json
{
  "id": 987654321,
  "order_id": 123456789,
  "refund_line_items": [...],
  "transactions": [
    {
      "amount": "25.00",
      "kind": "refund"
    }
  ]
}
```

**Processing Logic**:

1. Verify + idempotency
2. Find `reward_redemptions` by `provider_order_id`
3. Update status to `'refunded'`
4. **Refund credits to wallet**: Create ledger entry (`event_type: 'refund'`, `amount_credits: +credits_spent`)
5. Emit analytics event
6. Notify user

---

## Security

### HMAC Signature Verification (Shopify)

**Algorithm**: SHA256  
**Secret**: From `shopify_config.webhook_secret_ref`

**Verification**:

```typescript
import crypto from 'crypto';

function verifyShopifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}
```

---

### Idempotency

**Key**: `X-Shopify-Webhook-Id`  
**Storage**: `webhook_receipts` table  
**Check**:

```typescript
const existing = await db.query.webhookReceipts.findFirst({
  where: eq(webhookReceipts.webhookId, webhookId)
});

if (existing) {
  return NextResponse.json({ status: 'already_processed' }, { status: 200 });
}
```

---

## Rate Limiting

- `/api/rewards/redemptions/initiate`: 5 requests/minute per user (Upstash Redis)
- Admin endpoints: 30 requests/minute per org
- Webhook endpoints: No rate limit (trusted source after HMAC verification)

---

## Error Handling

### Standard Error Response

```typescript
{
  error: string; // Human-readable message
  code: string; // Machine-readable error code
  details?: any; // Optional context
}
```

### Common Error Codes

- `INSUFFICIENT_BALANCE`: User doesn't have enough credits
- `BUDGET_EXCEEDED`: Budget envelope exhausted
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource doesn't exist
- `INVALID_INPUT`: Validation failed
- `SHOPIFY_ERROR`: External provider error
- `WEBHOOK_VERIFICATION_FAILED`: HMAC mismatch
