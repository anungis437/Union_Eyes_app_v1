import { requireUser } from '@/lib/auth/unified-auth';
/**
 * Calendar Event by ID API Routes
 * 
 * Operations for individual events:
 * - GET: Get event details
 * - PATCH: Update event
 * - DELETE: Delete event
 * 
 * @module app/api/calendar/events/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { calendarEvents, eventAttendees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  location: z.string().optional(),
  eventType: z.enum(["meeting", "training", "social", "strike", "other"]).optional(),
  isAllDay: z.boolean().optional(),
  maxAttendees: z.number().optional(),
  isPublic: z.boolean().optional(),
  requiresRsvp: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/calendar/events/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, organizationId } = await requireUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, params.id),
          eq(calendarEvents.tenantId, organizationId || "")
        )
      );

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Fetch attendees
    const attendees = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, params.id));

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        attendees,
        attendeeCount: attendees.length,
        isUserAttending: attendees.some((a) => a.userId === userId),
      },
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar/events/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, organizationId } = await requireUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = updateEventSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if event exists and user has permission
    const [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, params.id),
          eq(calendarEvents.tenantId, organizationId || "")
        )
      );

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Only organizer or admin can update
    // if (existingEvent.organizerId !== userId && !isAdmin) {
    //   return NextResponse.json(
    //     { error: "Forbidden" },
    //     { status: 403 }
    //   );
    // }

    // Update event
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // Convert date strings to Date objects
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(updateData)
      .where(eq(calendarEvents.id, params.id))
      .returning();

    // Notify attendees of changes
    // await notifyEventUpdate(updatedEvent);

    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, organizationId } = await requireUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if event exists and user has permission
    const [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, params.id),
          eq(calendarEvents.tenantId, organizationId || "")
        )
      );

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Only organizer or admin can delete
    // if (existingEvent.organizerId !== userId && !isAdmin) {
    //   return NextResponse.json(
    //     { error: "Forbidden" },
    //     { status: 403 }
    //   );
    // }

    // Delete attendees first (foreign key constraint)
    await db
      .delete(eventAttendees)
      .where(eq(eventAttendees.eventId, params.id));

    // Delete event
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, params.id));

    // Notify attendees of cancellation
    // await notifyEventCancellation(existingEvent);

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
