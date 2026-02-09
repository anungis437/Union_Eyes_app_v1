# PR-4: Visibility Scopes (Dual-Surface Enforcement)

## Overview

**Goal:** Same events, different views - members see status, LROs see process.

This PR implements the "One system. Two surfaces. One truth." principle by ensuring that the same canonical event data is filtered differently based on the viewer's role. Members see public status updates, while Labour Relations Officers (LROs) see full process details including internal notes and strategic discussions.

## Key Principle
>
> "One system. Two surfaces. One truth."
>
> - **Member surface:** Status updates only (what happened)
> - **LRO surface:** Full process details (why, how, next steps)
> - **Same data source:** Both read from the same event tables

## Changes Implemented

### 1. Database Schema (Migration 0060)

**File:** `db/migrations/0060_add_visibility_scopes.sql`

- Added `visibility_scope` enum with 4 levels:
  - `member`: Visible to union members (status updates, public communications)
  - `staff`: Visible to staff/officers (internal notes, strategy discussions)
  - `admin`: Visible to administrators (administrative actions, sensitive operations)
  - `system`: Internal system events (not visible to any users)

- Added `visibility_scope` column to:
  - `claim_updates` table (default: `member`)
  - `grievance_transitions` table (default: `staff`)

- Created indexes for efficient filtering:
  - `idx_claim_updates_visibility`
  - `idx_grievance_transitions_visibility`

### 2. TypeScript Schema Updates

**Files:**

- `db/schema/claims-schema.ts`: Added `visibilityScopeEnum` and `visibilityScope` column to `claimUpdates`
- `db/schema/grievance-workflow-schema.ts`: Imported enum and added `visibilityScope` column to `grievanceTransitions`

### 3. Case Timeline Service

**File:** `lib/services/case-timeline-service.ts`

Created a new service with three core functions:

#### `getMemberVisibleTimeline(claimId, memberId): Promise<TimelineEvent[]>`

- Fetches only `member` scope events
- Members see: status updates, public communications, claim submissions
- Members DO NOT see: internal notes, strategy discussions, admin actions

#### `getLroVisibleTimeline(claimId, organizationId): Promise<TimelineEvent[]>`

- Fetches `member`, `staff`, and `admin` scope events (excludes `system`)
- LROs see: everything members see PLUS internal process details
- Combines claim updates and grievance transitions into single timeline

#### `addCaseEvent(payload): Promise<string>`

- Creates new timeline events with automatic scope assignment
- Rules:
  - `status_change` → `member` (visible to member)
  - `internal_note` → `staff` (internal only)
  - `admin_*` actions → `admin` (administrators only)
  - `isInternal: true` → `staff` (default for internal)

#### Helper: `getVisibleScopesForRole(role): VisibilityScope[]`

- Returns which scopes a role can see
- member → [`member`]
- steward/officer → [`member`, `staff`]
- admin → [`member`, `staff`, `admin`]
- system → [`member`, `staff`, `admin`, `system`]

### 4. Integration Tests

**File:** `__tests__/services/case-timeline.test.ts`

Comprehensive test suite proving:

- ✅ Members only see `member` scope events (2 of 5 events)
- ✅ LROs see `member` + `staff` + `admin` events (5 of 5 events)
- ✅ Automatic scope assignment works correctly
- ✅ Same events, different views based on role
- ✅ Timeline ordering (reverse chronological)
- ✅ Access control enforcement

## Examples

### Member View (Limited)

```typescript
const timeline = await getMemberVisibleTimeline(claimId, memberId);
// Returns:
// - "Claim submitted by member" (member scope)
// - "Your claim is under review" (member scope)
// 
// Does NOT include:
// - "Officer reviewing claim for merit" (staff scope)
// - "Strategy discussion: settlement threshold $50k" (staff scope)
// - "Admin assigned to legal team" (admin scope)
```

### LRO View (Full)

```typescript
const timeline = await getLroVisibleTimeline(claimId, orgId);
// Returns ALL 5 events:
// - "Claim submitted by member" (member)
// - "Your claim is under review" (member)
// - "Officer reviewing claim for merit" (staff)
// - "Strategy discussion: settlement threshold $50k" (staff)
// - "Admin assigned to legal team" (admin)
```

### Adding Events with Automatic Scope

```typescript
// Status change visible to member
await addCaseEvent({
  claimId,
  updateType: 'status_change',
  message: 'Your claim is now under review',
  createdBy: 'system'
  // Automatically assigned: visibilityScope = 'member'
});

// Internal note visible only to staff
await addCaseEvent({
  claimId,
  updateType: 'internal_note',
  message: 'Discussed with legal counsel - proceed with arbitration',
  createdBy: 'officer-uuid',
  isInternal: true
  // Automatically assigned: visibilityScope = 'staff'
});
```

## Acceptance Criteria ✅

- [x] `visibility_scope` column added to relevant tables
- [x] Timeline service filters events by scope
- [x] Members cannot access staff-only events (test proves it)
- [x] LROs can access full timeline (test proves it)
- [x] Same event data, different views enforced

## Running the Tests

```bash
# Run the visibility scope tests
pnpm vitest run __tests__/services/case-timeline.test.ts

# Expected results:
# ✅ Case Timeline Service - Visibility Scopes
#   ✅ Member Surface (Member View)
#     ✅ should return only member-scope events for members
#     ✅ should NOT include staff-scope events in member timeline
#     ✅ should NOT include admin-scope events in member timeline
#   ✅ LRO Surface (Labour Relations Officer View)
#     ✅ should return member + staff + admin events for LROs
#     ✅ should include staff-only strategic discussions
#     ✅ should include admin-only events
#   ✅ Dual-Surface Enforcement
#     ✅ should prove same events, different views based on role
#   ✅ Automatic Scope Assignment
#   ✅ Role-Based Scope Visibility
#   ✅ Timeline Ordering
#   ✅ Access Control
```

## Database Migration

```bash
# Apply the migration
pnpm drizzle-kit push

# Or using migration files
pnpm db:migrate
```

## API Integration (Future Work)

### Next Steps

- Update claim detail API routes to use timeline service:
  - `GET /api/claims/[id]/timeline` → use `getMemberVisibleTimeline` or `getLroVisibleTimeline` based on role
- Add timeline endpoint for member dashboard
- Add full timeline endpoint for LRO dashboard

### Example API Route Implementation

```typescript
// app/api/claims/[id]/timeline/route.ts
import { requireApiAuth } from '@/lib/api-auth-guard';
import { getMemberVisibleTimeline, getLroVisibleTimeline } from '@/lib/services/case-timeline-service';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId, organizationId, role } = await requireApiAuth({ tenant: true });

  // If member role, show filtered timeline
  if (role === 'member') {
    const timeline = await getMemberVisibleTimeline(params.id, userId);
    return NextResponse.json({ timeline });
  }

  // If staff/admin, show full timeline
  const timeline = await getLroVisibleTimeline(params.id, organizationId);
  return NextResponse.json({ timeline });
}
```

## Benefits

1. **Transparency with Discretion:** Members see what they need (status), officers see what they need (strategy)
2. **Defensibility:** All events recorded in single source of truth, filtered by visibility
3. **Trust:** Members know the union is working for them, even if they don't see every internal discussion
4. **Compliance:** Sensitive discussions protected from inappropriate disclosure
5. **Maintainability:** Single data model, multiple views through filtering (not duplicate tables)

## Related PRs

- **PR-1:** Repo Provenance Gate ✅
- **PR-2:** API Policy Enforcement ✅
- **PR-3:** Evidence & Audit Baseline ✅
- **PR-4:** Visibility Scopes (dual-surface) ✅ **THIS PR**
- **PR-5:** Opinionated Workflow Rules (next)
- **PR-6:** Defensibility Pack Exports
- **PR-7:** LRO Signals API
- **PR-8:** Minimal UI Panel
- **PR-9:** Pilot Mode Feature Flags
- **PR-10:** Metrics Instrumentation

---

**Implementation Date:** 2025-01-11  
**Status:** ✅ Complete and tested  
**Key Files:**

- Migration: `db/migrations/0060_add_visibility_scopes.sql`
- Service: `lib/services/case-timeline-service.ts`
- Tests: `__tests__/services/case-timeline.test.ts`
- Schemas: `db/schema/claims-schema.ts`, `db/schema/grievance-workflow-schema.ts`
