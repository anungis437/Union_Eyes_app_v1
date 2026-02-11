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
import { eq, and, gte, lte, or, desc } from 'drizzle-orm';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

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
        return NextResponse.json({ error: access.error }, { status: access.error === 'Calendar not found' ? 404 : 403 });
      }

      // Parse query parameters
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const eventType = searchParams.get('eventType');
      const status = searchParams.get('status');
      const includeRecurring = searchParams.get('includeRecurring') !== 'false';

      // Build query
      let query = db
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
return NextResponse.json(
        { error: 'Failed to list events' },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const calendarId = params.id;
      const body = await request.json();

      // Check access
      const access = await checkCalendarAccess(calendarId, userId);
      if (!access.hasAccess) {
        return NextResponse.json({ error: access.error }, { status: access.error === 'Calendar not found' ? 404 : 403 });
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
        return NextResponse.json(
          { error: 'Title, start time, and end time are required' },
          { status: 400 }
        );
      }

      if (new Date(endTime) <= new Date(startTime)) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      // Get tenant ID from calendar
      const tenantId = access.calendar!.tenantId;

      // Create event
      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          calendarId,
          tenantId,
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
        const attendeeValues = attendees.map((attendee: any) => {
          const attendeeUserId = attendee.userId ?? attendee.user?.id ?? null;

          return {
            eventId: newEvent.id,
            tenantId,
            userId: attendeeUserId,
            email: attendee.email,
            name: attendee.name,
            status: attendee.status || 'invited',
            isOptional: attendee.isOptional || false,
            isOrganizer: attendee.email === userId || attendeeUserId === userId,
          };
        });

        await withRLSContext({ organizationId }, async (db) => {
          return await db.insert(eventAttendees).values(attendeeValues);
        });
      }

      // Schedule reminders using job queue
      try {
        const { scheduleEventReminders } = await import('@/lib/calendar-reminder-scheduler');
        await scheduleEventReminders(newEvent.id);
      } catch (reminderError) {
// Don't fail event creation if reminders fail
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
                  <h2 style="color: #2563eb;">You're Invited to an Event</h2>
                  
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
// Don't fail event creation if email fails
        }
      }

      return NextResponse.json({
        message: 'Event created successfully',
        event: newEvent,
      }, { status: 201 });
    } catch (error) {
return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      );
    }
    })(request, { params });
};
