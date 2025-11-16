/**
 * GET /api/calendars/[id]/events
 * List events in a calendar
 * 
 * POST /api/calendars/[id]/events
 * Create a new event
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { calendars, calendarEvents, eventAttendees, calendarSharing } from '@/db/schema/calendar-schema';
import { eq, and, gte, lte, or, desc } from 'drizzle-orm';

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

/**
 * GET /api/calendars/[id]/events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('List events error:', error);
    return NextResponse.json(
      { error: 'Failed to list events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendars/[id]/events
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      const attendeeValues = attendees.map((attendee: any) => ({
        eventId: newEvent.id,
        tenantId,
        userId: attendee.userId,
        email: attendee.email,
        name: attendee.name,
        status: attendee.status || 'invited',
        isOptional: attendee.isOptional || false,
        isOrganizer: attendee.email === userId || attendee.userId === userId,
      }));

      await db.insert(eventAttendees).values(attendeeValues);
    }

    // Schedule reminders using job queue
    try {
      const { scheduleEventReminders } = await import('@/lib/calendar-reminder-scheduler');
      await scheduleEventReminders(newEvent.id);
    } catch (reminderError) {
      console.error('Failed to schedule reminders:', reminderError);
      // Don't fail event creation if reminders fail
    }

    // TODO: Send invitations to attendees via email

    return NextResponse.json({
      message: 'Event created successfully',
      event: newEvent,
    }, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
