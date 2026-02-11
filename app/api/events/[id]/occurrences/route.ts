import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/rate-limiter";
/**
 * Recurring Event Occurrences API
 * 
 * Endpoints:
 * - GET /api/events/[id]/occurrences - List instances of recurring event
 * - POST /api/events/[id]/occurrences/generate - Generate future instances
 * - DELETE /api/events/[id]/occurrences/[date] - Delete specific occurrence
 * 
 * @module api/events/[id]/occurrences
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { calendarEvents } from '@/db/schema/calendar-schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import {
  generateRecurringInstances,
  createRecurringInstances,
  addRecurrenceException,
  getRecurrenceDescription,
} from '@/lib/recurring-events-service';
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
// ============================================================================
// GET /api/events/[id]/occurrences
// List all instances of a recurring event
// ============================================================================

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      // Rate limiting
      const rateLimitResult = await checkRateLimit(
        `event-ops:${user.id}`,
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

      // Get parent event
      const [parentEvent] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, eventId))
        .limit(1);

      if (!parentEvent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Event not found'
    );
      }

      if (!parentEvent.isRecurring) {
        return NextResponse.json(
          { error: 'Event is not recurring' },
          { status: 400 }
        );
      }

      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : new Date();
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      const includeGenerated = searchParams.get('includeGenerated') !== 'false';

      // Generate virtual instances
      const virtualInstances = generateRecurringInstances(
        parentEvent,
        parentEvent.recurrenceRule!,
        startDate,
        endDate,
        parentEvent.recurrenceExceptions || []
      );

      // Get database instances if requested
      let dbInstances: any[] = [];
      if (includeGenerated) {
        dbInstances = await db
          .select()
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.parentEventId, eventId),
              gte(calendarEvents.startTime, startDate),
              lte(calendarEvents.startTime, endDate)
            )
          );
      }

      // Combine and deduplicate
      const instanceMap = new Map();
      
      // Add virtual instances
      virtualInstances.forEach(instance => {
        const key = instance.startTime.toISOString();
        instanceMap.set(key, {
          ...instance,
          isVirtual: true,
          id: null,
        });
      });

      // Override with DB instances
      dbInstances.forEach(instance => {
        const key = new Date(instance.startTime).toISOString();
        instanceMap.set(key, {
          ...instance,
          isVirtual: false,
        });
      });

      const instances = Array.from(instanceMap.values()).sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      return NextResponse.json({
        parentEvent: {
          id: parentEvent.id,
          title: parentEvent.title,
          recurrenceRule: parentEvent.recurrenceRule,
          recurrenceDescription: getRecurrenceDescription(parentEvent.recurrenceRule!),
          exceptions: parentEvent.recurrenceExceptions || [],
        },
        instances,
        count: instances.length,
        virtualCount: virtualInstances.length,
        generatedCount: dbInstances.length,
      }, {
        headers: createRateLimitHeaders(rateLimitResult),
      });
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};

// ============================================================================
// POST /api/events/[id]/occurrences
// Generate database instances for a recurring event
// ============================================================================


const eventsOccurrencesSchema = z.object({
  startDate = new Date(): z.string().datetime().optional(),
  endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000): z.string().datetime().optional(),
  // 90 days: z.unknown().optional(),
});

export const POST = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const eventId = params.id;

      // Get parent event
      const [parentEvent] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, eventId))
        .limit(1);

      if (!parentEvent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Event not found'
    );
      }

      if (!parentEvent.isRecurring) {
        return NextResponse.json(
          { error: 'Event is not recurring' },
          { status: 400 }
        );
      }

      // Check if user is organizer
      if (parentEvent.organizerId !== userId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the organizer can generate instances'
    );
      }

      // Get request body
      const body = await request.json();
    // Validate request body
    const validation = eventsOccurrencesSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { startDate = new Date(), endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days } = validation.data;
      const {
        startDate = new Date(),
        endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      } = body;

      // Generate instances
      const createdCount = await createRecurringInstances(
        eventId,
        new Date(startDate),
        new Date(endDate)
      );

      return NextResponse.json({
        success: true,
        message: `Generated ${createdCount} instances`,
        count: createdCount,
        startDate,
        endDate,
      });
    } catch (error) {
return NextResponse.json(
        {
          error: 'Failed to generate instances',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request, { params });
};

// ============================================================================
// DELETE /api/events/[id]/occurrences
// Delete specific occurrence (add exception)
// ============================================================================

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const eventId = params.id;

      // Get parent event
      const [parentEvent] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, eventId))
        .limit(1);

      if (!parentEvent) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Event not found'
    );
      }

      if (!parentEvent.isRecurring) {
        return NextResponse.json(
          { error: 'Event is not recurring' },
          { status: 400 }
        );
      }

      // Check if user is organizer
      if (parentEvent.organizerId !== userId) {
        return standardErrorResponse(
      ErrorCode.FORBIDDEN,
      'Only the organizer can delete occurrences'
    );
      }

      // Get date from query parameter
      const searchParams = request.nextUrl.searchParams;
      const dateParam = searchParams.get('date');

      if (!dateParam) {
        return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Date parameter is required'
    );
      }

      const exceptionDate = new Date(dateParam);

      if (isNaN(exceptionDate.getTime())) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid date format'
    );
      }

      // Add exception
      await addRecurrenceException(eventId, exceptionDate);

      return NextResponse.json({
        success: true,
        message: 'Occurrence deleted',
        exceptionDate: exceptionDate.toISOString(),
      });
    } catch (error) {
return NextResponse.json(
        {
          error: 'Failed to delete occurrence',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
    })(request, { params });
};
