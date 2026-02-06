/**
 * API Route: Pension Trustee Meetings
 * CRUD operations for trustee meeting management
 * Phase 2: Pension & H&W Trust System
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { pensionTrusteeMeetings, pensionTrustees } from '@/db/migrations/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pension/trustee-meetings?trustBoardId=xxx
 * List all meetings for a trust board
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trustBoardId = searchParams.get('trustBoardId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!trustBoardId) {
      return NextResponse.json(
        { error: 'Bad Request - trustBoardId is required' },
        { status: 400 }
      );
    }

    const meetings = await db
      .select()
      .from(pensionTrusteeMeetings)
      .where(eq(pensionTrusteeMeetings.trusteeBoardId, trustBoardId))
      .orderBy(desc(pensionTrusteeMeetings.meetingDate))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: meetings,
      count: meetings.length,
    });

  } catch (error) {
    logger.error('Failed to fetch trustee meetings', error as Error, {
      userId: (await auth()).userId,
      trustBoardId: request.nextUrl.searchParams.get('trustBoardId'),
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pension/trustee-meetings
 * Create new trustee meeting
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      trustBoardId,
      meetingDate,
      meetingType,
      location,
      agendaItems,
      attendeeIds = [],
      quorumMet,
      minutesDocument,
      votingRecords,
    } = body;

    // Validate required fields
    if (!trustBoardId || !meetingDate || !meetingType) {
      return NextResponse.json(
        { error: 'Bad Request - trustBoardId, meetingDate, and meetingType are required' },
        { status: 400 }
      );
    }

    // Insert meeting
    const result = await db
      .insert(pensionTrusteeMeetings)
      .values({
        trusteeBoardId: trustBoardId,
        meetingTitle: `Meeting - ${new Date(meetingDate).toLocaleDateString()}`,
        meetingDate: new Date(meetingDate).toISOString().split('T')[0],
        meetingType,
        meetingLocation: location,
        quorumMet,
        motions: votingRecords,
        createdBy: userId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Trustee meeting created successfully',
    });

  } catch (error) {
    logger.error('Failed to create trustee meeting', error as Error, {
      userId: (await auth()).userId,
      correlationId: request.headers.get('x-correlation-id'),
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
