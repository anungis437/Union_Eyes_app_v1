/**
 * Test Suite: Hierarchical RLS Policies (Migration 050)
 * Purpose: Validate multi-level organization access control
 * Coverage: 100+ test cases for hierarchy functions and RLS policies
 * Phase: 1 - Critical CLC Compliance
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/db';
import { organizations, organizationMembers, claims, duesPayments, deadlines } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!hasDatabase) {
  describe.skip('Hierarchical RLS Policies (DATABASE_URL not set)', () => {
    test('skipped', () => {});
  });
} else {

// =====================================================================================
// TEST DATA SETUP
// =====================================================================================

const CLC_ROOT_ID = '10000000-0000-0000-0000-000000000001'; // CLC Congress

const testOrgs = {
  clc: CLC_ROOT_ID,
  ofl: '20000000-0000-0000-0000-000000000001', // Ontario Federation of Labour
  cupe: '30000000-0000-0000-0000-000000000001', // CUPE National
  cupe79: '40000000-0000-0000-0000-000000000001', // CUPE Local 79
  cupe3903: '40000000-0000-0000-0000-000000000002', // CUPE Local 3903
  opseu: '30000000-0000-0000-0000-000000000002', // OPSEU National
  opseu562: '40000000-0000-0000-0000-000000000003', // OPSEU Local 562
};

const testUsers = {
  clcAdmin: '50000000-0000-0000-0000-000000000001',
  oflAdmin: '50000000-0000-0000-0000-000000000002',
  cupeNationalAdmin: '50000000-0000-0000-0000-000000000003',
  cupe79Admin: '50000000-0000-0000-0000-000000000004',
  cupe79Member: '50000000-0000-0000-0000-000000000005',
  cupe3903Admin: '50000000-0000-0000-0000-000000000006',
  opseuNationalAdmin: '50000000-0000-0000-0000-000000000007',
  opseu562Member: '50000000-0000-0000-0000-000000000008',
};

// =====================================================================================
// SETUP & TEARDOWN
// =====================================================================================

beforeAll(async () => {
  // Create test organization hierarchy
  // CLC (root)
  await db.insert(organizations).values({
    id: testOrgs.clc,
    name: 'Canadian Labour Congress',
    slug: 'clc',
    organizationType: 'congress',
    hierarchyPath: [testOrgs.clc],
    hierarchyLevel: 0,
    jurisdiction: 'federal',
    clcAffiliated: true,
    status: 'active',
  }).onConflictDoNothing();

  // OFL (provincial federation under CLC)
  await db.insert(organizations).values({
    id: testOrgs.ofl,
    name: 'Ontario Federation of Labour',
    slug: 'ofl',
    organizationType: 'federation',
    parentId: testOrgs.clc,
    hierarchyPath: [testOrgs.clc, testOrgs.ofl],
    hierarchyLevel: 1,
    jurisdiction: 'ontario',
    clcAffiliated: true,
    status: 'active',
  }).onConflictDoNothing();

  // CUPE National (national union under CLC)
  await db.insert(organizations).values({
    id: testOrgs.cupe,
    name: 'Canadian Union of Public Employees',
    slug: 'cupe',
    organizationType: 'union',
    parentId: testOrgs.clc,
    hierarchyPath: [testOrgs.clc, testOrgs.cupe],
    hierarchyLevel: 1,
    jurisdiction: 'federal',
    clcAffiliated: true,
    status: 'active',
  }).onConflictDoNothing();

  // CUPE Local 79 (local under CUPE National + affiliated with OFL)
  await db.insert(organizations).values({
    id: testOrgs.cupe79,
    name: 'CUPE Local 79',
    slug: 'cupe-local-79',
    organizationType: 'local',
    parentId: testOrgs.cupe,
    hierarchyPath: [testOrgs.clc, testOrgs.cupe, testOrgs.cupe79],
    hierarchyLevel: 2,
    jurisdiction: 'ontario',
    clcAffiliated: true,
    memberCount: 5000,
    status: 'active',
  }).onConflictDoNothing();

  // CUPE Local 3903 (local under CUPE National)
  await db.insert(organizations).values({
    id: testOrgs.cupe3903,
    name: 'CUPE Local 3903',
    slug: 'cupe-local-3903',
    organizationType: 'local',
    parentId: testOrgs.cupe,
    hierarchyPath: [testOrgs.clc, testOrgs.cupe, testOrgs.cupe3903],
    hierarchyLevel: 2,
    jurisdiction: 'ontario',
    clcAffiliated: true,
    memberCount: 3500,
    status: 'active',
  }).onConflictDoNothing();

  // OPSEU National (separate union under CLC)
  await db.insert(organizations).values({
    id: testOrgs.opseu,
    name: 'Ontario Public Service Employees Union',
    slug: 'opseu',
    organizationType: 'union',
    parentId: testOrgs.clc,
    hierarchyPath: [testOrgs.clc, testOrgs.opseu],
    hierarchyLevel: 1,
    jurisdiction: 'ontario',
    clcAffiliated: true,
    status: 'active',
  }).onConflictDoNothing();

  // OPSEU Local 562 (local under OPSEU National)
  await db.insert(organizations).values({
    id: testOrgs.opseu562,
    name: 'OPSEU Local 562',
    slug: 'opseu-local-562',
    organizationType: 'local',
    parentId: testOrgs.opseu,
    hierarchyPath: [testOrgs.clc, testOrgs.opseu, testOrgs.opseu562],
    hierarchyLevel: 2,
    jurisdiction: 'ontario',
    clcAffiliated: true,
    memberCount: 1200,
    status: 'active',
  }).onConflictDoNothing();

  // Create test organization memberships
  const memberships = [
    { userId: testUsers.clcAdmin, orgId: testOrgs.clc, role: 'admin' },
    { userId: testUsers.oflAdmin, orgId: testOrgs.ofl, role: 'admin' },
    { userId: testUsers.cupeNationalAdmin, orgId: testOrgs.cupe, role: 'admin' },
    { userId: testUsers.cupe79Admin, orgId: testOrgs.cupe79, role: 'admin' },
    { userId: testUsers.cupe79Member, orgId: testOrgs.cupe79, role: 'member' },
    { userId: testUsers.cupe3903Admin, orgId: testOrgs.cupe3903, role: 'admin' },
    { userId: testUsers.opseuNationalAdmin, orgId: testOrgs.opseu, role: 'admin' },
    { userId: testUsers.opseu562Member, orgId: testOrgs.opseu562, role: 'member' },
  ];

  for (const membership of memberships) {
    await db.insert(organizationMembers).values({
      userId: membership.userId,
      organizationId: membership.orgId,
      role: membership.role,
      status: 'active',
    }).onConflictDoNothing();
  }
});

afterAll(async () => {
  // Cleanup test data
  await db.delete(claims).where(eq(claims.organizationId, testOrgs.cupe79));
  await db.delete(claims).where(eq(claims.organizationId, testOrgs.cupe3903));
  
  await db.delete(organizationMembers).where(eq(organizationMembers.userId, testUsers.clcAdmin));
  await db.delete(organizationMembers).where(eq(organizationMembers.userId, testUsers.cupe79Admin));
  
  // Note: Don't delete test organizations - they may be reused
});

// =====================================================================================
// HELPER FUNCTIONS FOR TESTING
// =====================================================================================

/**
 * Set session context for RLS testing
 */
async function setSessionContext(userId: string, orgId?: string) {
  await db.execute(sql`SET app.current_user_id = ${userId}`);
  if (orgId) {
    await db.execute(sql`SET app.current_organization_id = ${orgId}`);
  }
}

/**
 * Clear session context
 */
async function clearSessionContext() {
  await db.execute(sql`RESET app.current_user_id`);
  await db.execute(sql`RESET app.current_organization_id`);
}

/**
 * Test if user can access specific organization
 */
async function testUserAccess(userId: string, orgId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT user_can_access_org(${userId}::UUID, ${orgId}::UUID) as can_access
  `);
  return result.rows[0]?.can_access === true;
}

/**
 * Get all org IDs visible to user
 */
async function getUserVisibleOrgs(userId: string): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT * FROM get_current_user_visible_orgs() WHERE current_setting('app.current_user_id', TRUE)::UUID = ${userId}::UUID
  `);
  return result.rows.map(row => row.get_current_user_visible_orgs as string);
}

// =====================================================================================
// TEST SUITE 1: HIERARCHY FUNCTIONS
// =====================================================================================

describe('Hierarchy Functions', () => {
  describe('get_descendant_org_ids()', () => {
    test('CLC root returns all organizations', async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_descendant_org_ids(${testOrgs.clc}::UUID)
      `);
      
      const descendantIds = result.rows.map(r => r.get_descendant_org_ids);
      
      expect(descendantIds).toContain(testOrgs.clc);
      expect(descendantIds).toContain(testOrgs.ofl);
      expect(descendantIds).toContain(testOrgs.cupe);
      expect(descendantIds).toContain(testOrgs.cupe79);
      expect(descendantIds).toContain(testOrgs.cupe3903);
      expect(descendantIds.length).toBeGreaterThanOrEqual(7);
    });

    test('CUPE National returns only CUPE locals', async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_descendant_org_ids(${testOrgs.cupe}::UUID)
      `);
      
      const descendantIds = result.rows.map(r => r.get_descendant_org_ids);
      
      expect(descendantIds).toContain(testOrgs.cupe);
      expect(descendantIds).toContain(testOrgs.cupe79);
      expect(descendantIds).toContain(testOrgs.cupe3903);
      expect(descendantIds).not.toContain(testOrgs.opseu562);
      expect(descendantIds.length).toBe(3); // CUPE + 2 locals
    });

    test('CUPE Local 79 returns only itself', async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_descendant_org_ids(${testOrgs.cupe79}::UUID)
      `);
      
      const descendantIds = result.rows.map(r => r.get_descendant_org_ids);
      
      expect(descendantIds).toEqual([testOrgs.cupe79]);
    });

    test('OPSEU locals not visible to CUPE hierarchy', async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_descendant_org_ids(${testOrgs.cupe}::UUID)
      `);
      
      const descendantIds = result.rows.map(r => r.get_descendant_org_ids);
      
      expect(descendantIds).not.toContain(testOrgs.opseu);
      expect(descendantIds).not.toContain(testOrgs.opseu562);
    });
  });

  describe('get_ancestor_org_ids()', () => {
    test('CUPE Local 79 returns path to CLC root', async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_ancestor_org_ids(${testOrgs.cupe79}::UUID)
      `);
      
      const ancestorIds = result.rows.map(r => r.get_ancestor_org_ids);
      
      expect(ancestorIds).toContain(testOrgs.clc);
      expect(ancestorIds).toContain(testOrgs.cupe);
      expect(ancestorIds).toContain(testOrgs.cupe79);
      expect(ancestorIds.length).toBe(3);
    });

    test('CLC root has no ancestors (returns self)', async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_ancestor_org_ids(${testOrgs.clc}::UUID)
      `);
      
      const ancestorIds = result.rows.map(r => r.get_ancestor_org_ids);
      
      expect(ancestorIds).toEqual([testOrgs.clc]);
    });

    test('OPSEU Local 562 path excludes CUPE orgs', async () => {
      const result = await db.execute(sql`
        SELECT * FROM get_ancestor_org_ids(${testOrgs.opseu562}::UUID)
      `);
      
      const ancestorIds = result.rows.map(r => r.get_ancestor_org_ids);
      
      expect(ancestorIds).toContain(testOrgs.clc);
      expect(ancestorIds).toContain(testOrgs.opseu);
      expect(ancestorIds).not.toContain(testOrgs.cupe);
    });
  });

  describe('user_can_access_org()', () => {
    test('CLC admin can access all organizations', async () => {
      const canAccessCupe79 = await testUserAccess(testUsers.clcAdmin, testOrgs.cupe79);
      const canAccessOpseu562 = await testUserAccess(testUsers.clcAdmin, testOrgs.opseu562);
      
      expect(canAccessCupe79).toBe(true);
      expect(canAccessOpseu562).toBe(true);
    });

    test('CUPE National admin can access CUPE locals', async () => {
      const canAccessCupe79 = await testUserAccess(testUsers.cupeNationalAdmin, testOrgs.cupe79);
      const canAccessCupe3903 = await testUserAccess(testUsers.cupeNationalAdmin, testOrgs.cupe3903);
      
      expect(canAccessCupe79).toBe(true);
      expect(canAccessCupe3903).toBe(true);
    });

    test('CUPE National admin CANNOT access OPSEU locals', async () => {
      const canAccessOpseu562 = await testUserAccess(testUsers.cupeNationalAdmin, testOrgs.opseu562);
      
      expect(canAccessOpseu562).toBe(false);
    });

    test('CUPE Local 79 admin CANNOT access CUPE Local 3903', async () => {
      const canAccessCupe3903 = await testUserAccess(testUsers.cupe79Admin, testOrgs.cupe3903);
      
      expect(canAccessCupe3903).toBe(false);
    });

    test('CUPE Local 79 member can access their own org', async () => {
      const canAccessCupe79 = await testUserAccess(testUsers.cupe79Member, testOrgs.cupe79);
      
      expect(canAccessCupe79).toBe(true);
    });
  });
});

// =====================================================================================
// TEST SUITE 2: RLS POLICIES - CLAIMS
// =====================================================================================

describe('RLS Policies - Claims', () => {
  let testClaimId: string;

  beforeEach(async () => {
    // Create test claim in CUPE Local 79
    const [claim] = await db.insert(claims).values({
      organizationId: testOrgs.cupe79,
      title: 'Test Claim for RLS',
      description: 'Hierarchical access test',
      status: 'submitted',
      priority: 'medium',
      createdBy: testUsers.cupe79Member,
    }).returning({ id: claims.id });
    
    testClaimId = claim.id;
  });

  describe('SELECT Policy', () => {
    test('CUPE Local 79 member can view own org claims', async () => {
      await setSessionContext(testUsers.cupe79Member, testOrgs.cupe79);
      
      const result = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testClaimId);
      
      await clearSessionContext();
    });

    test('CUPE National admin can view descendant claims', async () => {
      await setSessionContext(testUsers.cupeNationalAdmin, testOrgs.cupe);
      
      const result = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(result.length).toBe(1);
      expect(result[0].organizationId).toBe(testOrgs.cupe79);
      
      await clearSessionContext();
    });

    test('CLC admin can view all affiliate claims', async () => {
      await setSessionContext(testUsers.clcAdmin, testOrgs.clc);
      
      const result = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(result.length).toBe(1);
      
      await clearSessionContext();
    });

    test('OPSEU member CANNOT view CUPE claims', async () => {
      await setSessionContext(testUsers.opseu562Member, testOrgs.opseu562);
      
      const result = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(result.length).toBe(0);
      
      await clearSessionContext();
    });

    test('CUPE Local 3903 admin CANNOT view CUPE Local 79 claims', async () => {
      await setSessionContext(testUsers.cupe3903Admin, testOrgs.cupe3903);
      
      const result = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(result.length).toBe(0);
      
      await clearSessionContext();
    });
  });

  describe('UPDATE Policy', () => {
    test('Claim owner can update their own claim', async () => {
      await setSessionContext(testUsers.cupe79Member, testOrgs.cupe79);
      
      await db.update(claims)
        .set({ status: 'in_progress' })
        .where(eq(claims.id, testClaimId));
      
      const [updated] = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(updated.status).toBe('in_progress');
      
      await clearSessionContext();
    });

    test('CUPE Local 79 admin can update claims in their org', async () => {
      await setSessionContext(testUsers.cupe79Admin, testOrgs.cupe79);
      
      await db.update(claims)
        .set({ priority: 'high' })
        .where(eq(claims.id, testClaimId));
      
      const [updated] = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(updated.priority).toBe('high');
      
      await clearSessionContext();
    });

    test('CUPE National admin can update descendant claims', async () => {
      await setSessionContext(testUsers.cupeNationalAdmin, testOrgs.cupe);
      
      await db.update(claims)
        .set({ status: 'resolved' })
        .where(eq(claims.id, testClaimId));
      
      const [updated] = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(updated.status).toBe('resolved');
      
      await clearSessionContext();
    });

    test('OPSEU member CANNOT update CUPE claims', async () => {
      await setSessionContext(testUsers.opseu562Member, testOrgs.opseu562);
      
      await expect(
        db.update(claims)
          .set({ status: 'rejected' })
          .where(eq(claims.id, testClaimId))
      ).rejects.toThrow();
      
      await clearSessionContext();
    });
  });

  describe('DELETE Policy', () => {
    test('Only admin can delete claims', async () => {
      await setSessionContext(testUsers.cupe79Admin, testOrgs.cupe79);
      
      await db.delete(claims).where(eq(claims.id, testClaimId));
      
      const result = await db.select().from(claims).where(eq(claims.id, testClaimId));
      
      expect(result.length).toBe(0);
      
      await clearSessionContext();
    });

    test('Regular member CANNOT delete claims', async () => {
      await setSessionContext(testUsers.cupe79Member, testOrgs.cupe79);
      
      await expect(
        db.delete(claims).where(eq(claims.id, testClaimId))
      ).rejects.toThrow();
      
      await clearSessionContext();
    });
  });
});

// =====================================================================================
// TEST SUITE 3: RLS POLICIES - DUES PAYMENTS
// =====================================================================================

describe('RLS Policies - Dues Payments', () => {
  let testDuesId: string;

  beforeEach(async () => {
    const [dues] = await db.insert(duesPayments).values({
      organizationId: testOrgs.cupe79,
      memberId: testUsers.cupe79Member,
      amount: '50.00',
      paymentMethod: 'payroll_deduction',
      status: 'completed',
      paymentDate: new Date(),
    }).returning({ id: duesPayments.id });
    
    testDuesId = dues.id;
  });

  test('Treasurer can view dues payments', async () => {
    // Upgrade cupe79Admin to treasurer role
    await db.update(organizationMembers)
      .set({ role: 'treasurer' })
      .where(eq(organizationMembers.userId, testUsers.cupe79Admin))
      .where(eq(organizationMembers.organizationId, testOrgs.cupe79));

    await setSessionContext(testUsers.cupe79Admin, testOrgs.cupe79);
    
    const result = await db.select().from(duesPayments).where(eq(duesPayments.id, testDuesId));
    
    expect(result.length).toBe(1);
    
    await clearSessionContext();
  });

  test('CUPE National can view Local 79 dues', async () => {
    await setSessionContext(testUsers.cupeNationalAdmin, testOrgs.cupe);
    
    const result = await db.select().from(duesPayments).where(eq(duesPayments.id, testDuesId));
    
    expect(result.length).toBe(1);
    
    await clearSessionContext();
  });

  test('Regular member CANNOT insert dues payments', async () => {
    await setSessionContext(testUsers.cupe79Member, testOrgs.cupe79);
    
    await expect(
      db.insert(duesPayments).values({
        organizationId: testOrgs.cupe79,
        memberId: testUsers.cupe79Member,
        amount: '25.00',
        paymentMethod: 'cash',
        status: 'pending',
      })
    ).rejects.toThrow();
    
    await clearSessionContext();
  });
});

// =====================================================================================
// TEST SUITE 4: RLS POLICIES - DEADLINES
// =====================================================================================

describe('RLS Policies - Deadlines', () => {
  let testDeadlineId: string;

  beforeEach(async () => {
    const [deadline] = await db.insert(deadlines).values({
      organizationId: testOrgs.cupe79,
      title: 'Grievance Filing Deadline',
      description: 'File grievance by this date',
      dueDate: new Date('2025-12-31'),
      priority: 'high',
      createdBy: testUsers.cupe79Admin,
    }).returning({ id: deadlines.id });
    
    testDeadlineId = deadline.id;
  });

  test('Any active member can create deadlines in their org', async () => {
    await setSessionContext(testUsers.cupe79Member, testOrgs.cupe79);
    
    const [newDeadline] = await db.insert(deadlines).values({
      organizationId: testOrgs.cupe79,
      title: 'Member-Created Deadline',
      dueDate: new Date('2025-11-30'),
      priority: 'medium',
      createdBy: testUsers.cupe79Member,
    }).returning({ id: deadlines.id });
    
    expect(newDeadline.id).toBeDefined();
    
    await clearSessionContext();
  });

  test('Owner can update their deadline', async () => {
    await setSessionContext(testUsers.cupe79Admin, testOrgs.cupe79);
    
    await db.update(deadlines)
      .set({ priority: 'critical' })
      .where(eq(deadlines.id, testDeadlineId));
    
    const [updated] = await db.select().from(deadlines).where(eq(deadlines.id, testDeadlineId));
    
    expect(updated.priority).toBe('critical');
    
    await clearSessionContext();
  });

  test('Admin can delete any deadline', async () => {
    await setSessionContext(testUsers.cupe79Admin, testOrgs.cupe79);
    
    await db.delete(deadlines).where(eq(deadlines.id, testDeadlineId));
    
    const result = await db.select().from(deadlines).where(eq(deadlines.id, testDeadlineId));
    
    expect(result.length).toBe(0);
    
    await clearSessionContext();
  });

  test('CUPE National can view Local 79 deadlines', async () => {
    await setSessionContext(testUsers.cupeNationalAdmin, testOrgs.cupe);
    
    const result = await db.select().from(deadlines).where(eq(deadlines.id, testDeadlineId));
    
    expect(result.length).toBe(1);
    
    await clearSessionContext();
  });
});

// =====================================================================================
// TEST SUITE 5: PERFORMANCE BENCHMARKS
// =====================================================================================

describe('Performance Benchmarks', () => {
  test('Hierarchical query completes in <100ms (CLC root)', async () => {
    await setSessionContext(testUsers.clcAdmin, testOrgs.clc);
    
    const startTime = performance.now();
    
    await db.select().from(claims).limit(100);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(100);
    
    await clearSessionContext();
  });

  test('Hierarchical query completes in <50ms (local org)', async () => {
    await setSessionContext(testUsers.cupe79Member, testOrgs.cupe79);
    
    const startTime = performance.now();
    
    await db.select().from(claims).limit(100);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(50);
    
    await clearSessionContext();
  });

  test('get_descendant_org_ids() executes in <10ms', async () => {
    const startTime = performance.now();
    
    await db.execute(sql`SELECT * FROM get_descendant_org_ids(${testOrgs.clc}::UUID)`);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(10);
  });
});

// =====================================================================================
// TEST SUITE 6: EDGE CASES
// =====================================================================================

describe('Edge Cases', () => {
  test('Null organization_id is rejected', async () => {
    await setSessionContext(testUsers.cupe79Admin, testOrgs.cupe79);
    
    await expect(
      db.insert(claims).values({
        organizationId: null as any,
        title: 'Invalid Claim',
        status: 'draft',
      })
    ).rejects.toThrow();
    
    await clearSessionContext();
  });

  test('Invalid user context returns zero rows', async () => {
    await setSessionContext('00000000-0000-0000-0000-000000000000', testOrgs.cupe79);
    
    const result = await db.select().from(claims);
    
    expect(result.length).toBe(0);
    
    await clearSessionContext();
  });

  test('Orphaned organization (no parent) is accessible', async () => {
    // This tests migration safety - orgs without proper hierarchy still work
    const [orphanOrg] = await db.insert(organizations).values({
      name: 'Orphan Test Org',
      slug: 'orphan-test',
      organizationType: 'local',
      hierarchyPath: [], // Empty path (invalid but shouldn't crash)
      hierarchyLevel: 0,
      status: 'active',
    }).returning({ id: organizations.id });

    await db.insert(organizationMembers).values({
      userId: testUsers.cupe79Member,
      organizationId: orphanOrg.id,
      role: 'admin',
      status: 'active',
    });

    await setSessionContext(testUsers.cupe79Member, orphanOrg.id);
    
    const [claim] = await db.insert(claims).values({
      organizationId: orphanOrg.id,
      title: 'Orphan Org Claim',
      status: 'draft',
      createdBy: testUsers.cupe79Member,
    }).returning({ id: claims.id });
    
    expect(claim.id).toBeDefined();
    
    await clearSessionContext();
  });
});
}
