/**
 * Federation Meetings API Route
 * 
 * Manage federation meetings, conventions, and executive board sessions.
 * Track attendance, decisions, and meeting minutes for provincial federations.
 * 
 * Authentication: Minimum role level 160 (fed_staff)
 * RLS: Organization-level isolation enforced by database policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { organizations } from '@/db/schema-organizations';
import { calendarEvents } from '@/db/schema';
import { and, desc, or, like } from 'drizzle-orm';
import { logApiAuditEvent } from '@/lib/middleware/api-security';
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiter';
import { standardSuccessResponse,
} from '@/lib/api/standardized-responses';

/**
 * Validation schema for creating federation meetings
 */
const createMeetingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  meetingType: z.enum([
    'executive_board',
    'general_assembly',
    'convention',
    'committee_meeting',
    'special_meeting',
    'quarterly_meeting',
    'annual_meeting',
  ]),
  description: z.string().max(2000).optional(),
  
  // Date & Time
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Invalid datetime format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Invalid datetime format'),
  timezone: z.string().default('America/Toronto'),
  
  // Location
  location: z.string().max(500).optional(),
  isVirtual: z.boolean().default(false),
  meetingLink: z.string().url().optional(),
  
  // Attendees & Participants
  expectedAttendees: z.number().int().positive().optional(),
  invitedAffiliates: z.array(z.string().uuid()).optional(),
  
  // Meeting Details
  agenda: z.string().max(5000).optional(),
  attachments: z.array(z.string().url()).optional(),
  
  // Visibility
  isPublic: z.boolean().default(false),
  requiresRegistration: z.boolean().default(false),
  
  // Additional metadata
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/federations/[id]/meetings
 * List meetings for a specific federation
 * 
 * Query parameters:
 * - from_date: Filter meetings from this date (YYYY-MM-DD)
 * - to_date: Filter meetings to this date (YYYY-MM-DD)
 * - meeting_type: Filter by meeting type
 * - status: Filter by status (upcoming, past, cancelled)
 * - search: Search in title and description
 * - limit: Number of results (default 50, max 200)
 * - offset: Pagination offset
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(160, async (request, context) => {
    const { userId } = context;

    try {
      const federationId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 100,
        window: 60,
        identifier: 'federation-meetings-read',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many meeting read requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const { searchParams } = new URL(request.url);
      const fromDate = searchParams.get('from_date');
      const toDate = searchParams.get('to_date');
      const meetingType = searchParams.get('meeting_type');
      const status = searchParams.get('status') || 'all';
      const search = searchParams.get('search');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
      const offset = parseInt(searchParams.get('offset') || '0');

      return withRLSContext(async (tx) => {
        // Verify federation exists
        const [federation] = await tx
          .select({
            id: organizations.id,
            name: organizations.name,
            shortName: organizations.shortName,
          })
          .from(organizations)
          .where(
            and(
              eq(organizations.id, federationId),
              eq(organizations.organizationType, 'federation')
            )
          );

        if (!federation) {
          return standardErrorResponse(ErrorCode.NOT_FOUND, 'Federation not found');
        }

        // Build query conditions
        const conditions = [
          eq(calendarEvents.organizationId, federationId),
          sql`${calendarEvents.eventType} IN ('meeting', 'convention', 'assembly')`,
        ];

        const now = new Date();

        if (status === 'upcoming') {
          conditions.push(gte(calendarEvents.startDate, now));
        } else if (status === 'past') {
          conditions.push(lte(calendarEvents.endDate, now));
        }

        if (fromDate) {
          conditions.push(gte(calendarEvents.startDate, new Date(fromDate)));
        }

        if (toDate) {
          conditions.push(lte(calendarEvents.endDate, new Date(toDate)));
        }

        if (meetingType) {
          conditions.push(
            sql`${calendarEvents.metadata}->>'meetingType' = ${meetingType}`
          );
        }

        if (search) {
          const searchPattern = `%${search}%`;
          conditions.push(
            or(
              like(calendarEvents.title, searchPattern),
              like(calendarEvents.description, searchPattern)
            )!
          );
        }

        // Fetch meetings
        const meetings = await tx
          .select({
            id: calendarEvents.id,
            title: calendarEvents.title,
            description: calendarEvents.description,
            eventType: calendarEvents.eventType,
            startDate: calendarEvents.startDate,
            endDate: calendarEvents.endDate,
            location: calendarEvents.location,
            isVirtual: calendarEvents.isVirtual,
            virtualLink: calendarEvents.virtualLink,
            attendees: calendarEvents.attendees,
            metadata: calendarEvents.metadata,
            tags: calendarEvents.tags,
            status: calendarEvents.status,
            createdAt: calendarEvents.createdAt,
            createdBy: calendarEvents.createdBy,
          })
          .from(calendarEvents)
          .where(and(...conditions))
          .orderBy(desc(calendarEvents.startDate))
          .limit(limit)
          .offset(offset);

        // Enrich with status indicators
        const enrichedMeetings = meetings.map((meeting) => {
          const startDate = new Date(meeting.startDate);
          const endDate = meeting.endDate ? new Date(meeting.endDate) : startDate;
          const isPast = endDate < now;
          const isUpcoming = startDate > now;
          const isInProgress = startDate <= now && endDate >= now;

          return {
            ...meeting,
            meetingType: meeting.metadata?.meetingType || 'general',
            agenda: meeting.metadata?.agenda,
            attachments: meeting.metadata?.attachments,
            expectedAttendees: meeting.metadata?.expectedAttendees,
            statusIndicator: isPast ? 'past' : isInProgress ? 'in_progress' : 'upcoming',
          };
        });

        // Count total meetings for pagination
        const totalCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(calendarEvents)
          .where(and(...conditions));

        const total = totalCount[0]?.count || 0;

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/federations/${federationId}/meetings`,
          method: 'GET',
          eventType: 'success',
          severity: 'low',
          dataType: 'FEDERATION',
          details: {
            federationId,
            totalMeetings: total,
            returnedCount: meetings.length,
            filters: { fromDate, toDate, meetingType, status, search },
          },
        });

        return NextResponse.json({
          meetings: enrichedMeetings,
          federation: {
            id: federation.id,
            name: federation.name,
            shortName: federation.shortName,
          },
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        });
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/federations/${params.id}/meetings`,
        method: 'GET',
        eventType: 'error',
        severity: 'high',
        dataType: 'FEDERATION',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to fetch meetings'
      );
    }
  })(request, context);
};

/**
 * POST /api/federations/[id]/meetings
 * Create a new federation meeting
 * 
 * Requires fed_staff role (160) for creation
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  return withEnhancedRoleAuth(160, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const federationId = params.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimit(userId, {
        limit: 10,
        window: 3600,
        identifier: 'federation-meetings-create',
      });

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Too many meeting creation requests.',
            resetIn: rateLimitResult.resetIn,
          },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const body = await request.json();
      const validation = createMeetingSchema.safeParse(body);

      if (!validation.success) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request data',
          validation.error.errors
        );
      }

      const data = validation.data;

      return withRLSContext(async (tx) => {
        // Verify federation exists
        const [federation] = await tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(
            and(
              eq(organizations.id, federationId),
              eq(organizations.organizationType, 'federation')
            )
          );

        if (!federation) {
          return standardErrorResponse(ErrorCode.NOT_FOUND, 'Federation not found');
        }

        // Validate dates
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (endDate < startDate) {
          return standardErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            'End date must be after start date'
          );
        }

        // Create calendar event for the meeting
        const [newMeeting] = await tx
          .insert(calendarEvents)
          .values({
            title: data.title,
            description: data.description,
            eventType: 'meeting',
            startDate,
            endDate,
            location: data.location,
            isVirtual: data.isVirtual,
            virtualLink: data.meetingLink,
            organizationId: federationId,
            createdBy: userId,
            metadata: {
              meetingType: data.meetingType,
              agenda: data.agenda,
              attachments: data.attachments,
              expectedAttendees: data.expectedAttendees,
              invitedAffiliates: data.invitedAffiliates,
              requiresRegistration: data.requiresRegistration,
              timezone: data.timezone,
              ...data.metadata,
            },
            tags: data.tags,
            isPublic: data.isPublic,
            status: 'scheduled',
          })
          .returning();

        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: `/api/federations/${federationId}/meetings`,
          method: 'POST',
          eventType: 'success',
          severity: 'medium',
          dataType: 'FEDERATION',
          details: {
            federationId,
            meetingId: newMeeting.id,
            meetingType: data.meetingType,
            title: data.title,
          },
        });

        return NextResponse.json(
          {
            meeting: newMeeting,
            message: 'Meeting created successfully',
          },
          { status: 201 }
        );
      });
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId,
        endpoint: `/api/federations/${params.id}/meetings`,
        method: 'POST',
        eventType: 'error',
        severity: 'high',
        dataType: 'FEDERATION',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to create meeting'
      );
    }
  })(request, context);
};
