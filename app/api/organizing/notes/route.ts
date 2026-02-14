/**
 * Field Notes API
 * 
 * Endpoints:
 * - GET /api/organizing/notes - List field notes (with filters)
 * - POST /api/organizing/notes - Create new field note
 * 
 * Phase 4: Communications & Organizing - Organizer Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { fieldNotes } from '@/db/schema';
import { and, desc, ilike, or } from 'drizzle-orm';

/**
 * GET /api/organizing/notes
 * List field notes with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    // Query parameters
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');
    const authorId = searchParams.get('authorId');
    const noteType = searchParams.get('noteType');
    const sentiment = searchParams.get('sentiment');
    const followUpPending = searchParams.get('followUpPending'); // true = has follow-up date and not completed
    const interactionDateFrom = searchParams.get('interactionDateFrom');
    const interactionDateTo = searchParams.get('interactionDateTo');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [eq(fieldNotes.organizationId, organizationId)];

    if (memberId) {
      conditions.push(eq(fieldNotes.memberId, memberId));
    }

    if (authorId) {
      conditions.push(eq(fieldNotes.authorId, authorId));
    }

    if (noteType) {
      conditions.push(eq(fieldNotes.noteType, noteType));
    }

    if (sentiment) {
      conditions.push(eq(fieldNotes.sentiment, sentiment));
    }

    if (followUpPending === 'true') {
      conditions.push(
        and(
          sql`${fieldNotes.followUpDate} IS NOT NULL`,
          eq(fieldNotes.followUpCompleted, false)
        ) as Record<string, unknown>
      );
    }

    if (interactionDateFrom) {
      conditions.push(gte(fieldNotes.interactionDate, interactionDateFrom));
    }

    if (interactionDateTo) {
      conditions.push(lte(fieldNotes.interactionDate, interactionDateTo));
    }

    if (search) {
      conditions.push(
        or(
          ilike(fieldNotes.subject, `%${search}%`),
          ilike(fieldNotes.content, `%${search}%`)
        ) as Record<string, unknown>
      );
    }

    // Privacy filter: users can only see their own notes or public notes
    // TODO: Add role-based access (admins, stewards can see more)
    conditions.push(
      or(
        eq(fieldNotes.authorId, userId),
        eq(fieldNotes.isPrivate, false)
      ) as Record<string, unknown>
    );

    // Fetch notes
    const notes = await db
      .select()
      .from(fieldNotes)
      .where(and(...conditions))
      .orderBy(desc(fieldNotes.interactionDate), desc(fieldNotes.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fieldNotes)
      .where(and(...conditions));

    return NextResponse.json({
      notes,
      pagination: {
        total: Number(count),
        limit,
        offset,
        hasMore: Number(count) > offset + limit,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching field notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizing/notes
 * Create new field note
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = request.headers.get('x-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.memberId || !body.noteType || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, noteType, content' },
        { status: 400 }
      );
    }

    // Create note
    const [note] = await db
      .insert(fieldNotes)
      .values({
        organizationId,
        memberId: body.memberId,
        authorId: userId,
        noteType: body.noteType,
        subject: body.subject || null,
        content: body.content,
        sentiment: body.sentiment || null,
        engagementLevel: body.engagementLevel || null,
        followUpDate: body.followUpDate || null,
        followUpCompleted: false,
        relatedCaseId: body.relatedCaseId || null,
        relatedGrievanceId: body.relatedGrievanceId || null,
        interactionDate: body.interactionDate || new Date().toISOString().split('T')[0],
        tags: body.tags || [],
        isPrivate: body.isPrivate !== undefined ? body.isPrivate : false,
        isConfidential: body.isConfidential !== undefined ? body.isConfidential : false,
        metadata: body.metadata || {},
      })
      .returning();

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating field note:', error);
    return NextResponse.json(
      { error: 'Failed to create field note' },
      { status: 500 }
    );
  }
}
