import { logApiAuditEvent } from "@/lib/middleware/api-security";
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
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

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
  return withEnhancedRoleAuth(10, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const eventId = params.id;

      const access = await checkEventAccess(eventId, userId);
      if (!access.hasAccess) {
        return NextResponse.json({ error: access.error }, { status: access.error === 'Event not found' ? 404 : 403 });
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
      });
    } catch (error) {
      console.error('Get event error:', error);
      return NextResponse.json(
        { error: 'Failed to get event' },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const eventId = params.id;
      const body = await request.json();

      const access = await checkEventAccess(eventId, userId);
      if (!access.hasAccess) {
        return NextResponse.json({ error: access.error }, { status: access.error === 'Event not found' ? 404 : 403 });
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
        await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));

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

          await db.insert(eventAttendees).values(attendeeValues);
        }
      }

      return NextResponse.json({
        message: 'Event updated successfully',
        event: updatedEvent,
      });
    } catch (error) {
      console.error('Update event error:', error);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const eventId = params.id;
      const { searchParams } = new URL(request.url);
      const cancellationReason = searchParams.get('reason');

      const access = await checkEventAccess(eventId, userId);
      if (!access.hasAccess) {
        return NextResponse.json({ error: access.error }, { status: access.error === 'Event not found' ? 404 : 403 });
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
        console.error('Failed to cancel reminders:', reminderError);
        // Don't fail event cancellation if reminder cancellation fails
      }

      // TODO: Send cancellation notifications to attendees via email

      return NextResponse.json({
        message: 'Event cancelled successfully',
      });
    } catch (error) {
      console.error('Delete event error:', error);
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      );
    }
    })(request, { params });
};
