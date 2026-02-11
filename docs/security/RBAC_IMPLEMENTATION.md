# Role-Based Access Control (RBAC) Implementation

**Status:** âœ… Phase 1 Complete - Core RBAC Middleware Deployed  
**Date:** January 2025  
**Phase:** Phase 2, Area 3 - Enhanced RBAC

---

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented for the Union Claims Platform. The system enforces hierarchical role-based permissions at the API layer to ensure secure, tenant-aware operations.

## Role Hierarchy

The system implements four membership roles with increasing privilege levels:

| Role | Level | Description | Typical Use Case |
|------|-------|-------------|------------------|
| **member** | 1 | Base membership | Regular union members |
| **steward** | 2 | Union steward/representative | First-line support, can manage members |
| **officer** | 3 | Union officer | Department heads, section leaders |
| **admin** | 4 | Organization administrator | Full access, system configuration |

**Hierarchy Rules:**

- Higher level roles inherit all permissions from lower levels
- `admin` (level 4) can perform all operations
- `officer` (level 3) can perform steward and member operations
- `steward` (level 2) can perform member operations
- `member` (level 1) has base access

## Architecture

### Core Components

```
lib/
  role-middleware.ts      # Role authorization middleware
  tenant-middleware.ts    # Tenant context middleware (existing)

db/
  queries/
    organization-members-queries.ts  # getMemberByUserId()
  schema/
    organization-members-schema.ts   # role field: member|steward|officer|admin
```

### Data Model

**organization_members table:**

```typescript
{
  id: string (uuid)
  tenantId: string (uuid) // Foreign key to tenants
  userId: string          // Clerk user ID
  name: string
  email: string
  role: enum("member", "steward", "officer", "admin")  // â† Role field
  status: enum("active", "inactive", "on-leave")
  // ... other fields
}
```

### Middleware Flow

```
HTTP Request
    â†“
withRoleAuth('steward')          // Require steward+ role
    â†“
withTenantAuth()                 // Validate tenant context
    â†“
[Authenticate with Clerk]        // Get userId
    â†“
[Get tenantId from cookie]       // Current tenant
    â†“
[Query organization_members]     // Get user's member record
    â†“
[Check role >= required]         // Enforce role requirement
    â†“
Handler({ tenantId, userId, role, memberId })
```

## Middleware API

### `withRoleAuth(requiredRole, handler)`

Wraps API route handlers with role-based authorization.

**Parameters:**

- `requiredRole`: Minimum role required (`'member'` | `'steward'` | `'officer'` | `'admin'`)
- `handler`: Route handler function

**Context provided to handler:**

```typescript
interface RoleContext {
  tenantId: string;    // Current tenant ID
  userId: string;      // Clerk user ID
  role: MemberRole;    // User's role in this tenant
  memberId: string;    // User's member record ID
}
```

**Usage:**

```typescript
import { withRoleAuth } from '@/lib/role-middleware';

// Require steward or higher
export const POST = withRoleAuth('steward', async (request, context) => {
  const { tenantId, userId, role, memberId } = context;
  // Handler logic with guaranteed steward+ role
});
```

**Error Responses:**

- `403 Forbidden` - User not a member of organization
- `403 Forbidden` - User's role insufficient (includes role info in message)
- `500 Internal Server Error` - Database or system error

### `withAnyRole(allowedRoles, handler)`

Allows access if user has ANY of the specified roles (OR logic).

**Parameters:**

- `allowedRoles`: Array of allowed roles
- `handler`: Route handler function

**Usage:**

```typescript
import { withAnyRole } from '@/lib/role-middleware';

// Allow officers OR admins
export const POST = withAnyRole(['officer', 'admin'], async (request, context) => {
  // Handler logic
});
```

### Helper Functions

**`hasRolePermission(userRole, requiredRole): boolean`**

- Returns true if userRole meets or exceeds requiredRole
- Uses hierarchy levels for comparison

**`checkRole(context, requiredRole): boolean`**

- Check role within a handler (for conditional logic)

**`requireAdmin(context): void`**

- Throws error if not admin (use for admin-only sections in handlers)

## API Route Protection

### Current Implementation Status

| Endpoint | Method | Protected | Required Role | Status |
|----------|--------|-----------|---------------|--------|
| `/api/organization/members` | GET | âœ… | member | âœ… Complete |
| `/api/organization/members` | POST | âœ… | steward | âœ… Complete |
| `/api/members/[id]` | GET | âœ… | member | âœ… Complete |
| `/api/members/[id]` | PATCH | âœ… | steward | âœ… Complete |
| `/api/members/[id]/claims` | GET | âœ… | member | âœ… Complete |
| `/api/claims` | GET | â³ | member | Pending |
| `/api/claims` | POST | â³ | member | Pending |
| `/api/claims/[id]` | PATCH | â³ | steward | Pending |
| `/api/claims/[id]` | DELETE | â³ | officer | Pending |

**Legend:**

- âœ… Complete: Role-based auth implemented
- â³ Pending: Needs role-based auth
- ðŸš« Not Implemented: Endpoint doesn't exist yet

### Example Implementations

**Member List (All members can view):**

```typescript
// app/api/organization/members/route.ts
export const GET = withRoleAuth('member', async (request, context) => {
  const { tenantId } = context;
  const members = await getOrganizationMembers(tenantId);
  return NextResponse.json({ success: true, data: members });
});
```

**Create Member (Stewards and above):**

```typescript
// app/api/organization/members/route.ts
export const POST = withRoleAuth('steward', async (request, context) => {
  const { tenantId, role } = context;
  const body = await request.json();
  const newMember = await createMember({ ...body, tenantId });
  return NextResponse.json({ success: true, data: newMember });
});
```

**Update Member (Stewards and above):**

```typescript
// app/api/members/[id]/route.ts
export const PATCH = withRoleAuth('steward', async (request, context) => {
  const { tenantId } = context;
  const memberId = context.params?.id;
  const updates = await request.json();
  const updated = await updateMember(tenantId, memberId, updates);
  return NextResponse.json({ success: true, data: updated });
});
```

**Self-Access Pattern (View own vs. view all):**

```typescript
export const GET = withRoleAuth('member', async (request, context) => {
  const { tenantId, userId, role, memberId } = context;
  const targetId = context.params?.id;
  
  // Members can only view their own data
  if (role === 'member' && targetId !== memberId) {
    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  }
  
  // Stewards+ can view any member
  const member = await getMemberById(tenantId, targetId);
  return NextResponse.json({ success: true, data: member });
});
```

## Permission Model Mapping

Our database uses simple role enums. These map conceptually to the application's Permission enum defined in `lib/auth/roles.ts`:

| Member Role | Key Permissions |
|-------------|----------------|
| **member** | VIEW_OWN_CLAIMS, CREATE_CLAIM, EDIT_OWN_CLAIMS, VIEW_ALL_MEMBERS |
| **steward** | + EDIT_MEMBER, INVITE_MEMBER, VIEW_ALL_CLAIMS, ASSIGN_CLAIMS |
| **officer** | + APPROVE_CLAIM, MANAGE_VOTING, VIEW_ANALYTICS |
| **admin** | + MANAGE_USERS, MANAGE_ROLES, SYSTEM_SETTINGS, EDIT_ALL_CLAIMS |

**Note:** Currently using role-based checks. Full permission-based system (RBAC.hasPermission()) available in `packages/auth/rbac/` if needed for fine-grained control.

## Security Considerations

### Tenant Isolation

- All role checks happen AFTER tenant validation
- Users can only access resources within their current tenant
- Role is tenant-specific (user may have different roles in different tenants)

### Role Assignment

- Only admins should be able to change roles (enforce in PATCH handler)
- Role changes should be logged for audit trail
- Default new members get `member` role

### Privilege Escalation Prevention

```typescript
// In member update handler
export const PATCH = withRoleAuth('steward', async (request, context) => {
  const { role: currentUserRole } = context;
  const updates = await request.json();
  
  // Prevent stewards from assigning admin/officer roles
  if (updates.role && !checkRole(context, 'admin')) {
    // Only admins can change roles
    delete updates.role;
  }
  
  // Continue with safe updates...
});
```

### Error Messages

- Don't expose internal system details
- Include user's current role to aid troubleshooting
- Log unauthorized access attempts

## Testing

### Unit Tests Needed

**Role Hierarchy Tests:**

```typescript
describe('hasRolePermission', () => {
  it('admin can access member endpoints', () => {
    expect(hasRolePermission('admin', 'member')).toBe(true);
  });
  
  it('member cannot access admin endpoints', () => {
    expect(hasRolePermission('member', 'admin')).toBe(false);
  });
  
  it('steward can access steward endpoints', () => {
    expect(hasRolePermission('steward', 'steward')).toBe(true);
  });
});
```

### Integration Tests

**Role Enforcement:**

```typescript
describe('POST /api/organization/members', () => {
  it('allows steward to create members', async () => {
    // Mock user with steward role
    const response = await POST(mockRequest, mockStewardContext);
    expect(response.status).toBe(201);
  });
  
  it('denies regular member from creating members', async () => {
    // Mock user with member role
    const response = await POST(mockRequest, mockMemberContext);
    expect(response.status).toBe(403);
  });
});
```

### Manual Testing Checklist

- [ ] Create member with each role (member, steward, officer, admin)
- [ ] Test each protected endpoint with each role
- [ ] Verify 403 errors include helpful messages
- [ ] Test cross-tenant access blocked
- [ ] Test role changes take effect immediately
- [ ] Test non-member users get 403
- [ ] Test member self-access vs. steward access patterns

## Migration Path

### Phase 1: Core Middleware âœ… COMPLETE

- [x] Create role-middleware.ts
- [x] Add getMemberByUserId query
- [x] Protect member API routes
- [x] Document implementation

### Phase 2: Expand Coverage â³ NEXT

- [ ] Protect claims API routes
- [ ] Protect voting API routes
- [ ] Protect CBA/contract API routes
- [ ] Add role checks to frontend components

### Phase 3: UI Integration

- [ ] Show current user role in dashboard
- [ ] Hide/disable actions based on role
- [ ] Create role management admin page
- [ ] Add role change audit logging

### Phase 4: Advanced Features

- [ ] Temporary role delegation
- [ ] Role-based dashboard views
- [ ] Permission-based feature flags
- [ ] Role analytics dashboard

## Frontend Integration

### Checking User Role in Components

```typescript
// Using RoleContext (to be implemented)
import { useRole } from '@/lib/hooks/useRole';

function MemberActions() {
  const { role, hasRole } = useRole();
  
  return (
    <>
      {/* All members see this */}
      <ViewProfileButton />
      
      {/* Only stewards+ see this */}
      {hasRole('steward') && <EditMemberButton />}
      
      {/* Only admins see this */}
      {role === 'admin' && <DeleteMemberButton />}
    </>
  );
}
```

### Role-Based Routing

```typescript
// middleware.ts (Next.js middleware)
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Admin-only routes
  if (pathname.startsWith('/dashboard/admin')) {
    const userRole = await getUserRole();
    if (userRole !== 'admin') {
      return NextResponse.redirect('/dashboard');
    }
  }
}
```

## Troubleshooting

### Common Issues

**"Forbidden - User is not a member of this organization"**

- User doesn't have a record in organization_members for current tenant
- Verify tenant switching worked correctly
- Check if member was soft-deleted (deletedAt not null)

**"Forbidden - steward role or higher required. Your role: member"**

- User authenticated but lacks required role
- This is expected behavior - user needs role upgrade
- Contact admin to change role

**Role changes not taking effect**

- Check if organization_members record was updated
- No caching currently - changes should be immediate
- Verify correct tenantId in update query

### Debug Mode

```typescript
// Add to role-middleware.ts for debugging
if (process.env.NODE_ENV === 'development') {
}
```

## Future Enhancements

### Permission-Based System

Currently using simple role hierarchy. For fine-grained control, integrate with `packages/auth/rbac/`:

```typescript
import { RBAC, Permission } from '@/packages/auth/rbac';

export const POST = withRoleAuth('member', async (request, context) => {
  const { role } = context;
  
  // Check specific permission instead of role
  if (!RBAC.hasPermission(role, Permission.CREATE_CLAIM)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  
  // Handler logic
});
```

### Multi-Role Support

Allow members to hold multiple roles (e.g., steward in one department, member in another):

```typescript
interface RoleContext {
  tenantId: string;
  userId: string;
  roles: MemberRole[];      // Multiple roles
  primaryRole: MemberRole;  // Highest role
  memberId: string;
}
```

### Audit Logging

Track role-based actions for compliance:

```typescript
await logRoleAction({
  userId: context.userId,
  role: context.role,
  action: 'CREATE_MEMBER',
  resourceId: newMember.id,
  tenantId: context.tenantId,
  timestamp: new Date()
});
```

---

## Summary

**What We Built:**

- Hierarchical role system (member < steward < officer < admin)
- Role-based middleware (`withRoleAuth`, `withAnyRole`)
- Protected member API routes with role enforcement
- Tenant-aware role context

**Security Posture:**

- âœ… Tenant isolation maintained
- âœ… Role hierarchy enforced
- âœ… Helpful error messages
- âœ… Database-backed role storage

**Next Steps:**

1. Protect remaining API routes (claims, voting, contracts)
2. Add role management UI for admins
3. Create role-aware React hooks for frontend
4. Add comprehensive test coverage

**Key Files:**

- `lib/role-middleware.ts` - Core RBAC middleware
- `db/schema/organization-members-schema.ts` - Role field definition
- `app/api/organization/members/route.ts` - Protected member APIs
- `app/api/members/[id]/route.ts` - Protected member detail APIs

---

*Last Updated: January 2025*  
*Version: 1.0*  
*Status: Production Ready - Phase 1*
