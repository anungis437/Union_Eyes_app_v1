/**
 * Steward Assignments API
 * 
 * Endpoints:
 * - GET /api/organizing/assignments - List assignments (with filters)
 * - POST /api/organizing/assignments - Create new assignment
 * 
 * Phase 4: Communications & Organizing - Organizer Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stewardAssignments } from '@/db/schema';
import { and, or, isNull, desc } from 'drizzle-orm';

/**
 * GET /api/organizing/assignments
 * List steward assignments with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization context (simplified - should use RLS)
    // In production, this would be enforced at database level
    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    // Query parameters
    const searchParams = request.nextUrl.searchParams;
    const stewardId = searchParams.get('stewardId');
    const memberId = searchParams.get('memberId');
    const assignmentType = searchParams.get('assignmentType');
    const isActive = searchParams.get('isActive');
    const effectiveDate = searchParams.get('effectiveDate');
    const worksiteId = searchParams.get('worksiteId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [eq(stewardAssignments.organizationId, organizationId)];

    if (stewardId) {
      conditions.push(eq(stewardAssignments.stewardId, stewardId));
    }

    if (memberId) {
      conditions.push(eq(stewardAssignments.memberId, memberId));
    }

    if (assignmentType) {
      conditions.push(eq(stewardAssignments.assignmentType, assignmentType));
    }

    if (isActive !== null && isActive !== undefined) {
      conditions.push(eq(stewardAssignments.isActive, isActive === 'true'));
    }

    if (effectiveDate) {
      const targetDate = new Date(effectiveDate);
      conditions.push(
        and(
          lte(stewardAssignments.effectiveDate, targetDate.toISOString()),
          or(
            isNull(stewardAssignments.endDate),
            gte(stewardAssignments.endDate, targetDate.toISOString())
          )
        ) as Record<string, unknown>
      );
    }

    if (worksiteId) {
      conditions.push(eq(stewardAssignments.worksiteId, worksiteId));
    }

    // Fetch assignments
    const assignments = await db
      .select()
      .from(stewardAssignments)
      .where(and(...conditions))
      .orderBy(desc(stewardAssignments.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stewardAssignments)
      .where(and(...conditions));

    return NextResponse.json({
      assignments,
      pagination: {
        total: Number(count),
        limit,
        offset,
        hasMore: Number(count) > offset + limit,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching steward assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steward assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizing/assignments
 * Create new steward assignment
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.stewardId || !body.memberId || !body.effectiveDate) {
      return NextResponse.json(
        { error: 'Missing required fields: stewardId, memberId, effectiveDate' },
        { status: 400 }
      );
    }

    // Check for existing active assignments of the same type
    if (body.assignmentType === 'primary') {
      const existingPrimary = await db
        .select()
        .from(stewardAssignments)
        .where(
          and(
            eq(stewardAssignments.organizationId, organizationId),
            eq(stewardAssignments.memberId, body.memberId),
            eq(stewardAssignments.assignmentType, 'primary'),
            eq(stewardAssignments.isActive, true),
            isNull(stewardAssignments.endDate)
          )
        )
        .limit(1);

      if (existingPrimary.length > 0) {
        return NextResponse.json(
          { error: 'Member already has an active primary steward assignment' },
          { status: 409 }
        );
      }
    }

    // Create assignment
    const [assignment] = await db
      .insert(stewardAssignments)
      .values({
        organizationId,
        stewardId: body.stewardId,
        memberId: body.memberId,
        assignmentType: body.assignmentType || 'primary',
        effectiveDate: body.effectiveDate,
        endDate: body.endDate || null,
        worksiteId: body.worksiteId || null,
        departmentId: body.departmentId || null,
        notes: body.notes || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        metadata: body.metadata || {},
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create steward assignment' },
      { status: 500 }
    );
  }
}
