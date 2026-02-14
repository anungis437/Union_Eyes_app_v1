/**
 * Elections Sessions API
 * 
 * Manages voting sessions for elections and ratifications
 * Supports convention, ratification, and special votes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingSessions, voterEligibility, votes, votingOptions } from '@/db/schema/voting-schema';
import { and, desc, or, like } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating voting session
const createSessionSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.enum(['convention', 'ratification', 'special_vote']),
  meetingType: z.enum(['convention', 'ratification', 'emergency', 'special']),
  organizationId: z.string().uuid(),
  scheduledEndTime: z.string().datetime().optional(),
  allowAnonymous: z.boolean().default(true),
  requiresQuorum: z.boolean().default(true),
  quorumThreshold: z.number().min(0).max(100).default(50),
  totalEligibleVoters: z.number().min(0).default(0),
  settings: z.record(z.any()).optional(),
});

// Validation schema for starting a session
const startSessionSchema = z.object({
  startTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime(),
});

/**
 * GET /api/governance/elections/sessions
 * List voting sessions with filters
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Extract query parameters
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (organizationId) {
      conditions.push(eq(votingSessions.organizationId, organizationId));
    }
    
    if (type) {
      conditions.push(eq(votingSessions.type, type));
    }
    
    if (status) {
      conditions.push(eq(votingSessions.status, status));
    }
    
    if (search) {
      conditions.push(
        or(
          like(votingSessions.title, `%${search}%`),
          like(votingSessions.description, `%${search}%`)
        )
      );
    }
    
    // Query sessions with vote counts
    const sessionsQuery = db
      .select({
        id: votingSessions.id,
        title: votingSessions.title,
        description: votingSessions.description,
        type: votingSessions.type,
        status: votingSessions.status,
        meetingType: votingSessions.meetingType,
        organizationId: votingSessions.organizationId,
        createdBy: votingSessions.createdBy,
        createdAt: votingSessions.createdAt,
        updatedAt: votingSessions.updatedAt,
        startTime: votingSessions.startTime,
        endTime: votingSessions.endTime,
        scheduledEndTime: votingSessions.scheduledEndTime,
        allowAnonymous: votingSessions.allowAnonymous,
        requiresQuorum: votingSessions.requiresQuorum,
        quorumThreshold: votingSessions.quorumThreshold,
        totalEligibleVoters: votingSessions.totalEligibleVoters,
        settings: votingSessions.settings,
        voteCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${votes} 
          WHERE ${votes.sessionId} = ${votingSessions.id}
        )`,
      })
      .from(votingSessions)
      .orderBy(desc(votingSessions.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Apply filters if any
    if (conditions.length > 0) {
      sessionsQuery.where(and(...conditions));
    }
    
    const sessions = await sessionsQuery;
    
    // Get total count
    const countQuery = db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(votingSessions);
    
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    
    const [{ count }] = await countQuery;
    
    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: Record<string, unknown>) {
    console.error('Error fetching voting sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voting sessions', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/governance/elections/sessions
 * Create new voting session
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = createSessionSchema.parse(body);
    
    // TODO: Extract from auth
    const createdBy = 'system'; // Replace with actual user ID
    
    // Create voting session
    const [session] = await db
      .insert(votingSessions)
      .values({
        ...validatedData,
        createdBy,
        status: 'draft',
      })
      .returning();
    
    return NextResponse.json({
      message: 'Voting session created successfully',
      session,
    }, { status: 201 });
  } catch (error: Record<string, unknown>) {
    console.error('Error creating voting session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create voting session', details: error.message },
      { status: 500 }
    );
  }
}
