# Security Patterns & RLS Exceptions

**Last Updated:** 2026-02-10  
**Status:** Active Reference

## Overview

This document defines security patterns used throughout the Union Eyes application, including when Row-Level Security (RLS) wrappers are **required** vs. when they can be **safely omitted**.

---

## 1. RLS Enforcement: When to Use `withRLSContext()`

### ✅ ALWAYS Required

Use `withRLSContext()` for **all tenant-scoped data queries**:

| Table Category | Examples | Rationale |
|---------------|----------|-----------|
| **Critical Tables** | `claims`, `grievances`, `negotiations` | Contains sensitive member/union data |
| **Member Data** | `members`, `memberProfiles`, `certifications` | PII and membership records |
| **Organization Data** | `organizations` (when querying tenant data), `cbas`, `contracts` | Business-critical documents |
| **Transactional Data** | `votes`, `ballots`, `strikeAuthorizations` | Member actions and decisions |
| **Shared Content** | `sharedClauseLibrary`, `arbitrationPrecedents` | Requires org-level access control |

**Pattern:**
```typescript
const results = await withRLSContext(
  { organizationId: userOrgId },
  async (db) => db.query.claims.findMany(...)
);
```

**Why:** These queries access data that **must be isolated by organization**. Without RLS enforcement, cross-tenant data leakage is possible.

---

## 2. Safe Exceptions: When RLS Wrappers Are NOT Needed

### ✅ **Auth Context Lookups**

**Definition:** Queries that map an authenticated user to their organization membership (user→org lookup).

**Identifying Characteristics:**
- Query uses `userId` from authenticated session (via `auth()`)
- Table is `organizationMembers` or `tenantUsers`
- Purpose is to **determine the user's org context**, not access tenant data
- Result is used to **set** RLS context, not bypass it

**Pattern:**
```typescript
async function getCurrentUserOrgId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // AUTH LOOKUP: Getting user's org membership, not tenant-scoped data
  // No RLS wrapper needed - this IS the context source
  const member = await db.query.organizationMembers.findFirst({
    where: (members, { eq }) => eq(members.userId, userId),
  });

  if (!member) throw new Error('User not associated with any organization');
  return member.organizationId;
}
```

**Why Safe:**
1. **Query scope is limited to authenticated user** (`userId` from session)
2. **organizationMembers is not tenant data** - it's the mapping table
3. **No cross-tenant access possible** - user can only see their own memberships
4. **Functionally required** - RLS context must be established before applying RLS

**Documented Exceptions:**
- [actions/rewards-actions.ts:43-44](../../actions/rewards-actions.ts#L43-L44) - `getCurrentUserOrgId()` helper
- [actions/rewards-actions.ts:56-57](../../actions/rewards-actions.ts#L56-L57) - `checkAdminRole()` helper
- [actions/analytics-actions.ts:43-44](../../actions/analytics-actions.ts#L43-L44) - `getCurrentUserOrgId()` helper

---

### ✅ **Public/Metadata Tables**

**Definition:** Tables containing non-sensitive reference data or system metadata.

**Examples:**
- `systemSettings` (global configuration)
- `featureFlags` (global toggles)
- Public content tables (where `isPublic = true`)

**Pattern:**
```typescript
// System-level metadata - no tenant scope
const settings = await db.query.systemSettings.findFirst({
  where: (s, { eq }) => eq(s.key, 'maintenance_mode'),
});
```

**Why Safe:** No tenant-specific data; globally shared configuration.

---

### ✅ **Cron Job/Background Tasks (with explicit tenant iteration)**

**Definition:** Background processes that iterate over ALL tenants for system maintenance.

**Pattern:**
```typescript
// Cron: Process all tenants
export async function dailyMetricsJob() {
  const { userId } = await auth(); // Must be system account
  
  const allTenants = await db.query.organizations.findMany();
  
  for (const tenant of allTenants) {
    // Per-tenant processing with RLS
    await withRLSContext({ organizationId: tenant.id }, async (db) => {
      const metrics = await db.query.claims.findMany(...);
      // Process metrics
    });
  }
}
```

**Why Safe:** RLS is applied **per tenant** in the loop; initial tenant list is system-level.

---

## 3. Anti-Patterns (DO NOT USE)

### 🚫 **Cookie-Based Organization Selection**

**Bad:**
```typescript
// ❌ VULNERABLE: User-controlled cookie
const cookieStore = await cookies();
const orgSlug = cookieStore.get('active-organization')?.value;
const org = await db.query.organizations.findFirst({
  where: (o, { eq }) => eq(o.slug, orgSlug),
});
```

**Why Unsafe:** User can manipulate cookie to access other organizations' data.

**Good:**
```typescript
// ✅ SECURE: Use authenticated context
export const GET = withRoleAuth(10, async (request, context) => {
  const { userId, organizationId } = context; // From auth session
  // Use organizationId directly
});
```

**Fixed In:**
- [app/api/clause-library/route.ts](../../app/api/clause-library/route.ts) (2026-02-10)

---

### 🚫 **Bypassing RLS with Admin Flags**

**Bad:**
```typescript
// ❌ DANGEROUS: Bypasses RLS
if (user.isSystemAdmin) {
  const allClaims = await db.query.claims.findMany(); // No RLS!
}
```

**Why Unsafe:** Even admins should operate within org context; missing audit trail.

**Good:**
```typescript
// ✅ SECURE: Admins still use RLS, just have access to more orgs
const claims = await withRLSContext(
  { organizationId: targetOrgId },
  async (db) => db.query.claims.findMany(...)
);
logApiAuditEvent({ userId, eventType: 'admin_access', organizationId: targetOrgId });
```

---

## 4. RLS Scan Interpretation

### Understanding Scan Results

When reviewing RLS scan reports (e.g., `rls-scan-full.json`):

| Violation Type | Action Required |
|---------------|-----------------|
| **Tenant violations (101)** | Review each; many may be documented safe exceptions |
| **Unknown context (44)** | Investigate; may need RLS wrapper or documentation |
| **Critical table violations (2)** | **IMMEDIATE FIX** - These are security bugs |

### Validation Process

1. **Locate violation** in source file
2. **Determine query purpose:**
   - Accessing tenant data? → **Wrap with RLS**
   - Auth context lookup? → **Document with comment**
   - System metadata? → **Document + add to exception list**
3. **Add inline comment:**
   ```typescript
   // AUTH LOOKUP: Getting user's org membership, not tenant-scoped data
   // No RLS wrapper needed - this IS the context source
   ```
4. **Update this document** if establishing new pattern

---

## 5. Audit Logging Requirements

Even for **safe exceptions**, audit critical operations:

```typescript
async function checkAdminRole() {
  const member = await db.query.organizationMembers.findFirst(...);
  
  // Safe lookup, but log for audit trail
  logApiAuditEvent({
    timestamp: new Date().toISOString(),
    userId: member.userId,
    endpoint: 'checkAdminRole',
    method: 'INTERNAL',
    eventType: 'admin_check',
    severity: 'low',
    dataType: 'AUTH',
    details: { organizationId: member.organizationId },
  });
  
  return member;
}
```

---

## 6. Review Checklist

Before marking an RLS exception as "safe":

- [ ] Query uses `userId` from authenticated `auth()` session?
- [ ] Table is `organizationMembers` or other auth mapping table?
- [ ] Query cannot access cross-tenant data (scope limited to user)?
- [ ] Purpose is to **establish** RLS context, not bypass it?
- [ ] Inline comment documents why exception is safe?
- [ ] Audit logging present for sensitive operations?

If **all yes** → Safe exception  
If **any no** → Needs RLS wrapper

---

## 7. References

- **RLS Implementation:** [lib/db/with-rls-context.ts](../../lib/db/with-rls-context.ts)
- **Auth Guard:** [lib/api-auth-guard.ts](../../lib/api-auth-guard.ts)
- **Security Architecture:** [docs/security/RLS_AUTH_RBAC_ALIGNMENT.md](./RLS_AUTH_RBAC_ALIGNMENT.md)
- **Audit Logging:** [lib/middleware/api-security.ts](../../lib/middleware/api-security.ts)

---

## 8. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-10 | Initial document creation | GitHub Copilot |
| 2026-02-10 | Added safe exception patterns | GitHub Copilot |
| 2026-02-10 | Documented clause-library fix | GitHub Copilot |

---

**Next Review:** 2026-03-10 (monthly)
