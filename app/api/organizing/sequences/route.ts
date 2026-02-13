/**
 * Outreach Sequences API
 * 
 * Endpoints:
 * - GET /api/organizing/sequences - List sequences
 * - POST /api/organizing/sequences - Create new sequence
 * 
 * Phase 4: Communications & Organizing - Organizer Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { outreachSequences } from '@/db/schema';
import { and, eq, desc, sql, ilike, or } from 'drizzle-orm';

/**
 * GET /api/organizing/sequences
 * List outreach sequences with optional filters
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
    const status = searchParams.get('status');
    const isActive = searchParams.get('isActive');
    const triggerType = searchParams.get('triggerType');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [eq(outreachSequences.organizationId, organizationId)];

    if (status) {
      conditions.push(eq(outreachSequences.status, status as any));
    }

    if (isActive !== null && isActive !== undefined) {
      conditions.push(eq(outreachSequences.isActive, isActive === 'true'));
    }

    if (triggerType) {
      conditions.push(eq(outreachSequences.triggerType, triggerType));
    }

    if (search) {
      conditions.push(
        or(
          ilike(outreachSequences.name, `%${search}%`),
          ilike(outreachSequences.description, `%${search}%`)
        ) as any
      );
    }

    // Fetch sequences
    const sequences = await db
      .select()
      .from(outreachSequences)
      .where(and(...conditions))
      .orderBy(desc(outreachSequences.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(outreachSequences)
      .where(and(...conditions));

    return NextResponse.json({
      sequences,
      pagination: {
        total: Number(count),
        limit,
        offset,
        hasMore: Number(count) > offset + limit,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching outreach sequences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outreach sequences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizing/sequences
 * Create new outreach sequence
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
    if (!body.name || !body.triggerType || !body.steps) {
      return NextResponse.json(
        { error: 'Missing required fields: name, triggerType, steps' },
        { status: 400 }
      );
    }

    // Validate steps structure (array of objects with required fields)
    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      return NextResponse.json(
        { error: 'Steps must be a non-empty array' },
        { status: 400 }
      );
    }

    for (const step of body.steps) {
      if (!step.step || !step.action) {
        return NextResponse.json(
          { error: 'Each step must have a step number and action type' },
          { status: 400 }
        );
      }
    }

    // Create sequence
    const [sequence] = await db
      .insert(outreachSequences)
      .values({
        organizationId,
        name: body.name,
        description: body.description || null,
        triggerType: body.triggerType,
        triggerConditions: body.triggerConditions || {},
        steps: body.steps,
        status: body.status || 'active',
        isActive: body.isActive !== undefined ? body.isActive : true,
        stats: {
          enrolled: 0,
          completed: 0,
          active: 0,
          cancelled: 0,
        },
        metadata: body.metadata || {},
        tags: body.tags || [],
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return NextResponse.json(sequence, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating outreach sequence:', error);
    return NextResponse.json(
      { error: 'Failed to create outreach sequence' },
      { status: 500 }
    );
  }
}
