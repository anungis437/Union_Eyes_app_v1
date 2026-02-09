# Recognition & Rewards - RLS Strategy

## Row-Level Security (RLS) Overview

Following the existing pattern from `053_enable_rls_policies.sql`, all recognition and reward tables will have RLS enabled with policies enforcing organization-scoped access.

## Helper Functions (Reuse Existing)

```sql
-- Already defined in 053_enable_rls_policies.sql
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS text AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub'),
    current_setting('app.current_user_id', true)
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS uuid AS $$
  SELECT current_setting('app.current_tenant_id', true)::uuid;
$$ LANGUAGE SQL STABLE;
```

**Note**: The repo uses custom JWT claims, NOT Supabase auth schema. User context is passed via `request.jwt.claims` or `app.current_user_id` session variable.

---

## Table-by-Table RLS Policies

### `recognition_programs`

**Enable RLS**:

```sql
ALTER TABLE public.recognition_programs ENABLE ROW LEVEL SECURITY;
```

**Policy**: Organization isolation

```sql
CREATE POLICY "recognition_programs_org_isolation" 
ON public.recognition_programs
FOR ALL 
USING (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
  )
);
```

**Rationale**: Users can only access programs in organizations they belong to.

---

### `recognition_award_types`

**Enable RLS**:

```sql
ALTER TABLE public.recognition_award_types ENABLE ROW LEVEL SECURITY;
```

**Policy**: Organization isolation via program relationship

```sql
CREATE POLICY "recognition_award_types_org_isolation" 
ON public.recognition_award_types
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.recognition_programs rp
    WHERE rp.id = recognition_award_types.program_id
      AND rp.org_id::text IN (
        SELECT organization_id 
        FROM public.organization_members
        WHERE user_id = get_current_user_id()
      )
  )
);
```

**Rationale**: Award types inherit org access from their parent program.

---

### `recognition_awards`

**Enable RLS**:

```sql
ALTER TABLE public.recognition_awards ENABLE ROW LEVEL SECURITY;
```

**Policies**:

**1. Members can read their own awards**:

```sql
CREATE POLICY "recognition_awards_read_own" 
ON public.recognition_awards
FOR SELECT 
USING (
  recipient_user_id = get_current_user_id()
  AND org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
  )
);
```

**2. Admins can read all awards in their org**:

```sql
CREATE POLICY "recognition_awards_admin_read" 
ON public.recognition_awards
FOR SELECT 
USING (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner') -- Adjust roles based on repo conventions
  )
);
```

**3. Admins can insert/update awards**:

```sql
CREATE POLICY "recognition_awards_admin_write" 
ON public.recognition_awards
FOR INSERT 
WITH CHECK (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "recognition_awards_admin_update" 
ON public.recognition_awards
FOR UPDATE 
USING (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner')
  )
);
```

**Rationale**: Members have read-only access to their awards; admins have full control within their org.

---

### `reward_wallet_ledger`

**Enable RLS**:

```sql
ALTER TABLE public.reward_wallet_ledger ENABLE ROW LEVEL SECURITY;
```

**Policies**:

**1. Users can read their own ledger**:

```sql
CREATE POLICY "reward_wallet_ledger_read_own" 
ON public.reward_wallet_ledger
FOR SELECT 
USING (
  user_id = get_current_user_id()
  AND org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
  )
);
```

**2. Admins can read all ledger entries in their org**:

```sql
CREATE POLICY "reward_wallet_ledger_admin_read" 
ON public.reward_wallet_ledger
FOR SELECT 
USING (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner')
  )
);
```

**3. Service role can insert (bypass RLS)**:

```sql
-- No explicit INSERT policy; service layer uses service role credentials
-- Grant INSERT to service role user (configured at deployment)
```

**Rationale**: Ledger is append-only. Members read their own data; admins read org-wide for auditing. Writes happen via service layer with elevated privileges.

---

### `reward_budget_envelopes`

**Enable RLS**:

```sql
ALTER TABLE public.reward_budget_envelopes ENABLE ROW LEVEL SECURITY;
```

**Policy**: Admin-only access within org

```sql
CREATE POLICY "reward_budget_envelopes_admin" 
ON public.reward_budget_envelopes
FOR ALL 
USING (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner')
  )
);
```

**Rationale**: Budget management is strictly an admin function.

---

### `reward_redemptions`

**Enable RLS**:

```sql
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
```

**Policies**:

**1. Users can read their own redemptions**:

```sql
CREATE POLICY "reward_redemptions_read_own" 
ON public.reward_redemptions
FOR SELECT 
USING (
  user_id = get_current_user_id()
  AND org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
  )
);
```

**2. Users can insert their own redemptions**:

```sql
CREATE POLICY "reward_redemptions_insert_own" 
ON public.reward_redemptions
FOR INSERT 
WITH CHECK (
  user_id = get_current_user_id()
  AND org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
  )
);
```

**3. Admins can read all redemptions in org**:

```sql
CREATE POLICY "reward_redemptions_admin_read" 
ON public.reward_redemptions
FOR SELECT 
USING (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner')
  )
);
```

**4. Service role can update (webhook processing)**:

```sql
-- Webhooks bypass RLS via service role
-- Grant UPDATE to service role user
```

**Rationale**: Members initiate and track their own redemptions; admins oversee org-wide; webhooks update status via elevated privileges.

---

### `shopify_config`

**Enable RLS**:

```sql
ALTER TABLE public.shopify_config ENABLE ROW LEVEL SECURITY;
```

**Policy**: Admin-only access

```sql
CREATE POLICY "shopify_config_admin" 
ON public.shopify_config
FOR ALL 
USING (
  org_id::text IN (
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner')
  )
);
```

**Rationale**: Shopify integration settings are sensitive and admin-only.

---

### `webhook_receipts`

**Enable RLS**:

```sql
ALTER TABLE public.webhook_receipts ENABLE ROW LEVEL SECURITY;
```

**Policy**: No user-level access (service role only)

```sql
-- No policies; all access via service role
-- Optionally, allow admins to read for debugging:
CREATE POLICY "webhook_receipts_admin_read" 
ON public.webhook_receipts
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE user_id = get_current_user_id()
      AND role IN ('admin', 'owner')
  )
);
```

**Rationale**: Webhook receipts are internal infrastructure. Admins may read for audit purposes.

---

## Service Role Configuration

### Service Role Setup

For operations that bypass RLS (e.g., webhook processing, ledger writes):

1. **Create Service Role User** (if not exists):

   ```sql
   CREATE ROLE service_role WITH LOGIN PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE union_eyes TO service_role;
   ```

2. **Grant Table Permissions**:

   ```sql
   GRANT SELECT, INSERT, UPDATE ON public.reward_wallet_ledger TO service_role;
   GRANT SELECT, UPDATE ON public.reward_redemptions TO service_role;
   GRANT SELECT, INSERT ON public.webhook_receipts TO service_role;
   ```

3. **Bypass RLS**:

   ```sql
   ALTER TABLE public.reward_wallet_ledger FORCE ROW LEVEL SECURITY;
   ALTER TABLE public.reward_redemptions FORCE ROW LEVEL SECURITY;
   ALTER TABLE public.webhook_receipts FORCE ROW LEVEL SECURITY;
   
   -- Service role explicitly bypasses RLS
   GRANT BYPASSRLS ON public.reward_wallet_ledger TO service_role;
   GRANT BYPASSRLS ON public.reward_redemptions TO service_role;
   GRANT BYPASSRLS ON public.webhook_receipts TO service_role;
   ```

### Application Code Usage

```typescript
// User-scoped queries (RLS enforced)
const userDb = drizzle(pool); // Uses user connection pool

// Service-scoped queries (RLS bypassed)
const serviceDb = drizzle(servicePool, {
  connection: process.env.DATABASE_SERVICE_URL // service_role credentials
});
```

---

## Testing RLS Policies

### Manual Testing

```sql
-- Set user context
SET app.current_user_id = 'user_2abc123xyz';

-- Test member wallet query
SELECT * FROM reward_wallet_ledger WHERE user_id = 'user_2abc123xyz';
-- Should return rows

SELECT * FROM reward_wallet_ledger WHERE user_id = 'user_other';
-- Should return 0 rows (isolation enforced)

-- Reset context
RESET app.current_user_id;
```

### Automated Testing

Add integration tests in `__tests__/rls-rewards.test.ts`:

- Verify members can only see own wallet
- Verify admins can see org-wide data
- Verify cross-org isolation (users in org A cannot see org B data)
- Verify service role can bypass RLS for ledger writes

---

## Migration Checklist

- [ ] Enable RLS on all tables
- [ ] Create RLS policies for each table
- [ ] Configure service role user and permissions
- [ ] Grant BYPASSRLS to service role where needed
- [ ] Test policies with different user roles
- [ ] Document service role credentials in deployment guide
- [ ] Add RLS tests to CI/CD pipeline

---

## Security Considerations

1. **User Context**: Ensure middleware sets `app.current_user_id` and `app.current_tenant_id` correctly (reuse existing patterns).
2. **Service Role Secrets**: Store service role credentials in Azure Key Vault, never in codebase.
3. **Audit Logging**: Log all RLS policy violations (can use PostgreSQL `log_statement` for admin debugging).
4. **Defense in Depth**: RLS is a last line of defense; always validate org/user context in application code too.
5. **Performance**: RLS policies add query overhead; use indexes on `org_id` and `user_id` columns (already planned in data model).

---

## Role Mapping (Clerk → RLS)

| Clerk Organization Role | RLS Access Level | Notes |
|--------------------------|------------------|-------|
| `admin` | Full org access | Can manage programs, budgets, awards |
| `owner` | Full org access | Same as admin |
| `member` | User-scoped only | Can view own wallet, initiate redemptions |
| Service Role | Bypass RLS | Used for webhooks, ledger writes |

**Implementation**: Check user role in middleware or server actions before calling DB. RLS provides additional security layer.
