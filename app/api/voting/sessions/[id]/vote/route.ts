import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { votingSessions, votingOptions, voterEligibility, votes } from '@/db/schema/domains/governance';
import { eq, and } from 'drizzle-orm';
import {
  deriveVotingSessionKey,
  signVote,
  generateVoteReceipt,
  createVotingAuditLog,
} from '@/lib/services/voting-crypto-service';
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/api-auth-guard";

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';
interface RouteParams {
  params: {
    id: string;
  };
}


const votingSessionsVoteSchema = z.object({
  optionId: z.string().uuid('Invalid optionId'),
});

export const POST = async (request: NextRequest, { params }: RouteParams) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const sessionId = params.id;
      const body = await request.json();
    // Validate request body
    const validation = votingSessionsVoteSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { optionId } = validation.data;
      const { optionId } = body;

      if (!optionId) {
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Missing required field: optionId'
    );
      }

      // Get session
      const [session] = await db
        .select()
        .from(votingSessions)
        .where(eq(votingSessions.id, sessionId));

      if (!session) {
        return standardErrorResponse(
      ErrorCode.RESOURCE_NOT_FOUND,
      'Voting session not found'
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
        return standardErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid option for this voting session'
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

      // Determine if vote should be anonymous
      const isAnonymous = session.allowAnonymous ?? true;

      // Generate cryptographic vote signature
      try {
        const sessionKey = deriveVotingSessionKey(
          sessionId,
          process.env.VOTING_SECRET
        );

        const timestamp = Math.floor(Date.now() / 1000);
        const voteSignature = signVote(
          {
            sessionId,
            optionId,
            memberId: userId,
            timestamp,
          },
          sessionKey
        );

        // Generate vote receipt for voter verification
        const receipt = generateVoteReceipt(
          {
            sessionId,
            optionId,
            memberId: userId,
            isAnonymous,
          },
          voteSignature
        );

        // Store vote with cryptographic proof
        const [newVote] = await db
          .insert(votes)
          .values({
            sessionId,
            optionId,
            voterId: isAnonymous ? 'anonymous' : userId,
            voterHash: voteSignature.voteHash, // Store signature hash
            signature: voteSignature.signature, // Store signature for verification
            isAnonymous,
            voterType: 'member',
            castAt: new Date(),
            receiptId: receipt.receiptId,
            verificationCode: receipt.verificationCode, // Store hash of verification code, not code itself
            auditHash: receipt.auditHash,
          })
          .returning();

        // Create audit log entry
        await createVotingAuditLog(sessionId, userId, receipt, null);

        return NextResponse.json({
          message: 'Vote cast successfully',
          vote: {
            id: newVote.id,
            sessionId: newVote.sessionId,
            optionId: newVote.optionId,
            castAt: newVote.castAt,
            isAnonymous: newVote.isAnonymous,
            receiptId: receipt.receiptId,
            verificationCode: receipt.verificationCode, // Return to voter for later verification
          },
        }, { status: 201 });
      } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Vote submission failed - security configuration error',
      error
    );
      }
    } catch (error) {
return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error
    );
    }
    })(request, { params });
};
