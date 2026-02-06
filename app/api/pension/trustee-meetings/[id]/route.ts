/**
 * API Route: Single Trustee Meeting
 * Get, update, or delete a specific trustee meeting
 * Phase 2: Pension & H&W Trust System
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { pensionTrusteeMeetings } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pension/trustee-meetings/[id]
 * Get single meeting details
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

    const meeting = await db
      .select()
      .from(pensionTrusteeMeetings)
      .where(eq(pensionTrusteeMeetings.id, params.id))
      .limit(1);

    if (!meeting || meeting.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: meeting[0],
    });

  } catch (error) {
    logger.error('Failed to fetch trustee meeting', error as Error, {
      userId: (await auth()).userId,
      meetingId: params.id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pension/trustee-meetings/[id]
 * Update meeting details (minutes, attendees, voting records)
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
    delete updates.trustBoardId; // Can't change board after creation

    const result = await db
      .update(pensionTrusteeMeetings)
      .set(updates)
      .where(eq(pensionTrusteeMeetings.id, params.id))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Meeting updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update trustee meeting', error as Error, {
      userId: (await auth()).userId,
      meetingId: params.id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pension/trustee-meetings/[id]
 * Delete meeting record
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

    const result = await db
      .delete(pensionTrusteeMeetings)
      .where(eq(pensionTrusteeMeetings.id, params.id))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Not Found - Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting deleted successfully',
    });

  } catch (error) {
    logger.error('Failed to delete trustee meeting', error as Error, {
      userId: (await auth()).userId,
      meetingId: params.id,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
