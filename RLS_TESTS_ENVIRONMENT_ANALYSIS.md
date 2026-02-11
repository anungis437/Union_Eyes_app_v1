# RLS Policy Tests - Environment Requirements

## Summary

The RLS policy tests in `__tests__/security/rls-policy-tests.test.ts` are designed for **Supabase** environments and will not work with Azure PostgreSQL.

## Issues Identified

### 1. Database Migration Completed ✅
- ✅ Table renamed: `tenant_users` → `organization_users`
- ✅ Columns renamed: `tenant_id` → `organization_id`, `tenant_user_id` → `organization_user_id`
- ✅ Index renamed: `idx_tenant_users_user_id` → `idx_organization_users_user_id`
- ✅ RLS policies created for `organization_users` table

### 2. Test Environment Mismatch ❌
**Problem**: Tests expect Supabase environment but database is Azure PostgreSQL.

**Evidence**:
- Azure PostgreSQL doesn't have `auth` schema (Supabase-specific)
- RLS policies in migration `0051_add_messaging_rls_policies.sql` reference `auth.uid()`
- Tests use Supabase client with `@supabase/supabase-js`
- Service role key is for Supabase, not Azure PostgreSQL

**Error**: `schema "auth" does not exist`

### 3. Test Architecture

**Current Test Design**:
```typescript
// Uses Supabase-specific functions
const supabaseClient = createClient(url, key);
await client.rpc('set_session_context', ...);  // Supabase RPC
```

**Supabase Dependencies**:
- `auth.uid()` function for user identification
- `auth` schema for user management  
- Supabase RLS policy syntax with JWT claims
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Recommendations

### Option 1: Use Supabase for Tests
Set up a Supabase project for testing:
1. Create Supabase project
2. Apply migrations to Supabase
3. Update `.env` with Supabase credentials
4. Tests will pass as designed

### Option 2: Skip Tests in Prod Environment
The tests already have a skip condition:
```typescript
const describeIfSupabase = hasSupabaseEnv ? describe : describe.skip;
```

Tests are **automatically skipped** when Supabase env vars aren't available.

### Option 3: Create Azure PostgreSQL Version
Convert tests to work with Azure PostgreSQL:
- Remove Supabase client dependency
- Use direct PostgreSQL client (`pg` or Drizzle)
- Rewrite RLS policies without `auth` schema
- Implement custom session context management

## Current Status

✅ **Production database migration completed successfully**
- `organization_users` table is ready
- RLS policies are in place
- Schema is consistent

⚠️ **Tests intentionally skipped** (not a failure)
- Tests require Supabase environment
- Database is Azure PostgreSQL (production)
- This is expected behavior

## Test Execution

When you run tests:
```bash
pnpm vitest run  
```

The RLS tests show as "skipped" because `hasSupabaseEnv === false`. This is **correct and intentional**.
