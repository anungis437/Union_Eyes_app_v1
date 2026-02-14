/**
 * Individual Outreach Sequence API
 * 
 * Endpoints:
 * - GET /api/organizing/sequences/[id] - Get sequence details
 * - PUT /api/organizing/sequences/[id] - Update sequence
 * - DELETE /api/organizing/sequences/[id] - Delete sequence
 * 
 * Phase 4: Communications & Organizing - Organizer Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { outreachSequences, outreachEnrollments } from '@/db/schema';
import { and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/organizing/sequences/[id]
 * Get outreach sequence details with enrollment stats
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

    const sequence = await db
      .select()
      .from(outreachSequences)
      .where(
        and(
          eq(outreachSequences.id, params.id),
          eq(outreachSequences.organizationId, organizationId)
        )
      )
      .limit(1);

    if (sequence.length === 0) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Get current enrollment counts
    const enrollmentStats = await db
      .select({
        status: outreachEnrollments.status,
        count: sql<number>`count(*)`,
      })
      .from(outreachEnrollments)
      .where(
        and(
          eq(outreachEnrollments.sequenceId, params.id),
          eq(outreachEnrollments.organizationId, organizationId)
        )
      )
      .groupBy(outreachEnrollments.status);

    // Format enrollment stats
    const stats = {
      enrolled: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };

    enrollmentStats.forEach((stat: Record<string, unknown>) => {
      const count = Number(stat.count);
      if (stat.status === 'active') stats.active = count;
      if (stat.status === 'completed') stats.completed = count;
      if (stat.status === 'cancelled') stats.cancelled = count;
      stats.enrolled += count;
    });

    return NextResponse.json({
      ...sequence[0],
      currentStats: stats,
    });
  } catch (error) {
    logger.error('[API] Error fetching outreach sequence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outreach sequence' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizing/sequences/[id]
 * Update outreach sequence
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

    // Verify sequence exists
    const existing = await db
      .select()
      .from(outreachSequences)
      .where(
        and(
          eq(outreachSequences.id, params.id),
          eq(outreachSequences.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Build update object
    const updateData = {
      updatedBy: userId,
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.triggerType !== undefined) updateData.triggerType = body.triggerType;
    if (body.triggerConditions !== undefined) updateData.triggerConditions = body.triggerConditions;
    if (body.steps !== undefined) {
      // Validate steps structure
      if (!Array.isArray(body.steps) || body.steps.length === 0) {
        return NextResponse.json(
          { error: 'Steps must be a non-empty array' },
          { status: 400 }
        );
      }
      updateData.steps = body.steps;
    }
    if (body.status !== undefined) updateData.status = body.status;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.tags !== undefined) updateData.tags = body.tags;

    // Update sequence
    const [updated] = await db
      .update(outreachSequences)
      .set(updateData)
      .where(
        and(
          eq(outreachSequences.id, params.id),
          eq(outreachSequences.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('[API] Error updating outreach sequence:', error);
    return NextResponse.json(
      { error: 'Failed to update outreach sequence' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizing/sequences/[id]
 * Delete outreach sequence (soft delete by setting isActive = false)
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

    // Verify sequence exists
    const existing = await db
      .select()
      .from(outreachSequences)
      .where(
        and(
          eq(outreachSequences.id, params.id),
          eq(outreachSequences.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Check if there are active enrollments
    const activeEnrollments = await db
      .select({ count: sql<number>`count(*)` })
      .from(outreachEnrollments)
      .where(
        and(
          eq(outreachEnrollments.sequenceId, params.id),
          eq(outreachEnrollments.organizationId, organizationId),
          eq(outreachEnrollments.status, 'active')
        )
      );

    const activeCount = Number(activeEnrollments[0].count);
    if (activeCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete sequence with ${activeCount} active enrollments. Please cancel or complete enrollments first.`,
          activeEnrollments: activeCount,
        },
        { status: 409 }
      );
    }

    // Soft delete: set isActive = false and status = cancelled
    const [deleted] = await db
      .update(outreachSequences)
      .set({
        isActive: false,
        status: 'cancelled',
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(outreachSequences.id, params.id),
          eq(outreachSequences.organizationId, organizationId)
        )
      )
      .returning();

    return NextResponse.json({ success: true, sequence: deleted });
  } catch (error) {
    logger.error('[API] Error deleting outreach sequence:', error);
    return NextResponse.json(
      { error: 'Failed to delete outreach sequence' },
      { status: 500 }
    );
  }
}
