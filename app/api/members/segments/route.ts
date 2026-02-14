/**
 * Member Segments API
 * 
 * Saved member lists and dynamic segments for targeted communications
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { and, desc } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

// Segments schema
export const memberSegments = pgTable('member_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Segment Details
  name: text('name').notNull(),
  description: text('description'),
  organizationId: uuid('organization_id').notNull(),
  
  // Segment Type
  segmentType: text('segment_type').notNull(), // dynamic, static, manual
  
  // Query Definition (for dynamic segments)
  query: jsonb('query').$type<{
    filters?: Record<string, unknown>;
    searchQuery?: string;
  }>(),
  
  // Static Member List (for static/manual segments)
  memberIds: jsonb('member_ids').$type<string[]>(),
  
  // Segment Stats
  memberCount: integer('member_count').default(0),
  lastCalculated: timestamp('last_calculated'),
  
  // Access Control
  isPublic: boolean('is_public').default(false),
  createdBy: text('created_by'),
  allowedUsers: jsonb('allowed_users').$type<string[]>(),
  
  // Tags
  tags: jsonb('tags').$type<string[]>(),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Validation schemas
const createSegmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  segmentType: z.enum(['dynamic', 'static', 'manual']),
  query: z.record(z.any()).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/members/segments
 * List all segments
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const includePrivate = searchParams.get('includePrivate') === 'true';

    const conditions = [];
    if (organizationId) {
      conditions.push(eq(memberSegments.organizationId, organizationId));
    }
    if (!includePrivate) {
      conditions.push(eq(memberSegments.isPublic, true));
    }

    const segments = await db
      .select()
      .from(memberSegments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(memberSegments.createdAt));

    return NextResponse.json({
      segments,
      total: segments.length,
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching segments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch segments', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/segments
 * Create new segment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createSegmentSchema.parse(body);

    // Calculate initial member count
    let memberCount = 0;
    if (validatedData.segmentType === 'dynamic' && validatedData.query) {
      memberCount = await calculateDynamicSegmentCount(validatedData.query);
    } else if (validatedData.memberIds) {
      memberCount = validatedData.memberIds.length;
    }

    const [segment] = await db
      .insert(memberSegments)
      .values({
        ...validatedData,
        organizationId: 'org-id', // TODO: Get from context
        memberCount,
        lastCalculated: new Date(),
        createdBy: 'system', // TODO: Get from auth
      })
      .returning();

    console.log(`✅ Segment created: ${validatedData.name} (${memberCount} members)`);

    return NextResponse.json(
      {
        message: 'Segment created successfully',
        segment,
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
    console.error('Error creating segment:', error);
    return NextResponse.json(
      { error: 'Failed to create segment', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/members/segments/[id]/members
 * Get members in a segment
 */
export async function getSegmentMembers(
  segmentId: string,
  page: number = 1,
  limit: number = 50
) {
  try {
    const [segment] = await db
      .select()
      .from(memberSegments)
      .where(eq(memberSegments.id, segmentId));

    if (!segment) {
      throw new Error('Segment not found');
    }

    let members;
    const offset = (page - 1) * limit;

    if (segment.segmentType === 'dynamic') {
      // Execute dynamic query
      members = await executeDynamicSegmentQuery(segment.query, limit, offset);
    } else {
      // Get static member list
      const memberIds = segment.memberIds || [];
      const paginatedIds = memberIds.slice(offset, offset + limit);
      
      if (paginatedIds.length > 0) {
        members = await db.execute(sql`
          SELECT * FROM users
          WHERE id = ANY(${paginatedIds})
        `);
      } else {
        members = { rows: [] };
      }
    }

    return {
      segment,
      members: members.rows,
      pagination: {
        page,
        limit,
        total: segment.memberCount,
        totalPages: Math.ceil(segment.memberCount / limit),
      },
    };
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching segment members:', error);
    throw error;
  }
}

/**
 * PUT /api/members/segments/[id]
 * Update segment
 */
export async function updateSegment(segmentId: string, updates: Record<string, unknown>) Record<string, unknown>) {
  try {
    const [updated] = await db
      .update(memberSegments)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(memberSegments.id, segmentId))
      .returning();

    // Recalculate member count if query changed
    if (updates.query) {
      const memberCount = await calculateDynamicSegmentCount(updates.query);
      await db
        .update(memberSegments)
        .set({
          memberCount,
          lastCalculated: new Date(),
        })
        .where(eq(memberSegments.id, segmentId));
    }

    return updated;
  } catch (error: Record<string, unknown>) {
    console.error('Error updating segment:', error);
    throw error;
  }
}

/**
 * Helper: Calculate dynamic segment member count
 */
async function calculateDynamicSegmentCount(query: Record<string, unknown>) Record<string, unknown>): Promise<number> {
  try {
    // Build count query based on filters
    const filters = query.filters || {};
    const conditions = [];

    if (filters.status) {
      conditions.push(sql`status = ANY(${filters.status})`);
    }
    if (filters.classification) {
      conditions.push(sql`classification = ANY(${filters.classification})`);
    }

    let countQuery = sql`SELECT COUNT(*) as count FROM users u`;
    
    if (conditions.length > 0) {
      countQuery = sql`${countQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
    }

    const [{ count }] = await db.execute(countQuery) as Array<Record<string, unknown>>;
    return Number(count);
  } catch {
    return 0;
  }
}

/**
 * Helper: Execute dynamic segment query
 */
async function executeDynamicSegmentQuery(
  query: any, Record<string, unknown>,
  limit: number,
  offset: number
): Promise<Record<string, unknown>> {
  try {
    const filters = query.filters || {};
    const conditions = [];

    if (filters.status) {
      conditions.push(sql`status = ANY(${filters.status})`);
    }

    let dataQuery = sql`SELECT * FROM users u`;
    
    if (conditions.length > 0) {
      dataQuery = sql`${dataQuery} WHERE ${sql.join(conditions, sql` AND `)}`;
    }
    
    dataQuery = sql`${dataQuery} ORDER BY u.full_name ASC LIMIT ${limit} OFFSET ${offset}`;

    return await db.execute(dataQuery);
  } catch {
    return { rows: [] };
  }
}

/**
 * POST /api/members/segments/[id]/refresh
 * Refresh dynamic segment member count
 */
export async function refreshSegment(segmentId: string) {
  const [segment] = await db
    .select()
    .from(memberSegments)
    .where(eq(memberSegments.id, segmentId));

  if (!segment) {
    throw new Error('Segment not found');
  }

  if (segment.segmentType === 'dynamic' && segment.query) {
    const memberCount = await calculateDynamicSegmentCount(segment.query);
    
    await db
      .update(memberSegments)
      .set({
        memberCount,
        lastCalculated: new Date(),
      })
      .where(eq(memberSegments.id, segmentId));

    return { memberCount };
  }

  return { memberCount: segment.memberCount };
}
