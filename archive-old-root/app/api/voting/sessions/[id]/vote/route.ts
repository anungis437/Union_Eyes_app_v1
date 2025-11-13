import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { votingSessions, votingOptions, voterEligibility, votes } from '@/db/schema/voting-schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/voting/sessions/[id]/vote
 * Submit a vote for a voting session
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = params.id;
    const body = await request.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json(
        { error: 'Missing required field: optionId' },
        { status: 400 }
      );
    }

    // Get session
    const [session] = await db
      .select()
      .from(votingSessions)
      .where(eq(votingSessions.id, sessionId));

    if (!session) {
      return NextResponse.json(
        { error: 'Voting session not found' },
        { status: 404 }
      );
    }

    // Check if session is active
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: `Voting session is ${session.status}. Only active sessions accept votes.` },
        { status: 400 }
      );
    }

    // Check if session has ended
    if (session.scheduledEndTime && new Date() > session.scheduledEndTime) {
      return NextResponse.json(
        { error: 'Voting session has ended' },
        { status: 400 }
      );
    }

    // Verify option belongs to this session
    const [option] = await db
      .select()
      .from(votingOptions)
      .where(
        and(
          eq(votingOptions.id, optionId),
          eq(votingOptions.sessionId, sessionId)
        )
      );

    if (!option) {
      return NextResponse.json(
        { error: 'Invalid option for this voting session' },
        { status: 400 }
      );
    }

    // Check if user has already voted
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.sessionId, sessionId),
          eq(votes.voterId, userId)
        )
      )
      .limit(1);

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted in this session' },
        { status: 409 }
      );
    }

    // Check voter eligibility
    const [eligibility] = await db
      .select()
      .from(voterEligibility)
      .where(
        and(
          eq(voterEligibility.sessionId, sessionId),
          eq(voterEligibility.memberId, userId)
        )
      )
      .limit(1);

    if (eligibility && !eligibility.isEligible) {
      return NextResponse.json(
        { error: 'You are not eligible to vote in this session' },
        { status: 403 }
      );
    }

    // Generate voter hash for verification (allows checking without storing userId)
    const voterHash = createHash('sha256')
      .update(`${userId}:${sessionId}:${process.env.VOTING_SECRET || 'default-secret'}`)
      .digest('hex');

    // Determine if vote should be anonymous
    const isAnonymous = session.allowAnonymous ?? true;

    // Create vote
    const [newVote] = await db
      .insert(votes)
      .values({
        sessionId,
        optionId,
        voterId: isAnonymous ? 'anonymous' : userId,
        voterHash,
        isAnonymous,
        voterType: 'member',
        castAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      message: 'Vote cast successfully',
      vote: {
        id: newVote.id,
        sessionId: newVote.sessionId,
        optionId: newVote.optionId,
        castAt: newVote.castAt,
        isAnonymous: newVote.isAnonymous,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
