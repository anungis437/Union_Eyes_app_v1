# Authentication Migration Report

**Date:** February 9, 2026  
**Status:** ✅ ENTERPRISE FEATURES CONSOLIDATED - Ready for Migration

## ✅ CONSOLIDATION COMPLETE

**All enterprise-role-middleware features have been successfully consolidated into `lib/api-auth-guard.ts`**

The canonical authentication module now includes:

- ✅ Multi-role support (`withEnhancedRoleAuth`)
- ✅ Permission-based auth (`withPermission`)
- ✅ Scoped role auth (`withScopedRoleAuth`)
- ✅ All helper functions (`requirePermission`, `canAccessMemberResource`, etc.)
- ✅ Enhanced context with permissions and scope checking
- ✅ Automatic audit logging

**Next Step:** Migrate 111 files from `enterprise-role-middleware` to `api-auth-guard` (simple import path change)

---

## Executive Summary

The codebase has **two functional authentication systems** with different capabilities:

1. **Canonical Module (`lib/api-auth-guard`)**: 200+ files (~57%)
2. **Enterprise RBAC (`lib/enterprise-role-middleware`)**: 111 files (~32%)  
3. **Legacy Imports (`lib/auth/*`)**: 42 files (~12%) - **NEEDS MIGRATION**

---

## ✅ Consolidation Progress (Option B Completed)

**Date Completed:** February 9, 2026

### Phase 1: Core Consolidation ✅ DONE

- [x] Added `EnhancedRoleContext` interface to api-auth-guard
- [x] Added `withEnhancedRoleAuth()` wrapper function
- [x] Added `withPermission()` wrapper function
- [x] Added `withScopedRoleAuth()` wrapper function
- [x] Added all helper functions (requirePermission, requireRoleLevel, requireScope, etc.)
- [x] Added scope checking logic (checkMemberScope)
- [x] Added audit logging integration
- [x] Imported enhanced RBAC queries (getMemberRoles, getMemberEffectivePermissions, etc.)
- [x] Added deprecation notice to enterprise-role-middleware.ts

### Phase 2: Migration Tools ✅ DONE

- [x] Created comprehensive migration guide: [ENTERPRISE_TO_CANONICAL_MIGRATION.md](./ENTERPRISE_TO_CANONICAL_MIGRATION.md)
- [x] Created automated PowerShell migration script: [scripts/migrate-enterprise-to-canonical.ps1](../../scripts/migrate-enterprise-to-canonical.ps1)
- [x] Documented all API changes (none - just import path changes)
- [x] Created before/after examples
- [x] Defined testing strategy

### Phase 3: File Migration 🔄 READY TO START

- [ ] Run migration script: `.\scripts\migrate-enterprise-to-canonical.ps1`
- [ ] Verify type check passes: `pnpm tsc --noEmit`
- [ ] Run test suite: `pnpm test`
- [ ] Manual spot testing of key routes
- [ ] Deploy to staging for validation
- [ ] Deploy to production

**Estimated Time for Phase 3:** 4-6 hours

---

## System Comparison (Updated)

| Feature | api-auth-guard | enterprise-role-middleware |
|---------|----------------|---------------------------|
| **Role Hierarchy** | ✅ Simple (4 levels) | ✅ Complex (numeric + multi-role) |
| **Multi-Role Support** | ❌ Single role per user | ✅ Multiple roles per user |
| **Permission System** | ❌ No | ✅ Fine-grained permissions |
| **Scope Matching** | ❌ No | ✅ Department/Location/Shift |
| **Audit Logging** | ❌ Manual | ✅ Automatic |
| **Clerk Integration** | ✅ Native | ✅ Via base |
| **API Simplicity** | ✅ Very simple | ⚠️ More complex |
| **Files Using** | 200+ (57%) | 111 (32%) |

---

## Files Requiring Migration

### Priority 1: Legacy `lib/auth` Imports (42 files)

These files import from deprecated `lib/auth/*` modules and need migration:

#### Using `requireUser` from `lib/auth/unified-auth` (19 files)

- ✅ **Easy Migration**: Already re-exports canonical module
- **Action**: Change import to `@/lib/api-auth-guard`

```typescript
// BEFORE
import { requireUser } from '@/lib/auth/unified-auth';

// AFTER  
import { requireUser } from '@/lib/api-auth-guard';
```

**Files:**

- `app/api/whop/create-checkout/route.ts`
- `app/api/organizations/[id]/children/route.ts`
- `app/api/organizations/[id]/descendants/route.ts`
- `app/api/organizations/[id]/access-logs/route.ts`
- `app/api/organizations/[id]/path/route.ts`
- `app/api/organizations/[id]/ancestors/route.ts`
- `app/api/organizations/[id]/members/route.ts`
- `app/api/organizations/[id]/sharing-settings/route.ts`
- `app/api/organizations/[id]/analytics/route.ts`
- `app/api/organizations/tree/route.ts`
- `app/api/organizations/search/route.ts`
- `app/api/organizations/hierarchy/route.ts`
- `app/api/ml/predictions/workload-forecast/route.ts`
- `app/api/member/ai-feedback/route.ts`
- `app/api/claims/[id]/status/route.ts`
- (+ 4 more)

#### Using functions from `lib/auth` (23 files)

- ⚠️ **Moderate Migration**: Need pattern updates

```typescript
// BEFORE
import { getUserFromRequest } from '@/lib/auth';

// AFTER
import { getCurrentUser } from '@/lib/api-auth-guard';
```

**Files:**

- `app/api/communications/templates/[id]/duplicate/route.ts`
- `app/api/communications/distribution-lists/[id]/export/route.ts`
- `app/api/extensions/[id]/route.ts`
- `app/api/deadlines/compliance/route.ts`
- `app/api/deadlines/overdue/route.ts`
- `app/api/deadlines/[id]/extend/route.ts`
- `app/api/deadlines/[id]/complete/route.ts`
- (+ 16 more)

#### Using `requireAdmin` from `lib/auth/rbac-server` (1 file)

- `actions/admin-actions.ts` - Migrate to `withAdminAuth()`

---

## Migration Scripts

### Script 1: Migrate `unified-auth` Imports

```typescript
// scripts/migrate-unified-auth.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('app/api/**/*.ts');

files.forEach(file => {
  let content = readFileSync(file, 'utf8');
  
  if (content.includes("from '@/lib/auth/unified-auth'")) {
    content = content.replace(
      /from ['"]@\/lib\/auth\/unified-auth['"]/g,
      "from '@/lib/api-auth-guard'"
    );
    
    writeFileSync(file, content);
    console.log(`✅ Migrated: ${file}`);
  }
});
```

### Script 2: Migrate `getUserFromRequest` Calls

```typescript
// scripts/migrate-get-user.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('app/api/**/*.ts');

files.forEach(file => {
  let content = readFileSync(file, 'utf8');
  
  // Replace import
  content = content.replace(
    /import \{ getUserFromRequest \} from ['"]@\/lib\/auth['"]/g,
    "import { getCurrentUser } from '@/lib/api-auth-guard'"
  );
  
  // Replace usage (note: getCurrentUser() doesn't take request param)
  content = content.replace(
    /getUserFromRequest\(request\)/g,
    'getCurrentUser()'
  );
  
  if (content !== readFileSync(file, 'utf8')) {
    writeFileSync(file, content);
    console.log(`✅ Migrated: ${file}`);
  }
});
```

---

## Recommendation

### Immediate Actions (1-2 weeks)

1. **✅ Run migration scripts** to clean up 42 legacy imports
2. **✅ Update documentation** to reference only canonical module
3. **✅ Add ESLint rule** to prevent new `lib/auth/*` imports

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@/lib/auth/*', '!@/lib/api-auth-guard'],
          message: 'Import from @/lib/api-auth-guard instead'
        }
      ]
    }]
  }
};
```

### Long-term Strategy (Dual-Track)

**Keep both auth systems** but clarify usage:

```typescript
/**
 * AUTH SYSTEM DECISION GUIDE
 * 
 * Use api-auth-guard when:
 * - Simple role checks (admin/steward/member)
 * - Basic CRUD operations
 * - Single role per user is sufficient
 * 
 * Use enterprise-role-middleware when:
 * - Users need multiple concurrent roles
 * - Fine-grained permission checks required  
 * - Scope-based access (department/location)
 * - Audit logging needed automatically
 * 
 * Examples:
 * - Member profile CRUD → api-auth-guard
 * - Multi-department steward workflow → enterprise-role-middleware
 * - System admin panel → api-auth-guard  
 * - Complex claims with scoped access → enterprise-role-middleware
 */
```

### Alternative: Consolidation (40-60 hours)

If you prefer a **single auth system**, add these to `api-auth-guard`:

```typescript
// Add to lib/api-auth-guard.ts

/**
 * Permission-based auth wrapper
 */
export function withPermission(
  permission: string,
  handler: ApiRouteHandler
): ApiRouteHandler {
  return withApiAuth(async (request, context) => {
    const userContext = await getUserContext();
    
    if (!userContext?.permissions.includes(permission)) {
      return NextResponse.json(
        { error: `Permission required: ${permission}` },
        { status: 403 }
      );
    }
    
    return handler(request, context);
  });
}

/**
 * Scope-based role auth
 */
export function withScopedRoleAuth(
  minRole: string,
  scopeType: string,
  handler: ApiRouteHandler
): ApiRouteHandler {
  // Implementation that wraps enterprise-role-middleware logic
}
```

Then migrate 111 `enterprise-role-middleware` files gradually.

---

## Metrics

- **Total API Routes**: ~350 files
- **Canonical Module**: 200+ files (57%)
- **Enterprise RBAC**: 111 files (32%)
- **Legacy Imports**: 42 files (12%)

**Migration Progress: 60% → Target: 88%** (after legacy cleanup)

---

## Next Steps

1. [ ] Run `migrate-unified-auth.ts` script (19 files)
2. [ ] Run `migrate-get-user.ts` script (23 files)
3. [ ] Manually migrate `requireAdmin` usage (1 file)
4. [ ] Add ESLint rule to prevent regression
5. [ ] Update auth documentation
6. [ ] Decide on long-term dual-track vs consolidation strategy

**Estimated Time: 4-8 hours for Priority 1 cleanup**
