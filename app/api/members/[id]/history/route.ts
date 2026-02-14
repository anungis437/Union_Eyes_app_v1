/**
 * Member History API
 * 
 * Timeline of member events and profile changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and, desc, asc } from 'drizzle-orm';
import { memberHistoryEvents } from '@/db/schema/member-profile-v2-schema';

// Validation schema
const addEventSchema = z.object({
  eventType: z.string(),
  eventCategory: z.enum(['employment', 'membership', 'engagement', 'administrative']),
  eventDate: z.string().datetime(),
  eventTitle: z.string(),
  eventDescription: z.string().optional(),
  eventData: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
  visibleToMember: z.boolean().optional(),
});

/**
 * GET /api/members/[id]/history
 * Get member history timeline
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const publicOnly = searchParams.get('publicOnly') === 'true';

    const conditions = [eq(memberHistoryEvents.userId, userId)];
    
    if (category) {
      conditions.push(eq(memberHistoryEvents.eventCategory, category));
    }
    
    if (publicOnly) {
      conditions.push(eq(memberHistoryEvents.isPublic, true));
    }

    const events = await db
      .select()
      .from(memberHistoryEvents)
      .where(and(...conditions))
      .orderBy(desc(memberHistoryEvents.eventDate));

    // Group by year-month for better visualization
    const groupedByMonth = events.reduce((acc, event) => {
      const month = new Date(event.eventDate).toISOString().substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(event);
      return acc;
    }, {} as Record<string, typeof events>);

    return NextResponse.json({
      events,
      groupedByMonth,
      summary: {
        totalEvents: events.length,
        byCategory: {
          employment: events.filter(e => e.eventCategory === 'employment').length,
          membership: events.filter(e => e.eventCategory === 'membership').length,
          engagement: events.filter(e => e.eventCategory === 'engagement').length,
          administrative: events.filter(e => e.eventCategory === 'administrative').length,
        },
      },
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/[id]/history
 * Add history event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();
    const validatedData = addEventSchema.parse(body);

    const [event] = await db
      .insert(memberHistoryEvents)
      .values({
        userId,
        organizationId: 'org-id',
        ...validatedData,
        createdBy: 'system',
      })
      .returning();

    console.log(`✅ History event added: ${validatedData.eventTitle}`);

    return NextResponse.json(
      {
        message: 'History event added successfully',
        event,
      },
      { status: 201 }
    );
  } catch (error: Record<string, unknown>) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error adding history event:', error);
    return NextResponse.json(
      { error: 'Failed to add history event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to automatically log profile changes
 */
export async function logProfileChange(
  userId: string,
  organizationId: string,
  field: string,
  previousValue: any,
  newValue: any, Record<string, unknown>,
  actorId?: string
) {
  await db.insert(memberHistoryEvents).values({
    userId,
    organizationId,
    eventType: 'profile_update',
    eventCategory: 'administrative',
    eventDate: new Date(),
    eventTitle: `Profile Updated: ${field}`,
    eventDescription: `${field} changed from "${previousValue}" to "${newValue}"`,
    eventData: {
      field,
      previousValue,
      newValue,
    },
    actorId: actorId || 'system',
    isPublic: false,
    visibleToMember: true,
    createdBy: actorId || 'system',
  });
}
