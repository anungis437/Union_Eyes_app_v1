import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { votingSessions, votingOptions, voterEligibility, votes } from '@/db/schema/voting-schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';

/**
 * GET /api/voting/sessions
 * List voting sessions with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // draft, active, closed
    const type = searchParams.get('type'); // convention, ratification
    const includeStats = searchParams.get('includeStats') === 'true';

    // Build where conditions
    const whereConditions = [];
    
    if (status) {
      whereConditions.push(eq(votingSessions.status, status));
    }
    
    if (type) {
      whereConditions.push(eq(votingSessions.type, type));
    }

    // Get sessions
    const sessions = await db
      .select()
      .from(votingSessions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(votingSessions.createdAt));

    // Optionally include vote counts and eligibility
    if (includeStats) {
      const sessionsWithStats = await Promise.all(
        sessions.map(async (session) => {
          // Get vote count
          const [voteCount] = await db
            .select({ count: count() })
            .from(votes)
            .where(eq(votes.sessionId, session.id));

          // Get options count
          const [optionsCount] = await db
            .select({ count: count() })
            .from(votingOptions)
            .where(eq(votingOptions.sessionId, session.id));

          // Check if user has voted
          const [userVote] = await db
            .select()
            .from(votes)
            .where(
              and(
                eq(votes.sessionId, session.id),
                eq(votes.voterId, userId)
              )
            )
            .limit(1);

          // Check if user is eligible
          const [eligibility] = await db
            .select()
            .from(voterEligibility)
            .where(
              and(
                eq(voterEligibility.sessionId, session.id),
                eq(voterEligibility.memberId, userId)
              )
            )
            .limit(1);

          return {
            ...session,
            stats: {
              totalVotes: voteCount.count || 0,
              totalOptions: optionsCount.count || 0,
              hasVoted: !!userVote,
              isEligible: eligibility?.isEligible || false,
              turnoutPercentage: (session.totalEligibleVoters || 0) > 0
                ? Math.round((voteCount.count / (session.totalEligibleVoters || 1)) * 100)
                : 0,
            },
          };
        })
      );

      return NextResponse.json({ sessions: sessionsWithStats });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching voting sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voting/sessions
 * Create a new voting session (admin/LRO only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Check if user has admin/LRO permissions
    // For now, allow any authenticated user

    const body = await request.json();
    const {
      title,
      description,
      type,
      meetingType,
      organizationId,
      startTime,
      scheduledEndTime,
      allowAnonymous,
      requiresQuorum,
      quorumThreshold,
      settings,
      options, // Array of option texts
    } = body;

    // Validate required fields
    if (!title || !type || !meetingType || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, meetingType, organizationId' },
        { status: 400 }
      );
    }

    // Validate type and meetingType
    const validTypes = ['convention', 'ratification', 'special_vote'];
    const validMeetingTypes = ['convention', 'ratification', 'emergency', 'special'];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validMeetingTypes.includes(meetingType)) {
      return NextResponse.json(
        { error: `Invalid meetingType. Must be one of: ${validMeetingTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create session
    const [newSession] = await db
      .insert(votingSessions)
      .values({
        title,
        description,
        type,
        meetingType,
        organizationId,
        createdBy: userId,
        startTime: startTime ? new Date(startTime) : undefined,
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : undefined,
        allowAnonymous: allowAnonymous ?? true,
        requiresQuorum: requiresQuorum ?? true,
        quorumThreshold: quorumThreshold ?? 50,
        settings: settings || {},
        status: 'draft',
      })
      .returning();

    // Create voting options if provided
    if (options && Array.isArray(options) && options.length > 0) {
      const optionValues = options.map((optionText: string, index: number) => ({
        sessionId: newSession.id,
        text: optionText,
        orderIndex: index,
      }));

      await db.insert(votingOptions).values(optionValues);
    }

    return NextResponse.json({
      message: 'Voting session created successfully',
      session: newSession,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating voting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
