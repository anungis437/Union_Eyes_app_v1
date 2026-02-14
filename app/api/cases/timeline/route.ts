/**
 * Case Timeline API
 * 
 * Auto-generates timeline from FSM events and case activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and, desc, asc, eq } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { grievances } from '@/db/schema/domains/claims/grievances';
import { grievanceStages, grievanceAssignments, grievanceDocuments, grievanceDeadlines, grievanceSettlements } from '@/db/schema/domains/claims/workflows';
import { claims } from '@/db/schema/domains/claims/claims';
import { logger } from '@/lib/logger';

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
    logger.error('Error fetching timeline:', error);
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

    // Get case information first
    const [grievance] = await db
      .select()
      .from(grievances)
      .where(eq(grievances.id, caseId))
      .limit(1);

    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.claimId, caseId))
      .limit(1);

    const caseInfo = grievance || claim;
    if (!caseInfo) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    const organizationId = caseInfo.organizationId;
    const events: Array<{
      eventType: string;
      eventCategory: string;
      eventTitle: string;
      eventDescription?: string;
      eventDate: Date;
      eventData?: any;
      actorId?: string;
      actorName?: string;
    }> = [];

    // Query FSM state transitions from grievances/claims
    const stages = await db
      .select()
      .from(grievanceStages)
      .where(eq(grievanceStages.claimId, caseId))
      .orderBy(asc(grievanceStages.enteredAt));

    stages.forEach(stage => {
      events.push({
        eventType: 'state_change',
        eventCategory: 'milestone',
        eventTitle: `Stage: ${stage.stageType}`,
        eventDescription: `Case entered ${stage.stageType} stage`,
        eventDate: stage.enteredAt || new Date(),
        eventData: {
          stageType: stage.stageType,
          status: stage.status,
        },
      });
    });

    // Query assignments from grievanceAssignments
    const assignments = await db
      .select()
      .from(grievanceAssignments)
      .where(eq(grievanceAssignments.claimId, caseId))
      .orderBy(asc(grievanceAssignments.assignedAt));

    assignments.forEach(assignment => {
      events.push({
        eventType: 'assignment',
        eventCategory: 'activity',
        eventTitle: `Assigned to ${assignment.assignedTo}`,
        eventDescription: `Case assigned with role: ${assignment.role}`,
        eventDate: assignment.assignedAt || new Date(),
        eventData: {
          role: assignment.role,
          status: assignment.status,
          estimatedHours: assignment.estimatedHours,
        },
        actorId: assignment.assignedBy,
      });
    });

    // Query documents from grievanceDocuments
    const documents = await db
      .select()
      .from(grievanceDocuments)
      .where(eq(grievanceDocuments.claimId, caseId))
      .orderBy(asc(grievanceDocuments.uploadedAt));

    documents.forEach(doc => {
      events.push({
        eventType: 'document',
        eventCategory: 'administrative',
        eventTitle: `Document: ${doc.documentName}`,
        eventDescription: `${doc.documentType} document uploaded`,
        eventDate: doc.uploadedAt || new Date(),
        eventData: {
          documentType: doc.documentType,
          version: doc.version,
          documentId: doc.id,
        },
        actorId: doc.uploadedBy,
      });
    });

    // Query deadlines from grievanceDeadlines
    const deadlines = await db
      .select()
      .from(grievanceDeadlines)
      .where(eq(grievanceDeadlines.claimId, caseId))
      .orderBy(asc(grievanceDeadlines.deadlineDate));

    deadlines.forEach(deadline => {
      events.push({
        eventType: 'deadline',
        eventCategory: 'milestone',
        eventTitle: `Deadline: ${deadline.deadlineType}`,
        eventDescription: deadline.description || `${deadline.deadlineType} deadline`,
        eventDate: deadline.deadlineDate || new Date(),
        eventData: {
          deadlineType: deadline.deadlineType,
          status: deadline.status,
          priority: deadline.priority,
        },
      });
    });

    // Query settlements from grievanceSettlements
    const settlements = await db
      .select()
      .from(grievanceSettlements)
      .where(eq(grievanceSettlements.claimId, caseId))
      .orderBy(asc(grievanceSettlements.proposedAt));

    settlements.forEach(settlement => {
      events.push({
        eventType: 'settlement',
        eventCategory: 'milestone',
        eventTitle: `Settlement: ${settlement.settlementType}`,
        eventDescription: settlement.termsDescription || 'Settlement terms proposed',
        eventDate: settlement.proposedAt || new Date(),
        eventData: {
          settlementType: settlement.settlementType,
          status: settlement.status,
          monetaryAmount: settlement.monetaryAmount,
        },
      });
    });

    // Sort all events by date
    events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

    // Insert events into timeline table
    const insertedEvents = [];
    for (const event of events) {
      const [inserted] = await db
        .insert(caseTimelineEvents)
        .values({
          caseId,
          caseType: grievance ? 'grievance' : 'claim',
          organizationId,
          eventType: event.eventType,
          eventCategory: event.eventCategory,
          eventTitle: event.eventTitle,
          eventDescription: event.eventDescription || null,
          eventData: event.eventData || {},
          actorId: event.actorId || null,
          actorName: event.actorName || null,
          actorRole: null,
          eventDate: event.eventDate,
          isPublic: true,
          visibleToMember: true,
          metadata: {},
          createdBy: 'system',
        })
        .returning();
      
      insertedEvents.push(inserted);
    }

    return NextResponse.json({
      message: 'Timeline generated successfully',
      caseId,
      eventsCreated: insertedEvents.length,
      events: insertedEvents,
    });
  } catch (error: Record<string, unknown>) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error generating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to generate timeline', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to add timeline event (to be called by other services)
 */
export async function addTimelineEvent(data: {
  caseId: string;
  caseType: string;
  organizationId: string;
  eventType: string;
  eventCategory: string;
  eventTitle: string;
  eventDescription?: string;
  eventData?: any | Record<string, unknown>;
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
