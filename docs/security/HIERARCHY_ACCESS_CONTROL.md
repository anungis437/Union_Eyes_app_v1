# Hierarchy-Based Access Control Architecture

## Overview

Union Eyes implements a hierarchical organizational model with strict access controls to ensure data security while enabling appropriate information sharing across federation structures.

## Organizational Hierarchy

Organizations are structured in three levels:

```
Federation (Top Level)
  ├── Union (Mid Level)
  │   ├── Local (Bottom Level)
  │   └── Local
  └── Union
      └── Local
```

### Hierarchy Storage

Each organization record contains:
- `parentOrganizationId`: Direct parent organization (nullable)
- `hierarchyPath`: Array of all ancestor organization IDs from root to parent
- `type`: Organization level - `'federation'`, `'union'`, or `'local'`

**Example**:
```typescript
// Federation (root)
{
  id: "fed-001",
  type: "federation",
  parentOrganizationId: null,
  hierarchyPath: []
}

// Union (child of federation)
{
  id: "union-001",
  type: "union",
  parentOrganizationId: "fed-001",
  hierarchyPath: ["fed-001"]
}

// Local (child of union)
{
  id: "local-001",
  type: "local",
  parentOrganizationId: "union-001",
  hierarchyPath: ["fed-001", "union-001"]
}
```

## Access Control Model

### Role-Based Permissions

| Role | Read | Write | Admin | Cross-Tenant Share |
|------|------|-------|-------|-------------------|
| super_admin | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| owner | ✅ | ✅ | ✅ | ✅ |
| steward | ✅ | ✅ | ❌ | ✅ |
| member | ✅ | ❌ | ❌ | ❌ |
| guest | ✅ | ❌ | ❌ | ❌ |

### Hierarchical Access Rules

1. **Direct Access**: Users can access resources in organizations where they have membership
2. **Hierarchical Read**: Admins can **read** child organization data (federation admin → union → local)
3. **Hierarchical Write**: Admins **cannot** write/delete child organization data (enforces autonomy)
4. **Lateral Isolation**: Organizations at the same level cannot access each other's data
5. **Upward Visibility**: Child organizations cannot access parent data without explicit membership

## Sharing Levels

### Private
- **Access**: Only direct organization members
- **Use Case**: Sensitive internal documents
- **Validation**: None required (default restriction)

### Federation
- **Access**: Organizations within the same federation hierarchy
- **Requirements**:
  - Organization must be part of a federation (non-empty `hierarchyPath`)
  - OR organization must be type `'federation'`
- **Validation**: Enforced by `validateSharingLevel()`
- **Use Case**: Share clauses/precedents across union locals within a federation

### Congress
- **Access**: Organizations with explicit congress membership
- **Requirements**:
  - Federation must explicitly enable congress sharing
  - User must have congress membership record
- **Validation**: Enforced by `validateCongressMembership()` (not yet implemented)
- **Use Case**: Cross-federation sharing at national level
- **Status**: ⚠️ **NOT YET IMPLEMENTED** - Returns false

### Public
- **Access**: All authenticated users across all organizations
- **Use Case**: General knowledge base, public templates
- **Validation**: None required

## Implementation

### Core Module

**Location**: `lib/auth/hierarchy-access-control.ts`

**Key Functions**:

#### `validateHierarchyAccess(userId, targetOrgId, action)`
Validates if user can perform action on target organization.

```typescript
const access = await validateHierarchyAccess(userId, targetOrgId, 'read');
if (!access.allowed) {
  return NextResponse.json({ error: access.reason }, { status: 403 });
}
```

**Returns**:
```typescript
{
  allowed: boolean;
  reason?: string;
  accessType?: 'direct' | 'hierarchical' | 'congress' | 'public';
  userRole?: string;
  organizationLevel?: string;
}
```

#### `validateSharingLevel(userId, sourceOrgId, sharingLevel)`
Validates if organization can enable specified sharing level.

```typescript
const validation = await validateSharingLevel(userId, orgId, 'federation');
if (!validation.allowed) {
  return NextResponse.json({ 
    error: validation.reason 
  }, { status: 403 });
}
```

#### `getAccessibleOrganizations(userId, action)`
Returns list of organization IDs user can access.

```typescript
const orgIds = await getAccessibleOrganizations(userId, 'read');
// Use for filtering queries across multiple orgs
```

### API Integration

**Example**: Organizations Sharing Settings

```typescript
// Before saving federation/congress sharing
if (body.default_clause_sharing_level === 'federation') {
  const validation = await validateSharingLevel(
    userId,
    organizationId,
    'federation'
  );
  
  if (!validation.allowed) {
    return NextResponse.json({ 
      error: "Cannot enable federation sharing",
      reason: validation.reason 
    }, { status: 403 });
  }
}
```

## Security Considerations

### Tenant Isolation

**RLS Enforcement**: All database queries use `withRLSContext()` wrapper
- Queries without context are **rejected**
- Context includes `organizationId` to scope data access
- Prevents cross-tenant data leakage

**Test Coverage**: Integration tests in `__tests__/integration/tenant-isolation.test.ts`
- Validates read/write/delete isolation
- Tests hierarchical access rules
- Verifies concurrent context isolation

### Federation Sharing Security

⚠️ **Known Vulnerability (Fixed)**:
- **Before**: "federation" level allowed broad access without hierarchy validation
- **After**: Requires organization to be part of federation hierarchy
- **Validation**: Enforced in `sharing-settings` route and hierarchy module

### Congress Sharing Status

⚠️ **Not Yet Implemented**:
- Congress membership table does not exist
- `validateCongressMembership()` is a stub returning false
- Attempting to enable "congress" sharing will fail validation
- **DO NOT ENABLE** until congress membership system is implemented

## Migration Guide

### Enabling Federation Sharing

**Prerequisites**:
1. Organization must have `hierarchyPath` populated
2. Organization must be type `'federation'`, `'union'`, or `'local'`
3. User must have `admin` or higher role

**Steps**:
1. Verify organization hierarchy is correct:
   ```sql
   SELECT id, name, type, parent_organization_id, hierarchy_path 
   FROM organizations 
   WHERE id = 'your-org-id';
   ```

2. Update sharing settings via API:
   ```typescript
   const response = await fetch(`/api/organizations/${orgId}/sharing-settings`, {
     method: 'PUT',
     body: JSON.stringify({
       enable_clause_sharing: true,
       default_clause_sharing_level: 'federation'
     })
   });
   ```

3. Validation will automatically check hierarchy and return error if invalid

### Enabling Congress Sharing

⚠️ **DO NOT PROCEED** - Congress sharing is not yet implemented.

Required implementation:
1. Create `congress_memberships` table
2. Implement `validateCongressMembership()` function
3. Add congress membership management UI
4. Create congress invitation/approval workflow
5. Update tests to cover congress access scenarios

## Testing

### Unit Tests
Run hierarchy access control tests:
```bash
pnpm vitest run __tests__/lib/auth/hierarchy-access-control.test.ts
```

### Integration Tests
Run tenant isolation suite:
```bash
pnpm vitest run __tests__/integration/tenant-isolation.test.ts
```

### Manual Testing

**Test Federation Access**:
1. Create federation org (type: 'federation')
2. Create union org with `parentOrganizationId` = federation ID
3. Create local org with `parentOrganizationId` = union ID
4. Verify federation admin can read union/local data
5. Verify federation admin cannot write union/local data
6. Verify union cannot access other union's data

## Troubleshooting

### "Cannot enable federation sharing"

**Cause**: Organization not part of federation hierarchy

**Solution**:
1. Check organization record:
   ```sql
   SELECT type, hierarchy_path FROM organizations WHERE id = 'org-id';
   ```
2. Verify `hierarchyPath` is not empty (unless org is type 'federation')
3. Update parent organization if needed

### "User does not have hierarchical access"

**Cause**: User trying to access org outside their hierarchy

**Solution**:
1. Verify user's organization memberships
2. Check if target org's `hierarchyPath` includes user's org
3. Ensure user has `admin` or higher role
4. Verify action type is allowed ('read' yes, 'write'/'delete' no)

### "Congress sharing not implemented"

**Cause**: Attempting to enable congress sharing before implementation

**Solution**:
- Use "federation" level instead
- Wait for congress membership system implementation
- Contact development team for timeline

## Future Enhancements

1. **Congress Membership System**
   - Congress membership table
   - Invitation/approval workflow
   - Congress-level RBAC

2. **Dynamic Hierarchy Caching**
   - Cache hierarchy paths in Redis
   - Invalidate on org structure changes
   - Reduce database lookups

3. **Audit Logging**
   - Log all hierarchical access attempts
   - Track federation sharing usage
   - Monitor unauthorized access attempts

4. **Granular Permissions**
   - Per-resource sharing controls
   - Custom sharing rules
   - Temporary access grants

## References

- RLS Implementation: `lib/db/with-rls-context.ts`
- Scanner Tool: `scripts/scan-rls-usage-v2.ts`
- Auth Module: `lib/api-auth-guard.ts`
- Test Suite: `__tests__/integration/tenant-isolation.test.ts`
