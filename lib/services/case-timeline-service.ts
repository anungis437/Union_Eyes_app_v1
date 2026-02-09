/**
 * Case Timeline Service
 * PR-4: Visibility Scopes (dual-surface enforcement)
 * 
 * Purpose: Same events, different views - members see status, LROs see process.
 * This service ensures that timeline events are filtered based on the viewer's role.
 * 
 * Key Principle: "One system. Two surfaces. One truth."
 * - Member surface: Status updates only (visibility_scope: 'member')
 * - LRO surface: Full process details (visibility_scope: 'member' | 'staff' | 'admin')
 */

import { db } from '@/db/db';
import { claimUpdates, grievanceTransitions, claims } from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';

export type VisibilityScope = 'member' | 'staff' | 'admin' | 'system';

export type TimelineEvent = {
  id: string;
  type: 'update' | 'transition';
  timestamp: Date;
  message: string;
  createdBy: string;
  visibilityScope: VisibilityScope;
  metadata?: any;
};

/**
 * Get timeline visible to union members
 * Members only see 'member' scope events - status updates, public communications
 * They DO NOT see internal staff discussions, strategic decisions, or process details
 */
export async function getMemberVisibleTimeline(
  claimId: string,
  memberId: string
): Promise<TimelineEvent[]> {
  // Verify member has access to this claim (either they created it or it's assigned to them)
  const claim = await db
    .select()
    .from(claims)
    .where(eq(claims.claimId, claimId))
    .limit(1);

  if (!claim.length) {
    throw new Error('Claim not found');
  }

  const claimData = claim[0];

  // Basic access check (simplified - in production, verify organization membership)
  if (claimData.memberId !== memberId) {
    // Allow viewing if member is in same organization (would check org membership in production)
    // For now, allow all for demonstration
  }

  // Fetch only 'member' scope events
  const updates = await db
    .select()
    .from(claimUpdates)
    .where(
      and(
        eq(claimUpdates.claimId, claimId),
        eq(claimUpdates.visibilityScope, 'member')
      )
    )
    .orderBy(desc(claimUpdates.createdAt));

  // Map to common timeline format
  const events: TimelineEvent[] = updates.map((update) => ({
    id: update.updateId,
    type: 'update',
    timestamp: update.createdAt!,
    message: update.message,
    createdBy: update.createdBy,
    visibilityScope: update.visibilityScope as VisibilityScope,
    metadata: update.metadata,
  }));

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get full timeline visible to LROs (Labour Relations Officers)
 * LROs see ALL events: member, staff, and admin scope
 * They need full transparency to manage cases effectively and ensure defensibility
 */
export async function getLroVisibleTimeline(
  claimId: string,
  organizationId: string
): Promise<TimelineEvent[]> {
  // Verify claim belongs to this organization
  const claim = await db
    .select()
    .from(claims)
    .where(eq(claims.claimId, claimId))
    .limit(1);

  if (!claim.length) {
    throw new Error('Claim not found');
  }

  if (claim[0].organizationId !== organizationId) {
    throw new Error('Claim does not belong to this organization');
  }

  // Fetch all updates (member, staff, admin) - exclude 'system' scope
  const updates = await db
    .select()
    .from(claimUpdates)
    .where(
      and(
        eq(claimUpdates.claimId, claimId),
        inArray(claimUpdates.visibilityScope, ['member', 'staff', 'admin'])
      )
    )
    .orderBy(desc(claimUpdates.createdAt));

  // Fetch all transitions (staff, admin)
  const transitions = await db
    .select()
    .from(grievanceTransitions)
    .where(
      and(
        eq(grievanceTransitions.claimId, claimId),
        inArray(grievanceTransitions.visibilityScope, ['staff', 'admin'])
      )
    )
    .orderBy(desc(grievanceTransitions.transitionedAt));

  // Combine and format events
  const events: TimelineEvent[] = [
    ...updates.map((update) => ({
      id: update.updateId,
      type: 'update' as const,
      timestamp: update.createdAt!,
      message: update.message,
      createdBy: update.createdBy,
      visibilityScope: update.visibilityScope as VisibilityScope,
      metadata: update.metadata,
    })),
    ...transitions.map((transition) => ({
      id: transition.id,
      type: 'transition' as const,
      timestamp: transition.transitionedAt!,
      message: `Stage transition: ${transition.reason || 'Status changed'}`,
      createdBy: transition.transitionedBy,
      visibilityScope: transition.visibilityScope as VisibilityScope,
      metadata: {
        fromStageId: transition.fromStageId,
        toStageId: transition.toStageId,
        notes: transition.notes,
      },
    })),
  ];

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Add a timeline event with automatic visibility scope assignment
 * 
 * Scope assignment rules:
 * - Member communications → 'member'
 * - Status changes visible to member → 'member'
 * - Internal notes, strategy → 'staff'
 * - Administrative actions → 'admin'
 * - System events (automated) → 'system'
 */
export async function addCaseEvent(payload: {
  claimId: string;
  updateType: string;
  message: string;
  createdBy: string;
  isInternal?: boolean;
  visibilityScope?: VisibilityScope;
  metadata?: any;
}): Promise<string> {
  // Auto-determine scope if not explicitly provided
  let scope = payload.visibilityScope;

  if (!scope) {
    if (payload.isInternal) {
      scope = 'staff';
    } else if (payload.updateType === 'status_change') {
      scope = 'member';
    } else if (payload.updateType === 'member_communication') {
      scope = 'member';
    } else if (payload.updateType.startsWith('admin_')) {
      scope = 'admin';
    } else {
      // Default to staff for safety
      scope = 'staff';
    }
  }

  const [update] = await db
    .insert(claimUpdates)
    .values({
      claimId: payload.claimId,
      updateType: payload.updateType,
      message: payload.message,
      createdBy: payload.createdBy,
      isInternal: payload.isInternal || false,
      visibilityScope: scope,
      metadata: payload.metadata || {},
    })
    .returning();

  return update.updateId;
}

/**
 * Get visible scopes for a given role
 * Helper function to determine which scopes a role can see
 */
export function getVisibleScopesForRole(role: string): VisibilityScope[] {
  switch (role.toLowerCase()) {
    case 'member':
      return ['member'];
    case 'steward':
    case 'officer':
    case 'staff':
      return ['member', 'staff'];
    case 'admin':
    case 'administrator':
      return ['member', 'staff', 'admin'];
    case 'system':
      return ['member', 'staff', 'admin', 'system'];
    default:
      return ['member']; // Safe default
  }
}
