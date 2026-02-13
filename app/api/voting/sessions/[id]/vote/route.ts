import { logApiAuditEvent, SQLInjectionScanner } from "@/lib/middleware/api-security";
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
import { withRoleAuth } from "@/lib/api-auth-guard";

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
  return withRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

    try {
      const sessionId = params.id;

      // Check for SQL injection in sessionId
      if (SQLInjectionScanner.scanMethod(sessionId)) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'security_violation',
          severity: 'critical',
          details: { reason: 'SQL injection attempt detected in sessionId', sessionId },
        });

        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid session ID format'
        );
      }

      const body = await request.json();

      // Validate request body
      const validation = votingSessionsVoteSchema.safeParse(body);
      if (!validation.success) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { errors: validation.error.errors, sessionId },
        });

        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request data',
          validation.error.errors
        );
      }

      const { optionId } = validation.data;

      // Get session
      const [session] = await db
        .select()
        .from(votingSessions)
        .where(eq(votingSessions.id, sessionId));

      if (!session) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'resource_not_found',
          severity: 'medium',
          details: { reason: 'Voting session not found', sessionId },
        });

        return standardErrorResponse(
          ErrorCode.RESOURCE_NOT_FOUND,
          'Voting session not found'
        );
      }

      // Check if session is active
      if (session.status !== 'active') {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: `Session is ${session.status}, not active`, sessionId, status: session.status },
        });

        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Voting session is ${session.status}. Only active sessions accept votes.`
        );
      }

      // Check if session has ended
      if (session.scheduledEndTime && new Date() > session.scheduledEndTime) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'medium',
          details: { reason: 'Voting session has ended', sessionId, endTime: session.scheduledEndTime },
        });

        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Voting session has ended'
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
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'high',
          details: { reason: 'Invalid option for session', sessionId, optionId },
        });

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
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'validation_failed',
          severity: 'high',
          details: { reason: 'Duplicate vote attempt', sessionId, existingVoteId: existingVote.id },
        });

        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'You have already voted in this session',
          null,
          409
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
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'auth_failed',
          severity: 'high',
          details: { reason: 'User not eligible to vote', sessionId },
        });

        return standardErrorResponse(
          ErrorCode.FORBIDDEN,
          'You are not eligible to vote in this session',
          null,
          403
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

        // Log successful vote cast
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId: isAnonymous ? 'anonymous' : userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'vote_cast',
          severity: 'high',
          details: {
            sessionId,
            optionId,
            voteId: newVote.id,
            isAnonymous,
            receiptId: receipt.receiptId,
          },
        });

        return standardSuccessResponse(
          {
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
          },
          201
        );
      } catch (error) {
        logApiAuditEvent({
          timestamp: new Date().toISOString(),
          userId,
          endpoint: '/api/voting/sessions/[id]/vote',
          method: 'POST',
          eventType: 'system_error',
          severity: 'critical',
          details: { reason: 'Vote cryptography failed', sessionId, error: String(error) },
        });

        return standardErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Vote submission failed - security configuration error',
          error
        );
      }
    } catch (error) {
      logApiAuditEvent({
        timestamp: new Date().toISOString(),
        userId: context.userId || 'unknown',
        endpoint: '/api/voting/sessions/[id]/vote',
        method: 'POST',
        eventType: 'system_error',
        severity: 'critical',
        details: { error: String(error) },
      });

      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Internal server error',
        error
      );
    }
  })(request, { params });
};
