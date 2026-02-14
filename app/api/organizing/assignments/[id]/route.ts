/**
 * Individual Steward Assignment API
 * 
 * Endpoints:
 * - GET /api/organizing/assignments/[id] - Get assignment details
 * - PUT /api/organizing/assignments/[id] - Update assignment
 * - DELETE /api/organizing/assignments/[id] - Delete assignment
 * 
 * Phase 4: Communications & Organizing - Organizer Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { stewardAssignments } from '@/db/schema';
import { and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/organizing/assignments/[id]
 * Get steward assignment details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const assignment = await db
      .select()
      .from(stewardAssignments)
      .where(
        and(
          eq(stewardAssignments.id, params.id),
          eq(stewardAssignments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json(assignment[0]);
  } catch (error) {
    logger.error('[API] Error fetching steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steward assignment' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizing/assignments/[id]
 * Update steward assignment
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Verify assignment exists and belongs to organization
    const existing = await db
      .select()
      .from(stewardAssignments)
      .where(
        and(
          eq(stewardAssignments.id, params.id),
          eq(stewardAssignments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Build update object (only include fields that are provided)
    const updateData = {
      updatedBy: userId,
      updatedAt: new Date(),
    };

    if (body.stewardId !== undefined) updateData.stewardId = body.stewardId;
    if (body.memberId !== undefined) updateData.memberId = body.memberId;
    if (body.assignmentType !== undefined) updateData.assignmentType = body.assignmentType;
    if (body.effectiveDate !== undefined) updateData.effectiveDate = body.effectiveDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.worksiteId !== undefined) updateData.worksiteId = body.worksiteId;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Update assignment
    const [updated] = await db
      .update(stewardAssignments)
      .set(updateData)
      .where(
        and(
          eq(stewardAssignments.id, params.id),
          eq(stewardAssignments.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('[API] Error updating steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update steward assignment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizing/assignments/[id]
 * Delete steward assignment (soft delete by setting isActive = false and endDate = now)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    // Verify assignment exists
    const existing = await db
      .select()
      .from(stewardAssignments)
      .where(
        and(
          eq(stewardAssignments.id, params.id),
          eq(stewardAssignments.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Soft delete: set isActive = false and endDate = today
    const [deleted] = await db
      .update(stewardAssignments)
      .set({
        isActive: false,
        endDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stewardAssignments.id, params.id),
          eq(stewardAssignments.organizationId, organizationId)
        )
      )
      .returning();

    return NextResponse.json({ success: true, assignment: deleted });
  } catch (error) {
    logger.error('[API] Error deleting steward assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete steward assignment' },
      { status: 500 }
    );
  }
}
