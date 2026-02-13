/**
 * Case Meetings/Scheduling API
 * 
 * Manages step meetings, hearings, and case-related meetings
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// Case meetings schema
export const caseMeetings = pgTable('case_meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Case Reference
  caseId: uuid('case_id').notNull(),
  caseType: text('case_type').notNull(), // grievance, arbitration, investigation
  organizationId: uuid('organization_id').notNull(),
  
  // Meeting Details
  meetingType: text('meeting_type').notNull(), // step_1, step_2, step_3, arbitration_hearing, investigation_interview, mediation
  meetingTitle: text('meeting_title').notNull(),
  description: text('description'),
  
  // Scheduling
  scheduledStart: timestamp('scheduled_start').notNull(),
  scheduledEnd: timestamp('scheduled_end').notNull(),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  duration: text('duration'), // ISO 8601 duration
  
  // Location
  locationType: text('location_type').notNull().default('in_person'), // in_person, virtual, phone, hybrid
  location: text('location'), // Physical address or room
  virtualMeetingUrl: text('virtual_meeting_url'),
  virtualMeetingId: text('virtual_meeting_id'),
  virtualMeetingPasscode: text('virtual_meeting_passcode'),
  
  // Participants
  organizer: text('organizer').notNull(), // User ID
  participants: jsonb('participants').$type<{
    userId: string;
    role: string; // union_rep, member, employer_rep, witness, arbitrator, etc.
    attendance: 'required' | 'optional' | 'informational';
    attended?: boolean;
  }[]>(),
  
  // Agenda & Minutes
  agenda: jsonb('agenda').$type<string[]>(),
  minutes: text('minutes'),
  actionItems: jsonb('action_items').$type<{
    id: string;
    task: string;
    assignedTo: string;
    dueDate: string;
    status: 'pending' | 'in_progress' | 'completed';
  }[]>(),
  
  // Documents
  agendaUrl: text('agenda_url'),
  minutesUrl: text('minutes_url'),
  recordingUrl: text('recording_url'),
  
  // Outcome
  outcome: text('outcome'), // agreement_reached, no_resolution, adjourned, withdrawn, settled
  outcomeNotes: text('outcome_notes'),
  
  // Status
  status: text('status').notNull().default('scheduled'), // scheduled, confirmed, in_progress, completed, cancelled, rescheduled
  
  // Reminders
  reminderSent: boolean('reminder_sent').default(false),
  reminderSentAt: timestamp('reminder_sent_at'),
  
  // Cancellation
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: text('cancelled_by'),
  cancellationReason: text('cancellation_reason'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by'),
  lastModifiedBy: text('last_modified_by'),
});

// Validation schema for creating meeting
const createMeetingSchema = z.object({
  caseId: z.string().uuid(),
  caseType: z.enum(['grievance', 'arbitration', 'investigation']),
  organizationId: z.string().uuid(),
  meetingType: z.string(),
  meetingTitle: z.string(),
  description: z.string().optional(),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  locationType: z.enum(['in_person', 'virtual', 'phone', 'hybrid']).default('in_person'),
  location: z.string().optional(),
  virtualMeetingUrl: z.string().url().optional(),
  participants: z.array(z.object({
    userId: z.string(),
    role: z.string(),
    attendance: z.enum(['required', 'optional', 'informational']),
  })).optional(),
  agenda: z.array(z.string()).optional(),
});

/**
 * GET /api/cases/meetings
 * List case meetings with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const organizationId = searchParams.get('organizationId');
    const meetingType = searchParams.get('meetingType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [];
    if (caseId) {
      conditions.push(eq(caseMeetings.caseId, caseId));
    }
    if (organizationId) {
      conditions.push(eq(caseMeetings.organizationId, organizationId));
    }
    if (meetingType) {
      conditions.push(eq(caseMeetings.meetingType, meetingType));
    }
    if (status) {
      conditions.push(eq(caseMeetings.status, status));
    }
    if (startDate) {
      conditions.push(gte(caseMeetings.scheduledStart, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(caseMeetings.scheduledStart, new Date(endDate)));
    }

    // Fetch meetings
    const meetings = await db
      .select()
      .from(caseMeetings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(caseMeetings.scheduledStart))
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(caseMeetings)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({
      meetings,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/meetings
 * Schedule new meeting
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createMeetingSchema.parse(body);

    // Create meeting
    const [newMeeting] = await db
      .insert(caseMeetings)
      .values({
        ...validatedData,
        scheduledStart: new Date(validatedData.scheduledStart),
        scheduledEnd: new Date(validatedData.scheduledEnd),
        organizer: 'system', // TODO: Get from auth
        status: 'scheduled',
        createdBy: 'system', // TODO: Get from auth
        lastModifiedBy: 'system',
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Meeting scheduled successfully',
        meeting: newMeeting,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error scheduling meeting:', error);
    return NextResponse.json(
      { error: 'Failed to schedule meeting', details: error.message },
      { status: 500 }
    );
  }
}
