/**
 * Case Timeline Service Tests
 * PR-4: Visibility Scopes (dual-surface enforcement)
 * 
 * These tests verify that:
 * 1. Members can only see 'member' scope events
 * 2. LROs can see 'member', 'staff', and 'admin' scope events
 * 3. Same events, different views based on role
 * 4. Visibility scopes are automatically assigned correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getMemberVisibleTimeline,
  getLroVisibleTimeline,
  addCaseEvent,
  getVisibleScopesForRole,
} from '@/lib/services/case-timeline-service';
import { db } from '@/db/db';
import { claims, claimUpdates, organizations } from '@/db/schema';
import { users } from '@/db/schema/user-management-schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('Case Timeline Service - Visibility Scopes', () => {
  let testClaimId: string;
  let testOrgId: string = randomUUID();
  let testMemberId: string = randomUUID();
  const claimNumber = `TEST-VISIBILITY-${randomUUID().slice(0, 8)}`;
  let officerId: string;
  let adminId: string;
  const systemUserId = 'system';

  async function setSessionContext(userId: string, orgId: string) {
    await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, false)`);
    await db.execute(sql`SELECT set_config('app.current_organization_id', ${orgId}, false)`);
    await db.execute(sql`SELECT set_config('app.current_tenant_id', ${orgId}, false)`);
  }

  async function clearSessionContext() {
    await db.execute(sql`RESET app.current_user_id`);
    await db.execute(sql`RESET app.current_organization_id`);
    await db.execute(sql`RESET app.current_tenant_id`);
  }

  beforeAll(async () => {
    // Create test organization first
    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Union Local',
      slug: `test-union-local-visibility-${testOrgId.slice(0, 8)}`,
      organizationType: 'local',
      hierarchyPath: [testOrgId],
      hierarchyLevel: 0,
      provinceTerritory: 'ON',
      clcAffiliated: false, // Simplified for testing
      status: 'active',
    }).onConflictDoNothing();

    const [orgRow] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, testOrgId))
      .limit(1);

    if (!orgRow) {
      const [fallbackOrg] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .limit(1);

      if (fallbackOrg) {
        testOrgId = fallbackOrg.id;
      } else {
        throw new Error('No organizations available for case timeline tests');
      }
    }

    await setSessionContext(testMemberId, testOrgId);

    await db.insert(users).values({
      userId: testMemberId,
      email: `member-${testMemberId}@example.com`,
    }).onConflictDoNothing();

    await db.execute(sql`
      INSERT INTO organization_members (user_id, organization_id, role, status)
      VALUES (${testMemberId}, ${testOrgId}, 'member', 'active')
      ON CONFLICT DO NOTHING
    `);

    // Create a test claim
    const [claim] = await db
      .insert(claims)
      .values({
        claimNumber,
        organizationId: testOrgId,
        memberId: testMemberId,
        claimType: 'grievance_discipline',
        incidentDate: new Date(),
        location: 'Test Location',
        description: 'Test claim for visibility scope testing',
        desiredOutcome: 'Test outcome',
      })
      .returning();

    testClaimId = claim.claimId;

    officerId = randomUUID();
    adminId = randomUUID();

    await db.insert(users).values([
      { userId: officerId, email: `officer-${officerId}@example.com` },
      { userId: adminId, email: `admin-${adminId}@example.com` },
      { userId: systemUserId, email: 'system@example.com' },
    ]).onConflictDoNothing();

    // Add events with different visibility scopes
    await addCaseEvent({
      claimId: testClaimId,
      updateType: 'status_change',
      message: 'Claim submitted by member',
      createdBy: testMemberId,
      visibilityScope: 'member',
    });

    await addCaseEvent({
      claimId: testClaimId,
      updateType: 'internal_note',
      message: 'Officer reviewing claim for merit',
      createdBy: officerId,
      visibilityScope: 'staff',
    });

    await addCaseEvent({
      claimId: testClaimId,
      updateType: 'admin_action',
      message: 'Admin assigned to legal team',
      createdBy: adminId,
      visibilityScope: 'admin',
    });

    await addCaseEvent({
      claimId: testClaimId,
      updateType: 'status_change',
      message: 'Your claim is under review',
      createdBy: systemUserId,
      visibilityScope: 'member',
    });

    await addCaseEvent({
      claimId: testClaimId,
      updateType: 'internal_strategy',
      message: 'Strategy discussion: settlement threshold $50k',
      createdBy: officerId,
      visibilityScope: 'staff',
    });
  });

  afterAll(async () => {
    await clearSessionContext();
    // Cleanup test data
    if (testClaimId) {
      try {
        await db.delete(claimUpdates).where(eq(claimUpdates.claimId, testClaimId));
        await db.delete(claims).where(eq(claims.claimId, testClaimId));
      } catch (error) {
        console.warn('[Case Timeline] Cleanup skipped:', error);
      }
    }
    try {
      await db.delete(users).where(eq(users.userId, testMemberId));
      if (officerId) {
        await db.delete(users).where(eq(users.userId, officerId));
      }
      if (adminId) {
        await db.delete(users).where(eq(users.userId, adminId));
      }
      await db.delete(users).where(eq(users.userId, systemUserId));
    } catch (error) {
      console.warn('[Case Timeline] User cleanup skipped:', error);
    }
    if (testOrgId) {
      try {
        await db.delete(organizations).where(eq(organizations.id, testOrgId));
      } catch (error) {
        console.warn('[Case Timeline] Organization cleanup skipped:', error);
      }
    }
  });

  describe('Member Surface (Member View)', () => {
    it('should return only member-scope events for members', async () => {
      const timeline = await getMemberVisibleTimeline(testClaimId, testMemberId);

      // Should see 2 member-scope events
      expect(timeline.length).toBe(2);

      // All events should be 'member' scope
      expect(timeline.every((event) => event.visibilityScope === 'member')).toBe(true);

      // Should contain both member messages
      const messages = timeline.map((e) => e.message);
      expect(messages).toContain('Claim submitted by member');
      expect(messages).toContain('Your claim is under review');
    });

    it('should NOT include staff-scope events in member timeline', async () => {
      const timeline = await getMemberVisibleTimeline(testClaimId, testMemberId);

      // Should NOT see internal notes
      const messages = timeline.map((e) => e.message);
      expect(messages).not.toContain('Officer reviewing claim for merit');
      expect(messages).not.toContain('Strategy discussion: settlement threshold $50k');
    });

    it('should NOT include admin-scope events in member timeline', async () => {
      const timeline = await getMemberVisibleTimeline(testClaimId, testMemberId);

      const messages = timeline.map((e) => e.message);
      expect(messages).not.toContain('Admin assigned to legal team');
    });
  });

  describe('LRO Surface (Labour Relations Officer View)', () => {
    it('should return member + staff + admin events for LROs', async () => {
      const timeline = await getLroVisibleTimeline(testClaimId, testOrgId);

      // Should see all 5 events (2 member, 2 staff, 1 admin) - no system events
      expect(timeline.length).toBe(5);

      // Should include all scopes except 'system'
      const scopes = timeline.map((e) => e.visibilityScope);
      expect(scopes).toContain('member');
      expect(scopes).toContain('staff');
      expect(scopes).toContain('admin');
      expect(scopes).not.toContain('system');
    });

    it('should include staff-only strategic discussions', async () => {
      const timeline = await getLroVisibleTimeline(testClaimId, testOrgId);

      const messages = timeline.map((e) => e.message);
      expect(messages).toContain('Officer reviewing claim for merit');
      expect(messages).toContain('Strategy discussion: settlement threshold $50k');
    });

    it('should include admin-only events', async () => {
      const timeline = await getLroVisibleTimeline(testClaimId, testOrgId);

      const messages = timeline.map((e) => e.message);
      expect(messages).toContain('Admin assigned to legal team');
    });
  });

  describe('Dual-Surface Enforcement', () => {
    it('should prove same events, different views based on role', async () => {
      const memberTimeline = await getMemberVisibleTimeline(testClaimId, testMemberId);
      const lroTimeline = await getLroVisibleTimeline(testClaimId, testOrgId);

      // LRO should see MORE events than member
      expect(lroTimeline.length).toBeGreaterThan(memberTimeline.length);

      // Member timeline should be a subset of LRO timeline
      const memberMessages = memberTimeline.map((e) => e.message);
      const lroMessages = lroTimeline.map((e) => e.message);

      memberMessages.forEach((msg) => {
        expect(lroMessages).toContain(msg);
      });
    });
  });

  describe('Automatic Scope Assignment', () => {
    it('should auto-assign member scope for status changes', async () => {
      const eventId = await addCaseEvent({
        claimId: testClaimId,
        updateType: 'status_change',
        message: 'Status updated to under review',
        createdBy: 'system',
      });

      const [event] = await db
        .select()
        .from(claimUpdates)
        .where(eq(claimUpdates.updateId, eventId));

      expect(event.visibilityScope).toBe('member');
    });

    it('should auto-assign staff scope for internal notes', async () => {
      const eventId = await addCaseEvent({
        claimId: testClaimId,
        updateType: 'internal_note',
        message: 'Internal discussion',
        createdBy: officerId,
        isInternal: true,
      });

      const [event] = await db
        .select()
        .from(claimUpdates)
        .where(eq(claimUpdates.updateId, eventId));

      expect(event.visibilityScope).toBe('staff');
    });

    it('should auto-assign admin scope for admin actions', async () => {
      const eventId = await addCaseEvent({
        claimId: testClaimId,
        updateType: 'admin_action',
        message: 'Admin performed action',
        createdBy: adminId,
      });

      const [event] = await db
        .select()
        .from(claimUpdates)
        .where(eq(claimUpdates.updateId, eventId));

      expect(event.visibilityScope).toBe('admin');
    });
  });

  describe('Role-Based Scope Visibility', () => {
    it('should return correct scopes for member role', () => {
      const scopes = getVisibleScopesForRole('member');
      expect(scopes).toEqual(['member']);
    });

    it('should return correct scopes for steward/officer role', () => {
      expect(getVisibleScopesForRole('steward')).toEqual(['member', 'staff']);
      expect(getVisibleScopesForRole('officer')).toEqual(['member', 'staff']);
    });

    it('should return correct scopes for admin role', () => {
      const scopes = getVisibleScopesForRole('admin');
      expect(scopes).toEqual(['member', 'staff', 'admin']);
    });

    it('should return correct scopes for system role', () => {
      const scopes = getVisibleScopesForRole('system');
      expect(scopes).toEqual(['member', 'staff', 'admin', 'system']);
    });

    it('should default to member scopes for unknown roles', () => {
      const scopes = getVisibleScopesForRole('unknown_role');
      expect(scopes).toEqual(['member']);
    });
  });

  describe('Timeline Ordering', () => {
    it('should return events in reverse chronological order', async () => {
      const timeline = await getLroVisibleTimeline(testClaimId, testOrgId);

      // Check that timestamps are descending
      for (let i = 0; i < timeline.length - 1; i++) {
        expect(timeline[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          timeline[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Access Control', () => {
    it('should throw error for non-existent claim', async () => {
      await expect(
        getMemberVisibleTimeline(randomUUID(), testMemberId)
      ).rejects.toThrow('Claim not found');
    });

    it('should throw error when claim does not belong to organization', async () => {
      await expect(
        getLroVisibleTimeline(testClaimId, randomUUID())
      ).rejects.toThrow('Claim does not belong to this organization');
    });
  });
});
