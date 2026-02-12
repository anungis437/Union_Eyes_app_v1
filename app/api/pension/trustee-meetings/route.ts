import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * API Route: Pension Trustee Meetings
 * CRUD operations for trustee meeting management
 * Phase 2: Pension & H&W Trust System
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { pensionTrusteeMeetings, pensionTrustees } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { searchParams } = new URL(request.url);
      const trustBoardId = searchParams.get('trustBoardId');
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!trustBoardId) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - trustBoardId is required'
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
        userId: userId,
        trustBoardId: request.nextUrl.searchParams.get('trustBoardId'),
        correlationId: request.headers.get('x-correlation-id'),
  });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};


const pensionTrusteeMeetingsSchema = z.object({
  trustBoardId: z.string().uuid('Invalid trustBoardId'),
  meetingDate: z.string().datetime().optional(),
  meetingType: z.unknown().optional(),
  location: z.unknown().optional(),
  agendaItems: z.unknown().optional(),
  attendeeIds: z.array(z.string().uuid('Invalid attendee ID')).optional().default([]),
  quorumMet: z.unknown().optional(),
  minutesDocument: z.unknown().optional(),
  votingRecords: z.unknown().optional(),
});

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const body = await request.json();
    // Validate request body
    const validation = pensionTrustee-meetingsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { trustBoardId, meetingDate, meetingType, location, agendaItems, attendeeIds = [], quorumMet, minutesDocument, votingRecords } = validation.data;
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
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Bad Request - trustBoardId, meetingDate, and meetingType are required'
      // TODO: Migrate additional details: meetingDate, and meetingType are required'
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
        userId: userId,
        correlationId: request.headers.get('x-correlation-id'),
  });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal Server Error',
      error
    );
  }
  })(request);
};

