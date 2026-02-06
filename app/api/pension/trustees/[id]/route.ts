/**
 * API Route: Single Pension Trustee
 * Get, update, or remove a specific trustee
 * Phase 2: Pension & H&W Trust System
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { pensionTrustees } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pension/trustees/[id]
 * Get single trustee details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const trustee = await db
      .select()
      .from(pensionTrustees)
      .where(eq(pensionTrustees.id, params.id))
      .limit(1);

    if (!trustee || trustee.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Trustee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trustee[0],
    });

  } catch (error) {
    logger.error('Failed to fetch trustee', error as Error, {
      userId: (await auth()).userId,
      trusteeId: params.id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pension/trustees/[id]
 * Update trustee details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updates = {
      ...body,
      updatedAt: new Date(),
    };

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.createdAt;
    delete updates.trustBoardId; // Can't change board
    delete updates.memberId; // Can't change member

    const result = await db
      .update(pensionTrustees)
      .set(updates)
      .where(eq(pensionTrustees.id, params.id))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Trustee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Trustee updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update trustee', error as Error, {
      userId: (await auth()).userId,
      trusteeId: params.id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pension/trustees/[id]
 * Remove trustee from board (sets status to 'removed')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Soft delete: update status instead of hard delete
    const result = await db
      .update(pensionTrustees)
      .set({
        isCurrent: false,
        termEndDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pensionTrustees.id, params.id))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Trustee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trustee removed from board successfully',
    });

  } catch (error) {
    logger.error('Failed to remove trustee', error as Error, {
      userId: (await auth()).userId,
      trusteeId: params.id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
