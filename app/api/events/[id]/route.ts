import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";
import { NotificationService } from "@/lib/services/notification-service";
/**
 * GET /api/events/[id]
 * Get event details
 * 
 * PATCH /api/events/[id]
 * Update event
 * 
 * DELETE /api/events/[id]
 * Delete/cancel event
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { calendarEvents, calendars, eventAttendees, calendarSharing } from '@/db/schema/calendar-schema';
import { eq, and } from 'drizzle-orm';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
/**
 * Check if user has access to event
 */
async function checkEventAccess(eventId: string, userId: string) {
  const [event] = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId))
    .limit(1);

  if (!event) {
    return { hasAccess: false, error: 'Event not found' };
  }

  // Get calendar to check permissions
  const [calendar] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, event.calendarId))
    .limit(1);

  if (!calendar) {
    return { hasAccess: false, error: 'Calendar not found' };
  }

  const isOrganizer = event.organizerId === userId;
  const isOwner = calendar.ownerId === userId;

  if (isOrganizer || isOwner) {
    return { hasAccess: true, event, canEdit: true, canDelete: true };
  }

  // Check if user is an attendee
  const [attendee] = await db
    .select()
    .from(eventAttendees)
    .where(
      and(
        eq(eventAttendees.eventId, eventId),
        eq(eventAttendees.userId, userId)
      )
    )
    .limit(1);

  if (attendee) {
    return { hasAccess: true, event, canEdit: false, canDelete: false, isAttendee: true };
  }

  // Check calendar sharing permission
  const [shared] = await db
    .select()
    .from(calendarSharing)
    .where(
      and(
        eq(calendarSharing.calendarId, event.calendarId),
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
    event,
    canEdit: shared.canEditEvents,
    canDelete: shared.canDeleteEvents,
  };
}

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(
        `event-ops:${userId}`,
        RATE_LIMITS.EVENT_OPERATIONS
      );

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const eventId = params.id;

      const access = await checkEventAccess(eventId, userId);
      if (!access.hasAccess) {
        return standardErrorResponse(
      access.error === 'Event not found' ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.FORBIDDEN,
      access.error
    );
      }

      // Get attendees
      const attendees = await db
        .select()
        .from(eventAttendees)
        .where(eq(eventAttendees.eventId, eventId));

      return NextResponse.json({
        event: {
          ...access.event,
          attendees,
          canEdit: access.canEdit,
          canDelete: access.canDelete,
          isAttendee: access.isAttendee,
        },
      }, {
        headers: createRateLimitHeaders(rateLimitResult),
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get event',
      error
    );
    }
    })(request, { params });
};


const eventsSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional(),
  location: z.unknown().optional(),
  locationUrl: z.string().url('Invalid URL'),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.unknown().optional(),
  recurrenceExceptions: z.unknown().optional(),
  eventType: z.unknown().optional(),
  status: z.unknown().optional(),
  priority: z.unknown().optional(),
  claimId: z.string().uuid('Invalid claimId'),
  caseNumber: z.unknown().optional(),
  memberId: z.string().uuid('Invalid memberId'),
  meetingRoomId: z.string().uuid('Invalid meetingRoomId'),
  meetingUrl: z.string().url('Invalid URL'),
  meetingPassword: z.unknown().optional(),
  agenda: z.unknown().optional(),
  reminders: z.unknown().optional(),
  isPrivate: z.boolean().optional(),
  visibility: z.boolean().optional(),
  metadata: z.unknown().optional(),
  attachments: z.unknown().optional(),
  attendees: z.unknown().optional(),
});

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(
        `event-ops:${userId}`,
        RATE_LIMITS.EVENT_OPERATIONS
      );

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const eventId = params.id;
      const body = await request.json();
    // Validate request body
    const validation = eventsSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { title, description, location, locationUrl, startTime, endTime, timezone, isAllDay, isRecurring, recurrenceRule, recurrenceExceptions, eventType, status, priority, claimId, caseNumber, memberId, meetingRoomId, meetingUrl, meetingPassword, agenda, reminders, isPrivate, visibility, metadata, attachments, attendees } = validation.data;

      const access = await checkEventAccess(eventId, userId);
      if (!access.hasAccess) {
        return standardErrorResponse(
      access.error === 'Event not found' ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.FORBIDDEN,
      access.error
    );
      }

      if (!access.canEdit) {
        return NextResponse.json(
          { error: 'You do not have permission to edit this event' },
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
        reminders,
        isPrivate,
        visibility,
        metadata,
        attachments,
        attendees,
      } = body;

      // Validate times if provided
      if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      const [updatedEvent] = await db
        .update(calendarEvents)
        .set({
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(location !== undefined && { location }),
          ...(locationUrl !== undefined && { locationUrl }),
          ...(startTime !== undefined && { startTime: new Date(startTime) }),
          ...(endTime !== undefined && { endTime: new Date(endTime) }),
          ...(timezone !== undefined && { timezone }),
          ...(isAllDay !== undefined && { isAllDay }),
          ...(isRecurring !== undefined && { isRecurring }),
          ...(recurrenceRule !== undefined && { recurrenceRule }),
          ...(recurrenceExceptions !== undefined && { recurrenceExceptions }),
          ...(eventType !== undefined && { eventType }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(claimId !== undefined && { claimId }),
          ...(caseNumber !== undefined && { caseNumber }),
          ...(memberId !== undefined && { memberId }),
          ...(meetingRoomId !== undefined && { meetingRoomId }),
          ...(meetingUrl !== undefined && { meetingUrl }),
          ...(meetingPassword !== undefined && { meetingPassword }),
          ...(agenda !== undefined && { agenda }),
          ...(reminders !== undefined && { reminders }),
          ...(isPrivate !== undefined && { isPrivate }),
          ...(visibility !== undefined && { visibility }),
          ...(metadata !== undefined && { metadata }),
          ...(attachments !== undefined && { attachments }),
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, eventId))
        .returning();

      // Update attendees if provided
      if (attendees) {
        // Delete existing attendees and re-add
        await withRLSContext({ organizationId }, async (db) => {
          return await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));
        });

        if (attendees.length > 0) {
          const attendeeValues = attendees.map((attendee: any) => {
            const attendeeUserId = attendee.userId ?? attendee.user?.id ?? null;

            return {
              eventId,
              tenantId: updatedEvent.tenantId,
              userId: attendeeUserId,
              email: attendee.email,
              name: attendee.name,
              status: attendee.status || 'invited',
              isOptional: attendee.isOptional || false,
              isOrganizer: attendeeUserId === updatedEvent.organizerId,
            };
          });

          await withRLSContext({ organizationId }, async (db) => {
            return await db.insert(eventAttendees).values(attendeeValues);
          });
        }
      }

      return NextResponse.json({
        message: 'Event updated successfully',
        event: updatedEvent,
      }, {
        headers: createRateLimitHeaders(rateLimitResult),
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update event',
      error
    );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(
        `event-ops:${userId}`,
        RATE_LIMITS.EVENT_OPERATIONS
      );

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded", resetIn: rateLimitResult.resetIn },
          {
            status: 429,
            headers: createRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const eventId = params.id;
      const { searchParams } = new URL(request.url);
      const cancellationReason = searchParams.get('reason');

      const access = await checkEventAccess(eventId, userId);
      if (!access.hasAccess) {
        return standardErrorResponse(
      access.error === 'Event not found' ? ErrorCode.RESOURCE_NOT_FOUND : ErrorCode.FORBIDDEN,
      access.error
    );
      }

      if (!access.canDelete) {
        return NextResponse.json(
          { error: 'You do not have permission to delete this event' },
          { status: 403 }
        );
      }

      // Soft delete (mark as cancelled)
      await db
        .update(calendarEvents)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason,
          updatedAt: new Date(),
        })
        .where(eq(calendarEvents.id, eventId));

      // Cancel all pending reminders
      try {
        const { cancelEventReminders } = await import('@/lib/calendar-reminder-scheduler');
        await cancelEventReminders(eventId);
      } catch (reminderError) {
// Don't fail event cancellation if reminder cancellation fails
      }

      // Send cancellation notifications to attendees via email
      try {
        const attendees = await db
          .select()
          .from(eventAttendees)
          .where(eq(eventAttendees.eventId, eventId));
        
        if (attendees.length > 0) {
          const notificationService = new NotificationService();
          const event = access.event;
          
          for (const attendee of attendees) {
            if (attendee.email) {
              await notificationService.send({
                organizationId: event.tenantId,
                recipientId: attendee.userId || undefined,
                recipientEmail: attendee.email,
                type: 'email',
                priority: 'high',
                subject: `Event Cancelled: ${event.title}`,
                body: `The event "${event.title}" has been cancelled.\n\nOriginal Time: ${event.startTime?.toLocaleString()}${cancellationReason ? `\nReason: ${cancellationReason}` : ''}\n\nWe apologize for any inconvenience.`,
                htmlBody: `
                  <h2>Event Cancelled</h2>
                  <p>The following event has been cancelled:</p>
                  <ul>
                    <li><strong>Event:</strong> ${event.title}</li>
                    <li><strong>Original Time:</strong> ${event.startTime?.toLocaleString()}</li>
                    ${event.location ? `<li><strong>Location:</strong> ${event.location}</li>` : ''}
                    ${cancellationReason ? `<li><strong>Reason:</strong> ${cancellationReason}</li>` : ''}
                  </ul>
                  <p>We apologize for any inconvenience this may cause.</p>
                `,
                metadata: {
                  eventId,
                  eventTitle: event.title,
                  cancellationReason,
                },
              });
            }
          }
        }
      } catch (notificationError) {
// Don't fail event cancellation if notifications fail
      }

      return NextResponse.json({
        message: 'Event cancelled successfully',
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete event',
      error
    );
    }
    })(request, { params });
};
