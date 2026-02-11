/**
 * Calendar Events API Routes
 * 
 * CRUD operations for union calendar events:
 * - GET: List events with filtering (Role Level 10)
 * - POST: Create new event (Role Level 40)
 * 
 * Security: Phase 4 - Enterprise Role-Based Access + Rate Limiting
 * 
 * @module app/api/calendar/events/route
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';
import { logApiAuditEvent } from "@/lib/middleware/request-validation";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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
 */
export const GET = withRoleAuth(10, async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `calendar-ops:${userId}`,
      RATE_LIMITS.CALENDAR_OPERATIONS
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

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const eventType = searchParams.get("eventType");

    // Build query conditions
    const conditions = [
      eq(calendarEvents.tenantId, organizationId),
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

    // Audit logging
    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: "/api/calendar/events",
      method: "GET",
      eventType: "calendar_events_list",
      dataType: "calendar_events",
      severity: "low",
      details: {
        count: eventsWithCounts.length,
        filters: { startDate, endDate, eventType },
      },
    });

    return NextResponse.json({
      success: true,
      data: eventsWithCounts,
      count: eventsWithCounts.length,
    }, {
      headers: createRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: "/api/calendar/events",
      method: "GET",
      eventType: "error",
      dataType: "calendar_events",
      severity: "high",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch events',
      error
    );
  }
});

/**
 * POST /api/calendar/events
 * 
 * Create a new calendar event (requires Role Level 40)
 */
export const POST = withRoleAuth('member', async (request: NextRequest, context) => {
  const { userId, organizationId } = context;

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `calendar-ops:${userId}`,
      RATE_LIMITS.CALENDAR_OPERATIONS
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
        tenantId: organizationId,
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

    // Audit logging
    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: "/api/calendar/events",
      method: "POST",
      eventType: "calendar_event_created",
      dataType: "calendar_events",
      severity: "medium",
      details: {
        eventId: newEvent.id,
        title: newEvent.title,
        eventType: newEvent.eventType,
        startTime: newEvent.startTime,
      },
    });

    return NextResponse.json({
      success: true,
      data: newEvent,
      message: "Event created successfully",
    }, {
      status: 201,
      headers: createRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: "/api/calendar/events",
      method: "POST",
      eventType: "error",
      dataType: "calendar_events",
      severity: "high",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create event',
      error
    );
  }
});


