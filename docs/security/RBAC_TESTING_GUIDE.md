# RBAC Testing Guide

**Union Claims Management System**

## ✅ Build Status

**Build Completed Successfully!**

- ✅ TypeScript compilation: 0 errors
- ✅ Import resolution: All paths correct (`@/db/db` fix applied)
- ✅ All 36 pages generated
- ✅ API route `/api/auth/role` compiles successfully
- ✅ Dev server running at <http://localhost:3000>

## 🎯 What Was Implemented

### Role System

- **5 User Roles**: Admin → Union Rep → Staff Rep → Member → Guest (hierarchical)
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

## 🧪 Manual Testing Steps

### Step 1: Test Current User Role

1. Navigate to <http://localhost:3000>
2. Open browser DevTools (F12) → Console
3. Run: `fetch('/api/auth/role').then(r => r.json()).then(console.log)`
4. Expected output: `{ userId: "user_...", role: "...", success: true }`

**Current User**: `user_35NlrrNcfTv0DMh2kzBHyXZRtpb`
**Role**: Check database or Clerk metadata

### Step 2: Set Test User Roles (Admin Required)

Connect to your database and run:

```sql
-- Check current role
SELECT user_id, role, created_at 
FROM user_management.tenant_users 
WHERE user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';

-- Set role to admin (for initial testing)
UPDATE user_management.tenant_users 
SET role = 'admin' 
WHERE user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb';

-- Create additional test users (replace with actual user IDs)
-- Union Rep
UPDATE user_management.tenant_users 
SET role = 'union_rep' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';

-- Staff Rep
UPDATE user_management.tenant_users 
SET role = 'staff_rep' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';

-- Member
UPDATE user_management.tenant_users 
SET role = 'member' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';

-- Guest
UPDATE user_management.tenant_users 
SET role = 'guest' 
WHERE user_id = 'user_REPLACE_WITH_ACTUAL_ID';
```

### Step 3: Test Navigation Visibility

Refresh the page after setting role. Check sidebar navigation:

#### Admin Role

Expected navigation items:

- ✅ Dashboard
- ✅ My Claims
- ✅ Collective Agreements
- ✅ Voting
- ✅ Members
- ✅ Analytics
- ✅ Settings
- ✅ Admin Panel (click to access admin routes)

#### Union Rep Role

Expected navigation items:

- ✅ Dashboard
- ✅ My Claims
- ✅ Collective Agreements
- ✅ Voting
- ✅ Members
- ✅ Analytics
- ✅ Settings
- ✅ Admin Panel

#### Staff Rep Role

Expected navigation items:

- ✅ Dashboard
- ✅ My Claims
- ✅ Collective Agreements
- ✅ Voting
- ✅ Members
- ✅ Analytics
- ✅ Settings
- ❌ Admin Panel (should NOT appear)

#### Member Role

Expected navigation items:

- ✅ Dashboard
- ✅ My Claims
- ✅ Collective Agreements
- ✅ Voting
- ✅ Settings
- ❌ Members (should NOT appear)
- ❌ Analytics (should NOT appear)
- ❌ Admin Panel (should NOT appear)

#### Guest Role

Expected navigation items:

- ✅ Dashboard (view only)
- ✅ Collective Agreements (view only)
- ❌ My Claims (should NOT appear)
- ❌ Voting (should NOT appear)
- ❌ Members (should NOT appear)
- ❌ Analytics (should NOT appear)
- ❌ Settings (should NOT appear)
- ❌ Admin Panel (should NOT appear)

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
fetch('/api/auth/role').then(r => r.json()).then(console.log);

// Test claims endpoint (requires authentication)
fetch('/api/claims?limit=5').then(r => r.json()).then(console.log);

// Test analytics endpoint (requires VIEW_ANALYTICS permission)
fetch('/api/analytics/dashboard?timeRange=30').then(r => r.json()).then(console.log);
```

Expected:

- Authenticated requests return data
- Unauthenticated requests return 401 Unauthorized
- Insufficient permissions redirect or return error

## 📋 Test Checklist

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

## 🚨 Known Issues & Pending Work

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

## 🔐 Security Best Practices

✅ **Always validate on server-side** - Client checks are UX, server checks are security
✅ **Check permissions per action** - Don't just check role, check specific permission
✅ **Use requirePermission()** in all protected pages and API routes
✅ **Never expose sensitive data** in API responses for unauthorized users
✅ **Log permission failures** for security monitoring
✅ **Use role hierarchy** - Avoid hardcoding specific roles, use permissions

## 📚 Additional Resources

- **Complete Documentation**: `/docs/RBAC_DOCUMENTATION.md`
- **Role Definitions**: `/lib/auth/roles.ts`
- **Server Utilities**: `/lib/auth/rbac-server.ts`
- **Client Hooks**: `/lib/auth/rbac-hooks.ts`
- **API Route**: `/app/api/auth/role/route.ts`

## 🎉 Quick Start Testing

1. **Set your role to admin** (see Step 2 SQL)
2. **Refresh browser** (<http://localhost:3000>)
3. **Open browser console** (F12)
4. **Run**: `fetch('/api/auth/role').then(r => r.json()).then(console.log)`
5. **Verify**: Should see `{ role: "admin", ... }`
6. **Check sidebar**: Should see all 8 navigation items including "Admin Panel"
7. **Click through pages**: All should load without errors
8. **Try unauthorized access**: Change role to "member", try accessing /admin
9. **Expected**: Redirected to dashboard with error parameter

## 🐛 Troubleshooting

### Role API Returns Null/Error

- Check: User exists in `tenant_users` table
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
- Debug: Add console.log in rbac-server.ts to see which permission is checked

## ✅ Success Criteria

**RBAC is working correctly when:**

1. ✅ Build completes with 0 TypeScript errors
2. ✅ Dev server starts without MODULE_NOT_FOUND errors
3. ✅ API endpoint `/api/auth/role` returns user's role
4. ✅ Sidebar shows different items for different roles
5. ✅ Protected pages redirect unauthorized users
6. ✅ Role hierarchy is enforced (Admin > Union Rep > Staff Rep > Member > Guest)
7. ✅ API routes require proper permissions
8. ✅ No console errors related to role checking

**You're ready for production when:**

- All pending page guards are added
- All manual tests pass for all 5 roles
- Role assignment process is documented
- Security audit is completed
- Performance testing shows no slowdowns from permission checks

---

**Current Status**: ✅ **Core RBAC Implementation Complete - Ready for Testing**

Last Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
