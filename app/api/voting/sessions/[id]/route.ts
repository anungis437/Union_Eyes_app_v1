import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { votingSessions, votingOptions, voterEligibility, votes } from '@/db/schema/voting-schema';
import { eq, and, count, sql } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/voting/sessions/[id]
 * Get voting session details with options and results
 */
export async function GET(
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

    // Get options
    const options = await db
      .select()
      .from(votingOptions)
      .where(eq(votingOptions.sessionId, sessionId))
      .orderBy(votingOptions.orderIndex);

    // Get vote counts per option
    const optionsWithCounts = await Promise.all(
      options.map(async (option) => {
        const [voteCount] = await db
          .select({ count: count() })
          .from(votes)
          .where(eq(votes.optionId, option.id));

        return {
          ...option,
          voteCount: voteCount.count || 0,
        };
      })
    );

    // Get total votes
    const [totalVotesCount] = await db
      .select({ count: count() })
      .from(votes)
      .where(eq(votes.sessionId, sessionId));

    // Check if user has voted
    const [userVote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.sessionId, sessionId),
          eq(votes.voterId, userId)
        )
      )
      .limit(1);

    // Check user eligibility
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

    // Calculate percentages
    const totalVotes = totalVotesCount.count || 0;
    const optionsWithPercentages = optionsWithCounts.map(option => ({
      ...option,
      percentage: totalVotes > 0 
        ? Math.round((option.voteCount / totalVotes) * 100) 
        : 0,
    }));

    // Calculate turnout
    const totalEligible = session.totalEligibleVoters || 0;
    const turnoutPercentage = totalEligible > 0
      ? Math.round((totalVotes / totalEligible) * 100)
      : 0;

    // Check if quorum is met
    const quorumThreshold = session.quorumThreshold || 50;
    const quorumMet = session.requiresQuorum
      ? turnoutPercentage >= quorumThreshold
      : true;

    return NextResponse.json({
      session,
      options: optionsWithPercentages,
      stats: {
        totalVotes,
        totalEligibleVoters: totalEligible,
        turnoutPercentage,
        quorumMet,
        quorumThreshold,
      },
      userStatus: {
        hasVoted: !!userVote,
        isEligible: eligibility?.isEligible || false,
        votedOptionId: userVote?.optionId || null,
        votedAt: userVote?.castAt || null,
      },
    });
  } catch (error) {
    console.error('Error fetching voting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voting/sessions/[id]
 * Update voting session (admin/LRO only)
 */
export async function PATCH(
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

    // TODO: Check if user has admin/LRO permissions

    const sessionId = params.id;
    const body = await request.json();
    
    const {
      title,
      description,
      status,
      startTime,
      endTime,
      scheduledEndTime,
      settings,
    } = body;

    // Build update object
    const updates: any = { updatedAt: new Date() };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) {
      const validStatuses = ['draft', 'active', 'paused', 'closed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = status;
      
      // Set timestamps based on status
      if (status === 'active' && !updates.startTime) {
        updates.startTime = new Date();
      }
      if (status === 'closed' && !updates.endTime) {
        updates.endTime = new Date();
      }
    }
    if (startTime !== undefined) updates.startTime = new Date(startTime);
    if (endTime !== undefined) updates.endTime = new Date(endTime);
    if (scheduledEndTime !== undefined) updates.scheduledEndTime = new Date(scheduledEndTime);
    if (settings !== undefined) updates.settings = settings;

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update session
    const [updatedSession] = await db
      .update(votingSessions)
      .set(updates)
      .where(eq(votingSessions.id, sessionId))
      .returning();

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Voting session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Voting session updated successfully',
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error updating voting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voting/sessions/[id]
 * Delete voting session (admin/LRO only)
 */
export async function DELETE(
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

    // TODO: Check if user has admin/LRO permissions

    const sessionId = params.id;

    // Check if session exists and has no votes yet
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

    // Check if there are any votes
    const [voteCount] = await db
      .select({ count: count() })
      .from(votes)
      .where(eq(votes.sessionId, sessionId));

    if (voteCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete session with existing votes. Please close it instead.' },
        { status: 400 }
      );
    }

    // Delete session (cascade will delete options and eligibility)
    await db
      .delete(votingSessions)
      .where(eq(votingSessions.id, sessionId));

    return NextResponse.json({
      message: 'Voting session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting voting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
