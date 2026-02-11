# API Route RLS Context Migration Guide

**Version:** 1.0  
**Date:** 2024  
**Status:** In Progress  

---

## Overview

This guide provides step-by-step instructions for migrating existing API routes to use the new `withRLSContext()` middleware for automatic database context setting and improved security.

### Why Migrate?

**Before (Manual Context Setting):**

```typescript
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;
    
    // Manual context setting - easy to forget, duplicated code
    await db.execute(sql`SET app.current_user_id = ${userId}`);
    
    // Query without transaction isolation
    const data = await db.select().from(claims).where(eq(claims.memberId, userId));
    
    return NextResponse.json({ data });
  })(request);
};
```

**After (Automatic Context with Transaction Isolation):**

```typescript
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;
    
    // Automatic context setting, transaction-scoped, fail-safe
    return withRLSContext(async (tx) => {
      const data = await tx.select().from(claims).where(eq(claims.memberId, userId));
      return NextResponse.json({ data });
    });
  })(request);
};
```

### Benefits of Migration

✅ **Automatic Context Setting** - No manual `SET app.current_user_id` required  
✅ **Transaction Isolation** - Context scoped to transaction, prevents leakage  
✅ **Fail-Safe Validation** - Throws error if context not set  
✅ **Reduced Boilerplate** - Less code to maintain  
✅ **Consistent Pattern** - Same approach across all routes  
✅ **Better Error Handling** - Automatic cleanup on failure  

---

## Migration Patterns

### Pattern 1: Simple SELECT Query

**Before:**

```typescript
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    const { userId } = context;
    
    await db.execute(sql`SET app.current_user_id = ${userId}`);
    
    const claims = await db
      .select()
      .from(claims)
      .where(eq(claims.memberId, userId));
    
    return NextResponse.json({ claims });
  })(request);
};
```

**After:**

```typescript
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(40, async (request, context) => {
    return withRLSContext(async (tx) => {
      const claims = await tx
        .select()
        .from(claims)
        .where(eq(claims.memberId, userId));
      
      return NextResponse.json({ claims });
    });
  })(request);
};
```

---

### Pattern 2: INSERT/UPDATE/DELETE Operations

**Before:**

```typescript
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const { userId } = context;
    const body = await request.json();
    
    await db.execute(sql`SET app.current_user_id = ${userId}`);
    
    const [newClaim] = await db
      .insert(claims)
      .values({ ...body, memberId: userId })
      .returning();
    
    return NextResponse.json({ claim: newClaim }, { status: 201 });
  })(request);
};
```

**After:**

```typescript
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(60, async (request, context) => {
    const body = await request.json();
    
    return withRLSContext(async (tx) => {
      const [newClaim] = await tx
        .insert(claims)
        .values({ ...body, memberId: context.userId })
        .returning();
      
      return NextResponse.json({ claim: newClaim }, { status: 201 });
    });
  })(request);
};
```

---

### Pattern 3: Multiple Queries (Transaction Benefit)

**Before:**

```typescript
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(80, async (request, context) => {
    const { userId } = context;
    const body = await request.json();
    
    await db.execute(sql`SET app.current_user_id = ${userId}`);
    
    // Multiple queries - NOT in transaction
    const [remittance] = await db.insert(perCapitaRemittances).values(body).returning();
    await db.insert(auditLog).values({ action: 'create_remittance', userId });
    
    return NextResponse.json({ remittance });
  })(request);
};
```

**After:**

```typescript
export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(80, async (request, context) => {
    const body = await request.json();
    
    // All queries in single transaction - atomic operation
    return withRLSContext(async (tx) => {
      const [remittance] = await tx.insert(perCapitaRemittances).values(body).returning();
      await tx.insert(auditLog).values({ action: 'create_remittance', userId: context.userId });
      
      return NextResponse.json({ remittance });
    });
  })(request);
};
```

---

### Pattern 4: Admin Impersonation (View As User)

**Before:**

```typescript
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(100, async (request, context) => {
    const { userId } = context;
    const { searchParams } = request.nextUrl;
    const targetUserId = searchParams.get('viewAsUserId');
    
    // Manual admin check
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }
    
    // Set context for target user
    await db.execute(sql`SET app.current_user_id = ${targetUserId}`);
    const data = await db.select().from(claims).where(eq(claims.memberId, targetUserId));
    
    return NextResponse.json({ data });
  })(request);
};
```

**After:**

```typescript
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(100, async (request, context) => {
    const { searchParams } = request.nextUrl;
    const targetUserId = searchParams.get('viewAsUserId');
    
    // Admin check via isSystemAdmin (checks is_system_admin column)
    if (!await isSystemAdmin()) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }
    
    // Explicit user context for admin impersonation
    return withExplicitUserContext(targetUserId, async (tx) => {
      const data = await tx.select().from(claims).where(eq(claims.memberId, targetUserId));
      return NextResponse.json({ data });
    });
  })(request);
};
```

---

### Pattern 5: Clerk Webhooks / System Operations

**Before:**

```typescript
export const POST = async (request: NextRequest) => {
  // Clerk webhook - no user context available
  const payload = await request.json();
  
  // No SET command - queries fail or see no data due to RLS
  await db.insert(users).values({ id: payload.user.id, email: payload.user.email });
  
  return NextResponse.json({ received: true });
};
```

**After:**

```typescript
export const POST = async (request: NextRequest) => {
  const payload = await request.json();
  
  // System context bypasses user-scoped RLS policies
  return withSystemContext(async (tx) => {
    await tx.insert(users).values({ id: payload.user.id, email: payload.user.email });
    return NextResponse.json({ received: true });
  });
};
```

---

### Pattern 6: Manual Role Check → Automatic with RLS

**Before:**

```typescript
async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const admin = await db.execute(
      sql`SELECT role FROM organization_users WHERE user_id = ${userId} AND role = 'admin' LIMIT 1`
    );
    return admin.length > 0;
  } catch (_error) {
    return false;
  }
}

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;
    
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }
    
    await db.execute(sql`SET app.current_user_id = ${userId}`);
    const data = await db.select().from(organizations);
    
    return NextResponse.json({ data });
  })(request);
};
```

**After:**

```typescript
export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    // Role check already done by withEnhancedRoleAuth(90) - admin required
    // RLS policies automatically enforce organization-level access
    
    return withRLSContext(async (tx) => {
      // RLS policies auto-filter to admin's accessible organizations
      const data = await tx.select().from(organizations);
      return NextResponse.json({ data });
    });
  })(request);
};
```

---

## Step-by-Step Migration Process

### Phase 1: High-Priority Routes (Week 1)

Migrate critical user-facing routes first to minimize security risks.

**Priority 1 Routes:**

- `app/api/claims/**` - Claims management (most sensitive)
- `app/api/training/**` - Training enrollment and records
- `app/api/users/**` - User profile operations
- `app/api/admin/users/**` - Admin user management

**Migration Steps:**

1. ✅ Locate manual `SET app.current_user_id` calls
2. ✅ Identify role check functions to remove
3. ✅ Wrap database operations in `withRLSContext()`
4. ✅ Replace manual admin checks with `isSystemAdmin()`
5. ✅ Remove duplicate `SET` commands
6. ✅ Test route with integration tests
7. ✅ Verify RLS policies apply correctly

---

### Phase 2: Admin Routes (Week 2)

Admin routes with complex queries and multi-table operations.

**Priority 2 Routes:**

- `app/api/admin/clc/**` - CLC remittances and reporting
- `app/api/admin/organizations/**` - Organization management
- `app/api/admin/reports/**` - Analytics and reporting
- `app/api/admin/certifications/**` - Certification management

---

### Phase 3: Webhook & System Routes (Week 2)

System operations requiring special handling.

**Priority 3 Routes:**

- `app/api/webhooks/**` - Clerk and external webhooks
- `app/api/cron/**` - Scheduled jobs
- `app/api/internal/**` - System-to-system operations

**Special Handling:**
Use `withSystemContext()` for operations without authenticated user context.

---

## Code Search Commands

### Find Routes with Manual Context Setting

```bash
# Find all manual SET commands in API routes
grep -r "SET app.current_user_id" app/api/

# Find routes with db queries not wrapped in withRLSContext
grep -r "db\.select\|db\.insert\|db\.update\|db\.delete" app/api/ | grep -v "withRLSContext"

# Find manual role check functions
grep -r "checkAdminRole\|isAdmin.*=" app/api/
```

### Validation After Migration

```bash
# Verify no remaining manual SET commands
grep -r "SET app.current_user_id" app/api/ | wc -l  # Should be 0

# Count routes using withRLSContext (should match total routes)
grep -r "withRLSContext" app/api/ | wc -l
```

---

## Testing Checklist

For each migrated route, verify:

- [ ] Route uses `withRLSContext()`, `withExplicitUserContext()`, or `withSystemContext()`
- [ ] No manual `SET app.current_user_id` calls remain
- [ ] Manual role check functions removed (replaced with `isSystemAdmin()` or RLS policies)
- [ ] Integration test passes (200/201 status for valid requests)
- [ ] RLS policies correctly filter data (user sees only their records)
- [ ] Admin impersonation works (with `withExplicitUserContext()`)
- [ ] Error handling intact (400/401/403/500 responses)
- [ ] Audit logging still functions
- [ ] Performance acceptable (<15ms RLS overhead)

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting to return NextResponse

```typescript
// WRONG - context set but response not returned
return withRLSContext(async (tx) => {
  const data = await tx.select().from(claims);
  NextResponse.json({ data }); // Missing return!
});

// CORRECT
return withRLSContext(async (tx) => {
  const data = await tx.select().from(claims);
  return NextResponse.json({ data });
});
```

### ❌ Pitfall 2: Using `db` instead of `tx` parameter

```typescript
// WRONG - uses global db, bypasses context
return withRLSContext(async (tx) => {
  const data = await db.select().from(claims); // Wrong!
  return NextResponse.json({ data });
});

// CORRECT - uses tx parameter
return withRLSContext(async (tx) => {
  const data = await tx.select().from(claims);
  return NextResponse.json({ data });
});
```

### ❌ Pitfall 3: Mixing manual SET with withRLSContext

```typescript
// WRONG - redundant, context set twice
await db.execute(sql`SET app.current_user_id = ${userId}`);
return withRLSContext(async (tx) => {
  // Context already set above, withRLSContext sets again
});

// CORRECT - only use withRLSContext
return withRLSContext(async (tx) => {
  // Context automatically set
});
```

---

## ESLint Rule Configuration

**TODO:** Add custom ESLint rule to enforce `withRLSContext()` usage.

```javascript
// eslint.config.mjs - TODO: Implement custom rule
{
  rules: {
    'custom/require-rls-context': 'error',
  },
}
```

**Rule Logic:**

- Detect `db.select()`, `db.insert()`, `db.update()`, `db.delete()` in `app/api/**`
- Ensure wrapped in `withRLSContext()`, `withExplicitUserContext()`, or `withSystemContext()`
- Exclude: `lib/db/**`, `scripts/**`, `__tests__/**`

---

## Migration Progress Tracker

| Route | Status | Priority | Migrated By | Notes |
|-------|--------|----------|-------------|-------|
| `app/api/admin/clc/remittances/route.ts` | 🔄 In Progress | High | - | Example migration in progress |
| `app/api/claims/**` | ⏳ Pending | High | - | 12 routes to migrate |
| `app/api/training/**` | ⏳ Pending | High | - | 8 routes to migrate |
| `app/api/users/**` | ⏳ Pending | High | - | 6 routes to migrate |
| `app/api/admin/organizations/**` | ⏳ Pending | Medium | - | 10 routes to migrate |
| `app/api/webhooks/**` | ⏳ Pending | Medium | - | Use `withSystemContext()` |

**Total Routes Identified:** ~50  
**Completed:** 0  
**In Progress:** 1  
**Pending:** 49  

---

## Performance Benchmarking

**Target:** <15ms RLS overhead per query

### Benchmark Query

```sql
-- With RLS
EXPLAIN ANALYZE
SELECT * FROM claims WHERE member_id = 'user_abc123';

-- Without RLS (for comparison)
SET ROLE bypass_rls_user;
EXPLAIN ANALYZE
SELECT * FROM claims WHERE member_id = 'user_abc123';
```

### Expected Results

- **Simple SELECT:** 5-10ms overhead
- **Complex JOIN:** 10-15ms overhead
- **Aggregation:** 8-12ms overhead

**Monitor:** Use `pg_stat_statements` to track query performance.

---

## Rollback Plan

If migration causes issues:

1. **Identify problematic route** (check error logs, Sentry)
2. **Revert to previous version:**

   ```bash
   git diff HEAD~1 app/api/path/to/route.ts
   git checkout HEAD~1 -- app/api/path/to/route.ts
   ```

3. **Redeploy** specific route
4. **Investigate** RLS policy issue or context setting
5. **Fix** and re-migrate with additional testing

---

## Support & Questions

**Documentation:**

- [RLS Security Assessment](../security/RLS_SECURITY_ASSESSMENT.md)
- [RLS/Auth/RBAC Alignment](../security/RLS_AUTH_RBAC_ALIGNMENT.md)
- [withRLSContext API Reference](../../lib/db/with-rls-context.ts)

**Team Contact:**

- Security questions: #security-team
- Migration help: #backend-team
- Database issues: #database-team

---

**Last Updated:** 2024  
**Next Review:** After Phase 1 completion (Week 1)
