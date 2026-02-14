/**
 * Testimonials API - Individual Testimonial Operations
 * 
 * SPRINT 7: Protected with admin authentication
 * 
 * Handles updates to testimonial status (approve/reject/feature).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { testimonials } from '@/db/schema/domains/marketing';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/middleware/admin-auth';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/testimonials/[id]
 * 
 * Get single testimonial
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;

    const [testimonial] = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id))
      .limit(1);

    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ testimonial });
  } catch (error) {
    logger.error('Error fetching testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonial' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/testimonials/[id]
 * 
 * Update testimonial (approve/reject/feature)
 * 
 * SPRINT 7: Protected - Admin authentication required
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  // SPRINT 7: Require admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId, organizationId } = authResult;

  try {
    const { id } = params;
    const body = await request.json();
    const { status, isFeatured, reviewedBy, reviewedAt, rejectionReason } = body;

    // Validate status if provided
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build update payload
    const updateData = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured;
    }

    if (reviewedBy !== undefined) {
      updateData.reviewedBy = reviewedBy;
    }

    if (reviewedAt !== undefined) {
      updateData.reviewedAt = new Date(reviewedAt);
    }

    if (rejectionReason !== undefined) {
      updateData.rejectionReason = rejectionReason;
    }

    // Update in database
    const [testimonial] = await db
      .update(testimonials)
      .set(updateData)
      .where(eq(testimonials.id, id))
      .returning();

    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ testimonial });
  } catch (error) {
    logger.error('Error updating testimonial:', error);
    return NextResponse.json(
      { error: 'Failed to update testimonial' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/testimonials/[id]
 * 
 * Delete testimonial
 * 
 * SPRINT 7: Protected - Admin authentication required
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  // SPRINT 7: Require admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = params;

    const [testimonial] = await db
      .delete(testimonials)
      .where(eq(testimonials.id, id))
      .returning();

    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting testimonial', error);
    return NextResponse.json(
      { error: 'Failed to delete testimonial' },
      { status: 500 }
    );
  }
}
