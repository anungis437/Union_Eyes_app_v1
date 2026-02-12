/**
 * Calendar Event by ID API Routes
 * 
 * Operations for individual events:
 * - GET: Get event details (Role Level 10)
 * - PATCH: Update event (Role Level 40)
 * - DELETE: Delete event (Role Level 40)
 * 
 * Security: Phase 4 - Enterprise Role-Based Access + Rate Limiting
 * 
 * @module app/api/calendar/events/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvents, eventAttendees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";
import { logApiAuditEvent } from "@/lib/middleware/request-validation";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
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
export const GET = withEnhancedRoleAuth(10, async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } }
) => {
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

    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, params.id),
          eq(calendarEvents.organizationId, organizationId)
        )
      );

    if (!event) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Event not found'
    );
    }

    // Fetch attendees
    const attendees = await db
      .select()
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, params.id));

    // Audit logging
    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: `/api/calendar/events/${params.id}`,
      method: "GET",
      eventType: "calendar_event_view",
      dataType: "calendar_events",
      severity: "low",
      details: {
        eventId: params.id,
        title: event.title,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        attendees,
        attendeeCount: attendees.length,
        isUserAttending: attendees.some((a) => a.userId === userId),
      },
    }, {
      headers: createRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: `/api/calendar/events/${params.id}`,
      method: "GET",
      eventType: "error",
      dataType: "calendar_events",
      severity: "high",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch event',
      error
    );
  }
});

/**
 * PATCH /api/calendar/events/[id]
 */
export const PATCH = withEnhancedRoleAuth(40, async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } }
) => {
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
          eq(calendarEvents.organizationId, organizationId)
        )
      );

    if (!existingEvent) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Event not found'
    );
    }

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

    // Audit logging
    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: `/api/calendar/events/${params.id}`,
      method: "PATCH",
      eventType: "calendar_event_updated",
      dataType: "calendar_events",
      severity: "medium",
      details: {
        eventId: params.id,
        changes: data,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message: "Event updated successfully",
    }, {
      headers: createRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: `/api/calendar/events/${params.id}`,
      method: "PATCH",
      eventType: "error",
      dataType: "calendar_events",
      severity: "high",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update event',
      error
    );
  }
});

/**
 * DELETE /api/calendar/events/[id]
 */
export const DELETE = withEnhancedRoleAuth(40, async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } }
) => {
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

    // Check if event exists and user has permission
    const [existingEvent] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, params.id),
          eq(calendarEvents.organizationId, organizationId)
        )
      );

    if (!existingEvent) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Event not found'
    );
    }

    // Delete attendees first (foreign key constraint)
    await db
      .delete(eventAttendees)
      .where(eq(eventAttendees.eventId, params.id));

    // Delete event
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, params.id));

    // Audit logging
    await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: `/api/calendar/events/${params.id}`,
      method: "DELETE",
      eventType: "calendar_event_deleted",
      dataType: "calendar_events",
      severity: "high",
      details: {
        eventId: params.id,
        title: existingEvent.title,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    }, {
      headers: createRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
await logApiAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      organizationId,
      endpoint: `/api/calendar/events/${params.id}`,
      method: "DELETE",
      eventType: "error",
      dataType: "calendar_events",
      severity: "high",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete event',
      error
    );
  }
});

