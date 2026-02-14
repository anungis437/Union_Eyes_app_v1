import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { polls, pollVotes } from '@/db/schema';
import { and } from 'drizzle-orm';
import { z } from 'zod';
import { withApiAuth } from '@/lib/api-auth-guard';

import { standardSuccessResponse } from '@/lib/api/standardized-responses';
// Validation schema for update
const UpdatePollSchema = z.object({
  question: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  options: z.array(z.any()).optional(),
  allowMultipleVotes: z.boolean().optional(),
  requireAuthentication: z.boolean().optional(),
  showResultsBeforeVote: z.boolean().optional(),
  closesAt: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
});

// GET /api/communications/polls/[pollId] - Get poll by ID
export const GET = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { pollId: string } }
) => {
  try {
    const pollId = params.pollId;
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id') || null;
    
    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID is required'
    );
    }

    // Fetch poll
    const [poll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.organizationId, organizationId)))
      .limit(1);

    if (!poll) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Poll not found'
    );
    }

    // Calculate percentages for options
    const optionsWithPercentages = (poll.options as Array<Record<string, unknown>>).map((option: Record<string, unknown>) => ({
      ...option,
      percentage: poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0,
    }));

    // Check if user has voted (if authenticated)
    let userVote = null;
    if (userId) {
      const [vote] = await db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
        .limit(1);
      
      if (vote) {
        userVote = vote.optionId;
      }
    }

    return NextResponse.json({
      ...poll,
      options: optionsWithPercentages,
      userVote,
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to fetch poll',
      error
    );
  }
});

// PUT /api/communications/polls/[pollId] - Update poll
export const PUT = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { pollId: string } }
) => {
  try {
    const pollId = params.pollId;
    const organizationId = request.headers.get('x-organization-id');
    const userId = request.headers.get('x-user-id');
    
    if (!organizationId || !userId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID and User ID are required'
    );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = UpdatePollSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed'
      // TODO: Migrate additional details: details: validation.error.errors
    );
    }

    // Prepare update data
    const updateData = {
      updatedBy: userId,
      updatedAt: new Date(),
    };

    if (data.question) updateData.question = data.question;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.allowMultipleVotes !== undefined) updateData.allowMultipleVotes = data.allowMultipleVotes;
    if (data.requireAuthentication !== undefined) updateData.requireAuthentication = data.requireAuthentication;
    if (data.showResultsBeforeVote !== undefined) updateData.showResultsBeforeVote = data.showResultsBeforeVote;
    if (data.closesAt !== undefined) updateData.closesAt = data.closesAt ? new Date(data.closesAt) : null;
    if (data.status) updateData.status = data.status;
    
    // Update options if provided
    if (data.options) {
      const optionsData = data.options.map((opt: any, idx: number) => ({
        id: opt.id || `opt_${Date.now()}_${idx}`,
        text: opt.text,
        votes: opt.votes || 0,
      }));
      updateData.options = optionsData;
    }

    // Update poll
    const [updatedPoll] = await db
      .update(polls)
      .set(updateData)
      .where(and(eq(polls.id, pollId), eq(polls.organizationId, organizationId)))
      .returning();

    return NextResponse.json({
      poll: updatedPoll,
      message: 'Poll updated successfully',
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to update poll',
      error
    );
  }
});

// DELETE /api/communications/polls/[pollId] - Delete poll
export const DELETE = withApiAuth(async (
  request: NextRequest,
  { params }: { params: { pollId: string } }
) => {
  try {
    const pollId = params.pollId;
    const organizationId = request.headers.get('x-organization-id');
    
    if (!organizationId) {
      return standardErrorResponse(
      ErrorCode.MISSING_REQUIRED_FIELD,
      'Organization ID is required'
    );
    }

    // Check if poll exists
    const [existingPoll] = await db
      .select()
      .from(polls)
      .where(and(eq(polls.id, pollId), eq(polls.organizationId, organizationId)))
      .limit(1);

    if (!existingPoll) {
      return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Poll not found'
    );
    }

    // Don&apos;t allow deleting active polls with votes
    if (existingPoll.status === 'active' && existingPoll.totalVotes > 0) {
      return NextResponse.json(
        { error: 'Cannot delete poll that has votes. Please close it instead.' },
        { status: 400 }
      );
    }

    // Delete votes first
    await db
      .delete(pollVotes)
      .where(eq(pollVotes.pollId, pollId));

    // Delete poll
    await db
      .delete(polls)
      .where(and(eq(polls.id, pollId), eq(polls.organizationId, organizationId)));

    return NextResponse.json({
      message: 'Poll deleted successfully',
    });
  } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to delete poll',
      error
    );
  }
});
