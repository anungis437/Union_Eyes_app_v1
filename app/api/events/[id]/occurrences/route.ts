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
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { calendarEvents } from '@/db/schema/calendar-schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import {
  generateRecurringInstances,
  createRecurringInstances,
  addRecurrenceException,
  getRecurrenceDescription,
} from '@/lib/recurring-events-service';

// ============================================================================
// GET /api/events/[id]/occurrences
// List all instances of a recurring event
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Get parent event
    const [parentEvent] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!parentEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
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
    });
  } catch (error) {
    console.error('Error fetching recurring instances:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/events/[id]/occurrences
// Generate database instances for a recurring event
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Get parent event
    const [parentEvent] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!parentEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!parentEvent.isRecurring) {
      return NextResponse.json(
        { error: 'Event is not recurring' },
        { status: 400 }
      );
    }

    // Check if user is organizer
    if (parentEvent.organizerId !== userId) {
      return NextResponse.json(
        { error: 'Only the organizer can generate instances' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
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
    console.error('Error generating instances:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate instances',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/events/[id]/occurrences
// Delete specific occurrence (add exception)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Get parent event
    const [parentEvent] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId))
      .limit(1);

    if (!parentEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!parentEvent.isRecurring) {
      return NextResponse.json(
        { error: 'Event is not recurring' },
        { status: 400 }
      );
    }

    // Check if user is organizer
    if (parentEvent.organizerId !== userId) {
      return NextResponse.json(
        { error: 'Only the organizer can delete occurrences' },
        { status: 403 }
      );
    }

    // Get date from query parameter
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const exceptionDate = new Date(dateParam);

    if (isNaN(exceptionDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
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
    console.error('Error deleting occurrence:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete occurrence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
