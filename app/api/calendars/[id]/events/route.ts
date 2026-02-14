import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * GET /api/calendars/[id]/events
 * List events in a calendar
 * 
 * POST /api/calendars/[id]/events
 * Create a new event
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { calendars, calendarEvents, eventAttendees, calendarSharing } from '@/db/schema/calendar-schema';
import { and, or, desc } from 'drizzle-orm';
import { z } from "zod";
import { withApiAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
/**
 * Check if user has access to calendar
 */
async function checkCalendarAccess(calendarId: string, userId: string) {
  const [calendar] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId))
    .limit(1);

  if (!calendar) {
    return { hasAccess: false, error: 'Calendar not found' };
  }

  const isOwner = calendar.ownerId === userId;
  const isPublic = calendar.isPublic;

  if (isOwner || isPublic) {
    return { hasAccess: true, calendar, isOwner, permission: isOwner ? 'owner' : 'viewer' };
  }

  const [shared] = await db
    .select()
    .from(calendarSharing)
    .where(
      and(
        eq(calendarSharing.calendarId, calendarId),
        eq(calendarSharing.sharedWithUserId, userId),
        eq(calendarSharing.isActive, true)
      )
    )
    .limit(1);

  if (!shared) {
    return { hasAccess: false, error: 'Access denied' };
  }

  return {
    hasAccess: true,
    calendar,
    isOwner: false,
    permission: shared.permission,
    canCreateEvents: shared.canCreateEvents,
    canEditEvents: shared.canEditEvents,
    canDeleteEvents: shared.canDeleteEvents,
  };
}

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const calendarId = params.id;
      const { searchParams } = new URL(request.url);

      // Check access
      const access = await checkCalendarAccess(calendarId, userId);
      if (!access.hasAccess) {
        return standardErrorResponse(
      access.error === 'Calendar not found' ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.FORBIDDEN,
      access.error
    );
      }

      // Parse query parameters
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const eventType = searchParams.get('eventType');
      const status = searchParams.get('status');
      const includeRecurring = searchParams.get('includeRecurring') !== 'false';

      // Build query
      const query = db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.calendarId, calendarId));

      // Apply filters
      const conditions = [eq(calendarEvents.calendarId, calendarId)];

      if (startDate) {
        conditions.push(gte(calendarEvents.startTime, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(calendarEvents.endTime, new Date(endDate)));
      }

      if (eventType) {
        conditions.push(eq(calendarEvents.eventType, eventType as any));
      }

      if (status) {
        conditions.push(eq(calendarEvents.status, status as any));
      }

      const events = await db
        .select()
        .from(calendarEvents)
        .where(and(...conditions))
        .orderBy(desc(calendarEvents.startTime));

      // Filter out recurring instances if requested
      const filteredEvents = includeRecurring
        ? events
        : events.filter(event => !event.parentEventId);

      return NextResponse.json({
        events: filteredEvents,
        count: filteredEvents.length,
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to list events',
      error
    );
    }
    })(request, { params });
};


const calendarsEventsSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  location: z.unknown().optional(),
  locationUrl: z.string().url('Invalid URL'),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().datetime().optional(),
  isAllDay: z.boolean().optional().default(false),
  isRecurring: z.boolean().optional().default(false),
  recurrenceRule: z.unknown().optional(),
  recurrenceExceptions: z.unknown().optional(),
  eventType: z.unknown().optional().default('meeting'),
  status: z.unknown().optional().default('scheduled'),
  priority: z.unknown().optional().default('normal'),
  claimId: z.string().uuid('Invalid claimId'),
  caseNumber: z.unknown().optional(),
  memberId: z.string().uuid('Invalid memberId'),
  meetingRoomId: z.string().uuid('Invalid meetingRoomId'),
  meetingUrl: z.string().url('Invalid URL'),
  meetingPassword: z.unknown().optional(),
  agenda: z.unknown().optional(),
  reminders: z.unknown().optional().default([15]),
  isPrivate: z.boolean().optional().default(false),
  visibility: z.boolean().optional().default('default'),
  metadata: z.unknown().optional(),
  attachments: z.unknown().optional(),
  attendees: z.unknown().optional().default([]),
});

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const calendarId = params.id;
      const body = await request.json();
    // Validate request body
    const validation = calendarsEventsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { title, description, location, locationUrl, startTime, endTime, timezone, isAllDay = false, isRecurring = false, recurrenceRule, recurrenceExceptions, eventType = 'meeting', status = 'scheduled', priority = 'normal', claimId, caseNumber, memberId, meetingRoomId, meetingUrl, meetingPassword, agenda, reminders = [15], isPrivate = false, visibility = 'default', metadata, attachments, attendees = [] } = validation.data;

      // Check access
      const access = await checkCalendarAccess(calendarId, userId);
      if (!access.hasAccess) {
        return standardErrorResponse(
      access.error === 'Calendar not found' ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.FORBIDDEN,
      access.error
    );
      }

      // Check create permission
      if (!access.isOwner && !access.canCreateEvents) {
        return NextResponse.json(
          { error: 'You do not have permission to create events in this calendar' },
          { status: 403 }
        );
      }

      const {
        title,
        description,
        location,
        locationUrl,
        startTime,
        endTime,
        timezone,
        isAllDay = false,
        isRecurring = false,
        recurrenceRule,
        recurrenceExceptions,
        eventType = 'meeting',
        status = 'scheduled',
        priority = 'normal',
        claimId,
        caseNumber,
        memberId,
        meetingRoomId,
        meetingUrl,
        meetingPassword,
        agenda,
        reminders = [15],
        isPrivate = false,
        visibility = 'default',
        metadata,
        attachments,
        attendees = [],
      } = body;

      // Validation
      if (!title || !startTime || !endTime) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Title, start time, and end time are required'
    );
      }

      if (new Date(endTime) <= new Date(startTime)) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      // Get organization ID from calendar
      const calendarOrganizationId = access.calendar!.organizationId;

      // Create event
      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          calendarId,
          organizationId: calendarOrganizationId,
          title,
          description,
          location,
          locationUrl,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          timezone: timezone || access.calendar!.timezone,
          isAllDay,
          isRecurring,
          recurrenceRule,
          recurrenceExceptions,
          eventType,
          status,
          priority,
          claimId,
          caseNumber,
          memberId,
          meetingRoomId,
          meetingUrl,
          meetingPassword,
          agenda,
          organizerId: userId,
          reminders,
          isPrivate,
          visibility,
          metadata,
          attachments,
          createdBy: userId,
        })
        .returning();

      // Add attendees
      if (attendees && attendees.length > 0) {
        const attendeeValues = attendees.map((attendee: Record<string, unknown>) => {
          const attendeeUserId = attendee.userId ?? attendee.user?.id ?? null;

          return {
            eventId: newEvent.id,
            organizationId: calendarOrganizationId,
            userId: attendeeUserId,
            email: attendee.email,
            name: attendee.name,
            status: attendee.status || 'invited',
            isOptional: attendee.isOptional || false,
            isOrganizer: attendee.email === userId || attendeeUserId === userId,
          };
        });

        await withRLSContext({ organizationId: calendarOrganizationId }, async (db) => {
          return await db.insert(eventAttendees).values(attendeeValues);
        });
      }

      // Schedule reminders using job queue
      try {
        const { scheduleEventReminders } = await import('@/lib/calendar-reminder-scheduler');
        await scheduleEventReminders(newEvent.id);
      } catch (reminderError) {
// Don&apos;t fail event creation if reminders fail
      }

      // Send invitations to attendees via email
      if (attendees && attendees.length > 0) {
        try {
          const { sendEmail } = await import('@/lib/email-service');
          
          const eventDate = new Date(newEvent.startTime);
          const eventEndDate = new Date(newEvent.endTime);
          
          await Promise.allSettled(
            attendees.map(async (attendee) => {
              const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">You&apos;re Invited to an Event</h2>
                  
                  <p>You have been invited to the following event:</p>
                  
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">${newEvent.title}</h3>
                    ${newEvent.description ? `<p style="margin: 10px 0;">${newEvent.description}</p>` : ''}
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDate.toLocaleDateString()}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${eventDate.toLocaleTimeString()} - ${eventEndDate.toLocaleTimeString()}</p>
                    ${newEvent.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${newEvent.location}</p>` : ''}
                  </div>
                  
                  <p>Please mark your calendar and plan to attend.</p>
                  
                  <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    This is an automated event invitation.
                  </p>
                </div>
              `;

              await sendEmail({
                to: [{ email: attendee.email, name: attendee.name || attendee.email }],
                subject: `Event Invitation: ${newEvent.title}`,
                html: emailContent,
              });
            })
          );
        } catch (emailError) {
// Don&apos;t fail event creation if email fails
        }
      }

      return standardSuccessResponse(
      { 
        message: 'Event created successfully',
        event: newEvent,
       },
      undefined,
      201
    );
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create event',
      error
    );
    }
    })(request, { params });
};
