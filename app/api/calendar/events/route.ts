import { requireUser } from '@/lib/auth/unified-auth';
/**
 * Calendar Events API Routes
 * 
 * CRUD operations for union calendar events:
 * - GET: List events with filtering
 * - POST: Create new event
 * - PATCH: Update event
 * - DELETE: Delete event
 * 
 * @module app/api/calendar/events/route
 */

import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

// Validation schema
const eventSchema = z.object({
  calendarId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().optional(),
  eventType: z.enum(["meeting", "appointment", "deadline", "reminder", "task", "hearing", "mediation", "negotiation", "training", "other"]),
  isAllDay: z.boolean().default(false),
  organizerName: z.string().optional(),
  maxAttendees: z.number().optional(),
  isPublic: z.boolean().default(true),
  requiresRsvp: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/calendar/events
 * 
 * Query params:
 * - startDate: Filter events after this date
 * - endDate: Filter events before this date
 * - eventType: Filter by event type
 * - organizationId: Filter by organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, organizationId } = await requireUser();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const eventType = searchParams.get("eventType");

    // Build query conditions
    const conditions = [
      eq(calendarEvents.tenantId, organizationId || ""),
    ];

    if (startDate) {
      conditions.push(gte(calendarEvents.startTime, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(calendarEvents.endTime, new Date(endDate)));
    }

    if (eventType) {
      conditions.push(eq(calendarEvents.eventType, eventType as any));
    }

    const events = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(calendarEvents.startTime);

    // Fetch attendance counts
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        // In production, join with attendance table
        return {
          ...event,
          attendeeCount: 0, // Placeholder
          isUserAttending: false, // Placeholder
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: eventsWithCounts,
      count: eventsWithCounts.length,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * 
 * Create a new calendar event
 */
export async function POST(request: NextRequest) {
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
    const validation = eventSchema.safeParse(body);
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

    // Create event
    const [newEvent] = await db
      .insert(calendarEvents)
      .values({
        tenantId: organizationId || "",
        calendarId: data.calendarId || "00000000-0000-0000-0000-000000000000", // Default calendar
        title: data.title,
        description: data.description,
        startTime: new Date(data.startDate),
        endTime: new Date(data.endDate),
        location: data.location,
        eventType: data.eventType || "meeting",
        isAllDay: data.isAllDay,
        organizerId: userId,
        createdBy: userId,
      })
      .returning();

    // Send notifications (in production)
    // await sendEventNotifications(newEvent);

    return NextResponse.json({
      success: true,
      data: newEvent,
      message: "Event created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
