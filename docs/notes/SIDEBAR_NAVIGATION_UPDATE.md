# Sidebar Navigation Update - UnionEyes

## Summary

Updated the sidebar navigation component to support role-based access for UnionEyes union management stakeholders.

## Date

Current session

## Changes Made

### 1. Sidebar Component (`components/sidebar.tsx`)

#### Updated Imports

Added union-specific icons:

- `FileText` - Claims documentation
- `Vote` - Voting system
- `BookOpen` - Collective agreements
- `Shield` - Administration/Security
- `BarChart3` - Analytics
- `Mic` - Voice submission
- `FileBarChart` - LRO workbench
- `Bell` - Notifications
- `Scale` - Grievances

#### Updated Interface

```typescript
interface SidebarProps {
  profile: SelectProfile | null;
  userEmail?: string;
  whopMonthlyPlanId: string;
  whopYearlyPlanId: string;
  userRole?: "member" | "steward" | "officer" | "admin"; // NEW
}
```

#### Role-Based Navigation Structure

**Member Level** (5 items - All users see these):

- Dashboard (`/dashboard`) - Home overview
- My Claims (`/dashboard/claims`) - Personal claim history
- Submit Claim (`/dashboard/claims/new`) - Voice-enabled submission
- Voting (`/dashboard/voting`) - Union votes/ballots
- Agreements (`/dashboard/agreements`) - Collective bargaining agreements

**Steward Level** (+3 items - Stewards, Officers, Admins):

- LRO Workbench (`/dashboard/workbench`) - Claim queue & AI analysis
- Members (`/dashboard/members`) - Member directory
- Analytics (`/dashboard/analytics`) - Union metrics & reporting

**Officer Level** (+2 items - Officers, Admins):

- Grievances (`/dashboard/grievances`) - Formal grievance process
- Notifications (`/dashboard/notifications`) - Alerts & communications

**Admin Level** (+2 items - Admins only):

- Administration (`/dashboard/admin`) - System settings
- Settings (`/dashboard/settings`) - User preferences (visible to all)

**Total**: 12 navigation items with hierarchical visibility

#### Logo Update

- Changed from generic "App Name" to "UnionEyes" with Shield icon
- Blue gradient styling matching union theme
- Responsive design (icon only on mobile, full logo on desktop)

### 2. Dashboard Layout (`app/dashboard/layout.tsx`)

#### Added Role Support

```typescript
// TODO: Implement role fetching from tenantUsers table
// For now, default to "member" role for all users
const userRole: "member" | "steward" | "officer" | "admin" = "member";
```

#### Updated Sidebar Props

```typescript
<Sidebar 
  profile={profile} 
  userEmail={userEmail} 
  whopMonthlyPlanId={process.env.WHOP_PLAN_ID_MONTHLY || ''}
  whopYearlyPlanId={process.env.WHOP_PLAN_ID_YEARLY || ''}
  userRole={userRole} // NEW
/>
```

## Features Preserved

All existing sidebar features remain intact:

- ✅ Glassmorphism design with backdrop blur
- ✅ Credit usage display (desktop & mobile views)
- ✅ Upgrade popup integration
- ✅ Billing button (Whop orders management)
- ✅ User profile section with Clerk UserButton
- ✅ Framer Motion animations on hover/tap
- ✅ Responsive design (60px mobile, 220px desktop)

## Database Schema Reference

### Tenant Users Table

Location: `db/schema/user-management-schema.ts`

```typescript
export const tenantUsers = userManagementSchema.table("tenant_users", {
  tenantUserId: uuid("tenant_user_id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.tenantId),
  userId: varchar("user_id", { length: 255 }).notNull(), // Supports Clerk IDs
  role: varchar("role", { length: 50 }).notNull().default("member"),
  permissions: jsonb("permissions").default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").default(true),
  // ... additional fields
});
```

## Future Implementation Tasks

### Priority 1: Role Query Implementation

- [ ] Create query function in `db/queries/` to fetch user role from `tenantUsers` table
- [ ] Update dashboard layout to call role query instead of defaulting to "member"
- [ ] Consider caching role in session or profile for performance

Example implementation needed:

```typescript
// db/queries/tenant-users-queries.ts
export async function getTenantUserRole(
  userId: string, 
  tenantId: string
): Promise<"member" | "steward" | "officer" | "admin"> {
  const result = await db
    .select({ role: tenantUsers.role })
    .from(tenantUsers)
    .where(and(
      eq(tenantUsers.userId, userId),
      eq(tenantUsers.tenantId, tenantId)
    ))
    .limit(1);
  
  return (result[0]?.role as any) || "member";
}
```

### Priority 2: Route Verification

Verify/create these dashboard pages:

- [ ] `/dashboard/claims` - Claims history page
- [ ] `/dashboard/claims/new` - Claim submission form
- [ ] `/dashboard/voting` - Voting interface
- [ ] `/dashboard/agreements` - CBA documents
- [ ] `/dashboard/workbench` - LRO claim queue
- [ ] `/dashboard/analytics` - Union metrics
- [ ] `/dashboard/grievances` - Grievance workflow
- [ ] `/dashboard/notifications` - Notification center
- [ ] `/dashboard/admin` - System administration

### Priority 3: Role Management UI

- [ ] Create admin interface for assigning roles
- [ ] Add role change audit logging
- [ ] Implement role-based permissions beyond navigation

### Priority 4: Testing

- [ ] Test navigation visibility with each role type
- [ ] Verify role hierarchy (officers see steward items, admins see all)
- [ ] Test mobile responsive behavior
- [ ] Validate Clerk integration with role system

## Technical Notes

### Navigation Filtering Logic

```typescript
const getVisibleNavItems = () => {
  const allItems = [
    ...memberNavItems, 
    ...stewardNavItems, 
    ...officerNavItems, 
    ...adminNavItems
  ];
  return allItems.filter(item => item.roles.includes(userRole));
};

const navItems = getVisibleNavItems();
```

### Role Hierarchy

- `member` → Sees 5 items (member items only)
- `steward` → Sees 8 items (member + steward items)
- `officer` → Sees 10 items (member + steward + officer items)
- `admin` → Sees all 12 items (full access)

### Icon Sizing

All icons use consistent 16px size for uniformity:

```typescript
{React.cloneElement(item.icon, { size: 16 })}
```

## Related Documentation

- Phase 2 Development: `PHASE_2_DEVELOPMENT_ROADMAP.md`
- User Management Schema: `db/schema/user-management-schema.ts`
- RBAC Documentation: `docs/RBAC_DOCUMENTATION.md`
- Navigation Review: `docs/NAVIGATION_REVIEW_FIX.md`

## Status

✅ **Complete**: Sidebar navigation updated with role-based structure  
✅ **Complete**: Dashboard layout passes userRole prop  
✅ **Complete**: UnionEyes branding applied  
⏳ **Pending**: Role query implementation from database  
⏳ **Pending**: Route verification and page creation  
⏳ **Pending**: Role assignment UI for admins
