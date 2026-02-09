# Role-Based Access Control (RBAC) System

## Overview

The UnionEyes RBAC system provides fine-grained access control for union management features. It supports multiple user roles with different permission levels, ensuring secure and appropriate access to sensitive union data and operations.

## User Roles

### 1. Admin

**Highest privilege level** - Full system access

**Capabilities:**

- All claims management (view, create, edit, delete, approve)
- Full member management (view, edit, delete, invite)
- Complete voting administration (create, manage, view results)
- CBA Intelligence (view, edit, create, delete)
- Advanced analytics and reporting
- System settings and configuration
- User role management
- Access to admin panel

**Use Cases:**

- Union Executive Board members
- System administrators
- IT staff

### 2. Union Rep (union_rep)

**High privilege level** - Broad operational access

**Capabilities:**

- All claims management (view, create, edit, approve)
- Full member management (view, edit, invite)
- Voting administration (create, manage, view results)
- CBA Intelligence (view, edit, create)
- Advanced analytics
- Cannot access system settings
- Cannot manage user roles

**Use Cases:**

- Union representatives
- Shop stewards
- Labor Relations Officers (LRO)

### 3. Staff Rep (staff_rep)

**Moderate privilege level** - Departmental support

**Capabilities:**

- View all claims and own claims management
- View all members and own profile
- View and participate in voting
- View CBA Intelligence
- View basic analytics
- Cannot approve claims
- Cannot manage users
- Cannot create votes

**Use Cases:**

- Department representatives
- Union stewards
- Committee members

### 4. Member

**Standard privilege level** - Self-service access

**Capabilities:**

- View and manage own claims only
- Create new claims
- View own profile
- Participate in voting
- View CBA Intelligence
- Cannot see other members' data
- Cannot access admin features
- Cannot view analytics

**Use Cases:**

- Regular union members
- Employees represented by the union

### 5. Guest

**Minimal privilege level** - Limited read-only access

**Capabilities:**

- View own profile only
- No access to claims, voting, or other features
- Used for temporary or pending accounts

**Use Cases:**

- Newly registered users pending approval
- Temporary observers
- Accounts pending activation

## Permission Matrix

| Feature | Admin | Union Rep | Staff Rep | Member | Guest |
|---------|-------|-----------|-----------|--------|-------|
| **Claims** |
| View All Claims | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Own Claims | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Claim | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit All Claims | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Own Claims | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Claims | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Claims | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Members** |
| View All Members | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Members | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Voting** |
| View Voting | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Vote | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cast Vote | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Voting | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Results | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CBA Intelligence** |
| View CBA | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit CBA | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create CBA | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete CBA | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Analytics** |
| View Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Advanced Analytics | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Administration** |
| Admin Panel | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ |

## Route Access Control

### Dashboard Routes

- `/dashboard` - All authenticated users
- `/dashboard/claims` - Member and above
- `/dashboard/members` - Staff Rep and above
- `/dashboard/voting` - Member and above (cast votes) / Union Rep and above (manage)
- `/dashboard/collective-agreements` - Member and above
- `/dashboard/analytics` - Staff Rep and above
- `/dashboard/settings` - All authenticated users

### Admin Routes (Union Rep and above)

- `/admin` - Union Rep, Admin
- `/admin/claims` - Union Rep, Admin
- `/admin/members` - Admin only
- `/admin/voting` - Union Rep, Admin
- `/admin/analytics` - Union Rep, Admin
- `/admin/settings` - Admin only

## Implementation Guide

### Server-Side Protection

#### 1. Page-Level Guards

```typescript
import { requirePermission } from '@/lib/auth/rbac-server';
import { Permission } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  try {
    await requirePermission(Permission.VIEW_ALL_CLAIMS);
  } catch (error) {
    redirect('/dashboard?error=unauthorized');
  }
  
  // Page content
}
```

#### 2. Layout-Level Guards

```typescript
import { requireAuth } from '@/lib/auth/rbac-server';
import { UserRole, hasPermission, Permission } from '@/lib/auth/roles';

export default async function AdminLayout({ children }) {
  const { role } = await requireAuth();
  
  if (!hasPermission(role, Permission.VIEW_ADMIN_PANEL)) {
    redirect('/dashboard?error=unauthorized');
  }
  
  return <div>{children}</div>;
}
```

#### 3. API Route Protection

```typescript
import { requirePermission } from '@/lib/auth/rbac-server';
import { Permission } from '@/lib/auth/roles';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId, role } = await requirePermission(Permission.VIEW_ALL_CLAIMS);
    
    // API logic
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }
}
```

### Client-Side UI Control

#### 1. Conditional Navigation

```typescript
'use client';

import { useUserRole } from '@/lib/auth/rbac-hooks';
import { Permission, hasPermission } from '@/lib/auth/roles';

export function Sidebar() {
  const { role } = useUserRole();
  
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', permission: null },
    { href: '/dashboard/members', label: 'Members', permission: Permission.VIEW_ALL_MEMBERS },
  ].filter(item => !item.permission || hasPermission(role, item.permission));
  
  return <nav>{/* Render filtered items */}</nav>;
}
```

#### 2. Conditional Features

```typescript
import { useHasPermission } from '@/lib/auth/rbac-hooks';
import { Permission } from '@/lib/auth/roles';

export function ClaimActions() {
  const canApprove = useHasPermission(Permission.APPROVE_CLAIM);
  
  return (
    <div>
      {canApprove && <button>Approve Claim</button>}
    </div>
  );
}
```

#### 3. Role-Based Rendering

```typescript
import { useIsAdmin, useIsUnionRepOrHigher } from '@/lib/auth/rbac-hooks';

export function AdminFeatures() {
  const isAdmin = useIsAdmin();
  const isUnionRep = useIsUnionRepOrHigher();
  
  if (isAdmin) return <FullAdminPanel />;
  if (isUnionRep) return <UnionRepPanel />;
  return <MemberView />;
}
```

## Setting User Roles

### Method 1: Database (Recommended)

User roles are stored in the `user_management.tenant_users` table:

```sql
-- Set user role
UPDATE user_management.tenant_users
SET role = 'admin'
WHERE user_id = 'user_xxxxx';

-- Available roles: 'admin', 'union_rep', 'staff_rep', 'member', 'guest'
```

### Method 2: Clerk Metadata (Alternative)

Set `publicMetadata.role` in Clerk Dashboard or API:

```javascript
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: {
    role: 'admin'
  }
});
```

## Migration Guide

### Upgrading Existing Users

```sql
-- Grant admin role to specific users
UPDATE user_management.tenant_users
SET role = 'admin'
WHERE email IN ('admin@union.com', 'lro@union.com');

-- Set union reps
UPDATE user_management.tenant_users
SET role = 'union_rep'
WHERE email IN ('rep1@union.com', 'rep2@union.com');

-- Default all others to member
UPDATE user_management.tenant_users
SET role = 'member'
WHERE role IS NULL OR role = '';
```

## Security Best Practices

1. **Always validate on server-side**: Client-side checks are for UX only
2. **Use specific permissions**: Prefer permission checks over role checks
3. **Fail securely**: Default to denying access on errors
4. **Audit role changes**: Log all role modifications
5. **Regular reviews**: Periodically audit user roles and access
6. **Principle of least privilege**: Grant minimum necessary permissions
7. **Separate admin actions**: Use confirmation dialogs for destructive operations

## Troubleshooting

### User sees "Unauthorized" error

- Check user's role in database: `SELECT * FROM user_management.tenant_users WHERE user_id = 'xxx'`
- Verify role is set correctly (lowercase: admin, union_rep, staff_rep, member, guest)
- Check Clerk metadata if database role is missing
- Confirm user is authenticated

### Navigation items not showing

- Verify role is loaded: Check browser console for role fetch errors
- Check API route `/api/auth/role` returns correct role
- Ensure navigation component is using `useUserRole()` hook
- Clear browser cache and reload

### Permission denied on API routes

- Verify API route uses `requirePermission()` guard
- Check permission matches role (see permission matrix above)
- Confirm authentication token is valid
- Review server logs for detailed error messages

## API Reference

### Server Functions

- `getUserRole(userId: string): Promise<UserRole>`
- `getCurrentUserRole(): Promise<UserRole | null>`
- `requireAuth(): Promise<{ userId, role }>`
- `requirePermission(permission: Permission): Promise<{ userId, role }>`
- `requireAdmin(): Promise<{ userId, role }>`
- `requireUnionRepOrHigher(): Promise<{ userId, role }>`

### Client Hooks

- `useUserRole(): { role, loading, isLoaded }`
- `useHasPermission(permission: Permission): boolean`
- `useHasAnyPermission(permissions: Permission[]): boolean`
- `useHasAllPermissions(permissions: Permission[]): boolean`
- `useCanAccessRoute(route: string): boolean`
- `useIsAdmin(): boolean`
- `useIsUnionRepOrHigher(): boolean`
- `useIsStaffRepOrHigher(): boolean`

### Utility Functions

- `hasPermission(role: UserRole, permission: Permission): boolean`
- `hasAnyPermission(role: UserRole, permissions: Permission[]): boolean`
- `hasAllPermissions(role: UserRole, permissions: Permission[]): boolean`
- `canAccessRoute(role: UserRole, route: string): boolean`
- `getAccessibleNavItems(role: UserRole, adminMode: boolean): NavItem[]`
- `getRoleLevel(role: UserRole): number`
- `hasHigherOrEqualRole(role1: UserRole, role2: UserRole): boolean`

## Testing

### Manual Testing Checklist

For each role (Admin, Union Rep, Staff Rep, Member, Guest):

1. ✅ Login with test user
2. ✅ Verify dashboard loads
3. ✅ Check navigation items visibility
4. ✅ Test accessible pages load correctly
5. ✅ Verify restricted pages redirect to dashboard
6. ✅ Test API endpoints return correct data/errors
7. ✅ Verify actions (create, edit, delete) work as expected
8. ✅ Test unauthorized action shows proper error message

### Automated Testing

```typescript
// Example test
describe('RBAC System', () => {
  it('admin can access admin panel', async () => {
    const role = UserRole.ADMIN;
    expect(hasPermission(role, Permission.VIEW_ADMIN_PANEL)).toBe(true);
  });
  
  it('member cannot access admin panel', async () => {
    const role = UserRole.MEMBER;
    expect(hasPermission(role, Permission.VIEW_ADMIN_PANEL)).toBe(false);
  });
});
```

## Future Enhancements

1. **Custom Roles**: Allow unions to define custom roles
2. **Permission Templates**: Pre-configured permission sets
3. **Time-Based Access**: Temporary role assignments
4. **Delegation**: Allow admins to temporarily delegate permissions
5. **Audit Log**: Complete audit trail of role changes and access attempts
6. **Multi-Tenancy**: Separate roles per union/tenant
7. **API Scopes**: OAuth-style scopes for third-party integrations

## Support

For questions or issues with the RBAC system:

- Review this documentation
- Check server logs for detailed error messages
- Verify database schema is up to date
- Contact system administrator for role assignments
