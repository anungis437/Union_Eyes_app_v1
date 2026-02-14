/**
 * Case Timeline API
 * 
 * Auto-generates timeline from FSM events and case activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and, desc, asc } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Timeline events schema
export const caseTimelineEvents = pgTable('case_timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Case Reference
  caseId: uuid('case_id').notNull(),
  caseType: text('case_type').notNull(),
  organizationId: uuid('organization_id').notNull(),
  
  // Event Details
  eventType: text('event_type').notNull(), // state_change, assignment, document, meeting, deadline, note, evidence, outcome
  eventCategory: text('event_category').notNull(), // milestone, activity, communication, administrative
  
  // Event Data
  eventTitle: text('event_title').notNull(),
  eventDescription: text('event_description'),
  eventData: jsonb('event_data').$type<{
    previousState?: string;
    newState?: string;
    assignedTo?: string;
    documentId?: string;
    meetingId?: string;
    evidenceId?: string;
    [key: string]: any;
  }>(),
  
  // Actor
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  actorRole: text('actor_role'),
  
  // Timing
  eventDate: timestamp('event_date').notNull(),
  durationDays: text('duration_days'), // Days since previous milestone
  
  // Visibility
  isPublic: jsonb('is_public').$type<boolean>().default(true),
  visibleToMember: jsonb('visible_to_member').$type<boolean>().default(true),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by'),
});

// Validation schema
const generateTimelineSchema = z.object({
  caseId: z.string().uuid(),
  includePrivate: z.boolean().optional(),
});

/**
 * GET /api/cases/timeline
 * Get timeline for a case
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const includePrivate = searchParams.get('includePrivate') === 'true';

    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId is required' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(caseTimelineEvents.caseId, caseId)];
    
    if (!includePrivate) {
      conditions.push(eq(caseTimelineEvents.isPublic, true));
    }

    // Fetch timeline events
    const events = await db
      .select()
      .from(caseTimelineEvents)
      .where(and(...conditions))
      .orderBy(asc(caseTimelineEvents.eventDate));

    // Calculate durations between milestones
    const enhancedEvents = events.map((event, index) => {
      if (index === 0 || event.eventCategory !== 'milestone') {
        return event;
      }

      // Find previous milestone
      const prevMilestone = events
        .slice(0, index)
        .reverse()
        .find(e => e.eventCategory === 'milestone');

      if (prevMilestone) {
        const daysDiff = Math.floor(
          (new Date(event.eventDate).getTime() - new Date(prevMilestone.eventDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        return { ...event, durationDays: `${daysDiff}` };
      }

      return event;
    });

    // Group by date for better visualization
    const groupedByDate = enhancedEvents.reduce((acc, event) => {
      const date = new Date(event.eventDate).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    }, {} as Record<string, typeof events>);

    return NextResponse.json({
      caseId,
      totalEvents: enhancedEvents.length,
      events: enhancedEvents,
      groupedByDate,
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/timeline/generate
 * Auto-generate timeline from case events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caseId } = generateTimelineSchema.parse(body);

    // This would typically query various tables to build timeline
    // For now, we&apos;ll create a basic structure that other services can populate
    
    // TODO: Query FSM state transitions from grievances/claims tables
    // TODO: Query assignments from case_assignments
    // TODO: Query documents from case_documents
    // TODO: Query meetings from caseMeetings
    // TODO: Query evidence from caseEvidence
    // TODO: Query outcomes from caseOutcomes

    return NextResponse.json({
      message: 'Timeline generation initiated',
      caseId,
      note: 'Timeline events are populated by other services. Use GET to retrieve.',
    });
  } catch (error: Record<string, unknown>) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error generating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to generate timeline', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to add timeline event (to be called by other services)
 */
export async function async function addTimelineEvent(data: {
  caseId: string;
  caseType: string;
  organizationId: string;
  eventType: string;
  eventCategory: string;
  eventTitle: string;
  eventDescription?: string;
  eventData?: any Record<string, unknown>;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  eventDate: Date;
  isPublic?: boolean;
  visibleToMember?: boolean;
}) {
  const [event] = await db
    .insert(caseTimelineEvents)
    .values({
      ...data,
      eventDate: data.eventDate,
      createdBy: data.actorId || 'system',
    })
    .returning();

  return event;
}
