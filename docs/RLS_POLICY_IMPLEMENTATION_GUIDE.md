# RLS Policy Implementation Guide

## Overview
This document describes the Row-Level Security (RLS) policies implemented for the Union Eyes application messaging and notification systems.

## Migration Status

### ✅ Completed
- **Migration 0071**: `update_messaging_rls_for_session_context.sql`
  - Location: `db/migrations/0071_update_messaging_rls_for_session_context.sql`
  - Status: Created, ready to apply
  - Purpose: Convert RLS policies from Supabase `auth.uid()` to PostgreSQL session context

### 📝 Application Method
The migration must be applied using one of these methods:

1. **Via Drizzle Kit** (Recommended):
   ```bash
   pnpm db:migrate
   ```

2. **Via Direct SQL Execution** (if connection allowed):
   ```bash
   psql -h <host> -U <user> -d <database> -f db/migrations/0071_update_messaging_rls_for_session_context.sql
   ```

3. **Via Application Code** (for production):
   - Create a one-time migration script
   - Use the existing `db` connection from `@/db/db`
   - Execute the migration SQL

## Architecture Change

### Before (Supabase-based)
- RLS policies used `auth.uid()` function
- Worked with Supabase authentication system
- Tests queried empty Supabase database

### After (Azure PostgreSQL-based)
- RLS policies use PostgreSQL session variables
- Session context set via `set_config()` function
- Tests query Azure PostgreSQL (production database)
- Tests use Drizzle ORM (same as production code)

## Session Context Variables

The RLS policies check three session variables:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `app.current_user_id` | TEXT | Clerk user ID | `user_2abc123def456` |
| `app.current_tenant_id` | UUID | Tenant/Organization ID | `uuid` |
| `app.current_organization_id` | UUID | User's org within tenant | `uuid` |

### Setting Session Context (Test Environment)
```typescript
await db.execute(sql`
  SELECT set_config('app.current_user_id', ${userId}, false),
         set_config('app.current_tenant_id', ${tenantId}, false),
         set_config('app.current_organization_id', ${orgId}, false)
`);
```

### Setting Session Context (Production)
In production, set these variables at the beginning of each request/transaction:
```typescript
// middleware.ts or database client wrapper
export async function setUserContext(userId: string, tenantId: string, orgId: string) {
  await db.execute(sql`
    SELECT set_config('app.current_user_id', ${userId}, false),
           set_config('app.current_tenant_id', ${tenantId}, false),
           set_config('app.current_organization_id', ${orgId}, false)
  `);
}
```

## RLS Policies by Table

### 1. Messages Table
**Purpose**: Protect individual message content

| Policy Name | Operation | Rule |
|-------------|-----------|------|
| `messages_read_participant_access` | SELECT | Can read if participant in thread |
| `messages_create_participant_only` | INSERT | Can create if participant + must be sender |
| `messages_update_own_recent` | UPDATE | Can edit own messages < 15 minutes old |
| `messages_delete_own_recent` | DELETE | Can delete own messages < 1 hour old |

**Key Security Features**:
- ✅ Prevents reading messages from threads user isn't part of
- ✅ Prevents impersonation (sender_id must match session user)
- ✅ Time-based edit window (15 minutes)
- ✅ Time-based delete window (1 hour)

### 2. Message Threads Table
**Purpose**: Control thread visibility and management

| Policy Name | Operation | Rule |
|-------------|-----------|------|
| `threads_read_participant_access` | SELECT | Can read if participant |
| `threads_create_org_members` | INSERT | Can create in own organization |
| `threads_update_participant` | UPDATE | Can update if participant |
| `threads_delete_participant` | DELETE | Can delete if participant |

**Key Security Features**:
- ✅ Organization-scoped access
- ✅ Only participants can see thread metadata
- ✅ Thread creators and participants can manage threads

### 3. Message Participants Table
**Purpose**: Control who can add/remove participants

| Policy Name | Operation | Rule |
|-------------|-----------|------|
| `participants_read_own` | SELECT | Can see own participation + thread participants |
| `participants_create_same_org` | INSERT | Can add participants to org's threads |
| `participants_update_own` | UPDATE | Can only update own record |
| `participants_delete_self` | DELETE | Can only remove self from threads |

**Key Security Features**:
- ✅ Users can leave threads themselves
- ✅ Users cannot remove others from threads
- ✅ Organization-scoped participant management

### 4. Message Read Receipts Table
**Purpose**: Track message read status with privacy

| Policy Name | Operation | Rule |
|-------------|-----------|------|
| `read_receipts_read_own` | SELECT | Can see own receipts + receipts for own messages |
| `read_receipts_create_own` | INSERT | Can create own read receipts |
| `read_receipts_update_own` | UPDATE | Can update own read receipts |

**Key Security Features**:
- ✅ Privacy: Users only see their own read receipts
- ✅ Senders can see who read their messages
- ✅ Cannot spoof read receipts for others

### 5. Message Notifications Table
**Purpose**: Isolate notification access by user

| Policy Name | Operation | Rule |
|-------------|-----------|------|
| `message_notifications_read_own` | SELECT | Can only see own notifications |
| `message_notifications_create_system` | INSERT | System can create any notification |
| `message_notifications_update_own` | UPDATE | Can mark own notifications as read |
| `message_notifications_delete_own` | DELETE | Can delete own notifications |

**Key Security Features**:
- ✅ Complete notification isolation by user
- ✅ Users can manage (read/delete) own notifications
- ✅ System has permission to create notifications for any user

### 6. In-App Notifications Table
**Purpose**: General notification system with user isolation

| Policy Name | Operation | Rule |
|-------------|-----------|------|
| *(Being created in migration 0071)* | SELECT | Can only see own notifications |
| *(Being created in migration 0071)* | UPDATE | Can update own notifications |
| *(Being created in migration 0071)* | DELETE | Can delete own notifications |

**Key Security Features**:
- ✅ User isolation (userId-based)
- ✅ Self-service notification management
- ✅ GDPR compliance (right to erasure)

## Test Coverage

### Test File
- Location: `__tests__/security/rls-policy-tests.test.ts`
- Framework: Vitest
- Database: Azure PostgreSQL via Drizzle ORM

### Test Suite Summary
```
📊 Security Test Suite Summary:
✅ Total Test Cases: 26
✅ Messages System: 6 tests
✅ Notifications: 3 tests
✅ Documents: 3 tests
✅ Reports: 5 tests
✅ Calendars: 5 tests
✅ Performance: 2 tests
✅ Compliance: 2 tests
```

### Test Conversion Status
| Component | Status | Notes |
|-----------|--------|-------|
| Message Tests | ✅ Converted | 6 tests using Drizzle ORM |
| Notification Tests | ✅ Converted | 3 tests using Drizzle ORM |
| Document Tests | ⚠️ Partial | Schema-only (no INSERT) |
| Report Tests | ⚠️ Partial | Schema-only (no INSERT) |
| Calendar Tests | ⚠️ Partial | Schema-only (no INSERT) |
| Performance Tests | ✅ Converted | 2 timing tests |
| Compliance Tests | ✅ Converted | 2 GDPR tests |

### Running Tests
```bash
# Run all RLS tests
pnpm vitest run __tests__/security/rls-policy-tests.test.ts

# Run with verbose output
pnpm vitest run __tests__/security/rls-policy-tests.test.ts --reporter=verbose

# Run in watch mode
pnpm vitest watch __tests__/security/rls-policy-tests.test.ts
```

## Implementation Checklist

### Phase 1: Apply Migration ✅
- [x] Create migration file (0071)
- [ ] Review migration SQL
- [ ] Apply to staging database
- [ ] Verify RLS enabled on all tables
- [ ] Test sample queries

### Phase 2: Update Application Code 🔄
- [ ] Add session context middleware
- [ ] Set context variables on each request
- [ ] Update database client wrapper
- [ ] Test with real authentication

### Phase 3: Verify Tests ⏳
- [ ] Run full test suite
- [ ] Verify all 26 tests pass
- [ ] Check performance metrics
- [ ] Validate compliance requirements

### Phase 4: Production Deployment 📅
- [ ] Apply migration to production
- [ ] Monitor for access issues
- [ ] Verify performance impact
- [ ] Document any findings

## Helper Functions

The migration creates two helper functions for cleaner policy definitions:

### `current_user_id()`
```sql
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true);
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage**: Replaces `auth.uid()` in policies
**Returns**: Current user's Clerk ID from session context

### `current_organization_id()`
```sql
CREATE OR REPLACE FUNCTION current_organization_id() 
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_organization_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage**: Get user's current organization ID
**Returns**: UUID or NULL if not set

## Security Considerations

### ✅ Strengths
1. **Defense in Depth**: Multiple layers of security
2. **Time-Based Controls**: Edit/delete windows prevent abuse
3. **Organization Scoping**: Multi-tenant isolation
4. **Participant-Based Access**: Fine-grained message control
5. **GDPR Compliance**: Right to erasure, data minimization

### ⚠️ Important Notes
1. **Session Context Required**: Application MUST set context variables
2. **No Bypass**: RLS policies apply to ALL queries (including service accounts)
3. **Performance**: Complex policies may impact query performance
4. **Indexes Critical**: Ensure proper indexing on policy-checked columns

### 🔒 Best Practices
1. Always set session context at request start
2. Use connection pooling carefully (context is per-connection)
3. Test RLS policies with multiple users
4. Monitor policy performance with EXPLAIN ANALYZE
5. Regular security audits of policy effectiveness

## Troubleshooting

### Issue: Tests failing with "Cannot read properties of null"
**Cause**: RLS policies not applied or session context not set
**Solution**: 
1. Verify migration 0071 applied: `SELECT * FROM pg_policies WHERE tablename = 'messages';`
2. Check session context in tests: Add debug `SELECT current_setting(...)`

### Issue: "Permission denied for table messages"
**Cause**: RLS blocking access, session context not set correctly
**Solution**:
1. Verify user exists in message_participants
2. Check session variables are set before query
3. Confirm policy logic matches expected access pattern

### Issue: Performance degradation
**Cause**: Complex policy subqueries, missing indexes
**Solution**:
1. Run `EXPLAIN ANALYZE` on slow queries
2. Add indexes on policy-checked columns:
   - `messages.thread_id`
   - `message_participants.user_id`
   - `message_threads.organization_id`
3. Consider materialized views for complex checks

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Azure PostgreSQL Best Practices](https://learn.microsoft.com/en-us/azure/postgresql/)
- Migration File: [db/migrations/0071_update_messaging_rls_for_session_context.sql](../db/migrations/0071_update_messaging_rls_for_session_context.sql)
- Test File: [__tests__/security/rls-policy-tests.test.ts](../__tests__/security/rls-policy-tests.test.ts)

## Support

For questions or issues:
1. Check this documentation
2. Review test examples in `rls-policy-tests.test.ts`
3. Examine migration file for policy definitions
4. Contact security team for policy changes
