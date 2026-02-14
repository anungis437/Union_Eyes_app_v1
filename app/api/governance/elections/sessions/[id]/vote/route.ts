/**
 * Voting API - Cast Votes
 * 
 * Handles vote casting with anonymization and cryptographic audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingSessions, voterEligibility, votes, votingOptions, votingAuditLog } from '@/db/schema/voting-schema';
import { and } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Validation schema for casting vote
const castVoteSchema = z.object({
  optionId: z.string().uuid(),
  voterId: z.string(), // Will be anonymized
  signature: z.string().optional(),
});

/**
 * POST /api/governance/elections/sessions/[id]/vote
 * Cast a vote in the session
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await req.json();
    
    // Validate input
    const validatedData = castVoteSchema.parse(body);
    
    // Check if session is active
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
    
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Voting session is not active', status: session.status },
        { status: 400 }
      );
    }
    
    // Check if voting has ended
    if (session.scheduledEndTime && new Date(session.scheduledEndTime) < new Date()) {
      return NextResponse.json(
        { error: 'Voting period has ended' },
        { status: 400 }
      );
    }
    
    // Check if option exists
    const [option] = await db
      .select()
      .from(votingOptions)
      .where(and(
        eq(votingOptions.id, validatedData.optionId),
        eq(votingOptions.sessionId, sessionId)
      ));
    
    if (!option) {
      return NextResponse.json(
        { error: 'Invalid voting option' },
        { status: 400 }
      );
    }
    
    // Check voter eligibility
    const [eligibility] = await db
      .select()
      .from(voterEligibility)
      .where(and(
        eq(voterEligibility.sessionId, sessionId),
        eq(voterEligibility.memberId, validatedData.voterId)
      ));
    
    if (!eligibility || !eligibility.isEligible) {
      return NextResponse.json(
        { error: 'Voter is not eligible for this session' },
        { status: 403 }
      );
    }
    
    // Check for double voting
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(and(
        eq(votes.sessionId, sessionId),
        eq(votes.voterId, validatedData.voterId)
      ));
    
    if (existingVote) {
      return NextResponse.json(
        { error: 'Vote already cast', message: 'You have already voted in this session' },
        { status: 400 }
      );
    }
    
    // Generate cryptographic audit trail
    const receiptId = crypto.randomUUID();
    const verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    
    // Create voter hash (anonymized)
    const voterHash = crypto
      .createHash('sha256')
      .update(sessionId + validatedData.voterId + Date.now().toString())
      .digest('hex');
    
    // Create vote hash for audit trail
    const voteHash = crypto
      .createHash('sha256')
      .update(sessionId + validatedData.optionId + voterHash + Date.now().toString())
      .digest('hex');
    
    // Get previous audit hash for chaining
    const [lastAudit] = await db
      .select({ auditHash: votingAuditLog.auditHash })
      .from(votingAuditLog)
      .where(eq(votingAuditLog.sessionId, sessionId))
      .orderBy(sql`${votingAuditLog.createdAt} DESC`)
      .limit(1);
    
    // Create audit hash (chained)
    const auditHash = crypto
      .createHash('sha256')
      .update(voteHash + (lastAudit?.auditHash || 'genesis'))
      .digest('hex');
    
    // Generate signature (simplified - in production use proper crypto signing)
    const signature = validatedData.signature || crypto
      .createHmac('sha256', process.env.VOTING_SECRET || 'voting-secret-key')
      .update(voteHash + auditHash)
      .digest('hex');
    
    // Insert vote (anonymized voter ID)
    const anonymizedVoterId = session.allowAnonymous 
      ? voterHash.substring(0, 20)
      : validatedData.voterId;
    
    const [vote] = await db
      .insert(votes)
      .values({
        sessionId,
        optionId: validatedData.optionId,
        voterId: anonymizedVoterId,
        voterHash,
        signature,
        receiptId,
        verificationCode,
        auditHash,
        isAnonymous: session.allowAnonymous,
        castAt: new Date(),
      })
      .returning();
    
    // Insert audit log
    await db.insert(votingAuditLog).values({
      sessionId,
      receiptId,
      voteHash,
      signature,
      auditHash,
      previousAuditHash: lastAudit?.auditHash || null,
      votedAt: new Date(),
      verificationCode,
      isAnonymous: session.allowAnonymous,
      chainValid: true,
    });
    
    // Return receipt (no vote details for anonymity)
    return NextResponse.json({
      message: 'Vote cast successfully',
      receipt: {
        receiptId,
        verificationCode,
        sessionId,
        votedAt: vote.castAt,
        canVerify: true,
      },
    }, { status: 201 });
  } catch (error: Record<string, unknown>) {
    logger.error('Error casting vote:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to cast vote', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/governance/elections/sessions/[id]/vote
 * Check if user has voted (without revealing vote choice)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const { searchParams } = new URL(req.url);
    const voterId = searchParams.get('voterId');
    
    if (!voterId) {
      return NextResponse.json(
        { error: 'voterId is required' },
        { status: 400 }
      );
    }
    
    // Check if vote exists (don&apos;t reveal vote choice)
    const [existingVote] = await db
      .select({
        id: votes.id,
        castAt: votes.castAt,
        receiptId: votes.receiptId,
        verificationCode: votes.verificationCode,
      })
      .from(votes)
      .where(and(
        eq(votes.sessionId, sessionId),
        eq(votes.voterId, voterId)
      ));
    
    if (!existingVote) {
      return NextResponse.json({
        hasVoted: false,
      });
    }
    
    return NextResponse.json({
      hasVoted: true,
      votedAt: existingVote.castAt,
      receipt: {
        receiptId: existingVote.receiptId,
        verificationCode: existingVote.verificationCode,
      },
    });
  } catch (error: Record<string, unknown>) {
    logger.error('Error checking vote status:', error);
    return NextResponse.json(
      { error: 'Failed to check vote status', details: error.message },
      { status: 500 }
    );
  }
}
