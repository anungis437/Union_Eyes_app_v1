# RBAC Testing Guide

**Union Claims Management System**

## Ã¢Å“â€¦ Build Status

**Build Completed Successfully!**

- Ã¢Å“â€¦ TypeScript compilation: 0 errors
- Ã¢Å“â€¦ Import resolution: All paths correct (`@/db/db` fix applied)
- Ã¢Å“â€¦ All 36 pages generated
- Ã¢Å“â€¦ API route `/api/auth/role` compiles successfully
- Ã¢Å“â€¦ Dev server running at <http://localhost:3000>

## Ã°Å¸Å½Â¯ What Was Implemented

### Role System

- **5 User Roles**: Admin Ã¢â€ â€™ Union Rep Ã¢â€ â€™ Staff Rep Ã¢â€ â€™ Member Ã¢â€ â€™ Guest (hierarchical)
- **40+ Permissions**: Granular control over features (claims, members, voting, CBA, analytics, etc.)
- **Role Hierarchy**: Higher roles inherit lower role permissions

### Protection Layers

1. **Layout-level**: Admin layout checks `VIEW_ADMIN_PANEL` permission
2. **Page-level**: Individual pages check specific permissions
3. **API-level**: API routes protected with `requirePermission()`
4. **Client-level**: Navigation dynamically filtered by user role

### Files Created

- `lib/auth/roles.ts` - Role definitions, permissions, utilities
- `lib/auth/rbac-server.ts` - Server-side role checking
- `lib/auth/rbac-hooks.ts` - React hooks for client-side checks
- `app/api/auth/role/route.ts` - API endpoint to fetch user roles
- `docs/RBAC_DOCUMENTATION.md` - Complete documentation

### Files Modified

- `app/admin/layout.tsx` - Added admin permission check
- `components/sidebar.tsx` - Dynamic navigation filtering
- `app/dashboard/members/page.tsx` - Added VIEW_ALL_MEMBERS guard
- `app/voting/page.tsx` - Added VIEW_VOTING guard
- `app/admin/members/page.tsx` - Added MANAGE_USERS guard
- `app/admin/voting/page.tsx` - Added MANAGE_VOTING guard

## Ã°Å¸Â§Âª Manual Testing Steps

### Step 1: Test Current User Role

1. Navigate to <http://localhost:3000>
2. Open browser DevTools (F12) Ã¢â€ â€™ Console
3. Run: `fetch('/api/auth/role').then(r => r.json()).then(logger.info)`
4. Expected output: `{ userId: "user_...", role: "...", success: true }`

**Current User**: `user_35NlrrNcfTv0DMh2kzBHyXZRtpb`
**Role**: Check database or Clerk metadata

### Step 2: Set Test User Roles (Admin Required)

Connect to your database and run:

```sql
-- Check current role
SELECT user_id, role, created_at 
FROM user_management.organization_users 
WHERE user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';

-- Set role to admin (for initial testing)
UPDATE user_management.organization_users 
SET role = 'admin' 
WHERE user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';

-- Create additional test users (replace with actual user IDs)
-- Union Rep
UPDATE user_management.organization_users 
SET role = 'union_rep' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';

-- Staff Rep
UPDATE user_management.organization_users 
SET role = 'staff_rep' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';

-- Member
UPDATE user_management.organization_users 
SET role = 'member' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';

-- Guest
UPDATE user_management.organization_users 
SET role = 'guest' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';
```

### Step 3: Test Navigation Visibility

Refresh the page after setting role. Check sidebar navigation:

#### Admin Role

Expected navigation items:

- Ã¢Å“â€¦ Dashboard
- Ã¢Å“â€¦ My Claims
- Ã¢Å“â€¦ Collective Agreements
- Ã¢Å“â€¦ Voting
- Ã¢Å“â€¦ Members
- Ã¢Å“â€¦ Analytics
- Ã¢Å“â€¦ Settings
- Ã¢Å“â€¦ Admin Panel (click to access admin routes)

#### Union Rep Role

Expected navigation items:

- Ã¢Å“â€¦ Dashboard
- Ã¢Å“â€¦ My Claims
- Ã¢Å“â€¦ Collective Agreements
- Ã¢Å“â€¦ Voting
- Ã¢Å“â€¦ Members
- Ã¢Å“â€¦ Analytics
- Ã¢Å“â€¦ Settings
- Ã¢Å“â€¦ Admin Panel

#### Staff Rep Role

Expected navigation items:

- Ã¢Å“â€¦ Dashboard
- Ã¢Å“â€¦ My Claims
- Ã¢Å“â€¦ Collective Agreements
- Ã¢Å“â€¦ Voting
- Ã¢Å“â€¦ Members
- Ã¢Å“â€¦ Analytics
- Ã¢Å“â€¦ Settings
- Ã¢ÂÅ’ Admin Panel (should NOT appear)

#### Member Role

Expected navigation items:

- Ã¢Å“â€¦ Dashboard
- Ã¢Å“â€¦ My Claims
- Ã¢Å“â€¦ Collective Agreements
- Ã¢Å“â€¦ Voting
- Ã¢Å“â€¦ Settings
- Ã¢ÂÅ’ Members (should NOT appear)
- Ã¢ÂÅ’ Analytics (should NOT appear)
- Ã¢ÂÅ’ Admin Panel (should NOT appear)

#### Guest Role

Expected navigation items:

- Ã¢Å“â€¦ Dashboard (view only)
- Ã¢Å“â€¦ Collective Agreements (view only)
- Ã¢ÂÅ’ My Claims (should NOT appear)
- Ã¢ÂÅ’ Voting (should NOT appear)
- Ã¢ÂÅ’ Members (should NOT appear)
- Ã¢ÂÅ’ Analytics (should NOT appear)
- Ã¢ÂÅ’ Settings (should NOT appear)
- Ã¢ÂÅ’ Admin Panel (should NOT appear)

### Step 4: Test Page Access Control

Try accessing these URLs directly (while logged in as different roles):

#### Admin-Only Pages

- `/admin` - Only Admin and Union Rep
- `/admin/members` - Only Admin
- `/admin/voting` - Only Admin and Union Rep
- `/admin/claims` - Only Admin and Union Rep

#### Staff Rep and Above Pages

- `/dashboard/members` - Staff Rep, Union Rep, Admin
- `/dashboard/analytics` - Staff Rep, Union Rep, Admin (TODO: Add guard)

#### Member and Above Pages

- `/voting` - Member, Staff Rep, Union Rep, Admin
- `/dashboard/collective-agreements` - All authenticated users

**Expected Behavior**:

- Unauthorized access should redirect to `/dashboard?error=unauthorized`
- Check URL bar for error parameter
- User should see dashboard instead of restricted page

### Step 5: Test API Endpoints

Use browser console or Postman:

```javascript
// Test role endpoint
fetch('/api/auth/role').then(r => r.json()).then(logger.info);

// Test claims endpoint (requires authentication)
fetch('/api/claims?limit=5').then(r => r.json()).then(logger.info);

// Test analytics endpoint (requires VIEW_ANALYTICS permission)
fetch('/api/analytics/dashboard?timeRange=30').then(r => r.json()).then(logger.info);
```

Expected:

- Authenticated requests return data
- Unauthenticated requests return 401 Unauthorized
- Insufficient permissions redirect or return error

## Ã°Å¸â€œâ€¹ Test Checklist

### Navigation Tests

- [ ] Admin sees all 8 nav items (including Admin Panel)
- [ ] Union Rep sees all 8 nav items
- [ ] Staff Rep sees 7 nav items (no Admin Panel)
- [ ] Member sees 5 nav items (Dashboard, Claims, CBA, Voting, Settings)
- [ ] Guest sees 2 nav items (Dashboard, CBA)

### Access Control Tests

- [ ] Admin can access all pages
- [ ] Union Rep can access /admin but not /admin/members
- [ ] Staff Rep CANNOT access /admin
- [ ] Member CANNOT access /dashboard/members
- [ ] Member CANNOT access /dashboard/analytics
- [ ] Guest CANNOT access /voting
- [ ] Unauthorized access redirects to dashboard

### API Tests

- [ ] /api/auth/role returns correct role
- [ ] /api/claims requires authentication
- [ ] /api/analytics/* requires VIEW_ANALYTICS permission
- [ ] Unauthenticated requests return 401

### Role Hierarchy Tests

- [ ] Admin has all permissions
- [ ] Union Rep has most permissions (except user management)
- [ ] Staff Rep cannot manage voting or users
- [ ] Member has basic permissions only
- [ ] Guest has view-only permissions

## Ã°Å¸Å¡Â¨ Known Issues & Pending Work

### Pending Guards

The following pages still need permission guards added:

```typescript
// app/dashboard/analytics/page.tsx
// TODO: Add requirePermission(Permission.VIEW_ANALYTICS)

// app/dashboard/collective-agreements/page.tsx
// TODO: Add requirePermission(Permission.VIEW_CBA)

// app/dashboard/collective-agreements/[id]/page.tsx
// TODO: Add permission check for specific CBA access
```

### Future Enhancements

1. **Middleware Enhancement**: Add role-based routing in middleware.ts
2. **Permission Caching**: Cache user permissions in React Context
3. **Audit Logging**: Log permission checks for security audit
4. **Role Management UI**: Admin interface to assign roles
5. **Bulk Operations**: Protect bulk actions (delete, export) separately
6. **Feature Flags**: Combine RBAC with feature flags
7. **Custom Permissions**: Allow creating custom permissions per tenant

## Ã°Å¸â€Â Security Best Practices

Ã¢Å“â€¦ **Always validate on server-side** - Client checks are UX, server checks are security
Ã¢Å“â€¦ **Check permissions per action** - Don't just check role, check specific permission
Ã¢Å“â€¦ **Use requirePermission()** in all protected pages and API routes
Ã¢Å“â€¦ **Never expose sensitive data** in API responses for unauthorized users
Ã¢Å“â€¦ **Log permission failures** for security monitoring
Ã¢Å“â€¦ **Use role hierarchy** - Avoid hardcoding specific roles, use permissions

## Ã°Å¸â€œÅ¡ Additional Resources

- **Complete Documentation**: `/docs/RBAC_DOCUMENTATION.md`
- **Role Definitions**: `/lib/auth/roles.ts`
- **Server Utilities**: `/lib/auth/rbac-server.ts`
- **Client Hooks**: `/lib/auth/rbac-hooks.ts`
- **API Route**: `/app/api/auth/role/route.ts`

## Ã°Å¸Å½â€° Quick Start Testing

1. **Set your role to admin** (see Step 2 SQL)
2. **Refresh browser** (<http://localhost:3000>)
3. **Open browser console** (F12)
4. **Run**: `fetch('/api/auth/role').then(r => r.json()).then(logger.info)`
5. **Verify**: Should see `{ role: "admin", ... }`
6. **Check sidebar**: Should see all 8 navigation items including "Admin Panel"
7. **Click through pages**: All should load without errors
8. **Try unauthorized access**: Change role to "member", try accessing /admin
9. **Expected**: Redirected to dashboard with error parameter

## Ã°Å¸Ââ€º Troubleshooting

### Role API Returns Null/Error

- Check: User exists in `organization_users` table
- Check: `role` column is not NULL
- Check: Clerk publicMetadata has `role` property
- Fix: Set role in database or Clerk

### Navigation Not Filtering

- Check: Browser console for errors
- Check: `useUserRole()` hook loading state
- Refresh: Clear cache and hard reload (Ctrl+Shift+R)
- Verify: Role API endpoint returns correct role

### Page Shows 500 Error

- Check: Terminal logs for stack trace
- Verify: All imports use correct paths (`@/db/db` not `@/db`)
- Check: Database connection is working
- Check: Environment variables are set

### Redirects Not Working

- Check: Role has required permission in `ROLE_PERMISSIONS` mapping
- Verify: Route permission mapping in `ROUTE_PERMISSIONS`
- Check: Page has `requirePermission()` guard
- Debug: Add console log in rbac-server.ts to see which permission is checked

## Ã¢Å“â€¦ Success Criteria

**RBAC is working correctly when:**

1. Ã¢Å“â€¦ Build completes with 0 TypeScript errors
2. Ã¢Å“â€¦ Dev server starts without MODULE_NOT_FOUND errors
3. Ã¢Å“â€¦ API endpoint `/api/auth/role` returns user's role
4. Ã¢Å“â€¦ Sidebar shows different items for different roles
5. Ã¢Å“â€¦ Protected pages redirect unauthorized users
6. Ã¢Å“â€¦ Role hierarchy is enforced (Admin > Union Rep > Staff Rep > Member > Guest)
7. Ã¢Å“â€¦ API routes require proper permissions
8. Ã¢Å“â€¦ No console errors related to role checking

**You're ready for production when:**

- All pending page guards are added
- All manual tests pass for all 5 roles
- Role assignment process is documented
- Security audit is completed
- Performance testing shows no slowdowns from permission checks

---

**Current Status**: Ã¢Å“â€¦ **Core RBAC Implementation Complete - Ready for Testing**

Last Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
