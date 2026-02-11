# Schema Naming Inconsistencies Documentation

## Overview
The Union Eyes application currently has two separate tables for user-organization relationships:
1. `organization_users` (from user-management-schema.ts)
2. `organization_members` (from organization-members-schema.ts)

This document explains the reasoning, current usage, and migration path.

## Current State

### `organization_users` Table
**Location**: `db/schema/user-management-schema.ts`  
**Purpose**: Authentication and RBAC (Role-Based Access Control)  
**Schema**:
```typescript
{
   organizationUserId: uuid (PK),
   organizationId: uuid (FK to organizations),
  userId: varchar,                       // Clerk user ID
  role: varchar,
  permissions: jsonb,
  isActive: boolean,
  isPrimary: boolean,
  // ... timestamps
}
```

**Usage**:
- `lib/tenant-utils.ts` - Tenant/organization lookup functions
- `lib/middleware/api-security.ts` - Request security validation
- `lib/auth/rbac-server.ts` - Role-based access control
- `lib/api-auth-guard.ts` - API authentication guards

**Purpose**: Lightweight auth layer linking Clerk users to organizations with roles/permissions

---

### `organization_members` Table
**Location**: `db/schema/organization-members-schema.ts`  
**Purpose**: Member Profile Management and Business Logic  
**Schema**:
```typescript
{
  id: uuid (PK),
  userId: varchar (FK to users),
  organizationId: uuid (FK to organizations),
  name: text,
  email: text,
  phone: text,
  role: enum,                    // member | steward | officer | admin
  status: enum,                  // active | inactive | on-leave
  department: varchar,
  position: varchar,
  hireDate: timestamp,
  membershipNumber: varchar,
  seniority: text,
  unionJoinDate: timestamp,
  preferredContactMethod: varchar,
  metadata: text,
  searchVector: text,
  // ... timestamps
}
```

**Usage**:
- `lib/organization-utils.ts` - Organization member queries
- `lib/workflow-engine.ts` - Workflow assignments and tracking
- `lib/engagement-scoring.ts` - Member engagement calculations
- `lib/services/case-timeline-service.ts` - Case management
- `lib/services/member-service.ts` - Member CRUD operations
- `lib/workers/report-worker.ts` - Report generation

**Purpose**: Rich member profiles with union-specific data, work history, and contact preferences

---

## Why Two Tables?

### Separation of Concerns
1. **Authentication Layer** (`organization_users`):
   - Minimal data required for auth/authz
   - Fast lookups for permission checks
   - Supports multi-tenancy (user can be in multiple organizations)
   - Optimized for security middleware

2. **Business Logic Layer** (`organization_members`):
   - Comprehensive member profiles
   - Union-specific data (seniority, membership number)
   - Contact preferences and metadata
   - Search optimization (full-text search vector)
   - Soft deletes for data retention

### Performance Benefits
- Auth checks don't need to load full member profiles
- Member profile queries don't need to join auth permission data
- Separate indexes optimized for different query patterns

---

## The Naming Problem (Resolved)

### Resolved Issues
1. **Terminology Confusion**:
   - "Tenant" (auth layer) vs "Organization" (business layer)
   - Both refer to the same concept but use different names
   - Makes code harder to understand and maintain

2. **Foreign Key Names**:
   - `organization_users.organizationId` references `organizations.id`
   - Naming now matches organization terminology

3. **API Inconsistency**:
   - Some endpoints use "tenant" terminology
   - Some use "organization" terminology
   - Causes confusion in API documentation

### Migration Completed
This was resolved via a coordinated schema and code migration:
1. Renamed `tenant_users` to `organization_users`
2. Renamed `tenant_id` to `organization_id`
3. Updated code references to organization terminology
4. Kept backward-compatible request inputs where needed

---

## Recommended Migration Path

### Phase 1: Documentation (✅ Complete)
- Document the two-table architecture and naming confusion
- Add inline comments to schema files explaining the relationship
- Update API documentation to clarify tenant/organization usage

### Phase 2: Deprecation Warnings (Complete)
1. Create new wrappers with consistent naming:
   ```typescript
   // New (preferred)
   getUserOrganizations(userId: string)
   getUserOrganizationRole(userId: string, organizationId: string)
   
   // Old (deprecated)
   getUserTenant(userId: string)  // Calls getUserOrganizations internally
   ```

2. Add deprecation notices to tenant-related functions
3. Update new code to use organization terminology
4. Add organization-preferring cookies/headers while preserving tenant fallbacks

### Phase 3: Schema Migration (Complete)
1. Migration applied to rename table and column
2. Imports and call sites updated
3. Staging validation completed

### Phase 4: Code Cleanup (In Progress)
1. Remove remaining tenant-named functions
2. Update API routes to use consistent terminology
3. Update client-side code to match

---

## Current Guidance

Developers should:

1. **Use "organization" terminology in new code**
2. **Keep the two tables separate** - don't try to merge them:
   - Use `organization_users` for auth/permission checks
   - Use `organization_members` for member profiles and business logic
3. **Document when creating new cross-table queries**:
   ```typescript
   // Join both tables when you need auth + profile data
   const memberWithPermissions = await db
     .select({
       // Profile from organization_members
       name: organizationMembers.name,
       email: organizationMembers.email,
       // Auth from organization_users
       role: organizationUsers.role,
       permissions: organizationUsers.permissions,
     })
     .from(organizationMembers)
     .innerJoin(organizationUsers, eq(
       organizationMembers.userId, 
       organizationUsers.userId
     ));
   ```

---

## Impact Assessment

### Low Risk to Leave As-Is
- Both tables are working correctly
- Performance is good (separate indexes, optimized queries)
- No data integrity issues
- Clear separation of concerns

### Medium Risk During Migration (Resolved)
- Authentication was a critical path
- Required coordinated deployment across services
- Required extensive testing of auth paths

### Recommendation
**Migration complete.**
- Keep terminology consistent going forward
- Retire any remaining tenant-named wrappers as follow-up work

---

## Related Files

### Schema Files
- `db/schema/user-management-schema.ts` - organization_users definition
- `db/schema/organization-members-schema.ts` - organization_members definition
- `db/schema-organizations.ts` - organizations definition

### Auth Layer (uses organization_users)
- `lib/tenant-utils.ts`
- `lib/middleware/api-security.ts`
- `lib/auth/rbac-server.ts`
- `lib/api-auth-guard.ts`

### Business Layer (uses organization_members)
- `lib/organization-utils.ts`
- `lib/workflow-engine.ts`
- `lib/engagement-scoring.ts`
- `lib/services/case-timeline-service.ts`
- `lib/services/member-service.ts`

---

## Status: MIGRATION COMPLETE
The schema inconsistency is **resolved** with a full schema rename and code alignment.

Priority: **DONE**  
Risk of Change: **RESOLVED**
