/**
 * Election Results API
 * 
 * Provides voting results and analytics with audit verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingSessions, votes, votingOptions, votingAuditLog } from '@/db/schema/voting-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * GET /api/governance/elections/sessions/[id]/results
 * Get election results with verification
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    
    // Get session details
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
    
    // Check if results should be visible (session must be closed or ended)
    const now = new Date();
    const resultsAvailable = 
      session.status === 'closed' || 
      (session.endTime && new Date(session.endTime) < now) ||
      (session.scheduledEndTime && new Date(session.scheduledEndTime) < now);
    
    if (!resultsAvailable) {
      return NextResponse.json(
        { 
          error: 'Results not yet available',
          status: session.status,
          scheduledEndTime: session.scheduledEndTime,
        },
        { status: 403 }
      );
    }
    
    // Get vote counts by option
    const optionResults = await db
      .select({
        optionId: votes.optionId,
        optionText: votingOptions.text,
        optionDescription: votingOptions.description,
        orderIndex: votingOptions.orderIndex,
        voteCount: sql<number>`COUNT(*)::int`,
      })
      .from(votes)
      .leftJoin(votingOptions, eq(votes.optionId, votingOptions.id))
      .where(eq(votes.sessionId, sessionId))
      .groupBy(votes.optionId, votingOptions.text, votingOptions.description, votingOptions.orderIndex)
      .orderBy(votingOptions.orderIndex);
    
    // Get total vote count
    const [totals] = await db
      .select({
        totalVotes: sql<number>`COUNT(*)::int`,
        uniqueVoters: sql<number>`COUNT(DISTINCT ${votes.voterId})::int`,
      })
      .from(votes)
      .where(eq(votes.sessionId, sessionId));
    
    // Calculate percentages
    const results = optionResults.map(option => ({
      optionId: option.optionId,
      optionText: option.optionText,
      optionDescription: option.optionDescription,
      voteCount: option.voteCount,
      percentage: totals.totalVotes > 0 
        ? Math.round((option.voteCount / totals.totalVotes) * 10000) / 100
        : 0,
    }));
    
    // Calculate quorum status
    const turnoutPercentage = session.totalEligibleVoters > 0
      ? Math.round((totals.uniqueVoters / session.totalEligibleVoters) * 10000) / 100
      : 0;
    
    const quorumMet = session.requiresQuorum
      ? turnoutPercentage >= session.quorumThreshold
      : true;
    
    // Determine winner (highest vote count)
    const winner = results.reduce((max, option) => 
      option.voteCount > (max?.voteCount || 0) ? option : max
    , results[0] || null);
    
    // Verify audit chain integrity
    const auditLogs = await db
      .select({
        id: votingAuditLog.id,
        auditHash: votingAuditLog.auditHash,
        previousAuditHash: votingAuditLog.previousAuditHash,
        voteHash: votingAuditLog.voteHash,
        chainValid: votingAuditLog.chainValid,
      })
      .from(votingAuditLog)
      .where(eq(votingAuditLog.sessionId, sessionId))
      .orderBy(votingAuditLog.createdAt);
    
    // Verify chain integrity
    let chainIntact = true;
    for (let i = 1; i < auditLogs.length; i++) {
      const current = auditLogs[i];
      const previous = auditLogs[i - 1];
      
      // Verify that current.previousAuditHash matches previous.auditHash
      if (current.previousAuditHash !== previous.auditHash) {
        chainIntact = false;
        break;
      }
    }
    
    // Get options with no votes
    const allOptions = await db
      .select()
      .from(votingOptions)
      .where(eq(votingOptions.sessionId, sessionId))
      .orderBy(votingOptions.orderIndex);
    
    // Add zero-vote options to results
    const completeResults = allOptions.map(option => {
      const existing = results.find(r => r.optionId === option.id);
      return existing || {
        optionId: option.id,
        optionText: option.text,
        optionDescription: option.description,
        voteCount: 0,
        percentage: 0,
      };
    });
    
    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        type: session.type,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
      },
      results: completeResults,
      statistics: {
        totalVotes: totals.totalVotes,
        uniqueVoters: totals.uniqueVoters,
        totalEligibleVoters: session.totalEligibleVoters,
        turnoutPercentage,
        quorumThreshold: session.quorumThreshold,
        quorumMet,
      },
      winner: quorumMet ? winner : null,
      audit: {
        totalAuditRecords: auditLogs.length,
        chainIntact,
        verificationType: session.allowAnonymous ? 'anonymous' : 'identifiable',
      },
    });
  } catch (error: any) {
    console.error('Error fetching election results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch election results', details: error.message },
      { status: 500 }
    );
  }
}
