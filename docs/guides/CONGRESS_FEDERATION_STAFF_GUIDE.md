# Congress & Federation Staff Access Guide

## Overview
This document outlines the implementation of congress and federation staff roles in the Union Claims Platform, supporting the organizational hierarchy of the Canadian labor movement.

## Organizational Hierarchy
```
Canadian Labour Congress (CLC)
└── Provincial/Territorial Federations (e.g., OFL, BCFED, AFL)
    └── National/International Unions (e.g., CUPE, Unifor, UFCW)
        └── Local Unions (e.g., CUPE Local 79, Unifor Local 444)
```

## Role Definitions

### Congress Staff (`CONGRESS_STAFF`)
- **Scope**: National (CLC-level)
- **Role Level**: 5 (between union_rep and admin)
- **Purpose**: Support national coordination, research, and strategic planning

#### Permissions (27 total)
**Cross-Organizational Analytics**:
- `VIEW_CROSS_UNION_ANALYTICS` - View aggregated data across all affiliates
- `MANAGE_CROSS_UNION_ANALYTICS` - Configure analytics and generate reports

**Knowledge Management** (Full rights to facilitate cross-union learning):
- `VIEW_PRECEDENT_DATABASE` - Search arbitration cases
- `MANAGE_PRECEDENT_DATABASE` - Add/edit precedents
- `VIEW_CLAUSE_LIBRARY` - View successful CBA language
- `MANAGE_CLAUSE_LIBRARY` - Add/edit clause templates

**Organizational Oversight**:
- `VIEW_ALL_ORGANIZATIONS` - View full organizational hierarchy
- `MANAGE_AFFILIATES` - Manage affiliate relationships
- `VIEW_CONGRESS_ANALYTICS` - Congress-specific dashboard
- `VIEW_COMPLIANCE_REPORTS` - Charter/bylaw compliance tracking
- `MANAGE_SECTOR_ANALYTICS` - Industry-wide wage trends and strategic intelligence

**Respectful Autonomy** (View-only to respect local decision-making):
- `VIEW_CLAIMS`, `VIEW_VOTING` - Monitor but not interfere
- No permissions for: `MANAGE_CLAIMS`, `MANAGE_VOTING`, `MANAGE_MEMBERS`

### Federation Staff (`FEDERATION_STAFF`)
- **Scope**: Provincial/Territorial (OFL, BCFED, etc.)
- **Role Level**: 4 (between union_rep and congress_staff)
- **Purpose**: Support provincial coordination within federation affiliates

#### Permissions (19 total)
Similar to congress staff but scoped to federation affiliates:
- `VIEW_CROSS_UNION_ANALYTICS` - Scoped to federation members
- `VIEW_FEDERATION_ANALYTICS` - Federation-specific dashboard
- `VIEW_PRECEDENT_DATABASE`, `MANAGE_PRECEDENT_DATABASE`
- `VIEW_CLAUSE_LIBRARY`, `MANAGE_CLAUSE_LIBRARY`
- `VIEW_ALL_ORGANIZATIONS` (filtered to federation hierarchy)
- `MANAGE_AFFILIATES` (federation affiliates only)
- `VIEW_COMPLIANCE_REPORTS`
- View-only for claims, voting, members (respects local autonomy)
- **No access to**: `MANAGE_SECTOR_ANALYTICS` (national scope only)

## Navigation Structure

### Cross-Organizational Operations Section
Available to: congress_staff, federation_staff, admin

1. **Cross-Union Analytics** (`/dashboard/cross-union-analytics`)
   - Aggregated metrics across affiliates
   - Bargaining outcomes, membership trends, financial health
   - Congress: National view | Federation: Provincial view

2. **Precedent Database** (`/dashboard/precedents`)
   - Searchable arbitration decisions
   - Filterable by jurisdiction, sector, issue type
   - Both roles can add/edit to support knowledge sharing

3. **Shared Clause Library** (`/dashboard/clause-library`)
   - Successful CBA language templates
   - Categorized by topic (wages, health & safety, etc.)
   - Both roles can contribute tested language

4. **Affiliate Management** (`/dashboard/admin/organizations`)
   - View organizational hierarchy
   - Manage affiliate relationships (within scope)
   - Update organization metadata

5. **Compliance Reports** (`/dashboard/compliance`)
   - Charter/constitution compliance tracking
   - Reporting deadlines and document management
   - Audit trails for governance requirements

6. **Sector Analytics** (`/dashboard/sector-analytics`)
   - **Congress staff only** (national strategic planning)
   - Industry-wide wage trends and benchmarking
   - Organizing campaign intelligence
   - National bargaining coordination data

## Implementation Details

### Setting User Roles in Clerk
1. Navigate to Clerk Dashboard → Users
2. Select the user account
3. Edit Public Metadata
4. Add role field:
   ```json
   {
     "role": "congress_staff"
   }
   ```
   or
   ```json
   {
     "role": "federation_staff"
   }
   ```
5. Save changes - user will have access on next login

### Role Hierarchy
```
0. Guest - Public access
1. Member - Basic claim submission
2. Staff Representative - Steward tools
3. Union Representative - Officer/leadership tools
4. Federation Staff - Provincial cross-org coordination
5. Congress Staff - National cross-org coordination
6. Admin - Full system access
```

### Permission Philosophy

#### Broad Visibility, Limited Write Access
Congress/federation staff need visibility across affiliates to:
- Identify trends and share best practices
- Coordinate bargaining strategies
- Provide research and support
- Track compliance and governance

However, they should NOT directly manage:
- Individual claims or grievances
- Member records
- Voting processes
- Local union operations

This respects the principle of **local union autonomy** while enabling cross-organizational coordination.

#### Knowledge Sharing Exception
Full management rights for:
- Precedent database
- Clause library

Rationale: These are shared resources that benefit all affiliates. Congress/federation staff often have research capacity to curate and maintain these databases.

#### Hierarchical Data Scoping
- **Federation Staff**: See only their federation's affiliates
  - Example: OFL staff see Ontario locals only
- **Congress Staff**: See all federations and affiliates nationally
  - Example: CLC staff see all Canadian locals

Implementation via RLS policies and organization hierarchy filtering.

## Dashboard Behavior

### For Congress Staff
- No access to local "Claims" or "Voting" tabs (respects autonomy)
- Extensive "Cross-Organizational Operations" section
- Analytics show national aggregates
- Can view individual union data but not modify operational records

### For Federation Staff
Similar to congress staff but:
- Analytics filtered to federation affiliates
- Organization view shows federation hierarchy only
- No access to "Sector Analytics" (congress/admin only)

### For Admin
- Full access to all sections including cross-org tools
- Can perform congress/federation staff functions
- Plus full system administration capabilities

## Testing

### Manual Role Testing Checklist
1. **Member Role** (`role: "member"`):
   - ✓ See Claims, Voting, Analytics
   - ✗ No Precedents, Cross-Union, Compliance

2. **Steward Role** (`role: "steward"`):
   - ✓ See Workbench, Clauses, Precedents
   - ✗ No Cross-Union section

3. **Officer Role** (`role: "officer"`):
   - ✓ See Targets, Grievances, Cross-Union Analytics
   - ✗ No Compliance, Sector Analytics

4. **Federation Staff** (`role: "federation_staff"`):
   - ✓ See Cross-Organizational Operations section (6 items)
   - ✗ No Sector Analytics (congress only)
   - ✗ No local Claims/Voting tabs

5. **Congress Staff** (`role: "congress_staff"`):
   - ✓ See all Cross-Organizational Operations (including Sector Analytics)
   - ✗ No local Claims/Voting tabs
   - ✓ National scope on all analytics

6. **Admin** (`role: "admin"`):
   - ✓ See everything
   - ✓ All navigation sections visible

## Future Enhancements

### Phase 1 (API & Middleware)
- [ ] Implement RLS policies for organization hierarchy filtering
- [ ] Add `/api/analytics/cross-union` endpoint with scope filtering
- [ ] Add `/api/compliance/reports` for charter tracking
- [ ] Add `/api/sector-analytics` for wage trends (congress only)
- [ ] Update organization middleware to handle congress/federation scope

### Phase 2 (Advanced Features)
- [ ] Organization switcher showing hierarchy for cross-org staff
- [ ] Breadcrumb navigation (Congress → Federation → Union → Local)
- [ ] Cross-union analytics dashboard with federation/congress filters
- [ ] Precedent search with jurisdiction/sector filters
- [ ] Compliance dashboard with automated reporting

### Phase 3 (Intelligence Features)
- [ ] Sector analytics with wage comparison tools
- [ ] Bargaining trend analysis and forecasting
- [ ] Organizing campaign metrics and coordination
- [ ] Strategic intelligence reports for national campaigns

## Related Files
- `lib/auth/roles.ts` - Core RBAC definitions
- `lib/auth/rbac-hooks.ts` - Client-side permission hooks
- `components/sidebar.tsx` - Navigation with role-based sections
- `components/dashboard-navbar.tsx` - Top navigation bar
- `app/[locale]/dashboard/compliance/page.tsx` - Compliance tracking
- `app/[locale]/dashboard/sector-analytics/page.tsx` - Sector intelligence
- `db/schema-organizations.ts` - Organization hierarchy (Phase 5A)

## Support
For questions about congress/federation staff implementation:
1. Review this document
2. Check `lib/auth/roles.ts` for permission definitions
3. Test role behavior in development with Clerk metadata
4. Verify navigation items appear/disappear based on role

## Change Log
- **2025-01-XX**: Initial implementation of congress/federation staff roles
  - Added 2 new roles (CONGRESS_STAFF, FEDERATION_STAFF)
  - Added 13 cross-organizational permissions
  - Created dedicated navigation section with 6 items
  - Added placeholder pages for compliance and sector analytics
  - Updated role hierarchy to 7 levels
