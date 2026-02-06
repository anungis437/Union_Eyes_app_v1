/**
 * API Route: Single Pension Plan
 * Get, update, or delete a specific pension plan
 * Phase 1: Pension & Health/Welfare
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { pensionPlans } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pension/plans/[id]
 * Get a specific pension plan by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;

    const [plan] = await db
      .select()
      .from(pensionPlans)
      .where(eq(pensionPlans.id, id))
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: 'Not Found - Pension plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });

  } catch (error) {
    logger.error('Failed to fetch pension plan', error as Error, {
      planId: params.id,
      userId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pension/plans/[id]
 * Update a pension plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Update pension plan
    const [updatedPlan] = await db
      .update(pensionPlans)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pensionPlans.id, id))
      .returning();

    if (!updatedPlan) {
      return NextResponse.json(
        { error: 'Not Found - Pension plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPlan,
      message: 'Pension plan updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update pension plan', error as Error, {
      planId: params.id,
      userId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pension/plans/[id]
 * Delete a pension plan (soft delete by setting isActive = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Soft delete by setting planStatus = 'closed'
    const [deletedPlan] = await db
      .update(pensionPlans)
      .set({
        planStatus: 'closed',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pensionPlans.id, id))
      .returning();

    if (!deletedPlan) {
      return NextResponse.json(
        { error: 'Not Found - Pension plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pension plan deleted successfully',
    });

  } catch (error) {
    logger.error('Failed to delete pension plan', error as Error, {
      planId: params.id,
      userId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
