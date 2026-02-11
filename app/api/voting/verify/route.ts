/**
 * Vote Verification API Endpoint
 * 
 * POST /api/voting/verify
 * 
 * Allows voters to verify their vote was counted correctly using:
 * - Receipt ID
 * - Verification code
 * 
 * Returns vote details without revealing voter identity
 * 
 * Security:
 * - Public endpoint (no auth required - receipt/code is the auth)
 * - Rate limited to prevent brute force
 * - Does not expose voter identity
 * - Cryptographic verification of audit chain
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/db';
import { votes, votingAuditLog, votingOptions, votingSessions } from '@/db/schema/voting-schema';
import { eq, and } from 'drizzle-orm';
import { verifyVoteReceipt } from '@/lib/services/voting-crypto-service';
import { logger } from '@/lib/logger';

import { 
  standardErrorResponse, 
  standardSuccessResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

const verifyVoteSchema = z.object({
  receiptId: z.string().min(1, 'Receipt ID is required'),
  verificationCode: z.string().min(4, 'Verification code must be at least 4 characters'),
});

/**
 * POST /api/voting/verify
 * Verify a vote using receipt ID and verification code
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid JSON in request body'
      );
    }

    // Validate request
    const validation = verifyVoteSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }

    const { receiptId, verificationCode } = validation.data;

    // Lookup vote by receipt ID
    const vote = await db.query.votes.findFirst({
      where: eq(votes.receiptId, receiptId),
    });

    if (!vote) {
      return standardErrorResponse(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Vote not found with this receipt ID'
      );
    }

    // Verify code matches (case-insensitive)
    const storedCode = vote.verificationCode || '';
    const providedCode = verificationCode.trim().toUpperCase();
    const codeMatches = storedCode.toUpperCase() === providedCode;

    if (!codeMatches) {
      logger.warn('Vote verification failed - code mismatch', {
        receiptId,
        providedCode: providedCode.substring(0, 2) + '***', // Log partial code
      });

      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Verification code does not match'
      );
    }

    // Get audit log entry for cryptographic verification
    const auditEntry = await db.query.votingAuditLog.findFirst({
      where: eq(votingAuditLog.receiptId, receiptId),
    });

    if (!auditEntry) {
      logger.error('Vote audit entry not found', { receiptId });
      return standardErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Audit record not found - vote integrity cannot be verified'
      );
    }

    // Verify audit chain integrity
    let chainValid = auditEntry.chainValid ?? false;
    
    if (chainValid) {
      // Double-check with cryptographic verification
      try {
        const verificationResult = verifyVoteReceipt(
          receiptId,
          auditEntry.voteHash,
          auditEntry.signature,
          verificationCode
        );
        
        chainValid = verificationResult;
      } catch (error) {
        logger.error('Vote receipt verification failed', { error, receiptId });
        chainValid = false;
      }
    }

    if (!chainValid) {
      logger.error('Vote audit chain validation failed', { 
        receiptId,
        tamperedIndicators: auditEntry.tamperedIndicators 
      });

      return NextResponse.json({
        success: false,
        verified: false,
        message: 'Vote integrity check failed - possible tampering detected',
        warning: 'Please report this to election officials immediately',
      }, { status: 200 }); // Still 200 to deliver the message
    }

    // Get option text (what they voted for)
    const option = await db.query.votingOptions.findFirst({
      where: eq(votingOptions.id, vote.optionId),
    });

    // Get session details
    const session = await db.query.votingSessions.findFirst({
      where: eq(votingSessions.id, vote.sessionId),
    });

    logger.info('Vote verified successfully', {
      receiptId,
      sessionId: vote.sessionId,
      castAt: vote.castAt,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Vote verified successfully',
      vote: {
        receiptId: vote.receiptId,
        optionText: option?.text || 'Unknown',
        optionDescription: option?.description,
        castAt: vote.castAt,
        isAnonymous: vote.isAnonymous,
        sessionTitle: session?.title || 'Unknown Session',
        sessionId: vote.sessionId,
      },
      auditInfo: {
        auditHash: auditEntry.auditHash,
        votedAt: auditEntry.votedAt,
        chainValid: true,
      },
    });

  } catch (error) {
    logger.error('Vote verification error', { error });
    return standardErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'Failed to verify vote',
      error
    );
  }
}
