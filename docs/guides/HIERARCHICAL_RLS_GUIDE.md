# Hierarchical RLS Developer Guide

## Overview

This guide explains how to work with the hierarchical Row-Level Security (RLS) policies implemented in Migration 050. These policies enable multi-level organizational access control, where users can view and manage data in their own organization plus all descendant organizations.

## Architecture

### Organization Hierarchy

```
CLC (Canadian Labour Congress) - Level 0
├── Provincial Federations (OFL, FTQ, etc.) - Level 1
│   └── Affiliated Locals - Level 2/3
├── National Unions (CUPE, OPSEU, etc.) - Level 1
    ├── Regional Councils - Level 2
    └── Local Unions - Level 2/3
```

### Access Model

- **CLC Admin**: Can view/manage ALL affiliate data
- **Provincial Federation Admin**: Can view/manage all locals in their province
- **National Union Admin**: Can view/manage all locals affiliated with their union
- **Local Union Admin**: Can ONLY view/manage their local's data
- **Regular Members**: Can view data in their local, limited editing rights

## Session Context Setup

### API Route Pattern

Every API route MUST set session context before querying data:

```typescript
// app/api/claims/route.ts
import { auth } from '@clerk/nextjs';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  const { userId, orgId } = auth();
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // CRITICAL: Set session context for RLS
  await db.execute(sql`SET app.current_user_id = ${userId}`);
  if (orgId) {
    await db.execute(sql`SET app.current_organization_id = ${orgId}`);
  }

  // Now queries automatically filter by hierarchical access
  const claims = await db.select().from(claims);
  
  return Response.json(claims);
}
```

### Server Action Pattern

```typescript
// actions/claims-actions.ts
'use server';

import { auth } from '@clerk/nextjs';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function getClaimsForOrganization(orgId: string) {
  const { userId } = auth();
  
  if (!userId) throw new Error('Unauthorized');

  // Set session context
  await db.execute(sql`SET app.current_user_id = ${userId}`);
  await db.execute(sql`SET app.current_organization_id = ${orgId}`);

  // RLS automatically filters results
  const claims = await db
    .select()
    .from(claims)
    .where(eq(claims.organizationId, orgId));
  
  return claims;
}
```

## Database Functions

### `get_descendant_org_ids(org_id UUID)`

Returns organization ID + all descendant IDs (children, grandchildren, etc.)

**Usage:**

```sql
-- Get all claims visible to CUPE National
SELECT c.*
FROM claims c
WHERE c.organization_id IN (
  SELECT * FROM get_descendant_org_ids('30000000-0000-0000-0000-000000000001'::UUID)
);
```

**Performance:** <10ms for 10,000 organizations (GIN indexed `hierarchy_path`)

### `get_ancestor_org_ids(org_id UUID)`

Returns organization ID + all ancestor IDs (parent, grandparent, etc.)

**Usage:**

```sql
-- Get hierarchy path for CUPE Local 79
SELECT o.name, o.hierarchy_level
FROM organizations o
WHERE o.id IN (
  SELECT * FROM get_ancestor_org_ids('40000000-0000-0000-0000-000000000001'::UUID)
)
ORDER BY o.hierarchy_level;
```

**Result:**

```
name                                | hierarchy_level
------------------------------------|----------------
Canadian Labour Congress            | 0
Canadian Union of Public Employees  | 1
CUPE Local 79                       | 2
```

### `user_can_access_org(user_id UUID, org_id UUID)`

Checks if user can access specific organization (boolean)

**Usage:**

```typescript
const canAccess = await db.execute(sql`
  SELECT user_can_access_org(
    ${userId}::UUID, 
    ${targetOrgId}::UUID
  ) as can_access
`);

if (!canAccess.rows[0]?.can_access) {
  throw new Error('Access denied');
}
```

### `get_current_user_visible_orgs()`

Returns all organization IDs visible to current session user

**Usage:**

```sql
-- Automatically used by RLS policies
-- Manual usage for filtering:
SELECT * FROM claims
WHERE organization_id IN (
  SELECT * FROM get_current_user_visible_orgs()
);
```

## RLS Policies by Table

### Claims

| Operation | Policy | Who Can Do It |
|-----------|--------|---------------|
| SELECT | View own org + descendants | All active members |
| INSERT | Create in own org only | All active members |
| UPDATE | Update in visible orgs | Owner OR Admin/Officer/Manager |
| DELETE | Delete in visible orgs | Admin only |

### Organization Members

| Operation | Policy | Who Can Do It |
|-----------|--------|---------------|
| SELECT | View members in visible orgs | All active members |
| INSERT | Add members to visible orgs | Admin/Officer |
| UPDATE | Update member records | Self OR Admin/Officer |
| DELETE | Remove members from visible orgs | Admin only |

### Dues Payments

| Operation | Policy | Who Can Do It |
|-----------|--------|---------------|
| SELECT | View dues in visible orgs | All active members |
| INSERT | Record dues in visible orgs | Admin/Officer/Treasurer |
| UPDATE | Update dues in visible orgs | Admin/Officer/Treasurer |

### Strike Funds

| Operation | Policy | Who Can Do It |
|-----------|--------|---------------|
| SELECT | View funds in visible orgs | All active members |
| INSERT | Create fund entries | Admin/Officer/Treasurer |
| UPDATE | Update fund entries | Admin/Officer/Treasurer |

### Deadlines

| Operation | Policy | Who Can Do It |
|-----------|--------|---------------|
| SELECT | View deadlines in visible orgs | All active members |
| INSERT | Create deadlines in own org | All active members |
| UPDATE | Update deadlines | Owner OR Admin/Officer |
| DELETE | Delete deadlines | Owner OR Admin |

### Collective Agreements

| Operation | Policy | Who Can Do It |
|-----------|--------|---------------|
| SELECT | View CBAs in visible orgs | All active members |
| INSERT | Create CBAs in visible orgs | Admin/Officer |
| UPDATE | Update CBAs in visible orgs | Admin/Officer |

## Common Patterns

### Pattern 1: List All Accessible Data

```typescript
// No WHERE clause needed - RLS handles it!
export async function getAllClaims() {
  const { userId } = auth();
  
  await db.execute(sql`SET app.current_user_id = ${userId}`);
  
  // Automatically filtered by RLS
  return db.select().from(claims);
}
```

### Pattern 2: Check Access Before Action

```typescript
export async function updateClaim(claimId: string, updates: any) {
  const { userId } = auth();
  
  await db.execute(sql`SET app.current_user_id = ${userId}`);
  
  // RLS will throw error if user doesn't have access
  const result = await db
    .update(claims)
    .set(updates)
    .where(eq(claims.id, claimId))
    .returning();
  
  if (result.length === 0) {
    throw new Error('Claim not found or access denied');
  }
  
  return result[0];
}
```

### Pattern 3: Organization Tree Navigation

```typescript
export async function getOrganizationTree(rootOrgId: string) {
  const { userId } = auth();
  
  await db.execute(sql`SET app.current_user_id = ${userId}`);
  
  // Get all descendants
  const descendants = await db.execute(sql`
    SELECT o.*, 
           array_length(o.hierarchy_path, 1) as depth
    FROM organizations o
    WHERE o.id IN (
      SELECT * FROM get_descendant_org_ids(${rootOrgId}::UUID)
    )
    ORDER BY o.hierarchy_path
  `);
  
  return descendants.rows;
}
```

### Pattern 4: Per-Capita Remittances (Parent Access)

```typescript
export async function calculatePerCapita(localOrgId: string) {
  const { userId } = auth();
  
  await db.execute(sql`SET app.current_user_id = ${userId}`);
  
  // Get parent organization
  const [local] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, localOrgId));
  
  if (!local.parentId) {
    throw new Error('No parent organization for remittance');
  }
  
  // Calculate remittance to parent
  const members = local.memberCount;
  const rate = local.perCapitaRate;
  const total = members * rate;
  
  // Create remittance record (visible to both local and parent)
  await db.insert(perCapitaRemittances).values({
    fromOrganizationId: localOrgId,
    toOrganizationId: local.parentId,
    totalMembers: members,
    perCapitaRate: rate,
    totalAmount: total,
    status: 'pending',
  });
}
```

## Testing Your RLS Policies

### Unit Test Template

```typescript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

describe('RLS Policy Test', () => {
  beforeEach(async () => {
    // Set user context
    await db.execute(sql`SET app.current_user_id = ${testUserId}`);
  });

  test('User can view descendant data', async () => {
    const results = await db.select().from(claims);
    
    // Verify all results belong to visible orgs
    for (const claim of results) {
      expect(visibleOrgIds).toContain(claim.organizationId);
    }
  });

  test('User cannot view sibling org data', async () => {
    const results = await db
      .select()
      .from(claims)
      .where(eq(claims.organizationId, siblingOrgId));
    
    expect(results.length).toBe(0);
  });
});
```

### SQL Testing

```sql
-- Test as CUPE Local 79 member
SET app.current_user_id = '50000000-0000-0000-0000-000000000004';

-- Should see only CUPE Local 79 claims
SELECT COUNT(*) FROM claims; -- Expect: local count only

-- Reset context
RESET app.current_user_id;

-- Test as CUPE National admin
SET app.current_user_id = '50000000-0000-0000-0000-000000000003';

-- Should see all CUPE locals' claims
SELECT COUNT(*) FROM claims; -- Expect: sum of all CUPE locals

-- Validate hierarchy
SELECT * FROM get_descendant_org_ids('30000000-0000-0000-0000-000000000001'::UUID);
-- Should return CUPE National + all CUPE locals
```

## Performance Optimization

### Index Usage

Migration 050 creates these indexes for optimal performance:

1. **`idx_organizations_hierarchy_path_gin`** - GIN index for containment queries (@>)
2. **`idx_claims_organization_id`** - B-tree index for FK lookups
3. **`idx_organization_members_user_id`** - B-tree for user membership lookup

### Query Optimization Tips

**✅ DO:**

```typescript
// Let RLS handle filtering (fast)
const claims = await db.select().from(claims);
```

**❌ DON'T:**

```typescript
// Manual filtering defeats RLS optimization
const allClaims = await db.select().from(claims); // Gets ALL data!
const filtered = allClaims.filter(c => visibleOrgs.includes(c.orgId)); // Slow!
```

### Monitoring Slow Queries

```sql
-- Check query plan for hierarchical queries
EXPLAIN ANALYZE
SELECT c.*
FROM claims c
WHERE c.organization_id IN (
  SELECT * FROM get_current_user_visible_orgs()
);

-- Expected: Index Scan on idx_claims_organization_id
-- Acceptable: <100ms for 10,000 claims
```

## Migration from tenant_id to organization_id

### Step 1: Add organization_id Column

```typescript
// Already done in Migration 050
ALTER TABLE your_table ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_your_table_organization_id ON your_table(organization_id);
```

### Step 2: Backfill Data

```sql
-- Map tenant_id to organization_id via legacy_tenant_id
UPDATE your_table yt
SET organization_id = o.id
FROM organizations o
WHERE yt.tenant_id = o.legacy_tenant_id
  AND yt.organization_id IS NULL;
```

### Step 3: Update Application Code

```typescript
// OLD (tenant-based)
const claims = await db
  .select()
  .from(claims)
  .where(eq(claims.tenantId, currentTenantId));

// NEW (organization-based with RLS)
await db.execute(sql`SET app.current_user_id = ${userId}`);
const claims = await db.select().from(claims); // RLS filters automatically!
```

### Step 4: Validate Migration

```sql
-- Check for NULL organization_id
SELECT COUNT(*) FROM your_table WHERE organization_id IS NULL;
-- Expected: 0

-- Verify all org IDs exist
SELECT COUNT(*) FROM your_table yt
LEFT JOIN organizations o ON yt.organization_id = o.id
WHERE o.id IS NULL;
-- Expected: 0
```

## Troubleshooting

### "User cannot access organization"

**Cause:** User not a member of requested org or any ancestor
**Fix:**

```sql
-- Add user to organization
INSERT INTO organization_members (user_id, organization_id, role, status)
VALUES ('user-uuid', 'org-uuid', 'member', 'active');
```

### "RLS policy violation"

**Cause:** Session context not set
**Fix:**

```typescript
// ALWAYS set context before queries
await db.execute(sql`SET app.current_user_id = ${userId}`);
```

### "Slow hierarchical queries"

**Cause:** Missing GIN index or outdated statistics
**Fix:**

```sql
-- Rebuild index
REINDEX INDEX idx_organizations_hierarchy_path_gin;

-- Update statistics
ANALYZE organizations;
ANALYZE claims;
```

### "Cannot view parent org data"

**Expected:** RLS only allows viewing OWN org + DESCENDANTS, not ancestors
**Workaround:** Use separate query for parent info

```typescript
const [parentOrg] = await db
  .select()
  .from(organizations)
  .where(eq(organizations.id, currentOrg.parentId));
```

## Security Best Practices

1. **Never bypass RLS in application code** - Trust the database policies
2. **Always set session context** - Every API route, every time
3. **Use role-based checks for mutations** - RLS handles SELECT, but validate INSERT/UPDATE
4. **Log access attempts** - Audit who accessed what organization's data
5. **Test cross-org access** - Validate users can't bypass hierarchy

## Examples

See complete examples in:

- `__tests__/rls-hierarchy.test.ts` - 100+ test cases
- `database/migrations/050_hierarchical_rls_policies.sql` - RLS policy definitions
- `docs/implementation/PHASE_1_IMPLEMENTATION_PLAN.md` - Architecture overview

## Support

For questions about hierarchical RLS:

1. Review this guide
2. Check test suite for examples
3. Examine query plans with EXPLAIN ANALYZE
4. Contact platform team for complex access scenarios
