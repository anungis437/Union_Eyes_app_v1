import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { polls, pollVotes } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api-auth-guard';
import { withRLSContext } from '@/lib/db/with-rls-context';

// Validation schema
const VoteSchema = z.object({
  optionId: z.string().min(1, 'Option ID is required'),
});

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxVotes: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxVotes) {
    return false;
  }

  record.count++;
  return true;
}

// POST /api/communications/polls/[pollId]/vote - Submit vote
export const POST = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { pollId: string } }
) => {
  try {
    const pollId = params.pollId;
    const organizationId = (request.headers.get('x-organization-id') ?? request.headers.get('x-tenant-id'));
    const tenantId = organizationId;
    const userId = request.headers.get('x-user-id') || null;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimitIdentifier = userId || ipAddress;
    if (!checkRateLimit(`poll_vote_${rateLimitIdentifier}`, 10, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = VoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { optionId } = validation.data;

    // Fetch poll
    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.tenantId, tenantId)))
      .limit(1);

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Check poll status
    if (poll.status !== 'active') {
      return NextResponse.json(
        { error: 'Poll is not active' },
        { status: 400 }
      );
    }

    // Check if poll is closed
    if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
      return NextResponse.json(
        { error: 'Poll is closed' },
        { status: 400 }
      );
    }

    // Check authentication requirements
    if (poll.requireAuthentication && !userId) {
      return NextResponse.json(
        { error: 'Authentication required to vote' },
        { status: 401 }
      );
    }

    // Verify option exists
    const options = poll.options as any[];
    const optionExists = options.some((opt) => opt.id === optionId);
    
    if (!optionExists) {
      return NextResponse.json(
        { error: 'Invalid option ID' },
        { status: 400 }
      );
    }

    // Check for duplicate votes
    if (userId) {
      const [existingVote] = await db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
        .limit(1);

      if (existingVote && !poll.allowMultipleVotes) {
        return NextResponse.json(
          { error: 'You have already voted in this poll' },
          { status: 400 }
        );
      }
    } else {
      // For anonymous votes, check by IP (basic duplicate prevention)
      const [existingVote] = await db
        .select()
        .from(pollVotes)
        .where(
          and(
            eq(pollVotes.pollId, pollId),
            eq(pollVotes.ipAddress, ipAddress)
          )
        )
        .limit(1);

      if (existingVote && !poll.allowMultipleVotes) {
        return NextResponse.json(
          { error: 'You have already voted in this poll' },
          { status: 400 }
        );
      }
    }

    // Record vote
    await withRLSContext({ organizationId: tenantId }, async (db) => {
      return await db.insert(pollVotes).values({
        tenantId,
        pollId,
        optionId,
        userId,
        ipAddress,
      });
    });

    // Update poll option votes (using JSONB update)
    const updatedOptions = options.map((opt) =>
      opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );

    // Update poll with new totals
    const [updatedPoll] = await db
      .update(polls)
      .set({
        options: updatedOptions,
        totalVotes: sql`${polls.totalVotes} + 1`,
        uniqueVoters: sql`${polls.uniqueVoters} + 1`,
      })
      .where(eq(polls.id, pollId))
      .returning();

    // Calculate percentages
    const optionsWithPercentages = (updatedPoll.options as any[]).map((option: any) => ({
      ...option,
      percentage: updatedPoll.totalVotes > 0 ? (option.votes / updatedPoll.totalVotes) * 100 : 0,
    }));

    return NextResponse.json({
      poll: {
        ...updatedPoll,
        options: optionsWithPercentages,
      },
      message: 'Vote submitted successfully',
    });
  } catch (error) {
return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
});
